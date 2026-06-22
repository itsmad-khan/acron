import {
    auth, db,
  } from './firebase-config.js';
  import {
    applyActionCode,
    onAuthStateChanged,
    checkActionCode,
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
  
    // onAuthStateChanged tells us definitively whether Firebase still
    // considers this browser "signed in" right now.
    onAuthStateChanged(auth, (user) => {
      const cta     = document.getElementById('cta-btn');
      const ctaText = document.getElementById('cta-text');
      if (!cta || !ctaText) return;
  
      if (user && loggedInLocally) {
        // Still logged in (most common case — just signed up minutes ago,
        // same browser). Send them straight to the dashboard.
        cta.href = 'dashboard.html';
        ctaText.textContent = 'Go to Dashboard';
      } else {
        // No active session (different device, or session expired).
        // Send them to login instead — this is NOT a failure case,
        // their email IS verified either way.
        cta.href = 'login.html';
        ctaText.textContent = 'Log in to continue';
      }
    });
  }
  
  /* ─────────────────────────────────────────
     Main: read the action code from the URL
     and apply it via Firebase.
  ───────────────────────────────────────── */
  async function handleVerification() {
    const params     = new URLSearchParams(window.location.search);
    const mode       = params.get('mode');        // e.g. "verifyEmail"
    const actionCode = params.get('oobCode');      // the actual verification token
  
    // If there's no action code at all, someone navigated here directly
    // without coming from an email link — treat as an error state.
    if (!actionCode || mode !== 'verifyEmail') {
      showState('state-error');
      setText('error-sub',
        'This page is only meant to be opened from the verification link in your email.');
      return;
    }
  
    try {
      // First check the code is valid/not expired (gives a clearer error
      // than applyActionCode alone in some Firebase SDK versions).
      await checkActionCode(auth, actionCode);
  
      // Actually apply it — this is what marks the email as verified.
      await applyActionCode(auth, actionCode);
  
      // Reflect the verified status in the Realtime Database too —
      // firebaseSignup() originally writes emailVerified: false and
      // nothing else updates it afterward without this step.
      // Best-effort only: if there's no active session (different
      // device), this write will simply fail silently and that's fine —
      // Firebase Auth itself is the source of truth for verification,
      // this database field is just a convenience mirror for display.
      try {
        const user = auth.currentUser;
        if (user) {
          await update(ref(db, `users/${user.uid}`), { emailVerified: true });
        }
      } catch (syncErr) {
        console.warn('[VerifySuccess] Could not sync emailVerified to database:', syncErr);
      }
  
      showState('state-success');
      configureContinueButton();
  
    } catch (err) {
      console.error('[VerifySuccess]', err.code, err.message);
      showState('state-error');
  
      const code = err?.code ?? '';
      if (code === 'auth/expired-action-code') {
        setText('error-sub', 'This verification link has expired. Please request a new one by logging in.');
      } else if (code === 'auth/invalid-action-code') {
        setText('error-sub', 'This link has already been used or is invalid. If you already verified your email, you can log in directly.');
      } else {
        setText('error-sub', 'Something went wrong verifying your email. Please try logging in, or request a new verification email.');
      }
    }
  }
  
  /* ─────────────────────────────────────────
     Boot
  ───────────────────────────────────────── */
  window.addEventListener('DOMContentLoaded', () => {
    handleVerification();
  });