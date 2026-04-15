const AppError = require('../utils/appError');

function normalizeCode(code) {
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized.length !== 3) {
    throw new AppError('Currency code must be 3 characters', 400);
  }

  return normalized;
}

function normalizeRequiredString(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new AppError(`${label} is required`, 400);
  return normalized;
}

function normalizeOptionalString(value, label) {
  if (value === undefined) return undefined;
  return normalizeRequiredString(value, label);
}

function normalizeOptionalRate(value) {
  if (value === undefined) return undefined;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new AppError('Rate must be a positive number', 400);
  }

  return parsed;
}

function normalizeOptionalBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  throw new AppError('Base currency flag must be true or false', 400);
}

exports.createCurrencySchema = (body = {}) => ({
  code: normalizeCode(body.code),
  name: normalizeRequiredString(body.name, 'Currency name'),
  symbol: normalizeRequiredString(body.symbol, 'Currency symbol'),
  rate: normalizeOptionalRate(body.rate),
  isBaseCurrency: normalizeOptionalBoolean(body.isBaseCurrency),
});

exports.updateCurrencySchema = (body = {}) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    payload.name = normalizeOptionalString(body.name, 'Currency name');
  }

  if (Object.prototype.hasOwnProperty.call(body, 'symbol')) {
    payload.symbol = normalizeOptionalString(body.symbol, 'Currency symbol');
  }

  if (Object.prototype.hasOwnProperty.call(body, 'rate')) {
    payload.rate = normalizeOptionalRate(body.rate);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'isBaseCurrency')) {
    payload.isBaseCurrency = normalizeOptionalBoolean(body.isBaseCurrency);
  }

  if (!Object.keys(payload).length) {
    throw new AppError('At least one field is required', 400);
  }

  return payload;
};
