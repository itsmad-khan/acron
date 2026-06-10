function initReader() {
    // Check if student is logged in
    const loggedIn = localStorage.getItem('acron_logged_in');
    if (!loggedIn) {
      window.location.href = 'login.html';
      return;
    }
  
    // Get student data
    const saved = localStorage.getItem('acron_user');
if (!saved) {
  window.location.href = 'login.html';
  return;
}
const user = JSON.parse(saved);
console.log('Reader user:', user);
  
    // Get subject from URL
    const params = new URLSearchParams(window.location.search);
    const subject = params.get('subject') || 'Physics';
  
    // Update book title and meta
    const titleEl = document.getElementById('book-title');
    const metaEl = document.getElementById('book-meta');
    const boardNames = {
      punjab: 'Punjab Board', sindh: 'Sindh Board',
      kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
    };
    if (titleEl) titleEl.textContent = subject;
    if (metaEl) metaEl.textContent = 'Class ' + user.cls + ' — ' + (boardNames[user.board] || user.board);
  
    // Load chapters for this subject
    loadChapterList(subject, user.cls);
  }
  
  function loadChapterList(subject, cls) {
    // Chapters for each subject
    const chapters = {
      'Physics': [
        'Chapter 1 — Physical Quantities',
        'Chapter 2 — Kinematics',
        'Chapter 3 — Dynamics',
        'Chapter 4 — Work and Energy',
        'Chapter 5 — Circular Motion',
        'Chapter 6 — Fluid Dynamics',
        'Chapter 7 — Oscillations',
        'Chapter 8 — Waves',
        'Chapter 9 — Thermodynamics',
        'Chapter 10 — Electrostatics',
        'Chapter 11 — Current Electricity',
        'Chapter 12 — Electromagnetism',
      ],
      'Chemistry': [
        'Chapter 1 — Basic Concepts',
        'Chapter 2 — Atomic Structure',
        'Chapter 3 — Chemical Bonding',
        'Chapter 4 — States of Matter',
        'Chapter 5 — Chemical Equilibrium',
        'Chapter 6 — Reaction Kinetics',
        'Chapter 7 — Electrochemistry',
        'Chapter 8 — Organic Chemistry',
      ],
      'Biology': [
        'Chapter 1 — Introduction to Biology',
        'Chapter 2 — Biological Molecules',
        'Chapter 3 — Enzymes',
        'Chapter 4 — The Cell',
        'Chapter 5 — Cell Division',
        'Chapter 6 — Nutrition',
        'Chapter 7 — Gaseous Exchange',
        'Chapter 8 — Transport',
        'Chapter 9 — Homeostasis',
        'Chapter 10 — Nervous System',
      ],
      'Mathematics': [
        'Chapter 1 — Functions and Limits',
        'Chapter 2 — Differentiation',
        'Chapter 3 — Integration',
        'Chapter 4 — Differential Equations',
        'Chapter 5 — Vectors',
        'Chapter 6 — Conic Sections',
        'Chapter 7 — Linear Programming',
      ],
      'English': [
        'Unit 1 — Reading',
        'Unit 2 — Writing Skills',
        'Unit 3 — Grammar',
        'Unit 4 — Comprehension',
        'Unit 5 — Literature',
      ],
      'Urdu': [
        'سبق 1 — نثر',
        'سبق 2 — شاعری',
        'سبق 3 — گرامر',
        'سبق 4 — خط نویسی',
        'سبق 5 — مضمون نویسی',
      ],
      'Islamiat': [
        'Chapter 1 — Quran Studies',
        'Chapter 2 — Hadith',
        'Chapter 3 — Islamic History',
        'Chapter 4 — Islamic Ethics',
      ],
      'Pakistan Studies': [
        'Chapter 1 — Geography of Pakistan',
        'Chapter 2 — History of Pakistan',
        'Chapter 3 — Economy',
        'Chapter 4 — Government and Politics',
      ],
    };
  
    const list = document.getElementById('chapters-list');
    if (!list) return;
  
    const chaps = chapters[subject] || ['Chapter 1', 'Chapter 2', 'Chapter 3'];
    list.innerHTML = '';
  
    chaps.forEach((ch, i) => {
      const btn = document.createElement('button');
      btn.className = 'chapter-btn';
      btn.innerHTML = `
        <span class="ch-num">${i + 1}</span>
        <span>${ch}</span>
      `;
      btn.onclick = () => openChapter(btn, subject, ch, i + 1);
      list.appendChild(btn);
    });
  }
  
  function openChapter(btn, subject, chapterName, chNum) {
    // Mark active chapter
    document.querySelectorAll('.chapter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  
    // Show toolbar
    const toolbar = document.getElementById('reader-toolbar');
    const pdfWrap = document.getElementById('pdf-frame-wrap');
    const chView = document.getElementById('chapter-view');
    const nameEl = document.getElementById('current-chapter-name');
  
    if (toolbar) toolbar.style.display = 'flex';
    if (pdfWrap) pdfWrap.style.display = 'block';
    if (nameEl) nameEl.textContent = chapterName;
  
    // Hide pick-chapter message
    const pickState = chView ? chView.querySelector('.pick-chapter-state') : null;
    if (pickState) pickState.style.display = 'none';
  
    // Set quiz link for this chapter
    const quizBtn = document.getElementById('btn-quiz-chapter');
    if (quizBtn) {
      quizBtn.href = 'quiz.html?subject=' + encodeURIComponent(subject) + '&chapter=' + chNum;
    }
  
    // Load the book PDF from PCTB (embedded from official source)
    loadBookPDF(subject, chNum);
  
    // Save chapter as read
    saveChapterRead(subject, chNum);
  }
  
  function loadBookPDF(subject, chNum) {
    const frame = document.getElementById('pdf-frame');
    if (!frame) return;
  
    const saved = localStorage.getItem('acron_user');
    if (!saved) return;
    const user = JSON.parse(saved);
    const board = user.board;
    const cls = user.cls;
  
    // Book links for each board
    // Replace these links with real links from each board website
    const bookLinks = {
      punjab: {
        '11': {
          'Physics':          'https://pctb.punjab.gov.pk/system/files/Physics-11.pdf',
          'Chemistry':        'https://pctb.punjab.gov.pk/system/files/Chemistry-11.pdf',
          'Biology':          'https://pctb.punjab.gov.pk/system/files/Biology-11.pdf',
          'Mathematics':      'https://pctb.punjab.gov.pk/system/files/Mathematics-11.pdf',
          'English':          'https://pctb.punjab.gov.pk/system/files/English-11.pdf',
          'Urdu':             'https://pctb.punjab.gov.pk/system/files/Urdu-11.pdf',
          'Islamiat':         'https://pctb.punjab.gov.pk/system/files/Islamiat-11.pdf',
        },
        '12': {
          'Physics':          'https://pctb.punjab.gov.pk/system/files/Physics-12.pdf',
          'Chemistry':        'https://pctb.punjab.gov.pk/system/files/Chemistry-12.pdf',
          'Biology':          'https://pctb.punjab.gov.pk/system/files/Biology-12.pdf',
          'Mathematics':      'https://pctb.punjab.gov.pk/system/files/Mathematics-12.pdf',
          'English':          'https://pctb.punjab.gov.pk/system/files/English-12.pdf',
          'Urdu':             'https://pctb.punjab.gov.pk/system/files/Urdu-12.pdf',
          'Islamiat':         'https://pctb.punjab.gov.pk/system/files/Islamiat-12.pdf',
        },
        '9': {
          'Physics':          'https://pctb.punjab.gov.pk/system/files/Physics-9.pdf',
          'Chemistry':        'https://pctb.punjab.gov.pk/system/files/Chemistry-9.pdf',
          'Biology':          'https://pctb.punjab.gov.pk/system/files/Biology-9.pdf',
          'Mathematics':      'https://pctb.punjab.gov.pk/system/files/Mathematics-9.pdf',
          'English':          'https://pctb.punjab.gov.pk/system/files/English-9.pdf',
          'Urdu':             'https://pctb.punjab.gov.pk/system/files/Urdu-9.pdf',
          'Islamiat':         'https://pctb.punjab.gov.pk/system/files/Islamiat-9.pdf',
          'Pakistan Studies': 'https://pctb.punjab.gov.pk/system/files/PakistanStudies-9.pdf',
        },
        '10': {
          'Physics':          'https://pctb.punjab.gov.pk/system/files/Physics-10.pdf',
          'Chemistry':        'https://pctb.punjab.gov.pk/system/files/Chemistry-10.pdf',
          'Biology':          'https://pctb.punjab.gov.pk/system/files/Biology-10.pdf',
          'Mathematics':      'https://pctb.punjab.gov.pk/system/files/Mathematics-10.pdf',
          'English':          'https://pctb.punjab.gov.pk/system/files/English-10.pdf',
          'Urdu':             'https://pctb.punjab.gov.pk/system/files/Urdu-10.pdf',
          'Islamiat':         'https://pctb.punjab.gov.pk/system/files/Islamiat-10.pdf',
          'Pakistan Studies': 'https://pctb.punjab.gov.pk/system/files/PakistanStudies-10.pdf',
        }
      },
  
      federal: {
        '9':  {
          'Physics':          'https://drive.google.com/file/d/1BpgKxJU89aepwrSsvsF0M61kn1L3r4Yy/preview',
          'Chemistry':        'https://drive.google.com/file/d/1F7iOH7rIEtoHsfTxKsdKoXrTeHZXtDYv/preview',
          'Biology':          'https://drive.google.com/file/d/1CPA5cGolkCNMWMaOqkZxETs-Md04wav0/preview',
          'Mathematics':      'https://drive.google.com/file/d/1TY-ODfEhnaqN_l-58PtTvGH-auqX2gHz/preview',
          'English':          'https://drive.google.com/file/d/1ntNMhZHp7YFU4kvH6pTWC-Qvgk1ZOBrb/preview',
          'Urdu':             'https://www.fbise.edu.pk/books/9th/Urdu-9.pdf',
          'Islamiat':         'https://www.fbise.edu.pk/books/9th/Islamiat-9.pdf',
          'Pakistan Studies': 'https://www.fbise.edu.pk/books/9th/PakistanStudies-9.pdf',
        },
        '10': {
          'Physics':          'https://drive.google.com/file/d/1MJYGsMRA55G9tBRehwIUk83TisN5NeiM/preview',
          'Chemistry':        'https://drive.google.com/file/d/1zdcDZjbgyTArKlzGE1AXQRFRa_YCBLa6/preview',
          'Biology':          'https://drive.google.com/file/d/1Gl2ePEkACoLRynpZ5UOuDhFRSCPztBfa/preview',
          'Mathematics':      'https://drive.google.com/file/d/1LgeeRK1DWS7RyYTUuLj8suI1bz3IcTS6/preview',
          'English':          'https://drive.google.com/file/d/1cV2QWlkyLmObOjqa0XjILa_TfePZ7B1-/preview',
          'Urdu':             'https://www.fbise.edu.pk/books/10th/Urdu-10.pdf',
          'Islamiat':         'https://www.fbise.edu.pk/books/10th/Islamiat-10.pdf',
          'Pakistan Studies': 'https://www.fbise.edu.pk/books/10th/PakistanStudies-10.pdf',
        },
        '11': {
          'Physics':          'https://drive.google.com/file/d/1vHjbup3WaCgXGm03hsHggWY-Q-SF5ncJ/preview',
          'Chemistry':        'https://drive.google.com/file/d/1cxytbf2_5iOcvPc9kQ_CPFC1lQoKM5qr/preview',
          'Biology':          'https://drive.google.com/file/d/1NBKiUyzbRbgdWuaHbGdsiPxDwR93iAMi/preview',
          'Mathematics':      'https://www.fbise.edu.pk/books/11th/Mathematics-11.pdf',
          'English':          'https://drive.google.com/file/d/1uIqf5wEtT0GYXnFKHv_RadPKT2P8TkdZ/preview',
          'Urdu':             'https://www.fbise.edu.pk/books/11th/Urdu-11.pdf',
          'Islamiat':         'https://www.fbise.edu.pk/books/11th/Islamiat-11.pdf',
        },
        '12': {
          'Physics':          'https://drive.google.com/file/d/1NVpE7msOv6kcHoYJoxoO1AjDOMNcA35m/preview',
          'Chemistry':        'https://drive.google.com/file/d/1d-ZocwUKvtfb8w86hDksuDzXFSlcKHbe/preview',
          'Biology':          'https://drive.google.com/file/d/14uMCzeqDUMTMuZ7U81N3cbEu7p8MQUPw/preview',
          'Mathematics':      'https://www.fbise.edu.pk/books/12th/Mathematics-12.pdf',
          'English':          'https://drive.google.com/file/d/1FbWrAViM_fRbI232vYUF3z_4az_e0tnP/preview',
          'Urdu':             'https://www.fbise.edu.pk/books/12th/Urdu-12.pdf',
          'Islamiat':         'https://www.fbise.edu.pk/books/12th/Islamiat-12.pdf',
        }
      },
  
      sindh: {
        '9':  { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
        '10': { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
        '11': { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
        '12': { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
      },
  
      kpk: {
        '9':  { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
        '10': { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
        '11': { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
        '12': { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
      },
  
      balochistan: {
        '9':  { 'Physics': '', 'Chemistry': '', 'Biology': 'https://drive.google.com/file/d/1nVI5Lx6V4kDByF9zyFkwbs0jAV6feHJ4/preview', 'Mathematics': '', 'English': 'https://drive.google.com/file/d/1-41sCw7xKc_ycrzZs2Hen-XWGP4gggmI/preview', 'Urdu': '' },
        '10': { 'Physics': '', 'Chemistry': 'https://drive.google.com/file/d/1kq6TIegAGWrwX4Pw0B5zHPprHPs__xYr/preview', 'Biology': '', 'Mathematics': '', 'English': 'https://drive.google.com/file/d/10zqWJmhiCEpan1DQ3rp9EYIPj64BgKsr/preview', 'Urdu': '' },
        '11': { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
        '12': { 'Physics': '', 'Chemistry': '', 'Biology': '', 'Mathematics': '', 'English': '', 'Urdu': '' },
      },
    };
  
    const url = bookLinks[board] &&
                bookLinks[board][cls] &&
                bookLinks[board][cls][subject];
  
    if (url && url !== '') {
      frame.src = url + '#page=' + (chNum * 10);
    } else {
      const pdfWrap = document.getElementById('pdf-frame-wrap');
      if (pdfWrap) pdfWrap.innerHTML = `
        <div style="padding:3rem; text-align:center; color:#6b7280; font-family:Nunito,sans-serif;">
          <p style="font-size:16px; color:#a78bfa; font-weight:700; margin-bottom:8px;">
            Book link coming soon
          </p>
          <p style="font-size:13px;">
            Visit your board's official website to find the book.
          </p>
          <p style="font-size:13px; margin-top:6px; color:#6c63ff;">
            Punjab: pctb.punjab.gov.pk<br/>
            Federal: fbise.edu.pk
          </p>
        </div>`;
    }
  }
  
  function saveChapterRead(subject, chNum) {
    const saved = localStorage.getItem('acron_user');
    if (!saved) return;
    const user = JSON.parse(saved);
    if (!user.chaptersRead) user.chaptersRead = [];
    const key = subject + '_' + chNum;
    if (!user.chaptersRead.includes(key)) {
      user.chaptersRead.push(key);
      localStorage.setItem('acron_user', JSON.stringify(user));
    }
  }
  
  let currentFontSize = 16;
  function changeFont(dir) {
    currentFontSize = Math.min(22, Math.max(12, currentFontSize + dir * 2));
    const frame = document.getElementById('pdf-frame');
    if (frame) frame.style.fontSize = currentFontSize + 'px';
  }
  
  let darkMode = false;
  function toggleDark() {
    darkMode = !darkMode;
    document.body.style.background = darkMode ? '#000' : '#0d0d1a';
  }