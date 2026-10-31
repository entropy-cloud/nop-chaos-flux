# 810 M3-M2 MES 工序报工页复刻（business-page-replication roadmap M3-M2）

> Plan Status: completed
> Last Reviewed: 2026-10-31
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

Status: completed
Targets: `mock-backend-repl-mes.ts`（扩展）、`page-schemas/mes-work-reporting.json`、`complex-pages-entries.ts`（entry）、`tests/e2e/replication-mes-work-reporting.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock 扩展：M2 子集端点**逐名对齐 D3 §4.4 mes 表**（jobCard findPage 作业卡列表/jobCardMutation 五 mutation 逐名〔startJob/holdJob/resumeJob/submitJob/completeJob + ILLEGAL_TRANSITION 守卫——评审 M-2 勘误：原"七态"无出处锚点，D3 §4.4 表仅五名〕/reportWork〔GUARD_CONSERVATION+GUARD_HOUR_RATIO 守卫——D5 MAJ-7 勘误口径〕，含错误分支；数据 ≥25 行作业卡多状态〔评审 M-3：对齐 D3 §4.4/D1 §2 口径〕）——落地为 delegate 模块 `mock-backend-repl-mes-reporting.ts`（W2→stock 拆分先例），26 行 × 8 态确定性 fixture
- [x] complex-pages-entries.ts 加 mes-work-reporting entry
- [x] schema JSON（D3 §2.5 组件树：input-table 行内报工〔columns aggregate 合计+computed 工时/工时比/合格率+summaryBinding 单对象回写+onRowChange〕/状态动作按钮 visible 表达式 start/hold/resume/submit/complete/dialog 确认/refreshNearest 或 component:refresh 回写；testid `<pageId>-<element>`；strict 零 error）——守恒前端半边以行级守恒表达式守卫承担（行字段 validate 为 B3.2 V6 同族 live 缺口，D3 §2.5 M2 实现勘误 1 就地落档）；执行中曾试加 input-number `validate` prop 注册，属行字段 validate 路线残留且触发 lint 覆盖红，已回退（产品面零改动）
- [x] e2e spec 三支柱（D3 §5.5 M2 断言清单：行内编辑→computed 派生即时更新/合计行 aggregate 数值/**summaryBinding 回写主单 totalCompletedQty〔plan-785 验收核心〕**/守恒校验拦截〔超计划 toast〕/**GUARD_HOUR_RATIO 超限断言**/**守恒拦截前端半边——item 区字段 validate 提交计数 0 语义**〔live 以表达式守卫 disabled 承担，提交动作不可达→计数 0〕/**ILLEGAL_TRANSITION 非法迁移断言**〔同拍双击真实 UI 管线触达〕/**hourRatio>1 标红 class 断言**/状态动作按钮 visible 按工单状态显隐/报工 dialog 焦点往返/focus 3 条；axe 分支 A）——12 测试
- [x] axe ROUTES + JSON 登记（分支 A；首跑实测回填 aria-required-attr=8 +\_notes）
- [x] 验证：`npx playwright test tests/e2e/replication-mes-work-reporting.spec.ts --retries=0` 全绿 + axe spec 绿 + 前序回归 + playground typecheck + strict 校验——focused 12/12 + axe 20/20 + M1 回归 8/8 + strict 57/57 + playground unit 554/554 + form 包 1160 通过

Exit Criteria:

- [x] M2 页可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（断言含 \_\_replMesCalls 计数证据）
- [x] axe 基线登记绿
- [x] roadmap §2 M2 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（评审会话，2026-10-30；证据 commit e5f9829c4 / be5661e12 / bd4bdf01c）
- Verdict: pass-with-minors（零 Blocker/Major，7 Minor 当场修订）
- Rounds: 2（首轮脚本中断漏落后补齐）
- Findings addressed: MAJ-7 文档号 D6→D5 勘误；七态→五 mutation 逐名〔D3 §4.4 表仅五名，M-2〕；数据量 ≥25 对齐〔M-3〕；Baseline 归属 R2 映射行标注〔M-4〕；e2e 枚举补五项断言〔summaryBinding 回写主单/GUARD_HOUR_RATIO/守恒前端 validate/ILLEGAL_TRANSITION/hourRatio 标红，M-5〕；Deferred Classification 词表〔M-6〕；确认→报工 dialog 措辞对齐〔M-7〕

## Closure Gates

- [x] in-scope 工作全部落地（M2 页 + mock 扩展 + roadmap 回写）
- [x] 行为/契约结果已达成（D3 §5.5 M2 断言清单全绿，--retries=0）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级的 in-scope 缺口
- [x] 受影响 owner docs 已同步（daily log；D3 §2.5 M2 实现勘误 8 条就地落档）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`（触达面零新增红口径）
- [x] `pnpm test`（触达面零新增红口径；flux-renderers-layout contract-honesty ELOOP 系 807 Deferred HEAD 既有环境红，零交集）
- [x] `pnpm check`（触达面零新增红口径；exit 0）

## Deferred But Adjudicated

### （继承）check/lint 链状态

- Classification: `watch-only residual`（layout contract-honesty 加载失败——807 Deferred HEAD 既有红环境级 ELOOP，与本计划触达面零交集）
- Why Not Blocking: 不适用（现无已知红；收口实跑零新增口径维持）
- Successor Required: `no`
- Successor Path: 不适用（并行会话后续 WIP 引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: M2 页全链收口（2026-10-31）——mock 扩展（delegate 模块 26 卡 × 8 态 + 五 mutation + 双守卫）、schema（input-table 报工 + summaryBinding 单对象回写 + 表达式守卫前端半边 + 五状态按钮 visible）、entry、focused e2e 12/12（--retries=0）、axe 分支 A 登记（20/20）、M1 回归 8/8、strict 57/57、playground unit 554/554、typecheck/build/lint/check 全仓绿（test 触达面零新增红：layout ELOOP 系在案既有红）。守恒前端半边机制改判等 8 条实现勘误就地落 D3 §2.5。closure audit 独立 fresh sub-agent 一轮 approved（零 Blocker/Major，3 Minor：幻影端点名注释当场修正、roadmap 同 commit 回写〔本提交〕、strict 计数措辞 informational）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（general-purpose，2026-10-31，不复用执行者上下文）
- Evidence: audit 报告 Verdict: approved——独立实跑 focused e2e 12/12、axe 20/20、M1 回归 8/8、strict 57/57、playground unit 554/554、playground typecheck、pnpm check exit 0；逐文件核对 schema/e2e 断言真实性（summaryBinding 回写/GUARD_HOUR_RATIO/ILLEGAL_TRANSITION/hourRatio 标红/守恒前端半边提交计数 0/focus ①②③）、mock 26 卡阶梯 8 态全占、B3.2 V6/B7 出处核实、回退的 input.tsx 改动确认不在 diff、git status 触达面 9 文件零 packages/ 改动

Follow-up:

- 全量 test:e2e 归 P1 阶段（Non-Blocking Follow-ups 既有项）
- input-table 行字段 validate 行级路径绑定缺口 → roadmap B7 successor（既有登记，非本计划新增）
- totalScrappedQty 主单回写面与数组语义扩展归 composite-schemas 契约 owner（D3 §2.5 M2 实现勘误 7 裁决；后续页面需要时再立约）
