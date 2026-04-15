const AdminUser = require('../models/AdminUser');
const AppError = require('../utils/appError');

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeName(value) {
  return String(value || '').trim();
}

exports.login = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await AdminUser.findOne({ email: normalizeEmail(email) }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  if (user.status === 'INACTIVE') throw new AppError('Admin user is inactive', 403);

  return user;
};

exports.updatePassword = async ({ userId, passwordCurrent, passwordNew }) => {
  if (!passwordCurrent || !passwordNew) {
    throw new AppError('Current password and new password are required', 400);
  }

  const user = await AdminUser.findById(userId).select('+password');
  if (!user) throw new AppError('Admin user not found', 404);

  const correct = await user.correctPassword(passwordCurrent, user.password);
  if (!correct) {
    throw new AppError('Current password entered is wrong', 401);
  }

  user.password = passwordNew;
  await user.save();

  return user;
};

exports.getCurrentUser = async (userId) => {
  const user = await AdminUser.findById(userId);
  if (!user) {
    throw new AppError('Your data was not found. Please try again later.', 404);
  }
  return user;
};

exports.updateCurrentUser = async (userId, payload) => {
  if (payload.password) {
    throw new AppError('Please use /updateMyPassword to change password', 403);
  }

  const allowedFields = ['name', 'email'];
  const filteredPayload = Object.keys(payload || {}).reduce((acc, key) => {
    if (allowedFields.includes(key)) acc[key] = payload[key];
    return acc;
  }, {});

  if (filteredPayload.name !== undefined) {
    filteredPayload.name = normalizeName(filteredPayload.name);
  }

  if (filteredPayload.email !== undefined) {
    filteredPayload.email = normalizeEmail(filteredPayload.email);
  }

  if (!Object.keys(filteredPayload).length) {
    throw new AppError('No valid profile fields provided', 400);
  }

  const existingUser = await AdminUser.findById(userId);
  if (!existingUser) throw new AppError('Could not find admin user', 404);

  if (
    filteredPayload.email &&
    filteredPayload.email !== existingUser.email &&
    (await AdminUser.exists({ email: filteredPayload.email, _id: { $ne: userId } }))
  ) {
    throw new AppError('Email is already in use by another admin user', 400);
  }

  const user = await AdminUser.findByIdAndUpdate(userId, filteredPayload, {
    new: true,
    runValidators: true,
  });

  return user;
};
