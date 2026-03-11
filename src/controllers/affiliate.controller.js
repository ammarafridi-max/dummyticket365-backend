const affiliateService = require('../services/affiliate.service');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.createAffiliate = catchAsync(async (req, res, next) => {
  if (Object.prototype.hasOwnProperty.call(req.body || {}, 'affiliateId')) {
    return next(new AppError('affiliateId is auto-generated and cannot be provided manually', 400));
  }

  const affiliate = await affiliateService.createAffiliate(req.body || {});

  return res.status(201).json({
    success: true,
    data: affiliate,
    message: 'Affiliate created successfully',
    errors: null,
  });
});

exports.getAffiliates = catchAsync(async (req, res) => {
  const data = await affiliateService.getAffiliates(req.query || {});

  return res.status(200).json({
    success: true,
    data: {
      affiliates: data.affiliates,
      pagination: data.pagination,
    },
    message: 'Affiliates fetched successfully',
    errors: null,
  });
});

exports.getAffiliateById = catchAsync(async (req, res) => {
  const affiliate = await affiliateService.getAffiliateById(req.params.id);

  return res.status(200).json({
    success: true,
    data: affiliate,
    message: 'Affiliate fetched successfully',
    errors: null,
  });
});

exports.updateAffiliateById = catchAsync(async (req, res) => {
  const affiliate = await affiliateService.updateAffiliateById(req.params.id, req.body || {});

  return res.status(200).json({
    success: true,
    data: affiliate,
    message: 'Affiliate updated successfully',
    errors: null,
  });
});

exports.deleteAffiliateById = catchAsync(async (req, res) => {
  await affiliateService.deleteAffiliateById(req.params.id);

  return res.status(200).json({
    success: true,
    data: null,
    message: 'Affiliate deleted successfully',
    errors: null,
  });
});

exports.seedAffiliates = catchAsync(async (req, res) => {
  const affiliates = await affiliateService.seedAffiliates();

  return res.status(201).json({
    success: true,
    data: affiliates,
    message: 'Affiliate test data seeded successfully',
    errors: null,
  });
});

exports.getAffiliateStatsById = catchAsync(async (req, res) => {
  const stats = await affiliateService.getAffiliateStatsById(req.params.id, req.query || {});

  return res.status(200).json({
    success: true,
    data: stats,
    message: 'Affiliate stats fetched successfully',
    errors: null,
  });
});

exports.getAffiliateTicketsById = catchAsync(async (req, res) => {
  const data = await affiliateService.getAffiliateTicketsById(req.params.id, req.query || {});

  return res.status(200).json({
    success: true,
    data,
    message: 'Affiliate tickets fetched successfully',
    errors: null,
  });
});
