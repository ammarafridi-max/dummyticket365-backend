const validator = require('validator');
const AppError = require('../utils/appError');

function normalizeRequiredString(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) throw new AppError(`${label} is required`, 400);
  return normalized;
}

function normalizeOptionalString(value, label) {
  if (value === undefined) return undefined;
  return normalizeRequiredString(value, label);
}

function normalizeEmail(value) {
  const normalized = normalizeRequiredString(value, 'Affiliate email').toLowerCase();
  if (!validator.isEmail(normalized)) {
    throw new AppError('Please provide a valid affiliate email address', 400);
  }
  return normalized;
}

function normalizeOptionalBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  throw new AppError('Affiliate active flag must be true or false', 400);
}

function normalizeCommissionPercent(value, { required = false } = {}) {
  if (value === undefined) {
    if (required) throw new AppError('Commission percent is required', 400);
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new AppError('Commission percent must be between 0 and 100', 400);
  }

  return parsed;
}

exports.createAffiliateSchema = (body = {}) => ({
  name: normalizeRequiredString(body.name, 'Affiliate name'),
  email: normalizeEmail(body.email),
  commissionPercent: normalizeCommissionPercent(body.commissionPercent, { required: true }),
  isActive: normalizeOptionalBoolean(body.isActive),
});

exports.updateAffiliateSchema = (body = {}) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    payload.name = normalizeOptionalString(body.name, 'Affiliate name');
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    payload.email = normalizeEmail(body.email);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'commissionPercent')) {
    payload.commissionPercent = normalizeCommissionPercent(body.commissionPercent);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'isActive')) {
    payload.isActive = normalizeOptionalBoolean(body.isActive);
  }

  if (!Object.keys(payload).length) {
    throw new AppError('At least one affiliate field is required', 400);
  }

  return payload;
};
