const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    isBaseCurrency: {
      type: Boolean,
      default: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

currencySchema.pre('save', async function () {
  if (this.isBaseCurrency) {
    this.rate = 1;
  }
});

currencySchema.index(
  { isBaseCurrency: 1 },
  {
    unique: true,
    partialFilterExpression: { isBaseCurrency: true },
  },
);

module.exports = mongoose.model('Currency', currencySchema);
