const Stripe = require('stripe');
const AppError = require('./appError');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

async function createCheckoutSession({
  amount,
  currency = 'aed',
  productName,
  customerEmail,
  metadata = {},
  successUrl,
  cancelUrl,
  idempotencyKey,
}) {
  const totalAmount = Number(amount);

  if (!totalAmount || totalAmount <= 0) {
    throw new AppError('Invalid payment amount', 400);
  }

  return stripe.checkout.sessions.create(
    {
      payment_method_types: ['card'],
      invoice_creation: { enabled: true },
      customer_email: customerEmail,
      metadata,
      line_items: [
        {
          price_data: {
            unit_amount: Math.round(totalAmount * 100),
            currency,
            product_data: { name: productName },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    idempotencyKey ? { idempotencyKey } : undefined
  );
}

function verifyStripeSignature(req) {
  const sig = req.headers['stripe-signature'];

  try {
    return stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('❌ Stripe signature verification failed:', err.message);
    return null;
  }
}

module.exports = {
  createCheckoutSession,
  verifyStripeSignature,
};
