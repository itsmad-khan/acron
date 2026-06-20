import { firebaseSaveQuiz } from './firebase-config.js';

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const SUBJECTS_BY_CLASS = {
  '9':  ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  '10': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  '11': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
  '12': ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'],
};

const CHAPTER_COUNTS = {
  Physics:     12,
  Chemistry:   8,
  Biology:     10,
  Mathematics: 7,
  English:     5,
};

const DEFAULT_CHAPTER_COUNT = 5;

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let currentQuiz = [];
let currentQ    = 0;
let userAnswers = [];
let quizMeta    = {};

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showSection(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}

function hideSection(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function showFlex(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
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

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getLocalUser() {
  try {
    const raw = localStorage.getItem('acron_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    console.error('[Quiz] Could not parse local user data.');
    return null;
  }
}

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
function initQuiz() {
  if (!localStorage.getItem('acron_logged_in')) {
    window.location.href = 'login.html';
    return;
  }

  const user = getLocalUser();
  if (!user) return;

  // Senior students use the PDF quiz flow instead
  if (user.cls === 'other') {
    window.location.href = 'pdfquiz.html';
    return;
  }

  const sel = document.getElementById('sel-subject');
  if (!sel) return;

  const subs = SUBJECTS_BY_CLASS[user.cls] ?? SUBJECTS_BY_CLASS['9'];
  subs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });

  // Remember class for the AI prompt (used in fetchQuestionsFromAI)
  quizMeta.cls = user.cls;

  // Pre-fill from URL params (e.g. coming from reader.html)
  const params     = new URLSearchParams(window.location.search);
  const subFromURL = params.get('subject');
  const chFromURL  = params.get('chapter');

  if (subFromURL) {
    sel.value = subFromURL;
    loadChapters();
    if (chFromURL) {
      setTimeout(() => {
        const chSel = document.getElementById('sel-chapter');
        if (chSel) chSel.value = chFromURL;
        checkOldQuiz();
      }, 100);
    }
  }
}

/* ─────────────────────────────────────────
   Chapter loading
───────────────────────────────────────── */
function loadChapters() {
  const subject = document.getElementById('sel-subject')?.value;
  const chSel    = document.getElementById('sel-chapter');
  if (!chSel) return;

  chSel.innerHTML = '<option value="">— Pick a chapter —</option>';
  chSel.disabled  = !subject;
  chSel.setAttribute('aria-disabled', !subject ? 'true' : 'false');

  if (!subject) { checkGenBtn(); return; }

  const count = CHAPTER_COUNTS[subject] ?? DEFAULT_CHAPTER_COUNT;
  for (let i = 1; i <= count; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Chapter ${i}`;
    chSel.appendChild(opt);
  }

  chSel.onchange = checkOldQuiz;
  checkGenBtn();
}

/* ─────────────────────────────────────────
   Difficulty selection
───────────────────────────────────────── */
function selectLevel(el, level) {
  document.querySelectorAll('.level-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  quizMeta.level = level;
  checkOldQuiz();
  checkGenBtn();
}

function checkGenBtn() {
  const subject = document.getElementById('sel-subject')?.value;
  const chapter = document.getElementById('sel-chapter')?.value;
  const btn     = document.getElementById('gen-btn');
  if (!btn) return;

  const ready = !!(subject && chapter && quizMeta.level);
  btn.toggleAttribute('disabled', !ready);
  btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
}

/* ─────────────────────────────────────────
   Previous-attempt detection
───────────────────────────────────────── */
function findOldQuiz(subject, chapter, level) {
  const user = getLocalUser();
  if (!user) return null;
  const history = Array.isArray(user.quizHistory)
    ? user.quizHistory
    : Object.values(user.quizHistory ?? {});

  return history.find(q =>
    q.subject === subject &&
    String(q.chapter) === String(chapter) &&
    q.level === level
  ) ?? null;
}

function checkOldQuiz() {
  const subject = document.getElementById('sel-subject')?.value;
  const chapter = document.getElementById('sel-chapter')?.value;
  const level   = quizMeta.level;
  const promptEl = document.getElementById('old-quiz-prompt');

  checkGenBtn();
  if (!promptEl) return;

  if (!subject || !chapter || !level) {
    promptEl.style.display = 'none';
    return;
  }

  const old = findOldQuiz(subject, chapter, level);
  if (old) {
    promptEl.style.display = 'flex';
    setText('old-quiz-meta',
      `${subject} Ch.${chapter} — ${capitalize(old.level)} — Score: ${old.score}/${old.total}`);
  } else {
    promptEl.style.display = 'none';
  }
}

/* ─────────────────────────────────────────
   Generate quiz (AI)
───────────────────────────────────────── */
async function generateNewQuiz() {
  const subject = document.getElementById('sel-subject')?.value;
  const chapter = document.getElementById('sel-chapter')?.value;
  const level   = quizMeta.level;
  const qcount  = document.getElementById('qcount-range')?.value ?? '10';

  if (!subject || !chapter || !level) return;

  quizMeta = { ...quizMeta, subject, chapter, level, total: parseInt(qcount, 10) };

  hideSection('quiz-setup');
  showFlex('quiz-loading');

  try {
    const questions = await fetchQuestionsFromAI(subject, chapter, level, qcount);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI returned no questions. Please try again.');
    }

    currentQuiz  = questions;
    currentQ     = 0;
    userAnswers  = new Array(questions.length).fill(null);
    showQuizActive();

  } catch (err) {
    console.error('[Quiz] generate:', err);
    hideSection('quiz-loading');
    showSection('quiz-setup');
    alert('Error: ' + (err.message || 'Something went wrong. Please try again.'));
  }
}

/* ─────────────────────────────────────────
   AI API call — Pakistani board-style MCQs
   with per-option explanations (preserved exactly
   as the prompt you wrote, including the
   ✓ Correct: / ✗ Wrong: explanation style).
───────────────────────────────────────── */
async function fetchQuestionsFromAI(subject, chapter, level, count) {
  const levelDesc = {
    low:    'very easy basic recall questions, multiple choice',
    medium: 'medium difficulty application questions, multiple choice',
    high:   'hard exam level analytical questions, multiple choice',
  };

  const prompt = `You are a Pakistani board exam question maker. Generate ${count} exam-style multiple choice questions for Class ${quizMeta.cls || '12'} students studying ${subject}, Chapter ${chapter}.

Style rules:
- Questions must follow Pakistani BISE board exam style
- Use proper academic English
- Mix of knowledge, understanding and application questions
- Questions should be clear and unambiguous
- Options should be plausible — not obviously wrong
- Difficulty: ${levelDesc[level] ?? 'medium difficulty'}

Return ONLY a JSON array. No extra text. No markdown. Format:
[
  {
    "q": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanations": [
      "Why option A is correct or wrong — one clear sentence.",
      "Why option B is correct or wrong — one clear sentence.",
      "Why option C is correct or wrong — one clear sentence.",
      "Why option D is correct or wrong — one clear sentence."
    ]
  }
]
"answer" is the index (0,1,2,3) of the correct option.
"explanations" has exactly 4 items — one explanation for EACH option.
For correct option start with "✓ Correct:" and for wrong options start with "✗ Wrong:".
Keep each explanation to one sentence maximum.`;

  let response;
  try {
    response = await fetch('/api/quiz', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt }),
    });
  } catch {
    throw new Error('Could not connect to AI. Check your internet connection.');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const raw  = data?.choices?.[0]?.message?.content;
  if (!raw) throw new Error('No response from AI. Please try again.');

  const clean = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('AI returned an unexpected format. Please try again.');
  }
}

/* ─────────────────────────────────────────
   Load a previously-saved quiz
───────────────────────────────────────── */
function loadOldQuiz() {
  const subject = document.getElementById('sel-subject')?.value;
  const chapter = document.getElementById('sel-chapter')?.value;
  const level   = quizMeta.level;

  const old = findOldQuiz(subject, chapter, level);
  if (!old || !old.questions) return;

  quizMeta    = { ...quizMeta, subject, chapter, level, total: old.questions.length };
  currentQuiz = old.questions;
  currentQ    = 0;
  userAnswers = new Array(old.questions.length).fill(null);

  hideSection('quiz-setup');
  showQuizActive();
}

/* ─────────────────────────────────────────
   Quiz active view
───────────────────────────────────────── */
function showQuizActive() {
  hideSection('quiz-loading');
  showSection('quiz-active');
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuiz[currentQ];
  if (!q) return;

  const total = currentQuiz.length;
  const pct   = ((currentQ + 1) / total) * 100;

  const fill = document.getElementById('quiz-progress-fill');
  if (fill) {
    fill.style.width = pct + '%';
    fill.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', Math.round(pct));
  }

  setText('quiz-counter', `Question ${currentQ + 1} of ${total}`);
  setText('quiz-label-top',
    `${quizMeta.subject} — Chapter ${quizMeta.chapter} — ${capitalize(quizMeta.level)}`);
  setText('question-text', q.q);

  // Remove any leftover explanation blocks from the previous question
  document.querySelectorAll('.option-explanation').forEach(e => e.remove());
  document.getElementById('quiz-explanation')?.remove();

  const optList = document.getElementById('options-list');
  if (!optList) return;
  optList.innerHTML = '';

  const letters  = ['A', 'B', 'C', 'D'];
  const answered = userAnswers[currentQ] !== null;

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `Option ${letters[i]}: ${opt}`);
    btn.innerHTML = `<span class="opt-letter" aria-hidden="true">${letters[i]}</span>${escapeHTML(opt)}`;

    if (answered) {
      btn.disabled = true;
      if (i === q.answer)                   btn.classList.add('correct');
      else if (i === userAnswers[currentQ]) btn.classList.add('wrong');
    } else {
      btn.addEventListener('click', () => selectAnswer(i));
    }

    optList.appendChild(btn);
  });

  // If this question was already answered (e.g. navigating back),
  // re-show the explanations under each option.
  if (answered) {
    renderExplanations(q);
  }

  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  if (prevBtn) prevBtn.disabled = currentQ === 0;

  if (nextBtn) {
    const isLast = currentQ === total - 1;
    nextBtn.innerHTML = isLast
      ? `Submit <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
      : `Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    nextBtn.onclick = isLast ? submitQuiz : nextQ;
    nextBtn.setAttribute('aria-label', isLast ? 'Submit quiz' : 'Next question');
  }
}

/* ─────────────────────────────────────────
   Per-option explanations
   (your feature — shows a short note under
   each option once the question is answered)
───────────────────────────────────────── */
function renderExplanations(q) {
  if (!q.explanations || !Array.isArray(q.explanations)) return;

  const optList = document.getElementById('options-list');
  if (!optList) return;

  const btns = optList.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    const text = q.explanations[i];
    if (!text) return;

    const expDiv = document.createElement('div');
    expDiv.className = 'option-explanation ' +
      (i === q.answer ? 'opt-exp-correct' : 'opt-exp-wrong');
    expDiv.textContent = text; // textContent — safe even though it may contain ✓/✗ symbols
    expDiv.setAttribute('role', 'note');
    btn.after(expDiv);
  });
}

function selectAnswer(index) {
  if (userAnswers[currentQ] !== null) return; // already answered
  userAnswers[currentQ] = index;

  const q    = currentQuiz[currentQ];
  const btns = document.querySelectorAll('#options-list .option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer)  btn.classList.add('correct');
    else if (i === index) btn.classList.add('wrong');
  });

  renderExplanations(q);
}

function nextQ() {
  if (currentQ < currentQuiz.length - 1) {
    currentQ++;
    renderQuestion();
  }
}

function prevQ() {
  if (currentQ > 0) {
    currentQ--;
    renderQuestion();
  }
}

/* ─────────────────────────────────────────
   Submit & results
───────────────────────────────────────── */
function submitQuiz() {
  let score = 0;
  currentQuiz.forEach((q, i) => { if (userAnswers[i] === q.answer) score++; });

  const total   = currentQuiz.length;
  const percent = Math.round((score / total) * 100);

  saveQuizResult(score, total, percent);

  hideSection('quiz-active');
  showSection('quiz-results');

  setText('result-icon',
    percent >= 80 ? '🏆' :
    percent >= 60 ? '👍' :
    percent >= 40 ? '📚' : '💪'
  );

  setText('result-score',   `${score} / ${total}`);
  setText('result-percent', `${percent}%`);
  setText('result-msg',
    percent >= 80 ? 'Excellent! You are ready for the exam.'        :
    percent >= 60 ? 'Good work! Keep practising.'                   :
    percent >= 40 ? 'Keep studying. You can do better!'             :
    'Do not give up. Read the chapter again and retry.'
  );

  renderBreakdown();
  showRetryOptions();
}

/* ─────────────────────────────────────────
   Results breakdown — uses the per-option
   "explanations" array if present, otherwise
   falls back to a single "explanation" field
   if your AI prompt ever returns one of those instead.
───────────────────────────────────────── */
function renderBreakdown() {
  const container = document.getElementById('result-breakdown');
  if (!container) return;
  container.innerHTML = '';

  const frag = document.createDocumentFragment();

  currentQuiz.forEach((q, i) => {
    const correct    = userAnswers[i] === q.answer;
    const yourAns    = userAnswers[i] !== null ? q.options[userAnswers[i]] : 'Not answered';
    const correctAns = q.options[q.answer];

    // Prefer the explanation tied to the chosen/correct option from the
    // explanations[] array; fall back to a flat `explanation` string
    // if that's what the AI response happened to include.
    let noteText = '';
    if (Array.isArray(q.explanations)) {
      const idx = correct ? q.answer : (userAnswers[i] ?? q.answer);
      noteText = q.explanations[idx] ?? '';
    } else if (q.explanation) {
      noteText = q.explanation;
    }

    const item       = document.createElement('div');
    item.className   = `breakdown-item ${correct ? 'correct-item' : 'wrong-item'}`;
    item.innerHTML   = `
      <div>
        <div class="bi-q">${i + 1}. ${escapeHTML(q.q)}</div>
        ${correct
          ? `<div class="bi-ans correct-ans">✓ Correct</div>`
          : `<div class="bi-ans wrong-ans">Your answer: ${escapeHTML(yourAns)}</div>
             <div class="bi-ans correct-ans">Correct: ${escapeHTML(correctAns)}</div>`
        }
        ${noteText ? `<div class="bi-ans bi-explanation">💡 ${escapeHTML(noteText)}</div>` : ''}
      </div>`;
    frag.appendChild(item);
  });

  container.appendChild(frag);
}

/* ─────────────────────────────────────────
   Save result (Firebase + local backup)
───────────────────────────────────────── */
async function saveQuizResult(score, total, percent) {
  const result = {
    subject:   quizMeta.subject,
    chapter:   quizMeta.chapter,
    level:     quizMeta.level,
    score, total, percent,
    questions: currentQuiz,
    date:      new Date().toLocaleDateString('en-PK'),
  };

  const uid = localStorage.getItem('acron_uid');
  if (uid) {
    try {
      await firebaseSaveQuiz(uid, result);
    } catch (err) {
      console.error('[Quiz] Error saving to Firebase:', err);
    }
  }

  // Local backup — replace any previous attempt of same subject/chapter/level
  try {
    const user = getLocalUser();
    if (user) {
      const history = Array.isArray(user.quizHistory)
        ? user.quizHistory
        : Object.values(user.quizHistory ?? {});

      user.quizHistory = history.filter(q =>
        !(q.subject === result.subject &&
          String(q.chapter) === String(result.chapter) &&
          q.level === result.level)
      );
      user.quizHistory.push(result);
      localStorage.setItem('acron_user', JSON.stringify(user));
    }
  } catch (err) {
    console.error('[Quiz] Error saving local backup:', err);
  }
}

/* ─────────────────────────────────────────
   "What do you want to do?" retry prompt
   (your feature — shown automatically once
   the quiz is submitted, English + Urdu text)
───────────────────────────────────────── */
function showRetryOptions() {
  // Avoid duplicating the block if submitQuiz somehow runs twice
  document.getElementById('retry-options')?.remove();

  const resultBtns = document.querySelector('.result-btns');
  if (!resultBtns) return;

  const div = document.createElement('div');
  div.id = 'retry-options';
  div.setAttribute('role', 'region');
  div.setAttribute('aria-label', 'What do you want to do next');
  div.style.cssText = `
    background: rgba(124,108,240,0.08);
    border: 1px solid rgba(124,108,240,0.2);
    border-radius: 14px;
    padding: 20px;
    margin-top: 16px;
    text-align: center;
    width: 100%;
  `;
  div.innerHTML = `
    <div style="font-size:15px;font-weight:700;color:var(--text-primary,#fff);margin-bottom:6px">
      What do you want to do?
    </div>
    <div style="font-size:13px;color:var(--text-secondary,#9ca3af);margin-bottom:16px;direction:rtl">
      آپ کیا کرنا چاہتے ہیں؟
    </div>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button type="button" id="retry-same-btn" style="
        padding:10px 20px;border-radius:10px;
        background:rgba(124,108,240,0.15);
        border:1px solid rgba(124,108,240,0.3);
        color:var(--accent-light,#a78bfa);font-size:13px;font-weight:700;
        font-family:Nunito,sans-serif;cursor:pointer;
      ">
        🔄 Retry same quiz
      </button>
      <button type="button" id="retry-new-btn" style="
        padding:10px 20px;border-radius:10px;
        background:linear-gradient(135deg,#7c6cf0,#5b4dd4);
        border:none;
        color:#fff;font-size:13px;font-weight:700;
        font-family:Nunito,sans-serif;cursor:pointer;
      ">
        ✨ Generate new quiz
      </button>
    </div>`;

  resultBtns.after(div);

  document.getElementById('retry-same-btn')?.addEventListener('click', retrySameQuiz);
  document.getElementById('retry-new-btn') ?.addEventListener('click', newQuiz);
}

function retrySameQuiz() {
  document.getElementById('retry-options')?.remove();
  currentQ    = 0;
  userAnswers = new Array(currentQuiz.length).fill(null);
  hideSection('quiz-results');
  showSection('quiz-active');
  renderQuestion();
}

function newQuiz() {
  document.getElementById('retry-options')?.remove();
  hideSection('quiz-results');
  showSection('quiz-setup');
  currentQuiz  = [];
  currentQ     = 0;
  userAnswers  = [];
  quizMeta     = { cls: quizMeta.cls }; // keep class, clear the rest

  document.querySelectorAll('.level-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  checkGenBtn();
}

/* ─────────────────────────────────────────
   Boot
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', initQuiz);

/* ─────────────────────────────────────────
   Exports
   REQUIRED because this file is loaded as
   <script type="module">. Module-scoped functions
   are NOT automatically global, so every function
   referenced via inline onclick="..." in quiz.html
   must be explicitly attached to window here.
───────────────────────────────────────── */
window.initQuiz        = initQuiz;
window.loadChapters    = loadChapters;
window.selectLevel     = selectLevel;
window.generateNewQuiz = generateNewQuiz;
window.loadOldQuiz     = loadOldQuiz;
window.retrySameQuiz   = retrySameQuiz;
window.newQuiz         = newQuiz;
window.prevQ           = prevQ;
window.nextQ           = nextQ;
window.selectAnswer    = selectAnswer;