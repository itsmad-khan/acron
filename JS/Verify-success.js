import {
  auth, db,
} from './firebase-config.js';
import {
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import {
  ref,
  update,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js';

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function showState(id) {
  ['state-checking', 'state-success', 'state-error'].forEach(stateId => {
    const el = document.getElementById(stateId);
    if (el) el.style.display = stateId === id ? 'block' : 'none';
  });
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ─────────────────────────────────────────
   Decide where the "continue" button goes
   based on whether there's still an active
   Firebase session in this browser.
───────────────────────────────────────── */
function configureContinueButton() {
  const loggedInLocally = localStorage.getItem('acron_logged_in') === 'true';

  onAuthStateChanged(auth, (user) => {
    const cta     = document.getElementById('cta-btn');
    const ctaText = document.getElementById('cta-text');
    if (!cta || !ctaText) return;

    if (user && loggedInLocally) {
      cta.href = 'dashboard.html';
      ctaText.textContent = 'Go to Dashboard';
    } else {
      cta.href = 'login.html';
      ctaText.textContent = 'Log in to continue';
    }
  });
}

/* ─────────────────────────────────────────
   Main
   IMPORTANT: by the time the browser reaches THIS page, Firebase's
   own hosted action handler (acron-22009.firebaseapp.com) has
   ALREADY consumed the oobCode and verified the email — that's
   what happens on the page the person sees right after clicking
   the link in their inbox, before being redirected here via
   continueUrl. Re-running checkActionCode()/applyActionCode() on
   an already-consumed code here would always fail with
   auth/invalid-action-code, since a verification code can only be
   used once.

   So this page's only job is to: (1) confirm we arrived here as
   part of a genuine verification flow, and (2) show success +
   pick the right "continue" destination based on session state.
───────────────────────────────────────── */
async function handleVerification() {
  const params = new URLSearchParams(window.location.search);
  const mode   = params.get('mode'); // Firebase still includes this on the continueUrl

  // A stray visit with no 'mode' param at all means someone opened
  // this URL directly, not via the email verification flow.
  if (mode !== 'verifyEmail') {
    showState('state-error');
    setText('error-sub',
      'This page is only meant to be opened from the verification link in your email.');
    return;
  }

  // Give onAuthStateChanged a moment to report the current session —
  // by this point Firebase has already verified the email on its own
  // hosted page, so we simply reflect that success here.
  try {
    const user = auth.currentUser;
    if (user) {
      // Best-effort mirror of the verified status into our database.
      // Firebase Auth remains the real source of truth either way.
      try {
        await update(ref(db, `users/${user.uid}`), { emailVerified: true });
      } catch (syncErr) {
        console.warn('[VerifySuccess] Could not sync emailVerified to database:', syncErr);
      }
    }
  } catch (err) {
    console.warn('[VerifySuccess] Non-fatal error checking current user:', err);
  }

  showState('state-success');
  configureContinueButton();
}

/* ─────────────────────────────────────────
   Boot
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  handleVerification();
});