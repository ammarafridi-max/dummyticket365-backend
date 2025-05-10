const User = require('../models/User');
const bcrypt = require('bcrypt');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({});

  if (!users) {
    return res
      .status(404)
      .json({ status: 'fail', message: 'Could not find users' });
  }

  res.status(200).json({
    status: 'success',
    message: 'Users fetched successfully',
    data: users,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  const user = await User.findOne({ username });

  if (!user) {
    return next(new AppError('Could not find user!', 404));
  }

  return res.status(200).json({
    status: 'success',
    message: 'User found successfully',
    data: user,
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    status: 'success',
    data: user,
  });
});

exports.updateUser = catchAsync(async (req, res, next) => {
  const { username } = req.params;

  if (!username)
    return next(new AppError("Please provide a user's username", 401));

  const user = await User.findOneAndUpdate({ username }, req.body, {
    runValidators: true,
    new: true,
  });

  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: user,
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id)
    return res.json({ status: 'fail', message: "User's id is missing." });

  const user = await User.findOneAndDelete({ _id: id });

  if (!user) {
    return res
      .status(404)
      .json({ status: 'fail', message: 'User not found with that id.' });
  }

  return res.status(200).json({
    status: 'success',
    message: `User ${id} deleted successfully`,
  });
});

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });
    if (!user) {
      return res
        .status(404)
        .json({ status: 'failed', message: 'User not found' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res
        .status(401)
        .json({ status: 'failed', message: 'Wrong password' });
    res.status(200).json({
      status: 'success',
      message: 'Authentication successful',
      data: user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: 'fail', message: 'Server error. Could not login.' });
  }
};
