const mongoose = require('mongoose');

async function connectDB(context = 'app') {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected (${context})`);
  } catch (err) {
    console.error(`❌ MongoDB connection failed (${context})`, err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
