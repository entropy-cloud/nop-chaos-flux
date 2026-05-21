# Bug Fix Note Writing Guide

## Purpose

Use `docs/bugs/` for non-obvious regressions, subtle root causes, and fixes that should influence future review.

## Include

- symptom
- trigger or reproduction
- root cause
- fix summary
- regression proof
- future guardrail if needed

## Rule

Do not create a bug note for every small typo or obvious local fix. Use this directory for issues worth remembering.

Every non-trivial bug fix should add or update automated test coverage.

If a bug note is created, include the test proof path or verification evidence.

## Filename Guidance

For small and medium projects, either style is acceptable:

- numbered: `docs/bugs/01-short-bug-name.md`
- dated: `docs/bugs/YYYY-MM-DD-short-bug-name.md`

If you expect bug notes to become a long-lived reference library, prefer numbered filenames.
