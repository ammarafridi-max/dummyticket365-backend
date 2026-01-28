const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/User');

exports.protect = catchAsync(async (req, res, next) => {
  const token = req.cookies?.jwt;

  if (!token || token === 'loggedout') {
    return next(new AppError('You need to login to access this route.', 401));
  }

  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch {
    return next(new AppError('Invalid or expired token.', 401));
  }

  const currentUser = await User.findById(decoded.id);

  if (!currentUser || currentUser.status === 'INACTIVE') {
    return next(new AppError('The user belonging to this token does not exist.', 401));
  }

  req.user = currentUser;
  res.locals.user = currentUser;

  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};
