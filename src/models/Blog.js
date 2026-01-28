const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A blog post must have a title'],
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: [true, 'A blog post must have a slug'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'A blog post must have content'],
    },
    excerpt: {
      type: String,
      trim: true,
    },
    coverImageUrl: {
      type: String,
      required: [true, 'A blog post must have a cover image'],
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
      index: true,
    },
    author: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    publisher: { type: mongoose.Schema.ObjectId, ref: 'User', default: null },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    metaTitle: {
      type: String,
    },
    metaDescription: {
      type: String,
      maxlength: 160,
    },
    readingTime: {
      type: Number,
      min: 0,
    },
    publishedAt: {
      type: Date,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

blogSchema.index({ createdAt: -1 });

blogSchema.pre('save', function (next) {
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  if (this.status === 'draft') {
    this.publishedAt = null;
  }

  next();
});

module.exports = mongoose.model('Blog', blogSchema);
