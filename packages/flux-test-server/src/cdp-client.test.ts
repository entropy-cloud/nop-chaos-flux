import { afterEach, describe, expect, it } from 'vitest';
import { CdpClient } from './cdp-client.js';
import { FluxTestError } from './errors.js';
import { MockCdpServer } from './mock-cdp.js';

const servers: MockCdpServer[] = [];
async function startServer() {
  const server = new MockCdpServer();
  const info = await server.listen();
  servers.push(server);
  return { server, ...info };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => s.close()));
});

describe('CdpClient', () => {
  it('sends a request and resolves the correlated result', async () => {
    const { wsEndpoint } = await startServer();
    const client = await CdpClient.connect(wsEndpoint);
    const result = await client.send('Target.createTarget', { url: 'about:blank' });
    expect(result).toEqual({});
    client.close();
  });

  it('rejects with cdp-request-failed when the endpoint replies with error', async () => {
    const { wsEndpoint } = await startServer();
    servers[servers.length - 1]!.errorMethods.add('Boom.Method');
    const client = await CdpClient.connect(wsEndpoint);
    await expect(client.send('Boom.Method')).rejects.toMatchObject({ code: 'cdp-request-failed' });
    client.close();
  });

  it('reports cdp-timeout when no response arrives in time', async () => {
    const { wsEndpoint } = await startServer();
    servers[servers.length - 1]!.silentMethods.add('Never.Answered');
    const client = await CdpClient.connect(wsEndpoint);
    await expect(client.send('Never.Answered', {}, undefined, 50)).rejects.toMatchObject({ code: 'cdp-timeout' });
    client.close();
  });

  it('rejects pending requests with cdp-closed when the socket drops', async () => {
    const { wsEndpoint, server } = await startServer();
    const client = await CdpClient.connect(wsEndpoint);
    const pending = client.send('Never.Answered', {}, undefined, 5_000);
    server.close();
    await expect(pending).rejects.toMatchObject({ code: 'cdp-closed' });
  });

  it('rejects connect with cdp-connect-timeout against a dead endpoint', async () => {
    // Port 1 on localhost: closed in virtually every environment.
    await expect(CdpClient.connect('ws://127.0.0.1:59999', 500)).rejects.toMatchObject({ code: 'cdp-connect-timeout' });
  });

  it('dispatches CDP events to subscribers', async () => {
    const { wsEndpoint, server } = await startServer();
    const client = await CdpClient.connect(wsEndpoint);
    const seen: string[] = [];
    client.on('Page.loadEventFired', (event) => seen.push(event.method));
    server.broadcast('Page.loadEventFired', { timestamp: 1 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toEqual(['Page.loadEventFired']);
    client.close();
  });

  it('rejects sends after close with cdp-closed', async () => {
    const { wsEndpoint } = await startServer();
    const client = await CdpClient.connect(wsEndpoint);
    client.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await expect(client.send('Any.Method')).rejects.toMatchObject({ code: 'cdp-closed' });
  });

  it('parses id-keyed responses even when interleaved', async () => {
    const { wsEndpoint } = await startServer();
    const client = await CdpClient.connect(wsEndpoint);
    const [a, b] = await Promise.all([
      client.send('Target.createTarget', { url: 'a' }),
      client.send('Target.createTarget', { url: 'b' }),
    ]);
    expect(a).toEqual(b);
    expect(a).toEqual({});
    client.close();
  });

  it('surfaces FluxTestError with details for non-object payloads', () => {
    const err = new FluxTestError('cdp-closed', 'boom', { extra: 1 });
    expect(err.toJSON()).toMatchObject({ code: 'cdp-closed', details: { extra: 1 } });
    expect(isFluxTestErrorLike(err)).toBe(true);
  });
});

function isFluxTestErrorLike(value: unknown): boolean {
  return value instanceof FluxTestError;
}
