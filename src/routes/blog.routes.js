const router = require('express').Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  createBlogPost,
  getBlogPosts,
  getBlogPostBySlug,
  getBlogPostById,
  updateBlogPost,
  deleteBlogPost,
  publishBlog,
  duplicateBlogPost,
} = require('../controllers/blog.controller');

const { protect, restrictTo } = require('../middleware/auth.middleware');

router.get('/', getBlogPosts);
router.get('/slug/:slug', getBlogPostBySlug);

router.use(protect, restrictTo('admin', 'blog-manager'));

router.post('/', upload.single('coverImage'), createBlogPost);
router.get('/:id', getBlogPostById);
router.patch('/:id', upload.single('newCoverImage'), updateBlogPost);
router.delete('/:id', deleteBlogPost);
router.patch('/:id/publish', publishBlog);
router.post('/:id/duplicate', duplicateBlogPost);

module.exports = router;
