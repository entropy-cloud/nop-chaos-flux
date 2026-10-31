# 810 M3-M2 MES 工序报工页复刻（business-page-replication roadmap M3-M2）

> Plan Status: active
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-M2（依赖 M2 done；前置 M1 done——mes mock 模块已建）
> Related: D1 总体设计；D3 §2.5/§4.4/§5.5（M2 页设计）；R2 §1 M2；R4 §1 M2（无缺口——全要素现成 type，plan 785 直接受益页）

## Purpose

落地 M3-M2「MES 工序报工页」：input-table 作业卡列表行内报工（合格/报废/工时）+ 行级 computed（工时/工时比/合格率）+ 合计行 aggregate/summaryBinding + 数量守恒校验 + 状态动作按钮，mes mock 模块扩展 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 M2 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication.ts 六件套、showcase-env `/r/ReplMes__` 分支已接（M1 交付）、mock-backend-repl-mes.ts 单端点 dashboardKpi+相位推进、input-table aggregate/computed/summaryBinding（plan 785 落地）、strict 校验机制。
- D3 §2.5 M2 设计（D5 核对过+**D5 深审 MAJ-7 勘误**〔评审 M-1 文档号勘误：原错标 D6〕：summaryBinding 单对象/validateValueAction 已删/端点守卫 GUARD_CONSERVATION+GUARD_HOUR_RATIO）：input-table 行内报工 + computed 列 + aggregate 合计 + 状态动作按钮 visible 表达式 + 报工 dialog + refreshNearest/refreshSource 回写（确认 dialog 与 refresh 回写系 R2 §2 M2 renderer 映射行出处——评审 M-4 归属标注）。
- mock 端点：M2 子集逐名对齐 D3 §4.4 mes 表（jobCard findPage/ticketMutation 式 jobCardMutation 七态/reportWork 守恒守卫等——实现时以表原名逐一核对，防臆造名——七次教训）。

## Goals

- mock 扩展（M2 子集端点+GUARD 守卫）+ `page-schemas/mes-work-reporting.json` + entry + e2e `tests/e2e/replication-mes-work-reporting.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言按 D3 §5.5 M2 清单（行内报工编辑+computed 派生/合计行+summaryBinding 回写主单/守恒校验拦截+GUARD_HOUR_RATIO/状态动作按钮 visible/报工 dialog 焦点往返+守恒前端 validate 半边/ILLEGAL_TRANSITION 断言/hourRatio>1 标红/focus 3 条）。

## Non-Goals

- 不实现 M3 页；不落地质检联动（M2.4 候选补充页）；不做批次/序列写边（D3 §2.2 M2.2 未纳入设计枚举）。

## Scope

### In Scope

- M2 页 schema + mock 扩展 + entry + e2e + axe 登记；roadmap §2 M2 回写。

### Out Of Scope

- 其余 9 页；质检联动；I1 交付物重构。

## Failure Paths

| 编号            | 触发                            | 行为                                                                         | 可重试 | 用户可见表现   |
| --------------- | ------------------------------- | ---------------------------------------------------------------------------- | ------ | -------------- |
| e2e-fail        | focused e2e 失败                | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D3 | 是     | e2e 全绿       |
| summary-binding | summaryBinding 回写与 live 不符 | 以 composite-schemas.ts 实况为准（单对象 field/column/agg）调整/勘误 D3      | 是     | 合计行正常回写 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - M2 页全链实现

Status: planned
Targets: `mock-backend-repl-mes.ts`（扩展）、`page-schemas/mes-work-reporting.json`、`complex-pages-entries.ts`（entry）、`tests/e2e/replication-mes-work-reporting.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [ ] mock 扩展：M2 子集端点**逐名对齐 D3 §4.4 mes 表**（jobCard findPage 作业卡列表/jobCardMutation 五 mutation 逐名〔startJob/holdJob/resumeJob/submitJob/completeJob + ILLEGAL_TRANSITION 守卫——评审 M-2 勘误：原"七态"无出处锚点，D3 §4.4 表仅五名〕/reportWork〔GUARD_CONSERVATION+GUARD_HOUR_RATIO 守卫——D5 MAJ-7 勘误口径〕，含错误分支；数据 ≥25 行作业卡多状态〔评审 M-3：对齐 D3 §4.4/D1 §2 口径〕）
- [ ] complex-pages-entries.ts 加 mes-work-reporting entry
- [ ] schema JSON（D3 §2.5 组件树：input-table 行内报工〔columns aggregate 合计+computed 工时/工时比/合格率+summaryBinding 单对象回写+onRowChange〕/状态动作按钮 visible 表达式 start/hold/resume/submit/complete/dialog 确认/refreshNearest 或 component:refresh 回写；testid `<pageId>-<element>`；strict 零 error）
- [ ] e2e spec 三支柱（D3 §5.5 M2 断言清单：行内编辑→computed 派生即时更新/合计行 aggregate 数值/**summaryBinding 回写主单 totalCompletedQty〔plan-785 验收核心〕**/守恒校验拦截〔超计划 toast〕/**GUARD_HOUR_RATIO 超限断言**/**守恒拦截前端半边——item 区字段 validate 提交计数 0 语义**/**ILLEGAL_TRANSITION 非法迁移断言**/**hourRatio>1 标红 class 断言**/状态动作按钮 visible 按工单状态显隐/报工 dialog 焦点往返/focus 3 条；axe 分支 A）
- [ ] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes）
- [ ] 验证：`npx playwright test tests/e2e/replication-mes-work-reporting.spec.ts --retries=0` 全绿 + axe spec 绿 + 前序回归 + playground typecheck + strict 校验

Exit Criteria:

- [ ] M2 页可达可交互且列表页收录，strict validation 零 error
- [ ] focused e2e `--retries=0` 全绿（断言含 \_\_replMesCalls 计数证据）
- [ ] axe 基线登记绿
- [ ] roadmap §2 M2 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 待独立子 agent 填写
- Verdict: 待审
- Rounds: 0
- Findings addressed: 无

## Closure Gates

- [ ] in-scope 工作全部落地（M2 页 + mock 扩展 + roadmap 回写）
- [ ] 行为/契约结果已达成（D3 §5.5 M2 断言清单全绿，--retries=0）
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

- Classification: `watch-only residual`（layout contract-honesty 加载失败——807 Deferred HEAD 既有红环境级 ELOOP，与本计划触达面零交集）
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
