const AppError = require('../utils/appError');

module.exports = (validator) => (req, _res, next) => {
  try {
    req.body = validator(req.body);
    next();
  } catch (err) {
    next(err instanceof AppError ? err : new AppError(err.message || 'Invalid request data', 400));
  }
};
