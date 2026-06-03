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
  
  function doLogin() {
    const email = document.getElementById('inp-email').value.trim();
    const errEl = document.getElementById('err-login');
  
    const saved = localStorage.getItem('ilmpath_user');
    if (!saved) {
      errEl.textContent = 'No account found. Please sign up first.';
      return;
    }
  
    const user = JSON.parse(saved);
  
    if (user.email !== email) {
      errEl.textContent = 'Email not found. Please check and try again.';
      return;
    }
  
    localStorage.setItem('ilmpath_logged_in', 'true');
    window.location.href = 'dashboard.html';
  }