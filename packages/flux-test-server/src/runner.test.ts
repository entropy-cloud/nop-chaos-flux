import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { BrowserHandle, PageHandle } from './launcher.js';
import { runSpecs } from './runner.js';
import { TestGateway } from './gateway.js';

const tempDirs: string[] = [];
function writeTempSpec(name: string, code: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'flux-runner-'));
  tempDirs.push(dir);
  const file = path.join(dir, name);
  writeFileSync(file, code);
  return file;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

interface FakePageScript {
  resolveWith: unknown;
  delayMs: number;
}

function fakeBrowser(script: FakePageScript): BrowserHandle {
  const pages: PageHandle[] = [];
  const evaluateCalls: string[] = [];
  const handle: BrowserHandle = {
    wsEndpoint: 'ws://mock',
    client: {} as BrowserHandle['client'],
    newPage: async () => {
      const page: PageHandle = {
        targetId: `t-${pages.length + 1}`,
        sessionId: 's-1',
        evaluate: async <T,>(expression: string): Promise<T> => {
          evaluateCalls.push(expression);
          if (script.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, script.delayMs));
          if (script.resolveWith instanceof Error) throw script.resolveWith;
          return script.resolveWith as T;
        },
        navigate: async () => {},
        screenshot: async () => Buffer.from(''),
        setViewport: async () => {},
        mouseDown: async () => {},
        mouseUp: async () => {},
        mouseWheel: async () => {},
        keyPress: async () => {},
        mouseMove: async () => {},
        mouseClick: async () => {},
        close: async () => {},
      };
      pages.push(page);
      return page;
    },
    close: async () => {},
  };
  void pages;
  void evaluateCalls;
  return handle;
}

describe('runSpecs', () => {
  it('marks passing specs and aggregates exit code 0', async () => {
    const spec = writeTempSpec('ok.flux-spec.ts', 'export default async () => {}');
    const summary = await runSpecs({
      specPaths: [spec],
      baseUrl: 'http://127.0.0.1:59998',
      overrides: { browser: fakeBrowser({ resolveWith: 'done', delayMs: 0 }), skipHttpReady: true },
    });
    expect(summary.exitCode).toBe(0);
    expect(summary.results[0]).toMatchObject({ spec: 'ok.flux-spec.ts', status: 'passed' });
  });

  it('marks failing specs with error message and exit code 1', async () => {
    const spec = writeTempSpec('bad.flux-spec.ts', 'export default async () => { throw new Error("boom"); }');
    const summary = await runSpecs({
      specPaths: [spec],
      baseUrl: 'http://127.0.0.1:59998',
      overrides: { browser: fakeBrowser({ resolveWith: new Error('boom'), delayMs: 0 }), skipHttpReady: true },
    });
    expect(summary.exitCode).toBe(1);
    expect(summary.results[0]).toMatchObject({ status: 'failed' });
    expect(summary.results[0]?.error?.message).toContain('boom');
  });

  it('marks specs exceeding timeout as timeout', async () => {
    const spec = writeTempSpec('slow.flux-spec.ts', 'export default async () => {}');
    const summary = await runSpecs({
      specPaths: [spec],
      baseUrl: 'http://127.0.0.1:59998',
      timeoutMs: 60,
      overrides: { browser: fakeBrowser({ resolveWith: 'late', delayMs: 300 }), skipHttpReady: true },
    });
    expect(summary.results[0]).toMatchObject({ status: 'timeout' });
    expect(summary.exitCode).toBe(1);
  });

  it('treats expected-failure specs as non-blocking and passed specs under that flag as failures', async () => {
    const okSpec = writeTempSpec('unexpectedly-ok.flux-spec.ts', 'export default async () => {}');
    const summary = await runSpecs({
      specPaths: [okSpec],
      baseUrl: 'http://127.0.0.1:59998',
      expectedFailures: ['unexpectedly-ok'],
      overrides: { browser: fakeBrowser({ resolveWith: 'done', delayMs: 0 }), skipHttpReady: true },
    });
    expect(summary.results[0]).toMatchObject({ status: 'failed' });
    expect(summary.results[0]?.error?.message).toContain('passed but was marked expected-failure');
    expect(summary.exitCode).toBe(1);
  });

  it('reports a genuinely failing spec as expected-failure without flipping exit code', async () => {
    const spec = writeTempSpec('known-bug.flux-spec.ts', 'export default async () => {}');
    const summary = await runSpecs({
      specPaths: [spec],
      baseUrl: 'http://127.0.0.1:59998',
      expectedFailures: ['known-bug'],
      overrides: { browser: fakeBrowser({ resolveWith: new Error('known bug'), delayMs: 0 }), skipHttpReady: true },
    });
    expect(summary.results[0]).toMatchObject({ status: 'expected-failure' });
    expect(summary.exitCode).toBe(0);
  });

  it('writes a JSON report when reportPath is given', async () => {
    const spec = writeTempSpec('reported.flux-spec.ts', 'export default async () => {}');
    const reportPath = path.join(tempDirs[tempDirs.length - 1]!, 'report.json');
    await runSpecs({
      specPaths: [spec],
      baseUrl: 'http://127.0.0.1:59998',
      reportPath,
      overrides: { browser: fakeBrowser({ resolveWith: 'ok', delayMs: 0 }), skipHttpReady: true },
    });
    const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { total: number; results: Array<{ status: string }> };
    expect(report.total).toBe(1);
    expect(report.results[0]?.status).toBe('passed');
  });

  it('runs each spec in a fresh tab', async () => {
    const specA = writeTempSpec('a.flux-spec.ts', 'export default async () => {}');
    const specB = writeTempSpec('b.flux-spec.ts', 'export default async () => {}');
    const created: string[] = [];
    const browser = fakeBrowser({ resolveWith: 'ok', delayMs: 0 });
    const originalNewPage = browser.newPage;
    browser.newPage = async (url) => {
      const page = await originalNewPage(url);
      created.push(page.targetId);
      return page;
    };
    const summary = await runSpecs({
      specPaths: [specA, specB],
      baseUrl: 'http://127.0.0.1:59998',
      overrides: { browser, skipHttpReady: true },
    });
    expect(summary.exitCode).toBe(0);
    expect(created).toEqual(['t-1', 't-2']);
  });

  it('does not launch a real gateway in override mode', async () => {
    const spec = writeTempSpec('g.flux-spec.ts', 'export default async () => {}');
    const gateway = new TestGateway();
    const summary = await runSpecs({
      specPaths: [spec],
      baseUrl: 'http://127.0.0.1:59998',
      overrides: { browser: fakeBrowser({ resolveWith: 'ok', delayMs: 0 }), gateway, skipHttpReady: true },
    });
    expect(summary.exitCode).toBe(0);
    await gateway.close();
  });
});
