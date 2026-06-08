// routes/auth.js — POST /api/auth/signup, /api/auth/login
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'owner@gmail.com').toLowerCase();

// ── POST /api/auth/signup ─────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists)
      return res.status(409).json({ error: 'This email already has an account.' });

    const hash = await bcrypt.hash(password, 12);
    const role = email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
    await User.create({ email: email.toLowerCase(), password: hash, role });

    res.status(201).json({ message: 'Account created. You can now log in!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user)
      return res.status(401).json({ error: 'Invalid email or password — create an account first.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password — create an account first.' });

    const role  = user.email === ADMIN_EMAIL ? 'admin' : 'user';
    const token = jwt.sign({ id: user._id, email: user.email, role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { email: user.email, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

module.exports = router;
