const mongoose = require('mongoose');

const UserSchema = mongoose.Schema({
  name: { type: String },
  username: { type: String, unique: [true, 'Username already in use'] },
  email: { type: String, unique: [true, 'Email already in use'] },
  password: { type: String },
  role: { type: String },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'] },
});

const User = mongoose.model('user', UserSchema);

module.exports = User;
