// models/Rating.js — per-user book ratings stored in MongoDB
const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    bookId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    userEmail: { type: String, required: true, lowercase: true },
    stars:     { type: Number, required: true, min: 1, max: 5 }
  },
  { timestamps: true }
);

// Compound unique index: one rating per user per book
ratingSchema.index({ bookId: 1, userEmail: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
