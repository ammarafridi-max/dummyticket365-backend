const AppError = require('../utils/appError');
const InsuranceApplication = require('../models/InsuranceApplication');
const { insurancePaymentCompletionEmail } = require('./notification.service');

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

  const { adults = 0, children = 0, seniors = 0 } = body.quantity || {};
  const totalPeople = adults + children + seniors;

  if (adults < 1 || totalPeople === 0) {
    throw new AppError('Please select at least 1 adult');
  }
};

const formatFormBody = (body) => {
  const formattedBody = {
    journey_id: body.journeyType,
    start_date: formatDateISO(body.startDate),
    end_date: formatDateISO(body.endDate),
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
  if (!body.address1) throw new AppError('Address is missing');
  if (!body.address3) throw new AppError('City is missing');
  if (!body.address4) throw new AppError('Country is missing');
  if (!body.mobile || !body.mobile.digits) throw new AppError('Phone Number missing');
  if (!Array.isArray(body.passengers) || body.passengers.length === 0) {
    throw new AppError('At least one passenger is required');
  }

  body.passengers.forEach((pax) => {
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
  data.address1 = body.address1;
  data.address2 = body.address2 || '';
  data.address3 = body.address3;
  data.address4 = body.address4;
  data.custom_redirect_failed_url = `${process.env.DT365_FRONTEND}/travel-insurance/passenger-details?paymentStatus=FAILED`;
  data.custom_redirect_success_url = `${process.env.DT365_FRONTEND}/travel-insurance/payment?sessionId=${body.sessionId}&paymentStatus=PAID`;

  data.title_traveller = body.passengers.map((passenger) => passenger.title);
  data.first_name_traveller = body.passengers.map((passenger) => passenger.firstName);
  data.last_name_traveller = body.passengers.map((passenger) => passenger.lastName);
  data.dob = body.passengers.map((passenger) => formatDateISO(passenger.dob));
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

const createInsuranceMongoDbDocument = async (body, policy_id, premium = null, currency = null) => {
  const normalizedAmount = premium === null || premium === undefined ? null : Number(premium);
  const normalizedCurrency = currency ? String(currency).toUpperCase() : null;

  return await InsuranceApplication.create({
    sessionId: body.sessionId,
    quoteId: body.quoteId,
    schemeId: body.schemeId,
    policyId: policy_id,
    journeyType: body.journeyType,
    startDate: body.startDate,
    endDate: body.endDate,
    region: body.region,
    quantity: body.quantity || {},
    passengers: body.passengers.map((pax) => ({
      title: pax.title,
      firstName: pax.firstName,
      lastName: pax.lastName,
      dob: pax.dob,
      nationality: pax.nationality?.nationality || pax.nationality,
      nationalityId: pax.nationality?.id || null,
      passport: pax.passport,
    })),
    email: body.email,
    address1: body.address1,
    address2: body.address2 || '',
    address3: body.address3,
    address4: body.address4,
    mobile: body.mobile,
    amountPaid:
      normalizedAmount !== null && !Number.isNaN(normalizedAmount)
        ? {
            currency: normalizedCurrency || 'USD',
            amount: normalizedAmount,
          }
        : undefined,
    paymentStatus: 'UNPAID',
  });
};

const confirmDirectPayInsurance = async (sessionId) => {
  const application = await InsuranceApplication.findOne({ sessionId });
  if (!application) {
    throw new AppError('Insurance application not found', 404);
  }

  if (application.paymentStatus === 'PAID') {
    return application;
  }

  const policyNumber = await issueWISInsurance(application.policyId);
  if (!policyNumber) {
    throw new AppError('Unable to confirm payment from WIS');
  }

  await sendWISEmail(application.policyId);

  const updated = await InsuranceApplication.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        policyNumber,
        paymentStatus: 'PAID',
        amountPaid: {
          currency: application?.amountPaid?.currency || 'USD',
          amount: application?.amountPaid?.amount || 0,
        },
        transactionId: `WIS_DIRECTPAY_${application.policyId}`,
      },
    },
    { new: true },
  );

  await insurancePaymentCompletionEmail({
    leadTraveler: updated?.leadPassenger,
    email: updated?.email,
    sessionId: updated?.sessionId,
    policyId: updated?.policyId,
    policyNumber: updated?.policyNumber,
    amount: updated?.amountPaid?.amount,
    currency: updated?.amountPaid?.currency,
    journeyType: updated?.journeyType,
    startDate: updated?.startDate,
    endDate: updated?.endDate,
    region: updated?.region?.id || updated?.region?.name,
    quoteId: updated?.quoteId,
    mobile: updated?.mobile?.code && updated?.mobile?.digits ? `${updated.mobile.code}${updated.mobile.digits}` : '',
  });

  return updated;
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
  purchaseWISInsurance,
  sendWISEmail,
  downloadWISInsuranceDocuments,
  createInsuranceMongoDbDocument,
  confirmDirectPayInsurance,
};
