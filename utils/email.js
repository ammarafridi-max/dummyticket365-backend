require('dotenv').config();
const nodemailer = require('nodemailer');
const formatDate = require('./formatDate');
const formatDubaiTime = require('./formatDubaiTime');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_PASSWORD,
  },
});

// Function to send an email
const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.SENDER_EMAIL,
    to,
    subject,
    html: htmlContent,
  };

  try {
    if (process.env.NODE_ENV === 'production') {
      const res = await transporter.sendMail(mailOptions);
      return res;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return null;
  }
};

// Function to generate email templates
const generateEmailTemplate = (templateType, templateData) => {
  switch (templateType) {
    case 'adminFormSubmission':
      return adminFormSubmissionTemplate(templateData);
    case 'adminPaymentNotification':
      return adminPaymentNotificationTemplate(templateData);
    case 'customerPaymentConfirmation':
      return customerPaymentConfirmationTemplate(templateData);
    default:
      return '';
  }
};

// Template for admin form submission email
const adminFormSubmissionTemplate = ({
  type,
  submittedOn,
  ticketCount,
  passengers,
  number,
  email,
  from,
  to,
  departureDate,
  departureFlight,
  returnDate,
  returnFlight,
  ticketValidity,
  ticketAvailability,
  ticketAvailabilityDate,
  message,
}) => {
  // Create a list of passengers
  const passengerList = passengers
    .map(
      (passenger) => `
      <p>
        ${passenger.type}:  ${passenger.title} ${passenger.firstName} / ${passenger.lastName}<br>
      </p>`
    )
    .join('');

  return `
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${passengers[0].firstName} ${
      passengers[0].lastName
    } just submitted a form on MyDummyTicket.ae</title>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        color: #333;
        background-color: #f4f9f9; /* Soft background for better readability */
        margin: 0;
        padding: 0;
      }
      .container {
        width: 100%;
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        padding: 25px 30px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        border-top: 10px solid #20b2aa; /* Light sea green theme accent */
      }
      h1 {
        color: #20b2aa;
        font-size: 26px;
        text-align: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #20b2aa;
        padding-bottom: 10px;
      }
      p {
        line-height: 1.5;
        margin: 10px 0;
        font-size: 16px;
        color: #555; 
      }
      strong {
        color: #20b2aa; /* Themed strong elements */
      }
      .details-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      .details-table td {
        padding: 10px;
        border: 1px solid #ddd;
        text-align: left;
      }
      .details-table th {
        background-color: #20b2aa;
        color: #ffffff;
        padding: 10px;
        text-align: left;
      }
      .footer {
        margin-top: 30px;
        font-size: 14px;
        text-align: center;
        color: #666;
      }
      .footer p {
        margin: 5px 0;
      }
      .button {
        display: inline-block;
        padding: 12px 25px;
        font-size: 16px;
        color: #ffffff;
        background-color: #20b2aa;
        text-decoration: none;
        border-radius: 5px;
        margin-top: 20px;
        transition: background-color 0.3s ease;
      }
      .button:hover {
        background-color: #1b998b;
      }
      .icon {
        width: 50px;
        height: 50px;
        display: inline-block;
        vertical-align: middle;
        margin-right: 10px;
      }
      /* Responsive design */
      @media (max-width: 600px) {
        .container {
          padding: 20px;
        }
        h1 {
          font-size: 22px;
        }
        p, .button {
          font-size: 15px;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>New Customer Form Submission</h1>
      <p>Dear Admin,</p>
      <p>A new customer has filled out the form. Below are the details:</p>

      <!-- Details Table -->
      <table class="details-table">
        <tr>
          <th>Detail</th>
          <th>Information</th>
        </tr>
        <tr>
          <td><strong>Type:</strong></td>
          <td>
          <p>${type}</p></td>
        </tr>
        <tr>
          <td><strong>Submitted On:</strong></td>
          <td><p>${formatDate(submittedOn)} ${formatDubaiTime(submittedOn)}</p></td>
        </tr>
        <tr>
          <td><strong>Number of Tickets:</strong></td>
          <td><p>${ticketCount}</p></td>
        </tr>
        <tr>
          <td><strong>Passengers:</strong></td>
          <td><p>${passengerList}</p></td>
        </tr>
        <tr>
          <td><strong>Phone Number:</strong></td>
          <td><p>${number}</p></td>
        </tr>
        <tr>
          <td><strong>Email:</strong></td>
          <td><p>${email}</p></td>
        </tr>
        <tr>
          <td><strong>From:</strong></td>
          <td><p>${from}</p></td>
        </tr>
        <tr>
          <td><strong>To:</strong></td>
          <td><p>${to}</p></td>
        </tr>
        <tr>
          <td><strong>Departing On:</strong></td>
          <td><p>${formatDate(departureDate)}</p></td>
        </tr>
        <tr>
          <td><strong>Departure Flight:</strong></td>
          <td><p>${departureFlight.segments[0].carrierCode} ${departureFlight.segments[0].flightNumber}</p></td>
        </tr>
        <tr>
          <td><strong>Returning On:</strong></td>
          <td><p>${returnDate === 'Invalid Date' ? 'Not Specified' : formatDate(returnDate)}</p></td>
        </tr>
        <tr>
          <td><strong>Return Flight:</strong></td>
          <td><p>${returnFlight === null ? 'Not Specified' : `${returnFlight.segments[0].carrierCode} ${returnFlight.segments[0].flightNumber}`}</p></td>
        </tr>
        ${
          message
            ? `
        <tr>
          <td><strong>Message:</strong></td>
          <td><p>${message}</p></td>
        </tr>
        `
            : ''
        }
        <tr>
          <td><strong>Ticket Validity:</strong></td>
          <td><p>${ticketValidity}</p></td>
        </tr>
        <tr>
          <td><strong>Ticket Availability:</strong></td>
          <td><p>${ticketAvailability ? 'Immediate' : 'Later'}</p></td>
        </tr>

        ${
          ticketAvailabilityDate !== null
            ? `
        <tr>
          <td><strong>Ticket Receipt Date:</strong></td>
          <td><p>${formatDate(ticketAvailabilityDate)}</p></td>
        </tr>
        `
            : ''
        }
      </table>

      <div class="footer">
        <p>Best regards,</p>
        <p><strong>My Dummy Ticket</strong></p>
      </div>
    </div>
  </body>
  </html>

  `;
};

// Template for admin payment notification email
const adminPaymentNotificationTemplate = ({
  customer,
  email,
  ticketType,
  departureCity,
  arrivalCity,
  departureDate,
  returnDate,
}) => {
  return `
<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmation</title>
    </head>
    <body>
      <div>

        <p>Dear Admin,</p>
        <p>A payment has been successfully processed for a recent booking. Here are the details:</p>
    
        <p>Ticket Type: ${ticketType}</p>
        <p>Name: ${customer}</p>
        <p>Email: ${email}</p>
        <p>From: ${departureCity}</p>
        <p>To: ${arrivalCity}</p>
        <p>Departure Date: ${formatDate(departureDate)}</p>
        <p>Return Date: ${returnDate && formatDate(returnDate)}</p>
      
        <p>Best regards,</p>
        <p>Dummy Ticket 365</p>
      </div>
    </body>
  </html>

  `;
};

// Template for customer payment confirmation email
const customerPaymentConfirmationTemplate = ({
  customer,
  email,
  ticketType,
  departureCity,
  arrivalCity,
  departureDate,
  returnDate,
  currency,
  amount,
}) => {
  return `
    <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
          <style>
            p {
              font-size:18px
            };
          </style>
        </head>
        <body>
          <div>
            <p>Dear ${customer},</p>
            <p>Thank you for your payment! We are pleased to confirm that your booking has been successfully processed. Here are the details of your ticket:</p>

            <p>Payment Amount: ${currency}${amount}</p>
            <p>Ticket Type: ${ticketType}</p>
            <p>Email: ${email}</p>
            <p>From: ${departureCity}</p>
            <p>To: ${arrivalCity}</p>
            <p>Departing On: ${formatDate(departureDate)}</p>
            ${returnDate && `<p>Returning On: ${formatDate(returnDate)}</p>`}
            <p>Your dummy ticket will be sent to your email address shortly. If you have any questions or require assistance, please don’t hesitate to contact us.</p>
            <p>We look forward to serving you!</p>

            <p>Dummy Ticket 365</p>
          </div>
        </body>
      </html>

  `;
};

const sendEmailWithAttachment = async (
  to,
  subject,
  text,
  pdfBuffer,
  filename
) => {
  const mailOptions = {
    from: `"Dummy Ticket 365" <${process.env.SENDER_EMAIL}>`,
    to,
    subject,
    text,
    attachments: [
      {
        filename,
        content: pdfBuffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmail,
  generateEmailTemplate,
  sendEmailWithAttachment,
};
