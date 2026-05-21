# Application Development Workflow

## Purpose

This document defines the default lightweight workflow for AI-assisted application development in `<project-name>`.

It exists because app-layer projects often fail before coding quality becomes the main issue:

- raw inputs are incomplete
- requirement boundaries are unstable
- prototype fidelity is mistaken for implementation readiness
- process records are missing
- teams jump from discussion straight to code

This workflow makes those failure modes explicit.

## Default Flow

For most small and medium app projects, use this path:

1. `context`
2. `input`
3. `requirements`
4. `design`
5. `plan` when needed
6. `implementation`
7. `verification`
8. `logs / bugs`

Use the heavier layers only when the work is ambiguous, risky, or repeatedly failing.

## Optional Extended Layers

These are available but not mandatory for every task:

1. `discussion`
2. `document audit`
3. `plan audit`
4. `closure audit`
5. `retrospective`
6. `skill extraction`

## Stage 0 - Read Context

Before non-trivial work, read:

- `docs/context/project-context.md`
- `docs/context/source-of-truth-and-precedence.md`
- `docs/context/conventions.md`

If these files are empty or stale, update them before relying on the rest of the workflow.

## Three-Step Control Loop

Use this as the main control loop for non-trivial work:

### A. Generate Design Docs

Split design output into two parts:

- pure requirement/app behavior design under `docs/requirements/` and `docs/design/`
- pure technical and architectural design under `docs/architecture/`

These files should reference each other when needed, but should not collapse into one mixed document.

After drafting substantial design documents, use an independent subagent or reviewer pass and revise until major objections are resolved.

### B. Generate The Plan From Design Docs

Write `docs/plans/` from the settled design baseline, not from raw source material alone.

After drafting a substantial plan, use an independent subagent or reviewer pass and revise until major objections are resolved.

### C. Audit Periodically

Use document audits, plan audits, and closure audits at a frequency proportional to project risk.

For small projects, this may be lightweight and occasional. For unstable or drifting work, increase the audit cadence.

## Stage 1 - Collect Raw Inputs

Store source material under `docs/input/`.

Typical sources:

- PM notes
- card-set documents
- prototypes
- existing system screenshots
- copied business rules
- external articles or references

Rule:

- keep source material close to its original meaning
- do not rewrite it into polished requirements too early

## Stage 2 - Clarify Ambiguity When Needed

If the source material is incomplete or contradictory, create a file under `docs/discussions/`.

Use this stage when:

- the PM is too busy to fully specify a complete round
- multiple interpretations seem plausible
- a prototype shows surface shape but not business rules
- developers would otherwise need to infer domain meaning directly from raw files

Output:

- open questions
- assumptions
- pending confirmations
- decisions that unblock synthesis

## Stage 3 - Synthesize Requirements

Convert clarified input into implementation-ready files under `docs/requirements/`.

This stage should answer:

- what is in scope now
- what is not in scope now
- what user-visible behavior is required
- what data, permissions, and business rules matter
- what remains unresolved

Rule:

- if the requirement is still not implementation-ready, do not pretend it is ready by writing a weak plan

## Stage 4 - Update Stable Design Baseline

Move durable decisions into owner docs.

- app-layer feature, role, page, and flow decisions go into `docs/design/`
- cross-cutting technical and module decisions go into `docs/architecture/`

Keep requirement/app design and technical architecture design separate, then cross-reference them.

These files should describe the current supported baseline, not a running negotiation transcript.

## Stage 5 - Audit The Documents When Needed

Before execution, audit the docs baseline only when the work is substantial, ambiguous, or risk-prone.

At minimum, challenge these risks:

- scope is too broad
- prototype details are mistaken for complete requirements
- key business rules are missing
- unresolved questions are hidden inside “nice looking” text
- stable owner docs and active requirements disagree

Use `docs/audits/` and the prompt templates under `docs/skills/`.

## Stage 6 - Write The Plan When Needed

When work is non-trivial, create a plan under `docs/plans/`.

The plan should capture:

- current baseline
- goals
- non-goals
- phased execution
- proof requirements
- closure gates

The plan should not become a low-level implementation design dump.

## Stage 7 - Audit The Plan When Needed

Before implementation, independently challenge the plan only when the slice is large enough or risky enough to justify it.

The audit should test:

- is the scope honest
- are closure gates real
- are hidden dependencies missing
- does the plan silently rely on unresolved requirement gaps

## Stage 8 - Implement Small Complete Slices

Implement the smallest complete slice that produces a real supported result.

Rules:

- do not optimize for demo breadth
- do not create large placeholder surfaces just to look complete
- prefer one real feature slice over five weak page shells

## Stage 9 - Verify

Run the real verification commands for the repo.

Capture additional proof in:

- `docs/testing/` for manual or exploratory proof
- `docs/bugs/` for non-obvious regressions
- `docs/logs/` for dated landing records

Rule:

- every non-trivial bug fix should add or update automated test coverage

## Stage 10 - Independent Closure Audit When Needed

Non-trivial work is not automatically closed just because the implementing agent says so.

Closure requires an independent re-check against:

- live code
- current docs
- verification results
- stated closure gates

If the plan is not really closed, keep it open.

## Stage 11 - Retrospective When Needed

If prototype and implementation still diverged, or if the first requirement set missed key reality, write a retrospective under `docs/retrospectives/`.

Good retrospective questions:

- what source input was missing
- what requirement decision was postponed too long
- what assumption looked reasonable but failed in implementation
- what should move earlier in the workflow next time

## Stage 12 - Skill Extraction When Needed

If the same issue keeps happening, convert it into a reusable prompt or audit playbook under `docs/skills/`.

Examples:

- requirement gap analysis prompt
- plan audit prompt
- closure audit prompt
- domain-specific review checklist

If the output is more of a reusable engineering lesson than a prompt, record it under `docs/lessons/`.

## Relationship To Spec-Driven Development

Spec artifacts can still be useful.

But this workflow does not assume a single `proposal -> design -> task` shape can own all project knowledge.

Why:

- app-layer projects need both time-sensitive execution docs and always-current owner docs
- raw inputs, discussions, analyses, and retrospectives do not naturally fit one rigid spec artifact
- spec-only workflows often drift into task completion without clarifying the system’s longer-term shape

Use specs if helpful, but keep docs split by responsibility.

## Recommended Small/Medium Project Loop

For most non-trivial tasks, the default loop is:

1. read or update context
2. write or update input/requirement files
3. update design or architecture docs if the supported baseline changed
4. write or update a plan only when the slice is non-trivial
5. implement
6. verify
7. record logs and bug notes when needed

Add audits, retrospectives, and reusable skills only when the problem pattern justifies the extra process.

Even in the lightweight path, keep the file-in/file-out rule: important instructions, plans, and conclusions should land in files, not only in chat.
