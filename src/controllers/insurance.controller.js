const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { fetchWISInsuranceQuotes } = require('../services/insurance.service');

exports.getInsuranceQuotes = catchAsync(async (req, res, next) => {
  const data = await fetchWISInsuranceQuotes(req.body);

  res.status(200).json({
    message: 'Insurance quotes retrieved successfully',
    data,
  });
});
