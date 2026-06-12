const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "app.js"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

for (const id of ["gameCanvas", "startBtn", "shotBtn", "score", "equation", "shotMap"]) {
  if (!html.includes(`id="${id}"`)) {
    throw new Error(`Missing DOM id: ${id}`);
  }
}

for (const symbol of ["startMatch", "queueDelivery", "playShot", "resolveOutcome", "drawStadium", "requestAnimationFrame"]) {
  if (!js.includes(symbol)) {
    throw new Error(`Missing game workflow: ${symbol}`);
  }
}

if (!readme.includes("Multiplayer roadmap")) {
  throw new Error("README must explain multiplayer architecture roadmap.");
}

console.log("Cricket Arena AI smoke test passed");
