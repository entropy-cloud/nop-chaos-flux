# 742 审计修复 R2·R3.5：office 族交互修复（P1-MA5.3-001/002 + P1-MA9.3-002）

> Plan Status: completed
> Source: R3.5（MR3.0 展开）；audit MA5.3 §003/004 + MA9.3 §002

## Summary

- P1-MA5.3-001 FIXED: spreadsheet-grid.tsx useEffect editing→null refocuses scrollRef (P0-MA5.1-002 same pattern)
- P1-MA5.3-002 ESCALATED: report-host dual undo stacks require report-designer architecture investigation
- P1-MA9.3-002 ESCALATED: word deep-stack undo partial rollback — mechanism not fully located

## Verification

- spreadsheet-renderers 187/187 green
- typecheck/build/lint/test all green
