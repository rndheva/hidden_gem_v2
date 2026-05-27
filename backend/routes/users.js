const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { requireSuperadmin, verifyToken } = require('../middleware/auth');

// ── GET /api/users ── (superadmin: list all users) ──────────
router.get('/', requireSuperadmin, async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = [];
    let params = [];

    if (role)   { where.push('role = ?');   params.push(role); }
    if (status) { where.push('status = ?'); params.push(status); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [users] = await db.query(
      `SELECT id, fullname, email, role, status, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`,
      params
    );

    return res.json({ success: true, data: users, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error('List users error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── PATCH /api/users/:id/status ── (superadmin: approve/reject) ─
router.patch('/:id/status', requireSuperadmin, async (req, res) => {
  const { status } = req.body;
  const { id }     = req.params;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const [rows] = await db.query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (rows[0].role === 'superadmin') {
      return res.status(403).json({ success: false, message: 'Cannot change superadmin status' });
    }

    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return res.json({ success: true, message: `User status updated to ${status}` });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── GET /api/users/pending ── shortcut for superadmin ───────
router.get('/pending', requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, fullname, email, role, created_at
       FROM users WHERE status = 'pending' AND role != 'superadmin'
       ORDER BY created_at ASC`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Pending users error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── DELETE /api/users/:id ── (superadmin) ───────────────────
router.delete('/:id', requireSuperadmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT role FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    if (rows[0].role === 'superadmin') return res.status(403).json({ success: false, message: 'Cannot delete superadmin' });

    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
