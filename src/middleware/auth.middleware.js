const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const AdminUser = require('../models/AdminUser');

async function decodeJwtFromCookie(req, missingMessage, invalidMessage) {
  const token = req.cookies?.jwt;

  if (!token || token === 'loggedout') {
    throw new AppError(missingMessage, 401);
  }

  try {
    return await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError(invalidMessage, 401);
  }
}

exports.protect = catchAsync(async (req, res, next) => {
  const decoded = await decodeJwtFromCookie(
    req,
    'You need to login to access this route.',
    'Invalid or expired token.',
  );

  if (decoded.type && decoded.type !== 'admin') {
    return next(new AppError('Invalid session type.', 401));
  }

  const currentUser = await AdminUser.findById(decoded.id);

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
