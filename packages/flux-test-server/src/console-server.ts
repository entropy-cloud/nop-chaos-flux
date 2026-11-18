import { createServer } from 'node:http';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TestGateway } from './gateway.js';
import { collectSpecFiles } from './spec-discovery.js';
import { runSpecs } from './runner.js';

export interface ConsoleServerOptions {
  specsDir: string;
  baseUrl: string;
  timeoutMs: number;
  driverEntryPath?: string;
  reportPath?: string;
  /** Test hook: replace the real runner (which needs a browser). */
  runOverride?: (specFullPath: string) => Promise<unknown>;
  /** Test hook: replace gateway wiring (unit tests). */
  gatewayOverride?: TestGateway;
}

export interface ConsoleHandle {
  port: number;
  close(): Promise<void>;
}

const WATCH_DEBOUNCE_MS = 500;
const WATCH_POLL_INTERVAL_MS = 300;

const CONSOLE_HTML_SHELL = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Flux Test Console</title><style>
  body { font-family: ui-sans-serif, system-ui; margin: 0; background: #0b0c0e; color: #e7e9ea; }
  #root { display: flex; height: 100vh; }
</style></head>
<body><div id="root"></div><script src="/__flux_test__/console-bundle.js"></script></body>
</html>`;

/**
 * Console v1 host: HTTP server for the Console page + spec/run API, sharing
 * the WebSocket upgrade path with the gateway. Runs live in the CLI process.
 */
export async function startConsoleServer(options: ConsoleServerOptions): Promise<ConsoleHandle> {
  const gateway = options.gatewayOverride ?? new TestGateway();
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/__flux_test__' || url.pathname === '/__flux_test__/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(CONSOLE_HTML_SHELL);
      return;
    }
    if (url.pathname === '/__flux_test__/console-bundle.js') {
      const bundlePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'console-bundle.js');
      try {
        const js = readFileSync(bundlePath, 'utf8');
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
        res.end(js);
      } catch {
        res.writeHead(500);
        res.end('console bundle missing — run `pnpm --filter @nop-chaos/flux-test-server build:console` first');
      }
      return;
    }
    if (url.pathname === '/__flux_test__/api/specs' && req.method === 'GET') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ specs: collectSpecFiles({ dir: options.specsDir }).map((full) => path.basename(full)) }));
      return;
    }
    if (url.pathname === '/__flux_test__/api/run' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const { spec } = JSON.parse(body || '{}') as { spec?: string };
        const full = path.resolve(options.specsDir, spec ?? '');
        if (!spec || !full.startsWith(path.resolve(options.specsDir))) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'bad-spec' }));
          return;
        }
        if (running) {
          res.writeHead(409, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: 'run-in-progress' }));
          return;
        }
        res.writeHead(202, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ started: true }));
        void startRun(full);
      });
      return;
    }
    if (url.pathname === '/__flux_test__/api/watch' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        const { on } = JSON.parse(body || '{}') as { on?: boolean };
        if (on === true && !watcher) startWatch();
        else if (on === false && watcher) {
          stopWatch();
          gateway.notifyConsole('console.watch.state', { on: false });
        }
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ watching: watcher !== null }));
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  let watcher: ReturnType<typeof setInterval> | null = null;
  let watchDebounce: ReturnType<typeof setTimeout> | null = null;
  let lastMtimeMs = 0;
  const stopWatch = (): void => {
    if (watchDebounce) clearTimeout(watchDebounce);
    watchDebounce = null;
    if (watcher) clearInterval(watcher);
    watcher = null;
  };
  const scanSpecMtimes = (): { file: string; mtimeMs: number } | null => {
    let latest: { file: string; mtimeMs: number } | null = null;
    for (const entry of readdirSync(options.specsDir)) {
      if (!entry.endsWith('.flux-spec.ts')) continue;
      try {
        const mtimeMs = statSync(path.join(options.specsDir, entry)).mtimeMs;
        if (!latest || mtimeMs > latest.mtimeMs) latest = { file: entry, mtimeMs };
      } catch {
        // file deleted mid-scan — ignore until next tick
      }
    }
    return latest && latest.mtimeMs > lastMtimeMs ? latest : null;
  };
  const startWatch = (): void => {
    if (watcher) return;
    lastMtimeMs = 0;
    scanSpecMtimes();
    watcher = setInterval(() => {
      try {
        const changed = scanSpecMtimes();
        if (!changed) return;
        // debounce: editors fire multiple saves; coalesce to the last change.
        // Advance the watermark on every observed change so the reschedule
        // window settles instead of re-arming forever.
        lastMtimeMs = changed.mtimeMs;
        if (watchDebounce) clearTimeout(watchDebounce);
        watchDebounce = setTimeout(() => {
          watchDebounce = null;
          if (running) return;
          void startRun(path.resolve(options.specsDir, changed.file));
        }, WATCH_DEBOUNCE_MS);
      } catch {
        // scan errors must never take the console down
      }
    }, WATCH_POLL_INTERVAL_MS);
    gateway.notifyConsole('console.watch.state', { on: true });
  };

  gateway.on('log.emit', (arg) => {
    // fan the kernel event stream out to the console peer verbatim
    gateway.notifyConsole('console.log', { targetId: arg.targetId, payload: arg.payload });
  });

  const port = await new Promise<number>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      resolve((server.address() as { port: number }).port);
    });
    server.on('error', reject);
  });
  gateway.attachToServer(server as never);
  const gatewayPort = port;

  const runOne = options.runOverride ?? ((specFullPath: string) => runSpecs({
    specPaths: [specFullPath],
    baseUrl: options.baseUrl,
    timeoutMs: options.timeoutMs,
    driverEntryPath: options.driverEntryPath,
    reportPath: options.reportPath,
    overrides: { gateway, gatewayPort },
  }));
  let running = false;
  const startRun = (specFullPath: string): Promise<void> => {
    running = true;
    gateway.notifyConsole('console.run.started', { spec: path.basename(specFullPath) });
    return runOne(specFullPath)
      .then((summary: unknown) => {
        const typed = summary as { results?: unknown; exitCode?: number };
        gateway.notifyConsole('console.run.finished', { spec: path.basename(specFullPath), summary: { results: typed.results ?? [], exitCode: typed.exitCode ?? 0 } });
      })
      .finally(() => {
        running = false;
      });
  };

  return {
    port,
    close: async () => {
      stopWatch();
      await gateway.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
