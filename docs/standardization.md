# Flux Standardization Baseline

## Purpose

This document records the current standardization baseline for Flux schema authoring.

Normative source-of-truth remains in:

- docs/architecture/flux-core.md
- docs/architecture/styling-system.md
- docs/architecture/renderer-runtime.md
- docs/references/flux-json-conventions.md

## Scope

This file is a compact summary of active conventions only.
It should not preserve deprecated or transitional rule sets.

## Active Rules

### 1. Naming and expression conventions

- Use camelCase keys in JSON schema.
- Use ${...} expression syntax.
- Avoid suffix-style condition fields by default (for example xxxOn families).
- Keep semantic field naming aligned with docs/references/flux-json-conventions.md.

### 2. Styling conventions

- Tailwind is the styling foundation.
- Semantic props and className/classAliases can coexist.
- Renderer styling contracts and spacing conventions follow docs/architecture/styling-system.md.

### 3. Runtime boundary conventions

- Runtime/renderers follow explicit layering from docs/architecture/flux-core.md.
- Permission pruning is an upstream platform responsibility, not runtime evaluation.
- Dynamic code execution primitives are prohibited in first-party source.

### 4. Documentation conventions

- Architecture and reference docs describe current behavior in present tense.
- Historical context belongs in docs/bugs and docs/plans.
- If conventions change, update architecture/references first, then this summary.

## Change Policy

When updating this file, verify consistency with:

- docs/index.md
- docs/references/maintenance-checklist.md
- docs/references/architecture-guardrails-from-bugs.md
