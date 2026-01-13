process.env.DOTENV_CONFIG_QUIET = 'true';
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

const mongoose = require('mongoose');
const app = require('./app');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB successfully');

    const server = app.listen(process.env.PORT || 3001, '0.0.0.0', () => {
      console.log(
        `Server running on port ${process.env.PORT || 3001} (${process.env.NODE_ENV})`
      );
    });

    process.on('unhandledRejection', (err) => {
      console.log('UNHANDLED REJECTION! 💥 Shutting down...');
      console.log(err);
      server.close(() => {
        mongoose.connection.close();
        process.exit(1);
      });
    });
  } catch (error) {
    console.log(`Error connecting to DB: ${error.message}`);
    process.exit(1);
  }
};

startServer();
