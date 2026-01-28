const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const sanitizeBody = require('./utils/sanitize');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { stripeWebhook } = require('./controllers/stripeWebhook.controller')
const AppError = require('./utils/appError');
const globalErrorHandler = require('./error/error.controller');
const indexRoutes = require('./routes/index.routes');

const app = express();
app.set('trust proxy', 1);

app.post('/api/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'https://www.mydummyticket.ae',
      'https://admin.mydummyticket.ae',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Origin', 'x-session-id'],
    exposedHeaders: ['Set-Cookie'],
  }),
);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeBody);

const apiLimiter = rateLimit({
  max: 500,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', (req, res, next) => {
  if (req.originalUrl.includes('/webhook')) return next();
  apiLimiter(req, res, next);
});

app.use('/api', indexRoutes);

['uploads'].forEach((dir) => {
  app.use(
    `/${dir}`,
    express.static(path.join(__dirname, `public/${dir}`), {
      setHeaders: (res) => {
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );
});

app.all('/*path', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl}`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
