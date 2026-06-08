// routes/orders.js — /api/orders
const router = require('express').Router();
const Order  = require('../models/Order');
const Book   = require('../models/Book');
const Notification = require('../models/Notification');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'owner@gmail.com').toLowerCase();

// ── POST /api/orders — place a new order (user only) ──────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { customer, items } = req.body;
    if (!customer?.name || !customer?.location || !customer?.phone)
      return res.status(400).json({ error: 'Customer name, location, and phone are required.' });
    if (!items || items.length === 0)
      return res.status(400).json({ error: 'Cart is empty.' });

    // Validate stock and build order items
    const orderItems = [];
    let total = 0;
    for (const item of items) {
      const book = await Book.findById(item.bookId);
      if (!book) return res.status(404).json({ error: `Book not found: ${item.bookId}` });
      if (book.stock < item.qty)
        return res.status(400).json({ error: `"${book.title}" — only ${book.stock} in stock.` });
      orderItems.push({ bookId: book._id, title: book.title, qty: item.qty, price: book.price });
      total += book.price * item.qty;
    }

    const order = await Order.create({
      userEmail: req.user.email,
      customer,
      items: orderItems,
      total: Math.round(total * 100) / 100,
      status: 'Order Placed'
    });

    // Decrement stock
    for (const item of items) {
      const book = await Book.findById(item.bookId);
      book.stock = Math.max(0, book.stock - item.qty);
      if (book.stock === 0) book.available = false;
      await book.save();
    }

    // Notify admin
    await Notification.create({ type: 'new_order', forEmail: ADMIN_EMAIL });

    res.status(201).json({ message: '🧾 Order placed!', orderId: order._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to place order.' });
  }
});

// ── GET /api/orders/mine — user's own orders ──────────────────
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const orders = await Order.find({ userEmail: req.user.email }).sort({ createdAt: -1 }).lean();
    res.json(orders.map(o => ({ ...o, id: o._id.toString() })));
  } catch {
    res.status(500).json({ error: 'Failed to load orders.' });
  }
});

// ── GET /api/orders — admin: all pending orders ───────────────
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: { $ne: 'Shipped' } }).sort({ createdAt: -1 }).lean();
    res.json(orders.map(o => ({ ...o, id: o._id.toString() })));
  } catch {
    res.status(500).json({ error: 'Failed to load orders.' });
  }
});

// ── PATCH /api/orders/:id/status — admin only ─────────────────
router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Order Placed', 'Being Prepared', 'Shipped'];
    if (!allowed.includes(status))
      return res.status(400).json({ error: 'Invalid status value.' });

    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Notify the customer
    await Notification.create({ type: 'order_status', forEmail: order.userEmail });

    res.json({ message: 'Status updated.', order: { ...order, id: order._id.toString() } });
  } catch {
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

module.exports = router;
