# 72 Field Binding And Renderer Contract Unification Plan

> Plan Status: planned
> Last Reviewed: 2026-04-12
> Source: `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/form-validation.md`, `docs/architecture/value-adaptation-and-detail-field.md`, plus live-code audit of `packages/flux-core/src/types/schema.ts`, `packages/flux-core/src/constants.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`, `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form/src/renderers/composite-schemas.ts`, and representative renderer files under `packages/flux-renderers-basic`, `packages/flux-renderers-form`, `packages/flux-renderers-data`
> Related: `docs/plans/70-composite-value-fields-and-validation-integration-plan.md`, `docs/plans/68-owner-based-validation-runtime-alignment-plan.md`, `docs/plans/30-ui-package-adoption-audit-and-migration-plan.md`

## Purpose

把当前仓库已经存在但尚未完全收口的 field binding / renderer contract 统一成一套稳定可执行的 baseline，重点收口以下问题：

- editable field 到底使用 `name` 还是 `value`
- 哪些字段属于 `props`，哪些字段属于 `meta`
- 简单 input 与 composite field 是否共享同一套公共字段契约
- 哪些 renderer 还在错误回退读取 raw `schema`
- 作者侧 prop 什么时候应该与 `@nop-chaos/ui` 使用同一词汇

这份计划的目标不是“让所有 renderer 字段名完全一样”，而是“把原则上应统一的接口约束统一下来，同时避免为了复用而把代码变得更复杂”。

## Current Baseline

- `RendererComponentProps`、`SchemaFieldRule`、`props/meta/regions/events` 四通道已经 live，说明统一 contract 的宏观骨架已成立。
- `BaseSchema` 已包含 `name`，但 `packages/flux-core/src/constants.ts` 的 `META_FIELDS` 仍把 `name` 当作全局 meta 字段。
- 多个 form renderer 仍写成 `props.props.name ?? props.schema.name`、`props.props.readOnly ?? props.schema.readOnly`，说明 normalized channel 尚未真正收口。
- `packages/flux-renderers-form/src/schemas.ts` 的 `InputSchema` 与 `packages/flux-renderers-form/src/renderers/composite-schemas.ts` 的各类 composite schema 仍重复声明 `name` / `readOnly` 等公共字段，尚无共享 `BoundFieldSchemaBase`。
- 少量 non-form renderer 仍直接读取 raw `schema` 上的业务字段，例如 `statusPath`、`componentId`、部分 `title` / `label` fallback；这些字段尚未区分“本来就是 static structural field”还是“应进入 normalized props”。
- 仓库中已经存在 first-pass composite field 实现，因此当前问题是 cross-cutting contract drift，而不是组件根本不存在。换句话说，这份计划不负责“从零发明 field family”，而是负责“把跨组件的契约收口”。
- 作者侧词汇与 `@nop-chaos/ui` 的语义对齐仍有零散漂移，最明显的是少量 `variant` / `size` 映射仍维护两套平行命名。

## Goals

- 冻结一份 authoritative field binding baseline，明确 `name`、`value`、`readOnly`、`disabled`、`label`、`title`、`statusPath`、`componentId` 的归属规则。
- 让 editable field 的 `name` 通过 normalized `props` 到达 renderer，而不是继续依赖 raw schema fallback。
- 引入小而稳定的共享 field schema base，使简单 input 与 composite field 可以共享最小公共字段契约。
- 明确哪些 raw schema 直读仍然允许存在，并把它们限定为 documented static structural fields。
- 清理代表性 renderer 中与 normalized contract 冲突的 raw schema business-field 读取。
- 在语义完全等价的地方，与 `@nop-chaos/ui` 词汇保持一致，减少双词汇表。

## Non-Goals

- 不把所有作者侧业务字段都统一命名成 `value`。
- 不支持普通 editable field 同时拥有 `name` 与 `value` 两套双向绑定入口。
- 不在本计划内重做整个 renderer family 的产品能力，只处理 contract convergence 所必需的改动。
- 不要求一次性把全仓所有 renderer 全部重命名；只处理高价值、高歧义路径和代表性家族。
- 不在本计划内设计一套新的“单向受控 editable field without owner”框架；若未来真需要，应另立 successor plan。
- 不把 `detail-field` / `detail-view` 的 value-adaptation 生命周期重新设计一遍；只与本计划的 binding baseline 做交叉对齐。

## Scope

### In Scope

- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/index.md` (register the field-binding contract doc in the main navigation and keep task routing aligned with the landed baseline)
- `docs/architecture/README.md` (register the field-binding contract doc in the grouped architecture index)
- `packages/flux-core/src/types/schema.ts`
- `packages/flux-core/src/constants.ts`
- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/flux-runtime/src/schema-compiler/fields.ts`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-react/src/node-frame-wrapper.tsx`
- `packages/flux-react/src/field-frame.tsx` if wrapper alignment requires it
- `packages/flux-renderers-form/src/schemas.ts`
- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/flux-renderers-form/src/renderers/composite-schemas.ts`
- representative form renderer files under `packages/flux-renderers-form/src/renderers/`
- representative basic/data renderer files whose current implementation contradicts the normalized contract
- focused tests under `packages/flux-core`, `packages/flux-runtime`, `packages/flux-react`, and affected renderer packages
- `docs/logs/2026/04-12.md`

### Out Of Scope

- new complex controls unrelated to field binding convergence
- broad visual redesign or styling migration
- full workspace-wide schema vocabulary rewrite in one pass
- datasource / surface / action architecture redesign unrelated to field binding
- a generic one-way controlled editable-field runtime separate from owner/form binding

## Execution Plan

### Phase 1 - Contract Freeze And Drift Inventory

Status: planned
Targets: `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/value-adaptation-and-detail-field.md`

- [ ] Re-audit the live ambiguous field set and freeze the contract matrix for `name`, `value`, `label`, `title`, `readOnly`, `disabled`, `statusPath`, and `componentId`.
- [ ] Decide the minimal global meta set that should remain hard-coded, and explicitly identify which fields must become renderer-metadata-owned instead.
- [ ] Freeze the editable-field authoring rule: `name` is the only ordinary two-way binding entry; generic editable `value` is not supported as a peer contract.
- [ ] Freeze the allowed-scenarios list for `value` (`viewer` content, value-oriented owner payload, local scope `value`, diagnostic-only/test-only props) so later phases do not re-open the ambiguity.
- [ ] Cross-check the new baseline against `value-adaptation-and-detail-field.md` so that local scope `value` and owner payload `value` remain valid without being mistaken for generic editable-field schema props.
- [ ] Freeze which raw schema reads remain allowed as static structural fields and which must migrate into normalized `props`.

Exit Criteria:

- [ ] One reader can answer exactly when `value` is allowed, when it is forbidden, and why.
- [ ] The repo has one explicit answer for whether `name` belongs to `props` or `meta`.
- [ ] Any remaining raw schema direct-read path is either documented as structural or marked for migration.

### Phase 2 - Core Type And Compiler Alignment

Status: planned
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-core/src/constants.ts`, `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/schema-compiler/fields.ts`, `packages/flux-runtime/src/schema-compiler.ts`, focused core/runtime tests

- [ ] Introduce or extract the small shared schema bases required by the new baseline, such as a `BoundFieldSchemaBase`-like layer for `name` / `readOnly` / `required`.
- [ ] Update `packages/flux-core/src/constants.ts` so the default `META_FIELDS` set no longer treats `name` as global meta, and only keeps the fields that remain part of the agreed node-control baseline.
- [ ] Remove `name` from the default global meta classification path or otherwise make the compiler resolve it into normalized `props` rather than `meta`.
- [ ] Revisit the default handling of `label` / `title` so they no longer depend on unstable global-meta behavior where renderer metadata should own the semantics.
- [ ] Ensure the compiler and runtime state types still clearly distinguish node-control meta from business-facing props after the reclassification.
- [ ] Add focused tests proving `name` arrives through `props`, not only through raw schema fallback.

Exit Criteria:

- [ ] Core types expose one stable shared bound-field contract surface.
- [ ] Compiler/runtime tests prove `name` is delivered through the normalized business-prop path.
- [ ] The code no longer relies on `META_FIELDS` to smuggle editable binding keys through `meta`.

### Phase 3 - React Wrapper And Form Renderer Adoption

Status: planned
Targets: `packages/flux-react/src/node-frame-wrapper.tsx`, `packages/flux-react/src/field-frame.tsx` if needed, `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/flux-renderers-form/src/renderers/composite-schemas.ts`, representative form renderer files, focused tests

- [ ] Update `NodeFrameWrapper` and any adjacent helper so wrapper-level name/label resolution consumes normalized channels rather than raw schema fallback for fields that should already be normalized.
- [ ] Apply the shared bound-field base to simple input schemas and composite field schemas so `name` / `readOnly` / `required` stop being duplicated ad hoc.
- [ ] Introduce only the minimal helper surface needed for renderer adoption, for example `getBoundFieldName(props)` and/or one small shared field-schema utility in `field-utils.tsx`, instead of a giant abstract base renderer.
- [ ] Migrate representative form renderers away from `props.schema.name`, `props.schema.readOnly`, and similar raw-schema fallbacks where normalized props should already exist.
- [ ] Add focused tests or schema diagnostics that reject ambiguous editable-field authoring such as ordinary `name + value` dual-binding shapes.
- [ ] Update existing renderer test fixtures that currently rely on `meta` or raw-schema fallback for `name` / `readOnly` so they assert normalized `props` delivery instead.

Exit Criteria:

- [ ] Representative form renderers read bound-field state from normalized props plus hooks, not from raw schema fallback.
- [ ] Simple inputs and composite fields share the same minimal bound-field schema surface.
- [ ] Tests or diagnostics make the `name + value` ambiguity visible instead of silently guessing behavior.

### Phase 4 - Non-Form Contract Cleanup And Vocabulary Alignment

Status: planned
Targets: representative files under `packages/flux-renderers-basic/src/` and `packages/flux-renderers-data/src/`, related schema files, focused tests, docs if needed

- [ ] Audit representative non-form renderers for raw-schema reads that contradict the normalized contract.
- [ ] For each such field, do one of two things only: migrate it into normalized `props` / `meta`, or explicitly document it as a static structural field that remains raw-schema-only.
- [ ] Review obvious `@nop-chaos/ui`-equivalent prop surfaces such as button `variant` / `size`, and align the author-facing vocabulary where semantics truly match exactly.
- [ ] Limit vocabulary cleanup to places that already contain explicit dual-vocabulary mapping code or equivalent drift; do not add proactive rename work for fields that do not yet have a real competing synonym in live code.
- [ ] Avoid long-term dual vocabulary tables for semantically identical props; if compatibility is needed for existing shipped schemas, record the concrete migration reason instead of preserving silent duplication by default.

Exit Criteria:

- [ ] Representative non-form renderers no longer rely on undocumented raw-schema reads for business-facing runtime values.
- [ ] Structural raw-schema reads are explicitly documented, not accidental.
- [ ] At least the highest-value shadcn-equivalent prop drifts have an explicit convergence decision.

### Phase 5 - Verification, Docs Sync, And Closure Audit Prep

Status: planned
Targets: touched docs, touched tests, `docs/logs/2026/04-12.md`

- [ ] Update all touched architecture docs so the shipped contract is documented in one place without conflicting wording.
- [ ] Record implementation slices and key decisions in the daily log.
- [ ] Add or update focused tests covering compiler classification, wrapper behavior, form renderer adoption, and any vocabulary or diagnostics migrations landed under this plan.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm test`.
- [ ] Perform an independent closure audit in a fresh task session before marking the plan `completed`.

Exit Criteria:

- [ ] The docs describe one coherent field-binding and renderer-contract baseline.
- [ ] Focused tests cover the key contract shifts introduced by this plan.
- [ ] Full workspace verification is green.
- [ ] Independent closure-audit evidence is recorded.

## Risks And Rollback

- Reclassifying `name` away from global meta is the highest-risk change because it touches compiler, wrapper behavior, and multiple renderer families at once.
- `label` / `title` cleanup is the second highest-risk area because wrapper behavior and renderer-local slot/value semantics can drift if migrated piecemeal.
- Schema vocabulary alignment can accidentally turn into a repo-wide rename if not kept to semantic-equality cases only.

Rollback guidance:

- Land contract-freeze docs and focused tests before broad renderer edits.
- Migrate `name` first, then handle `label` / `title` and selected vocabulary cleanup.
- If an apparently simple vocabulary change turns out to have external schema compatibility cost, stop and record a concrete migration requirement rather than quietly preserving indefinite dual aliases.

## Validation Checklist

- [ ] `name` is documented and implemented as an ordinary bound-field prop rather than default global meta
- [ ] Generic editable `value` is explicitly documented as unsupported as a peer to `name`
- [ ] Shared bound-field schema base exists and is adopted by simple and composite form field schemas
- [ ] Wrapper behavior (`NodeFrameWrapper` and adjacent code) consumes normalized name/label paths consistently
- [ ] Representative form renderers no longer rely on raw schema fallback for normalized field props
- [ ] Representative non-form raw-schema business reads are either migrated or explicitly documented as structural fields
- [ ] High-value shadcn-equivalent prop drift has an explicit convergence decision
- [ ] Related docs are updated without conflicting baselines
- [ ] `docs/logs/` updated with execution notes and decisions
- [ ] Independent subagent or independent reviewer closure-audit evidence recorded before closure
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: fill after closure audit.

Closure Audit Evidence:

- Reviewer / Agent: fill after independent closure audit.
- Evidence: fill with task id, daily log link, and finding summary before marking the plan `completed`.

Follow-up:

- If execution reveals a real need for a separate one-way controlled editable-field model that is not owner/form-bound, create a successor plan instead of overloading this plan.
- If broader schema vocabulary migration is still desired after the high-value convergence slice, split that work into a dedicated successor plan rather than letting this contract plan expand indefinitely.
