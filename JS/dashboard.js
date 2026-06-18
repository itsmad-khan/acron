import { firebaseGetUser, firebaseLogout } from './firebase-config.js';

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const BOARD_NAMES = {
  punjab:      'Punjab Board',
  sindh:       'Sindh Board',
  kpk:         'KPK Board',
  balochistan: 'Balochistan Board',
  federal:     'Federal Board',
};

const SUBJECT_COLORS = ['#7c6cf0', '#34d399', '#f87171', '#fbbf24', '#60a5fa'];

const SUBJECTS_BY_CLASS = {
  '9':    ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  '10':   ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  '11':   ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  '12':   ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  'other': [],
};

const QUOTES = [
  { en: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
  { en: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
  { en: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { en: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { en: "Believe you can and you are halfway there.", author: "Theodore Roosevelt" },
  { en: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { en: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { en: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { en: "Everything you have ever wanted is on the other side of fear.", author: "George Addair" },
  { en: "Success is not final, failure is not fatal — it is the courage to continue that counts.", author: "Winston Churchill" },
  { en: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
  { en: "You miss 100% of the shots you do not take.", author: "Wayne Gretzky" },
  { en: "Whether you think you can or you think you cannot, you are right.", author: "Henry Ford" },
  { en: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { en: "The mind is not a vessel to be filled but a fire to be kindled.", author: "Plutarch" },
  { en: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { en: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
  { en: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { en: "Knowledge is power.", author: "Francis Bacon" },
  { en: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
  { en: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein" },
  { en: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { en: "I have not failed. I have just found 10,000 ways that do not work.", author: "Thomas Edison" },
  { en: "It is never too late to be what you might have been.", author: "George Eliot" },
  { en: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { en: "An unexamined life is not worth living.", author: "Socrates" },
  { en: "Your time is limited, so do not waste it living someone else's life.", author: "Steve Jobs" },
  { en: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { en: "Creativity is intelligence having fun.", author: "Albert Einstein" },
  { en: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
  { en: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  { en: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { en: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { en: "Do not wait. The time will never be just right.", author: "Napoleon Hill" },
  { en: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
];

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */

/** Safely set textContent on an element by id */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/** Safely set innerHTML on an element by id */
function setHTML(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = value;
}

/** Return a greeting based on hour */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Return formatted last-login string from localStorage */
function getLastLogin() {
  const raw = localStorage.getItem('acron_last_login');
  if (!raw) return '—';
  try {
    return new Date(raw).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return raw;
  }
}

/** Normalise a quiz history value that may be array or object */
function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : Object.values(val);
}

/* ─────────────────────────────────────────
   Auth guard
───────────────────────────────────────── */
function requireAuth() {
  const loggedIn = localStorage.getItem('acron_logged_in');
  const uid      = localStorage.getItem('acron_uid');
  if (!loggedIn || !uid) {
    window.location.href = 'login.html';
    return null;
  }
  return uid;
}

/* ─────────────────────────────────────────
   Dashboard init
───────────────────────────────────────── */
async function initDashboard() {
  const uid = requireAuth();
  if (!uid) return;

  try {
    const user = await firebaseGetUser(uid);
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Persist fresh data
    localStorage.setItem('acron_user',  JSON.stringify({ ...user, uid }));
    localStorage.setItem('acron_board', user.board || 'none');
    localStorage.setItem('acron_class', user.cls   || 'other');

    renderHeader(user);
    renderStats(user);
    renderSubjects(user.board, user.cls);
    renderQuizHistory(toArray(user.quizHistory));
    renderMotivationalQuote();
    handleDeviceWarning();

  } catch (err) {
    console.error('[Dashboard] init error:', err);
  }
}

/* ─────────────────────────────────────────
   Render: header
───────────────────────────────────────── */
function renderHeader(user) {
  // Last login
  setText('last-login-time', getLastLogin());

  // Greeting
  setText('dash-greeting', `${getGreeting()}, ${user.name}! 👋`);

  // Board + class info
  const infoEl = document.getElementById('dash-info');
  if (infoEl) {
    infoEl.textContent = user.cls === 'other'
      ? 'Senior Student'
      : `${BOARD_NAMES[user.board] || user.board} — Class ${user.cls}`;
  }

  // Avatar initial
  setText('user-avatar', user.name.charAt(0).toUpperCase());

  // Streak (placeholder — replace with real streak logic if available)
  const streakCount = user.streak || 0;
  const streakEl = document.getElementById('streak-count');
  if (streakEl) {
    streakEl.textContent = streakCount === 1
      ? '1 day streak'
      : `${streakCount} day streak`;
  }
}

/* ─────────────────────────────────────────
   Render: stats
───────────────────────────────────────── */
function renderStats(user) {
  const quizArr = toArray(user.quizHistory);
  const chapArr = toArray(user.chaptersRead);

  setText('stat-quizzes',  quizArr.length);
  setText('stat-chapters', chapArr.length);

  if (quizArr.length > 0) {
    const avg = Math.round(
      quizArr.reduce((sum, q) => sum + (q.percent || 0), 0) / quizArr.length
    );
    setText('stat-avg', avg + '%');
  } else {
    setText('stat-avg', '—');
  }
}

/* ─────────────────────────────────────────
   Render: subjects
───────────────────────────────────────── */
function renderSubjects(board, cls) {
  const list = document.getElementById('subjects-list');
  if (!list) return;

  const subs = SUBJECTS_BY_CLASS[cls] || SUBJECTS_BY_CLASS['9'];

  if (!cls || cls === 'other' || subs.length === 0) {
    list.innerHTML = `
      <div style="
        text-align:center;padding:28px 20px;
        background:rgba(124,108,240,0.07);
        border:1px solid rgba(124,108,240,0.18);
        border-radius:18px;
      ">
        <div style="font-size:36px;margin-bottom:12px" aria-hidden="true">📄</div>
        <div style="font-size:15px;font-weight:800;color:var(--accent-light);margin-bottom:6px">
          Welcome, Senior Student!
        </div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5">
          Upload any PDF and generate a quiz from it
        </div>
        <a href="pdfquiz.html" style="
          display:inline-flex;align-items:center;gap:8px;
          background:linear-gradient(135deg,var(--accent),var(--accent-dark));
          color:#fff;text-decoration:none;
          padding:11px 22px;border-radius:10px;
          font-size:14px;font-weight:700;
          box-shadow:0 4px 14px rgba(124,108,240,0.35);
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          Start PDF Quiz
        </a>
      </div>`;
    return;
  }

  list.innerHTML = '';
  subs.forEach((sub, i) => {
    const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
    const item  = document.createElement('a');
    item.href      = `reader.html?subject=${encodeURIComponent(sub)}`;
    item.className = 'subject-item';
    item.setAttribute('aria-label', sub);
    item.innerHTML = `
      <div class="subject-left">
        <span class="subject-dot" style="background:${color}" aria-hidden="true"></span>
        <span>${sub}</span>
      </div>
      <svg class="subject-arrow" width="16" height="16" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="9 18 15 12 9 6"/>
      </svg>`;
    list.appendChild(item);
  });
}

/* ─────────────────────────────────────────
   Render: quiz history
───────────────────────────────────────── */
function renderQuizHistory(history) {
  const container = document.getElementById('quiz-history');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state" role="status">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <p>No quizzes yet. Pick a subject and start!</p>
      </div>`;
    return;
  }

  const recent = [...history].reverse().slice(0, 5);
  container.innerHTML = '';

  recent.forEach(q => {
    const pct         = q.percent || 0;
    const scoreClass  = pct >= 70 ? 'score-good' : pct >= 40 ? 'score-ok' : 'score-bad';
    const item        = document.createElement('div');
    item.className    = 'history-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML    = `
      <div class="hist-left">
        <div class="hist-name">${escapeHTML(q.subject)} — Ch.${escapeHTML(String(q.chapter))}</div>
        <div class="hist-meta">${escapeHTML(q.level)} · ${escapeHTML(q.date)}</div>
      </div>
      <div class="hist-score ${scoreClass}" aria-label="${q.score} out of ${q.total}">
        ${q.score}/${q.total}
      </div>`;
    container.appendChild(item);
  });
}

/* ─────────────────────────────────────────
   Render: motivational quote
───────────────────────────────────────── */
function renderMotivationalQuote() {
  const el = document.getElementById('quote-text');
  if (!el) return;

  // Show a different quote each day (consistent within the day)
  const dayIndex = Math.floor(Date.now() / 86_400_000) % QUOTES.length;
  const quote    = QUOTES[dayIndex];

  el.innerHTML = `
    <span class="quote-en" style="
      display:block;font-size:14px;font-weight:600;
      color:var(--text-secondary);line-height:1.55;
      font-style:italic;margin-bottom:6px;
    ">"${escapeHTML(quote.en)}"</span>
    <span class="quote-author" style="
      display:block;font-size:12px;font-weight:700;
      color:var(--accent-light);
    ">— ${escapeHTML(quote.author)}</span>`;
}

/* ─────────────────────────────────────────
   Device warning banner
───────────────────────────────────────── */
function handleDeviceWarning() {
  if (localStorage.getItem('acron_show_device_warning') !== 'true') return;
  localStorage.removeItem('acron_show_device_warning');

  setTimeout(() => {
    const warn = document.getElementById('device-warning');
    if (!warn) return;
    warn.style.display = 'flex';
    // Auto-dismiss after 6 s
    setTimeout(() => { warn.style.display = 'none'; }, 6000);
  }, 500);
}

/* ─────────────────────────────────────────
   Security helper: escape user-provided strings
───────────────────────────────────────── */
function escapeHTML(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ─────────────────────────────────────────
   Logout
───────────────────────────────────────── */
function logout() {
  try { firebaseLogout(); } catch (e) { console.warn('[Logout]', e); }
  localStorage.removeItem('acron_logged_in');
  localStorage.removeItem('acron_uid');
  localStorage.removeItem('acron_user');
  window.location.href = 'login.html';
}

/* ─────────────────────────────────────────
   Boot
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logout-btn')
    ?.addEventListener('click', logout);

  initDashboard();
});