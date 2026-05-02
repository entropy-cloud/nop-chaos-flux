# 02 模块职责与文件边界

## 复核统计

- 初审条目: 7
- 维度复核: 完成
- 子项复核: 5 条
- 保留: 4
- 降级: 3
- 驳回: 1

## 基线

- `pnpm check:oversized-code-files` 当前报错 3 个 `>700` 文件，警告 43 个 `>500` 文件。
- 本维度按仓库硬规则区分：`>700` 必须拆分，`500-700` 需评估拆分。

## 保留

### [维度02] `schema-compiler-registry.test.ts` 超过强制拆分阈值

- **文件**: `packages/flux-compiler/src/schema-compiler-registry.test.ts:150-744`
- **证据片段**:
  ```text
  [check-oversized-code-files] ERROR: 3 files exceed 700 lines (MUST split):
    - packages/flux-compiler/src/schema-compiler-registry.test.ts: 746
  ```
- **严重程度**: P1
- **现状**: 同一测试文件同时覆盖 registry、field channel、targeting、table region、CRUD alias 等多组契约。
- **风险**: 单一 mega test 持续吸入新场景，后续回归定位和拆分成本继续上升。
- **建议**: 按契约族拆成 registry / region-lowering / targeting / table / crud-transform 等子文件。
- **为什么值得现在做**: 当前脚本和 ESLint 已把它列为 must-split。
- **误报排除**: 不是单一场景矩阵；主题边界已经明显可分。
- **历史模式对应**: mega test 持续膨胀
- **参考文档**: `docs/skills/deep-audit-prompts.md`, `AGENTS.md`
- **复核状态**: `子项复核通过`

### [维度02] `schema-compiler-shape-validation.test.ts` 超过强制拆分阈值

- **文件**: `packages/flux-compiler/src/schema-compiler-shape-validation.test.ts:15-741`
- **证据片段**:
  ```text
  [check-oversized-code-files] ERROR: 3 files exceed 700 lines (MUST split):
    - packages/flux-compiler/src/schema-compiler-shape-validation.test.ts: 744
  ```
- **严重程度**: P1
- **现状**: helper、shape validation、host contract、prepare/compile 行为混在一个测试文件中。
- **风险**: 编译器不同子系统的回归会继续共享一份过大的 fixture/describe 墙。
- **建议**: 拆成 helper/plugin、shape validation、host contract、prepare/compile 四组。
- **为什么值得现在做**: 该文件已跨过仓库硬性红线。
- **误报排除**: live 复核确认当前仍超阈值，不是旧基线残留。
- **历史模式对应**: mixed diagnostics suite 膨胀
- **参考文档**: `AGENTS.md`
- **复核状态**: `子项复核通过`

### [维度02] `schema-renderer-runtime-core.test.tsx` 同时构成模块边界和测试质量问题

- **文件**: `packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx:38-741`
- **证据片段**:
  ```text
  [check-oversized-code-files] ERROR: 3 files exceed 700 lines (MUST split):
    - packages/flux-react/src/__tests__/schema-renderer-runtime-core.test.tsx: 742
  ```
  ```ts
  348:   it('reads published data-source status summaries through useDataSourceStatus', async () => {
  663:   it('skips FieldFrame when frameWrap is false', () => {
  689:   it('does not fabricate a cid for createNodeInstance when none is provided', async () => {
  ```
- **严重程度**: P1
- **现状**: import boundary、scope/data source、FieldFrame、cid/node-instance 等多个运行时域被塞进同一文件。
- **风险**: 同时放大维度 02 和维度 14 的维护成本。
- **建议**: 至少拆成 runtime-boundary、reactivity/data-source、field-frame/cid 三组。
- **为什么值得现在做**: 当前既是 must-split，也已跨域到测试质量维度。
- **误报排除**: 不是单一“runtime core”统一主题；测试主题已明显跨域。
- **历史模式对应**: broad integration suite 继续吸入 unrelated contracts
- **参考文档**: `docs/skills/deep-audit-prompts.md`
- **复核状态**: `子项复核通过`

### [维度02] `field-utils.tsx` 仍是多职责热点

- **文件**: `packages/flux-renderers-form/src/field-utils.tsx:27-500`
- **证据片段**:
  ```ts
  38: export function getFieldValidationBehavior(
  112: export function createFieldHandlers(args: {
  249: function useAdaptedFieldValue(
  406: export function useFieldPresentation(
  485: export function useHiddenFieldPolicy(name: string, hidden: boolean) {
  ```
- **严重程度**: P2
- **现状**: 验证策略、绑定、异步适配、展示派生、hidden lifecycle 被打包在一个 500+ 文件里。
- **风险**: 后续字段能力改动继续把不同 owner 边界压回一个共享文件。
- **建议**: 至少拆成 field validation policy、field binding/controller、presentation、hidden-field policy 四块。
- **为什么值得现在做**: 这是当前 `flux-renderers-form` 的高碰撞热点文件。
- **误报排除**: 不是单一 helper barrel；live code 同时包含 hooks、effect 和 async orchestration。
- **历史模式对应**: shared util file 二次膨胀
- **参考文档**: `AGENTS.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度02] `spreadsheet-toolbar.tsx` 是真实拆分候选，但不是 owner 违约

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx:45-604`
- **证据片段**:
  ```tsx
  146:   return (
  540:       {showFindReplace && (
  574:       {selectedCell && (
  ```
- **严重程度**: P2
- **现状**: 一个 600+ 行展示壳同时承载 toolbar groups、find/replace、cell/comment editor。
- **风险**: UI 维护和 review 成本持续上升。
- **建议**: 按 toolbar sections 和 editor panels 拆成子组件。
- **为什么值得现在做**: split seam 明显，且已超过 500 行软阈值。
- **误报排除**: 这是维护性问题，不是跨层 owner 泄漏。
- **历史模式对应**: monolithic UI shell 拆分
- **参考文档**: `AGENTS.md`
- **复核状态**: `子项复核通过`

### [维度02] `designer-xyflow-canvas.tsx` 仍是 500+ 的 adapter-local 混合文件

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:88-555`
- **证据片段**:
  ```tsx
  202:   useEffect(() => {
  267:   useEffect(() => {
  330:   const handleNodesChange = useCallback(
  435:   return (
  ```
- **严重程度**: P2
- **现状**: overlay、minimap DOM patch、snapshot reconciliation、callback translation 共处一文件。
- **风险**: 适配层继续膨胀为不易维护的 host shell。
- **建议**: 按 overlay / minimap / reconciliation / event bridge 四块进一步拆分。
- **为什么值得现在做**: 责任边界已足够清晰，且当前超过软阈值。
- **误报排除**: live 复核确认这些职责仍都属于 xyflow adapter owner，不是硬边界违规。
- **历史模式对应**: host canvas 适配文件混合多子层
- **参考文档**: `docs/architecture/flow-designer/canvas-adapters.md`
- **复核状态**: `已降级`

### [维度02] `runtime-factory.ts` 已回到 500+ 警戒区，但 owner doc 漂移指控不成立

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:29-520`
- **证据片段**:
  ```ts
  29: import { createActionRuntimeAdapter } from './action-adapter';
  43: import { createRuntimeOwnedFactories } from './runtime-owned-factories';
  187:   const runtimeOwnedFactories = createRuntimeOwnedFactories({
  ```
- **严重程度**: P3
- **现状**: 文件 500+，但大部分逻辑仍是 top-level composition 和 wiring。
- **风险**: 若继续往里吸代码，后续可能再次演变成 assembly hotspot。
- **建议**: 继续把新增非装配逻辑抽到 focused runtime module。
- **为什么值得现在做**: 目前更适合当观察项，而不是立即重构。
- **误报排除**: item review 驳回了“当前已明显背离 owner doc”的强结论。
- **历史模式对应**: orchestrator 文件二次回涨
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: `已降级`

## 已驳回

### [维度02] `runtime-factory` owner doc 已全面失真

- **文件**: `docs/architecture/flux-runtime-module-boundaries.md`, `packages/flux-runtime/src/runtime-factory.ts`
- **证据片段**:
  ```md
  54: - `packages/flux-runtime/src/runtime-factory.ts`
  55: - runtime assembly
  56: - top-level factory composition
  ```
- **严重程度**: P3
- **现状**: 文档并非完全失真；当前 owner map 已覆盖 `runtime-factory.ts` 和其拆分后的多个 sibling module。
- **风险**: 若继续按原 lead 追打，会把当前已同步的 owner doc误判为失效。
- **建议**: 仅把它作为 500+ 警戒观察项处理。
- **为什么值得现在做**: 防止把真实软问题错误上升为文档-代码违约。
- **误报排除**: item review 已核对 live owner doc 和 runtime imports。
- **历史模式对应**: 旧问题已部分收敛后被机械重复报告
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: `已驳回`

## 零发现

- `packages/flux-runtime/src/index.ts` 仍是薄 barrel，无额外实现泄漏。
- `packages/flux-runtime/src/form-runtime.ts` 当前更像成功拆分后的 orchestrator，而不是新热点。
- `packages/flux-formula/src/parser.ts` 虽大但仍保持单一 parser owner。

## 当前超大文件结论

- `>700` 必须拆分: `schema-compiler-registry.test.ts`, `schema-compiler-shape-validation.test.ts`, `schema-renderer-runtime-core.test.tsx`
- `500-700` 已确认值得继续拆分评估: `field-utils.tsx`, `spreadsheet-toolbar.tsx`, `designer-xyflow-canvas.tsx`
- `500-700` 当前先不报: `schema-compiler.ts`, `parser.ts`, `api-data-source-controller.ts`, `form-runtime.ts`
