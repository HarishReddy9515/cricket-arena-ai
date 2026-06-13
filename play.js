const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");
const menu = document.querySelector("#menu");
const scoreEl = document.querySelector("#score");
const needEl = document.querySelector("#need");
const timingText = document.querySelector("#timingText");
const toast = document.querySelector("#toast");

const state = {
  target: 24,
  score: 0,
  wickets: 0,
  balls: 0,
  phase: "menu",
  shot: "straight",
  timing: 0,
  timingDir: 1,
  shake: 0,
  flash: 0,
  ball: null,
  trail: [],
  particles: [],
  messageTimer: 0
};

const deliveries = [
  { name: "Inswing yorker", pace: 1.16, seam: -0.35 },
  { name: "Hard length", pace: 1.0, seam: 0.1 },
  { name: "Off cutter", pace: 0.82, seam: 0.52 },
  { name: "Slower bouncer", pace: 0.72, seam: -0.18 }
];

function fitCanvas() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.floor(innerWidth * dpr);
  canvas.height = Math.floor(innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function start() {
  Object.assign(state, {
    score: 0,
    wickets: 0,
    balls: 0,
    phase: "waiting",
    ball: null,
    trail: [],
    particles: [],
    shake: 0,
    flash: 0
  });
  menu.classList.add("hidden");
  show("Bowler running in");
  updateHud();
  setTimeout(bowl, 900);
}

function bowl() {
  if (state.balls >= 6 || state.wickets >= 2 || state.score >= state.target) {
    finish();
    return;
  }
  const d = deliveries[Math.floor(Math.random() * deliveries.length)];
  state.phase = "live";
  state.ball = {
    x: innerWidth / 2 + d.seam * 120,
    y: innerHeight * 0.19,
    vx: d.seam * 1.7,
    vy: 9.2 * d.pace,
    spin: 0,
    delivery: d
  };
  show(d.name);
}

function playShot(shot = state.shot) {
  if (state.phase !== "live" || !state.ball) return;
  state.shot = shot;
  const idealY = innerHeight * 0.73;
  const contact = Math.max(0, 1 - Math.abs(state.ball.y - idealY) / 180);
  const timing = Math.max(0, 1 - Math.abs(state.timing - 0.5) * 2.2);
  const quality = contact * 0.58 + timing * 0.42;
  const outcome = outcomeFor(quality, shot);
  state.phase = "waiting";
  state.ball = null;
  state.balls += 1;
  state.score += outcome.runs;
  if (outcome.wicket) state.wickets += 1;
  impact(outcome);
  show(outcome.text);
  updateHud();
  setTimeout(bowl, 1200);
}

function outcomeFor(q, shot) {
  const angle = shot === "left" ? -0.75 : shot === "right" ? 0.75 : 0;
  if (q < 0.18) return { runs: 0, wicket: true, text: "OUT! Thin edge", angle };
  if (q < 0.36) return { runs: 0, wicket: false, text: "Beaten", angle };
  if (q < 0.55) return { runs: 1, wicket: false, text: "Single", angle };
  if (q < 0.74) return { runs: 2, wicket: false, text: "Two runs", angle };
  if (q < 0.9) return { runs: 4, wicket: false, text: "FOUR!", angle };
  return { runs: 6, wicket: false, text: "SIX!", angle };
}

function impact(outcome) {
  state.shake = outcome.wicket ? 18 : outcome.runs >= 6 ? 14 : outcome.runs >= 4 ? 10 : 5;
  state.flash = outcome.wicket ? 1.2 : outcome.runs >= 4 ? 0.8 : 0.3;
  if ("vibrate" in navigator) {
    navigator.vibrate(outcome.wicket ? [70, 40, 120] : outcome.runs >= 6 ? [40, 30, 70] : 20);
  }
  const count = outcome.wicket ? 80 : outcome.runs >= 6 ? 70 : outcome.runs >= 4 ? 48 : 20;
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: innerWidth / 2,
      y: innerHeight * 0.74,
      vx: Math.cos(Math.random() * Math.PI * 2) * (1 + Math.random() * 7),
      vy: -Math.random() * 8,
      life: 1,
      color: outcome.wicket ? "#ff5454" : outcome.runs >= 6 ? "#ffd45f" : "#d7a35d"
    });
  }
}

function finish() {
  state.phase = "done";
  const won = state.score >= state.target;
  show(won ? "YOU WIN" : "MATCH LOST");
  setTimeout(() => menu.classList.remove("hidden"), 1800);
}

function updateHud() {
  scoreEl.textContent = `${state.score}/${state.wickets}`;
  const need = Math.max(0, state.target - state.score);
  const balls = Math.max(0, 6 - state.balls);
  needEl.textContent = state.score >= state.target ? "Won" : `${need} from ${balls}`;
}

function show(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(state.messageTimer);
  state.messageTimer = setTimeout(() => toast.classList.remove("show"), 900);
}

function update() {
  state.timing += state.timingDir * 0.018;
  if (state.timing > 1 || state.timing < 0) {
    state.timingDir *= -1;
    state.timing = Math.max(0, Math.min(1, state.timing));
  }
  const t = Math.round((1 - Math.abs(state.timing - 0.5) * 2) * 100);
  timingText.textContent = `${Math.max(0, t)}%`;

  if (state.ball) {
    state.trail.push({ x: state.ball.x, y: state.ball.y, life: 1 });
    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;
    state.ball.vx *= 0.996;
    state.ball.spin += 0.2;
    if (state.ball.y > innerHeight * 0.93) {
      state.balls += 1;
      state.ball = null;
      state.phase = "waiting";
      show("Dot ball");
      updateHud();
      setTimeout(bowl, 850);
    }
  }

  state.trail.forEach((p) => p.life -= 0.08);
  state.trail = state.trail.filter((p) => p.life > 0);
  state.particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.24;
    p.life -= 0.018;
  });
  state.particles = state.particles.filter((p) => p.life > 0);
  state.shake *= 0.86;
  state.flash *= 0.86;
}

function draw() {
  const sx = (Math.random() - 0.5) * state.shake;
  const sy = (Math.random() - 0.5) * state.shake;
  ctx.save();
  ctx.translate(sx, sy);
  drawStadium();
  drawPitch();
  drawPlayers();
  drawBall();
  drawParticles();
  ctx.restore();
  drawFlash();
}

function drawStadium() {
  const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
  g.addColorStop(0, "#06121f");
  g.addColorStop(0.52, "#133322");
  g.addColorStop(1, "#0f6b3b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  for (let i = 0; i < 42; i++) {
    const x = (i / 41) * innerWidth;
    const y = innerHeight * 0.13 + Math.sin(i) * 18;
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,235,0.9)";
  for (let i = 0; i < 6; i++) {
    const x = innerWidth * (0.08 + i * 0.17);
    ctx.fillRect(x, innerHeight * 0.04, 5, innerHeight * 0.16);
    ctx.beginPath();
    ctx.arc(x + 2, innerHeight * 0.035, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPitch() {
  const cx = innerWidth / 2;
  ctx.fillStyle = "#bd874e";
  ctx.beginPath();
  ctx.moveTo(cx - 70, innerHeight * 0.2);
  ctx.lineTo(cx + 70, innerHeight * 0.2);
  ctx.lineTo(cx + 150, innerHeight * 0.96);
  ctx.lineTo(cx - 150, innerHeight * 0.96);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 95, innerHeight * 0.72);
  ctx.lineTo(cx + 95, innerHeight * 0.72);
  ctx.moveTo(cx - 44, innerHeight * 0.25);
  ctx.lineTo(cx + 44, innerHeight * 0.25);
  ctx.stroke();
}

function drawPlayers() {
  drawPlayer(innerWidth / 2, innerHeight * 0.78, "#0a66c2", true);
  drawPlayer(innerWidth / 2, innerHeight * 0.23, "#c53d3d", false);
}

function drawPlayer(x, y, color, batter) {
  const scale = batter ? 1.22 : 0.82;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 54 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 16 * scale, y - 38 * scale, 32 * scale, 44 * scale);
  ctx.fillStyle = "#f5f7fa";
  ctx.fillRect(x - 20 * scale, y, 12 * scale, 42 * scale);
  ctx.fillRect(x + 8 * scale, y, 12 * scale, 42 * scale);

  if (batter) {
    ctx.save();
    ctx.translate(x + 36, y - 12);
    ctx.rotate(-0.75 + Math.sin(Date.now() / 120) * 0.06);
    ctx.fillStyle = "#d9aa62";
    ctx.fillRect(-5, -88, 10, 100);
    ctx.restore();
  }
}

function drawBall() {
  state.trail.forEach((p) => {
    ctx.globalAlpha = p.life * 0.42;
    ctx.fillStyle = "#ff4949";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 9 * p.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  if (!state.ball) return;
  ctx.fillStyle = "#d82f2f";
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, 6, -0.8 + state.ball.spin, 0.8 + state.ball.spin);
  ctx.stroke();
}

function drawParticles() {
  state.particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 + (1 - p.life) * 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawFlash() {
  if (state.flash <= 0.02) return;
  ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.18})`;
  ctx.fillRect(0, 0, innerWidth, innerHeight);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

document.querySelector("#playBtn").addEventListener("click", start);
document.querySelectorAll("[data-shot]").forEach((button) => {
  button.addEventListener("pointerdown", () => playShot(button.dataset.shot));
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    playShot("straight");
  }
  if (event.key.toLowerCase() === "a") playShot("left");
  if (event.key.toLowerCase() === "d") playShot("right");
});

window.addEventListener("resize", fitCanvas);
fitCanvas();
updateHud();
loop();
