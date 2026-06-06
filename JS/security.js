// ===== INPUT SANITIZATION =====
function sanitizeInput(str) {
    if (!str) return '';
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }
  
  // ===== EMAIL VALIDATION =====
  function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  // ===== PASSWORD STRENGTH =====
  function isStrongPassword(pass) {
    if (pass.length < 8) return { strong: false, msg: 'Password must be at least 8 characters.' };
    if (!/[A-Z]/.test(pass)) return { strong: false, msg: 'Password must have at least one capital letter.' };
    if (!/[0-9]/.test(pass)) return { strong: false, msg: 'Password must have at least one number.' };
    return { strong: true, msg: 'Strong password!' };
  }
  
  // ===== BRUTE FORCE PROTECTION =====
  function checkLoginAttempts(email) {
    const key = 'acron_attempts_' + email;
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : { count: 0, time: Date.now() };
  
    // Reset after 10 minutes
    if (Date.now() - data.time > 10 * 60 * 1000) {
      localStorage.removeItem(key);
      return { blocked: false, remaining: 5 };
    }
  
    if (data.count >= 5) {
      const waitMins = Math.ceil((10 * 60 * 1000 - (Date.now() - data.time)) / 60000);
      return { blocked: true, waitMins };
    }
  
    return { blocked: false, remaining: 5 - data.count };
  }
  
  function recordFailedLogin(email) {
    const key = 'acron_attempts_' + email;
    const saved = localStorage.getItem(key);
    const data = saved ? JSON.parse(saved) : { count: 0, time: Date.now() };
    data.count++;
    data.time = Date.now();
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  function resetLoginAttempts(email) {
    localStorage.removeItem('acron_attempts_' + email);
  }
  
  // ===== LAST LOGIN TIME =====
  function saveLastLogin() {
    const now = new Date();
    const timeStr = now.toLocaleString('en-PK');
    localStorage.setItem('acron_last_login', timeStr);
  }
  
  function getLastLogin() {
    return localStorage.getItem('acron_last_login') || 'First login';
  }
  
  // ===== NEW LOGIN DEVICE WARNING =====
  function checkNewDevice() {
    const savedDevice = localStorage.getItem('acron_device');
    const currentDevice = navigator.userAgent;
  
    if (!savedDevice) {
      localStorage.setItem('acron_device', currentDevice);
      return false;
    }
  
    if (savedDevice !== currentDevice) {
      localStorage.setItem('acron_device', currentDevice);
      return true; // New device detected
    }
  
    return false;
  }