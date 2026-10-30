# 801 M3-C1 CRM 商机漏斗看板页复刻（business-page-replication roadmap M3-C1）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-C1（依赖 M2 done；前置 W1-W3 done——设施与 crm mock 基座就绪口径）
> Related: D1 总体设计；D2 §2.4/§3.1/§3.3/§4.2/§5（C1 页设计 + 三项 ERP 验证项义务）；R1 §2 C1；R4 §1 C1（G1/G2）

## Purpose

落地 M3-C1「CRM 商机漏斗看板页」：kanban 动态阶段列（stagesData 驱动）+ 拖拽流转（moveStage mutation）+ quick-edit 金额 + 漏斗 bar 近似 + 统计带双落位，crm mock 模块新建 + focused e2e + axe 分支 A 登记。**承接 D2 §3.3 三项 ERP 验证项义务中的两项**（义务① C1 moveStage 绑定验证、义务② C1 footer 统计带绑定验证）与 G2 C1 侧请求体逐字段断言。收口为 roadmap §2 C1 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪（W1-W3 交付）：replication.ts 六件套（dragReplicationCard 真实指针拖拽）、replication.css、showcase-env repl 接线、axe 机制、business-replication 分类、桌面纯 JSON 页先例（W2/W3）。
- D2 §2.4 C1 设计（D5 核对过+实现勘误 11 条在 §2.3 同族适用）：kanban 动态阶段列（columnsConfig=stagesData data-source sequence 排序）+ onCardMove→moveStage + table quick-edit 金额（quickSaveAction args 形态）+ affixRow（TableSummaryRow cells column 必填）+ stat-tile + chart bar 近似漏斗（G1）。
- D2 §3.3 三项义务①②（C1 moveStage 绑定/affixRow+stat-tile 双落位统计带）+ ③c（C1/W2 各跑请求体逐字段断言——W2 侧已在 799 交付，本计划交付 **C1 侧 lastMoveStageBody 钩子+逐字段断言**；契约层载体=scheduling 包 use-kanban-dnd.test.ts（799 已载明，评审 m4 补引））。
- mock：**crm 模块未建**——本计划新建 `mock-backend-repl-crm.ts`（C1 子集端点按 D2 §4.2 crm 表原名：stagesFindPage/opportunityBoard 或等效/moveStage/updateRevenue/funnelSummary 等，逐名对齐）。
- live 契约先例：上游 opportunity-kanban（阶段动态列/moveStage mutation/赢单列只读）；D2 §2.4 片段已按 D5/D6 勘误（quickSaveAction args/labelMap+levelMap/columnAggregate 单对象/refreshSource targetId/affixRow column 必填/chart chartType+source）。

## Goals

- `mock-backend-repl-crm.ts`（C1 子集端点逐名对齐 D2 §4.2 crm 表 + `lastMoveStageBody` 钩子〔G2 义务③c C1 侧〕+ 错误分支）+ `page-schemas/crm-opportunity-kanban.json`（D2 §2.4 组件树）+ entry + e2e `tests/e2e/replication-crm-opportunity-kanban.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言按 D2 §5 C1 清单 + 义务①②③：拖卡→moveStage 计数+逐字段断言（义务①③）+ 列迁移+统计带差值（义务②）+ quick-edit 金额/概率徽章三色/漏斗 bar 近似/focus 3 条。

## Non-Goals

- 不实现 funnel/gauge 图型（G1：bar 近似）；不改 W1-W3 交付物（除 repl fetcher 分支接线扩展）；不做 C2/C3 页。

## Scope

### In Scope

- C1 页 schema + crm mock 模块新建 + entry + e2e + axe 登记；roadmap §2 C1 回写。

### Out Of Scope

- 其余 18 页；G1 缺口落地；W1-W3 交付物重构。

## Failure Paths

| 编号           | 触发                                | 行为                                                                                                     | 可重试 | 用户可见表现 |
| -------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail       | focused e2e 失败                    | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D2                             | 是     | e2e 全绿     |
| kanban-binding | 拖拽落点→moveStage 绑定与 live 不符 | 以 kanban.types.ts onCardMove payload 与 action 编排实况为准调整/勘误 D2（义务① 验证记录落 §3.3 归集表） | 是     | 页面正常交互 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱+义务①②③），显式 `--retries=0` 全绿（W1-W3 教训）。

## Execution Plan

### Phase 1 - C1 页全链实现

Status: completed（2026-10-30 执行；closure gates 未过——roadmap 回写与 plan 状态翻转待独立 closure audit
Targets: `shared/mock-backend-repl-crm.ts`（新建）、`page-schemas/crm-opportunity-kanban.json`、`complex-pages-model.ts`（entry）、`showcase-env.ts`（crm 分支接线）、`tests/e2e/replication-crm-opportunity-kanban.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock 新建：crm 模块 C1 子集端点**逐名对齐 D2 §4.2 crm 表**（stageFindPage/opportunityBoard/moveStage/updateRevenue/funnelSummary——评审 m2 勘误：stageFindPage 非 stagesFindPage、删"或等效"；含错误分支〔moveStage 拒绝守卫/赢单禁迁/invalid amount/forceKpiError 共 4 条〕；商机数据 26 卡覆盖 6 阶段列；**lastMoveStageBody 钩子**〔G2 义务③c，载体另见 baseline 契约层引用〕；落地增补 lastUpdateRevenueBody）
- [x] showcase-env 接线 `/r/ReplCrm__` 分支（复用 createReplFetcherBranches 模式）
- [x] complex-pages-model.ts 加 crm-opportunity-kanban entry
- [x] schema JSON（D2 §2.4 组件树，live 形态落地：动态阶段列由 opportunityBoard `{board,leads}` 承载〔columnsConfig live 不驱动列——勘误①〕/columnAggregate 单聚合 sum(expectedRevenue) label 金额/onCardMove→moveStage〔args `${cardId}/${fromColumnId}/${toColumnId}` 先例变量 + then refreshSource 双源 + onError 拒绝 toast〕/table quick-edit 金额 quickSaveAction args〔then 走 component:refresh——row-draft scope 下 refreshSource 解析不到 page 源，勘误⑥〕/affixRow cells column 必填 + stat-tile×3/chart bar 漏斗近似〔chartType+source+series dataRegionKey〕/概率徽章 status labelMap+levelMap 三色；testid `<pageId>-<element>`；strict 零诊断）
- [x] e2e spec 三支柱（10 测试 --retries=0 全绿，focus③ 以 test.fail 棘轮如实登记 live 缺口〔勘误⑧〕：义务②三处各断言齐备〔列头带逐列金额和+差值、stat-tile×3 差值、affixRow 刷新〕；交互① 拖卡→moveStage 计数+lastMoveStageBody 逐字段 {leadId,fromStageId,toStageId}+列迁移；交互② 非法回退→status:1+错误 toast 可见+卡片不迁移；③ quick-edit 计数+新值+三处同步刷新；④ 徽章三色 getComputedStyle；⑤ 漏斗 bar 渲染；⑥ 赢单列只读禁迁；axe 分支 A 独立登记；focus 3 条）
- [x] axe ROUTES + JSON 登记（分支 A；首跑实测回填 aria-required-attr 5 / color-contrast 17 + \_notes）
- [x] 验证：focused e2e `--retries=0` 10/10 全绿 + axe spec 11/11 绿 + W1/W2/W3 回归 31/31 + playground typecheck 绿 + strict 校验 65/65 + unit 545/545 + 触达面 lint 零红

Exit Criteria:

- [x] C1 页可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿（义务①②③断言齐备：lastMoveStageBody 逐字段+统计带三落位差值+moveStage 计数；focus③ test.fail 棘轮反转计绿——live 缺口勘误⑧如实登记）
- [x] axe 基线登记绿（首跑实测回填）
- [x] roadmap §2 C1 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：1 Major + 6 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - Major-1：义务②还原 D2 §3.3 三处各断言口径（columnAggregate 列头带+footer stat-tile×3+affixRow；schema 补 columnAggregate、e2e 补交互⑤；"双落位"措辞勘误）
  - m1：crm 端点表节号 §4.1→§4.2（三处+Related）
  - m2：stageFindPage 原名+删"或等效"
  - m3：e2e 补交互② rollback 半边（错误 toast 可见）
  - m4：义务③契约层载体补 use-kanban-dnd.test.ts 引用
  - m5：Deferred 计数对齐 4 项
  - m6：moveStage 请求体字段集张力注明（以实现实况+勘误 D2 为准）

## Closure Gates

- [x] in-scope 工作全部落地（C1 页 + crm mock 新建 + roadmap 回写随收口 commit）
- [x] 行为/契约结果已达成（D2 §5 C1 断言清单 + 义务①②③全绿：--retries=0 10/10）
- [x] 必要 focused verification 已完成（C1 10/10 + axe 11/11 + W1/W2/W3 回归 31/31 + strict 65/65）
- [x] 不存在被静默降级的 in-scope 缺口（lint/check 失败归因已知红，见 Deferred）
- [x] 受影响 owner docs 已同步（daily log；D2 §2.4 实现勘误 10 条就地落档——含义务①②③验证记录：moveStage 绑定 lastMoveStageBody 逐字段/统计带三处差值/kanban 键盘层 live 缺口 test.fail 棘轮）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`（绿）
- [x] `pnpm build`（OK）
- [x] `pnpm lint`（触达面零新增红；失败系并行会话 WIP——flux-bundle mall-ds-ajax.test.tsx unused eslint-disable，同 799/800 Deferred 归因）
- [x] `pnpm test`（OK）
- [x] `pnpm check`（触达面零新增红；链上失败=workspace-manifest-deps〔798 Deferred〕+ owner-doc-semantics〔799 Deferred，doc 9 vs live 10〕+ oversized 3 文件全部 [exempt] 已注册，其余子项过）

## Deferred But Adjudicated

### （继承）已知 check/lint 链失败子项（4 项）

- Classification: `watch-only residual`（4 项：workspace-manifest-deps/owner-doc-semantics/并行会话 WIP lint——798/799/800 Deferred 登记延续；scanner-baselines 已于 799 就地注册修复现绿）
- Why Not Blocking: 均非本计划触达面；收口实跑复验零新增
- Successor Required: `yes`
- Successor Path: 同 798-800 登记（flux-bundle owner 面 / F2）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段

## Closure

Status Note: C1 全链落地（crm mock 五端点+回退/赢单守卫+lastMoveStageBody 钩子/动态阶段列 kanban+columnAggregate/quickSaveAction row-draft/统计带三处/漏斗 bar/徽章三色）。closure audit **approved** 零 Blocker/Major（4 Minor 随收口处理：D2 三处就地附注已落〔focus② 退守/§3.3 ③b 字段集/§4.4 钩子增补〕、日志标题去重已落、strict 计数口径已记录、pnpm-lock 不夹带）。义务①②③全部经审计员独立实跑核验（C1 10/10 含 focus③ test.fail 棘轮诚实登记、回归 42/42、unit 545/545）。C1 可关，M3 累计 4/21 页。状态翻转滞留一拍于 98bacfd1d（实现 agent 中途改 plan 致 Edit 陈旧读态失败，本 commit 补救并披露）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: verdict `approved`（零 Blocker/Major，4 Minor）——审计员独立实跑 C1 10/10（retries=0）+ W1-W3/axe 回归 42/42、unit 545/545、typecheck；种子数学独立复算全对（revenue 750/10 卡、totalAmount 1950、won 240）；义务②三处断言逐一定位核验；focus③ test.fail 棘轮真实咬合（单独重跑 ✘ 计 passed、exit 0）与 D2 勘误⑧逐点一致；Deferred 归因实证（mall-ds-ajax lint 红系并行会话 commit 80fec284b 引入）；详见 `docs/logs/2026/10-30.md`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: verdict `approved`（零 Blocker/Major，4 Minor）——审计员独立实跑 C1 10/10（retries=0）+ W1-W3/axe 回归 42/42、unit 545/545、typecheck；种子数学独立复算全对；义务②三处断言逐一定位核验；focus③ test.fail 棘轮真实咬合；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- 已知 check/lint 链失败子项 successor 同 798-800 Deferred（flux-bundle owner 面 / F2）
- 全量 test:e2e 归 P1 阶段
