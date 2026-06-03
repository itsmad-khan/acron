let currentQuiz = [];
let currentQ = 0;
let userAnswers = [];
let quizMeta = {};

function initQuiz() {
  const loggedIn = localStorage.getItem('ilmpath_logged_in');
  if (!loggedIn) {
    window.location.href = 'login.html';
    return;
  }

  const saved = localStorage.getItem('ilmpath_user');
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
  const prompt = document.getElementById('old-quiz-prompt');
  if (!prompt) return;

  checkGenBtn();

  if (!subject || !chapter || !level) {
    prompt.style.display = 'none';
    return;
  }

  const saved = localStorage.getItem('ilmpath_user');
  if (!saved) return;
  const user = JSON.parse(saved);
  const history = user.quizHistory || [];

  const old = history.find(q =>
    q.subject === subject &&
    q.chapter == chapter &&
    q.level === level
  );

  if (old) {
    prompt.style.display = 'flex';
    const meta = document.getElementById('old-quiz-meta');
    if (meta) meta.textContent = subject + ' Ch.' + chapter +
      ' — ' + old.level + ' — Score: ' + old.score + '/' + old.total;
  } else {
    prompt.style.display = 'none';
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

  const prompt = `Generate ${count} ${levelDesc[level]} quiz questions for Pakistani students studying ${subject}, Chapter ${chapter}.

Return ONLY a JSON array. No extra text. No markdown. Format:
[
  {
    "q": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0
  }
]
"answer" is the index (0,1,2,3) of the correct option.`;

  let response;

  try {
    response = await fetch('/api/quiz', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
  console.log('AI text:', text);

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function loadOldQuiz() {
  const subject = document.getElementById('sel-subject').value;
  const chapter = document.getElementById('sel-chapter').value;
  const level = quizMeta.level;

  const saved = localStorage.getItem('ilmpath_user');
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
           <div class="bi-ans correct-ans">Correct: ${correctAns}</div>` :
          `<div class="bi-ans correct-ans">✓ Correct</div>`
        }
      </div>
    `;
    container.appendChild(item);
  });
}

function saveQuizResult(score, total, percent) {
  const saved = localStorage.getItem('ilmpath_user');
  if (!saved) return;
  const user = JSON.parse(saved);
  if (!user.quizHistory) user.quizHistory = [];

  const result = {
    subject:   quizMeta.subject,
    chapter:   quizMeta.chapter,
    level:     quizMeta.level,
    score, total, percent,
    questions: currentQuiz,
    date:      new Date().toLocaleDateString('en-PK')
  };

  user.quizHistory = user.quizHistory.filter(q =>
    !(q.subject === quizMeta.subject &&
      q.chapter == quizMeta.chapter &&
      q.level === quizMeta.level)
  );
  user.quizHistory.push(result);
  localStorage.setItem('ilmpath_user', JSON.stringify(user));
}

function retryQuiz() {
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