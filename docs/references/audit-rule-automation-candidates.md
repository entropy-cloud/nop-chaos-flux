# Audit Rule Automation Candidates

## Purpose

This note maps the current audit rules to realistic automation strategies.

Use it to decide whether a recurring review rule should remain manual, or should be partially enforced by:

- ESLint rules
- grep/rg-based CI checks
- focused regression tests
- custom static-analysis scripts

It is intentionally pragmatic. The goal is not perfect automation. The goal is to identify high-value checks that can prevent repeated regressions cheaply.

## Categories

### A) Strong automation candidate

Good fit for lint rules, mechanical grep checks, or reliable static analysis.

### B) Partial automation candidate

Some parts can be automated, but human review is still required for semantics or exceptions.

### C) Mostly human review

The rule depends heavily on intent, architecture semantics, or cross-layer reasoning. Automation can help search, but not reliably judge correctness.

## Rule Matrix

### 1) `reactive-read-vs-imperative-read.md`

Automation grade: A

Good candidates:

- ESLint rule: flag `scope.get()`, `scope.read()`, `scope.readOwn()`, or raw store snapshot reads inside React component bodies
- grep-based CI check as a first pass for `scope.readOwn(` / `scope.get(` in `*.tsx`
- allowlist comments for intentional one-shot reads in effects or handlers

Why this automates well:

- The anti-pattern is syntactic and local in many cases.

### 2) `snapshot-key-and-change-token-publication.md`

Automation grade: B

Good candidates:

- targeted unit tests that verify repeated writes still rerender
- grep/script that checks whether mutation helpers call the shared snapshot/change-token helper
- review helper script that lists mutation helpers near a known token publisher

Why only partial:

- Determining the correct publication token is architectural, not purely syntactic.

### 3) `reactive-subscription-and-derived-snapshot-stability.md`

Automation grade: B

Good candidates:

- lint rule for suspicious whole-state selectors like `(s) => s`
- grep/script for inline `derive*Snapshot(...)` inside `getSnapshot()`
- focused tests that assert identical object reference on unchanged source snapshots

Why only partial:

- Some broad subscriptions are legitimate; tools can flag candidates but not decide all exceptions.

### 4) `owner-lifecycle-and-generic-owner-contracts.md`

Automation grade: C

Good candidates:

- grep for casts from generic owner/runtime types to subtype-specific contracts
- targeted tests around bootstrap/active/ready publication

Why mostly manual:

- Honest lifecycle semantics depend on subsystem rules and owner prerequisites.

### 5) `owner-bridge-async-state-coherence.md`

Automation grade: C

Good candidates:

- grep for module-scope request counters/controllers
- focused coexistence and stale-result tests

Why mostly manual:

- Semantic coherence across owner, bridge, host snapshot, and persistence layers needs cross-file reasoning.

### 6) `field-frame-wrap-interaction-semantics.md`

Automation grade: B

Good candidates:

- lint/AST rule: flag labelable elements inside renderers declared with `wrap: true`
- grep check for `<button` or `<Button` within known wrapped renderer directories
- focused browser tests for click-forwarding regressions

Why only partial:

- Some controls may render outside the wrapped subtree or be otherwise exempt.

### 7) `async-error-diagnosability-and-swallowed-failures.md`

Automation grade: B

Good candidates:

- lint rule or grep check for `void` promise chains with no `.catch()`
- grep script for `.then(...).finally(...)` without `.catch()` in production code
- focused tests for failure and cancellation behavior in important paths

Why only partial:

- Some async paths intentionally swallow failures, and some wrappers already centralize catching.

### 8) `cleanup-and-disposal-boundaries.md`

Automation grade: C

Good candidates:

- grep for timer/microtask scheduling plus dispose logic in the same module
- targeted tests that dispose before delayed completion

Why mostly manual:

- Correct cleanup semantics depend on the final mutation point and lifecycle intent.

### 9) `single-owner-styling-defaults-and-marker-contracts.md`

Automation grade: B

Good candidates:

- scripts that verify required `nop-*` marker classes on renderer roots
- grep checks for hardcoded fallback gap/layout classes in layout renderers
- test or script coverage for stale selectors after marker renames

Why only partial:

- Determining the rightful owner of a default visual baseline still needs architecture judgment.

### 10) `wrapper-bypass-of-shared-renderer-contracts.md`

Automation grade: B

Good candidates:

- grep for direct `FieldFrame` instantiation outside expected shared paths
- scripts that list components bypassing standard wrapper helpers

Why only partial:

- Some bypasses are legitimate owner decisions.

### 11) `shadow-types-and-duplicate-contract-surfaces.md`

Automation grade: B

Good candidates:

- grep for duplicated namespace strings / duplicated constant names
- scripts comparing local type names against exported canonical names
- import-lint rules encouraging canonical imports from shared owner modules

Why only partial:

- Some local adapter types are legitimate reshaped boundaries, not shadow duplicates.

### 12) `vocabulary-and-cross-shell-contract-drift.md`

Automation grade: B

Good candidates:

- grep scripts for mixed canonical vs deprecated names
- i18n lint checks for hardcoded visible strings or inconsistent key prefixes
- doc/code vocabulary diff scripts for known public terms

Why only partial:

- Public vocabulary sometimes legitimately carries compatibility aliases during migration.

### 13) `docs-logs-code-landed-claim-adjudication.md`

Automation grade: C

Good candidates:

- doc lints for suspicious target-state wording in `docs/references/`
- grep checks for `completed` plans containing `partial` / `in progress` wording

Why mostly manual:

- Adjudicating whether code truly landed still requires checking live implementation semantics.

### 14) `test-reliability-and-contract-freshness.md`

Automation grade: B

Good candidates:

- grep/lint for mutable module-top variables in test files
- file-size or line-count checks for test megafiles
- grep checks for unmanaged `globalThis` patching in tests

Why only partial:

- “stale contract assertion” is a semantic problem that tools can only hint at indirectly.

### 15) `false-positive-friendly-ui-diagnostics.md`

Automation grade: C

Good candidates:

- test review checklist templates that require contrasting cases for boolean/default-sensitive bugs
- bugfix PR template reminders rather than code lint

Why mostly manual:

- This is primarily a diagnosis discipline, not a syntactic smell.

### 16) `surface-shell-consistency.md`

Automation grade: B

Good candidates:

- AST/lint check for `<DialogContent>` / `<DrawerContent>` missing `Body` in standard shell files
- grep scripts that flag `DialogContent` or `DrawerContent` holding obvious body padding directly

Why only partial:

- Distinguishing standard shells from intentional specialized exceptions needs human review.

## Highest-Value Automation Targets

Start with these because they are both common and mechanically detectable enough to pay off quickly:

1. Reactive read vs imperative read in render
2. Fire-and-forget async with no explicit `.catch()` / failure strategy
3. Required renderer marker-class presence
4. Labelable controls inside `wrap: true` renderer paths
5. Mutable module-top test state and unmanaged global patching

## Suggested Enforcement Layer

### ESLint-first

- reactive render reads
- labelable controls inside wrapped renderers
- suspicious whole-state selectors
- test globals / mutable module-top state patterns

### Grep/CI-first

- `void` promise chains without `.catch()`
- duplicated constant strings / shadow contract names
- hardcoded visible strings in peer shells
- direct `FieldFrame` instantiation outside known shared paths
- stale wording in completed plans / reference docs

### Test-first

- repeated-write rerender guarantees
- derived `getSnapshot()` identity stability
- cancellation/disposal before completion
- contrasting-case regressions for fallback-masked bugs

## Practical Next Step

If this repository wants to automate incrementally, the best first pass is:

1. add a small grep-based CI script for the easiest high-signal patterns
2. add one or two focused custom ESLint rules for render-time reactive-read misuse and test-state leakage
3. add a small mechanical marker-class verification script for renderer roots

That combination will catch a meaningful share of the recurring regressions without needing a large custom analysis framework.
