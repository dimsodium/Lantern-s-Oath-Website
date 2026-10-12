import { W, H } from './util.js';

const GAME_KEYS = new Set([
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL', 'KeyE', 'KeyF',
  'ShiftLeft', 'ShiftRight',
]);

// Keyboard + pointer (touch / mouse drag) input.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.pointer = { active: false, x: 0, y: 0, id: null };
    this.virtual = { shield: false, burst: false };

    addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.code) && this.captureKeys) e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.pointer.active = false;
    });

    const toLogical = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * W,
        y: ((e.clientY - r.top) / r.height) * H,
      };
    };
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      canvas.setPointerCapture?.(e.pointerId);
      const p = toLogical(e);
      Object.assign(this.pointer, { active: true, id: e.pointerId, ...p });
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.pointer.active || e.pointerId !== this.pointer.id) return;
      Object.assign(this.pointer, toLogical(e));
    });
    const end = (e) => {
      if (e.pointerId === this.pointer.id) this.pointer.active = false;
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    this.captureKeys = true;
  }

  down(...codes) {
    return codes.some((c) => this.keys.has(c));
  }

  hit(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }

  endFrame() {
    this.pressed.clear();
    this.virtual.burst = false;
  }
}
