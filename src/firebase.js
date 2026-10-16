// Firebase Authentication (login). Config comes from Vite env vars (see .env.example).
// Guests can always play: their pilot name and progress live in this browser only.
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';

const env = import.meta.env || {};
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

// Without the VITE_FIREBASE_* keys (local dev, or a deploy without them) the site is guest-only.
export const isConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

const auth = isConfigured ? getAuth(initializeApp(config)) : null;
const PILOT_KEY = 'lo:pilot';   // the guest's pilot name (same key the artifact used)

function readPilot() {
  try {
    return JSON.parse(localStorage.getItem(PILOT_KEY) || '""') || '';
  } catch {
    return '';
  }
}

function guestUser() {
  const name = readPilot();
  return name ? { uid: 'guest', displayName: name, isGuest: true } : null;
}

// Calls cb(user | null) now and whenever sign-in changes. A signed-in Firebase account wins over a guest.
const listeners = new Set();
let fbUser = null;
const emit = () => listeners.forEach((cb) => cb(currentUser()));

export function watchAuth(cb) {
  listeners.add(cb);
  if (!auth) {
    cb(currentUser());
  } else if (watchAuth.ready) {
    cb(currentUser());
  }
  return () => listeners.delete(cb);
}
if (auth) {
  onAuthStateChanged(auth, (u) => {
    fbUser = u;
    watchAuth.ready = true;
    emit();
  });
}

export function currentUser() {
  return fbUser || guestUser();
}

// The name shown in the header and cursed by Otto. Never the full email (it could end up on the leaderboard).
export function pilotName(user = currentUser()) {
  if (!user) return '';
  return (user.displayName || (user.email ? user.email.split('@')[0] : '') || 'Lantern').slice(0, 24);
}

export async function getToken() {
  return auth?.currentUser ? auth.currentUser.getIdToken() : null;
}

export async function signInEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUpEmail(name, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(cred.user, { displayName: name });
    await cred.user.getIdToken(true); // refresh so the token carries the name
    emit();
  }
  return cred;
}

export async function signInGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function playAsGuest(name) {
  try {
    localStorage.setItem(PILOT_KEY, JSON.stringify(name));
  } catch {
    /* storage unavailable */
  }
  emit();
}

export async function logOut() {
  try {
    localStorage.setItem(PILOT_KEY, '""');
  } catch {
    /* storage unavailable */
  }
  if (auth && auth.currentUser) await signOut(auth);
  else emit();
}

export function friendlyAuthError(err) {
  const code = err?.code || '';
  const map = {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/missing-password': 'Enter your password.',
    'auth/missing-email': 'Enter your email address.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/email-already-in-use': 'An account already exists with that email. Try signing in.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
    'auth/popup-blocked': 'Your browser blocked the Google sign-in popup.',
    'auth/network-request-failed': 'Network error. Check your connection and try again.',
    'auth/unauthorized-domain': 'This domain isn’t authorized in Firebase (add it under Authentication → Settings).',
  };
  return map[code] || 'Something went wrong. Please try again.';
}
