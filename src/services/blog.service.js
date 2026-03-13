const Blog = require('../models/Blog');
const BlogTag = require('../models/BlogTag');
const slugify = require('slugify');
const AppError = require('../utils/appError');
const { uploadImageToCloudinary, deleteCloudinaryFile } = require('../utils/cloudinary');
const { generateUniqueSlug, estimateReadingTime } = require('../utils/blogHelper');

exports.getBlogs = async ({ page, limit, status, tag, search, author }) => {
  let currentPage = Math.max(1, parseInt(page, 10) || 1);
  const pageSize = Math.max(1, parseInt(limit, 10) || 10);
  const filter = {};
  const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (status && status !== 'all') filter.status = status;
  if (tag && tag !== 'all') filter.tags = new RegExp(`^${escapeRegex(tag)}$`, 'i');
  if (author && author !== 'all') filter.author = author;

  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { excerpt: new RegExp(search, 'i') },
      { content: new RegExp(search, 'i') },
    ];
  }

  const total = await Blog.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > totalPages) currentPage = totalPages;

  const blogs = await Blog.find(filter)
    .sort({ createdAt: -1 })
    .skip((currentPage - 1) * pageSize)
    .limit(pageSize)
    .populate('author');

  const result = {
    blogs,
    total,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    },
  };

  return result;
};

exports.getBlogBySlug = async (slug) => {
  const blog = await Blog.findOne({
    slug,
    status: 'published',
  }).populate('author');

  if (!blog) return null;

  return blog;
};

exports.validateBlog = (req, { requireCoverImage = true, requireTitle = true, requireContent = true } = {}) => {
  const { title, content } = req.body;

  if (requireTitle && !title) {
    throw new AppError('Title is required', 400);
  }

  if (requireContent && !content) {
    throw new AppError('Content is required', 400);
  }

  if (!requireTitle && title === '') {
    throw new AppError('Title cannot be empty', 400);
  }

  if (!requireContent && content === '') {
    throw new AppError('Content cannot be empty', 400);
  }

  if (requireCoverImage && !req.file) {
    throw new AppError('Cover image is required', 400);
  }
};

exports.normalizeTags = (tags) => {
  if (!tags) return [];

  const arr = Array.isArray(tags) ? tags : [tags];
  const normalized = arr.map((tag) => String(tag || '').trim()).filter(Boolean);
  const seen = new Set();

  return normalized.filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

exports.parseFaqs = (faqs) => {
  if (faqs === undefined) return undefined;
  if (faqs === null || faqs === '') return [];

  let parsed = faqs;

  if (typeof faqs === 'string') {
    try {
      parsed = JSON.parse(faqs);
    } catch (err) {
      void err;
      throw new AppError('Invalid FAQs format', 400);
    }
  }

  if (!Array.isArray(parsed)) {
    throw new AppError('FAQs must be an array', 400);
  }

  return parsed
    .map((faq) => ({
      question: String(faq?.question || '').trim(),
      answer: String(faq?.answer || '').trim(),
    }))
    .filter((faq) => faq.question || faq.answer)
    .map((faq) => {
      if (!faq.question || !faq.answer) {
        throw new AppError('Each FAQ must include both a question and an answer', 400);
      }

      return faq;
    });
};

exports.ensureTagsExist = async (tags = []) => {
  if (!Array.isArray(tags) || tags.length === 0) return [];

  const existingTags = await BlogTag.find().select('name').lean();
  const nameByLower = new Map(existingTags.map((tag) => [String(tag.name).toLowerCase(), tag.name]));
  const normalizeLoose = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameByLoose = new Map(existingTags.map((tag) => [normalizeLoose(tag.name), tag.name]));

  const resolved = [];
  const missing = [];

  for (const tag of tags) {
    const input = String(tag || '').trim();
    if (!input) continue;

    const byCaseInsensitive = nameByLower.get(input.toLowerCase());
    if (byCaseInsensitive) {
      resolved.push(byCaseInsensitive);
      continue;
    }

    const byLooseMatch = nameByLoose.get(normalizeLoose(input));
    if (byLooseMatch) {
      resolved.push(byLooseMatch);
      continue;
    }

    missing.push(input);
  }

  if (missing.length > 0) {
    throw new AppError(`Unknown tag(s): ${missing.join(', ')}`, 400);
  }

  return [...new Set(resolved)];
};

exports.saveCoverImage = async (req, uniqueSlug, blog = null, targetSlug = null) => {
  if (!req.file) return blog?.coverImageUrl;

  try {
    if (blog?.coverImageUrl) {
      await deleteCloudinaryFile(blog.coverImageUrl);
    }

    const slug = targetSlug || blog?.slug || uniqueSlug;
    const folderName = `mdt/mdt_blog/${slug}`.replace(/\s+/g, '_');

    return await uploadImageToCloudinary(req.file.buffer, folderName);
  } catch (err) {
    console.error('Cover image upload failed:', err);
    throw new AppError('Failed to upload cover image', 500);
  }
};

exports.generateSlugAndReadingTime = async (customSlug, title, content) => {
  const baseSlug = slugify(customSlug || title, {
    lower: true,
    strict: true,
  });

  const uniqueSlug = await generateUniqueSlug(baseSlug);
  const readingTime = estimateReadingTime(content);

  return { uniqueSlug, readingTime };
};

exports.generateUniqueSlugFromInput = async (input, currentId = null) => {
  const baseSlug = slugify(input, {
    lower: true,
    strict: true,
  });

  return await generateUniqueSlug(baseSlug, currentId);
};

exports.getReadingTime = (content = '') => estimateReadingTime(content);

exports.parseScheduledAt = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

exports.publishDueScheduledBlogs = async () => {
  const now = new Date();
  const result = await Blog.updateMany(
    {
      status: 'scheduled',
      scheduledAt: { $lte: now },
    },
    {
      $set: {
        status: 'published',
        publishedAt: now,
      },
      $unset: {
        scheduledAt: 1,
      },
    },
  );

  return result.modifiedCount || 0;
};
