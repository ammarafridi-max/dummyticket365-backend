require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const { sendEmail, generateEmailTemplate } = require('../utils/email');
const DummyTicket = require('../models/DummyTicket');
const stripe = require('../utils/stripe');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

exports.getAllTickets = catchAsync(async (req, res, next) => {
  const data = await DummyTicket.find()
    .sort({ createdAt: -1 })
    .limit(150)
    .populate({ path: 'handledBy' });

  res.status(200).json({
    status: 'success',
    message: 'Tickets fetched',
    data,
  });
});

exports.getTicket = catchAsync(async (req, res) => {
  const data = await DummyTicket.findOne({ sessionId: req.params.sessionId });

  if (!data) throw new AppError('Ticket details could not be found', 404);

  return res.status(200).json({
    status: 'success',
    message: 'Ticket details fetched successfully',
    data,
  });
});

exports.updateStatus = catchAsync(async (req, res, next) => {
  const { userId, orderStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new AppError('Invalid User ID', 400));
  }

  const data = await DummyTicket.findOneAndUpdate(
    { sessionId: req.params.sessionId },
    { $set: { orderStatus, handledBy: new mongoose.Types.ObjectId(userId) } }
  ).populate('handledBy');

  if (!data)
    return next(
      new AppError('Could not find dummy ticket with that sessionId', 404)
    );

  res.status(200).json({
    status: 'success',
    message: `Order status set to ${orderStatus}`,
  });
});

exports.deleteTicket = catchAsync(async (req, res, next) => {
  const data = await DummyTicket.findOneAndDelete({
    sessionId: req.params.sessionId,
  });
  if (!data) {
    return next(new AppError('Ticket not found.', 404));
  }
  res
    .status(200)
    .json({ status: 'success', message: 'Data deleted successfully' });
});

exports.createTicketRequest = catchAsync(async (req, res) => {
  const data = {
    ...req.body,
    sessionId: uuidv4(),
  };

  // 1. Upload data to DB
  const result = await DummyTicket.create(data);

  // 2. Send email to admin
  const leadPassenger = `${result.passengers[0].firstName} ${result.passengers[0].lastName}`;

  const totalQuantity =
    result.quantity.adults + result.quantity.children + result.quantity.infants;

  const htmlContent = generateEmailTemplate('adminFormSubmission', {
    type: result.type,
    submittedOn: result.createdAt,
    ticketCount: totalQuantity,
    passengers: result.passengers,
    number: result.phoneNumber.code + result.phoneNumber.digits,
    email: result.email,
    from: result.from,
    to: result.to,
    departureDate: result.departureDate,
    departureFlight: result.flightDetails.departureFlight,
    returnDate: result.returnDate,
    returnFlight: result.flightDetails.returnFlight,
    ticketValidity: result.ticketValidity,
    ticketAvailability: result.ticketAvailability.immediate,
    ticketAvailabilityDate: result.ticketAvailability.receiptDate,
    message: result.message,
  });

  await sendEmail(
    process.env.SENDER_EMAIL,
    `${leadPassenger} just submitted a form on MyDummyTicket.ae`,
    htmlContent
  );

  // Send Success Message to Client
  res.status(200).json({
    status: 'success',
    message: 'Data received',
    data: result,
    sessionId: result.sessionId,
  });
});

exports.createStripePaymentUrl = catchAsync(async (req, res) => {
  const stripeSession = await stripe.createCheckoutSession(
    req.body,
    req.body.sessionId
  );

  if (!stripeSession)
    return next(new AppError('Stripe session not found', 404));

  return res.status(200).json({
    message: 'successfully created ticket',
    url: stripeSession.url,
  });
});

// Stripe Webhook

exports.stripePaymentWebhook = catchAsync(async (req, res) => {
  const event = await stripe.verifyStripeSignature(req);

  if (!event) return next(new AppError('Webhook Error', 400));

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const sessionId = session.metadata.sessionId;
    const currency = session.currency.toUpperCase();
    const amount = parseFloat((session.amount_total / 100).toFixed(2));

    await updatePayment(sessionId, currency, amount);

    await sendEmail(
      process.env.SENDER_EMAIL,
      `Payment received by ${session.metadata.customer}`,
      generateEmailTemplate('adminPaymentNotification', {
        customer: session.metadata.customer,
        email: session.customer_email,
        ticketType: session.metadata.ticketType || 'Unknown',
        departureCity: session.metadata.departureCity || 'Unknown',
        arrivalCity: session.metadata.arrivalCity || 'Unknown',
        departureDate: session.metadata.departureDate || 'Unknown',
        returnDate: session.metadata.returnDate || 'Not Specified',
        currency: session.currency.toUpperCase(),
        amount: (session.amount_total / 100).toFixed(2),
      })
    );

    return res.status(200).json({ received: true });
  }
});

async function updatePayment(sessionId, currency, amount) {
  let doc = await DummyTicket.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        paymentStatus: 'PAID',
        amountPaid: {
          currency,
          amount,
        },
      },
    },
    { new: true }
  );

  if (!doc) throw new Error('Ticket not found for session ID');

  const reservation = await createReservation(doc);

  if (reservation?.pnr) {
    doc = await DummyTicket.findByIdAndUpdate(
      doc._id,
      { $set: { pnr: reservation.pnr } },
      { new: true }
    );
  }

  return doc;
}

async function createReservation(ticket) {
  try {
    const res = await fetch(
      `${process.env.VIEWTRIP_BACKEND}/api/reservations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
      }
    );

    if (!res.ok) throw new Error('Could not create reservation');

    const data = await res.json();

    return data.data.reservation;
  } catch (err) {
    console.log(err.message);
  }
}
