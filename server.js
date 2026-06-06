require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Ensure upload directory exists (Hanya berjalan jika BUKAN di Vercel) ──
if (!process.env.VERCEL) {
  const uploadDir = path.join(__dirname, 'frontend/images/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.APP_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ─────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'frontend')));

// ── API Routes ───────────────────────────────────────────────
app.use('/api/auth',         require('./backend/routes/auth'));
app.use('/api/users',        require('./backend/routes/users'));
app.use('/api/destinations', require('./backend/routes/destinations'));
app.use('/api/packages',     require('./backend/routes/packages'));
app.use('/api/bookings',     require('./backend/routes/bookings'));
app.use('/api/reviews',      require('./backend/routes/reviews'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Hidden Gem Explorer API is running 🌊', timestamp: new Date() });
});

// ── SPA fallback — serve index.html for all non-API routes ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║    🌊   Hidden Gem Explorer  🌿              ║
║  Server running on http://localhost:${PORT}     ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(29)}║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = app;