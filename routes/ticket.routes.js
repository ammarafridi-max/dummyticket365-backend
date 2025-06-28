require('dotenv').config();
const express = require('express');
const ticketController = require('../controllers/ticket.controller');
const validateSessionId = require('../middleware/verify-session');

const router = express.Router();

router
  .route('/')
  .get(ticketController.getAllTickets)
  .post(ticketController.createTicketRequest);

router.post('/buy-ticket', validateSessionId, ticketController.buyTicket);
router.post('/webhook', ticketController.listenStripeEvents);

router
  .route('/:sessionId')
  .get(ticketController.fetchFormDetails)
  .delete(ticketController.deleteTicket)
  .patch(ticketController.updateStatus);

module.exports = router;
