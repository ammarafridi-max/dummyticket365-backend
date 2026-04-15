const validator = require('validator');
const AppError = require('../utils/appError');

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) throw new AppError('Email is required', 400);
  if (!validator.isEmail(email)) throw new AppError('Please provide a valid email address', 400);
  return email;
}

function normalizePassword(value, label = 'Password') {
  const password = String(value || '');
  if (!password) throw new AppError(`${label} is required`, 400);
  if (password.length < 8) throw new AppError(`${label} must be at least 8 characters long`, 400);
  return password;
}

function normalizeOptionalEmail(value) {
  if (value === undefined) return undefined;
  return normalizeEmail(value);
}

function normalizeOptionalName(value) {
  if (value === undefined) return undefined;
  const name = String(value || '').trim();
  if (!name) throw new AppError('Name is required', 400);
  if (name.length > 100) throw new AppError('Name must be at most 100 characters long', 400);
  return name;
}

exports.loginSchema = (body = {}) => ({
  email: normalizeEmail(body.email),
  password: String(body.password || ''),
});

exports.updatePasswordSchema = (body = {}) => {
  const passwordCurrent = String(body.passwordCurrent || body.currentPassword || '');
  if (!passwordCurrent) throw new AppError('Current password is required', 400);

  const password = normalizePassword(body.password, 'New password');
  const passwordConfirm = String(body.passwordConfirm || '');
  if (!passwordConfirm) throw new AppError('Password confirmation is required', 400);
  if (password !== passwordConfirm) throw new AppError('Passwords do not match', 400);
  if (passwordCurrent === password) throw new AppError('New password must be different from the current password', 400);

  return {
    passwordCurrent,
    password,
    passwordConfirm,
  };
};

exports.updateCurrentAdminSchema = (body = {}) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    payload.name = normalizeOptionalName(body.name);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    payload.email = normalizeOptionalEmail(body.email);
  }

  if (!Object.keys(payload).length) {
    throw new AppError('At least one profile field is required', 400);
  }

  return payload;
};
