/* ============================================================
   config.js + lang.js — merged utility file
   Handles: API key, stars, language, theme
   ============================================================ */

/* ─────────────────────────────────────────
   API Key
───────────────────────────────────────── */
async function loadAPIKey() {
  try {
    const res  = await fetch('/api/config');
    const data = await res.json();
    window.ACRON_API_KEY = data.apiKey;
  } catch {
    // Silently fail — key may be set another way
  }
}
loadAPIKey();

/* ─────────────────────────────────────────
   Star background
───────────────────────────────────────── */
function generateStars() {
  const container = document.getElementById('stars');
  if (!container) return;

  // Use a document fragment to avoid repeated DOM writes
  const frag = document.createDocumentFragment();

  for (let i = 0; i < 120; i++) {
    const s    = document.createElement('div');
    const size = Math.random() * 2.5 + 0.5;
    s.className = 'star';
    s.style.cssText = [
      `width:${size}px`,
      `height:${size}px`,
      `left:${(Math.random() * 100).toFixed(2)}%`,
      `top:${(Math.random()  * 100).toFixed(2)}%`,
      `--dur:${(2 + Math.random() * 4).toFixed(2)}s`,
      `--op:${(0.2 + Math.random() * 0.6).toFixed(2)}`,
      `animation-delay:${(Math.random() * 5).toFixed(2)}s`,
    ].join(';');
    frag.appendChild(s);
  }

  container.appendChild(frag);
}

/* ─────────────────────────────────────────
   Translation strings
───────────────────────────────────────── */
const LANG = {
  en: {
    /* Welcome page */
    'txt-badge':         "Pakistan's free study platform",
    'txt-sub':           'Books, quizzes and notes — all in one place, completely free.',
    'txt-step1':         'Choose your board',
    'txt-step2':         'Choose your class',
    'txt-cont':          'Select board and class to continue',
    'txt-cont-ready':    'Continue to sign up',
    'f1':                "Read your board's books",
    'f2':                'AI quiz — 3 difficulty levels',
    'f3':                'Track your progress',

    /* Auth */
    'txt-login':         'Log in',
    'txt-signup-title':  'Create your free account',
    'txt-signup-sub':    'Start studying in less than 1 minute',
    'txt-create':        'Create my account',
    'txt-success':       'Account created! Going to your dashboard…',
    'lbl-name':          'Your full name',
    'lbl-email':         'Email address',
    'lbl-pass':          'Password',
    'lbl-pass2':         'Confirm password',
    'lbl-medium':        'Study medium',
    'txt-login-title':   'Welcome back!',
    'txt-login-sub':     'Log in to continue studying',
    'txt-login-btn':     'Log in',
    'txt-have-account':  null, // contains HTML — skip text replacement
    'txt-login-link':    'Log in here',

    /* Quiz setup */
    'lbl-subject':       'Subject',
    'lbl-chapter':       'Chapter',
    'lbl-level':         'Difficulty level',
    'lbl-qcount':        'Number of questions',
    'txt-setup-title':   'Create your quiz',
    'txt-setup-sub':     'Choose your subject, chapter, and level',
    'txt-gen-quiz':      'Generate my quiz',
    'txt-generating':    'Generating your quiz…',
    'txt-gen-sub':       'AI is making questions just for you',
    'lv-low':            'Low',
    'lv-low-d':          'Basic questions — easy',
    'lv-med':            'Medium',
    'lv-med-d':          'Mix of easy and hard',
    'lv-hi':             'High',
    'lv-hi-d':           'Hard — exam level',
    'txt-old-found':     'You have a previous quiz for this!',
    'txt-retry':         'Retry old quiz',
    'txt-new-instead':   'New quiz',
    'txt-start-quiz':    'Start a quiz',

    /* Dashboard */
    'txt-subjects':      'Your subjects',
    'txt-recent':        'Recent quizzes',
    'txt-no-quiz':       'No quizzes yet. Pick a subject and start!',
    'qq-title':          'Quick quiz',
    'qq-sub':            'Test yourself right now',
    'lbl-quizzes':       'Quizzes taken',
    'lbl-avg':           'Average score',
    'lbl-chapters':      'Chapters read',

    /* Reader */
    'txt-chapters':      'Chapters',
    'txt-pick-chapter':  'Pick a chapter from the left to start reading',
    'txt-quiz-this':     'Quiz this chapter',

    /* Progress */
    'progress-sub':      'See how you are doing in every subject',
  },

  ur: {
    /* Welcome page */
    'txt-badge':         'پاکستان کا مفت تعلیمی پلیٹ فارم',
    'txt-sub':           'کتابیں، کوئز اور نوٹس — سب ایک جگہ، بالکل مفت',
    'txt-step1':         'اپنا بورڈ چنیں',
    'txt-step2':         'اپنی جماعت چنیں',
    'txt-cont':          'بورڈ اور جماعت چنیں',
    'txt-cont-ready':    'سائن اپ کی طرف جائیں',
    'f1':                'اپنے بورڈ کی کتابیں پڑھیں',
    'f2':                'اے آئی کوئز — 3 مشکل سطح',
    'f3':                'اپنی ترقی دیکھیں',

    /* Auth */
    'txt-login':         'لاگ ان',
    'txt-signup-title':  'مفت اکاؤنٹ بنائیں',
    'txt-signup-sub':    '1 منٹ سے کم میں پڑھنا شروع کریں',
    'txt-create':        'میرا اکاؤنٹ بنائیں',
    'txt-success':       'اکاؤنٹ بن گیا! ڈیش بورڈ کی طرف جا رہے ہیں...',
    'lbl-name':          'آپ کا پورا نام',
    'lbl-email':         'ای میل',
    'lbl-pass':          'پاس ورڈ',
    'lbl-pass2':         'پاس ورڈ دوبارہ لکھیں',
    'lbl-medium':        'پڑھنے کا ذریعہ',
    'txt-login-title':   'خوش آمدید!',
    'txt-login-sub':     'پڑھنا جاری رکھنے کے لیے لاگ ان کریں',
    'txt-login-btn':     'لاگ ان',
    'txt-login-link':    'یہاں لاگ ان کریں',

    /* Quiz setup */
    'lbl-subject':       'مضمون',
    'lbl-chapter':       'باب',
    'lbl-level':         'مشکل سطح',
    'lbl-qcount':        'سوالات کی تعداد',
    'txt-setup-title':   'اپنا کوئز بنائیں',
    'txt-setup-sub':     'مضمون، باب اور سطح چنیں',
    'txt-gen-quiz':      'میرا کوئز بنائیں',
    'txt-generating':    'آپ کا کوئز بن رہا ہے...',
    'txt-gen-sub':       'اے آئی آپ کے لیے سوالات بنا رہا ہے',
    'lv-low':            'آسان',
    'lv-low-d':          'بنیادی سوالات',
    'lv-med':            'درمیانہ',
    'lv-med-d':          'آسان اور مشکل کا مرکب',
    'lv-hi':             'مشکل',
    'lv-hi-d':           'امتحانی سطح',
    'txt-old-found':     'آپ کا پچھلا کوئز موجود ہے!',
    'txt-retry':         'پرانا کوئز دوبارہ دیں',
    'txt-new-instead':   'نیا کوئز',
    'txt-start-quiz':    'کوئز شروع کریں',

    /* Dashboard */
    'txt-subjects':      'آپ کے مضامین',
    'txt-recent':        'حالیہ کوئز',
    'txt-no-quiz':       'ابھی تک کوئی کوئز نہیں۔ مضمون چنیں اور شروع کریں!',
    'qq-title':          'فوری کوئز',
    'qq-sub':            'ابھی خود کو جانچیں',
    'lbl-quizzes':       'لیے گئے کوئز',
    'lbl-avg':           'اوسط اسکور',
    'lbl-chapters':      'پڑھے گئے ابواب',

    /* Reader */
    'txt-chapters':      'ابواب',
    'txt-pick-chapter':  'پڑھنے کے لیے بائیں طرف سے باب منتخب کریں',
    'txt-quiz-this':     'اس باب کا کوئز',

    /* Progress */
    'progress-sub':      'اپنی ترقی دیکھیں',
  },
};

/* ─────────────────────────────────────────
   Language state
───────────────────────────────────────── */
let currentLang = localStorage.getItem('acron_lang') || 'en';

/**
 * Switch the UI language.
 * @param {'en'|'ur'} lang
 */
function setLang(lang) {
  if (!LANG[lang]) return;
  currentLang = lang;
  localStorage.setItem('acron_lang', lang);

  // Update <html lang> attribute
  document.documentElement.lang = lang;

  // Update lang toggle buttons
  document.getElementById('btn-en')?.classList.toggle('active', lang === 'en');
  document.getElementById('btn-ur')?.classList.toggle('active', lang === 'ur');

  // Update aria-pressed on lang buttons
  const btnEn = document.getElementById('btn-en');
  const btnUr = document.getElementById('btn-ur');
  if (btnEn) btnEn.setAttribute('aria-pressed', lang === 'en' ? 'true' : 'false');
  if (btnUr) btnUr.setAttribute('aria-pressed', lang === 'ur' ? 'true' : 'false');

  // Apply document direction for Urdu
  document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';

  // Update all translatable elements
  const strings = LANG[lang];
  Object.keys(strings).forEach(id => {
    const value = strings[id];
    if (!value) return; // skip null entries (HTML-containing elements)
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });

  // Notify other scripts (e.g. quiz.js may need to re-render)
  if (typeof onLangChange === 'function') onLangChange(lang);
}

/**
 * Get a translation string by key, with English fallback.
 * @param {string} key
 * @returns {string}
 */
function t(key) {
  return LANG[currentLang]?.[key] ?? LANG['en']?.[key] ?? key;
}

/* ─────────────────────────────────────────
   Theme
───────────────────────────────────────── */

/** Toggle between dark and light mode. */
function toggleTheme() {
  const isLight = document.body.classList.contains('light-mode');
  _applyTheme(isLight ? 'dark' : 'light');
}

/** Apply a theme and persist it. */
function _applyTheme(theme) {
  const light     = theme === 'light';
  const darkIcon  = document.getElementById('theme-icon-dark');
  const lightIcon = document.getElementById('theme-icon-light');

  document.body.classList.toggle('light-mode', light);
  localStorage.setItem('acron_theme', theme);

  if (darkIcon)  darkIcon.style.display  = light ? 'none'  : 'block';
  if (lightIcon) lightIcon.style.display = light ? 'block' : 'none';
}

/* ─────────────────────────────────────────
   Boot — run once DOM is ready
───────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  // Restore saved theme (default: dark)
  const savedTheme = localStorage.getItem('acron_theme') || 'dark';
  _applyTheme(savedTheme);

  // Apply saved language
  setLang(currentLang);
});