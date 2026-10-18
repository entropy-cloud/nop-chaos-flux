/**
 * plan 2476（roadmap item 22）：xlang 在线调试 D1 协议 mock 服务器（e2e 专用）。
 *
 * 职责：playwright webServer 进程族之一（固定端口 4180），vite dev server 将
 * `/ws/xlang-debugger`（ws 代理）与 `/r/nop-xlang-debug/*`（http 代理）转发到本进程；
 * 浏览器侧真实 WebSocket 直连本服务器（无注入 mock）——确定性时序。
 *
 * RFC6455 最小实现：文本帧（opcode 0x1）、掩码解码（客户端帧必掩码）、ping/pong、
 * close 握手；不支持分片（D1 帧均为小文本帧）。
 *
 * 测试控制面：
 * - GET  /__frames → { received: [...] }        客户端→服务器帧（按连接累积）
 * - POST /__emit   body = JSON-RPC 事件帧        服务器→全部活跃连接广播
 * - POST /__reset  body = {}                     清空 received/断点/挂起态
 * - POST /__close  body = {code}                 强制关闭全部连接（断连路径）
 * - POST /__compile body = {diagnostics:[...]}|{status:500}  配置 compile 端点应答
 * - GET  /__compile → 当前 compile 应答配置
 * - GET  /__health → 200
 */
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';

const PORT = Number(process.env.XLANG_E2E_MOCK_PORT || process.env.MOCK_PORT || 4180);
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const connections = new Set();
const received = [];
let sessionSeq = 0;
const state = { breakpoints: [], suspendedThread: null };
let compileResponse = { diagnostics: [] };

function sendText(socket, text) {
  const payload = Buffer.from(text, 'utf8');
  const length = payload.length;
  let header;
  if (length < 126) {
    header = Buffer.from([0x81, length]);
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

function broadcast(frame) {
  const text = JSON.stringify(frame);
  for (const socket of connections) sendText(socket, text);
}

// closure audit Minor-1/2 加固：边界检查（扩展长度头截断不抛）+ 残字节保留循环
// （粘包/跨 chunk 帧不再丢失）+ 解码全 try/catch（未捕获异常会杀死 mock webServer）
function decodeClientFrames(socket, buffer, onFrame) {
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const opcode = buffer[offset] & 0x0f;
    const masked = (buffer[offset + 1] & 0x80) !== 0;
    let length = buffer[offset + 1] & 0x7f;
    let headerEnd = offset + 2;
    if (length === 126) {
      if (buffer.length < headerEnd + 2) break; // 扩展长度头截断：等下一个 chunk
      length = buffer.readUInt16BE(headerEnd);
      headerEnd += 2;
    } else if (length === 127) {
      if (buffer.length < headerEnd + 8) break;
      length = Number(buffer.readBigUInt64BE(headerEnd));
      headerEnd += 8;
    }
    const maskEnd = headerEnd + (masked ? 4 : 0);
    const frameEnd = maskEnd + length;
    if (buffer.length < frameEnd) break; // payload 截断：等下一个 chunk
    if (opcode === 0x8) {
      // close 握手：回 close 并断开
      socket.write(Buffer.from([0x88, 0x00]));
      socket.destroy();
      connections.delete(socket);
      return; // close 后残余帧无意义
    }
    if (opcode === 0x9) {
      // ping → pong（0x8A，无掩码）
      const payload = buffer.subarray(maskEnd, frameEnd);
      socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload]));
    } else if (opcode === 0x1) {
      let payload;
      if (masked) {
        const key = buffer.subarray(headerEnd, maskEnd);
        const body = buffer.subarray(maskEnd, frameEnd);
        payload = Buffer.alloc(length);
        for (let i = 0; i < length; i++) payload[i] = body[i] ^ key[i % 4];
      } else {
        payload = buffer.subarray(maskEnd, frameEnd);
      }
      try {
        onFrame(JSON.parse(payload.toString('utf8')));
      } catch {
        // 非 JSON 帧：忽略
      }
    }
    offset = frameEnd;
  }
  return buffer.length > offset ? buffer.subarray(offset) : Buffer.alloc(0);
}

function handleClientFrame(frame) {
  received.push(frame);
  const id = frame.id;
  const reply = (result) => {
    const socket = frame.__socket;
    if (socket) sendText(socket, JSON.stringify({ jsonrpc: '2.0', id, result }));
  };
  switch (frame.method) {
    case 'session.open':
      reply({
        sessionId: `u1:conn-${++sessionSeq}`,
        protoVersion: '1.0',
        lease: { ttlMs: 30000, renewIntervalMs: 250 },
      });
      break;
    case 'debugger.setBreakpoints':
      state.breakpoints = frame.params?.bps ?? [];
      reply({});
      break;
    case 'debugger.addBreakpoint':
      state.breakpoints.push(frame.params?.bp);
      reply({});
      break;
    case 'debugger.removeBreakpoint':
      state.breakpoints = state.breakpoints.filter(
        (bp) => !(bp.sourcePath === frame.params?.bp?.sourcePath && bp.line === frame.params?.bp?.line),
      );
      reply({});
      break;
    case 'lease.renew':
      reply({
        lease: {
          expiresAtMs: Date.now() + 30_000,
          suspendedThreadIds: state.suspendedThread != null ? [state.suspendedThread] : [],
        },
      });
      break;
    case 'debugger.getExprValue':
      reply({ v: { kind: 'expr', name: frame.params?.expr, type: 'java.lang.Integer', value: '42' } });
      break;
    case 'debugger.getFrameVariables':
      reply({
        vars: [
          { kind: 'var', name: 'a', type: 'java.lang.Integer', value: '2' },
          { kind: 'var', name: 'RESULT', type: 'java.lang.Integer', value: '4' },
        ],
      });
      break;
    case 'debugger.getStackInfo':
      reply({
        stackInfo: {
          threadId: frame.params?.threadId,
          threadName: 'mock-business',
          stackTrace: [{ funcName: 'main', sourcePath: 'demo.xpl', line: 1 }],
        },
      });
      break;
    case 'session.rebind':
      reply({
        sessionId: `u1:conn-${sessionSeq}`,
        breakpoints: state.breakpoints,
        suspendedThreads: [],
        lease: { expiresAtMs: Date.now() + 30_000 },
      });
      break;
    default:
      reply({});
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/r/nop-xlang-debug/compile') {
    // compileResponse = {diagnostics:[...]}（200 正常）或 {status:500}（HTTP 500——
    // 页面 fetcher 以 response.ok 映射 envelope.status，compile-service 合成兜底诊断）
    const status = compileResponse.status ?? 200;
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(compileResponse));
    return;
  }
  if (url.pathname === '/__frames') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ received }));
    return;
  }
  if (url.pathname === '/__health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, connections: connections.size }));
    return;
  }
  if (url.pathname === '/__emit' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        broadcast(JSON.parse(body));
        res.writeHead(200);
        res.end('{}');
      } catch (error) {
        res.writeHead(400);
        res.end(String(error));
      }
    });
    return;
  }
  if (url.pathname === '/__reset' && req.method === 'POST') {
    received.length = 0;
    state.breakpoints = [];
    state.suspendedThread = null;
    compileResponse = { diagnostics: [] };
    res.writeHead(200);
    res.end('{}');
    return;
  }
  if (url.pathname === '/__close' && req.method === 'POST') {
    for (const socket of connections) {
      try {
        socket.write(Buffer.from([0x88, 0x00])); // close 帧（1006 语义由客户端按异常断连处理）
      } catch {
        // 已死连接忽略
      }
      socket.destroy();
    }
    connections.clear();
    res.writeHead(200);
    res.end('{}');
    return;
  }
  if (url.pathname === '/__compile' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      compileResponse = JSON.parse(body || '{}');
      res.writeHead(200);
      res.end('{}');
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname !== '/ws/xlang-debugger') {
    socket.destroy();
    return;
  }
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n` +
      '\r\n',
  );
  connections.add(socket);
  socket.buffer = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    try {
      socket.buffer = decodeClientFrames(socket, Buffer.concat([socket.buffer, chunk]), (parsed) =>
        handleClientFrame({ ...parsed, __socket: socket }));
    } catch (error) {
      // 解码异常不得杀死 mock webServer（audit Minor-1）：记日志并断开该连接
      console.error('[xlang-debug-mock] frame decode failed:', error);
      connections.delete(socket);
      socket.destroy();
    }
  });
  socket.on('error', () => connections.delete(socket));
  socket.on('close', () => connections.delete(socket));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[xlang-debug-mock] listening on 127.0.0.1:${PORT}`);
});
