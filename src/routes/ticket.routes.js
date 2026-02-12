const router = require('express').Router();
const ticketController = require('../controllers/ticket.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

router.post('/', ticketController.createTicketRequest);
router.post('/checkout', ticketController.createStripePaymentUrl);
router.get('/:sessionId', ticketController.getTicket);

router.use(protect, restrictTo('admin', 'agent'));

router.get('/', ticketController.getAllTickets);
router.patch('/:sessionId/status', ticketController.updateOrderStatus);

router.use(protect, restrictTo('admin'));

router.delete('/:sessionId', ticketController.deleteTicket);
router.post('/:transactionId/refund', ticketController.refundStripePayment);

module.exports = router;
