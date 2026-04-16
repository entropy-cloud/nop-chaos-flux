# 112 Capability Projection Manifest Implementation Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/architecture/capability-projection-manifest.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/schema-file-validator.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flux-runtime-module-boundaries.md`
> Related: `docs/plans/41-compiler-integrated-schema-diagnostics-implementation-plan.md`, `docs/plans/12-action-scope-imports-and-component-invocation-plan.md`

## Purpose

本计划用于把 `Capability Projection Manifest` 从架构文档收敛为一条可落地的实现主线。

本计划优先收口两个结果：

- manifest 的版本解析、包归属、以及 host capability publication 边界先变成稳定 baseline
- 在 compiler-visible capability publication attribution 成立后，再落地 host family 的 action 名称和 `args` 结构校验

## Current Baseline

- `docs/architecture/capability-projection-manifest.md` 现已明确：manifest 是 platform-extension contract，不是新 primitive。
- 当前可安全落地的 v1 baseline 是“shared contract + owner-local resolver + capability publication attribution + host-family action validation”，不包括通用 projection-path validation。
- `ActionScope`、`ComponentHandleRegistry`、`xui:imports`、`useHostScope` 已经是当前运行时基线；manifest 不能改写这些边界。
- 版本选择已经收敛为 owner-local resolution：publishing owner 的 `RendererDefinition.hostContract` 提供 family、defaultVersion selector 和 `resolveManifest(...)`。
- standalone fragment validation 不再依赖环境级 registry，而是通过显式 `hostContractContext.manifest` 传入已解析 manifest。
- 仍然未解决的真实 gap 是：代码层尚无 manifest envelope/resolver contract、compiler 还未接入 capability publication attribution、host action validation 也还未接入同一套 compile-time 归因模型。

## Goals

- 在 dependency-safe shared contract layer 中定义 manifest envelope、resolver contract、和复用 shape contract。
- 为 publishing owner renderers 增加稳定的 `hostContract` metadata 和 owner-local manifest resolution baseline。
- 定义 compiler-visible capability publication attribution，明确哪些 owner regions/subtrees 真正接收到 host `ActionScope`。
- 在 compiler diagnostics 中实现 host-family action validation，且不破坏 built-in、`component:*`、`xui:imports` 现有规则。
- 以一个 first-party host family 作为端到端试点，验证 version selector、manifest resolution、diagnostics 和 docs/example 流程。

## Non-Goals

- 不在本计划第一阶段引入通用 projection-path diagnostics。
- 不在本计划中实现 projection-path diagnostics；若 capability/action v1 收口后仍需继续，另开 successor plan。
- 不把 built-in actions、component handles、或 imported namespaces 迁移到 manifest 体系。
- 不把 manifest 变成 runtime dispatch 的热路径依赖。
- 不引入 ambient global manifest registry。
- 不在本计划中重写 host page 的整体 runtime wiring。

## Scope

### In Scope

- `docs/architecture/capability-projection-manifest.md`
- `docs/architecture/schema-file-validator.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/logs/`
- `packages/flux-core/src/schema-diagnostics/` or equivalent shared contract area
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-runtime/src/schema-compiler/`
- publishing owner renderer packages for one pilot host family
- focused diagnostics tests and docs/example validation coverage

### Out Of Scope

- 全量 host family 一次性同时落地
- runtime result conformance checking
- editor/LSP 产品化体验
- host-global projection publication beyond current lexical boundaries
- non-host renderer surfaces such as ordinary form `component:*` handles

## Execution Plan

### Phase 1 - Shared Contract And Resolver Baseline

Status: planned
Targets: `packages/flux-core/src/schema-diagnostics/`, `packages/flux-core/src/types/renderer-core.ts`, `docs/architecture/capability-projection-manifest.md`

- [ ] 定义 `HostCapabilityProjectionManifest`、`HostProjectionContract`、`HostCapabilityContract`、`HostCapabilityMethod`、`HostManifestResolver` 等共享 contract。
- [ ] 把 manifest 复用的 structural shape contract 放到 dependency-safe shared layer，避免 `flux-core` 反向依赖 `flux-runtime`。
- [ ] 为 `RendererDefinition.hostContract` 冻结 directionally stable shape：`family`、`defaultVersion`、`resolveManifest(...)`。
- [ ] 为 manifest resolution failure 定义明确 diagnostics-facing result，而不是 fallback 到 generic unknown-property/unknown-action 噪音。

Exit Criteria:

- [ ] 共享 contract 层可以被 compiler 和 host renderer packages 同时引用且不破坏包边界。
- [ ] `capability-projection-manifest.md` 与代码层 contract 不再存在版本解析或类型归属歧义。

### Phase 2 - Capability Publication Attribution Baseline

Status: planned
Targets: `docs/architecture/capability-projection-manifest.md`, `docs/architecture/renderer-runtime.md`, `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-runtime/src/schema-compiler/`

- [ ] 定义 compiler-visible capability publication attribution model，明确哪些 owner render boundaries 真正发布 host `actionScope`。
- [ ] 处理 whole-owner subtree 与 region-scoped publication 的差异，避免 nearest publisher 被误当成 capability visibility 证明。
- [ ] 明确 capability publication attribution 与 existing `render({ actionScope })` runtime model 的对应关系。
- [ ] 冻结 diagnostics 启用前提：只有在 capability publication boundary 明确时，host-family action validation 才允许开启。

Exit Criteria:

- [ ] capability publication boundary 已有 compiler 可消费的明确契约。
- [ ] 文档和 compile contract 可以回答哪些子树允许触发 host-family action validation。

### Phase 3 - Compiler Host Action Validation

Status: planned
Targets: `packages/flux-runtime/src/schema-compiler/`, `packages/flux-core/src/types/renderer-compiler.ts`, diagnostics tests

- [ ] 扩展 compiler validation context，使其能携带 resolved host manifest 和 capability publication attribution。
- [ ] 在 action diagnostics 流程中新增 host-family namespace validation：仅在已归因的 capability publication boundary 内校验 active host family namespace 的 method 和 `args` shape。
- [ ] 保持 built-in actions、`component:*`、`xui:imports` / imported namespaces 继续走现有 validation 路径。
- [ ] 为 `unsupported-host-contract-version`、`unresolved-host-contract-context`、`unknown-host-capability-method`、`invalid-host-capability-args` 增加 focused tests。

Exit Criteria:

- [ ] compiler 可以在 resolved host context 下对 host-family actions 给出稳定 diagnostics。
- [ ] 现有 namespaced action compatibility 和 `xui:imports` 规则无回归。

### Phase 4 - First-Party Pilot Host Family

Status: planned
Targets: one of `flow-designer-renderers`, `spreadsheet-renderers`, `report-designer-renderers`, related docs/examples/tests

- [ ] 选择一个 first-party host family 作为首个试点，优先使用当前 contract 最清晰的 family。
- [ ] 发布该 family 的 manifest bundle(s) 和 owner-local resolver helper。
- [ ] 将 publishing owner renderer 接入 `hostContract` metadata，并声明 capability publication attribution。
- [ ] 为该 family 增加 docs/example 或 test fixture，覆盖 version selector、known method、invalid args、unknown method 等场景。

Exit Criteria:

- [ ] 至少一个 first-party host family 端到端跑通 owner-local manifest resolution + compiler action validation。
- [ ] 试点 family 的架构文档和 component doc 与实际 manifest surface 对齐。

### Phase 5 - Standalone Fragment Validation And CI Wiring

Status: planned
Targets: `packages/flux-runtime/src/schema-compiler/`, docs example validation helpers, CI-facing validation entrypoints, `docs/architecture/schema-file-validator.md`

- [ ] 为 standalone fragment validation 增加 `CompileSchemaOptions.validation.hostContractContext` 输入，要求调用方提供已解析 manifest。
- [ ] 在 `schema-file-validator.md` 和 built-in `xui` validation contract 中显式纳入 `xui:version`。
- [ ] 在 docs/examples 或 CI validation 路径中接入 host contract context，避免隐藏环境依赖。
- [ ] 明确 normal tree compilation 和 standalone validation 的 context resolution 差异，并补齐测试。

Exit Criteria:

- [ ] standalone fragment validation 可以在无 owner node 的情况下稳定复用同一 manifest diagnostics 逻辑。
- [ ] CI/docs example validation 不依赖 ambient global manifest registry。

## Validation Checklist

- [ ] manifest resolver contract、version selector 语义、和 package placement 已通过 live repo implementation 或 focused code baseline 证明可行
- [ ] capability publication attribution 已与 `render({ actionScope })` 当前 runtime model 对齐
- [ ] host-family action validation 与 `action-scope-and-imports.md` 当前 built-in/component/import rules 一致
- [ ] `xui:version` 已进入 built-in `xui` validation contract，并与 hostContract owner rules 对齐
- [ ] 至少一个 first-party host family 已有端到端 validation coverage
- [ ] relevant docs、examples、daily log 已同步
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: 完成时补充，必须明确区分“manifest contract surface 已出现”和“compiler/host semantics 已真正落地”。

Closure Audit Evidence:

- Reviewer / Agent: 待补充
- Evidence: 待补充

Follow-up:

- 若后续继续推进 projection publication attribution 或 projection diagnostics，拆分 successor plan 承接。
- 若 action validation 试点足以收口当前 feature，则明确写 no remaining plan-owned work。
