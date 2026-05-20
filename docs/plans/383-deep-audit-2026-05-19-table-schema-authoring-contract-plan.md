# 383 Deep Audit 2026-05-19 Table Schema Authoring Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `12-03` 与 `12-04`：让 table public schema 回到 author-facing slot contract，而不是暴露 internal suffixes 或缺失 nested fields。

## Current Baseline

- `packages/flux-renderers-data/src/schemas.ts` 现在显式保留 public `loadingContent` authoring field，不再把旧 `loadingSlot` 当作 public schema surface。
- `packages/flux-renderers-data/src/schemas.ts` 现在补齐 author-facing nested column input fields：`label?: SchemaInput | string`, `cell?: SchemaInput`, `body?: SchemaInput`，与 live compiler deep-region extraction contract 对齐。

## Goals

- 修复 `12-03`、`12-04`。
- 同步 table schema authoring docs。

## Non-Goals

- 不处理 table runtime owner-state or event payload findings。

## Scope

### In Scope

- `12-03`, `12-04`
- `packages/flux-renderers-data/src/schemas.ts`
- related schema definitions/tests
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- runtime event and accessibility findings

## Execution Plan

### Phase 1 - Fix Table Authoring Schema Surface

Status: completed
Targets: table schema files, tests, owner doc

- Item Types: `Fix | Proof`
- [x] Remove internal-suffix authoring leakage from the public table schema.
- [x] Add the author-facing nested slot fields the table surface requires.
- [x] Update `docs/architecture/field-metadata-slot-modeling.md` to the final authoring contract.

Exit Criteria:

- [x] `12-03` and `12-04` are fixed.
- [x] Focused proof covers the final public schema shape.
- [x] `docs/architecture/field-metadata-slot-modeling.md` is updated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed after restoring the public table authoring contract around `loadingContent` and nested column slot inputs. The final focused proof now covers both the public authoring input shape and the documented deep-region extraction path where authored `table.columns[].body` compiles into `columns.N.quickEditBody` / `quickEditBodyRegionKey`.

Closure Audit Evidence:

- Reviewer / Agent: general subagent `ses_1bd3b1351ffe15B8pnpic10szn`
- Evidence: re-audit returned `Verdict: acceptable` with no remaining in-scope findings; it explicitly confirmed the public `loadingContent` surface, author-facing `label` / `cell` / `body` inputs, and the direct proof that authored `table.columns[].body` compiles into `columns.N.quickEditBody` / `quickEditBodyRegionKey`, with green `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` on the same live tree.
