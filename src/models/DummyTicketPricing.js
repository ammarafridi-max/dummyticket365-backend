const mongoose = require('mongoose');

const PricingOptionSchema = new mongoose.Schema(
  {
    validity: {
      type: String,
      required: true,
      trim: true,
      enum: ['2 Days', '7 Days', '14 Days'],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const DummyTicketPricingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      default: 'dummy-ticket',
      enum: ['dummy-ticket'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    options: {
      type: [PricingOptionSchema],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

DummyTicketPricingSchema.index({ key: 1 }, { unique: true });

module.exports = mongoose.model('DummyTicketPricing', DummyTicketPricingSchema);
