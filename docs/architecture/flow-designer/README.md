# Flow Designer

`Flow Designer` is part of Flux platform-extension architecture.

It is not a side appendix and not a second runtime outside Flux. It is the architecture family that shows how Flux hosts complex graph-editing domains through host snapshots, namespaced actions, workbench shells, and schema-driven surrounding UI.

## Role

- extends Flux through a reusable complex-editor host model
- keeps graph algorithms and canvas specifics inside domain runtime layers
- reuses Flux renderer, action, scope, and schema composition contracts for the surrounding shell

Owner boundary:

- this family owns Flow Designer platform-extension architecture, host boundaries, collaboration model, and reusable editor-platform abstractions
- `docs/components/designer-page/design.md` owns only the `designer-page` renderer contract
- related component docs such as `designer-canvas`, `designer-palette`, and `designer-field` own single renderer design, not platform-family rules

Read this family when you need to understand:

- how a graph editor plugs into Flux without reopening the primitive set
- how `designer:*` actions, host scope, canvas adapters, and inspector shells cooperate
- where Flow Designer is a domain-specific implementation detail versus a reusable host-platform pattern

## Read In Order

1. `docs/architecture/complex-control-host-protocol.md`
2. `docs/architecture/flow-designer/design.md`
3. `docs/architecture/flow-designer/config-schema.md`
4. `docs/architecture/flow-designer/collaboration.md`
5. `docs/architecture/flow-designer/canvas-adapters.md`
6. `docs/architecture/flow-designer/api.md`
7. `docs/architecture/flow-designer/runtime-snapshot.md`

## Current Position

- Flow Designer is a core example of Flux platform extension architecture.
- Its importance comes from the reusable abstraction pattern for complex editable hosts, not from graph editing alone.
- Canvas internals, graph commands, layout rules, and document semantics remain domain-owned rather than promoted into Flux core.

## Family Docs

- `design.md` - overall architecture, runtime boundaries, and performance strategy
- `config-schema.md` - `designer-page`, `nodeTypes`, ports, edge config, and schema-owned shell structure
- `collaboration.md` - action flow, canvas/inspector/host collaboration chain, and runtime boundaries
- `canvas-adapters.md` - React Flow adapter boundary and failure semantics
- `api.md` - package APIs, extension points, host scope, and designer actions
- `runtime-snapshot.md` - current snapshot shape and live host-scope landing baseline

Related component owner docs:

- `docs/components/designer-page/design.md` - `designer-page` renderer contract
- `docs/components/designer-canvas/design.md` - canvas renderer contract
- `docs/components/designer-palette/design.md` - palette renderer contract
- `docs/components/designer-field/design.md` - field renderer contract

## Boundary Reminder

- Historical implementation phases belong in `docs/plans/`, `docs/analysis/`, and `docs/logs/`.
- This family should explain the current rationale for the host/editor split and Flux integration boundaries, but should not grow into a migration diary.
