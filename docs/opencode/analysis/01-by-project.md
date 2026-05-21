# Per-Project Analysis

> Generated: 2026-05-21 UTC

## Summary by Project Directory

| Directory                               | Sessions | Tokens | Messages | Tools   | Bash   |
| --------------------------------------- | -------- | ------ | -------- | ------- | ------ |
| C:\can\nop\nop-chaos-flux               | 5,817    | 26.6B  | 145,606  | 302,699 | 31,530 |
| C:\can\nop\nop-chaos-next               | 325      | 1.5B   | 9,782    | 20,941  | 2,940  |
| C:\can\nop\nop-amis-wt\flow-designer2   | 91       | 1.3B   | 6,745    | 8,840   | 1,586  |
| C:\can\nop\nop-amis-wt\refactor-1       | 66       | 1.3B   | 4,268    | 6,891   | 1,178  |
| C:\can\nop\nop-entropy                  | 305      | 1.2B   | 8,348    | 11,462  | 1,538  |
| C:\can\nop\nop-chaos-next-wt\*          | 37       | 696.4M | 2,844    | 3,969   | 726    |
| C:\can\nop\nop-amis                     | 9        | 567.3M | 1,636    | 2,166   | 535    |
| C:\can\nop\nop-frontend-test\gpt-3      | 16       | 512.2M | 1,929    | 2,821   | 477    |
| C:\can\nop\nop-chaos-next-wt\grcc       | 65       | 451.2M | 2,489    | 3,263   | 707    |
| C:\can\nop\nop-amis-wt\report-designer2 | 4        | 353.7M | 894      | 1,260   | 329    |

## Observations

- **nop-chaos-flux** dominates: 78% of sessions, 70% of tokens, 76% of tools. This is the primary project.
- **nop-entropy** (Java backend) has 305 sessions with 1.2B tokens — significant exploration of a large codebase.
- **nop-amis-wt worktrees** show parallel development: flow-designer2 (91 sessions), refactor-1 (66 sessions), report-designer2 (4 sessions but 354M tokens).
- Worktree pattern suggests branching per feature, with heavy session counts per branch.
