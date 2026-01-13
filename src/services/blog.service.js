const cache = require('../utils/cache');
const Blog = require('../models/Blog');
const slugify = require('slugify');
const AppError = require('../utils/appError');
const {
  uploadImageToCloudinary,
  deleteCloudinaryFile,
} = require('../utils/cloudinary');
const {
  generateUniqueSlug,
  estimateReadingTime,
} = require('../utils/blogHelper');

exports.getBlogs = async ({ page, limit, status, tag, search }) => {
  const cacheKey = `blogs:${page}:${limit}:${status || 'all'}:${tag || 'all'}:${search || ''}`;

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const skip = (page - 1) * limit;
  const filter = {};

  if (status && status !== 'all') filter.status = status;
  if (tag) filter.tags = tag;

  if (search) {
    filter.$or = [
      { title: new RegExp(search, 'i') },
      { excerpt: new RegExp(search, 'i') },
      { content: new RegExp(search, 'i') },
    ];
  }

  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author'),
    Blog.countDocuments(filter),
  ]);

  const result = { blogs, total };

  await cache.set(cacheKey, result);

  return result;
};

exports.getBlogBySlug = async (slug) => {
  const cacheKey = `blog:${slug}`;

  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const blog = await Blog.findOne({
    slug,
    status: 'published',
  }).populate('author');

  if (!blog) return null;

  cache.set(cacheKey, blog);
  return blog;
};

exports.clearBlogCache = () => {
  cache.keys().forEach((key) => {
    if (key.startsWith('blog:') || key.startsWith('blogs:')) {
      cache.del(key);
    }
  });
};

exports.validateBlog = (req, { requireCoverImage = true } = {}) => {
  const { title, content } = req.body;

  if (!title || !content) {
    throw new AppError('Title and content are required', 400);
  }

  if (requireCoverImage && !req.file) {
    throw new AppError('Cover image is required', 400);
  }
};

exports.normalizeTags = (tags) => {
  if (!tags) return [];

  const arr = Array.isArray(tags) ? tags : [tags];
  return [...new Set(arr.map((t) => t.trim().toLowerCase()))].filter(Boolean);
};

exports.saveCoverImage = async (req, uniqueSlug, blog = null) => {
  if (!req.file) return blog?.coverImageUrl;

  try {
    if (blog?.coverImageUrl) {
      await deleteCloudinaryFile(blog.coverImageUrl);
    }

    const slug = blog?.slug || uniqueSlug;
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
