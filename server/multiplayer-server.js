const crypto = require("crypto");
const http = require("http");

const PORT = process.env.PORT || 8787;
const clients = new Set();
const clientState = new Map();
const rooms = new Map();
const roomMatches = new Map();

const deliveries = [
  { name: "Fast yorker", speed: 8.8, swing: -0.3, difficulty: 0.86 },
  { name: "Outswinger", speed: 7.4, swing: 0.9, difficulty: 0.72 },
  { name: "Leg cutter", speed: 6.7, swing: -1.1, difficulty: 0.78 },
  { name: "Slower bouncer", speed: 5.9, swing: 0.2, difficulty: 0.66 }
];

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, clients: clients.size }));
    return;
  }
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Cricket Arena AI multiplayer server");
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    ""
  ].join("\r\n"));

  clients.add(socket);
  clientState.set(socket, { playerId: `player-${crypto.randomUUID().slice(0, 8)}`, roomId: "lobby", ready: false });
  joinRoom(socket, "lobby");

  socket.on("data", (buffer) => {
    const message = decodeFrame(buffer);
    if (!message) return;
    handleMessage(socket, safeJson(message));
  });

  socket.on("close", () => {
    const state = clientState.get(socket);
    clients.delete(socket);
    if (state) {
      leaveRoom(socket, state.roomId);
      clientState.delete(socket);
    }
  });
});

function handleMessage(socket, message) {
  const current = clientState.get(socket);
  if (!current) return;

  if (message.type === "join") {
    leaveRoom(socket, current.roomId);
    current.roomId = String(message.roomId || "ARENA-24").slice(0, 24);
    current.playerId = String(message.playerId || current.playerId).slice(0, 32);
    current.ready = false;
    joinRoom(socket, current.roomId);
    broadcastRoomState(current.roomId);
    return;
  }

  if (message.type === "ready") {
    current.ready = Boolean(message.ready);
    broadcastRoomState(current.roomId);
    maybeStartMatch(current.roomId);
    return;
  }

  if (message.type === "request_delivery") {
    const match = ensureMatch(current.roomId);
    if (!match.delivery && !match.finished) {
      match.delivery = chooseDelivery(match);
      match.deliveryId = crypto.randomUUID();
    }
    broadcastMatchState(current.roomId);
    return;
  }

  if (message.type === "shot") {
    const match = ensureMatch(current.roomId);
    if (!match.delivery || match.finished) return;
    const outcome = resolveOutcome(match.delivery, Number(message.timing || 0), String(message.intent || "straight"));
    match.score += outcome.runs;
    match.wickets += outcome.wicket ? 1 : 0;
    match.balls += 1;
    match.lastOutcome = outcome;
    match.delivery = null;
    match.deliveryId = null;
    match.finished = match.score >= match.target || match.balls >= 6 || match.wickets >= 2;
    broadcastMatchState(current.roomId);
    return;
  }

  if (message.type === "input") {
    broadcastToRoom(current.roomId, JSON.stringify({ type: "state", playerId: current.playerId, payload: message }), socket);
  }
}

function joinRoom(socket, roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(socket);
}

function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(socket);
  if (!room.size) rooms.delete(roomId);
  else broadcastRoomState(roomId);
}

function broadcastRoomState(roomId) {
  const room = rooms.get(roomId) || new Set();
  const players = Array.from(room).map((client) => {
    const state = clientState.get(client);
    return { playerId: state?.playerId || "unknown", ready: Boolean(state?.ready) };
  });
  const canStart = players.length >= 2 && players.every((player) => player.ready);
  broadcastToRoom(roomId, JSON.stringify({ type: "room_state", roomId, players, canStart }));
}

function maybeStartMatch(roomId) {
  const room = rooms.get(roomId) || new Set();
  const players = Array.from(room).map((client) => clientState.get(client)).filter(Boolean);
  if (players.length >= 2 && players.every((player) => player.ready)) {
    roomMatches.set(roomId, createMatch());
    broadcastMatchState(roomId);
  }
}

function createMatch() {
  return {
    target: 18,
    score: 0,
    wickets: 0,
    balls: 0,
    delivery: null,
    deliveryId: null,
    lastOutcome: null,
    finished: false
  };
}

function ensureMatch(roomId) {
  if (!roomMatches.has(roomId)) roomMatches.set(roomId, createMatch());
  return roomMatches.get(roomId);
}

function chooseDelivery(match) {
  const need = match.target - match.score;
  if (need <= 6 && match.balls >= 3) return deliveries[0];
  return deliveries[Math.floor(Math.random() * deliveries.length)];
}

function resolveOutcome(delivery, timing, intent) {
  const timingError = Math.abs(timing - 0.5);
  const timingScore = Math.max(0, 1 - timingError * 2.2);
  const quality = timingScore - (delivery.difficulty - 0.65) * 0.18;
  const baseAngle = intent === "left" ? 220 : intent === "right" ? 320 : 270;
  const angle = baseAngle + Math.round((timing - 0.5) * 34);

  if (quality < 0.18) return { runs: 0, wicket: true, message: "Edge! Caught behind.", angle, distance: 35 };
  if (quality < 0.35) return { runs: 0, wicket: false, message: "Beaten. Dot ball.", angle, distance: 28 };
  if (quality < 0.55) return { runs: 1, wicket: false, message: "Soft hands. Quick single.", angle, distance: 45 };
  if (quality < 0.72) return { runs: 2, wicket: false, message: "Pierced the gap. Two runs.", angle, distance: 62 };
  if (quality < 0.88) return { runs: 4, wicket: false, message: "Cracking boundary!", angle, distance: 82 };
  return { runs: 6, wicket: false, message: "Massive six into the crowd!", angle, distance: 96 };
}

function broadcastMatchState(roomId) {
  const match = ensureMatch(roomId);
  broadcastToRoom(roomId, JSON.stringify({ type: "match_state", roomId, match }));
}

function broadcastToRoom(roomId, message, except) {
  for (const client of rooms.get(roomId) || []) {
    if (client !== except && !client.destroyed) {
      client.write(encodeFrame(message));
    }
  }
}

function decodeFrame(buffer) {
  const second = buffer[1];
  let length = second & 127;
  let offset = 2;
  if (length === 126) {
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    return "";
  }
  const maskStart = offset;
  const dataStart = maskStart + 4;
  const mask = buffer.subarray(maskStart, dataStart);
  const data = buffer.subarray(dataStart, dataStart + length);
  const decoded = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    decoded[i] = data[i] ^ mask[i % 4];
  }
  return decoded.toString("utf8");
}

function encodeFrame(message) {
  const payload = Buffer.from(message);
  const frame = [0x81];
  if (payload.length < 126) {
    frame.push(payload.length);
    return Buffer.concat([Buffer.from(frame), payload]);
  }
  if (payload.length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  } else {
    throw new Error("Payload too large for demo server frame.");
  }
}

function safeJson(message) {
  try {
    return JSON.parse(message);
  } catch {
    return { text: message };
  }
}

server.listen(PORT, () => {
  console.log(`Cricket Arena AI multiplayer server on http://localhost:${PORT}`);
});
