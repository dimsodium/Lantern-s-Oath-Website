// Drifting pixel starfield behind every page: white specks on black space.
export function initStarfield() {
  const host = document.querySelector(".space");
  if (!host) return;
  const c = document.createElement("canvas");
  host.appendChild(c);
  const ctx = c.getContext("2d");
  let stars = [];
  // Settings > STARS: FEW thins the field out here too (the same saved setting the game uses)
  let few = false;
  const readSettings = () => { try { few = JSON.parse(localStorage.getItem("lo-settings") || "{}").manyStars === false; } catch (e) { few = false; } };
  readSettings();
  ["lo-settings", "storage", "pageshow"].forEach((ev) => addEventListener(ev, readSettings));

  function resize() {
    c.width = Math.floor(innerWidth / 3);
    c.height = Math.floor(innerHeight / 3);
    ctx.imageSmoothingEnabled = false;
    stars = Array.from({ length: Math.floor((c.width * c.height) / 260) }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      s: Math.random() < 0.1 ? 2 : 1,
      v: 0.05 + Math.random() * 0.25,
      g: Math.random() < 0.15,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, c.width, c.height);
    stars.forEach((st, i) => {
      st.y += st.v;
      if (st.y > c.height) { st.y = 0; st.x = Math.random() * c.width; }
      if (few && i % 3) return;
      ctx.fillStyle = st.g ? "#ffffff" : "#c9d2dc";
      ctx.fillRect(Math.floor(st.x), Math.floor(st.y), st.s, st.s);
    });
    requestAnimationFrame(tick);
  }

  addEventListener("resize", resize);
  resize();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    stars.forEach((s) => (s.v = 0)); // still draw, just don't drift
  }
  tick();
}
