const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./logger');

async function connectDB(context = 'app') {
  if (!config.mongoUri) {
    throw new Error('MONGO_URI is not configured');
  }

  await mongoose.connect(config.mongoUri);

  logger.info('MongoDB connected', {
    context,
    host: mongoose.connection.host,
    database: mongoose.connection.name,
  });

  return mongoose.connection;
}

module.exports = connectDB;
