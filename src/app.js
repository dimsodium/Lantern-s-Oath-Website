// Page routing (#home, #controls, #login, #play), sign-in and saving progress.
// Signed out → #play sends you to #login; signed in (account or guest) → #login goes straight to #play.
import {
  isConfigured, watchAuth, pilotName, signInEmail, signUpEmail, signInGoogle, resetPassword,
  playAsGuest, logOut, friendlyAuthError,
} from './firebase.js';
import { loadProgress, submitRun } from './api.js';
import { audio } from './site/audio.js';
import { createGame } from './game/game.js';

const $ = (id) => document.getElementById(id);
const ROUTES = ['home', 'controls', 'login', 'play'];
const state = { user: null, ready: false, best: 0, highest: 1 };
let game = null;

function mountUserSlot() {
  const slot = document.querySelector('.user-slot');
  slot.innerHTML = '';
  if (!state.user) return;
  const b = document.createElement('button');
  b.textContent = `${pilotName(state.user)} ▾ Sign out`;
  b.onclick = async () => {
    await logOut();
    location.hash = '#home';
  };
  slot.appendChild(b);
}

function showProgress() {
  $('welcome').textContent = `Welcome, ${pilotName(state.user)}`;
  $('progress').textContent = `Highest level reached: ${state.highest} of 3 · Best score: ${state.best}`;
}

function applyProgress(p) {
  state.best = p.bestScore;
  state.highest = p.highestLevel;
  showProgress();
}

function route() {
  if (!state.ready) return;   // wait for Firebase to say who's signed in
  let r = (location.hash || '#home').slice(1);
  if (!ROUTES.includes(r)) r = 'home';
  if (r === 'login' && state.user) r = 'play';
  if (r === 'play' && !state.user) r = 'login';
  if ('#' + r !== location.hash && location.hash) history.replaceState(null, '', '#' + r);
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.id !== r));
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === r));
  if (r === 'play') {
    showProgress();
    loadProgress().then(applyProgress);
    if (!game) {
      game = createGame($('game'), {
        pilot: pilotName(state.user),
        onLevelEnd,
        onQuit: () => { location.hash = '#home'; },
      });
    }
    setTimeout(() => $('game').focus(), 0);
  } else if (game) {
    game.destroy();
    game = null;
  }
  audio.music(r === 'home');   // the theme plays on the home screen
  if (r === 'login') setTimeout(() => (isConfigured ? $('email') : $('pilot')).focus(), 0);
  scrollTo(0, 0);
}

function onLevelEnd({ level, score, bossDefeated }) {
  // show it at once, then take whatever the server (or browser storage) recorded
  state.best = Math.max(state.best, score);
  state.highest = Math.max(state.highest, bossDefeated ? Math.min(level + 1, 3) : level);
  showProgress();
  submitRun(level, score, bossDefeated).then(applyProgress);
}

// ---- Guest form (always available) ----
$('guest-form').onsubmit = (e) => {
  e.preventDefault();
  const name = $('pilot').value.trim() || 'Lantern';
  $('msg').textContent = 'Charging your lantern…';
  $('msg').className = 'msg ok';
  playAsGuest(name);
  location.hash = '#play';
};

// ---- Account form (only once Firebase is configured) ----
function setupAccountForm() {
  const form = $('account-form'), msg = $('acct-msg');
  let mode = 'signin';
  $('preview-note').hidden = true;
  form.hidden = false;
  $('auth-or').hidden = false;
  $('login-sub').textContent = 'Sign in to save your progress, or jump in as a guest.';

  const say = (text, ok) => { msg.textContent = text; msg.className = 'msg ' + (ok ? 'ok' : 'err'); };
  const busy = (on) => form.querySelectorAll('button, input').forEach((el) => (el.disabled = on));
  const done = () => { say('Charging your lantern…', true); location.hash = '#play'; };

  form.querySelectorAll('[data-mode]').forEach((tab) => {
    tab.onclick = () => {
      mode = tab.dataset.mode;
      form.querySelectorAll('[data-mode]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      form.querySelector('[data-signup]').hidden = mode !== 'signup';
      $('acct-submit').textContent = mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN';
      $('password').autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
      $('forgot').hidden = mode === 'signup';
      say('', true);
    };
  });

  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = $('email').value.trim(), password = $('password').value;
    busy(true);
    try {
      if (mode === 'signup') await signUpEmail($('acct-name').value.trim(), email, password);
      else await signInEmail(email, password);
      done();
    } catch (err) {
      say(friendlyAuthError(err));
    } finally {
      busy(false);
    }
  };

  $('google').onclick = async () => {
    busy(true);
    try {
      await signInGoogle();
      done();
    } catch (err) {
      say(friendlyAuthError(err));
    } finally {
      busy(false);
    }
  };

  $('forgot').onclick = async () => {
    const email = $('email').value.trim();
    if (!email) { say('Enter your email above, then press this again.'); $('email').focus(); return; }
    try {
      await resetPassword(email);
      say('Check your inbox for a reset link.', true);
    } catch (err) {
      say(friendlyAuthError(err));
    }
  };
}

export function initApp() {
  if (isConfigured) setupAccountForm();
  addEventListener('hashchange', route);
  watchAuth((user) => {
    const changed = !state.ready || (user && user.uid) !== (state.user && state.user.uid) || pilotName(user) !== pilotName(state.user);
    state.user = user;
    state.ready = true;
    mountUserSlot();
    if (changed) {
      // a different pilot: start their game fresh with their own name and progress
      if (game) { game.destroy(); game = null; }
      route();
    }
  });
}
