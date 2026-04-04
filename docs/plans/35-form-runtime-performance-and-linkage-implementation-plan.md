# 35 Form Runtime 性能与联动能力实施计划

> Plan Status: planned
> Last Reviewed: 2026-04-04; audited against codebase on 2026-04-04
> Source: `docs/analysis/formily-vs-flux-final-report.md` reviewed against current code anchors on 2026-04-04

## 复审结论

- `docs/analysis/formily-vs-flux-final-report.md` 已经收敛成 Formily 对 Flux 的唯一对比入口，并且已经把实现边界收窄到“表单子域内的薄能力”，不再主张引入 Proxy 响应式、重量级字段类体系、通用 effect runtime 或全局事务系统。
- 对当前仓库最值得执行的改进项，已经可以明确拆成 8 条：延迟 `validating/submitting` 状态标志、路径缓存与预解析、轻量字段图 / 查询接口、Validation 写回合并提交、Action 链表单写入收敛、数组热路径优化、受限声明式联动模型、字段 presentation 派生快照。
- 这份计划的目标不是一次性完成所有长期演进，而是把上述建议转成分阶段、可验证、与当前架构 guardrail 一致的执行路线。

## 与现有计划的关系

- `docs/plans/03-form-validation-completion-plan.md` 和 `docs/plans/04-form-validation-improvement-execution-plan.md` 聚焦的是 validation correctness 和能力补全；本计划不重开基础验证架构，而是在现有 validation 基线上做运行时性能和结构能力增强。
- `docs/plans/09-form-validation-lowcode-integrated-refactor-roadmap.md` 是长期 validation 路线图，其中大量内容已 deferred；本计划只抽取其中当前最值得执行、且与 Formily 对比结论一致的局部切片，不重启大规模 validation 重构。
- `docs/plans/21-node-renderer-selective-subscription-plan.md` 已完成 `NodeRenderer` 的 selector 化；本计划不会把系统退回 Proxy 自动追踪，而是把“更细 selector / 更少派生传播”作为后续更窄的长期方向。

## Problem

当前 Flux 的 compile-first 主架构是正确的，但在复杂表单场景里还存在 8 类具体缺口，影响交互体验、可维护性和热路径成本。

- `packages/flux-runtime/src/form-runtime-validation.ts` 与 `packages/flux-runtime/src/form-store.ts` 中，validation 写回仍偏碎片化；一次字段校验或 dependent revalidation 会产生多次 store 提交。
- `packages/flux-runtime/src/action-runtime.ts` 中，action 与 `then` 链会顺序触发多个 `setValue` / 派生校验路径；每次 `setValue` 又各自触发 `form-runtime.ts` 内部的重校验逻辑，单次交互容易被拆成多轮传播。
- `packages/flux-core/src/utils/path.ts`、`packages/flux-runtime/src/scope.ts`、`packages/flux-runtime/src/form-store.ts` 当前仍大量即时 `parsePath()`，没有共享缓存与编译期预解析路径片段。
- `packages/flux-runtime/src/form-runtime-array.ts` 已有数组字段状态重映射，但数组值更新、初始状态映射、validation run 映射、局部引用稳定性还没有形成更明确的 mutation plan。
- `packages/flux-runtime/src/form-runtime.ts` 与 `packages/flux-runtime/src/form-runtime-validation.ts` 中，`submitting` / `validating` 仍偏即时置真，短请求和短校验会出现 UI 闪烁。
- `packages/flux-renderers-form/src/field-utils.tsx` 当前已经有 `useFieldPresentation()`，但字段展示态仍分散在 hooks 和 helper 中，缺少更稳定、可复用的局部派生快照边界。
- 当前 `FormRuntime` 没有轻量只读字段图 / 查询 facade；验证、运行时注册、复杂字段协作、联动和调试都还在消费分散结构。
- 当前联动主要散落在表达式里，还没有一套受限、可编译、可分析、明确排除 Formily `x-reactions` 隐式复杂度的声明式联动模型。

## Root Cause

- Flux 的核心优化已优先投入到编译主干、静态快路径、表达式引用复用、selector 订阅和 action pipeline；表单运行时结构能力仍偏“能用且正确”，还未充分针对超大表单和复杂联动进行第二轮收口。
- 当前表单状态、校验状态、runtime registration、validation model 和字段展示态各自都合理，但它们之间仍缺少几个足够薄、足够稳定的中间层：字段查询 facade、局部派生快照、显式写入收敛原语。
- Formily 提供了表单运行时经验，但它的很多能力依赖 Proxy 响应式、Field 对象图和 `x-reactions` 运行时语境；Flux 不能照搬，只能做架构兼容的改写版，这也使得直接执行需要更细的计划约束。

## Goals

- 在不破坏 Flux `compile once + explicit selector subscription + identity reuse` 主干的前提下，降低复杂表单的传播成本和维护成本。
- 为表单子域补上必要但克制的结构能力：字段查询 facade、局部展示态派生、局部写入收敛、数组 mutation plan。
- 把联动能力从分散表达式，推进到“受限、可分析、可编译”的声明式模型，同时明确排除 Formily `x-reactions` 中高复杂度的隐式运行时能力。
- 保持实现边界清晰：不引入平台级统一字段对象模型，不引入全局事务系统，不引入第二套通用 effect runtime，不引入完备依赖分析引擎。

## Non-Goals

- 不把 Flux 改造成 Formily 式 Proxy 响应式系统。
- 不引入 `Field` / `ArrayField` / `VoidField` 重量级类实例树。
- 不建设平台级统一字段对象模型，要求页面、设计器、报表等非表单子域都迁移到同一抽象。
- 不把 Validation 写回合并提交或 Action 链表单写入收敛做成全局事务系统。
- 不引入通用 effect runtime、隐式 scope variable 注入或任意 reaction 脚本。
- 不以完备依赖图或完整静态分析作为前置目标。

## Scope

- `docs/analysis/formily-vs-flux-final-report.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/renderer-runtime.md`
- `docs/logs/2026/04-04.md`
- `packages/flux-core/src/utils/path.ts`
- `packages/flux-core/src/types/runtime.ts`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-runtime/src/form-store.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-array.ts`
- `packages/flux-runtime/src/form-runtime-registration.ts`
- `packages/flux-runtime/src/form-runtime-state.ts`
- `packages/flux-runtime/src/form-runtime-subtree.ts`
- `packages/flux-runtime/src/form-runtime-types.ts`
- `packages/flux-runtime/src/validation-runtime.ts`
- `packages/flux-runtime/src/validation/` (errors, index, message, registry, rules, validators)
- `packages/flux-runtime/src/scope.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/form-state.ts`
- `packages/flux-renderers-form/src/field-utils.tsx`
- 相关分包测试文件

## 不在 Scope 内的事项

- 平台级表单对象图重写
- 全局事务系统或统一 runtime commit coordinator
- Proxy 自动依赖收集
- Formily 式 `x-reactions` 运行时复制
- 页面、设计器、报表等非表单子域的统一重构
- 大规模 `NodeRenderer` / React context 结构重写

## Execution Plan

**Phase 0 — 文档冻结、profile 基线与执行约束校准**

Targets: `docs/analysis/formily-vs-flux-final-report.md`, `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/action-runtime.ts`, local profiling notes/tests

- 补一轮计划相关的文档边界说明，确保后续实施统一使用本计划中的术语：
  - `Validation 写回合并提交`
  - `Action 链表单写入收敛`
  - `轻量字段图 / 查询接口`
  - `字段 presentation 派生快照`
- 为 validation 写回与 action 链写入两个热点做最小 profile 基线。
- 记录至少以下指标：
  - 单次交互内 `FormStore` `setState()` 次数
  - validation 过程中 `revalidateDependents()` 触发次数
  - 相关 selector / subscriber 触发次数
  - 常见场景下 renderer 重渲染数量
- 产出一个明确结论：瓶颈主要来自 store 提交次数、派生传播次数，还是两者都有。
- 不在此阶段引入任何新抽象；只建立测量基线和名词一致性。

Exit criteria: 有一份简短但可复用的 profile 记录，足以指导后续是优先做提交合并、派生触发去重，还是两者都做。

**Phase 1 — 延迟 `validating/submitting` 状态标志**

Targets: `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-core/src/types/runtime.ts` if needed, relevant tests under `packages/flux-runtime/src/*.test.ts`

- 给 `validating[path]` 和 `submitting` 增加延迟置真阈值。
- 保持最终回落到 `false` 的行为立即且确定。
- 确保与现有 debounce、cancel、stale-run cancellation 协同，不引入“状态永远不回落”或“延迟错位”问题。
- 新增测试覆盖：
  - 短 async validation 不显示 validating
  - 长 async validation 会显示 validating
  - 短 submit 不显示提交 loading
  - 长 submit 会显示 submitting 且完成后及时回落

Exit criteria: 短请求/短校验不再产生 UI 闪烁，原有 async 语义和取消语义保持一致。

**Phase 2 — 路径缓存与预解析**

Targets: `packages/flux-core/src/utils/path.ts`, `packages/flux-runtime/src/scope.ts`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/schema-compiler.ts`, related tests

- 给 `parsePath()` 引入共享缓存。
- 审查 `getIn()`、`setIn()`、`resolveScopePath()`、`hasScopePath()` 的调用方式，补一个接受预解析 `segments` 的窄 API 或内部共享辅助函数。
- 对编译期已知路径预解析为 `segments`，优先挂在适合的编译产物或热路径辅助结构上，而不是创造新的大一统对象模型。
- 保持现有 path 语义兼容，包括 bracket index 规范化。
- 针对热路径增加测试或 micro assertions：
  - path 解析结果正确
  - 缓存不改变语义
  - 典型重复路径访问在逻辑上确实复用解析结果

Exit criteria: 热路径不再对相同 path 重复执行完全相同的字符串解析工作，且 path 语义零回归。

**Phase 3 — 轻量字段图 / 查询接口**

Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-registration.ts`, `packages/flux-runtime/src/schema-compiler.ts`, possibly `packages/flux-runtime/src/validation/*`, related tests/docs

- 在 `FormRuntime` 范围内新增只读查询 facade。
- 第一版只覆盖已确认的场景：
  - `getField(path)`
  - `getDependents(path)`
  - `findByPrefix(path)`
  - 必要时 `getChildren(path)`
- 数据来源可以组合编译产物、validation model、runtime registration，但不要生成平台级统一总图。
- 新接口应明确只服务表单子域，避免其他子域被迫迁移到同一模型。
- 确保复杂字段、dependent revalidation、调试辅助和后续联动模型都能消费这一薄 facade。

Exit criteria: 表单子域获得统一的只读字段查询入口，且实现仍然保持轻量 facade，而不是新的中心对象模型。

**Phase 4 — Validation 写回合并提交**

Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime.ts`, related tests

- 基于 Phase 0 的 profile 结果决定优先策略。
- 如果瓶颈主要在 store 提交次数：
  - 为 `FormStore` 增加显式 patch/commit 或等价局部合并写回能力。
  - 把 validation 流程里的 `errors/validating/touched` 等更新收敛到更少次数的提交。
- 如果瓶颈更多在派生传播次数：
  - 优先减少 `revalidateDependents()` 或相关派生逻辑的重复触发，再决定是否仍需要 patch/commit。
- 保持以下边界：
  - 不改变校验顺序
  - 不改变错误聚合语义
  - 不影响 stale-run cancellation
  - 不引入全局事务模型

Exit criteria: validation 路径中的多次碎片化写回明显减少，或等价地派生传播次数明显下降，且行为语义完全兼容。

**Phase 5 — Action 链表单写入收敛**

Targets: `packages/flux-core/src/types/actions.ts`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/form-runtime.ts`, related tests

- 单独设计 action chain 范围内的表单写入收敛边界。
- 优先考虑两类实现：
  - 显式 API，例如 `form.batchMutations(fn)`
  - 受控 built-in action，例如 `setValues` / `patchFormState`
- 不对整个 `dispatch()` 隐式包裹黑盒事务。
- 保持 `prevResult`、`continueOnError`、debounce、取消、监控时序可观测。
- 如果 Phase 0/4 证明主要瓶颈并不在提交次数，而在重复 dependent revalidation，则优先做“action chain 内派生去重”，而不是扩大写入边界抽象。

Exit criteria: 链式表单写入不会把单次交互拆成过多传播回合，同时 action 语义与监控边界仍然清晰可见。

**Phase 6 — 数组热路径优化**

Targets: `packages/flux-runtime/src/form-runtime-array.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-path-state.ts`, `packages/flux-core/src/utils/path.ts` if needed, related renderer tests

- 当前 `remapArrayFieldState` + `replaceManagedArrayValue` 已完整处理以下四类重映射，但每次数组操作合计发出 **8–9 次顺序 `setState` 调用**（`remapArrayFieldState` 5 次：errors/touched/dirty/visited/validating；`replaceManagedArrayValue` 3–4 次：validating/dirty/value + clearErrors），无任何批量提交：
  - 数组值替换（`replaceManagedArrayValue`）
  - errors/touched/dirty/visited/validating 重映射（`remapArrayFieldState`）
  - validationRuns 重映射（`remapValidationRunState`）
  - initialFieldState 重映射（`remapInitialFieldState`）
- 本阶段的工作是优化上述现有实现，而不是重新引入这些函数。
- 若 Phase 4 已落地通用 patch/commit 原语（如 `form.batchMutations(fn)`），直接将 `remapArrayFieldState` + `replaceManagedArrayValue` 中的顺序写入收敛到该原语内，将 8–9 次缩减为 1–2 次 `setState`。
- 若 Phase 4 仅收敛了 validation 写回路径而未提供通用原语，则在本阶段单独为数组操作路径提供局部批量能力。
- 对未受影响索引尽量保留引用稳定性。
- 审查 renderer 订阅边界，减少数组局部变动引发的整片重渲染。
- 测试场景至少覆盖：
  - append / prepend / insert / remove / move / swap / replace
  - shallow array 与 nested array paths（如 `list[0].tags[1].name` 双层索引）
  - aggregate error / runtime registration child path 保持正确

Exit criteria: 数组操作后的状态迁移仍正确，且局部更新波及面明显小于当前实现。

**Phase 7 — 受限声明式联动模型**

Targets: `packages/flux-core/src/types/*`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/node-runtime.ts` if needed, `packages/flux-renderers-form/src/*`, docs/tests

- 设计一套最小可用的声明式联动模型，只覆盖高频表单字段联动场景。
- 第一版只允许：
  - 显式 `dependencies`
  - 显式 `when`
  - 显式 `fulfill/otherwise`
  - 固定可写目标集合
- 第一版明确排除：
  - `$observable`
  - `$effect`
  - `$memo`
  - 任意脚本副作用
- 尽量避免把 `$form`、`$self` 这类原始对象直接暴露给 schema。
- 编译产物应落到现有 runtime/action/validation 能力之上，而不是建设新的通用 effect engine。
- 首轮落地建议只覆盖：
  - `visible`
  - `disabled`
  - `required`
  - `options`
  - 受控的 `value` 或等价简单赋值场景

Exit criteria: 常见字段联动可以脱离分散表达式，以受限、可分析、可测试的方式表达，并且不复制 Formily `x-reactions` 的隐式复杂度。

**Phase 8 — 字段 presentation 派生快照**

Targets: `packages/flux-core/src/types/runtime.ts`, `packages/flux-react/src/form-state.ts`, `packages/flux-react/src/hooks.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form/src/*`, related tests

- 把当前分散的字段展示态判断收口成局部只读 helper 或稳定派生快照。
- 第一版最小集合：
  - `effectiveDisabled`
  - `effectiveRequired`
  - `error visibility`
  - `interactive/readOnly presentation`
- 优先放在 `FormRuntime` / `flux-react` 字段 hooks 的交界处，让 `FieldFrame` 和字段 renderer hooks 直接消费。
- 不建设新的全局派生状态系统或独立缓存子系统。
- 明确失效边界，仅对影响展示态的输入变化失效。

Exit criteria: `FieldFrame` 和字段 renderer 不再反复拼装相同展示逻辑，字段展示态来源更稳定、更可测试。

**Phase 9 — 长期项：更细 selector 与 validation model 结构收口**

Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/hooks.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/validation/*`, related docs/tests

- 基于前面阶段的数据再判断是否推进：
  - `编译期依赖提取与更细 selector`
  - `validation model` 去重/收口
- 第一阶段只覆盖少量可静态提取的表达式形态和已知热路径，不以完备依赖分析为目标。
- 如果 `NodeRenderer` provider 层级仍被 profile 证明为瓶颈，再单独开具体计划，不在此计划里预先承诺结构重写。

Exit criteria: 只有在有充分 profile 证据的情况下，才继续推进更细 selector 或 validation model 收口；否则保持当前架构简单性。

## Implementation Order

建议的执行顺序如下：

1. Phase 0 — profile 基线与文档校准
2. Phase 1 — 延迟 `validating/submitting`
3. Phase 2 — 路径缓存与预解析
4. Phase 3 — 轻量字段图 / 查询接口
5. Phase 4 — Validation 写回合并提交
6. Phase 5 — Action 链表单写入收敛
7. Phase 6 — 数组热路径优化
8. Phase 7 — 受限声明式联动模型
9. Phase 8 — 字段 presentation 派生快照
10. Phase 9 — 长期项按 profile 再决定

说明：

- 如果只从收益/体感看，数组热路径优化与延迟状态标志都很亮眼。
- 但从架构依赖顺序看，字段图 / 查询 facade、路径基础设施和 profile 结论应先于更大范围的优化进入实施。
- Phase 4 与 Phase 6 共享"减少顺序 `setState` 次数"这一底层机制：若 Phase 4 已落地通用 patch/commit 原语，Phase 6 可直接复用，不需要重复建设批量写入能力；若 Phase 4 仅收敛了 validation 写回路径，Phase 6 需单独为数组操作路径补充局部批量能力。

## Risks

- 把字段图误做成平台级统一对象模型，导致 Flux 重心被重新拖回表单对象图。
- 把 validation 写回或 action 写入收敛误做成全局事务系统，破坏时序可观测性。
- 把受限声明式联动模型扩张成第二套通用 DSL / effect runtime。
- 在缺少 profile 的情况下过早推进派生缓存或依赖提取，导致复杂度先于收益落地。
- 数组优化只关注 values 而忽略 field state / validation state / runtime registration 路径一致性。

## Effort

- 建议按 2 轮执行：
  - 第一轮：Phase 0-3，先做低风险基础设施和测量基线
  - 第二轮：Phase 4-8，按 profile 结果推进写回收敛、数组优化和联动模型
- 预计最小可交付切片为 4-6 个工作日：Phase 0-2
- 完整执行到 Phase 8 的保守估计为 12-18 个工作日，取决于数组热路径与联动模型复杂度

## Verification

每个阶段至少执行受影响分包验证；最终做全仓验证。

```bash
pnpm --filter @nop-chaos/flux-core typecheck
pnpm --filter @nop-chaos/flux-runtime typecheck
pnpm --filter @nop-chaos/flux-react typecheck
pnpm --filter @nop-chaos/flux-renderers-form typecheck

pnpm --filter @nop-chaos/flux-core build
pnpm --filter @nop-chaos/flux-runtime build
pnpm --filter @nop-chaos/flux-react build
pnpm --filter @nop-chaos/flux-renderers-form build

pnpm --filter @nop-chaos/flux-core lint
pnpm --filter @nop-chaos/flux-runtime lint
pnpm --filter @nop-chaos/flux-react lint
pnpm --filter @nop-chaos/flux-renderers-form lint

pnpm --filter @nop-chaos/flux-core test
pnpm --filter @nop-chaos/flux-runtime test
pnpm --filter @nop-chaos/flux-react test
pnpm --filter @nop-chaos/flux-renderers-form test

pnpm typecheck
pnpm build
pnpm lint
pnpm test
```

额外验证要求：

- 对 Phase 0 的 profile 结论保留可复用记录，避免后续“凭感觉优化”。
- 对 Phase 4-6 补足回归测试，覆盖 validation 写回次数、action chain 派生传播、数组操作状态一致性。
- 对 Phase 7-8 补足文档和测试，确保受限联动模型与展示态派生边界不会被实现层偷偷放大。

## Documentation Follow-Up

- 若 Phase 3 落地，更新 `docs/architecture/form-validation.md` 或新建对应 architecture section，明确字段查询 facade 的边界。
- 若 Phase 4-5 落地，更新 `docs/architecture/form-validation.md` 与 `docs/architecture/flux-runtime-module-boundaries.md`，记录写回收敛与 action chain 收敛的模块归属。
- 若 Phase 7 落地，更新 `docs/architecture/form-validation.md`、`docs/architecture/renderer-runtime.md` 和相关 schema 约定文档，明确声明式联动模型边界与禁止能力。
- 若 Phase 8 落地，更新 `docs/architecture/field-metadata-slot-modeling.md` 或相关字段展示文档，记录 presentation 派生快照的位置与消费方式。
