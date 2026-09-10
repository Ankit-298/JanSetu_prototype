const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  status: { type: String, default: 'Assigned' }, // Matches stage for backwards compatibility
  stage: { 
    type: String, 
    enum: ['Assigned', 'In Progress', 'Prototype', 'Submitted', 'Deployed'], 
    default: 'Assigned' 
  },
  progress: { type: Number, default: 0 }, // 0: Assigned, 1: In Progress, 2: Prototype, 3: Submitted, 4: Deployed
  type: { type: String, default: 'General' },
  loc: String,
  selected: { type: Boolean, default: false },
  team: [String],
  teamSize: { type: Number, default: 4 },
  mentor: {
    name: { type: String, default: 'Dr. Rohan Mehta' },
    org: { type: String, default: 'IIT Delhi' },
    initials: { type: String, default: 'RM' }
  },
  industryMentor: {
    name: String,
    org: String,
    initials: String,
    status: { type: String, enum: ['None', 'Requested', 'Accepted', 'Declined'], default: 'None' },
    requestedAt: Date
  },
  fundingSummary: {
    committed: { type: Number, default: 0 },
    goal: { type: Number, default: 100000 },
    sponsor: String
  },
  milestones: [{
    name: { type: String, required: true },
    title: String,
    fileUrl: String,
    uploadedAt: Date,
    status: { 
      type: String, 
      enum: ['pending', 'pending_review', 'approved', 'needs_revision'], 
      default: 'pending' 
    },
    feedback: String,
    approvedAt: Date,
    approvedBy: String
  }],
  citizenFeedback: [{
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    submittedAt: { type: Date, default: Date.now }
  }],
  description: { type: String, default: 'Engineering innovation developed by student researchers addressing verified civic challenges.' },
  deadlines: [{
    title: String,
    date: String,
    tag: String,
    isLight: Boolean
  }],
  discussion: [{
    sender: String,
    role: String,
    text: String,
    time: String,
    isMentor: Boolean
  }],
  certificatesIssued: { type: Boolean, default: false },
  isBattleTested: { type: Boolean, default: false },
  battleTestedResourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
  forkableFrom: {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    university: String
  },
  imgBg: { type: String, default: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }
}, { timestamps: true });

module.exports = mongoose.models.Project || mongoose.model('Project', projectSchema);
