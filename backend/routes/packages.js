const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const db      = require('../config/db');
const { verifyToken, requireProvider, requireSuperadmin } = require('../middleware/auth');

// Multer storage for package images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../frontend/images/uploads'));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'pkg-' + unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ── GET /api/packages ── public list ────────────────────────
router.get('/', async (req, res) => {
  try {
    const { destination_id, difficulty, page = 1, limit = 12 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where  = ["tp.status = 'active'"];
    let params = [];

    if (destination_id) { where.push('tp.destination_id = ?'); params.push(destination_id); }
    if (difficulty)      { where.push('tp.difficulty = ?');      params.push(difficulty); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    const [rows] = await db.query(
      `SELECT tp.*,
              d.name AS destination_name, d.location AS destination_location,
              u.fullname AS provider_name
       FROM travel_packages tp
       JOIN destinations d ON d.id = tp.destination_id
       JOIN users u ON u.id = tp.provider_id
       ${whereStr}
       ORDER BY tp.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM travel_packages tp ${whereStr}`, params
    );

    return res.json({ success: true, data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error('Packages list error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/packages/my ── provider's own packages ─────────
router.get('/my', requireProvider, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT tp.*, d.name AS destination_name,
              (SELECT COUNT(*) FROM bookings b WHERE b.package_id = tp.id) AS booking_count
       FROM travel_packages tp
       JOIN destinations d ON d.id = tp.destination_id
       WHERE tp.provider_id = ?
       ORDER BY tp.created_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('My packages error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/packages/:id ────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT tp.*,
              d.name AS destination_name, d.location AS destination_location,
              d.image_url AS destination_image,
              u.fullname AS provider_name
       FROM travel_packages tp
       JOIN destinations d ON d.id = tp.destination_id
       JOIN users u ON u.id = tp.provider_id
       WHERE tp.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Package not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Package detail error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── POST /api/packages ── create (provider) ─────────────────
router.post('/', requireProvider, upload.single('image'), async (req, res) => {
  const {
    destination_id, title, description, price, difficulty,
    duration, max_participants, itinerary, includes, excludes, status
  } = req.body;

  if (!destination_id || !title || !description || !price || !itinerary) {
    return res.status(400).json({ success: false, message: 'Required fields missing' });
  }

  try {
    let parsedItinerary = typeof itinerary === 'string' ? JSON.parse(itinerary) : itinerary;
    let parsedIncludes  = includes  ? (typeof includes  === 'string' ? JSON.parse(includes)  : includes)  : [];
    let parsedExcludes  = excludes  ? (typeof excludes  === 'string' ? JSON.parse(excludes)  : excludes)  : [];

    const image_url = req.file ? `/images/uploads/${req.file.filename}` : null;

    const [result] = await db.query(
      `INSERT INTO travel_packages
         (provider_id, destination_id, title, description, price, difficulty,
          duration, max_participants, image_url, itinerary, includes, excludes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, destination_id, title, description, parseFloat(price),
       difficulty || 'Moderate', duration || '', parseInt(max_participants) || 10,
       image_url, JSON.stringify(parsedItinerary), JSON.stringify(parsedIncludes),
       JSON.stringify(parsedExcludes), status || 'active']
    );
    return res.status(201).json({ success: true, message: 'Package created', data: { id: result.insertId } });
  } catch (err) {
    console.error('Create package error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PUT /api/packages/:id ── update (provider owns it) ──────
router.put('/:id', requireProvider, upload.single('image'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT provider_id FROM travel_packages WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Package not found' });
    if (rows[0].provider_id !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'You can only edit your own packages' });
    }

    const {
      destination_id, title, description, price, difficulty,
      duration, max_participants, itinerary, includes, excludes, status
    } = req.body;

    let updates = [];
    let params  = [];

    if (destination_id)  { updates.push('destination_id = ?');  params.push(destination_id); }
    if (title)           { updates.push('title = ?');           params.push(title); }
    if (description)     { updates.push('description = ?');     params.push(description); }
    if (price)           { updates.push('price = ?');           params.push(parseFloat(price)); }
    if (difficulty)      { updates.push('difficulty = ?');      params.push(difficulty); }
    if (duration)        { updates.push('duration = ?');        params.push(duration); }
    if (max_participants){ updates.push('max_participants = ?'); params.push(parseInt(max_participants)); }
    if (itinerary)       { updates.push('itinerary = ?');       params.push(JSON.stringify(typeof itinerary === 'string' ? JSON.parse(itinerary) : itinerary)); }
    if (includes)        { updates.push('includes = ?');        params.push(JSON.stringify(typeof includes  === 'string' ? JSON.parse(includes)  : includes)); }
    if (excludes)        { updates.push('excludes = ?');        params.push(JSON.stringify(typeof excludes  === 'string' ? JSON.parse(excludes)  : excludes)); }
    if (status)          { updates.push('status = ?');          params.push(status); }
    if (req.file)        { updates.push('image_url = ?');       params.push(`/images/uploads/${req.file.filename}`); }

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });

    params.push(req.params.id);
    await db.query(`UPDATE travel_packages SET ${updates.join(', ')} WHERE id = ?`, params);
    return res.json({ success: true, message: 'Package updated' });
  } catch (err) {
    console.error('Update package error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/packages/:id ─────────────────────────────────
router.delete('/:id', requireProvider, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT provider_id FROM travel_packages WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Package not found' });
    if (rows[0].provider_id !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'You can only delete your own packages' });
    }
    await db.query('DELETE FROM travel_packages WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Package deleted' });
  } catch (err) {
    console.error('Delete package error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
