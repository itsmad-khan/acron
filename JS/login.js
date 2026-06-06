function togglePass() {
  const inp = document.getElementById('inp-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function validateLogin() {
  const email = document.getElementById('inp-email').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const btn = document.getElementById('login-btn');

  if (isValidEmail(email) && pass.length >= 6) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', true);
  }
}

function doLogin() {
  const email = sanitizeInput(document.getElementById('inp-email').value.trim());
  const pass = document.getElementById('inp-pass').value;
  const errEl = document.getElementById('err-login');
  errEl.textContent = '';

  // Check brute force
  const attempt = checkLoginAttempts(email);
  if (attempt.blocked) {
    errEl.textContent = 'Too many failed attempts. Try again in ' + attempt.waitMins + ' minutes.';
    return;
  }

  const saved = localStorage.getItem('ilmpath_user');
  if (!saved) {
    errEl.textContent = 'No account found. Please sign up first.';
    return;
  }

  const user = JSON.parse(saved);

  if (user.email !== email) {
    recordFailedLogin(email);
    errEl.textContent = 'Email not found. Please check and try again.';
    return;
  }

  // Reset failed attempts on success
  resetLoginAttempts(email);
  saveLastLogin();
  localStorage.setItem('ilmpath_logged_in', 'true');

  // Check new device
  const isNewDevice = checkNewDevice();
  if (isNewDevice) {
    localStorage.setItem('acron_show_device_warning', 'true');
  }

  window.location.href = 'dashboard.html';
}