const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const ballsEl = document.querySelector("#balls");
const equationEl = document.querySelector("#equation");
const statusEl = document.querySelector("#status");
const ballTypeEl = document.querySelector("#ballType");
const timingNeedle = document.querySelector("#timingNeedle");
const insights = document.querySelector("#insights");
const shotMap = document.querySelector("#shotMap");
const connectionStatus = document.querySelector("#connectionStatus");
const roomCode = document.querySelector("#roomCode");
const connectBtn = document.querySelector("#connectBtn");
const readyBtn = document.querySelector("#readyBtn");
const squadList = document.querySelector("#squadList");

const target = 18;
let score = 0;
let wickets = 0;
let balls = 0;
let running = false;
let deliveryActive = false;
let timing = 0;
let timingDirection = 1;
let shotIntent = "straight";
let ball = resetBall();
let batterSwing = 0;
let shots = [];
let message = "Press Start Match";
let socket;
let playerId = `player-${Math.random().toString(16).slice(2, 8)}`;
let roomPlayers = [];
let ready = false;

const deliveries = [
  { name: "Fast yorker", speed: 8.8, swing: -0.3, difficulty: 0.86 },
  { name: "Outswinger", speed: 7.4, swing: 0.9, difficulty: 0.72 },
  { name: "Leg cutter", speed: 6.7, swing: -1.1, difficulty: 0.78 },
  { name: "Slower bouncer", speed: 5.9, swing: 0.2, difficulty: 0.66 }
];

function resetBall() {
  return {
    x: canvas.width / 2,
    y: 92,
    z: 0,
    vx: 0,
    vy: 0,
    radius: 8,
    visible: false,
    type: deliveries[0]
  };
}

function startMatch() {
  score = 0;
  wickets = 0;
  balls = 0;
  running = true;
  deliveryActive = false;
  shots = [];
  message = "Bowler running in...";
  queueDelivery();
  updateHud();
  renderShotMap();
}

function queueDelivery() {
  if (!running || balls >= 6 || wickets >= 2 || score >= target) {
    finishMatch();
    return;
  }

  deliveryActive = false;
  ball.visible = false;
  const type = chooseDelivery();
  ballTypeEl.textContent = type.name;
  message = "Watch the bowler. Time your shot.";
  setTimeout(() => launchDelivery(type), 900);
}

function chooseDelivery() {
  const need = target - score;
  if (need <= 6 && balls >= 3) {
    return deliveries[0];
  }
  return deliveries[Math.floor(Math.random() * deliveries.length)];
}

function launchDelivery(type) {
  if (!running) return;
  ball = {
    x: canvas.width / 2 + type.swing * -18,
    y: 94,
    z: 0,
    vx: type.swing,
    vy: type.speed,
    radius: 8,
    visible: true,
    type
  };
  deliveryActive = true;
  message = "Ball released";
}

function playShot() {
  if (!deliveryActive || !running) return;

  const contactZone = Math.abs(ball.y - 512);
  const timingError = Math.abs(timing - 0.5);
  const contactScore = Math.max(0, 1 - contactZone / 160);
  const timingScore = Math.max(0, 1 - timingError * 2.2);
  const quality = (contactScore * 0.55 + timingScore * 0.45) - (ball.type.difficulty - 0.65) * 0.18;
  const outcome = resolveOutcome(quality);

  batterSwing = 1;
  deliveryActive = false;
  ball.visible = false;
  balls += 1;
  score += outcome.runs;
  wickets += outcome.wicket ? 1 : 0;
  message = outcome.message;
  shots.push({ runs: outcome.runs, angle: outcome.angle, distance: outcome.distance });

  updateHud();
  renderShotMap();
  setTimeout(queueDelivery, 1250);
}

function resolveOutcome(quality) {
  const baseAngle = shotIntent === "left" ? 220 : shotIntent === "right" ? 320 : 270;
  const angle = baseAngle + (Math.random() * 36 - 18);
  if (quality < 0.18) {
    return { runs: 0, wicket: true, message: "Edge! Caught behind.", angle, distance: 35 };
  }
  if (quality < 0.35) {
    return { runs: 0, wicket: false, message: "Beaten. Dot ball.", angle, distance: 28 };
  }
  if (quality < 0.55) {
    return { runs: 1, wicket: false, message: "Soft hands. Quick single.", angle, distance: 45 };
  }
  if (quality < 0.72) {
    return { runs: 2, wicket: false, message: "Pierced the gap. Two runs.", angle, distance: 62 };
  }
  if (quality < 0.88) {
    return { runs: 4, wicket: false, message: "Cracking boundary!", angle, distance: 82 };
  }
  return { runs: 6, wicket: false, message: "Massive six into the crowd!", angle, distance: 96 };
}

function finishMatch() {
  running = false;
  deliveryActive = false;
  ball.visible = false;
  if (score >= target) {
    message = `Harish XI wins with ${6 - balls} ball(s) left`;
  } else {
    message = `Opponent wins. Needed ${target - score} more`;
  }
  updateHud();
}

function updateHud() {
  scoreEl.textContent = `${score}/${wickets}`;
  ballsEl.textContent = `0.${balls}`;
  equationEl.textContent = score >= target ? "Won" : `${Math.max(0, target - score)} from ${Math.max(0, 6 - balls)}`;
  statusEl.textContent = message;
  renderInsights();
}

function renderInsights() {
  const rate = balls ? (score / balls).toFixed(1) : "0.0";
  const pressure = target - score > (6 - balls) * 4 ? "High" : target - score <= 6 ? "Low" : "Medium";
  insights.innerHTML = `
    <article class="insight-card"><strong>Run rate</strong><p>${rate} runs per ball</p></article>
    <article class="insight-card"><strong>Pressure</strong><p>${pressure}</p></article>
    <article class="insight-card"><strong>AI plan</strong><p>${pressure === "High" ? "Expect yorkers and pace-off balls." : "Bowler may mix swing and cutters."}</p></article>
  `;
}

function renderShotMap() {
  shotMap.innerHTML = "";
  shots.slice(-8).forEach((shot) => {
    const dot = document.createElement("span");
    dot.className = "shot-dot";
    const rad = (shot.angle * Math.PI) / 180;
    const radius = shot.distance * 0.45;
    dot.style.left = `${50 + Math.cos(rad) * radius}%`;
    dot.style.top = `${50 + Math.sin(rad) * radius}%`;
    dot.style.background = shot.runs >= 6 ? "#b67817" : shot.runs >= 4 ? "#16834f" : "#0a66c2";
    shotMap.appendChild(dot);
  });
}

function connectMultiplayer() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    sendRoomMessage({ type: "join", roomId: roomCode.value.trim() || "ARENA-24", playerId });
    return;
  }

  connectionStatus.textContent = "connecting";
  socket = new WebSocket("ws://localhost:8787");

  socket.addEventListener("open", () => {
    connectionStatus.textContent = "online";
    sendRoomMessage({ type: "join", roomId: roomCode.value.trim() || "ARENA-24", playerId });
  });

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "room_state") {
      roomPlayers = data.players;
      renderSquad();
      if (data.canStart) {
        message = "Room ready. Starting online match.";
        updateHud();
        setTimeout(startMatch, 500);
      }
    }
    if (data.type === "state") {
      message = "Remote player action synced.";
      updateHud();
    }
  });

  socket.addEventListener("close", () => {
    connectionStatus.textContent = "offline";
  });

  socket.addEventListener("error", () => {
    connectionStatus.textContent = "server off";
  });
}

function toggleReady() {
  ready = !ready;
  readyBtn.textContent = ready ? "Unready" : "Ready";
  sendRoomMessage({ type: "ready", roomId: roomCode.value.trim() || "ARENA-24", playerId, ready });
}

function sendRoomMessage(payload) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    connectionStatus.textContent = "offline";
    return;
  }
  socket.send(JSON.stringify(payload));
}

function renderSquad() {
  squadList.innerHTML = "";
  if (!roomPlayers.length) {
    squadList.innerHTML = "<div class=\"squad-card\"><strong>No squad yet</strong><span>connect</span></div>";
    return;
  }

  roomPlayers.forEach((player, index) => {
    const card = document.createElement("div");
    card.className = "squad-card";
    card.innerHTML = `
      <strong>${player.playerId === playerId ? "You" : `Player ${index + 1}`}</strong>
      <span class="${player.ready ? "ready-pill" : "waiting-pill"}">${player.ready ? "Ready" : "Waiting"}</span>
    `;
    squadList.appendChild(card);
  });
}

function update() {
  timing += timingDirection * 0.018;
  if (timing >= 1 || timing <= 0) {
    timingDirection *= -1;
    timing = Math.max(0, Math.min(1, timing));
  }
  timingNeedle.style.left = `${timing * 100}%`;

  if (deliveryActive) {
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= 0.996;
    if (ball.y > 590) {
      balls += 1;
      deliveryActive = false;
      ball.visible = false;
      message = "Keeper collects. Dot ball.";
      updateHud();
      setTimeout(queueDelivery, 900);
    }
  }

  batterSwing *= 0.86;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStadium();
  drawPitch();
  drawPlayers();
  drawBall();
  drawOverlay();
}

function drawStadium() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#0b1621");
  gradient.addColorStop(0.5, "#17391f");
  gradient.addColorStop(1, "#1f6b37");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.arc(80 + i * 58, 96 + Math.sin(i) * 18, 22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(130 + i * 210, 38, 5, 92);
    ctx.beginPath();
    ctx.arc(132 + i * 210, 34, 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPitch() {
  ctx.save();
  ctx.translate(canvas.width / 2, 0);
  ctx.fillStyle = "#b9874f";
  ctx.beginPath();
  ctx.moveTo(-92, 112);
  ctx.lineTo(92, 112);
  ctx.lineTo(142, 620);
  ctx.lineTo(-142, 620);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-92, 500);
  ctx.lineTo(92, 500);
  ctx.moveTo(-55, 148);
  ctx.lineTo(55, 148);
  ctx.stroke();
  ctx.restore();
}

function drawPlayers() {
  drawPlayer(canvas.width / 2, 525, "#1b66c9", true);
  drawPlayer(canvas.width / 2, 118, "#c93e3e", false);
  drawBat(canvas.width / 2 + 34, 520, batterSwing);
}

function drawPlayer(x, y, color, batter) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 42, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 16, y - 26, 32, 46);
  ctx.fillStyle = batter ? "#ffffff" : "#f4f4f4";
  ctx.fillRect(x - 21, y + 18, 12, 42);
  ctx.fillRect(x + 9, y + 18, 12, 42);
}

function drawBat(x, y, swing) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.7 - swing * 1.1);
  ctx.fillStyle = "#d7aa64";
  ctx.fillRect(-5, -68, 10, 78);
  ctx.fillStyle = "#8b5d2d";
  ctx.fillRect(-9, -88, 18, 26);
  ctx.restore();
}

function drawBall() {
  if (!ball.visible) return;
  ctx.fillStyle = "#d22f2f";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius * 0.62, -0.7, 0.7);
  ctx.stroke();
}

function drawOverlay() {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(28, 28, 330, 62);
  ctx.fillStyle = "white";
  ctx.font = "700 24px Segoe UI";
  ctx.fillText(message, 46, 67);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

document.querySelector("#startBtn").addEventListener("click", startMatch);
document.querySelector("#resetBtn").addEventListener("click", startMatch);
document.querySelector("#shotBtn").addEventListener("click", playShot);
connectBtn.addEventListener("click", connectMultiplayer);
readyBtn.addEventListener("click", toggleReady);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    playShot();
  }
  if (event.key.toLowerCase() === "a") shotIntent = "left";
  if (event.key.toLowerCase() === "d") shotIntent = "right";
  if (event.key.toLowerCase() === "s") shotIntent = "straight";
});

window.addEventListener("keyup", () => {
  shotIntent = "straight";
});

updateHud();
renderShotMap();
renderSquad();
loop();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {
    // Local file mode or restricted browsers may block service workers.
  });
}
