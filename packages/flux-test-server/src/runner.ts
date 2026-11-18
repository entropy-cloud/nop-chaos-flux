import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { TestGateway } from './gateway.js';
import { launchBrowser, waitForHttpReady, type BrowserHandle, type LauncherOptions, type PageHandle } from './launcher.js';
import { bundleSpec, bundleStandalone, specEvaluateExpression } from './spec-loader.js';

export interface SpecResult {
  spec: string;
  status: 'passed' | 'failed' | 'timeout' | 'expected-failure';
  durationMs: number;
  error?: { message: string; stack?: string };
  assertions?: { passed: number; failed: number };
}

export interface RunnerOptions {
  specPaths: string[];
  baseUrl: string;
  viewport?: { width: number; height: number };
  timeoutMs?: number;
  workers?: number;
  launcher?: LauncherOptions;
  /** Basename (no ext) of specs expected to fail; they report 'expected-failure' and don't flip exit code. */
  expectedFailures?: string[];
  reportPath?: string;
  onResult?: (result: SpecResult) => void;
  /** In-page driver entry (flux-test-driver index.ts); bundled and injected before each spec. */
  driverEntryPath?: string;
  /** Test hooks: inject browser/gateway instead of launching real ones; skips base-URL canary. */
  overrides?: { browser?: BrowserHandle; gateway?: TestGateway; gatewayPort?: number; skipHttpReady?: boolean };
}

/** Real-input relay target: the page of the currently running spec. */
let activePage: PageHandle | null = null;

export interface RunSummary {
  results: SpecResult[];
  passed: number;
  failed: number;
  exitCode: number;
}

export async function runSpecs(options: RunnerOptions): Promise<RunSummary> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const results: SpecResult[] = [];
  const expected = new Set(options.expectedFailures ?? []);

  if (!options.overrides?.skipHttpReady) {
    await waitForHttpReady(new URL('__healthcanary__', options.baseUrl).toString().replace('__healthcanary__/', ''));
  }

  const gateway = options.overrides?.gateway ?? new TestGateway();
  const gatewayPort = options.overrides?.gatewayPort ?? (options.overrides?.gateway ? 0 : await gateway.listen());
  const browser: BrowserHandle = options.overrides?.browser ?? await launchBrowser(options.launcher);
  let lastMouse: { x: number; y: number } | null = null;
  gateway.onRequest(async (method, params) => {
    if (!activePage) throw new Error('input channel: no active page');
    if (method === 'input.move' || method === 'input.hover' || method === 'input.click') {
      const x = Number(params.x);
      const y = Number(params.y);
      lastMouse = { x, y };
      if (method === 'input.click') {
        await activePage.mouseClick(x, y);
      } else {
        await activePage.mouseMove(x, y);
      }
      return { ok: true };
    }
    if (method === 'input.mousedown' || method === 'input.mouseup') {
      const x = Number(params.x ?? lastMouse?.x ?? 0);
      const y = Number(params.y ?? lastMouse?.y ?? 0);
      if (method === 'input.mousedown') await activePage.mouseDown(x, y);
      else await activePage.mouseUp(x, y);
      return { ok: true };
    }
    if (method === 'input.wheel') {
      await activePage.mouseWheel(Number(params.x ?? 0), Number(params.y ?? 0), Number(params.deltaX ?? 0), Number(params.deltaY ?? 0));
      return { ok: true };
    }
    if (method === 'input.key') {
      await activePage.keyPress(String(params.key ?? ''), Number(params.modifiers ?? 0));
      return { ok: true };
    }
    if (method === 'emulation.viewport') {
      await activePage.setViewport(Number(params.width), Number(params.height));
      return { ok: true };
    }
    throw new Error(`input channel: unknown method ${method}`);
  });
  const driverCode = options.driverEntryPath ? (await bundleStandalone(options.driverEntryPath, 'flux_test_driver')).code : undefined;

  try {
    for (const specPath of options.specPaths) {
      const started = Date.now();
      const name = path.basename(specPath);
      const expectFail = expected.has(name.replace(/\.flux-spec\.ts$/, '')) || expected.has(name);
      let result: SpecResult;
      try {
        await runSingleSpec({ specPath, baseUrl: options.baseUrl, browser, gatewayPort, timeoutMs, viewport: options.viewport, driverCode });
        result = { spec: name, status: expectFail ? 'failed' : 'passed', durationMs: Date.now() - started };
        if (expectFail) {
          result.error = { message: 'spec passed but was marked expected-failure' };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isTimeout = message.includes('spec-timeout');
        result = {
          spec: name,
          status: isTimeout ? 'timeout' : expectFail ? 'expected-failure' : 'failed',
          durationMs: Date.now() - started,
          error: { message, stack: err instanceof Error ? err.stack : undefined },
        };
      }
      results.push(result);
      options.onResult?.(result);
    }
  } finally {
    await browser.close();
    if (!options.overrides?.gateway) {
      await gateway.close();
    }
  }

  const failed = results.filter((r) => r.status === 'failed' || r.status === 'timeout').length;
  if (options.reportPath) {
    mkdirSync(path.dirname(options.reportPath), { recursive: true });
    writeFileSync(options.reportPath, JSON.stringify({ results, failed, total: results.length }, null, 2));
  }
  return { results, passed: results.length - failed, failed, exitCode: failed > 0 ? 1 : 0 };
}

interface SingleSpecOptions {
  specPath: string;
  baseUrl: string;
  browser: BrowserHandle;
  gatewayPort: number;
  timeoutMs: number;
  viewport?: { width: number; height: number };
  driverCode?: string;
}

async function runSingleSpec(options: SingleSpecOptions): Promise<void> {
  const { browser, gatewayPort, timeoutMs, baseUrl } = options;
  const page = await browser.newPage(baseUrl, options.viewport);
  activePage = page;

  try {
    await page.evaluate(`window.__FLUX_TEST_GATEWAY_PORT__ = ${gatewayPort}; window.__FLUX_TEST_TARGET_ID__ = ${JSON.stringify(page.targetId)}; true`);
    if (options.driverCode) {
      await page.evaluate(`(async function () {\n${options.driverCode}\n;await flux_test_driver.installFt({ gateway: true, waitForKernelMs: 15_000 });\n})()`, 30_000);
    }
    const bundled = await bundleSpec(options.specPath);
    const specPromise: Promise<unknown> = page.evaluate(specEvaluateExpression(bundled), timeoutMs + 5_000);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`spec-timeout: exceeded ${timeoutMs}ms`)), timeoutMs),
    );
    await Promise.race([specPromise, timeout]);
  } finally {
    await page.close();
  }
}
