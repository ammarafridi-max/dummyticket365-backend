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
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.get('/', getAllBlogTags);
router.get('/slug/:slug', getBlogTagBySlug);
router.get('/:id', getBlogTagById);

router.use(protect, restrictTo('admin', 'blog-manager'));

router.post('/', createBlogTag);
router.patch('/:id', updateBlogTag);
router.delete('/:id', deleteBlogTag);
router.post('/:id/duplicate', duplicateBlogTag);

module.exports = router;
