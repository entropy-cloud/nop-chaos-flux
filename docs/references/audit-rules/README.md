# Audit Rules

## Purpose

This directory holds stable audit rules used to review implementation consistency across the repository.

- Use these files as review guardrails, not as architecture source-of-truth replacements.
- Keep each rule narrowly scoped so future audits can cite one file instead of hand-reconstructing expectations.
- Add new rules as separate files when a pattern becomes important enough to review repeatedly.

## Current Rules

- `surface-shell-consistency.md` - standard dialog/drawer shell structure and allowed exceptions.
- `owner-bridge-async-state-coherence.md` - owner-local async invalidation, bridge semantic coherence, derived-state refresh, and save/autosave truth alignment.
- `reactive-subscription-and-derived-snapshot-stability.md` - selector granularity, stable derived `getSnapshot()`, and host-scope publication stability.
- `owner-lifecycle-and-generic-owner-contracts.md` - honest transitional lifecycle publication and generic owner capability surfaces.
- `field-frame-wrap-interaction-semantics.md` - `wrap: true` / `FieldFrame` label semantics and internal control safety.
- `reactive-read-vs-imperative-read.md` - subscribed render reads versus one-shot imperative reads.
- `snapshot-key-and-change-token-publication.md` - mutation helpers must advance the snapshot/change token used by subscribers.
- `async-error-diagnosability-and-swallowed-failures.md` - fire-and-forget async paths need explicit failure handling that respects abort/stale guards.
- `docs-logs-code-landed-claim-adjudication.md` - landed/completed claims must match live code and live-baseline docs.
- `test-reliability-and-contract-freshness.md` - test isolation, stale assertions, and oversized cross-domain suites.
- `single-owner-styling-defaults-and-marker-contracts.md` - one explicit owner for shipped default visuals and consistent semantic marker contracts.
- `cleanup-and-disposal-boundaries.md` - cleanup must cover queued continuations and post-disposal completion paths.
- `status-path-publication-cleanup.md` - `statusPath` publishers must define explicit unmount/disposal cleanup semantics.
- `owner-registration-containment-and-validation-participation.md` - runtime field registration must reject paths outside the receiving owner's subtree.
- `validation-pending-readiness-semantics.md` - scheduled validation work still counts as pending for `validating` / `ready` semantics.
- `workspace-manifest-dependency-hygiene.md` - every live workspace import must be declared in the owning package manifest.
- `wrapper-bypass-of-shared-renderer-contracts.md` - manual wrapper paths must not silently fork shared renderer contract semantics.
- `vocabulary-and-cross-shell-contract-drift.md` - canonical terminology, explicit compatibility aliases, and cross-shell label/i18n convergence.
- `shadow-types-and-duplicate-contract-surfaces.md` - import canonical shared contracts instead of maintaining drifting local duplicates.
- `false-positive-friendly-ui-diagnostics.md` - verify contrasting cases and trace producer boundaries before patching consumer UI symptoms.

## Authoring Rules

- One file per audit topic.
- State the scope, required pattern, allowed exceptions, and review checks.
- Prefer rules that are easy to verify from code search and DOM structure.
- When a rule depends on a normative contract, link the owner doc instead of duplicating the whole design.
