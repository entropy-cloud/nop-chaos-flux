# Audit Execution Guide

## Purpose

This guide defines the default audit checkpoints for app-layer development.

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

Run after writing a non-trivial plan and before implementation.

Check for:

- dishonest closure gates
- hidden dependencies
- unowned leftovers
- plan scope that still depends on unresolved requirements

## Closure Audit

Run after implementation and verification.

Check for:

- live behavior really landed
- docs are aligned
- claimed proof actually exists
- plan closure gates are truly satisfied

## Output Rule

Audit results should be stored as files when the audit is non-trivial, reusable, or likely to matter later.

Use `docs/skills/` for reusable prompt templates and `docs/logs/` for small audit notes attached to daily execution.

## Filename Guidance

Prefer dated filenames for audit records:

- `docs/audits/YYYY-MM-DD-document-audit-topic.md`
- `docs/audits/YYYY-MM-DD-plan-audit-topic.md`
- `docs/audits/YYYY-MM-DD-closure-audit-topic.md`
