// models/User.js — accounts stored in MongoDB
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // bcrypt hash
    role:     { type: String, enum: ['user', 'admin'], default: 'user' },
    profile: {
      name:     { type: String, default: '' },
      location: { type: String, default: '' },
      phone:    { type: String, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
