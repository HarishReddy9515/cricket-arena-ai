const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
const three = fs.readFileSync(path.join(root, "three-scene.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server", "multiplayer-server.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

for (const id of ["gameCanvas", "threeViewport", "toggle3dBtn", "startBtn", "shotBtn", "score", "equation", "shotMap"]) {
  if (!html.includes(`id="${id}"`)) {
    throw new Error(`Missing DOM id: ${id}`);
  }
}

for (const symbol of ["startMatch", "queueDelivery", "playShot", "resolveOutcome", "drawStadium", "requestAnimationFrame"]) {
  if (!js.includes(symbol)) {
    throw new Error(`Missing game workflow: ${symbol}`);
  }
}

for (const symbol of ["THREE", "buildStadium", "buildPlayers", "shadowMap", "PerspectiveCamera"]) {
  if (!three.includes(symbol)) {
    throw new Error(`Missing Three.js workflow: ${symbol}`);
  }
}

for (const symbol of ["upgrade", "Sec-WebSocket-Accept", "broadcast", "decodeFrame"]) {
  if (!server.includes(symbol)) {
    throw new Error(`Missing multiplayer server workflow: ${symbol}`);
  }
}

if (!readme.includes("Multiplayer roadmap")) {
  throw new Error("README must explain multiplayer architecture roadmap.");
}

if (!readme.includes("Graphics roadmap")) {
  throw new Error("README must explain graphics roadmap.");
}

console.log("Cricket Arena AI smoke test passed");
