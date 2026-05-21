# Closure Audit Prompt

Use this prompt when independently checking whether a non-trivial slice is actually complete.

```text
Read `AGENTS.md`, `docs/index.md`, the active requirement/design docs, the active plan, the latest related log entry, and the live changed code.

Audit whether the claimed implementation is truly closed.

Focus on:
- whether live behavior matches the stated requirement
- whether the plan's closure gates are actually satisfied
- whether proof exists in files and verification results, not only in chat
- whether docs were updated where the supported baseline changed
- whether any remaining gap is still in scope

Return findings first, ordered by severity.
If the slice is acceptable, say so explicitly and note any residual risks.
```
