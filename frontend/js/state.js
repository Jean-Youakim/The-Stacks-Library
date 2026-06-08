/* ============================================================
   state.js — global app state shared across all frontend modules
   ============================================================ */

const API = '/api'; // backend base URL

const state = {
  books:          [],
  cart:           [],       // [{ id, qty }]  — ids are MongoDB _id strings
  currentUser:    null,     // { email, role, token }
  selectedBookId: null,
  filters: {
    search:        '',
    genre:         '',
    yearBucket:    '',
    availability:  '',
    favoritesOnly: false,
    sort:          ''
  }
};

// ── JWT helpers ──────────────────────────────────────────────
function getToken()  { return state.currentUser ? state.currentUser.token : null; }
function authHeader(){ return { Authorization: 'Bearer ' + getToken() }; }

// ── Authenticated fetch wrapper ──────────────────────────────
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(token ? authHeader() : {}), ...(opts.headers || {}) };
  const res = await fetch(API + path, { ...opts, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

// ── Cart persistence (sessionStorage — cleared on tab close) ─
function saveCart() {
  try { sessionStorage.setItem('stacks_cart', JSON.stringify(state.cart)); } catch {}
}
function loadCartFromStorage() {
  try {
    const raw = sessionStorage.getItem('stacks_cart');
    state.cart = raw ? JSON.parse(raw) : [];
  } catch { state.cart = []; }
}

// ── User session persistence (localStorage — survives refresh) ─
function saveSession(user) {
  try { if (user) localStorage.setItem('stacks_session', JSON.stringify(user)); else localStorage.removeItem('stacks_session'); } catch {}
}
function loadSession() {
  try {
    const raw = localStorage.getItem('stacks_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ── Prefs (theme) ─────────────────────────────────────────────
function loadPrefs()  { try { return JSON.parse(localStorage.getItem('stacks_prefs') || '{"theme":"dark"}'); } catch { return { theme: 'dark' }; } }
function savePrefs(p) { try { localStorage.setItem('stacks_prefs', JSON.stringify(p)); } catch {} }
