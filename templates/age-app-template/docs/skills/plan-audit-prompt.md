# Plan Audit Prompt

Use this prompt when auditing a non-trivial execution plan before implementation.

```text
Read `AGENTS.md`, `docs/index.md`, `docs/process/application-development-workflow.md`, the active requirement/design docs, and the active file under `docs/plans/`.

Audit the plan as an execution contract.

Focus on:
- whether the current baseline is honest
- whether goals and non-goals are clear
- whether closure gates are real
- whether hidden dependencies or unresolved requirement gaps remain
- whether any in-scope defect or contract gap was silently downgraded

Return findings first, ordered by severity.
Do not praise the plan unless it changes the risk assessment.
```
