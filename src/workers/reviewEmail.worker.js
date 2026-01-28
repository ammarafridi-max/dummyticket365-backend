process.env.DOTENV_CONFIG_QUIET = 'true';
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

const connectDB = require('../utils/db');
const { Worker } = require('bullmq');
const redis = require('../utils/redis');
const sendEmail = require('../utils/email');
const InsuranceApplication = require('../models/InsuranceApplication');

console.log('👷 Review email worker process started');

const worker = new Worker(
  'review-email',
  async (job) => {
    console.log('👷 Processing job:', job.id);

    await connectDB('worker');
    
    const { email, name, sessionId } = job.data;

    const application = await InsuranceApplication.findOne({ sessionId });

    if (!application) {
      throw new Error('Insurance application not found');
    }

    if (application.reviewEmailSent) return;

    await sendEmail({
      to: email,
      subject: 'How was your travel insurance experience?',
      html: `
        <p>Hi ${name},</p>
        <p>Thanks for purchasing your travel insurance.</p>
        <p>Was everything smooth?</p>
        <a href="https://mydummyticket.ae/review?sessionId=${sessionId}">
          Leave a quick review
        </a>
      `,
    });

    application.reviewEmailSent = true;
    await application.save();
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

worker.on('completed', (job) => {
  console.log(`✅ Job completed: ${job.id}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job failed: ${job?.id}`, err);
});
