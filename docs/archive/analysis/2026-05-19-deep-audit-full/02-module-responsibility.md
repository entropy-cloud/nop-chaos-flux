# 维度 02: 模块职责与文件边界

## 第 1 轮（初审）

### [维度02-01] `shape-validation.ts` 二次聚合 traversal、host contract、deep region 与字段检查职责

- **文件**: `packages/flux-compiler/src/schema-compiler/shape-validation.ts:254-264`
- **证据片段**:
  ```ts
  function analyzeDeepSchemaField(input: {
    renderer: RendererDefinition;
    key: string;
    value: unknown;
    path: string;
    registry: RendererRegistry;
    plugins: readonly RendererPlugin[] | undefined;
    diagnostics: SchemaCompilerDiagnosticsContext;
    traversalState: ValidationTraversalState;
  ```
- **严重程度**: P0
- **现状**: 文件当前 767 行，触发 `pnpm check:oversized-code-files` hard error；在已拆出 rules/utils/host validation 后仍承载 traversal、host context、deep region 和 node field inspection。
- **风险**: schema shape validation 后续新增规则会继续回流到同一大文件，编译器规则实现与遍历编排难以独立测试。
- **建议**: 将 deep schema field validation、node field inspection 与 host boundary helpers 拆到独立模块，保留本文件为 traversal orchestrator。
- **为什么值得现在做**: 当前 hard gate 已失败，且职责混合证据明确。
- **误报排除**: 不是文件行数单独构成问题；该文件跨越多类 owner。
- **参考文档**: `docs/references/audit-tooling.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 子项复核通过

### [维度02-02] `variant-field.tsx` 同时拥有变体识别、切换 action、投影 owner、隐藏字段与渲染 shell

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:225-230`
- **证据片段**:
  ```tsx
  const [userSelectedKey, setUserSelectedKey] = React.useState<string | undefined>(undefined);
  const [detectedKey, setDetectedKey] = React.useState<string | undefined>(undefined);
  const detectRequestIdRef = React.useRef(0);
  const switchRequestIdRef = React.useRef(0);
  const detectAbortControllerRef = React.useRef<AbortController | null>(null);
  const switchAbortControllerRef = React.useRef<AbortController | null>(null);
  ```
- **严重程度**: P0
- **现状**: 文件当前 748 行，触发 hard error；单个 renderer 内混合 variant detection、async action、form/scope projection、validation owner、hidden child notification 和 JSX shell。
- **风险**: 复杂字段 owner、validation owner 与 UI selector 修改互相干扰，后续 form/validation 修复的回归面过大。
- **建议**: 提取 selection state、switch/detect action lifecycle、validation owner hook 与纯 UI 子组件。
- **为什么值得现在做**: hard gate 失败且该字段是复杂表单主路径。
- **误报排除**: 不是 widget 自包含的合理体积，文件内包含 runtime-like action lifecycle 与 validation owner registration。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/variant-field.md`
- **复核状态**: 子项复核通过

### [维度02-03] `spreadsheet-grid.tsx` 聚合 virtualization、keyboard、selection、resize dialog 与 cell rendering

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:174-189`
- **证据片段**:
  ```tsx
  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingKeyboardContextMenuRef = useRef<...>(null);
  const [resizeDialog, setResizeDialog] = useState<...>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(800);
  const keyboardCellRef = useRef<{ row: number; col: number }>(selectedCell ?? { row: 0, col: 0 });
  ```
- **严重程度**: P0
- **现状**: 文件当前 726 行，触发 hard error；grid 主文件仍同时负责 viewport、keyboard、selection/drag、resize dialog、cell/header rendering。
- **风险**: spreadsheet grid 是高交互热点，任一子系统修改都会触碰同一大组件，回归定位困难。
- **建议**: 拆出 viewport window、keyboard navigation、headers/body rendering、drag selection bridge 和 resize dialog owner。
- **为什么值得现在做**: hard gate 失败且已有部分拆分，继续按职责拆分成本可控。
- **误报排除**: 不是 raw spreadsheet grid 例外；问题是多交互 owner 混在同一文件。
- **参考文档**: `docs/architecture/report-designer/design.md`, `docs/references/audit-tooling.md`
- **复核状态**: 子项复核通过

### [维度02-04] `context-menu-operations.test.tsx` 单文件覆盖多个 spreadsheet 行为域

- **文件**: `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx:60-678`
- **证据片段**:
  ```tsx
  describe('spreadsheet context menu operations', () => {
    it('opens the shared context menu and clears the selected cell', async () => {
    it('double-clicks the fill handle to auto-fill downward using adjacent data extent', async () => {
    it('inserts a row below from the shared context menu using Excel-style directional semantics', async () => {
    it('freezes panes from the shared context menu at the selected cell', async () => {
    it('sorts the selected range ascending from the shared context menu', async () => {
    it('filters rows by the selected cell value from the shared context menu and clears the filter', async () => {
  ```
- **严重程度**: P0
- **现状**: 文件当前 787 行，触发 hard error；覆盖 clear、fill、结构变更、merge、freeze、sort/filter、resize 等多行为域。
- **风险**: 测试失败定位慢，新增 context menu 用例会继续堆叠。
- **建议**: 按 cell ops、structure ops、sort/filter、resize/keyboard 拆分，并提取 shared grid harness。
- **为什么值得现在做**: hard gate 失败，拆测试不改变生产行为。
- **误报排除**: 不是单一 smoke suite，而是多个独立命令域。
- **参考文档**: `docs/references/audit-tooling.md`
- **复核状态**: 子项复核通过

### [维度02-05] `schema-renderer.test.tsx` 混合 SchemaRenderer 多类契约

- **文件**: `packages/flux-react/src/__tests__/schema-renderer.test.tsx:41-476`
- **证据片段**:
  ```tsx
  describe('SchemaRenderer callbacks', () => {
  describe('SchemaRenderer data update', () => {
  describe('SchemaRenderer import preparation', () => {
  describe('SchemaRenderer page modalContainer', () => {
  describe('SchemaRenderer surface runtime seam', () => {
  describe('SchemaRenderer debug data gating', () => {
  ```
- **严重程度**: P0
- **现状**: 文件当前 741 行，触发 hard error；覆盖 callbacks、data update、import preparation、surface seam、debug registry、StrictMode inspectability 等多个 owner。
- **风险**: React integration 主入口测试信号互相淹没，失败归因困难。
- **建议**: 按 callbacks、imports、surfaces、debug registry 等拆分。
- **为什么值得现在做**: hard gate 失败且契约域天然可拆。
- **误报排除**: 不是一个 coherent integration suite；describe 分组已显示多个职责。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/references/audit-tooling.md`
- **复核状态**: 子项复核通过

### [维度02-06] `import-stack.test.ts` 同时覆盖 import-stack 多个 lifecycle 与解析域

- **文件**: `packages/flux-runtime/src/__tests__/import-stack.test.ts:113-713`
- **证据片段**:
  ```ts
  describe('createImportStack', () => {
    describe('push', () => {
    describe('installPrepared', () => {
    describe('pop', () => {
    describe('resolveAlias', () => {
    describe('currentBindings', () => {
    describe('preload', () => {
    describe('dispose', () => {
  ```
- **严重程度**: P0
- **现状**: 文件当前 733 行，触发 hard error；同步 prepared install、async push、rollback、alias、binding publication、preload、dispose 混在一个文件。
- **风险**: runtime import owner 边界修改时测试维护成本高。
- **建议**: 按 push、prepared、lifecycle、resolution 拆分，并提取 test support。
- **为什么值得现在做**: hard gate 失败且拆分边界清晰。
- **误报排除**: 不只是行数大，文件覆盖同步/异步两套 install 语义。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 子项复核通过

### [维度02-07] `contract-control-flow-edge-cases.test.ts` 将 action algebra 多个 operator 压入 edge-cases 文件

- **文件**: `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts:11-643`
- **证据片段**:
  ```ts
  describe('contract: result chaining in then branches', () => {
  describe('contract: onError branch result handling', () => {
  describe('contract: skipped action (when=false) branch behavior', () => {
  describe('contract: onSettled sees original triggering result', () => {
  describe('contract: parallel edge cases', () => {
  describe('contract: timeout integration with dispatcher', () => {
  describe('contract: abort/cancel via signal propagation', () => {
  ```
- **严重程度**: P0
- **现状**: 文件当前 720 行，触发 hard error；then/onError/when/onSettled/parallel/timeout/abort 等 operator 混在一个文件。
- **风险**: action control-flow 新规则会继续堆叠到 edge-case 汇总桶。
- **建议**: 按 action algebra operator 拆分测试文件。
- **为什么值得现在做**: hard gate 失败，拆分不会改变断言。
- **误报排除**: 不是单一 edge-case 主题，各 describe 对应不同 control-flow operator。
- **参考文档**: `docs/architecture/action-algebra-formal-spec.md`
- **复核状态**: 子项复核通过

### [维度02-08] `input.tsx` 聚合多类基础表单控件实现与 definitions

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:575-665`
- **证据片段**:
  ```tsx
  export const inputRendererDefinitions: RendererDefinition[] = [
    { type: 'input-text', ... },
    { type: 'select', ... },
    { type: 'textarea', ... },
    { type: 'checkbox', ... },
    { type: 'switch', ... },
    { type: 'radio-group', ... },
    { type: 'checkbox-group', ... },
    { type: 'input-number', ... },
  ```
- **严重程度**: P2
- **现状**: 文件当前 666 行 warning，包含 text/select/textarea/checkbox/switch/radio/checkbox-group/input-number、source loading、numeric stepping、definitions。
- **风险**: 基础表单控件高频修改会造成无关冲突，稍有新增即进入 hard gate。
- **建议**: 按 text、choice、number 与 definitions 拆分。
- **为什么值得现在做**: warning 已接近 hard gate，拆分边界明确。
- **误报排除**: 不是合理 orchestrator；文件包含多个完整控件实现。
- **参考文档**: `AGENTS.md`, `docs/references/audit-tooling.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

维度 02：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度02-01] 至 [维度02-07]: 保留，复核后均因当前 hard gate 失败定为 P0。
- [维度02-08]: 保留 (P2)。warning 文件存在真实职责聚合，但未达到 hard gate。

## 子项复核结论

- [维度02-01] 至 [维度02-07]: 成立 (P0)。`pnpm check:oversized-code-files` 当前失败并逐项列出这些文件。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                               | 一句话摘要                                                            |
| ----- | -------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 02-01 | P0       | `packages/flux-compiler/src/schema-compiler/shape-validation.ts`                   | schema shape validation 文件超过 hard gate 且职责二次膨胀             |
| 02-02 | P0       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`        | variant-field 单文件混合 action/validation/projection/UI 多职责       |
| 02-03 | P0       | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                          | spreadsheet grid 主文件混合多交互 owner                               |
| 02-04 | P0       | `packages/spreadsheet-renderers/src/__tests__/context-menu-operations.test.tsx`    | spreadsheet context menu 测试文件超过 hard gate 且多行为域            |
| 02-05 | P0       | `packages/flux-react/src/__tests__/schema-renderer.test.tsx`                       | SchemaRenderer 测试文件超过 hard gate 且混合多契约                    |
| 02-06 | P0       | `packages/flux-runtime/src/__tests__/import-stack.test.ts`                         | import-stack 测试文件超过 hard gate 且混合多 lifecycle 域             |
| 02-07 | P0       | `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts` | action control-flow edge cases 测试超过 hard gate 且混合多个 operator |
| 02-08 | P2       | `packages/flux-renderers-form/src/renderers/input.tsx`                             | 基础字段 renderer 桶文件接近 hard gate 且聚合多控件实现               |
