# 429 Open-Ended Adversarial Review 2026-05-21 Static Capability Validation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-21
> Source: `docs/architecture/static-capability-validation.md`, user requirement on compile-time validation of action selectors / host projection / host capability surfaces
> Related: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/schema-file-validator.md`, `docs/architecture/capability-projection-manifest.md`, `docs/plans/419-open-ended-adversarial-review-2026-05-20-schema-validation-fidelity-plan.md`

## Purpose

收口 validation mode 下“编译期已知却未被强校验”的 capability contract gap，让 compiler 对 action selector、`xui:actions`、host projection、host capability surface 的静态语义校验与已声明 contract 对齐，而不是继续停留在仅做 structural shape validation。

## Current Baseline

- live `ActionSchema` 入口仍是 `action: string`，`compileAction(...)` / `compileActions(...)` 主要负责 lowering，不负责 selector legitimacy adjudication。
- live schema validation 已覆盖 action object shape、`ajax.args` shape、`xui:actions` object/name shape、以及 host namespaced action 的 method/args validation；但这些能力还没有收敛成与 runtime selector order 对齐的统一 classification / resolution path。
- live compiler 仍不会在 validation mode 下一致地完成以下事情：区分 canonical built-in 与 compatibility alias、拒绝 unresolved plain action name、或对 built-in / named / host / import selector classes 使用统一且诚实的 diagnostics policy。
- `submit` 仍在 `BUILT_IN_ACTION_NAMES` 中与 `submitForm` 并列，并在 runtime dispatch 中被兼容为同一路 built-in submit path，因此 authoring/validation 目前无法把它当成“允许兼容但非 canonical”的 vocabulary 处理。
- host manifest 已经声明 capability methods、args/result shape 与 publication boundary；live validation 主要覆盖 namespaced host action method/args，但尚未与 built-in / named / import selector classification 统一。
- host manifest 也声明了 projection fields，但 `docs/architecture/capability-projection-manifest.md` 仍明确要求：generic projection-path diagnostics 只有在 publication attribution compiler-visible 后才成立；因此这部分不能在当前计划里被不诚实地当成已知 compile-time baseline。
- `xui:actions` 当前会编译成 named action plans 并具备词法继承语义，但 validation 仍缺少“plain action name 是否在当前 lexical environment 中可解析”的强制检查。
- import static metadata 当前只有 `ImportedLibraryStaticMeta.helpers` 与 `namespaceMethods`；不存在 import args/result/deprecation contract，因此当前诚实可做的 import validation 只能是 method existence 级别或显式 skipped-validation diagnostics。
- component-targeted action 当前没有 compile-time target-to-renderer binding source；因此当前诚实基线不能声称已知具体 target typing，只能做 selector-family 级别检查并在必要时报告 validation skipped。

## Goals

- 在 validation mode 下建立与 runtime selector order 对齐的 compiler-owned static selector classification / capability validation baseline。
- 让 built-in selector、compatibility alias、plain named action、host namespaced action、以及 import namespace method existence 拥有明确的 compile-time diagnostics policy。
- 为 import metadata 缺失和 component target typing 不可知场景提供显式 diagnostics，而不是静默降级。
- 把 host projection generic path validation 和 component target typing 明确裁定为 deferred，除非实现过程中先补出所需 attribution / binding contract。
- 补齐 focused proof、owner-doc sync、以及独立对抗性 closure audit。

## Non-Goals

- 不把 runtime `ActionScope`、`ComponentHandleRegistry`、或 live provider mounting 改造成 compiler-owned infrastructure。
- 不要求 compiler 证明 runtime component target 一定存在，或证明 runtime import 一定成功加载。
- 不在本计划内把 every renderer capability 都升级成 host-manifest style contract；仅处理已有 contract source 能支持的 capability validation。
- 不顺带重构 action execution runtime、form submit runtime、或 unrelated diagnostics plumbing，除非实现本计划所需的最小修改明确要求。

## Scope

### In Scope

- compiler-side selector classification for validation mode
- central built-in canonical-vs-alias registry / diagnostics policy
- lexical resolution of plain action names against `xui:actions`
- host capability method/args validation using active host manifest contracts
- import namespace method-existence validation using `ImportedLibraryStaticMeta.namespaceMethods` when available
- explicit diagnostics when semantic validation is skipped because static contract metadata or target-binding metadata is unavailable
- focused tests for the final validation behavior
- owner-doc updates in `docs/architecture/static-capability-validation.md` and any additional affected architecture docs if the supported baseline changes while implementing
- `docs/logs/2026/05-21.md`

### Out Of Scope

- runtime-only target existence proof for `componentId` / `componentName`
- compile-time target-to-renderer binding for `component:<method>` unless a new explicit contract carrier is added in this plan
- generic host projection property/path validation before projection publication attribution is compiler-visible
- speculative validation of arbitrary external namespaces when no static contract source exists
- broad editor UX / LSP work beyond compiler diagnostics surfaces
- unrelated cleanup of existing built-in action/runtime plumbing that does not change validation semantics

## Execution Plan

### Phase 1 - Lock Semantic Validation Contract

Status: completed
Targets: `docs/architecture/static-capability-validation.md`, `docs/architecture/schema-file-validator.md`, `docs/architecture/capability-projection-manifest.md`

- Item Types: `Decision | Fix`

- [x] Re-audit the live compiler and docs baseline, then lock the final selector taxonomy and validation-mode policy in owner docs without leaving proposal-style ambiguity.
- [x] Adjudicate built-in registry semantics explicitly: separate canonical built-ins from compatibility aliases, and record whether authoring/strict/compatibility profiles error or warn on each retained alias.
- [x] Adjudicate the contract for skipped semantic validation when import static metadata or component target-binding metadata is unavailable, including which cases must error vs warn.
- [x] Explicitly preserve the existing deferred boundary for generic host projection-path validation unless a new attribution carrier is added in-scope.

Exit Criteria:

- [x] `docs/architecture/static-capability-validation.md` describes the final supported contract rather than an intermediate draft.
- [x] Any additional affected architecture docs are updated, or `No owner-doc update required` is explicitly recorded for them.
- [x] The plan remains aligned with the final owner-doc baseline after the re-audit.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 2 - Add Selector Classification And Plain-Action Resolution

Status: completed
Targets: `packages/flux-core/src/constants.ts`, `packages/flux-compiler/src/schema-compiler/**`, `packages/flux-compiler/src/action-compiler.ts`, focused tests

- Item Types: `Fix | Proof`

- [x] Introduce compiler-owned selector classification for validation mode so built-in, alias, component-targeted, plain named, and namespaced selectors are distinguished before lowering in the same order the runtime uses.
- [x] Replace the current silent `submit`/`submitForm` equivalence in validation semantics with central-registry-driven canonical-vs-alias diagnostics while preserving the adjudicated runtime compatibility behavior.
- [x] Resolve plain action names against lexical `xui:actions` visibility and reject unresolved names in validation mode.
- [x] Add focused proof that malformed or unresolved selectors now fail at validation time instead of degrading into runtime-only behavior.

Exit Criteria:

- [x] Validation mode classifies selectors before lowering and emits stable diagnostics for built-in alias usage and unresolved plain action names.
- [x] Runtime compatibility remains intentionally preserved only where the owner-doc baseline explicitly allows it.
- [x] Focused tests cover canonical built-ins, compatibility aliases, built-in precedence over named actions, valid lexical `xui:actions`, parent inheritance/child shadowing, and unresolved plain action names.
- [x] Affected owner docs are updated for this phase, or `No owner-doc update required` is explicitly adjudicated.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 3 - Extend Validation To Host Capability And Import Method Contracts

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/**`, host/import contract helpers, focused tests

- Item Types: `Fix | Proof`

- [x] Extend the selector-validation path so active host capability contracts and import `namespaceMethods` participate in the same classification pipeline instead of remaining isolated special-cases.
- [x] Preserve host capability validation as namespace-specific validation, and do not overclaim generic host projection-path validation unless an attribution carrier is first added in-scope.
- [x] Emit explicit diagnostics when import method validation or component target typing is skipped because the relevant static metadata does not exist.
- [x] Add focused proof for valid/invalid host capability methods, valid/invalid import namespace methods when `namespaceMethods` metadata is present, and skipped-validation diagnostics when import metadata is absent.

Exit Criteria:

- [x] Host capability methods and args are enforced by validation mode when host capability attribution is active.
- [x] Import namespace method-existence validation works when `namespaceMethods` metadata is present.
- [x] Missing static contract metadata produces explicit diagnostics according to the adjudicated policy.
- [x] Focused tests cover both positive and negative cases for host capability validation, import method validation, and skipped-validation diagnostics.
- [x] Any owner-doc drift discovered during implementation is fixed in the relevant architecture docs.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 4 - Repo Verification And Closure Audit

Status: completed
Targets: repo verification commands, closure audit evidence, final doc/log sync

- Item Types: `Proof`

- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the implementation lands.
- [x] Record implementation summary and verification evidence in `docs/logs/2026/05-21.md`.
- [x] Run an independent subagent closure audit against the final code, tests, plan, and owner docs before any future `completed` status change.

Exit Criteria:

- [x] Repo-wide verification passes.
- [x] `docs/logs/2026/05-21.md` records the landed behavior and verification results.
- [x] Independent closure audit evidence is recorded in this plan or the linked daily log.
- [x] Remaining items, if any, are either completed or explicitly moved to adjudicated successor ownership.

## Closure Gates

- [x] All in-scope static capability validation gaps are fixed.
- [x] Built-in alias policy, lexical named-action resolution, host capability validation, and import method-existence validation all match the final owner-doc baseline.
- [x] Necessary focused verification is complete and honest about deferred runtime-only or attribution-missing cases.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synchronized to the final supported baseline, or `No owner-doc update required` is explicitly adjudicated.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Runtime Component Target Existence Proof

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this plan is about compile-time semantic validation of statically knowable capability contracts. Whether a runtime component target actually mounts under a given `componentId` / `componentName` remains a live runtime ownership problem, not a compile-time contract problem.
- Successor Required: `no`
- Successor Path: n/a

### Component Target Typing Without Explicit Binding Metadata

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: current repository contracts do not provide a compile-time target-to-renderer binding source for `componentId`, `componentName`, or `_targetCid`. Without that carrier, honest validation can classify the selector family but cannot prove concrete target type.
- Successor Required: `yes`
- Successor Path: future plan if the repo introduces an explicit target-binding contract for `component:<method>` validation

### Generic Host Projection Property Validation

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `docs/architecture/capability-projection-manifest.md` still requires projection publication attribution to be compiler-visible before generic host projection-path diagnostics become sound. This plan does not claim that attribution model exists unless it is explicitly added in-scope.
- Successor Required: `yes`
- Successor Path: future plan after a projection publication attribution carrier becomes compiler-visible

### Arbitrary External Namespace Validation Without Static Contract Metadata

- Classification: `watch-only residual`
- Why Not Blocking Closure: the supported baseline may emit explicit skipped-validation diagnostics when no static contract source exists, but it cannot honestly validate selectors against contracts that were never declared.
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

- none

## Closure Evidence

- Repo-wide verification completed after implementation landed: `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed for the current workspace state.
- Full workspace `pnpm test` run completed with `49` successful tasks. Representative totals included `@nop-chaos/flux-core` (`31` files, `439` tests), `@nop-chaos/flux-compiler` (`29` files, `479` tests), `@nop-chaos/flux-runtime` (`85` files passed, `1` skipped; `1116` tests passed, `1` skipped), `@nop-chaos/flux-react` (`45` files, `407` tests), and `@nop-chaos/flux-renderers-form-advanced` (`70` files, `638` tests).
- Independent closure audit: fresh-session general subagent `ses_1b6955712ffeyCGUp0vGf0wM7Z` reviewed the final code, tests, owner docs, daily log, and plan. Its only blocking finding was missing closure evidence in the plan/log text at audit time; it found the live implementation and owner docs aligned with the intended in-scope baseline, with deferred `component:<method>` target typing and generic host projection-path validation still honestly documented as out-of-scope boundaries.
