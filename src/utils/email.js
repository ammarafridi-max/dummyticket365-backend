const formatDate = require('./formatDate');
const formatDubaiTime = require('./formatDubaiTime');
const AppError = require('./appError');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_HEADER = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'api-key': BREVO_API_KEY,
};
const BREVO_SENDER = {
  name: 'Dummy Ticket 365',
  email: 'info@dummyticket365.com',
};

const sendEmail = async ({
  email,
  name,
  subject,
  htmlContent,
  textContent,
}) => {
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: BREVO_HEADER,
    body: JSON.stringify({
      sender: BREVO_SENDER,
      to: [{ email, name }],
      subject,
      textContent,
      htmlContent,
    }),
  });

  if (!res.ok) {
    throw new AppError('Could not send email', 400);
  }
};

const testEmail = async () => {
  await sendEmail({
    email: 'info@dummyticket365.com',
    name: 'Test',
    subject: 'Test email',
    htmlContent: '<p>Test email send</p>',
  });
};

const adminFormSubmissionEmail = async ({
  type,
  from,
  to,
  departureDate,
  returnDate,
  passengers,
  submittedOn,
  number,
  email,
  ticketCount,
  message,
  flightDetails,
  ticketValidity,
  ticketDelivery,
  ticketDeliveryDate,
}) => {
  // if (process.env.NODE_ENV === 'development') return;

  const leadPassenger = `${passengers[0].firstName} ${passengers[0].lastName}`;

  const passengerList = passengers
    .map(
      (passenger) =>
        `<p>${passenger.type}:  ${passenger.title} ${passenger.firstName} / ${passenger.lastName}<br></p>`
    )
    .join('');

  const subject = `${!ticketDelivery ? `(${formatDate(ticketDeliveryDate)}) ` : ''}${leadPassenger} just submitted a form on DummyTicket365.com`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${passengers[0].firstName} ${passengers[0].lastName} just submitted a form on DummyTicket365.com</title>
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
              <td><p>${flightDetails?.departureFlight?.segments[0]?.carrierCode || ''} ${flightDetails?.departureFlight?.segments[0]?.flightNumber || ''}</p></td>
            </tr>
            ${
              type === 'Return'
                ? `
                  <tr>
                    <td><strong>Returning On:</strong></td>
                    <td><p>${formatDate(returnDate)}</p></td>
                  </tr>
                  <tr>
                    <td><strong>Return Flight:</strong></td>
                    <td><p>${flightDetails?.returnFlight?.segments[0]?.carrierCode || ''} ${flightDetails?.returnFlight?.segments[0]?.flightNumber || ''}</p></td>
                  </tr>
                `
                : ''
            }
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
              <td><p>${ticketDelivery ? 'Immediate' : 'Later'}</p></td>
            </tr>
            ${
              ticketDeliveryDate !== null
                ? `
            <tr>
              <td><strong>Ticket Receipt Date:</strong></td>
              <td><p>${formatDate(ticketDeliveryDate)}</p></td>
            </tr>
            `
                : ''
            }
          </table>

          <div class="footer">
            <p>Best regards,</p>
            <p><strong>Dummy Ticket 365</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail({
    email: 'info@dummyticket365.com',
    name: leadPassenger,
    subject,
    htmlContent: htmlContent,
  });
};

const adminPaymentCompletionEmail = async ({
  type,
  from,
  to,
  customer,
  email,
  departureDate,
  returnDate,
}) => {
  if (process.env.NODE_ENV === 'development') return;
  await sendEmail({
    email: 'info@dummyticket365.com',
    name: 'Payments - Dummy Ticket 365',
    subject: `Payment received by ${customer}`,
    textContent: `Dear admin,\n\nPayment has been successfully processed for a recent booking. Details are as follows:\n\nTicket type: ${type}\n\nFrom: ${from} \n\nTo: ${to} \n\nCustomer: ${customer} \n\nEmail: ${email} \n\nDeparture Date: ${formatDate(departureDate)} \n\nReturn Date: ${returnDate ? formatDate(returnDate) : 'Not specified'}`,
  });
};

const laterDateDeliveryEmail = async ({ to, passenger, deliveryDate }) => {
  if (process.env.NODE_ENV === 'development') return;
  await sendEmail({
    email: to,
    name: 'Dummy Ticket 365',
    subject: `Your flight reservation will be delivered on ${formatDate(deliveryDate)}`,
    textContent: `Hi ${passenger},\n\nThank you for booking your dummy ticket with Dummy Ticket 365.\n\nYour flight reservation will be sent to your email address as per your requested date on ${formatDate(deliveryDate)}.\n\nIf you accidentally selected the later date delivery option and want your dummy ticket to be issued now, please reply to this email and we'll issue and send your dummy ticket as soon as possible.\n\nBest regards,\nDummy Ticket 365 team\nwww.mydummyticket.ae`,
  });
};

module.exports = {
  sendEmail,
  laterDateDeliveryEmail,
  adminFormSubmissionEmail,
  adminPaymentCompletionEmail,
  testEmail,
};
