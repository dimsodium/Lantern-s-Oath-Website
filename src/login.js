import './styles.css';
import { startBackground } from './bg.js';
import {
  isConfigured, watchAuth, signInEmail, signUpEmail, signInGoogle, resetPassword,
  playAsGuest, friendlyAuthError,
} from './firebase.js';

startBackground(document.getElementById('bg-stars'));

const GAME_URL = '/game.html';
const $ = (id) => document.getElementById(id);
const form = $('auth-form');
const msg = $('msg');
const submit = $('submit-btn');
let mode = 'signin';
let busy = false;

function say(text, kind = 'error') {
  msg.textContent = text;
  msg.className = `msg ${text ? kind : ''}`;
}

function setBusy(b) {
  busy = b;
  submit.disabled = b;
  $('google-btn').disabled = b;
  submit.textContent = b ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account';
}

if (!isConfigured) {
  $('dev-notice').hidden = false;
  $('auth-ui').hidden = true;
  $('guest-btn').addEventListener('click', () => {
    playAsGuest();
    location.href = GAME_URL;
  });
} else {
  // Already signed in? Go straight to the game.
  watchAuth((user) => {
    if (user && !busy) location.replace(GAME_URL);
  });
}

document.querySelectorAll('.tabs button').forEach((btn) =>
  btn.addEventListener('click', () => {
    mode = btn.dataset.mode;
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    $('name-field').hidden = mode !== 'signup';
    $('password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    submit.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    say('');
  })
);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('email').value.trim();
  const password = $('password').value;
  const name = $('name').value.trim();
  if (!email || !password) return say('Enter your email and password.');
  if (mode === 'signup' && !name) return say('Choose a Warden name.');
  setBusy(true);
  say('');
  try {
    if (mode === 'signin') await signInEmail(email, password);
    else await signUpEmail(name, email, password);
    location.href = GAME_URL;
  } catch (err) {
    say(friendlyAuthError(err));
    setBusy(false);
  }
});

$('google-btn').addEventListener('click', async () => {
  setBusy(true);
  say('');
  try {
    await signInGoogle();
    location.href = GAME_URL;
  } catch (err) {
    say(friendlyAuthError(err));
    setBusy(false);
  }
});

$('forgot-btn').addEventListener('click', async () => {
  const email = $('email').value.trim();
  if (!email) return say('Enter your email above, then press “Forgot password?” again.');
  try {
    await resetPassword(email);
    say('Password reset email sent. Check your inbox.', 'ok');
  } catch (err) {
    say(friendlyAuthError(err));
  }
});
