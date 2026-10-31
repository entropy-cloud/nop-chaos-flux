# 809 M3-M1 MES 车间大屏页复刻（business-page-replication roadmap M3-M1）

> Plan Status: completed
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

Status: executed（2026-10-30；closure audit 待独立会话）
Targets: `mock-backend-repl-mes.ts`（新建 delegate）、`shared/render-host.tsx`（**registerScadaRenderers 补注册——评审 MAJ-1：complex-pages 渲染路径未含 industrial 族，M1 为该路径首个 scada-canvas 消费页，W3 勘误 4/C3 Major-1 精确同型**）、`page-schemas/mes-shopfloor-board.json`、`complex-pages-entries.ts`（entry——K2 拆分后落点已定）、`tests/e2e/replication-mes-shopfloor-board.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock 新建：`mock-backend-repl-mes.ts` M1 子集端点**逐名对齐 D3 §4.4 mes 表单端点 dashboardKpi**（KPI/趋势/异常/停机聚合+KPI_UNAVAILABLE 错误分支——评审 MAJ-3 勘误：无组态端点，组态走静态注入；**轮询第二态机制**：mock 按调用计数相位推进——评审 MIN-1；live 修正：调用计数按波次窗口去重〔dev StrictMode 双挂载两连调须同相位，首帧保持相位 1〕；时间序列确定性 fixtures）
- [x] complex-pages-entries.ts 加 mes-shopfloor-board entry（K2 拆分后落点已定——评审 MIN-3）
- [x] schema JSON（D3 §2.4 组件树按 C3 先例 PAGE_DATA 转写：dashboard 网格/stat-tile×4 KPI + 停机 stat-tile〔G10 近似，decimals 显式〕/echarts 趋势〔interval 轮询；onClick 下钻预警明细——§5.4/focus② 义务〕/notice-bar 异常滚动播报页级〔W1 先例〕/停机明细表 panel〔§5.4 停机表首行〕/scada-canvas 工位组态〔scada-group/rect/text/device-motor/sensor-control-indicator〕；**数据源 name=kpi 与表达式根 ${kpi.\*} 严格匹配〔评审 MAJ-3〕**/scadaConfig 载体落 PAGE_DATA；**trendOption 独立载体不可行**〔表达式求值不做嵌套模板深度解析——option 内联于 panels 载体 fragment 渲染期深度编译，C3 同款，D3 §2.4 勘误建议已登记〕；testid `<pageId>-<element>`；strict 零 error——page-schemas-validation 全量含新 JSON）
- [x] e2e spec 三支柱（D3 §5.4 M1 断言清单：KPI 数值千分位/decimals/echarts 渲染/notice-bar 播报含条数〔每条轮播文本重复摘要〕/停机状态首行/scada 组态渲染+setPointValues/getPointValue/下钻 dialog 行数=该时段异常数/interval 轮询第二态〔手动刷新→相位推进→直接断数据面，W3 勘误口径；stopWhen 可选断言未接线——§5.4 可选项〕；axe 分支 A；focus 3 条〔① stat-tile 不可聚焦退守刷新钮〔C3 focus② 同族〕/② 下钻 dialog 焦点入面/Esc/③ notice-bar 关闭钮可达〕）；**retries=0 8/8 全绿（含 \_\_replMesCalls 计数证据）**
- [x] axe ROUTES + JSON 登记（分支 A；首跑实测回填 aria-required-attr 5〔downtime 表 column-resize separator 族〕+ color-contrast 7〔壳层 header secondary badge〕+\_notes；scanner 增量零触发）
- [x] 验证：`npx playwright test tests/e2e/replication-mes-shopfloor-board.spec.ts --retries=0` 全绿 8/8 + axe spec 绿 19/19 + 回归抽样 C3/W1/W2 31/31（任务指令 3 spec 抽样口径；W1-W3/C1-C3/I1-I2 全量回归归收口） + playground typecheck 绿 + strict 校验 553/553 单测全量 + `pnpm check` exit 0（零新增红）+ `pnpm build`/全仓 typecheck exit 0 + 触达面 lint 零红。**live 发现：industrial 包入口静态触达 leafer（jsdom 崩）→ 新增 `./runtime` jsdom-safe 子路径〔单一来源 re-export〕，render-host 走该子路径补注册（评审 MAJ-1 落位），design-renderer.md §11 已同步**

Exit Criteria:

- [x] M1 页可达可交互且列表页收录，strict validation 零 error
- [x] focused e2e `--retries=0` 全绿 8/8（断言含 \_\_replMesCalls 计数证据）
- [x] axe 基线登记绿（分支 A 19/19 全 spec 含新路由 + W1 分支 B）
- [x] roadmap §2 M1 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：3 Major + 3 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - MAJ-1：render-host.tsx 补注册 registerScadaRenderers 入 Targets+执行项+Failure Path（C3 Major-1 精确同型）
  - MAJ-2：勘误归属更正（轮询口径出处 D6 MIN-6→D4 §5 V1；PAGE_DATA/事件桥系 C3①② 非 W3；D3 §2.4 内联 panels PAGE_DATA 转写义务显式写明）
  - MAJ-3：三处绑定缺陷预裁决（name 统一/表达式根匹配/trendOption+scadaConfig 载体）+ mock 子集改单端点 dashboardKpi 口径
  - MIN-1：轮询第二态机制点名（调用计数相位推进+波次窗口去重）
  - MIN-2：roadmap planned 回写项补入
  - MIN-3：entry 落点犹豫措辞改写实

## Closure Gates

- [ ] in-scope 工作全部落地（M1 页 + mes mock + roadmap 回写）
- [ ] 行为/契约结果已达成（D3 §5.4 M1 断言清单全绿，--retries=0）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；设计勘误如有）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
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

Status Note: M1 全链落地（PAGE_DATA panels 载体+stat-tile×4 decimals 显式+echarts 下钻参数链 ARRAYFILTER+scada-canvas 11 leaves+相位推进轮询+render-host 补注册 registerScadaRenderers）。closure audit **approved** 零 Blocker/Major（3 Minor 簿记项随收口处理）。**含产品基建修复**：flux-renderers-industrial jsdom-safe `./runtime` 子路径（index 静态触达 leafer-ui 致 happy-dom unit 连带红——package.json exports+tsconfig+vite alias 三接线+design-renderer.md §11 同步；修复效果面 industrial 包 1721/1721 全绿）。审计员独立实跑 M1 8/8、W1-I2 八 spec 全量回归 80/80、axe 19/19、unit 553/553、四门禁 exit 0。M1 可关，M3 累计 12/21 页。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: verdict `approved`（零 Blocker/Major，3 Minor 随收口）——审计员独立实跑 M1 8/8（retries=0）+ W1-I2 八 spec 全量回归 80/80 + axe 19/19 + unit 553/553 + 四门禁 exit 0；jsdom-safe 修复四项核验（dist 零 leafer 静态导入/exports/双接线/design-renderer.md 同步）；轮询第二态直接断数据面+scada 11 leaves+下钻 ARRAYFILTER 参数链实质断言核验；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- 剪裁项⑧（工单四阶段进度 table 未落）D5/P1 审计裁决（D3 勘误第 8 条登记）
- 全量 test:e2e 归 P1 阶段
