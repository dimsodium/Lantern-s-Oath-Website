// Recorded sound effects in public/sfx. Mogo's message: the user's "Windows error" sound
// (freesound_community on Pixabay, Pixabay Content License), leading silence trimmed.
// Fast flight: the user's "fast whoosh" (studiokolomna on Pixabay, Pixabay Content License), trimmed.
const BASE = import.meta.env.BASE_URL;
const SFX_FILES = {
  mogoType: BASE + "sfx/mogo-type.mp3",
  fastWhoosh: BASE + "sfx/fast-whoosh.mp3",
};
// Lantern's Oath sound: every effect and the home theme are synthesized live with Web Audio (no audio files).
// Settings → SOUND turns MUSIC and SFX on or off (saved in "lo-settings" with the other settings).
// Browsers only allow sound after the player clicks or presses a key, so the first one unlocks it.
export const audio = (function () {
  let ac = null, master, sfxBus, musicBus, noiseBuf;
  const loops = {};
  let P = null;
  const prefs = () => { if (P) return P; let s = {}; try { s = JSON.parse(localStorage.getItem("lo-settings") || "{}") || {}; } catch (e) {} const vol = (v) => (typeof v === "number" ? Math.max(0, Math.min(1, v)) : 1);
    return (P = { music: s.music !== false, sfx: s.sfx !== false, musicVol: vol(s.musicVol), sfxVol: vol(s.sfxVol) }); };
  const MUSIC_LEVEL = 0.32;   // the theme's level at 100% on the MUSIC volume bar

  function init() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createDynamicsCompressor(); master.threshold.value = -8; master.knee.value = 6; master.ratio.value = 4; master.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = prefs().sfxVol; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loadSamples();
    return ac;
  }
  // recorded sounds (public/sfx), decoded once
  const samples = {};
  function loadSamples() {
    const data = SFX_FILES;
    Object.keys(data).forEach((k) => {
      fetch(data[k]).then((r) => r.arrayBuffer()).then((buf) => ac.decodeAudioData(buf)).then((b) => { samples[k] = b; }).catch(() => {});
    });
  }
  // play a recorded sound; a new one cuts off the one before it on the same channel, so fast repeats never pile up
  const voices = {};
  function sample(name, vol, channel) {
    const b = samples[name]; if (!b) return false;
    const t = ac.currentTime, prev = channel && voices[channel];
    if (prev) { try { prev.g.gain.setTargetAtTime(0.0001, t, 0.01); prev.src.stop(t + 0.05); } catch (e) {} }
    const src = ac.createBufferSource(), g = ac.createGain();
    src.buffer = b; g.gain.value = vol; src.connect(g); g.connect(sfxBus); src.start(t);
    if (channel) voices[channel] = { src, g };
    return true;
  }
  function unlock() {
    if (!init()) return;
    if (ac.state === "suspended") ac.resume();
    if (wantMusic) startMusic();
  }
  ["pointerdown", "keydown", "touchstart"].forEach((ev) => addEventListener(ev, unlock, { capture: true, passive: true }));

  // ---- building blocks ----
  const SFX_GAIN = 2.4;   // effects are written at modest levels; the compressor on the master catches the big ones
  const live = () => ac && ac.state === "running";
  function env(g, t, a, peak, dur) {   // quick attack, smooth exponential release: no clicks
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(o) {   // {type, f, f1, dur, vol, at, a, filter, q, dest}
    const t = ac.currentTime + (o.at || 0), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    env(g, t, o.a || 0.005, o.vol * (o.dest ? 1 : SFX_GAIN), o.dur);
    let n = osc;
    if (o.filter) { const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = o.filter; f.Q.value = o.q || 0.7; n.connect(f); n = f; }
    n.connect(g); g.connect(o.dest || sfxBus);
    osc.start(t); osc.stop(t + o.dur + 0.05);
  }
  function noise(o) {   // {dur, vol, at, type, f, f1, q, a}
    const t = ac.currentTime + (o.at || 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; src.loop = true;
    f.type = o.type || "bandpass"; f.Q.value = o.q || 1;
    f.frequency.setValueAtTime(o.f, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    env(g, t, o.a || 0.004, o.vol * (o.dest ? 1 : SFX_GAIN), o.dur);
    src.connect(f); f.connect(g); g.connect(o.dest || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + o.dur + 0.05);
  }

  // ---- one-shot effects ----
  const FX = {
    punch() { noise({ dur: 0.07, vol: 0.22, f: 1400, f1: 500, q: 1.2 }); tone({ type: "triangle", f: 190, f1: 90, dur: 0.07, vol: 0.18 }); },
    fist() {   // a green construct fist forming and hooking round: whoosh + bright energy sweep
      noise({ dur: 0.24, vol: 0.28, f: 500, f1: 2400, q: 1.4, a: 0.03 });
      tone({ type: "square", f: 330, f1: 660, dur: 0.16, vol: 0.05, filter: 1800 });
      tone({ type: "sine", f: 990, f1: 1480, dur: 0.18, vol: 0.06, at: 0.02 });
    },
    hit() { tone({ type: "sine", f: 150, f1: 55, dur: 0.12, vol: 0.4 }); noise({ dur: 0.07, vol: 0.22, type: "lowpass", f: 1400 }); },
    boulder() {   // the rock of light is hurled out: a heavy thump as it sets off (the rolling is a held sound, below)
      tone({ type: "sine", f: 100, f1: 40, dur: 0.3, vol: 0.5 });
      noise({ dur: 0.22, vol: 0.25, type: "lowpass", f: 600, f1: 150 });
    },
    boulderHit() { tone({ type: "sine", f: 90, f1: 40, dur: 0.22, vol: 0.45 }); noise({ dur: 0.18, vol: 0.28, type: "lowpass", f: 900, f1: 200 }); },
    rope() {   // the lasso whirls out with a rising swish
      for (let i = 0; i < 3; i++) noise({ dur: 0.12, vol: 0.16, f: 700 + i * 300, f1: 1600 + i * 400, q: 2, at: i * 0.08 });
      tone({ type: "sine", f: 520, f1: 1040, dur: 0.3, vol: 0.05 });
    },
    cinch() {   // the loops snap tight round the rats
      tone({ type: "square", f: 700, f1: 1400, dur: 0.07, vol: 0.06, filter: 2400 });
      noise({ dur: 0.05, vol: 0.2, f: 2500, q: 2 });
    },
    shield() { tone({ type: "sine", f: 260, f1: 780, dur: 0.3, vol: 0.12 }); tone({ type: "triangle", f: 390, f1: 1170, dur: 0.3, vol: 0.05, at: 0.03 }); },
    shieldBreak() { noise({ dur: 0.4, vol: 0.3, f: 3000, f1: 400, q: 0.8 }); tone({ type: "square", f: 500, f1: 80, dur: 0.35, vol: 0.06, filter: 1600 }); },
    ratSwing() { noise({ dur: 0.09, vol: 0.14, f: 1800, f1: 900, q: 1.5 }); tone({ type: "square", f: 220, f1: 160, dur: 0.06, vol: 0.03, filter: 900 }); },
    ratHit() { tone({ type: "square", f: 1500, f1: 2100, dur: 0.06, vol: 0.035, filter: 3000 }); },
    ratDie() {   // a metal-armed space rat goes down: squeak and a clank
      tone({ type: "square", f: 1300, f1: 2300, dur: 0.07, vol: 0.05, filter: 3500 });
      tone({ type: "square", f: 2200, f1: 700, dur: 0.16, vol: 0.05, filter: 3500, at: 0.06 });
      tone({ type: "triangle", f: 1900, f1: 1700, dur: 0.18, vol: 0.05, at: 0.05 });
      noise({ dur: 0.1, vol: 0.12, type: "highpass", f: 3000, at: 0.05 });
    },
    hurt() { tone({ type: "sawtooth", f: 240, f1: 120, dur: 0.14, vol: 0.06, filter: 1200 }); },
    blade() {   // Otto's launcher: a hard mechanical thunk, a metallic ring and the saw whirring away
      tone({ type: "sine", f: 170, f1: 60, dur: 0.14, vol: 0.45 });
      noise({ dur: 0.06, vol: 0.22, type: "lowpass", f: 2000 });
      tone({ type: "square", f: 1850, dur: 0.22, vol: 0.03, filter: 5000 });
      tone({ type: "square", f: 2470, dur: 0.18, vol: 0.02, filter: 5000 });
      const t = ac.currentTime, o = ac.createOscillator(), lf = ac.createOscillator(), lg = ac.createGain(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(420, t + 0.6);
      lf.frequency.value = 38; lg.gain.value = 60; lf.connect(lg); lg.connect(o.frequency);
      f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 3;
      env(g, t + 0.04, 0.05, 0.05, 0.6);
      o.connect(f); f.connect(g); g.connect(sfxBus); o.start(t); lf.start(t); o.stop(t + 0.7); lf.stop(t + 0.7);
    },
    reflect() { tone({ type: "square", f: 1600, f1: 2400, dur: 0.1, vol: 0.04, filter: 4000 }); tone({ type: "sine", f: 800, f1: 1200, dur: 0.15, vol: 0.08 }); },
    laserCharge() { tone({ type: "sawtooth", f: 120, f1: 900, dur: 0.9, vol: 0.05, filter: 1600, a: 0.3 }); tone({ type: "sine", f: 240, f1: 1800, dur: 0.9, vol: 0.05, a: 0.3 }); },
    slam() {   // the ground slam: a deep boom with debris
      tone({ type: "sine", f: 85, f1: 28, dur: 0.7, vol: 0.8 });
      tone({ type: "triangle", f: 160, f1: 50, dur: 0.35, vol: 0.3 });
      noise({ dur: 0.6, vol: 0.45, type: "lowpass", f: 1200, f1: 120 });
      noise({ dur: 0.25, vol: 0.12, type: "highpass", f: 2500, at: 0.05 });
    },
    dash() { noise({ dur: 0.35, vol: 0.18, f: 300, f1: 1200, q: 1, a: 0.1 }); },
    bmpCharge() {   // Beware My Power building: a rising chord that swells until the burst
      [110, 165, 220].forEach((f, i) => tone({ type: "sawtooth", f, f1: f * 3, dur: 1.05, vol: 0.05, filter: 2200, a: 0.8, detune: i * 6 }));
      noise({ dur: 1.05, vol: 0.12, f: 400, f1: 3000, q: 0.8, a: 0.9 });
    },
    bmp() {   // the burst itself
      tone({ type: "sine", f: 70, f1: 24, dur: 1.4, vol: 0.9 });
      noise({ dur: 1.3, vol: 0.55, type: "lowpass", f: 3000, f1: 150 });
      [440, 554, 659, 880].forEach((f, i) => tone({ type: "triangle", f, dur: 1.2, vol: 0.05, at: 0.02 * i }));
      tone({ type: "sawtooth", f: 1200, f1: 200, dur: 0.6, vol: 0.06, filter: 3000 });
    },
    // ---- Level 2: the Manhunters ----
    mhCharge() { tone({ type: "sawtooth", f: 180, f1: 720, dur: 0.34, vol: 0.04, filter: 1800, a: 0.15 }); tone({ type: "sine", f: 360, f1: 1440, dur: 0.34, vol: 0.03, a: 0.15 }); },
    bolt() { tone({ type: "square", f: 1500, f1: 320, dur: 0.12, vol: 0.05, filter: 3200 }); noise({ dur: 0.06, vol: 0.12, f: 3000, q: 2 }); },
    tornado() { noise({ dur: 0.5, vol: 0.22, f: 300, f1: 1400, q: 1.5, a: 0.08 }); noise({ dur: 0.45, vol: 0.1, type: "highpass", f: 2500, a: 0.1 }); },
    // UI: a soft but definite click for anything clickable on the site
    click() {
      noise({ dur: 0.008, vol: 0.22, type: "bandpass", f: 3200, q: 1.8, a: 0.0005 });
      tone({ type: "sine", f: 1800, f1: 1100, dur: 0.025, vol: 0.12, a: 0.001 });
      noise({ dur: 0.006, vol: 0.08, type: "highpass", f: 6000, at: 0.035, a: 0.0005 });
    },
    // Fast flight kicking in: a dark, deep "gone fast" whoosh, a low boom with the air ripping past
    goneFast() {   // a jet engine "shheewww": broadband jet roar swelling as the turbine spools up, then the rush of air tearing past
      const t = ac.currentTime, K = 1 / 1.4;   // the whole sound lasts one second
      const layer = (type, fs, q, gs) => {
        const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
        src.buffer = noiseBuf; src.loop = true; src.playbackRate.value = 0.9 + Math.random() * 0.2; f.type = type; f.Q.value = q;
        f.frequency.setValueAtTime(fs[0][1], t); fs.slice(1).forEach(([at, v]) => f.frequency.exponentialRampToValueAtTime(v, t + at * K));
        g.gain.setValueAtTime(0.0001, t); gs.forEach(([at, v]) => g.gain.exponentialRampToValueAtTime(v, t + at * K));
        src.connect(f); f.connect(g); g.connect(sfxBus); src.start(t); src.stop(t + 1.05);
      };
      layer("lowpass", [[0, 300], [0.35, 1400], [1.4, 500]], 0.5, [[0.12, 0.9], [0.5, 0.7], [1.4, 0.0001]]);           // the jet roar
      layer("bandpass", [[0, 900], [0.3, 4200], [1.3, 1600]], 0.9, [[0.1, 0.55], [0.45, 0.4], [1.3, 0.0001]]);         // the "shheewww" of air
      layer("highpass", [[0, 3000], [0.3, 7000], [1.1, 4000]], 0.6, [[0.08, 0.12], [1.1, 0.0001]]);                    // exhaust hiss
      // turbine whine: two close, quiet tones spooling up (no sweeping pitch drop)
      [[2600, 3900], [2650, 3960]].forEach(([a, b]) => {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = "sine";
        o.frequency.setValueAtTime(a, t); o.frequency.exponentialRampToValueAtTime(b, t + 0.6 * K);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 0.3 * K); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1 * K);
        o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 1.05);
      });
    },
    // Mogo starts typing his message: the user's sound file (public/sfx/mogo-type.mp3), played once
    mogo() { sample("mogoType", 1.6, "mogo"); },
  };

  // ---- held sounds (beam, goggle laser) ----
  const LOOPS = {
    boulder() {   // a rock rolling: a low, lumpy rumble
      const out = ac.createGain();
      const rum = ac.createBufferSource(), rf = ac.createBiquadFilter(), rg = ac.createGain(), wob = ac.createOscillator(), wg = ac.createGain();
      rum.buffer = noiseBuf; rum.loop = true; rf.type = "lowpass"; rf.frequency.value = 220; rf.Q.value = 1.2;
      rg.gain.value = 0.9; wob.frequency.value = 7; wg.gain.value = 0.5; wob.connect(wg); wg.connect(rg.gain);   // the rock thudding round
      rum.connect(rf); rf.connect(rg); rg.connect(out);
      out.connect(sfxBus);
      return { out, nodes: [rum, wob], vol: 0.6 };
    },
    beam() {   // a humming stream of ring energy
      const out = ac.createGain(), f = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
      f.type = "lowpass"; f.frequency.value = 1100; f.Q.value = 4;
      lfo.frequency.value = 7; lg.gain.value = 350; lfo.connect(lg); lg.connect(f.frequency);
      const oscs = [["sawtooth", 110, 0], ["sawtooth", 110, 9], ["sine", 440, 0], ["triangle", 220, -5]].map(([type, fr, dt]) => {
        const o = ac.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = dt; o.connect(f); return o;
      });
      f.connect(out); out.connect(sfxBus);
      return { out, nodes: [...oscs, lfo], vol: 0.18 };
    },
    laser() {   // Otto's goggle laser: a buzzing, wavering tone
      const out = ac.createGain(), f = ac.createBiquadFilter(), vib = ac.createOscillator(), vg = ac.createGain();
      f.type = "bandpass"; f.frequency.value = 1500; f.Q.value = 2;
      vib.frequency.value = 26; vg.gain.value = 40;
      const a = ac.createOscillator(), b = ac.createOscillator();
      a.type = "square"; a.frequency.value = 760; b.type = "sawtooth"; b.frequency.value = 1522;
      vib.connect(vg); vg.connect(a.frequency); vg.connect(b.frequency);
      a.connect(f); b.connect(f); f.connect(out); out.connect(sfxBus);
      return { out, nodes: [a, b, vib], vol: 0.1 };
    },
  };
  function loop(name, on) {
    on = !!on && live() && prefs().sfx;
    const L = loops[name];
    if (on && !L) {
      const l = LOOPS[name](), t = ac.currentTime;
      l.out.gain.setValueAtTime(0.0001, t); l.out.gain.exponentialRampToValueAtTime(l.vol, t + 0.06);
      l.nodes.forEach((n) => n.start(t));
      loops[name] = l;
    } else if (!on && L) {
      const t = ac.currentTime;
      L.out.gain.cancelScheduledValues(t); L.out.gain.setValueAtTime(Math.max(0.0001, L.out.gain.value), t); L.out.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      L.nodes.forEach((n) => n.stop(t + 0.15));
      delete loops[name];
    }
  }
  function stopLoops() { Object.keys(loops).forEach((k) => loop(k, false)); }

  // ---- home theme: a heroic chiptune march in D minor (i - VI - III - VII), 112 bpm, looping ----
  const BPM = 112, E8 = 60 / BPM / 2;
  const nf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  // chords per bar: root notes (MIDI) for the bass, triad for the pad
  const BARS = [[50, [62, 65, 69]], [46, [58, 62, 65]], [53, [60, 65, 69]], [48, [60, 64, 67]],
                [50, [62, 65, 69]], [46, [58, 62, 65]], [43, [55, 58, 62]], [45, [57, 61, 64]]];
  // lead: 8 eighth notes per bar (0 = rest, negative = hold)
  const LEAD = [
    74, 0, 69, 74, 77, -1, 76, 74,     72, 0, 70, 69, 70, -1, 0, 65,
    72, 0, 69, 72, 77, -1, 76, 72,     79, -1, 77, 76, 72, -1, 0, 0,
    74, 0, 69, 74, 77, -1, 79, 81,     82, -1, 81, 79, 77, -1, 74, 0,
    79, -1, 77, 74, 70, -1, 74, 77,    76, -1, -1, 73, 76, -1, -1, 0];
  let wantMusic = false, musicOn = false, step = 0, nextT = 0, timer = 0;
  function playStep(i, t) {
    const bar = BARS[Math.floor(i / 8) % BARS.length], b = i % 8;
    // bass: driving eighths, octave jump on the off-beats
    tone({ type: "triangle", f: nf(bar[0] + (b % 2 ? 12 : 0)), dur: E8 * 0.9, vol: 0.22, at: t - ac.currentTime, dest: musicBus });
    // pad: the chord, swelling once per bar
    if (b === 0) bar[1].forEach((m, k) => tone({ type: "sawtooth", f: nf(m), dur: E8 * 7.6, vol: 0.025, a: 0.15, filter: 1100, detune: k * 4 - 4, at: t - ac.currentTime, dest: musicBus }));
    // drums: kick on 1 and 5, snare on 3 and 7, soft hats on every eighth
    if (b === 0 || b === 4) tone({ type: "sine", f: 120, f1: 45, dur: 0.18, vol: 0.4, at: t - ac.currentTime, dest: musicBus });
    if (b === 2 || b === 6) noise({ dur: 0.12, vol: 0.12, type: "bandpass", f: 1800, q: 0.7, at: t - ac.currentTime, dest: musicBus });
    noise({ dur: 0.03, vol: 0.035, type: "highpass", f: 7000, at: t - ac.currentTime, dest: musicBus });
    // lead: square through a soft filter, held notes tie over
    const m = LEAD[i % LEAD.length];
    if (m > 0) {
      let len = 1; while (LEAD[(i + len) % LEAD.length] === -1) len++;
      tone({ type: "square", f: nf(m), dur: E8 * len * 0.95, vol: 0.06, a: 0.01, filter: 2600, at: t - ac.currentTime, dest: musicBus });
      tone({ type: "triangle", f: nf(m + 12), dur: E8 * len * 0.9, vol: 0.025, at: t - ac.currentTime, dest: musicBus });
    }
  }
  function schedule() {
    if (!musicOn) return;
    while (nextT < ac.currentTime + 0.25) { playStep(step, nextT); step = (step + 1) % (BARS.length * 8); nextT += E8; }
  }
  function startMusic() {
    if (musicOn || !live() || !prefs().music) return;
    musicOn = true; step = 0; nextT = ac.currentTime + 0.1;
    const t = ac.currentTime;
    musicBus.gain.cancelScheduledValues(t); musicBus.gain.setValueAtTime(0.0001, t); musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL * prefs().musicVol, t + 1.5);
    timer = setInterval(schedule, 60); schedule();
  }
  function stopMusic() {
    if (!musicOn) return;
    musicOn = false; clearInterval(timer);
    const t = ac.currentTime;
    musicBus.gain.cancelScheduledValues(t); musicBus.gain.setValueAtTime(Math.max(0.0001, musicBus.gain.value), t); musicBus.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  }
  function music(on) { wantMusic = !!on; if (wantMusic) { if (ac && ac.state === "suspended") ac.resume(); startMusic(); } else stopMusic(); }
  // settings changed (here or in another tab): follow them
  ["lo-settings", "storage"].forEach((ev) => addEventListener(ev, () => {
    P = null; const p = prefs();
    if (ac) {   // the volume bars take effect at once
      const t = ac.currentTime;
      sfxBus.gain.setTargetAtTime(p.sfxVol, t, 0.03);
      if (musicOn) { musicBus.gain.cancelScheduledValues(t); musicBus.gain.setTargetAtTime(MUSIC_LEVEL * p.musicVol, t, 0.05); }
    }
    if (!p.music) stopMusic(); else if (wantMusic) startMusic();
    if (!p.sfx) stopLoops();
  }));
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopLoops(); });

  addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest('a, button, [role="button"], .planet, .menu-btn, .vol, label, summary, h1, h2, .brand, input[type="submit"]');
    if (!el || el.closest("canvas, #game")) return;
    if (live() && prefs().sfx) { try { FX.click(); } catch (err) {} }
  }, true);

  return {
    sfx(name, arg) { if (!live() || !prefs().sfx || !FX[name]) return; try { FX[name](arg); } catch (e) { console.warn("sfx " + name, e); } },
    loop, stopLoops, music,
    // lay out the first n eighth-notes of the theme from now (used to render a preview of it)
    preview(n) { if (!init()) return; musicBus.gain.value = MUSIC_LEVEL; let t = ac.currentTime + 0.05; for (let i = 0; i < n; i++, t += E8) playStep(i, t); },
  };
})();
// Kept on window too, for poking at the sound from the browser console.
window.LO_AUDIO = audio;

