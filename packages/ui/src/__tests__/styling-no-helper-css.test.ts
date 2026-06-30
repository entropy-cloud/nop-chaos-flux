// B6.2 — STY2: utility classNames 仅默认 stylesheet 即生效（无 helper.css / 无 .amis-scope）的
// repo-structure guard。锁定「Flux 全仓不引入平行 helper.css，也无 .amis-scope scope-prefix」。
// 一旦有人重新引入 helper.css / .amis-scope / 移除 `@source`，此 guard fail 并阻止合入。

import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceRoot = resolve(process.cwd(), '../..');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.turbo', 'coverage', '.cache']);

function walkSourceFiles(dir: string, extensions: string[], acc: string[] = []): string[] {
  type FsEntry = { name: string; isDirectory(): boolean; isFile(): boolean };
  let entries: FsEntry[];
  try {
    entries = readdirSync(dir, { withFileTypes: true }) as unknown as FsEntry[];
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Prune dependency / build dirs at traversal time to avoid descending into
      // the pnpm store (symlink cycles) or dist artifacts.
      if (SKIP_DIRS.has(entry.name)) continue;
      walkSourceFiles(join(dir, entry.name), extensions, acc);
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      acc.push(join(dir, entry.name));
    }
  }
  return acc;
}

describe('STY2: no helper.css / no .amis-scope / @source present (B6.2)', () => {
  it('has zero helper.css files in source tree (packages + apps)', () => {
    const cssFiles = [
      ...walkSourceFiles(join(workspaceRoot, 'packages'), ['.css']),
      ...walkSourceFiles(join(workspaceRoot, 'apps'), ['.css']),
    ];
    const helperCss = cssFiles.filter((f) => /helper\.css$/i.test(f));
    expect(helperCss).toEqual([]);
  });

  it('has no .amis-scope selector/reference in packages css/tsx source', () => {
    const files = walkSourceFiles(join(workspaceRoot, 'packages'), ['.css', '.tsx']);
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      if (/amis-scope/.test(content)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('playground stylesheet still scans packages via @source (utility class generation entry)', () => {
    const stylesPath = join(workspaceRoot, 'apps/playground/src/styles.css');
    const content = readFileSync(stylesPath, 'utf8');
    expect(content).toContain('@source "../../../packages"');
  });
});
