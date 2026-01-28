const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { deleteCloudinaryFolder } = require('../utils/cloudinary');
const blogService = require('../services/blog.service');
const Blog = require('../models/Blog');

exports.getBlogPosts = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const { status, tag, search } = req.query;

  const { blogs, total } = await blogService.getBlogs({
    page,
    limit,
    status,
    tag,
    search,
  });

  res.status(200).json({
    status: 'success',
    results: blogs.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: blogs,
  });
});

exports.getBlogPostBySlug = catchAsync(async (req, res, next) => {
  const blog = await blogService.getBlogBySlug(req.params.slug);

  if (!blog) {
    return next(new AppError('Blog post not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: blog,
  });
});

exports.getBlogPostById = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id).populate('author');

  if (!blog) {
    return next(new AppError('Blog post not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: blog,
  });
});

exports.createBlogPost = catchAsync(async (req, res) => {
  const { title, slug: customSlug, content, excerpt, status, tags, metaTitle, metaDescription } = req.body;

  blogService.validateBlog(req, { requireCoverImage: true });

  const { uniqueSlug, readingTime } = await blogService.generateSlugAndReadingTime(customSlug, title, content);

  const normalizedTags = blogService.normalizeTags(tags);
  const coverImageUrl = await blogService.saveCoverImage(req, uniqueSlug);

  const blog = await Blog.create({
    title,
    slug: uniqueSlug,
    content,
    excerpt,
    coverImageUrl,
    status: status || 'draft',
    tags: normalizedTags,
    metaTitle: metaTitle || title,
    metaDescription,
    author: req.user._id,
    readingTime,
    publishedAt: status === 'published' ? new Date() : null,
  });

  await blog.populate('author');

  res.status(201).json({
    status: 'success',
    message: 'Blog created successfully',
    data: blog,
  });
});

exports.updateBlogPost = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new AppError('Blog not found', 404));

  blogService.validateBlog(req, { requireCoverImage: false });

  const normalizedTags = blogService.normalizeTags(req.body.tags);

  const updateData = {
    title: req.body.title,
    slug: req.body.slug,
    content: req.body.content,
    excerpt: req.body.excerpt,
    status: req.body.status,
    tags: normalizedTags,
    metaTitle: req.body.metaTitle,
    metaDescription: req.body.metaDescription,
  };

  Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

  updateData.coverImageUrl = await blogService.saveCoverImage(req, blog.slug, blog);

  const updatedBlog = await Blog.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate('author');

  res.status(200).json({
    status: 'success',
    message: 'Blog updated successfully',
    data: updatedBlog,
  });
});

exports.deleteBlogPost = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new AppError('Blog post not found', 404));

  const folderName = `mdt/mdt_blog/${blog.slug}`.replace(/\s+/g, '_');

  try {
    await deleteCloudinaryFolder(folderName);
  } catch (err) {
    console.error('Failed to delete Cloudinary folder:', err);
  }

  await Blog.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.duplicateBlogPost = catchAsync(async (req, res, next) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return next(new AppError('Blog post not found', 404));

  const blogObj = blog.toObject();

  delete blogObj._id;
  delete blogObj.createdAt;
  delete blogObj.updatedAt;
  delete blogObj.publishedAt;
  delete blogObj.author;
  delete blogObj.publisher;
  delete blogObj.__v;

  blogObj.title = `${blogObj.title} Copy`;
  blogObj.slug = `${blogObj.slug}-copy`;
  blogObj.status = 'draft';

  const duplicated = await Blog.create(blogObj);

  res.status(201).json({
    status: 'success',
    message: 'Blog post duplicated successfully',
    data: duplicated,
  });
});

exports.publishBlog = catchAsync(async (req, res) => {
  const updatedBlog = await Blog.findByIdAndUpdate(
    req.params.id,
    {
      status: 'published',
      publishedAt: new Date(),
      publisher: req.user._id,
    },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    status: 'success',
    message: 'Blog published successfully',
    data: updatedBlog,
  });
});
