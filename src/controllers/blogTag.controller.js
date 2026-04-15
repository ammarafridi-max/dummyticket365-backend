const BlogTag = require('../models/BlogTag');
const Blog = require('../models/Blog');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const slugify = require('slugify');
const mongoose = require('mongoose');

function normalizeName(name = '') {
  return decodeHtmlEntities(name).trim();
}

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function ensureUniqueName(name, excludeId = null) {
  const normalized = normalizeName(name);
  if (!normalized) {
    throw new AppError('Tag name is required', 400);
  }

  const query = { name: new RegExp(`^${escapeRegex(normalized)}$`, 'i') };
  if (excludeId) query._id = { $ne: excludeId };

  const existing = await BlogTag.findOne(query).lean();
  if (existing) {
    throw new AppError('A tag with this name already exists', 400);
  }

  return normalized;
}

async function ensureUniqueSlug(slugInput, excludeId = null) {
  const normalized = buildBaseSlug(slugInput);
  if (!normalized) {
    throw new AppError('Tag slug is required', 400);
  }

  const existing = await BlogTag.findOne({
    slug: normalized,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  if (existing) {
    throw new AppError('A tag with this slug already exists', 400);
  }

  return normalized;
}

async function buildUniqueCopyName(baseName) {
  const original = normalizeName(baseName);
  let candidate = `${original} Copy`;
  let counter = 2;

  while (await BlogTag.exists({ name: new RegExp(`^${escapeRegex(candidate)}$`, 'i') })) {
    candidate = `${original} Copy ${counter}`;
    counter += 1;
  }

  return candidate;
}

function buildBaseSlug(name = '') {
  return slugify(String(name || ''), { lower: true, strict: true, trim: true }) || 'tag';
}

async function buildUniqueSlug(name, excludeId = null) {
  const baseSlug = buildBaseSlug(name);
  let candidate = baseSlug;
  let counter = 2;

  while (
    await BlogTag.exists({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
  ) {
    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return candidate;
}

async function backfillMissingSlugs() {
  const tagsWithoutSlug = await BlogTag.find({
    $or: [{ slug: { $exists: false } }, { slug: '' }, { slug: null }],
  });

  for (const tag of tagsWithoutSlug) {
    tag.slug = await buildUniqueSlug(tag.name, tag._id);
    await tag.save();
  }
}

exports.getAllBlogTags = catchAsync(async (req, res) => {
  await backfillMissingSlugs();

  const search = String(req.query.search || '').trim();
  const filter = search ? { name: new RegExp(escapeRegex(search), 'i') } : {};

  const tags = await BlogTag.find(filter).sort({ createdAt: -1 }).lean();
  const tagNames = tags.map((tag) => tag.name);
  const usage = tagNames.length
    ? await Blog.aggregate([
        { $unwind: '$tags' },
        { $match: { tags: { $in: tagNames } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
      ])
    : [];
  const usageMap = new Map(usage.map((entry) => [entry._id, entry.count]));
  const enrichedTags = tags.map((tag) => ({
    ...tag,
    usageCount: usageMap.get(tag.name) || 0,
  }));

  res.status(200).json({
    status: 'success',
    results: enrichedTags.length,
    data: enrichedTags,
  });
});

exports.getBlogTagBySlug = catchAsync(async (req, res, next) => {
  const slug = String(req.params.slug || '').trim().toLowerCase();
  let tag = await BlogTag.findOne({ slug });

  // Backward compatibility for older ID-based links.
  if (!tag && mongoose.Types.ObjectId.isValid(slug)) {
    tag = await BlogTag.findById(slug);
  }

  if (!tag) return next(new AppError('Blog tag not found', 404));

  if (!tag.slug) {
    tag.slug = await buildUniqueSlug(tag.name, tag._id);
    await tag.save();
  }

  res.status(200).json({
    status: 'success',
    data: tag,
  });
});

exports.getBlogTagById = catchAsync(async (req, res, next) => {
  const tag = await BlogTag.findById(req.params.id);
  if (!tag) return next(new AppError('Blog tag not found', 404));

  res.status(200).json({
    status: 'success',
    data: tag,
  });
});

exports.createBlogTag = catchAsync(async (req, res) => {
  const name = await ensureUniqueName(req.body.name);
  const slug = req.body.slug ? await ensureUniqueSlug(req.body.slug) : await buildUniqueSlug(name);

  const created = await BlogTag.create({
    name,
    slug,
    description: decodeHtmlEntities(req.body.description || ''),
    metaTitle: decodeHtmlEntities(req.body.metaTitle || ''),
    metaDescription: decodeHtmlEntities(req.body.metaDescription || ''),
  });

  res.status(201).json({
    status: 'success',
    message: 'Blog tag created successfully',
    data: created,
  });
});

exports.updateBlogTag = catchAsync(async (req, res, next) => {
  const tag = await BlogTag.findById(req.params.id);
  if (!tag) return next(new AppError('Blog tag not found', 404));

  const previousName = tag.name;

  if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    tag.name = await ensureUniqueName(req.body.name, tag._id);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'slug')) {
    tag.slug = await ensureUniqueSlug(req.body.slug, tag._id);
  } else if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
    tag.slug = await buildUniqueSlug(tag.name, tag._id);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
    tag.description = decodeHtmlEntities(req.body.description || '');
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'metaTitle')) {
    tag.metaTitle = decodeHtmlEntities(req.body.metaTitle || '');
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'metaDescription')) {
    tag.metaDescription = decodeHtmlEntities(req.body.metaDescription || '');
  }

  await tag.save();

  if (previousName !== tag.name) {
    await Blog.updateMany(
      { tags: previousName },
      { $set: { 'tags.$[matchedTag]': tag.name } },
      { arrayFilters: [{ matchedTag: previousName }] },
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Blog tag updated successfully',
    data: tag,
  });
});

exports.deleteBlogTag = catchAsync(async (req, res, next) => {
  const tag = await BlogTag.findById(req.params.id);
  if (!tag) return next(new AppError('Blog tag not found', 404));

  await Blog.updateMany({}, { $pull: { tags: tag.name } });
  await BlogTag.findByIdAndDelete(tag._id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.duplicateBlogTag = catchAsync(async (req, res, next) => {
  const tag = await BlogTag.findById(req.params.id);
  if (!tag) return next(new AppError('Blog tag not found', 404));

  const duplicatedName = await buildUniqueCopyName(tag.name);

  const duplicated = await BlogTag.create({
    name: duplicatedName,
    slug: await buildUniqueSlug(duplicatedName),
    description: tag.description || '',
    metaTitle: tag.metaTitle || '',
    metaDescription: tag.metaDescription || '',
  });

  res.status(201).json({
    status: 'success',
    message: 'Blog tag duplicated successfully',
    data: duplicated,
  });
});
