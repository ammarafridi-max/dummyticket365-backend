const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sanitizeBody = require('./utils/sanitize');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { stripeWebhook } = require('./controllers/stripeWebhook.controller');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./error/error.controller');
const indexRoutes = require('./routes/index.routes');
const requestContext = require('./middleware/requestContext.middleware');
const config = require('./utils/config');

const app = express();
app.set('trust proxy', 1);

app.use(requestContext);
app.post('/api/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new AppError('CORS origin not allowed', 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Access-Control-Allow-Origin',
      'x-session-id',
      'x-affiliate-id',
      'x-request-id',
    ],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 600,
  }),
);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));
app.use(sanitizeBody);

const apiLimiter = rateLimit({
  max: config.apiRateLimitMax,
  windowMs: config.apiRateLimitWindowMs,
  message: 'Too many requests from this IP, please try again in an hour!',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', (req, res, next) => {
  if (req.originalUrl.includes('/webhook')) return next();
  apiLimiter(req, res, next);
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    env: config.nodeEnv,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
});

app.use('/api', indexRoutes);


app.use(
  '/airlines',
  express.static(path.join(__dirname, 'public/airlines'), {
    setHeaders: (res) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }),
);

app.all('/*path', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
