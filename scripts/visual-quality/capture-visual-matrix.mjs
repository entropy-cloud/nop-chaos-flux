#!/usr/bin/env node
// plan 491 Phase 3: visual screenshot matrix runner (R2 walkthrough evidence).
//
// Captures the theme × viewport matrix (+ registered interaction states) for
// the enumerated walkthrough routes and writes PNGs + a capture report into
// `_tmp/visual-inspection-<date>/` (gitignored, per the AGENTS.md snapshot
// policy — never into tests/e2e/artifacts/, never committed).
//
// Usage:
//   pnpm visual:capture --routes flow-designer,home
//   pnpm visual:capture --batches R2-1a            (reads inventory pages.json)
//   pnpm visual:capture --routes home --themes light,dark --viewports 1280x800,800x900
//
// Dev server lifecycle: reuses a live server on 4175; otherwise starts one
// and only kills the child it spawned.
//
// Output: `_tmp/visual-inspection-<date>/<route>-<state>-<viewport>-<theme>.png`
// and `capture-report.json` ({ captures: [...], suspects: [...] }) where
// `suspects` flags captures whose DOM fingerprint says the route fell back to
// home (parseRoute returns home for unknown hashes — a dead-route signature).

import { chromium } from '../../node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = 'http://127.0.0.1:4175';

function parseArgs(argv) {
  const args = { themes: ['light', 'dark'], viewports: ['1280x800', '800x900'] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--routes') args.routes = argv[i + 1].split(',');
    else if (arg === '--batches') args.batches = argv[i + 1].split(',');
    else if (arg === '--themes') args.themes = argv[i + 1].split(',');
    else if (arg === '--viewports') args.viewports = argv[i + 1].split(',');
    else if (arg === '--help' || arg === '-h') args.help = true;
  }
  return args;
}

function selectRoutes(args) {
  const inventory = JSON.parse(
    readFileSync(resolve(rootDir, 'docs', 'audits', 'visual-quality-r2', 'inventory', 'pages.json'), 'utf8'),
  );
  if (args.batches) {
    const selected = inventory.pages.filter((p) => args.batches.includes(p.batch));
    if (selected.length === 0) {
      throw new Error(`no inventory page matches --batches ${args.batches.join(',')} — check pnpm visual:inventory output`);
    }
    return selected;
  }
  if (args.routes) {
    const selected = inventory.pages.filter((p) => args.routes.includes(p.id));
    const missing = args.routes.filter((id) => !selected.some((p) => p.id === id));
    if (missing.length > 0) {
      throw new Error(`unknown route id(s): ${missing.join(',')} — ids come from inventory/pages.json (pnpm visual:inventory)`);
    }
    return selected;
  }
  throw new Error('specify --routes <id,...> or --batches <B,...> (see pnpm visual:inventory output)');
}

async function ensureServer(spawnedRef) {
  try {
    const res = await fetch(BASE);
    if (res.ok) {
      console.log(`[visual-capture] reusing live server at ${BASE}`);
      return;
    }
  } catch {
    // not running — start one
  }
  console.log('[visual-capture] starting playground dev server…');
  const child = spawn('pnpm', ['--filter', '@nop-chaos/flux-playground', 'dev', '--host', '127.0.0.1', '--port', '4175'], {
    cwd: rootDir,
    stdio: 'ignore',
    detached: false,
  });
  spawnedRef.child = child;
  for (let i = 0; i < 90; i += 1) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      // keep waiting
    }
  }
  throw new Error('dev server did not come up within 90s');
}

function isHomeFallback(page) {
  // parseRoute falls back to home for unknown hashes. Home renders an
  // <h1>Playground</h1>; no other page uses that exact heading text
  // (performance-table/flux-basic use longer variants). Evaluated against the
  // live DOM, not a body substring — `nop-hero` tokens are shared by the lab
  // shell and several demo pages, so substring matching misfired (plan 491
  // closure audit B1).
  return page.evaluate(() =>
    [...document.querySelectorAll('h1')].some((h) => h.textContent.trim() === 'Playground'),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('usage: pnpm visual:capture --routes <id,...> | --batches <B,...> [--themes light,dark] [--viewports 1280x800,800x900]');
    process.exit(0);
  }
  const pages = selectRoutes(args);
  const { INTERACTIONS } = await import('./interactions.mjs');

  const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const outDir = resolve(rootDir, '_tmp', `visual-inspection-${localDate}`);
  mkdirSync(outDir, { recursive: true });

  const spawnedRef = {};
  await ensureServer(spawnedRef);

  const browser = await chromium.launch();
  const captures = [];
  const suspects = [];

  try {
    for (const theme of args.themes) {
      for (const viewportSpec of args.viewports) {
        const [width, height] = viewportSpec.split('x').map(Number);
        const context = await browser.newContext({ viewport: { width, height } });
        const page = await context.newPage();
        await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });

        for (const route of pages) {
          await page.goto(`${BASE}/${route.hash}`, { waitUntil: 'commit' });
          await page.waitForTimeout(400);
          if (route.routeKind !== 'index' && route.id !== 'home' && (await isHomeFallback(page))) {
            suspects.push({ route: route.id, hash: route.hash, viewport: viewportSpec, theme, reason: 'home-fallback (dead route?)' });
            continue;
          }
          // Playground theme is data-mode-driven (apps/playground/src/theme.ts) and ignores
          // prefers-color-scheme: set the attribute explicitly per matrix theme (plan 496
          // wave1 finding R2-2a-B5-34 — emulateMedia-only captures mislabeled dark as light).
          await page.evaluate((mode) => {
            document.documentElement.setAttribute('data-mode', mode);
          }, theme);
          for (const step of INTERACTIONS[route.id] ?? []) {
            if (step.action === 'click') await page.locator(step.selector).first().click({ timeout: 5000 }).catch(() => {});
            else if (step.action === 'clickText') await page.getByRole('button', { name: step.text }).first().click({ timeout: 5000 }).catch(() => {});
            else if (step.action === 'waitFor') {
              if (step.selector) await page.locator(step.selector).first().waitFor({ state: 'visible', timeout: step.ms ?? 5000 }).catch(() => {});
              else await page.waitForTimeout(step.ms ?? 500);
            } else if (step.action === 'press') await page.keyboard.press(step.key);
            else if (step.action === 'setAttribute') {
              await page.evaluate(({ selector, attr, value }) => {
                document.documentElement.setAttribute(attr, value);
                if (selector) document.querySelector(selector)?.setAttribute(attr, value);
              }, step);
            }
          }
          const states = ['default', ...Object.keys(INTERACTIONS[route.id] ?? []).length > 0 ? ['interaction'] : []];
          for (const state of states) {
            const file = `${route.id}-${state}-${viewportSpec}-${theme}.png`;
            await page.screenshot({ path: resolve(outDir, file), fullPage: false });
            captures.push({ route: route.id, state, viewport: viewportSpec, theme, file });
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
    if (spawnedRef.child) {
      spawnedRef.child.kill('SIGTERM');
      console.log('[visual-capture] stopped the dev server this run spawned');
    }
  }

  const report = { captures, suspects, outDir };
  writeFileSync(resolve(outDir, 'capture-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`[visual-capture] ${captures.length} capture(s) → ${outDir}`);
  if (suspects.length > 0) {
    console.warn(`[visual-capture] ${suspects.length} suspect(s): ${suspects.map((s) => s.route).join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
