const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { v4: uuidv4 } = require('uuid');
const Nationality = require('../models/Nationality');
const InsuranceApplication = require('../models/InsuranceApplication');
const brevo = require('../utils/brevo');
const logger = require('../utils/logger');
const {
  fetchWISInsuranceQuotes,
  buildWISQuotePayload,
  fetchWISNationalities,
  buildWISFinalizePayload,
  finalizeWISInsurance,
  validateApplicationBody,
  validateCreateBody,
  validateForm,
  createInsuranceMongoDbDocument,
  finalizeInsuranceMongoDbDocument,
  resolveAffiliateForApplication,
  downloadWISInsuranceDocuments,
  confirmDirectPayInsurance,
  generatePaymentSyncToken,
} = require('../services/insurance.service');

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.getAllApplications = catchAsync(async (req, res) => {
  const queryObj = { ...req.query };
  const page = Math.max(1, parseInt(queryObj.page, 10) || 1);
  const limit = Math.max(1, parseInt(queryObj.limit, 10) || 100);
  const skip = (page - 1) * limit;

  const createdAt = queryObj.createdAt;
  const search = queryObj.search;

  ['page', 'limit', 'search', 'createdAt'].forEach((f) => delete queryObj[f]);
  Object.keys(queryObj).forEach((k) => queryObj[k] === 'all' && delete queryObj[k]);

  const filter = { ...queryObj };

  if (createdAt && createdAt !== 'all_time') {
    const now = new Date();
    const map = {
      '6_hours': 6,
      '12_hours': 12,
      '24_hours': 24,
      '7_days': 7 * 24,
      '14_days': 14 * 24,
      '30_days': 30 * 24,
      '90_days': 90 * 24,
    };
    if (map[createdAt]) {
      filter.createdAt = {
        $gte: new Date(now.getTime() - map[createdAt] * 60 * 60 * 1000),
      };
    }
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { email: regex },
      { sessionId: regex },
      { 'passengers.firstName': regex },
      { 'passengers.lastName': regex },
      { policyNumber: regex },
      { policyId: regex },
      { transactionId: regex },
    ];
  }

  const [applications, total] = await Promise.all([
    InsuranceApplication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    InsuranceApplication.countDocuments(filter),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.status(200).json({
    message: 'Applications retrieved successfully',
    data: applications,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

exports.getApplicationsSummary = catchAsync(async (req, res) => {
  const [summary] = await InsuranceApplication.aggregate([
    {
      $group: {
        _id: null,
        totalApplications: { $sum: 1 },
        paidApplications: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, 1, 0] },
        },
        unpaidApplications: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'UNPAID'] }, 1, 0] },
        },
        pendingApplications: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'PENDING'] }, 1, 0] },
        },
        failedApplications: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'FAILED'] }, 1, 0] },
        },
        refundedApplications: {
          $sum: { $cond: [{ $eq: ['$paymentStatus', 'REFUNDED'] }, 1, 0] },
        },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, { $ifNull: ['$amountPaid.amount', 0] }, 0],
          },
        },
        singleJourneys: {
          $sum: { $cond: [{ $eq: ['$journeyType', 'single'] }, 1, 0] },
        },
        annualJourneys: {
          $sum: { $cond: [{ $eq: ['$journeyType', 'annual'] }, 1, 0] },
        },
        biennialJourneys: {
          $sum: { $cond: [{ $eq: ['$journeyType', 'biennial'] }, 1, 0] },
        },
      },
    },
  ]);

  res.status(200).json({
    message: 'Applications summary retrieved successfully',
    data: {
      totalApplications: summary?.totalApplications || 0,
      paidApplications: summary?.paidApplications || 0,
      unpaidApplications: summary?.unpaidApplications || 0,
      pendingApplications: summary?.pendingApplications || 0,
      failedApplications: summary?.failedApplications || 0,
      refundedApplications: summary?.refundedApplications || 0,
      totalRevenue: {
        currency: 'AED',
        amount: Number((summary?.totalRevenue || 0).toFixed(2)),
      },
      journeyBreakdown: {
        single: summary?.singleJourneys || 0,
        annual: summary?.annualJourneys || 0,
        biennial: summary?.biennialJourneys || 0,
      },
    },
  });
});

exports.getNationalities = catchAsync(async (req, res, next) => {
  const nationalities = await Nationality.find();

  res.status(200).json({
    message: 'Nationalities retrieved successfully',
    data: nationalities,
  });
});

exports.createNationalities = catchAsync(async (req, res, next) => {
  await Nationality.deleteMany();

  const nationalities = await fetchWISNationalities();

  const nationalitiesArray = Object.entries(nationalities).map(([id, nationality]) => ({
    id,
    nationality,
  }));

  const data = await Nationality.create(nationalitiesArray);

  res.status(200).json({
    message: 'Nationalities created successfully',
    data,
  });
});

exports.getInsuranceApplication = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;

  const data = await InsuranceApplication.findOne({ sessionId });
  if (!data) return next(new AppError('Insurance application not found', 404));

  res.status(200).json({
    message: 'Insurance application retrieved successfully',
    data,
  });
});

exports.getInsuranceQuotes = catchAsync(async (req, res, next) => {
  validateForm(req.body);
  const formattedBody = buildWISQuotePayload(req.body);

  const data = await fetchWISInsuranceQuotes(formattedBody);

  res.status(200).json({
    message: 'Insurance quotes retrieved successfully',
    data,
  });
});

exports.createInsuranceApplication = catchAsync(async (req, res, next) => {
  const sessionId = req.body.sessionId || uuidv4();
  const payload = {
    ...req.body,
    sessionId,
    affiliateId: req.body.affiliateId || req.headers['x-affiliate-id'],
  };

  validateCreateBody(payload);

  const application = await createInsuranceMongoDbDocument(payload);

  try {
    const lead = payload.passengers[0];
    await brevo.createContact({ firstName: lead.firstName, lastName: lead.lastName, email: payload.email });
  } catch (err) {
    logger.warn('Brevo createContact failed', {
      email: payload.email,
      requestId: req.id,
      error: err,
    });
  }

  res.status(201).json({
    message: 'Insurance application created successfully',
    data: { sessionId: application.sessionId, id: application._id },
  });
});

exports.updateInsuranceApplication = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const { paymentStatus } = req.body;

  const allowed = ['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'];
  if (paymentStatus && !allowed.includes(paymentStatus)) {
    return next(new AppError(`Invalid paymentStatus. Must be one of: ${allowed.join(', ')}`, 400));
  }

  const updates = {};
  if (paymentStatus) updates.paymentStatus = paymentStatus;

  if (Object.keys(updates).length === 0) {
    return next(new AppError('No valid fields to update', 400));
  }

  const application = await InsuranceApplication.findOneAndUpdate(
    { sessionId },
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!application) return next(new AppError('Insurance application not found', 404));

  if (paymentStatus === 'PAID' || paymentStatus === 'REFUNDED') {
    try {
      await brevo.updateContactAttribute({
        email: application.email,
        attribute: 'PAYMENT_STATUS',
        value: paymentStatus,
      });
    } catch (err) {
      logger.warn('Brevo updateContactAttribute failed', {
        email: application.email,
        paymentStatus,
        requestId: req.id,
        error: err,
      });
    }
  }

  res.status(200).json({
    message: 'Insurance application updated successfully',
    data: application,
  });
});

exports.finalizeInsurance = catchAsync(async (req, res, next) => {
  const sessionId = req.body.sessionId;
  if (!sessionId) return next(new AppError('Session ID is required', 400));

  const payload = {
    ...req.body,
    sessionId,
    affiliateId: req.body.affiliateId || req.headers['x-affiliate-id'],
  };

  validateApplicationBody(payload);
  await resolveAffiliateForApplication(payload.affiliateId);

  const paymentSyncToken = generatePaymentSyncToken();
  const data = buildWISFinalizePayload(payload, { paymentSyncToken });

  const { policy_id, premium, directpay } = await finalizeWISInsurance(data);
  const currency = req.body.currency || 'AED';

  await finalizeInsuranceMongoDbDocument(sessionId, policy_id, premium, currency, paymentSyncToken);

  res.status(200).json({
    message: 'Insurance finalized successfully',
    data: { policyId: policy_id, premium, currency, paymentUrl: directpay },
  });
});

exports.downloadInsurancePolicy = catchAsync(async (req, res, next) => {
  const { policyId, index } = req.params;

  const policy_documents = await downloadWISInsuranceDocuments(policyId);

  if (!policy_documents || !policy_documents[index]) {
    return next(new AppError('Policy document not found', 404));
  }

  res.status(200).json({
    message: 'Policy documents downloaded successfully',
    data: { policyDocuments: policy_documents[index].url },
  });
});

exports.getInsuranceDocuments = catchAsync(async (req, res, next) => {
  const { policyId } = req.params;

  const policy_documents = await downloadWISInsuranceDocuments(policyId);

  if (!policy_documents || policy_documents.length === 0) {
    return next(new AppError('Policy documents not found', 404));
  }

  res.status(200).json({
    message: 'Policy documents retrieved successfully',
    data: policy_documents,
  });
});

exports.confirmInsurancePayment = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const paymentSyncToken =
    req.body?.paymentSyncToken || req.query?.paymentSyncToken || req.headers['x-payment-sync-token'];
  const paymentReturnStatus = req.body?.paymentStatus || req.query?.paymentStatus || 'PAID';

  const data = await confirmDirectPayInsurance(sessionId, paymentSyncToken, paymentReturnStatus);

  res.status(200).json({
    message:
      data.syncStatus === 'ISSUED'
        ? 'Insurance payment verified and policy issued successfully'
        : data.syncStatus === 'FAILED'
          ? 'Insurance payment return marked as failed'
          : 'Insurance payment is still pending confirmation from WIS',
    data,
  });
});

exports.deleteInsuranceApplication = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;

  const application = await InsuranceApplication.findOneAndDelete({ sessionId });

  if (!application) {
    return next(new AppError('Insurance application not found', 404));
  }

  res.status(204).json({ data: null });
});
