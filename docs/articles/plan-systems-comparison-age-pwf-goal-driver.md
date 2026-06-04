# 两种 Plan 体系对比：AGE Plan vs Planning-with-Files

本文对比两种 AI 辅助开发中的 plan 体系：

- **AGE Plan** — Attractor-Guided Engineering 的计划治理体系，包含规范层（`docs/plans/00-plan-authoring-and-execution-guide.md` 的 24 条 Minimum Rules）和执行层（`nop-entropy/ai-dev/tools/opencode-goal-driver/` 的自动化循环引擎）。Goal Driver 不是独立体系，而是 AGE Plan 规则的工程化实现。
- **Planning-with-Files (PwF)** — [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files)，通用 AI agent 技能插件，源自 Manus 的 context engineering 理念。

两者的核心分歧：**AGE Plan 关心"完成"是否真实，PwF 关心"上下文"是否还在。** 一个防止 plan 虚假完成，一个防止 agent 丢失目标。这个分歧决定了后续所有机制差异。

## 一、设计取向

| 维度                | AGE Plan（含 Goal Driver）                                                                                                        | PwF                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **核心关切**        | 完成是否真实                                                                                                                      | 上下文是否还在                                                 |
| **对 agent 的态度** | 不信任完成判断，需要独立审计复核                                                                                                  | 不担心完成判断，担心遗忘                                       |
| **信任边界**        | 信任 agent 不恶意改文件，不信任 agent 不自欺                                                                                      | 不信任 plan 文件不被篡改，用 SHA-256 锁定                      |
| **完成判断**        | Closure Gates + Exit Criteria + 独立 closure audit + `check-plan-checklist.mjs` 自动化检查                                        | `check-complete.sh` 统计 phase status 计数                     |
| **Plan 状态**       | 9 种：`proposed \| planned \| in progress \| partially completed \| completed \| superseded \| replaced \| deferred \| cancelled` | 3 种：`pending → in_progress → complete`                       |
| **治理工具**        | Anti-Slacking Rule、Non-Degradable Items、Failure Paths、Test Strategy 分级                                                       | 2-Action Rule、3-Strike Error Protocol、5-Question Reboot Test |
| **自动化方式**      | Goal Driver 独立进程状态机 + XML 标签协议                                                                                         | IDE hook 自动注入 + session catchup                            |
| **安全模型**        | 无（信任 agent 和文件系统）                                                                                                       | 两层防御：delimiter framing + hash attestation                 |
| **断点续传**        | Goal Driver `detectStartPhase` 脚本检查 repo 状态                                                                                 | `session-catchup.py` 从 IDE session store 恢复对话             |
| **并行任务**        | 多 plan 文件并存于 `docs/plans/`，无隔离                                                                                          | `.planning/<slug>/` 目录隔离 + `PLAN_ID` 环境变量              |
| **适用范围**        | 长期维护的复杂项目                                                                                                                | 任意项目，17+ IDE/平台                                         |
| **理论来源**        | 执行历史中的 7 类错误，逐条提炼为规则                                                                                             | Manus context engineering：文件系统作为外挂记忆                |

## 二、AGE Plan 的独有特征

AGE Plan 的 24 条 Minimum Rules 全部来自实际执行历史中的教训。每一条都是因为 agent 曾经在某个地方自欺欺人地标记了 completed 而加的补丁。

### 2.1 Closure Gates — 独立于 Phase Exit Criteria 的终检层

Closure Gates 是 plan 级的终检清单，和每个 Phase 内的 Exit Criteria 是两个独立的校验层。它的条目不是任务列表，而是防自欺判断：

- "不存在被静默降级到 deferred / follow-up 的 in-scope live defect"
- "独立子 agent closure-audit 已完成并记录证据"
- "所有 in-scope confirmed contract drifts 已收敛"
- `pnpm typecheck && pnpm build && pnpm lint && pnpm test`

PwF 的 `check-complete.sh` 做的是语法检查：统计 `**Status:** complete`（以及 `[complete]` 后备格式）出现次数是否等于 `### Phase` 出现次数。Closure Gates 做的是语义判断——缺陷真的修了吗？契约真的对齐了吗？这是质的差异。

`check-plan-checklist.mjs` 把 Closure Gates 的检查自动化：扫描所有 plan 文件，检查 `completed` 状态的 plan 是否有未勾选的 checklist、是否有 Closure Evidence、Closure Gates 是否全部勾选，区分 hard fail（completed 但有未勾选项）和 warning（非 completed 但有未勾选项）。

### 2.2 独立 Closure Audit — 实现者不能自审

Plan 标记 `completed` 的必要条件是：一个独立的审阅者或独立启动的 fresh sub-agent session 执行 closure audit。实现者自己不能关自己的 plan。

在 Goal Driver 中，closure audit 由一个完全独立的 opencode 进程执行。它的 context 中没有任何执行阶段的信息，必须从 live repo 重新检查每个 Exit Criteria。验证 prompt 明确要求：

> "不只是接口存在，而是行为语义已落地。检查 Anti-Hollow：新增组件在运行时被调用（不只是 import 存在），无空方法体/静默跳过。"

如果验证结果是 `incomplete`，Goal Driver 提取 `<REMAINING>` XML 块中的具体未完成项，注入到下一轮执行的 prompt 中——执行 agent 拿到的是精确的"还需做什么"清单。

PwF 完全没有此概念。Stop hook 只检查 phase status 计数。

### 2.3 Anti-Slacking Rule — 禁止模糊词替代状态裁定

每个 in-scope 项在 plan 关闭前必须落到且只落到 4 种确定状态之一：`landed`、`adjudicated as residual-risk-only`、`moved to explicit successor ownership`、`removed from scope through a recorded scope change`。

明确禁止用 `optional`、`if time permits`、`consider`、`maybe`、`nice to have` 替代状态裁定。

对应地，`## Deferred But Adjudicated` 中的每个延期项必须带三个字段：`Classification`（只能是 `watch-only residual | optimization candidate | out-of-scope improvement`）、`Why Not Blocking Closure`（明确理由）、`Successor Required`（yes/no）。没有理由的 deferred 项按未完成处理。

PwF 的状态只有 `pending → in_progress → complete`，没有"延迟但已裁定"的中间态，也没有分类学约束。

### 2.4 Non-Degradable Items — 不可降级硬约束

5 类事项不能放进 deferred / non-blocking：lint 规则、live defect、public-contract drift、owner-doc drift、必要的 focused verification。

每个 execution item 必须标记为 `Fix | Decision | Proof | Follow-up` 之一，已确认的 live defect 只能是 `Fix`，不能降级为 `Follow-up`。

### 2.5 Test Strategy 分级

每个 plan 必须声明测试投入的风险匹配策略：

| 档位       | 适用场景                          | 要求                                |
| ---------- | --------------------------------- | ----------------------------------- |
| 必须自动化 | Auth、对外 API 契约、核心回归路径 | 写失败测试先行，Proof 项在 Fix 之前 |
| 建议有测   | 一般功能                          | 同 PR 内添加测试                    |
| 不适用     | 纯文档、无行为变更                | 说明理由                            |

PwF 没有测试策略要求。

### 2.6 Failure Paths — 结构化的异常路径规格

AGE Plan 模板提供 `## Failure Paths` 表格（涉及错误处理、API 契约、鉴权、外部集成的计划建议填写）：

| 触发 | 行为（含状态码） | 可重试 | 用户可见表现 |
| ---- | ---------------- | ------ | ------------ |

这迫使计划作者在写 happy path 的同时考虑 unhappy path。PwF 的错误处理限于 3-Strike Error Protocol（重试升级）和 Errors Encountered 表（事后记录），没有事前的异常路径规格。

### 2.7 Current Baseline + 文档裁定嵌入 Phase

写计划前必须先核对 live repo 当前状态，逐条列"已经成立的事实"、"已完成但旧文档没同步的事实"、"真正剩余的 gap"。Goal 不是 Baseline——Goal 是你要去哪里，Baseline 是你当前在哪里。

每个 Phase 的 Exit Criteria 都有一条："若该 Phase 改变 live baseline，相关 `docs/architecture/` 已更新；否则明确写 `No owner-doc update required`。" 文档同步是 Phase 内的工作，不是收尾工作。

### 2.8 历史计划保护 + 反过度拆分

Rules 20-24 构成一套"不要优化归档"的原则：

- **Rule 20**：已标记 `completed` 的历史计划默认视为历史记录，不因规范演进、模板变化、或代码演化而主动回写。
- **Rules 21-24**：不要因为 finding 太多或文件快到 30 KB 就拆 plan。多条 finding 落在同一组件、同一模块、同一 owner-doc 的，优先合并成一个 owner plan。只有 closure 语义分叉才触发拆分。

PwF 没有类似的反过度拆分机制。

### 2.9 Goal Driver — AGE 规则的自动化实现

Goal Driver 把 Plan Guide 的文字规则变成可运行的代码：

```
Outer 循环（审计驱动）：
  健康检查 → 深度审计 + 对抗审查 → 有问题？
    ├─ 无 → DONE
    └─ 有 → 拟制计划
        ↓
      Inner 循环（执行驱动）：
        执行计划 → 独立 closure audit（独立进程）
          ├─ complete → break
          └─ incomplete → 提取 REMAINING XML → 继续执行
        ↓
      构建验证 → 回到 Outer（再审计）
```

**独立进程隔离。** 每个 step（deep-audit、adversarial-review、plan、execute、closure-audit）spawn 一个独立 opencode 进程。执行 agent 和审计 agent 天然是不同的进程——物理隔离而非规则约束。

**XML 标签协议。** 每个 step 的 prompt 要求 AI 输出 `<AUDIT_RESULT>clean|issues</AUDIT_RESULT>` 等标签。`extractTag` 函数解析标签驱动状态机。如果 AI 不输出标签，`extractTagOrAsk` 会 spawn 一次额外的 AI 调用，让 AI 推断自己漏掉的标签——这是自愈的解析层。

**智能起点判断。** `detectStartPhase` 用纯脚本逻辑（`check-plan-status.mjs` + 目录存在性检查）判断起点：有未完成计划 → execute；有审计目录 → plan；都没有 → audit。不调用 LLM。

**Watchdog。** 当子进程日志超过可配置的 stall 阈值无更新时，spawn 一个独立 watchdog agent，让它自行诊断进程状态、读日志尾部、决定是否 kill 卡住的进程。主 driver 不做 kill 决定。

## 三、PwF 的独有特征

PwF 的核心关切只有一个：**防止 agent 在长任务中丢失上下文。** 它的所有机制都围绕这个目标设计。

### 3.1 三文件分离 + 安全隔离

`task_plan.md`（路线图）+ `findings.md`（知识库）+ `progress.md`（会话日志）。三个文件有明确的职责和更新频率：

| 文件           | 性质                 | 读写频率                           |
| -------------- | -------------------- | ---------------------------------- |
| `task_plan.md` | 路线图和决策记录     | 每次 phase 完成                    |
| `findings.md`  | 研究发现和外部内容   | 每 2 次搜索操作                    |
| `progress.md`  | 时间线日志和测试结果 | 持续更新，session catchup 的数据源 |

`findings.md` 的存在不只是一个"笔记本"——它有安全动因。`task_plan.md` 被 hooks 在每次工具调用时自动注入 agent 的 context。如果把外部网页搜索结果写在 `task_plan.md` 里，其中的对抗性指令会被放大到每一次工具调用中。SKILL.md 的 Security Boundary 明确要求：外部内容只能写入 `findings.md`，不能写入 `task_plan.md`。

AGE Plan 只有一个 plan 文件 + 一个日志体系（`docs/logs/`），没有独立的安全隔离层。

### 3.2 Hook 自动注入系统

5 类 hooks 在 IDE 生命周期中自动执行，不需要 agent 自觉遵守规则：

| Hook             | 何时触发                     | 做什么                                                     |
| ---------------- | ---------------------------- | ---------------------------------------------------------- |
| UserPromptSubmit | 每次用户发消息               | 把 plan 内容注入 context                                   |
| PreToolUse       | 每次 Write/Edit/Bash/Read 前 | 重新读取 plan 刷新 attention                               |
| PostToolUse      | 每次 Write/Edit 后           | 提醒更新 progress                                          |
| Stop             | agent 试图停止时             | 检查是否所有 phase complete                                |
| PreCompact       | context 压缩前               | 提醒 flush progress + 打印 Plan-SHA256（如有 attestation） |

AGE Plan 的规则层（Plan Guide）没有自动注入机制，依赖 agent 遵循 AGENTS.md。Goal Driver 通过 XML 标签协议让程序解析输出，但不注入 plan 内容。PwF 走了第三条路——用 hook 在 agent 不知情的情况下自动把 plan 塞进它的 context。

### 3.3 两层安全防御

第一层（默认启用）：delimiter framing。Hook 注入的 plan 内容被包裹在 `===BEGIN PLAN DATA===` / `===END PLAN DATA===` 中，并标记为结构化数据。Agent 被指示不要执行其中的指令性文本。

第二层（opt-in）：SHA-256 attestation。`/plan-attest` 对 `task_plan.md` 计算哈希并存储。所有 hooks 在注入前比对哈希，不匹配则拒绝注入并输出 `[PLAN TAMPERED]`。PreCompact hook 也会打印 Plan-SHA256，确保压缩后的 agent 仍能验证 plan 未被篡改。

AGE Plan 没有等效的安全机制——它信任 agent 和文件系统。

### 3.4 Session Catchup — 自动会话恢复

`session-catchup.py` 在 `/clear` 或 context 重置后自动从 IDE 的 session store 提取上次 planning 文件更新后发生的对话，生成 catchup report。

AGE Plan 通过 `docs/logs/` 手动重建上下文。Goal Driver 通过 `detectStartPhase` 脚本检查 repo 状态决定从哪里继续——它不恢复对话历史，只恢复执行位置。

### 3.5 并行任务隔离

PwF 支持并行多任务：`init-session.sh "task name"` 在 `.planning/YYYY-MM-DD-slug/` 下创建隔离目录，每套三文件各自独立。`set-active-plan.sh` 切换活跃计划，`PLAN_ID` 环境变量让终端固定到特定计划。Hooks 通过 `resolve-plan-dir.sh` 自动定位正确的计划。

AGE Plan 的多个 plan 文件并存于 `docs/plans/`，但没有目录隔离或自动切换机制。

### 3.6 操作级约束

**2-Action Rule**：每 2 次搜索/浏览操作后必须把发现写入 findings.md。针对多模态内容的易失性——图片和浏览器结果在 context 中不会持久保存。

**3-Strike Error Protocol**：Attempt 1 诊断修复 → Attempt 2 换方法（禁止重复相同操作）→ Attempt 3 重新思考 → 3 次失败后升级给用户。

**5-Question Reboot Test**：能回答"我在哪、要去哪、目标是什么、学到了什么、做了什么"就说明 context 完整。

AGE Plan 有 Baseline 和 Exit Criteria 的结构化检查，但没有这种操作频率约束和快速自检。

### 3.7 Turn-Loop 集成

与 Claude Code 的 `/loop` 和 `/goal` 组合：`/plan-loop 10m` 每 10 分钟自动 tick（重读 plan、跑 check-complete、写 progress）；`/plan-goal` 从 plan 派生终止条件。组合实现"无人值守"工作流。

Goal Driver 的双循环是独立进程的状态机，由 Node.js 程序驱动，不依赖 IDE 原语。

### 3.8 17+ IDE/平台支持

一套 plan 格式同时适配 Claude Code、Cursor、Copilot、Gemini CLI、Kiro、Codex、Hermes、CodeBuddy、FactoryAI、Pi Agent、OpenCode、Continue、Mastra、OpenClaw、Antigravity、Kilocode、AdaL CLI 等平台。AGE Plan 只在内部项目使用。

## 四、可组合性

两者可以组合。理论上可以用 PwF 的 hook 系统解决上下文持久化，用 AGE Plan 的治理规范定义计划结构，用 Goal Driver 的双循环引擎自动化执行。

但 plan 格式不完全兼容。AGE Plan 要求 Phase Exit Criteria、Closure Gates、Deferred But Adjudicated 等章节；PwF 的 `check-complete.sh` 只识别 `**Status:** complete` 和 `[complete]`。真正组合需要对 PwF 的检查脚本做适配。

PwF 的 hook 注入和 AGE Plan 的 Closure Gates 也不直接兼容——hook 会在每次工具调用时把 plan 内容塞进 context，但 AGE Plan 的 Closure Gates 要求独立 agent 从 fresh context 审计。如果用 PwF hook 管理 AGE Plan 格式的文件，需要在审计阶段禁用 hook 注入以保持独立性。

## 五、结论

AGE Plan 和 PwF 解决的是 AI 辅助开发中两个不同但互相关联的问题，且两个问题不互相替代。

AGE Plan 回答"plan 说自己完成了，但它真的完成了吗"——用 24 条规则、Closure Gates、独立审计、Anti-Slacking Rule、Non-Degradable Items、Failure Paths、Test Strategy 分级、文档裁定，把"完成"从 checkbox 状态提升为工程判断。Goal Driver 把这些规则工程化为可运行代码：双循环状态机确保收敛，独立进程实现物理隔离的审计，XML 标签协议让程序可以自动判断完成状态。

PwF 回答"agent 在第 50 次工具调用后还记得目标吗"——用三文件分离（含安全隔离层）、hook 自动注入、两层安全防御、session catchup、并行任务隔离、2-Action Rule，把文件系统变成 agent 的外挂持久记忆。

一个 plan 可以完美地防止虚假完成，但如果 agent 忘记了 plan 的内容，治理再严格也无从执行。反过来，一个 plan 可以完美地防止上下文丢失，但如果 agent 把"接口已存在"误判为"行为已完成"，再多的上下文也无济于事。
