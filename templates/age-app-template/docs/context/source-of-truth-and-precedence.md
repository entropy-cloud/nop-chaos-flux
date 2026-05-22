# Source Of Truth And Precedence

## Purpose

This file defines which artifact answers which question.

Use it to avoid mixing stable truth, execution notes, and historical context.

## Precedence By Question

### What should be built now?

Primary source:

- `docs/requirements/`

Support sources:

- `docs/input/`
- `docs/discussions/`

Rule:

- `docs/input/` preserves raw source material
- `docs/requirements/` is the implementation-ready interpretation
- if they differ, update the requirement file explicitly instead of silently relying on chat memory

### What is the current supported app behavior?

Primary source:

- `docs/design/`

Rule:

- `docs/design/` owns app-layer feature, flow, role, and page behavior
- feature requirement files may drive changes, but stable app behavior should converge into owner docs under `docs/design/`

### What is the current supported technical structure?

Primary source:

- `docs/architecture/`

Rule:

- `docs/architecture/` owns technical boundaries, module responsibilities, and cross-cutting implementation rules

### What is the database truth?

Primary source:

- the project's database model files

Examples:

- `model/`
- schema DSL files
- ORM model definitions

Rule:

- database definitions are owned by model/schema artifacts, not by plan text or prose documentation
- documentation may explain intent, but the model files are the source of truth

### What is the API contract truth?

Primary source:

- API schema files, OpenAPI/GraphQL definitions, route definitions, or backend contract tests

Rule:

- prose docs may summarize API intent, but executable or schema-level API contracts win

### What is the external integration truth?

Primary source:

- integration contract docs from the external system
- committed adapter configuration or integration tests

Rule:

- do not invent external system behavior from UI requirements alone

### What is the environment/deployment truth?

Primary source:

- deployment manifests
- environment schema files
- infrastructure configuration

Rule:

- plans and docs may describe deployment intent, but the committed deployment/config artifacts are the operational source

### How should this slice be executed and closed?

Primary source:

- `docs/plans/`

Rule:

- plans are execution contracts, not long-term owner docs

### What actually happened during execution?

Primary source:

- `docs/logs/`

Support sources:

- `docs/testing/`
- `docs/bugs/`
- `docs/audits/`
- `docs/retrospectives/`

### What should future AI sessions learn from repeated failures?

Primary source:

- `docs/skills/`
- `docs/lessons/`

Rule:

- use `docs/skills/` for reusable prompts and playbooks
- use `docs/lessons/` for reusable engineering lessons and cautionary patterns

## Conflict Resolution

- If raw input and synthesized requirements disagree, update `docs/requirements/` or reopen clarification before coding.
- If requirements and owner docs disagree, decide whether the requirement changes the supported baseline; then update `docs/design/` or `docs/architecture/` explicitly.
- If live code and owner docs disagree, treat it as either implementation drift or stale docs; do not silently choose one.
- If resolving a conflict changes user-visible behavior, data/model shape, API behavior, auth/permission behavior, or external integration behavior, stop and ask for confirmation.
- If verification fails, the plan is not closed even if implementation appears complete.
- If model/schema files and prose docs disagree on database truth, model/schema files win; update the prose docs or model intentionally.

## Legacy Or Stale-Docs Mode

Use this mode when `docs/context/project-context.md` marks documentation freshness as `stale`, `unknown`, or `partially stale` for the active slice.

- Live code and executable contracts are evidence of current behavior, not automatically desired behavior.
- Owner docs are intended attractors only after they are revalidated against live code, requirements, and human/product intent.
- Before changing behavior, classify each conflict as `implementation drift`, `doc drift`, or `intentional legacy behavior` in a requirement, discussion, analysis, or plan file.
- AI autonomy defaults to `research-only` or `plan-first` until a baseline audit or human confirmation records what should be preserved versus changed. For `partially stale`, this restriction applies only to slices whose requirement, owner doc, codebase-map route, or touched code area has not been verified fresh.
- Do not "fix" code to match stale docs or rewrite docs to match code without recording the drift classification.

## Simple Rule Of Thumb

- stable behavior and structure belong in owner docs
- execution belongs in plans and logs
- history and diagnosis belong in bugs, audits, testing notes, retrospectives, and lessons
