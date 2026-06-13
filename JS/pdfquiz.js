let pdfText = '';
let pdfQuiz = [];
let pdfCurrentQ = 0;
let pdfAnswers = [];
let pdfLevel = '';
let pdfTotalPages = 0;

function handlePDFUpload(input) {
  const file = input.files[0];
  if (!file) return;


  // Show file name
  document.getElementById('upload-text').textContent = '✅ ' + file.name;
  document.getElementById('upload-area').style.borderColor = '#34d399';

  // Read PDF using FileReader
  const reader = new FileReader();
  reader.onload = function(e) {
    const typedArray = new Uint8Array(e.target.result);
    loadPDF(typedArray);
  };
  reader.readAsArrayBuffer(file);
}

async function loadPDF(typedArray) {
  // Load PDF.js library
  if (!window.pdfjsLib) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const pdf = await window.pdfjsLib.getDocument(typedArray).promise;
  pdfTotalPages = pdf.numPages;

  // Show total pages
  document.getElementById('total-pages').textContent = pdfTotalPages;
  document.getElementById('page-to').value = Math.min(10, pdfTotalPages);
  document.getElementById('page-to').max = pdfTotalPages;
  document.getElementById('page-from').max = pdfTotalPages;

  // Show next options
  document.getElementById('page-range-group').style.display = 'block';
  document.getElementById('level-group').style.display = 'block';
  document.getElementById('qcount-group').style.display = 'block';

  // Store PDF for later text extraction
  window.currentPDF = pdf;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function selectPDFLevel(el, level) {
  document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  pdfLevel = level;
  checkPDFGenBtn();
}

function checkPDFGenBtn() {
  const btn = document.getElementById('pdf-gen-btn');
  if (pdfLevel && window.currentPDF) {
    btn.removeAttribute('disabled');
  } else {
    btn.setAttribute('disabled', true);
  }
}

async function generatePDFQuiz() {
  if (!window.currentPDF || !pdfLevel) return;

  const fromPage = parseInt(document.getElementById('page-from').value);
  const toPage = parseInt(document.getElementById('page-to').value);
  const qcount = document.getElementById('pdf-qcount').value;

  if (fromPage > toPage) {
    alert('From page cannot be greater than To page!');
    return;
  }

  if (toPage > pdfTotalPages) {
    alert('To page cannot be greater than total pages (' + pdfTotalPages + ')!');
    return;
  }

  // Show loading
  document.getElementById('pdf-setup').style.display = 'none';
  document.getElementById('pdf-loading').style.display = 'flex';

  try {
    // Extract text from selected pages
    let extractedText = '';
    for (let i = fromPage; i <= toPage; i++) {
      const page = await window.currentPDF.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      extractedText += pageText + ' ';
    }

    pdfText = extractedText.trim();

    if (pdfText.length < 100) {
      throw new Error('Not enough text found in selected pages. Try selecting more pages.');
    }

    // Limit text to avoid token limits
    const limitedText = pdfText.substring(0, 4000);

    // Generate quiz from text
    const questions = await fetchPDFQuizFromAI(limitedText, pdfLevel, qcount);
    pdfQuiz = questions;
    pdfCurrentQ = 0;
    pdfAnswers = new Array(questions.length).fill(null);
    showPDFQuizActive();

  } catch (err) {
    console.log('PDF Quiz error:', err);
    alert('Error: ' + err.message);
    document.getElementById('pdf-setup').style.display = 'block';
    document.getElementById('pdf-loading').style.display = 'none';
  }
}

async function fetchPDFQuizFromAI(text, level, count) {
  const levelDesc = {
    low:    'very easy basic recall',
    medium: 'medium difficulty application',
    high:   'hard analytical exam level'
  };

  const prompt = `You are a quiz maker. Based on the following text, generate ${count} ${levelDesc[level]} multiple choice questions.

  TEXT:
  ${text}
  
  Rules:
  - Questions must be based ONLY on the text above
  - Do not use outside knowledge
  - Return ONLY a JSON array
  - No extra text or markdown
  
  Format:
  [
    {
      "q": "Question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanations": [
        "Why option A is correct or wrong — one sentence.",
        "Why option B is correct or wrong — one sentence.",
        "Why option C is correct or wrong — one sentence.",
        "Why option D is correct or wrong — one sentence."
      ]
    }
  ]
  "answer" is the index (0,1,2,3) of the correct option.
  "explanations" has exactly 4 items — one for each option.
  For correct option start with ✓ Correct: and for wrong options start with ✗ Wrong:
  Keep each explanation to one sentence.`;

  const response = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('API error: ' + errorText);
  }

  const data = await response.json();

  if (!data.choices || !data.choices[0]) {
    throw new Error('No response from AI. Try again.');
  }

  const text2 = data.choices[0].message.content;
  const clean = text2.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function showPDFQuizActive() {
  document.getElementById('pdf-loading').style.display = 'none';
  document.getElementById('pdf-quiz-active').style.display = 'block';
  renderPDFQuestion();
}

function renderPDFQuestion() {
  const q = pdfQuiz[pdfCurrentQ];
  if (!q) return;

  const pct = ((pdfCurrentQ + 1) / pdfQuiz.length) * 100;
  document.getElementById('pdf-progress-fill').style.width = pct + '%';
  document.getElementById('pdf-quiz-counter').textContent =
    'Question ' + (pdfCurrentQ + 1) + ' of ' + pdfQuiz.length;
  document.getElementById('pdf-quiz-label').textContent =
    'PDF Quiz — ' + pdfLevel + ' level';
  document.getElementById('pdf-question-text').textContent = q.q;
  // Remove old explanations
  document.querySelectorAll('.option-explanation').forEach(e => e.remove());

  const optList = document.getElementById('pdf-options-list');
  optList.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerHTML = `<span class="opt-letter">${letters[i]}</span> ${opt}`;

    if (pdfAnswers[pdfCurrentQ] !== null) {
      btn.classList.add('answered');
      if (i === q.answer) btn.classList.add('correct');
      else if (i === pdfAnswers[pdfCurrentQ]) btn.classList.add('wrong');
    }

    btn.onclick = () => selectPDFAnswer(i);
    optList.appendChild(btn);
  });

  document.getElementById('pdf-btn-prev').disabled = pdfCurrentQ === 0;
  const nextBtn = document.getElementById('pdf-btn-next');

  if (pdfCurrentQ === pdfQuiz.length - 1) {
    nextBtn.innerHTML = 'Submit <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
    nextBtn.onclick = submitPDFQuiz;
  } else {
    nextBtn.innerHTML = 'Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    nextBtn.onclick = pdfNextQ;
  }
}

function selectPDFAnswer(index) {
  if (pdfAnswers[pdfCurrentQ] !== null) return;
  pdfAnswers[pdfCurrentQ] = index;

  const q = pdfQuiz[pdfCurrentQ];
  const btns = document.querySelectorAll('#pdf-options-list .option-btn');
  btns.forEach((btn, i) => {
    btn.classList.add('answered');
    if (i === q.answer) btn.classList.add('correct');
    else if (i === index) btn.classList.add('wrong');
  });

  // Show explanation
  showPDFExplanation(q, index);
}


function pdfNextQ() {
  if (pdfCurrentQ < pdfQuiz.length - 1) {
    pdfCurrentQ++;
    renderPDFQuestion();
  }
}

function pdfPrevQ() {
  if (pdfCurrentQ > 0) {
    pdfCurrentQ--;
    renderPDFQuestion();
  }
}

function submitPDFQuiz() {
  let score = 0;
  pdfQuiz.forEach((q, i) => {
    if (pdfAnswers[i] === q.answer) score++;
  });

  const total = pdfQuiz.length;
  const percent = Math.round((score / total) * 100);

  document.getElementById('pdf-quiz-active').style.display = 'none';
  document.getElementById('pdf-results').style.display = 'block';

  const iconEl = document.getElementById('pdf-result-icon');
  if (percent >= 80) iconEl.textContent = '🏆';
  else if (percent >= 60) iconEl.textContent = '👍';
  else if (percent >= 40) iconEl.textContent = '📚';
  else iconEl.textContent = '💪';

  document.getElementById('pdf-result-score').textContent = score + ' / ' + total;
  document.getElementById('pdf-result-percent').textContent = percent + '%';

  const msg = percent >= 80 ? 'Excellent! You understood the material well.' :
              percent >= 60 ? 'Good work! Keep studying.' :
              percent >= 40 ? 'Keep reading. You can do better!' :
              'Read the pages again and retry!';
  document.getElementById('pdf-result-msg').textContent = msg;

  // Show breakdown
  const container = document.getElementById('pdf-result-breakdown');
  container.innerHTML = '';
  pdfQuiz.forEach((q, i) => {
    const correct = pdfAnswers[i] === q.answer;
    const item = document.createElement('div');
    item.className = 'breakdown-item ' + (correct ? 'correct-item' : 'wrong-item');
    const yourAns = pdfAnswers[i] !== null ? q.options[pdfAnswers[i]] : 'Not answered';
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

function showPDFRetryOptions() {
  const old = document.getElementById('pdf-retry-options');
  if (old) old.remove();

  const div = document.createElement('div');
  div.id = 'pdf-retry-options';
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
        <button onclick="pdfRetrySame()" style="
          padding:10px 20px;border-radius:10px;
          background:rgba(108,99,255,0.15);
          border:1px solid rgba(108,99,255,0.3);
          color:#a78bfa;font-size:13px;font-weight:700;
          font-family:Nunito,sans-serif;cursor:pointer;
        ">
          🔄 Retry same quiz
        </button>
        <button onclick="pdfNewQuiz()" style="
          padding:10px 20px;border-radius:10px;
          background:linear-gradient(135deg,#34d399,#059669);
          border:none;
          color:#fff;font-size:13px;font-weight:700;
          font-family:Nunito,sans-serif;cursor:pointer;
        ">
          ✨ Upload new PDF
        </button>
      </div>
    </div>
  `;

  const resultBtns = document.querySelector('.result-btns');
  if (resultBtns) resultBtns.after(div);
}

function pdfRetrySame() {
  pdfCurrentQ = 0;
  pdfAnswers = new Array(pdfQuiz.length).fill(null);
  document.getElementById('pdf-results').style.display = 'none';
  document.getElementById('pdf-quiz-active').style.display = 'block';
  renderPDFQuestion();
}

function pdfNewQuiz() {
  pdfText = '';
  pdfQuiz = [];
  pdfCurrentQ = 0;
  pdfAnswers = [];
  pdfLevel = '';
  pdfTotalPages = 0;
  window.currentPDF = null;

  document.getElementById('pdf-results').style.display = 'none';
  document.getElementById('pdf-setup').style.display = 'block';
  document.getElementById('upload-text').textContent = 'Click here to upload PDF';
  document.getElementById('upload-area').style.borderColor = '';
  document.getElementById('page-range-group').style.display = 'none';
  document.getElementById('level-group').style.display = 'none';
  document.getElementById('qcount-group').style.display = 'none';
  document.getElementById('pdf-input').value = '';
  document.getElementById('pdf-gen-btn').setAttribute('disabled', true);
  document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
}