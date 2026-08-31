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

    it('prints industrial symbol-drawing colors as [exempt] without flipping the exit code', async () => {
      await stageFixture(
        'packages/flux-renderers-industrial/src/symbols/color-exempt.fixture.ts',
        'color-exempt.fixture.ts',
      );
      const { stdout } = await runGate();
      expect(stdout).toContain('[exempt]');
      expect(stdout).toContain('color-exempt.fixture.ts');
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

    it('prints adjudicated raw-message diagnostic sinks as [exempt] without failing', async () => {
      await stageFixture(
        'packages/flux-renderers-map/src/map-renderer.tsx',
        'error-message-exempt.fixture.ts',
      );
      const { stdout } = await runGate();
      expect(stdout).toContain('[exempt]');
      expect(stdout).toContain('packages/flux-renderers-map/src/map-renderer.tsx');
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

  it('reports a clean scan when no fixture violates any rule', async () => {
    await stageFixture('packages/flux-renderers-basic/src/all-clean.fixture.ts', 'all-clean.fixture.ts');
    const { stdout } = await runGate();
    expect(stdout).toContain('No new unregistered UI consistency gap');
  });
});
