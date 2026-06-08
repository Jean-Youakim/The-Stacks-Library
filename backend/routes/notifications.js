// routes/notifications.js — /api/notifications
const router       = require('express').Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/notifications — unseen counts for current user ───
router.get('/', requireAuth, async (req, res) => {
  try {
    const email = req.user.email;
    const isAdmin = req.user.role === 'admin';

    const types = isAdmin
      ? ['new_message', 'new_order']
      : ['admin_reply', 'order_status'];

    const all = await Notification.find({ forEmail: email, type: { $in: types }, seen: false }).lean();

    // Build counts by type
    const counts = {};
    types.forEach(t => { counts[t] = 0; });
    all.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1; });
    const total = Object.values(counts).reduce((s, v) => s + v, 0);

    res.json({ total, counts });
  } catch {
    res.status(500).json({ error: 'Failed to load notifications.' });
  }
});

// ── PATCH /api/notifications/mark-seen — mark types as seen ───
router.patch('/mark-seen', requireAuth, async (req, res) => {
  try {
    const { types } = req.body; // array of type strings
    if (!types || !types.length)
      return res.status(400).json({ error: 'types array is required.' });

    await Notification.updateMany(
      { forEmail: req.user.email, type: { $in: types }, seen: false },
      { seen: true }
    );
    res.json({ message: 'Marked as seen.' });
  } catch {
    res.status(500).json({ error: 'Failed to mark notifications.' });
  }
});

module.exports = router;
