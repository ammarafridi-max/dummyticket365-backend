const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const authService = require('../services/auth.service');
const { signToken, createCookieOptions } = require('../utils/jwt');

const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id, user.role);

  res.cookie('jwt', token, createCookieOptions());

  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    status: 'success',
    data: userObj,
  });
};

exports.login = catchAsync(async (req, res) => {
  const user = await authService.login(req.body);
  sendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'You have been logged out.',
  });
});

exports.updatePassword = catchAsync(async (req, res) => {
  const user = await authService.updatePassword({
    userId: req.user.id,
    passwordCurrent: req.body.passwordCurrent,
    passwordNew: req.body.password,
  });

  sendToken(user, 200, res);
});

exports.currentUserInfo = catchAsync(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'User data fetched successfully',
    data: user,
  });
});

exports.updateCurrentUser = catchAsync(async (req, res) => {
  await authService.updateCurrentUser(req.user.id, req.body);

  res.status(200).json({
    status: 'success',
    message: 'User updated successfully',
  });
});
