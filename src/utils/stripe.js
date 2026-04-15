const Stripe = require('stripe');
const logger = require('./logger');
const config = require('./config');

let stripeClient;

const getStripeClient = () => {
  if (!config.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-04-10',
    });
  }

  return stripeClient;
};

function verifyStripeSignature(req) {
  const sig = req.headers['stripe-signature'];

  try {
    if (!config.stripeWebhookSecret) {
      logger.error('Stripe webhook verification failed because STRIPE_WEBHOOK_SECRET is missing');
      return null;
    }

    return getStripeClient().webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
  } catch (err) {
    logger.warn('Stripe signature verification failed', { error: err });
    return null;
  }
}

module.exports = {
  getStripeClient,
  verifyStripeSignature,
  stripe: new Proxy(
    {},
    {
      get(_target, prop) {
        return getStripeClient()[prop];
      },
    },
  ),
};
