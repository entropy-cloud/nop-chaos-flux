# 808 M3-K3 审批轨迹页复刻（business-page-replication roadmap M3-K3）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-K3（依赖 M2 done；前置 K1/K2 done——ai mock 模块与 ReplAi 分支已接）
> Related: D1 总体设计；D3 §2.3/§4.3/§5.3（K3 页设计）；R2 §1 K3；R4 §1 K3（G13/G18）

## Purpose

落地 M3-K3「审批轨迹页」：steps 审批状态轴 + timeline 审批轨迹 + user-select 转办 + ai-tool-call HITL 审批卡 + 待办列表，mock 扩展 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 K3 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication.ts 六件套、showcase-env `/r/ReplAi__` 分支已接、mock-backend-repl-ai.ts + k2 delegate、K1 三通道已实现未入 e2e；K3 页无 ai-chat 面，connector 流通道不在 K3 scope——**toolCall 形状/两轮范式复用**（评审 MIN-1 口径收窄），hitlToolCall 独立卡绑定 mock 任务数据、D3 §2.1 勘误 5 条（K1 同族教训）。
- D3 §2.3 K3 设计（D5 核对过）：steps 审批状态轴 + timeline 审批轨迹 + user-select 转办 + ai-tool-call HITL 审批卡（onApproval 事件、engine 不自改状态）+ 待办列表 + 转办/审批 dialog。
- mock 端点：K3 子集逐名对齐 D3 §4.3 ai 表（approvalList/approvalAction/转办等——实现时以表原名逐一核对，防臆造名）。
- G13（转办/改派专用动作——user-select+ajax 组合可覆盖）；G18（审批流 wf 图形可视化——timeline/steps 覆盖，无需 flow-designer）。

## Goals

- mock 扩展（K3 子集）+ `page-schemas/ai-approval-trail.json` + entry + e2e `tests/e2e/replication-ai-approval-trail.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言按 D3 §5.3 K3 清单（steps 状态轴/timeline 轨迹/转办 user-select/HITL 审批卡 onApproval/待办列表/focus 3 条）。

## Non-Goals

- 不实现 M1-M3 页；不落地 G13 专用 renderer（user-select+ajax 组合口径已定）；不做 wf 图形可视化（G18 timeline/steps 覆盖）。

## Scope

### In Scope

- K3 页 schema + mock 扩展 + entry + e2e + axe 登记；roadmap §2 K3 回写。

### Out Of Scope

- 其余 11 页；G13 缺口落地；K1/K2 交付物重构。

## Failure Paths

| 编号          | 触发                                     | 行为                                                                         | 可重试 | 用户可见表现  |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------------------- | ------ | ------------- |
| e2e-fail      | focused e2e 失败                         | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D3 | 是     | e2e 全绿      |
| hitl-snapshot | ai-tool-call state.approval 与 mock 不符 | 以 ai-tool-call.tsx 实况为准调整 mock/勘误 D3                                | 是     | HITL 卡片正常 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - K3 页全链实现

Status: completed（执行会话 2026-10-30；focused e2e 9/9、axe 18/18、六 spec 回归 65/65 均 `--retries=0`，playground typecheck 绿、unit 552/552 含 strict 校验 55/55，check 触达面 oversized 236 warnings/3 errors/3 exempt 与 HEAD 同值零新增、scanner-baselines within baseline，触达文件 eslint 零红——见 `docs/logs/2026/10-30.md` M3-K3 节；roadmap 回写与 closure audit 归收口会话）
Targets: `mock-backend-repl-ai.ts`（扩展）、`page-schemas/ai-approval-trail.json`、`complex-pages-entries.ts`（entry——K2 拆分后 model 仅 shim，评审 MAJ-2 勘误）、`tests/e2e/replication-ai-approval-trail.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock 扩展：K3 子集端点**逐名对齐 D3 §4.3 ai 表原五名**（approvalTaskFindPage/approvalTrailFind?taskId=/approvalAct/approvalTransfer/hitlDecision，含错误分支；数据支撑 steps+timeline+待办列表+HITL 卡片——评审 MAJ-1 勘误：approvalList/approvalAction 系臆造名）。落地：delegate 模块 `mock-backend-repl-ai-k3.ts`（404 行 <500 warn；12 任务四值 fixture/TRAJECTORY 投影 TimelineItemSchema/approveSteps 权威映射/APPROVAL_CONFLICT+REJECT_COMMENT_REQUIRED+TRANSFER_PAYLOAD_INVALID+HITL_ALREADY_DECIDED 守卫/三镜像钩子）+ 主模块接线（414 行）
- [x] complex-pages-entries.ts 加 ai-approval-trail entry（451 行 <500；entry↔registry 断言过）
- [x] schema JSON（D3 §2.3 组件树：crud 待办列表/steps 状态轴/timeline 轨迹〔reject 节点 level=error〕/user-select 转办+提交链/ai-tool-call HITL 卡片〔toolCall/state/onApproval——engine 不自改状态，宿主 action 链 owns the workflow：ajax hitlDecision+setValue 写回卡状态〕/审批 approve+驳回意见必填 dialog+转办 dialog；testid `<pageId>-<element>`；strict 零 error——55/55）。live 裁定（C2 勘误同族）：crud 行 scope `isolate: true` 使 drawer 内 action 不可达页面级源——crud 改 loadAction+refreshNearest（approval-tasks 先例），数据源 data-source 保留为 caption 计数面；HITL 卡状态翻转经 setValue 写回 drawer scope（engine 只读）
- [x] e2e spec 三支柱（D3 §5.3 K3 断言清单：steps 状态轴当前值断言〔四值 wait/process/finish/error 各一次〕/timeline 轨迹渲染〔reject 节点 data-level=error+点位语义色〕/转办 user-select+提交计数逐字段/HITL 卡 approve→hitlDecision→data-approval 转 decided/待办列表渲染/focus 3 条〔pending 焦点圈 Tab 循环/转办 dialog 焦点往返+面板入出/首控件可达+行 Enter 键盘平价〕）。落地 9 测试 `--retries=0` 9/9
- [x] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes——aria-required-attr 6〔table column-resize separator 族，standard-crud/wave-picking 同族〕+ color-contrast 8〔shell header feature badges，crm-customer-360 同值同族〕）
- [x] 验证：`npx playwright test tests/e2e/replication-ai-approval-trail.spec.ts --retries=0` 全绿 + axe spec 绿 + K1/K2/W2/C2/W3/C3 六代表回归 + playground typecheck + strict 校验（9/9、18/18、65/65、typecheck 绿、unit 552/552 含 strict 55/55；check 触达面 oversized 236/3/3 与 HEAD 同值零新增、scanner-baselines within baseline；触达文件 eslint 零红）

Exit Criteria:

- [x] K3 页可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（断言含 \_\_replAiCalls 计数证据）
- [x] axe 基线登记绿
- [x] roadmap §2 K3 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：2 Major + 2 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - MAJ-1：端点枚举改 D3 §4.3 原五名（approvalList/approvalAction 系臆造名勘误）
  - MAJ-2：entry 落点改 complex-pages-entries.ts（K2 拆分后 model 仅 shim）
  - MIN-1：connector 流通道收窄口径（K3 无 ai-chat 面，toolCall 形状/两轮范式复用）
  - MIN-2：roadmap planned 回写项补入

## Closure Gates

- [x] in-scope 工作全部落地（K3 页 + mock 扩展 + roadmap 回写随收口 commit）
- [x] 行为/契约结果已达成（D3 §5.3 K3 断言清单全绿：--retries=0 9/9）
- [x] 必要 focused verification 已完成（K3 9/9 + axe 18/18 + K1/K2/W2/C2/W3/C3 回归 65/65 + strict 55/55）
- [x] 不存在被静默降级的 in-scope 缺口（test/layout 红归因 807 Deferred 既有，见 Deferred）
- [x] 受影响 owner docs 已同步（daily log；D3 §2.3 实现勘误 4 条就地落档；K1 HITL 三通道裁决兑现核验落在 plan Current Baseline + D3 §6.5 边界说明——closure audit Minor-3 措辞校准）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`（触达面零新增红口径）
- [x] `pnpm test`（触达面零新增红；flux-renderers-layout contract-honesty 加载失败——同 807 Deferred 归因 HEAD 既有红，零交集）
- [x] `pnpm check`（exit 0 全绿——ui-consistency I2 豁免已落 + 其余子项过；scanner-baselines 零增量）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: 无已知红（HEAD e5f572a53 后各页收口维持 full-green；798-807 Deferred 各项已被并行会话修复或注册现绿）
- Why Not Blocking: 不适用（现无已知红；收口实跑零新增口径维持）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: K3 全链落地（delegate 五端点+crud 待办+steps 状态轴〔mock 数据投影 REJECTED error〕+timeline reject level=error 配色+user-select 转办+ai-tool-call HITL 卡 onApproval→hitlDecision+setValue 写回+审批/转办 dialog）。closure audit **approved** 零 Blocker/Major（3 Minor 簿记项随收口处理）。审计员独立实跑 K3 9/9、K1/K2 回归 20/20、axe 18/18、strict 55/55、oversized 3e/3exempt 零新增。G13 组合覆盖/G18 timeline-steps 覆盖口径落实。K3 可关，M3 累计 11/21 页。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: verdict `approved`（零 Blocker/Major，3 Minor）——审计员独立实跑 K3 9/9（retries=0）+ K1/K2 回归 20/20 + axe 18/18 + strict 55/55；抽 3 条实质断言（steps 四值 data-status 逐 key+timeline reject error 双层标记+HITL onApproval 逐字段）均有 live renderer 标记锚点非空转；layout ELOOP 红归因实证（packages/ 零改动）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- 全量 test:e2e 归 P1 阶段
