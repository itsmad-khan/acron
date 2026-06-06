// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import { getDatabase, ref, set, get, update } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyCqVWOIq1uJJZApIVBZL2rLi--nhK_0kno",
  authDomain: "acron-22009.firebaseapp.com",
  databaseURL: "https://acron-22009-default-rtdb.firebaseio.com",
  projectId: "acron-22009",
  storageBucket: "acron-22009.firebasestorage.app",
  messagingSenderId: "458504291274",
  appId: "1:458504291274:web:623a0c43c9d663be8f4533"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ===== SIGNUP =====
async function firebaseSignup(name, email, password, board, cls, medium) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  await set(ref(db, 'users/' + user.uid), {
    name: name,
    email: email,
    board: board,
    cls: cls,
    medium: medium,
    createdAt: new Date().toISOString(),
    quizHistory: [],
    chaptersRead: []
  });

  return user;
}

// ===== LOGIN =====
async function firebaseLogin(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

// ===== LOGOUT =====
async function firebaseLogout() {
  await signOut(auth);
  localStorage.clear();
  window.location.href = 'index.html';
}

// ===== GET USER DATA =====
async function firebaseGetUser(uid) {
  const snapshot = await get(ref(db, 'users/' + uid));
  if (snapshot.exists()) return snapshot.val();
  return null;
}

// ===== SAVE QUIZ =====
async function firebaseSaveQuiz(uid, quizData) {
  const snapshot = await get(ref(db, 'users/' + uid + '/quizHistory'));
  let history = snapshot.exists() ? snapshot.val() : [];
  if (!Array.isArray(history)) history = Object.values(history);

  history = history.filter(q =>
    !(q.subject === quizData.subject &&
      q.chapter == quizData.chapter &&
      q.level === quizData.level)
  );
  history.push(quizData);
  await set(ref(db, 'users/' + uid + '/quizHistory'), history);
}

// ===== UPDATE PROFILE =====
async function firebaseUpdateProfile(uid, data) {
  await update(ref(db, 'users/' + uid), data);
}

// ===== SAVE CHAPTER READ =====
async function firebaseSaveChapter(uid, chapterKey) {
  const snapshot = await get(ref(db, 'users/' + uid + '/chaptersRead'));
  let chapters = snapshot.exists() ? snapshot.val() : [];
  if (!Array.isArray(chapters)) chapters = Object.values(chapters);

  if (!chapters.includes(chapterKey)) {
    chapters.push(chapterKey);
    await set(ref(db, 'users/' + uid + '/chaptersRead'), chapters);
  }
}

// ===== AUTH STATE =====
function onAuthReady(callback) {
  onAuthStateChanged(auth, callback);
}

export {
  auth, db,
  firebaseSignup, firebaseLogin, firebaseLogout,
  firebaseGetUser, firebaseSaveQuiz,
  firebaseUpdateProfile, firebaseSaveChapter,
  onAuthReady
};