import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CdpClient } from './cdp-client.js';
import { FluxTestError } from './errors.js';

export interface LauncherOptions {
  executablePath?: string;
  headless?: boolean;
  additionalArgs?: string[];
  connectTimeoutMs?: number;
  pageLoadTimeoutMs?: number;
}

export interface PageHandle {
  targetId: string;
  /** Raw CDP session id for this page's tab. */
  sessionId: string;
  evaluate<T = unknown>(expression: string, timeoutMs?: number): Promise<T>;
  navigate(url: string): Promise<void>;
  screenshot(): Promise<Buffer>;
  setViewport(width: number, height: number): Promise<void>;
  /** Real OS-level input (trust events): CDP Input domain. */
  mouseMove(x: number, y: number): Promise<void>;
  mouseClick(x: number, y: number): Promise<void>;
  mouseDown(x: number, y: number): Promise<void>;
  mouseUp(x: number, y: number): Promise<void>;
  mouseWheel(x: number, y: number, deltaX: number, deltaY: number): Promise<void>;
  /** Single key press: down + (printable) char insertion + up, CDP Input.dispatchKeyEvent. */
  keyPress(key: string, modifiers?: number): Promise<void>;
  close(): Promise<void>;
}

export interface BrowserHandle {
  wsEndpoint: string;
  client: CdpClient;
  newPage(url: string, viewport?: { width: number; height: number }): Promise<PageHandle>;
  close(): Promise<void>;
}

const CANDIDATE_PATHS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
];

export function discoverBrowserExecutable(explicit?: string): string {
  const candidates = explicit
    ? [explicit]
    : [
        ...(process.env.CHROME_PATH ? [process.env.CHROME_PATH] : []),
        ...CANDIDATE_PATHS,
      ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new FluxTestError('browser-not-found', 'no Chrome/Chromium executable found', {
    hint: 'set CHROME_PATH or pass --browser <path>',
    candidates,
  });
}

function httpReachable(url: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      res.resume();
      if ((res.statusCode ?? 500) < 500) {
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`HTTP ${url} timed out`));
    });
  });
}

export function createBrowserHandle(client: CdpClient, wsEndpoint: string, kill?: () => Promise<void>, options: LauncherOptions = {}): BrowserHandle {
  return buildHandle(client, wsEndpoint, kill, options);
}

export async function launchBrowser(options: LauncherOptions = {}): Promise<BrowserHandle> {
  const executablePath = discoverBrowserExecutable(options.executablePath);
  const args = [
    options.headless === false ? '' : '--headless=new',
    '--remote-debugging-port=0',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--user-data-dir=' + mkdtempSync(path.join(tmpdir(), 'flux-test-profile-')),
    ...(options.additionalArgs ?? []),
  ].filter(Boolean);

  let child: ChildProcess;
  try {
    child = spawn(executablePath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (err) {
    throw new FluxTestError('cdp-launch-failed', String(err), { executablePath });
  }

  const wsEndpoint = await new Promise<string>((resolve, reject) => {
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new FluxTestError('cdp-launch-failed', 'browser did not print DevTools ws endpoint in 10s', { executablePath, stderr: stderr.slice(-500) }));
    }, 10_000);
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(stderr);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]!);
      }
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new FluxTestError('cdp-launch-failed', `browser exited with code ${code}`, { executablePath, stderr: stderr.slice(-500) }));
    });
  });

  const client = await CdpClient.connect(wsEndpoint, options.connectTimeoutMs ?? 5_000);
  return buildHandle(client, wsEndpoint, () => killChild(child), options);
}

function killChild(child: ChildProcess): Promise<void> {
  child.kill('SIGTERM');
  return new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 2_000);
    child.on('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function buildHandle(client: CdpClient, wsEndpoint: string, kill: (() => Promise<void>) | undefined, options: LauncherOptions): BrowserHandle {
  let closed = false;

  const handle: BrowserHandle = {
    wsEndpoint,
    client,
    async newPage(url, viewport) {
      const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
      const sessionId = String((await client.send('Target.attachToTarget', { targetId, flatten: true })).sessionId);

      const sessionSend = (method: string, params: Record<string, unknown> = {}, timeoutMs?: number) =>
        client.send(method, params, sessionId, timeoutMs);

      const evaluate = async <T>(expression: string, timeoutMs?: number): Promise<T> => {
        const result = await sessionSend('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, timeoutMs);
        if (result.exceptionDetails) {
          const details = result.exceptionDetails as { exception?: { description?: string; value?: string }; text?: string };
          const message = details.exception?.description ?? details.exception?.value ?? details.text ?? 'unknown evaluate error';
          throw new FluxTestError('cdp-request-failed', `page evaluate threw: ${message}`, { exceptionDetails: result.exceptionDetails });
        }
        return (result.result as { value?: T } | undefined)?.value as T;
      };

      const navigate = async (target: string) => {
        const loaded = new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => {
            off();
            reject(new FluxTestError('page-load-timeout', `page load timed out after ${options.pageLoadTimeoutMs ?? 30_000}ms`, { url: target }));
          }, options.pageLoadTimeoutMs ?? 30_000);
          const off = client.on('Page.loadEventFired', (event) => {
            if (event.sessionId !== sessionId) return;
            clearTimeout(timer);
            off();
            resolve();
          });
        });
        await sessionSend('Page.enable');
        await sessionSend('Page.navigate', { url: target });
        await loaded;
      };

      const page: PageHandle = {
        targetId: String(targetId),
        sessionId: sessionId as string,
        evaluate,
        navigate,
        screenshot: async () => {
          const { data } = await sessionSend('Page.captureScreenshot', { format: 'png' });
          return Buffer.from(String(data), 'base64');
        },
        setViewport: async (width, height) => {
          await sessionSend('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
        },
        mouseMove: async (x, y) => {
          await sessionSend('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        },
        mouseClick: async (x, y) => {
          await sessionSend('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
          await sessionSend('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        },
        mouseDown: async (x, y) => {
          await sessionSend('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        },
        mouseUp: async (x, y) => {
          await sessionSend('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        },
        mouseWheel: async (x, y, deltaX, deltaY) => {
          await sessionSend('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY });
        },
        keyPress: async (key, modifiers = 0) => {
          const descriptor = resolveKeyDescriptor(key);
          await sessionSend('Input.dispatchKeyEvent', { type: 'keyDown', modifiers, ...descriptor });
          if (descriptor.text !== undefined) {
            await sessionSend('Input.dispatchKeyEvent', { type: 'char', modifiers, ...descriptor });
          }
          await sessionSend('Input.dispatchKeyEvent', { type: 'keyUp', modifiers, ...descriptor });
        },
        close: async () => {
          await sessionSend('Target.closeTarget', { targetId });
        },
      };

      if (viewport) {
        await page.setViewport(viewport.width, viewport.height);
      }
      if (url !== 'about:blank') {
        await navigate(url);
      }
      return page;
    },
    close: async () => {
      if (closed) return;
      closed = true;
      client.close();
      await (kill ?? (() => Promise.resolve()))();
    },
  };
  return handle;
}

export async function waitForHttpReady(url: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      await httpReachable(url, 2_000);
      return;
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new FluxTestError('page-load-timeout', `base URL never became reachable`, { url, lastError: String(lastError) });
}

const SPECIAL_KEYS: Record<string, { code: string; vk: number }> = {
  Enter: { code: 'Enter', vk: 13 },
  Tab: { code: 'Tab', vk: 9 },
  Escape: { code: 'Escape', vk: 27 },
  Backspace: { code: 'Backspace', vk: 8 },
  Delete: { code: 'Delete', vk: 46 },
  ArrowUp: { code: 'ArrowUp', vk: 38 },
  ArrowDown: { code: 'ArrowDown', vk: 40 },
  ArrowLeft: { code: 'ArrowLeft', vk: 37 },
  ArrowRight: { code: 'ArrowRight', vk: 39 },
  Home: { code: 'Home', vk: 36 },
  End: { code: 'End', vk: 35 },
  PageUp: { code: 'PageUp', vk: 33 },
  PageDown: { code: 'PageDown', vk: 34 },
  Space: { code: 'Space', vk: 32 },
  Control: { code: 'ControlLeft', vk: 17 },
  Alt: { code: 'AltLeft', vk: 18 },
  Shift: { code: 'ShiftLeft', vk: 16 },
  Meta: { code: 'MetaLeft', vk: 91 },
};

/** CDP Input.dispatchKeyEvent params for a logical key name (single character or special key). */
export function resolveKeyDescriptor(key: string): { key: string; code: string; windowsVirtualKeyCode: number; text?: string } {
  const special = SPECIAL_KEYS[key];
  if (special) {
    return { key, code: special.code, windowsVirtualKeyCode: special.vk, ...(key === 'Space' ? { text: ' ' } : {}) };
  }
  if (key.length === 1) {
    const upper = key.toUpperCase();
    const vk = upper.charCodeAt(0);
    const isLetterOrDigit = /[a-zA-Z0-9]/.test(key);
    return { key, code: isLetterOrDigit ? `Key${upper}` : '', windowsVirtualKeyCode: vk, text: key };
  }
  return { key, code: '', windowsVirtualKeyCode: 0 };
}
