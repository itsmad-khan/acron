import { firebaseSignup, sendEmailVerification } from './firebase-config.js';

let selectedMedium = 'english';

function setMedium(m) {
  selectedMedium = m;
  document.getElementById('med-en').classList.toggle('active', m === 'english');
  document.getElementById('med-ur').classList.toggle('active', m === 'urdu');
}

function togglePass() {
  const inp = document.getElementById('inp-pass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function checkStrength() {
  const pass = document.getElementById('inp-pass').value;
  const fill = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (!pass) { fill.style.width = '0'; label.textContent = ''; return; }
  let score = 0;
  if (pass.length >= 6) score++;
  if (pass.length >= 10) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^a-zA-Z0-9]/.test(pass)) score++;
  const levels = [
    { w: '20%', color: '#f87171', lbl: 'Weak' },
    { w: '40%', color: '#f87171', lbl: 'Weak' },
    { w: '60%', color: '#fbbf24', lbl: 'OK' },
    { w: '80%', color: '#34d399', lbl: 'Good' },
    { w: '100%', color: '#34d399', lbl: 'Strong' },
  ];
  const lvl = levels[Math.min(score, 4)];
  fill.style.width = lvl.w;
  fill.style.background = lvl.color;
  label.textContent = lvl.lbl;
  label.style.color = lvl.color;
}

function validate() {
  const name = document.getElementById('inp-name').value.trim();
  const email = document.getElementById('inp-email').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const pass2 = document.getElementById('inp-pass2').value;
  const btn = document.getElementById('signup-btn');

  document.getElementById('err-name').textContent = '';
  document.getElementById('err-email').textContent = '';
  document.getElementById('err-pass').textContent = '';
  document.getElementById('err-pass2').textContent = '';

  let valid = true;
  if (name.length < 2) valid = false;
  if (!email.includes('@') || !email.includes('.')) valid = false;
  if (pass.length < 6) valid = false;
  if (pass2 && pass !== pass2) {
    document.getElementById('err-pass2').textContent = 'Passwords do not match';
    valid = false;
  }

  if (valid && name && email && pass && pass2) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', true);
  }
}

async function doSignup() {
  const name = document.getElementById('inp-name').value.trim();
  const email = document.getElementById('inp-email').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const pass2 = document.getElementById('inp-pass2').value;

  if (!name || !email || !pass || pass !== pass2) return;

  const board = localStorage.getItem('acron_board') || 'none';
  const cls = localStorage.getItem('acron_class') || '9';

  const btn = document.getElementById('signup-btn');
  btn.setAttribute('disabled', true);
  btn.innerHTML = '<span>Creating account...</span>';

  try {
    // Create account in Firebase
    const user = await firebaseSignup(name, email, pass, board, cls, selectedMedium);

    // Save basic info locally
    localStorage.setItem('acron_logged_in', 'true');
    localStorage.setItem('acron_uid', user.uid);
    localStorage.setItem('acron_user', JSON.stringify({
      name, email, board, cls,
      medium: selectedMedium,
      uid: user.uid
    }));

    saveLastLogin();

    // Show verification message
    const msg = document.getElementById('success-msg');
    msg.innerHTML = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
  <div>
    <div style="font-weight:800;margin-bottom:6px">Account created! 🎉</div>
    <div style="font-size:13px;margin-bottom:8px">
      We sent a verification email to <strong>${email}</strong>
    </div>
    <div style="
      background:rgba(251,191,36,0.1);
      border:1px solid rgba(251,191,36,0.25);
      border-radius:8px;
      padding:8px 12px;
      font-size:12px;
      color:#fbbf24;
      margin-bottom:6px;
    ">
      ⚠️ <strong>Important:</strong> The email may go to your 
      <strong>Spam</strong> or <strong>Promotions</strong> folder.
      Please check there if you do not see it in inbox!
    </div>
    <div style="font-size:12px;color:#9ca3af;">
      After verifying your email — come back here and log in.
    </div>
    
  </div>
`;
    msg.classList.add('show');
    msg.style.alignItems = 'flex-start';

    btn.removeAttribute('disabled');
    btn.innerHTML = '<span>Create my account</span>';

  } catch (err) {
    console.log('Signup error:', err);
    btn.removeAttribute('disabled');
    btn.innerHTML = '<span>Create my account</span>';

    if (err.code === 'auth/email-already-in-use') {
      document.getElementById('err-email').innerHTML = `
        This email is already registered. 
        <a href="login.html" style="color:#a78bfa;font-weight:700">Log in here</a>
        or check your inbox for the verification email.
      `;
    } else if (err.code === 'auth/weak-password') {
      document.getElementById('err-email').textContent = 'Password is too weak. Use at least 6 characters.';
    } else {
      document.getElementById('err-email').textContent = 'Error creating account. Please try again.';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const board = localStorage.getItem('acron_board') || 'none';
  const cls = localStorage.getItem('acron_class') || '9';

  const boardNames = {
    punjab: 'Punjab Board', sindh: 'Sindh Board',
    kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
  };

  const el = document.getElementById('selected-text');
  if (el) {
    if (cls === 'other') {
      el.textContent = 'Senior Student — PDF Quiz access';
    } else {
      el.textContent = (boardNames[board] || board) + ' — Class ' + cls;
    }
  }

  const nameInp = document.getElementById('inp-name');
  const emailInp = document.getElementById('inp-email');
  const passInp = document.getElementById('inp-pass');
  const pass2Inp = document.getElementById('inp-pass2');
  const eyeBtn = document.getElementById('eye-btn');
  const signupBtn = document.getElementById('signup-btn');
  const medEn = document.getElementById('med-en');
  const medUr = document.getElementById('med-ur');

  if (nameInp) nameInp.addEventListener('input', validate);
  if (emailInp) emailInp.addEventListener('input', validate);
  if (passInp) passInp.addEventListener('input', () => { validate(); checkStrength(); });
  if (pass2Inp) pass2Inp.addEventListener('input', validate);
  if (eyeBtn) eyeBtn.addEventListener('click', togglePass);
  if (signupBtn) signupBtn.addEventListener('click', doSignup);
  if (medEn) medEn.addEventListener('click', () => setMedium('english'));
  if (medUr) medUr.addEventListener('click', () => setMedium('urdu'));
});