# Manual Test Issue Writing Guide

Manual test issues are recorded by date, with one file per day.

## Purpose

Each document records issues found during manual testing, including:

- UI and interaction issues
- Functional defects
- Cases where behavior does not match expectations

## Rules

- **One file per day** - all issues found on the same day go into the same file
- **Append new entries** - append new entries to the end of the file in forward order
- **Sequential numbering** - each issue uses the next increasing number; numbering does not reset across days
- **Keep entries concise** - issue descriptions should stay short and specific

## Path Convention

- `docs/testing/{year}/{month}-{day}.md`

## Entry Format

```markdown
# Manual Test Issues - YYYY-MM-DD

## N. Short issue title

- **所属组件**: 组件或模块名称
- **问题描述**: 具体的问题描述，包括复现步骤（如适用）
- **预期行为**: 应有的正确行为（可选）
- **发现方式**: 人工测试 / 探索性测试 / 回归验证
- **状态**: 待修复 / 已修复 / 已确认 / 不予修复
```

## Adding A New Entry

1. Open `docs/testing/{year}/{month}-{day}.md` (create it if it does not exist)
2. Append a new `## N. 问题标题` entry at the end of the file, continuing the previous numbering
3. Fill in the relevant fields
