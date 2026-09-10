const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  project: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  initiative: String,
  category: String,
  location: String,
  projectType: { type: String, default: 'Capstone Project' },
  stage: { type: String, default: 'In Progress' },
  progress: { type: Number, default: 50 },
  courseRecommendation: {
    skill: String,
    title: String,
    provider: String,
    duration: String,
    cost: String,
    hasCertificate: Boolean,
    url: String,
    icon: String
  },
  createdAt: { type: String, default: 'Aug 2026' },
  members: [{
    name: String,
    email: String,
    role: String,
    avatar: String,
    color: String,
    expertise: String,
    status: { type: String, default: 'Active' },
    phone: String,
    joinedDate: String
  }],
  requiredSkills: [{
    name: String,
    status: { type: String, enum: ['present', 'missing'], default: 'present' }
  }]
}, { timestamps: true });

module.exports = mongoose.models.Team || mongoose.model('Team', teamSchema);

