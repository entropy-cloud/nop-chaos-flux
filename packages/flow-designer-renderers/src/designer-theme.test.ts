import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const styles = readFileSync(join(here, 'designer-theme.css'), 'utf8');
const nodeAppearance = readFileSync(join(here, 'designer-node-appearance.ts'), 'utf8');
const dingFlowEdge = readFileSync(join(here, 'dingflow', 'ding-flow-edge.tsx'), 'utf8');

describe('flow designer theme stylesheet contract', () => {
  it('publishes the --fd-* token family on the .nop-designer scope (plan 475 Phase 3)', () => {
    // 死令牌面激活：包在 .nop-designer 作用域发布 --fd-* 定义，消费点的 fallback
    // 退化为裸宿主兜底。宿主覆盖须命中 .nop-designer 内层或更高优先级选择器。
    expect(styles).toContain('.nop-designer {');
    for (const token of [
      '--fd-page-bg:',
      '--fd-toolbar-bg:',
      '--fd-toolbar-shadow:',
      '--fd-panel-bg:',
      '--fd-panel-accent:',
      '--fd-canvas-bg:',
      '--fd-edge-label-bg:',
      '--fd-edge-actions-bg:',
      '--fd-edge-actions-shadow:',
      '--fd-grid-color:',
      '--fd-minimap-bg:',
      '--fd-minimap-node:',
      '--fd-minimap-mask:',
      '--fd-edge-stroke:',
      '--fd-primary:',
      '--fd-alignment-guide:',
    ]) {
      expect(styles, `definition for ${token}`).toContain(token);
    }
    expect(styles).not.toContain(':where(.fd-theme-root, .nop-designer) {');
  });

  it('re-declares mode-dependent tokens in a dark block (plan 475 Phase 3)', () => {
    expect(styles).toContain("[data-mode='dark'] .nop-designer {");
    // 暗色块重声明面：表面族 + 画布面 + 网格/小地图（身份色 --fd-node-accent-* 不随模式翻转）。
    const darkBlock = styles.split("[data-mode='dark'] .nop-designer {")[1] ?? '';
    expect(darkBlock).toBeTruthy();
    for (const token of [
      '--fd-page-bg:',
      '--fd-toolbar-bg:',
      '--fd-panel-bg:',
      '--fd-canvas-bg:',
      '--fd-grid-color:',
      '--fd-minimap-bg:',
    ]) {
      expect(darkBlock, `dark re-declaration for ${token}`).toContain(token);
    }
    // --xy-* 库变量 dark 最小集（Controls/选框/连线选中）。
    expect(darkBlock).toContain('--xy-controls-button-background-color:');
    expect(darkBlock).toContain('--xy-selection-background-color:');
    expect(darkBlock).toContain('--xy-edge-stroke-selected:');
  });

  it('defines the node accent identity family (plan 475 Phase 3)', () => {
    for (const token of [
      '--fd-node-accent-dt-condition:',
      '--fd-node-accent-dt-approval:',
      '--fd-node-accent-task:',
      '--fd-node-accent-end:',
    ]) {
      expect(styles, `accent definition for ${token}`).toContain(token);
    }
  });

  it('derives palette chrome from the published accent token contract', () => {
    expect(styles).toContain('.fd-palette-swatch {');
    expect(styles).toContain('var(--fd-palette-accent, hsl(var(--primary)))');
    expect(styles).not.toContain('.fd-palette-appearance-task');
    expect(styles).not.toContain('.fd-palette-appearance-start');
  });

  it('keeps branch labels on token classes instead of utility hexes', () => {
    expect(styles).toContain('.fd-branch-label {');
  });

  it('keeps accent consumers on --fd-node-accent-* tokens with no raw hex utilities (plan 475 Phase 3)', () => {
    // accent 表的每个值都必须是令牌引用（fallback 供裸宿主），禁止回退裸 hex 表。
    const colorEntries = nodeAppearance.split('DEFAULT_NODE_TYPE_COLORS')[1]?.split('};')[0] ?? '';
    expect(colorEntries).toBeTruthy();
    expect(colorEntries).not.toMatch(/'#[0-9a-fA-F]{3,8}'/);

    // branch label 的 border/bg/text 任意值 hex 类保持退役（.fd-branch-label 令牌类承接）。
    expect(dingFlowEdge).not.toContain('border-[#');
    expect(dingFlowEdge).not.toContain('text-[#');
    expect(dingFlowEdge).not.toContain('bg-white');
  });
});
