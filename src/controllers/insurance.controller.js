const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Nationality = require('../models/Nationality');
const InsuranceApplication = require('../models/InsuranceApplication');
const {
  fetchWISInsuranceQuotes,
  formatFormBody,
  fetchWISNationalities,
  formatApplicationBody,
  finalizeWISInsurance,
  validateApplicationBody,
  createStripePaymentUrl,
  validateForm,

  createInsuranceMongoDbDocument,
  downloadWISInsuranceDocuments,
} = require('../services/insurance.service');

exports.getAllApplications = catchAsync(async (req, res) => {
  const queryObj = { ...req.query };
  const page = Math.max(1, parseInt(queryObj.page, 10) || 1);
  const limit = Math.max(1, parseInt(queryObj.limit, 10) || 100);
  const skip = (page - 1) * limit;

  const createdAt = queryObj.createdAt;
  const search = queryObj.search;

  ['page', 'limit', 'search', 'createdAt', 'orderStatus'].forEach((f) => delete queryObj[f]);
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
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { email: regex },
      { 'passengers.firstName': regex },
      { 'passengers.lastName': regex },
      { policyNumber: regex },
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
  const formattedBody = formatFormBody(req.body);

  const data = await fetchWISInsuranceQuotes(formattedBody);

  res.status(200).json({
    message: 'Insurance quotes retrieved successfully',
    data,
  });
});

exports.finalizeInsurance = catchAsync(async (req, res, next) => {
  validateApplicationBody(req.body);
  const leadTraveler = `${req.body.passengers[0].firstName} ${req.body.passengers[0].lastName}`;

  const data = formatApplicationBody(req.body);

  const { policy_id, premium, currency } = await finalizeWISInsurance(data);

  const { journeyType, startDate, endDate, region, sessionId, email, mobile, policyId, quoteId } =
    await createInsuranceMongoDbDocument(req.body, policy_id);

  const currencyLower = (currency || 'aed').toLowerCase();
  const { url } = await createStripePaymentUrl({
    totalAmount: premium,
    currency: currencyLower,
    journeyType,
    startDate,
    endDate,
    region: region.id,
    sessionId,
    email,
    mobile,
    policyId,
    quoteId,
    leadTraveler,
  });

  res.status(200).json({
    message: 'Finalize in effect',
    data: { policyId: policy_id, premium, currency: currencyLower, paymentUrl: url },
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
