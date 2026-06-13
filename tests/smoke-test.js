const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const playHtml = fs.readFileSync(path.join(root, "play.html"), "utf8");
const playJs = fs.readFileSync(path.join(root, "play.js"), "utf8");
const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
const three = fs.readFileSync(path.join(root, "three-scene.js"), "utf8");
const immersion = fs.readFileSync(path.join(root, "immersion.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server", "multiplayer-server.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const manifest = fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

for (const id of ["gameCanvas", "threeViewport", "toggle3dBtn", "startBtn", "shotBtn", "score", "equation", "shotMap", "roomCode", "connectBtn", "readyBtn", "squadList", "pingStatus", "pingBtn", "scorecardGrid", "replayTimeline", "exportSummaryBtn"]) {
  if (!html.includes(`id="${id}"`)) {
    throw new Error(`Missing DOM id: ${id}`);
  }
}

for (const id of ["arena", "playBtn", "score", "need", "mobileControls"]) {
  if (!playHtml.includes(`id="${id}"`)) {
    throw new Error(`Missing fullscreen play DOM id: ${id}`);
  }
}

for (const symbol of ["function start", "function bowl", "function playShot", "function drawStadium", "requestAnimationFrame"]) {
  if (!playJs.includes(symbol)) {
    throw new Error(`Missing fullscreen gameplay workflow: ${symbol}`);
  }
}

for (const symbol of ["startMatch", "queueDelivery", "playShot", "resolveOutcome", "drawStadium", "requestAnimationFrame", "connectMultiplayer", "toggleReady", "renderSquad", "applyServerMatch", "request_delivery", "renderScorecard", "exportMatchSummary", "pingServer"]) {
  if (!js.includes(symbol)) {
    throw new Error(`Missing game workflow: ${symbol}`);
  }
}

for (const symbol of ["THREE", "buildStadium", "buildPlayers", "shadowMap", "PerspectiveCamera"]) {
  if (!three.includes(symbol)) {
    throw new Error(`Missing Three.js workflow: ${symbol}`);
  }
}

for (const symbol of ["__arena4d", "vibrate", "camera-shake", "slowMotion", "setWeather"]) {
  if (!immersion.includes(symbol)) {
    throw new Error(`Missing 4D immersion workflow: ${symbol}`);
  }
}

for (const symbol of ["upgrade", "Sec-WebSocket-Accept", "broadcastRoomState", "joinRoom", "ready", "broadcastMatchState", "request_delivery", "resolveOutcome", "timeline", "pong"]) {
  if (!server.includes(symbol)) {
    throw new Error(`Missing multiplayer server workflow: ${symbol}`);
  }
}

for (const symbol of ["serviceWorker", "manifest.webmanifest"]) {
  if (!html.includes(symbol)) {
    throw new Error(`Missing PWA page integration: ${symbol}`);
  }
}

if (!serviceWorker.includes("caches.open") || !manifest.includes("standalone")) {
  throw new Error("Missing mobile/PWA packaging files.");
}

if (!readme.includes("Multiplayer roadmap")) {
  throw new Error("README must explain multiplayer architecture roadmap.");
}

if (!readme.includes("Graphics roadmap")) {
  throw new Error("README must explain graphics roadmap.");
}

console.log("Cricket Arena AI smoke test passed");
