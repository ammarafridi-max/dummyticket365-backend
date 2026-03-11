const Currency = require('../models/Currency');
const AppError = require('../utils/appError');

exports.getCurrencies = async () => {
  return Currency.find().sort({ isBaseCurrency: -1, code: 1 });
};

exports.getCurrencyByCode = async (code) => {
  const currency = await Currency.findOne({ code: String(code).toUpperCase() });
  if (!currency) throw new AppError('Currency not found', 404);
  return currency;
};

exports.createCurrency = async ({ code, name, symbol, rate, isBaseCurrency }) => {
  if (!code || !name || !symbol) {
    throw new AppError('Code, name, and symbol are required', 400);
  }

  const normalizedCode = String(code).toUpperCase();

  const existing = await Currency.findOne({ code: normalizedCode });
  if (existing) throw new AppError('Currency already exists', 400);

  const parsedRate = Number(rate ?? 1);
  if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
    throw new AppError('Rate must be a positive number', 400);
  }

  const newCurrency = new Currency({
    code: normalizedCode,
    name: String(name).trim(),
    symbol: String(symbol).trim(),
    rate: parsedRate,
    isBaseCurrency: !!isBaseCurrency,
  });

  await newCurrency.save();
  return newCurrency;
};

exports.updateCurrency = async (code, payload = {}) => {
  const currency = await Currency.findOne({ code: String(code).toUpperCase() });
  if (!currency) throw new AppError('Currency not found', 404);

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) currency.name = payload.name;
  if (Object.prototype.hasOwnProperty.call(payload, 'symbol')) currency.symbol = payload.symbol;

  if (Object.prototype.hasOwnProperty.call(payload, 'rate')) {
    const rate = Number(payload.rate);
    if (!Number.isFinite(rate) || rate <= 0) throw new AppError('Rate must be a positive number', 400);
    currency.rate = rate;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isBaseCurrency')) {
    currency.isBaseCurrency = !!payload.isBaseCurrency;
  }

  currency.lastUpdated = Date.now();
  await currency.save();

  return currency;
};

exports.deleteCurrency = async (code) => {
  const currency = await Currency.findOne({ code: String(code).toUpperCase() });
  if (!currency) throw new AppError('Currency not found', 404);
  if (currency.isBaseCurrency) {
    throw new AppError('Base currency cannot be deleted', 400);
  }
  await Currency.findOneAndDelete({ code: currency.code });
};

exports.convertFromBase = async ({ amount, targetCode }) => {
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount)) {
    throw new AppError('Invalid amount for conversion', 400);
  }

  const currencies = await exports.getCurrencies();
  if (!currencies.length) {
    throw new AppError('No currencies configured', 500);
  }

  const baseCurrency = currencies.find((currency) => currency.isBaseCurrency) || currencies[0];
  if (!baseCurrency) {
    throw new AppError('Base currency is not configured', 500);
  }

  const targetCurrency =
    currencies.find((currency) => currency.code === String(targetCode || '').toUpperCase()) || baseCurrency;

  const conversionRate = Number(((baseCurrency?.rate || 1) / (targetCurrency?.rate || 1)).toFixed(8));
  const convertedAmount = Number((parsedAmount * conversionRate).toFixed(2));

  return {
    amount: convertedAmount,
    currencyCode: targetCurrency.code,
    conversionRate,
  };
};
