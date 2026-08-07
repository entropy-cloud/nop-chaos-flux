// Built-dist browser verification harness for the @nop-chaos/flux bundle.
//
// Covers the plan-2026-08-07-1023-2 (18-01) gap: neither check:flux-bundle-pack
// (static tarball checks) nor dev-server e2e (workspace src aliases active) can
// prove the BUILT dist/index.js works in a real browser. This spec:
//   1. rebuilds packages/flux-bundle/dist (the artifact under test),
//   2. builds a consumer-style page (no workspace src aliases; the
//      '@nop-chaos/flux' bare specifier resolves to the dist artifact),
//   3. serves the page statically and asserts the 6-family registration
//      surface + a real render including the editor-renderer (tiptap) path
//      with zero shim-related page/console errors.
import { expect, test, type Page } from '@playwright/test';
import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { build } from 'vite';

const execFileAsync = promisify(execFile);
const isWin = process.platform === 'win32';

const HARNESS_DIR = path.join(__dirname, 'flux-bundle-built-dist');
const REPO_ROOT = path.join(__dirname, '..', '..');
const DIST_DIR = path.join(REPO_ROOT, 'packages', 'flux-bundle', 'dist');
const FLUX_BUNDLE_NM = path.join(REPO_ROOT, 'packages', 'flux-bundle', 'node_modules');
const OUT_DIR = path.join(REPO_ROOT, 'node_modules', '.tmp', 'flux-bundle-built-dist');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

interface HarnessState {
  registered: Record<string, boolean>;
  mountError: string | null;
  rendered: boolean;
  textRendered: boolean;
  editorHtml: string | null;
}

async function runPnpm(args: string[]) {
  if (isWin) {
    return execFileAsync('cmd.exe', ['/d', '/s', '/c', `pnpm ${args.join(' ')}`], {
      cwd: REPO_ROOT,
      maxBuffer: 10 * 1024 * 1024,
    });
  }
  return execFileAsync('pnpm', args, { cwd: REPO_ROOT, maxBuffer: 10 * 1024 * 1024 });
}

async function buildFluxBundleDist() {
  await runPnpm(['--filter', '@nop-chaos/flux', 'build']);
}

async function buildHarnessPage() {
  await build({
    root: HARNESS_DIR,
    configFile: false,
    logLevel: 'error',
    resolve: {
      alias: [
        // Order matters: the style.css entry must match before the bare specifier.
        { find: '@nop-chaos/flux/style.css', replacement: path.join(DIST_DIR, 'style.css') },
        { find: '@nop-chaos/flux', replacement: path.join(DIST_DIR, 'index.js') },
        // Only the harness entry's own react imports need these; the imports
        // inside dist/index.js resolve upward from packages/flux-bundle.
        // /^react$/ keeps react/jsx-runtime untouched (dist resolves it itself).
        { find: 'react-dom/client', replacement: path.join(FLUX_BUNDLE_NM, 'react-dom', 'client.js') },
        { find: /^react$/, replacement: path.join(FLUX_BUNDLE_NM, 'react', 'index.js') },
      ],
    },
    build: {
      outDir: OUT_DIR,
      emptyOutDir: true,
      minify: false,
      sourcemap: false,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  });
}

function startStaticServer(dir: string) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/') {
        pathname = '/index.html';
      }
      const filePath = path.normalize(path.join(dir, pathname));
      if (!filePath.startsWith(dir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const content = await readFile(filePath);
      res.writeHead(200, {
        'content-type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(content);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });

  return new Promise<{ port: number; close: () => Promise<void> }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as { port: number };
      resolve({
        port: address.port,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

async function getHarnessState(page: Page): Promise<HarnessState | undefined> {
  return page.evaluate(() => (window as unknown as { __fluxHarness?: HarnessState }).__fluxHarness);
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

let baseUrl = '';
let staticServer: { port: number; close: () => Promise<void> } | undefined;

test.beforeAll(async () => {
  await buildFluxBundleDist();
  await buildHarnessPage();
  staticServer = await startStaticServer(OUT_DIR);
  baseUrl = `http://127.0.0.1:${staticServer.port}`;
}, { timeout: 300_000 });

test.afterAll(async () => {
  await staticServer?.close();
});

test('built dist registers all 6 renderer families without shim errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(`[pageerror] ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`[console.error] ${msg.text()}`);
    }
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => (window as unknown as { __fluxHarness?: HarnessState }).__fluxHarness !== undefined,
    undefined,
    { timeout: 30_000 },
  );

  const state = (await getHarnessState(page))!;
  expect(state.mountError).toBeNull();

  const expected = [
    'basic:text',
    'basic:container',
    'basic:button',
    'form:form',
    'form:input-text',
    'form:textarea',
    'form-advanced:editor',
    'data:table',
    'data:list',
    'content:card',
    'content:link',
    'layout:grid',
    'layout:wizard',
  ];
  for (const key of expected) {
    expect(state.registered[key], `renderer ${key} should be registered`).toBe(true);
  }
  expect(pageErrors).toEqual([]);
});

test('built dist renders basic + editor (tiptap) paths in browser ESM', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(`[pageerror] ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`[console.error] ${msg.text()}`);
    }
  });

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => {
      const state = (window as unknown as { __fluxHarness?: HarnessState }).__fluxHarness;
      return state !== undefined && state.rendered && state.editorHtml !== null;
    },
    undefined,
    { timeout: 30_000 },
  );

  const state = (await getHarnessState(page))!;
  expect(state.mountError).toBeNull();
  expect(state.textRendered).toBe(true);
  expect(state.editorHtml).toContain('<strong>rich</strong>');
  await expect(page.locator('.ProseMirror')).toBeVisible();
  expect(pageErrors).toEqual([]);
});
