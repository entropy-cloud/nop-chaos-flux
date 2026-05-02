# Vocabulary And Cross-Shell Contract Drift

## Purpose

This rule captures recurring drift where the same public concept, host-shell label, or i18n-backed contract is expressed with inconsistent vocabulary across packages, docs, and compatibility layers.

Use it when reviewing public exports, host shell labels, i18n key usage, or terminology updates that span multiple packages or docs.

## Scope

Apply this rule when code changes touch any of the following:

- public exported names and compatibility aliases
- cross-shell visible labels or status labels
- i18n keys representing the same concept across peer packages
- docs that define public vocabulary or migration wording

## Required Pattern

### 1) One canonical term must own each public concept

- Public surfaces should converge on one canonical vocabulary per concept.
- Compatibility aliases may exist, but they must be explicit and documented rather than silently co-equal.
- Docs and live consumers should converge on the same final baseline terminology.

Review checks:

- Search for alternate spellings or parallel terminology for the same concept.
- Check whether one spelling is documented as canonical and others as compatibility/deprecation aliases.
- Update docs and tests together when the canonical term changes.

### 2) Peer shells must not drift on the same visible contract

- Similar host shells should not diverge in visible labels or i18n key style without an explicit reason.
- Hardcoded user-visible strings should not survive in one shell while siblings already use i18n-backed contract wording.
- Cross-shell drift should be treated as a contract problem, not just a copy problem.

Review checks:

- Compare sibling shells or packages that expose the same concept.
- Search for mixed prefixed/unprefixed i18n keys or hardcoded visible text.
- Confirm compatibility wording is intentional and documented where needed.

## Allowed Exceptions

- Compatibility aliases are allowed during migration if they are explicit and documented.
- Different shells may use distinct wording when the owner docs define genuinely different user-facing semantics.

## Review Checklist

- Each public concept has one canonical vocabulary.
- Compatibility aliases are explicit and documented.
- Peer shells do not drift on shared labels or i18n key style without an explicit reason.
- Docs, tests, and live exports align on the chosen baseline vocabulary.

## Evidence From This Repository

- `docs/plans/181-word-editor-dataset-vocabulary-convergence-plan.md`
- `docs/analysis/2026-05-02-deep-audit-full/18-cross-package.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/18-cross-package.md`

## Primary Architecture Anchors

- `docs/architecture/word-editor/design.md`
- `docs/architecture/renderer-runtime.md`
