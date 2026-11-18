import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { TestGateway } from './gateway.js';

const gateways: TestGateway[] = [];
const sockets: WebSocket[] = [];
async function startGateway() {
  const gateway = new TestGateway();
  const port = await gateway.listen();
  gateways.push(gateway);
  return { gateway, port };
}

function connectPeer(port: number, targetId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/?targetId=${targetId}`);
    ws.on('open', () => {
      sockets.push(ws);
      resolve(ws);
    });
    ws.on('error', reject);
  });
}

function nextMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    ws.once('message', (data: unknown) => resolve(JSON.parse(String(data))));
  });
}

afterEach(async () => {
  for (const ws of sockets.splice(0)) ws.terminate();
  await Promise.all(gateways.splice(0).map((g) => g.close()));
});

describe('TestGateway', () => {
  it('binds a peer by targetId and routes requests both ways', async () => {
    const { gateway, port } = await startGateway();
    const attachEvents: string[] = [];
    gateway.on('attach', ({ targetId }) => attachEvents.push(targetId));
    const peerWs = await connectPeer(port, 't-1');

    const replyTask = nextMessage(peerWs).then((msg) => {
      peerWs.send(JSON.stringify({ id: msg.id, result: { pong: true } }));
    });
    const peer = gateway.getPeer('t-1');
    const result = await peer.sendRequest('ping');
    await replyTask;
    expect(result).toEqual({ pong: true });
    expect(attachEvents).toEqual(['t-1']);
  });

  it('routes page events with payload to subscribers', async () => {
    const { gateway, port } = await startGateway();
    const peerWs = await connectPeer(port, 't-2');
    const seen: Array<{ targetId: string; payload: unknown }> = [];
    gateway.on('log.emit', (arg) => seen.push(arg));
    peerWs.send(JSON.stringify({ event: 'log.emit', payload: { level: 'info' } }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toEqual([{ targetId: 't-2', payload: { level: 'info' } }]);
  });

  it('rejects pending requests with gateway-peer-lost when the socket drops', async () => {
    const { gateway, port } = await startGateway();
    const peerWs = await connectPeer(port, 't-3');
    const peer = gateway.getPeer('t-3');
    const pending = peer.sendRequest('slow');
    peerWs.terminate();
    await expect(pending).rejects.toMatchObject({ code: 'gateway-peer-lost' });
    await gateway.close();
  });

  it('rejects requests with gateway-peer-lost on timeout', async () => {
    const { gateway, port } = await startGateway();
    await connectPeer(port, 't-4');
    const peer = gateway.getPeer('t-4');
    await expect(peer.sendRequest('never', {}, 40)).rejects.toMatchObject({ code: 'gateway-peer-lost' });
  });

  it('throws gateway-no-peer for unknown targets', async () => {
    const { gateway } = await startGateway();
    expect(() => gateway.getPeer('missing')).toThrowError(/no attached peer/);
  });

  it('closes connections on shutdown and detaches peers', async () => {
    const { gateway, port } = await startGateway();
    const detachEvents: string[] = [];
    gateway.on('detach', ({ targetId }) => detachEvents.push(targetId));
    await connectPeer(port, 't-5');
    await gateway.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(detachEvents).toEqual(['t-5']);
  });
});
