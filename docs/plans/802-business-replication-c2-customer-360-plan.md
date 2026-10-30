# 802 M3-C2 CRM 客户 360 详情页复刻（business-page-replication roadmap M3-C2）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-C2（依赖 M2 done；前置 C1 done——crm mock 模块已建）
> Related: D1 总体设计；D2 §2.5/§4.2/§5（C2 页设计）；R1 §2 C2（上游无直接章节，佐证登记页）
> 重建注：首轮评审 fail（1 Blocker + 4 Major + 3 Minor）后按修法 (a) 全量重写——新增跟进 mutation 链（activityCreate）与 timeline seek 纳入 scope，形状契约按 live 前置声明。

## Purpose

落地 M3-C2「CRM 客户 360 详情页」：头部 detail-view+picker 客户切换 + 四 tab 分区（跟进 timeline/关联线索 table 主从联动/联系人 cards/活动日历回归验证）+ filterForm 联动 + 新增跟进 drawer（activityCreate mutation 链），crm mock 模块扩展 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 C2 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪（W1-C1 交付）：replication.ts 六件套（assertDialogFocusRoundTrip drawer 焦点往返）、replication.css、showcase-env `/r/ReplCrm__` 分支已接（createReplCrmFetcherBranches）、business-replication 分类、桌面纯 JSON 页先例（W2/W3/C1）。
- D2 §2.5 C2 设计（D5 属性层核对过；**形状层缺口本计划前置声明**，见 Execution 勘误预登记）：头部 hstack detail-view+picker；四 tab = 跟进 timeline/关联线索 table 主从联动/联系人 cards/活动日历（scheduling——上游降级项回归验证）。
- **live 形状契约（评审 M2 前置声明）**：CalendarEvent 必填 `id/title/start/end`（calendar.types.ts L72-81，无 date 字段）；TimelineItemSchema `time/detail/level`（level 驱动 marker 着色，layout/schemas.ts L326-339）；data-source 绑定数组属性须解包（`${activityCalendar.events}`/`${activityTimeline.items}`，非包装对象直绑）；detail-view 契约=content+data（composite-schemas.ts L280-292，D5 MAJ-12 勘误）——**C2 为复刻面首个 detail-view 消费页，无同面先例，按 D5 MAJ-12 契约实现**。
- mock：`mock-backend-repl-crm.ts` 已有 C1 五端点——本页扩展 C2 六端点（逐名对齐 D2 §4.2：partnerFindPage/partnerGet/leadByPartner/activityTimeline/activityCalendar/activityCreate）。
- D2 §3.3 三项义务已由 C1 承接；C2 无新增指名义务。

## Goals

- `page-schemas/crm-customer-360.json` + mock 扩展（C2 六端点）+ entry + e2e `tests/e2e/replication-crm-customer-360.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言**逐条如实对齐 D2 §5 C2 清单**：① partner 行点击→leadByPartner 计数+1+关联列表行数/首行值变化；② 切日历 tab 渲染；③ 新增跟进 drawer 提交→activityCreate 计数+1→timeline 行数+1 且置顶；④ timeline seek→高亮切换。另 filterForm→refreshSource（来源 R1 §2 C2 要素③，非 §5 条目——如实标注）+ focus 三项（首控件可达/drawer 焦点入首控件/seek 后 activeElement 保持文档内）。

## Non-Goals

- 不实现 C3 驾驶舱页；不改 W1-C1 交付物（除 mock 模块扩展）。

## Scope

### In Scope

- C2 页 schema（含 drawer mutation 链）+ mock 扩展（六端点）+ entry + e2e + axe 登记；roadmap §2 C2 回写（评审通过置 `planned`，closure 置 `done`）。

### Out Of Scope

- 其余 17 页；C1 交付物重构；上游仓库。

## Failure Paths

| 编号                  | 触发                                | 行为                                                                         | 可重试 | 用户可见表现   |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------------- | ------ | -------------- |
| e2e-fail              | focused e2e 失败                    | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D2 | 是     | e2e 全绿       |
| calendar-render       | calendar 组件渲染异常（上游降级项） | 以 calendar.types.ts 实况为准调整 mock 形状；组件缺陷则登记组件 owner 面     | 是     | 日历 tab 正常  |
| detail-view-first-use | 复刻面首个 detail-view 消费渲染异常 | 按 DetailViewSchema content+data 契约（D5 MAJ-12）调整/勘误 D2               | 是     | 基本信息区正常 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - C2 页全链实现

Status: completed（执行记录见 `docs/logs/2026/10-30.md` §M3-C2；closure audit 待独立 fresh session）
Targets: `mock-backend-repl-crm.ts`（扩展）、`page-schemas/crm-customer-360.json`、`complex-pages-model.ts`（entry）、`tests/e2e/replication-crm-customer-360.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock 扩展：C2 六端点**逐名对齐 D2 §4.2 crm 表**（partnerFindPage/partnerGet〔含联系人地址子表〕/leadByPartner〔partner 行点击→关联线索〕/activityTimeline〔timeline items，按 TimelineItemSchema time/detail/level 形状〕/activityCalendar〔按 CalendarEvent id/title/start/end 形状〕/activityCreate〔mutation：content required 错误分支；新增置顶〕；计数/钩子沿用 \_\_replCrmCalls 模式）
- [x] complex-pages-model.ts 加 crm-customer-360 entry
- [x] schema JSON（D2 §2.5 组件树：头部 hstack detail-view〔content+data，D5 MAJ-12 契约〕+picker 客户切换；四 tab——timeline〔items 解包 `${activityTimeline.items}`，value/seek 高亮〕/关联线索 table〔行点击→leadByPartner→refreshSource 主从联动〕/cards 联系人/活动日历 calendar〔events 解包，CalendarEvent 形状〕；filterForm form+valuesPath 载体→refreshSource；新增跟进 button→drawer〔form submitScope:'surface'+submitAction→activityCreate+closeOnSubmit+onSubmitSuccess refreshSource——W1 勘误 1 live 编排先例〕；testid `<pageId>-<element>`；strict 零 error）〔执行勘误：主从联动 live 编排为 rowSelection+selectionStatePath+component:refresh、onEventClick 走 setValue→openDialog 参数链、args 对象禁带 `type` 键——详见 daily log §M3-C2 勘误③④⑤〕
- [x] e2e spec 三支柱（**D2 §5 C2 ①-④ 逐条**：① partner 行点击→leadByPartner 计数+1+关联列表变化；② 切日历 tab 渲染；③ drawer 提交→activityCreate 计数+1→timeline 行数+1 且置顶；④ timeline seek→高亮切换。附 filterForm 提交→refreshSource〔来源 R1 §2 C2 要素③〕+ focus 三项：首控件可达/**drawer 焦点入首控件**/**seek 后 activeElement 保持文档内**）
- [x] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes）
- [x] 验证：`npx playwright test tests/e2e/replication-crm-customer-360.spec.ts --retries=0` 全绿 + axe spec 绿 + W1-W3/C1 回归 + playground typecheck + strict 校验

Exit Criteria:

- [x] C2 页可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（D2 §5 ①-④+filterForm+focus 三项；断言含 \_\_replCrmCalls 计数证据）
- [x] axe 基线登记绿
- [x] roadmap §2 C2 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：1 Blocker + 4 Major + 3 Minor；按修法 (a) 全量重写）
- Rounds: 1
- Findings addressed:
  - Blocker-1：Non-Goals"设计未含 mutation 契约"虚假（D2 §4.2 activityCreate/§5 断言③/R1 要素⑥ 三证）→ 修法 (a)：drawer+activityCreate+断言③④ 全量纳入 scope
  - Major-1：e2e 枚举逐条如实对齐 D2 §5 ①-④+focus 三项；filterForm 项标注 R1 来源；主从联动断言点名 leadByPartner 计数
  - Major-2：CalendarEvent/TimelineItemSchema 形状契约前置声明 + data-source 解包绑定 + 登记勘误义务
  - Major-3：虚构"W3 勘误先例"引用更正为 DetailViewSchema L280-292+D5 MAJ-12；注明 C2 为复刻面首个 detail-view 消费页（Failure Path 增 detail-view-first-use）
  - Major-4：picker 恢复（头部 detail-view+picker 客户切换，D2 树原文）
  - Minor-1：四 tab 口径修正（基本信息在 tabs 上方头部）；Minor-2：roadmap planned 回写补；Minor-3：并入 M1（断言点名具体端点计数）

## Closure Gates

- [x] in-scope 工作全部落地（C2 页含 drawer mutation 链 + mock 扩展 + roadmap 回写随收口 commit）
- [x] 行为/契约结果已达成（D2 §5 C2 ①-④+filterForm+focus 三项全绿：--retries=0 9/9——含 partner 行点击 leadByPartner+关联变化/日历 tab/drawer 提交 activityCreate+1+timeline 置顶/seek 高亮切换）
- [x] 必要 focused verification 已完成（C2 9/9 + axe 12/12 + W1-W3/C1 回归 41/41 + strict 49/49）
- [x] 不存在被静默降级的 in-scope 缺口（lint/check/typecheck 全仓失败经 stash 对照实证归并行会话 packages/ WIP，见 Deferred）
- [x] 受影响 owner docs 已同步（daily log；D2 §2.5 实现勘误 7 条就地落档——CalendarEvent/TimelineItemSchema 形状/解包绑定/detail-view 首用/主从联动 component:refresh 等）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`（**46/46 OK**——收口审计时点全仓绿：并行会话 WIP 已自洽，plan 原归因"fields.ts 未合入态失败"过期，closure audit Major-1 勘误；触达面 playground typecheck 独立过）
- [x] `pnpm build`（**46/46 exit 0**——收口审计时点全仓绿，同上勘误）
- [x] `pnpm lint`（**46/46 exit 0**——收口审计时点全仓绿）
- [x] `pnpm test`（OK——收口审计时点 flux-compiler 575/575 绿；一次 industrial coverage 目录并发碰撞系环境级与并行套件碰撞，单跑 1721 tests 全绿——closure audit Minor-2）
- [x] `pnpm check`（触达面零新增红——**两轮修复后链上唯一红已登记现绿**：① oversized——原 crm mock 773 行超限系本计划 C2 扩展引入，已拆分 mock-backend-repl-crm.ts 427 行+新增 mock-backend-repl-crm-c2.ts 497 行（airtable 先例模式，导出契约不变）→ oversized 子项 exit 0 仅余既有 3 exempt；② scanner-baselines find-non-retained-renderer-references +3——C2 schema picker/table radio ×2+calendar，与基线内 standard-crud/form-wizard（radio）及 cal-booking（calendar）同族名称碰撞假阳性，已就地注册 155→158+note → 子项现绿；workspace-manifest-deps/owner-doc-semantics 两项已被并行会话修复现绿（原"798/799 Deferred 既有"引用过期——closure audit Minor-1 勘误）；i18n ✅；其余 19 子项逐个单跑全绿〔复审轮全景实证〕）

## Deferred But Adjudicated

### （收口审计二轮后勘误更新）check/lint/typecheck 链状态

- **现态（复审轮 2 实测）**：typecheck/build/lint/test 四门禁 46/46 全绿（并行会话 WIP 已自洽，并修复了 798/799 Deferred 的 workspace-manifest-deps 与 owner-doc-semantics 两项）；check 链两处本计划相关红均已修复现绿：① oversized——crm mock 拆分（427+497 行）；② scanner-baselines find-non-retained-renderer-references +3 已就地注册 155→158+note（C2 schema radio/calendar 名称碰撞假阳性族）；一次 industrial 全仓 test 碰撞系环境级并发（单跑 1721 tests 全绿）。check 全链现绿。
- Classification: 无 plan-owned residual——本计划触达面全部现绿（新增红两处均已修复或注册）。
- Why Not Blocking: 不适用（无 deferred 项）。
- Successor Required: `no`
- Successor Path: 不适用（并行会话 WIP 若后续引入新红归其自有义务）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: C2 全链落地（六端点 mock 含 mutation 链/drawer 提交 activityCreate/timeline seek 高亮/主从联动 rowSelection+component:refresh/日历回归/detail-view 首用）。closure audit 三轮：首轮 issues（1 Blocker：crm mock 773 行超限未登记——本计划 C2 扩展引入；1 Major gates 归因过期；2 Minor）→ 修复（拆分 427+497 行、gates 刷新为审计时点实况）→ 二轮 issues（1 Blocker 残留：scanner-baselines +3 移位暴露——C2 schema radio/calendar 名称碰撞假阳性族未登记）→ 基线回填 155→158+note → 三轮 **approved** 零保留（独立实跑 C2 9/9、C1 10/10、unit 546/546、全链 check exit 0）。C2 可关，M3 累计 5/21 页。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；首轮+两轮复核）
- Evidence: 首轮 `issues`（1B+1M+2m）→ 修复 → 二轮 `issues`（1R：scanner-baselines +3 移位暴露）→ 基线回填 → 三轮 `approved`（零保留；审计员独立实跑 C2 9/9、C1 10/10、axe 12/12、回归 41/41、unit 546/546、全链 check exit 0；行为面证据跨轮沿用）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- axe color-contrast 8/list 1 两条基线为组件 owner 债（已登记基线，非页面 schema 面）
- assertDialogFocusRoundTrip drawer surfaceSlot 泛化为共享设施扩展（C3/I1/I2 复用）
