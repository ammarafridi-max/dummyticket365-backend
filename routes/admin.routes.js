const express = require('express');
const {
  getAllTickets,
  deleteTicket,
  updateStatus,
  login,
} = require('../controllers/admin.controller');
const router = express.Router();

router.route('/tickets').get(getAllTickets);
router.route('/tickets/:sessionId').delete(deleteTicket).put(updateStatus);

module.exports = router;
