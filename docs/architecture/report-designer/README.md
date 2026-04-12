# Report Designer

`Report Designer` is part of Flux platform-extension architecture.

It is not a narrow product appendix for `nop-report`. This family documents how Flux hosts spreadsheet-style and report-style editable workbenches through reusable host boundaries, schema-driven shells, and domain adapters layered above Flux core.

## Role

- defines a reusable workbench/editor integration pattern for spreadsheet and report domains
- keeps spreadsheet/report document semantics and codecs in domain layers
- reuses Flux contracts for shell composition, action routing, host projections, and surrounding UI integration

Owner boundary:

- this family owns Report Designer and Spreadsheet Editor platform-extension architecture, host boundaries, adapter contracts, and reusable workbench abstractions
- `docs/components/report-designer-page/design.md` owns only the `report-designer-page` renderer contract
- `docs/components/spreadsheet-page/design.md` owns only the `spreadsheet-page` renderer contract
- related component docs such as `report-inspector`, `report-field-panel`, and `report-toolbar` own single renderer design, not family-level architecture

Read this family when you need to understand:

- how spreadsheet/report editors fit into Flux without becoming a separate platform
- how report semantics stay outside Flux core while still integrating through stable host boundaries
- how shell regions, property panels, toolbars, adapters, and host actions are composed

## Read In Order

1. `docs/architecture/complex-control-host-protocol.md`
2. `docs/architecture/report-designer/design.md`
3. `docs/architecture/report-designer/contracts.md`
4. `docs/architecture/report-designer/config-schema.md`
5. `docs/architecture/report-designer/api.md`
6. the narrower family doc for the active topic

## Current Position

- Report Designer and Spreadsheet Editor together represent a core Flux platform-extension pattern.
- Their architectural value is the reusable host/editor abstraction, not only one business domain.
- `nop-report` is an adapter target, not the owner of the general architecture.

## Family Docs

- `design.md` - overall architecture, runtime boundaries, module split, and performance strategy
- `contracts.md` - implementation-oriented contracts and adapter interfaces
- `config-schema.md` - `spreadsheet-page`, `report-designer-page`, document model, and shell fragment config
- `api.md` - package APIs, host scope, and namespaced actions
- `inspector-design.md` - property-panel shell/provider/panel descriptor design
- `nop-report-profile.md` - how the generic designer adapts to `nop-report`
- `codec-design.md` - round-trip codec design
- `spreadsheet-canvas-css.md` - performance-critical spreadsheet canvas styling strategy

Related component owner docs:

- `docs/components/report-designer-page/design.md` - `report-designer-page` renderer contract
- `docs/components/spreadsheet-page/design.md` - `spreadsheet-page` renderer contract
- `docs/components/report-inspector/design.md` - inspector renderer contract
- `docs/components/report-field-panel/design.md` - field-panel renderer contract
- `docs/components/report-toolbar/design.md` - toolbar renderer contract

## Boundary Reminder

- Historical migration notes and execution history belong in `docs/plans/`, `docs/analysis/`, and `docs/logs/`.
- This family should keep current-design rationale around domain isolation, adapter boundaries, and workbench integration, but should not become a product-history archive.
