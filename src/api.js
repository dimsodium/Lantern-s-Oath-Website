// Client for the Vercel API routes (which store progress in Turso).
// Guests, and signed-in players when the API can't be reached, keep progress in browser storage.
import { getToken, currentUser, isConfigured } from './firebase.js';

const DEFAULT = { highestLevel: 1, bestScore: 0, completed: false };
const MAX_LEVEL = 3;

function key() {
  return `lo_progress_${currentUser()?.uid || 'guest'}`;
}

function localGet() {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(key()) || '{}') };
  } catch {
    return { ...DEFAULT };
  }
}

function localSet(p) {
  try {
    localStorage.setItem(key(), JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

function applyLocal(level, score, cleared) {
  const p = localGet();
  if (cleared && level >= p.highestLevel && level < MAX_LEVEL) p.highestLevel = level + 1;
  if (cleared && level === MAX_LEVEL) p.completed = true;
  p.bestScore = Math.max(p.bestScore, score);
  localSet(p);
  return p;
}

const useCloud = () => isConfigured && currentUser() && !currentUser().isGuest;

async function call(method, body) {
  const token = await getToken();
  if (!token) throw new Error('Not signed in');
  const res = await fetch('/api/progress', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export async function loadProgress() {
  if (!useCloud()) return { ...localGet(), source: 'local' };
  try {
    const p = await call('GET');
    localSet({ highestLevel: p.highestLevel, bestScore: p.bestScore, completed: p.completed });
    return { ...p, source: 'cloud' };
  } catch (err) {
    console.warn('[Lantern’s Oath] Using local progress:', err.message);
    return { ...localGet(), source: 'local' };
  }
}

export async function submitRun(level, score, cleared) {
  const local = applyLocal(level, Math.round(score), cleared);
  if (!useCloud()) return { ...local, source: 'local' };
  try {
    return { ...(await call('POST', { level, score: Math.round(score), cleared })), source: 'cloud' };
  } catch (err) {
    console.warn('[Lantern’s Oath] Progress saved locally only:', err.message);
    return { ...local, source: 'local' };
  }
}

export async function loadLeaderboard() {
  const res = await fetch('/api/leaderboard');
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}
