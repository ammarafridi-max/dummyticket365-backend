const validator = require('validator');
const AppError = require('../utils/appError');

function normalizeName(value) {
  const name = String(value || '').trim();
  if (!name) throw new AppError('Name is required', 400);
  if (name.length > 100) throw new AppError('Name must be at most 100 characters long', 400);
  return name;
}

function normalizeEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase();
  if (!email) throw new AppError('Email is required', 400);
  if (!validator.isEmail(email)) throw new AppError('Please provide a valid email address', 400);
  return email;
}

function normalizeSubject(value) {
  const subject = String(value || '').trim();
  if (!subject) throw new AppError('Subject is required', 400);
  if (subject.length > 120) throw new AppError('Subject must be at most 120 characters long', 400);
  return subject;
}

function normalizeMessage(value) {
  const message = String(value || '').trim();
  if (!message) throw new AppError('Message is required', 400);
  if (message.length < 20) throw new AppError('Message must be at least 20 characters long', 400);
  if (message.length > 5000) throw new AppError('Message must be at most 5000 characters long', 400);
  return message;
}

exports.submitContactSchema = (body = {}) => ({
  name: normalizeName(body.name),
  email: normalizeEmail(body.email),
  subject: normalizeSubject(body.subject),
  message: normalizeMessage(body.message),
});
