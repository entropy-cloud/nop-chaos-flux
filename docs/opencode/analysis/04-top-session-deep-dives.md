# Top Session Deep Dives

> Generated: 2026-05-21 UTC
> Sorted by **Active Execution Time** (real processing time, excluding interruptions)

---

## 1. 编译运行修复与自动化测试验证

- **Active**: 88.5h | **Wall**: 3.0h | **Messages**: 122 | **Compaction**: low
- 编译、运行和自动化测试验证循环。Active >> Wall 是并行子 agent 叠加计时的结果。

## 2. Sisyphus Work: Resume nop-retry-orm-model Plan

- **Active**: 36.1h | **Wall**: 370.8h (15.5 天) | **Messages**: 64 | **Compaction**: 0
- 长时间后台任务，跨周执行。36h 实际执行分散在 371h 日历时间内。

## 3. Fix TypeScript/TSX syntax errors in widgets package

- **Active**: 24.8h | **Wall**: 44.7h | **Messages**: 7,121 | **Tokens**: 11.9M | **Compaction**: 1
- 修复 nop-mobile widgets 包中所有 TypeScript/TSX 语法错误，使 pnpm build 通过。涉及 Button、Collapse、Modal 等组件的语法修复和类型定义调整。7121 条消息为自动化循环产生。
- **Model**: glm-5
- **Agents**: sisyphus-junior (7120 msgs)

## 4. 架构合约与实现收敛计划（82）

- **Active**: 20.3h | **Wall**: 37.7h | **Messages**: 1,553 | **Tokens**: 257.2M | **Compaction**: 10 | **Interruptions**: 13 (longest: 12.5h)
- 在 nop-chaos-flux 中执行架构合约与实现收敛计划（plan 82），跨多个包进行代码重构和对齐，包含 1192 次文件读取、771 次命令执行和 515 次补丁应用。用户多次催促不停下汇报、直接执行到底。
- **Top tools**: read(1192), bash(771), grep(595), apply_patch(515), todowrite(134)
- **Model**: gpt-5.4
- **Agents**: build (1543 msgs)

## 5. nop-chaos-flux 深度审核提示词手册

- **Active**: 19.3h | **Wall**: 35.7h | **Messages**: 1,088 | **Tokens**: 307.9M | **Compaction**: 14 | **Interruptions**: 7
- 多维度代码审查，生成 plan 262-271 修正计划并用独立子 agent 反复审改至达成共识。131 次子任务调度。
- **Model**: gpt-5.4
- **Agents**: build (1074 msgs)

## 6. 执行143单元测试覆盖率80%计划

- **Active**: 16.7h | **Wall**: 23.7h | **Messages**: 535 | **Compaction**: 6
- 单元测试覆盖率提升计划，大量 build-test-fix 循环。

## 7. 自动执行计划371至404直至彻底完成

- **Active**: 15.9h | **Wall**: 22.0h | **Messages**: 742 | **Tokens**: - | **Compaction**: 10
- 自动执行 nop-chaos-flux 的 plan 371-404 共 34 个计划，用户反复强调中途不停下汇报。68 次子任务调度、199 次补丁应用。
- **Model**: gpt-5.4
- **Agents**: build (732 msgs)

## 8. 开放式对抗性审查提示词

- **Active**: 15.4h | **Wall**: 22.6h | **Messages**: 749 | **Compaction**: 9
- 对 nop-chaos-flux 进行多轮架构批评，生成 plan 406-412 修正计划并用独立子 agent 进行 25 轮审改迭代，覆盖 832 次文件读取和 474 次内容搜索。
- **Model**: gpt-5.4
- **Agents**: build (740 msgs)

## 9. 执行plan 221-230

- **Active**: 14.9h | **Wall**: 22.3h | **Messages**: 974 | **Tokens**: 262.4M | **Compaction**: 14
- 执行 nop-chaos-flux 的 plan 221-230，涉及 flow-designer-renderers 测试、vite workspace 别名配置、playground flow-operations 等模块的代码修改和验证。
- **Model**: gpt-5.4, glm-5.1
- **Agents**: build (960 msgs)

## 10. 修复login页面图标与输入文字重叠问题

- **Active**: 14.7h | **Wall**: 16.4h | **Messages**: 252 | **Active ratio**: 90.2%
- 聚焦的 bug 修复会话。几乎无中断的连续执行。

## 11. 执行 plan 290-306

- **Active**: 14.5h | **Wall**: 22.2h | **Messages**: 745 | **Compaction**: 14
- 执行 17 个计划，涵盖多个包的代码修改和验证。64 次子任务调度。
- **Model**: gpt-5.4
- **Agents**: build (731 msgs)

## 12. 深入设计 nop-chaos-amis 渲染接口方案

- **Active**: 12.5h | **Wall**: 43.3h | **Messages**: 1,541 | **Tokens**: 278.6M | **Compaction**: 5 | **Interruptions**: 27 (longest: 8.1h)
- 为 nop-chaos-amis 设计渲染接口方案，包括 JSONRenderer 内部接口、表达式处理器设计、参数传递策略，并产出分阶段开发计划。
- **Model**: gpt-5.4
- **Agents**: build (1536 msgs)

## 13. nop-job 重写实施计划

- **Active**: 11.2h | **Wall**: 43.6h | **Messages**: 684 | **Compaction**: 9 | **Interruptions**: 11
- 在 nop-entropy 中将旧的内存调度器重构为 schedule→fire→task 模式。
- **Model**: gpt-5.4, glm-5.1, claude-sonnet-4.6
- **Agents**: build (674 msgs)

## 14. AMIS React 19 迁移执行计划与 Playwright 验证

- **Active**: 11.8h | **Wall**: 21.0h | **Messages**: 1,291 | **Compaction**: 7
- 修复 this.props 泄漏到 MobX 响应式上下文的架构问题，涉及 Form、CRUD、Menu、Toast、Dialog 等核心组件，152 次编辑。
- **Model**: claude-sonnet-4.6, glm-5.1
- **Agents**: build (1283 msgs)

## 15. recurse、loop 控件 playground 示例未显示

- **Active**: 10.4h | **Wall**: 21.7h | **Messages**: 875 | **Compaction**: 7
- 修复 recurse、loop 等控件在 playground 中不显示的问题，设计了 form 变量发布机制和 scope 监听策略的架构文档。
- **Model**: gpt-5.4
- **Agents**: build (872 msgs)

---

## Compaction 统计

### 全局

| 指标               | 值                 |
| ------------------ | ------------------ |
| 总 compaction 事件 | 819                |
| 涉及 session 数    | 383                |
| 占总 session 比    | 383 / 7,429 (5.2%) |

> Compaction = OpenCode 自动压缩对话上下文。当消息累积超过模型上下文窗口时，系统将历史消息压缩为摘要，释放 token 空间。每次 compaction 后，agent 丢失之前对话的完整细节，只能依赖压缩摘要继续工作。

### Top Sessions by Compaction Count

| Compactions | Session                            | Description       |
| ----------- | ---------------------------------- | ----------------- |
| 14          | 执行 plan 290-306                  | 17 个计划批量执行 |
| 14          | nop-chaos-flux 深度审核提示词手册  | 多轮对抗性审查    |
| 14          | 执行plan 221-230                   | 10 个计划批量执行 |
| 13          | plan 96-100 架构文档收尾           | 多计划执行        |
| 10          | 自动执行计划371至404               | 34 个计划批量执行 |
| 10          | 架构合约与实现收敛计划（82）       | 大规模重构计划    |
| 9           | 开放式对抗性审查                   | 多轮审改迭代      |
| 9           | 优化路径绑定以超越 Formily 性能    | 性能优化专项      |
| 9           | nop-job 重写实施计划               | 架构重写          |
| 9           | 执行 flow-designer playground 示例 | 多模块开发        |

### Compaction 的影响

每次 compaction 意味着：

1. **上下文丢失**: agent 无法回溯 compaction 前的完整对话细节，只能看到压缩后的摘要
2. **重复工作**: agent 可能重新读取之前已读过的文件、重新确认之前已完成的工作
3. **错误率上升**: compaction 后的编辑操作更容易因内容记忆不精确而失败

高 compaction 会话（>=10 次）的平均编辑错误率明显高于低 compaction 会话，因为 agent 在压缩后丢失了文件当前状态的精确记忆。

---

## Most-Interrupted Sessions

| #   | Session                              | Interruptions | Longest Gap | Wall  | Active |
| --- | ------------------------------------ | ------------- | ----------- | ----- | ------ |
| 1   | 深入设计 nop-chaos-amis 渲染接口方案 | 27            | 8.1h        | 43.3h | 12.5h  |
| 2   | 执行 flow-designer playground 示例   | 23            | 11.2h       | 47.5h | 10.1h  |
| 3   | 开发report-designer并补充单元测试    | 22            | 11.5h       | 43.6h | 7.6h   |
| 4   | 检查 nop-stream 模块设计与实现       | 14            | 7.6h        | 19.7h | 7.6h   |
| 5   | 架构合约与实现收敛计划（82）         | 13            | 12.5h       | 37.7h | 20.3h  |

> **注意**: "中断"不等于"恢复成本"。中断本身是正常的（吃饭、下班、睡觉）。"恢复成本"是指 agent 在恢复后需要重新读取文件、重新理解上下文的时间。这个成本主要发生在 compaction 之后，而不是普通中断之后。一个有 27 次中断但只有 5 次 compaction 的会话，其恢复成本主要来自 compaction 导致的上下文丢失，而不是中断本身。

---

## Edit Failure Hotspots

| File                         | Session             | Total Edits | Consecutive Failures | Root Cause                                               |
| ---------------------------- | ------------------- | ----------- | -------------------- | -------------------------------------------------------- |
| `schema-compiler.ts`         | plan 96-100 收尾    | 5           | 5                    | **修复引入新错误循环**: 每次修一个 LSP 错误就引入另一个  |
| `FlowDesignerExample.tsx`    | flow-designer2 评估 | 23          | 4                    | **大文件漂移**: 23 次编辑，oldString 基于旧内容          |
| `source-resolvers.ts`        | plan 96-100 收尾    | 8           | 3                    | **类型签名级联**: 修改函数签名导致后续编辑失败           |
| `panel.tsx`                  | flow-designer2 评估 | 10          | 2                    | **JSX 属性编辑**: 事件处理器属性变更漂移                 |
| `docs/analysis/2026-04-16-*` | plan 82 收敛        | 30          | 6                    | **文档结构漂移**: markdown 结构变更使后续 oldString 失效 |

---

## File Read Hotspots (multi-offset reads)

| File                                      | Session                 | Total Reads | Offset Reads | Estimated Size |
| ----------------------------------------- | ----------------------- | ----------- | ------------ | -------------- |
| `amis-runtime/src/index.ts`               | nop-chaos-amis 渲染接口 | 119         | 116          | ~3,000+ lines  |
| `flux-runtime/src/index.test.ts`          | plan 82 收敛            | 93          | 92           | ~2,500+ lines  |
| `report-designer-renderers/src/index.tsx` | report-designer 开发    | 67          | 65           | ~2,000+ lines  |
| `FlowDesignerExample.tsx`                 | flow-designer2 评估     | 53          | 48           | ~1,500+ lines  |
| `flow-designer-renderers/src/index.tsx`   | flow-designer2 评估     | 51          | 47           | ~2,000+ lines  |
