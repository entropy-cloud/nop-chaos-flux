# Architecture Docs Index

## Purpose

`docs/architecture/` is the curated home for Flux's current final-state architecture baseline.

This subtree only carries:

- governing principles that explain the stable direction of the architecture
- normative architecture that defines current contracts and precedence
- platform-extension architecture for complex editable hosts and workbench-style integrations
- focused subsystem documents that refine one bounded area without changing top-level precedence

This subtree does not carry execution history, migration diaries, rejected alternatives, or long historical comparisons. Put those in `docs/analysis/`, `docs/plans/`, `docs/logs/`, or `docs/discussions/`.

Architecture docs must still explain why the current design exists, what constraints it preserves, and what nearby misreadings it rejects. The rule is not "conclusion only". The rule is "current-design rationale only".

## Hierarchy

### 1. Governing Principles

- `flux-design-principles.md`

Role:

- explains the architectural direction and stable design philosophy
- clarifies what Flux is trying to preserve across narrower subsystem rules
- does not override normative contracts by itself

### 2. Normative Architecture

Start here for contract precedence and primitive/core-boundary rules.

- `frontend-programming-model.md` - top-level normative precedence for primitive identity, macro layering, and core execution boundaries
- `flux-core.md` - current codebase-wide architecture baseline and high-level runtime composition
- `renderer-runtime.md` - renderer/runtime/React integration contract; local precedence for renderer behavior
- `flux-runtime-module-boundaries.md` - package ownership and runtime placement rules
- `data-domain-owner.md` - normative owner-semantics architecture for data ownership, validation ownership, and staged/live publish boundaries
- `action-algebra-formal-spec.md`
- `action-scope-and-imports.md`
- `node-level-compile-time-transforms.md`
- `api-data-source.md`
- `form-validation.md`
- `field-binding-and-renderer-contract.md`
- `field-metadata-slot-modeling.md`
- `scope-ownership-and-isolation.md`
- `flux-formula.md`
- `template-instantiation-and-node-identity.md`
- other active top-level subsystem docs that define current live contracts

Precedence model:

- `frontend-programming-model.md` owns top-level primitive and core-boundary precedence
- other normative docs keep local precedence inside their own subject area
- `flux-design-principles.md` guides direction and interpretation, but does not replace the normative contract chain

### 3. Platform Extension Architecture

These docs are core architecture, not peripheral domain appendices.

- `complex-control-host-protocol.md`
- `capability-projection-manifest.md`
- `flux-dsl-vm-extensibility.md`
- `flow-designer/`
- `report-designer/`

They belong here because they define how Flux hosts complex editable domains, workbench shells, bridge/snapshot boundaries, namespace actions, and reusable host-platform abstractions.

### 4. Focused Subsystem Docs

These docs refine one active topic without owning top-level primitive precedence.

They should:

- defer primitive/core-boundary questions back to `frontend-programming-model.md`
- defer codebase-wide baseline questions back to `flux-core.md`
- keep local precedence only inside their bounded topic

- rendering and slots: `scoped-render-slots.md`, `component-resolution.md`
- value and field families: `value-adaptation-and-detail-field.md`, `variant-field.md`, `object-field.md`, `array-field.md`, `composite-value-owner-clean-slate.md`
- owner semantics: `data-domain-owner.md`, `scope-ownership-and-isolation.md`, `surface-owner.md`, `form-validation.md`
- UI and styling: `styling-system.md`, `renderer-markers-and-selectors.md`, `theme-compatibility.md`, `surface-owner.md`, `field-frame.md`
- validation/performance/security/tooling specialties: `dependency-tracking.md`, `table-row-identity-and-scope-performance.md`, `schema-file-validator.md`, `node-level-compile-time-transforms.md`, `debugger-runtime.md`, `playground-experience.md`, `security-design-requirements.md`, `performance-design-requirements.md`

Some focused docs are stable long-term architecture. Others are candidates for later move or tightening. Use `docs/references/architecture-doc-status-matrix.md` for the current role and placement decision.

## Reading Order

### Core Orientation Path

1. `flux-design-principles.md`
2. `frontend-programming-model.md`
3. `flux-core.md`
4. `renderer-runtime.md`

### Platform Extension Path

1. `flux-design-principles.md`
2. `frontend-programming-model.md`
3. `complex-control-host-protocol.md`
4. `flow-designer/README.md` or `report-designer/README.md`
5. the relevant family design doc under that subdirectory

### Specialized Subsystem Path

1. `flux-design-principles.md` when the change may affect direction or architectural framing
2. the narrow normative owner doc for the topic
3. related focused subsystem docs

## Role Legend

- Governing principles: direction-setting baseline; explains why the architecture is shaped this way
- Normative architecture: active contract and precedence owner
- Platform extension architecture: active architecture for complex host/editor integration above the core primitive layer
- Focused subsystem doc: bounded rules inside one topic; may carry local precedence but not top-level primitive precedence
- Redirect/migration candidate: still readable here today, but owner placement is tracked in the status matrix

## Migration Rule

Use `docs/references/architecture-doc-status-matrix.md` before moving or rewriting architecture docs.

Rules:

1. Freeze role and owner decisions before physical path migration.
2. Keep `docs/index.md` as the global docs router and keep this file as the architecture hierarchy index.
3. Do not move a document only because the flat directory feels crowded.
4. Move a document only when its owner directory is clear and the successor path is stable.
5. If a document is still active but misplaced, add redirect and owner notes first; do not force an immediate move.

## Current Recommendation

- Treat `flux-design-principles.md` as the governing-principles anchor.
- Treat `frontend-programming-model.md` as the top normative precedence document.
- Treat `flow-designer` / `report-designer` / `complex-control-host-protocol.md` as core platform-extension architecture.
- Treat `docs/architecture/condition-builder.md` and `docs/architecture/code-editor.md` as redirect notes only; their long-term owners now live under `docs/components/`.
- Treat `docs/components/designer-page/design.md`, `docs/components/report-designer-page/design.md`, and `docs/components/spreadsheet-page/design.md` as renderer-owner docs that must defer family-level platform architecture back to `flow-designer/` and `report-designer/`.
- Route historical evolution, migration narratives, and option-comparison material to `docs/analysis/`, `docs/plans/`, `docs/logs/`, or `docs/discussions/` instead of growing this subtree sideways.
