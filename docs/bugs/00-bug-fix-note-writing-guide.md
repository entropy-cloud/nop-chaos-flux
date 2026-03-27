# 00 Bug Fix Note Writing Guide

## Purpose

Use `docs/bugs/` to record important bug fixes in a way that still makes sense after the codebase changes significantly.

The goal is not to repeat the full implementation diff. The goal is to preserve:

- what went wrong
- how it was diagnosed (especially when diagnosis was hard)
- why it went wrong
- how it was fixed
- how the fix is protected by tests

## When To Write A Bug Fix Note

Write a bug fix note when at least one of these is true:

- the bug had a non-obvious root cause
- the bug crossed package boundaries
- the bug looked like one thing but was actually caused by another layer
- the fix added or changed regression tests
- future refactors could easily reintroduce the same problem

Do not write one for every tiny typo or trivial one-line fix.

## File Naming Rule

Every note must use a numbered filename:

- `01-...`
- `02-...`
- `03-...`

Examples:

- `01-playground-email-input-state-reset-fix.md`
- `02-dialog-close-action-scope-fix.md`
- `03-array-editor-child-path-remap-fix.md`

Use short, searchable names. Prefer the user-visible symptom plus the fix topic.

## Required Sections

Each bug fix note should stay brief and include these sections.

### 1. Title

Use the number and a clear bug name.

Example:

- `# 01 Playground Email Input State Reset Fix`

### 2. Problem

Describe the observed symptom in 2 to 5 lines.

Include:

- what the user or developer saw
- where it happened
- the smallest reproducible behavior

Good example:

- in the playground form, the `email` field accepted the first character but often failed to append later characters

### 3. Diagnostic Method

This section is mandatory.

Describe how the issue was located, not only the final root cause.

Include:

- what made diagnosis difficult
- what was inspected first, and why
- what hypotheses were tested and rejected
- what direct evidence confirmed the true cause (DOM snapshot, logs, debugger state, test output)

If diagnosis was easy, still include 2 to 4 bullets with the minimal path used.

### 4. Root Cause

Explain the real cause, not just the surface symptom.

Keep it short:

- 1 to 3 bullets or a few short paragraphs
- mention the actual package or subsystem involved
- if the bug had multiple causes, separate them clearly

Good example:

- renderer value reading subscribed to scope instead of the authoritative form store
- form runtime could be recreated during unrelated rerenders, which amplified the reset behavior

### 5. Fix

Explain the solution in terms of design intent, not line-by-line code changes.

Include:

- what was changed
- where it was changed
- why that change addresses the root cause

Good example:

- field renderers now bind to form store values when a field is rendered inside a form
- form runtime is preserved across unrelated rerenders and recreated only when identity inputs change

### 6. Tests

List the regression coverage added or updated.

Include:

- test file path
- what the test protects

Good example:

- `packages/flux-renderers-form/src/index.test.tsx` verifies `input-email` can progress from `a` to `ab` to a full address
- `packages/flux-react/src/index.test.tsx` verifies host rerenders do not wipe form-local values

### 7. Affected Files

List only the important code and test files. Do not paste large diffs.

### 8. Notes For Future Refactors

Add 1 to 3 bullets describing what future changes should be careful not to break.

This section is important because the main value of these notes is long-term memory.

## Writing Style

Keep bug notes concise.

- prefer short sections
- prefer direct statements over narrative
- avoid large code blocks unless a tiny snippet is necessary
- avoid repeating details already covered in architecture docs
- write so that someone reading it months later can understand the issue without reconstructing the whole incident

## Recommended Template

Use this template for new entries:

```md
# 0X Short Bug Fix Title

## Problem

- what broke
- where it broke
- minimal visible symptom

## Diagnostic Method

- diagnosis difficulty (why this was hard)
- investigation path (what was checked first)
- rejected hypotheses
- decisive evidence that confirmed the issue

## Root Cause

- actual cause 1
- actual cause 2

## Fix

- main change 1
- main change 2

## Tests

- `path/to/test-file` - what it verifies

## Affected Files

- `path/to/file`

## Notes For Future Refactors

- risk or invariant 1
- risk or invariant 2
```

## Scope Boundary

`docs/bugs/` is historical and explanatory.

- use `docs/architecture/` for current design truth
- use `docs/references/` for stable lookup material
- use `docs/bugs/` to remember important failures and why the fix exists

