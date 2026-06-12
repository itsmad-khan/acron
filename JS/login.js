import { firebaseLogin, sendEmailVerification } from './firebase-config.js';

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

    // Check if email is verified
    if (!user.emailVerified) {
      btn.removeAttribute('disabled');
      btn.innerHTML = '<span>Log in</span>';
      errEl.innerHTML = `
        <div style="margin-bottom:8px">
          Email not verified yet. Please check your inbox and spam folder.
        </div>
        <button id="resend-btn" style="
          color:#a78bfa;background:rgba(108,99,255,0.1);
          border:1px solid rgba(108,99,255,0.3);
          padding:6px 14px;border-radius:8px;
          cursor:pointer;font-size:12px;
          font-family:Nunito,sans-serif;font-weight:700;
        ">
          Resend verification email
        </button>
      `;
    
      // Add resend button listener
      setTimeout(() => {
        const resendBtn = document.getElementById('resend-btn');
        if (resendBtn) {
          resendBtn.addEventListener('click', async () => {
            try {
              await sendEmailVerification(user);
              resendBtn.textContent = 'Email sent! Check your inbox.';
              resendBtn.style.color = '#34d399';
            } catch (e) {
              resendBtn.textContent = 'Could not send. Try again later.';
            }
          });
        }
      }, 100);
      return;
    }
    async function resendVerification(email, pass) {
      try {
        const user = await firebaseLogin(email, pass);
        await sendEmailVerification(user);
        alert('Verification email sent! Please check your inbox.');
      } catch (err) {
        alert('Could not resend email. Please try again.');
      }
    }

    localStorage.setItem('acron_logged_in', 'true');
    localStorage.setItem('acron_uid', user.uid);

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

window.addEventListener('DOMContentLoaded', () => {
  const emailInp = document.getElementById('inp-email');
  const passInp = document.getElementById('inp-pass');
  const eyeBtn = document.getElementById('eye-btn');
  const loginBtn = document.getElementById('login-btn');

  if (emailInp) emailInp.addEventListener('input', validateLogin);
  if (passInp) passInp.addEventListener('input', validateLogin);
  if (eyeBtn) eyeBtn.addEventListener('click', togglePass);
  if (loginBtn) loginBtn.addEventListener('click', doLogin);
});