/* ============================================================
   security.js — shared security/validation utilities
   Loaded as a plain <script> (not a module) so its functions
   are globally available to login.js, signup.js, profile.js, etc.
   ============================================================ */

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const SECURITY_MAX_ATTEMPTS = 5;
const SECURITY_LOCKOUT_MS   = 10 * 60 * 1000; // 10 minutes

/* ─────────────────────────────────────────
   Input sanitisation
   Use when inserting user text into innerHTML.
   Prefer textContent where possible — this is a fallback
   for the few places HTML must be built as a string.
───────────────────────────────────────── */
function sanitizeInput(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')   // must run first
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/* ─────────────────────────────────────────
   Email validation
───────────────────────────────────────── */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
}

/* ─────────────────────────────────────────
   Password strength
   Returns { strong, msg, score } where score is 0–3
   so callers can render a strength bar, not just pass/fail.
───────────────────────────────────────── */
function isStrongPassword(pass) {
  pass = pass ?? '';

  if (pass.length < 8) {
    return { strong: false, score: 0, msg: 'Password must be at least 8 characters.' };
  }
  if (!/[A-Z]/.test(pass)) {
    return { strong: false, score: 1, msg: 'Add at least one capital letter.' };
  }
  if (!/[0-9]/.test(pass)) {
    return { strong: false, score: 2, msg: 'Add at least one number.' };
  }

  // Bonus check — not required, but bumps score for a special character
  const hasSpecial = /[^A-Za-z0-9]/.test(pass);
  return {
    strong: true,
    score: hasSpecial ? 4 : 3,
    msg: hasSpecial ? 'Strong password!' : 'Good password.',
  };
}

/* ─────────────────────────────────────────
   Brute-force protection (rate limiting)
   Keyed per-email so one account being attacked doesn't
   lock out other users on the same device.
───────────────────────────────────────── */
function _attemptsKey(email) {
  return 'acron_attempts_' + String(email).trim().toLowerCase();
}

function checkLoginAttempts(email) {
  try {
    const key   = _attemptsKey(email);
    const saved = localStorage.getItem(key);
    const data  = saved ? JSON.parse(saved) : { count: 0, time: Date.now() };
    const age   = Date.now() - data.time;

    // Reset window after lockout period has fully elapsed
    if (age > SECURITY_LOCKOUT_MS) {
      localStorage.removeItem(key);
      return { blocked: false, remaining: SECURITY_MAX_ATTEMPTS };
    }

    if (data.count >= SECURITY_MAX_ATTEMPTS) {
      const waitMins = Math.ceil((SECURITY_LOCKOUT_MS - age) / 60000);
      return { blocked: true, waitMins };
    }

    return { blocked: false, remaining: SECURITY_MAX_ATTEMPTS - data.count };

  } catch {
    // localStorage unavailable (e.g. private browsing) — fail open
    return { blocked: false, remaining: SECURITY_MAX_ATTEMPTS };
  }
}

function recordFailedLogin(email) {
  try {
    const key   = _attemptsKey(email);
    const saved = localStorage.getItem(key);
    const data  = saved ? JSON.parse(saved) : { count: 0, time: Date.now() };
    data.count += 1;
    data.time   = Date.now(); // refresh window on each failure
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore — rate limiting degrades gracefully if storage fails
  }
}

function resetLoginAttempts(email) {
  try {
    localStorage.removeItem(_attemptsKey(email));
  } catch {
    // ignore
  }
}

/* ─────────────────────────────────────────
   Last login time
───────────────────────────────────────── */
function saveLastLogin() {
  try {
    // Store ISO format for reliable parsing; format for display elsewhere
    localStorage.setItem('acron_last_login', new Date().toISOString());
  } catch {
    // ignore
  }
}

/**
 * Returns a human-readable last-login string, or 'First login'
 * if none is recorded yet.
 */
function getLastLogin() {
  const raw = localStorage.getItem('acron_last_login');
  if (!raw) return 'First login';

  try {
    return new Date(raw).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return raw; // fall back to raw stored value if parsing fails
  }
}

/* ─────────────────────────────────────────
   New-device detection
   Uses a slightly richer fingerprint than userAgent alone,
   since userAgent is identical across all tabs in the same browser.
───────────────────────────────────────── */
function _deviceFingerprint() {
  return [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
  ].join('|');
}

function checkNewDevice() {
  try {
    const current = _deviceFingerprint();
    const saved   = localStorage.getItem('acron_device');

    if (!saved) {
      localStorage.setItem('acron_device', current);
      return false; // first login recorded, not "new"
    }

    if (saved !== current) {
      localStorage.setItem('acron_device', current);
      return true; // fingerprint changed — likely a new device/browser
    }

    return false;
  } catch {
    return false;
  }
}