const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  createdAt: { type: String, required: true }
});

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'pending' },
  type: { type: String, enum: ['seo', 'website'], default: 'seo' },
  date: { type: String },
  readBy: { type: [String], default: [] },
  comments: { type: [commentSchema], default: [] }
});

module.exports = mongoose.model('Task', taskSchema);
