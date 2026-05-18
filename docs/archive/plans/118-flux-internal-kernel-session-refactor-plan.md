# 118 Flux Internal Kernel Session Refactor Plan

> Plan Status: cancelled
> Last Reviewed: 2026-04-21
> Source: `docs/experiments/requirements.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/renderer-runtime.md`
> Related: `docs/experiments/flux-pragmatic-adoptable-runtime-upgrades.md`, `docs/experiments/next-gen-low-code-runtime-kernel-design.md`

## Purpose

在不改变 Flux 当前 author-visible schema contract、primitive closure、React host 主路径和嵌入式使用方式的前提下，把 runtime 内部状态所有权收敛成更清晰的 shared kernel-like substrate 与 mount-local session state 分层，降低会话生命周期泄漏、运行时所有权混杂和多局部页面并存时的维护成本。

## Current Baseline

- Flux 当前仍是 `Final Execution Schema` runtime，loader/assembly 负责最终模型组装，runtime 不承担开放式结构装配。
- 当前公开主入口仍围绕 `RendererRuntime`、`SchemaRenderer`、`NodeRenderer` 和 React host 组织；这条外部 contract 不能被本计划直接改写。
- `RendererRuntime` 当前同时承担编译、动态求值、dispatch、scope 创建、form/page/surface runtime 创建、source/reaction 注册和 teardown 等多类职责，内部状态归属边界偏大、偏混合。
- `renderer-runtime.md` 已明确 creator-owned boundary：`page`、`form`、fragment child scope、dialog/drawer surface 等边界由具体 creator path 创建，不应回退成 generic runtime creator。
- `dispose()` 当前已被要求负责停止 owned data sources、reactions、imported namespace registrations 和 in-flight requests，说明 mount-owned live sidecar 已经客观存在，只是内部归属尚未收口。
- 实际使用时 Flux 可能嵌入到大型 React 系统中，通过 URL 动态加载 schema 渲染局部页面，也可能直接传入 JSON schema 渲染局部页面；不同局部页面不直接交互，通过 `RendererEnv` 适配外部环境。实验稿曾使用 `RenderEnv` 一词，当前仓库正式名为 `RendererEnv`。
- `RendererEnv` 在本计划中必须继续被视为宿主提供的静态能力边界，runtime 直接使用，不新增内部 env facade/adapter contract。

## Goals

- 明确区分内部 shared kernel-like substrate 与 mount-local session state 的职责边界。
- 把会随着一次挂载创建、失效、销毁的 live state 和 sidecar 收敛到 mount-local session state。
- 保持 creator-owned boundary 不变，让 session 负责 lifecycle ownership / registration / teardown，而不是变成 generic creator。
- 保持 `RendererRuntime` 作为兼容 facade，对外 API 和宿主心智模型尽量不变。
- 让嵌入式局部页面场景下的 teardown、多实例隔离和调试定位更清晰。

## Non-Goals

- 不公开新的 `RuntimeKernel` / `RuntimeSession` 宿主 API。
- 不引入公开 `CompiledProgram -> RuntimeKernel -> RuntimeSession` 三层拓扑。
- 不修改 schema 写法、primitive closure 或 `Final Execution Schema` 边界。
- 不引入全局 public `commit()` 事务。
- 不引入全平台 owner graph public contract。
- 不改变 `RendererEnv` 的角色，不把它变成新的内部 facade 或全局状态总线。
- 不把 Flow Designer、Spreadsheet、Report Designer、Word Editor 变成第二套 runtime ontology。

## Scope

### In Scope

- `RendererRuntime` 内部状态所有权重构。
- mount-local runtime state 的显式归位。
- shared kernel-like substrate 的内部抽出与限制。
- session-owned inspect / registry / teardown 路径收口。
- 嵌入式局部页面场景下的 mount/unmount 生命周期说明。
- 对应 architecture docs / references 中与内部拓扑相关的最小同步更新。

### Out Of Scope

- React host render pipeline 重写。
- NodeRenderer contract 或 renderer component props 大改。
- public runtime API 重命名或大规模 breaking change。
- validation runtime 与 dependency-tracking 的大收敛。
- host/domain manifest 体系重做。
- 跨页面 session 互操作机制。

## Execution Plan

### Phase 1 - Mount-Local State Inventory And Session Ownership

Status: cancelled
Targets: `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/surface-runtime.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-react/src/index.tsx`

- [ ] 审计当前 `RendererRuntime` 挂载期会创建、更新、销毁的 live state 与 sidecar，并写成 repo-observable inventory。
- [ ] 定义内部 mount-local session state contract，只承载 mount-owned lifetime owner / registry / teardown owner 语义，不承担 generic creator 语义。
- [ ] 把以下 live state 明确归入 session-owned：root scope、root action scope、page runtime、descendant form runtime registry、surface runtime entries、source live controllers、reaction live controllers、mounted component handle entries、mounted node inspect state、in-flight async jobs、imported namespace registrations、capability overlays / action-scope sidecar、live dependency/watch sidecar。
- [ ] 确认 creator-owned boundary 保持不变：page/form/surface/fragment boundary 仍由现有 creator path 创建，session 只负责登记、inspect 和 teardown。

Exit Criteria:

- [ ] 能逐项指出当前 mount-owned live state 分别归谁所有，并有代码路径证据。
- [ ] `session.dispose()` 的目标清单覆盖 source/reaction/imported namespaces/in-flight async/surface/mounted registries 等主要 live sidecar。
- [ ] 文档或代码注释明确 session 不是 generic runtime creator。

### Phase 2 - Internal Kernel-Like Substrate Extraction

Status: cancelled
Targets: `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-runtime/src/*`

- [ ] 抽出 internal kernel-like substrate，只承载近似只读、可复用的 shared runtime substrate。
- [ ] 把编译产物输入边界、renderer bindings、纯只读 expression/evaluation substrate、static diagnostics metadata、session factory 明确归到 shared kernel-like substrate。
- [ ] 明确禁止以下内容上浮到 kernel-like substrate：root scope current value、form/page/surface live state、live source/reaction instances、mounted registry entries、imported namespace registrations、live dependency/watch sidecar、live inspect tree、session summary。
- [ ] 保持 `RendererEnv` 直接使用边界，不引入新的 env facade/adapter contract。

Exit Criteria:

- [ ] internal kernel-like substrate 与 mount-local session state 的分界有代码级承载位置。
- [ ] 任何 live mutable sidecar 都不再被误放进 shared substrate。
- [ ] `RendererEnv` 在实现和文档中仍被描述为宿主静态边界，runtime 直接使用。

### Phase 3 - RendererRuntime Facade Thinning

Status: cancelled
Targets: `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-react/src/index.tsx`

- [ ] 保留 `RendererRuntime` 公开 facade，不对外暴露 `kernel` / `session`。
- [ ] 把 facade 内部委托逐步改到 internal kernel-like substrate 与 mount-local session state。
- [ ] 保持 `useRendererRuntime()`、`SchemaRenderer`、`NodeRenderer`、现有 hooks 和宿主 API 不感知内部拓扑重构。
- [ ] 在类型和文档中明确 `kernel/session` 是未导出的内部实现细节。

Exit Criteria:

- [ ] 对外 `RendererRuntime` contract 没有被新的内部拓扑污染。
- [ ] 内部大多数方法都能清楚回答“委托给 shared substrate 还是 mount-local session state”。
- [ ] facade 不再继续成为所有权黑箱。

### Phase 4 - Inspector, Teardown, And Embedded Runtime Audit

Status: cancelled
Targets: `packages/flux-runtime/src/*`, `packages/flux-react/src/index.tsx`, `docs/architecture/renderer-runtime.md`, `docs/references/runtime-and-renderer-faq.md`

- [ ] 把 live inspector、mounted registry、session summary 明确收口到 mount-local session state。
- [ ] 审计嵌入式局部页面 mount/unmount 路径，确认旧 session 的 source/reaction/import sidecar/mounted registry 不泄漏。
- [ ] 明确路由动态 schema 页面和直接传入 JSON 片段两类宿主模式下的 mount-local lifecycle 行为。
- [ ] 补最小 docs 同步，记录 internal kernel-like substrate / mount-local session state 的边界和 creator-owned boundary 不变。

Exit Criteria:

- [ ] 多局部页面并存时，调试目标按 mount-local session 隔离。
- [ ] unmount 后，旧 runtime instance 不再残留 source/reaction/import sidecar/mounted registry。
- [ ] 文档中宿主仍只需要理解 facade + `RendererEnv` + root contract，不需要理解内部 `kernel/session` 术语。

## Validation Checklist

- [ ] shared kernel-like substrate 与 mount-local session state 的职责边界在 live repo 中可观察。
- [ ] creator-owned boundary 规则未被 session 吞并。
- [ ] `RendererEnv` 仍然是宿主静态能力边界，runtime 直接使用，没有新 env facade/adapter contract。
- [ ] 动态 schema 路由页面与直接 JSON 局部渲染两类嵌入式场景都完成 focused lifecycle audit。
- [ ] 相关 docs 已按最终落地边界同步。
- [ ] focused verification 已完成。
- [ ] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- `RendererRuntime` facade 可能长期停留在双轨过渡状态，导致新逻辑继续回流 facade。
- session 可能膨胀成新的内部大对象，因此必须持续保持 lexical ownership 粒度，不把 source/reaction/import/action-sidecar 粗暴做成 session 全局袋子。
- shared substrate 复用条件如果定得过松，会出现脏复用；定得过严，则会失去复用价值。首轮实现优先保证 teardown 正确性与隔离，而不是激进复用。
- 如果执行中发现 scope、source、reaction、inspector 的边界需要大范围同步调整，应拆出 successor plan，而不是把本计划无限扩宽。

## Closure

Status Note: Cancelled during closure audit. The explicit internal `kernel/session` topology proposed here never landed in the live repo, and the runtime baseline continued through narrower focused plans without adopting this naming or ownership split. No plan-owned execution work remains because the refactor direction itself is abandoned rather than pending.

Closure Audit Evidence:

- Reviewer / Agent: independent `general` subagent closure audit (`task_id: ses_252ce7a6fffe2ZkG2GLcS6JRo4`)
- Evidence: Fresh audit confirmed `packages/flux-runtime/src/runtime-factory.ts` still directly owns compile/eval helpers, imported namespace management, action scope/component registry creation, page/surface ownership sets, source/reaction registries, async governance, and disposal. No observable `kernel` / `session` implementation layer or doc baseline exists outside this plan, so the proposed refactor direction is not landed and is now explicitly abandoned.

Follow-up:

- No successor plan. If runtime ownership refactoring is revisited later, start from the then-current live baseline with a new focused owner plan instead of reopening this abandoned proposal.

## Related Handling In Live Baseline

The runtime ownership problems that motivated this abandoned proposal were handled piecemeal through narrower owner docs and plans rather than through an explicit internal `kernel/session` split.

- Teardown responsibility remained on `RendererRuntime.dispose()` and is documented in `docs/architecture/renderer-runtime.md`; the live cleanup path is still centered in `packages/flux-runtime/src/runtime-factory.ts`.
- Creator-owned boundary rules were preserved and frozen in `docs/architecture/renderer-runtime.md`: page, form, fragment child scope, and surface boundaries are still created by concrete owner paths instead of a generic session layer.
- Source and reaction ownership moved toward focused runtime sidecars rather than a single session object: see `docs/architecture/api-data-source.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `packages/flux-runtime/src/source-registry.ts`, and `packages/flux-runtime/src/reaction-runtime.ts`.
- Async in-flight ownership, stale-result publication, and async diagnostics were converged under `docs/plans/120-runtime-async-governance-convergence-plan.md` instead of under a broader `session` abstraction.
- Imported namespace lifetime, ref-counting, and teardown were formalized in `docs/architecture/action-scope-and-imports.md` and `packages/flux-runtime/src/imports.ts`; however, the full lexical `ImportStack` follow-up remains separately tracked in `docs/plans/116-module-cache-import-stack-compile-symbol-resolution-plan.md`.
- Mounted inspect truth-source guidance was documented in `docs/architecture/debugger-runtime.md`, with live inspect state still primarily routed through component/runtime registry paths such as `packages/flux-runtime/src/component-handle-registry.ts` and `packages/nop-debugger/src/controller.ts`.

Remaining observable gaps relative to this abandoned design direction:

- No explicit internal `mount-local session state` object exists; runtime-owned bookkeeping remains assembled directly in `packages/flux-runtime/src/runtime-factory.ts`.
- No explicit internal `shared kernel-like substrate` type or topology exists in live code or owner docs.
- Import lexical ownership is only partially converged until plan 116's `ImportStack` phase lands.
- Inspect state is documented as runtime/registry truth, but it is not unified under a dedicated session-owned inspect tree.

## Outdated Note

- This plan described an explicit internal `kernel/session` split that was never adopted into the live runtime baseline.
- Subsequent runtime work converged through narrower owner plans without introducing these internal topology terms as a governing implementation contract.
