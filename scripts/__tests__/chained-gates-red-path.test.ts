import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// Red-path probes for the five mandatory-chain gates that (unlike the
// console/knip/deps baselines) have no scan-root or baseline override CLI:
// the violation must be staged in the real tree and removed in `afterAll`.
// This deliberately deviates from the temp-scan-root fixture governance
// (find-event-dispatch-without-ctx) because these gates hardcode their scan
// targets; staging uses a unique __p767 marker and absolute cleanup.
// fileParallelism:false (vitest.scripts.config.ts) keeps the staging safe.
//
// Plan 863 T4: the tracked files rewritten below are protected by a pre-flight
// dirty check (the test aborts instead of clobbering uncommitted work, e.g.
// from a parallel session), and restoration is additionally registered on
// process exit / SIGINT / SIGTERM so an interrupted run does not leave the
// workspace dirty.
//
// MANUAL RECOVERY after an interruption that bypassed all hooks (kill -9):
//   git checkout -- packages/flux-renderers-basic/src/index.tsx \
//     packages/flux-renderers-industrial/src/serialization/config-types.ts \
//     packages/flux-core/src/commit-state.ts docs/testing/coverage-thresholds.md
//   rm -f packages/flux-core/src/__p767_react19_red_path.mjs \
//     packages/flux-core/src/__p767_i18n_red_path.ts \
//     packages/flux-core/src/__p767_red_path.js
// Then confirm `git status` is clean before committing anything.

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');

function run(script: string) {
  return execFileAsync(process.execPath, [resolve(rootDir, 'scripts', script)], {
    cwd: rootDir,
  });
}

// Tracked files this suite rewrites (staged[] restorations). Uncommitted
// changes in any of these abort the suite before the first write.
const TRACKED_TARGETS = [
  'packages/flux-renderers-basic/src/index.tsx',
  'packages/flux-renderers-industrial/src/serialization/config-types.ts',
  'packages/flux-core/src/commit-state.ts',
  'docs/testing/coverage-thresholds.md',
];

// Untracked probe files this suite creates.
const STAGED_NEW_FILES = [
  'packages/flux-core/src/__p767_react19_red_path.mjs',
  'packages/flux-core/src/__p767_i18n_red_path.ts',
  'packages/flux-core/src/__p767_red_path.js',
];

const staged: Array<{ path: string; original: string | null }> = [];

async function stageFile(path: string, content: string) {
  const abs = join(rootDir, path);
  let original: string | null = null;
  try {
    original = await readFile(abs, 'utf8');
  } catch {
    original = null;
  }
  await writeFile(abs, content);
  staged.push({ path: abs, original });
}

async function stageAppend(path: string, append: string) {
  const abs = join(rootDir, path);
  const original = await readFile(abs, 'utf8');
  await writeFile(abs, original + append);
  staged.push({ path: abs, original });
}

function restoreAllSync() {
  for (const { path, original } of staged.reverse()) {
    try {
      if (original === null) {
        rmSync(path, { force: true });
      } else {
        writeFileSync(path, original);
      }
    } catch {
      // best-effort: the manual recovery commands in the header cover the rest
    }
  }
}

let hooksRegistered = false;

function registerInterruptionHooks() {
  if (hooksRegistered) return;
  hooksRegistered = true;
  process.once('exit', () => {
    restoreAllSync();
  });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      restoreAllSync();
      process.exit(1);
    });
  }
}

async function ensureCleanTargets() {
  for (const path of TRACKED_TARGETS) {
    const { stdout } = await execFileAsync('git', ['status', '--porcelain', '--', path], {
      cwd: rootDir,
    });
    if (stdout.trim()) {
      throw new Error(
        `Refusing to run: ${path} has uncommitted changes and this suite rewrites it. ` +
          'Commit or stash first (protects parallel sessions and your work).',
      );
    }
  }
  for (const path of STAGED_NEW_FILES) {
    const abs = join(rootDir, path);
    const exists = await stat(abs).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return false;
        throw error;
      },
    );
    if (exists) {
      throw new Error(
        `Refusing to run: leftover probe file ${path} from a previous interrupted run. ` +
          'Remove it (see the manual recovery commands in the file header) before rerunning.',
      );
    }
  }
}

beforeAll(async () => {
  await ensureCleanTargets();
  registerInterruptionHooks();
});

afterAll(async () => {
  for (const { path, original } of staged.reverse()) {
    if (original === null) {
      await rm(path, { force: true });
    } else {
      await writeFile(path, original);
    }
  }
});

describe('mandatory-chain gates red paths (plan 767 Phase 4)', () => {
  it('check:react19 fails on a staged legacy react-dom render import', async () => {
    await stageFile(
      'packages/flux-core/src/__p767_react19_red_path.mjs',
      "import { render } from 'react-dom';\nexport const p767 = () => render(null);\n",
    );
    await expect(run('check-react19-legacy-apis.mjs')).rejects.toMatchObject({
      stderr: expect.stringContaining('render'),
    });
  }, 120_000);

  it('check:i18n-keys fails on a staged undefined flux.* key usage', async () => {
    await stageFile(
      'packages/flux-core/src/__p767_i18n_red_path.ts',
      "export const p767 = (t: (k: string) => string) => t('flux.__p767_missing_key__');\n",
    );
    await expect(run('check-i18n-keys.mjs')).rejects.toMatchObject({
      stdout: expect.stringContaining('flux.__p767_missing_key__'),
    });
  }, 120_000);

  it('check:src-artifacts fails on a staged .js file under packages/*/src', async () => {
    await stageFile('packages/flux-core/src/__p767_red_path.js', 'export {};\n');
    await expect(run('verify-no-src-artifacts.mjs')).rejects.toMatchObject({
      stderr: expect.stringContaining('__p767_red_path.js'),
    });
  }, 120_000);

  it('check:schema-prop-coverage fails on a staged renderer field with no test usage', async () => {
    await stageAppend(
      'packages/flux-renderers-basic/src/index.tsx',
      "\n// __p767 probe (removed by the test's afterAll)\nexport const __p767ProbeDefinition = {\n  type: '__p767-probe',\n  sourcePackage: '@nop-chaos/flux-renderers-basic',\n  component: () => null,\n  fields: [{ key: '__p767UndeclaredProbe', kind: 'prop' }],\n} as never;\n",
    );
    await expect(run('check-schema-prop-coverage.mjs')).rejects.toMatchObject({
      stdout: expect.stringContaining('__p767UndeclaredProbe'),
    });
  }, 120_000);

  it('check:scada-symbol-keys fails when ScadaSymbolNode gains a field absent from SYMBOL_KEYS', async () => {
    const path = 'packages/flux-renderers-industrial/src/serialization/config-types.ts';
    const abs = join(rootDir, path);
    const original = await readFile(abs, 'utf8');
    staged.push({ path: abs, original });
    const anchor = 'export interface ScadaSymbolNode {';
    const idx = original.indexOf(anchor);
    expect(idx).toBeGreaterThan(0);
    const injected =
      original.slice(0, idx + anchor.length) +
      '\n  __p767UnknownField?: string;\n' +
      original.slice(idx + anchor.length);
    await writeFile(abs, injected);
    await expect(run('check-scada-symbol-keys.mjs')).rejects.toMatchObject({
      stderr: expect.stringContaining('__p767UnknownField'),
    });
  });

  // Both gates enumerate `git ls-files` (tracked files only) and the sandbox
  // denies index writes, so the red path appends violations to tracked files
  // and restores the original content in afterAll (staged[] reverse-order).
  it('check:oversized-code-files fails when a tracked source file crosses 700 lines', async () => {
    const path = 'packages/flux-core/src/commit-state.ts';
    await stageAppend(path, Array.from({ length: 701 }, (_, i) => `// __p767 padding ${i}\n`).join(''));
    await expect(run('check-oversized-code-files.mjs')).rejects.toMatchObject({
      stderr: expect.stringContaining('packages/flux-core/src/commit-state.ts:'),
    });
  }, 120_000);

  it('check:docs-garbled fails on a tracked doc gaining garbled replacement characters', async () => {
    const path = 'docs/testing/coverage-thresholds.md';
    // mojibake marker (UTF-8 CJK decoded as Latin-1) — high-confidence class
    await stageAppend(path, '\n乱码探测行：æµ‹è¯•ä¸æ–‡ mojibake probe\n');
    // The gate's stdout only prints aggregate counts; the per-file candidates
    // land in tmp/docs-garbled-check/candidates.json — assert both.
    const result = await run('check-docs-garbled.mjs').catch((error) => error);
    expect(result.stdout).toContain('Likely garbled');
    const candidates = await readFile(
      join(rootDir, 'tmp', 'docs-garbled-check', 'candidates.json'),
      'utf8',
    );
    expect(candidates).toContain('coverage-thresholds.md');
  }, 180_000);
});
