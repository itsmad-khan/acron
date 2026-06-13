import { firebaseSaveQuiz } from './firebase-config.js';

let currentQuiz = [];
let currentQ = 0;
let userAnswers = [];
let quizMeta = {};

function initQuiz() {
  const loggedIn = localStorage.getItem('acron_logged_in');
  if (!loggedIn) {
    window.location.href = 'login.html';
    return;
  }

  const saved = localStorage.getItem('acron_user');
  if (!saved) return;
  const user = JSON.parse(saved);

  const subjects = {
    '9':  ['Physics','Chemistry','Biology','Mathematics','English'],
    '10': ['Physics','Chemistry','Biology','Mathematics','English'],
    '11': ['Physics','Chemistry','Biology','Mathematics','English'],
    '12': ['Physics','Chemistry','Biology','Mathematics','English'],
  };

  const sel = document.getElementById('sel-subject');
  if (!sel) return;

  if (user.cls === 'other') {
    window.location.href = 'pdfquiz.html';
    return;
  }

  const subs = subjects[user.cls] || subjects['9'];
  subs.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });

  const params = new URLSearchParams(window.location.search);
  const subFromURL = params.get('subject');
  const chFromURL = params.get('chapter');
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

function loadChapters() {
  const subject = document.getElementById('sel-subject').value;
  const chSel = document.getElementById('sel-chapter');
  if (!chSel) return;

  chSel.innerHTML = '<option value="">— Pick a chapter —</option>';
  chSel.disabled = !subject;
  if (!subject) return;

  const chapters = {
    'Physics': 12, 'Chemistry': 8, 'Biology': 10,
    'Mathematics': 7, 'English': 5
  };

  const count = chapters[subject] || 5;
  for (let i = 1; i <= count; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = 'Chapter ' + i;
    chSel.appendChild(opt);
  }

  chSel.onchange = checkOldQuiz;
  checkGenBtn();
}

function selectLevel(el, level) {
  document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  quizMeta.level = level;
  checkOldQuiz();
  checkGenBtn();
}

function checkGenBtn() {
  const subject = document.getElementById('sel-subject').value;
  const chapter = document.getElementById('sel-chapter').value;
  const btn = document.getElementById('gen-btn');
  if (!btn) return;
  if (subject && chapter && quizMeta.level) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', true);
  }
}

function checkOldQuiz() {
  const subject = document.getElementById('sel-subject').value;
  const chapter = document.getElementById('sel-chapter').value;
  const level = quizMeta.level;
  const promptEl = document.getElementById('old-quiz-prompt');
  if (!promptEl) return;

  checkGenBtn();

  if (!subject || !chapter || !level) {
    promptEl.style.display = 'none';
    return;
  }

  const saved = localStorage.getItem('acron_user');
  if (!saved) return;
  const user = JSON.parse(saved);
  const history = user.quizHistory || [];

  const old = history.find(q =>
    q.subject === subject &&
    q.chapter == chapter &&
    q.level === level
  );

  if (old) {
    promptEl.style.display = 'flex';
    const meta = document.getElementById('old-quiz-meta');
    if (meta) meta.textContent = subject + ' Ch.' + chapter +
      ' — ' + old.level + ' — Score: ' + old.score + '/' + old.total;
  } else {
    promptEl.style.display = 'none';
  }
}

async function generateNewQuiz() {
  const subject = document.getElementById('sel-subject').value;
  const chapter = document.getElementById('sel-chapter').value;
  const level = quizMeta.level;
  const qcount = document.getElementById('qcount-range').value;

  if (!subject || !chapter || !level) return;

  quizMeta = { subject, chapter, level, total: parseInt(qcount) };

  document.getElementById('quiz-setup').style.display = 'none';
  document.getElementById('quiz-loading').style.display = 'flex';

  try {
    const questions = await fetchQuestionsFromAI(subject, chapter, level, qcount);
    currentQuiz = questions;
    currentQ = 0;
    userAnswers = new Array(questions.length).fill(null);
    showQuizActive();
  } catch (err) {
    console.log('Full error:', err);
    alert('Error: ' + err.message);
    document.getElementById('quiz-setup').style.display = 'block';
    document.getElementById('quiz-loading').style.display = 'none';
  }
}

async function fetchQuestionsFromAI(subject, chapter, level, count) {
  const levelDesc = {
    low:    'very easy basic recall questions, multiple choice',
    medium: 'medium difficulty application questions, multiple choice',
    high:   'hard exam level analytical questions, multiple choice'
  };

  const prompt = `Generate ${count} ${levelDesc[level]} multiple choice quiz questions for Pakistani students studying ${subject}, Chapter ${chapter}.

Return ONLY a JSON array. No extra text. No markdown. Format:
[
  {
    "q": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Brief explanation of why the correct answer is right.",
    "wrong_explanations": [
      "Why option A is wrong (if A is wrong)",
      "Why option B is wrong (if B is wrong)",
      "Why option C is wrong (if C is wrong)",
      "Why option D is wrong (if D is wrong)"
    ]
  }
]
"answer" is the index (0,1,2,3) of the correct option.
"wrong_explanations" has 4 items — one for each option. For the correct option write empty string "".
Keep explanations short — maximum 2 sentences each.`;

  let response;

  try {
    response = await fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: prompt })
    });
  } catch (fetchError) {
    console.log('Fetch failed:', fetchError);
    throw new Error('Could not connect to AI. Check your internet.');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.log('API error:', errorText);
    throw new Error('API error ' + response.status + ': ' + errorText);
  }

  const data = await response.json();
  console.log('API response:', data);

  if (!data.choices || !data.choices[0]) {
    throw new Error('No response from AI. Try again.');
  }

  const text = data.choices[0].message.content;
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function loadOldQuiz() {
  const subject = document.getElementById('sel-subject').value;
  const chapter = document.getElementById('sel-chapter').value;
  const level = quizMeta.level;

  const saved = localStorage.getItem('acron_user');
  if (!saved) return;
  const user = JSON.parse(saved);
  const history = user.quizHistory || [];

  const old = history.find(q =>
    q.subject === subject &&
    q.chapter == chapter &&
    q.level === level
  );

  if (old && old.questions) {
    quizMeta = { subject, chapter, level, total: old.questions.length };
    currentQuiz = old.questions;
    currentQ = 0;
    userAnswers = new Array(old.questions.length).fill(null);
    document.getElementById('quiz-setup').style.display = 'none';
    showQuizActive();
  }
}

function showQuizActive() {
  document.getElementById('quiz-loading').style.display = 'none';
  document.getElementById('quiz-active').style.display = 'block';
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuiz[currentQ];
  if (!q) return;

  const pct = ((currentQ + 1) / currentQuiz.length) * 100;
  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-counter').textContent =
    'Question ' + (currentQ + 1) + ' of ' + currentQuiz.length;
  document.getElementById('quiz-label-top').textContent =
    quizMeta.subject + ' — Chapter ' + quizMeta.chapter + ' — ' + quizMeta.level;
  document.getElementById('question-text').textContent = q.q;

  // Remove old explanation
  const oldExp = document.getElementById('quiz-explanation');
  if (oldExp) oldExp.remove();

  const optList = document.getElementById('options-list');
  optList.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span> ${opt}`;

    if (userAnswers[currentQ] !== null) {
      btn.classList.add('answered');
      if (i === q.answer) btn.classList.add('correct');
      else if (i === userAnswers[currentQ]) btn.classList.add('wrong');
    }

    btn.onclick = () => selectAnswer(i);
    optList.appendChild(btn);
  });

  document.getElementById('btn-prev').disabled = currentQ === 0;
  const nextBtn = document.getElementById('btn-next');

  if (currentQ === currentQuiz.length - 1) {
    nextBtn.innerHTML = 'Submit <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    nextBtn.onclick = submitQuiz;
  } else {
    nextBtn.innerHTML = 'Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    nextBtn.onclick = nextQ;
  }
}

function selectAnswer(index) {
  if (userAnswers[currentQ] !== null) return;
  userAnswers[currentQ] = index;

  const q = currentQuiz[currentQ];
  const btns = document.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    btn.classList.add('answered');
    if (i === q.answer) btn.classList.add('correct');
    else if (i === index) btn.classList.add('wrong');
  });

  showExplanation(q, index);
}

function showExplanation(q, selectedIndex) {
  const old = document.getElementById('quiz-explanation');
  if (old) old.remove();

  const isCorrect = selectedIndex === q.answer;
  const explanation = q.explanation || '';
  const wrongExp = q.wrong_explanations ? q.wrong_explanations[selectedIndex] : '';

  const div = document.createElement('div');
  div.id = 'quiz-explanation';
  div.className = 'quiz-explanation ' + (isCorrect ? 'exp-correct' : 'exp-wrong');

  if (isCorrect) {
    div.innerHTML = `
      <div class="exp-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Correct!
      </div>
      <div class="exp-text">${explanation}</div>
    `;
  } else {
    div.innerHTML = `
      <div class="exp-header wrong-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        Wrong answer
      </div>
      ${wrongExp ? `<div class="exp-text">${wrongExp}</div>` : ''}
      <div class="exp-correct-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Correct answer: ${q.options[q.answer]}
      </div>
      <div class="exp-text">${explanation}</div>
    `;
  }

  const optList = document.getElementById('options-list');
  if (optList) optList.after(div);
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

function submitQuiz() {
  let score = 0;
  currentQuiz.forEach((q, i) => {
    if (userAnswers[i] === q.answer) score++;
  });

  const total = currentQuiz.length;
  const percent = Math.round((score / total) * 100);

  saveQuizResult(score, total, percent);

  document.getElementById('quiz-active').style.display = 'none';
  document.getElementById('quiz-results').style.display = 'block';

  const iconEl = document.getElementById('result-icon');
  if (percent >= 80) iconEl.textContent = '🏆';
  else if (percent >= 60) iconEl.textContent = '👍';
  else if (percent >= 40) iconEl.textContent = '📚';
  else iconEl.textContent = '💪';

  document.getElementById('result-score').textContent = score + ' / ' + total;
  document.getElementById('result-percent').textContent = percent + '%';

  const msg = percent >= 80 ? 'Excellent! You are ready for the exam.' :
              percent >= 60 ? 'Good work! Keep practising.' :
              percent >= 40 ? 'Keep studying. You can do better!' :
              'Do not give up. Read the chapter again and retry.';
  document.getElementById('result-msg').textContent = msg;

  showBreakdown();
}

function showBreakdown() {
  const container = document.getElementById('result-breakdown');
  if (!container) return;
  container.innerHTML = '';

  currentQuiz.forEach((q, i) => {
    const correct = userAnswers[i] === q.answer;
    const item = document.createElement('div');
    item.className = 'breakdown-item ' + (correct ? 'correct-item' : 'wrong-item');

    const yourAns = userAnswers[i] !== null ? q.options[userAnswers[i]] : 'Not answered';
    const correctAns = q.options[q.answer];

    item.innerHTML = `
      <div>
        <div class="bi-q">${i + 1}. ${q.q}</div>
        ${!correct ?
          `<div class="bi-ans wrong-ans">Your answer: ${yourAns}</div>
           <div class="bi-ans correct-ans">Correct: ${correctAns}</div>
           ${q.explanation ? `<div class="bi-ans" style="color:#9ca3af;margin-top:4px">💡 ${q.explanation}</div>` : ''}` :
          `<div class="bi-ans correct-ans">✓ Correct</div>
           ${q.explanation ? `<div class="bi-ans" style="color:#9ca3af;margin-top:4px">💡 ${q.explanation}</div>` : ''}`
        }
      </div>
    `;
    container.appendChild(item);
  });
}

async function saveQuizResult(score, total, percent) {
  const result = {
    subject:   quizMeta.subject,
    chapter:   quizMeta.chapter,
    level:     quizMeta.level,
    score, total, percent,
    questions: currentQuiz,
    date:      new Date().toLocaleDateString('en-PK')
  };

  const uid = localStorage.getItem('acron_uid');
  if (uid) {
    try {
      await firebaseSaveQuiz(uid, result);
    } catch (err) {
      console.log('Error saving quiz:', err);
    }
  }

  const saved = localStorage.getItem('acron_user');
  if (saved) {
    const user = JSON.parse(saved);
    if (!user.quizHistory) user.quizHistory = [];
    user.quizHistory = user.quizHistory.filter(q =>
      !(q.subject === result.subject &&
        q.chapter == result.chapter &&
        q.level === result.level)
    );
    user.quizHistory.push(result);
    localStorage.setItem('acron_user', JSON.stringify(user));
  }
}

function showRetryOptions() {
  const resultCard = document.querySelector('.results-card');
  if (!resultCard) return;

  // Remove old retry options if exist
  const old = document.getElementById('retry-options');
  if (old) old.remove();

  const div = document.createElement('div');
  div.id = 'retry-options';
  div.innerHTML = `
    <div style="
      background:rgba(108,99,255,0.08);
      border:1px solid rgba(108,99,255,0.2);
      border-radius:14px;
      padding:1.2rem;
      margin-top:1rem;
      text-align:center;
    ">
      <div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:6px">
        What do you want to do?
      </div>
      <div style="font-size:13px;color:#9ca3af;margin-bottom:1rem">
        آپ کیا کرنا چاہتے ہیں؟
      </div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        <button onclick="retrySameQuiz()" style="
          padding:10px 20px;border-radius:10px;
          background:rgba(108,99,255,0.15);
          border:1px solid rgba(108,99,255,0.3);
          color:#a78bfa;font-size:13px;font-weight:700;
          font-family:Nunito,sans-serif;cursor:pointer;
        ">
          🔄 Retry same quiz
        </button>
        <button onclick="newQuiz()" style="
          padding:10px 20px;border-radius:10px;
          background:linear-gradient(135deg,#6c63ff,#a855f7);
          border:none;
          color:#fff;font-size:13px;font-weight:700;
          font-family:Nunito,sans-serif;cursor:pointer;
        ">
          ✨ Generate new quiz
        </button>
      </div>
    </div>
  `;

  // Add after result buttons
  const resultBtns = document.querySelector('.result-btns');
  if (resultBtns) resultBtns.after(div);
}

function retrySameQuiz() {
  currentQ = 0;
  userAnswers = new Array(currentQuiz.length).fill(null);
  document.getElementById('quiz-results').style.display = 'none';
  document.getElementById('quiz-active').style.display = 'block';
  renderQuestion();
}

function newQuiz() {
  document.getElementById('quiz-results').style.display = 'none';
  document.getElementById('quiz-setup').style.display = 'block';
  currentQuiz = [];
  currentQ = 0;
  userAnswers = [];
  quizMeta = {};
}

window.addEventListener('DOMContentLoaded', () => {
  initQuiz();
});

window.initQuiz = initQuiz;
window.loadChapters = loadChapters;
window.selectLevel = selectLevel;
window.generateNewQuiz = generateNewQuiz;
window.loadOldQuiz = loadOldQuiz;
window.retryQuiz = retryQuiz;
window.newQuiz = newQuiz;
window.prevQ = prevQ;
window.nextQ = nextQ;