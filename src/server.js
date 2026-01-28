process.env.DOTENV_CONFIG_QUIET = 'true';
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./utils/db');

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err);
  process.exit(1);
});

const startServer = async () => {
  try {
    await connectDB('api');

    const server = app.listen(process.env.PORT || 3001, '0.0.0.0', () => {
      console.log(
        `Server running on port ${process.env.PORT || 3001} (${process.env.NODE_ENV})`
      );
    });

    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! Shutting down...');
      console.error(err);
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(1);
      });
    });
  } catch (err) {
    console.error('Startup error:', err.message);
    process.exit(1);
  }
};

startServer();
