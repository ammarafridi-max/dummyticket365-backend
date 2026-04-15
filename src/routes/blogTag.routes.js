const router = require('express').Router();
const {
  getAllBlogTags,
  getBlogTagBySlug,
  getBlogTagById,
  createBlogTag,
  updateBlogTag,
  deleteBlogTag,
  duplicateBlogTag,
} = require('../controllers/blogTag.controller');
const validate = require('../middleware/validate');
const { createBlogTagSchema, updateBlogTagSchema } = require('../validators/blogTag.validator');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.get('/', getAllBlogTags);
router.get('/slug/:slug', getBlogTagBySlug);
router.get('/:id', getBlogTagById);

router.use(protect, restrictTo('admin', 'blog-manager'));

router.post('/', validate(createBlogTagSchema), createBlogTag);
router.patch('/:id', validate(updateBlogTagSchema), updateBlogTag);
router.delete('/:id', deleteBlogTag);
router.post('/:id/duplicate', duplicateBlogTag);

module.exports = router;
