import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// Plan 756 (roadmap PH-3): owner-doc semantic consistency. Two assertion
// families — identifier-set (doc section must cover every call inside a named
// function) and symbol-anchor (a backticked symbol in a doc item must exist in
// the backticked file cited by the same item). Fixtures replay the two arm2 P1
// drifts (P1-MA1.2-001 family list 7->9, P1-MA1.1-001 wrong Where-To-Add file).

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'check-owner-doc-semantics.mjs');

const tempDirs: string[] = [];

interface Fixture {
  files: Record<string, string>;
  manifest: Record<string, unknown>;
}

async function stage({ files, manifest }: Fixture) {
  const dir = await mkdtemp(join(tmpdir(), 'owner-doc-semantics-'));
  tempDirs.push(dir);
  for (const [relativePath, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, relativePath)), { recursive: true });
    await writeFile(join(dir, relativePath), content, 'utf8');
  }
  await mkdir(join(dir, 'scripts', 'baselines'), { recursive: true });
  await writeFile(join(dir, 'scripts', 'baselines', 'owner-doc-semantics.json'), JSON.stringify(manifest, null, 2), 'utf8');
  return dir;
}

async function runGate(root: string) {
  try {
    const result = await execFileAsync(process.execPath, [scriptPath, '--root', root], { cwd: rootDir });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

const bundleCode = (extra = '') => `export function registerDefaultFluxRenderers(registry) {
  registerBasicRenderers(registry);
  registerFormAdvancedRenderers(registry);
  registerThreeRenderers(registry);${extra}
}
`;

const bundleDoc = (count: number) => `# Boundaries

## Bundle Default Registration Face

The facade registers **${count} renderer families** — basic, form-advanced, and 3d (\`registerThreeRenderers\`).

## Other
`;

const setManifest = {
  docs: [],
  identifierSets: [
    {
      id: 'bundle-face',
      doc: 'docs/boundaries.md',
      heading: '## Bundle Default Registration Face',
      codeFile: 'packages/bundle/src/index.tsx',
      functionName: 'registerDefaultFluxRenderers',
      callPattern: 'register[A-Z]\\w*',
      countPattern: '\\*\\*(\\d+) renderer families\\*\\*',
    },
  ],
  allow: [],
};

const anchorDoc = (symbol: string, extraLine = '') => `# Boundaries

## Where To Add

- \`packages/rt/src/lowering.ts\`
  - lowering lives here (\`${symbol}\` → \`CompiledRule\`)
${extraLine}
`;

const anchorFiles = {
  'packages/rt/src/lowering.ts': 'export function collectRules() {}\nexport interface CompiledRule {}\n',
};

const anchorManifest = { docs: ['docs/boundaries.md'], identifierSets: [], allow: [] };

describe('check-owner-doc-semantics', () => {
  it('identifier-set: passes when the doc section covers every call and the bold count matches', async () => {
    const root = await stage({
      files: { 'docs/boundaries.md': bundleDoc(3), 'packages/bundle/src/index.tsx': bundleCode() },
      manifest: setManifest,
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('bundle-face');
  });

  it('identifier-set: fails when code registers a family the doc section never mentions (replays P1-MA1.2-001)', async () => {
    const root = await stage({
      files: {
        'docs/boundaries.md': bundleDoc(3),
        'packages/bundle/src/index.tsx': bundleCode('\n  registerXlangDebugEditorRenderers(registry);'),
      },
      manifest: setManifest,
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('registerXlangDebugEditorRenderers');
  });

  it('identifier-set: fails when the bold count disagrees with the live call count', async () => {
    const root = await stage({
      files: { 'docs/boundaries.md': bundleDoc(2), 'packages/bundle/src/index.tsx': bundleCode() },
      manifest: setManifest,
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('count');
  });

  it('symbol-anchor: passes when the symbols named in an item exist in the cited file', async () => {
    const root = await stage({
      files: { 'docs/boundaries.md': anchorDoc('collectRules'), ...anchorFiles },
      manifest: anchorManifest,
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
  });

  it('symbol-anchor: fails when an item names a symbol that the cited file does not contain (replays P1-MA1.1-001)', async () => {
    const root = await stage({
      files: { 'docs/boundaries.md': anchorDoc('normalizeTriggers'), ...anchorFiles },
      manifest: anchorManifest,
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('normalizeTriggers');
    expect(result.stderr).toContain('packages/rt/src/lowering.ts');
  });

  it('symbol-anchor: follows a one-line facade re-export into its local module directory', async () => {
    const root = await stage({
      files: {
        'docs/boundaries.md': `# B\n\n## S\n\n- \`packages/core/src/dispatcher.ts\`\n  - consumes \`RuntimeAdapter\`\n`,
        'packages/core/src/dispatcher.ts': "export { createDispatcher } from './dispatcher/index.js';\n",
        'packages/core/src/dispatcher/index.ts': "export { createDispatcher } from './create.js';\n",
        'packages/core/src/dispatcher/types.ts': 'export interface RuntimeAdapter {}\n',
      },
      manifest: anchorManifest,
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
  });

  it('symbol-anchor: skips items that describe a deleted or removed symbol', async () => {
    const root = await stage({
      files: {
        'docs/boundaries.md': anchorDoc('collectRules', '- `packages/rt/src/lowering.ts`\n  - `extractLegacyPayload` has been deleted; no longer needed'),
        ...anchorFiles,
      },
      manifest: anchorManifest,
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
  });

  it('symbol-anchor: honours an explicit allow entry with a reason', async () => {
    const root = await stage({
      files: { 'docs/boundaries.md': anchorDoc('normalizeTriggers'), ...anchorFiles },
      manifest: {
        ...anchorManifest,
        allow: [{ path: 'packages/rt/src/lowering.ts', symbol: 'normalizeTriggers', reason: 'consumer name, not file content' }],
      },
    });
    const result = await runGate(root);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('allow');
  });

  it('symbol-anchor: fails when an allow entry is stale (symbol now present in the file)', async () => {
    const root = await stage({
      files: { 'docs/boundaries.md': anchorDoc('collectRules'), ...anchorFiles },
      manifest: {
        ...anchorManifest,
        allow: [{ path: 'packages/rt/src/lowering.ts', symbol: 'collectRules', reason: 'obsolete' }],
      },
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('stale');
  });

  it('manifest: fails when an identifier-set heading does not exist in the doc', async () => {
    const root = await stage({
      files: { 'docs/boundaries.md': bundleDoc(3), 'packages/bundle/src/index.tsx': bundleCode() },
      manifest: {
        ...setManifest,
        identifierSets: [{ ...(setManifest.identifierSets[0] as object), heading: '## Missing Heading' }],
      },
    });
    const result = await runGate(root);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Missing Heading');
  });

  it('runs green against the live repository manifest', async () => {
    const result = await runGate(rootDir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('flux-runtime-module-boundaries.md');
  });
});
