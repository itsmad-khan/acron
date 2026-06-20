// Import Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
} from 'https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyCqVWOIq1uJJZApIVBZL2rLi--nhK_0kno",
  authDomain: "acron-22009.firebaseapp.com",
  databaseURL: "https://acron-22009-default-rtdb.firebaseio.com",
  projectId: "acron-22009",
  storageBucket: "acron-22009.firebasestorage.app",
  messagingSenderId: "458504291274",
  appId: "1:458504291274:web:623a0c43c9d663be8f4533",
};

// Initialize Firebase
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

/* ─────────────────────────────────────────
   Auth-ready safeguard
   Fixes a known Firebase race condition: right after
   createUserWithEmailAndPassword() resolves, the user is
   signed in client-side, but the ID token used by Realtime
   Database security rules ($uid === auth.uid) can briefly
   still be stale. Forcing a token refresh — and waiting for
   onAuthStateChanged to confirm the same UID — guarantees the
   very next database write is evaluated with a fresh, valid
   auth context, avoiding PERMISSION_DENIED errors.
───────────────────────────────────────── */
function waitForAuthUser(expectedUid) {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.uid === expectedUid) {
        unsubscribe();
        resolve(user);
      }
    });
    // Safety timeout — never hang forever if something is wrong
    setTimeout(() => { unsubscribe(); resolve(auth.currentUser); }, 5000);
  });
}

async function ensureFreshToken(user) {
  try {
    // Force a token refresh so security rules see up-to-date auth state
    await user.getIdToken(true);
  } catch (err) {
    console.warn('[Firebase] Could not refresh ID token:', err);
  }
}

/* ─────────────────────────────────────────
   Retry helper for database writes
   Adds resilience against the rare case where the token
   refresh above still isn't enough on a slow connection.
───────────────────────────────────────── */
async function writeWithRetry(path, data, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      await set(ref(db, path), data);
      return; // success
    } catch (err) {
      lastErr = err;
      if (err.code === 'PERMISSION_DENIED' && i < attempts - 1) {
        // Wait briefly and let auth state settle before retrying
        await new Promise(r => setTimeout(r, 400 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/* ─────────────────────────────────────────
   SIGNUP
───────────────────────────────────────── */
async function firebaseSignup(name, email, password, board, cls, medium) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Send verification email — independent of database write,
  // so it still goes out even if the DB write below needs retries.
  await sendEmailVerification(user);

  // Make sure auth state + ID token are fully settled before
  // writing to the database (fixes PERMISSION_DENIED on signup).
  await waitForAuthUser(user.uid);
  await ensureFreshToken(user);

  // Save user profile — with retry safeguard
  await writeWithRetry(`users/${user.uid}`, {
    name,
    email,
    board,
    cls,
    medium,
    createdAt: new Date().toISOString(),
    emailVerified: false,
    quizHistory: [],
    chaptersRead: [],
  });

  return user;
}

/* ─────────────────────────────────────────
   LOGIN
───────────────────────────────────────── */
async function firebaseLogin(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/* ─────────────────────────────────────────
   PASSWORD RESET
   Sends Firebase's built-in "reset your password" email.
   Firebase intentionally does NOT reveal whether the email
   exists in the system (security best practice — prevents
   attackers from using this to find out which emails are
   registered). The UI should always show the same generic
   success message regardless of whether the account exists.
───────────────────────────────────────── */
async function firebaseSendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

/* ─────────────────────────────────────────
   LOGOUT
───────────────────────────────────────── */
async function firebaseLogout() {
  await signOut(auth);
  localStorage.clear();
  window.location.href = 'index.html';
}

/* ─────────────────────────────────────────
   GET USER DATA
───────────────────────────────────────── */
async function firebaseGetUser(uid) {
  const snapshot = await get(ref(db, `users/${uid}`));
  return snapshot.exists() ? snapshot.val() : null;
}

/* ─────────────────────────────────────────
   SAVE QUIZ RESULT
───────────────────────────────────────── */
async function firebaseSaveQuiz(uid, quizData) {
  const snapshot = await get(ref(db, `users/${uid}/quizHistory`));
  let history = snapshot.exists() ? snapshot.val() : [];
  if (!Array.isArray(history)) history = Object.values(history);

  history = history.filter(q =>
    !(q.subject === quizData.subject &&
      q.chapter == quizData.chapter &&
      q.level === quizData.level)
  );
  history.push(quizData);

  await writeWithRetry(`users/${uid}/quizHistory`, history);
}

/* ─────────────────────────────────────────
   UPDATE PROFILE
───────────────────────────────────────── */
async function firebaseUpdateProfile(uid, data) {
  await update(ref(db, `users/${uid}`), data);
}

/* ─────────────────────────────────────────
   SAVE CHAPTER READ
───────────────────────────────────────── */
async function firebaseSaveChapter(uid, chapterKey) {
  const snapshot = await get(ref(db, `users/${uid}/chaptersRead`));
  let chapters = snapshot.exists() ? snapshot.val() : [];
  if (!Array.isArray(chapters)) chapters = Object.values(chapters);

  if (!chapters.includes(chapterKey)) {
    chapters.push(chapterKey);
    await writeWithRetry(`users/${uid}/chaptersRead`, chapters);
  }
}

/* ─────────────────────────────────────────
   AUTH STATE LISTENER (public)
───────────────────────────────────────── */
function onAuthReady(callback) {
  onAuthStateChanged(auth, callback);
}

export {
  auth, db,
  firebaseSignup, firebaseLogin, firebaseLogout,
  firebaseGetUser, firebaseSaveQuiz,
  firebaseUpdateProfile, firebaseSaveChapter,
  firebaseSendPasswordReset,
  onAuthReady, sendEmailVerification,
};