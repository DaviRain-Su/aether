#!/usr/bin/env node
/**
 * Expose a local stdio ACP agent over a WebSocket so Aether can connect
 * without spawning the process itself.
 *
 *   node scripts/acp-bridge.mjs --cmd "claude-code --acp" --port 9100
 *
 * Pure Node — no extra packages. Speaks the RFC 6455 text frames Aether expects.
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}
const cmd = flag("--cmd", "claude-code --acp");
const port = Number(flag("--port", "9100"));
const [bin, ...rest] = cmd.split(" ").filter(Boolean);

function sendFrame(socket, payload) {
  const data = Buffer.from(payload);
  const len = data.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  socket.write(Buffer.concat([header, data]));
}

function decodeFrames(buf, onText) {
  let offset = 0;
  while (offset + 2 <= buf.length) {
    const finOp = buf[offset];
    const second = buf[offset + 1];
    if (finOp === undefined || second === undefined) break;
    const opcode = finOp & 0x0f;
    const masked = (second & 0x80) !== 0;
    let len = second & 0x7f;
    let cursor = offset + 2;
    if (len === 126) {
      if (cursor + 2 > buf.length) break;
      len = buf.readUInt16BE(cursor);
      cursor += 2;
    } else if (len === 127) {
      if (cursor + 8 > buf.length) break;
      len = Number(buf.readBigUInt64BE(cursor));
      cursor += 8;
    }
    const mask = masked ? buf.subarray(cursor, cursor + 4) : null;
    if (masked) cursor += 4;
    if (cursor + len > buf.length) break;
    const payload = buf.subarray(cursor, cursor + len);
    const out = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      out[i] = payload[i] ^ (mask ? mask[i % 4] : 0);
    }
    if (opcode === 0x1) onText(out.toString("utf8"));
    offset = cursor + len;
  }
  return buf.subarray(offset);
}

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end(`Aether ACP bridge for: ${cmd}\n`);
});

server.on("upgrade", (req, socket) => {
  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  const proc = spawn(bin, rest, { stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let incoming = Buffer.alloc(0);
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    stdout += chunk;
    let idx;
    while ((idx = stdout.indexOf("\n")) >= 0) {
      const line = stdout.slice(0, idx);
      stdout = stdout.slice(idx + 1);
      if (line.trim()) sendFrame(socket, line);
    }
  });
  proc.stderr.on("data", (d) => process.stderr.write(d));
  socket.on("data", (chunk) => {
    incoming = decodeFrames(Buffer.concat([incoming, chunk]), (text) => {
      proc.stdin.write(text.endsWith("\n") ? text : `${text}\n`);
    });
  });
  socket.on("close", () => proc.kill("SIGTERM"));
  proc.on("exit", () => socket.end());
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[acp-bridge] ${cmd}  →  ws://127.0.0.1:${port}`);
});
