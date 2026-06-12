import { firebaseGetUser, firebaseUpdateProfile } from './firebase-config.js';

let profileMedium = 'english';

async function initProfile() {
  const loggedIn = localStorage.getItem('acron_logged_in');
  if (!loggedIn) {
    window.location.href = 'login.html';
    return;
  }

  const uid = localStorage.getItem('acron_uid');
  if (!uid) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const user = await firebaseGetUser(uid);
    if (!user) return;

    // Fill top card
    const avatar = document.getElementById('profile-avatar');
    if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();

    const boardNames = {
      punjab: 'Punjab Board', sindh: 'Sindh Board',
      kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
    };

    const nameEl = document.getElementById('profile-name');
    const emailEl = document.getElementById('profile-email');
    const boardEl = document.getElementById('profile-board');

    if (nameEl) nameEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (boardEl) boardEl.textContent = user.cls === 'other' ? 'Senior Student' :
      (boardNames[user.board] || user.board) + ' — Class ' + user.cls;

    // Fill mini stats
    const history = user.quizHistory || [];
    const quizArr = Array.isArray(history) ? history : Object.values(history);
    const chapters = user.chaptersRead || [];
    const chapArr = Array.isArray(chapters) ? chapters : Object.values(chapters);

    const miniQuizzes = document.getElementById('mini-quizzes');
    const miniChapters = document.getElementById('mini-chapters');
    const miniAvg = document.getElementById('mini-avg');

    if (miniQuizzes) miniQuizzes.textContent = quizArr.length;
    if (miniChapters) miniChapters.textContent = chapArr.length;

    if (quizArr.length > 0) {
      const avg = Math.round(quizArr.reduce((a, b) => a + b.percent, 0) / quizArr.length);
      if (miniAvg) miniAvg.textContent = avg + '%';
    }

    // Fill edit form
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editBoard = document.getElementById('edit-board');
    const editClass = document.getElementById('edit-class');

    if (editName) editName.value = user.name;
    if (editEmail) editEmail.value = user.email;
    if (editBoard) editBoard.value = user.board;
    if (editClass) editClass.value = user.cls;

    // Set medium
    profileMedium = user.medium || 'english';
    const medEn = document.getElementById('prof-med-en');
    const medUr = document.getElementById('prof-med-ur');
    if (medEn) medEn.classList.toggle('active', profileMedium === 'english');
    if (medUr) medUr.classList.toggle('active', profileMedium === 'urdu');

  } catch (err) {
    console.log('Profile error:', err);
  }
}

function setProfileMedium(m) {
  profileMedium = m;
  document.getElementById('prof-med-en').classList.toggle('active', m === 'english');
  document.getElementById('prof-med-ur').classList.toggle('active', m === 'urdu');
}

async function saveProfile() {
  const name = document.getElementById('edit-name').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const board = document.getElementById('edit-board').value;
  const cls = document.getElementById('edit-class').value;

  if (!name || !email) {
    alert('Please fill in your name and email.');
    return;
  }

  const uid = localStorage.getItem('acron_uid');
  if (!uid) return;

  try {
    // Save to Firebase
    await firebaseUpdateProfile(uid, {
      name, email, board, cls,
      medium: profileMedium
    });

    // Update localStorage
    const saved = localStorage.getItem('acron_user');
    if (saved) {
      const user = JSON.parse(saved);
      user.name = name;
      user.email = email;
      user.board = board;
      user.cls = cls;
      user.medium = profileMedium;
      localStorage.setItem('acron_user', JSON.stringify(user));
    }

    // Update top card
    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-email').textContent = email;
    document.getElementById('profile-avatar').textContent = name.charAt(0).toUpperCase();

    const boardNames = {
      punjab: 'Punjab Board', sindh: 'Sindh Board',
      kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
    };
    document.getElementById('profile-board').textContent = cls === 'other' ? 'Senior Student' :
      (boardNames[board] || board) + ' — Class ' + cls;

    // Show success
    const msg = document.getElementById('save-success');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 3000);

  } catch (err) {
    console.log('Save profile error:', err);
    alert('Error saving profile. Please try again.');
  }
}

async function changePassword() {
  const oldPass = document.getElementById('old-pass').value;
  const newPass = document.getElementById('new-pass').value;
  const newPass2 = document.getElementById('new-pass2').value;
  const errEl = document.getElementById('pass-error');

  errEl.textContent = '';

  if (!oldPass || !newPass || !newPass2) {
    errEl.textContent = 'Please fill in all password fields.';
    return;
  }

  if (newPass.length < 6) {
    errEl.textContent = 'New password must be at least 6 characters.';
    return;
  }

  if (newPass !== newPass2) {
    errEl.textContent = 'New passwords do not match.';
    return;
  }

  try {
    const { auth } = await import('./firebase-config.js');
    const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = 
      await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js');

    const user = auth.currentUser;
    if (!user) {
      errEl.textContent = 'Please log in again to change password.';
      return;
    }

    // Reauthenticate first
    const credential = EmailAuthProvider.credential(user.email, oldPass);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPass);

    // Clear fields
    document.getElementById('old-pass').value = '';
    document.getElementById('new-pass').value = '';
    document.getElementById('new-pass2').value = '';

    // Show success
    const msg = document.getElementById('pass-success');
    msg.classList.add('show');
    setTimeout(() => msg.classList.remove('show'), 3000);

  } catch (err) {
    console.log('Password change error:', err);
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      errEl.textContent = 'Current password is wrong.';
    } else {
      errEl.textContent = 'Error changing password. Please try again.';
    }
  }
}

async function confirmDelete() {
  const confirm1 = window.confirm(
    'Are you sure you want to delete your account?\nAll your quizzes and progress will be lost.'
  );
  if (!confirm1) return;

  const confirm2 = window.confirm('This cannot be undone. Are you really sure?');
  if (!confirm2) return;

  try {
    const { auth, db } = await import('./firebase-config.js');
    const { remove } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js');
    const { ref } = await import('https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js');

    const uid = localStorage.getItem('acron_uid');

    // Delete from database
    await remove(ref(db, 'users/' + uid));

    // Delete auth account
    await auth.currentUser.delete();

    // Clear local storage
    localStorage.clear();
    window.location.href = 'index.html';

  } catch (err) {
    console.log('Delete error:', err);
    alert('Error deleting account. Please log in again and try.');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initProfile();

  // Add button listeners
  const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
  const changePassBtn = document.querySelector('button[onclick="changePassword()"]');
  const deleteBtn = document.querySelector('button[onclick="confirmDelete()"]');

  if (saveBtn) {
    saveBtn.removeAttribute('onclick');
    saveBtn.addEventListener('click', saveProfile);
  }
  if (changePassBtn) {
    changePassBtn.removeAttribute('onclick');
    changePassBtn.addEventListener('click', changePassword);
  }
  if (deleteBtn) {
    deleteBtn.removeAttribute('onclick');
    deleteBtn.addEventListener('click', confirmDelete);
  }

  const medEn = document.getElementById('prof-med-en');
  const medUr = document.getElementById('prof-med-ur');
  if (medEn) medEn.addEventListener('click', () => setProfileMedium('english'));
  if (medUr) medUr.addEventListener('click', () => setProfileMedium('urdu'));
});