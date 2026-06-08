// models/Message.js — user ↔ admin conversations stored in MongoDB
const mongoose = require('mongoose');

const msgEntrySchema = new mongoose.Schema(
  {
    from:      { type: String, required: true }, // userEmail or 'admin'
    text:      { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, unique: true, lowercase: true },
    messages:  [msgEntrySchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
