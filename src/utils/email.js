const AppError = require('./appError');
const config = require('./config');
const logger = require('./logger');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SENDER = { name: 'Dummy Ticket 365', email: config.adminEmail };

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'api-key': config.brevoApiKey,
});

const sendEmail = async ({ email, name, subject, htmlContent, textContent }) => {
  try {
    if (!config.brevoApiKey) {
      logger.warn('Email skipped because BREVO_API_KEY is missing', { email, subject });
      return false;
    }

    const res = await fetch(BREVO_URL, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        sender: BREVO_SENDER,
        to: [{ email, name }],
        subject,
        textContent,
        htmlContent,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Brevo email request failed (${res.status}): ${body || 'No response body'}`);
    }

    return true;
  } catch (err) {
    logger.error('Email sending failed', {
      email,
      subject,
      error: err,
    });

    if (process.env.NODE_ENV === 'development') {
      throw new AppError('Could not send email', 400);
    }

    return false;
  }
};

module.exports = sendEmail;
