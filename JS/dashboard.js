import { firebaseGetUser, firebaseLogout } from './firebase-config.js';

async function initDashboard() {
  const loggedIn = localStorage.getItem('acron_logged_in');
  if (!loggedIn) {
    window.location.href = 'login.html';
    return;
  }

  const uid = localStorage.getItem('acron_uid');
  if (!uid) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const user = await firebaseGetUser(uid);
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Save fresh data to localStorage
    localStorage.setItem('acron_user', JSON.stringify({...user, uid}));

    // Show last login
    const lastLoginEl = document.getElementById('last-login-time');
    if (lastLoginEl) lastLoginEl.textContent = getLastLogin();

    // Show device warning
    if (localStorage.getItem('acron_show_device_warning') === 'true') {
      localStorage.removeItem('acron_show_device_warning');
      setTimeout(() => {
        const warn = document.getElementById('device-warning');
        if (warn) {
          warn.style.display = 'flex';
          setTimeout(() => warn.style.display = 'none', 5000);
        }
      }, 500);
    }

    // Show greeting
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const greetEl = document.getElementById('dash-greeting');
    if (greetEl) greetEl.textContent = greet + ', ' + user.name + '! 👋';

    // Show board and class info
    const boardNames = {
      punjab: 'Punjab Board', sindh: 'Sindh Board',
      kpk: 'KPK Board', balochistan: 'Balochistan Board', federal: 'Federal Board'
    };
    const infoEl = document.getElementById('dash-info');
    if (infoEl) {
      if (user.cls === 'other') {
        infoEl.textContent = 'Senior Student';
      } else {
        infoEl.textContent = (boardNames[user.board] || user.board) + ' — Class ' + user.cls;
      }
    }

    // Show avatar
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.textContent = user.name.charAt(0).toUpperCase();

    // Show stats
    const history = user.quizHistory || [];
    const quizArr = Array.isArray(history) ? history : Object.values(history);
    document.getElementById('stat-quizzes').textContent = quizArr.length;

    const chapters = user.chaptersRead || [];
    const chapArr = Array.isArray(chapters) ? chapters : Object.values(chapters);
    document.getElementById('stat-chapters').textContent = chapArr.length;

    if (quizArr.length > 0) {
      const avg = Math.round(quizArr.reduce((a, b) => a + b.percent, 0) / quizArr.length);
      document.getElementById('stat-avg').textContent = avg + '%';
    }

    // Load subjects
    loadSubjects(user.board, user.cls);

    // Show quiz history
    showQuizHistory(quizArr);

  } catch (err) {
    console.log('Dashboard error:', err);
  }
}

function loadSubjects(board, cls) {
  const subjects = {
    '9':  ['Physics','Chemistry','Biology','Mathematics','English'],
    '10': ['Physics','Chemistry','Biology','Mathematics','English'],
    '11': ['Physics','Chemistry','Biology','Mathematics','English'],
    '12': ['Physics','Chemistry','Biology','Mathematics','English'],
    'other': []
  };

  const colors = ['#6c63ff','#34d399','#f87171','#fbbf24','#60a5fa'];
  const list = document.getElementById('subjects-list');
  if (!list) return;

  const subs = subjects[cls] || subjects['9'];
  list.innerHTML = '';

  if (cls === 'other' || subs.length === 0) {
    list.innerHTML = `
      <div style="
        text-align:center;padding:2rem;
        background:rgba(108,99,255,0.08);
        border:1px solid rgba(108,99,255,0.2);
        border-radius:16px;
      ">
        <div style="font-size:32px;margin-bottom:10px">📄</div>
        <div style="font-size:15px;font-weight:700;color:#a78bfa;margin-bottom:6px">
          Welcome Senior Student!
        </div>
        <div style="font-size:13px;color:#6b7280;margin-bottom:1rem">
          Upload any PDF and create a quiz from it
        </div>
        <a href="pdfquiz.html" style="
          display:inline-flex;align-items:center;gap:8px;
          background:linear-gradient(135deg,#6c63ff,#a855f7);
          color:#fff;text-decoration:none;
          padding:12px 24px;border-radius:12px;
          font-size:14px;font-weight:700;
        ">
          Start PDF Quiz
        </a>
      </div>
    `;
    return;
  }

  subs.forEach((sub, i) => {
    const item = document.createElement('a');
    item.href = 'reader.html?subject=' + encodeURIComponent(sub);
    item.className = 'subject-item';
    item.innerHTML = `
      <div class="subject-left">
        <div class="subject-dot" style="background:${colors[i % colors.length]}"></div>
        <div><div class="subject-name">${sub}</div></div>
      </div>
      <svg class="subject-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    `;
    list.appendChild(item);
  });
}

function showQuizHistory(history) {
  const container = document.getElementById('quiz-history');
  if (!container) return;

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
        <p>No quizzes yet. Pick a subject and start!</p>
      </div>`;
    return;
  }

  const recent = history.slice(-5).reverse();
  container.innerHTML = '';

  recent.forEach(q => {
    const scoreClass = q.percent >= 70 ? 'score-good' : q.percent >= 40 ? 'score-ok' : 'score-bad';
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
      <div class="hist-left">
        <div class="hist-name">${q.subject} — Ch.${q.chapter}</div>
        <div class="hist-meta">${q.level} — ${q.date}</div>
      </div>
      <div class="hist-score ${scoreClass}">${q.score}/${q.total}</div>
    `;
    container.appendChild(item);
  });
}

function logout() {
  firebaseLogout();
}

window.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
  initDashboard();
});

function showMotivationalQuote() {
  const quotes = [
    { en: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
    { en: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
    { en: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { en: "It always seems impossible until it is done.", author: "Nelson Mandela" },
    { en: "Believe you can and you are halfway there.", author: "Theodore Roosevelt" },
    { en: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
    { en: "Life is what happens when you are busy making other plans.", author: "John Lennon" },
    { en: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { en: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { en: "Everything you have ever wanted is on the other side of fear.", author: "George Addair" },
    { en: "Success is not final, failure is not fatal — it is the courage to continue that counts.", author: "Winston Churchill" },
    { en: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
    { en: "You miss 100% of the shots you do not take.", author: "Wayne Gretzky" },
    { en: "Whether you think you can or you think you cannot, you are right.", author: "Henry Ford" },
    { en: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { en: "Do not wait. The time will never be just right.", author: "Napoleon Hill" },
    { en: "The mind is not a vessel to be filled but a fire to be kindled.", author: "Plutarch" },
    { en: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { en: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King" },
    { en: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin" },
    { en: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
    { en: "Knowledge is power.", author: "Francis Bacon" },
    { en: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle" },
    { en: "Wisdom is not a product of schooling but of the lifelong attempt to acquire it.", author: "Albert Einstein" },
    { en: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
    { en: "What we think, we become.", author: "Buddha" },
    { en: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
    { en: "Two roads diverged in a wood, and I took the one less traveled by.", author: "Robert Frost" },
    { en: "I have not failed. I have just found 10,000 ways that do not work.", author: "Thomas Edison" },
    { en: "The person who says it cannot be done should not interrupt the person doing it.", author: "Chinese Proverb" },
    { en: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
    { en: "In three words I can sum up everything I have learned about life — it goes on.", author: "Robert Frost" },
    { en: "If you tell the truth, you do not have to remember anything.", author: "Mark Twain" },
    { en: "A friend is someone who knows all about you and still loves you.", author: "Elbert Hubbard" },
    { en: "To live is the rarest thing in the world. Most people just exist.", author: "Oscar Wilde" },
    { en: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },
    { en: "We accept the love we think we deserve.", author: "Stephen Chbosky" },
    { en: "It is never too late to be what you might have been.", author: "George Eliot" },
    { en: "Do not go where the path may lead — go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
    { en: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
    { en: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
    { en: "Always remember that you are absolutely unique, just like everyone else.", author: "Margaret Mead" },
    { en: "Do not judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson" },
    { en: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { en: "An unexamined life is not worth living.", author: "Socrates" },
    { en: "Spread love everywhere you go.", author: "Mother Teresa" },
    { en: "When one door of happiness closes, another opens.", author: "Helen Keller" },
    { en: "Life is not measured by the number of breaths we take but by the moments that take our breath away.", author: "Maya Angelou" },
    { en: "If life were predictable it would cease to be life and be without flavor.", author: "Eleanor Roosevelt" },
    { en: "If you look at what you have in life, you will always have more.", author: "Oprah Winfrey" },
    { en: "If you want to live a happy life, tie it to a goal, not to people or things.", author: "Albert Einstein" },
    { en: "Never let the fear of striking out keep you from playing the game.", author: "Babe Ruth" },
    { en: "Money and success do not change people — they merely amplify what is already there.", author: "Will Smith" },
    { en: "Your time is limited, so do not waste it living someone else's life.", author: "Steve Jobs" },
    { en: "Not how long, but how well you have lived is the main thing.", author: "Seneca" },
    { en: "If life were easy it would not be worth living.", author: "Theodore Roosevelt" },
    { en: "You become what you believe.", author: "Oprah Winfrey" },
    { en: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain" },
    { en: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { en: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou" },
    { en: "We may encounter many defeats but we must not be defeated.", author: "Maya Angelou" },
    { en: "Knowing is not enough — we must apply. Being willing is not enough — we must do.", author: "Leonardo da Vinci" },
    { en: "Imagine your life is perfect in every respect — what would it look like?", author: "Brian Tracy" },
    { en: "We generate fears while we sit. We overcome them by action.", author: "Dr. Henry Link" },
    { en: "Whether you think you can or think you cannot, you are right.", author: "Henry Ford" },
    { en: "The man who has confidence in himself gains the confidence of others.", author: "Hasidic Proverb" },
    { en: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
    { en: "Creativity is intelligence having fun.", author: "Albert Einstein" },
    { en: "What you lack in talent can be made up with desire, hustle and giving 110% all the time.", author: "Don Zimmer" },
    { en: "Do what you can with all you have wherever you are.", author: "Theodore Roosevelt" },
    { en: "Develop success from failures. Discouragement and failure are two of the surest stepping stones to success.", author: "Dale Carnegie" },
    { en: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
    { en: "To see what is right and not do it is a lack of courage.", author: "Confucius" },
    { en: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
    { en: "The more I read, the more I acquire, the more certain I am that I know nothing.", author: "Voltaire" },
    { en: "I find television very educational. Every time someone turns it on, I go in the other room and read a book.", author: "Groucho Marx" },
    { en: "Today a reader, tomorrow a leader.", author: "Margaret Fuller" },
    { en: "A reader lives a thousand lives before he dies. The man who never reads lives only one.", author: "George R.R. Martin" },
  ];

  // Pick a RANDOM quote every time
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[randomIndex];

  const el = document.getElementById('quote-text');
  if (!el) return;

  el.innerHTML = `
    <span class="quote-en">"${quote.en}"</span>
    <span class="quote-author">— ${quote.author}</span>
  `;
}