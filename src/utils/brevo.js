const config = require('./config');
const logger = require('./logger');

const BREVO_URL = 'https://api.brevo.com/v3';

const hasBrevoConfig = () => Boolean(config.brevoApiKey);

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'api-key': config.brevoApiKey,
});

const parseResponseBody = async (res) => {
  const text = await res.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (_err) {
    return { raw: text };
  }
};

const logBrevoFailure = async (action, res) => {
  const body = await parseResponseBody(res);

  logger.warn('Brevo request failed', {
    action,
    statusCode: res.status,
    response: body,
  });
};

exports.getContact = async (email) => {
  if (!hasBrevoConfig()) {
    logger.warn('Brevo getContact skipped because BREVO_API_KEY is missing');
    return false;
  }

  const res = await fetch(`${BREVO_URL}/contacts/${encodeURIComponent(email.toLowerCase())}`, {
    headers: { 'api-key': config.brevoApiKey },
  });

  if (res.status === 404) {
    return false;
  }

  if (!res.ok) {
    await logBrevoFailure('getContact', res);
    throw new Error('Brevo getContact failed');
  }

  const json = await parseResponseBody(res);

  return json;
};

exports.createContact = async ({ firstName, lastName, email, from, to, departureDate, returnDate }) => {
  if (!hasBrevoConfig()) {
    logger.warn('Brevo createContact skipped because BREVO_API_KEY is missing', { email });
    return false;
  }

  const attributes = {
    FIRSTNAME: firstName,
    LASTNAME: lastName,
    PAYMENT_STATUS: 'UNPAID',
  };

  if (from !== undefined) attributes.FROM = from;
  if (to !== undefined) attributes.TO = to;
  if (departureDate !== undefined) attributes.DEPARTURE_DATE = departureDate;
  if (returnDate !== undefined) attributes.RETURN_DATE = returnDate || '';

  const res = await fetch(`${BREVO_URL}/contacts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      email: email.toLowerCase(),
      attributes,
      updateEnabled: true,
    }),
  });

  if (!res.ok) {
    await logBrevoFailure('createContact', res);
    throw new Error('Brevo sync failed');
  }

  return true;
};

exports.updateContactAttribute = async ({ email, attribute, value }) => {
  if (!hasBrevoConfig()) {
    logger.warn('Brevo updateContactAttribute skipped because BREVO_API_KEY is missing', {
      email,
      attribute,
    });
    return false;
  }

  const res = await fetch(`${BREVO_URL}/contacts/${encodeURIComponent(email.toLowerCase())}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({
      attributes: { [attribute]: value },
    }),
  });

  if (!res.ok) {
    await logBrevoFailure('updateContactAttribute', res);
    throw new Error('Brevo updateContactAttribute failed');
  }

  return true;
};

exports.markPaid = async (email) => exports.updateContactAttribute({
  email,
  attribute: 'PAYMENT_STATUS',
  value: 'PAID',
});
