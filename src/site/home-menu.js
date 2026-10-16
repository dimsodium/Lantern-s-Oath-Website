// Home menu under PLAY NOW: Options, Controls and Settings, stacked like the pause menu.
// Settings share the game's saved settings (screen shake, stars, Mogo on or off, and SOUND: music and effects).
export function initHomeMenu() {
  var menu = document.querySelector(".home-menu");
  if (!menu) return;
  var LABELS = { shake: ["SCREEN SHAKE", "ON", "OFF", true], manyStars: ["STARS", "MANY", "FEW", true], noMogo: ["MOGO", "OFF", "ON", false], music: ["MUSIC", "ON", "OFF", true], sfx: ["SFX", "ON", "OFF", true] };
  function load() { var s = {}; try { s = JSON.parse(localStorage.getItem("lo-settings") || "{}") || {}; } catch (e) {} return s; }
  function save(s) { try { localStorage.setItem("lo-settings", JSON.stringify(s)); } catch (e) {} window.dispatchEvent(new Event("lo-settings")); }
  function labels() {
    var s = load();
    menu.querySelectorAll("[data-set]").forEach(function (b) {
      var k = b.dataset.set, L = LABELS[k], on = k in s ? !!s[k] : L[3];
      b.textContent = L[0] + ": " + (on ? L[1] : L[2]);
    });
    menu.querySelectorAll("[data-vol]").forEach(function (bar) {
      var v = typeof s[bar.dataset.vol] === "number" ? s[bar.dataset.vol] : 1, pct = Math.round(v * 10) * 10;
      bar.firstChild.style.width = pct + "%"; bar.setAttribute("aria-valuenow", pct); bar.nextElementSibling.textContent = pct + "%";
    });
  }
  // volume bars: click or drag along them, or use the arrow keys; always in 10% steps
  function setVol(bar, v) { var s = load(); s[bar.dataset.vol] = Math.max(0, Math.min(10, Math.round(v * 10))) / 10; save(s); labels(); }
  menu.querySelectorAll("[data-vol]").forEach(function (bar) {
    function at(e) { var r = bar.getBoundingClientRect(); setVol(bar, (e.clientX - r.left) / r.width); }
    bar.addEventListener("pointerdown", function (e) { bar.setPointerCapture(e.pointerId); at(e); });
    bar.addEventListener("pointermove", function (e) { if (bar.hasPointerCapture(e.pointerId)) at(e); });
    bar.addEventListener("keydown", function (e) {
      var s = load(), v = typeof s[bar.dataset.vol] === "number" ? s[bar.dataset.vol] : 1;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setVol(bar, v + 0.1); }
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setVol(bar, v - 0.1); }
    });
  });
  function page(name) {
    menu.querySelectorAll("[data-page]").forEach(function (p) { p.hidden = p.dataset.page !== name; });
    var first = menu.querySelector('[data-page="' + name + '"] .menu-btn');
    if (first && document.activeElement && menu.contains(document.activeElement)) first.focus();
  }
  var play = document.querySelector(".hero-inner .btn");
  menu.querySelectorAll("[data-play]").forEach(function (a) { if (play) a.href = play.getAttribute("href"); });
  menu.addEventListener("click", function (e) {
    var b = e.target.closest(".menu-btn");
    if (!b) return;
    if ("test" in b.dataset) { try { sessionStorage.setItem("lo-test-boss", "1"); } catch (err) {} return; }   // the link then opens the game
    if (b.dataset.go) page(b.dataset.go);
    else if (b.dataset.set) { var s = load(), k = b.dataset.set; s[k] = !(k in s ? !!s[k] : LABELS[k][3]); save(s); labels(); }
    else if (b.dataset.act === "reset") { save({}); labels(); b.textContent = "SETTINGS RESET"; setTimeout(function () { b.textContent = "RESET SETTINGS"; }, 1200); }
  });
  window.addEventListener("hashchange", function () { page("main"); labels(); });
  // open Settings and point at one setting (Mogo sends you to "MOGO: ON" after five clicks)
  window.addEventListener("lo-goto-setting", function (e) {
    var b = menu.querySelector('[data-set="' + e.detail + '"]');
    page(b && b.closest("[data-page]") ? b.closest("[data-page]").dataset.page : "settings"); labels();
    if (!b) return;
    b.scrollIntoView({ block: "center", behavior: "smooth" });
    b.focus({ preventScroll: true });
    b.classList.remove("menu-flash"); void b.offsetWidth; b.classList.add("menu-flash");
    setTimeout(function () { b.classList.remove("menu-flash"); }, 2000);
  });
  window.addEventListener("pageshow", labels);
  labels();
}
