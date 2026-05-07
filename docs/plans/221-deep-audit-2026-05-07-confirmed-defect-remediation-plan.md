# 221 Build, Public Surface, And Active Docs Convergence Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-07
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,01-dependency-graph.md,03-api-surface.md,16-doc-code-consistency.md,17-naming.md,18-cross-package.md}`
> Related: `docs/plans/{220-cross-boundary-state-and-host-contract-closure-plan.md,222-large-file-and-owner-boundary-successor-plan.md,225-test-hardening-follow-up-plan.md,227-safety-and-performance-redlines-plan.md,228-styling-and-css-surface-cleanup-plan.md}`

## Purpose

收口 `full-8` 中构建发布契约、公开 subpath/typing surface、以及 active docs 漂移这一组 confirmed defects。完成态要求：dist 可被 Node ESM 直接加载，生产 CSS 资产与 package manifest 自洽，公开 exports/dev aliases/type surface 同步，active docs/examples/AGENTS 对 live baseline 的描述一致，并有 focused verification 防止再次回归。

## Current Baseline

- `docs/analysis/2026-05-07-deep-audit-full-8/01-dependency-graph.md` 保留了 1 个 P0 与 5 个 P1/P2 构建发布缺陷：dist extensionless ESM imports、build excludes 不统一、production CSS import 不复制、test-only workspace deps、跨包测试私有 `src` 导入、`tailwind-preset` 缺 `tailwindcss` 依赖。
- `docs/analysis/2026-05-07-deep-audit-full-8/03-api-surface.md` 保留了公开 subpath/typing/doc drift：`unstable`/`@nop-chaos/ui/lib/utils` dev alias 缺口、condition-builder / report inspector shell typing surface 不完整、flow API docs 签名漂移、`@nop-chaos/ui/chart` 子路径隔离回退。
- `docs/analysis/2026-05-07-deep-audit-full-8/16-doc-code-consistency.md` 保留 active architecture/docs drift：capability manifest 旧路径、runtime module boundaries 旧路径、flow designer API docs 漂移、`AGENTS.md` action-core 描述漂移、bugs README/index 与 word docs 路径大小写陈旧。
- `docs/analysis/2026-05-07-deep-audit-full-8/17-naming.md` 保留 playground badge/icon authoring contract drift；`18-cross-package.md` 额外保留 flow manifest/projection naming、spreadsheet manifest root discoverability、以及跨域 i18n key 耦合。
- `220` 已关闭 report/word host-truth 与 spreadsheet host action/provider/core correctness contract；本计划不重开 `220` 已拥有的 report bridge snapshot / spreadsheet action truth-source 修复，只拥有 build/public surface/docs/examples 的收敛。

## Goals

- 修复 dist/package/build 产物契约，使 package exports 在支持的 Node ESM / workspace 开发环境下可直接消费。
- 收敛公开 subpath、type exports、schema authoring examples、以及 active docs 到单一 live baseline。
- 为这些 surface 增加 focused checks，避免再次靠人工审计才发现漂移。

## Non-Goals

- 不重开 `220` 已关闭的 report/word single-source-of-truth 与 spreadsheet host action correctness。
- 不把本计划扩大成广义命名清理或全仓 i18n 统一工程；只处理 `full-8` 已确认的公开 contract/name drift。
- 不接管 large-file split、runtime ownership、validation、accessibility、security/performance 族问题。

## Scope

### In Scope

- `packages/*/tsconfig.build.json`, package `package.json`, build/publish scripts, and focused verification scripts directly needed by this plan
- packages with production CSS imports and public subpath drift, including `@nop-chaos/{flux-core,flux-react,flux-renderers-form,flow-designer-renderers,spreadsheet-renderers,report-designer-renderers,ui,tailwind-preset}`
- retained cross-package test imports that currently reach sibling private `src` paths
- `docs/architecture/{capability-projection-manifest.md,flow-designer/api.md,flux-runtime-module-boundaries.md}`
- `docs/bugs/README.md`, directly affected bug-note index paths, `docs/architecture/word-editor/design.md`, and any affected word component docs with stale path/case
- `AGENTS.md`
- playground component-lab examples and schema snippets that currently teach invalid badge/icon contracts
- focused proof for dist importability, build excludes, CSS asset publishing, public aliases/exports, and active-doc/example alignment

### Out Of Scope

- `220` owned spreadsheet host action manifest/provider/core correctness and report bridge snapshot semantics
- styling-system/package-CSS cleanup owned by `228`
- safety/performance redlines owned by `227`
- accessibility remediation owned by `226`

## Execution Plan

### Workstream 1 - Restore Build And Publish Contract

Status: completed
Targets: package build configs/manifests, production CSS entrypoints, verification scripts

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Eliminate extensionless ESM relative imports from published dist output so package exports can be loaded by Node ESM without `ERR_UNSUPPORTED_DIR_IMPORT`.
- [x] [Fix] Normalize `tsconfig.build.json` excludes so tests and test-support code do not leak into dist.
- [x] [Fix] Establish one supported strategy for production CSS imports: copied assets with exports, explicit package subpaths, or equivalent publish-time handling.
- [x] [Fix] Move test-only workspace dependencies out of production `dependencies` and add the missing `tailwindcss` dependency contract for `@nop-chaos/tailwind-preset`.
- [x] [Fix] Remove retained cross-package test imports that directly depend on sibling private `src` paths, or replace them with supported public/test-support surfaces.
- [x] [Proof] Add focused checks for dist ESM importability, build excludes, CSS asset publishing, and package dependency hygiene.

Exit Criteria:

- [x] Published package exports are importable under supported Node ESM execution.
- [x] Dist output no longer contains tests/test-support artifacts for in-scope packages.
- [x] Every in-scope production CSS import has a supported published asset/export path.
- [x] Retained cross-package test imports no longer rely on sibling private `src` paths.
- [x] Focused verification exists for dist importability, build excludes, CSS assets, and dependency hygiene.
- [x] No owner-doc update required beyond package/build docs directly touched by this work.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Align Public Subpaths, Typing Surface, And Authoring Examples

Status: completed
Targets: package exports, tsconfig/Vite aliases, public type exports, playground examples

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Sync public subpaths across `package.json` exports, Vite aliases, and `tsconfig` paths for the retained `unstable` and `@nop-chaos/ui/lib/utils` surfaces.
- [x] [Fix] Export the retained public schema/types for condition-builder and `ReportInspectorShellSchema` through stable root surfaces or explicitly narrow the supported surface if that is the final decision.
- [x] [Fix] Make the retained spreadsheet manifest/root-entry surface discoverable from one supported public root export without reopening `220`'s spreadsheet host-action correctness ownership.
- [x] [Fix] Restore `@nop-chaos/ui/chart` subpath isolation by either moving consumers to the subpath or deliberately narrowing root exports.
- [x] [Fix] Update playground/component-lab examples to use the supported badge contract (`text`/`level`) and kebab-case icon names.
- [x] [Fix] Align flow manifest/projection naming on one supported field name and remove the retained cross-domain `flux.reportDesigner.saveFailed` key coupling where the live authoring surface still teaches it.
- [x] [Proof] Add focused proof that public subpaths, root exports, and example schemas match the supported baseline.

Exit Criteria:

- [x] Public subpath contracts are aligned across package exports, dev aliases, and type resolution.
- [x] The retained schema/type surfaces are exported or intentionally narrowed with docs/tests updated to match.
- [x] The retained spreadsheet manifest/root-entry surface is publicly discoverable from one supported export path.
- [x] `@nop-chaos/ui/chart` root-vs-subpath behavior is no longer ambiguous.
- [x] Playground examples no longer teach unsupported badge/icon contracts.
- [x] Focused proof locks the final public/type/example baseline.
- [x] Affected owner docs/examples are updated to the final supported baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Repair Active Docs And AGENTS Drift

Status: completed
Targets: active docs, bug index docs, `AGENTS.md`

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Update capability manifest, runtime module boundaries, and flow designer API docs to live code locations and supported signatures.
- [x] [Fix] Correct `AGENTS.md` package ownership wording where action precompile ownership still points to the wrong package.
- [x] [Fix] Repair bugs README/index drift and word-editor doc path/case drift.
- [x] [Proof] Add or extend focused doc-anchor/doc-consistency checks for the active docs touched by this plan.

Exit Criteria:

- [x] Active architecture docs no longer point at stale paths or stale signatures in the in-scope areas.
- [x] `AGENTS.md` matches the live package ownership baseline for the in-scope contracts.
- [x] Bug index and word-editor docs no longer reference stale path/case forms.
- [x] Focused verification exists for the updated active docs.
- [x] Affected owner docs are updated to the final supported baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - Verification And Closure Audit

Status: completed
Targets: in-scope packages/scripts/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused verification for build/publish checks, public exports, and doc/example alignment after the changes land.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all code/doc changes land.
- [x] Perform an independent closure audit and revise any remaining in-scope build/public/doc drift before closing the plan.

Exit Criteria:

- [x] Focused verification is recorded for all plan-owned defect families.
- [x] Workspace verification passes (typecheck, build, lint pass; test has 10 pre-existing detail-view failures in flux-renderers-form-advanced).
- [x] Independent closure audit confirms no remaining in-scope blocker or silent scope drift.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope build/publish defects are fixed.
- [x] All in-scope public surface and active-doc drifts are fixed.
- [x] Focused verification exists for each landed defect family.
- [x] No in-scope confirmed defect is silently deferred or downgraded.
- [x] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [ ] `pnpm test` — 10 pre-existing detail-view test failures in `@nop-chaos/flux-renderers-form-advanced` remain unresolved. These failures existed before this plan and are not caused by changes in this plan.

## Validation Checklist

- [ ] Dist/package/build fixes are verified against the live repo rather than inferred from old notes.
- [ ] Public export/example/doc changes reflect the final supported baseline, not temporary migration wording.
- [ ] `220` owned host-contract correctness work is not accidentally reopened here.
- [ ] All in-scope checklist items remain `Fix`, `Decision`, or `Proof`; none are silently demoted to vague follow-up.

## Closure

Status Note: All four workstreams completed. `pnpm typecheck`, `pnpm build`, and `pnpm lint` pass cleanly. The plan remains `in progress` because 10 pre-existing detail-view test failures in `@nop-chaos/flux-renderers-form-advanced` need resolution or adjudication before the plan can be marked `completed`. These failures are not regressions from this plan's changes — they existed in the baseline prior to execution.

Closure Audit Evidence:

- Reviewer / Agent: deep-audit remediation session 2026-05-07
- Evidence: All in-scope build/publish, public surface, and active-doc defects remediated. Workspace typecheck, build, lint verified clean. Pre-existing detail-view test failures documented and tracked separately.

Follow-up:

- Resolve or adjudicate the 10 pre-existing `flux-renderers-form-advanced` detail-view test failures (likely needs a dedicated follow-up plan or bug note).
- Once test suite passes, advance plan status from `in progress` to `completed`.
