const AppError = require('../utils/appError');
const DummyTicketPricing = require('../models/DummyTicketPricing');

const DEFAULT_OPTIONS = [
  { validity: '2 Days', price: 49, isActive: true, sortOrder: 0 },
  { validity: '7 Days', price: 69, isActive: true, sortOrder: 1 },
  { validity: '14 Days', price: 79, isActive: true, sortOrder: 2 },
];

const ALLOWED_VALIDITIES = new Set(DEFAULT_OPTIONS.map((option) => option.validity));

function sortOptions(options = []) {
  return [...options].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.validity.localeCompare(b.validity);
  });
}

function sanitizeOptions(options = []) {
  if (!Array.isArray(options) || options.length === 0) {
    throw new AppError('At least one pricing option is required', 400);
  }

  const seenValidity = new Set();
  const sanitized = options.map((option, index) => {
    const validity = String(option?.validity || '').trim();
    const price = Number(option?.price);
    const isActive = option?.isActive === undefined ? true : Boolean(option.isActive);
    const sortOrder = Number.isFinite(Number(option?.sortOrder)) ? Number(option.sortOrder) : index;

    if (!ALLOWED_VALIDITIES.has(validity)) {
      throw new AppError(`Invalid validity option: ${validity}`, 400);
    }
    if (seenValidity.has(validity)) {
      throw new AppError(`Duplicate validity option: ${validity}`, 400);
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new AppError(`Invalid price for ${validity}`, 400);
    }

    seenValidity.add(validity);

    return {
      validity,
      price: Number(price.toFixed(2)),
      isActive,
      sortOrder,
    };
  });

  return sortOptions(sanitized);
}

async function ensureDummyTicketPricing() {
  let config = await DummyTicketPricing.findOne({ key: 'dummy-ticket' });
  if (config) return config;

  config = await DummyTicketPricing.create({
    key: 'dummy-ticket',
    currency: 'AED',
    options: DEFAULT_OPTIONS,
  });

  return config;
}

exports.getDummyTicketPricingPublic = async () => {
  const config = await ensureDummyTicketPricing();

  return {
    currency: config.currency,
    options: sortOptions(config.options).filter((option) => option.isActive),
  };
};

exports.getDummyTicketPricingAdmin = async () => {
  const config = await ensureDummyTicketPricing();

  return {
    currency: config.currency,
    options: sortOptions(config.options),
    updatedAt: config.updatedAt,
  };
};

exports.updateDummyTicketPricing = async ({ currency, options, updatedBy }) => {
  const config = await ensureDummyTicketPricing();
  const sanitizedOptions = sanitizeOptions(options);

  config.currency = String(currency || config.currency || 'AED').toUpperCase();
  config.options = sanitizedOptions;
  config.updatedBy = updatedBy || null;
  await config.save();

  return {
    currency: config.currency,
    options: sortOptions(config.options),
    updatedAt: config.updatedAt,
  };
};

exports.getDummyTicketUnitPrice = async (ticketValidity) => {
  const config = await ensureDummyTicketPricing();
  const option = config.options.find((item) => item.validity === ticketValidity && item.isActive);

  if (!option) {
    throw new AppError(`Pricing not configured for ${ticketValidity}`, 400);
  }

  return {
    currency: config.currency || 'AED',
    unitPrice: option.price,
  };
};
