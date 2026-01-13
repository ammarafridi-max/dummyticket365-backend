const mongoose = require('mongoose');
const DummyTicket = require('../models/DummyTicket');
const stripe = require('../utils/stripe');
const { v4: uuidv4 } = require('uuid');
const { adminFormSubmissionEmail, adminPaymentCompletionEmail, laterDateDeliveryEmail } = require('../utils/email');
const paymentService = require('./payment.service');

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

exports.getTicketBySessionId = (sessionId) => DummyTicket.findOne({ sessionId }).populate('handledBy');

exports.updateOrderStatus = async (sessionId, userId, orderStatus) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('INVALID_USER_ID');
  }

  return DummyTicket.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        orderStatus,
        handledBy: new mongoose.Types.ObjectId(userId),
      },
    },
    { new: true },
  ).populate('handledBy');
};

exports.deleteTicket = (sessionId) => DummyTicket.findOneAndDelete({ sessionId });

exports.createTicketRequest = async (payload) => {
  const ticket = await DummyTicket.create({
    ...payload,
    sessionId: uuidv4(),
  });

  const totalQty = ticket.quantity.adults + ticket.quantity.children + ticket.quantity.infants;

  await adminFormSubmissionEmail({
    type: ticket.type,
    from: ticket.from,
    to: ticket.to,
    submittedOn: ticket.createdAt,
    ticketCount: totalQty,
    passengers: ticket.passengers,
    number:
      ticket.phoneNumber?.code && ticket.phoneNumber?.digits
        ? ticket.phoneNumber.code + ticket.phoneNumber.digits
        : 'Not provided',
    email: ticket.email,
    departureDate: ticket.departureDate,
    returnDate: ticket.returnDate,
    flightDetails: ticket.flightDetails,
    ticketValidity: ticket.ticketValidity,
    ticketDelivery: ticket?.ticketDelivery?.immediate,
    ticketDeliveryDate: ticket?.ticketDelivery?.deliveryDate,
    message: ticket.message,
  });

  return ticket;
};

exports.createStripePaymentUrl = async (formData) => {
  return paymentService.createCheckoutSession({
    amount: formData.totalAmount,
    currency: 'aed',
    productName: `${formData.type} Flight Reservation`,
    customerEmail: formData.email,
    successUrl: `${process.env.MDT_FRONTEND}/payment-successful?sessionId=${formData.sessionId}`,
    cancelUrl: `${process.env.MDT_FRONTEND}/booking/review-details`,
    metadata: {
      entity: 'DUMMY_TICKET',
      sessionId: formData.sessionId,
      from: formData.from,
      to: formData.to,
      departureDate: formData.departureDate,
      returnDate: formData.returnDate,
    },
    idempotencyKey: formData.sessionId,
  });
};

exports.handleStripeSuccess = async (session) => {
  const sessionId = session.metadata.sessionId;
  const currency = session.currency.toUpperCase();
  const amount = Number((session.amount_total / 100).toFixed(2));

  const ticket = await DummyTicket.findOneAndUpdate(
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

  if (!ticket) return;

  if (!ticket.ticketDelivery.immediate) {
    await laterDateDeliveryEmail({
      to: ticket.email,
      passenger: ticket.passengers?.[0]?.firstName || 'Customer',
      deliveryDate: ticket.ticketDelivery.deliveryDate,
    });
  }

  await adminPaymentCompletionEmail({
    type: ticket.type,
    from: ticket.from,
    to: ticket.to,
    departureDate: ticket.departureDate,
    returnDate: ticket.returnDate,
    customer: session.metadata.customer,
    email: ticket.email,
  });
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
