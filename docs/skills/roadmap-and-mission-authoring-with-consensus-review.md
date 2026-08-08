# Roadmap 与 Mission 拟制 + 共识审查元提示词

> **项目定制化层（nop-chaos-flux）**：使用本提示前必须先读 `docs/skills/README.md §项目定制化层（nop-chaos-flux）`，将本仓库的验证命令（`pnpm typecheck` / `pnpm build` / `pnpm test` / `pnpm lint` / `pnpm check`）、命名约定（`@nop-chaos/<pkg>` 包名前缀、`flux-` 源码前缀）、保护区域表（`docs/context/ai-autonomy-policy.md`：flux-core/schema-validation/ui 公共导出/renderer 定义/样式契约）、roadmap 先例（`component-audit-roadmap.md` / `component-audit-round2-roadmap.md` 线性、`ai-invariant-loop-roadmap.md` 闭环）、共性插入机制（CX-n，自 CX-13）、编号基线（bug note 最高 113、lessons 最高 05）注入上下文。本提示的通用默认值在本仓库不充分。
>
> **授权（本项目）**：AI 默认 autonomy = `implement`；保护区域按 `ai-autonomy-policy.md`（plan-first/ask-first 分级）；P0/P1 自动修复预授权（mission description 声明）；结构性重构（公共 API/包边界）执行前人工确认。

> **定位**：这是一份**过程元提示词**（method selector），不是对象级审计提示词。它编排「诊断 → 选型 → 拟 roadmap+mission → 共识审查 → 执行」的工作流，落地两份编排工件（roadmap + mission.json），并固化「每次 roadmap/mission 修订必须经独立子 agent 反复审查至共识」的常设纪律。
> **先读（通用，各仓均应有同名文件）**：`AGENTS.md`、`docs/index.md`、`docs/backlog/00-roadmap-authoring-guide.md`、`docs/plans/00-plan-authoring-and-execution-guide.md`、本仓的 autonomy/protected-areas 文档。
> **与既有 skill 的关系**：本图不重复 `audit-remediation-roadmap-authoring-prompt.md`（那是 audit-remediation 一种形态的专用提示）；本图是其上层方法论 + 共识审查纪律 + 循环选型，适用于任意 roadmap 形态。
> **可移植性**：本文件主体为项目无关的通用方法论；项目特定内容集中在顶部「项目定制化层」overlay。移植到他项目见文末「如何移植到其他项目」。

## 用途

当一个领域需要**多 plan、可追踪、可恢复、可持续**的推进时，用它把工作固化成 roadmap + mission。典型触发：

- 已做过多次审计/修复但问题反复（"审了很多次每次还是一堆问题"）
- 需要一个 AI 可按 closed loop 自主推进的执行队列
- 一轮 plan 收不住、需要 phase/cycle 编排

## 何时**不**用

- 单包/单组件窄改动 → 直接 plan + 对象级 skill（`deep-audit-prompts.md` 等审计提示）
- 平面待办表够用 → 项目主 roadmap，无需 backlog roadmap + mission
- 需求仍模糊 → 先走 discussion/grilling / deep-interview

## 流程（顺序执行，禁止跳步）

### 步骤 0 — 诊断优先（若领域"已被多次审/修仍有问题"）

**不要直接再开一轮审计。** 先诊断为什么反复——这是本流程区别于"再来一次"的关键：

- 核查历史：列出历次审计/修复的「已修复」清单，看下一轮是否在**同族兄弟路径**再次击穿（实证而非猜测，带 `文件:行`/bug note 证据）。
- 判定根因类别：
  - **"修实例不修类别"**——修了报到的实例，漏了同类兄弟。
  - **反应式测试非穷举**——per-bug 加测试，无"全方法 × 全不变式"穷举契约。
  - **零可执行门禁**——修复未沉淀为入 CI 的 check/gate，重构/新方法即回归。
  - **组合状态机盲区**——配对审计数学上无法覆盖 N 方法 × M 交错的全叉乘。
- 结论分两类：① 线性补查能解决（缺的是覆盖面）→ 走**线性 roadmap**（步骤 1a）；② 反复复发/防回退失效（缺的是不变式契约）→ 走**持续闭环 roadmap**（步骤 1b）。

### 步骤 1 — 选型：线性 vs 持续闭环

**1a 线性 roadmap**（一轮或多轮顺序 phase，每 phase 一次交付）：

- 适用：覆盖面问题（如某大面从未逐项审过）、P3/残余裁决、bug/lesson 沉淀回补。
- 形态：D0 编排 → D1..DN 执行 → DR 集中修复 → DV 验证 → DG 沉淀。先例见本仓「项目定制化层」列出的线性 roadmap。

**1b 持续闭环 roadmap**（自驱动飞轮，门禁单调棘轮）：

- 适用：反复复发、需要防回退、有状态子系统（engine/事务/undo/会话）。
- 形态：每 Cycle 固定 N 步（盘点→沉淀不变式为门禁→按不变式审计→裁决→修(强制类别清扫)→验证→收口）；Loop Rule 预授权下轮自动派生（新失败类→下轮沉淀）；零新族→稳态暂停，CI 变红/结构变更/周期复探再触发。先例见本仓「项目定制化层」列出的闭环 roadmap。
- 关键机制（缺一不可）：① 不变式=可执行门禁入 CI（非文档）；② 门禁集合单调（只增不减，弱化需人工确认）；③ 表完备性门禁（测试表==公共方法集，新方法不入表即红）；④ 类别清扫强制（只修实例=closure 拒绝）；⑤ Loop Rule 预授权派生（不逐次人工重启）。

### 步骤 2 — 拟 roadmap

按 `docs/backlog/00-roadmap-authoring-guide.md` 结构：Header / Purpose / Work Item Status（唯一动态区）/ 复用 / 基线 / Phase Details / 依赖图 / Cross-Cutting / Rule。

强制纪律（项目无关）：

- **work item 粒度 = 一个 plan 能完成**；超出 → 拆分或经人工确认。
- **基线节必须核对 live code**（不可凭记忆写"X 未修"——违背 = Blocker）；历史复发证据用过去时（"曾漏/历经多轮才捕获"），不得用现在时暗示仍开放。
- **无悬空引用**：声称"A 指向 B"必须双向核对（A 的表里有 B 行、B 的指针指向 A）。范围独立就明说独立，不要伪交叉引用。
- **计数/编号核对 live**：check/gate 数、bug note 最高编号、lesson 最高编号、组件/模块卡数——全部 live `grep`/`ls` 实测，禁用"~约"除非标注为近似。
- **命令/命名/保护区域**：用本仓「项目定制化层」声明的值，不要从他仓带入。

### 步骤 3 — 拟 mission.json

每个 `docs/backlog/*-roadmap.md` 应有专属 mission（本仓惯例：`rg roadmapPath missions/*.json` 一一对应）。字段对齐本仓先例 mission：

- 标准字段：`name`/`model`/`variant`/`roadmapPath`/`plansDir`/`planGuide`/`auditsDir`/`contextDir`/`moduleDir`/`commands`/`prompts`/`commitFormat`（具体字段集以本仓先例为准）。
- `description` 覆盖四项：① 范围（含范围排除声明）；② 授权（保护区域 + P0/P1 自动修复预授权 + 结构性重构人工确认）；③ 共性/Loop 自动派生机制（本仓的 CX-n 或 Loop Rule 等价物）；④ 自动修复机制沿用指针（指向既有 roadmap 的具体节，禁互指悬空）。
- `commitFormat` 必须与 roadmap 的提交纪律逐字符一致。
- `moduleDir`：全仓 roadmap 用 `.`，scoped roadmap 用具体包/模块路径。
- `commands`：用本仓实际验证命令（见「项目定制化层」）。

### 步骤 4 — 共识审查（常设纪律，不可豁免）

> **每次修改 roadmap 或 mission 都必须经独立子 agent 反复审查至共识。** 拟制者不得自审自批。

- **独立 fresh session**：每轮审查由独立子 agent（fresh session，review-only 禁改文件）执行；executor 不得在自己的执行 session 内自审。
- **审查输入**：三件套（roadmap + mission + 相关基准文件：00-guides、先例 roadmap/mission、live code 抽查点）。
- **审查维度**：① 合规（结构/粒度/状态机）；② 内部一致性（表↔Phase Details↔依赖图↔Rule↔mission，零悬空/零矛盾）；③ 事实基础（基线节核对 live code，计数/编号 live 实测）；④ mission 对齐（字段、commitFormat、roadmapPath、description 四项覆盖）；⑤ 门禁/Loop 纪律（closure 独立 session、棘轮、类别清扫可执行）；⑥ 遗漏与风险。
- **输出**：逐维度 PASS/FAIL/MINOR + 问题清单（**Blocker**必修 / **Major**建议 / **Minor**）+ verdict（`approved` = 零 Blocker，或 `revised`）。
- **迭代**：`revised` → executor 修正（附修正证据）→ 新 fresh session 复审（不复用上轮 session，但可传上轮意见 + 修正对照）；直至 `approved`。多轮常见（先例 2–3 轮）。
- **共识达成**：`approved` 后 roadmap/mission 可进入执行；执行期间任何修订（含 Loop Rule 派生的新 Cycle work item 追加）触发新一轮共识审查（除非该派生已在 Rule 中预授权且附触发证据）。

### 步骤 5 — 执行（按 closed loop）

- AI 读 Work Item Status → 取第一个 `todo`（按优先序，不重排）→ 起草 plan（`> Source:` 指向 roadmap 行 + 输入清单）。
- plan 经独立草案审查 → `todo`→`planned` → 执行 → **closure audit 由独立 fresh session** → `planned`→`done` + owner doc/log 同步。
- 持续闭环：收口步骤若发现新族 → 按 Loop Rule（预授权）追加下轮 work item（附触发证据回写本表）→ 该追加本身不触发步骤 4 审查（已预授权），但下轮的 roadmap 主体修订仍需审查。

## 规则

1. **诊断优先**：领域反复出问题时，先诊断根因再选 roadmap 形态；禁止"直接再开一轮审计"。
2. **共识审查不可豁免**：roadmap/mission 的每次修订都走步骤 4；executor 不自审；每轮 fresh session。
3. **基线核对 live**：基线节的事实声明（X 已修/X 未修/计数）必须 live 实测，违背 = Blocker。
4. **无悬空引用**：交叉引用双向核对；范围独立就明说独立。
5. **门禁即契约**：持续闭环的不变式必须是可执行门禁（入 CI），不是文档；门禁集合单调棘轮。
6. **类别清扫强制**：修任一实例必 grep 全类兄弟；只修实例 = closure 拒绝。
7. **项目隔离**：命令/命名/保护区域/先例一律用本仓「项目定制化层」的值，禁止跨仓带入（如 pnpm 命令带进 Maven 项目）。
8. **本提示词自身**：按本流程产出的 roadmap/mission 应在文件头注明"按 `docs/skills/roadmap-and-mission-authoring-with-consensus-review.md` 产出"。

## 反模式（禁止）

- ❌ 不诊断直接再开审计轮（治标不治本，复发保证）
- ❌ executor 自审自批 roadmap/mission（违反共识纪律）
- ❌ 基线节凭记忆写"X 未修"（高频 Blocker）
- ❌ 伪交叉引用（A 声称指向 B 但 B 无对应行）
- ❌ 持续闭环的不变式只写文档不入 CI（门禁不防回退=飞轮不转）
- ❌ 修实例不修类别（正是要治的病）
- ❌ 跨仓带入命令/命名（pnpm 进 Maven 仓、包前缀错配）

## 如何移植到其他项目

本文件主体（步骤 0–5 + 规则 + 反模式）是项目无关的通用方法论。移植到他项目只需：

1. **核对基建**：目标仓是否有 `docs/backlog/00-roadmap-authoring-guide.md`、`docs/plans/00-plan-authoring-and-execution-guide.md`、`missions/`（mission schema）、`docs/skills/`。基建缺失 → 先补（或非正式套用方法论，不享受 closed loop）。
2. **copy 本文件**到目标仓 `docs/skills/`。
3. **替换顶部「项目定制化层」overlay**：填入目标仓的验证命令、命名约定、保护区域表、roadmap 先例、共性插入机制名、编号基线（用 live `ls`/`grep` 实测，勿照抄）。
4. **替换「先读」里的 autonomy 文档路径**为目标仓等价物。
5. **登记**到目标仓 `docs/skills/README.md` 的 By Task 表。

先例：本仓 `audit-remediation-roadmap-authoring-prompt.md` 已在 nop-chaos-flux 与 nop-app-erp 两仓以"同主体 + 各自定制层"形态共存，本文件遵循同一模式。
