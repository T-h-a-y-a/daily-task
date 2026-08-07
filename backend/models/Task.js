const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, default: '' },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  createdAt: { type: String, required: true },
  fileName: { type: String },
  fileData: { type: String }
});

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'pending' },
  type: { type: String, default: 'seo' },
  category: { type: String, default: 'SEO' },
  project: { type: String, default: '' },
  frequency: { type: String, default: 'weekly' },
  dropboxUrl: { type: String, default: '' },
  dropboxLink: { type: String, default: '' },
  fileUrl: { type: String, default: '' },
  link: { type: String, default: '' },
  url: { type: String, default: '' },
  uploadedBy: { type: String, default: 'Admin' },
  date: { type: String },
  readBy: { type: [String], default: [] },
  comments: { type: [commentSchema], default: [] },
  fileName: { type: String },
  fileData: { type: String },
  files: {
    type: [{
      id: { type: String },
      name: { type: String },
      data: { type: String },
      url: { type: String },
      size: { type: Number },
      uploadedAt: { type: String },
      uploadedBy: { type: String }
    }],
    default: []
  }
}, { strict: false });

module.exports = mongoose.model('Task', taskSchema);
