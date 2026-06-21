# Audits

## Purpose

`docs/audits/` holds audit **methods** (the `00-` guide) and optional stored audit records produced by deep-audit / adversarial-review runs (the goal driver writes outputs at `docs/audits/<TIMESTAMP>-<kind>-<pkg>/`).

Audit is how claims get challenged. It is distinct from `docs/plans/` (how a slice closes) and `docs/skills/` (reusable methods).

## Read First

1. `00-audit-execution-guide.md` — the three audit objects, two styles, and the mandatory independent closure rule.
2. The relevant prompt under `docs/skills/` (e.g. `deep-audit-prompts.md`, `open-ended-adversarial-review-prompt.md`).

## When This Directory Gets Records

- The goal driver writes deep-audit and adversarial-review outputs as `<TIMESTAMP>-<kind>-<pkg>/`.
- Manual audits use dated filenames: `YYYY-MM-DD-HHmm-<kind>-<topic>.md` (see `docs/references/document-naming-and-timeliness.md` conventions).

## Relationship To Plans

- Every plan requires an independent **draft review** before execution and an independent **closure audit** before `Plan Status: completed` (see `docs/plans/00-plan-authoring-and-execution-guide.md` → Closure Audit Rule).
- Those review records live _inside_ the plan file by default; this directory holds standalone audit sweeps that are not tied to a single plan.
