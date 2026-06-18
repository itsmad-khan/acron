import { firebaseGetUser, firebaseUpdateProfile } from './firebase-config.js';

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

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let profileMedium = 'english';

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function requireAuth() {
  const loggedIn = localStorage.getItem('acron_logged_in');
  const uid      = localStorage.getItem('acron_uid');
  if (!loggedIn || !uid) {
    window.location.href = 'login.html';
    return null;
  }
  return uid;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getValue(id) {
  return document.getElementById(id)?.value ?? '';
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : Object.values(val);
}

function formatBoard(board, cls) {
  if (cls === 'other') return 'Senior Student';
  return `${BOARD_NAMES[board] ?? board} — Class ${cls}`;
}

/** Show a success message element for 3 seconds */
function flashSuccess(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show', 'visible');
  setTimeout(() => el.classList.remove('show', 'visible'), 3000);
}

/** Show an error in a field-error element */
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
async function initProfile() {
  const uid = requireAuth();
  if (!uid) return;

  try {
    const user = await firebaseGetUser(uid);
    if (!user) { window.location.href = 'login.html'; return; }

    renderTopCard(user);
    renderMiniStats(user);
    populateForm(user);

  } catch (err) {
    console.error('[Profile] init:', err);
  }
}

/* ─────────────────────────────────────────
   Render: top profile card
───────────────────────────────────────── */
function renderTopCard(user) {
  setText('profile-avatar', user.name.charAt(0).toUpperCase());
  setText('profile-name',   user.name);
  setText('profile-email',  user.email);
  setText('profile-board',  formatBoard(user.board, user.cls));
}

/* ─────────────────────────────────────────
   Render: mini stats
───────────────────────────────────────── */
function renderMiniStats(user) {
  const quizArr = toArray(user.quizHistory);
  const chapArr = toArray(user.chaptersRead);

  setText('mini-quizzes',  quizArr.length);
  setText('mini-chapters', chapArr.length);

  if (quizArr.length > 0) {
    const avg = Math.round(
      quizArr.reduce((sum, q) => sum + (q.percent ?? 0), 0) / quizArr.length
    );
    setText('mini-avg', avg + '%');
  } else {
    setText('mini-avg', '—');
  }
}

/* ─────────────────────────────────────────
   Render: edit form pre-fill
───────────────────────────────────────── */
function populateForm(user) {
  const editName  = document.getElementById('edit-name');
  const editEmail = document.getElementById('edit-email');
  const editBoard = document.getElementById('edit-board');
  const editClass = document.getElementById('edit-class');

  if (editName)  editName.value  = user.name  ?? '';
  if (editEmail) editEmail.value = user.email ?? '';
  if (editBoard) editBoard.value = user.board ?? '';
  if (editClass) editClass.value = user.cls   ?? '';

  // Study medium
  profileMedium = user.medium ?? 'english';
  _syncMediumButtons();
}

/* ─────────────────────────────────────────
   Study medium toggle
───────────────────────────────────────── */
function setProfileMedium(m) {
  profileMedium = m;
  _syncMediumButtons();
}

function _syncMediumButtons() {
  const enBtn = document.getElementById('prof-med-en');
  const urBtn = document.getElementById('prof-med-ur');
  if (enBtn) {
    enBtn.classList.toggle('active', profileMedium === 'english');
    enBtn.setAttribute('aria-pressed', profileMedium === 'english' ? 'true' : 'false');
  }
  if (urBtn) {
    urBtn.classList.toggle('active', profileMedium === 'urdu');
    urBtn.setAttribute('aria-pressed', profileMedium === 'urdu' ? 'true' : 'false');
  }
}

/* ─────────────────────────────────────────
   Save profile
───────────────────────────────────────── */
async function saveProfile() {
  const name  = getValue('edit-name').trim();
  const email = getValue('edit-email').trim();
  const board = getValue('edit-board');
  const cls   = getValue('edit-class');

  // Basic validation
  if (!name) { alert('Please enter your full name.'); return; }
  if (!email || !email.includes('@')) { alert('Please enter a valid email address.'); return; }

  const uid = requireAuth();
  if (!uid) return;

  const saveBtn = document.querySelector('.submit-btn');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const updates = { name, email, board, cls, medium: profileMedium };

    await firebaseUpdateProfile(uid, updates);

    // Sync localStorage
    try {
      const raw  = localStorage.getItem('acron_user');
      const user = raw ? JSON.parse(raw) : {};
      localStorage.setItem('acron_user', JSON.stringify({ ...user, ...updates, uid }));
    } catch { /* localStorage unavailable */ }

    // Update top card live
    setText('profile-name',   name);
    setText('profile-email',  email);
    setText('profile-avatar', name.charAt(0).toUpperCase());
    setText('profile-board',  formatBoard(board, cls));

    flashSuccess('save-success');

  } catch (err) {
    console.error('[Profile] save:', err);
    alert('Error saving profile. Please try again.');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

/* ─────────────────────────────────────────
   Change password
───────────────────────────────────────── */
async function changePassword() {
  const oldPass  = getValue('old-pass');
  const newPass  = getValue('new-pass');
  const newPass2 = getValue('new-pass2');

  showFieldError('pass-error', '');

  // Validate
  if (!oldPass || !newPass || !newPass2) {
    showFieldError('pass-error', 'Please fill in all password fields.');
    return;
  }
  if (newPass.length < 6) {
    showFieldError('pass-error', 'New password must be at least 6 characters.');
    return;
  }
  if (newPass !== newPass2) {
    showFieldError('pass-error', 'New passwords do not match.');
    return;
  }
  if (oldPass === newPass) {
    showFieldError('pass-error', 'New password must be different from your current password.');
    return;
  }

  const changeBtn = document.querySelectorAll('.submit-btn')[1];
  if (changeBtn) changeBtn.disabled = true;

  try {
    const { auth }   = await import('./firebase-config.js');
    const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } =
      await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');

    const user = auth.currentUser;
    if (!user) {
      showFieldError('pass-error', 'Session expired. Please log in again.');
      return;
    }

    // Re-authenticate before sensitive operation
    const credential = EmailAuthProvider.credential(user.email, oldPass);
    await reauthenticateWithCredential(user, credential);

    await updatePassword(user, newPass);

    // Clear fields
    ['old-pass', 'new-pass', 'new-pass2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    flashSuccess('pass-success');

  } catch (err) {
    console.error('[Profile] changePassword:', err);
    const code = err?.code ?? '';
    const msg  =
      code === 'auth/wrong-password'     ? 'Current password is incorrect.'        :
      code === 'auth/invalid-credential' ? 'Current password is incorrect.'        :
      code === 'auth/weak-password'      ? 'New password is too weak.'             :
      code === 'auth/requires-recent-login' ? 'Please log out and log in again to change your password.' :
      'Error changing password. Please try again.';
    showFieldError('pass-error', msg);
  } finally {
    if (changeBtn) changeBtn.disabled = false;
  }
}

/* ─────────────────────────────────────────
   Delete account
───────────────────────────────────────── */
async function confirmDelete() {
  // Two-step confirmation
  if (!window.confirm(
    'Are you sure you want to delete your account?\n\nAll your quizzes, progress, and data will be permanently lost.'
  )) return;

  if (!window.confirm(
    'This cannot be undone. Type OK to confirm permanent deletion.'
  )) return;

  try {
    const { auth, db } = await import('./firebase-config.js');
    const { ref, remove } =
      await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js');

    const uid = localStorage.getItem('acron_uid');
    if (!uid) return;

    // Delete database record first
    await remove(ref(db, `users/${uid}`));

    // Delete Firebase Auth account
    const user = auth.currentUser;
    if (user) await user.delete();

    // Wipe local storage
    localStorage.clear();
    window.location.href = 'index.html';

  } catch (err) {
    console.error('[Profile] delete:', err);
    const msg = err?.code === 'auth/requires-recent-login'
      ? 'Please log out and log in again before deleting your account.'
      : 'Error deleting account. Please try again.';
    alert(msg);
  }
}

/* ─────────────────────────────────────────
   Boot
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  initProfile();

  // Wire up buttons via event listeners (remove inline onclick)
  const wireClick = (selector, handler) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.removeAttribute('onclick');
    el.addEventListener('click', handler);
  };

  wireClick('button[onclick="saveProfile()"]',    saveProfile);
  wireClick('button[onclick="changePassword()"]', changePassword);
  wireClick('button[onclick="confirmDelete()"]',  confirmDelete);

  document.getElementById('prof-med-en')
    ?.addEventListener('click', () => setProfileMedium('english'));
  document.getElementById('prof-med-ur')
    ?.addEventListener('click', () => setProfileMedium('urdu'));
});

/* ─────────────────────────────────────────
   Exports (called from HTML onclick attrs
   that remain in the improved profile.html)
───────────────────────────────────────── */
window.saveProfile      = saveProfile;
window.changePassword   = changePassword;
window.confirmDelete    = confirmDelete;
window.setProfileMedium = setProfileMedium;
window.initProfile      = initProfile;