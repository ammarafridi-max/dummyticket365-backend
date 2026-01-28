const AppError = require('./appError');

const ADMIN_EMAIL = 'info@dummyticket365.com';
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_HEADER = { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': BREVO_API_KEY };
const BREVO_SENDER = { name: 'Dummy Ticket 365', email: ADMIN_EMAIL };

const sendEmail = async ({ email, name, subject, htmlContent, textContent }) => {
  try {
    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: BREVO_HEADER,
      body: JSON.stringify({
        sender: BREVO_SENDER,
        to: [{ email, name }],
        subject,
        textContent,
        htmlContent,
      }),
    });

    if (!res.ok) {
      throw new Error('Brevo email request failed');
    }
  } catch (err) {
    console.error('Email sending failed:', err.message);

    if (process.env.NODE_ENV === 'development') {
      throw new AppError('Could not send email', 400);
    }
  }
};

module.exports = sendEmail