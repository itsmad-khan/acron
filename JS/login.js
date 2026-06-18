import { firebaseLogin, sendEmailVerification } from './firebase-config.js';

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 10 * 60 * 1000; // 10 minutes

/* ─────────────────────────────────────────
   Password visibility toggle
───────────────────────────────────────── */
function togglePass() {
  const inp = document.getElementById('inp-pass');
  const btn = document.getElementById('eye-btn');
  if (!inp) return;

  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  btn?.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');

  // Swap icon
  const icon = document.getElementById('eye-icon');
  if (icon) {
    icon.innerHTML = isHidden
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

/* ─────────────────────────────────────────
   Form validation
───────────────────────────────────────── */
function validateLogin() {
  const email = document.getElementById('inp-email')?.value.trim() ?? '';
  const pass  = document.getElementById('inp-pass')?.value ?? '';
  const btn   = document.getElementById('login-btn');
  if (!btn) return;

  const valid = email.includes('@') && email.includes('.') && pass.length >= 6;
  btn.toggleAttribute('disabled', !valid);
  btn.setAttribute('aria-disabled', valid ? 'false' : 'true');
}

/* ─────────────────────────────────────────
   Button state helpers
───────────────────────────────────────── */
function setLoading(on) {
  const btn      = document.getElementById('login-btn');
  const spinner  = btn?.querySelector('.btn-spinner');
  const textWrap = btn?.querySelector('.btn-text-wrap');
  if (!btn) return;

  btn.disabled = on;
  btn.setAttribute('aria-disabled', on ? 'true' : 'false');
  if (spinner)  spinner.style.display  = on ? 'block' : 'none';
  if (textWrap) textWrap.style.display = on ? 'none'  : 'flex';
}

function showError(msg) {
  const el = document.getElementById('err-login');
  if (el) el.textContent = msg;
}

function clearError() {
  showError('');
  // Also remove any injected HTML (e.g. resend button)
  const el = document.getElementById('err-login');
  if (el) el.innerHTML = '';
}

/* ─────────────────────────────────────────
   Rate limiting (brute-force protection)
───────────────────────────────────────── */
function _attemptsKey(email) {
  return `acron_attempts_${email}`;
}

function checkLoginAttempts(email) {
  try {
    const raw  = localStorage.getItem(_attemptsKey(email));
    const data = raw ? JSON.parse(raw) : { count: 0, firstAt: Date.now() };
    const age  = Date.now() - data.firstAt;

    // Reset window after lockout period
    if (age > LOCKOUT_MS) {
      localStorage.removeItem(_attemptsKey(email));
      return { blocked: false };
    }

    if (data.count >= MAX_ATTEMPTS) {
      const waitMins = Math.ceil((LOCKOUT_MS - age) / 60_000);
      return { blocked: true, waitMins };
    }
  } catch {
    // localStorage unavailable — allow login
  }
  return { blocked: false };
}

function recordFailedLogin(email) {
  try {
    const raw  = localStorage.getItem(_attemptsKey(email));
    const data = raw ? JSON.parse(raw) : { count: 0, firstAt: Date.now() };
    data.count += 1;
    localStorage.setItem(_attemptsKey(email), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function clearLoginAttempts(email) {
  try { localStorage.removeItem(_attemptsKey(email)); } catch { /* ignore */ }
}

/* ─────────────────────────────────────────
   Device fingerprint (new-device detection)
───────────────────────────────────────── */
function checkNewDevice() {
  try {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
    ].join('|');

    const stored = localStorage.getItem('acron_device');
    if (!stored) {
      localStorage.setItem('acron_device', fingerprint);
      return false; // first login on this device
    }
    if (stored !== fingerprint) {
      localStorage.setItem('acron_device', fingerprint);
      return true; // different device
    }
    return false;
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────
   Email not verified — show resend UI
───────────────────────────────────────── */
function showVerificationError(user) {
  const errEl = document.getElementById('err-login');
  if (!errEl) return;

  errEl.innerHTML = `
    <span style="display:block;margin-bottom:8px">
      Email not verified yet. Please check your inbox and spam folder.
    </span>
    <button id="resend-btn" style="
      color:var(--accent-light);
      background:rgba(124,108,240,0.1);
      border:1px solid rgba(124,108,240,0.28);
      padding:6px 14px;border-radius:8px;
      cursor:pointer;font-size:12px;
      font-family:Nunito,sans-serif;font-weight:700;
    " aria-label="Resend verification email">
      Resend verification email
    </button>`;

  document.getElementById('resend-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      await sendEmailVerification(user);
      btn.textContent = '✓ Email sent! Check your inbox.';
      btn.style.color = 'var(--teal)';
    } catch {
      btn.textContent = 'Could not send. Try again later.';
      btn.disabled = false;
    }
  });
}

/* ─────────────────────────────────────────
   Main login handler
───────────────────────────────────────── */
async function doLogin() {
  const email = document.getElementById('inp-email')?.value.trim() ?? '';
  const pass  = document.getElementById('inp-pass')?.value ?? '';

  clearError();

  // Rate limit check
  const attempt = checkLoginAttempts(email);
  if (attempt.blocked) {
    showError(`Too many failed attempts. Try again in ${attempt.waitMins} minute${attempt.waitMins !== 1 ? 's' : ''}.`);
    return;
  }

  setLoading(true);

  try {
    const user = await firebaseLogin(email, pass);

    // Email verification gate
    if (!user.emailVerified) {
      setLoading(false);
      showVerificationError(user);
      return;
    }

    // Success — clear failed attempts, persist session
    clearLoginAttempts(email);
    localStorage.setItem('acron_logged_in', 'true');
    localStorage.setItem('acron_uid',       user.uid);
    localStorage.setItem('acron_last_login', new Date().toISOString());

    if (checkNewDevice()) {
      localStorage.setItem('acron_show_device_warning', 'true');
    }

    window.location.href = 'dashboard.html';

  } catch (err) {
    recordFailedLogin(email);
    setLoading(false);

    const code = err?.code ?? '';
    const msg  =
      code === 'auth/user-not-found'     ? 'No account found with this email.' :
      code === 'auth/wrong-password'     ? 'Wrong password. Please try again.' :
      code === 'auth/invalid-credential' ? 'Wrong email or password.'          :
      code === 'auth/too-many-requests'  ? 'Too many attempts. Please wait a moment.' :
      code === 'auth/network-request-failed' ? 'No internet connection. Please check your network.' :
      'Login failed. Please try again.';

    showError(msg);
    console.error('[Login]', code, err.message);
  }
}

/* ─────────────────────────────────────────
   Boot
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('inp-email')?.addEventListener('input', validateLogin);
  document.getElementById('inp-pass') ?.addEventListener('input', validateLogin);
  document.getElementById('eye-btn')  ?.addEventListener('click', togglePass);
  document.getElementById('login-btn')?.addEventListener('click', doLogin);

  // Allow Enter key to submit
  document.getElementById('inp-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
});