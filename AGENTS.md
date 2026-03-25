# AGENTS.md

## Project Overview

`nop-chaos-amis` is a modern rewrite of the AMIS low-code renderer.

**Tech Stack**: React 19, Zustand, TypeScript 5.9, Vite 8, Vitest, pnpm workspace.

**Workspace Packages**:
- `@nop-chaos/flux-core` - Pure types/interfaces (no runtime code).
- `@nop-chaos/flux-formula` - Expression compiler/evaluator.
- `@nop-chaos/flux-runtime` - Core runtime (Zustand stores, validation, actions).
- `@nop-chaos/flux-react` - React rendering layer.
- `@nop-chaos/flux-renderers-basic` - Basic renderers (page, text, container, etc.).
- `@nop-chaos/flux-renderers-form` - Form renderers.
- `@nop-chaos/flux-renderers-data` - Data renderers.
- `@nop-chaos/amis-debugger` - Devtools/debugger panel.
- `@nop-chaos/amis-testing` - Shared test utilities.
- `apps/playground` - Dev playground.

**Dependency Flow**:
```
amis-schema -> amis-formula -> amis-runtime -> amis-react -> amis-renderers-*
                                                            -> apps/playground
                                                            -> amis-debugger
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
   - Package boundaries or ownership â†’ `docs/architecture/amis-runtime-module-boundaries.md`
   - Form/validation logic â†’ `docs/architecture/form-validation.md`
   - Renderer props/hooks/React integration â†’ `docs/architecture/renderer-runtime.md`
   - Slot/field metadata patterns â†’ `docs/architecture/field-metadata-slot-modeling.md`
   - General architecture â†’ `docs/architecture/amis-core.md`

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

## Code Conventions

### General

- ESM-first (`"type": "module"`).
- No comments unless requested.
- Follow existing code style in each file.
- TypeScript strict mode.

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

