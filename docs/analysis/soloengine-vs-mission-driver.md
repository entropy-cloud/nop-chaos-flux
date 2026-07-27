# SoloEngine vs Mission Driver 架构对比分析

> 日期：2026-07-26
> 参考框架：GOTM（Driver-Worker-Store 模式）、Sagewai Autopilot、OpenFleet Deterministic Brain

---

## 1. 核心范式

### SoloEngine：ReAct 单体循环

```
 SoloAgent/ReActCore
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Think   │→ │  Act     │→ │  Observe  │→ │  Repeat  │
  │ (推理)    │  │ (工具)   │  │ (结果)    │  │ (循环)    │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘
       │             │              │             │
       ▼             ▼              ▼             ▼
  ┌─────────────────────────────────────────────────┐
  │           Conversation History (单列表)           │
  │  [sys][user][asst(tool)][tool][asst(text)]...   │
  └─────────────────────────────────────────────────┘
  所有工作在同一个对话上下文中完成
  Agent 既是决策者又是执行者
```

**核心特征**：Agent 实例 = 配置 + ReActCore + conversation_history。Agent 同时负责"决策"（Think）和"执行"（Act/Observe）。所有状态在同一个列表中线性增长。

### Mission Driver：计划器/调度器/执行器三层分离

```
 DRIVER (长期驻留)                 WORKER (一次性)
  - 持有 Mission DAG/Ledger         - 每次 dispatch 全新上下文
  - 调度循环: frontier→ready→       - bounded inputs + spec
    dispatch→collect→audit→repeat   - 执行完即销毁, 可并行
  - 唯一写入 Store                 - terse result → Store
                 │                    │
                 └──── STORE ────────┘
                 持久化、born-tiered
```

**核心特征**：Driver 不做具体工作；Worker 不做决策；Store 是唯一持久状态。审计独立（auditor ≠ author）。

---

## 2. 状态管理与单调性问题

| 维度     | SoloEngine                   | Mission Driver                               |
| -------- | ---------------------------- | -------------------------------------------- |
| 状态位置 | 内存 `_conversation_history` | Store（`.gotm/` + 仓库）                     |
| 状态形态 | 线性消息列表                 | 结构化 Ledger（DAG + 决策/审计）             |
| 生命周期 | 随会话起止                   | 跨会话持久                                   |
| 上下文   | 滑动窗口（max 10）缓解       | "nothing load-bearing lives in conversation" |
| 增长     | **单调增长**（核心缺陷）     | born-tiered（hot + cold）                    |

**SoloEngine 的单调性问题**：每轮迭代的 token 消耗随会话长度递增。即使滑动窗口也只缓解不解决。

**Mission Driver 的解决方案**：

- Driver 只持有 DAG 索引（非工作内容）
- Worker 每次新鲜上下文（bounded input，无历史）
- Store 按层级冷热分离

---

## 3. LLM 角色与控制模型

| 维度       | SoloEngine                  | Mission Driver       |
| ---------- | --------------------------- | -------------------- |
| LLM 调用者 | Agent 每轮迭代              | Worker 每次 dispatch |
| 调度决策   | LLM（Think 决定下一步）     | 确定性 DAG frontier  |
| 审计       | Agent 自审（self-verified） | 独立 audit worker    |
| 控制模型   | **概率控制**                | **确定性控制**       |

**最根本的区别**：

> SoloEngine 问 LLM："你觉得下一步该做什么？"
> Mission Driver 问 Store："根据 DAG，下一个 ready 的工作单元是什么？"

---

## 4. 各自适用场景

| 场景                 | SoloEngine    | Mission Driver       |
| -------------------- | ------------- | -------------------- |
| 单 Agent 对话        | ✅ 最适合     | ❌ 过重              |
| 快速原型             | ✅ 开箱即用   | ❌ 需搭建 Store      |
| 领域专家搭建         | ✅ 画布拖拽   | ❌ 需理解角色分工    |
| 多 Agent 协作        | ✅ 画布 DAG   | ✅ Worker 天然并行   |
| 长期项目（>1000 轮） | ❌ 单调增长   | ✅ Store 冷热分离    |
| 企业合规/审计        | ❌ 无独立审计 | ✅ 强制 audit worker |

---

## 5. 融合可能

SoloEngine 的 **ReActCore** 可作为 **Worker 实现**嵌入 Mission Driver：

```
Driver (GOTM) → dispatch → SoloAgent (ReActCore 复杂推理)
                         → 返回结果 → Audit Worker → Store 更新
```

Mission Driver 可从 SoloEngine 借鉴 MCP 集成、ToolCallEventManager 四事件机制、画布自动编译。

---

## 6. 结论

**SoloEngine** = ReAct Agent 范式：一个 Agent 在一个对话中自主 Think→Act→Observe。回答"更好的 Agent（更多工具、更智能的推理）"。

**Mission Driver** = 软件工程式 Agent 架构：拆解为计划/执行/记忆/审计四个正交角色。回答"更好的流程（计划→调度→执行→审计的工程纪律）"。

核心洞察差异：**"不要让决策同时做执行，不要让执行者自审，不要让状态只存在于对话中"**。
