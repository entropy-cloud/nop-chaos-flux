# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

基线摘要：

- 本轮按 `pnpm check:oversized-code-files` 基线做复核，重点抽查了 `shape-validation.ts`、`variant-field.tsx`、`runtime-factory.ts`。
- 依照 Calibration Pattern 1，未把仅仅文件偏大但职责仍集中的 orchestrator 文件机械报缺陷；本轮保留 3 条确有边界漂移或再膨胀证据的发现。

### [维度02-01] `shape-validation.ts` 将通用 shape 校验与 renderer 专属深层 region 遍历继续绑在同一主文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler\shape-validation.ts:254-403,694-765`
- **证据片段**:

  ```ts
  if (input.renderer.type === 'table' || input.renderer.type === 'crud') {
    if (input.key === 'columns' && Array.isArray(input.value)) {
      input.value.forEach((column, index) => {
        if (!column || typeof column !== 'object' || Array.isArray(column)) {
          return;
        }

        visitNestedSchemaRegions({
  ```

- **严重程度**: P1
- **现状**: 该文件已经把 `shape-validation-rules.ts`、`shape-validation-utils.ts`、`regions.ts`、`tables.ts` 等职责拆出，但主文件仍保留 `analyzeDeepSchemaField(...)`，里面硬编码 `table/crud`、`tabs`、`variant-field` 的深层 region 遍历，再由 `analyzeSchemaInput(...)` 主递归直接调度。
- **风险**: 新增一个有深层 schema 或 region 的 renderer 时，开发者需要继续修改这个总校验器而不是扩展一个专属子模块；这会把编译期通用 shape 校验、region 递归、renderer 特例不断重新耦合，形成已拆又回流的 reinflation。
- **建议**: 把 `analyzeDeepSchemaField(...)` 抽成独立模块或注册表，例如 `deep-field-analysis.ts`，主递归只负责调度；各 renderer 类型的深层 region 规则应与 `regions.ts`、`tables.ts` 一样落到 focused helper，而不是继续扩展 `shape-validation.ts`。
- **为什么值得现在做**: 这是已跨过 `>700` 硬门槛的编译器核心文件；继续把深层字段特例加进去，会让未来每个复杂 renderer 都把 compiler 主入口再膨胀一层。
- **误报排除**: 这不是文件大所以要拆的机械结论。保留该项是因为 live code 已同时出现通用字段检查、host context 解析、renderer 特例深遍历、递归入口调度四类职责混放，且该文件已经存在过一轮拆分却仍把 renderer 特例留在主文件。
- **历史模式对应**: 对应 `docs/analysis/2026-05-17-deep-audit-full/02-module-responsibility.md` 的 `[维度02-01]`；按 `deep-audit-calibration-patterns.md` Pattern 1 复核后仍应保留。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度02-02] `variant-field.tsx` 仍把异步切换或检测、副作用注册与两套 UI 壳层渲染混在单文件主组件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:171-569,571-717`
- **证据片段**:

  ```ts
  const runDetectVariantAction = React.useCallback(async () => {
    const requestId = ++detectRequestIdRef.current;
    detectAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    detectAbortControllerRef.current = abortController;

    if (!detectVariantAction || matchedKey) {
  ```

- **严重程度**: P1
- **现状**: 同一 renderer 文件内同时承载 variant 识别 action 调度、切换时 `transformInAction` 迁移、AbortController 或请求序号并发治理、隐藏子字段通知、child contract 注册、以及 select、tabs、readOnly 三套渲染壳与 context provider 堆叠。
- **风险**: 任一修复都会跨越多条责任线；例如切换逻辑、validation owner 语义、UI selector 模式改动会相互污染，导致复合字段边界难以稳定，也会继续把后续 `object-field/array-field/variant-field` 收敛工作卡在单个超大 renderer 上。
- **建议**: 至少拆成 3 层：`useVariantDetection` 或 `useVariantSwitch` 处理异步与取消；`useVariantVisibilityAndContracts` 处理 hidden-field 与 child contract；组件文件只保留 props 解析与 select、tabs、readOnly 壳层渲染。
- **为什么值得现在做**: 该文件已是硬门槛超限项，且复合字段是当前 repo 的高活跃区域；继续在这里叠加行为，会让后续边界收敛越来越难做成小步重构。
- **误报排除**: 这不是把复杂 widget 有本地状态误判成缺陷。问题在于本文件不只是本地 UI state，而是同时拥有 runtime action 调度、validation owner 注册和显示层三种不同层级的职责。
- **历史模式对应**: 对应 `docs/analysis/2026-05-17-deep-audit-full/02-module-responsibility.md` 的 `[维度02-02]`；与 `deep-audit-calibration-patterns.md` Pattern 8 不同，本项不是单纯 renderer-local UI state，而是 owner、副作用、渲染混合。
- **参考文档**: `AGENTS.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度02-03] `runtime-factory.ts` 偏离薄装配层基线，继续内嵌模块缓存与 prepared import 预加载实现

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\runtime-factory.ts:54-82,255-326`
- **证据片段**:

  ```ts
  export function createModuleCache(): ModuleCache {
    const resolved = new Map<string, ImportedLibraryModule>();
    const pending = new Map<string, Promise<ImportedLibraryModule>>();

    return {
      get(absUrl) {
        return resolved.get(absUrl);
  ```

- **严重程度**: P2
- **现状**: owner doc 明确把 `runtime-factory.ts` 定义为 main assembly layer，但 live file 仍直接实现 `ModuleCache`，并在 `prepareSchema(...)` 中承接 prepared import 的并发去重、缓存命中、loader 调用、错误包装与静态元数据提取。
- **风险**: import 或 module 子系统会继续把行为堆到 runtime 装配入口，导致入口层重新变成什么都能放的桶文件；后续 import 生命周期或 host-loading 改动也更容易与 runtime 创建流程相互缠绕。
- **建议**: 将 `createModuleCache()` 与 prepared-import 加载或缓存流程抽到 focused import/runtime module；`runtime-factory.ts` 仅保留依赖装配、引用注入和顶层工厂拼装。
- **为什么值得现在做**: 这是 owner doc 已经写得非常明确的边界；现在不收口，后续所有 import 或 prepare 相关能力都更可能继续落在 factory 主文件里，形成入口层再膨胀。
- **误报排除**: 这不是因为 600+ 行就机械报警。保留该项是因为文档基线已明确要求非 trivial assembly code 应移动到 focused module，而当前文件内确有可独立成边界的缓存与导入预加载实现。
- **历史模式对应**: 不属于单纯 orchestrator 体量，而是与 owner doc 直接冲突的装配层泄漏。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度02-01]: 降级。`shape-validation.ts` 确有再膨胀迹象，但当前 owner doc 只明确其属于 compiler shape-validation 责任，并未把这一路径定义成必须注册表化或彻底外提；更像超大主文件上的继续集中。
- [维度02-02]: 降级。`variant-field.tsx` 的确过大且高耦合，但现行 `docs/architecture/variant-field.md` 仍把 selector、active subtree、switch logic、projected form/scope/view、parent-owned validation participation 放在该控件责任内，现状更像实现压力而非已坐实的 owner 边界违例。
- [维度02-03]: 保留 (P2)。`docs/architecture/flux-runtime-module-boundaries.md` 已明确 `runtime-factory.ts` 应保持 assembly layer，非 trivial assembly code 应移入 focused module；但 live code 仍在此实现 `createModuleCache()`，并在 `prepareSchema(...)` 中处理 prepared import 的缓存命中、pending 去重、loader 调用、错误包装与 `staticMeta` 预取。

## 子项复核结论

- [维度02-01]: 若后续要继续推进，可拆成 `analyzeDeepSchemaField(...)` 统一 dispatcher 是否可接受，以及 `table.expandable` 这类独立 special-case 是否应继续留在主文件。
- [维度02-02]: 若后续要继续推进，可拆成 async detect/switch latest-request-wins 与取消治理是否应抽成 hook/helper，以及 hidden-field 通知与 child-contract 注册是否属于可接受的 `variant-field` owner 集成责任。

## 最终保留项

| 编号  | 严重程度 | 文件                                                         | 一句话摘要                                                       |
| ----- | -------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| 02-03 | P2       | `packages/flux-runtime/src/runtime-factory.ts:54-82,255-326` | `runtime-factory.ts` 仍内嵌模块缓存与 prepared import 预加载逻辑 |
