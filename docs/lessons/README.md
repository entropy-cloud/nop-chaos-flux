# Lessons Index

## Purpose

This directory records detailed development lessons that are worth preserving beyond a daily log.

Use it for cases where the durable value is the full engineering path, including:

- an initial wrong judgment or diagnostic path
- a correct practice that should be repeated
- why a choice looked plausible at first
- what concrete evidence changed the decision
- how to recognize the same pattern next time

These notes are more detailed than `docs/logs/` and more practice-oriented than ordinary reference docs.

## Scope Boundary

- `docs/architecture/` describes the current intended system design
- `docs/bugs/` records important live product defects and fixes
- `docs/plans/` records execution ownership and closure
- `docs/lessons/` records reusable development lessons, including both wrong turns and good practices

## File Naming Rule

Use numbered filenames, similar to `docs/bugs/`:

- `01-...`
- `02-...`
- `03-...`

Examples:

- `01-over-abstracted-compiler-fix-before-minimal-branch-point-check.md`
- `02-start-from-live-failing-symptom-before-generalizing-the-model.md`

## Recommended Sections

Each note should include the sections that best fit the case. Common sections are:

1. `Problem Context`
2. `Initial Judgment` or `Practice`
3. `Why It Looked Plausible`
4. `Why It Was Wrong` or `Why It Worked`
5. `Decisive Evidence`
6. `Correct Decision Rule`
7. `Preventive Checklist`
8. `Related Files / Docs`

## Index

- [01 Over-Abstracted Compiler Fix Before Minimal Branch-Point Check](01-over-abstracted-compiler-fix-before-minimal-branch-point-check.md)
