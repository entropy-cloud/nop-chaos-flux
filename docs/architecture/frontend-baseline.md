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
- `React 19`
- `Vite 7`
- `TypeScript`
- `Vitest`
- `ESLint`

Root scripts in `package.json`:

- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`

## Workspace Shape

Current top-level structure:

```text
apps/
  playground/

packages/
  flux-core/
  flux-formula/
  flux-runtime/
  flux-react/
  flux-renderers-basic/
  flux-renderers-form/
  flux-renderers-data/
```

Design rules:

- `runtime` stays React-independent where possible
- `react` focuses on integration, context, and hooks
- renderer packages are split by capability instead of one giant renderer package
- `playground` remains the first integration surface for new behavior

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

Testing expectations:

- local unit and integration tests live beside relevant package source where practical
- use `*.test.ts` and `*.test.tsx` for Vitest
- playground changes should be backed by focused tests in the affected package where behavior is core to the architecture

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
- prefer clear role-based names such as `RendererRuntime`, `FormRuntime`, and `CompiledSchemaNode`

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
- Delivery planning: `docs/plans/02-development-plan.md`

