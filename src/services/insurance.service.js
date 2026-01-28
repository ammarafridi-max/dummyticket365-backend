const AppError = require('../utils/appError');
const paymentService = require('./payment.service');
const InsuranceApplication = require('../models/InsuranceApplication');
// const reviewEmailQueue = require('../queues/reviewEmailQueue');

const isProduction = process.env.NODE_ENV === 'production'

const WISURL = isProduction ? '' : 'https://admin.uat.wisdevelopments.com/api/v1';
const agency_id = '129';
const agency_code = '3JKuGdfj';

async function fetchWIS(slug, data = {}) {
  const res = await fetch(`${WISURL}/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agency_id, agency_code, ...data }),
  });

  const json = await res.json();

  if (json.status === 'failed') {
    throw new AppError(json?.errors[0]);
  }

  return json.result;
}

const validateForm = (body) => {
  if (!body.startDate) {
    throw new AppError('Start date is missing');
  }

  if (!body.endDate) {
    throw new AppError('End date is missing');
  }

  if (!body.region) {
    throw new AppError('Region is missing');
  }

  const { adults = 0, children = 0, seniors = 0 } = body.quantity;
  const totalPeople = adults + children + seniors;

  if (totalPeople === 0) {
    throw new AppError('Please select at least 1 adult, child, or senior');
  }
};

const formatFormBody = (body) => {
  const formattedBody = {
    journey_id: body.journeyType,
    start_date: body.startDate,
    end_date: body.endDate,
    region: body.region,
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

const validateApplicationBody = (body) => {
  if (!body.quoteId) throw new AppError('Quote ID missing');
  if (!body.schemeId) throw new AppError('Scheme ID missing');
  if (!body.email) throw new AppError('Email address not entered');
  if (!body.mobile.digits) throw new AppError('Phone Number missing');

  body.passengers.forEach((pax, i) => {
    if (!pax.firstName) throw new AppError('First name is missing');
    if (!pax.lastName) throw new AppError('Last name is missing');
    if (!pax.nationality) throw new AppError('Nationality is missing');
    if (!pax.dob) throw new AppError('Date of birth is missing');
    if (!pax.passport) throw new AppError('Passport number is missing');
  });

  return true;
};

const formatApplicationBody = (body) => {
  const data = {};

  data.quote_id = body.quoteId;
  data.scheme_id = body.schemeId;
  data.title_customer = body.passengers[0].title;
  data.first_name_customer = body.passengers[0].firstName;
  data.last_name_customer = body.passengers[0].lastName;
  data.email = body.email;
  data.mobile = body.mobile.code + body.mobile.digits;

  data.title_traveller = body.passengers.map((passenger) => passenger.title);
  data.first_name_traveller = body.passengers.map((passenger) => passenger.firstName);
  data.last_name_traveller = body.passengers.map((passenger) => passenger.lastName);
  data.dob = body.passengers.map((passenger) => passenger.dob);
  data.passport_number = body.passengers.map((passenger) => passenger.passport);
  data.nationality_traveller = body.passengers.map((passenger) => passenger?.nationality?.id || null);

  return data;
};

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

const createInsuranceMongoDbDocument = async (body, policy_id) => {
  return await InsuranceApplication.create({
    quoteId: body.quoteId,
    schemeId: body.schemeId,
    policyId: policy_id,
    journeyType: body.journeyType,
    startDate: body.startDate,
    endDate: body.endDate,
    region: body.region,
    quantity: body.quantity,
    passengers: body.passengers.map((pax) => ({
      firstName: pax.firstName,
      lastName: pax.lastName,
      dob: pax.dob,
      nationality: pax.nationality.nationality,
      passport: pax.passport,
    })),
    email: body.email,
    mobile: body.mobile,
    paymentStatus: 'UNPAID',
  });
};

const createStripePaymentUrl = async ({
  totalAmount,
  currency = 'aed',
  journeyType,
  startDate,
  endDate,
  region,
  sessionId,
  email,
  mobile,
  policyId,
  quoteId,
  leadTraveler = ''
}) => {
  return paymentService.createCheckoutSession({
    amount: totalAmount,
    currency: currency,
    productName: `Travel Insurance`,
    customerEmail: email,
    metadata: {
      productType: 'insurance',
      entity: 'TRAVEL_INSURANCE',
      journeyType,
      startDate,
      endDate,
      region,
      sessionId,
      mobile: `${mobile.code}-${mobile.digits}`,
      policyId,
      quoteId,
      leadTraveler
    },
    successUrl: `${process.env.MDT_FRONTEND}/travel-insurance/payment?sessionId=${sessionId}`,
    cancelUrl: `${process.env.MDT_FRONTEND}/travel-insurance/passenger-details`,
    idempotencyKey: sessionId,
  });
};

const handleStripeSuccess = async (session) => {
  if (session.payment_status !== 'paid') return;

  const { sessionId, policyId, email, leadTraveler } = session.metadata;

  if (!sessionId || !policyId) {
    throw new AppError('Missing Stripe metadata for insurance');
  }

  const existing = await InsuranceApplication.findOne({
    sessionId,
    paymentStatus: 'PAID',
  });

  if (existing) return;

  const currency = (session.currency || 'aed').toUpperCase();
  const amount = Number((session.amount_total / 100).toFixed(2));

  const policyNumber = await issueWISInsurance(policyId);

  await sendWISEmail(policyId);

  await InsuranceApplication.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        policyNumber,
        paymentStatus: 'PAID',
        amountPaid: { currency, amount },
      },
    },
    { new: true },
  );
};

module.exports = {
  validateForm,
  validateApplicationBody,
  formatFormBody,
  formatApplicationBody,
  fetchWISNationalities,
  fetchWISInsuranceQuotes,
  finalizeWISInsurance,
  issueWISInsurance,
  sendWISEmail,
  downloadWISInsuranceDocuments,
  createInsuranceMongoDbDocument,
  createStripePaymentUrl,
  handleStripeSuccess,
};
