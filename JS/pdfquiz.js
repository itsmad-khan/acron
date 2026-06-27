/* ============================================================
   pdfquiz.js — Document upload (PDF or EPUB), text extraction,
   AI quiz generation. Includes per-option explanations and the
   retry-options prompt.
   ============================================================ */

/* ─────────────────────────────────────────
   State
───────────────────────────────────────── */
let docText         = '';
let docType         = null;   // 'pdf' | 'epub'
let pdfQuiz         = [];
let pdfCurrentQ     = 0;
let pdfAnswers      = [];
let pdfLevel        = '';
let docTotalUnits   = 0;      // total pages (PDF) or chapters (EPUB)
let epubChapterRefs = [];     // ordered list of {href, label} for EPUB spine

const PDF_JS_VERSION  = '3.11.174';
const PDF_JS_CDN      = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}`;
const EPUB_JS_VERSION = '0.2.13'; // futurepress/epub.js — also requires JSZip
const JSZIP_VERSION   = '2.6.1';  // MUST stay on the 2.x line — epub.js 0.2.x calls
                                   // JSZip's old synchronous `new JSZip(data)` constructor,
                                   // which was REMOVED starting at JSZip 3.0.0 (this also
                                   // affects every 3.x release, including 3.1.5 — confirmed
                                   // directly: 2.6.1 is on cdnjs and contains the old
                                   // constructor; do not "upgrade" this without also
                                   // rewriting how loadEPUB()/extractEPUBText() call epub.js.
const MAX_TEXT_CHARS  = 4000;
const MAX_FILE_BYTES  = 15 * 1024 * 1024; // 15 MB — slightly higher than before since EPUBs can run larger

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

/* ─────────────────────────────────────────
   Lazy-load external scripts (shared helper
   for pdf.js, epub.js, and jszip)
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

async function ensureEPUBJS() {
  if (window.ePub) return;
  // epub.js depends on JSZip for unzipping the .epub archive.
  // IMPORTANT: if you ever add another feature to this page that
  // also needs JSZip, make sure it uses 3.1.5 too (or load epub.js
  // first) — loading a newer JSZip here would break EPUB uploads
  // again with the same "constructor removed" error.
  if (!window.JSZip) {
    await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/jszip/${JSZIP_VERSION}/jszip.min.js`);
  }
  await loadScript(`https://cdnjs.cloudflare.com/ajax/libs/epub.js/${EPUB_JS_VERSION}/epub.min.js`);
}

/* ─────────────────────────────────────────
   File type detection
───────────────────────────────────────── */
function detectDocType(file) {
  const name = (file.name || '').toLowerCase();
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (file.type === 'application/epub+zip' || name.endsWith('.epub')) return 'epub';
  return null;
}

/* ─────────────────────────────────────────
   Step 1 — Handle file upload
───────────────────────────────────────── */
function handlePDFUpload(input) {
  const file = input.files?.[0];
  if (!file) return;

  const type = detectDocType(file);
  if (!type) {
    showUploadError('Please upload a PDF or EPUB file.');
    return;
  }

  if (file.size > MAX_FILE_BYTES) {
    showUploadError('File is too large. Maximum size is 15 MB.');
    return;
  }

  docType = type;

  const area = document.getElementById('upload-area');
  const text = document.getElementById('upload-text');
  if (area) {
    area.classList.add('has-file');
    area.style.borderColor = '';
  }
  if (text) {
    text.innerHTML = `
      <span style="
        display:inline-flex;align-items:center;gap:8px;
        background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.25);
        color:var(--teal,#34d399);padding:6px 12px;border-radius:20px;
        font-size:13px;font-weight:700;max-width:100%;word-break:break-all;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        ${escapeHTML(file.name)}
      </span>`;
  }

  const reader = new FileReader();
  reader.onerror = () => showUploadError('Could not read file. Please try again.');

  if (type === 'pdf') {
    reader.onload = e => loadPDF(new Uint8Array(e.target.result));
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = e => loadEPUB(e.target.result);
    reader.readAsArrayBuffer(file);
  }
}

function showUploadError(msg) {
  const area = document.getElementById('upload-area');
  const text = document.getElementById('upload-text');
  if (area) { area.classList.remove('has-file'); area.style.borderColor = 'var(--rose, #f87171)'; }
  if (text) text.textContent = msg;
  setTimeout(() => {
    if (area) area.style.borderColor = '';
    if (text) text.textContent = 'Click to upload PDF or EPUB';
  }, 3500);
}

/* ─────────────────────────────────────────
   Range-UI label helpers
───────────────────────────────────────── */
function updateRangeLabels() {
  const isEpub = docType === 'epub';
  setText('range-group-label', isEpub ? 'Chapter range' : 'Page range');
  setText('range-from-label',  isEpub ? 'From chapter'  : 'From page');
  setText('range-to-label',    isEpub ? 'To chapter'    : 'To page');
  setText('total-pages-label', isEpub ? 'Total chapters in your EPUB:' : 'Total pages in your PDF:');
}

/* ─────────────────────────────────────────
   Step 1 — Load PDF metadata
───────────────────────────────────────── */
async function loadPDF(typedArray) {
  try {
    await ensurePDFJS();
    const pdf     = await window.pdfjsLib.getDocument(typedArray).promise;
    docTotalUnits = pdf.numPages;

    updateRangeLabels();

    const pageFrom = document.getElementById('page-from');
    const pageTo   = document.getElementById('page-to');
    if (pageFrom) pageFrom.max = docTotalUnits;
    if (pageTo)   { pageTo.value = Math.min(10, docTotalUnits); pageTo.max = docTotalUnits; }
    setText('total-pages', docTotalUnits);

    showSection('page-range-group');
    showSection('level-group');
    showSection('qcount-group');

    window.currentPDF = pdf;
    checkPDFGenBtn();

  } catch (err) {
    console.error('[DocQuiz] loadPDF:', err);
    showUploadError('Could not read PDF. Is it a valid, non-scanned PDF?');
  }
}

/* ─────────────────────────────────────────
   Step 1 — Load EPUB metadata
───────────────────────────────────────── */
async function loadEPUB(arrayBuffer) {
  try {
    await ensureEPUBJS();

    const book = window.ePub(arrayBuffer);
    await book.ready;

    // CONFIRMED via runtime inspection: in this epub.js build, book.spine
    // IS the array of spine items directly — not an object with .each(),
    // .items, or .spineItems (those are from mismatched v0.3 / mixed-
    // version documentation that doesn't apply here).
    const items = Array.isArray(book.spine) ? book.spine : [];

    if (!items.length) {
      throw new Error('No readable chapters found in this EPUB.');
    }

    epubChapterRefs = items.map((item, i) => ({
      href:  item.href,
      label: `Chapter ${i + 1}`,
      item:  item, // keep the real spine item so extractEPUBText() doesn't
                   // need a (nonexistent) book.spine.get(href) lookup later
    }));
    docTotalUnits = epubChapterRefs.length;

    updateRangeLabels();

    const pageFrom = document.getElementById('page-from');
    const pageTo   = document.getElementById('page-to');
    if (pageFrom) pageFrom.max = docTotalUnits;
    if (pageTo)   { pageTo.value = Math.min(10, docTotalUnits); pageTo.max = docTotalUnits; }
    setText('total-pages', docTotalUnits);

    showSection('page-range-group');
    showSection('level-group');
    showSection('qcount-group');

    window.currentEPUB = book;
    checkPDFGenBtn();

  } catch (err) {
    console.error('[DocQuiz] loadEPUB:', err);
    showUploadError('Could not read EPUB. Is it a valid, unprotected EPUB file?');
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
  const btn    = document.getElementById('pdf-gen-btn');
  const hasDoc = !!(window.currentPDF || window.currentEPUB);
  const ready  = !!(pdfLevel && hasDoc);
  if (!btn) return;
  btn.toggleAttribute('disabled', !ready);
  btn.setAttribute('aria-disabled', ready ? 'false' : 'true');
}

/* ─────────────────────────────────────────
   Step 1 — Validate page/chapter range
───────────────────────────────────────── */
function validatePageRange() {
  const from = parseInt(document.getElementById('page-from')?.value ?? '1');
  const to   = parseInt(document.getElementById('page-to')?.value   ?? '1');
  const unit = docType === 'epub' ? 'chapter' : 'page';

  if (isNaN(from) || isNaN(to) || from < 1) {
    return { valid: false, msg: `Invalid ${unit} numbers.` };
  }
  if (from > to) {
    return { valid: false, msg: `"From ${unit}" cannot be greater than "To ${unit}".` };
  }
  if (to > docTotalUnits) {
    return { valid: false, msg: `"To ${unit}" cannot exceed total ${unit}s (${docTotalUnits}).` };
  }
  return { valid: true, from, to };
}

/* ─────────────────────────────────────────
   Step 2 — Generate quiz
───────────────────────────────────────── */
async function generatePDFQuiz() {
  const hasDoc = window.currentPDF || window.currentEPUB;
  if (!hasDoc || !pdfLevel) return;

  const range = validatePageRange();
  if (!range.valid) { alert(range.msg); return; }

  const qcount = parseInt(document.getElementById('pdf-qcount')?.value ?? '10');

  hideSection('pdf-setup');
  showFlex('pdf-loading');

  try {
    docText = docType === 'epub'
      ? await extractEPUBText(range.from, range.to)
      : await extractPDFText(range.from, range.to);

    if (docText.length < 100) {
      const unit = docType === 'epub' ? 'chapters' : 'pages';
      throw new Error(
        `Not enough readable text found in the selected ${unit}. ` +
        `Try selecting more ${unit}, or check the file is not scanned/image-based.`
      );
    }

    const limitedText = docText.slice(0, MAX_TEXT_CHARS);
    const questions   = await fetchPDFQuizFromAI(limitedText, pdfLevel, qcount);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('AI returned no questions. Please try again.');
    }

    pdfQuiz     = questions;
    pdfCurrentQ = 0;
    pdfAnswers  = new Array(questions.length).fill(null);
    showPDFQuizActive();

  } catch (err) {
    console.error('[DocQuiz] generate:', err);
    hideSection('pdf-loading');
    showSection('pdf-setup');
    alert('Error: ' + (err.message || 'Something went wrong. Please try again.'));
  }
}

/* ─────────────────────────────────────────
   Text extraction — PDF
───────────────────────────────────────── */
async function extractPDFText(from, to) {
  let extracted = '';
  for (let i = from; i <= to; i++) {
    const page        = await window.currentPDF.getPage(i);
    const textContent = await page.getTextContent();
    extracted        += textContent.items.map(item => item.str).join(' ') + ' ';
  }
  return extracted.trim();
}

/* ─────────────────────────────────────────
   Text extraction — EPUB
   Loads each chapter's raw XHTML in the selected range and
   strips it down to plain text. We deliberately avoid epub.js's
   section.render()/display() methods here — those are built for
   on-screen rendering inside an <iframe> and are known to behave
   unreliably when used purely for text extraction (see
   futurepress/epub.js issues #887 and #1282). Instead we use the
   section's load() method directly to get a parsed Document and
   read its textContent ourselves.
───────────────────────────────────────── */
async function extractEPUBText(from, to) {
  const book = window.currentEPUB;
  let extracted = '';

  for (let i = from; i <= to; i++) {
    const ref = epubChapterRefs[i - 1];
    if (!ref) continue;

    try {
      const section = ref.item;
      if (!section) continue;

      // TEMPORARY DIAGNOSTIC — book.load is undefined in this build,
      // so log the real shape of `section` and `book` once to find
      // the actual working method instead of guessing again.
      if (i === from) {
        console.log('[DocQuiz][DEBUG] section object:', section);
        console.log('[DocQuiz][DEBUG] typeof section.load:', typeof section.load);
        console.log('[DocQuiz][DEBUG] typeof section.render:', typeof section.render);
        console.log('[DocQuiz][DEBUG] typeof book.load:', typeof book.load);
        console.log('[DocQuiz][DEBUG] typeof book.request:', typeof book.request);
        console.log('[DocQuiz][DEBUG] book keys:', Object.keys(book));
        console.log('[DocQuiz][DEBUG] section keys:', Object.keys(section));
      }

      // Try calling section.load() with no arguments first — some
      // epub.js builds have the section carry its own request method
      // internally and don't need an external loader passed in at all.
      let doc;
      if (typeof section.load === 'function') {
        doc = typeof book.load === 'function'
          ? await section.load(book.load.bind(book))
          : await section.load();
      }

      const bodyText = doc?.body?.textContent ?? (typeof doc === 'string' ? doc : '');
      extracted += String(bodyText).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() + ' ';

      if (typeof section.unload === 'function') section.unload();

    } catch (err) {
      console.warn(`[DocQuiz] Could not load EPUB chapter ${i}:`, err);
    }
  }

  return extracted.trim();
}

/* ─────────────────────────────────────────
   AI API call — with per-option explanations
───────────────────────────────────────── */
async function fetchPDFQuizFromAI(text, level, count) {
  const levelDesc = {
    low:    'very easy basic recall',
    medium: 'medium difficulty application',
    high:   'hard analytical exam level',
  };

  const prompt = `You are a quiz maker. Based on the following text, generate ${count} ${levelDesc[level] ?? 'medium difficulty'} multiple choice questions.

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
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    let msg = `API error (${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) msg = body.error;
    } catch {
      msg = response.statusText || msg;
    }
    throw new Error(msg);
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

  const fill = document.getElementById('pdf-progress-fill');
  if (fill) {
    fill.style.width = pct + '%';
    fill.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', Math.round(pct));
  }

  setText('pdf-quiz-counter', `Question ${pdfCurrentQ + 1} of ${total}`);
  setText('pdf-quiz-label',
    `${docType === 'epub' ? 'EPUB' : 'PDF'} Quiz — ${capitalize(pdfLevel)} level`);
  setText('pdf-question-text', q.q);

  document.querySelectorAll('.option-explanation').forEach(e => e.remove());

  const optList = document.getElementById('pdf-options-list');
  if (!optList) return;
  optList.innerHTML = '';

  const letters  = ['A', 'B', 'C', 'D'];
  const answered = pdfAnswers[pdfCurrentQ] !== null;

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.setAttribute('role', 'listitem');
    btn.setAttribute('aria-label', `Option ${letters[i]}: ${opt}`);
    btn.innerHTML = `<span class="opt-letter" aria-hidden="true">${letters[i]}</span>${escapeHTML(opt)}`;

    if (answered) {
      btn.disabled = true;
      if (i === q.answer)                    btn.classList.add('correct');
      else if (i === pdfAnswers[pdfCurrentQ]) btn.classList.add('wrong');
    } else {
      btn.addEventListener('click', () => selectPDFAnswer(i));
    }

    optList.appendChild(btn);
  });

  if (answered) {
    renderPDFExplanations(q);
  }

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

/* ─────────────────────────────────────────
   Per-option explanations
───────────────────────────────────────── */
function renderPDFExplanations(q) {
  if (!q.explanations || !Array.isArray(q.explanations)) return;

  const optList = document.getElementById('pdf-options-list');
  if (!optList) return;

  const btns = optList.querySelectorAll('.option-btn');
  btns.forEach((btn, i) => {
    const text = q.explanations[i];
    if (!text) return;

    const expDiv = document.createElement('div');
    expDiv.className = 'option-explanation ' +
      (i === q.answer ? 'opt-exp-correct' : 'opt-exp-wrong');
    expDiv.textContent = text;
    expDiv.setAttribute('role', 'note');
    btn.after(expDiv);
  });
}

function selectPDFAnswer(index) {
  if (pdfAnswers[pdfCurrentQ] !== null) return;
  pdfAnswers[pdfCurrentQ] = index;

  const q    = pdfQuiz[pdfCurrentQ];
  const btns = document.querySelectorAll('#pdf-options-list .option-btn');
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer)  btn.classList.add('correct');
    else if (i === index) btn.classList.add('wrong');
  });

  renderPDFExplanations(q);
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

  setText('pdf-result-icon',
    percent >= 80 ? '🏆' :
    percent >= 60 ? '👍' :
    percent >= 40 ? '📚' : '💪'
  );

  setText('pdf-result-score',   `${score} / ${total}`);
  setText('pdf-result-percent', `${percent}%`);
  setText('pdf-result-msg',
    percent >= 80 ? 'Excellent! You understood the material well.' :
    percent >= 60 ? 'Good work! Keep studying.'                    :
    percent >= 40 ? 'Keep reading. You can do better!'             :
    'Read the material again and retry!'
  );

  renderPDFBreakdown();
  showPDFRetryOptions();
}

/* ─────────────────────────────────────────
   Breakdown — includes explanation note
───────────────────────────────────────── */
function renderPDFBreakdown() {
  const container = document.getElementById('pdf-result-breakdown');
  if (!container) return;
  container.innerHTML = '';

  const frag = document.createDocumentFragment();

  pdfQuiz.forEach((q, i) => {
    const correct    = pdfAnswers[i] === q.answer;
    const yourAns    = pdfAnswers[i] !== null ? q.options[pdfAnswers[i]] : 'Not answered';
    const correctAns = q.options[q.answer];

    let noteText = '';
    if (Array.isArray(q.explanations)) {
      const idx = correct ? q.answer : (pdfAnswers[i] ?? q.answer);
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
   "What do you want to do?" retry prompt
───────────────────────────────────────── */
function showPDFRetryOptions() {
  document.getElementById('pdf-retry-options')?.remove();

  const resultBtns = document.querySelector('.result-btns');
  if (!resultBtns) return;

  const div = document.createElement('div');
  div.id = 'pdf-retry-options';
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
      <button type="button" id="pdf-retry-same-btn" style="
        padding:10px 20px;border-radius:10px;
        background:rgba(124,108,240,0.15);
        border:1px solid rgba(124,108,240,0.3);
        color:var(--accent-light,#a78bfa);font-size:13px;font-weight:700;
        font-family:Nunito,sans-serif;cursor:pointer;
      ">
        🔄 Retry same quiz
      </button>
      <button type="button" id="pdf-retry-new-btn" style="
        padding:10px 20px;border-radius:10px;
        background:linear-gradient(135deg,#34d399,#059669);
        border:none;
        color:#fff;font-size:13px;font-weight:700;
        font-family:Nunito,sans-serif;cursor:pointer;
      ">
        ✨ Upload new document
      </button>
    </div>`;

  resultBtns.after(div);

  document.getElementById('pdf-retry-same-btn')?.addEventListener('click', pdfRetrySame);
  document.getElementById('pdf-retry-new-btn') ?.addEventListener('click', pdfNewQuiz);
}

function pdfRetrySame() {
  document.getElementById('pdf-retry-options')?.remove();
  pdfCurrentQ = 0;
  pdfAnswers  = new Array(pdfQuiz.length).fill(null);
  hideSection('pdf-results');
  showSection('pdf-quiz-active');
  renderPDFQuestion();
}

function pdfNewQuiz() {
  document.getElementById('pdf-retry-options')?.remove();

  docText            = '';
  docType            = null;
  pdfQuiz            = [];
  pdfCurrentQ        = 0;
  pdfAnswers         = [];
  pdfLevel           = '';
  docTotalUnits      = 0;
  epubChapterRefs    = [];
  window.currentPDF  = null;
  window.currentEPUB = null;

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
  if (text)  text.textContent = 'Click to upload PDF or EPUB';
  if (input) input.value = '';
  if (btn)   { btn.setAttribute('disabled', true); btn.setAttribute('aria-disabled', 'true'); }

  document.querySelectorAll('#level-group .level-card').forEach(c => {
    c.classList.remove('selected');
    c.setAttribute('aria-checked', 'false');
  });
}

/* ─────────────────────────────────────────
   Exports
   REQUIRED because pdfquiz.html may call these
   via inline onclick="..." attributes.
───────────────────────────────────────── */
window.handlePDFUpload  = handlePDFUpload;
window.selectPDFLevel   = selectPDFLevel;
window.generatePDFQuiz  = generatePDFQuiz;
window.pdfNextQ         = pdfNextQ;
window.pdfPrevQ         = pdfPrevQ;
window.pdfRetrySame     = pdfRetrySame;
window.pdfNewQuiz       = pdfNewQuiz;
window.selectPDFAnswer  = selectPDFAnswer;