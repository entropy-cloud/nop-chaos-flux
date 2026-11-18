import { afterEach, describe, expect, it } from 'vitest';
import { CdpClient } from './cdp-client.js';
import { discoverBrowserExecutable, createBrowserHandle } from './launcher.js';
import { FluxTestError } from './errors.js';
import { MockCdpServer, pageHandlers } from './mock-cdp.js';

const servers: MockCdpServer[] = [];
async function startPageServer(opts: { stuckNavigations?: boolean } = {}) {
  const server = new MockCdpServer({ handler: pageHandlers(), stuckNavigations: opts.stuckNavigations });
  const info = await server.listen();
  servers.push(server);
  return { server, ...info };
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => s.close()));
});

describe('discoverBrowserExecutable', () => {
  it('throws browser-not-found when nothing exists', () => {
    expect(() => discoverBrowserExecutable('/nonexistent/chrome-xyz')).toThrow(FluxTestError);
    try {
      discoverBrowserExecutable('/nonexistent/chrome-xyz');
    } catch (err) {
      expect((err as FluxTestError).code).toBe('browser-not-found');
    }
  });

  it('returns the explicit path when it exists', () => {
    expect(discoverBrowserExecutable('/bin/sh')).toBe('/bin/sh');
  });
});

describe('createBrowserHandle (mock CDP)', () => {
  async function makeHandle(opts: { stuckNavigations?: boolean } = {}) {
    const { wsEndpoint } = await startPageServer(opts);
    const client = await CdpClient.connect(wsEndpoint);
    return { server: servers[servers.length - 1]!, handle: createBrowserHandle(client, wsEndpoint, undefined, { pageLoadTimeoutMs: 300 }) };
  }

  it('creates a page, navigates, and evaluates', async () => {
    const { handle } = await makeHandle();
    const page = await handle.newPage('http://example.test/app');
    expect(page.targetId).toBe('target-1');
    expect(page.sessionId).toMatch(/^session-/);
    const value = await page.evaluate('1+1');
    expect(value).toBe('eval-ok');
    await page.close();
    await handle.close();
  });

  it('navigates and resolves on loadEventFired', async () => {
    const { handle } = await makeHandle();
    const page = await handle.newPage('about:blank');
    await page.navigate('http://example.test/second');
    await handle.close();
  });

  it('rejects navigate with page-load-timeout when load never fires', async () => {
    const { handle } = await makeHandle({ stuckNavigations: true });
    const page = await handle.newPage('about:blank');
    await expect(page.navigate('http://example.test/stuck')).rejects.toMatchObject({ code: 'page-load-timeout' });
    await handle.close();
  }, 5_000);

  it('captures screenshots and sets viewport', async () => {
    const { handle } = await makeHandle();
    const page = await handle.newPage('about:blank');
    const png = await page.screenshot();
    expect(png.toString()).toBe('png-bytes');
    await page.setViewport(390, 844);
    await handle.close();
  });

  it('carries url detail on page-load-timeout', async () => {
    const { handle } = await makeHandle({ stuckNavigations: true });
    const page = await handle.newPage('about:blank');
    try {
      await page.navigate('http://example.test/stuck2');
      throw new Error('should not reach');
    } catch (err) {
      expect((err as FluxTestError).details).toMatchObject({ url: 'http://example.test/stuck2' });
    }
    await handle.close();
  }, 5_000);
});
