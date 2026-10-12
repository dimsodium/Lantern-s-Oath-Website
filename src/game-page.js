import './styles.css';
import { watchAuth, logOut, isConfigured } from './firebase.js';
import { loadProgress, submitRun } from './api.js';
import { Game } from './game/engine.js';
import { LEVELS } from './game/levels.js';
import { Sfx } from './game/audio.js';

const $ = (id) => document.getElementById(id);
const OVERLAYS = ['ov-loading', 'ov-briefing', 'ov-paused', 'ov-clear', 'ov-over', 'ov-victory'];
const pauseBtn = $('pause-btn');

let user = null;
let progress = { highestLevel: 1, bestScore: 0 };
let selected = 0;
let runStart = { score: 0, power: 1 }; // what the current level started with
let lastResult = null;
let game = null;

function show(id) {
  OVERLAYS.forEach((o) => ($(o).hidden = o !== id));
  const playing = id === null || id === 'ov-paused';
  pauseBtn.hidden = !playing;
  document.body.classList.toggle('playing', id === null);
  if (game) game.input.captureKeys = id === null;
}

function statsHtml(ev) {
  const t = Math.round(ev.stats.time);
  return `
    <div><b>${ev.score.toLocaleString()}</b><span>Score</span></div>
    <div><b>${ev.stats.kills}</b><span>Defeated</span></div>
    <div><b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b><span>Time</span></div>`;
}

function saveNote(el, result) {
  el.textContent =
    result.source === 'cloud'
      ? '✓ Progress saved to your account'
      : isConfigured && !user?.isGuest
        ? 'Saved on this device (couldn’t reach the server)'
        : 'Saved on this device (guest mode)';
}

// ------------------------------------------------------------ briefing / level select
function renderBriefing() {
  const L = LEVELS[selected];
  $('brief-kicker').textContent = `Level ${L.id} of ${LEVELS.length}`;
  $('brief-title').textContent = L.name;
  $('brief-text').textContent = L.briefing;
  const pick = $('level-pick');
  pick.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const locked = i + 1 > progress.highestLevel;
    b.textContent = locked ? '🔒' : String(lv.id);
    b.disabled = locked;
    b.title = locked ? `Clear level ${i} to unlock` : lv.name;
    b.setAttribute('aria-pressed', String(i === selected));
    b.addEventListener('click', () => {
      selected = i;
      renderBriefing();
    });
    pick.appendChild(b);
  });
  $('who').textContent = `Warden: ${user?.displayName || user?.email || 'Guest'} · Best score ${Number(progress.bestScore || 0).toLocaleString()}`;
}

function launch(levelIndex, carryIn) {
  selected = levelIndex;
  runStart = { ...carryIn };
  show(null);
  Sfx.unlock();
  game.start(levelIndex, carryIn);
  pauseBtn.setAttribute('aria-pressed', 'false');
  pauseBtn.setAttribute('aria-label', 'Pause game');
}

// ------------------------------------------------------------ pause
function togglePause(force) {
  if (!game || game.state !== 'playing') return;
  const next = typeof force === 'boolean' ? force : !game.paused;
  game.setPaused(next);
  pauseBtn.setAttribute('aria-pressed', String(next));
  pauseBtn.setAttribute('aria-label', next ? 'Resume game' : 'Pause game');
  $('mute-btn').textContent = `Sound: ${Sfx.muted ? 'off' : 'on'}`;
  show(next ? 'ov-paused' : null);
}

pauseBtn.addEventListener('click', () => togglePause());
$('resume-btn').addEventListener('click', () => togglePause(false));
$('restart-btn').addEventListener('click', () => {
  game.paused = false;
  launch(game.levelIndex, runStart);
});
$('mute-btn').addEventListener('click', () => {
  Sfx.toggleMute();
  $('mute-btn').textContent = `Sound: ${Sfx.muted ? 'off' : 'on'}`;
});
$('signout-btn').addEventListener('click', async () => {
  await logOut();
  location.href = '/';
});

addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    e.preventDefault();
    togglePause();
  } else if (e.code === 'KeyM') {
    Sfx.toggleMute();
  } else if (e.code === 'Enter' && !$('ov-briefing').hidden) {
    $('launch-btn').click();
  }
});
// Auto-pause when the tab or window loses focus.
document.addEventListener('visibilitychange', () => document.hidden && game?.state === 'playing' && !game.paused && togglePause(true));
addEventListener('blur', () => game?.state === 'playing' && !game.paused && togglePause(true));

// Touch buttons
const shieldBtn = $('touch-shield');
const setShield = (v) => (e) => {
  e.preventDefault();
  if (game) game.input.virtual.shield = v;
};
shieldBtn.addEventListener('pointerdown', setShield(true));
shieldBtn.addEventListener('pointerup', setShield(false));
shieldBtn.addEventListener('pointercancel', setShield(false));
shieldBtn.addEventListener('pointerleave', setShield(false));
$('touch-burst').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (game) game.input.virtual.burst = true;
});

// ------------------------------------------------------------ level results
$('launch-btn').addEventListener('click', () =>
  launch(selected, { score: 0, power: Math.min(3, 1 + selected) })
);
$('next-btn').addEventListener('click', () =>
  launch(selected + 1, { score: lastResult.score, power: lastResult.power })
);
$('retry-btn').addEventListener('click', () => launch(selected, runStart));
$('again-btn').addEventListener('click', () => {
  selected = 0;
  launch(0, { score: 0, power: 1 });
});

async function onGameEvent(ev) {
  if (ev.type === 'gameOver') {
    $('over-stats').innerHTML = statsHtml(ev);
    $('over-save').textContent = 'Saving…';
    show('ov-over');
    const r = await submitRun(ev.level, ev.score, false);
    progress = { ...progress, ...r };
    saveNote($('over-save'), r);
    return;
  }

  lastResult = ev;
  if (ev.type === 'levelClear') {
    $('clear-kicker').textContent = `Level ${ev.level} complete`;
    $('clear-title').textContent = `${LEVELS[ev.levelIndex].name} is clear`;
    $('clear-stats').innerHTML = statsHtml(ev);
    $('clear-save').textContent = 'Saving…';
    $('next-btn').textContent = `Next: ${LEVELS[ev.levelIndex + 1].name} ▸`;
    show('ov-clear');
    const r = await submitRun(ev.level, ev.score, true);
    progress = { ...progress, ...r };
    saveNote($('clear-save'), r);
  } else if (ev.type === 'victory') {
    $('victory-stats').innerHTML = statsHtml(ev);
    $('victory-save').textContent = 'Saving…';
    show('ov-victory');
    const r = await submitRun(ev.level, ev.score, true);
    progress = { ...progress, ...r };
    saveNote($('victory-save'), r);
  }
}

// ------------------------------------------------------------ boot
let booted = false;
watchAuth(async (u) => {
  if (!u) {
    location.replace('/login.html');
    return;
  }
  user = u;
  if (booted) return;
  booted = true;
  game = new Game($('game'), onGameEvent);
  progress = await loadProgress();
  selected = Math.min(LEVELS.length, progress.highestLevel || 1) - 1;
  renderBriefing();
  show('ov-briefing');
});
