const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field: ${field} (${value}). Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => {
    const field = el.path || 'field';
    const label = field.charAt(0).toUpperCase() + field.slice(1);

    if (el.kind === 'maxlength' && el.properties?.maxlength) {
      return `${label} must be at most ${el.properties.maxlength} characters.`;
    }

    if (el.kind === 'minlength' && el.properties?.minlength) {
      return `${label} must be at least ${el.properties.minlength} characters.`;
    }

    if (el.kind === 'required') {
      return `${label} is required.`;
    }

    if (el.kind === 'enum' && Array.isArray(el.properties?.enumValues)) {
      return `${label} must be one of: ${el.properties.enumValues.join(', ')}.`;
    }

    return el.message || `${label} is invalid.`;
  });

  const message = errors.join(' ');
  return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

const handleJsonParseError = () => new AppError('Malformed JSON in request body.', 400);

const handlePayloadTooLargeError = () => new AppError('Request body is too large.', 413);

const logError = (err, req) => {
  const meta = {
    requestId: req?.id,
    method: req?.method,
    path: req?.originalUrl,
    error: err,
  };

  if (err.statusCode >= 500 || !err.isOperational) {
    logger.error('Request failed', meta);
    return;
  }

  logger.warn('Operational request error', meta);
};

const sendErrorDev = (err, req, res) => {
  logError(err, req);
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    requestId: req.id,
  });
};

const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      requestId: req.id,
    });
  }
  logError(err, req);

  return res.status(500).json({
    status: 'error',
    message: 'Something went very wrong!',
    requestId: req.id,
  });
};

module.exports = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err.type === 'entity.parse.failed') err = handleJsonParseError();
  if (err.type === 'entity.too.large') err = handlePayloadTooLargeError();

  if (process.env.NODE_ENV === 'development') {
    return sendErrorDev(err, req, res);
  }

  let error = err;

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);

  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  return sendErrorProd(error, req, res);
};
