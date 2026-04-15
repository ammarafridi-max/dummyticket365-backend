const { randomBytes } = require('crypto');
const AppError = require('../utils/appError');
const Affiliate = require('../models/Affiliate');
const InsuranceApplication = require('../models/InsuranceApplication');
const { insurancePaymentCompletionEmail } = require('./notification.service');
const brevo = require('../utils/brevo');
const logger = require('../utils/logger');
const {
  fetchWISNationalities,
  fetchWISInsuranceQuotes,
  finalizeWISInsurance,
  issueWISInsurance,
  purchaseWISInsurance,
  sendWISEmail,
  downloadWISInsuranceDocuments,
  buildWISQuotePayload,
  buildWISFinalizePayload,
} = require('../utils/wis');

const validateForm = (body) => {
  const { adults = 0, children = 0, seniors = 0 } = body.quantity || {};
  const totalPeople = adults + children + seniors;

  if (!body.startDate) throw new AppError('Start date is missing');
  if (!body.endDate) throw new AppError('End date is missing');
  if (!body.region) throw new AppError('Region is missing');
  if (adults < 1 || totalPeople === 0) throw new AppError('Please select at least 1 adult');
};

const validateCreateBody = (body) => {
  if (!body.email) throw new AppError('Email address is required', 400);
  if (!body.streetAddress) throw new AppError('Address is required', 400);
  if (!body.city) throw new AppError('City is required', 400);
  if (!body.country) throw new AppError('Country is required', 400);
  if (!body.mobile || !body.mobile.digits) throw new AppError('Phone number is required', 400);
  if (!Array.isArray(body.passengers) || body.passengers.length === 0) {
    throw new AppError('At least one passenger is required', 400);
  }
  body.passengers.forEach((pax, i) => {
    const n = i + 1;
    if (!pax.firstName) throw new AppError(`Passenger ${n}: first name is required`, 400);
    if (!pax.lastName) throw new AppError(`Passenger ${n}: last name is required`, 400);
    if (!pax.dob) throw new AppError(`Passenger ${n}: date of birth is required`, 400);
    if (!pax.passport) throw new AppError(`Passenger ${n}: passport number is required`, 400);
    if (!pax.nationality) throw new AppError(`Passenger ${n}: nationality is required`, 400);
  });
};

const validateApplicationBody = (body) => {
  if (!body.quoteId) throw new AppError('Quote ID missing');
  if (!body.schemeId) throw new AppError('Scheme ID missing');
  if (!body.email) throw new AppError('Email address not entered');
  if (!body.streetAddress) throw new AppError('Address is missing');
  if (!body.city) throw new AppError('City is missing');
  if (!body.country) throw new AppError('Country is missing');
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

const resolveAffiliateForApplication = async (affiliateIdInput) => {
  const normalizedAffiliateId = String(affiliateIdInput || '').trim();
  if (!normalizedAffiliateId) return null;

  const affiliate = await Affiliate.findOne({
    affiliateId: normalizedAffiliateId,
    isActive: true,
  }).select('_id affiliateId name email commissionPercent isActive');

  if (!affiliate) {
    throw new AppError('Affiliate not found or inactive', 400);
  }

  return affiliate;
};

const generatePaymentSyncToken = () => randomBytes(24).toString('hex');

const serializeApplicationForClient = (application, syncStatus) => {
  if (!application) {
    return application;
  }

  const payload = typeof application.toObject === 'function' ? application.toObject() : { ...application };
  delete payload.paymentSyncToken;

  if (syncStatus) {
    payload.syncStatus = syncStatus;
  }

  return payload;
};

const createInsuranceMongoDbDocument = async (body) => {
  const affiliate = await resolveAffiliateForApplication(body.affiliateId);

  return await InsuranceApplication.create({
    sessionId: body.sessionId,
    affiliate: affiliate?._id || null,
    affiliateId: affiliate?.affiliateId || null,
    quoteId: body.quoteId != null ? String(body.quoteId) : undefined,
    schemeId: body.schemeId != null ? String(body.schemeId) : undefined,
    journeyType: body.journeyType,
    startDate: body.startDate,
    endDate: body.endDate,
    region: body.region,
    quantity: body.quantity || {},
    passengers: body.passengers.map((pax) => ({
      type: pax.type,
      title: pax.title,
      firstName: pax.firstName,
      lastName: pax.lastName,
      dob: pax.dob,
      nationality: pax.nationality?.nationality || pax.nationality,
      nationalityId: pax.nationality?.id || null,
      passport: pax.passport,
    })),
    email: body.email,
    streetAddress: body.streetAddress,
    addressLine2: body.addressLine2 || '',
    city: body.city,
    country: body.country,
    mobile: body.mobile,
    paymentStatus: 'UNPAID',
  });
};

const finalizeInsuranceMongoDbDocument = async (sessionId, policyId, premium, currency, paymentSyncToken) => {
  const normalizedAmount = premium != null ? Number(premium) : undefined;
  const normalizedCurrency = currency != null ? String(currency).toUpperCase() : undefined;

  const application = await InsuranceApplication.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        policyId,
        paymentStatus: 'PENDING',
        issuanceStatus: 'PENDING',
        paymentSyncToken,
        paymentReturnStatus: 'PENDING',
        paymentVerifiedAt: null,
        issuedAt: null,
        ...(normalizedAmount !== undefined && !Number.isNaN(normalizedAmount)
          ? { amountPaid: { currency: normalizedCurrency, amount: normalizedAmount } }
          : {}),
      },
    },
    { new: true, runValidators: true },
  );

  if (!application) throw new AppError('Insurance application not found. Please restart the booking.', 404);

  return application;
};

const confirmDirectPayInsurance = async (sessionId, paymentSyncToken, paymentReturnStatus = 'PAID') => {
  const normalizedToken = String(paymentSyncToken || '').trim();
  const application = await InsuranceApplication.findOne({ sessionId }).select('+paymentSyncToken');

  if (!application) {
    throw new AppError('Insurance application not found', 404);
  }

  if (!normalizedToken || !application.paymentSyncToken || normalizedToken !== application.paymentSyncToken) {
    throw new AppError('Invalid payment confirmation token', 403);
  }

  if (paymentReturnStatus && paymentReturnStatus !== 'PAID') {
    const failedApplication = await InsuranceApplication.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          paymentStatus: 'FAILED',
          issuanceStatus: 'FAILED',
          paymentReturnStatus,
        },
      },
      { new: true },
    );

    return {
      ...serializeApplicationForClient(failedApplication),
      syncStatus: 'FAILED',
    };
  }

  if (application.paymentStatus === 'PAID' && application.issuanceStatus === 'ISSUED') {
    return serializeApplicationForClient(application, 'ISSUED');
  }

  let policyNumber;

  try {
    policyNumber = await issueWISInsurance(application.policyId);
  } catch (err) {
    logger.warn('WIS issue confirmation is still pending or unavailable', {
      sessionId,
      policyId: application.policyId,
      error: err,
    });

    const pendingApplication = await InsuranceApplication.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          paymentStatus: 'PENDING',
          issuanceStatus: 'PENDING',
          paymentReturnStatus: 'PAID',
        },
      },
      { new: true },
    );

    return {
      ...serializeApplicationForClient(pendingApplication),
      syncStatus: 'PENDING_CONFIRMATION',
    };
  }

  if (!policyNumber) {
    const pendingApplication = await InsuranceApplication.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          paymentStatus: 'PENDING',
          issuanceStatus: 'PENDING',
          paymentReturnStatus: 'PAID',
        },
      },
      { new: true },
    );

    return {
      ...serializeApplicationForClient(pendingApplication),
      syncStatus: 'PENDING_CONFIRMATION',
    };
  }

  await sendWISEmail(application.policyId);

  const updated = await InsuranceApplication.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        policyNumber,
        paymentStatus: 'PAID',
        issuanceStatus: 'ISSUED',
        paymentReturnStatus: 'PAID',
        paymentVerifiedAt: new Date(),
        issuedAt: new Date(),
        amountPaid: {
          currency: application?.amountPaid?.currency || 'AED',
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

  try {
    await brevo.updateContactAttribute({ email: updated.email, attribute: 'PAYMENT_STATUS', value: 'PAID' });
  } catch (err) {
    logger.warn('Brevo updateContactAttribute failed', {
      email: updated.email,
      paymentStatus: 'PAID',
      error: err,
    });
  }

  return serializeApplicationForClient(updated, 'ISSUED');
};

module.exports = {
  validateForm,
  validateCreateBody,
  validateApplicationBody,
  buildWISQuotePayload,
  buildWISFinalizePayload,
  fetchWISNationalities,
  fetchWISInsuranceQuotes,
  finalizeWISInsurance,
  issueWISInsurance,
  purchaseWISInsurance,
  sendWISEmail,
  downloadWISInsuranceDocuments,
  createInsuranceMongoDbDocument,
  finalizeInsuranceMongoDbDocument,
  confirmDirectPayInsurance,
  resolveAffiliateForApplication,
  generatePaymentSyncToken,
};
