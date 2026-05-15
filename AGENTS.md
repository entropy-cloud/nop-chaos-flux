# AGENTS.md

## Project Overview

`nop-chaos-flux` is a modern rewrite of the AMIS low-code renderer.

**Tech Stack**: React 19, Zustand, TypeScript 6.0, Vite 8, Vitest, pnpm workspace.

Packages live under `packages/` as `@nop-chaos/<name>`. Use `ls packages/` and read individual `package.json` for the full list and dependency graph. Key layers: `flux-core` → `flux-formula` → `flux-compiler` → `flux-action-core` → `flux-runtime` → `flux-react` → `flux-renderers-*`.

---

## Commands

```bash
pnpm install                # install deps
pnpm dev                    # starts playground
pnpm typecheck              # all packages
pnpm build                  # all packages
pnpm test                   # all packages
pnpm lint                   # all packages
pnpm --filter @nop-chaos/flux-runtime typecheck   # per package
```

Always run `typecheck`, `build`, and `lint` after making **CODE** changes. Run tests when relevant.

### Test Execution Strategy

1. Run full test suite once to identify failures.
2. Fix individually: `npx playwright test "path/to/test.spec.ts:42" --reporter=list` or `pnpm --filter @nop-chaos/flux-runtime test -- --grep "test name"`.
3. Run full suite after all fixes pass.

**NEVER** diagnose UI failures via screenshots. Use programmatic inspection: `page.evaluate()`, `page.locator().innerHTML()`, `getComputedStyle()`.

Whenever e2e tests and unit tests both pass completely (full green), you MUST record this in the daily dev log at `docs/logs/{year}/{month}-{day}.md` with test counts/package summary, and then commit all current changes. This provides reliable "known-good" baselines for future debugging.

---

## Docs Maintenance

**Docs live in `docs/`** and are the primary source of project knowledge. Always consult `docs/index.md` first for navigation. See `docs/logs/00-log-writing-guide.md` for log writing conventions and `docs/index.md` for directory roles.

### Mandatory Updates

After completing any significant **CODE CHANGE**, you MUST:

1. **Update the daily dev log** at `docs/logs/{year}/{month}-{day}.md` (reverse chronological, see `docs/logs/00-log-writing-guide.md` for format).
2. **Update relevant architecture docs** when changing:
   - Package boundaries or ownership → `docs/architecture/flux-runtime-module-boundaries.md`
   - Form/validation logic → `docs/architecture/form-validation.md`
   - Renderer props/hooks/React integration → `docs/architecture/renderer-runtime.md`
   - Slot/field metadata patterns → `docs/architecture/field-metadata-slot-modeling.md`
   - General architecture → `docs/architecture/flux-core.md`

### Plan Authoring And Execution

When creating, revising, executing, or auditing a file under `docs/plans/`, you MUST read `docs/plans/00-plan-authoring-and-execution-guide.md` first. Plans are execution docs with explicit status, scope, exit criteria, and validation checklists. Re-audit the live repo before claiming completion.

---

## Documentation Routing

**`docs/index.md` is the authoritative docs navigation baseline.** The tables below cover only the most frequent agent workflows.

### By Task

| Task                                                          | Read first                                                                  | Then read                                                                                                |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Modify any renderer component (JSX, props, hooks)             | `docs/architecture/renderer-runtime.md`                                     | `docs/references/renderer-interfaces.md`                                                                 |
| Add or change a renderer's styling, className, or layout      | `docs/architecture/styling-system.md`                                       | `docs/architecture/theme-compatibility.md`                                                               |
| Change CSS, Tailwind utilities, or design tokens              | `docs/architecture/styling-system.md` → "Renderer Styling Contract" section | `docs/architecture/renderer-markers-and-selectors.md`                                                    |
| Work on Flow Designer canvas, nodes, edges, or interactions   | `docs/architecture/flow-designer/design.md`                                 | `docs/architecture/flow-designer/collaboration.md`, `docs/architecture/flow-designer/canvas-adapters.md` |
| Work on Report Designer or Spreadsheet Editor                 | `docs/architecture/report-designer/design.md`                               | `docs/architecture/report-designer/contracts.md`                                                         |
| Draft, execute, or audit a plan under `docs/plans/`           | `docs/plans/00-plan-authoring-and-execution-guide.md`                       | `docs/logs/00-log-writing-guide.md`                                                                      |
| Change form validation, error display, or field participation | `docs/architecture/form-validation.md`                                      | `docs/architecture/flux-runtime-module-boundaries.md`                                                    |
| Add new actions, event handlers, or `xui:import` usage        | `docs/architecture/action-scope-and-imports.md`                             | `docs/architecture/renderer-runtime.md`                                                                  |
| Change package boundaries, create a new package, or move code | `docs/architecture/flux-runtime-module-boundaries.md`                       | `docs/architecture/frontend-baseline.md`                                                                 |
| Change core architecture (compilation, scope, expressions)    | `docs/architecture/flux-core.md`                                            | `docs/references/terminology.md`                                                                         |
| Debug a CSS class not being generated in a monorepo package   | `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md`    | `apps/playground/src/styles.css` (check `@source` directive)                                             |

### By Code Location

| When touching this code                                            | Read this                                                                                     |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `packages/flux-core/src/`                                          | `docs/architecture/flux-core.md`, `docs/references/terminology.md`                            |
| `packages/flux-runtime/src/`                                       | `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/form-validation.md` |
| `packages/flux-react/src/`                                         | `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`  |
| `packages/flux-renderers-*/src/`                                   | `docs/architecture/styling-system.md`, `docs/architecture/renderer-runtime.md`                |
| `packages/ui/src/`                                                 | `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`  |
| `packages/flow-designer-*/src/`                                    | `docs/architecture/flow-designer/` (start with `design.md`)                                   |
| `packages/spreadsheet-*/src/` or `packages/report-designer-*/src/` | `docs/architecture/report-designer/` (start with `design.md`)                                 |
| `apps/playground/src/`                                             | `docs/architecture/playground-experience.md`                                                  |

### Key Principles

- **Renderer Styling Contract**: Layout renderers emit marker classes only; widget renderers are self-styled UI controls. → `docs/architecture/styling-system.md`
- **Spacing**: Use `stack-*`/`hstack-*` aliases, always explicit at usage site. → `docs/architecture/styling-system.md`
- **No BEM**: Use shadcn `data-slot`, flux semantic markers, and Tailwind visual classes. → `docs/architecture/renderer-markers-and-selectors.md`
- **Theme Independence**: No React ThemeProvider; CSS variables and stable class names. → `docs/architecture/theme-compatibility.md`
- **Tailwind v4 monorepo**: `@source "../../../packages"` in `styles.css`. → `docs/bugs/14-*.md`

---

## Code Conventions

### MANDATORY: UI Component Usage

**NEVER use raw HTML elements when `@nop-chaos/ui` provides a component.**

Check `packages/ui/src/index.ts` for available components before writing JSX. If a needed component is missing, add it following shadcn/ui conventions (see `docs/architecture/styling-system.md`).

Available components: `Button`, `Input`, `Textarea`, `Select`/`NativeSelect`, `Label`, `Checkbox`, `RadioGroup`+`RadioGroupItem`, `Switch`, `Dialog`/`Sheet`/`Drawer`, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`, `Tooltip`, `Popover`, `DropdownMenu`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Card`/`CardHeader`/`CardContent`/`CardFooter`, `Badge`, `Spinner`/`Skeleton`/`Progress`, `ScrollArea`, `Separator`, `Toaster`+`toast()`, `Slider`, `Kbd`, `Field`, `ButtonGroup`, `Combobox`, `Sidebar`, `ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle`, `Empty`.

```tsx
import { Button, Input, Dialog, cn } from '@nop-chaos/ui';
```

### MANDATORY: Renderer Component Contract

All renderer components MUST follow the `RendererComponentProps` pattern. Read data from:

| Source          | What it provides                                         | When to use                               |
| --------------- | -------------------------------------------------------- | ----------------------------------------- |
| `props.props`   | Resolved runtime values (label, variant, placeholder...) | Reading schema-driven values              |
| `props.meta`    | Resolved meta (disabled, visible, className, testid)     | Checking control state                    |
| `props.regions` | Precompiled child render handles                         | Rendering child fragments via `.render()` |
| `props.events`  | Runtime event handlers from schema                       | Attaching click/change/submit handlers    |
| `props.helpers` | Stable runtime helpers                                   | render, evaluate, dispatch                |

**NEVER** access stores directly in renderers. Use the standard hooks:

| Need                   | Hook                         | Package                 |
| ---------------------- | ---------------------------- | ----------------------- |
| Runtime instance       | `useRendererRuntime()`       | `@nop-chaos/flux-react` |
| Current scope ref      | `useRenderScope()`           | `@nop-chaos/flux-react` |
| Reactive scope data    | `useScopeSelector(selector)` | `@nop-chaos/flux-react` |
| Action dispatch        | `useActionDispatcher()`      | `@nop-chaos/flux-react` |
| Current form           | `useCurrentForm()`           | `@nop-chaos/flux-react` |
| Current page           | `useCurrentPage()`           | `@nop-chaos/flux-react` |
| Render ad-hoc fragment | `useRenderFragment()`        | `@nop-chaos/flux-react` |
| Current node meta      | `useCurrentNodeMeta()`       | `@nop-chaos/flux-react` |

**NEVER** create ad-hoc React contexts or prop-drilling chains for data these hooks already provide.

### MANDATORY: Styling Rules

1. **Layout renderers** (container, flex, page, panel) emit **marker classes ONLY**. No hardcoded `gap-4`, `flex`, `p-4`, or `grid`; styling comes from schema.
2. **Widget renderers** (table, condition-builder, etc.) are complete, styled UI controls. Internal layout classes are part of the visual design.
3. Use `cn()` from `@nop-chaos/ui` for class merging.
4. Use `stack-*`/`hstack-*` aliases for layout in schema.
5. See `docs/architecture/styling-system.md` for the full contract.

### General

- UTF-8 without BOM, ESM-first (`"type": "module"`), TypeScript strict mode.
- Default to no comments. Add one only after repeated debugging shows a constraint is easy to misread.
- Follow existing code style in each file.
- Docs should stay under 40 KB; split at 50 KB.
- Files over 500 lines should be evaluated for extraction. Split by responsibility into dedicated modules.
- When refactoring large files: create new files first → verify → replace original. See `docs/architecture/flux-core.md` for detailed steps.

### Build Artifacts

- **NEVER** emit `.js`, `.d.ts`, or `.js.map` into `packages/*/src/`. Build output goes to `dist/` only.
- Each `tsconfig.json` must use `noEmit: true` or specify `outDir` explicitly.
- `.gitignore` already excludes stray artifacts; delete and investigate if they appear.

### Package Structure and Imports

- Each package must expose a single source entry under `src/` such as `src/index.ts` or `src/index.tsx`, plus package config files like `tsconfig.json`, `tsconfig.build.json`, and `package.json`.
- Tests may be colocated as `*.test.ts` / `*.test.tsx` or grouped under `src/__tests__/`; do not assume a single `index.test.ts` layout.
- Use workspace protocol: `"@nop-chaos/flux-core": "workspace:*"`.
- Internal imports use relative paths within the same package.

### State Management and Testing

- Zustand vanilla stores (not React context stores). Use `use-sync-external-store` for React subscriptions.
- Vitest. Test files: `*.test.ts` or `*.test.tsx`, colocated or in `__tests__/`.

---

## Adding New Packages

Copy an existing package as template. Steps: create `packages/<name>/` → add `tsconfig.json` extending `../../tsconfig.base.json` → add alias in `vite.workspace-alias.ts` → add to root `tsconfig.json` project references → update `docs/logs/`.

---

## Commit Message Style

- Imperative mood: "Add feature" not "Added feature"
- Reference doc paths when relevant
- Keep messages concise and descriptive

---

## Feature Deprecation

Follow `docs/skills/deprecated-feature-cleanup.md`. Core rule: code `@deprecated` + docs record before any removal.

---

## Verification Checklist

Before finishing any task:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes (if applicable)
- [ ] `pnpm test` passes (if applicable)
- [ ] Formatting handled by Husky pre-commit hook (no manual `format:check` needed)
- [ ] `docs/logs/` updated (for significant changes)
- [ ] Relevant architecture docs updated (if design changed)

## Bug Fix Test Coverage Rule

After fixing any non-trivial bug, you MUST:

1. **Evaluate whether regression tests are needed.** If the bug had a non-obvious root cause, could be reintroduced by refactoring, or crossed package boundaries, add a test.
2. **Add tests that verify the correct result**, not just the absence of an error.
3. **Prefer adding new regression tests instead of rewriting or weakening existing ones.** Preserve prior coverage whenever possible.
4. **Record complex bugs** in `docs/bugs/` following `docs/bugs/00-bug-fix-note-writing-guide.md`.
5. **Re-run the full test suite** after adding new tests to confirm nothing is broken.
