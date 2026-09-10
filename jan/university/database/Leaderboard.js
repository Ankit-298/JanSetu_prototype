const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  rank: Number,
  name: String,
  pts: String,
  initials: String
}, { timestamps: true });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
