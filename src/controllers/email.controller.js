const DummyTicket = require('../models/DummyTicket');
const nodemailer = require('nodemailer');
const catchAsync = require('../utils/catchAsync');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_PASSWORD,
  },
});

exports.sendEmail = catchAsync(async (req, res, next) => {
  const { subject, body, email } = req.body;
  const file = req.file; // uploaded PDF

  if (!file) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'No PDF file attached' });
  }

  await transporter.sendMail({
    from: process.env.SENDER_EMAIL,
    to: email,
    subject,
    text: body,
    attachments: [
      {
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      },
    ],
  });

  res
    .status(200)
    .json({ status: 'success', message: 'Email sent with attachment' });
});
