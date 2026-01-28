const router = require('express').Router();
const multer = require('multer');
const emailController = require('../controllers/email.controller');

const upload = multer({ storage: multer.memoryStorage() });

router.route('/send-email').post(upload.single('reservation'), emailController.sendEmail);

module.exports = router;
