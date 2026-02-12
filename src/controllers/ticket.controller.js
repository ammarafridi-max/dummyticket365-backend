const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const ticketService = require('../services/ticket.service');

exports.getAllTickets = catchAsync(async (req, res) => {
  const result = await ticketService.getAllTickets(req.query);

  res.status(200).json({
    status: 'success',
    message: 'Tickets fetched',
    data: {
      data: result.data,
      pagination: result.pagination,
      results: result.data.length,
    },
  });
});

exports.getTicket = catchAsync(async (req, res, next) => {
  const data = await ticketService.getTicketBySessionId(req.params.sessionId);
  if (!data) return next(new AppError('Ticket not found', 404));

  res.status(200).json({ status: 'success', data });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const updated = await ticketService.updateOrderStatus(req.params.sessionId, req.user.id, req.body.orderStatus);

  res.status(200).json({
    status: 'success',
    message: 'Order status updated',
    data: updated,
  });
});

exports.deleteTicket = catchAsync(async (req, res, next) => {
  await ticketService.deleteTicket(req.params.sessionId);

  res.status(204).json({ status: 'success' });
});

exports.createTicketRequest = catchAsync(async (req, res) => {
  const ticket = await ticketService.createTicketRequest(req.body);

  res.status(200).json({
    status: 'success',
    data: ticket,
    sessionId: ticket.sessionId,
  });
});

exports.createStripePaymentUrl = catchAsync(async (req, res) => {
  const session = await ticketService.createStripePaymentUrl(req.body);

  res.status(200).json({ data: session.url });
});

exports.refundStripePayment = catchAsync(async (req, res) => {
  const { transactionId } = req.params;

  const session = await ticketService.refundStripePaymentByTransactionId(transactionId);

  res.status(200).json({
    status: 'success',
    message: 'Payment refunded successfully',
    data: session,
  });
});
