const sendEmail = require('../utils/email');
const formatDate = require('../utils/formatDate');
const formatDubaiTime = require('../utils/formatDubaiTime');
const { format } = require('date-fns');
const extractIataCode = require('../utils/extractIataCode');

function formatToDDMMM(dateStr) {
  const [year, month, day] = dateStr.split('-');

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  return `${Number(day)}${months[Number(month) - 1]}`;
}

exports.sendInsuranceFormSubmission = async ({
  quoteId,
  schemeId,
  journeyType,
  startDate,
  endDate,
  quantity,
  passengers,
}) => {
  const leadPassenger = `${passengers[0].firstName} ${passengers[0].lastName}`;

  await sendEmail({
    email: 'info@dummyticket365.com',
    subject: `Travel insurance form submission by ${leadPassenger}`,
    name: 'DT365 Team',
  });
};

exports.ticketPaymentCompletionEmail = async ({
  createdAt,
  type,
  from,
  to,
  departureDate,
  returnDate,
  leadPassenger,
  email,
  number,
  flightDetails,
  ticketValidity,
  ticketDelivery,
  passengers,
  message,
}) => {
  // if (process.env.NODE_ENV === 'development') return;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dummy Ticket Booking - ${leadPassenger}</title>
      <style>
        * {
          box-sizing: border-box;
          padding: 0;
          margin: 0;
        }

        body {
          font-family: 'Arial', sans-serif;
        }

        main {
          width: 600px;
          margin: 0 auto;
          border: 1px solid lightgray;
          padding: 20px
        }

        div, a, p, span, li {
          font-size: 15px;
          line-height: 24px;
        }

        a {
          color: black;
          text-decoration: none;
          display: block;
        }

        p {
          margin-bottom: 20px;
        }

        p.large {
          font-size: 20px
        }

        p.message {
          background-color: rgb(230, 230, 230);
          padding: 15px;
          border-radius: 10px;
        }

        p.danger {
          background-color: #880808;
          color: white;
          margin-bottom: 15px;
        }

        ul {
          margin-bottom: 30px;
        }

        li {
          list-style-type: none;
        }

        .bold {
          font-weight: 600;
        }

        .contact-links{
          margin-bottom: 20px;
        }

        .footer span {
          display: block;
        }

        @media screen and (max-width: 991px) {
          main {
            width: 100%
          }
        }

      </style>
    </head>
    <body>
      <main>
        ${
          !ticketDelivery.immediate
            ? `
        <p class="message danger">
          <strong>Delivery Date:</strong>
          ${formatDate(ticketDelivery.deliveryDate)}
        </p>
        `
            : ''
        }
        ${message ? `<p class="message"><strong>Message:</strong> ${message}</p>` : ''}
        <p class="bold large">Trip Details</p>
        <ul>
          <li>
            <span>Type:</span> <span>${type}</span>
          </li>
          <li>From: <span>${from}</span></li>
          <li>To: <span>${to}</span></li>
          <li>Departure Date: <span>${formatDate(departureDate)}</span></li>
          ${type === 'Return' ? `<li>Return Date: <span>${formatDate(returnDate)}</span></li>` : ''}
          <li>Departure Flight: <span>${flightDetails?.departureFlight?.segments[0]?.carrierCode || ''} ${flightDetails?.departureFlight?.segments[0]?.flightNumber || ''}</span></li>
          ${type === 'Return' ? `<li>Return Flight: <span>${flightDetails?.returnFlight?.segments[0]?.carrierCode || ''} ${flightDetails?.returnFlight?.segments[0]?.flightNumber || ''}</span></li>` : ''}
        </ul>

        <p class="bold large">Ticket Details</p>
        <ul>
          <li>Booking Date: ${formatDate(createdAt)} ${formatDubaiTime(createdAt)}</li>
          <li>Validity: <span>${ticketValidity}</span></li>
          <li>Delivery: <span>${ticketDelivery?.immediate ? 'Immediate' : formatDate(ticketDelivery?.deliveryDate)}</span></li>
          <li>Email: <span>${email}</span></li>
          <li>Phone Number: <span>${number}</span></li>
        </ul>

        <p class="bold large">Passenger Names</p>
        <ul>
          ${passengers?.map(
            (passenger) =>
              `<li>${passenger?.type}: ${passenger?.title} ${passenger?.firstName} / ${passenger?.lastName}</li>`,
          )}
        </ul>

        <div class="footer">
        </div>
      </main>
    </body>
    </html>
  `;

  await sendEmail({
    email: 'info@dummyticket365.com',
    name: 'Payments - Dummy Ticket 365',
    subject: `Payment received by ${leadPassenger}`,
    htmlContent,
  });
};

exports.ticketLaterDateDeliveryEmail = async ({ to, passenger, deliveryDate }) => {
  if (process.env.NODE_ENV === 'development') return;

  await sendEmail({
    email: to,
    name: 'Dummy Ticket 365',
    subject: `Your flight reservation will be delivered on ${formatDate(deliveryDate)}`,
    textContent: `Hi ${passenger},\n\nThank you for booking your dummy ticket with Dummy Ticket 365.\n\nYour flight reservation will be sent to your email address as per your requested date on ${formatDate(deliveryDate)}.\n\nIf you accidentally selected the later date delivery option and want your dummy ticket to be issued now, please reply to this email and we'll issue and send your dummy ticket as soon as possible.\n\nBest regards,\nDummy Ticket 365 team\nwww.dummyticket365.com`,
  });
};
