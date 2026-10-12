// Firebase Authentication (login). Config comes from Vite env vars (see .env.example).
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

// When Firebase isn't configured yet (local dev), the site offers a guest mode
// so the game can still be played; progress is then kept in the browser only.
export const isConfigured = Boolean(config.apiKey && config.authDomain && config.projectId);

const auth = isConfigured ? getAuth(initializeApp(config)) : null;
const GUEST_KEY = 'lo_guest';

function guestUser() {
  try {
    if (localStorage.getItem(GUEST_KEY) === '1') {
      return { uid: 'guest', displayName: 'Guest Warden', isGuest: true };
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function watchAuth(cb) {
  if (!auth) {
    cb(guestUser());
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export function currentUser() {
  return auth ? auth.currentUser : guestUser();
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
  }
  return cred;
}

export async function signInGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function resetPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

export function playAsGuest() {
  try {
    localStorage.setItem(GUEST_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

export async function logOut() {
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* storage unavailable */
  }
  if (auth) await signOut(auth);
}

export function friendlyAuthError(err) {
  const code = err?.code || '';
  const map = {
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/missing-password': 'Enter your password.',
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
