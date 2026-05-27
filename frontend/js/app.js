/* ══════════════════════════════════════════════════════
   Hidden Gem Explorer — Global JS Utilities
   ══════════════════════════════════════════════════════ */

const API_BASE = '/api';

// ── Auth helpers ─────────────────────────────────────────────
const Auth = {
  getToken() { return localStorage.getItem('hge_token'); },
  getUser()  {
    try { return JSON.parse(localStorage.getItem('hge_user') || 'null'); }
    catch { return null; }
  },
  setSession(token, user) {
    localStorage.setItem('hge_token', token);
    localStorage.setItem('hge_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('hge_token');
    localStorage.removeItem('hge_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  isRole(role) { const u = this.getUser(); return u && u.role === role; },
};

// ── API helper ───────────────────────────────────────────────
async function api(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(API_BASE + endpoint, { ...options, headers });
  const data = await res.json().catch(() => ({ success: false, message: 'Parse error' }));

  if (res.status === 401 || res.status === 403) {
    if (endpoint !== '/auth/login') {
      Auth.clear();
      window.location.href = '/pages/login.html';
    }
  }
  return { ok: res.ok, status: res.status, ...data };
}

// ── Nav init ─────────────────────────────────────────────────
function initNav() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const navUserArea = document.querySelector('#navUserArea');

  // Scroll behaviour
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    });
  }

  // Hamburger toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  }

  // User area
  if (navUserArea) {
    const user = Auth.getUser();
    if (user) {
      navUserArea.innerHTML = `
        <div class="nav-user" id="navUserBtn">
          <span>👤</span>
          <span>${user.fullname.split(' ')[0]}</span>
          <span style="opacity:.5">▾</span>
        </div>
        <div id="navDropdown" style="position:absolute;right:0;top:calc(100% + 8px);background:white;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.15);min-width:180px;padding:8px;display:none;z-index:999;">
          <a href="${dashboardHref(user.role)}" style="display:block;padding:8px 14px;border-radius:8px;font-size:.875rem;color:#2E2B26;font-weight:500;" onmouseover="this.style.background='#F2E8D5'" onmouseout="this.style.background='none'">🏠 Dashboard</a>
          <hr style="margin:6px 0;border:none;border-top:1px solid #E8D5B0;">
          <a href="#" id="navLogout" style="display:block;padding:8px 14px;border-radius:8px;font-size:.875rem;color:#C0392B;font-weight:500;" onmouseover="this.style.background='#F8D7DA'" onmouseout="this.style.background='none'">🚪 Logout</a>
        </div>`;

      const btn = document.getElementById('navUserBtn');
      const dd  = document.getElementById('navDropdown');
      btn.style.position = 'relative';
      btn.parentElement.style.position = 'relative';
      btn.addEventListener('click', e => { e.stopPropagation(); dd.style.display = dd.style.display === 'none' ? 'block' : 'none'; });
      document.addEventListener('click', () => { if(dd) dd.style.display = 'none'; });
      document.getElementById('navLogout').addEventListener('click', e => { e.preventDefault(); Auth.clear(); window.location.href = '/'; });
    } else {
      navUserArea.innerHTML = `
        <a href="/pages/login.html" class="btn btn-outline btn-sm">Log In</a>
        <a href="/pages/register.html" class="btn btn-primary btn-sm">Register</a>`;
    }
  }
}

function dashboardHref(role) {
  if (role === 'superadmin') return '/pages/dashboard-admin.html';
  if (role === 'provider')   return '/pages/dashboard-provider.html';
  return '/pages/dashboard-tourist.html';
}

// ── WTF Score renderer ───────────────────────────────────────
function renderWTF(container, instaScore, accessScore, reviewScore) {
  const total = ((instaScore + accessScore + reviewScore) / 3).toFixed(1);
  const pct = v => Math.round((v / 5) * 100);
  container.innerHTML = `
    <div class="wtf-widget">
      <div class="wtf-title">⚡ WTF Score — Worth To Find</div>
      <div style="display:flex;align-items:flex-end;gap:12px;margin-bottom:16px;">
        <div class="wtf-score-big">${total}</div>
        <div>
          <div style="font-size:.8rem;color:rgba(255,255,255,.7);">out of 5.0</div>
          <div class="wtf-label">Overall Score</div>
        </div>
      </div>
      <div class="wtf-bars">
        <div class="wtf-bar-row">
          <div class="wtf-bar-label">📸 Insta</div>
          <div class="wtf-bar-track"><div class="wtf-bar-fill" style="width:${pct(instaScore)}%"></div></div>
          <div class="wtf-bar-val">${instaScore}/5</div>
        </div>
        <div class="wtf-bar-row">
          <div class="wtf-bar-label">🥾 Access</div>
          <div class="wtf-bar-track"><div class="wtf-bar-fill" style="width:${pct(accessScore)}%"></div></div>
          <div class="wtf-bar-val">${accessScore}/5</div>
        </div>
        <div class="wtf-bar-row">
          <div class="wtf-bar-label">⭐ Reviews</div>
          <div class="wtf-bar-track"><div class="wtf-bar-fill" style="width:${pct(reviewScore)}%"></div></div>
          <div class="wtf-bar-val">${reviewScore}/5</div>
        </div>
      </div>
    </div>`;
}

// ── Stars renderer ───────────────────────────────────────────
function renderStars(rating, max = 5) {
  let html = '<span class="stars">';
  for (let i = 1; i <= max; i++) {
    html += i <= Math.round(rating) ? '<span class="star-filled">★</span>' : '<span>☆</span>';
  }
  html += '</span>';
  return html;
}

// ── Difficulty badge ─────────────────────────────────────────
function diffBadge(diff) {
  const cls = { Easy:'diff-easy', Moderate:'diff-moderate', Hard:'diff-hard', Expert:'diff-expert' };
  return `<span class="badge ${cls[diff] || 'badge-sand'}">${diff}</span>`;
}

// ── Price formatter ──────────────────────────────────────────
function fmtPrice(n) {
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}

// ── Date formatter ───────────────────────────────────────────
function fmtDate(str) {
  return new Date(str).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' });
}

// ── Toast notification ────────────────────────────────────────
function toast(msg, type = 'success', duration = 3500) {
  const existing = document.getElementById('hge-toast');
  if (existing) existing.remove();

  const t = document.createElement('div');
  t.id = 'hge-toast';
  const colors = { success: '#2D5016', error: '#C0392B', info: '#1A6B8A', warning: '#856404' };
  t.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${colors[type] || colors.success};color:white;
    padding:14px 20px;border-radius:12px;font-size:.9rem;font-weight:500;
    box-shadow:0 8px 32px rgba(0,0,0,.2);max-width:360px;
    animation:fadeUp .3s ease both;
    display:flex;align-items:center;gap:10px;`;
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, duration);
}

// ── Alert helper ─────────────────────────────────────────────
function showAlert(el, msg, type = 'error') {
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function hideAlert(el) { if (el) el.classList.add('hidden'); }

// ── Modal helpers ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Require auth guard ────────────────────────────────────────
function requireAuth(allowedRoles = []) {
  if (!Auth.isLoggedIn()) { window.location.href = '/pages/login.html'; return false; }
  if (allowedRoles.length > 0) {
    const user = Auth.getUser();
    if (!allowedRoles.includes(user?.role)) { window.location.href = '/'; return false; }
  }
  return true;
}

// ── Init on load ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initNav);
