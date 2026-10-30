# 807 M3-K2 工单处理台页复刻（business-page-replication roadmap M3-K2）

> Plan Status: active
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-K2（依赖 M2 done；前置 K1 done——ai mock 模块与 ReplAi 分支已接）
> Related: D1 总体设计；D3 §2.2/§4.3/§5.2（K2 页设计）；R2 §1 K2；R4 §1 K2（G9/G11/G12）

## Purpose

落地 M3-K2「工单处理台页」：kanban 六态队列（onCardMove 路由 mutation）+ SLA 静态剩余时长文本（G9 临时形态）+ stat-tile KPI + timeline 操作日志 + AI 推荐回复采用链路（G12）+ 确认 dialog，mock 扩展 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 K2 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication.ts 六件套、showcase-env `/r/ReplAi__` 分支已接（K1 交付）、mock-backend-repl-ai.ts 七端点+钩子全四键（四类 fixture 在 mock-backend-repl-ai-connector.ts——评审 m1 拆分注；K2 的 ai-suggestions 走 suggestionFind 端点不经 connector）、**tool-round-hitl/forceStreamError/failNextMutation 三通道已实现未入 e2e**（K1 遗留——K2 复用面）、桌面纯 JSON 页先例、kanban 先例（W2/C1）。
- D3 §2.2 K2 设计（D5/D6 核对过）：kanban 六态（onCardMove 按目标列路由 assign/start/resolve/close/reopen mutation——上游活页活证）+ SLA 静态文本（G9）+ timeline 操作日志 + ai-suggestions 推荐回复采用→textarea 写回（G12 action 编排）+ stat-tile+sparkline + 确认 dialog。
- mock 端点：K2 子集逐名对齐 D3 §4.3 ai 表（ticketMutation 六态路由/aiSuggestion 等——实现时以表原名逐一核对）。
- G9（桌面 countdown 缺）：静态剩余时长文本过验收；G11：置信度门 alert/status 组合。

## Goals

- mock 扩展（K2 子集）+ `page-schemas/ai-ticket-console.json` + entry + e2e `tests/e2e/replication-ai-ticket-console.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言**忠实转写 D3 §5.2 K2 清单**：拖卡路由 mutation 计数+payload 逐字段+卡片迁移+columnAggregate 计数更新/timeline ≥1 含操作人+actionType/steps 当前值=status 映射/G12 写回+ticketReply 计数/ILLEGAL_TRANSITION→toast 含关键词/G11 confidence-gate alert 可见/G9 SLA 文本与 mock deadline 差值一致（容忍<60s）。**本计划补充断言（显式标注非 §5.2 原文）**：确认 dialog 焦点往返（依据 R2 K2 映射弹窗=dialog/drawer）。focus 3 条按 drawer 入/出+query-filter 载体裁定后转写。

## Non-Goals

- 不实现 K3 审批轨迹页；不落地 G9 桌面 countdown type（静态文本临时形态）；不做 hitl 工具轮 e2e（§5.2 未列，K1 已实现通道 K3 复用）。

## Scope

### In Scope

- K2 页 schema + mock 扩展 + entry + e2e + axe 登记；roadmap §2 K2 回写。

### Out Of Scope

- 其余 12 页；G9 缺口落地；K1 交付物重构。

## Failure Paths

| 编号         | 触发                                      | 行为                                                                         | 可重试 | 用户可见表现 |
| ------------ | ----------------------------------------- | ---------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail     | focused e2e 失败                          | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D3 | 是     | e2e 全绿     |
| kanban-route | onCardMove 路由 mutation 形态与 live 不符 | 以 kanban types + W2/C1 先例为准调整/勘误 D3                                 | 是     | 拖卡路由正常 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - K2 页全链实现

Status: planned
Targets: `mock-backend-repl-ai.ts`（扩展）、`page-schemas/ai-ticket-console.json`、`complex-pages-model.ts`（entry）、`tests/e2e/replication-ai-ticket-console.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [ ] mock 扩展：K2 子集端点**逐名对齐 D3 §4.3 ai 表原五名**（ticketFindPage/ticketActionFind?ticketId=/ticketMutation〔六态路由 assign/start/resolve/close/reopen/escalate〕/ticketReply/suggestionFind?ticketId=，含 ILLEGAL_TRANSITION 错误分支；钩子 lastTicketMutationBody 增补——评审 MAJ-1 勘误：aiSuggestion/操作日志/SLA 数据系描述词非端点名，四真名补入）
- [ ] complex-pages-model.ts 加 ai-ticket-console entry
- [ ] schema JSON（D3 §2.2 组件树：kanban 六态 onCardMove 路由/**过滤载体预裁决 form+valuesPath〔W2 勘误 5，live page-schemas 零 query-filter 使用——评审 m2，focus 断言载体同步裁定〕**/stat-tile+sparkline〔溯源 R2 K2 映射〕/steps 状态轴/timeline 操作日志/columnAggregate 计数/ai-suggestions 推荐采用→写回 action 编排〔G12〕/SLA 静态文本〔G9〕/置信度门 alert〔G11，溯源 R4 §2〕/确认 dialog〔plan 侧补充设计，依据 R2 K2 映射弹窗〕；testid `<pageId>-<element>`；strict 零 error）
- [ ] e2e spec 三支柱（D3 §5.2 K2 断言清单：拖卡路由 mutation 计数+逐字段/SLA 文本可见/AI 推荐采用→写回/timeline 渲染/确认 dialog 焦点往返；axe 分支 A；focus 3 条）
- [ ] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes）
- [ ] 验证：`npx playwright test tests/e2e/replication-ai-ticket-console.spec.ts --retries=0` 全绿 + axe spec 绿 + W1-W3/C1-C3/K1 回归 + playground typecheck + strict 校验

Exit Criteria:

- [ ] K2 页可达可交互且列表页收录，strict validation 零 error
- [ ] focused e2e `--retries=0` 全绿（断言含 \_\_replAiCalls 计数证据）
- [ ] axe 基线登记绿
- [ ] roadmap §2 K2 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：3 Major + 4 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - MAJ-1：端点枚举改 D3 §4.3 原五名（aiSuggestion 删除；ticketFindPage/ticketActionFind/ticketReply/suggestionFind 补入）
  - MAJ-2：断言忠实转写 §5.2（steps/columnAggregate/ILLEGAL_TRANSITION/G11/G9 差值口径补入；"确认 dialog"标注 plan 侧补充设计）
  - MAJ-3：Deferred 改写"check:duplicates-baseline 整仓红持续"诚实继承
  - m1：四类 fixture 归属 connector 文件拆分注+K2 复用面澄清
  - m2：过滤载体预裁决 form+valuesPath+focus 同步
  - m3：roadmap planned 翻转落点（本 commit 已执行）
  - m4（核对通过记录）：R4 §1 K2 引用成立

## Closure Gates

- [ ] in-scope 工作全部落地（K2 页 + mock 扩展 + roadmap 回写）
- [ ] 行为/契约结果已达成（D3 §5.2 K2 断言清单全绿，--retries=0）
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

### check:duplicates-baseline 整仓红（继承，评审 MAJ-3 实跑证伪原"无已知红"声称）

- Classification: `watch-only residual`（869 clones/17.05% vs 基线 597/8% 持续红——806 Deferred + 10-30/10-31 log 已归因 packages/ 管理域；K2 触达面 apps/playground+tests/docs 不在扫描面）
- Why Not Blocking: 与本计划触达面零交集；触达面自身验证全绿
- Successor Required: `yes`
- Successor Path: 由并行会话自行收口；F2 统一登记

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
