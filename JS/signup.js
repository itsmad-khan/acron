let selectedMedium = 'english';

window.addEventListener('DOMContentLoaded', () => {
  const board = localStorage.getItem('ilmpath_board') || 'punjab';
  const cls = localStorage.getItem('ilmpath_class') || '9';
  const boardNames = {
    punjab: 'Punjab Board', sindh: 'Sindh Board',
    kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
  };
  const el = document.getElementById('selected-text');
  if (el) el.textContent = `${boardNames[board] || board} — Class ${cls}`;
});

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
  let valid = true;

  document.getElementById('err-name').textContent = '';
  document.getElementById('err-email').textContent = '';
  document.getElementById('err-pass').textContent = '';
  document.getElementById('err-pass2').textContent = '';

  if (name.length < 2) valid = false;
  if (!email.includes('@') || !email.includes('.')) valid = false;
  if (pass.length < 6) valid = false;
  if (pass2 && pass !== pass2) {
    document.getElementById('err-pass2').textContent = 'Passwords do not match';
    valid = false;
  }

  const btn = document.getElementById('signup-btn');
  if (valid && name && email && pass && pass2) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', true);
  }
}

function doSignup() {
  const name = document.getElementById('inp-name').value.trim();
  const email = document.getElementById('inp-email').value.trim();
  const pass = document.getElementById('inp-pass').value;
  const pass2 = document.getElementById('inp-pass2').value;

  if (!name || !email || !pass || pass !== pass2) return;

  // Save user to localStorage (in real website this goes to your database)
  const user = {
    name,
    email,
    board: localStorage.getItem('ilmpath_board') || 'punjab',
    cls: localStorage.getItem('ilmpath_class') || '9',
    medium: selectedMedium,
    createdAt: new Date().toISOString(),
    quizHistory: [],
    chaptersRead: []
  };
  localStorage.setItem('ilmpath_user', JSON.stringify(user));
  localStorage.setItem('ilmpath_logged_in', 'true');

  const btn = document.getElementById('signup-btn');
  btn.setAttribute('disabled', true);
  btn.innerHTML = '<span>Creating account...</span>';

  const msg = document.getElementById('success-msg');
  msg.classList.add('show');

  setTimeout(() => {
    window.location.href = 'dashboard.html';
  }, 1500);
}