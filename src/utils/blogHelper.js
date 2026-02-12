const Blog = require('../models/Blog');

exports.estimateReadingTime = (content = '') => {
  const words = content.trim().split(/\s+/).length || 0;
  const wordsPerMinute = 200;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
};

exports.generateUniqueSlug = async (baseSlug, currentId = null) => {
  let slug = baseSlug;
  let counter = 1;

  let exists = await Blog.exists(currentId ? { slug, _id: { $ne: currentId } } : { slug });

  while (exists) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
    exists = await Blog.exists(currentId ? { slug, _id: { $ne: currentId } } : { slug });
  }

  return slug;
};
