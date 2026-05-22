# Start Here After Copy

Use this checklist immediately after copying the template into a new project.

Do this before asking AI to implement features.

## Required Before First AI Coding

- [ ] Replace `<project-name>` and other placeholders.
- [ ] Fill `docs/context/project-context.md` with real project identity, active work, and verification commands.
- [ ] Fill `docs/context/ai-autonomy-policy.md` with real protected areas and AI autonomy defaults.
- [ ] Fill `docs/context/codebase-map.md` with real entry points, common change routes, and fragile files.
- [ ] Fill `docs/backlog/README.md` with the first ready or blocked work items.
- [ ] Set `Documentation freshness` in `docs/context/project-context.md` to `fresh`, `partially stale`, `stale`, or `unknown`.
- [ ] Set reviewer availability in `docs/context/ai-autonomy-policy.md`.
- [ ] Choose the first active requirement file and record it in `docs/context/project-context.md`.
- [ ] Ensure the active requirement has concrete acceptance criteria.
- [ ] Choose the first active owner doc and record it in `docs/context/project-context.md`.
- [ ] Ensure verification commands are real commands for this repository.

For a direct local low-risk edit, do not block on a polished backlog or codebase map if the active requirement/owner-doc meaning is obvious and verification commands are real. Protected areas, stale docs, missing verification, or unclear user-visible behavior still block coding.

## Fill Progressively

Fill these as soon as they are needed. Do not block the first small feature just to write polished baseline docs.

- [ ] Fill `docs/architecture/project-vision.md` with long-term product direction and non-goals.
- [ ] Fill `docs/architecture/system-baseline.md` with the real stack and model/database source.
- [ ] Fill `docs/design/app-overview.md` with current app surfaces, roles, and core workflows.
- [ ] Fill `docs/requirements/product-scope.md` and `docs/requirements/mvp.md` with the current milestone scope.
- [ ] Add the first known-good verification row to `docs/testing/known-good-baselines.md` when real commands pass.
- [ ] Decide which optional layers are active by checking boxes in `docs/context/project-context.md`.
- [ ] Remove or ignore optional directories you will not maintain yet.

## Minimum Before Coding

- [ ] The active requirement has concrete acceptance criteria.
- [ ] The active owner doc is listed in `docs/context/project-context.md`.
- [ ] AI autonomy is `implement`, or the work is explicitly `plan-first` and only a plan will be written.
- [ ] Protected-area placeholders are replaced with real entries or explicit `none`.
- [ ] Documentation freshness is not `stale` or `unknown`, unless the first task is research or baseline alignment only.
- [ ] Verification commands are real commands for this repository.
- [ ] Any conflict between raw input, requirements, owner docs, and live code is resolved or explicitly blocked.

## Do Not Start If

- `docs/context/project-context.md` is still blank.
- verification commands are placeholders.
- protected-area placeholders remain and the task touches auth, permissions, payment, data deletion, model/schema, deployment, or external integrations.
- active requirement is `none`.
- AI autonomy is `ask-first`, `research-only`, or `blocked` and no human decision has changed it.
- documentation freshness is `stale` or `unknown` and the task would change product behavior instead of auditing or aligning the baseline.
- the active requirement is unclear enough that implementation would require guessing user-visible behavior.
- the task changes database/API/auth/integration behavior but no owner doc or model source is identified.
