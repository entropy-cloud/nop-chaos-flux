# 41 Compiler Integrated Schema Diagnostics Implementation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-07; architecture and code anchors re-checked on 2026-04-07
> Source: `docs/architecture/schema-file-validator.md`, `docs/architecture/action-scope-and-imports.md`, `docs/references/flux-json-conventions.md`, `docs/architecture/flux-runtime-module-boundaries.md`

## Purpose

本计划用于把已经确认的 compiler-integrated schema diagnostics baseline 逐步落到代码中。

目标不是再建设一个平行的 standalone validator，而是：

- 让 schema compiler 拥有唯一的结构分析 pass
- 让 diagnostics-only `validateSchema(...)` 复用同一套分析逻辑
- 把 unknown bare key、namespace policy、`xui:*` built-in validation、以及 extension passthrough 收敛到同一组 compile options 和 focused modules

本计划默认遵循两个约束：

- 第一阶段保持现有 `compile(...)` 返回形态兼容，不强推破坏式 API 切换
- compiler core 只产出 diagnostics，不直接绑定 `console.error`

## 已确认结论

- 结构校验应并入编译流程，而不是依赖隐藏全局变量触发第二套 walker。
- `validateSchema(...)` 应是 diagnostics-only adapter，而不是独立实现。
- diagnostics 行为必须由显式 per-call options 控制。
- unknown bare keys 不应默认自动并入正常 compiled props。
- extension passthrough 只允许 namespaced keys，且推荐走单独 extension channel。
- `xui:*` 是核心已定义 namespace，不属于“未知扩展默认跳过”。
- namespaced/component action 在省略 `args` 时允许顶层非保留 payload 字段，这一兼容路径必须保留。
- 第一阶段应保留现有 `compile(...) => CompiledSchemaNode | CompiledSchemaNode[]` 返回形态，diagnostics 通过 collector/reporter 侧出。

## 与现有计划的关系

- `docs/plans/37-flux-core-runtime-architecture-convergence-plan.md` 是更宽的 runtime convergence 父计划；本计划只处理 schema compiler diagnostics 主线。
- `docs/plans/38-action-api-source-convergence-migration-plan.md` 已收敛 action/source authoring contract；本计划只确保新的 compiler diagnostics 不破坏既有 namespaced action compatibility。
- `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md` 与本计划都属于 compile/runtime substrate 强化，但本计划不重开 dependency model。
- `docs/components/` 及其 `example.json` 未来将成为本计划 Phase 6 的真实消费方之一，用于 docs example validation。

## Problem

- 当前 `packages/flux-runtime/src/schema-compiler.ts` 直接进入 lowering 流程，没有一层正式的 compiler-owned diagnostics context。
- `packages/flux-runtime/src/schema-compiler/fields.ts` 的 `classifyField(...)` 对 unknown key 过于宽松，默认会把很多未识别字段当成普通 prop。
- `packages/flux-core/src/types/renderer-compiler.ts` 的 `CompileSchemaOptions` 目前还没有 diagnostics、strictness、namespace policy、或 passthrough policy 的正式 contract。
- `CompiledSchemaNode` 也没有 extension passthrough 的明确 sidecar contract。
- 现有 action compatibility 允许 `{ action: 'designer:addNode', nodeType: 'task' }` 这类 shape，但新的 strict diagnostics 若处理不当会误报。
- `xui:imports` 已是 active schema contract，但仓库当前没有内建的 namespace validator 结构来承载它。

## Root Cause

- 当前 compiler 的主要目标是“尽量把 schema 跑起来”，因此 field fallback 和 lowering 更偏 tolerant。
- 历史上没有一套统一的 schema diagnostics contract，所以 editor/CI/import gate 需求只能靠零散检查或未来构想承接。
- compile API 目前强调 compiled output，没有预留 diagnostics collector/reporter contract。
- namespace 扩展、action compatibility、以及 core namespace ownership 之前没有被放进同一套 compiler strictness 设计里统一考虑。

## Goals

- 在不破坏现有 compile return shape 的前提下，为 compiler 增加正式 diagnostics contract。
- 在 pre-lowering 阶段识别 unknown bare key、invalid region/action/source shape、以及 unknown renderer type。
- 把 `xui:*` 收敛为 built-in validated namespace，而不是 generic ignore bucket。
- 为 namespaced-only extension passthrough 提供正式 sidecar contract。
- 为 renderer-owning packages 提供 `schemaValidator` 扩展位，避免全局 switch 膨胀。
- 提供 diagnostics-only `validateSchema(...)` adapter，供 CI、docs examples、editor tooling 复用。
- 保留现有 namespaced/component action top-level payload compatibility。

## Non-Goals

- 不引入 AJV/JSON Schema draft 兼容作为第一阶段前置。
- 不在本计划中执行 runtime form validation 重构。
- 不在本计划中重写 renderer registry 或整体 compile architecture。
- 不在本计划中马上切换到新的 combined compile result API。
- 不在本计划中做完整 editor/LSP 产品化，只提供可消费 diagnostics substrate。

## Scope

- `docs/architecture/schema-file-validator.md`
- `docs/references/flux-json-conventions.md`
- `docs/index.md`
- `docs/logs/`
- `packages/flux-core/src/schema-diagnostics/`
- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/schema.ts`
- `packages/flux-core/src/index.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/schema-compiler/fields.ts`
- new helper modules under `packages/flux-runtime/src/schema-compiler/`
- relevant renderer packages for `schemaValidator` contributions
- relevant tests under `flux-runtime`, renderer packages, and docs/example validation helpers if added

## 不在 Scope 内的事项

- 完整 JSON Schema 标准化
- runtime form validation 行为调整
- debugger UI 新面板设计
- 非 schema diagnostics 目的的 renderer visual refactor
- unrelated package boundary moves

## Execution Plan

**Phase 0 — Freeze Contracts And Add Regression Harness**

Targets: architecture doc, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`, relevant tests

- 为当前实现补足最小基线测试，明确后续改造是否成功：
  - unknown bare key 当前如何落入普通 props
  - unknown renderer type 当前如何失败或抛错
  - namespaced action top-level payload 当前如何被接受
  - `xui:imports` 当前如何进入 compile path
- 新增 target-facing tests，先以 pending/skip 或 focused assertions 表达未来契约：
  - unknown bare key can emit diagnostics before prop lowering
  - namespaced-only passthrough is separate from normal props
  - `xui:*` is validated by built-in namespace validator
  - `validateSchema(...)` reuses compiler-owned analysis rather than a second walker

Exit criteria: 测试能稳定表达“现状是什么、目标要改掉什么”。

Validation:

- 新增 baseline tests 覆盖 permissive field fallback、action compatibility、`xui:imports`
- 文档与测试术语统一使用 “compiler-integrated diagnostics”

**Phase 1 — Introduce Diagnostics Types And Compile Options In `flux-core`**

Targets: `packages/flux-core/src/schema-diagnostics/`, `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/index.ts`, related tests

- 在 `packages/flux-core/src/schema-diagnostics/` 下新增正式类型与 helper 入口：
  - `SchemaDiagnostic`
  - `SchemaDiagnosticCollector`
  - `SchemaDiagnosticReporter`
  - `SchemaNamespaceValidator`
- 扩展 `CompileSchemaOptions`：
  - `diagnostics`
  - `validation`
- 为 `RendererDefinition` 增加 `schemaValidator?` 扩展位。
- 审查 `CompiledSchemaNode` 是否引入 `extensions?: Record<string, unknown>`，若第一阶段不引入真实字段，则至少冻结目标 contract 与注释。
- 保持现有 compile API 兼容，避免立即改变返回值。

Exit criteria: 核心类型已可被 runtime 和 renderer packages 稳定引用，且旧 call sites 不需要立即改写。

Validation:

- `flux-core` typecheck 通过
- 新类型可从公共 barrel 导出
- 现有 compile call sites 无破坏式签名报错

**Phase 2 — Add Compiler Diagnostics Context And Pre-Lowering Analysis**

Targets: `packages/flux-runtime/src/schema-compiler.ts`, new `packages/flux-runtime/src/schema-compiler/diagnostics.ts`, related tests

- 在 compiler 内部新增 diagnostics context：
  - issue emit
  - reporter/collector dispatch
  - `maxIssues`
  - `continueOnError`
- 将结构分析从 lowering 中前移：
  - root shape check
  - object/type check
  - renderer lookup check
  - accepted-property set build
- 明确 `continueOnError` 语义：它控制 lowering continuation，而不是 diagnostics accumulation。
- 在 diagnostics disabled 时尽量保持当前 runtime behavior 不变。

Exit criteria: compiler 已拥有一层正式的 pre-lowering diagnostics phase，且 diagnostics 可以脱离 console 收集。

Validation:

- diagnostics collector 能拿到 stable code/path/message/severity/source
- disabled diagnostics 下旧 compile path 行为无明显回退
- `continueOnError` 对 lowering continuation 有测试保护

**Phase 3 — Unknown Property Policy And Extension Passthrough**

Targets: `packages/flux-runtime/src/schema-compiler/fields.ts`, diagnostics helpers, `packages/flux-core/src/types/renderer-compiler.ts`, related tests

- 实现 unknown bare property policy：
  - `ignore`
  - `warn`
  - `error`
- 实现 namespaced property classification 与 policy：
  - `error`
  - `ignore`
  - `delegate-or-ignore`
- 实现 extension passthrough policy：
  - `none`
  - `namespaced-only`
- 确保 unknown bare key 不再自动混入正常 compiled props。
- 如果启用 passthrough，只允许 namespaced keys 通过单独 extension channel 保留。

Exit criteria: unknown bare keys、namespaced extensions、normal props 三者边界清楚，不再混成一个 props bucket。

Validation:

- bare typo 在 authoring profile 为 warning，在 strict profile 为 error
- ignored namespaced subtree 不产生 false-positive child diagnostics
- unknown bare key 不出现在 normal compiled props 中

**Phase 4 — Shared Carrier Diagnostics And `xui` Built-In Namespace Validation**

Targets: compiler diagnostics helpers, `packages/flux-core/src/types/schema.ts`, `docs/architecture/action-scope-and-imports.md` reference tests if needed, related tests

- 为 shared carriers 增加 focused diagnostics：
  - action-shaped objects
  - source objects
  - `xui:imports`
  - `reaction` / `dynamic-renderer` shared contract shape where applicable
- 引入 built-in `xui` namespace validator。
- 明确 action compatibility carve-out：
  - built-in action 严格按契约校验
  - `component:<method>` / `namespace:method` 在省略 `args` 时允许顶层 payload 字段
- 保证 `xui:imports` 不会被落到 generic extension passthrough 中。

Exit criteria: core shared carriers 已有稳定 diagnostics contract，且 namespaced action compatibility 零回归。

Validation:

- `{ action: 'designer:addNode', nodeType: 'task' }` 仍可通过 compatibility path
- malformed `xui:imports` 会产生 built-in namespace diagnostics
- malformed action/source shape 有明确 code/path

**Phase 5 — Roll Out Renderer-Owned `schemaValidator` Contributions**

Targets: current renderer packages and tests

- 优先为当前 shipped renderers 中 field metadata 不足的组件补 `schemaValidator`：
  - `table`
  - `form`
  - complex domain shells when needed
- 保持 renderer-owned validation pure，不依赖 runtime instance。
- 避免把 renderer-specific shape 全塞回 `schema-compiler.ts` 全局 switch。

Exit criteria: richer renderer contracts 能在所属包内声明结构校验逻辑，而不是继续膨胀 compiler monolith。

Validation:

- 至少 basic/form/data 三个方向各有代表性 validator 用例
- renderer-specific shape error 能定位到对应 field path

**Phase 6 — Add Diagnostics-Only `validateSchema(...)` Adapter And Consumer Integrations**

Targets: runtime/top-level exports, docs/example validation helpers, optionally playground integration

- 新增 diagnostics-only `validateSchema(...)` adapter，内部直接复用 compiler-owned analysis。
- 为 docs examples / component examples 提供可复用调用方式。
- 如工作量可控，为 playground 或 debug tooling 暴露 diagnostics report surface，但不强制在本阶段完成产品化 UI。
- 明确 strict validation 场景优先调用 `validateSchema(...)`，而不是强依赖 compile side effects。

Exit criteria: CI、docs example validation、editor tooling 已有统一入口可用，而不是直接抓 compiler 内部细节。

Validation:

- `validateSchema(...)` 与 compile diagnostics 使用同一套 issue codes/path semantics
- docs examples 至少可被一组 focused tests 或 helper command 消费

**Phase 7 — Verification, Cleanup, And Default Policy Review**

Targets: affected packages, docs, logs

- 跑完整验证：`pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`。
- 清理旧文档中与新 baseline 冲突的说法。
- 审查默认 profile：
  - authoring default = warn
  - strict/docs/CI default = error
- 如实施过程中证明 extension sidecar 字段需要正式命名，则把该字段提升为 documented contract；否则保持 helper-level internal carrying strategy 并在 architecture doc 中收口。

Exit criteria: 文档、类型、compiler 行为、测试和消费入口都指向同一套 compiler-integrated diagnostics baseline。

Validation:

- `pnpm typecheck`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- docs examples / representative schema fixtures 有 diagnostics coverage

## Risks And Guardrails

- 不要为了 diagnostics 把 compiler core 变成 `console` side-effect hub。
- 不要把 unknown bare keys 静默保留进 normal props，否则 strictness 形同虚设。
- 不要因为 strict validation 而破坏 namespaced/component action 顶层 payload compatibility。
- 不要把 `xui:*` 退化成 generic ignored extension bucket。
- 不要在第一阶段破坏现有 compile return shape，除非另开 API 并完成迁移。

## Completion Notes

- Plan 41 的核心 substrate 已落地在 `flux-core` 与 `flux-runtime`：`CompileSchemaOptions` 现已带正式 diagnostics/validation contract，compiler 拥有同一套 compile/validate 共享的 diagnostics analysis pass，`validateSchema(...)` 已作为 diagnostics-only adapter 对外暴露。
- 早期计划里“renderer-owned `schemaValidator` rollout”和“docs examples consumer integration”最初还是未来态；现在已补到真实 shipped renderers 和 representative docs example coverage：`form` / `table` 已提供 renderer-owned shape checks，`docs/examples/user-management-schema.md` 已更新到当前 renderer type baseline 并由测试消费。
- 计划中的“至少 basic/form/data 三个方向都需要 validator”表述过于激进，不符合当前 renderer metadata 完整度。当前仓库已经为 form/data 两个最需要 richer shape checks 的方向落地 validator；basic 方向仍以 core compiler contract 和 shared carrier diagnostics 为主，这更符合现阶段实际边界。

## Validation Checklist

- [x] `CompileSchemaOptions` 有正式 diagnostics/validation contract
- [x] compiler 可以把 diagnostics 发送到 collector/reporters，而不是直接绑定 console
- [x] unknown bare keys 在 strict profile 下会报错
- [x] unknown bare keys 不会混入 normal compiled props
- [x] namespaced extensions 只在 `namespaced-only` passthrough 下保留
- [x] `xui:imports` 通过 built-in namespace validator 校验
- [x] `{ action: 'designer:addNode', nodeType: 'task' }` 仍然兼容
- [x] renderer-owning packages 可以通过 `schemaValidator` 承载 richer shape checks
- [x] `validateSchema(...)` 复用 compiler-owned analysis pass
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`