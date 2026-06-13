import { firebaseGetUser } from './firebase-config.js';

let allHistory = [];

async function initProgress() {
  const loggedIn = localStorage.getItem('acron_logged_in');
  if (!loggedIn) {
    window.location.href = 'login.html';
    return;
  }

  const uid = localStorage.getItem('acron_uid');
  if (!uid) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const user = await firebaseGetUser(uid);
    if (!user) return;

    const history = user.quizHistory || [];
    allHistory = Array.isArray(history) ? history : Object.values(history);

    const chapters = user.chaptersRead || [];
    const chapArr = Array.isArray(chapters) ? chapters : Object.values(chapters);

    // Fill overall stats
    document.getElementById('prog-total').textContent = allHistory.length;
    document.getElementById('prog-chapters').textContent = chapArr.length;

    if (allHistory.length > 0) {
      const avg = Math.round(
        allHistory.reduce((a, b) => a + b.percent, 0) / allHistory.length
      );
      const best = Math.max(...allHistory.map(q => q.percent));
      document.getElementById('prog-avg').textContent = avg + '%';
      document.getElementById('prog-best').textContent = best + '%';
    }

    showSubjectBars();
    showHistory(allHistory);

  } catch (err) {
    console.log('Progress error:', err);
  }
}

function showSubjectBars() {
  const container = document.getElementById('subject-bars');
  if (!container) return;

  const subjects = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'];
  const colors = {
    Physics:     '#6c63ff',
    Chemistry:   '#34d399',
    Biology:     '#f87171',
    Mathematics: '#fbbf24',
    English:     '#60a5fa',
  };

  container.innerHTML = '';

  subjects.forEach(sub => {
    const subQuizzes = allHistory.filter(q => q.subject === sub);

    if (subQuizzes.length === 0) {
      const row = document.createElement('div');
      row.className = 'subject-bar-row';
      row.innerHTML = `
        <div class="bar-label">
          <span class="bar-name">${sub}</span>
          <span class="bar-count">No quizzes yet</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:0%;background:${colors[sub]}"></div>
        </div>
        <span class="bar-pct" style="color:${colors[sub]}">—</span>
      `;
      container.appendChild(row);
      return;
    }

    const avg = Math.round(
      subQuizzes.reduce((a, b) => a + b.percent, 0) / subQuizzes.length
    );

    const row = document.createElement('div');
    row.className = 'subject-bar-row';
    row.innerHTML = `
      <div class="bar-label">
        <span class="bar-name">${sub}</span>
        <span class="bar-count">${subQuizzes.length} quiz${subQuizzes.length > 1 ? 'zes' : ''}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:0%;background:${colors[sub]}"
          data-width="${avg}%"></div>
      </div>
      <span class="bar-pct" style="color:${colors[sub]}">${avg}%</span>
    `;
    container.appendChild(row);
  });

  setTimeout(() => {
    document.querySelectorAll('.bar-fill').forEach(bar => {
      bar.style.width = bar.getAttribute('data-width') || '0%';
    });
  }, 300);
}

function showHistory(list) {
  const container = document.getElementById('full-history');
  const emptyEl = document.getElementById('no-history');
  if (!container) return;

  container.innerHTML = '';

  if (list.length === 0) {
    emptyEl.style.display = 'flex';
    return;
  }

  emptyEl.style.display = 'none';

  const sorted = [...list].reverse();

  sorted.forEach(q => {
    const scoreClass = q.percent >= 70 ? 'score-good' :
                       q.percent >= 40 ? 'score-ok' : 'score-bad';

    const levelColors = {
      low:    { bg: 'rgba(52,211,153,0.1)',  color: '#34d399' },
      medium: { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24' },
      high:   { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
    };
    const lc = levelColors[q.level] || levelColors['low'];

    const item = document.createElement('div');
    item.className = 'history-full-item';
    item.innerHTML = `
      <div class="hfi-left">
        <div class="hfi-subject">${q.subject}</div>
        <div class="hfi-meta">Chapter ${q.chapter} — ${q.date}</div>
      </div>
      <div class="hfi-middle">
        <span class="hfi-level" style="background:${lc.bg};color:${lc.color}">
          ${q.level}
        </span>
      </div>
      <div class="hfi-right">
        <div class="hfi-score ${scoreClass}">${q.score}/${q.total}</div>
        <div class="hfi-pct ${scoreClass}">${q.percent}%</div>
      </div>
    `;
    container.appendChild(item);
  });
}

function filterHistory(subject, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (subject === 'all') {
    showHistory(allHistory);
  } else {
    showHistory(allHistory.filter(q => q.subject === subject));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initProgress();

  // Fix filter buttons since they use onclick
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const onclick = btn.getAttribute('onclick');
    if (onclick) {
      btn.removeAttribute('onclick');
      btn.addEventListener('click', () => {
        const match = onclick.match(/filterHistory\('(.+?)',\s*this\)/);
        if (match) filterHistory(match[1], btn);
      });
    }
  });
});