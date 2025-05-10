const express = require('express');
const adminController = require('../controllers/admin.controller');
const authController = require('../controllers/auth.controller');
const router = express.Router();

router
  .route('/tickets')
  .get(authController.protect, adminController.getAllTickets);

router.route('/tickets/:sessionId').put(adminController.updateStatus);

module.exports = router;
