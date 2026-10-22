import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { workbenchPanelTrack } from './panel-resizer.js';
import { resolveWorkbenchGridCols, WORKBENCH_GRID_CLASS_VARIANTS } from './workbench-shell.js';

// P0-MA5.1-001 判别测试（docs/plans/2026-10-22-0500-arm2-fix-P0-MA5.1-001）：
// Tailwind v4 只为「扫描面内出现的完整类字面量」生成 CSS。workbench body 的
// grid-cols 类历史上由模板字符串运行时拼接（docs/bugs/14 同族机理），2 列变体
// 在扫描面内零完整字面量 → CSS 无规则 → body 回落单列塌缩。
// 本测试钉两件事：
//  1) resolveWorkbenchGridCols 的每个返回串都在静态变体表内，且与
//     workbenchPanelTrack 组合值程序化一致（rem 常量漂移即红）；
//  2) 每个变体的完整字面量逐字存在于 workbench-shell.tsx 源码（该文件在
//     playground styles.css `@source ../../../packages` 扫描面内 → CSS 必生成）。
// 反自败守卫：本测试文件自身不得含任何完整 grid-cols-[...] 字面量（否则
// Tailwind 会为测试文件生成它们，使检查 2 永远假绿）。

const thisFile = fileURLToPath(import.meta.url);
const SHELL_SOURCE_PATH = join(dirname(thisFile), 'workbench-shell.tsx');

function allVariants(): string[] {
  return Object.values(WORKBENCH_GRID_CLASS_VARIANTS);
}

describe('workbench grid class variants are complete literals in the scan surface', () => {
  it('resolveWorkbenchGridCols returns only enumerated variants for every panel combination', () => {
    const combos: Array<[boolean, boolean, boolean, boolean]> = [
      [false, false, false, false],
      [true, false, false, false],
      [true, false, true, false],
      [false, true, false, false],
      [false, true, false, true],
      [true, true, true, true],
      [true, true, true, false],
      [true, true, false, true],
      [true, true, false, false],
    ];
    for (const [hasLeft, hasRight, leftCollapsed, rightCollapsed] of combos) {
      const resolved = resolveWorkbenchGridCols(hasLeft, hasRight, leftCollapsed, rightCollapsed);
      expect(
        allVariants(),
        `resolved class "${resolved}" for (${hasLeft},${hasRight},${leftCollapsed},${rightCollapsed}) must be an enumerated variant`,
      ).toContain(resolved);
    }
  });

  it('variants compose to exactly what workbenchPanelTrack produces (rem drift guard)', () => {
    expect(WORKBENCH_GRID_CLASS_VARIANTS.leftExpanded).toBe(
      `grid-cols-[${workbenchPanelTrack('left', false)}_minmax(0,1fr)]`,
    );
    expect(WORKBENCH_GRID_CLASS_VARIANTS.leftCollapsed).toBe(
      `grid-cols-[${workbenchPanelTrack('left', true)}_minmax(0,1fr)]`,
    );
    expect(WORKBENCH_GRID_CLASS_VARIANTS.rightExpanded).toBe(
      `grid-cols-[minmax(0,1fr)_${workbenchPanelTrack('right', false)}]`,
    );
    expect(WORKBENCH_GRID_CLASS_VARIANTS.rightCollapsed).toBe(
      `grid-cols-[minmax(0,1fr)_${workbenchPanelTrack('right', true)}]`,
    );
    expect(WORKBENCH_GRID_CLASS_VARIANTS.bothExpanded).toBe(
      `grid-cols-[${workbenchPanelTrack('left', false)}_minmax(0,1fr)_${workbenchPanelTrack('right', false)}]`,
    );
    expect(WORKBENCH_GRID_CLASS_VARIANTS.leftCollapsedOnly).toBe(
      `grid-cols-[${workbenchPanelTrack('left', true)}_minmax(0,1fr)_${workbenchPanelTrack('right', false)}]`,
    );
    expect(WORKBENCH_GRID_CLASS_VARIANTS.rightCollapsedOnly).toBe(
      `grid-cols-[${workbenchPanelTrack('left', false)}_minmax(0,1fr)_${workbenchPanelTrack('right', true)}]`,
    );
    expect(WORKBENCH_GRID_CLASS_VARIANTS.bothCollapsed).toBe(
      `grid-cols-[${workbenchPanelTrack('left', true)}_minmax(0,1fr)_${workbenchPanelTrack('right', true)}]`,
    );
  });

  it('every variant literal exists verbatim in the Tailwind-scanned shell source', () => {
    const source = readFileSync(SHELL_SOURCE_PATH, 'utf8');
    const missing = allVariants().filter((variant) => !source.includes(variant));
    expect(
      missing,
      'grid variant classes must appear as complete literals in workbench-shell.tsx (in the @source scan surface) — otherwise Tailwind never generates the CSS rule and the body collapses to one column',
    ).toEqual([]);
  });

  it('the playground scan surface still covers package sources (@source pin)', () => {
    const styles = readFileSync(
      join(dirname(thisFile), '../../../..', 'apps/playground/src/styles.css'),
      'utf8',
    );
    expect(styles).toMatch(/@source\s+["'][^"']*\.\.\/\.\.\/\.\.\/packages["']/);
  });

  it('this test file stays variant-literal-free (anti-self-defeating guard)', () => {
    const self = readFileSync(thisFile, 'utf8');
    const leaked = allVariants().filter((variant) => self.includes(variant));
    expect(
      leaked,
      'the scan surface includes this test file — no complete variant literal may appear here, or Tailwind would generate it and the source check above would pass vacuously',
    ).toEqual([]);
  });
});
