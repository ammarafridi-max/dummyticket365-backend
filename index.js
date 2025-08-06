// ---------- IMPORTS ----------
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const xss = require('xss-clean');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Custom imports
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/error.controller');
const ticketRoutes = require('./routes/ticket.routes');
const userRoutes = require('./routes/user.routes');
const airportRoutes = require('./routes/airport.routes');
const flightRoutes = require('./routes/flight.routes');

// ---------- INITIALIZATION ----------
const app = express();

// ---------- ERROR HANDLING ----------
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// ---------- MIDDLEWARE CONFIGURATION ----------
// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(xss());
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  max: 500,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.DT365_FRONTEND,
      process.env.DT365_ADMIN,
      process.env.VIEWTRIP_BACKEND,
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new AppError('Not allowed by CORS', 403));
    }
  },
  methods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  allowedHeaders: [
    'Origin',
    'X-Session-ID',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
  ],
  exposedHeaders: ['Cross-Origin-Resource-Policy'],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing
app.use('/api/ticket/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Static files
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'public/uploads'), {
    setHeaders: (res, path) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

app.use(
  '/qr-codes',
  express.static(path.join(__dirname, 'public/qr-codes'), {
    setHeaders: (res, path) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

app.use(
  '/reservations',
  express.static(path.join(__dirname, 'public/reservations'), {
    setHeaders: (res, path) => {
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

// ---------- DATABASE CONNECTION ----------
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB successfully');
  } catch (error) {
    console.error(`Error connecting to DB: ${error.message}`);
    process.exit(1);
  }
};
connectDB();

// ---------- ROUTES ----------
app.use('/api/ticket', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/airports', airportRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  next(
    new AppError(`Route is not defined. Cannot find ${req.originalUrl}.`, 404)
  );
});

// Global error handler
app.use(globalErrorHandler);

// ---------- SERVER STARTUP ----------
const server = app.listen(process.env.PORT || 3001, () => {
  console.log(
    `Server running on port ${process.env.PORT || 3001} (${process.env.NODE_ENV})`
  );
});

// Unhandled rejection handler
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
