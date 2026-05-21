# OpenCode Session Analysis - Overview

> Generated: 2026-05-21 UTC
> Source: `opencode.db` via `scripts/opencode/analyze_sessions.py`

## Global Statistics

| Metric                          | Value                  |
| ------------------------------- | ---------------------- |
| Total sessions                  | 7,429                  |
| Active sessions (with messages) | 7,429                  |
| Total messages                  | 214,555                |
| Total parts                     | 1,075,996              |
| Total tool calls                | 398,088                |
| Total tokens consumed           | 38.2B (38,159,895,368) |
| Avg tokens per session          | 5.1M                   |
| Avg tokens per message          | 177,856                |
| Avg tool calls per message      | 1.9                    |
| Total wall clock time           | 69,305 hours           |
| Total active execution time     | 2,649 hours            |
| Active ratio (active/wall)      | 3.8%                   |

> **Note on time**: "Wall clock time" = time from first to last message in a session, including overnight breaks, lunch, weekends. "Active time" = sum of individual message processing durations. A session spanning 3 calendar days may have only 2 hours of actual execution.

## Time Distribution

### Sessions with interruptions (>10 min gap between messages)

| Metric                          | Value              |
| ------------------------------- | ------------------ |
| Sessions with >= 1 interruption | 592 / 7,277 (8.1%) |
| Total interruptions             | 1,233              |
| Median longest gap per session  | ~6.4 hours         |

This means **91.9% of sessions are single continuous sprints**, while 8% are multi-day sessions with breaks.

## Token Distribution (per session)

| Range     | Count |
| --------- | ----- |
| 0         | 117   |
| <100K     | 337   |
| 100K-500K | 1,945 |
| 500K-1M   | 1,289 |
| 1M-5M     | 2,617 |
| 5M-50M    | 970   |
| 50M-500M  | 152   |
| >500M     | 2     |

## Message Count Distribution (per session)

| Range   | Count |
| ------- | ----- |
| 1-5     | 1,661 |
| 6-20    | 3,734 |
| 21-50   | 1,294 |
| 51-100  | 364   |
| 101-500 | 340   |
| >500    | 36    |

## Model Usage

### By Message Count (top models)

| Model                  | Messages | Provider            |
| ---------------------- | -------- | ------------------- |
| gpt-5.4                | 79,657   | github-copilot      |
| glm-5.1                | 41,942   | zhipuai-coding-plan |
| gpt-5.5                | 19,870   | github-copilot      |
| glm-5                  | 17,951   | zhipuai-coding-plan |
| gpt-5.4                | 17,376   | LiteLLM/azure       |
| claude-sonnet-4.6      | 10,194   | github-copilot      |
| glm-4.7                | 5,931    | zhipuai-coding-plan |
| claude-opus-4.5        | 5,845    | github-copilot      |
| mimo-v2-pro-free       | 4,862    | opencode            |
| deepseek-v4-flash-free | 2,530    | opencode            |

### By Token Consumption (top models)

| Model                      | Tokens | Share |
| -------------------------- | ------ | ----- |
| gpt-5.4 (github-copilot)   | 8.6B   | 22.6% |
| glm-5.1 (zhipuai)          | 2.7B   | 7.2%  |
| gpt-5.4 (azure)            | 2.7B   | 7.0%  |
| gpt-5.5 (github-copilot)   | 1.8B   | 4.6%  |
| claude-sonnet-4.6 (github) | 856M   | 2.2%  |
| glm-5 (zhipuai)            | 808M   | 2.1%  |
| mimo-v2-pro-free           | 435M   | 1.1%  |
| claude-opus-4.5 (github)   | 417M   | 1.1%  |

> Note: ~19.1B tokens (50%) are from messages without explicit model metadata (likely older sessions or assistant responses without model tagging).

## Agent Usage

### Global Agent Statistics

| Agent               | Messages | Tokens | Role                                           |
| ------------------- | -------- | ------ | ---------------------------------------------- |
| **build**           | 116,301  | 13.2B  | 主构建 agent — 代码编写、重构、测试执行        |
| **explore**         | 56,639   | 3.7B   | 探索 agent — 代码搜索、文件浏览、结构分析      |
| **general**         | 19,778   | 1.2B   | 通用 agent — 多步骤任务、综合研究              |
| **sisyphus-junior** | 10,314   | 106M   | 中等复杂度自动循环任务（不适合其他分类的任务） |
| **sisyphus**        | 8,825    | 593M   | 自动循环 agent — 持续执行直到完成              |
| compaction          | 844      | 212M   | 对话压缩（系统自动触发，非用户 agent）         |
| **atlas**           | 841      | 39M    | 知识图谱/索引 agent                            |
| **librarian**       | 407      | 16M    | Git 专家 — 提交架构、rebase、历史搜索          |
| **plan**            | 239      | 12M    | 计划制定 agent                                 |
| **prometheus**      | 120      | 3.2M   | 进度追踪/状态报告 agent                        |
| **oracle**          | 109      | 4.1M   | 设计师视角 UI agent — 视觉细节、交互设计       |
| **houyi**           | 102      | 4.7M   | 射手 agent — 精确定位和修复                    |
| **momus**           | 38       | 936K   | 批评/对抗性审查 agent                          |
| OpenCode-Builder    | 35       | 1.0M   | 构建系统 agent                                 |
| **metis**           | 32       | 559K   | 智慧/策略 agent                                |
| **pangu**           | 16       | 603K   | 盘古 agent — 项目初始化/脚手架                 |

> **build + explore 占 81% 的消息和 93% 的 token 消耗**。这两个 agent 是工作主力。

### Explore Agent 详细分析

**explore 是什么**: 一个只读研究型子 agent，被 build/general 等主 agent 通过 `task` 工具调度。它只做代码阅读、搜索和结构分析，**不修改任何文件**。

**典型任务**（基于实际 session 内容分析）:

| 任务类型             | 示例                                                                                    | 主要工具           |
| -------------------- | --------------------------------------------------------------------------------------- | ------------------ |
| 代码行为分析         | 分析 input-table select submit 行为、AMIS 容器组件差异                                  | read + grep + bash |
| 深度审核（维度检查） | 维度 09 渲染器契约合规、维度 12 表单字段建模、维度 15 安全性能、维度 16 文档-代码一致性 | read + grep + glob |
| 架构调查             | 检查包边界违规、分析 renderer 包质量                                                    | read + grep + glob |
| 问题定位             | 定位 bug 根因、追踪 import 链                                                           | read + grep + bash |

**工具使用特征**: read 最多（50-158 次/session），grep 其次（37-81 次），bash 较少（仅用于复杂搜索）。不使用 edit/apply_patch/write。

**explore 使用的模型**:

| 模型                   | 消息数 | 类型          |
| ---------------------- | ------ | ------------- |
| gpt-5.4                | 19,599 | 旗舰级        |
| gpt-5.5                | 14,832 | 旗舰级        |
| glm-5.1                | 10,918 | 旗舰级        |
| claude-sonnet-4.6      | 1,628  | 高端          |
| deepseek-v4-flash-free | 1,434  | **免费/轻量** |
| claude-opus-4.5        | 1,050  | 旗舰级        |
| mimo-v2-pro-free       | 917    | **免费/轻量** |
| glm-4.7                | 820    | 中端          |
| gpt-5.4 (azure)        | 385    | 旗舰级        |
| claude-opus-4.6        | 346    | 高端          |
| hy3-preview-free       | 274    | **免费/轻量** |
| qwen3.6-plus-free      | 98     | **免费/轻量** |
| minimax-m2.5-free      | 88     | **免费/轻量** |
| glm-5-turbo            | 77     | 轻量          |
| big-pickle             | 40     | **免费/轻量** |

**结论**: explore **已经使用了多个免费/轻量模型**（deepseek-v4-flash-free 1434 msgs, mimo-v2-pro-free 917 msgs 等），合计约 2,888 条消息使用了免费模型（占 explore 总量的 5.1%）。但主流仍然使用旗舰级模型（gpt-5.4/gpt-5.5 共 61%）。explore 的任务（代码搜索、结构分析、审核报告）需要较强的理解和推理能力，免费模型在复杂审核任务中质量可能不足。**gpt-5-mini 从未被 explore 使用过**（全局仅 build 使用了 61 条 gpt-5-mini）。

## Compaction 统计

| 指标               | 值                |
| ------------------ | ----------------- |
| 总 compaction 事件 | 819               |
| 涉及 session 数    | 383 (占总数 5.2%) |

> **Compaction** = OpenCode 在对话上下文超过模型窗口时，自动将历史消息压缩为摘要。每次 compaction 后 agent 丢失之前对话的完整细节，只能依赖压缩摘要继续工作。这是长会话中错误率上升的主要原因之一。

## Top 10 Sessions by Token Consumption

| #   | Description                            | Tokens | Msgs  | Tools | Active | Wall  | Compact | Interruptions |
| --- | -------------------------------------- | ------ | ----- | ----- | ------ | ----- | ------- | ------------- |
| 1   | 为 nop-chaos-amis 设计渲染接口方案     | 557.1M | 1,541 | 1,916 | 12.5h  | 43.3h | 5       | 27            |
| 2   | 执行架构合约与实现收敛计划（plan 82）  | 514.4M | 1,553 | 3,248 | 20.3h  | 37.7h | 10      | 13            |
| 3   | 执行 flow-designer playground 示例开发 | 442.5M | 1,287 | 1,778 | 10.1h  | 47.5h | 9       | 23            |
| 4   | 开发 report-designer 并补充单元测试    | 353.5M | 883   | 1,250 | 7.6h   | 43.6h | 3       | 22            |
| 5   | 多维度深度审核，生成 plan 262-271      | 307.9M | 1,088 | 2,335 | 19.3h  | 35.7h | 14      | 7             |
| 6   | 修复 recurse/loop 控件不显示问题       | 280.2M | 875   | 1,510 | 10.4h  | 21.7h | 7       | 5             |
| 7   | 检查 nop-stream 模块设计与实现         | 271.4M | 677   | 848   | 7.6h   | 19.7h | -       | 14            |
| 8   | 执行 plan 221-230                      | 262.4M | 974   | 2,150 | 14.9h  | 22.3h | 14      | 2             |
| 9   | AMIS React 19 迁移 + Playwright 验证   | 242.5M | 1,291 | 1,282 | 11.8h  | 21.0h | 7       | 3             |
| 10  | 执行 plan 290-306                      | 221.1M | 745   | 1,741 | 14.5h  | 22.2h | 14      | 3             |

## Top 10 Sessions by Active Execution Time

| #   | Description                            | Active | Wall   | Tokens | Msgs  | Compact | Interruptions |
| --- | -------------------------------------- | ------ | ------ | ------ | ----- | ------- | ------------- |
| 1   | 编译运行修复与自动化测试验证           | 88.5h  | 3.0h   | -      | 122   | low     | 0             |
| 2   | Resume nop-retry-orm-model Plan (后台) | 36.1h  | 370.8h | -      | 64    | 0       | 0             |
| 3   | Fix TSX errors in widgets (自动循环)   | 24.8h  | 44.7h  | 11.9M  | 7,121 | 1       | 1             |
| 4   | 执行架构合约与实现收敛计划（plan 82）  | 20.3h  | 37.7h  | 514.4M | 1,553 | 10      | 13            |
| 5   | 多维度深度审核，生成 plan 262-271      | 19.3h  | 35.7h  | 307.9M | 1,088 | 14      | 7             |
| 6   | 执行143单元测试覆盖率80%计划           | 16.7h  | 23.7h  | -      | 535   | 6       | 2             |
| 7   | 自动执行 plan 371-404                  | 15.9h  | 22.0h  | -      | 742   | 10      | 4             |
| 8   | 开放式对抗性审查                       | 15.4h  | 22.6h  | -      | 749   | 9       | 7             |
| 9   | 执行 plan 221-230                      | 14.9h  | 22.3h  | 262.4M | 974   | 14      | 2             |
| 10  | 修复login页面图标与输入文字重叠        | 14.7h  | 16.4h  | -      | 252   | -       | 4             |

## Key Observations

- **Wall clock 误导性**: 实际执行时间（active）仅为 wall clock 的 3.8%。大部分"长会话"只是跨天打开。
- **Compaction 是长会话质量下降的主因**: 383 个会话共发生 819 次 compaction。高 compaction 会话（>=10 次）的编辑错误率更高，因为压缩后 agent 丢失了文件精确状态。
- **中断本身不是问题**: 中断（吃饭/下班/过夜）是正常的。问题在于 compaction 后的上下文丢失，而不是中断本身。
- **Top 10 会话消耗 ~3.5B tokens** (~9% of 38.2B)，real execution time 7.6h-20.3h。
- **Tool call density**: 平均 1.9 tool calls/message；top sessions 2.1-3.2。
