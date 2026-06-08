// models/Notification.js — in-app notifications stored in MongoDB
const mongoose = require('mongoose');

const notifSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['new_message', 'admin_reply', 'new_order', 'order_status'],
      required: true
    },
    forEmail: { type: String, required: true, lowercase: true },
    seen:     { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notifSchema);
