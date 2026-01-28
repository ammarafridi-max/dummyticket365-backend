const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name for the user'],
      trim: true,
      maxlength: 100,
    },

    username: {
      type: String,
      lowercase: true,
      unique: true,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [8, 'Username must be at least 8 characters long'],
      maxlength: 50,
      index: true,
    },

    email: {
      type: String,
      lowercase: true,
      unique: true,
      required: [true, 'Email is required'],
      trim: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
      index: true,
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false,
    },

    role: {
      type: String,
      lowercase: true,
      enum: ['admin', 'agent', 'blog-manager'],
      default: 'agent',
      required: true,
    },

    status: {
      type: String,
      uppercase: true,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);
