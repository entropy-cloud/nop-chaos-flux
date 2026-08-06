# 维度 14: 测试覆盖与质量（component-audit mission 多维审计）

> Mission: component-audit | 初审轮次: R1（sub-agent `ses_02c812994ffee185FvUK72EqHz`）

## 第 1 轮（初审）

### [维度14-1] flow-designer 键盘快捷键 hook 完全无测试覆盖

- **文件**: `packages/flow-designer-renderers/src/use-designer-shortcuts.ts:1-83`（无对应测试）
- **严重程度**: P1（核心可操作性路径零覆盖 + e2e 只按 Escape）
- **证据片段**:
  ```ts
  export function useDesignerShortcuts(args: { core; rootRef; dispatch; readOnly? }) {
    useEffect(() => {
      if (!core.getConfig().features.shortcuts) return;
      const shortcuts = core.getConfig().shortcuts;
      const onKeyDown = (event: KeyboardEvent) => {
        if (isEditableTarget(event.target) || !isInsideDesigner(event.target)) return;
        if (readOnly) return;
        if (matchesShortcut(event, shortcuts.undo) && features.undo !== false) { ... }
  ```
- **现状**: 83 行真实键盘逻辑（undo/redo/delete/copy/paste/escape + 3 个守卫），全仓无任何测试引用（rg 零命中）；e2e 仅按过 Escape。
- **风险**: 守卫条件任一写错直接破坏用户体验，无回归保护。
- **建议**: 补 hook 级单测（真实 dispatch + 3 个守卫负面断言）或至少一条 e2e 撤销/重做快捷键。
- **误报排除**: 真实零覆盖，非 mock 问题；auto-layout 同型 hook 有测试可对照。

### [维度14-2] 硬门禁 FAIL：coverage-manifest-entries.ts 超 700 行，mission 提交仍宣称 full-green

- **文件**: `tests/e2e/component-lab/coverage-manifest-entries.ts:1-815`
- **严重程度**: P1（验证可信度：CI 红灯 vs 提交声称全绿）
- **证据片段**:
  ```
  [check-oversized-code-files] ERROR: 16 files exceed 700 lines:
    - tests/e2e/component-lab/coverage-manifest-entries.ts: 816
  ```
- **现状**: `pnpm check:oversized-code-files` 硬门禁 FAIL；C9 提交 dd59dcd9 声称 "full-green verification: workspace 32tc/32build/32lint + ..." 未纳入 `pnpm check`。
- **风险**: "full-green verification" 承诺与实际 gate 状态不一致，红灯被误当已知基线；gate 意义稀释。
- **建议**: 按 category 拆 2-3 个数据文件恢复 gate 绿；把 `pnpm check` 加入 commit 验证清单。
- **误报排除**: 硬门禁明确 FAIL（audit-tooling.md: "Treat failures as hard defects"），非大文件降级案例。

### [维度14-3] window.innerHeight 全局变更未恢复

- **文件**: `packages/flux-renderers-data/src/__tests__/g5-g12-g17-data-lifecycle.test.tsx:211`
- **严重程度**: P2（隔离性）
- **证据片段**:
  ```ts
  window.innerHeight = 600; // ← 无 restore
  expect(triggerListIntersection()).toBe(true);
  // afterEach 只有 cleanup() + vi.restoreAllMocks()（不还原属性赋值）
  ```
- **现状**: test-global-patch suspect 命中项；innerHeight 残留 600 影响后续测试（当前侥幸无害）。
- **风险**: 后续新增依赖视口高度的测试被静默污染；并行化/顺序变化产生偶发失败。
- **建议**: 保存原值并在 afterEach 恢复。
- **误报排除**: 其余 30 处 test-module-top-let / test-global-patch 命中均已核对有重置，仅此一处无恢复。

### [维度14-4] canvas-bridge 测试 setup 膨胀（212/589 行未提取）

- **文件**: `packages/flow-designer-renderers/src/canvas-bridge.test.tsx:1-212`
- **严重程度**: P2（setup 膨胀 + 固定空快照 mock）
- **证据片段**:
  ```tsx
  vi.mock('./designer-context', async () => ({
    ...,
    useDesignerSnapshotSelector: (selector) => selector({ doc: { nodes: [], edges: [] } }),
  }));
  ```
- **现状**: 589 行测试文件 212 行（36%）为 mock/setup；useDesignerSnapshotSelector 被 mock 成固定空快照。
- **风险**: 固定快照 mock 使桥接层数据流断言失真；setup 比例过高。
- **建议**: 提取 test-support.tsx；快照 mock 提供真实节点/边 fixture。
- **误报排除**: 其余 >50 行 setup 文件多为 schema fixture 数据区，可接受；仅此文件 mock 与 fixture 混合且占比最高。

## 维度 14 其余核查结论（R1）

- 30 包测试文件 1180 个、约 24.9 万行；无 0 测试包；describe 嵌套全仓最大 1 层。
- mission 新建/修改模块（graph 包 5 文件 675 行、timeline v2、tree writeback、CX-9 reaction handle、wrap-surface-tab-focus）均有真实行为断言。
- E2E host-surfaces specs 全部真实浏览器 + programmatic DOM 断言；事件 payload 经真实 action 分发写 window.\_\_c\* probe；无 debug-only scope dump 断言。

## 维度复核结论

待复核。
