// Full-screen animated starfield used behind the home and login pages.
import { Starfield } from './game/starfield.js';

export function startBackground(canvas) {
  const ctx = canvas.getContext('2d');
  let field = null;
  let last = 0;
  let time = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!field) field = new Starfield(innerWidth, innerHeight);
    else field.resize(innerWidth, innerHeight);
  }
  resize();
  addEventListener('resize', resize);

  function frame(ts) {
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    time += dt;
    if (!reduce) field.update(dt, 40);
    field.draw(ctx, time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
