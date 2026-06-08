// routes/books.js — GET/POST/PUT/DELETE /api/books
const router = require('express').Router();
const Book   = require('../models/Book');
const Rating = require('../models/Rating');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// ── GET /api/books — public: get all books with computed ratings ──
router.get('/', async (req, res) => {
  try {
    const books = await Book.find().lean();

    // Attach computed rating info for each book
    const bookIds = books.map(b => b._id);
    const ratings = await Rating.find({ bookId: { $in: bookIds } }).lean();

    // Group ratings by bookId
    const byBook = {};
    ratings.forEach(r => {
      const key = r.bookId.toString();
      if (!byBook[key]) byBook[key] = [];
      byBook[key].push(r.stars);
    });

    const enriched = books.map(b => {
      const key    = b._id.toString();
      const votes  = byBook[key] || [];
      const count  = votes.length;
      const avg    = count > 0 ? votes.reduce((s, v) => s + v, 0) / count : 0;
      return { ...b, id: key, _ratingCount: count, _ratingAvg: avg };
    });

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load books.' });
  }
});

// ── GET /api/books/:id — public ────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    res.json({ ...book, id: book._id.toString() });
  } catch {
    res.status(404).json({ error: 'Book not found.' });
  }
});

// ── POST /api/books — admin only ───────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, author, year, genre, tags, cover, description, price, stock, available } = req.body;
    if (!title || !author || !year || !genre || price == null || stock == null)
      return res.status(400).json({ error: 'Missing required fields.' });

    const book = await Book.create({
      title, author, year: Number(year), genre,
      tags: tags || [],
      cover: cover || 'linear-gradient(135deg,#5b72f2,#9e6bff)',
      description: description || '',
      price: Number(price),
      stock: Number(stock),
      available: available !== false
    });
    res.status(201).json({ ...book.toObject(), id: book._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create book.' });
  }
});

// ── PUT /api/books/:id — admin only ───────────────────────────
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, author, year, genre, tags, cover, description, price, stock, available, favorite } = req.body;
    const book = await Book.findByIdAndUpdate(
      req.params.id,
      { title, author, year: Number(year), genre, tags, cover, description,
        price: Number(price), stock: Number(stock), available, favorite },
      { new: true, runValidators: true }
    ).lean();
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    res.json({ ...book, id: book._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update book.' });
  }
});

// ── PATCH /api/books/:id/favorite — any logged-in user ────────
router.patch('/:id/favorite', requireAuth, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    book.favorite = !book.favorite;
    await book.save();
    res.json({ favorite: book.favorite });
  } catch {
    res.status(500).json({ error: 'Failed to toggle favorite.' });
  }
});

// ── DELETE /api/books/:id — admin only ────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found.' });
    res.json({ message: 'Book deleted.' });
  } catch {
    res.status(500).json({ error: 'Failed to delete book.' });
  }
});

// ── POST /api/books/:id/rate — logged-in user only ─────────────
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { stars } = req.body;
    if (!stars || stars < 1 || stars > 5)
      return res.status(400).json({ error: 'Stars must be 1–5.' });

    await Rating.findOneAndUpdate(
      { bookId: req.params.id, userEmail: req.user.email },
      { stars: Number(stars) },
      { upsert: true, new: true }
    );

    // Recompute average and save on book
    const ratings = await Rating.find({ bookId: req.params.id }).lean();
    const avg = ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
    await Book.findByIdAndUpdate(req.params.id, { rating: Math.round(avg * 10) / 10 });

    res.json({ average: avg, count: ratings.length, userRating: Number(stars) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit rating.' });
  }
});

// ── GET /api/books/:id/rating — public (user rating requires auth) ─
router.get('/:id/rating', requireAuth, async (req, res) => {
  try {
    const ratings = await Rating.find({ bookId: req.params.id }).lean();
    const count   = ratings.length;
    const avg     = count > 0 ? ratings.reduce((s, r) => s + r.stars, 0) / count : 0;
    const mine    = ratings.find(r => r.userEmail === req.user.email);
    res.json({ average: avg, count, userRating: mine ? mine.stars : 0 });
  } catch {
    res.status(500).json({ error: 'Failed to get rating.' });
  }
});

module.exports = router;
