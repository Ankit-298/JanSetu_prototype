const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  uniqueId: String,
  facultyId: String,
  name: String,
  initials: String,
  email: String,
  role: String,
  department: String,
  institution: String,
  location: String,
  bio: String,
  avatarUrl: String,
  phone: String,
  preferences: mongoose.Schema.Types.Mixed,
  skills: [String],
  contributions: [{
    title: String,
    role: String,
    status: String,
    date: String,
    color: String
  }],
  stats: {
    totalProblems: Number,
    studentTeams: Number,
    projectsInProgress: Number,
    projectsDeployed: Number,
    needAttention: Number,
    projectsGuided: Number,
    activeMentorships: Number,
    teamsSupported: Number,
    impactScore: Number
  },
  badges: [{
    name: String,
    icon: String,
    color: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('UniversityProfile', userSchema);
