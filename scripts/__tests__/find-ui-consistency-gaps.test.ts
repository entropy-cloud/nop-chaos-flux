import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'audit', 'find-ui-consistency-gaps.mjs');
const fixtureDir = resolve(here, 'fixtures', 'ui-consistency-gaps');

// Same staged-fixture governance as find-event-dispatch-without-ctx.test.ts
// (0150-1, DG 2026-08-09): fixtures live in a throwaway temp tree mirrored as
// `packages/<pkg>/<file>` / `apps/<app>/<file>`, never in real package dirs;
// the gate is exec'd with `FLUX_AUDIT_SCAN_ROOT=<temp root>` so it scans only
// the temp tree with repo-relative paths intact. Exempt-state fixtures stage
// under paths covered by the gate's in-script exemption baseline entries to
// pin the `[exempt]` (print-but-not-fail) semantics.
let scanRoot: string;
let stagedDirs: string[];

beforeEach(async () => {
  scanRoot = await mkdtemp(join(tmpdir(), 'flux-ui-consistency-gaps-fixtures-'));
  stagedDirs = [];
});

async function stageFixture(targetPath: string, fileName: string) {
  const targetDir = join(scanRoot, dirname(targetPath));
  await mkdir(targetDir, { recursive: true });
  stagedDirs.push(targetDir);
  const content = await readFile(join(fixtureDir, fileName), 'utf8');
  await writeFile(join(scanRoot, targetPath), content, 'utf8');
}

function runGate() {
  return execFileAsync(process.execPath, [scriptPath], {
    cwd: rootDir,
    env: { ...process.env, FLUX_AUDIT_SCAN_ROOT: scanRoot },
  });
}

afterEach(async () => {
  for (const dir of stagedDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  stagedDirs.length = 0;
  await rm(scanRoot, { recursive: true, force: true });
});

describe('find-ui-consistency-gaps', () => {
  describe('hardcoded-literal-color (candidate A)', () => {
    it('flags hex / hsl / rgb literals and color-mix white/black in renderer css', async () => {
      await stageFixture('packages/flux-renderers-basic/src/color-hit.fixture.css', 'color-hit.fixture.css');
      await expect(runGate()).rejects.toMatchObject({
        stdout: expect.stringContaining('hardcoded-literal-color'),
        stdout: expect.stringContaining('color-hit.fixture.css'),
        stdout: expect.stringContaining('#ff0000'),
        stdout: expect.stringContaining('color-mix('),
      });
    });

    it('flags Tailwind literal color classes in renderer tsx', async () => {
      await stageFixture('packages/flux-renderers-basic/src/color-class-hit.fixture.tsx', 'color-class-hit.fixture.tsx');
      await expect(runGate()).rejects.toMatchObject({
        stdout: expect.stringContaining('bg-white text-red-400'),
      });
    });

    it('passes semantic token classes through without a hit', async () => {
      await stageFixture('packages/flux-renderers-basic/src/color-clean.fixture.tsx', 'color-clean.fixture.tsx');
      const { stdout } = await runGate();
      expect(stdout).not.toContain('color-clean.fixture.tsx');
    });

    it('passes pure hsl(var(--x, fallback)) token consumption through without a hit (plan 483 A2)', async () => {
      await stageFixture(
        'packages/flux-renderers-basic/src/color-var-token.fixture.css',
        'color-var-token.fixture.css',
      );
      const { stdout } = await runGate();
      expect(stdout).not.toContain('color-var-token.fixture.css');
    });

    it('excludes token-fallback shapes but keeps real hsl/rgb literals as hits (plan 483 A2)', async () => {
      await stageFixture(
        'packages/flux-renderers-basic/src/color-var-fallback.fixture.css',
        'color-var-fallback.fixture.css',
      );
      const rejection = await runGate().then(
        () => null,
        (error: { stdout: string }) => error,
      );
      expect(rejection).not.toBeNull();
      // Real literals still hit…
      expect(rejection?.stdout).toContain('hsl(120, 50%, 40%)');
      expect(rejection?.stdout).toContain('rgb(0 0 0 / 0.45)');
      // …while `hsl(var(--x, fallback))` / `rgb(var(--x, fallback))` token consumption does not.
      expect(rejection?.stdout).not.toContain('hsl(var(--flux-primary');
      expect(rejection?.stdout).not.toContain('rgb(var(--flux-surface');
      expect(rejection?.stdout).not.toContain('replica-var-fallback');
    });

    it('keeps real hardcoded literals in ai styles.css counted as [exempt] under the retained file-level entry (plan 483 A2 ③)', async () => {
      await stageFixture('packages/flux-renderers-ai/src/styles.css', 'ai-styles-real-literal.fixture.css');
      const { stdout } = await runGate();
      expect(stdout).toContain('[exempt]');
      expect(stdout).toContain('packages/flux-renderers-ai/src/styles.css');
    });

    it('prints industrial symbol-drawing colors as [exempt] without flipping the exit code', async () => {
      // plan 483 A1: the industrial package prefix entry was expanded to
      // per-(file,rule) entries — stage under a registered real file path.
      await stageFixture(
        'packages/flux-renderers-industrial/src/symbols/visuals.ts',
        'color-exempt.fixture.ts',
      );
      const { stdout } = await runGate();
      expect(stdout).toContain('[exempt]');
      expect(stdout).toContain('symbols/visuals.ts');
    });
  });

  describe('hardcoded-cjk-ui-copy (candidate B)', () => {
    it('flags CJK UI copy in JSX text position', async () => {
      await stageFixture('packages/flux-renderers-basic/src/cjk-hit.fixture.tsx', 'cjk-hit.fixture.tsx');
      await expect(runGate()).rejects.toMatchObject({
        stdout: expect.stringContaining('hardcoded-cjk-ui-copy'),
        stdout: expect.stringContaining('cjk-hit.fixture.tsx'),
        stdout: expect.stringContaining('添加列'),
      });
    });

    it('excludes the t(..., { defaultValue }) i18n fallback channel (Phase 1 ruling ①)', async () => {
      await stageFixture(
        'packages/flux-renderers-basic/src/cjk-i18n-defaultvalue.fixture.tsx',
        'cjk-i18n-defaultvalue.fixture.tsx',
      );
      const { stdout } = await runGate();
      expect(stdout).not.toContain('cjk-i18n-defaultvalue.fixture.tsx');
    });

    it('excludes dev diagnostic receivers devWarn/warnOnce/console (Phase 1 ruling ②)', async () => {
      await stageFixture('packages/flux-renderers-basic/src/cjk-devwarn.fixture.ts', 'cjk-devwarn.fixture.ts');
      const { stdout } = await runGate();
      expect(stdout).not.toContain('cjk-devwarn.fixture.ts');
    });

    it('excludes schema propContract description fields (author-facing docs)', async () => {
      await stageFixture('packages/flux-renderers-basic/src/cjk-description.fixture.ts', 'cjk-description.fixture.ts');
      const { stdout } = await runGate();
      expect(stdout).not.toContain('cjk-description.fixture.ts');
    });

    it('accepts i18n key usage without any hit', async () => {
      await stageFixture('packages/flux-renderers-basic/src/cjk-clean.fixture.tsx', 'cjk-clean.fixture.tsx');
      const { stdout } = await runGate();
      expect(stdout).not.toContain('cjk-clean.fixture.tsx');
    });
  });

  describe('raw-error-message-direct-out (candidate C)', () => {
    it('flags raw error.message routed into user-visible state', async () => {
      await stageFixture(
        'packages/flux-renderers-basic/src/error-message-hit.fixture.tsx',
        'error-message-hit.fixture.tsx',
      );
      await expect(runGate()).rejects.toMatchObject({
        stdout: expect.stringContaining('raw-error-message-direct-out'),
        stdout: expect.stringContaining('error-message-hit.fixture.tsx'),
      });
    });

    it('excludes the t(key, { message }) i18n interpolation channel', async () => {
      await stageFixture(
        'packages/flux-renderers-basic/src/error-message-i18n-param.fixture.tsx',
        'error-message-i18n-param.fixture.tsx',
      );
      const { stdout } = await runGate();
      expect(stdout).not.toContain('error-message-i18n-param.fixture.tsx');
    });

    it('excludes console diagnostic receivers', async () => {
      await stageFixture(
        'packages/flux-renderers-basic/src/error-message-console.fixture.ts',
        'error-message-console.fixture.ts',
      );
      const { stdout } = await runGate();
      expect(stdout).not.toContain('error-message-console.fixture.ts');
    });

    it('treats a raw error.message in the unified map-renderer as an unregistered new hit (plan 483 A3: exemption removed after unification)', async () => {
      await stageFixture(
        'packages/flux-renderers-map/src/map-renderer.tsx',
        'error-message-exempt.fixture.ts',
      );
      // plan 483 A3 unified this file to the t(key, { message }) channel and
      // removed its exemption entry: a raw error.message here is now exactly
      // the regression the gate must catch.
      await expect(runGate()).rejects.toMatchObject({
        stdout: expect.stringContaining('packages/flux-renderers-map/src/map-renderer.tsx'),
      });
    });

    it('filters adjudicated structured diagnostic channels out of the rule entirely (plan 483 A3 non-UI-exit filter)', async () => {
      await stageFixture(
        'packages/flux-renderers-industrial/src/renderer/scada-errors.ts',
        'structured-diagnostic-hit.fixture.ts',
      );
      await stageFixture(
        'packages/flux-renderers-3d/src/binding/transform-engine.ts',
        'ai-tool-result-hit.fixture.ts',
      );
      await stageFixture(
        'packages/flux-renderers-ai/src/engine/tool-execution.ts',
        'ai-tool-result-hit.fixture.ts',
      );
      const { stdout } = await runGate();
      // Structured channel files produce neither newHits nor [exempt] listings:
      // the rule-level non-UI-exit filter removes them before exemption accounting.
      expect(stdout).not.toContain('scada-errors.ts');
      expect(stdout).not.toContain('transform-engine.ts');
      expect(stdout).not.toContain('tool-execution.ts');
    });
  });

  describe('data-blob-href-without-download (candidate D)', () => {
    it('flags data: URL string literals routed through href', async () => {
      await stageFixture('apps/playground/src/download-hit.fixture.ts', 'download-hit.fixture.ts');
      await expect(runGate()).rejects.toMatchObject({
        stdout: expect.stringContaining('data-blob-href-without-download'),
        stdout: expect.stringContaining('download-hit.fixture.ts'),
      });
    });

    it('prints the registered showcase-env export generator as [exempt] without failing', async () => {
      await stageFixture(
        'apps/playground/src/complex-pages/shared/showcase-env.ts',
        'download-exempt.fixture.ts',
      );
      const { stdout } = await runGate();
      expect(stdout).toContain('[exempt]');
      expect(stdout).toContain('showcase-env.ts');
    });

    it('accepts structured object URLs and plain hrefs without a hit', async () => {
      await stageFixture('apps/playground/src/download-clean.fixture.ts', 'download-clean.fixture.ts');
      const { stdout } = await runGate();
      expect(stdout).not.toContain('download-clean.fixture.ts');
    });
  });

  describe('overlay-adhoc-width (plan 490)', () => {
    it('flags ad-hoc width classes inside the DialogContent opening tag', async () => {
      await stageFixture(
        'packages/flow-designer-renderers/src/overlay-hit.fixture.tsx',
        'overlay-adhoc-hit.fixture.tsx',
      );
      await expect(runGate()).rejects.toMatchObject({
        stdout: expect.stringContaining('overlay-adhoc-width'),
        stdout: expect.stringContaining('overlay-hit.fixture.tsx'),
      });
    });

    it('flags named-scale max widths on overlay content (the audited max-w-3xl form)', async () => {
      await stageFixture(
        'packages/flux-renderers-basic/src/overlay-named-hit.fixture.tsx',
        'overlay-adhoc-named-scale-hit.fixture.tsx',
      );
      await expect(runGate()).rejects.toMatchObject({
        stdout: expect.stringContaining('overlay-adhoc-width'),
        stdout: expect.stringContaining('max-w-3xl'),
      });
    });

    it('accepts ladder size props and child-owned width classes without a hit', async () => {
      await stageFixture(
        'packages/flux-renderers-basic/src/overlay-clean.fixture.tsx',
        'overlay-clean.fixture.tsx',
      );
      const { stdout } = await runGate();
      expect(stdout).not.toContain('overlay-clean.fixture.tsx');
    });

    it('keeps packages/ui component implementations out of scope', async () => {
      // The four overlay components consume the ladder tokens themselves; a
      // staged fixture under packages/ui must not trip the rule.
      await stageFixture(
        'packages/ui/src/components/ui/overlay-ui-internal.fixture.tsx',
        'overlay-adhoc-hit.fixture.tsx',
      );
      const { stdout } = await runGate();
      expect(stdout).not.toContain('overlay-ui-internal.fixture.tsx');
    });
  });

  it('reports a clean scan when no fixture violates any rule', async () => {
    await stageFixture('packages/flux-renderers-basic/src/all-clean.fixture.ts', 'all-clean.fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No new unregistered UI consistency gap');
  });

  it('keeps the EXEMPTIONS path-shape guard in place and the table guard-compliant (plan 483 A1)', async () => {
    // Two-sided canary: the fail-fast validation must stay in the gate script,
    // and the live table must stay compliant. Dropping the guard fails the
    // source assertion; reintroducing an unmarked prefix entry makes every
    // gate invocation fail closed with the guard error.
    const scriptSource = await readFile(scriptPath, 'utf8');
    expect(scriptSource).toContain('path-shape guard');
    expect(scriptSource).toMatch(/isPrefix/);

    await stageFixture('packages/flux-renderers-basic/src/all-clean.fixture.ts', 'all-clean.fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No new unregistered UI consistency gap');
  });

  describe('--json machine-readable output (plan 470 visual-quality V0)', () => {
    function runGateWithArgs(args: string[]) {
      return execFileAsync(process.execPath, [scriptPath, ...args], {
        cwd: rootDir,
        env: { ...process.env, FLUX_AUDIT_SCAN_ROOT: scanRoot },
      });
    }

    it('emits deterministic parseable JSON with totals/byRule/byFile for exempt hits', async () => {
      // plan 483 A1: stage under registered real file paths (prefix entries
      // were expanded to per-(file,rule) entries).
      await stageFixture(
        'packages/flux-renderers-industrial/src/symbols/visuals.ts',
        'color-exempt.fixture.ts',
      );
      await stageFixture(
        'packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx',
        'color-exempt.fixture.ts',
      );
      const { stdout } = await runGateWithArgs(['--json']);
      const payload = JSON.parse(stdout);
      expect(payload.snapshot).toBe('v0');
      expect(payload.generatedFrom).toContain('find-ui-consistency-gaps.mjs --json');
      // color-exempt fixture carries two literal-color lines → 2 instances/file
      expect(payload.totals).toMatchObject({ instances: 4, files: 2 });
      expect(payload.totals.entries).toBeGreaterThan(0);
      expect(payload.byRule['hardcoded-literal-color']).toMatchObject({ instances: 4, files: 2 });
      expect(payload.byFile).toEqual(
        [...payload.byFile].sort((a, b) =>
          `${a.file}|${a.rule}`.localeCompare(`${b.file}|${b.rule}`),
        ),
      );
      expect(payload.byFile.map((entry: { file: string }) => entry.file)).toEqual([
        'packages/flux-renderers-industrial/src/symbols/visuals.ts',
        'packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx',
      ]);
      expect(payload.newHits).toEqual([]);
    });

    it('reports zero-state totals as valid JSON when the scan is clean', async () => {
      await stageFixture('packages/flux-renderers-basic/src/json-clean.fixture.ts', 'all-clean.fixture.ts');
      const { stdout } = await runGateWithArgs(['--json']);
      const payload = JSON.parse(stdout);
      expect(payload.totals).toMatchObject({ instances: 0, files: 0 });
      expect(payload.byFile).toEqual([]);
    });
  });
});
