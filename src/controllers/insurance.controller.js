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

  createInsuranceMongoDbDocument,
  downloadWISInsuranceDocuments,
} = require('../services/insurance.service');
const reviewEmailQueue = require('../queues/reviewEmailQueue');

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

  res.status(200).json({
    message: 'Insurance application retrieved successfully',
    data,
  });
});

exports.getInsuranceQuotes = catchAsync(async (req, res, next) => {
  const formattedBody = formatFormBody(req.body);

  const data = await fetchWISInsuranceQuotes(formattedBody);

  res.status(200).json({
    message: 'Insurance quotes retrieved successfully',
    data,
  });
});

exports.finalizeInsurance = catchAsync(async (req, res, next) => {
  const leadTraveler = `${req.body.passengers[0].firstName} ${req.body.passengers[0].lastName}`
  validateApplicationBody(req.body);

  const data = formatApplicationBody(req.body);

  const { policy_id, premium, currency } = await finalizeWISInsurance(data);

  const { journeyType, startDate, endDate, region, sessionId, email, mobile, policyId, quoteId } =
    await createInsuranceMongoDbDocument(req.body, policy_id);

  const { url } = await createStripePaymentUrl({
    totalAmount: premium,
    currency: currency.toLowerCase(),
    journeyType,
    startDate,
    endDate,
    region: region.id,
    sessionId,
    email,
    mobile,
    policyId,
    quoteId,
    leadTraveler
  });

  res.status(200).json({
    message: 'Finalize in effect',
    data: { policyId: policy_id, premium, currency, paymentUrl: url },
  });
});

exports.downloadInsurancePolicy = catchAsync(async (req, res, next) => {
  const { policyId } = req.params;

  const policy_documents = await downloadWISInsuranceDocuments(policyId);

  res.status(200).json({
    message: 'Policy documents downloaded successfully',
    data: { policyDocuments: policy_documents[0].url },
  });
});

