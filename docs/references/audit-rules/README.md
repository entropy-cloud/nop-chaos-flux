# Audit Rules

## Purpose

This directory holds stable audit rules used to review implementation consistency across the repository.

- Use these files as review guardrails, not as architecture source-of-truth replacements.
- Keep each rule narrowly scoped so future audits can cite one file instead of hand-reconstructing expectations.
- Add new rules as separate files when a pattern becomes important enough to review repeatedly.

## Current Rules

- `surface-shell-consistency.md` - standard dialog/drawer shell structure and allowed exceptions.

## Authoring Rules

- One file per audit topic.
- State the scope, required pattern, allowed exceptions, and review checks.
- Prefer rules that are easy to verify from code search and DOM structure.
- When a rule depends on a normative contract, link the owner doc instead of duplicating the whole design.
