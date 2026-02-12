const BREVO_URL = 'https://api.brevo.com/v3';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_HEADER = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'api-key': BREVO_API_KEY,
};

exports.getContact = async (email) => {
  const res = await fetch(`${BREVO_URL}/contacts/${encodeURIComponent(email.toLowerCase())}`, {
    headers: { 'api-key': BREVO_API_KEY },
  });

  if (res.status === 404) {
    return false;
  }

  const json = await res.json();

  return json;
};

exports.createContact = async ({ firstName, lastName, email, from, to, departureDate, returnDate }) => {
  const res = await fetch(`${BREVO_URL}/contacts`, {
    method: 'POST',
    headers: BREVO_HEADER,
    body: JSON.stringify({
      email,
      attributes: {
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        PAYMENT_STATUS: 'UNPAID',
        FROM: from,
        TO: to,
        DEPARTURE_DATE: departureDate,
        RETURN_DATE: returnDate || '',
      },
      updateEnabled: true,
    }),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    console.error('Brevo error:', data);
    throw new Error('Brevo sync failed');
  }

  console.log('Brevo sync:', data);
  return true;
};

exports.markPaid = async (email) => {
  const res = await fetch(`${BREVO_URL}/contacts/${email}`, {
    method: 'PUT',
    headers: BREVO_HEADER,
    body: JSON.stringify({
      attributes: { PAYMENT_STATUS: 'PAID' },
    }),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    console.error('Brevo error:', data);
    throw new Error('Brevo markPaid failed');
  }

  console.log('Brevo markPaid:', data);
  return true;
};
