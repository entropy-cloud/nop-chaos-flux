# Manual Test Issues

人工测试问题的记录，按日期归档。

## Structure

```
docs/testing/
├── index.md          ← this file (writing guide + index)
├── 2026/
│   ├── 05-06.md
│   └── ...
└── 2027/
    └── ...
```

**Convention**: `docs/testing/{year}/{month}-{day}.md`

## Writing Guide

### Purpose

每份文档记录当天人工测试中发现的问题，包括：

- UI/交互问题
- 功能缺陷
- 与预期行为不符的情况

### Rules

- **One file per day** — 同一天发现的所有问题写入同一文件
- **Append new entries** — 新条目追加到文件末尾（正序排列）
- **Sequential numbering** — 每个问题按递增编号，跨天不重置
- **Keep entries concise** — 问题描述简洁明确

### Entry Format

```markdown
# Manual Test Issues — YYYY-MM-DD

## N. 简短问题标题

- **所属组件**: 组件或模块名称
- **问题描述**: 具体的问题描述，包括复现步骤（如适用）
- **预期行为**: 应有的正确行为（可选）
- **发现方式**: 人工测试 / 探索性测试 / 回归验证
- **状态**: 待修复 / 已修复 / 已确认 / 不予修复
```

### Adding a New Entry

1. 打开 `docs/testing/{year}/{month}-{day}.md`（不存在则新建）
2. 在文件末尾追加 `## N. 问题标题` 条目（编号接续前一条）
3. 填写各项字段

## Index (Reverse Chronological)

### 2026-05

- [05-06](2026/05-06.md) — ArrayField 删除按钮位置不合适；Flow Designer 报错 Renderer not found for type: input-number；Flow Designer 节点内容丢失、连线文字为空
