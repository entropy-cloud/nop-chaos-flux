# 组件级 auto-fetch 模式全面审计与收口

> Plan Status: completed
> Last Reviewed: 2026-06-22
> Source: `docs/bugs/15-component-level-initfetch-analysis-and-fix.md`（condition-builder `source` 移除 + form `autoInit` gate 的分析报告）、live-repo 全量扫描
> Related: `docs/plans/2026-06-22-1343-1-e3-condition-builder-async-metadata-loading-plan.md`（abandoned — 触发本审计的原始 plan）、`docs/components/roadmap.md` Cross-Cutting「请求下沉」约束（本审计的执行依据）
> Mission: components-improvement
> Work Item: 独立审计（不归属任一 roadmap 工作项，是「请求必须下沉」原则的全局核查）

## Purpose

对全部已实现 renderer（`status: runtime` 的 ~55 个通用 renderer）做一次全面核查，确认是否存在**组件级挂载时自动加载数据的 schema 字段**（initFetch 等价物），确保所有数据请求路径都通过 `data-source` + action graph 下沉到请求层。本次审计由 condition-builder `source` 违规事件触发（已修复），需要确认其他组件是否有同类问题。

## Current Baseline

### 已修复的违规

- **condition-builder `source`**：已从 `ConditionBuilderSchema` 删除（`packages/flux-renderers-form-advanced/src/condition-builder/types.ts`），renderer 中的 `useConditionBuilderSource` hook 及测试已删除。决策见 `docs/bugs/15-component-level-initfetch-analysis-and-fix.md`。
- **form `initAction` 无门控**：已加 `autoInit?: boolean` gate（`packages/flux-renderers-form/src/schemas.ts:92`、`form.tsx:312`、`form-definition.ts:360`），缺省 `true` 向后兼容。

### live-repo 全量扫描结论（2026-06-22）

对全部 renderer schema 类型与 renderer 实现做了 grep + 逐文件核查。**未发现新的 mount-time auto-fetch 违规**。详细结论如下：

| 组件                                            | 字段                                           | 类型                      | 消费方式                                                                                                                             | 裁定                     |
| ----------------------------------------------- | ---------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `table`                                         | `source?: SchemaValue`                         | 表达式值绑定              | `table-renderer.tsx:160` 读 `Array.isArray(schemaProps.source)` —— 从 scope 读已解析数组（由外部 data-source 加载），**不触发 HTTP** | 🟢 SAFE                  |
| `crud`                                          | `source?: SchemaValue`                         | 表达式值绑定              | `crud-renderer.tsx:96` `normalizeCrudSourceValue(schemaProps.source)` —— 同 table，读 scope 已解析数据                               | 🟢 SAFE                  |
| `chart`                                         | `source?: SchemaValue`                         | 表达式值绑定              | `chart-renderer.tsx:102` 读 `Array.isArray(props.props.source)` —— 同 table                                                          | 🟢 SAFE                  |
| `table` column filter                           | `TableColumnFilterConfig.source?: SchemaValue` | 表达式值绑定              | 列筛选选项来源，读 scope                                                                                                             | 🟢 SAFE                  |
| `crud` column filter                            | `CrudColumnFilterConfig.source?: SchemaValue`  | 表达式值绑定              | 同上                                                                                                                                 | 🟢 SAFE                  |
| `tree` / `input-tree` / `tree-select`           | `childrenSource`                               | 用户交互驱动              | `tree-controls.tsx:50` 用户展开节点时 `refreshSource` dispatch                                                                       | 🟢 SAFE                  |
| `tree` / `input-tree` / `tree-select`           | `searchSource`                                 | 用户交互驱动              | `tree-controls.tsx:49` 用户搜索时 `refreshSource` dispatch（debounced）                                                              | 🟢 SAFE                  |
| `input-text` / `input-email` / `input-password` | `suggestSource`                                | 用户交互驱动              | `input-suggest.tsx:122` 用户输入时 `refreshSource { targetId: suggestSource }` dispatch（debounced）                                 | 🟢 SAFE                  |
| `dynamic-renderer`                              | `loadAction` + `autoLoad?: boolean`            | action graph + 门控       | `dynamic-renderer.tsx:72` `autoLoad !== false` 门控；`loadAction` 走 action graph（不是裸 api）                                      | 🟢 SAFE（已 gated）      |
| `form`                                          | `initAction` + `autoInit?: boolean`            | action graph + 门控       | `form.tsx:312` `!autoInit` 跳过；`initAction` 走 action graph                                                                        | 🟢 SAFE（已 gated）      |
| `data-source`                                   | `initFetch`                                    | 请求层自身门控            | `DataSourceController` 内部 `resolveInitFetch`，data-source 本身就是请求层                                                           | 🟢 SAFE（by definition） |
| `BaseSchema`                                    | `onMount`                                      | 通用生命周期 hook         | `node-renderer-effects.ts:99` 走 `helpers.dispatch`（action graph），不是裸 api                                                      | 🟢 SAFE（通用基础设施）  |
| `condition-builder`                             | `ConditionFormulaConfig.source`                | formula 求值上下文        | `condition-builder.tsx:103` `helpers.executeSource` 用于 formula 上下文注入，**不是 field/operator 元数据加载**                      | 🟢 SAFE（不同维度）      |
| `condition-builder`                             | `ConditionSelectField.source`                  | **声明但 runtime 不消费** | grep 零匹配 —— types.ts:80 声明了但 renderer 未消费                                                                                  | 🟡 DRIFT（见 Goals #1）  |

### 需要处理的唯一 DRIFT

`ConditionSelectField.source?: string`（`condition-builder/types.ts:80`）——这是 condition-builder 内 select 类型字段的「选项来源」声明。当前 runtime 完全不消费它（`field.source` 在 `value-input.tsx`/`field-select.tsx` 中零引用）。这属于 **声明了但设了无效** 的契约漂移，与 E0d 曾修复的 `showIf`/`selectMode`/`formulas` 三态漂移同类。

处理选项：

- **选项 A（推荐）**：从 `ConditionSelectField` 删除 `source` 字段。理由：(1) 当前 runtime 不消费；(2) condition-builder 的 select 字段选项应通过 `options` 静态声明或外部 data-source 加载后通过表达式写入 `options`；(3) 如果未来需要远程 select 选项，应走「外部 data-source 加载 options 到 scope → ConditionSelectField.options 用表达式 `${expr}` 读取」的下沉模式，而不是在字段级开 `source`。
- **选项 B**：保留 `source` 声明但补 runtime 消费。**不推荐**——这会重新引入组件级 auto-fetch 违规。

## Goals

1. **删除 `ConditionSelectField.source` 契约漂移字段**（选项 A）—— 从 `types.ts` 删除声明，更新 `condition-builder/design.md`，确认无测试/代码引用它。
2. **确认审计结论写入 owner doc** —— 在 `docs/bugs/15-component-level-initfetch-analysis-and-fix.md` 补充本次全量扫描结论表，作为后续防回归的基线参考。
3. **确认 roadmap Cross-Cutting 约束可执行** —— 验证 `roadmap.md` 与 `existing-components-improvement-roadmap.md` 的「请求下沉」约束措辞对后续新组件 plan 有足够约束力。

## Non-Goals

- 不重写已有的 safe 模式（table/crud/chart 的 `source` 表达式绑定是正确设计）。
- 不修改 `dynamic-renderer.autoLoad` 或 `form.autoInit`（已在上一轮修复中加 gate）。
- 不修改 `data-source` 的 `initFetch` 机制（它是请求层自身的门控，不是组件级违规）。
- 不修改 `BaseSchema.onMount`（通用生命周期 hook，走 action graph，是基础设施）。
- 不修改 tree `childrenSource`/`searchSource`、input `suggestSource`（用户交互驱动，正确设计）。
- 不为历史 safe 字段补 regression test（它们已有各自工作项的测试覆盖）。

## Scope

### In Scope

- 删除 `ConditionSelectField.source`（types.ts + design.md 同步）
- `docs/bugs/15-*.md` 补充全量扫描结论表
- roadmap 约束措辞核对（必要时微调）

### Out Of Scope

- 新增组件的 auto-fetch 检查（归各新组件 plan 的 Phase 1 契约审查）
- 已删除的 `ConditionBuilderSchema.source`（已收口，不重开）
- `form.autoInit` 的行为变更（已收口）

## Failure Paths

本 plan 不引入新 failure path。`ConditionSelectField.source` 删除后，如外部 schema 曾依赖该字段，runtime 行为不变（原本就不消费）。

## Test Strategy

本档选择：`should have tests`

理由：删除一个声明但 runtime 不消费的字段，不影响运行时行为；但需验证删除后 typecheck / lint / test 全绿，且无其他代码引用该字段。

## Execution Plan

### Phase 1 - 删除 ConditionSelectField.source 契约漂移字段

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`、`docs/components/condition-builder/design.md`

- Item Types: `Fix`、`Follow-up`

- [x] **Fix**：从 `ConditionSelectField` interface（`types.ts:80`）删除 `source?: string` 字段。
- [x] **Fix**：`condition-builder/design.md` §5 字段分类表如有 `source` 引用，同步删除或标注「select 字段级 source 已删除（声明但 runtime 不消费的漂移）」。（核查结果：design.md 未引用 `ConditionSelectField.source`，无需改动）
- [x] **Proof**：`pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck` 通过；`pnpm --filter @nop-chaos/flux-renderers-form-advanced lint` 通过；`pnpm --filter @nop-chaos/flux-renderers-form-advanced test -- --run` 全绿（787 tests）。
- [x] **Proof**：grep 确认 packages 内无残留引用 `ConditionSelectField.source` 或 `.source` on condition select field（排除 `ConditionFormulaConfig.source` 与 `ConditionBuilderSchema` 历史引用）。

Exit Criteria:

- [x] `ConditionSelectField.source` 从 types.ts 删除
- [x] design.md 同步（核查后确认无需改动）
- [x] form-advanced 包 typecheck/lint/test 全绿
- [x] 无残留代码引用

### Phase 2 - 审计结论文档化 + roadmap 约束核对

Status: completed
Targets: `docs/bugs/15-component-level-initfetch-analysis-and-fix.md`、`docs/components/roadmap.md`、`docs/components/existing-components-improvement-roadmap.md`、`docs/logs/2026/06-22.md`

- Item Types: `Follow-up`

- [x] **Follow-up**：在 `docs/bugs/15-component-level-initfetch-analysis-and-fix.md` 补充「全量扫描结论（2026-06-22）」段落（§6），粘贴扫描结果表，标注审计日期与范围。
- [x] **Follow-up**：核对 `roadmap.md` Cross-Cutting「请求下沉」约束措辞（Phase 0 已添加），确认措辞清晰。无微调需要。
- [x] **Follow-up**：核对 `existing-components-improvement-roadmap.md` 设计原则 §4「请求下沉」措辞，确认与新加入的 roadmap Cross-Cutting 约束一致。一致，无需改动。
- [x] **Follow-up**：`docs/logs/2026/06-22.md` 记录本审计 plan 执行。

Exit Criteria:

- [x] bugs/15 含全量扫描结论表
- [x] roadmap Cross-Cutting 约束措辞核对完毕
- [x] daily log 记录

## Draft Review Record

> 本 plan 基于 live-repo 全量扫描结论，scope 极小（删除一个 drift 字段 + 文档化审计结论）。如需独立 draft review，可在执行前由 fresh sub-agent 审核。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `ConditionSelectField.source` 契约漂移字段已删除
- [x] `docs/bugs/15-*.md` 含全量扫描结论表（作为后续防回归基线）
- [x] roadmap Cross-Cutting「请求下沉」约束措辞核对完毕
- [x] 不存在被静默降级到 deferred/follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（50/50 tasks successful）
- [x] `pnpm build`（27/27 tasks successful）
- [x] `pnpm lint`（27/27 tasks successful）
- [x] `pnpm test`（50/50 tasks successful）

## Deferred But Adjudicated

> 本 plan 预计无新增 deferred。全量扫描已确认除 `ConditionSelectField.source` 外无其他 mount-time auto-fetch 违规。

## Non-Blocking Follow-ups

- 后续新组件落地时，各组件 plan 的 Phase 1 契约审查应显式核对「请求下沉」约束（roadmap Cross-Cutting 已加该条）。
- 如未来 `ConditionSelectField` 需要远程 select 选项，应走「外部 data-source 加载 options 到 scope → `ConditionSelectField.options` 用 `${expr}` 读取」的下沉模式，不重新引入字段级 `source`。

## Closure

Status Note: 交付物全部落地并经 fresh-session 独立 closure-audit（verdict=approved，rounds=1）：`ConditionSelectField.source` drift 字段已删除且无 runtime 消费、`ConditionFormulaConfig.source` 保留（不同维度）、审计表/roadmap 约束/日志齐备；全量 `pnpm typecheck`/`build`/`lint`/`test` 全绿；无 in-scope 残留 defect 或被静默降级项。所有 Closure Gates 已 `[x]`，Plan Status → `completed`。

Closure Audit Evidence:

- Auditor / Agent: fresh general sub-agent (closure audit, independent session)
- Evidence: live-repo 独立核对（2026-06-22，rounds=1，verdict=approved）：
  1. `packages/flux-renderers-form-advanced/src/condition-builder/types.ts:77-84` `ConditionSelectField` 无 `source` 字段；`ConditionFormulaConfig.source:146` 保留（formula 上下文，不同维度）；`ConditionBuilderSchema:149-175` 无 `source`。
  2. `packages/` 全量 grep `ConditionSelectField.*source|selectField.*\.source` 零匹配；`value-input.tsx:287-318` 仅读 `field.options`/`field.multiple`/`field.placeholder`；`condition-builder.tsx:100` 读 `formulas?.source`（= 保留的 `ConditionFormulaConfig.source`，非 drift 字段）—— 无行为回归。
  3. `docs/bugs/15-component-level-initfetch-analysis-and-fix.md` §6（L126-187）含全量扫描表（6.1-6.6）；`docs/components/roadmap.md:288` Cross-Cutting 含「请求下沉」行；`existing-components-improvement-roadmap.md:26` §4 含同约束；`docs/logs/2026/06-22.md:22-29` 记录本审计执行。
  4. Deferred/Non-Blocking Follow-ups 无隐藏 live defect；两 Phase 均为 `completed`、Exit Criteria 全 `[x]`。
     Minor：executor 未补勾技术/实质性 Closure Gates（`pnpm typecheck`/`build`/`lint`/`test` + 交付物条目），不影响 substance，留给 executor 收口时补勾。

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
