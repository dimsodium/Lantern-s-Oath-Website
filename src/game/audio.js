// Tiny synthesized sound effects (no audio files needed).
const KEY = 'lo_muted';

function readMuted() {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export const Sfx = {
  ctx: null,
  master: null,
  muted: readMuted(),
  lastShot: 0,
  noiseBuf: null,

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 0.6;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(KEY, this.muted ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  },

  tone(type, f0, f1, dur, vol, delay = 0) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise(dur, vol, freq = 1200) {
    const c = this.ctx;
    const t = c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur);
  },

  play(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'shoot': {
        const now = this.ctx.currentTime;
        if (now - this.lastShot < 0.1) return;
        this.lastShot = now;
        this.tone('square', 920, 520, 0.05, 0.025);
        break;
      }
      case 'hit':
        this.tone('sawtooth', 240, 60, 0.18, 0.12);
        break;
      case 'enemyHit':
        this.tone('triangle', 300, 200, 0.04, 0.03);
        break;
      case 'explode':
        this.noise(0.35, 0.18, 1600);
        break;
      case 'bigExplode':
        this.noise(0.9, 0.35, 900);
        this.tone('sine', 120, 30, 0.9, 0.25);
        break;
      case 'pickup':
        this.tone('sine', 520, 1040, 0.12, 0.12);
        this.tone('sine', 780, 1560, 0.12, 0.08, 0.08);
        break;
      case 'shield':
        this.tone('sine', 300, 600, 0.12, 0.05);
        break;
      case 'burst':
        this.noise(0.6, 0.25, 3000);
        this.tone('sine', 200, 900, 0.5, 0.18);
        break;
      case 'warning':
        for (let i = 0; i < 3; i++) this.tone('square', 440, 330, 0.28, 0.06, i * 0.45);
        break;
      case 'clear':
        [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.25, 0.1, i * 0.12));
        break;
      default:
        break;
    }
  },
};
