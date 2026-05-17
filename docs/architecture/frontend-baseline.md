# Frontend Baseline

## Purpose

This document records the engineering baseline and naming rules for the current `flux` repository.

Use it when changing workspace structure, package boundaries, tooling, scripts, or naming conventions.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `package.json` for root scripts and shared dev dependencies
- `pnpm-workspace.yaml` for workspace package globs
- `apps/playground/package.json` for playground package identity and app-level scripts

## Current Repository Baseline

The repo is a `pnpm` workspace with the following fixed baseline:

- `pnpm`
- `Turborepo`
- `React 19`
- `Vite 8`
- `TypeScript`
- `Vitest`
- `ESLint`

Root scripts in `package.json`:

- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm analyze`
- `pnpm check:react19`

Workspace task orchestration baseline:

- root `build`, `typecheck`, `test`, and `lint` are orchestrated through `turbo run ...`
- `dev` is routed through Turborepo for the playground app but remains a non-cached persistent task
- `turbo.json` owns task dependencies, cache inputs, and cache outputs for workspace verification and builds
- `apps/playground` exposes an on-demand bundle analysis entry point through `pnpm analyze`, which runs a Vite analyze-mode build and emits `stats.html`

React rules for this baseline:

- React 19 is the only supported React baseline for this workspace
- React roots must use `createRoot` or `hydrateRoot`
- legacy APIs such as `ReactDOM.render`, `ReactDOM.hydrate`, `findDOMNode`, `unmountComponentAtNode`, `react-dom/test-utils`, and `react-test-renderer` must not re-enter the repository
- lint and `pnpm check:react19` together are the guardrail layer for those legacy patterns

## Workspace Shape

Current top-level structure:

```text
apps/
  playground/

packages/
  flux-core/
  flux-formula/
  flux-compiler/
  flux-action-core/
  flux-i18n/
  flux-runtime/
  flux-react/
  flux-bundle/
  flux-renderers-basic/
  flux-renderers-form/
  flux-renderers-form-advanced/
  flux-renderers-data/
  flux-code-editor/
  nop-debugger/
  flow-designer-core/
  flow-designer-renderers/
  spreadsheet-core/
  spreadsheet-renderers/
  report-designer-core/
  report-designer-renderers/
  word-editor-core/
  word-editor-renderers/
  tailwind-preset/
  theme-tokens/
  ui/
```

Design rules:

- `runtime` stays React-independent where possible
- `react` focuses on integration, context, and hooks
- `flux-bundle` is the supported host-facing release facade published as `@nop-chaos/flux`
- renderer packages are split by capability instead of one giant renderer package
- `playground` remains the first integration surface for new behavior

## Host-Facing Release Baseline

The repo now supports two distinct package shapes with different audiences:

- internal workspace packages under `packages/flux-*` remain the development baseline for source ownership and local composition
- `packages/flux-bundle` publishes the host-facing facade package `@nop-chaos/flux` for tarball or registry-style consumption

Current host-facing release rules:

- hosts should depend on `@nop-chaos/flux`, not on `@nop-chaos/flux-core`, `@nop-chaos/flux-react`, or `@nop-chaos/flux-renderers-*`
- `@nop-chaos/flux` exports a stable JS entry and `./style.css`
- host-owned singleton dependencies stay external and appear as facade peers: `react`, `react-dom`, `zustand`, `lucide-react`, and `@nop-chaos/ui`
- any publishable host-facing or transitively shipped runtime package must model shared host-owned libraries as `peerDependencies` plus local `devDependencies` rather than ordinary `dependencies`; current singleton-sensitive libraries include `react`, `react-dom`, `zustand`, `lucide-react`, `i18next`, `react-i18next`, `recharts`, and `sonner`
- the repo-owned tarball output convention is `dist-packages/`
- `pnpm check:flux-bundle-pack` validates the real packed tarball shape, not only local `dist/`

Legacy sync workflow baseline:

- `scripts/sync-flux-lib.sh` no longer syncs Flux internal packages into consumer workspaces as the supported model
- the only remaining sync target is `flux-lib/ui/` for the current `nop-chaos-next` UI workspace
- Flux core consumption now flows through the packed `@nop-chaos/flux` tarball instead of `flux-lib/flux-*`

## Package Naming

Current workspace package names use the `@nop-chaos/*` scope.

Examples:

- `@nop-chaos/flux-core`
- `@nop-chaos/flux-formula`
- `@nop-chaos/flux-runtime`
- `@nop-chaos/flux-react`
- `@nop-chaos/flux-playground`

## Tooling and Quality Gates

The repository should keep these checks passing:

- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm check:flux-bundle-pack`
- `node scripts/verify-no-src-artifacts.mjs`

Additional audit-oriented tooling now tracked at the root:

- `pnpm audit:deps` - dependency-cruiser baseline for circulars and cross-package internal source imports
- `pnpm audit:knip` - repo-wide unused file/export/dependency scan baseline
- `pnpm audit:knip:packages` - package-focused knip scan used to separate package noise from playground-only findings
- `pnpm audit:knip:playground` - playground-only knip scan for app dependency cleanup
- `pnpm audit:mutants` - Stryker mutation-test entry point for the current `flux-runtime/src/validation` pilot using an isolated Vitest config
- `pnpm audit:semgrep` - local Semgrep rule entry point when the host Python environment supports Semgrep installation

Source artifact policy:

- `packages/*/src/` and `apps/*/src/` are source-only across the workspace
- generated `.js`, `.d.ts`, and `.js.map` files belong in `dist/`, not in `src/`
- there is no dual-source TS/JS ownership mode for workspace package source directories

Testing expectations:

- local unit and integration tests live beside relevant package source where practical
- use `*.test.ts` and `*.test.tsx` for Vitest
- playground changes should be backed by focused tests in the affected package where behavior is core to the architecture
- prefer `@testing-library/react` for React-facing tests instead of renderer-implementation or shallow-render patterns

## Naming Conventions

### Files and directories

- use `kebab-case` for directories
- use `index.ts` or `index.tsx` for common entry files
- keep package and app names aligned with folder names

### React symbols

- components use `PascalCase`
- hooks use `useXxx`
- prop types use `XxxProps`

### Types and interfaces

- use `PascalCase`
- prefer clear role-based names such as `RendererRuntime`, `FormRuntime`, and `TemplateNode`

### Runtime values

- use `camelCase`
- prefer semantic plural names for collections
- use verb-first names for mutations and actions

## Practical Defaults for This Repo

Treat the following as stable defaults unless there is a strong reason to change them:

- use monorepo package extraction for shared behavior
- keep runtime logic out of React-only packages when possible
- keep examples and demo verification in `apps/playground`
- keep `apps/playground` organized as a scenario hub with focused entry pages, not one ever-growing catch-all page
- require tests for static fast path and identity reuse behavior
- keep document updates aligned with architecture changes

## Related Documents

- Core architecture: `docs/architecture/flux-core.md`
- Runtime design: `docs/architecture/renderer-runtime.md`
- Delivery planning workflow: `docs/plans/00-plan-authoring-and-execution-guide.md`
