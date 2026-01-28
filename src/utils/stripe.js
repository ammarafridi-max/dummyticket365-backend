const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

function verifyStripeSignature(req) {
  const sig = req.headers['stripe-signature'];

  try {
    return stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return null;
  }
}

module.exports = {
  verifyStripeSignature,
  stripe,
};
