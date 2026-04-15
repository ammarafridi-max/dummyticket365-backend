const AdminUser = require('../models/AdminUser');
const AppError = require('../utils/appError');

function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeName(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

async function ensureAdminEmailIsUnique(email, excludeId = null) {
  if (!email) return;

  const existing = await AdminUser.findOne({
    email,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  if (existing) {
    throw new AppError('Email is already in use by another admin user.', 400);
  }
}

async function ensureAdminUsernameIsUnique(username, excludeId = null) {
  if (!username) return;

  const existing = await AdminUser.findOne({
    username,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  if (existing) {
    throw new AppError('Username is already in use by another admin user.', 400);
  }
}

async function ensureLastActiveAdminRemains({ userIdToChange, nextRole, nextStatus }) {
  const current = await AdminUser.findById(userIdToChange).lean();
  if (!current) return;

  const isCurrentlyActiveAdmin = current.role === 'admin' && current.status === 'ACTIVE';
  const staysActiveAdmin = nextRole === 'admin' && nextStatus === 'ACTIVE';

  if (!isCurrentlyActiveAdmin || staysActiveAdmin) return;

  const otherActiveAdmins = await AdminUser.countDocuments({
    _id: { $ne: userIdToChange },
    role: 'admin',
    status: 'ACTIVE',
  });

  if (otherActiveAdmins === 0) {
    throw new AppError('At least one active admin user must remain in the system.', 400);
  }
}

exports.getAdminUsers = async (query = {}) => {
  const filter = {};

  if (query.role && ['admin', 'agent', 'blog-manager'].includes(query.role)) {
    filter.role = query.role;
  }

  if (query.status && ['ACTIVE', 'INACTIVE'].includes(query.status)) {
    filter.status = query.status;
  }

  const search = String(query.search || query.q || '').trim();
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ name: regex }, { username: regex }, { email: regex }];
  }

  return AdminUser.find(filter).sort({ createdAt: -1 });
};

exports.getAdminUserByUsername = async (username) => {
  if (!username) {
    throw new AppError("Please provide an admin user's username", 400);
  }

  const user = await AdminUser.findOne({ username: normalizeUsername(username) });
  if (!user) {
    throw new AppError('Could not find admin user!', 404);
  }

  return user;
};

exports.createAdminUser = async (payload) => {
  const normalizedPayload = {
    ...payload,
    name: normalizeName(payload.name),
    username: normalizeUsername(payload.username),
    email: normalizeEmail(payload.email),
  };

  await ensureAdminUsernameIsUnique(normalizedPayload.username);
  await ensureAdminEmailIsUnique(normalizedPayload.email);

  return AdminUser.create(normalizedPayload);
};

exports.updateAdminUserByUsername = async (username, payload, currentUser) => {
  if (!username) {
    throw new AppError("Please provide an admin user's username", 400);
  }

  if (payload.password) {
    throw new AppError('Please use /updateMyPassword to change password', 400);
  }

  const existingUser = await AdminUser.findOne({ username: normalizeUsername(username) });
  if (!existingUser) {
    throw new AppError('Admin user not found.', 404);
  }

  const normalizedPayload = { ...payload };
  if (normalizedPayload.name !== undefined) normalizedPayload.name = normalizeName(normalizedPayload.name);
  if (normalizedPayload.email !== undefined) normalizedPayload.email = normalizeEmail(normalizedPayload.email);

  const nextRole = normalizedPayload.role ?? existingUser.role;
  const nextStatus = normalizedPayload.status ?? existingUser.status;

  if (currentUser && String(existingUser._id) === String(currentUser._id)) {
    if (nextStatus === 'INACTIVE') {
      throw new AppError('You cannot deactivate your own admin account.', 400);
    }
    if (nextRole !== 'admin') {
      throw new AppError('You cannot remove your own admin role.', 400);
    }
  }

  await ensureAdminEmailIsUnique(normalizedPayload.email, existingUser._id);
  await ensureLastActiveAdminRemains({
    userIdToChange: existingUser._id,
    nextRole,
    nextStatus,
  });

  const user = await AdminUser.findOneAndUpdate({ username: existingUser.username }, normalizedPayload, {
    runValidators: true,
    new: true,
  });

  return user;
};

exports.deleteAdminUserByUsername = async (username, currentUser) => {
  if (!username) {
    throw new AppError('Username is missing.', 400);
  }

  const user = await AdminUser.findOne({ username: normalizeUsername(username) });

  if (!user) {
    throw new AppError('Admin user not found with that username.', 404);
  }

  if (currentUser && String(user._id) === String(currentUser._id)) {
    throw new AppError('You cannot delete your own admin account.', 400);
  }

  await ensureLastActiveAdminRemains({
    userIdToChange: user._id,
    nextRole: 'agent',
    nextStatus: 'INACTIVE',
  });

  await AdminUser.findOneAndDelete({ username });

  return user;
};
