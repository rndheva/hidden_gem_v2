const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const db       = require('../config/db');

const JWT_SECRET     = process.env.JWT_SECRET     || 'changeme_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ── POST /api/auth/register ─────────────────────────────────
router.post('/register', async (req, res) => {
  const { fullname, email, password, role } = req.body;

  if (!fullname || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const allowedRoles = ['provider', 'tourist'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role. Choose: provider or tourist' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }

  try {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      'INSERT INTO users (fullname, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
      [fullname.trim(), email.trim().toLowerCase(), hashed, role, 'pending']
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please wait for admin approval before logging in.',
      data: { id: result.insertId, fullname, email, role, status: 'pending' }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// ── POST /api/auth/login ────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, fullname, email, password, role, status FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = rows[0];

    if (user.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Your account is pending approval. Please wait for admin review.' });
    }
    if (user.status === 'rejected') {
      return res.status(403).json({ success: false, message: 'Your account has been rejected. Please contact support.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const payload = { id: user.id, fullname: user.fullname, email: user.email, role: user.role };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      success: true,
      message: 'Login successful',
      data: { token, user: payload }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────
router.get('/me', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, fullname, email, role, status, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
