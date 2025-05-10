require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(formData, sessionId) {
  const totalAmount = parseFloat(formData.totalAmount);
  const metadata = {
    customer: `${formData.passengers[0].firstName} ${formData.passengers[0].lastName}`,
    ticketType: formData.type,
    departureCity: formData.from,
    arrivalCity: formData.to,
    departureDate: formData.departureDate,
    returnDate: formData.returnDate,
    sessionId: sessionId,
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    invoice_creation: {
      enabled: true,
    },
    metadata,
    customer_email: formData.email,
    line_items: [
      {
        price_data: {
          unit_amount: totalAmount * 100,
          currency: 'usd',
          product_data: {
            name: `${formData.type} Flight Reservation`,
          },
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/payment-successful?sessionId=${sessionId}`,
    cancel_url: `${process.env.FRONTEND_URL}/booking/review-details`,
  });

  return session;
}

function verifyStripeSignature(req) {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const result = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
    return result;
  } catch (err) {
    console.log(err);
    return null;
  }
}

module.exports = { createCheckoutSession, verifyStripeSignature };
