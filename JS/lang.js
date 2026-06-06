// ===== STAR BACKGROUND =====
function generateStars() {
    const container = document.getElementById('stars');
    if (!container) return;
    for (let i = 0; i < 120; i++) {
      const s = document.createElement('div');
      s.className = 'star';
      const size = Math.random() * 2.5 + 0.5;
      s.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random()*100}%;
        top:${Math.random()*100}%;
        --dur:${2+Math.random()*4}s;
        --op:${0.2+Math.random()*0.6};
        animation-delay:${Math.random()*5}s;
      `;
      container.appendChild(s);
    }
  }
  
  // ===== LANGUAGE =====
  const LANG = {
    en: {
      'txt-badge': "Pakistan's free study platform",
      'txt-hero': null,
      'txt-sub': 'Books, quizzes and notes — all in one place, completely free.',
      'txt-step1': 'Choose your board',
      'txt-step2': 'Choose your class',
      'txt-cont': 'Select board and class to continue',
      'txt-cont-ready': 'Continue to sign up',
      'txt-have-account': null,
      'f1': "Read your board's books",
      'f2': 'AI quiz — 3 difficulty levels',
      'f3': 'Track your progress',
      'txt-signup-title': 'Create your free account',
      'txt-signup-sub': 'Start studying in less than 1 minute',
      'txt-create': 'Create my account',
      'txt-success': 'Account created! Going to your dashboard...',
      'lbl-name': 'Your full name',
      'lbl-email': 'Email address',
      'lbl-pass': 'Password',
      'lbl-pass2': 'Confirm password',
      'lbl-medium': 'Study medium',
      'txt-login-title': 'Welcome back!',
      'txt-login-sub': 'Log in to continue studying',
      'txt-login-btn': 'Log in',
      'lbl-subject': 'Subject',
      'lbl-chapter': 'Chapter',
      'lbl-level': 'Difficulty level',
      'lbl-qcount': 'Number of questions',
      'txt-setup-title': 'Create your quiz',
      'txt-setup-sub': 'Choose your subject, chapter, and level',
      'txt-gen-quiz': 'Generate my quiz',
      'txt-generating': 'Generating your quiz...',
      'txt-gen-sub': 'AI is making questions just for you',
      'lv-low': 'Low', 'lv-low-d': 'Basic questions — easy',
      'lv-med': 'Medium', 'lv-med-d': 'Mix of easy and hard',
      'lv-hi': 'High', 'lv-hi-d': 'Hard — exam level',
      'txt-subjects': 'Your subjects',
      'txt-recent': 'Recent quizzes',
      'txt-no-quiz': 'No quizzes yet. Pick a subject and start!',
      'txt-start-quiz': 'Start a quiz',
      'qq-title': 'Quick quiz',
      'qq-sub': 'Test yourself right now',
      'lbl-quizzes': 'Quizzes taken',
      'lbl-avg': 'Average score',
      'lbl-chapters': 'Chapters read',
      'txt-chapters': 'Chapters',
      'txt-pick-chapter': 'Pick a chapter from the left to start reading',
      'txt-quiz-this': 'Quiz this chapter',
      'txt-old-found': 'You have a previous quiz for this!',
      'txt-retry': 'Retry old quiz',
      'txt-new-instead': 'New quiz',
    },
    ur: {
      'txt-badge': 'پاکستان کا مفت تعلیمی پلیٹ فارم',
      'txt-sub': 'کتابیں، کوئز اور نوٹس — سب ایک جگہ، بالکل مفت',
      'txt-step1': 'اپنا بورڈ چنیں',
      'txt-step2': 'اپنی جماعت چنیں',
      'txt-cont': 'بورڈ اور جماعت چنیں',
      'txt-cont-ready': 'سائن اپ کی طرف جائیں',
      'f1': 'اپنے بورڈ کی کتابیں پڑھیں',
      'f2': 'اے آئی کوئز — 3 مشکل سطح',
      'f3': 'اپنی ترقی دیکھیں',
      'txt-signup-title': 'مفت اکاؤنٹ بنائیں',
      'txt-signup-sub': '1 منٹ سے کم میں پڑھنا شروع کریں',
      'txt-create': 'میرا اکاؤنٹ بنائیں',
      'txt-success': 'اکاؤنٹ بن گیا! ڈیش بورڈ کی طرف جا رہے ہیں...',
      'lbl-name': 'آپ کا پورا نام',
      'lbl-email': 'ای میل',
      'lbl-pass': 'پاس ورڈ',
      'lbl-pass2': 'پاس ورڈ دوبارہ لکھیں',
      'lbl-medium': 'پڑھنے کا ذریعہ',
      'txt-login-title': 'خوش آمدید!',
      'txt-login-sub': 'پڑھنا جاری رکھنے کے لیے لاگ ان کریں',
      'txt-login-btn': 'لاگ ان',
      'lbl-subject': 'مضمون',
      'lbl-chapter': 'باب',
      'lbl-level': 'مشکل سطح',
      'lbl-qcount': 'سوالات کی تعداد',
      'txt-setup-title': 'اپنا کوئز بنائیں',
      'txt-setup-sub': 'مضمون، باب اور سطح چنیں',
      'txt-gen-quiz': 'میرا کوئز بنائیں',
      'txt-generating': 'آپ کا کوئز بن رہا ہے...',
      'txt-gen-sub': 'اے آئی آپ کے لیے سوالات بنا رہا ہے',
      'lv-low': 'آسان', 'lv-low-d': 'بنیادی سوالات',
      'lv-med': 'درمیانہ', 'lv-med-d': 'آسان اور مشکل کا مرکب',
      'lv-hi': 'مشکل', 'lv-hi-d': 'امتحانی سطح',
      'txt-subjects': 'آپ کے مضامین',
      'txt-recent': 'حالیہ کوئز',
      'txt-no-quiz': 'ابھی تک کوئی کوئز نہیں۔ مضمون چنیں اور شروع کریں!',
      'txt-start-quiz': 'کوئز شروع کریں',
      'qq-title': 'فوری کوئز',
      'qq-sub': 'ابھی خود کو جانچیں',
      'lbl-quizzes': 'لیے گئے کوئز',
      'lbl-avg': 'اوسط اسکور',
      'lbl-chapters': 'پڑھے گئے ابواب',
      'txt-chapters': 'ابواب',
      'txt-pick-chapter': 'پڑھنے کے لیے بائیں طرف سے باب منتخب کریں',
      'txt-quiz-this': 'اس باب کا کوئز',
      'txt-old-found': 'آپ کا پچھلا کوئز موجود ہے!',
      'txt-retry': 'پرانا کوئز دوبارہ دیں',
      'txt-new-instead': 'نیا کوئز',
    }
  };
  
  let currentLang = localStorage.getItem('ilmpath_lang') || 'en';
  
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('ilmpath_lang', lang);
    document.documentElement.lang = lang;
  
    const btnEn = document.getElementById('btn-en');
    const btnUr = document.getElementById('btn-ur');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
    if (btnUr) btnUr.classList.toggle('active', lang === 'ur');
  
    const t = LANG[lang];
    Object.keys(t).forEach(id => {
      const el = document.getElementById(id);
      if (el && t[id]) el.textContent = t[id];
    });
  
    if (typeof onLangChange === 'function') onLangChange(lang);
  }
  
  function t(key) {
    return (LANG[currentLang] && LANG[currentLang][key]) || (LANG['en'] && LANG['en'][key]) || key;
  }
  
  window.addEventListener('DOMContentLoaded', () => {
    setLang(currentLang);
  });

  // ===== THEME =====
function toggleTheme() {
  const isLight = document.body.classList.contains('light-theme');
  if (isLight) {
    document.body.classList.remove('light-theme');
    localStorage.setItem('acron_theme', 'dark');
    document.getElementById('theme-icon-dark').style.display = 'block';
    document.getElementById('theme-icon-light').style.display = 'none';
  } else {
    document.body.classList.add('light-theme');
    localStorage.setItem('acron_theme', 'light');
    document.getElementById('theme-icon-dark').style.display = 'none';
    document.getElementById('theme-icon-light').style.display = 'block';
  }
}

// Apply saved theme on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('acron_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    if (darkIcon) darkIcon.style.display = 'none';
    if (lightIcon) lightIcon.style.display = 'block';
  }
  setLang(currentLang);
});