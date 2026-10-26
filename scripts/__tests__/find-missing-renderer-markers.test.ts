import { afterEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// Plan 755 (roadmap PH-2): the marker scanner's whole-file exemption used to be
// `content.includes('nop-')`, which any `@nop-chaos/*` import satisfies. These
// cases pin the upgraded semantics: a marker is a `nop-*` literal that is not an
// import path, and only files that own a host DOM element are expected to carry one.

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');
const scriptPath = resolve(rootDir, 'scripts', 'audit', 'find-missing-renderer-markers.mjs');
const rulesUrl = new URL('../audit/rules.mjs', import.meta.url).href;

const stagedRoots: string[] = [];

const IMPORTS = `import type { RendererComponentProps } from '@nop-chaos/flux-react';\nimport { cn } from '@nop-chaos/ui';\n`;

const fixtures = {
  importOnlyWithHost: `${IMPORTS}export function Demo(props: RendererComponentProps) {\n  return <div className={cn('demo', props.meta.className)}>{props.props.label}</div>;\n}\n`,
  markerWithHost: `${IMPORTS}export function Demo(props: RendererComponentProps) {\n  return <div className={cn('nop-demo', props.meta.className)}>{props.props.label}</div>;\n}\n`,
  noHostElement: `${IMPORTS}import { Inner } from './inner';\nexport function Demo(props: RendererComponentProps) {\n  return <Inner {...props} />;\n}\n`,
  returnsNull: `${IMPORTS}export function Demo(_props: RendererComponentProps) {\n  return null;\n}\n`,
  noRendererProps: `import { cn } from '@nop-chaos/ui';\nexport function Helper() {\n  return <span className={cn('x')}>helper</span>;\n}\n`,
  templateLiteralMarker: `${IMPORTS}const base = 'demo';\nexport function Demo(props: RendererComponentProps) {\n  return <section className={\`nop-\${base}\`}>{props.props.label}</section>;\n}\n`,
};

async function stage(entries: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), 'marker-scan-'));
  stagedRoots.push(root);
  for (const [relativePath, content] of Object.entries(entries)) {
    const target = join(root, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
  return root;
}

async function runScanner(root: string) {
  try {
    const result = await execFileAsync(process.execPath, [scriptPath], {
      cwd: rootDir,
      env: { ...process.env, FLUX_AUDIT_SCAN_ROOT: root },
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? 1, stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
}

async function scanUnit(content: string) {
  const { rendererMarkerRules } = (await import(rulesUrl)) as {
    rendererMarkerRules: Array<{ scanWithContent: (args: { rule: unknown; relativePath: string; content: string }) => unknown[] }>;
  };
  const rule = rendererMarkerRules[0];
  return rule.scanWithContent({ rule, relativePath: 'packages/flux-renderers-demo/src/demo.tsx', content });
}

afterEach(async () => {
  await Promise.all(stagedRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('find-missing-renderer-markers (plan 755 semantics)', () => {
  it('flags a renderer that owns a host element but only has @nop-chaos imports and no marker literal (discriminating: old exemption missed this)', async () => {
    expect(await scanUnit(fixtures.importOnlyWithHost)).toHaveLength(1);
  });

  it('does not flag a renderer whose className carries a nop-* marker literal', async () => {
    expect(await scanUnit(fixtures.markerWithHost)).toHaveLength(0);
  });

  it('does not flag a renderer that only composes components (no host element to carry a marker)', async () => {
    expect(await scanUnit(fixtures.noHostElement)).toHaveLength(0);
  });

  it('does not flag a renderer that returns null', async () => {
    expect(await scanUnit(fixtures.returnsNull)).toHaveLength(0);
  });

  it('does not flag a file without RendererComponentProps (original gate retained)', async () => {
    expect(await scanUnit(fixtures.noRendererProps)).toHaveLength(0);
  });

  it('accepts a marker built from a template literal prefix', async () => {
    expect(await scanUnit(fixtures.templateLiteralMarker)).toHaveLength(0);
  });

  it('runs end-to-end over a staged scan root and reports exactly the import-only host-element file', async () => {
    const root = await stage({
      'packages/flux-renderers-demo/src/import-only.tsx': fixtures.importOnlyWithHost,
      'packages/flux-renderers-demo/src/marker.tsx': fixtures.markerWithHost,
      'packages/flux-renderers-demo/src/compose.tsx': fixtures.noHostElement,
      'packages/flux-renderers-demo/src/test-support/helper.tsx': fixtures.importOnlyWithHost,
      'packages/flux-renderers-demo/src/demo.test.tsx': fixtures.importOnlyWithHost,
    });
    const result = await runScanner(root);
    expect(result.stdout).toContain('Found 1 suspect matches');
    expect(result.stdout).toContain('import-only.tsx');
    expect(result.stdout).not.toContain('marker.tsx');
    expect(result.stdout).not.toContain('compose.tsx');
  });
});
