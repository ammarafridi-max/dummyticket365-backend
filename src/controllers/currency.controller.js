const catchAsync = require('../utils/catchAsync');
const currencyService = require('../services/currency.service');

exports.getCurrencies = catchAsync(async (req, res) => {
  const currencies = await currencyService.getCurrencies();
  res.status(200).json({
    status: 'success',
    data: currencies,
  });
});

exports.getCurrencyByCode = catchAsync(async (req, res) => {
  const currency = await currencyService.getCurrencyByCode(req.params.code);
  res.status(200).json({
    status: 'success',
    data: currency,
  });
});

exports.createCurrency = catchAsync(async (req, res) => {
  const newCurrency = await currencyService.createCurrency(req.body);
  res.status(201).json({
    status: 'success',
    message: 'Currency created successfully',
    data: newCurrency,
  });
});

exports.updateCurrency = catchAsync(async (req, res) => {
  const currency = await currencyService.updateCurrency(req.params.code, req.body);
  res.status(200).json({
    status: 'success',
    message: 'Currency updated successfully',
    data: currency,
  });
});

exports.deleteCurrency = catchAsync(async (req, res) => {
  await currencyService.deleteCurrency(req.params.code);
  res.status(200).json({
    status: 'success',
    message: 'Currency deleted successfully',
  });
});
