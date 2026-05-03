# Workspace Manifest Dependency Hygiene

## Purpose

This rule captures recurring failures where a package's source or tests import another workspace package but the dependency is not declared in the local manifest.

Use it when reviewing package boundaries, test-only workspace imports, or repository automation around package manifests.

## Scope

Apply this rule when code changes touch any of the following:

- `packages/*/package.json`
- source or test files importing `@nop-chaos/*`
- package-level test setup, schema validation tests, or cross-package helpers
- automation that validates workspace manifests

## Required Pattern

### 1) Every live workspace import must be declared in the owning package manifest

- If a package imports another workspace package in live source, tests, or package-scoped setup, the manifest must declare that dependency in the appropriate section.
- Do not rely on workspace hoisting or root installs to hide undeclared local dependencies.
- Test-only imports still count; they should normally appear in `devDependencies`.

Review checks:

- Search package source and tests for `@nop-chaos/*` imports.
- Compare the import set against `dependencies`, `peerDependencies`, and `devDependencies` in the same package's manifest.
- Treat test-only imports as manifest hygiene issues even when CI currently passes.

### 2) Dependency hygiene should remain machine-checkable

- A package boundary should describe itself accurately without depending on the monorepo's incidental install layout.
- If the same undeclared import pattern appears in multiple packages, prefer adding automation instead of fixing only one file.
- Keep the rule focused on live imports, not speculative future dependencies.

Review checks:

- Verify whether the issue reproduces across multiple packages with the same test pattern.
- Check whether existing automation already covers the problem; if not, consider adding a manifest-vs-import check.
- Avoid reporting dependencies that are only mentioned in docs or commented-out code.

Current repo verification path:

- `pnpm check:workspace-manifest-deps` checks tracked `packages/*/src/**/*.test.ts(x)` files for `@nop-chaos/*` imports and verifies that each imported workspace package is declared in the owning package manifest.

## Allowed Exceptions

- Pure type re-export packages may use `peerDependencies` when that is the documented package contract.
- Root-level tooling packages may omit package-local declarations only when the package is explicitly documented as a non-publishable repo-internal tool and never runs in package isolation.

## Review Checklist

- Every live `@nop-chaos/*` import is declared in the local manifest.
- Test-only workspace imports are declared in `devDependencies` or an equivalent documented section.
- Dependency hygiene does not rely on workspace hoisting.
- Repeated patterns trigger automation discussion, not just one-off fixes.

## Evidence From This Repository

- `docs/analysis/2026-05-03-deep-audit-full/01-dependency-graph.md`
- `docs/analysis/2026-05-03-deep-audit-full/summary.md`

## Primary Architecture Anchors

- `AGENTS.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
