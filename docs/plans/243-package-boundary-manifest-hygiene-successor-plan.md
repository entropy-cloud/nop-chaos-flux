# 243 Package Boundary Manifest Hygiene Successor Plan

> Plan Status: completed
> Last Reviewed: 2026-05-11
> Source: `docs/analysis/2026-05-11-deep-audit-full/{summary.md,01-dependency-graph.md}`
> Related: `docs/plans/{188-deep-audit-2026-05-03-summary-remediation-plan.md,191-deep-audit-full-5-doc-baseline-and-audit-automation-plan.md,217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md,242-deep-audit-2026-05-11-residual-owner-assignment-plan.md}`

## Purpose

收口 2026-05-11 retained dimension-01 package-boundary defects，使测试真实导入、公开 test surface、以及生产 `dependencies` 与 live import 面重新一致。

## Current Baseline

- `01-01` 暴露了一个 workspace-only hidden test entry：`@nop-chaos/flux-renderers-form/test-support` 由 `vite.workspace-alias.ts` 托底，但 package `exports` 与 build output 都不承认它。
- `01-02` ~ `01-04` 是三条同类 defect：测试真实导入跨包依赖，但 owning package manifest 未声明这些 test-time imports。
- `01-05` ~ `01-12` 是一组同类 defect：test-only dependencies 仍留在生产 `dependencies`。
- `01-13` 是未使用生产依赖残留：`flow-designer-core` 保留了当前 live code 未使用的 `@nop-chaos/flux-formula`。
- Earlier plans `188` and `217` 只关闭了较小 manifest hygiene 子集；它们不拥有这次 retained dimension-01 全集。

## Goals

- 消除 workspace-only hidden test entry，明确 test-support surface 的支持方式。
- 让所有 retained test-time cross-package imports 都准确回写到 owning manifest。
- 把 test-only / unused production dependencies 从主 manifest 收口出去。
- 用 repeatable verification 证明 package boundary 与 manifest 重新一致。

## Non-Goals

- 不把本计划扩大成通用 monorepo DX/tooling program。
- 不重开合法 workspace export subpath normalization 这类已由 `191` 收口的脚本问题。
- 不处理与 retained 01 family 无关的 public API redesign。

## Scope

### In Scope

- `packages/flux-renderers-form/package.json`
- `packages/flux-react/package.json`
- `packages/nop-debugger/package.json`
- `packages/flux-renderers-form-advanced/package.json`
- `packages/flux-renderers-basic/package.json`
- `packages/flux-renderers-data/package.json`
- `packages/flow-designer-renderers/package.json`
- `packages/spreadsheet-renderers/package.json`
- `packages/report-designer-renderers/package.json`
- `packages/flow-designer-core/package.json`
- `vite.workspace-alias.ts`
- directly affected tests/test-support files if imports must move or be re-homed
- manifest hygiene verification path and directly affected docs/logs

### Out Of Scope

- unrelated runtime or flow-designer behavior defects
- broad package extraction or new package creation unless required to close `01-01`

## Execution Plan

### Phase 1 - Close Hidden Test Entry And Missing Test Declarations

Status: completed
Targets: `01-01`, `01-02`, `01-03`, `01-04`

- Item Types: `Fix | Decision | Proof`

- [x] Decide one explicit supported outcome for `@nop-chaos/flux-renderers-form/test-support`: exported public test subpath, re-homed package-local usage, or dedicated support package.
- [x] Remove the current hidden workspace-only entry pattern so package boundary and real test surface agree.
- [x] Add the missing test-time cross-package declarations for `flux-react`, `nop-debugger`, and `flux-renderers-form-advanced`, or move the tests to a location whose manifest already owns them.
- [x] Add focused proof that the chosen test-support path works without relying on undeclared hidden alias behavior.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `01-01` through `01-04` are closed by one explicit supported boundary.
- [x] Test-time imports used by the affected packages are declared by the owning manifest or re-homed out of those packages.
- [x] Any affected boundary docs or audit-rule docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Remove Test-Only Or Unused Production Dependencies

Status: completed
Targets: `01-05` through `01-13`

- Item Types: `Fix | Proof`

- [x] Move retained test-only dependencies out of production `dependencies` into `devDependencies` wherever live code confirms test-only usage.
- [x] Remove the unused `@nop-chaos/flux-formula` production dependency from `flow-designer-core` if no live production import or build contract needs it.
- [x] Re-run the package-boundary verification path after the manifest changes and record the result.
- [x] Add focused package-level verification for the touched packages so manifest cleanup does not silently break test/build entrypoints.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `01-05` through `01-13` are closed.
- [x] No touched package keeps a retained test-only or unused dependency in production `dependencies`.
- [x] Verification proves the cleaned manifests still support the owned test/build paths.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] All retained dimension-01 defects (`01-01` through `01-13`) are fixed.
- [x] Package manifests and live imports now agree for the touched owner packages.
- [x] No retained manifest defect is silently deferred as generic hygiene.
- [x] Needed focused verification is complete.
- [x] Affected docs/logs are synced, or `No owner-doc update required` is explicitly recorded.
- [x] Independent closure audit confirms no retained dimension-01 blocker remains.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None.

## Non-Blocking Follow-ups

- If manifest cleanup reveals a broader tooling opportunity, route it to a separate tooling/DX plan instead of widening this retained-defect owner.

## Closure

Status Note: Completed. The hidden test-support boundary is now explicit, missing test-time declarations were reconciled, retained production dependency pollution was removed, and workspace verification is green.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent independent closure audit (`ses_1e9d55336ffeCpAIoAhaJaR1oL`)
- Evidence:
  - Explicit test-support subpath is exported by `packages/flux-renderers-form/package.json` and backed by `packages/flux-renderers-form/src/test-support.tsx`; alias precedence is fixed in `vite.workspace-alias.ts`.
  - Cleaned manifests include `packages/flux-react/package.json`, `packages/nop-debugger/package.json`, `packages/flux-renderers-form-advanced/package.json`, `packages/flux-renderers-basic/package.json`, and `packages/flow-designer-core/package.json`.
  - Focused proof exists in `packages/flux-renderers-form/src/__tests__/form-package-exports.test.tsx`, and workspace verification was recorded in `docs/logs/2026/05-11.md`.

Follow-up:

- None yet; any residual retained defect discovered during execution must move to an explicit successor rather than stay implicit.
