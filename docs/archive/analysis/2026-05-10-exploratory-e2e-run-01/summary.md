# Exploratory E2E Run 01 — Summary

## Execution Overview

- **Date**: 2026-05-10
- **Main executor rounds**: 4 (domain pages, lab batch, interaction, full suite verification)
- **Independent sub-agents**: 1 (subagent-a)
- **Sub-agent rounds**: 1 (17 tests across 8 describe blocks)

## Issues Found and Fixed

### Issue Category #1: Cross-form-scope formula expression in Lab schemas

| Property          | Value                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pages**         | `checkbox-group` lab, `tag-list` lab                                                                                                                                   |
| **Error**         | `Template evaluation failed for: ${(formName.field ?? []).join(", ")}`                                                                                                 |
| **Root cause**    | Text nodes placed at page level (outside form body) referencing form fields via `formName.fieldName` path. The formula compiler cannot resolve cross-scope references. |
| **Fix**           | Moved text nodes inside the form body, changed field references to direct names (`skills` instead of `skillsForm.skills`).                                             |
| **Files changed** | `checkbox-group-lab-page.tsx`, `tag-list-lab-page.tsx`                                                                                                                 |
| **Status**        | **Fixed**                                                                                                                                                              |

### Issue Category #2: Unsupported JS global in formula expressions

| Property          | Value                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page**          | `variant-field` lab                                                                                                                                                                                             |
| **Error**         | `Template evaluation failed for: ${Array.isArray(filterValue) ? ...}`                                                                                                                                           |
| **Root cause**    | The Flux formula language does not expose the JavaScript `Array` global object.                                                                                                                                 |
| **Fix**           | (1) Added `ISARRAY` builtin to `packages/flux-formula/src/builtins.ts`. (2) Replaced `Array.isArray(...)` with `ISARRAY(...)` and `(arr ?? []).join(", ")` with `JOIN(arr ?? [], ", ")` in the lab page schema. |
| **Files changed** | `builtins.ts`, `variant-field-lab-page.tsx`                                                                                                                                                                     |
| **Status**        | **Fixed**                                                                                                                                                                                                       |

## Test Files Created

| File                                                          | Tests  | Coverage                                                                                  |
| ------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `tests/e2e/exploratory/domain-page-zero-error.spec.ts`        | 11     | 9 domain pages + 2 round-trip navigation                                                  |
| `tests/e2e/exploratory/lab-batch-zero-error.spec.ts`          | 43     | All Component Lab renderers                                                               |
| `tests/e2e/exploratory/interaction-tests.spec.ts`             | 16     | Forms, dialogs, drawers, tabs, dynamic-renderer, reaction, complex fields                 |
| `tests/e2e/exploratory/subagent-a-independent-review.spec.ts` | 17     | Debugger API, cross-page stress, flow designer, concurrency, report designer, word editor |
| **Total**                                                     | **87** |                                                                                           |

## Final Test Results

- Full E2E suite: **311 passed, 0 failed, 3 skipped** (8.6 min)
- Typecheck: **48/48 packages passed**
- All 87 exploratory tests pass with zero errors across all three monitoring layers

## Stopping Criterion

The independent sub-agent (subagent-a) completed a full exploration cycle covering debugger API deep inspection, cross-page navigation stress, flow designer interaction, concurrency patterns, form edge cases, report designer, and word editor. The sub-agent found **zero new application bugs**. All 17 sub-agent tests pass.

Per the exploratory testing protocol: a new independent sub-agent completed its full internal loop without finding new high-value issues. This justifies stopping the overall exploration.
