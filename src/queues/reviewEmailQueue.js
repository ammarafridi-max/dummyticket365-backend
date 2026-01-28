const { Queue } = require('bullmq');
const redis = require('../utils/redis');

const reviewEmailQueue = new Queue('review-email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

module.exports = reviewEmailQueue;
