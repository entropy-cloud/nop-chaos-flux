# AGENTS.md

## Project Intent

`<project-name>` uses a lightweight Attractor-Guided Engineering workflow for AI-assisted application development.

This repository is for an application-layer product, not a framework-core project.

The repo is the source of truth. Chat is only a temporary working surface.

Before writing non-trivial code, agents must first understand:

- `docs/context/project-context.md`
- `docs/context/ai-autonomy-policy.md`
- `docs/context/codebase-map.md`
- the active requirement listed in project context
- the active owner doc listed in project context
- the relevant raw inputs under `docs/input/` when requirement meaning depends on source material

Read `docs/context/source-of-truth-and-precedence.md` when facts conflict or you are unsure which artifact owns the answer.
Read `docs/process/application-development-workflow.md` when planning or workflow decisions are part of the task.

## Operating Rules

1. Prefer file-in, file-out collaboration.
2. Do not treat chat summaries as durable project memory.
3. Do not jump from raw PM text or prototype screenshots straight to code when scope is still unclear.
4. If input is ambiguous, first create or update a file in `docs/discussions/` or `docs/requirements/`.
5. Create or update a plan before implementation when the planning triggers below apply.
6. Keep `docs/design/` and `docs/architecture/` focused on the current supported baseline, not migration history.
7. Keep logs short, dated, and append-only.
8. Record non-obvious regressions in `docs/bugs/`.
9. If prototype and implementation diverge materially, capture the reason in `docs/retrospectives/` instead of silently moving on.
10. Promote repeated process lessons into `docs/skills/` or `docs/audits/` only when the pattern is recurring enough to justify reuse.
11. For high-risk or high-ambiguity requirement, design, or plan drafts, request an independent subagent or reviewer pass and revise until major objections are resolved. Every created plan MUST pass an independent plan audit before implementation begins and an independent closure audit before being marked complete, except for the micro-plan exception defined below.
12. Keep code comments minimal. Prefer self-explanatory code; add only rare comments when a local constraint is otherwise easy to misread.
13. When a referenced file is not found at its expected path, check `docs/archive/` before concluding it does not exist. Archived files retain their original relative name under `docs/archive/`. Do not move files to `docs/archive/` without human approval.

## Read This First

- `docs/context/project-context.md`
- `docs/context/ai-autonomy-policy.md`
- `docs/context/codebase-map.md`
- the active requirement listed in `docs/context/project-context.md`
- the active owner doc listed in `docs/context/project-context.md`

Read additionally when needed:

- `docs/context/source-of-truth-and-precedence.md` for ownership or conflict questions
- `docs/context/conventions.md` for project-wide conventions
- `docs/process/application-development-workflow.md` for workflow questions
- `docs/index.md` when you need routing beyond the active files

## Documentation Ownership

- `docs/context/` owns mandatory AI context, source-of-truth precedence, and project-wide conventions.
- `docs/backlog/` owns prioritized candidate work and AI-ready next actions.
- `docs/input/` owns raw external inputs such as PM notes, card docs, article extracts, prototype references, and copied source material.
- `docs/discussions/` owns requirement clarification conversations and unresolved question records.
- `docs/requirements/` owns implementation-ready requirement synthesis.
- `docs/design/` owns stable app-layer business and feature design.
- `docs/architecture/` owns cross-cutting technical and module-boundary truth.
- `docs/lessons/` owns durable reusable lessons extracted from bugs, audits, and retrospectives.
- `docs/plans/` owns execution and closure criteria for non-trivial work.
- `docs/audits/` owns audit workflow records and audit methodology.
- `docs/skills/` owns reusable prompts, review playbooks, and audit prompt templates.
- `docs/logs/` owns dated implementation memory.
- `docs/testing/` owns manual and exploratory testing records.
- `docs/bugs/` owns non-obvious bug histories and regression notes.
- `docs/analysis/` owns research, tradeoff analysis, and rejected directions.
- `docs/retrospectives/` owns post-implementation gap analysis and process improvements.

## Default Workflow

1. Gather raw materials in `docs/input/`.
2. If needed, clarify ambiguity in `docs/discussions/`.
3. Synthesize implementation-ready requirements in `docs/requirements/`.
4. Split stable design output into app-layer design under `docs/design/` and technical design under `docs/architecture/`, with the two referencing each other when needed.
5. Write or update a plan when the planning triggers apply.
6. Audit the plan before implementation unless the micro-plan exception applies.
7. Implement the smallest complete slice.
8. Run verification.
9. Run closure audit for created plans unless the micro-plan exception applies.
10. Record logs and any needed bug notes.

## Optional Workflow Layers

Use these when warranted by task complexity. Plan and closure audits are mandatory for created plans except for the micro-plan exception below.

- `docs/audits/` for document audits and plan/closure audit evidence
- `docs/testing/` for manual or exploratory proof
- `docs/retrospectives/` for material requirement/prototype gaps
- `docs/skills/` for reusable prompts after repeated failures
- `docs/lessons/` for durable engineering lessons after repeated failures or important recoveries

## Planning Rule

Create a plan when the task has any of these traits:

- changes API, database/model, auth, integration, deployment, or public contract behavior
- changes user-visible behavior across more than one feature surface
- touches multiple modules and changes shared behavior
- is expected to take more than one AI session
- modifies more than 5 total files or is likely to exceed roughly 200 changed lines
- needs staged execution or explicit closure gates
- has unresolved product or technical risk that must not be hidden in chat

Skip a formal plan only for local low-risk edits such as copy changes, small styling fixes, test-only cleanups, and single-file behavior fixes with clear existing tests.

Micro-plan exception:

- If a plan exists only to track a very small edit of normally 1-3 non-generated files and under roughly 200 changed lines, and it has no contract, data/model, auth, permission, integration, deployment, cross-surface, stale-doc conflict, or unresolved product risk, independent plan audit may be skipped.
- The plan must explicitly state `Audit: skipped under micro-plan exception` and why the exception applies.
- Closure still requires a cold-replay self-check against the plan, affected docs, real diff, and verification commands; do not mark completion from chat memory alone.

All other created plans MUST pass independent subagent or reviewer audit before implementation begins and again before the plan is marked complete. If no second reviewer is available, use a separate cold-replay pass only for non-protected, non-high-risk plans and document that limitation. Protected areas, unresolved product risk, and source-of-truth conflicts require human/subagent review or stay open.

## Prompting Guidance For Agents

- Do not generate a full product from a single feature list.
- Do not optimize for demo completeness.
- Prefer small complete slices over broad placeholder coverage.
- Prefer existing project patterns over invented abstractions.
- If information is missing, write the missing assumptions into a requirement, discussion, or plan file instead of silently inventing them.
- Do not put code-level implementation detail into plan files unless the detail is required for scope or closure reasoning.
- Prefer citing the existing owner doc instead of restating the same rule in multiple files.
- Do not hide mandatory rules in `docs/references/`; if an AI must apply it by default, put it in `docs/context/` or `AGENTS.md`.
- Use `docs/backlog/` and `docs/context/ai-autonomy-policy.md` to decide whether AI may choose and execute the next task without asking.

## Verification Baseline

Do not assume this template's example commands are valid for the copied project.

Use the real commands listed in `docs/context/project-context.md`.

If verification commands are blank or still placeholders, stop and fill them before reporting verification success.
