const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth, requireSuperadmin } = require('../middleware/auth');

// ── GET /api/reviews?destination_id=X ───────────────────────
router.get('/', async (req, res) => {
  try {
    const { destination_id } = req.query;
    let where = ['r.is_approved = 1'];
    let params = [];
    if (destination_id) { where.push('r.destination_id = ?'); params.push(destination_id); }

    const [rows] = await db.query(
      `SELECT r.*, u.fullname AS reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.tourist_id
       WHERE ${where.join(' AND ')}
       ORDER BY r.created_at DESC`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Reviews list error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/reviews ── tourist leaves review ───────────────
router.post('/', requireAuth, async (req, res) => {
  if (req.user.role !== 'tourist' && req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Only tourists can leave reviews' });
  }
  const { destination_id, rating, comment } = req.body;
  if (!destination_id || !rating || !comment) {
    return res.status(400).json({ success: false, message: 'destination_id, rating, and comment are required' });
  }
  const r = parseInt(rating);
  if (r < 1 || r > 5) return res.status(400).json({ success: false, message: 'Rating must be 1–5' });

  try {
    await db.query(
      `INSERT INTO reviews (tourist_id, destination_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment), updated_at=NOW()`,
      [req.user.id, destination_id, r, comment.trim()]
    );
    return res.status(201).json({ success: true, message: 'Review submitted' });
  } catch (err) {
    console.error('Create review error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/reviews/:id ── superadmin moderation ────────
router.delete('/:id', requireSuperadmin, async (req, res) => {
  try {
    await db.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error('Delete review error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
