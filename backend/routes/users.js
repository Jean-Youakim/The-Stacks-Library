// routes/users.js — /api/users (profile management)
const router = require('express').Router();
const User   = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// ── GET /api/users/profile — current user's profile ───────────
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

// ── PUT /api/users/profile — save checkout profile ────────────
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, location, phone } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profile: { name: name || '', location: location || '', phone: phone || '' } },
      { new: true }
    ).select('-password').lean();
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to save profile.' });
  }
});

module.exports = router;
