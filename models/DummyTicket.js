const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const DummyTicketSchema = mongoose.Schema(
  {
    sessionId: { type: String, default: uuidv4, unique: true },
    type: {
      type: String,
      enum: ['One Way', 'Return'],
    },
    passengers: { type: Array },
    email: { type: String },
    phoneNumber: {
      code: { type: String },
      digits: { type: String },
    },
    from: { type: String },
    to: { type: String },
    departureDate: { type: String },
    returnDate: { type: String },
    quantity: {
      adults: { type: Number },
      children: { type: Number },
      infants: { type: Number },
    },
    message: { type: String },
    status: {
      type: String,
      enum: ['SEARCH_FLIGHTS', 'REVIEW_ORDER', 'PAYMENT_DONE'],
    },
    ticketValidity: {
      type: String,
      enum: ['48 Hours', '7 Days', '14 Days'],
    },
    ticketAvailability: {
      immediate: { type: Boolean },
      receiptDate: { type: String },
    },
    flightDetails: { type: Object },
    totalAmount: { type: Number },
    amountPaid: {
      currency: { type: String },
      amount: { type: Number },
    },
    orderStatus: { type: String, enum: ['PENDING', 'DELIVERED', 'CONTACTED'] },
    handledBy: { type: String },
  },

  { timestamps: true }
);

const DummyTicket = mongoose.model('dummyTicket', DummyTicketSchema);

module.exports = DummyTicket;
