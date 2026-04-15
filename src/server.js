process.env.DOTENV_CONFIG_QUIET = 'true';
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./utils/db');
const { publishDueScheduledBlogs } = require('./services/blog.service');
const { sendDueDeliveryEmails } = require('./services/ticket.service');
const logger = require('./utils/logger');
const config = require('./utils/config');

let server;
let scheduler;
let deliveryScheduler;
let shuttingDown = false;

const stopScheduler = () => {
  if (scheduler) {
    clearInterval(scheduler);
    scheduler = null;
  }
  if (deliveryScheduler) {
    clearInterval(deliveryScheduler);
    deliveryScheduler = null;
  }
};

const shutdown = async (reason, error, exitCode = 1) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopScheduler();

  logger.error('Server shutdown initiated', { reason, error });

  const closeConnection = async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  };

  if (!server) {
    await closeConnection();
    process.exit(exitCode);
    return;
  }

  server.close(async () => {
    await closeConnection();
    process.exit(exitCode);
  });
};

process.on('uncaughtException', (err) => {
  shutdown('uncaughtException', err);
});

const startServer = async () => {
  try {
    await connectDB('api');
    await publishDueScheduledBlogs();
    await sendDueDeliveryEmails();

    scheduler = setInterval(() => {
      publishDueScheduledBlogs().catch((err) => {
        logger.error('Scheduled blog publisher failed', { error: err });
      });
    }, config.blogSchedulerIntervalMs);

    deliveryScheduler = setInterval(() => {
      sendDueDeliveryEmails().catch((err) => {
        logger.error('Scheduled delivery email job failed', { error: err });
      });
    }, 60 * 1000);

    server = app.listen(config.port, '0.0.0.0', () => {
      logger.info('Server started', { port: config.port, env: config.nodeEnv });
    });
  } catch (err) {
    await shutdown('startupError', err);
  }
};

process.on('unhandledRejection', (err) => {
  shutdown('unhandledRejection', err);
});

process.on('SIGTERM', () => {
  shutdown('sigterm', null, 0);
});

process.on('SIGINT', () => {
  shutdown('sigint', null, 0);
});

startServer();
