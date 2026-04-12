# Architecture Doc Status Matrix

## Purpose

This file records the current role, status, owner placement, and migration decision for architecture-facing documentation.

Use it before:

- rewriting `docs/architecture/README.md`
- moving docs across `architecture/`, `components/`, `references/`, or other families
- expanding a document whose role is currently ambiguous

Status values used here:

- `active` - current baseline in its present location
- `active-with-cleanup` - current baseline, but needs history/rationale cleanup or wording tightening
- `redirect-candidate` - still useful now, but long-term owner should move elsewhere
- `summary-secondary` - useful routing/summary doc, but not a primary contract owner

## Top-Level `docs/architecture/*.md`

| Document | Role | Status | Primary owner directory | Depends on | Overlap / migration note |
| --- | --- | --- | --- | --- | --- |
| `docs/architecture/README.md` | architecture hierarchy index | active | `docs/architecture/` | `docs/index.md`, this matrix | Owns architecture hierarchy only; global routing stays in `docs/index.md`. |
| `docs/architecture/action-algebra-formal-spec.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/action-scope-and-imports.md` | Local precedence for action control-flow semantics. |
| `docs/architecture/action-graph-authoring.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/action-algebra-formal-spec.md` | Active design doc for visual/graph authoring of action flows. |
| `docs/architecture/action-interaction-state.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/form-validation.md` | Stays in architecture. |
| `docs/architecture/action-scope-and-imports.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/renderer-runtime.md` | Local precedence for action namespaces and import boundaries. |
| `docs/architecture/api-data-source.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/action-scope-and-imports.md` | Local precedence for resource/api/data-source behavior. |
| `docs/architecture/array-field.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/value-adaptation-and-detail-field.md` | Field-family design; remains architecture-level because it defines reusable field-model rules. |
| `docs/architecture/code-editor.md` | component/compound-control design doc | redirect-candidate | `docs/components/` or dedicated component-family doc | `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md` | Content is largely component-level schema and implementation design, not general architecture. Create a successor move plan if this doc keeps evolving. |
| `docs/architecture/complex-control-host-protocol.md` | platform-extension architecture | active-with-cleanup | `docs/architecture/` | `docs/architecture/frontend-programming-model.md` | Keep in architecture; trim plan-derived implementation-history sections over time while preserving current protocol rationale. |
| `docs/architecture/component-resolution.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/renderer-runtime.md` | Stays in architecture. |
| `docs/architecture/condition-builder.md` | component-design doc in architecture tree | redirect-candidate | `docs/components/condition-builder/` | `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md` | Overlaps `docs/components/condition-builder/design.md`. Successor move should either replace this file with a short redirect note or merge unique contract content into the component doc. |
| `docs/architecture/debugger-runtime.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/renderer-runtime.md`, `docs/architecture/complex-control-host-protocol.md` | Tooling architecture, still belongs here. |
| `docs/architecture/dependency-tracking.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-core.md` | Stays in architecture. |
| `docs/architecture/field-binding-and-renderer-contract.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md` | Local precedence for prop/meta/name/value channel boundaries. |
| `docs/architecture/field-frame.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/styling-system.md` | Stays in architecture. |
| `docs/architecture/field-metadata-slot-modeling.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/renderer-runtime.md` | Local precedence for field metadata, slots, and wrapper chrome. |
| `docs/architecture/form-validation.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-runtime-module-boundaries.md` | Local precedence for validation semantics. |
| `docs/architecture/frontend-baseline.md` | focused subsystem doc | active | `docs/architecture/` | `package.json`, workspace baseline docs | Tooling/package baseline; remains architecture-adjacent. |
| `docs/architecture/frontend-programming-model.md` | top-level normative architecture | active | `docs/architecture/` | none | Owns primitive/core-boundary precedence. |
| `docs/architecture/flux-core.md` | normative architecture baseline | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md` | Stays in architecture; local high-level runtime baseline. |
| `docs/architecture/flux-design-principles.md` | governing principles | active-with-cleanup | `docs/architecture/` | `docs/architecture/frontend-programming-model.md` | Keep in architecture as the governing-principles anchor; clarify it is not merely a derived reference and does not replace normative precedence. |
| `docs/architecture/flux-dsl-vm-extensibility.md` | platform-extension architecture framing | active-with-cleanup | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/complex-control-host-protocol.md` | Keep in architecture, but tighten wording so it reinforces platform-extension architecture rather than sounding like design tools are merely incidental. |
| `docs/architecture/flux-runtime-module-boundaries.md` | normative package-boundary doc | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-core.md` | Stays in architecture. |
| `docs/architecture/object-field.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/value-adaptation-and-detail-field.md` | Stays in architecture. |
| `docs/architecture/performance-design-requirements.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/renderer-runtime.md` | Stays in architecture. |
| `docs/architecture/playground-experience.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/debugger-runtime.md` | Stays in architecture. |
| `docs/architecture/renderer-markers-and-selectors.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/styling-system.md` | Stays in architecture. |
| `docs/architecture/renderer-runtime.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-core.md` | Local precedence for renderer/runtime/React integration. |
| `docs/architecture/schema-file-validator.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/action-scope-and-imports.md` | Stays in architecture. |
| `docs/architecture/scoped-render-slots.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md` | Stays in architecture. |
| `docs/architecture/scope-ownership-and-isolation.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/renderer-runtime.md` | Local precedence for scope ownership rules. |
| `docs/architecture/security-design-requirements.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/action-scope-and-imports.md` | Stays in architecture. |
| `docs/architecture/styling-system.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/renderer-runtime.md` | Local precedence for renderer styling contract. |
| `docs/architecture/surface-owner.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/action-interaction-state.md`, `docs/architecture/scope-ownership-and-isolation.md` | Stays in architecture. |
| `docs/architecture/table-row-identity-and-scope-performance.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/dependency-tracking.md`, `docs/architecture/template-instantiation-and-node-identity.md` | Stays in architecture. |
| `docs/architecture/template-instantiation-and-node-identity.md` | normative subsystem architecture | active | `docs/architecture/` | `docs/architecture/frontend-programming-model.md`, `docs/architecture/renderer-runtime.md` | Local precedence for template/instance identity. |
| `docs/architecture/theme-compatibility.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/styling-system.md` | Stays in architecture. |
| `docs/architecture/value-adaptation-and-detail-field.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/action-scope-and-imports.md` | Stays in architecture. |
| `docs/architecture/variant-field.md` | focused subsystem doc | active | `docs/architecture/` | `docs/architecture/value-adaptation-and-detail-field.md` | Stays in architecture. |

## Family And Routing Docs In Hierarchy Scope

| Document | Role | Status | Primary owner directory | Depends on | Overlap / migration note |
| --- | --- | --- | --- | --- | --- |
| `docs/index.md` | global docs router | active-with-cleanup | `docs/` | `docs/architecture/README.md` | Should route into architecture hierarchy without repeating stale old positioning language. |
| `docs/architecture/flow-designer/README.md` | platform-extension family index | active-with-cleanup | `docs/architecture/flow-designer/` | `docs/architecture/README.md`, `docs/architecture/complex-control-host-protocol.md` | Keep here; frame as platform-extension family entry, not specialized appendix. |
| `docs/architecture/report-designer/README.md` | platform-extension family index | active-with-cleanup | `docs/architecture/report-designer/` | `docs/architecture/README.md`, `docs/architecture/complex-control-host-protocol.md` | Keep here; frame as platform-extension family entry, not specialized appendix. |
| `docs/components/index.md` | component-family index | active | `docs/components/` | `docs/index.md` | Keep as component-entry router; should remain distinct from architecture hierarchy. |
| `docs/components/condition-builder/design.md` | component design owner | active | `docs/components/condition-builder/` | `docs/components/index.md`, relevant architecture docs | This is the correct long-term owner for condition-builder component design. |
| `docs/standardization.md` | compact summary routing doc | summary-secondary | `docs/` | core architecture and reference docs | Keep as summary only; do not let it become a second architecture baseline. |

## Current Owner Decisions

- `flux-design-principles.md` remains in `docs/architecture/` as the governing-principles document.
- `frontend-programming-model.md` remains the top normative precedence document.
- `flow-designer` and `report-designer` remain first-class architecture families under `docs/architecture/`.
- `complex-control-host-protocol.md` remains in `docs/architecture/` as shared platform-extension architecture.
- `condition-builder.md` should not remain a long-term primary owner in `docs/architecture/`; `docs/components/condition-builder/design.md` is the owner destination.
- `code-editor.md` should not continue growing as a top-level architecture owner; it needs a later successor move into a component-oriented family.

## Cleanup Strategies

- For docs marked `active-with-cleanup`, keep the current path but gradually remove execution-history narration, stale plan references, and long implementation timelines from the main body.
- When a doc lacks enough rationale, add current-design reasoning around constraints, boundary choices, and common misreadings instead of adding history sections.
- When a doc is a redirect candidate, do not expand its scope in place. Prefer moving the owner baseline first, then replacing the old location with a short redirect note in a successor plan.

## Successor Boundary

This matrix freezes owner decisions. It does not itself perform large physical moves or full cross-link rewrites.

Successor work, if needed:

- move `docs/architecture/condition-builder.md` to component-owned documentation and leave a redirect note
- move `docs/architecture/code-editor.md` into a component-owned family and repair inbound links
- clean plan/history-heavy sections out of selected `active-with-cleanup` architecture docs without changing their technical baseline
