# 16 Doc Code Consistency

- 深挖轮次: 1
- 深挖发现数: 4

## 第 1 轮初审

### [维度16-01] `docs/index.md` 的 authoritative routing table 被未转义管道符破坏

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\index.md:29-44`
- **代码路径**: 无
- **行号范围**: `docs/index.md:29-44`
- **证据片段**:
  ```md
  39: | 设计数据 owner、validation 与 staged/live 编辑边界，或判断 `form` / `detail-*` / `row` / `dialog` / `loop` 各自是不是独立数据域 | `docs/architecture/data-domain-owner.md` | `docs/architecture/form-validation.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/surface-owner.md` |
  40: | 从零设计 `object-field` / `variant-field` / `array-field` / `detail-view` / `table` 的统一运行时，并明确每个控件如何取值、校验、提交 | `docs/architecture/composite-value-owner-clean-slate.md` | `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/form-validation.md`, `docs/architecture/table-row-identity-and-scope-performance.md` |
  41: | 设计 field binding、`name` vs `value`、shared field schema base，或判断哪些字段属于 `props` / `meta` | `docs/architecture/field-binding-and-renderer-contract.md` | `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md` |
  42: | 设计 `form.name` / `$form` / `statusPath` / form 对外值发布边界，或判断 sibling 是否应读取 `formName.*` | `docs/architecture/form-external-publication-and-reserved-bindings.md` | `docs/architecture/data-domain-owner.md`, `docs/architecture/form-validation.md`, `docs/architecture/field-binding-and-renderer-contract.md` |
  43: | 设计多态值字段、`string | object`/`string | ActionSchema` 这类 union-like 编辑、自动识别变体，或切换不同编辑器 | `docs/architecture/variant-field.md` | `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/action-scope-and-imports.md` |
  44: | 设计对象字段、局部 subform、一个字段内部再拆多个属性编辑，或相对对象根的子字段命名 | `docs/architecture/object-field.md` | `docs/architecture/value-adaptation-and-detail-field.md`, `docs/architecture/renderer-runtime.md` |
  ```
- **严重程度**: P2
- **漂移类型**: 路由失真 / 文档格式破坏
- **文档描述**: `docs/index.md` 自称是 authoritative docs navigation baseline，Read This First 表应提供可机器和人工读取的三列路由。
- **代码现状**: 无直接代码对应；当前 Markdown 行 43 中的 `string | object` / `string | ActionSchema` 未转义，导致该行被解析成额外列，破坏 variant-field 路由。
- **风险**: 后续 agent 或脚本按 Markdown 表解析时可能读错 `variant-field` 的 read-first/then-read 路由，削弱 docs index 作为导航基线的作用。
- **建议**: 将该行中的 union 管道符转义为 `\|`，或改写成不含裸 `|` 的描述，确保表格列数与表头一致。
- **为什么值得现在做**: 修复成本极低，且 `docs/index.md` 是所有文档路由的最高优先级入口；格式错误会放大到后续所有文档/计划任务。
- **误报排除**: 这不是 draft/future doc；`docs/index.md:13-21` 明确声明其为 authoritative routing baseline。问题也不是内容偏好，而是 Markdown 表结构实际损坏。
- **历史模式对应**: 对应“active docs routing drift / owner-doc misdirection”类问题；与 calibration 中“不要用 draft/future docs 当 live contract”无关。
- **参考文档**: `docs/index.md:13-21`, `docs/references/maintenance-checklist.md:328-337`
- **复核状态**: 未复核

### [维度16-02] Plan 232 使用了 plan guide 不允许的 `in_progress` 状态值

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\plans\232-open-ended-adversarial-review-2026-05-08-remediation-plan.md:1-6`
- **代码路径**: 无
- **行号范围**: `docs/plans/232-open-ended-adversarial-review-2026-05-08-remediation-plan.md:1-6`, `docs/plans/00-plan-authoring-and-execution-guide.md:83-90`
- **证据片段**:
  ```md
  1: # 232 Open-Ended Adversarial Review 2026-05-08 Remediation Plan
  2:
  3: > Plan Status: in_progress
  4: > Last Reviewed: 2026-05-09
  5: > Source: `docs/analysis/2026-05-08-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-03.md,round-04.md}`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/renderer-runtime.md`
  ```
  ```md
  87: 每个 plan 顶部必须有：
  88:
  89: - `> Plan Status: proposed | planned | in progress | partially completed | completed | superseded | replaced | deferred | cancelled`
  90: - `> Last Reviewed: YYYY-MM-DD`
  ```
- **严重程度**: P2
- **漂移类型**: 计划状态失真 / 状态枚举不一致
- **文档描述**: plan guide 要求 plan 顶部状态只能使用固定枚举，其中进行中状态是 `in progress`（空格）。
- **代码现状**: 无直接代码对应；当前活跃 plan 232 写成 `in_progress`（下划线），不在 guide 允许列表内。
- **风险**: 依赖 `Plan Status:` 枚举做活跃计划筛选、closure audit 或状态统计的人工/脚本可能漏掉 plan 232，尤其该计划 `Last Reviewed` 为 2026-05-09，正处于活跃状态。
- **建议**: 将 `Plan Status: in_progress` 改为 `Plan Status: in progress`，并在后续活跃计划检查中将 guide 枚举作为唯一状态词表。
- **为什么值得现在做**: 该计划是当前新近活跃 remediation plan，状态枚举错误会立即影响计划队列判断；修复只需一行。
- **误报排除**: 这不是历史 completed plan 的陈旧文本，也不是 222-230 今日 closure 同步项；plan 232 是新的活跃计划，且 guide 明确给出允许枚举。
- **历史模式对应**: 对应 plan guide 的“Plan Status / slice Status / Closure Gates 文本一致性”高频漂移模式。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md:83-90`
- **复核状态**: 未复核

### [维度16-03] `renderer-runtime.md` 的 Current Hooks 清单仍遗漏 live public hooks

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\architecture\renderer-runtime.md:522-579`
- **代码路径**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\index.tsx:16-48`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks\use-form-hooks.ts:213-218`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks.ts:219-224`
- **行号范围**: `renderer-runtime.md:522-579`, `index.tsx:16-48`, `use-form-hooks.ts:213-218`, `hooks.ts:219-224`
- **证据片段**:
  ```md
  564: function useRenderFragment(): RendererHelpers['render'];
  565: function useCurrentFormModelGeneration(): number;
  566: function useCurrentValidationScope(): ValidationScopeRuntime | undefined;
  567: function useDataSourceStatus(
  568: path: string,
  569: options?: { enabled?: boolean },
  570: ): DataSourceStatusSummary | undefined;
  ```
  ```ts
  43:   useActionDispatcher,
  44:   useRenderFragment,
  45:   useCurrentFormModelGeneration,
  46:   useFormLayout,
  47:   useStrictMode,
  48: } from './hooks.js';
  ```
  ```ts
  213: export function useCurrentValidationValues<T>(
  214:   selector: (values: Record<string, unknown>) => T,
  215:   equalityFn: (a: T, b: T) => boolean = Object.is,
  216:   options?: { enabled?: boolean; path?: string; paths?: readonly string[] },
  217: ): T {
  218:   return useCurrentValidationValuesSelector(selector, equalityFn, options);
  ```
- **严重程度**: P2
- **漂移类型**: 行为不一致 / public hook surface 文档漂移
- **文档描述**: `renderer-runtime.md` 的 Current Hooks 签名块列出 React integration 的 hook surface，并在同节描述 form-specific hooks。
- **代码现状**: `@nop-chaos/flux-react` root public export 已包含 `useFormLayout` 与 `useStrictMode`；`useCurrentValidationValues` 也从 `hooks.ts`/root index 导出，并支持 path-aware options，但 signature block 与 form-specific hooks 列表没有列出它们。
- **风险**: Renderer 作者按 owner doc 开发时可能不知道已有 hook，转而通过 prop drilling、直接读 context/store 或自建上下文绕过标准 hook surface，违反 renderer-runtime 的集成口径。
- **建议**: 更新 `renderer-runtime.md` 的 Current Hooks 签名块和 form-specific hooks 段落，补齐 `useCurrentValidationValues(...)`、`useFormLayout()`、`useStrictMode()`；同时说明 `useCurrentImportFrame()` 若不是 root public export，则不要列入 public surface。
- **为什么值得现在做**: 这是 active renderer owner doc 与 live public barrel 的直接漂移；修复能减少后续 renderer 代码走非标准数据通道。
- **误报排除**: 未把 internal-only 或未 root-export 的 hook 当成 public API；只依据 `packages/flux-react/src/index.tsx` 已公开导出的 live hooks。也没有使用 draft/future docs 作为合同。
- **历史模式对应**: 对应“active docs hook/API surface drift”反复出现的维度 16 模式；plan 221 已处理部分 active-doc drift，但 live owner doc 仍与当前 public exports 不一致。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/references/maintenance-checklist.md:77-94`
- **复核状态**: 未复核

### [维度16-04] `schema-file-validator.md` 仍在当前基线段落使用已移除的 `CompiledSchemaNode` 术语

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\architecture\schema-file-validator.md:35-45`
- **代码路径**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\node-identity.ts:122-143`, `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\node-identity.ts:189-191`
- **行号范围**: `schema-file-validator.md:35-45`, `node-identity.ts:122-143`, `node-identity.ts:189-191`
- **证据片段**:
  ```md
  37: The first compiler-integrated diagnostics slice is now implemented.
  38:
  39: - `CompileSchemaOptions` now carries explicit `diagnostics` and `validation` options.
  40: - `createSchemaCompiler(...).validate(...)` reuses the same compiler-owned analysis helpers as `compile(...)`.
  41: - `validateSchema(...)` is available as a convenience adapter that builds a compiler and delegates to that same analysis path.
  42: - built-in `xui:imports` validation now runs through a namespace validator instead of falling into generic passthrough.
  43: - closed prop models can now report unknown bare keys before permissive prop lowering; namespaced passthrough remains a directional extension-channel concern rather than a current `CompiledSchemaNode` field.
  44: - renderer-owned `schemaValidator` rollout is now active for higher-value shape checks in shipped renderers such as `form` and `table`.
  ```
  ```ts
  122: export interface TemplateNode<S extends BaseSchema = BaseSchema> {
  123:   templateNodeId: TemplateNodeId;
  124:   id: string;
  125:   type: S['type'];
  126:   schema: S;
  127:   templatePath: SchemaPath;
  ```
- **严重程度**: P3
- **漂移类型**: 术语过时
- **文档描述**: 当前基线段落讨论 compiler-integrated diagnostics 已实现后的 live behavior，却仍使用 `CompiledSchemaNode` 作为“current field”的承载对象名。
- **代码现状**: 当前 core 类型使用 `TemplateNode` 与 `CompiledTemplate`；在 `packages/flux-core/src` 的当前类型面中没有 `CompiledSchemaNode` 定义。
- **风险**: 新读者会以为仍存在 `CompiledSchemaNode` 这个当前编译输出类型，继而在 compiler/runtime 文档和代码之间建立错误心智模型。
- **建议**: 将该句改成 `TemplateNode`、`CompiledTemplate root` 或更通用的 “compiled template-node field”，避免在 Current Baseline Note 中使用已移除术语。
- **为什么值得现在做**: 这是 active architecture doc 的当前基线段落，不是历史注；修复一处术语即可减少后续 compiler/schema-validator 设计沟通成本。
- **误报排除**: 没有把 “formerly exposed as ...” 这类明确历史说明当作问题；这里位于 `Current Baseline Note`，且措辞为 current implementation concern。
- **历史模式对应**: 对应 `CompiledSchemaNode` → `TemplateNode` 迁移后反复出现的术语残留模式。
- **参考文档**: `docs/references/terminology.md:44-67`, `docs/architecture/schema-file-validator.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度16-05] `flux-runtime-module-boundaries.md` 仍要求更新已不存在的 `packages/flux-runtime/src/index.test.ts`

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\architecture\flux-runtime-module-boundaries.md:353-361`
- **代码路径**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\runtime-validation.test.ts:1-9`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\validation\validators.test.ts:1-9`
- **行号范围**: `flux-runtime-module-boundaries.md:353-361`, `runtime-validation.test.ts:1-9`, `validators.test.ts:1-9`
- **证据片段**:
  ```md
  353: ## Where To Add A New Validation Rule
  355: For a new built-in sync rule:
  357: 1. Add schema extraction in `packages/flux-runtime/src/validation/rules.ts` if the rule has schema syntax.
  358: 2. Add the validator implementation in `packages/flux-runtime/src/validation/validators.ts`.
  359: 3. Add default messaging in `packages/flux-runtime/src/validation/message.ts` if needed.
  360: 4. Add focused coverage in `packages/flux-runtime/src/validation/validators.test.ts` or `packages/flux-runtime/src/validation/registry.test.ts`.
  361: 5. Add or update integration coverage in `packages/flux-runtime/src/index.test.ts` when runtime behavior changes.
  ```
  ```ts
  1: import { describe, expect, it, vi } from 'vitest';
  2: import {
  3:   createRendererRegistry,
  4:   type CompiledFormValidationModel,
  5:   type RendererEnv,
  6: } from '@nop-chaos/flux-core';
  7: import { createExpressionCompiler, createFormulaCompiler } from '@nop-chaos/flux-formula';
  8: import { createRendererRuntime } from '../index.js';
  9: import { textRenderer, env, compiledRule } from './test-fixtures.js';
  ```
- **严重程度**: P2
- **漂移类型**: 路径失效 / 测试路由漂移
- **文档描述**: 新增验证规则时，文档要求在 `packages/flux-runtime/src/index.test.ts` 增加或更新 integration coverage。
- **代码现状**: `packages/flux-runtime/src/index.test.ts` 当前不存在；runtime 集成测试已拆分到 `packages/flux-runtime/src/__tests__/...`，同步验证测试也在 `packages/flux-runtime/src/validation/*.test.ts`。
- **风险**: 维护者按 owner doc 添加测试时会走向不存在的文件，导致新测试放置位置不一致，或误以为 runtime integration coverage 仍集中在旧入口测试。
- **建议**: 将第 5 条改为指向当前 `packages/flux-runtime/src/__tests__/runtime-validation.test.ts`、`form-runtime-*` / `owner-*` 相关测试，或描述为“对应 `src/__tests__/` 下的 focused integration test”。
- **为什么值得现在做**: 这是 active architecture doc 的操作性步骤，且验证规则是高频变更面；修正能直接减少新测试路由错误。
- **误报排除**: 不是历史日志或 archive plan 的陈旧引用；该段位于当前 `flux-runtime-module-boundaries.md` 的“Where To Add A New Validation Rule”维护指引中。
- **历史模式对应**: 对应 active owner doc 中 “Current Code Anchors / test path drift” 模式。
- **参考文档**: `docs/references/maintenance-checklist.md:328-337`, `docs/plans/00-plan-authoring-and-execution-guide.md:299-306`
- **复核状态**: 未复核

### [维度16-06] `flow-designer/canvas-adapters.md` 的 Code Anchor 使用了已不匹配的大小写文件名

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\architecture\flow-designer\canvas-adapters.md:140-145`
- **代码路径**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\designer-xyflow-canvas.tsx:1-13`, `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\index.ts:1-5`
- **行号范围**: `canvas-adapters.md:140-145`, `designer-xyflow-canvas.tsx:1-13`, `index.ts:1-5`
- **证据片段**:
  ```md
  140: ## Code Anchors
  141:
  142: - `packages/flow-designer-renderers/src/canvas-bridge.tsx`
  143: - `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx`
  144: - `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`
  145: - `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`
  ```
  ```ts
  1: export {
  2:   DesignerXyflowCanvas,
  3:   type DesignerXyflowCanvasProps,
  4:   DESIGNER_PALETTE_NODE_MIME,
  5: } from './designer-xyflow-canvas.js';
  ```
- **严重程度**: P3
- **漂移类型**: 路径失效 / 大小写漂移
- **文档描述**: Flow Designer React Flow 集成的 code anchor 指向 `DesignerXyflowCanvas.tsx`。
- **代码现状**: live 文件名为 `designer-xyflow-canvas.tsx`，目录 barrel 也从 `./designer-xyflow-canvas.js` 导出。
- **风险**: 在大小写敏感环境、文档链接检查、或 agent 按路径读取时会找不到文件；Flow Designer canvas 是高频维护区，错误 anchor 会降低路由可靠性。
- **建议**: 将 anchor 改为 `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`。
- **为什么值得现在做**: 修复成本是一行，且该文档是 AGENTS routing 中 Flow Designer canvas 工作流的二级入口。
- **误报排除**: 不是 Windows 本地大小写容忍导致的假阳性；仓库路径、TS import 与 glob 结果均使用小写文件名，跨平台文档 anchor 应精确匹配 git 路径。
- **历史模式对应**: 对应 “active docs code anchor drift / case-sensitive path drift” 模式。
- **参考文档**: `AGENTS.md:70`, `docs/index.md:53`, `docs/references/maintenance-checklist.md:328-337`
- **复核状态**: 未复核

### [维度16-07] `performance-design-requirements.md` 的 P7 仍链接已移入 archive 的计划路径

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\architecture\performance-design-requirements.md:88-102`
- **代码路径**: 无
- **行号范围**: `performance-design-requirements.md:88-102`; live 文件实际位于 `C:\can\nop\nop-chaos-flux\docs\archive\plans\90-form-store-per-path-subscription-plan.md` 与 `C:\can\nop\nop-chaos-flux\docs\archive\plans\91-form-field-state-normalization-refactor-plan.md`
- **证据片段**:
  ```md
  88: ## P7. Field-state hooks must use per-path subscription, not full-store broadcast
  90: - Any React hook that reads per-field state (errors, touched, validating, dirty,
  91: visited) MUST subscribe via `FormStoreApi.subscribeToPath(path, listener)`, not via
  92: the full-store `subscribe` broadcast.
  98: - Rationale: in a 1 000-field form, a single keystroke that updates one field must wake
  99: only the hook(s) subscribed to that field - O(1) wake-ups, not O(n).
  100: - See `docs/plans/90-form-store-per-path-subscription-plan.md` for the per-path subscription
  101: implementation plan and `docs/plans/91-form-field-state-normalization-refactor-plan.md`
  102: for the unified `fieldStates` map refactor.
  ```
- **严重程度**: P3
- **漂移类型**: 路径失效 / active doc 引用 archive 漂移
- **文档描述**: 当前 performance requirements 文档要求读者查看 `docs/plans/90...` 与 `docs/plans/91...`。
- **代码现状**: 这两个路径在 `docs/plans/` 下不存在；当前仓库中对应文件位于 `docs/archive/plans/`。
- **风险**: 读者追溯 P7 per-path subscription 背景时会遇到断链，误以为实现计划丢失；自动链接检查也会把 active architecture doc 标为不一致。
- **建议**: 将链接改为 `docs/archive/plans/...`，或改写为“historical implementation notes under `docs/archive/plans/`”，避免把 archive 计划伪装成活跃计划。
- **为什么值得现在做**: P7 是 mandatory performance requirement；断链会影响后续响应式订阅审计和性能回归排查。
- **误报排除**: 不是要求 archive plan 重新成为 active contract；问题仅是 active architecture doc 的引用路径不再存在。
- **历史模式对应**: 对应 “active architecture doc references moved/archived plan path” 模式。
- **参考文档**: `docs/index.md:10-11`, `docs/references/maintenance-checklist.md:21-25`
- **复核状态**: 未复核

### [维度16-08] Plan 132 使用了 guide 不允许的带括号 `completed (core scope)` 状态

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\plans\132-runtime-schema-dependency-elimination-plan.md:1-6`
- **代码路径**: 无
- **行号范围**: `132-runtime-schema-dependency-elimination-plan.md:1-6`, `00-plan-authoring-and-execution-guide.md:83-90`
- **证据片段**:
  ```md
  1: # 132 Runtime Schema Dependency Elimination Plan
  2:
  3: > Plan Status: completed (core scope)
  4: > Last Reviewed: 2026-04-23
  5: > Source: `docs/logs/2026/04-23.md`, investigation of runtime schema usage
  6: > Related: 131-static-analysis-optimization-plan.md
  ```
  ```md
  87: 每个 plan 顶部必须有：
  88:
  89: - `> Plan Status: proposed | planned | in progress | partially completed | completed | superseded | replaced | deferred | cancelled`
  90: - `> Last Reviewed: YYYY-MM-DD`
  ```
- **严重程度**: P2
- **漂移类型**: 计划状态失真 / 状态枚举不一致
- **文档描述**: plan guide 要求 `Plan Status` 使用固定枚举；部分完成或范围内完成应通过 `partially completed`、scope change、closure note 或 successor ownership 表达。
- **代码现状**: 无直接代码对应；Plan 132 当前状态写成 `completed (core scope)`，不在允许枚举内。
- **风险**: 依赖固定状态值筛选 completed / active / partial plans 的人工或脚本会误判该计划；括号限定还可能掩盖 “core scope 完成但非 core scope 是否已移出计划” 的 closure 裁定。
- **建议**: 将顶部状态改为允许枚举之一；如果确实只有 core scope 关闭，应使用 `partially completed` 或在 Closure / Deferred But Adjudicated 中明确剩余 scope 的 successor / descoped 依据。
- **为什么值得现在做**: 这是 `docs/plans/` 当前目录内的计划文件，不是 archive；状态枚举错误会干扰计划队列和 closure audit。
- **误报排除**: 不是对历史计划内容正确性的重审；仅报告当前 plan 文件违反 active guide 的机器可读状态枚举。
- **历史模式对应**: 对应 plan guide 中 “Plan Status / slice Status / Closure Gates 文本一致性” 高频漂移模式。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md:83-90`, `docs/plans/00-plan-authoring-and-execution-guide.md:316-329`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度16-09] Plan 233 仍标 `planned`，但 live working tree 已部分落地其 Phase 1/2 类型与 renderer 定义变更

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\plans\233-lazy-eval-field-rule-plan.md:3-19`, `:52-66`, `:68-83`
- **代码路径**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\node-identity.ts:122-135`, `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\schema.ts:84-89`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\basic-renderer-definitions.ts:76-84`, `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler\node-compiler.ts:354-363`
- **行号范围**: `233-lazy-eval-field-rule-plan.md:3-19,52-83`; `node-identity.ts:122-135`; `schema.ts:84-89`; `basic-renderer-definitions.ts:76-84`; `node-compiler.ts:354-363`
- **证据片段**:
  ```md
  3: > Plan Status: planned
  ...
  14: - `SchemaFieldRule` already has `allowSource`, `params`, `isolate` as declaration-driven mechanisms for different compilation strategies.
  15: - `itemData` is declared as `{ key: 'itemData', kind: 'prop' }` in loop/recurse renderer definitions.
  17: - The compiled result is stored on `TemplateNode.structuralItemData` as a single typed field.
  ```
  ```md
  59: - [ ] Add `lazyEval?: boolean` property to `SchemaFieldRule` in `schema.ts`
  60: - [ ] Rename `TemplateNode.structuralItemData` to `structuralFields` with type `Record<string, CompiledRuntimeValue<unknown>>` in `node-identity.ts`
  ...
  76: - [ ] Change loop and recurse renderer field definitions from `{ key: 'itemData', kind: 'prop' }` to `{ key: 'itemData', kind: 'prop', lazyEval: true }`
  ```
  ```ts
  133:   structuralWhen?: CompiledRuntimeValue<boolean | unknown>;
  134:   structuralFields?: Readonly<Record<string, CompiledRuntimeValue<unknown>>>;
  ```
  ```ts
  84:    * When true, the field is compiled into `TemplateNode.structuralFields`
  89:   lazyEval?: boolean;
  ```
  ```ts
  82:       { key: 'itemData', kind: 'prop', lazyEval: true },
  ```
  ```ts
  359:       propsProgram,
  360:       metaProgram,
  361:       structuralWhen,
  362:       structuralItemData,
  363:       eventPlans,
  ```
- **严重程度**: P2
- **漂移类型**: 计划状态失真 / plan baseline 与 live code 漂移
- **文档描述**: Plan 233 仍是 `planned`，并把 `lazyEval`、`structuralFields`、renderer field 更新列为未完成事项；Current Baseline 也仍说 `structuralItemData` 是当前存储字段。
- **代码现状**: working tree 中 `SchemaFieldRule.lazyEval`、`TemplateNode.structuralFields`、loop/recurse `itemData lazyEval` 已经出现；同时 compiler / runtime / renderer consumer 仍有 `structuralItemData` 引用，说明计划已进入部分落地而非 planned baseline。
- **风险**: 后续执行者按计划会重复处理已落地项，或忽略当前半迁移状态；更重要的是 checklist 未同步会掩盖 “type surface 已改、compiler/consumer 未完全改” 的真实剩余工作。
- **建议**: 将 Plan 233 状态改为 `in progress`，立即勾选或重写已落地 items，并把 Current Baseline 改成当前半迁移事实；剩余项保留为明确待修复 checklist。
- **为什么值得现在做**: 这是当前 active plan 与 live working tree 的直接漂移；不及时同步会影响正在执行的 plan 233 后续判断。
- **误报排除**: 这不是 archive plan；文件位于 active `docs/plans/` 且 `Last Reviewed: 2026-05-09`。plan guide 明确要求执行后同步 slice/checklist，不能让 `planned` 掩盖已发生的 live repo 变更。
- **历史模式对应**: plan status/checklist 未随 live partial implementation 更新，属于 plan guide closure/audit 高频漂移。
- **参考文档**: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/references/maintenance-checklist.md`
- **复核状态**: 未复核

### [维度16-10] `static-analysis.md` 把 `computeStaticAnalysis()` 归属到错误文件

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\architecture\static-analysis.md:103-108`
- **代码路径**: `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler.ts:25-30`, `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler\static-analysis.ts:51-110`
- **行号范围**: `static-analysis.md:103-108`; `schema-compiler.ts:25-30`; `static-analysis.ts:51-110`
- **证据片段**:
  ```md
  103: ## Related Files
  105: - `packages/flux-core/src/types/renderer-core.ts` - `RendererDefinition.staticCapable`
  106: - `packages/flux-core/src/types/node-identity.ts` - `StaticAnalysisResult`, `TemplateNode.staticAnalysis`
  107: - `packages/flux-compiler/src/schema-compiler.ts` - `computeStaticAnalysis()`
  108: - `packages/flux-compiler/src/schema-compiler-static-analysis.test.ts` - Unit tests
  ```
  ```ts
  25: import {
  26:   createSchemaCompilerDiagnosticsContext,
  27: } from './schema-compiler/diagnostics.js';
  28: import { createBaseCompileSymbolTable } from './compile-symbol-table.js';
  29: import { createCompileSingleNode } from './schema-compiler/node-compiler.js';
  30: import { createValidateSchemaInput } from './schema-compiler/validation-compiler.js';
  ```
  ```ts
  51: export function computeStaticAnalysis(
  52:   node: TemplateNode,
  53:   schema: BaseSchema,
  54: ): StaticAnalysisResult {
  ...
  110:   return { isStaticContent: true, dependencies: [] };
  ```
- **严重程度**: P3
- **漂移类型**: 路径/符号归属失真
- **文档描述**: Related Files 指向 `packages/flux-compiler/src/schema-compiler.ts` 作为 `computeStaticAnalysis()` 所在文件。
- **代码现状**: `computeStaticAnalysis()` 实际定义在 `packages/flux-compiler/src/schema-compiler/static-analysis.ts`；顶层 `schema-compiler.ts` 只是 compiler assembly，不包含该函数。
- **风险**: 维护者或 agent 按 active architecture doc 定位 static analysis owner 时会读错文件，尤其 Plan 233 等正在修改 `static-analysis.ts` 相邻 compiler 逻辑时容易漏掉真实 owner 模块。
- **建议**: 将 Related Files 第 107 行改为 `packages/flux-compiler/src/schema-compiler/static-analysis.ts`，必要时保留 `schema-compiler.ts` 作为 compile entry/assembly anchor。
- **为什么值得现在做**: 修复是一行 active doc anchor 更新，可避免后续 compiler/static-analysis 修改读错 owner 文件。
- **误报排除**: 不是历史计划或日志断链；`static-analysis.md` 是 active architecture doc，且该段明确是当前 Related Files。
- **历史模式对应**: active architecture doc 的 code anchor/path drift。
- **参考文档**: `docs/references/maintenance-checklist.md`, `docs/architecture/static-analysis.md`
- **复核状态**: 未复核

### [维度16-11] AGENTS 的 Report/Spreadsheet 路由把 future draft 当成常规 operational follow-up

- **文档路径**: `C:\can\nop\nop-chaos-flux\AGENTS.md:63-77`
- **代码路径**: `C:\can\nop\nop-chaos-flux\docs\architecture\report-designer\contracts.md:1-13`, `C:\can\nop\nop-chaos-flux\docs\index.md:64-66`
- **行号范围**: `AGENTS.md:63-77`; `contracts.md:1-13`; `docs/index.md:64-66`
- **证据片段**:
  ```md
  70: | Work on Flow Designer canvas, nodes, edges, or interactions | `docs/architecture/flow-designer/design.md` | `docs/architecture/flow-designer/collaboration.md`, `docs/architecture/flow-designer/canvas-adapters.md` |
  71: | Work on Report Designer or Spreadsheet Editor | `docs/architecture/report-designer/design.md` | `docs/architecture/report-designer/contracts.md` |
  ```
  ```md
  1: # Report Designer Contract Draft
  3: > Status: future contract draft
  5: 本文档把 `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/config-schema.md` 和 `docs/architecture/report-designer/api.md` 中的抽象设计，收敛为更接近未来 TypeScript 实现的接口草案。
  7: 它不是当前代码镜像，而是 future contract draft。
  13: 当前 live renderer contract 不由本文件拥有；单 renderer contract 仍以 `docs/components/report-designer-page/design.md` 和 live code 为准。
  ```
  ```md
  64: | 了解基于 SchemaRenderer 的报表设计器与 spreadsheet editor 规划架构 | `docs/architecture/report-designer/README.md` | `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/config-schema.md` |
  65: | Design or update the `report-designer-page` renderer contract | `docs/components/report-designer-page/design.md` | `docs/architecture/report-designer/README.md`, `docs/architecture/report-designer/design.md` |
  66: | Design or update the `spreadsheet-page` renderer contract | `docs/components/spreadsheet-page/design.md` | `docs/architecture/report-designer/README.md`, `docs/architecture/report-designer/design.md` |
  ```
- **严重程度**: P2
- **漂移类型**: AGENTS routing / draft-doc precedence 漂移
- **文档描述**: AGENTS 把 Report Designer / Spreadsheet Editor 的 then-read 直接指向 `contracts.md`。
- **代码现状**: `contracts.md` 自声明为 `future contract draft`，且明确不是当前代码镜像、不拥有 live renderer contract；`docs/index.md` 对同类任务没有把该 draft 放入常规 follow-up，而是路由到 README/design/config-schema 或具体 component design。
- **风险**: agent 执行 Report/Spreadsheet 代码任务时可能把 future draft 接口当作当前约束，产生误报或按未来接口改 live code；这正命中 calibration pattern “Draft Docs Used As If They Were Current Contracts”。
- **建议**: 将 AGENTS 该行 then-read 改为 `docs/architecture/report-designer/README.md`, `design.md`, `config-schema.md`，仅在“review future package/API target”时再显式附加 `contracts.md`。
- **为什么值得现在做**: AGENTS 是 agent 入口路由，错误路由会被每次 Report/Spreadsheet 任务重复放大。
- **误报排除**: 不是要求删除 future draft；问题是 operational routing 未标注 draft 性质，和 `docs/index.md` 的 authoritative routing subset 不一致。
- **历史模式对应**: draft/future doc 被当作 active operational contract 的高误报源，需在 routing 层隔离。
- **参考文档**: `docs/index.md`, `docs/references/deep-audit-calibration-patterns.md`, `docs/architecture/report-designer/contracts.md`
- **复核状态**: 未复核

### [维度16-12] `frontend-baseline.md` 的 root scripts 清单遗漏当前 `check` / e2e / src-artifact 等关键脚本

- **文档路径**: `C:\can\nop\nop-chaos-flux\docs\architecture\frontend-baseline.md:29-38`, `:107-125`
- **代码路径**: `C:\can\nop\nop-chaos-flux\package.json:5-45`
- **行号范围**: `frontend-baseline.md:29-38,107-125`; `package.json:5-45`
- **证据片段**:
  ```md
  29: Root scripts in `package.json`:
  31: - `pnpm dev`
  32: - `pnpm build`
  33: - `pnpm typecheck`
  34: - `pnpm test`
  35: - `pnpm lint`
  36: - `pnpm analyze`
  37: - `pnpm check:react19`
  ```
  ```json
  5:   "scripts": {
  6:     "dev": "turbo run dev --filter=@nop-chaos/flux-playground",
  8:     "check": "pnpm check:react19 && pnpm check:src-artifacts && pnpm check:oversized-code-files && pnpm check:active-doc-code-anchors && pnpm check:package-css-exports && pnpm check:i18n-keys && pnpm check:workspace-manifest-deps && pnpm check:audit-suspects",
  20:     "test": "turbo run test --concurrency=2",
  21:     "test:e2e": "playwright test",
  23:     "check:react19": "node scripts/check-react19-legacy-apis.mjs",
  24:     "check:oversized-code-files": "node scripts/check-oversized-code-files.mjs",
  25:     "check:active-doc-code-anchors": "node scripts/check-active-doc-code-anchors.mjs",
  28:     "check:src-artifacts": "node scripts/verify-no-src-artifacts.mjs",
  ```
  ```md
  117: Additional audit-oriented tooling now tracked at the root:
  119: - `pnpm audit:deps` - dependency-cruiser baseline for circulars and cross-package internal source imports
  120: - `pnpm audit:knip` - repo-wide unused file/export/dependency scan baseline
  123: - `pnpm audit:mutants` - Stryker mutation-test entry point for the current `flux-runtime/src/validation` pilot using an isolated Vitest config
  124: - `pnpm audit:semgrep` - local Semgrep rule entry point when the host Python environment supports Semgrep installation
  ```
- **严重程度**: P3
- **漂移类型**: tooling baseline 文档漂移
- **文档描述**: `frontend-baseline.md` 以 “Root scripts in package.json” 列出 root scripts，并单列 audit tooling。
- **代码现状**: root `package.json` 已有聚合 `pnpm check` 以及多个强制/半强制检查脚本（active doc anchors、src artifacts、oversized files、package CSS exports、i18n keys、workspace manifest deps、audit suspects）和 e2e 脚本，但 baseline 文档没有同步。
- **风险**: 维护 workspace/tooling baseline 时，读者会低估当前 fail-fast 检查面，尤其 `check:active-doc-code-anchors` 已进入 `check`/`lint` 但 active baseline 没有提到，会削弱文档维护与 CI 预期的一致性。
- **建议**: 更新 Root scripts 与 Tooling/Quality Gates 段落，至少补充 `pnpm check` 及其关键组成项，并明确哪些是常规 verification、哪些是 audit-only。
- **为什么值得现在做**: root script/check 面是开发验证入口，文档滞后会影响 agent 和开发者选择正确命令。
- **误报排除**: 这不是要求列出每个 npm 脚本的审美问题；`frontend-baseline.md` 是 workspace/tooling baseline owner doc，maintenance-checklist 明确 root script / tooling baseline 变化应 review 该文档。
- **历史模式对应**: tooling baseline active doc 与 root package script surface 漂移。
- **参考文档**: `docs/references/maintenance-checklist.md`, `docs/architecture/frontend-baseline.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的问题。深挖结束。
