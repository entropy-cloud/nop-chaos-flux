import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
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
    res.writeHead(404);
    res.end();
  });

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
      await gateway.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
