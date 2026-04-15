const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://www.dummyticket365.com',
  'https://dummyticket365.com',
  'https://test.dummyticket365.com',
  'https://admin.dummyticket365.com',
];

const normalizeNodeEnv = (value) => {
  if (['development', 'production', 'test'].includes(value)) {
    return value;
  }

  return 'development';
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseList = (value, fallback = []) => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? items : fallback;
};

const nodeEnv = normalizeNodeEnv(process.env.NODE_ENV);

module.exports = {
  nodeEnv,
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  port: parseNumber(process.env.PORT, 3001),
  bodyLimit: process.env.API_BODY_LIMIT || '10mb',
  corsOrigins: parseList(process.env.CORS_ORIGINS, DEFAULT_CORS_ORIGINS),
  apiRateLimitMax: parseNumber(process.env.API_RATE_LIMIT_MAX, 500),
  apiRateLimitWindowMs: parseNumber(process.env.API_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000),
  blogSchedulerIntervalMs: parseNumber(process.env.BLOG_SCHEDULER_INTERVAL_MS, 60 * 1000),
  mongoUri: process.env.MONGO_URI,
  brevoApiKey: process.env.BREVO_API_KEY,
  adminEmail: process.env.ADMIN_EMAIL || 'info@dummyticket365.com',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
};
