const mongoose = require('mongoose');
const AppError = require('../utils/appError');
const DummyTicket = require('../models/DummyTicket');
const Affiliate = require('../models/Affiliate');
const { stripe } = require('../utils/stripe');
const { v4: uuidv4 } = require('uuid');
const { ticketPaymentCompletionEmail, ticketLaterDateDeliveryEmail, ticketScheduledDeliveryEmail } = require('./notification.service');
const paymentService = require('./payment.service');
const pricingService = require('./dummyTicketPricing.service');
const currencyService = require('./currency.service');
const AFFILIATE_ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const AFFILIATE_CAPTURE_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
// const { capitalCase } = require('change-case');
// const { createContact, getContact } = require('../utils/brevo');

function normalizeEmail(email) {
  if (typeof email !== 'string') return email;
  return email.trim().toLowerCase();
}

function parseAffiliateCapturedAt(value) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isAffiliateAttributionWithinWindow(capturedAt, now = new Date()) {
  if (!capturedAt) return false;

  const capturedMs = capturedAt.getTime();
  const nowMs = now.getTime();
  const ageMs = nowMs - capturedMs;

  if (ageMs < -AFFILIATE_CAPTURE_FUTURE_TOLERANCE_MS) return false;
  return ageMs <= AFFILIATE_ATTRIBUTION_TTL_MS;
}

function buildSearchFilter(search) {
  if (!search) return {};

  const regex = new RegExp(search, 'i');
  return {
    $or: [
      { 'passengers.0.firstName': regex },
      { 'passengers.0.lastName': regex },
      { 'passengers.0.title': regex },
      { email: regex },
      { from: regex },
      { to: regex },
    ],
  };
}

function applyCreatedAtFilter(queryObj, createdAt) {
  if (!createdAt) return;

  const now = new Date();
  const map = {
    '6_hours': 6,
    '12_hours': 12,
    '24_hours': 24,
    '7_days': 7 * 24,
    '14_days': 14 * 24,
    '30_days': 30 * 24,
    '90_days': 90 * 24,
  };

  if (!map[createdAt]) return;

  queryObj.createdAt = {
    $gte: new Date(now.getTime() - map[createdAt] * 60 * 60 * 1000),
  };
}

exports.getAllTickets = async (query) => {
  const queryObj = { ...query };

  ['page', 'limit', 'search', 'createdAt'].forEach((f) => delete queryObj[f]);
  Object.keys(queryObj).forEach((k) => queryObj[k] === 'all' && delete queryObj[k]);

  applyCreatedAtFilter(queryObj, query.createdAt);

  const finalQuery = {
    ...queryObj,
    ...buildSearchFilter(query.search),
  };

  let page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = Math.max(1, parseInt(query.limit, 10) || 100);

  const total = await DummyTicket.countDocuments(finalQuery);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (page > totalPages) page = totalPages;

  const data = await DummyTicket.find(finalQuery)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('handledBy');

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

exports.getTicketBySessionId = (sessionId) =>
  DummyTicket.findOne({ sessionId })
    .populate('handledBy')
    .populate('affiliate', 'name email affiliateId commissionPercent isActive');

exports.updateOrderStatus = async (sessionId, userId, orderStatus) => {
  if (!orderStatus) {
    throw new AppError('Order status is required', 400);
  }

  const allowedStatuses = ['PENDING', 'DELIVERED', 'PROGRESS', 'REFUNDED'];
  if (!allowedStatuses.includes(orderStatus)) {
    throw new AppError('Invalid order status', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new AppError('INVALID_USER_ID');
  }

  const updated = await DummyTicket.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        orderStatus,
        handledBy: new mongoose.Types.ObjectId(userId),
      },
    },
    { new: true },
  ).populate('handledBy');

  if (!updated) {
    throw new AppError('Ticket not found', 404);
  }

  return updated;
};

exports.deleteTicket = async (sessionId) => {
  const deleted = await DummyTicket.findOneAndDelete({ sessionId });
  if (!deleted) {
    throw new AppError('Ticket not found', 404);
  }
};

exports.createTicketRequest = async (payload) => {
  const normalizedEmail = normalizeEmail(payload?.email);
  const incomingAffiliateId = payload?.affiliateId;
  const isValidAffiliateId = /^\d{9}$/.test(incomingAffiliateId || '');
  const parsedAffiliateCapturedAt = parseAffiliateCapturedAt(payload?.affiliateCapturedAt);
  const now = new Date();

  let affiliateDoc = null;
  let affiliateCapturedAt = null;
  const alreadyHasPaidAffiliatePurchase = normalizedEmail
    ? await DummyTicket.exists({
        email: normalizedEmail,
        paymentStatus: 'PAID',
        affiliate: { $ne: null },
      })
    : false;

  const hasValidAttributionWindow = isAffiliateAttributionWithinWindow(parsedAffiliateCapturedAt, now);

  if (isValidAffiliateId && !alreadyHasPaidAffiliatePurchase && hasValidAttributionWindow) {
    affiliateDoc = await Affiliate.findOne({ affiliateId: incomingAffiliateId, isActive: true }).select(
      '_id affiliateId',
    );

    if (affiliateDoc) {
      affiliateCapturedAt = parsedAffiliateCapturedAt;
    }
  }

  const ticket = await DummyTicket.create({
    ...payload,
    email: normalizedEmail,
    currency: String(payload?.currency || 'AED').toUpperCase(),
    sessionId: uuidv4(),
    affiliateId: affiliateDoc ? affiliateDoc.affiliateId : null,
    affiliateCapturedAt,
    affiliate: affiliateDoc ? affiliateDoc._id : null,
  });

  // await createContact({
  //   firstName: capitalCase(ticket.passengers[0].firstName),
  //   lastName: capitalCase(ticket.passengers[0].lastName),
  //   email: ticket.email.toLowerCase(),
  //   from: ticket.from,
  //   to: ticket.to,
  //   departureDate: ticket.departureDate,
  //   returnDate: ticket.returnDate,
  // });

  return ticket;
};

exports.createStripePaymentUrl = async (formData) => {
  const sessionId = formData?.sessionId;
  if (!sessionId) {
    throw new AppError('Session ID is required', 400);
  }

  const ticket = await DummyTicket.findOne({ sessionId });
  if (!ticket) {
    throw new AppError('Ticket not found', 404);
  }

  const adults = Number(ticket?.quantity?.adults || 0);
  const children = Number(ticket?.quantity?.children || 0);
  const totalPassengers = adults + children;

  if (totalPassengers < 1) {
    throw new AppError('At least 1 passenger is required for checkout', 400);
  }

  const { currency, unitPrice } = await pricingService.getDummyTicketUnitPrice(ticket.ticketValidity);
  const baseTotalAmount = Number((unitPrice * totalPassengers).toFixed(2));
  const requestedCurrencyCode = String(formData?.currencyCode || ticket.currency || currency || 'AED').toUpperCase();
  const { amount: totalAmount, currencyCode } = await currencyService.convertFromBase({
    amount: baseTotalAmount,
    targetCode: requestedCurrencyCode,
  });

  await DummyTicket.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        totalAmount,
        currency: currencyCode,
      },
    },
  );

  return paymentService.createCheckoutSession({
    amount: totalAmount,
    currency: String(currencyCode || currency || 'AED').toLowerCase(),
    productName: `${ticket.type} Flight Reservation`,
    customerEmail: ticket.email,
    successUrl: `${process.env.DT365_FRONTEND}/booking/payment?sessionId=${sessionId}`,
    cancelUrl: `${process.env.DT365_FRONTEND}/booking/review-details`,
    metadata: {
      productType: 'ticket',
      entity: 'DUMMY_TICKET',
      customer: ticket.leadPassenger,
      sessionId,
      from: ticket.from,
      to: ticket.to,
      departureDate: ticket.departureDate,
      returnDate: ticket.returnDate,
    },
    idempotencyKey: sessionId,
  });
};

exports.handleStripeSuccess = async (session) => {
  if (session.payment_status !== 'paid') return;

  const sessionId = session.metadata.sessionId;
  const currency = (session.currency || 'aed').toUpperCase();
  const amount = Number((session.amount_total / 100).toFixed(2));
  const transactionId = session.id;
  const existingTicket = await DummyTicket.findOne({ sessionId });

  if (!existingTicket) return;

  let shouldClearAffiliateAttribution = false;

  if (existingTicket.affiliate || existingTicket.affiliateId) {
    const activeAffiliate = existingTicket.affiliate
      ? await Affiliate.findOne({ _id: existingTicket.affiliate, isActive: true }).select('_id')
      : null;
    const capturedAt = parseAffiliateCapturedAt(existingTicket.affiliateCapturedAt);
    const withinAttributionWindow = isAffiliateAttributionWithinWindow(capturedAt, new Date());

    if (!activeAffiliate || !withinAttributionWindow) {
      shouldClearAffiliateAttribution = true;
    }
  }

  if (!shouldClearAffiliateAttribution && existingTicket.affiliate && existingTicket.email) {
    const hasPreviousPaidAffiliatePurchase = await DummyTicket.exists({
      _id: { $ne: existingTicket._id },
      email: normalizeEmail(existingTicket.email),
      paymentStatus: 'PAID',
      affiliate: { $ne: null },
    });

    shouldClearAffiliateAttribution = Boolean(hasPreviousPaidAffiliatePurchase);
  }

  const ticket = await DummyTicket.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        paymentStatus: 'PAID',
        amountPaid: { currency, amount },
        transactionId,
        orderStatus: 'PENDING',
        ...(shouldClearAffiliateAttribution ? { affiliate: null, affiliateId: null, affiliateCapturedAt: null } : {}),
      },
    },
    { new: true },
  );

  if (!ticket.ticketDelivery.immediate) {
    await ticketLaterDateDeliveryEmail({
      to: ticket.email,
      passenger: ticket.passengers?.[0]?.firstName || 'Customer',
      deliveryDate: ticket.ticketDelivery.deliveryDate,
    });
  }

  await ticketPaymentCompletionEmail({
    createdAt: ticket.createdAt,
    type: ticket.type,
    from: ticket.from,
    to: ticket.to,
    departureDate: ticket.departureDate,
    returnDate: ticket.returnDate,
    leadPassenger: ticket.leadPassenger,
    email: ticket.email,
    number:
      ticket.phoneNumber?.code && ticket.phoneNumber?.digits
        ? ticket.phoneNumber.code + ticket.phoneNumber.digits
        : 'Not provided',
    flightDetails: ticket?.flightDetails,
    ticketValidity: ticket?.ticketValidity,
    ticketDelivery: ticket?.ticketDelivery,
    passengers: ticket.passengers,
    message: ticket.message,
  });
};

exports.refundStripePaymentByTransactionId = async (transactionId) => {
  const ticket = await DummyTicket.findOne({ transactionId });

  if (!ticket) throw new AppError('Ticket not found', 404);
  if (ticket.paymentStatus !== 'PAID') throw new AppError('Payment not completed', 400);

  const session = await stripe.checkout.sessions.retrieve(ticket.transactionId);

  if (!session.payment_intent) throw new AppError('PaymentIntent not found', 400);

  const refund = await stripe.refunds.create({
    payment_intent: session.payment_intent,
  });

  await DummyTicket.findOneAndUpdate(
    { transactionId },
    {
      $set: {
        paymentStatus: 'REFUNDED',
        orderStatus: 'REFUNDED',
      },
    },
    { new: true },
  );

  return refund;
};

/* =========================================================
   FUTURE: Reservation Generation (ViewTrip)
   ---------------------------------------------------------
   ⚠️ NOT IN USE YET
   - ViewTrip integration is planned but disabled for now
   - This code is intentionally preserved for future use
   - DO NOT CALL from webhooks or controllers yet
========================================================= */

async function createReservation(ticket) {
  try {
    const res = await fetch(`${process.env.VIEWTRIP_BACKEND}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket),
    });

    if (!res.ok) throw new Error('Could not create reservation');

    const data = await res.json();
    return data.data.reservation;
  } catch (err) {
    console.error('Reservation creation failed:', err.message);
    return null;
  }
}

exports.updatePaymentAndCreateReservation = async (sessionId, currency, amount) => {
  let doc = await DummyTicket.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        paymentStatus: 'PAID',
        amountPaid: { currency, amount },
        orderStatus: 'PENDING',
      },
    },
    { new: true },
  );

  if (!doc) throw new Error('Ticket not found for session ID');

  return doc;
};

// ─── Scheduled delivery email ─────────────────────────────────────────────────
// Called every minute by the scheduler in server.js.
// Finds all paid tickets whose delivery date is today (UAE time, UTC+4) and
// whose admin notification has not yet been sent, then emails the admin and
// marks the ticket so the email is never sent twice.
exports.sendDueDeliveryEmails = async () => {
  const logger = require('../utils/logger');

  // Derive today's date in UAE time (UTC+4) as 'YYYY-MM-DD'
  const nowUAE = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const todayUAE = nowUAE.toISOString().split('T')[0];

  const filter = {
    paymentStatus: 'PAID',
    orderStatus: { $in: ['PENDING', 'PROGRESS'] },
    'ticketDelivery.immediate': false,
    'ticketDelivery.deliveryDate': todayUAE,
    adminDeliveryEmailSent: { $ne: true },
  };

  // Atomically claim one ticket at a time: the flag is flipped to true in the
  // same DB round-trip as the query, so concurrent scheduler runs can never
  // claim the same ticket and no ticket is ever emailed twice.
  let ticket;
  while (
    (ticket = await DummyTicket.findOneAndUpdate(
      filter,
      { $set: { adminDeliveryEmailSent: true } },
      { new: false }, // return the document as it was before the update
    )) !== null
  ) {
    try {
      await ticketScheduledDeliveryEmail({
        createdAt: ticket.createdAt,
        type: ticket.type,
        from: ticket.from,
        to: ticket.to,
        departureDate: ticket.departureDate,
        returnDate: ticket.returnDate,
        leadPassenger: ticket.leadPassenger,
        email: ticket.email,
        number:
          ticket.phoneNumber?.code && ticket.phoneNumber?.digits
            ? ticket.phoneNumber.code + ticket.phoneNumber.digits
            : 'Not provided',
        flightDetails: ticket.flightDetails,
        ticketValidity: ticket.ticketValidity,
        ticketDelivery: ticket.ticketDelivery,
        passengers: ticket.passengers,
        message: ticket.message,
      });
    } catch (err) {
      // Email failed after the ticket was already claimed — log it so the
      // admin can follow up manually. The flag stays true to prevent retries.
      logger.error('Failed to send scheduled delivery email', {
        ticketId: ticket._id,
        sessionId: ticket.sessionId,
        error: err,
      });
    }
  }
};
