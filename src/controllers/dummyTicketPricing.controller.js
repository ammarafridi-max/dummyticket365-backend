const catchAsync = require('../utils/catchAsync');
const pricingService = require('../services/dummyTicketPricing.service');

exports.getDummyTicketPricing = catchAsync(async (req, res) => {
  const data = await pricingService.getDummyTicketPricingPublic();

  res.status(200).json({
    status: 'success',
    message: 'Dummy ticket pricing fetched successfully',
    data,
  });
});

exports.getDummyTicketPricingAdmin = catchAsync(async (req, res) => {
  const data = await pricingService.getDummyTicketPricingAdmin();

  res.status(200).json({
    status: 'success',
    message: 'Dummy ticket pricing fetched successfully',
    data,
  });
});

exports.updateDummyTicketPricing = catchAsync(async (req, res) => {
  const data = await pricingService.updateDummyTicketPricing({
    currency: req.body.currency,
    options: req.body.options,
    updatedBy: req.user?.id,
  });

  res.status(200).json({
    status: 'success',
    message: 'Dummy ticket pricing updated successfully',
    data,
  });
});
