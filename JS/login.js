import { firebaseLogin } from './firebase-config.js';

function togglePass() {
  const inp = document.getElementById('inp-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function validateLogin() {
  const email = document.getElementById('inp-email').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const btn = document.getElementById('login-btn');

  if (email.includes('@') && email.includes('.') && pass.length >= 6) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', true);
  }
}

async function doLogin() {
  const email = document.getElementById('inp-email').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const errEl = document.getElementById('err-login');
  errEl.textContent = '';

  // Check brute force
  const attempt = checkLoginAttempts(email);
  if (attempt.blocked) {
    errEl.textContent = 'Too many failed attempts. Try again in ' + attempt.waitMins + ' minutes.';
    return;
  }

  const btn = document.getElementById('login-btn');
  btn.setAttribute('disabled', true);
  btn.innerHTML = '<span>Logging in...</span>';

  try {
    const user = await firebaseLogin(email, pass);

    // Reset failed attempts
    resetLoginAttempts(email);
    saveLastLogin();

    // Save basic info locally
    localStorage.setItem('ilmpath_logged_in', 'true');
    localStorage.setItem('ilmpath_uid', user.uid);

    // Check new device
    const isNewDevice = checkNewDevice();
    if (isNewDevice) {
      localStorage.setItem('acron_show_device_warning', 'true');
    }

    window.location.href = 'dashboard.html';

  } catch (err) {
    console.log('Login error:', err);
    recordFailedLogin(email);

    btn.removeAttribute('disabled');
    btn.innerHTML = '<span>Log in</span>';

    const errMsg =
      err.code === 'auth/user-not-found' ? 'No account found with this email.' :
      err.code === 'auth/wrong-password' ? 'Wrong password. Please try again.' :
      err.code === 'auth/invalid-credential' ? 'Wrong email or password.' :
      'Login failed. Please try again.';

    errEl.textContent = errMsg;
  }
}