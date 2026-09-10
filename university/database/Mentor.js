const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema({
  name: String,
  org: String,
  role: String,
  expertise: [String],
  avatar: String,
  rating: Number,
  reviews: Number,
  meetingLink: String
}, { timestamps: true });

module.exports = mongoose.model('Mentor', mentorSchema);
