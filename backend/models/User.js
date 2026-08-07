const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'client'], default: 'client' }
});

module.exports = mongoose.model('User', userSchema);
