const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

module.exports = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  const startedAt = Date.now();

  req.id = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const level =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('HTTP request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip,
    });
  });

  next();
};
