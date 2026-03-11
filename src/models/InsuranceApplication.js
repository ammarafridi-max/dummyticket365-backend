const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PassengerSchema = new mongoose.Schema(
  {
    type: String,
    title: String,
    firstName: String,
    lastName: String,
    dob: String,
    nationality: String,
    nationalityId: String,
    passport: String,
  },
  { _id: false },
);

const InsuranceApplicationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, default: uuidv4, unique: true },
    journeyType: {
      type: String,
      required: true,
      enum: ['single', 'annual', 'biennial'],
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    region: {
      id: { type: String, enum: ['gulf', 'europe', 'subcon', 'worldwide_ex', 'worldwide'] },
      name: { type: String },
      description: { type: String },
    },
    quantity: {
      adults: { type: Number },
      children: { type: Number },
      seniors: { type: Number },
    },
    passengers: [PassengerSchema],
    email: { type: String, required: true, match: /^\S+@\S+\.\S+$/ },
    address1: { type: String },
    address2: { type: String },
    address3: { type: String },
    address4: { type: String },
    mobile: {
      code: { type: String },
      digits: { type: String },
    },
    schemeId: { type: Number },
    quoteId: { type: Number },
    policyId: { type: String },
    policyNumber: { type: String },
    paymentStatus: { type: String, enum: ['PAID', 'UNPAID'], default: 'UNPAID' },
    amountPaid: {
      currency: { type: String },
      amount: { type: Number },
    },
    transactionId: { type: String },
    reviewEmailSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

InsuranceApplicationSchema.virtual('leadPassenger').get(function () {
  if (this.passengers && this.passengers.length > 0) {
    const p = this.passengers[0];
    return `${p.title || ''} ${p.firstName || ''} ${p.lastName || ''}`.trim();
  }
  return null;
});

module.exports = mongoose.model('insurance-application', InsuranceApplicationSchema);
