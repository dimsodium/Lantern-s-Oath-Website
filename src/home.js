import './styles.css';
import { startBackground } from './bg.js';
import { getSprite } from './game/sprites.js';
import { loadLeaderboard } from './api.js';

startBackground(document.getElementById('bg-stars'));

// Hero portrait rendered from the in-game sprite.
const warden = getSprite('player');
document.getElementById('hero-warden').src = warden.toDataURL();

const ROMAN = ['—', 'I', 'II', 'III'];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function renderBoard() {
  const body = document.getElementById('board-body');
  try {
    const { players } = await loadLeaderboard();
    if (!players.length) {
      body.innerHTML = '<tr><td colspan="4" class="empty">No scores yet. Be the first Warden on the board.</td></tr>';
      return;
    }
    body.innerHTML = players
      .map(
        (p, i) => `<tr><td>${i + 1}</td><td>${esc(p.name)}</td><td>${p.completed ? '✦ All' : ROMAN[Math.max(0, p.highestLevel - 1)]}</td><td class="score">${Number(p.bestScore).toLocaleString()}</td></tr>`
      )
      .join('');
  } catch {
    body.innerHTML = '<tr><td colspan="4" class="empty">The leaderboard appears once the database is connected.</td></tr>';
  }
}
renderBoard();
