# 809 M3-M1 MES 车间大屏页复刻（business-page-replication roadmap M3-M1）

> Plan Status: active
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-M1（依赖 M2 done；前置 I2 done——设施与 mes mock 基座就绪口径）
> Related: D1 总体设计；D3 §2.4/§4.4/§5.4（M1 页设计）；R2 §1 M1；R4 §1 M1（G10）

## Purpose

落地 M3-M1「MES 车间大屏页」：dashboard 网格 + stat-tile KPI（G10 翻牌器近似）+ echarts 趋势 + notice-bar 异常播报 + scada-canvas 工位组态，mes mock 模块新建 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 M1 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication.ts 六件套、showcase-env repl 接线模式、delegate 模块模式、business-replication 分类、桌面纯 JSON 页先例、dashboard 族已入 render-host 注册（C3 交付）、data-source interval/stopWhen 轮询契约（flux-core schema L305-306）。
- D3 §2.4 M1 设计（D5 核对过；**同族勘误归属更正〔评审 MAJ-2〕**：PAGE_DATA panels 载体/echarts 事件桥已修系 C3 实现勘误①②，stat-tile decimals 系 W3⑤+C1⑦ 双半口径，notice-bar 桌面口径系设计期结论——**D3 §2.4 片段仍为内联 panels 形态，实现须按 C3 先例转写为 PAGE_DATA 表达式绑定通道，收口时 D3 §2.4 就地勘误落档**）：dashboard 网格 + stat-tile KPI（G10 翻牌器近似）+ echarts 趋势（interval 轮询）+ notice-bar 跑马灯 + scada-canvas 工位组态 + interval/stopWhen 实时刷新。
- mock：**mes 模块未建**——新建 `mock-backend-repl-mes.ts`（M1 子集端点逐名对齐 D3 §4.4 mes 表：KPI/趋势/异常播报/停机/工位组态等）。
- G10 缺口口径：翻牌器 flip 动效以 stat-tile 近似（无专用 type）。

## Goals

- `mock-backend-repl-mes.ts`（新建 delegate）+ `page-schemas/mes-shopfloor-board.json` + entry + e2e `tests/e2e/replication-mes-shopfloor-board.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言按 D3 §5.4 M1 清单（KPI 数值/趋势 echarts 渲染/异常滚动播报/停机状态/工位组态渲染/interval 轮询/focus 3 条）。

## Non-Goals

- 不实现翻牌器 flip 动效专用 type（G10 stat-tile 近似已定）；不做预警明细下钻专用面（W3 页承担）；不改 W1-I2 交付物（除 repl 接线扩展）。

## Scope

### In Scope

- M1 页 schema + mes mock 新建 + entry + e2e + axe 登记；roadmap §2 M1 回写。

### Out Of Scope

- 其余 10 页；G10 缺口落地；W1-I2 交付物重构。

## Failure Paths

| 编号         | 触发                  | 行为                                                                                                                             | 可重试 | 用户可见表现 |
| ------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail     | focused e2e 失败      | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D3                                                     | 是     | e2e 全绿     |
| scada-render | scada-canvas 渲染异常 | 以 scada 符号注册实况为准调整/勘误 D3；**renderer 类型注册缺口同 W3 勘误 4/C3 Major-1（render-host 补 registerScadaRenderers）** | 是     | 组态画布正常 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - M1 页全链实现

Status: planned
Targets: `mock-backend-repl-mes.ts`（新建 delegate）、`shared/render-host.tsx`（**registerScadaRenderers 补注册——评审 MAJ-1：complex-pages 渲染路径未含 industrial 族，M1 为该路径首个 scada-canvas 消费页，W3 勘误 4/C3 Major-1 精确同型**）、`page-schemas/mes-shopfloor-board.json`、`complex-pages-entries.ts`（entry——K2 拆分后落点已定）、`tests/e2e/replication-mes-shopfloor-board.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [ ] mock 新建：`mock-backend-repl-mes.ts` M1 子集端点**逐名对齐 D3 §4.4 mes 表单端点 dashboardKpi**（KPI/趋势/异常/停机聚合+KPI_UNAVAILABLE 错误分支——评审 MAJ-3 勘误：无组态端点，组态走静态注入；**轮询第二态机制**：mock 按调用计数相位推进〔或新增 tick 钩子并登记 D3 §4.6 勘误〕——评审 MIN-1；时间序列确定性 fixtures）
- [ ] complex-pages-entries.ts 加 mes-shopfloor-board entry（K2 拆分后落点已定——评审 MIN-3）
- [ ] schema JSON（D3 §2.4 组件树按 C3 先例 PAGE_DATA 转写：dashboard 网格/stat-tile×N KPI〔G10 近似〕/echarts 趋势〔interval 轮询〕/notice-bar 异常滚动播报/stat-tile 停机/scada-canvas 工位组态〔scada-_ 符号〕；\*\*数据源 name 统一+表达式根匹配〔评审 MAJ-3：kpiSource 名下 ${kpi._} 全链 undefined〕/trendOption+scadaConfig 载体落 PAGE_DATA 或 dashboardKpi 载荷并在 D3 §4.5 勘误\*\*；testid `<pageId>-<element>`；strict 零 error）
- [ ] e2e spec 三支柱（D3 §5.4 M1 断言清单：KPI 数值/echarts 渲染/notice-bar 播报可见/停机状态/工位组态渲染/interval 轮询前后数据变化〔W3 勘误口径：直接断数据面〕；axe 分支 A；focus 3 条）
- [ ] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes；scanner 增量如触发就地注册+note）
- [ ] 验证：`npx playwright test tests/e2e/replication-mes-shopfloor-board.spec.ts --retries=0` 全绿 + axe spec 绿 + W1-W3/C1-C3/I1-I2 回归 + playground typecheck + strict 校验

Exit Criteria:

- [ ] M1 页可达可交互且列表页收录，strict validation 零 error
- [ ] focused e2e `--retries=0` 全绿（断言含 \_\_replMesCalls 计数证据）
- [ ] axe 基线登记绿
- [ ] roadmap §2 M1 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 待独立子 agent 填写
- Verdict: 待审
- Rounds: 0
- Findings addressed: 无

## Closure Gates

- [ ] in-scope 工作全部落地（M1 页 + mes mock + roadmap 回写）
- [ ] 行为/契约结果已达成（D3 §5.4 M1 断言清单全绿，--retries=0）
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

- Classification: 无已知红（HEAD e5f572a53 后各页收口维持 full-green；layout contract-honesty 系 807 Deferred HEAD 既有红环境级 ELOOP 零交集）
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
