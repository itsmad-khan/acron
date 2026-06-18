import { firebaseSignup } from './firebase-config.js';

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let selectedMedium = 'english';

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const BOARD_NAMES = {
  punjab:      'Punjab Board',
  sindh:       'Sindh Board',
  kpk:         'KPK Board',
  balochistan: 'Balochistan Board',
  federal:     'Federal Board',
};

const STRENGTH_LEVELS = [
  { w: '20%',  color: '#f87171', lbl: 'Weak'   },
  { w: '40%',  color: '#f87171', lbl: 'Weak'   },
  { w: '60%',  color: '#fbbf24', lbl: 'OK'     },
  { w: '80%',  color: '#34d399', lbl: 'Good'   },
  { w: '100%', color: '#34d399', lbl: 'Strong' },
];

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

function clearErrors() {
  ['err-name', 'err-email', 'err-pass', 'err-pass2'].forEach(id => setText(id, ''));
}

/* ─────────────────────────────────────────
   Study medium toggle
───────────────────────────────────────── */
function setMedium(m) {
  selectedMedium = m;
  const enBtn = document.getElementById('med-en');
  const urBtn = document.getElementById('med-ur');
  enBtn?.classList.toggle('active', m === 'english');
  urBtn?.classList.toggle('active', m === 'urdu');
  enBtn?.setAttribute('aria-pressed', m === 'english' ? 'true' : 'false');
  urBtn?.setAttribute('aria-pressed', m === 'urdu'    ? 'true' : 'false');
}

/* ─────────────────────────────────────────
   Password visibility
───────────────────────────────────────── */
function togglePass() {
  const inp = document.getElementById('inp-pass');
  const btn = document.getElementById('eye-btn');
  if (!inp) return;

  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  btn?.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');

  const icon = document.getElementById('eye-icon');
  if (icon) {
    icon.innerHTML = isHidden
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

/* ─────────────────────────────────────────
   Password strength meter
───────────────────────────────────────── */
function checkStrength() {
  const pass  = getValue('inp-pass');
  const fill  = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (!fill || !label) return;

  if (!pass) {
    fill.style.width = '0';
    label.textContent = '';
    fill.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', '0');
    return;
  }

  let score = 0;
  if (pass.length >= 6)          score++;
  if (pass.length >= 10)         score++;
  if (/[A-Z]/.test(pass))        score++;
  if (/[0-9]/.test(pass))        score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;

  const lvl = STRENGTH_LEVELS[Math.min(score, 4)];
  fill.style.width      = lvl.w;
  fill.style.background = lvl.color;
  label.textContent     = lvl.lbl;
  label.style.color     = lvl.color;
  fill.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', String(score * 20));
}

/* ─────────────────────────────────────────
   Live validation
───────────────────────────────────────── */
function validate() {
  const name  = getValue('inp-name').trim();
  const email = getValue('inp-email').trim();
  const pass  = getValue('inp-pass');
  const pass2 = getValue('inp-pass2');
  const btn   = document.getElementById('signup-btn');
  if (!btn) return;

  clearErrors();

  let valid = true;

  if (name.length < 2) valid = false;

  if (!email.includes('@') || !email.includes('.')) valid = false;

  if (pass.length < 6) {
    valid = false;
  }

  if (pass2 && pass !== pass2) {
    setText('err-pass2', 'Passwords do not match.');
    valid = false;
  }

  const allFilled = name && email && pass && pass2;
  const ready = valid && allFilled;

  btn.toggleAttribute('disabled', !ready);
  btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
}

/* ─────────────────────────────────────────
   Button state helpers
───────────────────────────────────────── */
function setLoading(on) {
  const btn = document.getElementById('signup-btn');
  if (!btn) return;
  btn.classList.toggle('loading', on);
  btn.disabled = on;
  btn.setAttribute('aria-disabled', on ? 'true' : 'false');
}

/* ─────────────────────────────────────────
   Signup handler
───────────────────────────────────────── */
async function doSignup() {
  const name  = getValue('inp-name').trim();
  const email = getValue('inp-email').trim();
  const pass  = getValue('inp-pass');
  const pass2 = getValue('inp-pass2');

  if (!name || !email || !pass || pass !== pass2) return;

  const board = localStorage.getItem('acron_board') || 'none';
  const cls   = localStorage.getItem('acron_class') || '9';

  setLoading(true);
  clearErrors();

  try {
    const user = await firebaseSignup(name, email, pass, board, cls, selectedMedium);

    // Persist session
    localStorage.setItem('acron_logged_in', 'true');
    localStorage.setItem('acron_uid', user.uid);
    localStorage.setItem('acron_user', JSON.stringify({
      name, email, board, cls,
      medium: selectedMedium,
      uid: user.uid,
    }));

    // saveLastLogin() is provided globally by security.js
    if (typeof saveLastLogin === 'function') saveLastLogin();
    else localStorage.setItem('acron_last_login', new Date().toISOString());

    showVerificationSuccess(email);
    setLoading(false);

  } catch (err) {
    setLoading(false);
    console.error('[Signup]', err.code, err.message);

    if (err.code === 'auth/email-already-in-use') {
      const el = document.getElementById('err-email');
      if (el) {
        el.innerHTML = `This email is already registered. <a href="login.html" style="color:var(--accent-light);font-weight:700">Log in here</a> or check your inbox for the verification email.`;
      }
    } else if (err.code === 'auth/weak-password') {
      setText('err-pass', 'Password is too weak. Use at least 6 characters.');
    } else if (err.code === 'auth/invalid-email') {
      setText('err-email', 'Please enter a valid email address.');
    } else if (err.code === 'auth/network-request-failed') {
      setText('err-email', 'No internet connection. Please check your network.');
    } else {
      setText('err-email', 'Error creating account. Please try again.');
    }
  }
}

/* ─────────────────────────────────────────
   Success message (after signup)
───────────────────────────────────────── */
function showVerificationSuccess(email) {
  const msg = document.getElementById('success-msg');
  if (!msg) return;

  msg.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
    <div>
      <div style="font-weight:800">Account created!</div>
      <div style="font-size:12px;margin-top:3px;line-height:1.5">
        We sent a verification email to <strong>${escapeHTML(email)}</strong>.
        Please check your inbox (and spam folder) and click the link before logging in.
      </div>
    </div>`;
  msg.classList.add('show', 'visible');
  msg.style.alignItems = 'flex-start';
}

function escapeHTML(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ─────────────────────────────────────────
   Boot
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  const board = localStorage.getItem('acron_board') || 'none';
  const cls   = localStorage.getItem('acron_class') || '9';

  const selectedEl = document.getElementById('selected-text');
  if (selectedEl) {
    selectedEl.textContent = cls === 'other'
      ? 'Senior Student — PDF Quiz access'
      : `${BOARD_NAMES[board] ?? board} — Class ${cls}`;
  }

  document.getElementById('inp-name') ?.addEventListener('input', validate);
  document.getElementById('inp-email')?.addEventListener('input', validate);
  document.getElementById('inp-pass') ?.addEventListener('input', () => { validate(); checkStrength(); });
  document.getElementById('inp-pass2')?.addEventListener('input', validate);
  document.getElementById('eye-btn')  ?.addEventListener('click', togglePass);
  document.getElementById('signup-btn')?.addEventListener('click', doSignup);
  document.getElementById('med-en')   ?.addEventListener('click', () => setMedium('english'));
  document.getElementById('med-ur')   ?.addEventListener('click', () => setMedium('urdu'));
});