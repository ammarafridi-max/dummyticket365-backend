const Currency = require('../models/Currency');
const AppError = require('../utils/appError');

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSort(sort = 'base_first') {
  const map = {
    base_first: { isBaseCurrency: -1, code: 1 },
    code_asc: { code: 1 },
    code_desc: { code: -1 },
    rate_asc: { rate: 1 },
    rate_desc: { rate: -1 },
    updated_desc: { lastUpdated: -1, code: 1 },
    updated_asc: { lastUpdated: 1, code: 1 },
  };

  return map[sort] || map.base_first;
}

function normalizeString(value = '') {
  return String(value || '').trim();
}

async function ensureSingleBaseCurrency(baseCurrencyId) {
  if (!baseCurrencyId) return;

  await Currency.updateMany(
    { _id: { $ne: baseCurrencyId }, isBaseCurrency: true },
    { $set: { isBaseCurrency: false } },
  );
}

exports.getCurrencies = async (query = {}) => {
  const filter = {};

  const search = String(query.search || query.q || '').trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ code: regex }, { name: regex }, { symbol: regex }];
  }

  if (query.baseOnly === 'true') {
    filter.isBaseCurrency = true;
  }

  return Currency.find(filter).sort(buildSort(query.sort));
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

  const hasBaseCurrency = await Currency.exists({ isBaseCurrency: true });
  const shouldBeBase = hasBaseCurrency ? !!isBaseCurrency : true;

  const newCurrency = new Currency({
    code: normalizedCode,
    name: normalizeString(name),
    symbol: normalizeString(symbol),
    rate: shouldBeBase ? 1 : parsedRate,
    isBaseCurrency: shouldBeBase,
  });

  await newCurrency.save();
  await ensureSingleBaseCurrency(newCurrency.isBaseCurrency ? newCurrency._id : null);
  return newCurrency;
};

exports.updateCurrency = async (code, payload = {}) => {
  const currency = await Currency.findOne({ code: String(code).toUpperCase() });
  if (!currency) throw new AppError('Currency not found', 404);

  if (Object.prototype.hasOwnProperty.call(payload, 'name')) currency.name = normalizeString(payload.name);
  if (Object.prototype.hasOwnProperty.call(payload, 'symbol')) currency.symbol = normalizeString(payload.symbol);

  if (Object.prototype.hasOwnProperty.call(payload, 'rate')) {
    const rate = Number(payload.rate);
    if (!Number.isFinite(rate) || rate <= 0) throw new AppError('Rate must be a positive number', 400);
    currency.rate = rate;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isBaseCurrency')) {
    if (payload.isBaseCurrency === false && currency.isBaseCurrency) {
      throw new AppError('Select another base currency before unsetting the current base currency.', 400);
    }
    currency.isBaseCurrency = payload.isBaseCurrency;
  }

  if (currency.isBaseCurrency) {
    currency.rate = 1;
  }

  currency.lastUpdated = Date.now();
  await currency.save();
  await ensureSingleBaseCurrency(currency.isBaseCurrency ? currency._id : null);

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
