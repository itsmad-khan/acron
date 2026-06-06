function initDashboard() {
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
  
    // Show student name
    const hour = new Date().getHours();
    let greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    // Show last login
const lastLoginEl = document.getElementById('last-login-time');
if (lastLoginEl) lastLoginEl.textContent = getLastLogin();

// Show new device warning
if (localStorage.getItem('acron_show_device_warning') === 'true') {
  localStorage.removeItem('acron_show_device_warning');
  setTimeout(() => {
    const warn = document.getElementById('device-warning');
    if (warn) {
      warn.style.display = 'flex';
      setTimeout(() => warn.style.display = 'none', 5000);
    }
  }, 500);
}
    const greetEl = document.getElementById('dash-greeting');
    if (greetEl) greetEl.textContent = greet + ', ' + user.name + '! 👋';
  
    // Show board and class info
    const boardNames = {
      punjab: 'Punjab Board', sindh: 'Sindh Board',
      kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
    };
    const infoEl = document.getElementById('dash-info');
    if (infoEl) infoEl.textContent = (boardNames[user.board] || user.board) + ' — Class ' + user.cls;
  
    // Show first letter of name in avatar
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();
  
    // Show stats
    const history = user.quizHistory || [];
    document.getElementById('stat-quizzes').textContent = history.length;
    document.getElementById('stat-chapters').textContent = (user.chaptersRead || []).length;
  
    if (history.length > 0) {
      const avg = Math.round(history.reduce((a, b) => a + b.percent, 0) / history.length);
      document.getElementById('stat-avg').textContent = avg + '%';
    }
  
    // Load subjects for their class and board
    loadSubjects(user.board, user.cls);
  
    // Show quiz history
    showQuizHistory(history);
  }
  
  function loadSubjects(board, cls) {
    const subjects = {
      '9':  ['Physics','Chemistry','Biology','Mathematics','English'],
      '10': ['Physics','Chemistry','Biology','Mathematics','English'],
      '11': ['Physics','Chemistry','Biology','Mathematics','English'],
      '12': ['Physics','Chemistry','Biology','Mathematics','English'],
      'other': []
    };
  
    const colors = ['#6c63ff','#34d399','#f87171','#fbbf24','#60a5fa'];
    const list = document.getElementById('subjects-list');
    if (!list) return;
  
    const subs = subjects[cls] || subjects['9'];
    list.innerHTML = '';
  
    // If other/senior show message instead of subjects
    if (cls === 'other' || subs.length === 0) {
      list.innerHTML = `
        <div style="
          text-align:center;padding:2rem;
          background:rgba(108,99,255,0.08);
          border:1px solid rgba(108,99,255,0.2);
          border-radius:16px;
        ">
          <div style="font-size:32px;margin-bottom:10px">📄</div>
          <div style="font-size:15px;font-weight:700;color:#a78bfa;margin-bottom:6px">
            Welcome Senior Student!
          </div>
          <div style="font-size:13px;color:#6b7280;margin-bottom:1rem">
            You can upload any PDF and create a quiz from it
          </div>
          <div style="font-size:12px;color:#6c63ff;direction:rtl;margin-bottom:1rem">
            کوئی بھی پی ڈی ایف اپلوڈ کریں اور کوئز بنائیں
          </div>
          <a href="pdfquiz.html" style="
            display:inline-flex;align-items:center;gap:8px;
            background:linear-gradient(135deg,#6c63ff,#a855f7);
            color:#fff;text-decoration:none;
            padding:12px 24px;border-radius:12px;
            font-size:14px;font-weight:700;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Start PDF Quiz
          </a>
        </div>
      `;
      return;
    }
  
    subs.forEach((sub, i) => {
      const item = document.createElement('a');
      item.href = 'reader.html?subject=' + encodeURIComponent(sub);
      item.className = 'subject-item';
      item.innerHTML = `
        <div class="subject-left">
          <div class="subject-dot" style="background:${colors[i % colors.length]}"></div>
          <div>
            <div class="subject-name">${sub}</div>
          </div>
        </div>
        <svg class="subject-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      `;
      list.appendChild(item);
    });
  }
  function showQuizHistory(history) {
    const container = document.getElementById('quiz-history');
    if (!container) return;
  
    if (history.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <p>No quizzes yet. Pick a subject and start!</p>
        </div>`;
      return;
    }
  
    // Show last 5 quizzes
    const recent = history.slice(-5).reverse();
    container.innerHTML = '';
  
    recent.forEach(q => {
      const scoreClass = q.percent >= 70 ? 'score-good' : q.percent >= 40 ? 'score-ok' : 'score-bad';
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div class="hist-left">
          <div class="hist-name">${q.subject} — Ch.${q.chapter}</div>
          <div class="hist-meta">${q.level} — ${q.date}</div>
        </div>
        <div class="hist-score ${scoreClass}">${q.score}/${q.total}</div>
      `;
      container.appendChild(item);
    });
  }
  
  function logout() {
    localStorage.removeItem('ilmpath_logged_in');
    window.location.href = 'index.html';
  }