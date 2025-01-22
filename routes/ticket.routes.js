require('dotenv').config();
const express = require('express');
const {
  fetchFormDetails,
  buyTicket,
  listenStripEvents,
  createTicketRequest,
} = require('../controllers/ticket.controller');
const validateSessionId = require('../middleware/verify-session');

const router = express.Router();

router.post('/create-ticket', createTicketRequest);
router.get('/get-form-details', fetchFormDetails);
router.post('/buy-ticket', buyTicket);
router.post('/webhook', listenStripEvents);

module.exports = router;
