# 504 Missing Components L2.0 — org 数据源协议（design doc only）

> Plan Status: completed
> Last Reviewed: 2026-09-25
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §5（L2.0 行）、§1 交付铁律；`docs/analysis/visual-quality/2026-09-24-missing-component-gap-analysis.md` §4 P1 / §8 Wave N1
> Related: `docs/plans/503-missing-components-l1-p0-form-atoms-plan.md`（L1 命名 pass 先行，已完成）

## Purpose

收口 roadmap L2.0：产出 `docs/architecture/org-data-source-protocol.md` —— user-select / department-select / region 三个 org 族 renderer 共用的**数据面契约**（标准化节点形状 + 检索/懒加载/回显解析/分页/多租户参数语义），使 L2.1/L2.2 的实现消费同一协议零分叉（QA.3 复核项）。本计划为纯文档计划（roadmap §5 明示 "design doc only，无代码"）。

## Current Baseline

2026-09-25 live repo 核对：

- **roadmap 状态**：`docs/backlog/missing-components-and-designer-roadmap.md` §13 L2.0–L2.6 为 `proposed`；L1 已 `done`（plan 503，命名 pass 产出 `input-*` 族决议被本线复用）。§12 依赖规则明示「L2.0（纯文档）可与 L1 并行启动」——现 L1 已收口，L2.0 无阻塞。
- **既有数据加载面**（协议必须复用而非另起炉灶）：
  - `helpers.dispatch(ActionSchema, { scope, signal })`（`RendererHelpers.dispatch`，`packages/flux-core/src/types/renderer-core.ts:80-83`）：ActionSchema 派发 + 临时子 scope 注入变量 + AbortSignal；`select` 远程搜索已用此通道（`packages/flux-renderers-form/src/renderers/use-select-remote-search.ts`：`searchSource` + scope 变量 `searchQuery` + 300ms debounce + echo-only 缓存 `remoteEchoCache`）。
  - `env.loadDict(name, signal)`（`renderer-env.md` §3.6）：静态字典加载，无分页/懒加载语义。
  - `SourceSchema` / `ActionDataSourceSchema`（`packages/flux-core/src/types/schema.ts:305`）：`data-source` 组件的数据源词汇（`initFetch`/`onSuccess`/`onError`/`sendOn`）。
- **env 扩充裁定依据**：`docs/architecture/renderer-env.md` §4 INV-2 阶梯——org 数据可通过「现有 env 能力组合」（A 档：ActionSchema 派发即 fetcher 的高层封装）解决，不满足 C 档「不能被 importLoader 优雅覆盖」条件（`renderer-env.md` §4.1 原文）。故本协议是 **schema 层约定 + 消费端共享 normalizer**，**不扩 `RendererEnv` 接口**。
- **缺口**：仓库内无任何 org 数据契约；若不先立约，L2.1（user-select/department-select）与 L2.2（region）将各自发明请求/响应形状，QA.3「零分叉」验收无从谈起。
- **文档登记面**：`docs/architecture/README.md` 与 `docs/index.md` 为 architecture 文档导航登记点（renderer-env.md §7 有「与其他 owner doc 的关系」表需增行）。

## Goals

- `docs/architecture/org-data-source-protocol.md` 落盘：最终态契约文档（Minimum Rule 14：只写目标设计，不写演进叙事），包含：标准化 `OrgNode` 形状、三类数据操作（children 懒加载 / search 检索 / resolve 回显解析）、请求 scope 变量与响应 envelope、分页与空页终止语义、`extraParams` 多租户/上下文注入、错误与降级路径、与既有 select 数据通道的一致性规则。
- 协议经**独立 review 共识**（roadmap L2.0 验收原文「协议文档过独立 review 共识」）——fresh 子 agent 零 Blocker/Major。
- 登记与回写：`docs/index.md` 路由表、`docs/architecture/renderer-env.md` §7 关系表、`docs/architecture/README.md`（如该文档列目录）、roadmap §13 L2.0 回写、dev log。

## Non-Goals

- 不写任何 renderer/组件代码（normalizer helper 属 L2.1 交付）。
- 不做 L2.1–L2.6 各 work item 的实现与命名 pass（`user-select`/`department-select`/`region` 在本文档中按 roadmap 暂定名引用，最终定名以各实现计划命名 pass 为准——协议对 type 名不敏感）。
- 不扩 `RendererEnv` 接口（INV-2 A 档裁定，理由落协议文档）。
- 不裁决 `cascader`（L2.6 独立 work item）。
- 不实现 playground mock org 后端（属 L2.1 示例交付）。

## Scope

### In Scope

- 新增 `docs/architecture/org-data-source-protocol.md`（协议本体，目标 ≤ 40KB）。
- `docs/index.md`：按任务路由表增一行（org 数据契约 → 协议文档）。
- `docs/architecture/renderer-env.md` §7「与其他 owner doc 的关系」表增一行。
- `docs/architecture/README.md`：如该文件维护文档清单则增行（执行时核对）。
- `docs/backlog/missing-components-and-designer-roadmap.md` §13 L2.0 状态回写。
- `docs/logs/2026/09-25.md` dev log 记录。

### Out Of Scope

- 全部代码变更与测试。
- L2.1–L2.6 实现计划（各自拟制）。
- `docs/components/` 下任何 design.md（属实现计划交付）。

## Failure Paths

不适用（纯文档计划，无运行时行为）。协议文档自身的「错误与降级」章节即是对 L2.1/L2.2 实现 Failure Paths 的契约输入，在该章节内表达。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用**——纯文档计划（roadmap §10 末预声明 L2.0 按纯文档变体执行），无行为变更。验证面为：独立 review 共识 + 文档登记一致性 + QA.3 消费复核（L2 完成时）。

## Execution Plan

### Phase 1 - 协议文档起草

Status: completed
Targets: `docs/architecture/org-data-source-protocol.md`

- Item Types: `Decision`

- [x] 协议文档落盘，覆盖以下契约节：①定位与适用面（org 族 renderer 数据面唯一契约）；②INV-2 A 档裁定（为何不扩 env）；③`OrgNode` 规范形状（id/name/type/disabled/disabledTip/leaf/children/extra，宽容解析规则）；④三类操作契约（children / search / resolve）的请求 scope 变量与响应 envelope（`{ nodes, total?, hasMore? }`，顶层裸数组宽容接受）；⑤分页语义与空页终止规则；⑥`extraParams` 表达式求值与多租户注入；⑦错误与降级（source 缺失 → 静态 options 回退、action 失败 → notify 错误通道、abort 语义）；⑧与 select `searchSource`/`loadDict` 通道的一致性与边界；⑨消费方清单（L2.1/L2.2）与零分叉验收口径
- [x] 文中所有引用的类型/函数/文件路径经 live repo 核对（`helpers.dispatch` 签名、`ChoiceOption` 形状、`remoteEchoCache` 先例、`ActionSchema` 字段）

Exit Criteria:

- [x] `docs/architecture/org-data-source-protocol.md` 存在且为最终态行文（无 "Proposed vs Current" 对照、无演进叙事），≤ 40KB
- [x] 文档内代码块中的接口形状与 live repo 类型逐字可对照（`ActionSchema`/`ActionResult.data`/`ChoiceOption`）

### Phase 2 - 独立 review 共识

Status: completed
Targets: `docs/plans/504-missing-components-l2-0-org-data-source-protocol-plan.md`（Protocol Review Record）

- Item Types: `Proof`

- [x] fresh 子 agent（不复用起草上下文）按「可想象性分析（L2.1/L2.2 能否照此实现无歧义）/ 格式完整性 / 内容稳健性 / 引用准确性」四项评审协议文档与本 plan；发现 Blocker/Major 则修订并复审，直至零 Blocker/Major 达成共识
- [x] 共识证据落本 plan `## Protocol Review Record`（协议文档评审轮次；plan 自身的 draft review 证据在上节 Draft Review Record）

Exit Criteria:

- [x] Protocol Review Record 填写完整（Reviewer/Verdict/Rounds/Findings addressed），最终 Verdict 为 `pass` 或 `pass-with-minors`（共识口径：零 Blocker / 零 Major）
- [x] Plan Status 升 `active`（plan 自身 draft review 通过后即升；协议评审在执行中继续）

### Phase 3 - 登记与状态回写

Status: completed
Targets: `docs/index.md`、`docs/architecture/renderer-env.md`、`docs/architecture/README.md`、roadmap §13、dev log

- Item Types: `Follow-up`（登记性），`Proof`（回写核对）

- [x] `docs/index.md` 按任务路由表增行（org 数据契约/design org 族 renderer → 协议文档）
- [x] `docs/architecture/renderer-env.md` §7 关系表增行（org 数据面 → 协议文档；注明 INV-2 A 档不扩 env）
- [x] `docs/architecture/README.md` 增行（若其维护文档清单；否则记录不适用理由）
- [x] roadmap §13 L2.0 行回写 `done`（replace 落盘后 grep 复核命中，plan 503 closure round 1 教训）
- [x] dev log 记录本计划收口

Exit Criteria:

- [x] 三处登记 diff 可见且锚点正确；`grep -n "org-data-source-protocol" docs/index.md docs/architecture/renderer-env.md` 各 ≥1 命中（实测 index/renderer-env/README 各 1、roadmap 2）
- [x] roadmap §13 L2.0 行显示 `done` 且备注指向本 plan；dev log 有本条目

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh 子 agent（agent_9ca39225-ecad-43e0-bf88-9d0abb5a1896，独立 session）
- Verdict: `pass`（零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed: 4 Minor 已修入文本——①`renderer-core.ts:291` stale 行号改为 `:80-83`（按符号定位）；②Test Strategy 引用「roadmap §7 末」改为「§10 末」；③C 档引文恢复 `renderer-env.md` §4.1 原文「不能被 importLoader 优雅覆盖」（去掉混入的 `/fetcher`）；④Phase 2 Targets 补全文件名。

## Protocol Review Record

> Phase 2 的协议文档独立评审证据（区别于上节 plan draft review）。

### Round 1（agent_c1dff339-c650-4b80-bcbe-1c55fb7e0b02，fresh 独立评审）

- Verdict: `fail`（3 Major / 7 Minor / 1 Nit）
- Major：F1 children 分页变量矛盾（§4.1 表 vs §5）；F2 静态 options × sourceSearch 叠加/替换未裁决（select 先例有 `searchMergeMode`）；F3 漏裁 input-tree `childrenSource` 既有懒加载通道
- 处理：F1 → 分页变量移为 children/search 共用行 + §5 首条钉死；F2 → §7 新增 `searchMergeMode`（默认 `append` 对齐先例）；F3 → §8 边界表新增「不复用不混用 tree childrenSource」裁决行；Minor F4–F9 一并修复（零新增 id 终止护栏、根加载时机与空页缓存、extraParams scope 指代、resolve 对位/缓存/短路、selectableTypes 混合树规则、nodes 非数组空结果、i18n 键名固定）；F11 措辞修正

### Round 2（agent_c1dff339-c650-4b80-bcbe-1c55fb7e0b02，同链 fresh 复核）

- Verdict: `pass`（零 Blocker / 零 Major；余 1 Minor N1 + 1 Nit N2，不阻塞共识）
- Findings addressed: Round 1 三条 Major 全部确认闭合（F1/F2/F3 逐条带行号证据）；F4–F9、F11 全部确认闭合。新发现 N1（options×children 混合语义两种读法）与 N2（「弹层首次打开」预设弹窗形态）已顺手修入协议 §7 / §5（超出共识义务的收敛，修订后终态 16,546 字节 ≤ 40KB）；N3（plan 簿记不一致）以本轮 Phase 2 checkbox 勾选消除。四维复核无回归。

## Closure Gates

> 纯文档计划：按 plan guide 模板注记，`pnpm test`/`lint`/`typecheck`/`build` 四项删除（无代码变更）。全仓验证由下一个代码计划（L2.1）的 Closure Gates 承接。

- [x] 协议文档已落盘且为最终态行文，契约节覆盖 Phase 1 清单九项
- [x] 独立 review 共识达成（零 Blocker/Major）且证据在案
- [x] 三处登记 + roadmap 回写 + dev log 完成，锚点 grep 复核通过
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- QA.3（集成审计 #2）将在 L2 全线完成时复核「协议被 L2.1/L2.2 消费零分叉」——本计划不预支该结论，登记为绑定 QA.3 的验收项而非本 plan 遗留债。

## Closure

Status Note: 协议文档落盘并通过两轮独立 review 共识（r1 3M fail → 修复 → r2 approved），三处登记 + roadmap §13 回写 + dev log 全部落盘且 grep 复核命中。closure audit round 1 `issues`（2M/3m）修复后 round 2 `approved`（0B/0M）。plan 可关闭。

Closure Audit Evidence:

- Auditor / Agent: fresh 子 agent（agent_73ad4ad2-3924-4898-8fc1-f532568a22de，独立 session）
- Evidence: round 1 审计报告 `issues`（M1 Closure Gates 簿记、M2 协议 §8 executeTreeSource 机制归属纠错、m1-m3 簿记）→ 全部修复 → round 2 复核 `approved`（M2 与 tree-control-sources.ts:26-32 注释逐点吻合、m1/m2 闭合、M1 勾选确认、m3 随本落盘序列消解）；dev log `docs/logs/2026/09-25.md` L2.0 条目同步记录。

Follow-up:

- no remaining plan-owned work（「被 L2.1/L2.2 消费零分叉」为 roadmap 绑定 QA.3 的验收项，登记于 Non-Blocking Follow-ups，非本 plan 遗留债）
