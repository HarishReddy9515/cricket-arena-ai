const crypto = require("crypto");
const http = require("http");

const PORT = process.env.PORT || 8787;
const clients = new Set();

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
  broadcast(JSON.stringify({ type: "presence", clients: clients.size }));

  socket.on("data", (buffer) => {
    const message = decodeFrame(buffer);
    if (!message) return;
    broadcast(JSON.stringify({ type: "state", payload: safeJson(message), clients: clients.size }), socket);
  });

  socket.on("close", () => {
    clients.delete(socket);
    broadcast(JSON.stringify({ type: "presence", clients: clients.size }));
  });
});

function broadcast(message, except) {
  for (const client of clients) {
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
