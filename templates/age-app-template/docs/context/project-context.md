# Project Context

## Purpose

Keep this file as the shortest current snapshot an AI agent needs before doing useful work.

Update it in place. Do not create dated copies.

## Project Identity

- Project name:
- Product type:
- Primary users:
- Current milestone:
- Documentation freshness: `<fresh | partially stale | stale | unknown>`

## Active Work

- Active requirement: `docs/requirements/<path-or-none>`
- Active owner doc: `docs/design/<path>` or `docs/architecture/<path>`
- Active plan: `docs/plans/<path-or-none>`
- Active backlog item: `docs/backlog/README.md#<item-or-none>`
- AI autonomy: `<implement | plan-first | ask-first | research-only | blocked>`
- Current blocker: `<none | describe>`

Rule:

- If active requirement is `none`, agents may help create or clarify requirements and context, but must not implement product behavior.
- If AI autonomy is not `implement`, agents must follow `docs/context/ai-autonomy-policy.md` before changing product behavior.
- If documentation freshness is `stale` or `unknown`, agents may research, audit, and draft alignment docs, but must not implement product behavior until the baseline is re-established or a human confirms the intended behavior.
- If documentation freshness is `partially stale`, agents may implement only slices whose active requirement, owner doc, codebase-map route, and touched code area have been verified fresh; otherwise treat the slice as `plan-first` or `research-only`.

## Current Technical Baseline

- Frontend stack:
- Backend stack:
- Database/model source:

## Verification Commands

Replace every placeholder before implementation work starts.

| Purpose                   | Command                       |
| ------------------------- | ----------------------------- |
| Install dependencies      | `<fill real command>`         |
| Run app locally           | `<fill real command>`         |
| Typecheck / compile check | `<fill real command or none>` |
| Build                     | `<fill real command or none>` |
| Lint / static check       | `<fill real command or none>` |
| Unit tests                | `<fill real command or none>` |
| E2E / integration tests   | `<fill real command or none>` |

## Optional Layers Currently In Use

Mark only the optional layers this project actually maintains.

- [ ] `docs/discussions/`
- [ ] `docs/audits/`
- [ ] `docs/testing/`
- [ ] `docs/skills/`
- [ ] `docs/analysis/`
- [ ] `docs/retrospectives/`
- [ ] `docs/lessons/`

## AI Block Conditions

AI MUST stop and wait for human input before proceeding when:

- verification commands are all placeholders and cannot be inferred from the project
- any change touches payment or data-deletion paths with no existing test coverage and no owner doc describing expected behavior

These are project-specific hard stops in addition to `AGENTS.md`, `docs/context/ai-autonomy-policy.md`, source-of-truth conflict rules, and required plan/closure audit rules.

For ambiguity that does not affect user-visible behavior, contracts, protected areas, or closure evidence, resolve by writing assumptions into the relevant doc and proceed according to the autonomy policy. Mark uncertain assumptions explicitly so humans can review later.

## Notes For AI Agents

- If this file is empty or stale, ask for or create a context update before large implementation work.
- AI may correct factual context from live repo evidence, but must not loosen autonomy, remove blockers, mark stale docs fresh, or downgrade protected areas without human confirmation or human-approved owner-doc evidence.
- Do not infer current milestone or active plan from chat alone.
- Do not report verification success while commands still contain `<fill real command>` placeholders.
