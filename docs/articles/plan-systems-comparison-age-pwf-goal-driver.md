# 完成语义 vs 上下文保留：AGE Plan 与 Planning-with-Files 的设计分歧

Planning-with-Files是一个流行的claude code插件，它为claude code补充了一个更强大的计划系统。本文将从两个层面比较它和AGE(Attractor Guided Engineering)体系的Plan概念的不同之处。

**规范层（Plan 体系）**

- **AGE Plan** — Attractor-Guided Engineering 的计划治理体系，定义在 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 24 条 Minimum Rules。纯文字规范，不依赖特定工具链。
- **Planning-with-Files (PwF)** — [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files)，通用 AI agent 技能插件，源自 Manus 的 context engineering 理念。三文件结构 + 状态模型 + hooks。

**自动化层（执行引擎）**

- **AGE Goal Driver** — `attractor-guided-engineering-template/tools/goal-driver/` 中的独立进程状态机，把 AGE Plan 的文字规则工程化为可运行代码。AGE Goal Driver 是 AGE Plan 的一种可选执行机制。

**AGE Plan 管完成是否真实，PwF 管上下文是否还在。** 一个防止 plan 虚假完成，一个防止 agent 丢失目标。这个分歧决定了后续所有机制差异。

## 一、设计取向

### 规范层：AGE Plan vs PwF

| 维度                | AGE Plan                                                                                                                          | PwF                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **核心关切**        | 完成是否真实                                                                                                                      | 上下文是否还在                                                 |
| **对 agent 的态度** | 不信任完成判断，需要独立审计复核                                                                                                  | 不担心完成判断，担心遗忘                                       |
| **信任边界**        | 信任 agent 不恶意改文件，不信任 agent 不自欺                                                                                      | 不信任 plan 文件不被篡改，用 SHA-256 锁定                      |
| **完成判断**        | Closure Gates + Exit Criteria + 独立 closure audit                                                                                | `check-complete.sh` 统计 phase status 计数                     |
| **Plan 状态**       | 9 种：`proposed \| planned \| in progress \| partially completed \| completed \| superseded \| replaced \| deferred \| cancelled` | 3 种：`pending → in_progress → complete`                       |
| **治理工具**        | Anti-Slacking Rule、Non-Degradable Items、Failure Paths、Test Strategy 分级                                                       | 2-Action Rule、3-Strike Error Protocol、5-Question Reboot Test |
| **安全模型**        | 无（信任 agent 和文件系统）                                                                                                       | 两层防御：delimiter framing + hash attestation                 |
| **并行任务**        | 多 plan 文件并存于 `docs/plans/`，无隔离                                                                                          | `.planning/<slug>/` 目录隔离 + `PLAN_ID` 环境变量              |
| **适用范围**        | 长期维护的复杂项目                                                                                                                | 任意项目，17+ IDE/平台                                         |

### 自动化层：AGE Goal Driver vs PwF hooks/loop

| 维度           | AGE Goal Driver                                        | PwF                                                |
| -------------- | ------------------------------------------------------ | -------------------------------------------------- |
| **自动化方式** | 独立进程状态机 + XML 标签协议                          | IDE hook 自动注入 + session catchup                |
| **断点续传**   | `detectStartPhase` 脚本检查 repo 状态                  | `session-catchup.py` 从 IDE session store 恢复对话 |
| **计划校验**   | `check-plan-checklist.mjs` 扫描 Closure Gates 勾选状态 | `check-complete.sh` 统计 phase status 计数         |
| **循环结构**   | 双循环状态机（Outer 审计驱动 + Inner 执行驱动）        | `/plan-loop` tick 驱动 + Stop hook 检查            |
| **运行时依赖** | Node.js 独立进程，不依赖 IDE 原语                      | 依赖 IDE hook 系统（5 类 hooks）                   |

## 二、AGE Plan 的独有特征（规范层）

AGE Plan 的 24 条 Minimum Rules 全部来自执行历史中的 7 类错误。每一条都是因为 agent 曾在某个地方自欺欺人地标记了 completed 而加的补丁。本节只描述 AGE Plan 规范层的要求——这些规则不依赖 AGE Goal Driver，手动遵守同样有效。AGE Goal Driver 的自动化实现留到第四节。

### 2.1 Closure Gates — 独立于 Phase Exit Criteria 的终检层

Closure Gates 是 plan 级的终检清单，和每个 Phase 内的 Exit Criteria 是两个独立的校验层。它的条目不是任务列表，而是防自欺判断：

- "不存在被静默降级到 deferred / follow-up 的 in-scope live defect"
- "独立子 agent closure-audit 已完成并记录证据"
- "所有 in-scope confirmed contract drifts 已收敛"
- `pnpm typecheck && pnpm build && pnpm lint && pnpm test`

PwF 的 `check-complete.sh` 做语法检查：统计 `**Status:** complete`（以及 `[complete]` 后备格式）出现次数是否等于 `### Phase` 出现次数。PwF 选择不做语义审计是刻意的设计——它的目标是跨 17+ 平台通用，语义审计需要理解项目特定的完成标准，难以模板化。但代价是：它无法区分"phase 状态写了 complete"和"缺陷真的修了、契约真的对齐了"。Closure Gates 做的是后者。

> **AGE Goal Driver 自动化**：`check-plan-checklist.mjs` 把 Closure Gates 的检查自动化——扫描所有 plan 文件，检查 `completed` 状态的 plan 是否有未勾选的 checklist、是否有 Closure Evidence、Closure Gates 是否全部勾选，区分 hard fail（completed 但有未勾选项）和 warning（非 completed 但有未勾选项）。

### 2.2 独立 Closure Audit — 实现者不能自审

Plan 标记 `completed` 的必要条件：一个独立的审阅者或独立启动的 fresh sub-agent session 执行 closure audit。实现者自己不能关闭自己的 plan。

验证时要求不只是检查接口存在，而是行为语义已落地：新增组件在运行时被调用（不只是 import 存在），无空方法体/静默跳过。

PwF 的 Stop hook 只检查 phase status 计数，不区分"谁做的审计"。

### 2.3 Anti-Slacking Rule — 禁止模糊词替代状态裁定

每个 in-scope 项在 plan 关闭前必须落到且只落到 4 种确定状态之一：`landed`、`adjudicated as residual-risk-only`、`moved to explicit successor ownership`、`removed from scope through a recorded scope change`。

禁止用 `optional`、`if time permits`、`consider`、`maybe`、`nice to have` 替代状态裁定。

`## Deferred But Adjudicated` 中的每个延期项必须带三个字段：`Classification`（只能是 `watch-only residual | optimization candidate | out-of-scope improvement`）、`Why Not Blocking Closure`（明确理由）、`Successor Required`（yes/no）。没有理由的 deferred 项按未完成处理。

PwF 的状态只有 `pending → in_progress → complete`，没有"延迟但已裁定"的中间态。

### 2.4 Non-Degradable Items + Test Strategy + Failure Paths

这三条规则共同构成了 AGE Plan 的"不可降级"边界：

**Non-Degradable Items。** 5 类事项不能放进 deferred / non-blocking：lint 规则、live defect、public-contract drift、owner-doc drift、必要的 focused verification。每个 execution item 必须标记为 `Fix | Decision | Proof | Follow-up` 之一，已确认的 live defect 只能是 `Fix`，不能降级为 `Follow-up`。

**Test Strategy 分级。** 每个 plan 必须声明测试投入的风险匹配策略：Auth 和对外 API 契约必须自动化（Proof 项在 Fix 之前）；一般功能建议有测；纯文档无行为变更可声明不适用并说明理由。

**Failure Paths。** 模板提供 `## Failure Paths` 表格——涉及错误处理、API 契约、鉴权或外部集成的计划建议填写此表，每行包含触发条件、预期行为（含状态码）、是否可重试、用户可见表现。这迫使计划作者在写 happy path 的同时考虑 unhappy path。

PwF 的错误处理限于 3-Strike Error Protocol（重试升级）和 Errors Encountered 表（事后记录），没有事前的异常路径规格。

### 2.5 Current Baseline + 文档裁定嵌入 Phase

写计划前必须先核对 live repo 当前状态，逐条列"已经成立的事实"、"已完成但旧文档没同步的事实"、"真正剩余的 gap"。Goal 不是 Baseline——Goal 是你要去哪里，Baseline 是你当前在哪里。

每个 Phase 的 Exit Criteria 都有一条："若该 Phase 改变 live baseline，相关 `docs/architecture/` 已更新；否则明确写 `No owner-doc update required`。" 文档同步是 Phase 内的工作，不是收尾工作。

> **AGE Goal Driver 自动化**：`detectStartPhase` 在启动时自动判断从哪里继续——跑 `check-plan-status.mjs` 检查未完成计划，检查审计目录是否存在，有未完成计划就跳到执行，有审计目录就跳到规划，都没有就从审计开始。纯脚本逻辑，不调用 LLM。

### 2.6 历史计划保护 + 反过度拆分

- **Rule 20（历史保护）**：已标记 `completed` 的历史计划默认视为历史记录，不因规范演进、模板变化、或代码演化而主动回写。
- **Rules 21-24（反过度拆分）**：不要因为 finding 太多或文件快到 30 KB 就拆 plan。多条 finding 落在同一组件、同一模块、同一 owner-doc 的，优先合并成一个 owner plan。只有 closure 语义分叉才触发拆分。

## 三、PwF 的独有特征（规范层 + 自动化层）

PwF 的核心关切只有一个：**防止 agent 在长任务中丢失上下文。**

### 3.1 三文件分离 + 安全隔离

`task_plan.md`（路线图）+ `findings.md`（知识库）+ `progress.md`（会话日志）。三个文件有明确的职责和更新频率：

| 文件           | 性质                 | 读写频率                           |
| -------------- | -------------------- | ---------------------------------- |
| `task_plan.md` | 路线图和决策记录     | 每次 phase 完成                    |
| `findings.md`  | 研究发现和外部内容   | 每 2 次搜索操作                    |
| `progress.md`  | 时间线日志和测试结果 | 持续更新，session catchup 的数据源 |

`findings.md` 的存在不只是一个笔记本——它背后的设计有安全考量。`task_plan.md` 被 hooks 在每次工具调用时自动注入 agent 的 context。如果把外部网页搜索结果写在 `task_plan.md` 里，其中的对抗性指令会被放大到每一次工具调用中。SKILL.md 的 Security Boundary 明确要求：外部内容只能写入 `findings.md`，不能写入 `task_plan.md`。

AGE Plan 不在 plan 体系中管理研究发现和外部内容——执行过程中产生的这些材料由 agent 根据实际情况自行选择存放位置，不在 plan 文件内。

### 3.2 Hook 自动注入系统

5 类 hooks 在 IDE 生命周期中自动执行，不需要 agent 自觉遵守规则：

| Hook             | 何时触发                               | 做什么                                                     |
| ---------------- | -------------------------------------- | ---------------------------------------------------------- |
| UserPromptSubmit | 每次用户发消息                         | 把 plan 内容注入 context                                   |
| PreToolUse       | 每次 Write/Edit/Bash/Read/Glob/Grep 前 | 重新读取 plan 刷新 attention                               |
| PostToolUse      | 每次 Write/Edit 后                     | 提醒更新 progress                                          |
| Stop             | agent 试图停止时                       | 检查是否所有 phase complete                                |
| PreCompact       | context 压缩前                         | 提醒 flush progress + 打印 Plan-SHA256（如有 attestation） |

AGE Plan 的规则层没有自动注入机制，依赖 agent 遵循 AGENTS.md。AGE Goal Driver 也不注入 plan 内容，而是通过 XML 标签协议让程序解析输出。PwF 是第三种路：用 hook 在 agent 不知情的情况下自动把 plan 塞进 context。

### 3.3 两层安全防御

第一层（默认启用）：delimiter framing。Hook 注入的 plan 内容被包裹在 `===BEGIN PLAN DATA===` / `===END PLAN DATA===` 中，标记为结构化数据，agent 被指示不要执行其中的指令性文本。

第二层（opt-in）：SHA-256 attestation。`/plan-attest` 对 `task_plan.md` 计算哈希并存储。所有 hooks 在注入前比对哈希，不匹配则拒绝注入并输出 `[PLAN TAMPERED]`。PreCompact hook 也会打印 Plan-SHA256，确保压缩后的 agent 仍能验证 plan 未被篡改。

AGE Plan 没有等效的安全机制，因为它信任 agent 和文件系统。

### 3.4 Session Catchup — 自动会话恢复

`session-catchup.py` 在 `/clear` 或 context 重置后自动从 IDE 的 session store 提取上次 planning 文件更新后发生的对话，生成 catchup report。

AGE Plan 通过 `docs/logs/` 手动重建上下文，没有自动会话恢复机制。AGE Goal Driver 的 `detectStartPhase` 通过检查 repo 状态决定从哪里继续——不恢复对话历史，只恢复执行位置。

### 3.5 并行任务隔离

PwF 支持并行多任务：`init-session.sh "task name"` 在 `.planning/YYYY-MM-DD-slug/` 下创建隔离目录，每套三文件各自独立。`set-active-plan.sh` 切换活跃计划，`PLAN_ID` 环境变量让终端固定到特定计划。Hooks 通过 `resolve-plan-dir.sh` 自动定位正确的计划。

AGE Plan 的多个 plan 文件并存于 `docs/plans/`，没有目录隔离或自动切换机制。

### 3.6 操作级约束

**2-Action Rule**：每 2 次搜索/浏览操作后必须把发现写入 findings.md。针对多模态内容的易失性——图片和浏览器结果在 context 中不会持久保存。

**3-Strike Error Protocol**：Attempt 1 诊断修复 → Attempt 2 换方法（禁止重复相同操作）→ Attempt 3 重新思考 → 3 次失败后升级给用户。

**5-Question Reboot Test**：能回答"我在哪、要去哪、目标是什么、学到了什么、做了什么"就说明 context 完整。

AGE Plan 有 Baseline 和 Exit Criteria 的结构化检查，但没有操作频率约束和快速自检。

### 3.7 Turn-Loop 集成

与 Claude Code 的 `/loop` 和 `/goal` 组合：`/plan-loop 10m` 每 10 分钟自动 tick（重读 plan、跑 check-complete、写 progress）；`/plan-goal` 从 plan 派生终止条件。这是 PwF 自动化层的循环机制。AGE Goal Driver 的双循环状态机是另一种自动化方案，第四节详述。

### 3.8 17+ IDE/平台支持

一套 plan 格式同时适配 Claude Code、Cursor、Copilot、Gemini CLI、Kiro、Codex、Hermes、CodeBuddy、FactoryAI、Pi Agent、OpenCode、Continue、Mastra、OpenClaw、Antigravity、Kilocode、AdaL CLI 等平台。AGE Plan 只在内部项目使用。

## 四、两者的关系（规范层）

AGE Plan 和 PwF 不是组合关系，而是两种独立的 plan 体系，各自回答不同的问题。

AGE Plan 的 plan 体系只管计划本身的结构、执行、审计和关闭。执行过程中产生的研究发现和外部内容不属于 plan 体系——agent 根据实际情况自行选择临时目录存放，按需组织文件链接。AGE Plan 不规定这些材料的存放位置，也不把它们纳入 plan 文件。

PwF 的三文件结构（task_plan + findings + progress）是一个整体设计，findings.md 的安全隔离动因直接服务于 hook 注入机制——把外部内容隔离在注入面之外。这套设计不能拆开取其一部分嫁接到 AGE Plan 上。

两者真正的交集在于：如果 AGE Plan 未来与某种 agent 运行时深度集成，可以仿照 PwF 的 hook 机制，在执行时机上做强化——比如在关键工具调用前自动重读 plan、在 phase 完成后自动提醒更新日志。但这不是"组合 PwF"，而是借鉴 hook 这个机制思路，为 AGE Plan 的治理规则提供自动执行保障。

## 五、自动化层对比：AGE Goal Driver vs PwF hooks/loop

AGE Goal Driver 不是 AGE Plan 本身，而是 AGE Plan 的一种可选自动化实现。它与 PwF 的 hooks/loop 处于同一层级——都是把 plan 规范变成可运行机制。

### 5.1 AGE Goal Driver 的双循环状态机

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

Outer 循环确保即使当前 plan 的 checkbox 全勾了，仍必须通过独立审计确认没有引入新问题。Inner 循环确保执行后必须通过独立验证，执行者不能自己宣称完成。

每个 step 的 prompt 要求 AI 输出 `<AUDIT_RESULT>clean|issues</AUDIT_RESULT>` 等 XML 标签，`extractTag` 函数解析标签驱动状态机。AI 不输出标签时，`extractTagOrAsk` 会 spawn 一次额外的 AI 调用推断漏掉的标签——这是自愈的解析层。整个状态机不依赖人读 markdown 做判断，而是程序解析标签自动流转。

### 5.2 进程隔离

每个 step 都 spawn 一个独立 opencode 进程——deep-audit、adversarial-review、plan、execute、closure-audit 各自隔离。执行 agent 和审计 agent 本身就是不同进程，物理隔离而非规则约束。

closure audit 由完全独立的 opencode 进程执行，context 中没有任何执行阶段的信息，必须从 live repo 重新检查每个 Exit Criteria。如果验证结果是 `incomplete`，提取 `<REMAINING>` XML 块中的具体未完成项，注入到下一轮执行的 prompt 中。

当子进程日志超过可配置的 stall 阈值无更新时，spawn 一个独立 watchdog agent，让它自行诊断进程状态、读日志尾部、决定是否 kill 卡住的进程。主 driver 不做 kill 决定。

### 5.3 与 PwF 自动化层的对比

| 维度         | AGE Goal Driver                        | PwF hooks/loop                         |
| ------------ | -------------------------------------- | -------------------------------------- |
| **运行方式** | Node.js 独立进程，不依赖 IDE 原语      | 依赖 IDE hook 系统（5 类 hooks）       |
| **循环模型** | 双循环（Outer 审计 + Inner 执行）      | 单层 tick 驱动（`/plan-loop`）         |
| **进程隔离** | 每个 step 独立进程，审计与执行物理隔离 | 单进程内 hook 调用，无进程隔离         |
| **输出协议** | XML 标签（`extractTag` 程序解析）      | 无结构化输出协议，靠 markdown 状态标记 |
| **断点续传** | `detectStartPhase` 检查 repo 状态      | `session-catchup.py` 恢复对话历史      |
| **平台依赖** | 需要 Node.js 运行时                    | 17+ IDE/平台即插即用                   |

## 六、哪个方向更持久

PwF 解决的核心问题是 agent context 不够用。2-Action Rule、session catchup、hook 自动注入，都是因为模型记不住、看不完。这个问题随 context window 扩大和模型长上下文能力增强会逐步消退。PwF 的大部分机制会沉淀为 agent 运行时的基础设施能力，不需要用户显式安装一个 skill 来解决。PwF 的安全模型（delimiter framing、attestation、findings 隔离）倒是独立于模型能力的——不管模型多强，注入攻击的向量永远存在。但这是安全工程，不是 plan 体系。

AGE Plan 解决的问题不随模型变强而消失。"缺陷真的修了吗"不是记忆力问题，是完成语义的判断问题。"这个 live defect 被偷偷降级为 follow-up 了"不是 agent 忘了，是 agent 在自欺。这些是复杂工程的结构性困难——scope 管理、契约对齐、文档与代码的一致性。模型越强，改动越快、越多，这类问题反而越容易出：一个强 agent 能在 50 次工具调用内完成一个复杂重构，同时在第 37 次调用中悄悄把一个 contract drift 藏进 follow-up。24 条 Minimum Rules 管的不是 agent 的能力边界，是工程判断的诚实性。

真正的演进方向是 AGE Goal Driver 代表的路径——把治理规则从"希望 agent 遵守"变成"系统强制执行"。Plan Guide 定义语义，AGE Goal Driver 保证语义落地。如果进一步与 agent 运行时深度集成，在关键工具调用前自动重读 plan、在 phase 完成后自动触发 exit criteria 检查，就是一个完整方案：规则语义来自 AGE Plan，执行强制来自 AGE Goal Driver，触发时机来自 hook 机制。三层都围绕 AGE Plan 的治理语义运转。
