const crypto = require("crypto");
const http = require("http");

const PORT = process.env.PORT || 8787;
const clients = new Set();
const clientState = new Map();
const rooms = new Map();

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

function broadcastToRoom(roomId, message, except) {
  for (const client of rooms.get(roomId) || []) {
    if (client !== except && !client.destroyed) {
      client.write(encodeFrame(message));
    }
  }
}

function decodeFrame(buffer) {
  const second = buffer[1];
  const length = second & 127;
  const maskStart = 2;
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
  } else {
    throw new Error("Payload too large for demo server frame.");
  }
  return Buffer.concat([Buffer.from(frame), payload]);
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
