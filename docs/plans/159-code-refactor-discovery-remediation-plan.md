# 159 Code Refactor Discovery Remediation Plan

> Plan Status: in progress
> Last Reviewed: 2026-04-30
> Source: 全仓库 11 维度重构发现审计（`docs/skills/code-refactor-discovery-prompt.md`），审计结果汇总见本 plan 执行当日的 daily log
> Related: `docs/plans/158-code-quality-redundancy-and-duplication-remediation-plan.md`, `docs/plans/84-oversized-code-file-elimination-plan.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/125-flux-runtime-async-data-internal-reorganization-plan.md`

## Purpose

修复 2026-04-30 全仓库 11 维度重构发现审计中确认的结构性问题：双状态/双数据源、异步取消模式、包边界违规（158 未覆盖的实例）、目录结构归组、i18n 违规、兼容层收敛。

## Current Baseline

- 2026-04-30 执行了覆盖全部 packages 的 11 维度代码重构发现审计
- 审计发现 0 P0、7 P1、15 P2 问题
- `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 当前全部通过
- 158 计划已覆盖：重复代码消除、form-runtime 文件合并（19→5-6）、AST walker 去重、`flux-action-core→flux-compiler` 反向依赖、死代码清理
- 本计划覆盖 158 未涉及的以下领域：
  - **双状态/双数据源**（`useState` + `useEffect` 镜像 store 数据）
  - **异步取消模式**（`disposed`/`active` 布尔值 → `AbortController`/`AbortSignal`）
  - **包边界违规**（`crud-renderer→flux-runtime`、`resolveGap` 跨渲染器包、测试跨层依赖）
  - **目录结构归组**（`flux-runtime/src/` form/ 子目录、`flux-react/src/` node-renderer/ 子目录、`report-designer-renderers/src/` toolbar/bridge/ 子目录）
  - **i18n 违规**（`designer-inspector.tsx` 硬编码中文）
  - **兼容层收敛与清理**（`extractLegacyPayload`、`selection/target/selectionTarget` 三重别名）

## Goals

1. 修复 4 处 P1 级双状态/双数据源问题，消除 `useState` + `useEffect` 镜像 store 数据的同步风险
2. 将 `reaction-runtime.ts` 和相关模块的 `disposed` 布尔值迁移为 `AbortController`/`AbortSignal`
3. 修复 3 处 158 未覆盖的包边界违规
4. 将 `flux-runtime/src/` 22 个 form 文件归入 `form/` 子目录（目录归组，非文件合并）
5. 修复 `designer-inspector.tsx` 的 i18n 违规
6. 评估并收敛兼容层遗留别名（`extractLegacyPayload`、`selection/target/selectionTarget`）

## Non-Goals

- 不做 form-runtime 文件合并（19→5-6），这是 145 的已完成职责，158 的 Non-Goals 已明确排除
- 不做重复代码消除（ajax 执行去重、surface 生命周期去重、composite field 控制器去重、strip errors 等），这是 158 Phase 1 的职责
- 不做 formula AST walker 去重，这是 158 Phase 3 的职责
- 不做 `parseNamespacedAction` 统一和 `flux-action-core→flux-compiler` 反向依赖修复，这是 158 Phase 4 的职责
- 不做死代码/冗余清理，这是 158 Phase 5 的职责
- 不重构 `RendererRuntime` 接口或 `RendererDefinition` 接口
- 不重构 table/CRUD ownership 模式（`useOwnedState` 设计需独立排期）
- 不做 `runtime-factory.ts` 的 `disposed` 布尔迁移（同步 dispose 门控，当前可接受）
- 不做 `schema.ts` legacy compatibility carriers 清理（`cacheTTL`/`cacheKey`/`dedupStrategy`，下个大版本处理）
- 不做纯类型文件的行数治理（`types/compilation.ts`、`types/actions.ts` 等，纯声明性，行数来自完整类型覆盖）
- 不调整 `scope-debug.tsx` 的全量订阅（仅 debug 模式使用）
- 不调整 `designer-xyflow-canvas.tsx` 的 `localNodes`/`localEdges`（ReactFlow 交互模型要求的合理双状态）

## Scope

### In Scope

| Phase | 主题 | 影响包 | 问题等级 |
|-------|------|--------|----------|
| 1 | 异步取消模式迁移 | flux-runtime | P1 |
| 2 | 双状态/双数据源修复 | flux-renderers-form, flux-renderers-form-advanced, flux-renderers-data, flow-designer-renderers | P1/P2 |
| 3 | 包边界修复（158 未覆盖） | flux-renderers-data, flux-renderers-form, flux-compiler | P1/P2 |
| 4 | ~~目录结构归组~~ (cancelled) | ~~flux-runtime, flux-react, report-designer-renderers~~ | ~~P1/P2~~ |
| 5 | i18n 修复 | flow-designer-renderers | P1 |
| 6 | 兼容层收敛与清理 | flux-compiler, report-designer-renderers | P2 |

### Out Of Scope

- 158 已覆盖的所有工作项
- `RendererRuntime` / `RendererDefinition` 接口重构
- table/CRUD ownership 模式统一
- `designer-xyflow-canvas.tsx` 的 ReactFlow 合理双状态
- 大型测试文件拆分（可排期但不阻塞结构正确性）

**执行顺序**：Phase 4 依赖 Phase 1 和 Phase 3 完成后再执行（共享文件和 import 路径）。其余 Phase 可并行推进。

## Execution Plan

### Phase 1 - 异步取消模式迁移

Status: planned
Targets: `packages/flux-runtime/src/async-data/reaction-runtime.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`

- [ ] **P1.1** `reaction-runtime.ts` `disposed` → `AbortController`：将 `registerReaction` 中的 `let disposed = false`（line 76）替换为 `const abortController = new AbortController()`。所有 `if (disposed)` 检查改为 `if (abortController.signal.aborted)`。`dispose()` 方法调用 `abortController.abort()` 而非设置 `disposed = true`
- [ ] **P1.2** `reaction-runtime.ts` 将 `onDebugUpdate` 回调中的 `disposed` 字段改为从 `abortController.signal.aborted` 读取
- [ ] **P1.3** `reaction-runtime.ts` 第二处 `disposed`（`createRuntimeReactionRegistry` 内部，line 358）：同样迁移为 `AbortController`
- [ ] **P1.4** `source-registry.ts`（line 174-192）的 `disposed` 布尔值：同样迁移为 `AbortController`
- [ ] **P1.5** 为迁移后的取消路径增加 focused test：验证 abort 后的 reaction 不再执行副作用，pending debounce 被正确取消

Exit Criteria:

- [ ] `reaction-runtime.ts` 和 `source-registry.ts` 中不再有 `let disposed = false` 模式
- [ ] 所有异步取消通过 `AbortController.signal.aborted` 检查
- [ ] `dispose()` 方法使用 `abortController.abort()` 触发取消
- [ ] 新增至少 2 个 focused test 验证取消语义
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [ ] `docs/architecture/flux-runtime-module-boundaries.md` 已更新 async-data 模块取消机制说明
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - 双状态/双数据源修复

Status: planned
Targets: `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`, `packages/flow-designer-renderers/src/designer-page.tsx`

- [ ] **P2.1** `field-utils.tsx` `useAdaptedFieldValue`（line 210-260）：评估 `adaptedValue` useState + useEffect 的改进方案。如果 adapter 是同步的或可同步化，消除 useState 直接返回转换值。如果 adapter 必须保持异步，将 `active` 布尔值 + `seq` 计数器替换为 `AbortController`，并在 useEffect 中使用 signal 控制过期。同时评估是否可将 adapter 逻辑下沉到 runtime 层（使 store 直接持有 adapted value）
- [ ] **P2.2** `object-field.tsx` `resolvedValue`（line 120-156）：改进 transformIn 适配逻辑。当 no-op（无 transformIn）时直接使用 rawValue 而非 useState 中转。当有 transformIn 时，将 `active` 布尔值替换为 `AbortController`。评估是否可将 transform 适配逻辑下沉到 projected scope/form 层
- [ ] **P2.3** `table-quick-edit-controller.ts` `draftValue`（line 26-38）：增加对 `record.{field}` 的直接 scope 订阅（使用 `useScopeSelector`），而非仅依赖父组件 re-render 传播变更。保留 `draftValue` 作为编辑 working copy，但通过 scope 订阅检测外部修改
- [ ] **P2.4** `designer-page.tsx` `treeDocument`（line 38-42）：评估将 treeDocument 状态提升到 designer core 中管理的可行性，消除 prop-state 双写。若不可行，至少添加浅比较防止等价 prop 覆盖本地修改
- [ ] **P2.5** 为 P2.1 和 P2.2 的改进增加 focused test：验证外部 store 变更不覆盖用户正在编辑的值；验证异步 adapter 取消不产生 stale 结果

Exit Criteria:

- [ ] `field-utils.tsx` 中 `active` 布尔值已替换为 `AbortController`（或已说明同步 adapter 不需要取消）
- [ ] `object-field.tsx` 中无 transformIn 场景不再使用 useState 中转
- [ ] `table-quick-edit-controller.ts` 通过 scope 订阅检测外部修改
- [ ] `designer-page.tsx` 的 prop-state 双写风险已降低（通过浅比较或状态提升）
- [ ] 新增 focused test 验证同步/取消语义
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [ ] `docs/architecture/renderer-runtime.md` 如有涉及 field adapter 行为变更则已更新
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - 包边界修复（158 未覆盖）

Status: planned
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-form/src/renderers/form.tsx`, `packages/flux-renderers-form/src/renderers/fieldset.tsx`, `packages/flux-compiler/src/schema-compiler-registry.test.ts`

- [ ] **P3.1** `crud-renderer.tsx:6` — `import { createReadonlyScopeBinding } from '@nop-chaos/flux-runtime'`：在 `flux-react` 中增加 `useReadonlyScopeBinding` hook 或重新导出 `createReadonlyScopeBinding`，然后 `crud-renderer.tsx` 改为从 `@nop-chaos/flux-react` 导入
- [ ] **P3.2** `resolveGap` 跨渲染器包导入：将 `packages/flux-renderers-basic/src/utils.ts` 中的 `resolveGap`（7 行纯函数，零依赖）提取到 `flux-react`（或 `flux-core`，视是否有 React 依赖而定），`form.tsx:22` 和 `fieldset.tsx:4` 改为从新位置导入
- [ ] **P3.3** `schema-compiler-registry.test.ts:8` — `import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data'`：将测试所需的 renderer definitions 移到 `flux-compiler` 包内的本地 fixture/mock 中，消除编译器→渲染器的跨层依赖。确认 `@nop-chaos/flux-renderers-data` 从 `flux-compiler` 的 `package.json` 中移除（如果存在的话），或在 `package.json` 中标注为 devOnly 并确认 pnpm workspace 严格模式下不会断裂

Exit Criteria:

- [ ] `crud-renderer.tsx` 不再直接导入 `@nop-chaos/flux-runtime`，改为通过 `@nop-chaos/flux-react`
- [ ] `resolveGap` 存在于 `flux-react` 或 `flux-core`，`flux-renderers-form` 不再导入 `@nop-chaos/flux-renderers-basic`
- [ ] `schema-compiler-registry.test.ts` 不再导入 `@nop-chaos/flux-renderers-data`
- [ ] 无新增 `@nop-chaos/flux-renderers-data` 到 `flux-compiler` 的依赖声明
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [ ] `docs/architecture/flux-runtime-module-boundaries.md` 已更新包依赖关系
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - 目录结构归组

Status: cancelled
Reason: 目录归组是人类可读性优化，不改变任何架构契约或运行时行为。对 AI 驱动的开发模式而言：(1) 扁平目录结构比 barrel re-export 间接层更直接可定位；(2) 51 个文件移动 + 数百条 import 更新属于纯机械操作，工作量大但零语义收益；(3) barrel index.ts 增加每次定位实际实现的穿透成本。如果未来人类团队接手且目录浏览体验成为痛点，可单独排期。

### Phase 5 - i18n 修复

Status: planned
Targets: `packages/flow-designer-renderers/src/designer-inspector.tsx`

- [ ] **P5.1** 将 `designer-inspector.tsx` 中所有硬编码中文字符串替换为 `t('flux.flow-designer.inspector.xxx')` 调用（涉及约 24 处字符串（22 个唯一 key）："属性面板"、"分支组"、"添加分支"、"删除节点"、"流程信息"、"分支名称"、"当前分支"、"首节点"、"定位节点"、"该分支当前为空。"、"编辑节点或连线属性"、"已启用"、"个节点"、"条连线"、"当前选中"、"名称"、"描述"、"连线"、"快捷键" 等）
- [ ] **P5.2** 在 `packages/flux-i18n/` 中添加对应的翻译 key（`zh-CN` 和 `en-US`）

Exit Criteria:

- [ ] `designer-inspector.tsx` 中不再有硬编码中文字符串
- [ ] 所有用户可见文本通过 `t()` 获取
- [ ] `zh-CN` 和 `en-US` 翻译文件已更新
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [ ] `docs/architecture/renderer-runtime.md` 如有涉及 i18n 约定变更则已更新（或确认无需更新）
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 6 - 兼容层收敛与清理

Status: planned
Targets: `packages/flux-compiler/src/action-compiler.ts`, `packages/report-designer-renderers/src/host-data.ts`

- [ ] **P6.1** `extractLegacyPayload`（`action-compiler.ts:30-90`，60 行）使用频率评估：grep 全仓库确认是否有 schema 仍在使用旧式 action 语法（`action.api`、`action.dialog`、`action.drawer`、`action.value`、`action.values` 作为顶级字段而非 `action.args`）。如果使用率极低或为零，标记 `@deprecated` 并计划下个版本移除
- [ ] **P6.2** `host-data.ts` 三重别名（`selection`/`target`/`selectionTarget`，line 70-74）使用频率评估：grep 全仓库确认是否有消费者仍在使用 `selection` 或 `target`。如果是，迁移到 `selectionTarget`。如果否，直接删除别名

Exit Criteria:

- [ ] `extractLegacyPayload` 已标注 `@deprecated`（或已确认仍有广泛使用并记录评估结论）
- [ ] `host-data.ts` 的 `selection`/`target` 别名已删除（或已记录仍有消费者并保留迁移计划）
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全部通过
- [ ] `docs/architecture/flux-runtime-module-boundaries.md` 已更新兼容层清理结论
- [ ] `docs/logs/` 对应日期条目已更新

- **Phase 1 风险中等**：`reaction-runtime.ts` 是关键异步基础设施，取消模式变更可能引入新的竞态。策略：先写 focused test 覆盖现有取消行为，再迁移。每个子项独立且可逆
- **Phase 2 风险中等**：双状态修复涉及表单字段核心渲染路径。策略：每个文件独立修改，逐个验证。保留 `useEffect` 作为 fallback 直到确认新方案稳定。对涉及用户交互的改动（quick-edit、composite-field）补充 e2e 回归验证
- **Phase 4 风险中低但工作量大**：目录归组涉及大量 import 路径变更。策略：使用 IDE 的 move refactoring 功能，每个子目录归组后立即 `pnpm build && pnpm test` 验证，因为 barrel re-exports 可能掩盖过期 import 路径
- **Phase 3/5/6 风险最低**：包边界修复、i18n、兼容层评估均为局部改动

## Validation Checklist

- [ ] Phase 1-6 所有 Exit Criteria 已满足
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] 无行为变更（所有现有测试保持通过）
- [ ] 无新增 `any` 类型或 `@ts-ignore`
- [ ] 所有涉及文件变动的 `docs/architecture/` 已更新为最终设计状态
- [ ] `docs/logs/` 每个实施日均有条目
- [ ] 独立子 agent closure-audit 已完成并记录证据

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- `runtime-factory.ts` 的 `disposed` 布尔值（同步 dispose 门控）→ 当前可接受，若 dispose 需要异步步骤则迁移
- 大型测试文件拆分（`designer-command-adapter.test.ts` 538 行、`action-compiler.test.ts` 492 行）→ 独立排期
- `designer-xyflow-canvas.tsx` 的 DOM patch 和 position-merge 逻辑提取 → flow-designer 优化专项
- `runtime-factory.ts` 487 行的 API 方法定义按领域分组提取 → runtime 优化专项
- `schema.ts` legacy compatibility carriers（`cacheTTL`/`cacheKey`/`dedupStrategy`）→ 下个大版本清理
- `table-data.ts` `legacy-index` 兜底行键 → 观察是否有消费者依赖
