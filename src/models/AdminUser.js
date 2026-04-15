const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const USERNAME_REGEX = /^[a-z0-9][a-z0-9._-]{7,49}$/;

const adminUserSchema = new mongoose.Schema(
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
      match: [USERNAME_REGEX, 'Username must use lowercase letters, numbers, dots, underscores, or hyphens'],
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
    toJSON: true,
    collection: 'admin-users',
  },
);

adminUserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

adminUserSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
  return bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
