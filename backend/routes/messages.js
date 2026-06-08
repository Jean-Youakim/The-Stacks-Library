// routes/messages.js — /api/messages
const router       = require('express').Router();
const Conversation = require('../models/Message');
const Notification = require('../models/Notification');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'owner@gmail.com').toLowerCase();

// ── GET /api/messages/mine — user's own thread ────────────────
router.get('/mine', requireAuth, async (req, res) => {
  try {
    let convo = await Conversation.findOne({ userEmail: req.user.email }).lean();
    if (!convo) convo = { userEmail: req.user.email, messages: [] };
    res.json(convo);
  } catch {
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

// ── POST /api/messages — user sends a message ─────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim())
      return res.status(400).json({ error: 'Message cannot be empty.' });

    let convo = await Conversation.findOne({ userEmail: req.user.email });
    if (!convo) convo = new Conversation({ userEmail: req.user.email, messages: [] });

    convo.messages.push({ from: req.user.email, text: text.trim(), timestamp: new Date() });
    await convo.save();

    // Notify admin
    await Notification.create({ type: 'new_message', forEmail: ADMIN_EMAIL });

    res.json({ message: 'Message sent.' });
  } catch {
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// ── GET /api/messages/all — admin: all conversations ──────────
router.get('/all', requireAuth, requireAdmin, async (req, res) => {
  try {
    const convos = await Conversation.find().sort({ updatedAt: -1 }).lean();
    res.json(convos);
  } catch {
    res.status(500).json({ error: 'Failed to load conversations.' });
  }
});

// ── POST /api/messages/:userEmail/reply — admin reply ─────────
router.post('/:userEmail/reply', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    const userEmail = req.params.userEmail.toLowerCase();
    if (!text || !text.trim())
      return res.status(400).json({ error: 'Reply cannot be empty.' });

    let convo = await Conversation.findOne({ userEmail });
    if (!convo) convo = new Conversation({ userEmail, messages: [] });

    convo.messages.push({ from: 'admin', text: text.trim(), timestamp: new Date() });
    await convo.save();

    // Notify user of reply
    await Notification.create({ type: 'admin_reply', forEmail: userEmail });

    res.json({ message: 'Reply sent.' });
  } catch {
    res.status(500).json({ error: 'Failed to send reply.' });
  }
});

module.exports = router;
