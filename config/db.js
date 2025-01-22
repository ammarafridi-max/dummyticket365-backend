const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to DB successfully');
  } catch (error) {
    console.error(`Error connecting to DB: ${error}`);
    process.exit(1);
  }
};

module.exports = connectDB;
