let profileMedium = 'english';

function initProfile() {
  // Check if student is logged in
  const loggedIn = localStorage.getItem('ilmpath_logged_in');
  if (!loggedIn) {
    window.location.href = 'login.html';
    return;
  }

  // Get student data
  const saved = localStorage.getItem('ilmpath_user');
  if (!saved) return;
  const user = JSON.parse(saved);

  // Fill top card
  const avatar = document.getElementById('profile-avatar');
  if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();

  const boardNames = {
    punjab: 'Punjab Board', sindh: 'Sindh Board',
    kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
  };

  document.getElementById('profile-name').textContent = user.name;
  document.getElementById('profile-email').textContent = user.email;
  document.getElementById('profile-board').textContent =
    (boardNames[user.board] || user.board) + ' — Class ' + user.cls;

  // Fill mini stats
  const history = user.quizHistory || [];
  document.getElementById('mini-quizzes').textContent = history.length;
  document.getElementById('mini-chapters').textContent =
    (user.chaptersRead || []).length;

  if (history.length > 0) {
    const avg = Math.round(
      history.reduce((a, b) => a + b.percent, 0) / history.length
    );
    document.getElementById('mini-avg').textContent = avg + '%';
  }

  // Fill edit form with current values
  document.getElementById('edit-name').value = user.name;
  document.getElementById('edit-email').value = user.email;
  document.getElementById('edit-board').value = user.board;
  document.getElementById('edit-class').value = user.cls;

  // Set medium
  profileMedium = user.medium || 'english';
  document.getElementById('prof-med-en').classList.toggle('active', profileMedium === 'english');
  document.getElementById('prof-med-ur').classList.toggle('active', profileMedium === 'urdu');
}

function setProfileMedium(m) {
  profileMedium = m;
  document.getElementById('prof-med-en').classList.toggle('active', m === 'english');
  document.getElementById('prof-med-ur').classList.toggle('active', m === 'urdu');
}

function saveProfile() {
  const name  = document.getElementById('edit-name').value.trim();
  const email = document.getElementById('edit-email').value.trim();
  const board = document.getElementById('edit-board').value;
  const cls   = document.getElementById('edit-class').value;

  if (!name || !email) {
    alert('Please fill in your name and email.');
    return;
  }

  // Get existing user data and update it
  const saved = localStorage.getItem('ilmpath_user');
  if (!saved) return;
  const user = JSON.parse(saved);

  user.name   = name;
  user.email  = email;
  user.board  = board;
  user.cls    = cls;
  user.medium = profileMedium;

  localStorage.setItem('ilmpath_user', JSON.stringify(user));

  // Update top card instantly
  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-email').textContent = email;

  const boardNames = {
    punjab: 'Punjab Board', sindh: 'Sindh Board',
    kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
  };
  document.getElementById('profile-board').textContent =
    (boardNames[board] || board) + ' — Class ' + cls;

  // Update avatar letter
  document.getElementById('profile-avatar').textContent =
    name.charAt(0).toUpperCase();

  // Show success message
  const msg = document.getElementById('save-success');
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 3000);
}

function changePassword() {
  const oldPass  = document.getElementById('old-pass').value;
  const newPass  = document.getElementById('new-pass').value;
  const newPass2 = document.getElementById('new-pass2').value;
  const errEl    = document.getElementById('pass-error');

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

  // Save new password
  const saved = localStorage.getItem('ilmpath_user');
  if (!saved) return;
  const user = JSON.parse(saved);
  user.password = newPass;
  localStorage.setItem('ilmpath_user', JSON.stringify(user));

  // Clear fields
  document.getElementById('old-pass').value  = '';
  document.getElementById('new-pass').value  = '';
  document.getElementById('new-pass2').value = '';

  // Show success
  const msg = document.getElementById('pass-success');
  msg.classList.add('show');
  setTimeout(() => msg.classList.remove('show'), 3000);
}

function confirmDelete() {
  const confirm1 = window.confirm(
    'Are you sure you want to delete your account?\nAll your quizzes and progress will be lost.'
  );
  if (!confirm1) return;

  const confirm2 = window.confirm(
    'This cannot be undone. Are you really sure?'
  );
  if (!confirm2) return;

  // Delete all data
  localStorage.removeItem('ilmpath_user');
  localStorage.removeItem('ilmpath_logged_in');
  localStorage.removeItem('ilmpath_board');
  localStorage.removeItem('ilmpath_class');

  window.location.href = 'index.html';
}