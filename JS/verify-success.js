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
   ALREADY consumed the oobCode and verified the email on its own
   page — that's what the person sees right after clicking the link
   in their inbox, before being redirected here via continueUrl.

   CRITICAL: Firebase does NOT forward 'mode' or 'oobCode' onto the
   continueUrl — it delivers a clean URL with no query parameters at
   all. So there is no reliable URL parameter here to confirm "this
   came from a real verification email" versus someone just typing
   the URL directly. We accept that trade-off: this page simply
   reflects whatever the current Firebase Auth session state is.
   If someone opens this URL directly with no real session, they'll
   just see "Log in to continue" — there's no harmful side effect,
   since no sensitive action happens on this page itself.
───────────────────────────────────────── */
async function handleVerification() {
  // Give Firebase a brief moment to restore the session from storage
  // before we check auth.currentUser, since this can be momentarily
  // null on first page load even when a session genuinely exists.
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
