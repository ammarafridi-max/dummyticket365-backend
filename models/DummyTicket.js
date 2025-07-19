const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PassengerSchema = new mongoose.Schema({
  type: String,
  title: String,
  firstName: String,
  lastName: String,
});

const SegmentSchema = new mongoose.Schema({
  departure: {
    iataCode: String,
    date: String,
    time: String,
  },
  arrival: {
    iataCode: String,
    date: String,
    time: String,
  },
  duration: String,
  carrierCode: String,
  flightNumber: String,
  aircraftCode: String,
  airline: {
    name: String,
    logo: String,
  },
});

const FlightSchema = new mongoose.Schema({
  duration: String,
  segments: [SegmentSchema],
});

const DummyTicketSchema = mongoose.Schema(
  {
    sessionId: { type: String, default: uuidv4, unique: true },
    type: {
      type: String,
      enum: ['One Way', 'Return'],
      default: 'One Way',
    },
    passengers: [PassengerSchema],
    email: { type: String, required: true, match: /^\S+@\S+\.\S+$/ },
    phoneNumber: {
      code: { type: String },
      digits: { type: String },
    },
    pnr: { type: String, unique: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    departureDate: { type: String, required: true },
    returnDate: { type: String },
    quantity: {
      adults: { type: Number },
      children: { type: Number },
      infants: { type: Number },
    },
    message: { type: String },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PAID'],
    },
    ticketValidity: {
      type: String,
      enum: ['2 Days', '7 Days', '14 Days'],
      default: '2 Days',
    },
    ticketAvailability: {
      immediate: { type: Boolean },
      receiptDate: { type: String },
    },
    flightDetails: {
      departureFlight: FlightSchema,
      returnFlight: FlightSchema,
    },
    totalAmount: { type: Number },
    amountPaid: {
      currency: { type: String },
      amount: { type: Number },
    },
    orderStatus: {
      type: String,
      enum: ['PENDING', 'DELIVERED', 'CONTACTED'],
      default: 'PENDING',
    },
    handledBy: { type: String, default: null },
  },

  { timestamps: true }
);

DummyTicketSchema.virtual('leadPassengerName').get(function () {
  return `${this.passengers?.[0]?.firstName || ''} ${this.passengers?.[0]?.lastName || ''}`;
});

const DummyTicket = mongoose.model('dummyTicket', DummyTicketSchema);

module.exports = DummyTicket;
