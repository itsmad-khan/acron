import { firebaseSendPasswordReset } from './firebase-config.js';

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function getValue(id) {
  return document.getElementById(id)?.value ?? '';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function isValidEmailFormat(email) {
  // Prefer the shared isValidEmail() from security.js if it's loaded,
  // otherwise fall back to a basic local check.
  if (typeof isValidEmail === 'function') return isValidEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ─────────────────────────────────────────
   Validation — enables/disables the submit button
───────────────────────────────────────── */
function validateForgot() {
  const email = getValue('inp-email').trim();
  const btn   = document.getElementById('forgot-btn');
  if (!btn) return;

  setText('err-forgot', '');
  document.getElementById('inp-email')?.classList.remove('error');

  const ready = isValidEmailFormat(email);
  btn.toggleAttribute('disabled', !ready);
  btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
}

/* ─────────────────────────────────────────
   Button loading state
───────────────────────────────────────── */
function setLoading(on) {
  const btn = document.getElementById('forgot-btn');
  if (!btn) return;
  btn.classList.toggle('loading', on);
  btn.disabled = on;
  btn.setAttribute('aria-disabled', on ? 'true' : 'false');
}

/* ─────────────────────────────────────────
   Submit handler
───────────────────────────────────────── */
async function doForgotPassword() {
  const email = getValue('inp-email').trim();
  if (!isValidEmailFormat(email)) return;

  setText('err-forgot', '');
  document.getElementById('inp-email')?.classList.remove('error');
  setLoading(true);

  try {
    await firebaseSendPasswordReset(email);
    showSuccess();

  } catch (err) {
    console.error('[Forgot]', err.code, err.message);

    const code = err?.code ?? '';

    // SECURITY NOTE: Firebase's "user-not-found" error is intentionally
    // NOT shown differently from success — revealing whether an email
    // exists in the system would let attackers enumerate registered users.
    // We only show a distinct error for things unrelated to account
    // existence (bad email format, network issues, rate limiting).
    if (code === 'auth/user-not-found') {
      showSuccess(); // same generic message — don't leak account existence
    } else if (code === 'auth/invalid-email') {
      showFieldError('Please enter a valid email address.');
    } else if (code === 'auth/too-many-requests') {
      showFieldError('Too many requests. Please wait a few minutes and try again.');
    } else if (code === 'auth/network-request-failed') {
      showFieldError('No internet connection. Please check your network.');
    } else {
      showFieldError('Something went wrong. Please try again.');
    }
  } finally {
    setLoading(false);
  }
}

function showFieldError(msg) {
  setText('err-forgot', msg);
  document.getElementById('inp-email')?.classList.add('error');
}

function showSuccess() {
  const msg = document.getElementById('success-msg');
  const btn = document.getElementById('forgot-btn');
  const emailGroup = document.getElementById('email-group');

  if (msg) msg.classList.add('show');

  // Hide the form so the person can't spam-click "send" repeatedly —
  // they can refresh or go back to login if they need to try a
  // different email.
  if (btn) btn.style.display = 'none';
  if (emailGroup) emailGroup.style.display = 'none';
}

/* ─────────────────────────────────────────
   Boot
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('inp-email')?.addEventListener('input', validateForgot);
  document.getElementById('forgot-btn')?.addEventListener('click', doForgotPassword);

  // Allow Enter key to submit
  document.getElementById('inp-email')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doForgotPassword();
  });
});

/* ─────────────────────────────────────────
   Exports
   REQUIRED because this file is loaded as
   <script type="module">. Module-scoped functions
   are NOT automatically global, so any function
   referenced via inline onclick="..." in forgot.html
   must be explicitly attached to window here.
───────────────────────────────────────── */
window.validateForgot    = validateForgot;
window.doForgotPassword  = doForgotPassword;