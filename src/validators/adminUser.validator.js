const validator = require('validator');
const AppError = require('../utils/appError');

const ALLOWED_ROLES = ['admin', 'agent', 'blog-manager'];
const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE'];
const USERNAME_REGEX = /^[a-z0-9][a-z0-9._-]{7,49}$/;

function normalizeName(value) {
  const name = String(value || '').trim();
  if (!name) throw new AppError('Name is required', 400);
  if (name.length > 100) throw new AppError('Name must be at most 100 characters long', 400);
  return name;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) throw new AppError('Email is required', 400);
  if (!validator.isEmail(email)) throw new AppError('Please provide a valid email address', 400);
  return email;
}

function normalizeUsername(value) {
  const username = String(value || '').trim().toLowerCase();
  if (!username) throw new AppError('Username is required', 400);
  if (!USERNAME_REGEX.test(username)) {
    throw new AppError('Username must be 8-50 characters and use lowercase letters, numbers, dots, underscores, or hyphens', 400);
  }
  return username;
}

function normalizePassword(value) {
  const password = String(value || '');
  if (!password) throw new AppError('Password is required', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters long', 400);
  return password;
}

function normalizeRole(value) {
  const role = String(value || 'agent').trim().toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) {
    throw new AppError(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400);
  }
  return role;
}

function normalizeStatus(value) {
  const status = String(value || 'ACTIVE').trim().toUpperCase();
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }
  return status;
}

exports.createAdminUserSchema = (body = {}) => ({
  name: normalizeName(body.name),
  username: normalizeUsername(body.username),
  email: normalizeEmail(body.email),
  password: normalizePassword(body.password),
  role: normalizeRole(body.role),
  status: normalizeStatus(body.status),
});

exports.updateAdminUserSchema = (body = {}) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    payload.name = normalizeName(body.name);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    payload.email = normalizeEmail(body.email);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'role')) {
    payload.role = normalizeRole(body.role);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    payload.status = normalizeStatus(body.status);
  }

  if (!Object.keys(payload).length) {
    throw new AppError('At least one admin user field is required', 400);
  }

  return payload;
};
