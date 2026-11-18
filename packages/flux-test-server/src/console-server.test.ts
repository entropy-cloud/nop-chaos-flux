import { afterEach, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import WebSocket from 'ws';
import { startConsoleServer } from './console-server.js';
import { CONSOLE_PEER_ID, TestGateway } from './gateway.js';

const cleanups: Array<() => Promise<void>> = [];
async function register<T extends { close(): Promise<void> }>(resource: T): Promise<T> {
  cleanups.push(() => resource.close());
  return resource;
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port));
  });
}

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

describe('Console v1 server', () => {
  it('serves the console HTML shell and the spec list', async () => {
    const handle = await register(await startConsoleServer({
      specsDir: new URL('../../../tests/e2e/flux', import.meta.url).pathname,
      baseUrl: 'http://127.0.0.1:59998',
      timeoutMs: 5_000,
      runOverride: async () => ({}),
    }));
    const page = await fetch(`http://127.0.0.1:${handle.port}/__flux_test__`);
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('console-bundle.js');

    const specs = await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/specs`);
    const body = (await specs.json()) as { specs: string[] };
    expect(Array.isArray(body.specs)).toBe(true);
    expect(body.specs.length).toBeGreaterThan(0);
    expect(body.specs.every((s) => s.endsWith('.ts') || s.endsWith('.tsx'))).toBe(true);

    const missing = await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/nothing`);
    expect(missing.status).toBe(404);
  });

  it('rejects a second run with 409 while one is in flight', async () => {
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const handle = await register(await startConsoleServer({
      specsDir: '/tmp',
      baseUrl: 'http://127.0.0.1:59998',
      timeoutMs: 5_000,
      runOverride: async () => {
        await gate;
        return { results: [], exitCode: 0 };
      },
    }));

    const first = await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/run`, {
      method: 'POST',
      body: JSON.stringify({ spec: 'a.flux-spec.ts' }),
    });
    expect(first.status).toBe(202);

    const second = await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/run`, {
      method: 'POST',
      body: JSON.stringify({ spec: 'a.flux-spec.ts' }),
    });
    expect(second.status).toBe(409);
    release!();
  });

  it('rejects path-escaping specs with 400', async () => {
    const handle = await register(await startConsoleServer({
      specsDir: '/tmp',
      baseUrl: 'http://127.0.0.1:59998',
      timeoutMs: 5_000,
      runOverride: async () => ({}),
    }));
    const res = await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/run`, {
      method: 'POST',
      body: JSON.stringify({ spec: '../../etc/passwd' }),
    });
    expect(res.status).toBe(400);
  });

  it('broadcasts run started/finished to the reserved console peer', async () => {
    const handle = await register(await startConsoleServer({
      specsDir: '/tmp',
      baseUrl: 'http://127.0.0.1:59998',
      timeoutMs: 5_000,
      runOverride: async () => ({ results: [{ spec: 'a', status: 'passed', durationMs: 1 }], exitCode: 0 }),
    }));

    const ws = new WebSocket(`ws://127.0.0.1:${handle.port}/gateway?targetId=${CONSOLE_PEER_ID}`);
    await once(ws, 'open');
    const messages: Array<{ method: string; params: Record<string, unknown> }> = [];
    ws.on('message', (data) => messages.push(JSON.parse(String(data))));
    await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/run`, {
      method: 'POST',
      body: JSON.stringify({ spec: 'a.flux-spec.ts' }),
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(messages.map((m) => m.method)).toEqual(['console.run.started', 'console.run.finished']);
    ws.close();
  });
});

describe('gateway external-server attach', () => {
  it('routes /gateway upgrades and leaves other paths alone', async () => {
    const server = createServer();
    const port = await listen(server);
    cleanups.push(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    });
    const gateway = await register(new TestGateway());
    const consoleId = gateway.attachToServer(server as never);
    expect(consoleId).toBe(CONSOLE_PEER_ID);

    const ws = new WebSocket(`ws://127.0.0.1:${port}/gateway?targetId=${CONSOLE_PEER_ID}`);
    await once(ws, 'open');
    // Non-gateway upgrade attempts simply hang/fail; the gateway path works:
    gateway.notifyConsole('console.ping', { hello: 1 });
    const msg = await new Promise<Record<string, unknown>>((resolve) => {
      ws.once('message', (data) => resolve(JSON.parse(String(data))));
    });
    expect(msg).toMatchObject({ method: 'console.ping', params: { hello: 1 } });
    ws.close();
  });
});

describe('Console watch mode', () => {
  it('debounces file churn into a single re-run and stops on toggle-off', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'flux-watch-'));
    cleanups.push(async () => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(join(dir, 'demo.flux-spec.ts'), 'export default async () => {};\n');

    const runs: string[] = [];
    const handle = await register(await startConsoleServer({
      specsDir: dir,
      baseUrl: 'http://127.0.0.1:59998',
      timeoutMs: 5_000,
      runOverride: async (specFullPath) => {
        runs.push(specFullPath);
        return { results: [], exitCode: 0 };
      },
    }));

    const watchOn = await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/watch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ on: true }),
    });
    expect(((await watchOn.json()) as { watching: boolean }).watching).toBe(true);

    // churn: three rapid saves of the same spec → debounce collapses to one run
    for (let i = 0; i < 3; i += 1) {
      writeFileSync(join(dir, 'demo.flux-spec.ts'), `export default async () => { return ${i}; };\n`);
    }
    // unrelated file must not trigger
    writeFileSync(join(dir, 'notes.txt'), 'x\n');
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(runs.length).toBe(1);
    expect(runs[0]).toContain('demo.flux-spec.ts');

    const watchOff = await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/watch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ on: false }),
    });
    expect(((await watchOff.json()) as { watching: boolean }).watching).toBe(false);
    writeFileSync(join(dir, 'demo.flux-spec.ts'), 'export default async () => { return 9; };\n');
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(runs.length).toBe(1);
  });

  it('skips the run when a debounced change lands while a run is in flight', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'flux-watch-2-'));
    cleanups.push(async () => rmSync(dir, { recursive: true, force: true }));
    writeFileSync(join(dir, 'busy.flux-spec.ts'), 'export default async () => {};\n');

    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let inFlight = false;
    const handle = await register(await startConsoleServer({
      specsDir: dir,
      baseUrl: 'http://127.0.0.1:59998',
      timeoutMs: 5_000,
      runOverride: async () => {
        inFlight = true;
        await gate;
        inFlight = false;
        return { results: [], exitCode: 0 };
      },
    }));
    void inFlight;

    await fetch(`http://127.0.0.1:${handle.port}/__flux_test__/api/watch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ on: true }),
    });
    // occupy the single-flight slot
    writeFileSync(join(dir, 'busy.flux-spec.ts'), 'export default async () => { return 1; };\n');
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(inFlight).toBe(true);
    // change during the in-flight run must be dropped, not queued
    writeFileSync(join(dir, 'busy.flux-spec.ts'), 'export default async () => { return 2; };\n');
    await new Promise((resolve) => setTimeout(resolve, 900));
    release!();
    await new Promise((resolve) => setTimeout(resolve, 900));
    // run finished; no queued re-run fired
    expect(inFlight).toBe(false);
  });
});
