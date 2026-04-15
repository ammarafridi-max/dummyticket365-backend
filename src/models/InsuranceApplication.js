const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const PassengerSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true },
    title: { type: String, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: String, required: true, trim: true },
    nationality: { type: String, required: true, trim: true },
    nationalityId: { type: String, trim: true },
    passport: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const InsuranceApplicationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, default: uuidv4, unique: true },
    affiliate: {
      type: mongoose.Schema.ObjectId,
      ref: 'Affiliate',
      default: null,
      index: true,
    },
    affiliateId: {
      type: String,
      trim: true,
      index: true,
    },

    journeyType: {
      type: String,
      required: true,
      enum: ['single', 'annual', 'biennial'],
    },

    // Stored as 'YYYY-MM-DD' strings
    startDate: { type: String, required: true },
    endDate: { type: String },

    region: {
      id: { type: String, required: true, enum: ['gulf', 'europe', 'subcon', 'worldwide_ex', 'worldwide'] },
      name: { type: String, required: true },
      description: { type: String },
    },

    quantity: {
      adults: { type: Number, required: true, min: 0, default: 0 },
      children: { type: Number, min: 0, default: 0 },
      seniors: { type: Number, min: 0, default: 0 },
    },

    passengers: {
      type: [PassengerSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one passenger is required',
      },
    },

    email: { type: String, required: true, trim: true, match: /^\S+@\S+\.\S+$/ },
    streetAddress: { type: String, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },

    mobile: {
      code: { type: String, required: true, trim: true },
      digits: { type: String, required: true, trim: true },
    },

    schemeId: { type: String, trim: true },
    quoteId: { type: String, trim: true },

    policyId: { type: String, trim: true },
    policyNumber: { type: String, trim: true },

    paymentStatus: { type: String, enum: ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'UNPAID' },
    issuanceStatus: {
      type: String,
      enum: ['NOT_ISSUED', 'PENDING', 'ISSUED', 'FAILED'],
      default: 'NOT_ISSUED',
    },
    paymentSyncToken: { type: String, trim: true, select: false },
    paymentReturnStatus: { type: String, trim: true },
    paymentVerifiedAt: { type: Date },
    issuedAt: { type: Date },

    amountPaid: {
      currency: { type: String },
      amount: { type: Number },
    },

    transactionId: { type: String, trim: true },

    reviewEmailSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

InsuranceApplicationSchema.index({ email: 1 });
InsuranceApplicationSchema.index({ policyId: 1 }, { sparse: true });
InsuranceApplicationSchema.index({ transactionId: 1 }, { sparse: true });
InsuranceApplicationSchema.index({ paymentSyncToken: 1 }, { sparse: true });
InsuranceApplicationSchema.index({ affiliate: 1, createdAt: -1 });

InsuranceApplicationSchema.virtual('leadPassenger').get(function () {
  if (this.passengers && this.passengers.length > 0) {
    const p = this.passengers[0];
    return `${p.title || ''} ${p.firstName || ''} ${p.lastName || ''}`.trim();
  }
  return null;
});

module.exports = mongoose.model('insurance-application', InsuranceApplicationSchema);
