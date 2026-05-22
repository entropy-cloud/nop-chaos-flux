# Closure Audit Prompt

Use this prompt when independently checking whether a planned slice is actually complete.

All created plans require closure audit unless the plan explicitly qualifies for the micro-plan exception.

```text
Read `AGENTS.md`, `docs/index.md`, the active requirement/design docs, the active plan, the latest related log entry, and the live changed code.

Audit whether the claimed implementation is truly closed.

Check `docs/context/ai-autonomy-policy.md` reviewer availability. Cold replay is valid only for non-protected, non-high-risk plans and never for protected areas, unresolved product risk, or source-of-truth conflicts.

Focus on:
- whether live behavior matches the stated requirement
- whether the plan's closure gates are actually satisfied
- whether proof exists in files and verification results, not only in chat
- whether docs were updated where the supported baseline changed
- whether any remaining gap is still in scope
- whether the micro-plan exception was misused to skip independent review
- whether the actual diff exceeded micro-plan limits and needed reclassification
- whether any autonomy or backlog state was loosened without durable evidence
- whether verification failures or unrun commands are being hidden

Return findings first, ordered by severity.
If closure is blocked, say `needs revision` and list the exact missing proof or changes.
If the slice is acceptable, say `passes closure audit` and note any residual risks.
```
