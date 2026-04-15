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

function formatToDDMMMYYYY(dateStr) {
  const [year, month, day] = dateStr.split('-');

  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@dummyticket365.com';

exports.sendInsuranceFormSubmission = async ({ passengers }) => {
  const leadPassenger = `${passengers[0].firstName} ${passengers[0].lastName}`;

  await sendEmail({
    email: ADMIN_EMAIL,
    subject: `Travel insurance form submission by ${leadPassenger}`,
    name: 'DT365 Team',
  });
};

exports.insurancePaymentCompletionEmail = async ({
  leadTraveler,
  email,
  sessionId,
  policyId,
  policyNumber,
  amount,
  currency,
  journeyType,
  startDate,
  endDate,
  region,
  quoteId,
  mobile,
}) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Travel Insurance Payment - ${leadTraveler}</title>
      <style>
        * { box-sizing: border-box; padding: 0; margin: 0; }
        body { font-family: 'Arial', sans-serif; }
        main { width: 600px; margin: 0 auto; border: 1px solid lightgray; padding: 20px; }
        div, a, p, span, li { font-size: 15px; line-height: 24px; }
        ul { margin-bottom: 20px; }
        li { list-style-type: none; }
        .bold { font-weight: 600; }
        .section { margin-bottom: 18px; }
        @media screen and (max-width: 991px) { main { width: 100%; } }
      </style>
    </head>
    <body>
      <main>
        <p class="bold section">Payment received for travel insurance</p>
        <div class="section">
          <p><span class="bold">Lead traveler:</span> ${leadTraveler || '-'}</p>
          <p><span class="bold">Customer email:</span> ${email || '-'}</p>
          <p><span class="bold">Phone:</span> ${mobile || '-'}</p>
        </div>
        <div class="section">
          <p><span class="bold">Amount:</span> ${currency || ''} ${amount || ''}</p>
          <p><span class="bold">Session ID:</span> ${sessionId || '-'}</p>
          <p><span class="bold">Quote ID:</span> ${quoteId || '-'}</p>
        </div>
        <div class="section">
          <p><span class="bold">Policy ID:</span> ${policyId || '-'}</p>
          <p><span class="bold">Policy Number:</span> ${policyNumber || '-'}</p>
        </div>
        <div class="section">
          <p><span class="bold">Journey type:</span> ${journeyType || '-'}</p>
          <p><span class="bold">Travel dates:</span> ${startDate || '-'} to ${endDate || '-'}</p>
          <p><span class="bold">Region:</span> ${region || '-'}</p>
        </div>
      </main>
    </body>
    </html>
  `;

  await sendEmail({
    email: ADMIN_EMAIL,
    name: 'DT365 Team',
    subject: `Travel insurance payment received by ${leadTraveler || 'customer'}`,
    htmlContent,
  });
};

// ─── Legacy template (preserved for revert) ────────────────────────────────
// To revert: swap the htmlContent assignment below with _legacyTicketHtml(...)
function _legacyTicketHtml({ type, from, to, departureDate, returnDate, leadPassenger, email, number, flightDetails, ticketValidity, ticketDelivery, passengers, message, createdAt }) {
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dummy Ticket Booking - ${leadPassenger}</title>
      <style>
        * { box-sizing: border-box; padding: 0; margin: 0; }
        body { font-family: 'Arial', sans-serif; }
        main { width: 600px; margin: 0 auto; border: 1px solid lightgray; padding: 20px }
        div, a, p, span, li { font-size: 15px; line-height: 24px; }
        a { color: black; text-decoration: none; display: block; }
        p { margin-bottom: 20px; }
        p.large { font-size: 20px }
        p.message { background-color: rgb(230, 230, 230); padding: 15px; border-radius: 10px; }
        p.danger { background-color: #880808; color: white; margin-bottom: 15px; }
        ul { margin-bottom: 30px; }
        li { list-style-type: none; }
        .bold { font-weight: 600; }
        @media screen and (max-width: 991px) { main { width: 100% } }
      </style>
    </head>
    <body>
      <main>
        ${!ticketDelivery.immediate ? `<p class="message danger"><strong>Delivery Date:</strong> ${formatDate(ticketDelivery.deliveryDate)}</p>` : ''}
        ${message ? `<p class="message"><strong>Message:</strong> ${message}</p>` : ''}
        <p class="bold large">Trip Details</p>
        <ul>
          <li><span>Type:</span> <span>${type}</span></li>
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
          ${passengers?.map((p) => `<li>${p?.type}: ${p?.title} ${p?.firstName} / ${p?.lastName}</li>`)}
        </ul>
      </main>
    </body>
    </html>`;
}
// ───────────────────────────────────────────────────────────────────────────

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
  const fromCode = extractIataCode(from) || from || '';
  const toCode   = extractIataCode(to)   || to   || '';

  const depFlight = [
    flightDetails?.departureFlight?.segments?.[0]?.carrierCode,
    flightDetails?.departureFlight?.segments?.[0]?.flightNumber,
  ].filter(Boolean).join(' ') || '—';

  const retFlight = type === 'Return'
    ? [
        flightDetails?.returnFlight?.segments?.[0]?.carrierCode,
        flightDetails?.returnFlight?.segments?.[0]?.flightNumber,
      ].filter(Boolean).join(' ') || '—'
    : null;

  const depDDMMM = departureDate ? formatToDDMMM(departureDate) : '';
  const retDDMMM = returnDate    ? formatToDDMMM(returnDate)    : '';
  const depFull  = departureDate ? formatToDDMMMYYYY(departureDate) : '';
  const retFull  = returnDate    ? formatToDDMMMYYYY(returnDate)    : '';

  const paxType = (t = '') => {
    const s = t.toLowerCase();
    if (s.includes('child'))  return 'Child';
    if (s.includes('infant')) return 'Infant';
    return 'Adult';
  };

  const row = (label, value, i) => `
    <tr>
      <td style="padding:9px 14px;font-size:12px;font-weight:400;color:#94a3b8;width:140px;background:#f8fafc;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${label}</td>
      <td style="padding:9px 14px;font-size:13px;font-weight:400;color:#0f172a;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${value || '—'}</td>
    </tr>`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px 0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

<table width="600" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">

  <!-- HEADER -->
  <tr>
    <td style="background:#123a6a;padding:20px 24px;border-radius:10px 10px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <div style="font-size:10px;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">New Dummy Ticket Order</div>
            <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:4px;">${leadPassenger}</div>
            <div style="font-size:13px;color:#94a3b8;">${fromCode} &rarr; ${toCode} &nbsp;&middot;&nbsp; ${passengers?.length || 0} PAX &nbsp;&middot;&nbsp; ${type} &nbsp;&middot;&nbsp; ${ticketValidity}</div>
          </td>
          <td style="text-align:right;vertical-align:top;">
            ${ticketDelivery?.immediate
              ? `<div style="background:#1e60a6;color:#fff;font-size:10px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:1px;display:inline-block;">IMMEDIATE</div>`
              : `<div style="background:#dc2626;color:#fff;font-size:10px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:1px;display:inline-block;">DELIVER ${formatDate(ticketDelivery?.deliveryDate)}</div>`}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">

      ${message ? `
      <!-- Customer note -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
            <div style="font-size:10px;font-weight:700;color:#92400e;letter-spacing:1px;margin-bottom:4px;">CUSTOMER NOTE</div>
            <div style="font-size:13px;color:#78350f;">${message}</div>
          </td>
        </tr>
      </table>` : ''}

      <!-- ITINERARY -->
      <div style="font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">Itinerary</div>

      <!-- Departure -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;">
        <tr>
          <td style="padding:10px 16px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;width:70px;">DEPARTURE</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:400;color:#0f172a;">${depFull}</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:400;color:#174b85;">${fromCode} &rarr; ${toCode}</td>
          <td style="padding:10px 16px;font-size:13px;font-weight:400;color:#475569;text-align:right;">${depFlight}</td>
        </tr>
      </table>

      ${type === 'Return' ? `
      <!-- Return -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;">
        <tr>
          <td style="padding:10px 16px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;width:70px;">RETURN</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:400;color:#0f172a;">${retFull}</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:400;color:#174b85;">${toCode} &rarr; ${fromCode}</td>
          <td style="padding:10px 16px;font-size:13px;font-weight:400;color:#475569;text-align:right;">${retFlight}</td>
        </tr>
      </table>` : ''}


      <!-- PASSENGER MANIFEST -->
      <div style="font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">Passenger Manifest</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f8fafc;">
          <td style="padding:8px 14px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;border-bottom:1px solid #e2e8f0;width:32px;">#</td>
          <td style="padding:8px 14px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;border-bottom:1px solid #e2e8f0;width:50px;">TYPE</td>
          <td style="padding:8px 14px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">NAME</td>
        </tr>
        ${passengers?.map((p, i) => `
        <tr>
          <td style="padding:10px 14px;font-size:13px;font-weight:400;color:#94a3b8;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${i + 1}</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:400;color:#1e60a6;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${paxType(p.type)}</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:400;color:#0f172a;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${(p.title || '').toUpperCase()} ${(p.firstName || '').toUpperCase()} / ${(p.lastName || '').toUpperCase()}</td>
        </tr>`).join('')}
      </table>

      <!-- BOOKING DETAILS -->
      <div style="font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">Booking Details</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        ${[
          ['Email',        email],
          ['Phone',        number],
          ['Booking Date', `${formatDate(createdAt)} ${formatDubaiTime(createdAt)}`],
          ['Validity',     ticketValidity],
          ['Delivery',     ticketDelivery?.immediate ? 'Immediate' : formatDate(ticketDelivery?.deliveryDate)],
        ].map(([label, value], i) => row(label, value, i)).join('')}
      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

  await sendEmail({
    email: 'info@dummyticket365.com',
    name: 'Payments - Dummy Ticket 365',
    subject: `Payment received — ${leadPassenger} · ${fromCode} → ${toCode} · ${depDDMMM}`,
    htmlContent,
  });
};

exports.ticketScheduledDeliveryEmail = async ({
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
  const fromCode = extractIataCode(from) || from || '';
  const toCode   = extractIataCode(to)   || to   || '';

  const depFlight = [
    flightDetails?.departureFlight?.segments?.[0]?.carrierCode,
    flightDetails?.departureFlight?.segments?.[0]?.flightNumber,
  ].filter(Boolean).join(' ') || '—';

  const retFlight = type === 'Return'
    ? [
        flightDetails?.returnFlight?.segments?.[0]?.carrierCode,
        flightDetails?.returnFlight?.segments?.[0]?.flightNumber,
      ].filter(Boolean).join(' ') || '—'
    : null;

  const depDDMMM = departureDate ? formatToDDMMM(departureDate) : '';
  const depFull  = departureDate ? formatToDDMMMYYYY(departureDate) : '';
  const retFull  = returnDate    ? formatToDDMMMYYYY(returnDate)    : '';

  const paxType = (t = '') => {
    const s = t.toLowerCase();
    if (s.includes('child'))  return 'Child';
    if (s.includes('infant')) return 'Infant';
    return 'Adult';
  };

  const row = (label, value, i) => `
    <tr>
      <td style="padding:9px 14px;font-size:12px;font-weight:400;color:#94a3b8;width:140px;background:#f8fafc;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${label}</td>
      <td style="padding:9px 14px;font-size:13px;font-weight:400;color:#0f172a;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${value || '—'}</td>
    </tr>`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:24px 0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">

<table width="600" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">

  <!-- ACTION REQUIRED BANNER -->
  <tr>
    <td style="background:#dc2626;padding:14px 24px;border-radius:10px 10px 0 0;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:#fecaca;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Action Required</div>
      <div style="font-size:18px;font-weight:700;color:#ffffff;">Delivery Date Is Today — Please Issue This Ticket Now</div>
    </td>
  </tr>

  <!-- HEADER -->
  <tr>
    <td style="background:#123a6a;padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <div style="font-size:10px;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Scheduled Delivery — Dummy Ticket Order</div>
            <div style="font-size:20px;font-weight:700;color:#ffffff;margin-bottom:4px;">${leadPassenger}</div>
            <div style="font-size:13px;color:#94a3b8;">${fromCode} &rarr; ${toCode} &nbsp;&middot;&nbsp; ${passengers?.length || 0} PAX &nbsp;&middot;&nbsp; ${type} &nbsp;&middot;&nbsp; ${ticketValidity}</div>
          </td>
          <td style="text-align:right;vertical-align:top;">
            <div style="background:#dc2626;color:#fff;font-size:10px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:1px;display:inline-block;">DELIVER TODAY</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="background:#ffffff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">

      ${message ? `
      <!-- Customer note -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
        <tr>
          <td style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;">
            <div style="font-size:10px;font-weight:700;color:#92400e;letter-spacing:1px;margin-bottom:4px;">CUSTOMER NOTE</div>
            <div style="font-size:13px;color:#78350f;">${message}</div>
          </td>
        </tr>
      </table>` : ''}

      <!-- ITINERARY -->
      <div style="font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">Itinerary</div>

      <!-- Departure -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;">
        <tr>
          <td style="padding:10px 16px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;width:70px;">DEPARTURE</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:400;color:#0f172a;">${depFull}</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:400;color:#174b85;">${fromCode} &rarr; ${toCode}</td>
          <td style="padding:10px 16px;font-size:13px;font-weight:400;color:#475569;text-align:right;">${depFlight}</td>
        </tr>
      </table>

      ${type === 'Return' ? `
      <!-- Return -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;">
        <tr>
          <td style="padding:10px 16px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;width:70px;">RETURN</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:400;color:#0f172a;">${retFull}</td>
          <td style="padding:10px 8px;font-size:13px;font-weight:400;color:#174b85;">${toCode} &rarr; ${fromCode}</td>
          <td style="padding:10px 16px;font-size:13px;font-weight:400;color:#475569;text-align:right;">${retFlight}</td>
        </tr>
      </table>` : ''}

      <!-- PASSENGER MANIFEST -->
      <div style="font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;margin-top:20px;">Passenger Manifest</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f8fafc;">
          <td style="padding:8px 14px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;border-bottom:1px solid #e2e8f0;width:32px;">#</td>
          <td style="padding:8px 14px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;border-bottom:1px solid #e2e8f0;width:50px;">TYPE</td>
          <td style="padding:8px 14px;font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1px;border-bottom:1px solid #e2e8f0;">NAME</td>
        </tr>
        ${passengers?.map((p, i) => `
        <tr>
          <td style="padding:10px 14px;font-size:13px;font-weight:400;color:#94a3b8;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${i + 1}</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:400;color:#1e60a6;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${paxType(p.type)}</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:400;color:#0f172a;${i > 0 ? 'border-top:1px solid #e2e8f0;' : ''}">${(p.title || '').toUpperCase()} ${(p.firstName || '').toUpperCase()} / ${(p.lastName || '').toUpperCase()}</td>
        </tr>`).join('')}
      </table>

      <!-- BOOKING DETAILS -->
      <div style="font-size:10px;font-weight:400;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">Booking Details</div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        ${[
          ['Email',        email],
          ['Phone',        number],
          ['Booking Date', `${formatDate(createdAt)} ${formatDubaiTime(createdAt)}`],
          ['Validity',     ticketValidity],
          ['Delivery',     formatDate(ticketDelivery?.deliveryDate)],
        ].map(([label, value], i) => row(label, value, i)).join('')}
      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

  await sendEmail({
    email: ADMIN_EMAIL,
    name: 'Deliveries - Dummy Ticket 365',
    subject: `ACTION REQUIRED — Deliver today · ${leadPassenger} · ${fromCode} → ${toCode} · ${depDDMMM}`,
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
