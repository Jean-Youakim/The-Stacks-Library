// models/Order.js — purchase orders stored in MongoDB
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    title:  { type: String },
    qty:    { type: Number, min: 1 },
    price:  { type: Number, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true, lowercase: true },
    customer: {
      name:     { type: String, required: true },
      location: { type: String, required: true },
      phone:    { type: String, required: true }
    },
    items:     [orderItemSchema],
    total:     { type: Number, required: true },
    status: {
      type: String,
      enum: ['Order Placed', 'Being Prepared', 'Shipped'],
      default: 'Order Placed'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
