import { audio } from "./audio.js";

// Click Mogo and he lets you know how he feels about visitors. The bubble is a construct:
// his emblem lights up, a beam of ring light shoots out, and the bubble is built out of it.
export function initMogo() {
  var planet = document.querySelector(".hero .planet"), say = document.querySelector(".hero .mogo-say"), glow = document.querySelector(".hero .planet-glow"), timer, glowRaf;
  if (!planet || !say) return;
  // "MOGO: OFF" in the Settings menus's Settings hides him from the home page
  function mogoSetting() {
    var off = false;
    try { off = !!JSON.parse(localStorage.getItem("lo-settings") || "{}").noMogo; } catch (e) {}
    planet.parentNode.classList.toggle("no-mogo", off);
  }
  mogoSetting();
  ["lo-settings", "storage", "hashchange", "pageshow"].forEach(function (ev) { window.addEventListener(ev, mogoSetting); });
  var hero = planet.parentNode, DUR = 4000, bits = [];
  var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function bit(cls, css) { var d = document.createElement("div"); d.className = cls; for (var k in css) d.style[k] = css[k]; hero.appendChild(d); bits.push(d); return d; }
  var line = say.querySelector("span"), full = line ? line.textContent : "", typing;
  // The line is typed out as if someone is at a keyboard: one letter at a time, uneven keystrokes, a beat at the
  // gaps between words, and a blinking cursor. The untyped rest is laid out but invisible, so nothing shifts.
  function typeOut() {
    if (!line) return;
    clearTimeout(typing);
    line.textContent = "";
    var wrap = document.createElement("span"), typed = document.createElement("span"), caret = document.createElement("i"), rest = document.createElement("span");
    wrap.className = "mogo-line"; caret.className = "mogo-caret"; rest.className = "mogo-rest";
    wrap.append(typed, caret, rest); line.appendChild(wrap);
    if (calm) { typed.textContent = full; return; }
    var n = 0;
    rest.textContent = full;
    caret.classList.add("typing");
    (function next() {
      typed.textContent = full.slice(0, n); rest.textContent = full.slice(n);
      if (n === 1) audio.sfx("mogo");    // his sound as the first letter appears (once per message)
      if (n >= full.length) { caret.classList.remove("typing"); return; }
      var ch = full[n++];
      var wait = 45 + Math.random() * 55;                                   // an ordinary keystroke
      if (ch === " ") wait += 70 + Math.random() * 60;                     // finding the next word
      if (".,!?'".indexOf(ch) >= 0) wait += 40;
      if (Math.random() < 0.08) wait += 120;                               // the odd hesitation
      typing = setTimeout(next, n === 1 ? 550 : wait);                     // starts once the bubble has formed
    })();
  }
  function speak() {
    bits.forEach(function (d) { d.remove(); }); bits = [];
    if (say.getAnimations) say.getAnimations().forEach(function (a) { a.cancel(); });
    var hr = hero.getBoundingClientRect(), pr = planet.getBoundingClientRect(), sr = say.getBoundingClientRect();
    // the emblem sits at (37.5, 43.5) on the 80x80 planet art
    var ex = pr.left - hr.left + pr.width * 37.5 / 80, ey = pr.top - hr.top + pr.height * 43.5 / 80;
    var sx = sr.left - hr.left, sy = sr.top - hr.top, tx = sx + sr.width * 0.78, ty = sy + sr.height - 4;
    var glowF = "drop-shadow(0 0 8px rgba(47, 216, 95, 0.75))";
    say.style.transformOrigin = (ex - sx) + "px " + (ey - sy) + "px";
    say.animate(calm ? [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }] : [
      { opacity: 0, transform: "scale(0.04)", filter: "brightness(2.4) " + glowF, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      { opacity: 0.9, offset: 0.05, transform: "scale(0.04)", filter: "brightness(2.4) " + glowF, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      { opacity: 1, offset: 0.15, transform: "scale(1.04)", filter: "brightness(1.5) drop-shadow(0 0 14px #5fff8a)", easing: "ease-in-out" },
      { opacity: 1, offset: 0.21, transform: "scale(1)", filter: "brightness(1) " + glowF },
      { opacity: 1, offset: 0.9, transform: "scale(1)", filter: "brightness(1) " + glowF, easing: "ease-in" },
      { opacity: 0, transform: "scale(0.96)", filter: "brightness(1) " + glowF }
    ], { duration: DUR, fill: "forwards" });
    if (!calm) {
      // a pixel beam of ring light from the emblem to the bubble's bottom edge, held while the construct is out.
      // Nothing may cover it: if it would run into the bubble's side or the page content, it narrows, then tilts.
      var C = Math.max(2, Math.round(pr.width / 80));                   // one beam pixel = one planet pixel
      // aim at the bubble's bottom edge, or at its right side when Mogo sits level with it (phones)
      var bot = sy + sr.height, right = sx + sr.width, under = ey - bot > 3 * C;
      var lo = under ? sx + sr.width * 4 / 44 : sy + sr.height * 3 / 13, hi = under ? sx + sr.width * 40 / 44 : sy + sr.height * 10 / 13;
      var blockers = [].slice.call(hero.querySelectorAll(".lantern-big, h1 img, .tag, .btn, .home-menu")).map(function (el) {
        var r = el.getBoundingClientRect(); return [r.left - hr.left - C, r.top - hr.top - C, r.right - hr.left + C, r.bottom - hr.top + C];
      });
      function cone(fx, h1) {
        var Tx = under ? sx + sr.width * fx : right, Ty = under ? bot : sy + sr.height * (fx - 0.28), dx = Tx - ex, dy = Ty - ey, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, h0 = C * 0.8;
        var cells = [], bad = false;
        var x0 = Math.floor((Math.min(ex, Tx) - h1 - 2 * C) / C), x1 = Math.ceil((Math.max(ex, Tx) + h1 + 2 * C) / C);
        var y0 = Math.floor((Math.min(ey, Ty) - h1 - 2 * C) / C), y1 = Math.ceil((Math.max(ey, Ty) + h1 + 2 * C) / C);
        for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) {
          var px = (gx + 0.5) * C, py = (gy + 0.5) * C, qx = px - ex, qy = py - ey;
          var t = (qx * ux + qy * uy) / len, d = Math.abs(qx * uy - qy * ux), hw = h0 + (h1 - h0) * Math.min(t, 1);
          if (t < 0 || t > 1.6 || d > hw + C) continue;
          if (under ? py < bot : px < right) { var s2 = under ? px : py; if (s2 >= lo && s2 <= hi) continue; if (d <= hw) bad = true; continue; }   // meets the bubble flush; spilling past its edge is not allowed
          if (t > 1) continue;
          var halo = d > hw;
          if (!halo) for (var b = 0; b < blockers.length; b++) { var k = blockers[b]; if (px > k[0] && px < k[2] && py > k[1] && py < k[3]) bad = true; }
          cells.push([gx, gy, t, halo ? 2 : d / hw]);
        }
        return bad ? null : { cells: cells, x0: x0, y0: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      }
      var dist = Math.hypot(under ? sx + sr.width * 0.78 - ex : right - ex, under ? bot - ey : sy + sr.height / 2 - ey), big = Math.max(3 * C, Math.min(36, dist * 0.22)), ray = null;
      [0.78, 0.72, 0.84, 0.66, 0.9, 0.6, 0.54, 0.48].some(function (fx, i) {      // keep the size first, then tilt a little more each try
        for (var h1 = big; h1 >= (i < 3 ? big * 0.6 : 2 * C); h1 -= C) if ((ray = cone(fx, h1))) return true;
      });
      if (!ray) ray = cone(0.78, 2 * C) || { cells: [], x0: 0, y0: 0, w: 1, h: 1 };
      var cv = document.createElement("canvas"), g = cv.getContext("2d");
      cv.className = "mogo-beam"; cv.width = ray.w; cv.height = ray.h;
      cv.style.left = ray.x0 * C + "px"; cv.style.top = ray.y0 * C + "px"; cv.style.width = ray.w * C + "px"; cv.style.height = ray.h * C + "px";
      hero.appendChild(cv); bits.push(cv);
      function paint(reach) {
        g.clearRect(0, 0, ray.w, ray.h);
        ray.cells.forEach(function (c) {
          if (c[2] > reach) return;
          var n = c[3], t = c[2];
          g.globalAlpha = n > 1 ? 0.45 : 1 - 0.35 * t;
          g.fillStyle = n > 1 ? "#17a540" : n < 0.2 + 0.15 * (1 - t) ? "#f4fff5" : Math.abs(n - 0.6) < 0.12 && t < 0.85 ? "#c8ffd4" : n < 0.55 ? "#9dffb5" : n < 0.82 ? "#5fff8a" : "#2fd85f";
          g.fillRect(c[0] - ray.x0, c[1] - ray.y0, 1, 1);
        });
      }
      var b0 = performance.now(), grown = false;
      (function beamStep(now) {
        if (!cv.isConnected) return;
        var t = (now - b0) / DUR;
        if (!grown) { var r = Math.min(1, t / 0.05); paint(1.6 * (1 - Math.pow(1 - r, 3))); grown = r >= 1; }
        var a = t < 0.3 ? 1 - 0.25 * t / 0.3 : t < 0.5 ? 0.75 + 0.25 * (t - 0.3) / 0.2 : t < 0.7 ? 1 - 0.25 * (t - 0.5) / 0.2 : t < 0.9 ? 0.75 + 0.25 * (t - 0.7) / 0.2 : Math.max(0, 1 - (t - 0.9) / 0.1);
        cv.style.opacity = a.toFixed(3);
        if (t < 1) requestAnimationFrame(beamStep);
      })(b0);
      // pixels of ring energy that fly out and become the bubble
      for (var i = 0; i < 14; i++) {
        var px = sx + sr.width * (0.08 + 0.84 * Math.random()), py = sy + sr.height * (0.12 + 0.62 * Math.random());
        var s = bit("mogo-spark", { left: ex - 2 + "px", top: ey - 2 + "px" });
        s.animate([{ transform: "translate(0, 0)", opacity: 1 }, { transform: "translate(" + (px - ex) + "px, " + (py - ey) + "px)", opacity: 1, offset: 0.8 }, { transform: "translate(" + (px - ex) + "px, " + (py - ey) + "px)", opacity: 0 }],
          { duration: 380 + Math.random() * 200, delay: 60 + i * 12, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)", fill: "both" });
      }
    }
    typeOut();
    clearTimeout(timer); timer = setTimeout(function () { bits.forEach(function (d) { d.remove(); }); bits = []; }, DUR);
    // his emblem lights up and holds while the construct is out
    if (glow) {
      var t0 = performance.now();
      cancelAnimationFrame(glowRaf);
      (function step(now) {
        var t = (now - t0) / DUR;
        var a = t < 0.04 ? t / 0.04 : 1;
        glow.style.opacity = t >= 1 ? 0 : a.toFixed(3);
        if (t < 1) glowRaf = requestAnimationFrame(step);
      })(t0);
    }
  }
  // poke him five times and he points you at the setting that removes him
  var pokes = 0;
  function poke() {
    speak();
    if (++pokes >= 5) { pokes = 0; window.dispatchEvent(new CustomEvent("lo-goto-setting", { detail: "noMogo" })); }
  }
  planet.addEventListener("click", poke);
  planet.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); poke(); } });
}
