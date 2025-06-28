require('dotenv').config();
const amadeus = require('../utils/amadeus');
const DummyTicket = require('../models/DummyTicket');
const stripeClient = require('../utils/stripeClient');
const { v4: uuidv4 } = require('uuid');
const { sendEmail, generateEmailTemplate } = require('../utils/send-email');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

const admin = process.env.SENDER_EMAIL;

// A new ticket request is made from "booking/select-flights". The data
// is stored in MongoDB

exports.createTicketRequest = async (req, res) => {
  const data = req.body;
  try {
    const sessionId = uuidv4();
    const updatedData = {
      ...data,
      sessionId,
      amountPaid: { currency: '', amount: 0 },
      handledBy: null,
    };

    // 1. Upload data to DB
    const result = await DummyTicket.create(updatedData);

    // 2. Send email to admin
    const totalQuantity =
      result.quantity.adults +
      result.quantity.children +
      result.quantity.infants;

    const subject = `${result.passengers[0].firstName} ${result.passengers[0].lastName} just submitted a form on MyDummyTicket.ae`;
    const htmlContent = generateEmailTemplate('adminFormSubmission', {
      type: result.type,
      submittedOn: result.createdAt,
      ticketCount: totalQuantity,
      passengers: result.passengers,
      number: result.phoneNumber.code + result.phoneNumber.digits,
      email: result.email,
      from: result.from,
      to: result.to,
      departureDate: result.departureDate,
      departureFlight: result.flightDetails.departureFlight,
      returnDate: result.returnDate,
      returnFlight: result.flightDetails.returnFlight,
      ticketValidity: result.ticketValidity,
      ticketAvailability: result.ticketAvailability.immediate,
      ticketAvailabilityDate: result.ticketAvailability.receiptDate,
      message: result.message,
    });

    sendEmail(admin, subject, htmlContent);
    res.status(200).json({
      status: 'success',
      message: 'Data received',
      data: result,
      sessionId: result.sessionId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'fail', message: 'Server error' });
  }
};

// The data stored in MongoDB is retrieved using the sessionId that was
// previously sent the the client.

exports.fetchFormDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const data = await DummyTicket.findOne({ sessionId: sessionId });

    if (!data)
      return res.status(404).json({
        status: 'fail',
        message: 'Ticket details could not be found',
        data,
      });

    return res.status(200).json({
      status: 'success',
      message: 'ticket details fetched successfully',
      data,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

// The final step. A new Stripe session is created when the user
// clicks on "Proceed to Payment" button on "booking/review-details" page

exports.buyTicket = async (req, res) => {
  const ticketDetails = req.body;
  try {
    const stripeSession = await stripeClient.createCheckoutSession(
      ticketDetails,
      ticketDetails.sessionId
    );
    if (!stripeSession) {
      return res.status(404).json({
        message: 'Stripe session not found',
      });
    }
    return res.status(200).json({
      message: 'successfully created ticket',
      url: stripeSession.url,
    });
  } catch (error) {
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
};

// Get all dummy tickets

exports.getAllTickets = catchAsync(async (req, res, next) => {
  const data = await DummyTicket.find()
    .sort({ createdAt: -1 })
    .limit(150)
    .populate({ path: 'handledBy' });

  res.status(200).json({
    status: 'success',
    message: 'Tickets fetched',
    data,
  });
});

// Delete a dummy ticket

exports.deleteTicket = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const data = await DummyTicket.findOneAndDelete({ sessionId: sessionId });
  if (!data) {
    return next(new AppError('Ticket not found.', 404));
  }
  res
    .status(200)
    .json({ status: 'success', message: 'Data deleted successfully' });
});

// Update status to PENDING, DELIVERED, CONTACTED

exports.updateStatus = catchAsync(async (req, res, next) => {
  const { sessionId } = req.params;
  const { userId, orderStatus } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return next(new AppError('Invalid User ID', 400));
  }

  const data = await DummyTicket.findOneAndUpdate(
    { sessionId },
    { $set: { orderStatus, handledBy: new mongoose.Types.ObjectId(userId) } }
  ).populate('handledBy');

  if (!data)
    return next(
      new AppError('Could not find dummy ticket with that sessionId', 404)
    );

  res.status(200).json({
    status: 'success',
    message: `Order status set to ${orderStatus}`,
  });
});

// Stripe event to send email to admin, confirming the payment, and
// updating the status of the document in MonogDB.

exports.listenStripeEvents = async (req, res) => {
  try {
    const event = await stripeClient.verifyStripeSignature(req);
    if (!event) {
      return res.status(400).send(`Webhook Error`);
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const sessionId = session.metadata.sessionId;

        // 1. Update status to "PAYMENT_DONE"
        const form = await DummyTicket.findOneAndUpdate(
          { sessionId: sessionId },
          {
            $set: {
              status: 'PAYMENT_DONE',
              amountPaid: {
                currency: session.currency.toUpperCase(),
                amount: parseFloat((session.amount_total / 100).toFixed(2)),
              },
              orderStatus: 'PENDING',
            },
          },
          { new: true }
        );

        if (!form) {
          return res.status(404).json({
            status: 'fail',
            message: 'Session not found',
          });
        }

        // 2. Send email to customer
        const customerSubject = 'Payment Confirmation for Your Booking';
        const customerHtmlContent = generateEmailTemplate(
          'customerPaymentConfirmation',
          {
            customer: session.metadata.customer,
            email: session.customer_email,
            ticketType: session.metadata.ticketType || 'Unknown',
            departureCity: session.metadata.departureCity || 'Unknown',
            arrivalCity: session.metadata.arrivalCity || 'Unknown',
            departureDate: session.metadata.departureDate || 'Unknown',
            returnDate: session.metadata.returnDate || 'Not Specified',
            currency: session.currency.toUpperCase(),
            amount: (session.amount_total / 100).toFixed(2),
          }
        );

        // 3. Send email to admin
        const adminSubject = `Payment received by ${session.metadata.customer}`;
        const adminHtmlContent = generateEmailTemplate(
          'adminPaymentNotification',
          {
            customer: session.metadata.customer,
            email: session.customer_email,
            ticketType: session.metadata.ticketType || 'Unknown',
            departureCity: session.metadata.departureCity || 'Unknown',
            arrivalCity: session.metadata.arrivalCity || 'Unknown',
            departureDate: session.metadata.departureDate || 'Unknown',
            returnDate: session.metadata.returnDate || 'Not Specified',
            currency: session.currency.toUpperCase(),
            amount: (session.amount_total / 100).toFixed(2),
          }
        );

        try {
          const [customerEmailResponse, adminEmailResponse] = await Promise.all(
            [
              // sendEmail(
              //   session.customer_email,
              //   customerSubject,
              //   customerHtmlContent
              // ),
              sendEmail(admin, adminSubject, adminHtmlContent),
            ]
          );
        } catch (error) {
          console.error('Error sending emails: ', error);
        }
        res.status(200).json({ received: true });
        break;
      }
      default:
        res.status(200).json({ received: true });
        break;
    }
  } catch (error) {
    console.error('Error handling webhook event:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
};

// exports.createForm = async (req, res) => {
//   const formData = req.body;
//   try {
//     const sessionId = uuidv4();
//     const form = {
//       sessionId,
//       type: formData.type,
//       from: formData.from,
//       to: formData.to,
//       departureDate: formData.departureDate,
//       returnDate: formData.type === "Return" ? formData.returnDate : undefined,
//       quantity: formData.quantity,
//       status: "SEARCH_FLIGHTS",
//     };
//     console.log(sessionId);

//     const data = await Form.create(form);

//     return res.status(200).json({
//       message: "Session has started successfully.",
//       sessionId: data.sessionId,
//       success: true,
//     });
//   } catch (error) {
//     console.error("Error creating form:", error);

//     return res.status(500).json({
//       message: "Failed to create the form. Please try again.",
//       success: false,
//     });
//   }
// };

// exports.updateTicketDetails = async (req, res) => {
//   try {
//     const { sessionId } = req;
//     const { flightData } = req.body;

//     if (
//       !flightData ||
//       typeof flightData !== "object" ||
//       Object.keys(flightData).length === 0
//     ) {
//       return res.status(400).json({
//         message: "Missing or invalid flight data",
//       });
//     }

//     const updatedData = await Form.findOneAndUpdate(
//       { sessionId: sessionId },
//       {
//         $set: {
//           status: "REVIEW_ORDER",
//           type: flightData.type,
//           flightDetails: flightData.flightDetails,
//           passengers: flightData.passengers,
//           email: flightData.email,
//           phoneNumber: {
//             code: flightData.phoneNumber.code,
//             digits: flightData.phoneNumber.digits,
//           },
//           from: flightData.from,
//           to: flightData.to,
//           departureDate: flightData.departureDate,
//           quantity: flightData.quantity,
//           ticketValidity: flightData.ticketValidity,
//           ticketAvailability: {
//             immediate: flightData.ticketAvailability.immediate,
//             receiptDate: flightData.ticketAvailability.receiptDate,
//           },
//           message: flightData.message,
//         },
//       },
//       { new: true }
//     );

//     if (flightData.returnDate) {
//       updatedData.returnDate = flightData.returnDate;
//     }

//     if (!updatedData) {
//       return res.status(404).json({
//         message: "Failed to update data",
//       });
//     }

//     const totalQuantity =
//       updatedData.quantity.adults +
//       updatedData.quantity.children +
//       updatedData.quantity.infants;

//     // Send email to admin
//     const subject = `${updatedData.passengers[0].firstName} ${updatedData.passengers[0].lastName} just submitted a from on MyDummyTicket.ae`;
//     const htmlContent = generateEmailTemplate("adminFormSubmission", {
//       type: updatedData.type,
//       submittedOn: updatedData.createdAt,
//       ticketCount: totalQuantity,
//       passengers: updatedData.passengers,
//       number: updatedData.phoneNumber.code + updatedData.phoneNumber.digits,
//       email: updatedData.email,
//       from: updatedData.from,
//       to: updatedData.to,
//       departureDate: updatedData.departureDate,
//       departureFlight: updatedData.flightDetails.departureFlight,
//       returnDate: updatedData.returnDate,
//       returnFlight: updatedData.flightDetails.returnFlight,
//       ticketValidity: updatedData.ticketValidity,
//       ticketAvailability: updatedData.ticketAvailability.immediate,
//       ticketAvailabilityDate: updatedData.ticketAvailability.receiptDate,
//       message: updatedData.message,
//     });

//     sendEmail(admin, subject, htmlContent);
//     return res.status(200).json({
//       message: "Form details updated successfully",
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: error.message,
//     });
//   }
// };
