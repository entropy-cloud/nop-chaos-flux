# AGE App Template

This template is a lightweight application-layer project scaffold for AI-assisted product development.

It is meant for ordinary business applications such as admin systems, portals, workflow apps, dashboards, internal tools, and CRUD-heavy domain products.

It is designed for small and medium-sized projects.

It is not a framework-core template like `nop-chaos-flux`. It assumes the project is building an application on top of an existing technical stack, and that the main challenge is requirement clarification, scope control, durable documentation, and iterative implementation quality without heavyweight process overhead.

## What AGE Means

AGE means **Attractor-Guided Engineering**.

In this template, an attractor is the stable structure a project should keep returning to during fast AI-assisted iteration.

For application projects, the attractor is carried by a small set of durable files:

- `docs/context/` - mandatory project context and source-of-truth rules
- `docs/requirements/` - implementation-ready requirement interpretation
- `docs/design/` - stable app-layer behavior and feature owner docs
- `docs/architecture/` - stable technical structure and module boundaries

Plans, logs, bugs, audits, and retrospectives are not the attractor itself. They are control and memory mechanisms that help the project trajectory stay close to the attractor.

The practical goal is simple: prevent AI work from drifting into polished demos, hidden assumptions, and chat-only decisions.

## How This Template Was Made

This template was built by extracting the lightweight parts of the AI development workflow used in existing Nop projects and adapting them for small and medium application teams.

The main references were:

- `nop-chaos-flux` - owner-doc precedence, plan closure, audit, bug, log, and AGE methodology
- `nop-chaos-next` - application-layer `design/`, `input/`, `logs/`, `bugs/`, `skills/`, and lightweight project docs practice
- `nop-entropy` - distinction between normative AI-facing docs and development-process memory

The template was then simplified through several review passes:

1. Start with the core AGE file-in/file-out idea.
2. Split raw inputs, requirements, app design, architecture, plans, logs, bugs, and lessons by responsibility.
3. Add dated naming rules for time-sensitive records.
4. Add copyable examples for common dated documents.
5. Move mandatory AI context out of `docs/references/` into `docs/context/`, because agents do not reliably read reference material unless it is part of the entry path.
6. Keep advanced layers such as audits, retrospectives, skills, testing notes, and analysis optional so the template remains usable for small and medium projects.

Independent review found the template direction useful but warned about two risks: documentation theater and excessive process. The current version addresses those risks by keeping a lean default path and making optional layers explicit.

## First Use

After copying this template, start with:

- `START-HERE-after-copy.md`

Do not ask AI to implement features until the Day 0 checklist is complete enough for the first slice.

The most important setup step is filling `docs/context/project-context.md` with real active work and real verification commands.

## What Problem This Template Solves

Many teams currently do one of these two things:

- paste a large requirement dump into chat and ask AI to generate a whole system
- do loose vibe coding with only partial notes and weak historical records

Both approaches usually drift toward demo-grade output.

This template turns the repo into a durable execution surface with a lean default path:

1. raw input collection
2. requirement synthesis
3. design baseline
4. execution plan when needed
5. implementation
6. verification
7. closure

For more ambiguous or risky work, the template also provides optional audit, retrospective, and skill-extraction layers.

## What This Template Includes

- `AGENTS.md` - app-layer operating contract for AI agents
- `docs/index.md` - docs router and directory ownership baseline
- `docs/context/` - mandatory AI context, source-of-truth precedence, and project-wide conventions
- `docs/process/` - lightweight development workflow
- `docs/input/` - raw PM, prototype, card-set, article, and external source material
- `docs/discussions/` - multi-round clarification records for ambiguous requirements
- `docs/requirements/` - refined implementation-ready requirement files
- `docs/design/` - stable app-layer owner docs for features, roles, flows, and app surfaces
- `docs/architecture/` - cross-cutting technical baseline and module boundaries
- `docs/lessons/` - durable lessons extracted from repeated failures and recoveries
- `docs/plans/` - execution plans with closure rules
- `docs/audits/` - optional audit records and audit workflow guidance
- `docs/skills/` - optional reusable prompts, review playbooks, and audit prompt templates
- `docs/logs/` - daily development log guide and starter index
- `docs/testing/` - manual and automated testing note guides
- `docs/bugs/` - complex regression and root-cause note guide
- `docs/analysis/` - research and design investigation notes
- `docs/retrospectives/` - optional post-implementation gap analysis and process improvement notes

## Default Minimal Setup

For most small and medium projects, you only need these to start coding the first small slice:

- `AGENTS.md`
- `docs/index.md`
- `docs/context/`
- `docs/process/application-development-workflow.md`
- `docs/input/`
- `docs/requirements/`
- `docs/design/`
- `docs/architecture/`

Trigger-based folders:

- `docs/plans/` only when the planning triggers apply
- `docs/logs/` when a real change lands
- `docs/bugs/` when a non-obvious bug is fixed or needs memory

Everything else is optional and should be used only when the project complexity justifies it.

## Stable vs Dated Files

The template follows the same basic split used by the existing systems:

- stable owner docs keep stable filenames
- time-sensitive process records usually carry dates

Examples:

- stable: `docs/design/app-overview.md`, `docs/architecture/system-baseline.md`
- dated: `docs/analysis/2026-05-21-topic.md`, `docs/discussions/2026-05-21-topic.md`, `docs/plans/2026-05-21-topic-plan.md`
- year-organized daily records: `docs/logs/YYYY/MM-DD.md`, `docs/testing/YYYY/MM-DD.md`

See `docs/references/document-naming-and-timeliness.md`.

## Core Principle

Do not push important work through chat alone.

- raw information goes into `docs/input/`
- mandatory context and owner precedence go into `docs/context/`
- unclear points go into `docs/discussions/`
- settled requirements go into `docs/requirements/`
- stable design decisions go into `docs/design/` and `docs/architecture/`
- execution control goes into `docs/plans/`
- proof and history go into `docs/logs/`, `docs/testing/`, and `docs/bugs/`
- process improvements become `docs/skills/`, `docs/lessons/`, or `docs/retrospectives/`

## How To Start A New Project

1. Copy `templates/age-app-template/` into a new repository root.
2. Complete `START-HERE-after-copy.md`.
3. Put PM notes, prototype links, card-set docs, article extracts, and external references into `docs/input/`.
4. If the input is still ambiguous, capture clarification in `docs/discussions/` before implementation.
5. Convert settled scope into `docs/requirements/` before asking AI to code.

## Recommended Execution Pattern

1. Collect raw materials in `docs/input/`.
2. If needed, clarify ambiguity in `docs/discussions/`.
3. Synthesize implementation-ready requirements in `docs/requirements/`.
4. Update stable app design in `docs/design/` and technical baseline in `docs/architecture/`, and make them reference each other where needed instead of mixing both concerns into one file.
5. For work that changes contracts, data/model behavior, auth, integrations, cross-module behavior, or spans more than one session, create a plan under `docs/plans/`.
6. Implement the smallest complete slice.
7. Run verification.
8. Update logs and any affected docs.

Use these only when needed:

- `docs/audits/` for document, plan, or closure audits
- `docs/testing/` for manual or exploratory proof
- `docs/retrospectives/` when prototype and implementation diverged materially
- `docs/skills/` when the same issue repeats often enough to justify a reusable prompt
- `docs/lessons/` when a repeatable lesson should outlive a single bug or retrospective

The full workflow is documented in `docs/process/application-development-workflow.md`.

## Non-Goals

- This template does not prescribe a fixed frontend/backend framework.
- This template does not include generated application code.
- This template does not replace your package manager, lint, test, or CI setup.
- This template does not assume spec-driven development is the only valid artifact workflow.

## Suggested First Prompt

```text
Read `AGENTS.md`, `docs/context/project-context.md`, the active requirement listed there, and the active owner doc listed there.

If the task changes source-of-truth boundaries or you are unsure where facts live, also read `docs/context/source-of-truth-and-precedence.md`.

Do not generate a whole demo application.
If raw inputs are ambiguous or incomplete, first write a requirement synthesis or clarification document instead of coding.

If the scope changes contracts, data/model behavior, auth, integrations, cross-module behavior, or spans more than one session, create or update a plan in `docs/plans/` only after the requirement and design baseline are stable enough.
For high-risk or high-ambiguity work, use an independent subagent or reviewer pass and revise until major objections are resolved.
After landing changes, update the daily log, affected owner docs, and bug memory when needed.
```
