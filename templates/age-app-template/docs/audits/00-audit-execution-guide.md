# Audit Execution Guide

## Purpose

This guide defines the default audit checkpoints for app-layer development.

Plan audit and closure audit are mandatory for created plans.

Every created plan must record durable audit evidence in at least one place: the plan, the daily log, or a file under `docs/audits/`. Do not leave audit results only in chat.

Cold replay is not a second reviewer and cannot approve plan creation, plan closure, or protected-area scope changes by itself.

## Three Default Audits

1. document audit
2. plan audit
3. closure audit

## Document Audit

Run after requirement/design updates and before large implementation work.

Check for:

- missing scope boundaries
- unresolved questions disguised as settled requirements
- mismatch between raw input and synthesized requirement
- mismatch between requirement and owner docs

## Plan Audit

Run after writing a plan and before implementation.

Check for:

- dishonest closure gates
- hidden dependencies
- unowned leftovers
- plan scope that still depends on unresolved requirements
- missing proof strategy for each acceptance criterion
- missing or weak task routing and skill-selection rationale in the plan

## Closure Audit

Run after implementation and verification for every created plan.

Check for:

- live behavior really landed
- docs are aligned
- claimed proof actually exists
- plan closure gates are truly satisfied
- no in-scope item was downgraded to a vague follow-up
- verification failures are not being treated as non-blocking without explicit adjudication

## Output Rule

Audit results must be recorded durably for every created plan. Use a separate file when the audit is non-trivial, disputed, reusable, or likely to matter later.

Use `docs/skills/` for reusable prompt templates and `docs/logs/` for small audit notes attached to daily execution.

## Filename Guidance

Prefer dated filenames for audit records:

- `docs/audits/YYYY-MM-DD-document-audit-topic.md`
- `docs/audits/YYYY-MM-DD-plan-audit-topic.md`
- `docs/audits/YYYY-MM-DD-closure-audit-topic.md`
