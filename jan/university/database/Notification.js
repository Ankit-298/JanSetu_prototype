const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  text: String,
  time: String,
  timeGroup: { type: String, default: 'Today' }, // 'Today', 'Yesterday', 'This Week', 'Earlier'
  category: { type: String, default: 'system' }, // 'new-problem-request', 'mentor', 'problem', 'team', 'deadline', 'system'
  iconType: { type: String, default: 'bell' },
  iconColor: { type: String, default: '#3B82F6' },
  iconBg: { type: String, default: '#EFF6FF' },
  dotColor: { type: String, default: '#3B82F6' },
  actionText: { type: String, default: 'View' },
  actionUrl: { type: String, default: '#' },
  unread: { type: Boolean, default: true },
  isMention: { type: Boolean, default: false },
  isHighPriority: { type: Boolean, default: false },
  
  // Stage 0 / 1 Workflow specific fields
  citizenProblemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
  previewSnapshot: {
    title: String,
    category: String,
    location: String,
    description: String,
    priority: String,
    submitterContact: {
      name: String,
      email: String,
      phone: String
    },
    attachments: [{
      filename: String,
      url: String
    }]
  },
  reviewed: { type: Boolean, default: false },
  reviewedAt: Date,
  reviewDecision: { type: String, enum: ['accepted', 'declined', null], default: null }
}, { timestamps: true });

// Prevent overwrite model error in watch mode
module.exports = mongoose.models.UniversityNotification || mongoose.model('UniversityNotification', notificationSchema);
