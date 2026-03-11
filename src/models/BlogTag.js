const mongoose = require('mongoose');

const blogTagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tag name is required'],
      trim: true,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: [true, 'Tag slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 400,
      default: '',
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
  },
  { timestamps: true },
);

blogTagSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('BlogTag', blogTagSchema);
