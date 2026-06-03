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
      '9':  ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Islamiat', 'Pakistan Studies'],
      '10': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Islamiat', 'Pakistan Studies'],
      '11': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Islamiat'],
      '12': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English', 'Urdu', 'Islamiat'],
    };
  
    const colors = ['#6c63ff','#34d399','#f87171','#fbbf24','#60a5fa','#f472b6','#a78bfa','#4ade80'];
    const list = document.getElementById('subjects-list');
    if (!list) return;
  
    const subs = subjects[cls] || subjects['9'];
    list.innerHTML = '';
  
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