import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// RM-9 (plan 611): the residue gate is enforcement + dual-segment baseline.
// Fixtures are staged into a temporary scan root (FLUX_AUDIT_SCAN_ROOT), never
// into packages/ — the gate scans that tree instead of the repository.

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'audit', 'find-renderer-metamodel-residue.mjs');
const baselinePath = resolve(rootDir, 'scripts', 'baselines', 'renderer-metamodel-residue-whitelist.json');

const stagedRoots = [];

async function makeScanRoot(entries) {
  const root = await mkdtemp(join(tmpdir(), 'rm9-residue-'));
  stagedRoots.push(root);
  for (const [relativePath, content] of Object.entries(entries)) {
    const target = join(root, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
  return root;
}

async function runGate(scanRoot) {
  try {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
      cwd: rootDir,
      env: { ...process.env, FLUX_AUDIT_SCAN_ROOT: scanRoot },
    });
    return { stdout, exitCode: 0 };
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: `${failed.stdout ?? ''}${failed.stderr ?? ''}`,
      exitCode: failed.code ?? 1,
    };
  }
}

afterEach(async () => {
  for (const root of stagedRoots) {
    await rm(root, { recursive: true, force: true });
  }
  stagedRoots.length = 0;
});

describe('find-renderer-metamodel-residue', () => {
  it('fails with exit 1 and reports file:line for an unadjudicated residue hit', async () => {
    const scanRoot = await makeScanRoot({
      'packages/probe-pkg/src/renderer-probe.ts': 'export const definition = {\n  propSchema: {},\n};\n',
    });
    const { stdout, exitCode } = await runGate(scanRoot);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('packages/probe-pkg/src/renderer-probe.ts:2');
    expect(stdout).toContain('rm-a1-prop-schema-field');
  });

  it('passes when the hit carries a suppression from the baseline', async () => {
    // Stage the exact file:line the baseline suppresses (A5 frameWrap pass-through)
    // so the run exercises "hit present + adjudicated => green".
    const filler = Array.from({ length: 76 }, (_, index) => `// filler ${index + 1}`).join('\n');
    const scanRoot = await makeScanRoot({
      'packages/flux-core/src/types/compiled-renderer-contract.ts': `${filler}\n    frameWrap: definition.frameWrap,\n`,
    });
    const { stdout, exitCode } = await runGate(scanRoot);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('1 suppression point(s) matched');
    expect(stdout).not.toContain('unadjudicated hit(s)');
  });

  it('reports vanished suppressions as shrink-only cleanup without failing the gate', async () => {
    const scanRoot = await makeScanRoot({
      'packages/probe-pkg/src/clean.ts': 'export const clean = { type: "text" };\n',
    });
    const { stdout, exitCode } = await runGate(scanRoot);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('no longer match any hit');
    expect(stdout).toContain('--update-baselines');
  });

  it('keeps the committed suppression set exactly equal to the live hit set', async () => {
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
    const { stdout } = await execFileAsync(process.execPath, [scriptPath], { cwd: rootDir });
    const expected = Number(baseline._header.count);
    expect(baseline.suppressions.length).toBe(expected);
    expect(baseline.registry.length).toBe(4);
    expect(stdout).toContain(`${expected} suppression point(s) matched`);
  });

  it('declares a complete rule family (16 rules with id, family and closureNote)', async () => {
    const { rendererMetamodelResidueRules } = await import('../audit/renderer-metamodel-residue-rules.mjs');
    expect(rendererMetamodelResidueRules).toHaveLength(16);
    for (const rule of rendererMetamodelResidueRules) {
      expect(rule.id).toMatch(/^rm-/);
      expect(typeof rule.family).toBe('string');
      expect(rule.family.length).toBeGreaterThan(0);
      expect(typeof rule.closureNote).toBe('string');
      expect(rule.closureNote.length).toBeGreaterThan(0);
    }
  });
});
