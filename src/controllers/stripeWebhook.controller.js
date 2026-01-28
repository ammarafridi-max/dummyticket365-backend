const { verifyStripeSignature } = require('../utils/stripe');
const ticketService = require('../services/ticket.service');
const insuranceService = require('../services/insurance.service');
const StripeWebhookEvent = require('../models/StripeWebhookEvent');

exports.stripeWebhook = async (req, res) => {
  const event = verifyStripeSignature(req);

  if (!event) {
    console.error('❌ Invalid Stripe webhook signature');
    return res.status(400).send('Invalid signature');
  }
  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true });
  }

  const session = event.data.object;
  try {
    const already = await StripeWebhookEvent.findOne({ eventId: event.id });
    if (already) {
      return res.json({ received: true, duplicate: true });
    }

    const productType = session.metadata?.productType || 'unknown';
    const sessionId = session.metadata?.sessionId;

    await StripeWebhookEvent.create({
      eventId: event.id,
      type: event.type,
      productType,
      sessionId,
      createdAtStripe: event.created ? new Date(event.created * 1000) : undefined,
    });

    if (session.payment_status !== 'paid') {
      return res.json({ received: true, unpaid: true });
    }

    switch (productType) {
      case 'ticket':
        await ticketService.handleStripeSuccess(session);
        break;

      case 'insurance':
        await insuranceService.handleStripeSuccess(session);
        break;

      default:
        console.error('❌ Unknown productType:', productType, 'metadata:', session.metadata);
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('❌ Stripe webhook processing failed:', err);
    return res.status(500).send('Webhook handler failed');
  }
};
