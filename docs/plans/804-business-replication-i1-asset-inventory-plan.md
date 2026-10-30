# 804 M3-I1 ITAM 资产台账与盘点页复刻（business-page-replication roadmap M3-I1）

> Plan Status: active
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-I1（依赖 M2 done；前置 W1-C3 done——设施与 repl mock 模式就绪）
> Related: D1 总体设计；D2 §2.7/§4.3/§4.4/§5（I1 页设计与端点/钩子表）；R1 §3 I1；R4 §1 I1（无缺口——全要素现成 type）

## Purpose

落地 M3-I1「ITAM 资产台账与盘点页」：资产台账 crud（IT 视角字段面）+ batch-bar 批量操作 + barcode-input batchMode 扫码盘点流（三阶段）+ 盘点差异表（盘盈盘亏标色）+ diff-view 账面 vs 实盘对照 + 报修入口，新建 itam mock 模块 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 I1 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪：replication.ts 六件套、replication.css、showcase-env repl 接线模式（W1-C3 五分支）、business-replication 分类、桌面纯 JSON 页先例、**delegate 模块模式**（wms-stock/crm-c2/crm-c3 三先例，防 oversized）。
- D2 §2.7 I1 设计（D5 核对过）；端点/钩子依据面为 **D2 §4.3 itam 表与 §4.4 钩子表**（评审 MAJ-1 勘误：原引 §4.1 系 wms 表错引）：crud 台账+query-filter/batch-bar（selectionPath 平铺 `$crud.selectedRowKeys`——D5 复审轮 1 R2 勘误口径，评审 Minor-2 归属勘误）/barcode-input batchMode（batchMode/scanButton/onScan 队列）/盘点三阶段（start→scan 落行→complete 生成差异）/差异表 differenceQuantity+status labelMap/levelMap 标色/diff-view split 账面 vs 实盘〔flux 侧预期形态〕/报修入口 button+drawer。
- mock：**itam 模块未建**——新建 `mock-backend-repl-itam.ts`（I1 子集端点逐名对齐 D2 §4.1 itam 表：资产 findPage/get/盘点单 start/scan 落行/complete/差异查询；对照 D2 §4.1 原名）。
- barcode-input 注册于 scheduling 包（render-host 已注册 registerSchedulingRenderers——无 W3 式注册缺口）。

## Goals

- `mock-backend-repl-itam.ts`（新建，I1 子集端点+错误分支+钩子）+ `page-schemas/itam-asset-inventory.json` + entry + showcase-env `/r/ReplItam__` 接线 + e2e `tests/e2e/replication-itam-asset-inventory.spec.ts`（三支柱）+ axe 分支 A 登记。
- e2e 断言**忠实转写 D2 §5 I1 清单（①-⑤+focus 3 条）**：① 手输资产码→stockTakeScan 计数+scannedCount；② duplicateScan 钩子→toast+队列项 status=duplicate；③ startTake 徽章 DRAFT→CONFIRMED+completeTake 二次确认→stockTakeComplete 计数+差异行数；④ 差异列三态标色；⑤ batch-bar 选 2 行→countTemplate+清空。**本计划补充断言（显式标注非 §5 原文）**：台账筛选、diff-view 渲染〔flux 侧预期增强〕、报修 drawer 提交、扫描落行表展示。

## Non-Goals

- 不实现二维码标签打印页（候选补充①）；不改 W1-C3 交付物（除 repl 分支接线扩展）。
- R1 §3 I1 要素②（ext 字段集挂载展示）/⑧（审计事件）随 D2 设计面走（D2 §2.7/§5 未纳入该两要素）——本计划不实现，P1 保真度审计对账（评审 Minor-3 裁决登记）。

## Scope

### In Scope

- I1 页 schema + itam mock 新建 + entry + e2e + axe 登记；roadmap §2 I1 回写。

### Out Of Scope

- 其余 15 页；I2 折旧仪表盘页；上游仓库。

## Failure Paths

| 编号             | 触发                            | 行为                                                                         | 可重试 | 用户可见表现 |
| ---------------- | ------------------------------- | ---------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail         | focused e2e 失败                | 定位修复→重跑至绿（显式 --retries=0）；设计与 live 不符以 live 为准并勘误 D2 | 是     | e2e 全绿     |
| barcode-headless | onScan 相机事件 headless 不可达 | 按 W1 勘误 5 口径：模拟扫码按钮走同一动作链验收                              | 是     | 扫码流可验   |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 全绿。

## Execution Plan

### Phase 1 - I1 页全链实现

Status: planned
Targets: `mock-backend-repl-itam.ts`（新建）、`page-schemas/itam-asset-inventory.json`、`complex-pages-model.ts`（entry）、`showcase-env.ts`（ReplItam 接线）、`tests/e2e/replication-itam-asset-inventory.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [ ] mock 新建：`mock-backend-repl-itam.ts` I1 子集端点**逐名对齐 D2 §4.3 itam 表原六名**（assetFindPage〔IT 字段面 ≥25 行〕/stockTakeGet/stockTakeStart/stockTakeScan〔服务端派生 differenceQuantity〕/stockTakeComplete/stockTakeDiff，含错误分支〔盘点单状态守卫/重复扫码〕）；**报修提交端点 repairCreate 为 D2 §4.3 缺口的显式裁决补充**（D2 drawer 仅写 button+form 未定义端点——落地时就地勘误补登，drillRows 先例）；钩子按 D2 §4.4 原名（scanMiss/duplicateScan/forceCompleteGuard/lastScanBody）+ lastRepairBody 增补登记
- [ ] showcase-env 接线 `/r/ReplItam__` 分支
- [ ] complex-pages-model.ts 加 itam-asset-inventory entry
- [ ] schema JSON（D2 §2.7 组件树：crud 台账+query-filter/batch-bar/盘点区 barcode-input batchMode+扫描落行表/差异表 status 标色/diff-view split/报修 button+drawer；testid `<pageId>-<element>`；strict 零 error）
- [ ] e2e spec 三支柱（**§5 ①-⑤**：手输资产码 scan 计数+scannedCount/duplicateScan status=duplicate+toast/三阶段徽章+complete 二次确认+差异行数/差异三态标色 getComputedStyle/batch-bar 选 2 行 countTemplate+清空；**补充断言**：台账筛选、diff-view 渲染、报修 drawer 提交计数+焦点往返；axe 分支 A；focus 3 条〔focus① 预登记 W1 勘误 7 同源退守：barcode-input 画布内不可 Tab 直达→退守 tab 必达画布内容〕）
- [ ] axe ROUTES + JSON 登记（分支 A；首跑实测回填+\_notes）
- [ ] 验证：`npx playwright test tests/e2e/replication-itam-asset-inventory.spec.ts --retries=0` 全绿 + axe spec 绿 + W1-W3/C1-C3 回归 + playground typecheck + strict 校验

Exit Criteria:

- [ ] I1 页可达可交互且列表页收录，strict validation 零 error
- [ ] focused e2e `--retries=0` 全绿（断言含 \_\_replItamCalls 计数证据）
- [ ] axe 基线登记绿
- [ ] roadmap §2 I1 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：2 Major + 4 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - MAJ-1：节号 §4.1→§4.3（3 处）+ 端点枚举改 D2 §4.3 原六名（stockTakeGet 补入；"资产 get"系错引）+ 报修端点显式裁决（repairCreate 缺口补登）+ 钩子按 §4.4 原名
  - MAJ-2：Goals/e2e 忠实转写 §5 ①-⑤（duplicateScan 补入；筛选/diff-view/报修/落行表标注为本计划补充断言）
  - Minor-1：Deferred 改写"无已知红"（803 口径）
  - Minor-2：selectionPath 勘误归属改 D5 复审轮 1 R2
  - Minor-3：R1 要素②⑧ 裁决登记（随 D2 设计面走，P1 对账）
  - Minor-4：focus① 预登记 W1 勘误 7 同源退守口径

## Closure Gates

- [ ] in-scope 工作全部落地（I1 页 + itam mock + roadmap 回写）
- [ ] 行为/契约结果已达成（D2 §5 I1 断言清单全绿，--retries=0）
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；设计勘误如有）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`（触达面零新增红口径）
- [ ] `pnpm test`（触达面零新增红口径）
- [ ] `pnpm check`（触达面零新增红口径；**新 schema 的 radio/calendar 等引用如触发 scanner-baselines 增量，首跑实测后就地注册+note**；mock 模块 <500 行防 oversized——delegate 模式）

## Deferred But Adjudicated

### check/lint 链状态（无已知红）

- Classification: 无已知红（HEAD ba3c2c866 即 803 full-green 收口态；798-802 Deferred 各项已被并行会话修复或注册现绿——评审 Minor-1 勘误：原"继承已知失败子项"前提过期）
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
