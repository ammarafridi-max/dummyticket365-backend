const router = require('express').Router();
const multer = require('multer');
const emailController = require('../controllers/email.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

const upload = multer({ storage: multer.memoryStorage() });

router
  .route('/send-email')
  .post(protect, restrictTo('admin', 'agent'), upload.single('reservation'), emailController.sendEmail);

module.exports = router;
