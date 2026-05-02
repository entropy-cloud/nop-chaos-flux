# Cross-Plan Recurring Anomaly Patterns

## Purpose

This note summarizes recurring anomaly families that appear across multiple plans, bugs, and audit reports.

It is not a source-of-truth architecture document. Use it to decide:

- whether a new finding is really new or part of an existing pattern
- whether the pattern deserves a reusable audit rule
- which documentation layer should own the final record

## How To Use

- If a finding is subsystem-specific and changes the normative contract, update the owner doc under `docs/architecture/`.
- If a finding is a repeated review/check pattern, add or update a file under `docs/references/audit-rules/`.
- If a finding is a condensed repository-wide guardrail distilled from bugs, cross-link it from `docs/references/architecture-guardrails-from-bugs.md`.
- If a finding is still exploratory or not yet stable enough to become a rule, keep it in `docs/analysis/` until the pattern is confirmed again.

## Confirmed Recurring Patterns

### 1) Owner/Bridge/Async State Coherence

Symptoms:

- module-global invalidation leaks across instances
- bridge and host scope publish different semantics for the same field
- document replacement does not refresh derived state
- save/autosave clears `dirty` or persists stale payloads too early

Where it appeared:

- `docs/plans/146-domain-host-projection-and-vocabulary-convergence-plan.md`
- `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md`
- `docs/plans/170-field-interaction-reactivity-and-async-safety-successor-plan.md`
- `docs/plans/175-review-4-findings-remediation-plan.md`
- `docs/plans/180-report-preview-cancellation-and-stale-result-plan.md`
- `docs/bugs/37-report-designer-demo-selection-bridge-inspector-stuck-on-sheet-fix.md`
- `docs/bugs/38-report-designer-preview-cancellation-and-stale-result-fix.md`

Recorded as fixed audit rule:

- `docs/references/audit-rules/owner-bridge-async-state-coherence.md`

### 2) Reactive Subscription And Derived Snapshot Stability

Symptoms:

- whole-store or whole-snapshot subscriptions cause avoidable rerenders
- derived `getSnapshot()` returns a fresh object every read and violates `useSyncExternalStore` expectations
- hostScope objects or selector inputs rebuild every render and trigger unnecessary `scope.replace`

Where it appeared:

- `docs/plans/165-reactive-subscription-precision-plan.md`
- `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/05-reactive-precision.md`

Current recording status:

- partially covered by `docs/references/architecture-guardrails-from-bugs.md`
- now recorded as `docs/references/audit-rules/reactive-subscription-and-derived-snapshot-stability.md`

Recommended fixed rule scope:

- selector granularity
- stable derived snapshots at bridge boundaries
- host-scope object memoization and dependency correctness

### 3) Honest Owner Lifecycle And Generic Owner Contracts

Symptoms:

- owner publishes `active` / `ready` before required runtime prerequisites exist
- specialized owner types leak into generic code through casts
- participation/state channels exist only on one owner subtype even though multiple owner families need them

Where it appeared:

- `docs/plans/178-validation-owner-bootstrap-and-hidden-participation-plan.md`
- `docs/analysis/2026-05-02-deep-audit-full/08-validation.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/08-validation.md`

Current recording status:

- documented in owner-specific architecture docs, mainly `docs/architecture/form-validation.md`
- now recorded as `docs/references/audit-rules/owner-lifecycle-and-generic-owner-contracts.md`

Recommended fixed rule scope:

- transitional lifecycle must stay honest until prerequisites attach
- generic runtime surfaces should not require subtype casts in shared code paths
- owner-publication tests should assert behavior before and after attachment/activation

### 4) Single Owner For Styling Defaults And Semantic Markers

Symptoms:

- visual defaults split between renderer code and package CSS
- hidden fallback styling in renderers contradicts styling-system docs
- renderer roots miss semantic marker classes or use inconsistent marker conventions

Where it appeared:

- `docs/plans/179-container-default-gap-contract-successor-plan.md`
- `docs/bugs/14-tailwind-v4-monorepo-content-scan-canvas-invisible-fix.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/10-styling.md`

Current recording status:

- partly covered by `docs/architecture/styling-system.md`
- partly covered by `docs/references/architecture-guardrails-from-bugs.md`
- marker-class presence is still mostly enforced socially or through targeted audits

Recommended fixed rule scope:

- one shipped owner path per default visual baseline
- no hidden renderer-code layout fallback when CSS/semantic contract already owns the baseline
- widget/layout renderer marker expectations should be mechanically checkable

### 5) `wrap: true` / FieldFrame Interaction Semantics

Symptoms:

- internal clickable controls accidentally become activated by label forwarding
- renderer-local interactive affordances conflict with field wrapper semantics
- regressions reappear during UI-component migrations because the wrapper contract is forgotten

Where it appeared:

- `docs/bugs/19-code-editor-label-click-forwarding-triggers-fullscreen-fix.md`
- related `FieldFrame` / wrapper discussions in deep-audit field-slot analysis

Current recording status:

- captured in the bug note with strong future-refactor guidance
- now recorded as `docs/references/audit-rules/field-frame-wrap-interaction-semantics.md`

Recommended fixed rule scope:

- any renderer with `wrap: true` must avoid labelable internal trigger elements unless explicitly exempted
- wrapper semantics should be tested after shadcn/ui or component-library migrations

### 6) Vocabulary / i18n / Cross-Shell Contract Drift

Symptoms:

- peer shells use different visible labels or inconsistent i18n key style for the same concept
- canonical vocabulary and compatibility aliases drift across packages and docs
- hardcoded user-visible strings survive in one package while sibling shells are already converged

Where it appeared:

- `docs/plans/181-word-editor-dataset-vocabulary-convergence-plan.md`
- `docs/analysis/2026-05-02-deep-audit-full/18-cross-package.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/18-cross-package.md`

Current recording status:

- distributed between plan docs, package docs, and lint checks
- now recorded as `docs/references/audit-rules/vocabulary-and-cross-shell-contract-drift.md`

### 7) Reactive Read vs Imperative Read Contract Violations

Symptoms:

- render paths read state through imperative escapes like `scope.get()` or `scope.readOwn()` and never subscribe
- UI looks correct for one value by coincidence but fails on a second row/path/value
- integrations fail across package boundaries because the consumer uses a non-reactive API in render

Where it appeared:

- `docs/bugs/22-spreadsheet-integration-test-scope-reactive-read-fix.md`
- `docs/bugs/23-stale-js-artifacts-shadow-source-in-vitest-fix.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/05-reactive-precision.md`

Current recording status:

- partly covered by `docs/references/architecture-guardrails-from-bugs.md`
- now recorded as `docs/references/audit-rules/reactive-read-vs-imperative-read.md`

Recommended fixed rule scope:

- render-time reactive values must use subscribed selector APIs
- imperative reads must be treated as one-shot reads only
- suspiciously correct boolean/default UI states should be cross-checked with a contrasting test row/value

### 8) Wrapper / Manual Bypass Of Shared Renderer Contracts

Symptoms:

- renderer or field-like surfaces manually instantiate shared wrapper primitives instead of using the standard `wrap` / `frameWrap` path
- local implementation bypasses shared className, field metadata, or slot/wrapper behavior
- behavior diverges subtly from the standard renderer contract without looking obviously broken

Where it appeared:

- `docs/analysis/2026-05-02-deep-audit-full/12-field-slot.md`
- `docs/analysis/2026-05-02-deep-audit-full/09-renderer-contract.md`
- related follow-ups in plans touching `FieldFrame` / field metadata convergence

Current recording status:

- still requires owner judgment in some cases
- now recorded as `docs/references/audit-rules/wrapper-bypass-of-shared-renderer-contracts.md`

Recommended fixed rule scope:

- flag manual wrapper instantiation and require an explicit reason why the common renderer contract is bypassed
- verify className, marker, field metadata, and interaction semantics still match the shared contract

### 9) Snapshot-Key / Change-Token Publication Gaps

Symptoms:

- state mutates but the change-token or snapshot key used by subscribers does not advance
- repeated writes to the same path silently fail to rerender because the snapshot reference is unchanged
- the underlying store fires, but `useSyncExternalStoreWithSelector` skips selector reevaluation due to a stable snapshot key

Where it appeared:

- `docs/bugs/30-form-runtime-setvalue-setlastchange-missing-rerender-fix.md`
- related reactive-precision and external-store diagnostics in `docs/analysis/`

Current recording status:

- captured in bug notes and now recorded as `docs/references/audit-rules/snapshot-key-and-change-token-publication.md`

Recommended fixed rule scope:

- any mutation path that feeds subscribed renders must advance the corresponding snapshot/change token
- mutation helpers should be audited as a family, not one method at a time

### 10) Cleanup / Disposal Boundaries For Async And Timers

Symptoms:

- queued microtasks, timers, or async continuations outlive disposal/unmount
- cleanup clears one resource but not the already-scheduled continuation that will recreate side effects later
- logic assumes “if invoke is running, owner is still active” and breaks after disposal

Where it appeared:

- `docs/bugs/28-reaction-debounce-timer-leak-on-dispose.md`
- `docs/analysis/2026-05-01-deep-audit-full-2/summary.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/06-async-safety.md`

Current recording status:

- distributed between bug notes and async-safety analysis
- now recorded as `docs/references/audit-rules/cleanup-and-disposal-boundaries.md`

Recommended fixed rule scope:

- cleanup must guard both active resources and already-queued continuations
- mounted/disposed state should be part of async completion gating, not just request abortion

### 11) False-Positive-Friendly UI Diagnostics

Symptoms:

- UI appears correct because a default/fallback value coincidentally matches one example row or one branch
- first visible symptom points at the wrong layer, causing reviewers to patch the consumer instead of the producer boundary
- tests verify a single happy-path value and miss the contrasting case that would expose the bug

Where it appeared:

- `docs/bugs/35-performance-table-form-control-isolated-cell-scope-binding-fix.md`
- `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`
- `docs/bugs/37-report-designer-demo-selection-bridge-inspector-stuck-on-sheet-fix.md`

Current recording status:

- now recorded as `docs/references/audit-rules/false-positive-friendly-ui-diagnostics.md`

Recommended fixed rule scope:

- verify a contrasting second case whenever a fallback/default could accidentally mask the bug
- when a failure surfaces in a consumer component, trace down to the producer boundary before changing consumer logic

### 12) Swallowed Exceptions And Low-Visibility Async Failure Paths

Symptoms:

- fire-and-forget promises drop errors silently
- async failure only clears loading/spinner state but never leaves a diagnosable signal
- added error handling ignores existing abort/stale guards and reports cancelled work as real failures

Where it appeared:

- `docs/plans/160-swallowed-exception-remediation-plan.md`
- `docs/analysis/2026-05-01-deep-audit-full-2/summary.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/06-async-safety.md`

Current recording status:

- partly covered by individual bug/plan notes
- now recorded as `docs/references/audit-rules/async-error-diagnosability-and-swallowed-failures.md`

Recommended fixed rule scope:

- every fire-and-forget async path needs an explicit failure strategy
- error handling must respect abort/stale/cancelled guards
- non-critical decorative async flows still need an explicit intentional ignore path

### 13) Test Reliability And Test-Contract Drift

Symptoms:

- tests rely on module-top shared mutable state or global pollution
- mega test files mix multiple domains and become hard to audit
- tests freeze the wrong behavior, stale labels, or stale DOM contracts into expected output
- test helper underuse leads to repeated bespoke setups and inconsistent isolation

Where it appeared:

- `docs/plans/167-test-quality-and-reliability-improvement-plan.md`
- `docs/plans/162-designer-page-and-report-selection-audit-remediation-plan.md`
- `docs/plans/175-review-4-findings-remediation-plan.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/14-test-coverage.md`

Current recording status:

- distributed between test-improvement plans and individual remediation plans
- now recorded as `docs/references/audit-rules/test-reliability-and-contract-freshness.md`

Recommended fixed rule scope:

- tests should avoid shared mutable state and unmanaged globals
- tests should verify current contract semantics, not fossilized pre-fix behavior
- large cross-domain test files should be split before they become the only place that encodes multiple contracts

### 14) Docs / Logs / Code Landed-Claim Drift

Symptoms:

- docs or daily logs say a behavior is landed while live code still does not implement the contract
- reference docs mix current baseline with target-state wording or fictional types
- completed plans keep partial-complete wording or other stale closure language

Where it appeared:

- `docs/plans/156-reference-doc-sync-and-audit-consensus-plan.md`
- `docs/plans/162-designer-page-and-report-selection-audit-remediation-plan.md`
- `docs/plans/181-word-editor-dataset-vocabulary-convergence-plan.md`
- `docs/analysis/2026-04-30-references-doc-code-consistency-audit.md`

Current recording status:

- strongly represented in docs-only synchronization plans
- now recorded as `docs/references/audit-rules/docs-logs-code-landed-claim-adjudication.md`

Recommended fixed rule scope:

- landed claims must be re-checked against live code, not copied forward from older logs
- reference docs must stay live-baseline-only unless an owner-doc exception is explicitly documented
- completed plans and closure notes must not retain stale partial-state wording

### 15) Shadow Types, Local Aliases, And Duplicate Contract Surfaces

Symptoms:

- package-local shadow types duplicate a canonical cross-package contract
- duplicated constants or helper flows grow beside an existing shared owner path
- local convenience surfaces silently drift from the canonical contract they mirror

Where it appeared:

- `docs/plans/158-code-quality-redundancy-and-duplication-remediation-plan.md`
- `docs/plans/169-complex-renderer-contract-and-field-slot-convergence-plan.md`
- `docs/analysis/2026-05-02-deep-audit-full/03-api-surface.md`

Current recording status:

- partly covered by duplication/remediation plans and API-surface analysis
- now recorded as `docs/references/audit-rules/shadow-types-and-duplicate-contract-surfaces.md`

Recommended fixed rule scope:

- prefer the canonical shared contract over local shadow types or magic strings
- if an alias survives, it must be explicit and documented rather than silently parallel
- duplicate helper logic should be collapsed before semantic drift appears

## Which Patterns Merit Fixed Audit Rules

Highest priority:

- Reactive subscription and derived snapshot stability
- Honest owner lifecycle and generic owner contracts
- `wrap: true` / FieldFrame interaction semantics
- Reactive read vs imperative read contract violations
- Snapshot-key / change-token publication gaps
- Swallowed exceptions and async failure diagnosability
- Docs / logs / code landed-claim drift

Medium priority:

- Single owner for styling defaults and marker contracts
- Vocabulary / i18n / cross-shell contract drift
- Cleanup / disposal boundaries for async and timers
- Wrapper / manual bypass of shared renderer contracts
- False-positive-friendly UI diagnostics
- Test reliability and test-contract drift
- Shadow types, local aliases, and duplicate contract surfaces

Already covered enough to avoid duplicate rule creation right now:

- Owner/bridge/async state coherence

## Documentation Routing Rule

Use this routing when a repeated pattern is discovered:

- `docs/architecture/...`
  - when the rule defines the subsystem's actual normative semantics
- `docs/references/audit-rules/...`
  - when the rule is a stable, reusable review or audit check
- `docs/references/architecture-guardrails-from-bugs.md`
  - when the pattern should be listed as a condensed repo-wide guardrail
- `docs/analysis/...`
  - when the pattern is still being validated and is not stable enough to harden into a rule

## Next Candidates For Extraction

- No remaining high-frequency extraction candidates from the current active-plan scan.
