/* ============================================================
   progress.js — My Progress page
   ============================================================ */

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'];

const SUBJECT_COLORS = {
  Physics:     '#7c6cf0',
  Chemistry:   '#34d399',
  Biology:     '#f87171',
  Mathematics: '#fbbf24',
  English:     '#60a5fa',
};

const LEVEL_STYLES = {
  low:    { bg: 'rgba(52,211,153,0.12)',  color: '#34d399' },
  medium: { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
  high:   { bg: 'rgba(248,113,113,0.12)', color: '#f87171' },
};

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let allHistory = [];

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : Object.values(val);
}

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
   Auth guard
───────────────────────────────────────── */
function requireAuth() {
  if (!localStorage.getItem('acron_logged_in')) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
function initProgress() {
  if (!requireAuth()) return;

  let user = {};
  try {
    const raw = localStorage.getItem('acron_user');
    user = raw ? JSON.parse(raw) : {};
  } catch {
    console.error('[Progress] Could not parse user data.');
  }

  allHistory = toArray(user.quizHistory);
  const chapters = toArray(user.chaptersRead);

  renderStats(allHistory, chapters);
  renderSubjectBars(allHistory);
  renderHistory(allHistory);
}

/* ─────────────────────────────────────────
   Render: overall stats
───────────────────────────────────────── */
function renderStats(history, chapters) {
  setText('prog-total',    history.length);
  setText('prog-chapters', chapters.length);

  if (history.length === 0) {
    setText('prog-avg',  '—');
    setText('prog-best', '—');
    return;
  }

  const percents = history.map(q => q.percent ?? 0);
  const avg      = Math.round(percents.reduce((a, b) => a + b, 0) / percents.length);
  const best     = Math.max(...percents);

  setText('prog-avg',  avg  + '%');
  setText('prog-best', best + '%');
}

/* ─────────────────────────────────────────
   Render: subject progress bars
───────────────────────────────────────── */
function renderSubjectBars(history) {
  const container = document.getElementById('subject-bars');
  if (!container) return;

  const frag = document.createDocumentFragment();

  SUBJECTS.forEach(sub => {
    const subQuizzes = history.filter(q => q.subject === sub);
    const color      = SUBJECT_COLORS[sub] ?? '#7c6cf0';
    const hasData    = subQuizzes.length > 0;

    const avg = hasData
      ? Math.round(subQuizzes.reduce((a, b) => a + (b.percent ?? 0), 0) / subQuizzes.length)
      : 0;

    const countLabel = hasData
      ? `${subQuizzes.length} quiz${subQuizzes.length !== 1 ? 'zes' : ''}`
      : 'No quizzes yet';

    const row = document.createElement('div');
    row.className = 'subject-bar-item';
    row.setAttribute('role', 'listitem');
    row.innerHTML = `
      <div class="subject-bar-top">
        <span class="subject-bar-name">
          <span class="subject-bar-dot" style="background:${color}" aria-hidden="true"></span>
          ${escapeHTML(sub)}
        </span>
        <span class="subject-bar-score" style="color:${color}">
          ${hasData ? avg + '%' : '—'}
        </span>
      </div>
      <div class="subject-bar-track" role="progressbar"
           aria-label="${escapeHTML(sub)} average score"
           aria-valuenow="${avg}" aria-valuemin="0" aria-valuemax="100">
        <div class="subject-bar-fill"
             data-width="${avg}%"
             style="width:0%;background:${color}">
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${escapeHTML(countLabel)}</div>`;

    frag.appendChild(row);
  });

  container.innerHTML = '';
  container.appendChild(frag);

  // Animate bars after paint
  requestAnimationFrame(() => {
    setTimeout(() => {
      container.querySelectorAll('.subject-bar-fill').forEach(bar => {
        bar.style.width = bar.getAttribute('data-width') ?? '0%';
      });
    }, 100);
  });
}

/* ─────────────────────────────────────────
   Render: quiz history list
───────────────────────────────────────── */
function renderHistory(list) {
  const container = document.getElementById('full-history');
  const emptyEl   = document.getElementById('no-history');
  if (!container) return;

  container.innerHTML = '';

  if (list.length === 0) {
    if (emptyEl) emptyEl.style.display = 'flex';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  const frag   = document.createDocumentFragment();
  const sorted = [...list].reverse(); // newest first

  sorted.forEach(q => {
    const pct        = q.percent ?? 0;
    const scoreClass = pct >= 70 ? 'score-good' : pct >= 40 ? 'score-ok' : 'score-bad';
    const badgeClass = pct >= 70 ? 'good' : pct >= 40 ? 'mid' : 'low';
    const lc         = LEVEL_STYLES[q.level] ?? LEVEL_STYLES.low;

    const item = document.createElement('div');
    item.className = 'history-full-item';
    item.setAttribute('role', 'listitem');
    item.innerHTML = `
      <div class="history-score-badge ${badgeClass}"
           aria-label="${pct}%">
        ${pct}%
      </div>
      <div class="hfi-left" style="flex:1;min-width:0">
        <div class="hfi-subject">${escapeHTML(q.subject)}</div>
        <div class="hfi-meta">
          Chapter ${escapeHTML(String(q.chapter))} ·
          <span class="hfi-level"
            style="background:${lc.bg};color:${lc.color};
                   padding:2px 8px;border-radius:20px;font-size:11px;
                   font-weight:700;text-transform:capitalize;display:inline-block">
            ${escapeHTML(q.level)}
          </span>
          · ${escapeHTML(q.date)}
        </div>
      </div>
      <div class="hfi-right">
        <div class="hfi-score ${scoreClass}" aria-label="${q.score} out of ${q.total}">
          ${escapeHTML(String(q.score))}/${escapeHTML(String(q.total))}
        </div>
      </div>`;

    frag.appendChild(item);
  });

  container.appendChild(frag);
}

/* ─────────────────────────────────────────
   Filter
───────────────────────────────────────── */
function filterHistory(subject, btn) {
  // Update active filter button
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
  }

  const filtered = subject === 'all'
    ? allHistory
    : allHistory.filter(q => q.subject === subject);

  renderHistory(filtered);
}

/* ─────────────────────────────────────────
   Exports
───────────────────────────────────────── */
window.initProgress   = initProgress;
window.filterHistory  = filterHistory;