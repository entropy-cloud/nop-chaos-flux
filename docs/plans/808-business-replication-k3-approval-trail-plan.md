# 808 M3-K3 审批轨迹页复刻（business-page-replication roadmap M3-K3）

> Plan Status: active
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

Status: planned
Targets: `mock-backend-repl-ai.ts`（扩展）、`page-schemas/ai-approval-trail.json`、`complex-pages-entries.ts`（entry——K2 拆分后 model 仅 shim，评审 MAJ-2 勘误）、`tests/e2e/replication-ai-approval-trail.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [ ] mock 扩展：K3 子集端点**逐名对齐 D3 §4.3 ai 表原五名**（approvalTaskFindPage/approvalTrailFind?taskId=/approvalAct/approvalTransfer/hitlDecision，含错误分支；数据支撑 steps+timeline+待办列表+HITL 卡片——评审 MAJ-1 勘误：approvalList/approvalAction 系臆造名）
- [x] complex-pages-entries.ts 加 ai-approval-trail entry
- [ ] schema JSON（D3 §2.3 组件树：steps 状态轴/timeline 轨迹/user-select 转办+提交链/ai-tool-call HITL 卡片〔toolCall/state/onApproval〕/待办列表 crud/转办审批 dialog；testid `<pageId>-<element>`；strict 零 error）
- [ ] e2e spec 三支柱（D3 §5.3 K3 断言清单：steps 状态轴/timeline 轨迹/转办 user-select+提交计数/HITL 卡片 approve→onApproval→状态化/待办列表渲染/focus 3 条；axe 分支 A）
- [ ] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes）
- [ ] 验证：`npx playwright test tests/e2e/replication-ai-approval-trail.spec.ts --retries=0` 全绿 + axe spec 绿 + W1-W3/C1-C3/K1/K2 回归 + playground typecheck + strict 校验

Exit Criteria:

- [ ] K3 页可达可交互且列表页收录，strict validation 零 error
- [ ] focused e2e `--retries=0` 全绿（断言含 \_\_replAiCalls 计数证据）
- [ ] axe 基线登记绿
- [ ] roadmap §2 K3 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 待独立子 agent 填写
- Verdict: 待审
- Rounds: 0
- Findings addressed: 无

## Closure Gates

- [ ] in-scope 工作全部落地（K3 页 + mock 扩展 + roadmap 回写）
- [ ] 行为/契约结果已达成（D3 §5.3 K3 断言清单全绿，--retries=0）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；设计勘误如有）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`（触达面零新增红口径）
- [ ] `pnpm test`（触达面零新增红口径）
- [ ] `pnpm check`（触达面零新增红口径；scanner-baselines 增量如触发就地注册+note）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: 无已知红（HEAD e5f572a53 后各页收口维持 full-green；798-807 Deferred 各项已被并行会话修复或注册现绿）
- Why Not Blocking: 不适用（现无已知红；收口实跑零新增口径维持）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
