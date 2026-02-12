const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PassengerSchema = new mongoose.Schema({
  type: String,
  title: String,
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
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
    pnr: { type: String },
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
      enum: ['UNPAID', 'PAID', 'REFUNDED'],
      default: 'UNPAID',
    },
    ticketValidity: {
      type: String,
      enum: ['2 Days', '7 Days', '14 Days'],
      default: '2 Days',
    },
    ticketDelivery: {
      immediate: { type: Boolean },
      deliveryDate: { type: String },
    },
    flightDetails: {
      departureFlight: FlightSchema,
      returnFlight: { type: FlightSchema, default: null },
    },
    totalAmount: { type: Number },
    amountPaid: {
      currency: { type: String },
      amount: { type: Number },
    },
    orderStatus: {
      type: String,
      enum: ['PENDING', 'DELIVERED', 'PROGRESS', 'REFUNDED'],
    },
    transactionId: {
      type: String,
    },
    handledBy: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
  },

  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

DummyTicketSchema.virtual('leadPassenger').get(function () {
  if (this.passengers && this.passengers.length > 0) {
    const p = this.passengers[0];
    return `${p.title || ''} ${p.firstName || ''} ${p.lastName || ''}`.trim();
  }
  return null;
});

DummyTicketSchema.index({ createdAt: -1 });
DummyTicketSchema.index({ email: 1 });
DummyTicketSchema.index({ orderStatus: 1 });
DummyTicketSchema.index({ paymentStatus: 1 });

const DummyTicket = mongoose.model('dummyTicket', DummyTicketSchema);

module.exports = DummyTicket;
