const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  certificateId: { 
    type: String, 
    unique: true, 
    default: () => 'CERT-JAN-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900) 
  },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  projectTitle: { type: String, required: true },
  recipientName: { type: String, required: true },
  recipientEmail: String,
  recipientRole: { type: String, default: 'Innovator' },
  university: { type: String, default: 'IIT Delhi' },
  issueDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Issued' },
  downloadUrl: String
}, { timestamps: true });

module.exports = mongoose.models.Certificate || mongoose.model('Certificate', certificateSchema);
