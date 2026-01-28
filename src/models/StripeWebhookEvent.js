const mongoose = require('mongoose');

const StripeWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    type: { type: String },
    productType: { type: String },
    sessionId: { type: String },
    createdAtStripe: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('StripeWebhookEvent', StripeWebhookEventSchema);
