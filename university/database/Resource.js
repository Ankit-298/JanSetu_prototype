const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: String,
  type: String,
  discipline: String,
  format: String,
  size: String,
  source: String,
  description: String,
  downloads: { type: Number, default: 0 },
  date: String,
  linkedProblems: [String],
  rating: Number,
  ratingCount: Number,
  fileUrl: String,
  bookmarkedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isBattleTested: Boolean
}, { timestamps: true });

module.exports = mongoose.model('Resource', resourceSchema);
