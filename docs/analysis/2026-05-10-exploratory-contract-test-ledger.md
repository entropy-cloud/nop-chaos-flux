# 2026-05-10 Exploratory Contract Test Ledger

## Purpose

This file tracks issue categories discovered by exploratory contract testing.

- Record by contract violation or root cause, not by raw instance count.
- Merge same-class findings into one row and expand scope in notes.
- Keep status current as tests are added, fixed, deferred, or rejected.

## Status

- `open`: reproduced by test, not fixed
- `fixed`: reproduced and fixed; regression test should stay green
- `deferred`: reproduced, but repair intentionally postponed
- `invalid`: candidate issue rejected after deeper verification

## Case List

| ID      | Title | Test File | Contract Source | Symptom | Scope | Status | Fix / Note                                                           |
| ------- | ----- | --------- | --------------- | ------- | ----- | ------ | -------------------------------------------------------------------- |
| ECT-001 | _TBD_ | _TBD_     | _TBD_           | _TBD_   | _TBD_ | `open` | Initial placeholder row; replace when the first real issue is found. |

## Per-Case Notes Template

Copy this section when a real issue is found.

### ECT-001. Title

- Test file:
- Related package:
- Stable contract source:
- Reproduction summary:
- Expected behavior:
- Actual behavior:
- Root-cause hypothesis:
- Duplicate key:
- Status:
- Fix status:
- Related files:
- Notes:

## Usage Rules

1. One row per issue category, not per test case instance.
2. If multiple tests prove the same root cause, keep one row and widen the scope field.
3. If a simple issue is fixed immediately, update the row to `fixed` and keep the regression test path.
4. If a complex issue is deferred, record why it is deferred and how the reproducer is preserved.
5. If a candidate issue turns out not to be real, keep a short note and mark it `invalid` instead of silently deleting history.
