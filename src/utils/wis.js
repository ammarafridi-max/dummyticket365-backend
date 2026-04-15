const AppError = require('./appError');

const WIS_URL = process.env.WIS_URL;
const WIS_AGENCY_ID = process.env.WIS_AGENCY_ID;
const WIS_AGENCY_CODE = process.env.WIS_AGENCY_CODE;

const formatDateISO = (value) => {
  if (!value) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

async function fetchWIS(slug, data = {}) {
  const res = await fetch(`${WIS_URL}/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agency_id: WIS_AGENCY_ID, agency_code: WIS_AGENCY_CODE, ...data }),
  });

  const json = await res.json();

  if (json.status === 'failed') {
    throw new AppError(json?.errors?.[0] || 'Insurance provider error', 502);
  }

  return json.result;
}

const fetchWISNationalities = async () => {
  const { nationalities } = await fetchWIS('quote/outbound/nationalities');
  return nationalities;
};

const fetchWISInsuranceQuotes = async (data) => {
  const { quotes, quote_id } = await fetchWIS('quote/outbound/premium', data);
  return { quotes, quote_id };
};

const finalizeWISInsurance = async (data) => {
  const { policy_id, premium, currency, directpay } = await fetchWIS('quote/outbound/finalise', data);
  return { policy_id, premium, currency, directpay };
};

const issueWISInsurance = async (policyId) => {
  const { policy_number } = await fetchWIS('quote/outbound/issued', { policy_id: policyId });
  return policy_number;
};

const purchaseWISInsurance = async (policyId) => {
  const { policy_number } = await fetchWIS('quote/outbound/purchase', { policy_id: policyId });
  return policy_number;
};

const sendWISEmail = async (policyId) => {
  const { policy_id } = await fetchWIS('policy/outbound/email', { policy_id: policyId });
  return { policy_id };
};

const downloadWISInsuranceDocuments = async (policyId) => {
  const { policy_documents } = await fetchWIS('policy/outbound/documents', { policy_id: policyId });
  return policy_documents;
};

const buildWISQuotePayload = (body) => {
  const formattedBody = {
    journey_id: body.journeyType,
    start_date: formatDateISO(body.startDate),
    end_date: formatDateISO(body.endDate),
    region: body.region?.id || body.region,
    age_bands: body.quantity,
    family: 0,
    group: 0,
  };

  const { adults = 0, children = 0, seniors = 0 } = formattedBody.age_bands;
  const totalPeople = adults + children + seniors;

  if (totalPeople === 1) {
    formattedBody.family = 1;
    formattedBody.group = 1;
  } else if (adults === 2 && children > 0 && children <= 4 && seniors === 0) {
    formattedBody.family = 2;
    formattedBody.group = 1;
  } else {
    formattedBody.family = 1;
    formattedBody.group = 2;
  }

  return formattedBody;
};

const buildWISFinalizePayload = (body, options = {}) => {
  const data = {};
  const paymentSyncToken = String(options.paymentSyncToken || '').trim();
  const successUrl = new URL(`${process.env.DT365_FRONTEND}/insurance-booking/payment`);
  const failedUrl = new URL(`${process.env.DT365_FRONTEND}/insurance-booking/passengers`);

  data.quote_id = Number(body.quoteId);
  data.scheme_id = Number(body.schemeId);
  data.title_customer = body.passengers[0].title;
  data.first_name_customer = body.passengers[0].firstName;
  data.last_name_customer = body.passengers[0].lastName;
  data.email = body.email;
  data.mobile = body.mobile.code + body.mobile.digits;
  data.address1 = body.streetAddress;
  data.address2 = body.addressLine2 || '';
  data.address3 = body.city;
  data.address4 = body.country;
  failedUrl.searchParams.set('paymentStatus', 'FAILED');
  failedUrl.searchParams.set('sessionId', body.sessionId);

  successUrl.searchParams.set('sessionId', body.sessionId);
  successUrl.searchParams.set('paymentStatus', 'PAID');

  if (paymentSyncToken) {
    failedUrl.searchParams.set('paymentSyncToken', paymentSyncToken);
    successUrl.searchParams.set('paymentSyncToken', paymentSyncToken);
  }

  data.custom_redirect_failed_url = failedUrl.toString();
  data.custom_redirect_success_url = successUrl.toString();

  data.title_traveller = body.passengers.map((passenger) => passenger.title);
  data.first_name_traveller = body.passengers.map((passenger) => passenger.firstName);
  data.last_name_traveller = body.passengers.map((passenger) => passenger.lastName);
  data.dob = body.passengers.map((passenger) => formatDateISO(passenger.dob));
  data.passport_number = body.passengers.map((passenger) => passenger.passport);
  data.nationality_traveller = body.passengers.map((passenger) => passenger?.nationality?.id || null);

  return data;
};

module.exports = {
  fetchWIS,
  fetchWISNationalities,
  fetchWISInsuranceQuotes,
  finalizeWISInsurance,
  issueWISInsurance,
  purchaseWISInsurance,
  sendWISEmail,
  downloadWISInsuranceDocuments,
  buildWISQuotePayload,
  buildWISFinalizePayload,
};
