import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Plan 782 (roadmap PH-18): the focus ledger must match a fresh mechanical
// generation of packages/ui primitives (missing/stale rows and hand-edits red).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(__dirname, '..', 'audit', 'build-focus-ledger.mjs');

const baseUiComponent = `import { Menu } from '@base-ui/react/menu';\nexport function MenuX() { return <Menu.Root />; }\n`;
const styledComponent = `export function Box({ children }) {\n  return <div className="focus-visible:ring-2">{children}</div>;\n}\n`;
const programmaticComponent = `export function Trigger(props) {\n  return <button onClick={(e) => e.currentTarget.focus()} {...props} />;\n}\n`;
const staticComponent = `export function Label() {\n  return <span>label</span>;\n}\n`;

function fixture(specs: Record<string, string>, ledgerRows: string[]) {
  const dir = mkdtempSync(path.join(tmpdir(), 'focus-ledger-'));
  const componentsDir = path.join(dir, 'ui');
  mkdirSync(componentsDir, { recursive: true });
  for (const [name, body] of Object.entries(specs)) writeFileSync(path.join(componentsDir, name), body);
  const ledger = path.join(dir, 'ledger.md');
  writeFileSync(
    ledger,
    ['# Focus ledger', '', '## notes', '', '- analysis notes stay outside the generated region', ''] +
      [`<!-- BEGIN GENERATED:focus-ledger (regenerate with --update; hand edits fail check:focus-ledger) -->`, '', '```txt', '| 文件 | 主标签 | 全部标签 |', '| --- | --- | --- |', ...ledgerRows, '```', '', '<!-- END GENERATED:focus-ledger -->', ''].join('\n'),
  );
  return { componentsDir, ledger };
}

function run(args: string[]): { code: number; stderr: string; stdout: string } {
  try {
    const stdout = execFileSync('node', [scriptPath, '--components-dir', args[0], '--ledger', args[1]], { encoding: 'utf-8' });
    return { code: 0, stderr: '', stdout };
  } catch (error) {
    const err = error as { status?: number; stderr?: string; stdout?: string };
    return { code: err.status ?? 1, stderr: err.stderr ?? '', stdout: err.stdout ?? '' };
  }
}

describe('check:focus-ledger', () => {
  it('fails when a component file is missing from the ledger (stale ledger)', () => {
    const specs = { 'menu.tsx': baseUiComponent, 'box.tsx': styledComponent, 'trigger.tsx': programmaticComponent };
    const { componentsDir, ledger } = fixture(specs, [
      '| box | focus-visible | focus-visible |',
      '| trigger | programmatic | programmatic |',
    ]);
    const result = run([componentsDir, ledger]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('STALE');
  });

  it('fails when the ledger names a component that no longer exists (ghost row)', () => {
    const specs = { 'menu.tsx': baseUiComponent };
    const { componentsDir, ledger } = fixture(specs, [
      '| menu | base-ui | base-ui |',
      '| ghost | non-interactive | non-interactive |',
    ]);
    const result = run([componentsDir, ledger]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('STALE');
  });

  it('fails when a tag disagrees with the mechanical classification (wrong-tag row)', () => {
    const specs = { 'menu.tsx': baseUiComponent };
    const { componentsDir, ledger } = fixture(specs, ['| menu | non-interactive | non-interactive |']);
    const result = run([componentsDir, ledger]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('STALE');
  });

  it('passes when the ledger matches a fresh generation (consistent fixture)', () => {
    const specs = { 'menu.tsx': baseUiComponent, 'box.tsx': styledComponent, 'trigger.tsx': programmaticComponent, 'static.tsx': staticComponent };
    const { componentsDir, ledger } = fixture(specs, [
      '| box | focus-visible | focus-visible |',
      '| menu | base-ui | base-ui |',
      '| static | non-interactive | non-interactive |',
      '| trigger | programmatic | programmatic |',
    ]);
    expect(run([componentsDir, ledger]).code).toBe(0);
  });

  it('runs green against the live repository ledger', () => {
    const ledger = path.join(__dirname, '..', '..', 'docs', 'testing', 'focus-management-ledger.md');
    const result = run([path.join(__dirname, '..', '..', 'packages', 'ui', 'src', 'components', 'ui'), ledger]);
    expect(result.code).toBe(0);
  });
});
