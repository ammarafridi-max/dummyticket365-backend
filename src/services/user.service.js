const User = require('../models/User');
const AppError = require('../utils/appError');

exports.getUsers = async () => {
  return User.find({});
};

exports.getUserByUsername = async (username) => {
  if (!username) {
    throw new AppError("Please provide a user's username", 400);
  }

  const user = await User.findOne({ username });
  if (!user) {
    throw new AppError('Could not find user!', 404);
  }

  return user;
};

exports.createUser = async (payload) => {
  return User.create(payload);
};

exports.updateUserByUsername = async (username, payload) => {
  if (!username) {
    throw new AppError("Please provide a user's username", 400);
  }

  if (payload.password) {
    throw new AppError('Please use /updateMyPassword to change password', 400);
  }

  const user = await User.findOneAndUpdate({ username }, payload, {
    runValidators: true,
    new: true,
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return user;
};

exports.deleteUserByUsername = async (username) => {
  if (!username) {
    throw new AppError('Username is missing.', 400);
  }

  const user = await User.findOneAndDelete({ username });

  if (!user) {
    throw new AppError('User not found with that username.', 404);
  }

  return user;
};
