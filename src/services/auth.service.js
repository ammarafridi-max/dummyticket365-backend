const User = require('../models/User');
const AppError = require('../utils/appError');

exports.login = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new AppError('User does not exist', 404);

  const correct = await user.correctPassword(password, user.password);
  if (!correct) throw new AppError('Incorrect password', 401);

  return user;
};

exports.updatePassword = async ({ userId, passwordCurrent, passwordNew }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new AppError('User not found', 404);

  const correct = await user.correctPassword(passwordCurrent, user.password);
  if (!correct) {
    throw new AppError('Current password entered is wrong', 401);
  }

  user.password = passwordNew;
  await user.save();

  return user;
};

exports.getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('Your data was not found. Please try again later.', 404);
  }
  return user;
};

exports.updateCurrentUser = async (userId, payload) => {
  if (payload.password) {
    throw new AppError('Please use /updateMyPassword to change password', 403);
  }

  const user = await User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  });

  if (!user) throw new AppError('Could not find user', 404);
  return user;
};
