# Start Here After Copy

Use this checklist immediately after copying the template into a new project.

Do this before asking AI to implement features.

## Required Before First AI Coding

- [ ] Replace `<project-name>` and other placeholders.
- [ ] Fill `docs/context/project-context.md` with real project identity, active work, and verification commands.
- [ ] Choose the first active requirement file and record it in `docs/context/project-context.md`.
- [ ] Ensure the active requirement has concrete acceptance criteria.
- [ ] Choose the first active owner doc and record it in `docs/context/project-context.md`.
- [ ] Ensure verification commands are real commands for this repository.

## Fill Progressively

Fill these as soon as they are needed. Do not block the first small feature just to write polished baseline docs.

- [ ] Fill `docs/architecture/project-vision.md` with long-term product direction and non-goals.
- [ ] Fill `docs/architecture/system-baseline.md` with the real stack and model/database source.
- [ ] Fill `docs/design/app-overview.md` with current app surfaces, roles, and core workflows.
- [ ] Fill `docs/requirements/product-scope.md` and `docs/requirements/mvp.md` with the current milestone scope.
- [ ] Decide which optional layers are active by checking boxes in `docs/context/project-context.md`.
- [ ] Remove or ignore optional directories you will not maintain yet.

## Minimum Before Coding

- [ ] The active requirement has concrete acceptance criteria.
- [ ] The active owner doc is listed in `docs/context/project-context.md`.
- [ ] Verification commands are real commands for this repository.
- [ ] Any conflict between raw input, requirements, owner docs, and live code is resolved or explicitly blocked.

## Do Not Start If

- `docs/context/project-context.md` is still blank.
- verification commands are placeholders.
- active requirement is `none`.
- the active requirement is unclear enough that implementation would require guessing user-visible behavior.
- the task changes database/API/auth/integration behavior but no owner doc or model source is identified.
