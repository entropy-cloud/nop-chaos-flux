# NOP Chaos AMIS Documentation Index

## Purpose

This `docs/` tree is the curated documentation entry for the current repository state.

- Read here first before editing docs or changing architecture.
- Prefer the curated files under `docs/` for ongoing work.
- Full legacy source material is archived under `docs/archive/` so no design information is lost.

## Reading Guide

Choose the smallest document that matches the task.

| If you need to... | Read this first | Then read |
| --- | --- | --- |
| Understand the current official architecture direction | `docs/architecture/amis-core.md` | `docs/architecture/renderer-runtime.md` |
| Change React integration, renderer contracts, or region rendering | `docs/architecture/renderer-runtime.md` | `docs/references/renderer-interfaces.md` |
| Check workspace, package layout, naming, or quality gates | `docs/architecture/frontend-baseline.md` | `docs/plans/development-plan.md` |
| Continue implementation planning | `docs/plans/development-plan.md` | `docs/architecture/amis-core.md` |
| Inspect the example CRUD schema | `docs/examples/user-management-schema.md` | `docs/architecture/amis-core.md` |
| Review interface boundaries and terminology | `docs/references/renderer-interfaces.md` | `docs/architecture/renderer-runtime.md` |
| Understand the old expression prototype and what should be preserved | `docs/references/expression-processor-notes.md` | `docs/architecture/amis-core.md` |

## Document Roles

### Official baselines

- `docs/architecture/amis-core.md`
  - Current official architecture direction.
  - Use this when schema semantics, scope behavior, expression execution, and runtime model are in question.
- `docs/architecture/renderer-runtime.md`
  - Internal renderer and React integration design.
  - Use this when changing component contracts, hooks, regions, and performance behavior.
- `docs/architecture/frontend-baseline.md`
  - Workspace and engineering baseline for this repo.
  - Use this when changing package layout, tooling, testing, and naming conventions.

### Working plan

- `docs/plans/development-plan.md`
  - Delivery phases, current progress snapshot, and next major implementation steps.

### References

- `docs/references/renderer-interfaces.md`
  - Human-readable interface map for the renderer system.
  - This is a reference, not the runtime source of truth.
- `docs/references/expression-processor-notes.md`
  - Notes extracted from the early prototype in `docs/archive/expression-processor.js`.
  - Keep the semantics, not the unsafe execution mechanism.

### Example

- `docs/examples/user-management-schema.md`
  - Single example schema that demonstrates the core behavior once each.

## Source-of-Truth Notes

- Architecture intent lives primarily in `docs/architecture/amis-core.md` and `docs/architecture/renderer-runtime.md`.
- Runtime code and exported types live in `packages/amis-schema/src/index.ts`, `packages/amis-runtime/src/index.ts`, and `packages/amis-react/src/index.tsx`.
- Example behavior should stay aligned with `apps/playground/src/App.tsx`.

## Archive Sources

The original root-level source materials are preserved under `docs/archive/` for cross-checking and historical context:

- `docs/archive/nop-chaos-amis.md`
- `docs/archive/nop-chaos-amis-renderer-design.md`
- `docs/archive/nop-chaos-frontend-arch.md`
- `docs/archive/nop-chaos-amis-development-plan.md`
- `docs/archive/nop-chaos-amis-renderer-interfaces.ts`
- `docs/archive/expression-processor.js`

When updating documentation, edit the curated file under `docs/` first and consult the archive only when you need original draft context.
