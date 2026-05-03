# Test Reliability And Contract Freshness

## Purpose

This rule captures recurring failures where tests are unreliable because of shared mutable state, stale frozen expectations, oversized cross-domain suites, or underused shared test support.

Use it when reviewing test files, test helpers, and regressions that appear to pass while encoding old or incorrect contracts.

## Scope

Apply this rule when code changes touch any of the following:

- test files with module-top state or global mutation
- large multi-domain test suites
- regression tests added after contract fixes
- custom test setup duplicated across many files

## Required Pattern

### 1) Tests must isolate mutable state and global side effects

- Do not keep shared mutable test state at module scope unless it is provably immutable.
- Global mutations must be installed and cleaned up per test or per suite with explicit teardown.
- Shared fixtures should export pure helpers and immutable constants, not mutable singleton state.

Review checks:

- Search for module-top arrays, counters, caches, and global replacement code.
- Confirm cleanup happens in `afterEach`/`afterAll` or equivalent.
- Run shuffle/isolated verification for files that previously leaked state.

### 2) Regression tests must encode the current contract, not fossilized pre-fix behavior

- Do not preserve old wrong behavior by leaving stale labels, stale DOM markers, or stale semantics in assertions.
- After a contract fix, update tests to the final agreed behavior rather than patching code to satisfy stale expectations.
- Large cross-domain test files should be triaged explicitly before they become the only place multiple unrelated contracts are frozen together.

Suite-size triage baseline:

- files under roughly 300 lines are normally fine when the assertions still cover one coherent contract family
- files around 300-500 lines should trigger a quick maintainability review before more unrelated coverage is added
- files above 500 lines are not an automatic violation, but adding new unrelated assertions without a split or explicit justification counts as rule pressure
- file size alone is a maintainability signal; it becomes a reliability finding only when stale expectations, cross-domain coupling, timeout sprawl, or shared mutable setup make the suite harder to trust

Review checks:

- Compare new assertions with the current owner doc or live behavior.
- Search for assertions that still use old labels, DOM markers, or pre-fix semantics.
- Check whether a large suite is merely broad or is actually freezing multiple unrelated contracts behind shared mutable setup.

## Allowed Exceptions

- Module-top shared values are allowed when they are immutable test data.
- Broad integration suites are allowed when the purpose is explicitly end-to-end and the file remains maintainable.

## Review Checklist

- Tests do not leak mutable module-top state or unmanaged globals.
- Regression assertions match current contract semantics.
- Oversized cross-domain suites are either split, justified, or kept narrow enough that they do not become a reliability liability.
- Shared test-support utilities are preferred over bespoke repeated setup when available.

## Evidence From This Repository

- `docs/plans/167-test-quality-and-reliability-improvement-plan.md`
- `docs/plans/162-designer-page-and-report-selection-audit-remediation-plan.md`
- `docs/plans/175-review-4-findings-remediation-plan.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/14-test-coverage.md`

## Primary Architecture Anchors

- `AGENTS.md`
- `docs/logs/index.md`
