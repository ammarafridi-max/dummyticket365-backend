const mongoose = require('mongoose');
const Affiliate = require('../models/Affiliate');
const AppError = require('../utils/appError');

function buildSearchFilter(q) {
  if (!q) return {};

  const regex = new RegExp(q.trim(), 'i');

  return {
    $or: [{ name: regex }, { email: regex }, { affiliateId: regex }],
  };
}

function parseBooleanFilter(value) {
  if (value === undefined) return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
}

function parseSort(sort = 'newest') {
  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    name_asc: { name: 1 },
    name_desc: { name: -1 },
    commission_asc: { commissionPercent: 1 },
    commission_desc: { commissionPercent: -1 },
  };

  if (sortMap[sort]) return sortMap[sort];

  return { createdAt: -1 };
}

function normalizeCreatePayload(payload = {}) {
  return {
    name: payload.name,
    email: payload.email,
    commissionPercent: payload.commissionPercent,
    isActive: payload.isActive,
  };
}

function normalizeUpdatePayload(payload = {}) {
  const allowed = ['name', 'email', 'commissionPercent', 'isActive'];
  const updateData = {};

  allowed.forEach((field) => {
    if (payload[field] !== undefined) {
      updateData[field] = payload[field];
    }
  });

  return updateData;
}

exports.createAffiliate = async (payload) => {
  const data = normalizeCreatePayload(payload);
  let affiliateId;

  try {
    affiliateId = await Affiliate.generateUniqueAffiliateId(10);
  } catch (error) {
    throw new AppError('Could not generate a unique affiliate ID', 500);
  }

  const affiliate = await Affiliate.create({
    ...data,
    affiliateId,
  });

  return affiliate;
};

exports.getAffiliates = async (query = {}) => {
  let page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, parseInt(query.limit, 10) || 20);

  const filter = {
    ...buildSearchFilter(query.q),
  };

  const isActive = parseBooleanFilter(query.isActive);
  if (typeof isActive === 'boolean') {
    filter.isActive = isActive;
  }

  const total = await Affiliate.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (page > totalPages) page = totalPages;

  const affiliates = await Affiliate.find(filter)
    .sort(parseSort(query.sort))
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    affiliates,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

exports.getAffiliateById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid affiliate ID', 400);
  }

  const affiliate = await Affiliate.findById(id);
  if (!affiliate) {
    throw new AppError('Affiliate not found', 404);
  }

  return affiliate;
};

exports.updateAffiliateById = async (id, payload) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid affiliate ID', 400);
  }

  if (payload && Object.prototype.hasOwnProperty.call(payload, 'affiliateId')) {
    throw new AppError('affiliateId cannot be updated', 400);
  }

  const updateData = normalizeUpdatePayload(payload);
  const affiliate = await Affiliate.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!affiliate) {
    throw new AppError('Affiliate not found', 404);
  }

  return affiliate;
};

exports.deleteAffiliateById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid affiliate ID', 400);
  }

  const affiliate = await Affiliate.findByIdAndDelete(id);
  if (!affiliate) {
    throw new AppError('Affiliate not found', 404);
  }

  return affiliate;
};

exports.seedAffiliates = async () => {
  const seedPayloads = [
    { name: 'Atlas Partners', email: 'atlas.partners@example.com', commissionPercent: 12, isActive: true },
    { name: 'Blue Horizon Media', email: 'blue.horizon@example.com', commissionPercent: 18, isActive: true },
    { name: 'Northline Referrals', email: 'northline@example.com', commissionPercent: 25, isActive: false },
    { name: 'Skyline Promotions', email: 'skyline.promotions@example.com', commissionPercent: 32, isActive: true },
    { name: 'Summit Network', email: 'summit.network@example.com', commissionPercent: 40, isActive: false },
  ];

  const created = [];

  for (const payload of seedPayloads) {
    const existing = await Affiliate.findOne({ email: payload.email.toLowerCase() });

    if (existing) {
      created.push(existing);
      continue;
    }

    const affiliate = await exports.createAffiliate(payload);
    created.push(affiliate);
  }

  return created;
};
