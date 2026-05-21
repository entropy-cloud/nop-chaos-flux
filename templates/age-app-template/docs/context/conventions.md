# Project Conventions

## Purpose

This file captures project-wide rules that AI agents should apply by default.

Keep it short. If a rule becomes detailed lookup material, move the detail to `docs/references/` and link it here.

## File-In / File-Out

- Important inputs should be written to files before implementation.
- Important outputs should be written back to the repo, not left only in chat.
- Raw inputs belong in `docs/input/`.
- Synthesized implementation-ready requirements belong in `docs/requirements/`.

## Design Split

- Requirement/app behavior design belongs in `docs/requirements/` and `docs/design/`.
- Technical architecture design belongs in `docs/architecture/`.
- Cross-reference instead of duplicating the same rule in multiple docs.

## Review Rule

- High-risk or high-ambiguity requirement, design, and plan drafts should get an independent subagent or reviewer pass.
- Independent review should cite files and evidence, not only say “looks good.”
- If no independent reviewer is available, record that limitation in the plan or log.

## Bug Rule

- Every non-trivial bug fix should add or update automated test coverage.
- If automated coverage is impossible, record the reason and manual proof.

## Comment Policy

- Prefer no comments by default.
- Add comments only when a local constraint is easy to misread and code alone is not enough.

## Verification Rule

- Keep verification commands current in `docs/context/project-context.md`.
- Do not report verification success for commands that were not actually run.
- Do not keep placeholder verification commands after copying the template.
