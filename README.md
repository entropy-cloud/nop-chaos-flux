# NOP Chaos Flux

<div align="center">

**Write JSON, get UI. A modern low-code rendering framework built on seven primitives.**

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff.svg)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4-729b63.svg)](https://vitest.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38bdf8.svg)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-10-f69220.svg)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## A 15-Second Introduction

Describe your UI as JSON. Flux compiles it once, executes it through seven primitives.

```jsonc
{
  "type": "page",
  "title": "User Details",
  "body": [
    {
      "type": "text",
      "tag": "h2",
      "text": "Profile"
    },
    {
      "type": "container",
      "direction": "column",
      "gap": "md",
      "body": [
        { "type": "text", "text": "Name: ${user.name}" },
        { "type": "text", "text": "Email: ${user.email}" }
      ]
    }
  ]
}
```

A form with validation and submit:

```jsonc
{
  "type": "form",
  "id": "profile-form",
  "data": { "fullName": "Alice", "email": "alice@example.com" },
  "body": [
    { "type": "input-text", "name": "fullName", "label": "Full Name", "required": true },
    { "type": "input-email", "name": "email", "label": "Email", "required": true }
  ],
  "actions": [
    {
      "type": "button",
      "label": "Submit",
      "onClick": {
        "action": "submitForm",
        "formId": "profile-form",
        "api": { "method": "post", "url": "/api/profile" }
      }
    }
  ]
}
```

**What happens under the hood:**

1. **Compile** — The schema compiles into a value tree. Field names and `required` rules are extracted into a validation model.
2. **Instantiate** — The runtime creates a form instance with its own scope and state.
3. **Render** — The React renderer receives resolved props, meta, and validation state.
4. **Submit** — The `submitForm` action dispatches, validates, and calls the API.

---

## Design Philosophy

**Six core principles. Seven primitives. Clean boundaries.**

Flux is a ground-up rewrite of [Baidu AMIS](https://github.com/baidu/amis) — rethought around six principles and seven primitives:

| Primitive | Responsibility |
|---|---|
| **Base Tree** | Structure and lifecycle of schema nodes |
| **ScopeRef** | Lexical data environment |
| **Value** | Executable value model (literal, expression, template, array, object) |
| **Resource** | Runtime-owned value producer (data sources, API calls) |
| **Reaction** | Watch/effect primitive for declarative consequences |
| **Capability** | Authority primitive — the only path for side effects |
| **Host Projection** | Readonly host snapshot admission into schema-visible scope |

Everything else — forms, tables, dialogs, designers, validation, action orchestration — builds from these seven primitives. Complex runtime capabilities are derived systems, not new primitives.

### 1. DSL-First

**DSL is a first-class artifact — an editable, composable, transformable structure layer.**

In AMIS and similar frameworks, JSON is just an input format for the runtime. In Flux, DSL lives outside the runtime with its own lifecycle:

| Capability | Meaning |
|---|---|
| **Edit** | Source location preservation, aliases, editor metadata, round-trip fidelity |
| **Merge/Inherit** | `x:extends` inheritance, override expansion, fragment composition |
| **Pruning** | Permission trimming, feature flag pruning, profile assembly |
| **Transform** | i18n string replacement, static default expansion |
| **Metaprogramming** | Express variation through structural conventions, not runtime interface growth |

DSL is composable: transforms like permission pruning, i18n replacement, and default expansion operate independently. The DSL layer decouples from the runtime — authoring metadata changes must not alter runtime behavior. Complexity grows by extending existing simple forms, not by replacing the baseline mental model.

> "If a problem can be solved in structure transformation, it must not be dragged into the runtime surface."

### 2. Write-Execute Separation

**Authoring Model and Execution Model serve different optimization goals, separated by a pre-compilation boundary.**

Many frameworks maintain a single model where the runtime must directly carry the authoring structure. Flux intentionally does not do this:

| Dimension | Authoring Model | Execution Model |
|---|---|---|
| **Optimization goal** | Understandability, domain expressiveness, edit fidelity | Performance, internal concept unification, runtime overhead minimization |
| **Structure** | Source locations, aliases, editor metadata, domain-specific editing structure | Assembled final execution schema, no redundancy |
| **Correctness** | Round-trip fidelity, author intent is preserved | Behavioral equivalence, execution determinism |
| **Replaceability** | Multiple editors/designers/collaboration engines produce the same DSL | The same final execution schema runs across different runtime hosts |

The pre-compilation boundary keeps structural decisions (type resolution, renderer binding, default expansion) in the loader phase. The runtime sees zero overhead for these decisions.

### 3. Reactive Data-Driven

**The execution model is declarative-reactive with implicit dependency collection.**

Authors don't build imperative coupling chains unlike typical React or Vue applications. When a value reads a path through an expression, template, or dynamic value form, it naturally enters the dependency graph and re-evaluates when dependencies change.

Basic rhythm: **evaluate → collect dependencies → change propagation → selective re-evaluation → re-publish.**

| Concept | Principle |
|---|---|
| **Implicit dependency** | Dynamic value reads automatically enter the dependency set when they access a path |
| **Dynamic collection** | Dependencies are collected during evaluation, not declared statically |
| **Unified model** | `Value`, `Resource`, `Reaction` share the same dependency model, but consequences differ (recompute / dirty refresh / trigger a Capability) |
| **Store-level logic** | Reactive logic lives in the runtime/store layer, not injected into plain data objects |
| **Write-read separation** | All side effects converge to a single channel: `Capability` dispatch |

> "Dependency tracking is a top-level execution rule, not an implementation detail."

### 4. Progressive Evolution

**Complexity grows along stable paths from simple DSL forms, not by inflating the primitive set.**

When a need has a natural, simple DSL form, subsequent complexity should extend that form, not replace it with a different baseline mental model.

**DSL layer — simple forms grow naturally:**

```
Values:    literal → expression → anonymous source → named data-source (Resource)
Actions:   single dispatch → when guard → then/onError → parallel fan-out → compiled DAG
Structure: visible (display) → when (lifecycle) → loop (expansion) → dynamic-renderer (remote)
Host:      semantic commands → generic patch-style applyPatch
```

**Runtime layer — derived systems compose primitives:**

| Derived system | Composed from | Solves |
|---|---|---|
| **Action Algebra** | Capability + Value | Effect orchestration: when/then/onError/parallel compiled as a DAG |
| **Operation Control** | Capability + Resource | Shared execution control: timeout, cancellation, throttling, dedup, retry |
| **Semantic Lifecycle Entry** | Base Tree + ScopeRef + Value + Capability + Reaction | Node-owned business pipeline: form submit, dialog confirm, page enter |
| **FormRuntime / PageRuntime** | All primitives | Domain-specific runtimes: form validation-submit pipeline, page lifecycle |

**Evolution guardrails:** A new primitive category is introduced only if it is cross-domain, non-reducible, semantically stable, author-visible, and not just a convenience. Derived systems may be important in implementation, but they don't automatically promote to primitive status.

### 5. Lexical Ownership

**Data, capabilities, resources, reactions, and runtime sidecars follow lexical/child-tree boundaries, not global registries.**

| Lookup mechanism | Purpose |
|---|---|
| **Data lookup (ScopeRef)** | What values are visible here (`${doc.name}`) |
| **Behavior lookup (ActionScope)** | What actions can fire here (`ajax`, `submitForm`, `designer:addNode`) |
| **Instance targeting (ComponentHandleRegistry)** | Which live instance to target (`componentId: userForm`) |

Child scopes naturally shadow parent bindings through lexical scoping, not global override. Resource binding targets determine scope by lexical ownership, not by global identity. The same binding path can independently exist in different lexical scopes. A duplicate within the same lexical scope is invalid.

Runtime sidecars (Resource state, Reaction state, cache, diagnostics) follow lexical ownership, but must not become methods or mutable protocol objects mounted on ScopeRef. The scope's job is to carry the data environment, not bridge, controller, or handle objects.

### 6. Domain Isolation and Abstraction

**The core maintains a small, stable abstraction layer. Domain complexity lives outside the core, embedded through narrow contracts.**

The judgment standard: "Can the core provide a stable embedding surface for complex systems without forcing domain complexity back into the core vocabulary?"

| Direction | Mechanism | Meaning |
|---|---|---|
| **Core → Domain (read)** | Host Projection | Read-only snapshot projection, host drives refresh |
| **Domain → Core (write)** | Capability | Namespaced command dispatch (like `designer:*`) |
| **Instance targeting** | ComponentHandleRegistry | Explicit component instance method invocation |
| **Host-private** | DomainBridge | `getSnapshot/subscribe/dispatch`, doesn't enter schema-visible scope |

**Why the core stays stable:**

Graph algorithms, layout, collision detection, collaboration protocols, CRDT/OT, local-first sync, gesture loops — these are important, but they are **domain systems** and should not become core primitives. In Flux they are production strategies behind Resource, host snapshots behind Host Projection, or command systems behind Capability.

New domains embed through declarative host types + projection fields + capability namespaces, without introducing new global provider families, environment registries, or new schema authority channels.

---

## Comparison with AMIS

Flux is a rewrite of AMIS. Here are the key architectural differences:

| Aspect | AMIS | Flux |
|---|---|---|
| **Field semantics** | Parallel suffix families: `visible`/`visibleOn`/`hidden`/`hiddenOn`/`disabledOn`/`classNameExpr` | Unified field, compiler determines meaning from metadata |
| **Expression model** | Runtime interpretation with partial caching | Compile-once value tree, static parts return by reference |
| **Scope model** | Merged objects per evaluation | Lexical path lookup (`scope.get(path)`) |
| **Side effects** | Mixed with data access through similar mechanisms | Orthogonal: data (ScopeRef) + actions (ActionScope) + instances (ComponentHandleRegistry) |
| **Template model** | Compiled nodes treated as live instances | Compile-once template graph + per-instance runtime state |
| **Theme** | Custom CSS-in-JS | CSS variable contract, no ThemeProvider |
| **Security** | Some `new Function` / `with(scope)` patterns | No `eval`, `new Function`, or `with(scope)` in first-party source |

```javascript
// AMIS: parallel field families
{
  "visible": true,
  "visibleOn": "this.status === 'active'",
  "hidden": false,
  "hiddenOn": "this.status === 'archived'",
  "classNameExpr": "statusClass"
}

// Flux: unified — compiler handles semantics
{
  "visible": "${status === 'active'}",
  "className": "${statusClass}"
}
```

---

## What You Can Build

| Capability | Description |
|---|---|
| **Pages and layouts** | Compose pages from containers, text, buttons, dialogs — all from JSON |
| **Forms with validation** | Typed inputs, required rules, async validation, submit-to-API — no JSX required |
| **Data tables** | CRUD tables with search, pagination, row actions, and scope-per-row |
| **Flow Designer** | Full graph editor: drag-and-drop nodes, connect ports, undo/redo, configurable toolbar and inspector |
| **Spreadsheet Editor** | Excel-like multi-sheet editing with merge, resize, selection, and formula support |
| **Report Designer** | Report semantic overlays on top of the spreadsheet, with field panels and preview integration |
| **Word Editor** | Document editing with formatting, tables, and sections |
| **Debugger** | Floating dev panel with event timeline, node inspector, scope viewer, plus structured automation API for AI/E2E |

All designers and editors are driven entirely by JSON configuration — node types, ports, connection rules, toolbar items, inspector panels — without modifying framework code.

---

## Quick Start

```bash
# prerequisites: Node.js LTS, pnpm 10+
pnpm install
pnpm dev            # http://localhost:5173
```

```bash
pnpm typecheck      # type-check all packages
pnpm build          # build all packages
pnpm test           # unit tests (Vitest)
pnpm lint           # lint all packages
pnpm test:e2e       # Playwright E2E (headless)

# per-package
pnpm --filter @nop-chaos/flux-runtime test
pnpm --filter @nop-chaos/flow-designer-core typecheck
```

---

## Connecting to Data

Data enters the scope through three paths:

1. **Page-level data** — `{ "type": "page", "data": { "user": {...} } }`
2. **Data sources** — Named publishers: `{ "type": "data-source", "name": "users", "api": {...} }`
3. **Action results** — Targeted via `dataPath`: `{ "action": "ajax", "api": {...}, "dataPath": "searchResult" }`

```jsonc
{
  "type": "page",
  "data": { "currentUser": { "role": "admin" } },
  "body": [
    {
      "type": "button",
      "label": "Load Users",
      "onClick": {
        "action": "ajax",
        "api": { "method": "get", "url": "/api/users" },
        "dataPath": "users"
      }
    },
    {
      "type": "table",
      "source": "${users.items}",
      "columns": [
        { "label": "Name", "name": "name" },
        { "label": "Email", "name": "email" }
      ]
    }
  ]
}
```

---

## Architecture

### Five Layers

```
JSON Schema
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│  FluxCore          Seven primitives, types, utilities    │
├─────────────────────────────────────────────────────────┤
│  ExpressionCompiler  Compile expressions & templates     │
├─────────────────────────────────────────────────────────┤
│  SchemaCompiler      Normalize schema, classify fields  │
├─────────────────────────────────────────────────────────┤
│  RendererRuntime     Scope, actions, forms, validation   │
├─────────────────────────────────────────────────────────┤
│  React Renderer      Hooks, render handles, components   │
└─────────────────────────────────────────────────────────┘
```

### Key Design Rules

**Boundary inputs stay explicit.**

Renderer components receive explicit props, meta, and regions.

**Ambient runtime capabilities come from hooks.**

Components use hooks for scope access, action dispatch, and fragment rendering — not prop-drilling chains.

**Local fragment rendering uses explicit render handles.**

Child regions are pre-compiled render handles passed through `props.regions`, not ad-hoc React calls.

**Renderers emit marker classes only — no implicit layout.**

Markers (`nop-container`, `nop-page`, `nop-field`) identify renderer type only. All visual styles come from schema (`className`, semantic props, `classAliases`). The same renderer can look completely different depending on its schema configuration.

**Theme compatibility is a CSS contract, not a runtime provider contract.**

Renderers emit stable DOM classes and read CSS variables. Hosts override variables under `.nop-theme-root`. No `ThemeProvider` required.

---

## Extension Model

### Namespaced Actions

The built-in action system extends via namespaced action scopes:

```typescript
// Designer-specific actions — isolated from data scope
"designer:addNode"
"designer:export"

// Register your own namespace
actionScope.register('myApp:open', handler);
```

### Declarative Capability Import

External library capabilities import into the action scope without polluting the data scope:

```text
ScopeRef (data)       →  "what values are visible"   (${doc.name})
ActionScope (actions)  →  "what actions can fire"     (designer:addNode)
ComponentRegistry      →  "which instance to target"  (componentId: userForm)
xui:imports            →  "import external capabilities"
```

Adding `designer:*` actions for a graph editor doesn't leak into every data scope. Importing an external library doesn't pollute the data tree.

---

## Repository Structure

```text
nop-chaos-flux/
├── apps/
│   └── playground/                    # Dev playground (scenario-based pages)
├── packages/
│   ├── flux-core                      # Seven primitives, types, pure utils
│   ├── flux-formula                   # Expression/template compiler
│   ├── flux-runtime                   # Runtime: scope, actions, forms, validation
│   ├── flux-react                     # React layer: hooks, render handles
│   ├── flux-renderers-basic           # page, text, container, button...
│   ├── flux-renderers-form            # input, select, form...
│   ├── flux-renderers-data            # table, crud, tree...
│   ├── flow-designer-core             # Graph runtime (no React)
│   ├── flow-designer-renderers        # Flow Designer React integration
│   ├── spreadsheet-core               # Workbook/cell engine (no React)
│   ├── spreadsheet-renderers          # Spreadsheet React integration
│   ├── report-designer-core           # Report semantics (no React)
│   ├── report-designer-renderers      # Report Designer React integration
│   ├── word-editor-core / renderers   # Word editor
│   ├── flux-code-editor              # Code editor
│   ├── ui                             # shadcn/ui components (@nop-chaos/ui)
│   ├── nop-debugger                   # Debugger + automation API
│   └── tailwind-preset                # TailwindCSS preset and base styles
└── docs/                              # Architecture, references, examples, logs
```

Domain core packages (`*-core`) are pure logic — no React, no framework dependency. Their matching `-renderers` packages bridge into the Flux rendering system.

```text
flux-core → flux-formula → flux-runtime → flux-react → renderers-*
                                                      designers-*
                                                      nop-debugger
                                                      playground
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| UI framework | React 19 |
| Type system | TypeScript 6.0 (strict) |
| State management | Zustand (vanilla stores, framework-agnostic) |
| Build | Vite 8 |
| Tests | Vitest 4 + Playwright 1.59 |
| Styling | TailwindCSS 4 + shadcn/ui |
| Graph canvas | @xyflow/react |

---

## Debugger

`@nop-chaos/nop-debugger` serves two audiences:

**For developers** — a floating panel with event timeline, node inspector, scope viewer, and action trace.

**For AI agents and E2E tests** — a structured automation API:

```typescript
window.__NOP_DEBUGGER_API__.getPinnedErrors();
window.__NOP_DEBUGGER_API__.getLatestFailedRequest();
window.__NOP_DEBUGGER_API__.getRecentFailures({ limit: 5 });
```

---

## Documentation

All documentation lives in `docs/`. Start at [`docs/index.md`](docs/index.md) for a task-based navigation table.

**Core architecture:**

| Document | Covers |
|---|---|
| [`flux-design-principles.md`](docs/architecture/flux-design-principles.md) | Six core design principles distilled from the programming model |
| [`flux-core.md`](docs/architecture/flux-core.md) | Seven primitives, unified value semantics, scope model |
| [`frontend-programming-model.md`](docs/architecture/frontend-programming-model.md) | Primitive promotion test, extensibility boundaries, final execution schema |
| [`renderer-runtime.md`](docs/architecture/renderer-runtime.md) | Renderer contracts, hooks, fragment rendering |
| [`field-metadata-slot-modeling.md`](docs/architecture/field-metadata-slot-modeling.md) | Field semantics, value-or-region, renderer metadata |
| [`component-resolution.md`](docs/architecture/component-resolution.md) | Template vs. instance, static target plans |
| [`template-instantiation-and-node-identity.md`](docs/architecture/template-instantiation-and-node-identity.md) | Compile-once model, template vs. instance identity |

**Domain-specific:**

| Document | Covers |
|---|---|
| [`flow-designer/design.md`](docs/architecture/flow-designer/design.md) | Flow Designer architecture |
| [`report-designer/design.md`](docs/architecture/report-designer/design.md) | Report Designer / Spreadsheet architecture |
| [`debugger-runtime.md`](docs/architecture/debugger-runtime.md) | Debugger architecture and automation API |
| [`form-validation.md`](docs/architecture/form-validation.md) | Validation rules and field participation |
| [`dependency-tracking.md`](docs/architecture/dependency-tracking.md) | Scope dependency collection and invalidation |
| [`api-data-source.md`](docs/architecture/api-data-source.md) | API requests, data sources, and reactions |
| [`flux-dsl-vm-extensibility.md`](docs/architecture/flux-dsl-vm-extensibility.md) | Flux as DSL VM — where extensibility belongs |
| [`styling-system.md`](docs/architecture/styling-system.md) | Renderer styling contract and shadcn/ui integration |
| [`theme-compatibility.md`](docs/architecture/theme-compatibility.md) | Host theme integration, CSS variables |

**Implementation guidance:**

| Document | Covers |
|---|---|
| [`flux-runtime-module-boundaries.md`](docs/architecture/flux-runtime-module-boundaries.md) | File placement and ownership in the runtime package |
| [`renderer-markers-and-selectors.md`](docs/architecture/renderer-markers-and-selectors.md) | DOM marker protocol, state attributes, testing selectors |

---

## Contributing

- ESM-first, TypeScript strict mode
- Zustand vanilla stores (framework-agnostic), React subscriptions via `use-sync-external-store`
- UI components from `@nop-chaos/ui` (shadcn/ui) — no raw HTML elements in renderers
- Tests: Vitest, colocated (`*.test.ts` / `*.test.tsx`)
- Workspace protocol: `"@nop-chaos/flux-core": "workspace:*"`
- See [`AGENTS.md`](AGENTS.md) for full development conventions

---

## License

MIT — see [LICENSE](LICENSE).

Inspired by [Baidu AMIS](https://github.com/baidu/amis). This project is a full architectural rewrite with a compile-once execution model, orthogonal scope design, and top-down, clean-slate architecture.
