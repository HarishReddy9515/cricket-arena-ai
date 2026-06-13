(function () {
  const viewport = document.querySelector(".viewport");
  const gamePanel = document.querySelector(".game-panel");
  const statusEl = document.querySelector("#status");

  const layer = document.createElement("div");
  layer.className = "immersion-layer";
  layer.innerHTML = `
    <div class="impact-flash"></div>
    <div class="weather-layer"></div>
    <div class="crowd-pulse"></div>
  `;
  viewport?.appendChild(layer);

  const weatherLayer = layer.querySelector(".weather-layer");
  let weatherMode = "dust";

  function haptic(pattern) {
    if ("vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  }

  function shake(strength = 1) {
    if (!gamePanel) return;
    gamePanel.style.setProperty("--shake-x", `${Math.min(10, strength * 6)}px`);
    gamePanel.classList.remove("camera-shake");
    void gamePanel.offsetWidth;
    gamePanel.classList.add("camera-shake");
  }

  function flash(kind = "hit") {
    layer.classList.remove("impact-hit", "impact-wicket", "impact-six");
    void layer.offsetWidth;
    layer.classList.add(`impact-${kind}`);
  }

  function spawnParticles(kind = "dust", count = 24) {
    if (!weatherLayer) return;
    for (let i = 0; i < count; i++) {
      const particle = document.createElement("span");
      particle.className = `particle ${kind}`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.animationDelay = `${Math.random() * 0.5}s`;
      particle.style.setProperty("--drift", `${Math.random() * 80 - 40}px`);
      weatherLayer.appendChild(particle);
      setTimeout(() => particle.remove(), 1800);
    }
  }

  function slowMotion(ms = 420) {
    document.documentElement.classList.add("slow-mo");
    setTimeout(() => document.documentElement.classList.remove("slow-mo"), ms);
  }

  function crowdPulse(power = 1) {
    layer.style.setProperty("--crowd-power", String(power));
    layer.classList.remove("crowd-live");
    void layer.offsetWidth;
    layer.classList.add("crowd-live");
  }

  function reactToShot(outcome = {}) {
    const runs = Number(outcome.runs || 0);
    if (outcome.wicket) {
      haptic([80, 40, 120, 40, 180]);
      shake(1.6);
      flash("wicket");
      slowMotion(520);
      spawnParticles("dust", 42);
      crowdPulse(1.4);
      return;
    }

    if (runs >= 6) {
      haptic([35, 30, 80]);
      shake(1.35);
      flash("six");
      slowMotion(380);
      spawnParticles(weatherMode, 36);
      crowdPulse(1.5);
      return;
    }

    if (runs >= 4) {
      haptic([45, 25, 45]);
      shake(1.0);
      flash("hit");
      spawnParticles(weatherMode, 28);
      crowdPulse(1.1);
      return;
    }

    haptic(runs ? 25 : 12);
    shake(runs ? 0.55 : 0.25);
    spawnParticles("dust", runs ? 16 : 8);
  }

  function wicket() {
    reactToShot({ wicket: true, runs: 0 });
  }

  function setWeather(mode) {
    weatherMode = mode === "rain" ? "rain" : "dust";
    viewport?.setAttribute("data-weather", weatherMode);
    spawnParticles(weatherMode, weatherMode === "rain" ? 48 : 22);
  }

  function watchStatusText() {
    if (!statusEl) return;
    const observer = new MutationObserver(() => {
      const text = statusEl.textContent.toLowerCase();
      if (text.includes("six")) reactToShot({ runs: 6 });
      else if (text.includes("boundary") || text.includes("four")) reactToShot({ runs: 4 });
      else if (text.includes("wicket") || text.includes("caught") || text.includes("bowled")) wicket();
    });
    observer.observe(statusEl, { childList: true, characterData: true, subtree: true });
  }

  window.__arena4d = {
    shot: reactToShot,
    wicket,
    haptic,
    shake,
    flash,
    slowMotion,
    crowdPulse,
    setWeather
  };

  setWeather("dust");
  watchStatusText();
})();
