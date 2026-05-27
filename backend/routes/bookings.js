const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireAuth, requireSuperadmin } = require('../middleware/auth');

// ── GET /api/bookings ── (tourist: own | superadmin: all) ───
router.get('/', requireAuth, async (req, res) => {
  try {
    let query, params;
    if (req.user.role === 'superadmin') {
      query = `
        SELECT b.*, tp.title AS package_title, tp.price AS package_price,
               d.name AS destination_name,
               u.fullname AS tourist_name, u.email AS tourist_email
        FROM bookings b
        JOIN travel_packages tp ON tp.id = b.package_id
        JOIN destinations d ON d.id = tp.destination_id
        JOIN users u ON u.id = b.tourist_id
        ORDER BY b.created_at DESC`;
      params = [];
    } else {
      query = `
        SELECT b.*, tp.title AS package_title, tp.price AS package_price,
               tp.image_url AS package_image, tp.difficulty,
               d.name AS destination_name, d.location AS destination_location
        FROM bookings b
        JOIN travel_packages tp ON tp.id = b.package_id
        JOIN destinations d ON d.id = tp.destination_id
        WHERE b.tourist_id = ?
        ORDER BY b.created_at DESC`;
      params = [req.user.id];
    }
    const [rows] = await db.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Bookings list error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/bookings ── create booking (tourist) ──────────
router.post('/', requireAuth, async (req, res) => {
  const { package_id, booking_date, participants, notes } = req.body;

  if (!package_id || !booking_date || !participants) {
    return res.status(400).json({ success: false, message: 'package_id, booking_date, and participants are required' });
  }

  try {
    // Check package exists and is active
    const [pkgRows] = await db.query(
      `SELECT id, price, max_participants, status FROM travel_packages WHERE id = ?`,
      [package_id]
    );
    if (pkgRows.length === 0 || pkgRows[0].status !== 'active') {
      return res.status(404).json({ success: false, message: 'Package not found or not available' });
    }
    const pkg = pkgRows[0];

    // Check participant count
    const parts = parseInt(participants);
    if (parts < 1 || parts > pkg.max_participants) {
      return res.status(400).json({ success: false, message: `Participants must be between 1 and ${pkg.max_participants}` });
    }

    // Check existing booking count for this date
    const [[{ booked }]] = await db.query(
      `SELECT COALESCE(SUM(participants),0) AS booked
       FROM bookings WHERE package_id = ? AND booking_date = ? AND status != 'cancelled'`,
      [package_id, booking_date]
    );
    if (parseInt(booked) + parts > pkg.max_participants) {
      return res.status(409).json({ success: false, message: 'Not enough slots available for selected date' });
    }

    const total_price = pkg.price * parts;
    const [result] = await db.query(
      `INSERT INTO bookings (tourist_id, package_id, booking_date, participants, total_price, status, notes)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [req.user.id, package_id, booking_date, parts, total_price, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { id: result.insertId, total_price }
    });
  } catch (err) {
    console.error('Create booking error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PATCH /api/bookings/:id/status ── update status ─────────
router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const [rows] = await db.query(
      `SELECT b.*, tp.provider_id FROM bookings b
       JOIN travel_packages tp ON tp.id = b.package_id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });

    const booking = rows[0];
    const isTourist    = req.user.role === 'tourist'    && booking.tourist_id   === req.user.id;
    const isProvider   = req.user.role === 'provider'   && booking.provider_id  === req.user.id;
    const isSuperadmin = req.user.role === 'superadmin';

    if (!isTourist && !isProvider && !isSuperadmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Tourist can only cancel their own pending/confirmed bookings
    if (isTourist && status !== 'cancelled') {
      return res.status(403).json({ success: false, message: 'Tourists can only cancel bookings' });
    }

    await db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    return res.json({ success: true, message: `Booking ${status}` });
  } catch (err) {
    console.error('Update booking error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
