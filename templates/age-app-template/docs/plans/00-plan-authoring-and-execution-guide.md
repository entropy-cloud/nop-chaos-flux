# Plan Authoring And Execution Guide

## Goal

`docs/plans/` is for non-trivial execution slices that need explicit scope, closure criteria, and proof.

## When To Write A Plan

Write a plan when the task:

- changes API, database/model, auth, integration, deployment, or public contract behavior
- changes user-visible behavior across more than one feature surface
- touches multiple modules and changes shared behavior
- is expected to take more than one AI session
- needs staged implementation or explicit proof before closure

Skip a formal plan for local low-risk edits such as copy changes, small styling fixes, test-only cleanups, and single-file behavior fixes with clear existing tests.

## Minimum Rules

1. Start from the live baseline, not from memory.
2. Write `Goals` and `Non-Goals`.
3. Use checkboxes for execution and closure.
4. Keep one plan focused on one honest result surface.
5. Do not mark a plan complete until proof exists in the repo.
6. Do not turn the plan into a code-design dump. The plan should capture scope, proof, and closure logic, not low-level implementation detail.

## Minimal Template

```md
# <plan-id> <title>

> Plan Status: planned
> Last Reviewed: YYYY-MM-DD
> Source: <requirement / bug / analysis / request>

## Current Baseline

- <what is true today>
- <what gap remains>

## Goals

- <result>

## Non-Goals

- <explicitly excluded work>

## Execution Plan

### Phase 1 - <name>

Status: planned
Targets: `<paths>`

- [ ] <implementation item>
- [ ] <proof item>

Exit Criteria:

- [ ] <behavior lands>
- [ ] <relevant docs updated or No owner-doc update required>
- [ ] `docs/logs/` updated

## Closure Gates

- [ ] in-scope behavior is complete
- [ ] relevant docs are aligned
- [ ] verification has run
- [ ] closure evidence exists in files
```
