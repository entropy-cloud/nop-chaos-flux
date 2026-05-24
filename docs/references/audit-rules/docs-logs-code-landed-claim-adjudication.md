# Docs Logs Code Landed Claim Adjudication

## Purpose

This rule captures recurring drift where docs or logs claim a behavior is landed, but live code does not actually implement that contract, or where reference docs mix live baseline with target-state wording.

Use it when reviewing docs-only plans, closure notes, reference docs, or any change that updates both implementation and documentation status claims.

## Scope

Apply this rule when code or docs changes touch any of the following:

- `docs/references/` baseline descriptions
- daily log entries that claim work is landed or completed
- plan closure notes and validation checklists
- owner docs that currently contain live-vs-target split wording
- adjudication of whether a code path is really shipped versus only planned

## Required Pattern

### 1) Landed claims must be re-checked against live code, not copied forward

- Do not preserve a `landed` or `completed` claim only because an older log or plan said so.
- Re-check the actual implementation path in live code before repeating the claim.
- If live code does not match, downgrade the claim or create a successor plan instead of silently overstating closure.

Review checks:

- Trace the claimed behavior to the actual implementation path.
- Compare code, docs, and logs before repeating the claim.
- If there is a gap, record explicit ownership of the remaining work.

### 2) Reference docs must describe live baseline unless an owner-doc exception is explicit

- `docs/references/` should not mix target-state types or fictional APIs into current-baseline docs.
- If an owner doc carries a temporary live-vs-target split, that exception must be narrow and explicit.
- Completed plans must not retain stale partial-complete or target-state wording after closure.

Review checks:

- Search for target-state phrasing inside reference docs.
- Check closure notes for leftover partial or pre-fix wording.
- Confirm any live-vs-target exception is documented as an exception, not the general pattern.

## Allowed Exceptions

- An owner doc may carry a narrow, explicit live-vs-target split during active convergence work if the exception is clearly labeled.
- Historical logs may retain the original statement, but follow-up log/doc entries must clarify the final adjudicated baseline.

## Review Checklist

- Landed/completed claims are backed by live code.
- Remaining gaps have explicit owner plans instead of implied closure.
- Reference docs stay live-baseline-only unless an exception is explicitly documented.
- Closure notes and validation checklists no longer carry stale partial wording.

## Evidence From This Repository

- `docs/archive/plans/156-reference-doc-sync-and-audit-consensus-plan.md`
- `docs/archive/plans/162-designer-page-and-report-selection-audit-remediation-plan.md`
- `docs/archive/plans/181-word-editor-dataset-vocabulary-convergence-plan.md`
- `docs/archive/analysis/2026-04-30-references-doc-code-consistency-audit.md`

## Primary Architecture Anchors

- `docs/index.md`
- `docs/logs/00-log-writing-guide.md`
