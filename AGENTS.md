# AGENTS.md

## Project Overview

`nop-chaos-amis` is a modern rewrite of the AMIS low-code renderer.

**Tech Stack**: React 19, Zustand, TypeScript 5.9, Vite 8, Vitest, pnpm workspace.

**Workspace Packages**:
- `@nop-chaos/amis-schema` - Pure types/interfaces (no runtime code).
- `@nop-chaos/amis-formula` - Expression compiler/evaluator.
- `@nop-chaos/amis-runtime` - Core runtime (Zustand stores, validation, actions).
- `@nop-chaos/amis-react` - React rendering layer.
- `@nop-chaos/amis-renderers-basic` - Basic renderers (page, text, container, etc.).
- `@nop-chaos/amis-renderers-form` - Form renderers.
- `@nop-chaos/amis-renderers-data` - Data renderers.
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
pnpm --filter @nop-chaos/amis-runtime typecheck
pnpm --filter @nop-chaos/amis-runtime build
pnpm --filter @nop-chaos/amis-runtime test
pnpm --filter @nop-chaos/amis-runtime lint
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
   - Package boundaries or ownership → `docs/architecture/amis-runtime-module-boundaries.md`
   - Form/validation logic → `docs/architecture/form-validation.md`
   - Renderer props/hooks/React integration → `docs/architecture/renderer-runtime.md`
   - Slot/field metadata patterns → `docs/architecture/field-metadata-slot-modeling.md`
   - General architecture → `docs/architecture/amis-core.md`

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

- Use workspace protocol: `"@nop-chaos/amis-schema": "workspace:*"`
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
