/* ============================================================
   pdfquiz.js — PDF upload, text extraction, AI quiz generation
   ============================================================ */

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let pdfQuiz      = [];
let pdfCurrentQ  = 0;
let pdfAnswers   = [];
let pdfLevel     = '';
let pdfTotalPages = 0;

const PDF_JS_VERSION = '3.11.174';
const PDF_JS_CDN     = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}`;
const MAX_TEXT_CHARS = 4000;

/* ─────────────────────────────────────────
   Helpers — show/hide sections
───────────────────────────────────────── */
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

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ─────────────────────────────────────────
   Lazy-load PDF.js
───────────────────────────────────────── */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s   = document.createElement('script');
    s.src     = src;
    s.onload  = resolve;
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

async function ensurePDFJS() {
  if (window.pdfjsLib) return;
  await loadScript(`${PDF_JS_CDN}/pdf.min.js`);
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    `${PDF_JS_CDN}/pdf.worker.min.js`;
}

/* ─────────────────────────────────────────
   Step 1 — Handle file upload
───────────────────────────────────────── */
function handlePDFUpload(input) {
  const file = input.files?.[0];
  if (!file) return;

  // Validate file type
  if (file.type !== 'application/pdf') {
    showUploadError('Please upload a PDF file.');
    return;
  }

  // Validate file size (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    showUploadError('File is too large. Maximum size is 10 MB.');
    return;
  }

  // Update upload zone UI
  const area = document.getElementById('upload-area');
  const text = document.getElementById('upload-text');
  if (area) area.classList.add('has-file');
  if (text) text.innerHTML = `
    <span style="
      display:inline-flex;align-items:center;gap:8px;
      background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);
      color:var(--teal);padding:6px 12px;border-radius:20px;
      font-size:13px;font-weight:700;max-width:100%;word-break:break-all;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      ${escapeHTML(file.name)}
    </span>`;

  // Read as ArrayBuffer for PDF.js
  const reader = new FileReader();
  reader.onload  = e => loadPDF(new Uint8Array(e.target.result));
  reader.onerror = () => showUploadError('Could not read file. Please try again.');
  reader.readAsArrayBuffer(file);
}

function showUploadError(msg) {
  const area = document.getElementById('upload-area');
  const text = document.getElementById('upload-text');
  if (area) { area.classList.remove('has-file'); area.style.borderColor = 'var(--rose)'; }
  if (text) text.textContent = msg;
  setTimeout(() => {
    if (area) area.style.borderColor = '';
    if (text) text.textContent = 'Click to upload PDF';
  }, 3000);
}

/* ─────────────────────────────────────────
   Step 1 — Load PDF metadata
───────────────────────────────────────── */
async function loadPDF(typedArray) {
  try {
    await ensurePDFJS();
    const pdf     = await window.pdfjsLib.getDocument(typedArray).promise;
    pdfTotalPages = pdf.numPages;

    // Set page range defaults
    const pageFrom = document.getElementById('page-from');
    const pageTo   = document.getElementById('page-to');
    if (pageFrom) { pageFrom.max = pdfTotalPages; }
    if (pageTo)   { pageTo.value = Math.min(10, pdfTotalPages); pageTo.max = pdfTotalPages; }
    setText('total-pages', pdfTotalPages);

    // Reveal options
    showSection('page-range-group');
    showSection('level-group');
    showSection('qcount-group');

    window.currentPDF = pdf;
    checkPDFGenBtn();

  } catch (err) {
    console.error('[PDFQuiz] loadPDF:', err);
    showUploadError('Could not read PDF. Is it a valid, non-scanned PDF?');
  }
}

/* ─────────────────────────────────────────
   Step 1 — Difficulty selection
───────────────────────────────────────── */
function selectPDFLevel(el, level) {
  document.querySelectorAll('#level-group .level-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  pdfLevel = level;
  checkPDFGenBtn();
}

function checkPDFGenBtn() {
  const btn   = document.getElementById('pdf-gen-btn');
  const ready = !!(pdfLevel && window.currentPDF);
  if (!btn) return;
  btn.toggleAttribute('disabled', !ready);
  btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
}

/* ─────────────────────────────────────────
   Step 1 — Validate page range
───────────────────────────────────────── */
function validatePageRange() {
  const from = parseInt(document.getElementById('page-from')?.value ?? '1');
  const to   = parseInt(document.getElementById('page-to')?.value   ?? '1');

  if (isNaN(from) || isNaN(to) || from < 1) {
    return { valid: false, msg: 'Invalid page numbers.' };
  }
  if (from > to) {
    return { valid: false, msg: '"From page" cannot be greater than "To page".' };
  }
  if (to > pdfTotalPages) {
    return { valid: false, msg: `"To page" cannot exceed total pages (${pdfTotalPages}).` };
  }
  return { valid: true, from, to };
}

/* ─────────────────────────────────────────
   Step 2 — Generate quiz
───────────────────────────────────────── */
async function generatePDFQuiz() {
  if (!window.currentPDF || !pdfLevel) return;

  const range  = validatePageRange();
  if (!range.valid) { alert(range.msg); return; }

  const qcount = parseInt(document.getElementById('pdf-qcount')?.value ?? '10');

  // Switch to loading view
  hideSection('pdf-setup');
  showFlex('pdf-loading');

  try {
    // Extract text from selected pages
    let extracted = '';
    for (let i = range.from; i <= range.to; i++) {
      const page        = await window.currentPDF.getPage(i);
      const textContent = await page.getTextContent();
      extracted        += textContent.items.map(item => item.str).join(' ') + ' ';
    }

    extracted = extracted.trim();

    if (extracted.length < 100) {
      throw new Error(
        'Not enough readable text found in the selected pages. ' +
        'Try selecting more pages, or check that the PDF is not scanned/image-based.'
      );
    }

    const limitedText = extracted.slice(0, MAX_TEXT_CHARS);
    const questions   = await fetchPDFQuizFromAI(limitedText, pdfLevel, qcount);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI returned no questions. Please try again.');
    }

    pdfQuiz     = questions;
    pdfCurrentQ = 0;
    pdfAnswers  = new Array(questions.length).fill(null);
    showPDFQuizActive();

  } catch (err) {
    console.error('[PDFQuiz] generate:', err);
    hideSection('pdf-loading');
    showSection('pdf-setup');
    alert('Error: ' + (err.message || 'Something went wrong. Please try again.'));
  }
}

/* ─────────────────────────────────────────
   AI API call
───────────────────────────────────────── */
async function fetchPDFQuizFromAI(text, level, count) {
  const levelDesc = {
    low:    'very easy basic recall questions',
    medium: 'medium difficulty comprehension questions',
    high:   'hard analytical exam-level questions',
  };

  const prompt = `You are an expert quiz maker for Pakistani students. Based ONLY on the text below, generate exactly ${count} ${levelDesc[level] ?? 'multiple choice questions'}.

TEXT:
${text}

RULES:
- Questions must be based ONLY on the provided text — no outside knowledge
- Each question must have exactly 4 options
- Return ONLY a valid JSON array — no markdown, no explanation, no preamble
- "answer" is the zero-based index (0, 1, 2, or 3) of the correct option

FORMAT:
[
  {
    "q": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0
  }
]`;

  const response = await fetch('/api/quiz', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  const raw   = data?.choices?.[0]?.message?.content;
  if (!raw)   throw new Error('No response from AI. Please try again.');

  const clean = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('AI returned an unexpected format. Please try again.');
  }
}

/* ─────────────────────────────────────────
   Step 3 — Quiz active
───────────────────────────────────────── */
function showPDFQuizActive() {
  hideSection('pdf-loading');
  showSection('pdf-quiz-active');
  renderPDFQuestion();
}

function renderPDFQuestion() {
  const q = pdfQuiz[pdfCurrentQ];
  if (!q) return;

  const total = pdfQuiz.length;
  const pct   = ((pdfCurrentQ + 1) / total) * 100;

  // Progress
  const fill = document.getElementById('pdf-progress-fill');
  if (fill) {
    fill.style.width = pct + '%';
    fill.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', Math.round(pct));
  }

  setText('pdf-quiz-counter', `Question ${pdfCurrentQ + 1} of ${total}`);
  setText('pdf-quiz-label',   `PDF Quiz — ${capitalize(pdfLevel)} level`);
  setText('pdf-question-text', q.q);

  // Options
  const optList = document.getElementById('pdf-options-list');
  if (!optList) return;
  optList.innerHTML = '';

  const letters    = ['A', 'B', 'C', 'D'];
  const answered   = pdfAnswers[pdfCurrentQ] !== null;

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `Option ${letters[i]}: ${opt}`);
    btn.innerHTML = `<span class="opt-letter" aria-hidden="true">${letters[i]}</span>${escapeHTML(opt)}`;

    if (answered) {
      btn.disabled = true;
      if (i === q.answer)                  btn.classList.add('correct');
      else if (i === pdfAnswers[pdfCurrentQ]) btn.classList.add('wrong');
    } else {
      btn.addEventListener('click', () => selectPDFAnswer(i));
    }

    optList.appendChild(btn);
  });

  // Nav buttons
  const prevBtn = document.getElementById('pdf-btn-prev');
  const nextBtn = document.getElementById('pdf-btn-next');
  if (prevBtn) prevBtn.disabled = pdfCurrentQ === 0;

  if (nextBtn) {
    const isLast = pdfCurrentQ === total - 1;
    nextBtn.innerHTML = isLast
      ? `Submit <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`
      : `Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`;
    nextBtn.onclick = isLast ? submitPDFQuiz : pdfNextQ;
    nextBtn.setAttribute('aria-label', isLast ? 'Submit quiz' : 'Next question');
  }
}

function selectPDFAnswer(index) {
  if (pdfAnswers[pdfCurrentQ] !== null) return; // already answered
  pdfAnswers[pdfCurrentQ] = index;

  const q    = pdfQuiz[pdfCurrentQ];
  const btns = document.querySelectorAll('#pdf-options-list .option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer)  btn.classList.add('correct');
    else if (i === index) btn.classList.add('wrong');
  });
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

/* ─────────────────────────────────────────
   Step 4 — Results
───────────────────────────────────────── */
function submitPDFQuiz() {
  let score = 0;
  pdfQuiz.forEach((q, i) => { if (pdfAnswers[i] === q.answer) score++; });

  const total   = pdfQuiz.length;
  const percent = Math.round((score / total) * 100);

  hideSection('pdf-quiz-active');
  showSection('pdf-results');

  // Icon
  setText('pdf-result-icon',
    percent >= 80 ? '🏆' :
    percent >= 60 ? '👍' :
    percent >= 40 ? '📚' : '💪'
  );

  setText('pdf-result-score',   `${score} / ${total}`);
  setText('pdf-result-percent', `${percent}%`);
  setText('pdf-result-msg',
    percent >= 80 ? 'Excellent! You understood the material well.'  :
    percent >= 60 ? 'Good work! Keep studying.'                     :
    percent >= 40 ? 'Keep reading — you can do better!'             :
    'Read the pages again and retry!'
  );

  // Breakdown
  const container = document.getElementById('pdf-result-breakdown');
  if (!container) return;
  container.innerHTML = '';

  pdfQuiz.forEach((q, i) => {
    const correct    = pdfAnswers[i] === q.answer;
    const yourAns    = pdfAnswers[i] !== null ? q.options[pdfAnswers[i]] : 'Not answered';
    const correctAns = q.options[q.answer];

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
      </div>`;
    container.appendChild(item);
  });
}

/* ─────────────────────────────────────────
   Retry / New quiz
───────────────────────────────────────── */
function pdfRetry() {
  pdfCurrentQ = 0;
  pdfAnswers  = new Array(pdfQuiz.length).fill(null);
  hideSection('pdf-results');
  showSection('pdf-quiz-active');
  renderPDFQuestion();
}

function pdfNewQuiz() {
  // Reset state
  pdfQuiz       = [];
  pdfCurrentQ   = 0;
  pdfAnswers    = [];
  pdfLevel      = '';
  pdfTotalPages = 0;
  window.currentPDF = null;

  // Reset UI
  hideSection('pdf-results');
  showSection('pdf-setup');
  hideSection('page-range-group');
  hideSection('level-group');
  hideSection('qcount-group');

  const area  = document.getElementById('upload-area');
  const text  = document.getElementById('upload-text');
  const input = document.getElementById('pdf-input');
  const btn   = document.getElementById('pdf-gen-btn');

  if (area)  { area.classList.remove('has-file'); area.style.borderColor = ''; }
  if (text)  text.textContent = 'Click to upload PDF';
  if (input) input.value = '';
  if (btn)   { btn.setAttribute('disabled', true); btn.setAttribute('aria-disabled', 'true'); }

  document.querySelectorAll('#level-group .level-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
}

/* ─────────────────────────────────────────
   Utilities
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

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}