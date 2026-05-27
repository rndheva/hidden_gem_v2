const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireSuperadmin, verifyToken } = require('../middleware/auth');

// ── GET /api/destinations ── public list ────────────────────
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*,
              COALESCE(AVG(r.rating), 0)  AS avg_rating,
              COUNT(r.id)                  AS review_count,
              ROUND((d.wtf_instagrammable + d.wtf_access + d.wtf_reviews) / 3.0, 1) AS wtf_score
       FROM destinations d
       LEFT JOIN reviews r ON r.destination_id = d.id AND r.is_approved = 1
       WHERE d.is_active = 1
       GROUP BY d.id
       ORDER BY wtf_score DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Destinations list error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/destinations/:id ── single destination ─────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT d.*,
              COALESCE(AVG(r.rating), 0)  AS avg_rating,
              COUNT(r.id)                  AS review_count,
              ROUND((d.wtf_instagrammable + d.wtf_access + d.wtf_reviews) / 3.0, 1) AS wtf_score
       FROM destinations d
       LEFT JOIN reviews r ON r.destination_id = d.id AND r.is_approved = 1
       WHERE d.id = ? AND d.is_active = 1
       GROUP BY d.id`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Destination not found' });

    // Fetch recent reviews
    const [reviews] = await db.query(
      `SELECT r.*, u.fullname AS reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.tourist_id
       WHERE r.destination_id = ? AND r.is_approved = 1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [req.params.id]
    );

    // Fetch packages
    const [packages] = await db.query(
      `SELECT tp.id, tp.title, tp.price, tp.difficulty, tp.duration, tp.image_url,
              u.fullname AS provider_name
       FROM travel_packages tp
       JOIN users u ON u.id = tp.provider_id
       WHERE tp.destination_id = ? AND tp.status = 'active'
       ORDER BY tp.price ASC`,
      [req.params.id]
    );

    return res.json({ success: true, data: { ...rows[0], reviews, packages } });
  } catch (err) {
    console.error('Destination detail error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/destinations/:id ── superadmin update ──────────
router.put('/:id', requireSuperadmin, async (req, res) => {
  const {
    name, location, province, image_url, description, difficulty,
    duration, culture_info, wtf_instagrammable, wtf_access, wtf_reviews, lat, lng, is_active
  } = req.body;

  try {
    await db.query(
      `UPDATE destinations SET
         name=?, location=?, province=?, image_url=?, description=?, difficulty=?,
         duration=?, culture_info=?, wtf_instagrammable=?, wtf_access=?, wtf_reviews=?,
         lat=?, lng=?, is_active=?
       WHERE id=?`,
      [name, location, province, image_url, description, difficulty,
       duration, culture_info, wtf_instagrammable, wtf_access, wtf_reviews,
       lat, lng, is_active ?? 1, req.params.id]
    );
    return res.json({ success: true, message: 'Destination updated' });
  } catch (err) {
    console.error('Update destination error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
