const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const userService = require('../services/user.service');

exports.getUsers = catchAsync(async (req, res) => {
  const users = await userService.getUsers();

  res.status(200).json({
    status: 'success',
    message: 'Users fetched successfully',
    data: users,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await userService.getUserByUsername(req.params.username);

  res.status(200).json({
    status: 'success',
    message: 'User found successfully',
    data: user,
  });
});

exports.createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);

  res.status(201).json({
    status: 'success',
    data: user,
  });
});

exports.updateUser = catchAsync(async (req, res) => {
  const user = await userService.updateUserByUsername(req.params.username, req.body);

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
    data: user,
  });
});

exports.deleteUser = catchAsync(async (req, res) => {
  const user = await userService.deleteUserByUsername(req.params.username);

  res.status(200).json({
    status: 'success',
    message: `User ${user.username} deleted successfully`,
  });
});
