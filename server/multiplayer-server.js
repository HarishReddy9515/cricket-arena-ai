/**
 * Cricket Arena AI — LAN-ready multiplayer server
 * Run: node server/multiplayer-server.js
 * On same WiFi / mobile hotspot, players use ws://<HOST_IP>:8787
 */

const crypto = require('crypto');
const http   = require('http');
const os     = require('os');

const PORT = Number(process.env.PORT) || 8787;

// ─── Local IP helper ──────────────────────────────────────────────────────────
function getLocalIPs() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

// ─── Deliveries (matches client) ─────────────────────────────────────────────
const DELIVERIES = [
  { name: 'Fast yorker',    speed: 8.8, swing: -0.3, difficulty: 0.86 },
  { name: 'Outswinger',     speed: 7.4, swing:  0.9, difficulty: 0.72 },
  { name: 'Leg cutter',     speed: 6.7, swing: -1.1, difficulty: 0.78 },
  { name: 'Slower bouncer', speed: 5.9, swing:  0.2, difficulty: 0.66 },
  { name: 'Full toss',      speed: 7.0, swing:  0.0, difficulty: 0.55 },
  { name: 'Googly',         speed: 6.2, swing:  1.3, difficulty: 0.82 }
];

// ─── Match modes ──────────────────────────────────────────────────────────────
const MODES = {
  quick: { overs: 1,  wickets: 2  },
  t20:   { overs: 20, wickets: 10 },
  odi:   { overs: 50, wickets: 10 }
};

// ─── In-memory state ──────────────────────────────────────────────────────────
const clients    = new Set();
const clientMeta = new Map(); // socket → { playerId, roomId, ready, lastSeen }
const rooms      = new Map(); // roomId → Set<socket>
const matches    = new Map(); // roomId → match

// ─── HTTP server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const localIPs = getLocalIPs();
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*'
  };

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({ ok: true, clients: clients.size, rooms: rooms.size }));
    return;
  }

  if (req.url === '/info') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...cors });
    res.end(JSON.stringify({
      ok: true,
      localIPs,
      port: PORT,
      wsUrls: localIPs.map(ip => `ws://${ip}:${PORT}`),
      clients: clients.size,
      rooms: rooms.size,
      timestamp: Date.now()
    }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain', ...cors });
  res.end(`Cricket Arena AI — LAN multiplayer server\nPlayers on same WiFi/hotspot: ws://${localIPs[0] || 'YOUR_IP'}:${PORT}`);
});

// ─── WebSocket upgrade ───────────────────────────────────────────────────────
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }

  const accept = crypto
    .createHash('sha1')
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest('base64');

  socket.write([
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${accept}`,
    '', ''
  ].join('\r\n'));

  const meta = {
    playerId: `player-${crypto.randomUUID().slice(0, 8)}`,
    roomId: 'lobby',
    ready: false,
    lastSeen: Date.now()
  };
  clients.add(socket);
  clientMeta.set(socket, meta);
  joinRoom(socket, 'lobby');

  socket.on('data', buf => {
    try {
      const text = decodeFrame(buf);
      if (text) {
        meta.lastSeen = Date.now();
        handleMessage(socket, safeJson(text));
      }
    } catch {}
  });

  socket.on('close', () => cleanup(socket));
  socket.on('error', () => cleanup(socket));
});

// ─── Heartbeat (remove stale sockets every 30s) ───────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const socket of clients) {
    const meta = clientMeta.get(socket);
    if (!meta || now - meta.lastSeen > 60_000) {
      cleanup(socket);
    } else {
      try { socket.write(encodeFrame(JSON.stringify({ type: 'ping_server' }))); } catch {}
    }
  }
}, 30_000);

// ─── Message handler ─────────────────────────────────────────────────────────
function handleMessage(socket, msg) {
  const meta = clientMeta.get(socket);
  if (!meta) return;

  switch (msg.type) {
    case 'join': {
      leaveRoom(socket, meta.roomId);
      meta.roomId  = String(msg.roomId  || 'ARENA-24').slice(0, 24);
      meta.playerId = String(msg.playerId || meta.playerId).slice(0, 32);
      meta.ready   = false;
      joinRoom(socket, meta.roomId);
      broadcastRoomState(meta.roomId);
      // Send current match state if match already running
      if (matches.has(meta.roomId)) {
        send(socket, { type: 'match_state', match: matches.get(meta.roomId) });
      }
      break;
    }
    case 'ping': {
      send(socket, { type: 'pong', clientTime: msg.clientTime, serverTime: Date.now() });
      break;
    }
    case 'ready': {
      meta.ready = Boolean(msg.ready);
      broadcastRoomState(meta.roomId);
      maybeStartMatch(meta.roomId, String(msg.mode || 'quick'));
      break;
    }
    case 'request_delivery': {
      const match = ensureMatch(meta.roomId);
      if (!match.delivery && !match.finished) {
        match.delivery   = chooseDelivery(match);
        match.deliveryId = crypto.randomUUID();
        broadcastMatchState(meta.roomId);
      }
      break;
    }
    case 'shot': {
      const match = ensureMatch(meta.roomId);
      if (!match.delivery || match.finished) break;
      const out = resolveOutcome(
        match.delivery,
        Number(msg.timing || 0),
        String(msg.intent || 'straight')
      );
      match.score   += out.runs;
      match.wickets += out.wicket ? 1 : 0;
      match.balls   += 1;
      match.lastOutcome = out;
      match.timeline.push({
        ball:     match.balls,
        playerId: meta.playerId,
        delivery: match.delivery.name,
        runs:     out.runs,
        wicket:   out.wicket,
        message:  out.message,
        ts:       Date.now()
      });
      match.delivery   = null;
      match.deliveryId = null;
      const { maxBalls, maxWickets } = matchLimits(match.mode);
      match.finished = match.score >= match.target || match.balls >= maxBalls || match.wickets >= maxWickets;
      broadcastMatchState(meta.roomId);
      break;
    }
    case 'input': {
      broadcastToRoom(meta.roomId, { type: 'state', playerId: meta.playerId, payload: msg }, socket);
      break;
    }
  }
}

// ─── Room management ─────────────────────────────────────────────────────────
function joinRoom(socket, roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId).add(socket);
}

function leaveRoom(socket, roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(socket);
  if (!room.size) { rooms.delete(roomId); matches.delete(roomId); }
  else broadcastRoomState(roomId);
}

function cleanup(socket) {
  const meta = clientMeta.get(socket);
  clients.delete(socket);
  if (meta) {
    leaveRoom(socket, meta.roomId);
    clientMeta.delete(socket);
  }
  try { socket.destroy(); } catch {}
}

// ─── Room state ──────────────────────────────────────────────────────────────
function broadcastRoomState(roomId) {
  const room    = rooms.get(roomId) || new Set();
  const players = [...room].map(s => {
    const m = clientMeta.get(s);
    return { playerId: m?.playerId || 'unknown', ready: Boolean(m?.ready) };
  });
  const canStart = players.length >= 2 && players.every(p => p.ready);
  broadcastToRoom(roomId, { type: 'room_state', roomId, players, canStart });
}

function maybeStartMatch(roomId, mode = 'quick') {
  const room    = rooms.get(roomId) || new Set();
  const players = [...room].map(s => clientMeta.get(s)).filter(Boolean);
  if (players.length >= 2 && players.every(p => p.ready)) {
    matches.set(roomId, createMatch(mode));
    broadcastMatchState(roomId);
  }
}

// ─── Match management ────────────────────────────────────────────────────────
function matchLimits(mode = 'quick') {
  const m = MODES[mode] || MODES.quick;
  return { maxBalls: m.overs * 6, maxWickets: m.wickets };
}

function generateTarget(mode = 'quick') {
  const overs = (MODES[mode] || MODES.quick).overs;
  if (overs === 1)  return 18;
  if (overs <= 5)   return 30 + Math.floor(Math.random() * 20);
  if (overs <= 20)  return 120 + Math.floor(Math.random() * 61);
  return 220 + Math.floor(Math.random() * 101);
}

function createMatch(mode = 'quick') {
  return {
    mode,
    target:      generateTarget(mode),
    score:       0,
    wickets:     0,
    balls:       0,
    delivery:    null,
    deliveryId:  null,
    lastOutcome: null,
    finished:    false,
    timeline:    []
  };
}

function ensureMatch(roomId, mode = 'quick') {
  if (!matches.has(roomId)) matches.set(roomId, createMatch(mode));
  return matches.get(roomId);
}

function chooseDelivery(match) {
  const { maxBalls } = matchLimits(match.mode);
  const need = match.target - match.score;
  const rem  = maxBalls - match.balls;
  if (need <= 6 && rem <= 6)      return DELIVERIES[0]; // yorker crunch
  if (need <= rem * 2 && rem <= 12) return DELIVERIES[Math.floor(Math.random() * 2)];
  if (Math.random() < 0.12)       return DELIVERIES[5]; // googly surprise
  return DELIVERIES[Math.floor(Math.random() * DELIVERIES.length)];
}

function resolveOutcome(delivery, timing, intent) {
  const te  = Math.abs(timing - 0.5);
  const ts  = Math.max(0, 1 - te * 2.2);
  const q   = ts - (delivery.difficulty - 0.65) * 0.18;
  const ba  = intent === 'left' ? 220 : intent === 'right' ? 320 : 270;
  const ang = ba + Math.round((timing - 0.5) * 34);

  if (q < 0.18) return { runs: 0, wicket: true,  message: 'Edge! Caught behind.',          angle: ang, distance: 35 };
  if (q < 0.35) return { runs: 0, wicket: false, message: 'Beaten. Dot ball.',              angle: ang, distance: 28 };
  if (q < 0.55) return { runs: 1, wicket: false, message: 'Soft hands. Quick single.',      angle: ang, distance: 45 };
  if (q < 0.72) return { runs: 2, wicket: false, message: 'Pierced the gap. Two runs.',     angle: ang, distance: 62 };
  if (q < 0.88) return { runs: 4, wicket: false, message: 'Cracking boundary!',             angle: ang, distance: 82 };
  return              { runs: 6, wicket: false, message: 'Massive six into the crowd!', angle: ang, distance: 96 };
}

function broadcastMatchState(roomId) {
  broadcastToRoom(roomId, { type: 'match_state', roomId, match: matches.get(roomId) });
}

// ─── Send helpers ─────────────────────────────────────────────────────────────
function send(socket, obj) {
  try { if (!socket.destroyed) socket.write(encodeFrame(JSON.stringify(obj))); } catch {}
}

function broadcastToRoom(roomId, obj, except) {
  const msg = JSON.stringify(obj);
  for (const s of rooms.get(roomId) || []) {
    if (s !== except) send(s, msg.startsWith('{') ? obj : JSON.parse(msg));
  }
}

// ─── WebSocket framing ────────────────────────────────────────────────────────
function decodeFrame(buf) {
  if (buf.length < 2) return null;
  const second = buf[1];
  let len = second & 127;
  let off = 2;
  if (len === 126) { len = buf.readUInt16BE(2); off = 4; }
  else if (len === 127) return null; // too large for demo
  if (buf.length < off + 4 + len) return null;
  const mask = buf.subarray(off, off + 4);
  const data = buf.subarray(off + 4, off + 4 + len);
  const out  = Buffer.alloc(len);
  for (let i = 0; i < len; i++) out[i] = data[i] ^ mask[i % 4];
  return out.toString('utf8');
}

function encodeFrame(message) {
  const payload = Buffer.from(message, 'utf8');
  if (payload.length < 126) {
    return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  }
  if (payload.length < 65536) {
    const hdr = Buffer.alloc(4);
    hdr[0] = 0x81; hdr[1] = 126;
    hdr.writeUInt16BE(payload.length, 2);
    return Buffer.concat([hdr, payload]);
  }
  throw new Error('Frame too large');
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║        Cricket Arena AI — Multiplayer Server         ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Local (same WiFi / hotspot):                        ║`);
  ips.forEach(ip => {
    const url = `ws://${ip}:${PORT}`;
    console.log(`║  ${url.padEnd(52)}║`);
  });
  console.log(`║  Localhost:  ws://localhost:${PORT}                    ║`);
  console.log('║                                                      ║');
  console.log('║  Share the LAN URL with players on same network.    ║');
  console.log('║  Open index.html → Online Room → paste URL above    ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
});
