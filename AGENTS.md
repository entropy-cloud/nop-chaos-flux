# AGENTS.md

## Project Overview

`nop-chaos-flux` (formerly nop-chaos-amis) is a modern rewrite of the AMIS low-code renderer.

**Tech Stack**: React 19, Zustand, TypeScript 5.9, Vite 8, Vitest, pnpm workspace.

**Workspace Packages**:
- `@nop-chaos/flux-core` - Pure types/interfaces (no runtime code).
- `@nop-chaos/flux-formula` - Expression compiler/evaluator.
- `@nop-chaos/flux-runtime` - Core runtime (Zustand stores, validation, actions).
- `@nop-chaos/flux-react` - React rendering layer.
- `@nop-chaos/flux-renderers-basic` - Basic renderers (page, text, container, etc.).
- `@nop-chaos/flux-renderers-form` - Form renderers.
- `@nop-chaos/flux-renderers-data` - Data renderers.
- `@nop-chaos/nop-debugger` - Devtools/debugger panel.
- `@nop-chaos/flux-testing` - Shared test utilities.
- `apps/playground` - Dev playground.

**Dependency Flow**:
```
flux-core -> flux-formula -> flux-runtime -> flux-react -> flux-renderers-*
                                                          -> nop-debugger
                                                          -> apps/playground
```

---

## Commands

```bash
# install deps
pnpm install

# dev
pnpm dev                    # starts playground

# verify
pnpm typecheck              # all packages
pnpm build                  # all packages
pnpm test                   # all packages
pnpm lint                   # all packages

# per package
pnpm --filter @nop-chaos/flux-runtime typecheck
pnpm --filter @nop-chaos/flux-runtime build
pnpm --filter @nop-chaos/flux-runtime test
pnpm --filter @nop-chaos/flux-runtime lint
```

Always run `typecheck`, `build`, and `lint` after making changes. Run tests when relevant.

---

## Docs Maintenance

**Docs live in `docs/`** and are the primary source of project knowledge.

### Mandatory Updates

After completing any significant work, you MUST:

1. **Update `docs/development-log.md`** with a dated entry containing:
   - What was added/changed
   - Key decisions made
   - Next steps (if known)
   - Brief context useful for future work

2. **Update relevant architecture docs** when changing:
   - Package boundaries or ownership â†’ `docs/architecture/flux-runtime-module-boundaries.md`
   - Form/validation logic â†’ `docs/architecture/form-validation.md`
   - Renderer props/hooks/React integration â†’ `docs/architecture/renderer-runtime.md`
   - Slot/field metadata patterns â†’ `docs/architecture/field-metadata-slot-modeling.md`
   - General architecture â†’ `docs/architecture/flux-core.md`

3. **Update `docs/references/maintenance-checklist.md`** if new doc links are needed.

### Development Log Format

```markdown
### YYYY-MM-DD

- Brief description of what happened.
- Link to doc or code path: `docs/architecture/foo.md` or `packages/bar/src/baz.ts:42`
- Key decision: ...
- Next step: ...
```

### Directory Roles

| Directory | Purpose |
|-----------|---------|
| `docs/architecture/` | Current normative design docs (source of truth) |
| `docs/references/` | Stable lookup material (terminology, interfaces, maintenance) |
| `docs/analysis/` | Investigatory/comparison reports |
| `docs/examples/` | Representative schemas and usage notes |
| `docs/plans/` | Implementation plans and checklists |
| `docs/bugs/` | Numbered defect histories and fix notes |
| `docs/archive/` | Preserved legacy drafts |
| `docs/development-log.md` | Quick dated notes for recent changes |

### Entry Point

Always consult `docs/index.md` first when working with documentation. It contains the "Read This First" table for quick navigation.

---

## Documentation Routing

Before starting work, read the relevant docs. This table maps tasks to the docs you must read first.

### By Task

| Task | Read first | Then read | Why |
|------|-----------|-----------|-----|
| Modify any renderer component (JSX, props, hooks) | `docs/architecture/renderer-runtime.md` | `docs/references/renderer-interfaces.md` | Renderer contracts, hooks, fragment rendering |
| Add or change a renderer's styling, className, or layout | `docs/architecture/styling-system.md` | `docs/architecture/theme-compatibility.md` | Renderer styling contract, classAliases, spacing conventions, marker class rules |
| Change CSS, Tailwind utilities, or design tokens | `docs/architecture/styling-system.md` → "Renderer Styling Contract" section | `docs/architecture/bem-removal.md` | No implicit layout in renderers; use marker classes + schema-driven styles |
| Add a new Tailwind utility or global CSS rule | `docs/architecture/styling-system.md` | `packages/tailwind-preset/src/styles/base.css` | Spacing conventions, stack/hstack alias patterns |
| Work on Flow Designer canvas, nodes, edges, or interactions | `docs/architecture/flow-designer/design.md` | `docs/architecture/flow-designer/collaboration.md`, `docs/architecture/flow-designer/canvas-adapters.md` | Layered architecture, host-bridge adapter contract |
| Change Flow Designer visual style (node cards, icons, badges) | `docs/architecture/styling-system.md` → "Spacing Conventions" section | `docs/analysis/flow-designer-style-parity-research.md` | Context-based spacing guide, parity audit |
| Change Flow Designer config schema (nodeTypes, ports, permissions) | `docs/architecture/flow-designer/config-schema.md` | `docs/architecture/flow-designer/api.md` | NodeTypeConfig, port definitions, inspector schema |
| Work on Report Designer or Spreadsheet Editor | `docs/architecture/report-designer/design.md` | `docs/architecture/report-designer/contracts.md` | Layered architecture, package boundaries, interface contracts |
| Change form validation, error display, or field participation | `docs/architecture/form-validation.md` | `docs/architecture/flux-runtime-module-boundaries.md` | Validation rules, timing, renderer participation |
| Change form field wrappers, labels, hints, or error slots | `docs/architecture/field-metadata-slot-modeling.md` | `docs/architecture/field-frame.md` | Slot classification, unified field chrome |
| Add new actions, event handlers, or `xui:import` usage | `docs/architecture/action-scope-and-imports.md` | `docs/architecture/renderer-runtime.md` | Namespaced actions, import semantics, scope boundaries |
| Change API requests, data sources, polling, or adaptors | `docs/architecture/api-data-source.md` | `docs/architecture/renderer-runtime.md` | ApiObject, DataSourceSchema, scope injection |
| Add or modify a shadcn/ui component in `@nop-chaos/ui` | `docs/plans/18-shadcn-ui-migration-plan.md` | `docs/architecture/styling-system.md` | Migration status, component list, variant mapping |
| Change package boundaries, create a new package, or move code | `docs/architecture/flux-runtime-module-boundaries.md` | `docs/architecture/frontend-baseline.md` | Module ownership, file placement rules |
| Change core architecture (compilation, scope, expressions) | `docs/architecture/flux-core.md` | `docs/references/terminology.md` | Unified value semantics, scope model, key terms |
| Change playground pages, navigation, or debugger UX | `docs/architecture/playground-experience.md` | `docs/analysis/framework-debugger-design.md` | Scenario-based navigation, floating debugger panel |
| Write or update JSON schema conventions | `docs/references/flux-json-conventions.md` | `docs/examples/user-management-schema.md` | Expression syntax, naming rules, example patterns |
| Debug a CSS class not being generated in a monorepo package | `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md` | `apps/playground/src/styles.css` (check `@source` directive) | Tailwind v4 content scanning fix, monorepo setup |

### By Code Location

| When touching this code | Read this |
|------------------------|-----------|
| `packages/flux-core/src/` | `docs/architecture/flux-core.md`, `docs/references/terminology.md` |
| `packages/flux-runtime/src/` | `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/form-validation.md` |
| `packages/flux-react/src/` | `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md` |
| `packages/flux-renderers-*/src/` | `docs/architecture/styling-system.md`, `docs/architecture/renderer-runtime.md` |
| `packages/tailwind-preset/src/` | `docs/architecture/styling-system.md` → "Renderer Styling Contract" and "Spacing Conventions" |
| `packages/ui/src/` | `docs/plans/18-shadcn-ui-migration-plan.md`, `docs/architecture/bem-removal.md` |
| `packages/flow-designer-*/src/` | `docs/architecture/flow-designer/` (start with `design.md`) |
| `packages/spreadsheet-*/src/` or `packages/report-designer-*/src/` | `docs/architecture/report-designer/` (start with `design.md`) |
| `apps/playground/src/` | `docs/architecture/playground-experience.md` |
| `apps/playground/src/styles.css` | `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md`, `docs/architecture/styling-system.md` |
| `apps/playground/src/schemas/*.json` | `docs/references/flux-json-conventions.md`, `docs/architecture/styling-system.md` (classAliases) |

### Quick Reference: Key Principles

| Principle | Summary | Doc |
|-----------|---------|-----|
| Renderer Styling Contract | Renderers only emit marker classes (`nop-*`). No implicit gap/direction/padding. | `docs/architecture/styling-system.md` |
| Spacing Conventions | Context-based spacing via `stack-*`/`hstack-*` aliases, always explicit at usage site. | `docs/architecture/styling-system.md` |
| No BEM | Use shadcn `data-slot`, flux semantic markers, and Tailwind visual classes. | `docs/architecture/bem-removal.md` |
| Theme Independence | No React ThemeProvider; CSS variables and stable class names for host integration. | `docs/architecture/theme-compatibility.md` |
| Tailwind v4 monorepo | `@source "../../../packages"` in `styles.css` to scan workspace packages. | `docs/bugs/14-*.md` |

---

## Code Conventions

### General

- All files use UTF-8 encoding without BOM.
- ESM-first (`"type": "module"`).
- No comments unless requested.
- Follow existing code style in each file.
- TypeScript strict mode.

### Build Artifacts

- **NEVER** emit `.js`, `.d.ts`, or `.js.map` files into `packages/*/src/` directories.
- Each package's `tsconfig.json` must use `noEmit: true` (for typecheck) or specify `outDir` explicitly (for build).
- Build output goes to `packages/<name>/dist/` only.
- Temporary files (coverage, cache, etc.) belong in the package root or `node_modules/.cache/`, never in `src/`.
- `.gitignore` already excludes `packages/*/src/**/*.js`, `packages/*/src/**/*.d.ts`, `packages/*/src/**/*.js.map` (except `packages/ui/src/` which intentionally contains `.js` source files).
- If stray build artifacts appear in `src/`, delete them and investigate the `tsconfig` that caused the leak.

### Package Structure

Each package follows:
```
packages/<name>/
  src/
    index.ts          # public exports
    index.test.ts     # tests (colocated or __tests__/)
  tsconfig.json       # typecheck config
  tsconfig.build.json # build config
  package.json
```

### Imports

- Use workspace protocol: `"@nop-chaos/flux-core": "workspace:*"`
- Internal imports use relative paths within the same package.

### State Management

- Use Zustand vanilla stores (not React context stores).
- Stores are framework-agnostic.
- Use `use-sync-external-store` for React subscriptions.

### Testing

- Use Vitest.
- Test files: `*.test.ts` or `*.test.tsx`
- Prefer colocated tests or `__tests__/` directories.

### Code Organization

**Separate independent modules into their own files.**

When code has clear boundaries and can be reused independently, extract it into a dedicated file:

```
# Good: API cache is a standalone concern
src/
├── api-cache.ts          # Cache store and utilities
├── request-runtime.ts    # Request execution logic
└── index.ts              # Public exports

# Bad: Everything in one file
src/
├── runtime.ts            # 2000+ lines mixing cache, request, adaptors...
└── index.ts
```

**Grouping and abstraction principles:**

1. **Single responsibility**: Each file should have one primary purpose
2. **Clear boundaries**: Modules should communicate through well-defined interfaces
3. **Testability**: Independent modules can be tested in isolation
4. **Reusability**: Extract utilities that could be used elsewhere

**Example structure:**
```
src/
├── api-cache.ts           # Cache store (ApiCacheStore interface + impl)
├── api-adaptors.ts        # Request/response adaptor utilities
├── request-runtime.ts     # Request execution and scope extraction
├── form-runtime.ts        # Form-specific runtime logic
├── page-runtime.ts        # Page-specific runtime logic
└── index.ts               # Orchestrator + public exports
```

---

## File Refactoring Methodology

When refactoring large files into smaller modules, follow this safe approach:

### Step 1: Analyze First
- Read the entire file to understand its structure and responsibilities
- Identify logical boundaries (UI components, utilities, state management)
- Plan the split before writing any code

### Step 2: Create New Files First
- Create new files in a subdirectory (e.g., `src/flow-designer/`)
- Each new file should have a single, clear responsibility
- Export all public APIs through an `index.ts` barrel file

### Step 3: Do NOT Modify the Original File
- Keep the original file intact during the split
- This allows easy rollback if something goes wrong

### Step 4: Verify New Files
- Run `typecheck` and `test` on new files
- Ensure no import errors or missing dependencies

### Step 5: Replace Original File
- Rename original to `.bak` (e.g., `Component.tsx` â†’ `Component.tsx.bak`)
- Create new orchestrator file that imports and uses the split components
- Keep the orchestrator thin - only state management and composition

### Step 6: Final Verification
- Run full verification: `pnpm typecheck && pnpm build && pnpm lint && pnpm test`
- Compare behavior with `.bak` file if needed
- Delete `.bak` file after confidence is established

### Example Structure
```
# Before
src/
â””â”€â”€ FlowDesignerExample.tsx (572 lines)

# After
src/
â”œâ”€â”€ FlowDesignerExample.tsx (220 lines - orchestrator)
â”œâ”€â”€ FlowDesignerExample.tsx.bak (backup)
â””â”€â”€ flow-designer/
    â”œâ”€â”€ index.ts
    â”œâ”€â”€ FlowDesignerToolbar.tsx
    â”œâ”€â”€ FlowDesignerPalette.tsx
    â”œâ”€â”€ FlowDesignerCanvas.tsx
    â”œâ”€â”€ FlowDesignerInspector.tsx
    â””â”€â”€ FlowDesignerToast.tsx
```

### Why This Approach Works
- **Safety**: Original file always available for rollback
- **Incremental**: Can verify each piece independently
- **Reference**: `.bak` file serves as documentation during rewrite
- **Testability**: New components can be tested in isolation

---

## Adding New Packages

1. Create `packages/<name>/` with `package.json`:
   ```json
   {
     "name": "@nop-chaos/<name>",
     "version": "0.1.0",
     "private": true,
     "type": "module",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "exports": {
       ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
     },
     "scripts": {
       "build": "tsc -p tsconfig.build.json",
       "typecheck": "tsc -p tsconfig.json",
       "test": "vitest run --passWithNoTests",
       "lint": "eslint src --ext .ts,.tsx"
     },
     "dependencies": { /* ... */ }
   }
   ```

2. Add `tsconfig.json` extending `../../tsconfig.base.json`.

3. Add alias in `vite.workspace-alias.ts` if it needs playground access.

4. Add to `tsconfig.json` project references.

5. Update `docs/development-log.md`.

---

## Commit Message Style

- Use imperative mood: "Add feature" not "Added feature"
- Reference doc paths when relevant: "Update form validation design (docs/architecture/form-validation.md)"
- Keep messages concise and descriptive.

---

## Verification Checklist

Before finishing any task:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes (if applicable)
- [ ] `pnpm test` passes (if applicable)
- [ ] `docs/development-log.md` updated (for significant changes)
- [ ] Relevant architecture docs updated (if design changed)

