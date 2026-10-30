# 799 M3-W2 WMS 拣货路径看板与波次管理页复刻（business-page-replication roadmap M3-W2）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-W2（依赖 M2 done；前置 W1 done——设施切片已就绪）
> Related: D1 总体设计；D2 §2.2/§3.3/§4.1/§5（W2 页设计）；R1 §1 W2；R4 §1 W2（G5/G2/G7）
> 重建注：本文件曾两次因执行会话脚本 truncate-then-read 缺陷清空（第二次发生在收口 commit 内，0 字节随 3ca41ed5a 入库），2026-10-30 按原稿+全部已应用修订+收口终态重建；重建内容与 daily log、评审/审计证据链一致。教训已在 plan 796/798/799 三处登记：批量脚本严禁 truncate-then-read 写法。

## Purpose

落地 M3-W2「WMS 拣货路径看板与波次管理页」：kanban 波次分组 + gantt 拣货路径时间轴 + input-table 波次明细（aggregate/summaryBinding）+ condition-builder 释放规则，mock 端点扩展 + focused e2e + axe 分支 A 登记。收口为 roadmap §2 W2 状态 `todo → planned → done`。

## Current Baseline

- 设施就绪（W1 交付）：replication.ts 六件套 helper、replication.css、showcase-env repl 接线、axe 失效 id 已修正、business-replication 分类常量、仓库级 knip 惯例（knip.json + audit:knip，cq-1 先例——非 W1 交付，评审 Minor-5 勘误）。
- D2 §2.2 W2 设计（D5 属性矩阵核对过）：kanban（columnsConfig/waveBoard）+ gantt（zoomLevels/onZoomChange，G5 裁决：时间轴形态验收）+ input-table（波次明细 aggregate 合计行/summaryBinding 单对象回写）+ condition-builder（释放规则，G7 W2 落点）+ table（只读分组汇总）。
- D2 §3.3 ③ G2 双层验证裁决（原文核对，评审 Major-1 勘误——此前"在 C1 页主导验证"系本计划 gloss 非 D2 原文）：契约层 onCardMove payload 形状由 scheduling 包既有单测固化（use-kanban-dnd.test.ts——收口审计残留清理勘误）；业务绑定层 **C1/W2 两页各跑请求体逐字段断言**——W2 是首个落地 onCardMove→mutation 语义的页，本计划承接 W2 侧：mock 增 `lastWaveMoveBody` 钩子（D2 §4.4 钩子表增补登记）+ e2e 请求体逐字段断言。
- G5（不做 2D 平面，gantt 形态验收）、G7（W2 落点=condition-builder 释放规则——D2 §3.2 口径，非 status/card）近似口径已在 R4/D2 登记。
- W1 实现勘误 8 条（D2 §2.1）中可复用项：提交链 submitScope:'surface'+submitAction 范式、refreshSource 顶层 targetId、action-sheet 子 scope 写隔离。
- mock：`mock-backend-repl-wms.ts` 已有五端点（asnFindPage/asnGet/taskRecords/asnReceive/putawaySubmit）——本页扩展 wave 六端点。

## Goals

- `page-schemas/wms-wave-picking.json`（D2 §2.2 组件树，桌面页无画布）+ mock 端点扩展 + complex-pages-model.ts entry（列表页收录）+ e2e `tests/e2e/replication-wms-wave-picking.spec.ts`（三支柱，axe 分支 A 标准 viewport）+ axe ROUTES/JSON 登记。
- e2e 断言按 D2 §5 W2 清单 ①-⑤（看板分组/释放→waveMove 计数+请求体逐字段〔G2〕/gantt 渲染与 zoom/tfoot 合计按差值更新（§5 ③）/分区过滤）。

## Non-Goals

- 不实现库位 2D 平面图（G5 watch-only）；不做 job 调度监控专用面（G7 由 condition-builder 落点承载）；不改 W1 已交付物（除 mock 模块扩展）。

## Scope

### In Scope

- W2 页 schema + mock 扩展 + complex-pages-model.ts entry（列表页收录）+ e2e + axe 登记；roadmap §2 W2 回写。

### Out Of Scope

- 其余 19 页；G5/G7 缺口落地；W1 交付物重构。

## Failure Paths

| 编号             | 触发                       | 行为                                                                              | 可重试 | 用户可见表现 |
| ---------------- | -------------------------- | --------------------------------------------------------------------------------- | ------ | ------------ |
| e2e-fail         | focused e2e 失败           | 定位修复→重跑至绿（显式 --retries=0 口径）；设计与 live 不符以 live 为准并勘误 D2 | 是     | e2e 全绿     |
| gantt-data-shape | gantt 数据契约与 mock 不符 | 以 gantt.types.ts 实况为准调整 mock/设计勘误                                      | 是     | 页面正常渲染 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（三支柱），显式 `--retries=0` 口径全绿（config 默认 retries:1 会掩盖首跑失败——W1 冷启动 flake 教训；helper 等待已 30s）。

## Execution Plan

### Phase 1 - W2 页全链实现

Status: completed
Targets: `page-schemas/wms-wave-picking.json`、`mock-backend-repl-wms.ts`（扩展）、`complex-pages-model.ts`（entry——列表页收录义务，评审 Major-2）、`tests/e2e/replication-wms-wave-picking.spec.ts`、axe spec/JSON

- Item Types: `Fix | Proof`

- [x] mock 扩展：**六端点逐一**（waveFindPage/waveBoard/waveMove/waveRelease/waveLines/pickingTasks——D2 §4.1 W2 子集原名，含错误分支；看板列 ≥4）；**新增 `lastWaveMoveBody` 钩子**（G2 义务②请求体逐字段断言依赖；D2 §4.4 钩子表增补登记）
- [x] complex-pages-model.ts 加 wms-wave-picking entry（business-replication 分类，与 W1 同款字段）
- [x] schema JSON（D2 §2.2 组件树：kanban 波次分组/释放按钮+confirm/gantt 拣货路径〔zoomLevels/onZoomChange〕/input-table 波次明细 aggregate+summaryBinding 单对象/condition-builder 释放规则〔G7 W2 落点〕/table 分组汇总；testid `<pageId>-<element>`；strict validation 零 error）
- [x] G2 契约固化说明：payload 形状单测载体=scheduling 包 use-kanban-dnd.test.ts L162-188（objectContaining cardId/fromColumnId/toColumnId/toIndex——closure audit Minor-2 勘误：kanban-dnd-integration.test.tsx 无 onCardMove 断言）；业务绑定层由本页 e2e 断言请求体字段（目标列 id ↔ toStatus 等逐字段）
- [x] e2e spec 三支柱（D2 §5 W2 断言清单 ①-⑤：看板分组/释放→waveMove 计数+**请求体逐字段断言（G2）**/gantt 渲染与 zoom/tfoot 合计按差值更新（§5 ③）/分区过滤；kanban 拖拽用 replication dnd helper 真实指针；axe 分支 A；focus 3 条）
- [x] axe ROUTES + JSON 键登记（分支 A 标准 viewport；首跑实测回填 aria-required-attr:6/color-contrast:6 + \_notes）
- [x] 验证：`npx playwright test tests/e2e/replication-wms-wave-picking.spec.ts --retries=0`（显式 --retries=0——config 默认 retries:1，防掩盖）全绿 + axe spec 绿 + playground typecheck + page-schemas strict 校验

Exit Criteria:

- [x] W2 页可达可交互且列表页收录（complex-pages.test entry↔registry 覆盖断言过——unit 543/543；覆盖计数 complex-pages 17+route-matrix 40=57 组断言，closure audit Minor-4 勘误：原"67/67"无法复现），strict validation 零 error（首跑零 error）
- [x] focused e2e `--retries=0` 全绿（9/9；waveMove lastWaveMoveBody toEqual {waveId,fromStatus:PLANNED,toStatus:RELEASED} 逐字段〔G2 义务〕+ 释放拒绝分支 + tfoot 36→39 差值 + zone 过滤 26→9 卡）
- [x] axe 基线登记绿（9/9，实测回填+\_notes）
- [x] roadmap §2 W2 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：2 Major + 6 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - Major-1：G2 义务还原 D2 双层验证原文（"在 C1 主导"系 gloss 勘误）——本计划承接 W2 侧：lastWaveMoveBody 钩子+请求体逐字段断言+契约单测载体=scheduling 包 use-kanban-dnd.test.ts（审计 Minor-2 勘误）；D2 §4.4 钩子表增补登记
  - Major-2：Targets/In Scope 补 complex-pages-model.ts entry
  - Minor-1：Closure Gates 补 pnpm check
  - Minor-2：G7 措辞对齐 D2（condition-builder 落点）
  - Minor-3："守恒校验"改"合计按差值更新（§5 ③）"
  - Minor-4：六端点逐一列名
  - Minor-5：knip 归属改仓库级 cq-1 惯例
  - Minor-6：显式 --retries=0 命令形态
  - 重建注：本文件曾因执行会话脚本 truncate-then-read 缺陷清空（与 plan 796 同类事件），已按原稿+全部修订重建；收口 commit 后再次发生同类清空，本稿为含收口终态的第二次重建

## Closure Gates

- [x] in-scope 工作全部落地（W2 页 + mock 扩展 + roadmap 回写随收口 commit）
- [x] 行为/契约结果已达成（D2 §5 W2 断言清单全绿：focused e2e --retries=0 9/9）
- [x] 必要 focused verification 已完成（W2 spec + axe 9/9 + W1 回归 13/13 + strict 零 error）
- [x] 不存在被静默降级的 in-scope 缺口（lint/check 失败经实证归并行会话 WIP 与 798 Deferred 既有红，见 Deferred）
- [x] 受影响 owner docs 已同步（daily log；D2 §4.4 钩子表增补已落；D2 §2.2 实现勘误 7 条就地落档）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`（OK）
- [x] `pnpm build`（47/47 OK）
- [x] `pnpm lint`（触达面零新增红；失败系并行会话 WIP——packages/flux-bundle mall-home-render.test.tsx 被改+未跟踪 mall-ds-ajax.test.tsx unused eslint-disable，mtime 实证，见 Deferred）
- [x] `pnpm test`（OK——798 期间的 mall-home-render 加载失败已不复现，并行会话 WIP 演化）
- [x] `pnpm check`（触达面零新增红；链上 3 失败子项均非本计划触达面：① check:workspace-manifest-deps——798 Deferred 已登记的 ff15870bb 既有红；② check:owner-doc-semantics——flux-runtime-module-boundaries.md L573 "9 renderer families" vs ff15870bb registerMobileRenderers，同引入面，见 Deferred 新条；③ check:scanner-baselines +1——W1 提交面 728bf8295，**已就地注册 693→694+note 修复**；其余子项（含 && 链后续 24 项补跑）全过含 i18n ✅——closure audit Major-1 勘误：原"其余 33 子项全过"系 && 链短路未验证的错误声称）

## Deferred But Adjudicated

### 仓库工作树并行会话 WIP lint 红（packages/flux-bundle mall-home-render.test.tsx 改动 + 未跟踪 mall-ds-ajax.test.tsx）

- Classification: `watch-only residual`
- Why Not Blocking: 与本计划触达面（playground complex-pages + tests/e2e + docs）零交集；mtime 实证系另一会话活跃 WIP（20:35/21:03）；本计划自身 lint 触达面零新增红。
- Successor Required: `yes`
- Successor Path: 由该并行会话自行收口（其 WIP 自带 lint 义务）；F2 统一登记

### HEAD 既有红 owner-doc-semantics（flux-runtime-module-boundaries.md L573）

- Classification: `watch-only residual`
- Why Not Blocking: ff15870bb（registerMobileRenderers 补注册）使文档"9 renderer families…host-registered on demand"与 live 10 调用漂移——两侧均 HEAD 态非本计划引入；架构 owner-doc 改写宜随 flux-bundle owner 面收口一并处理（越权风险）
- Successor Required: `yes`
- Successor Path: flux-bundle owner 面 / F2 统一登记

### （继承）HEAD 既有红 workspace-manifest-deps

- Classification: `watch-only residual`（plan 798 Deferred 同项延续，本计划 check 实跑复现——同一 ff15870bb 引入面）
- Why Not Blocking: ff15870bb 引入、798 已登记 successor=flux-bundle owner 面
- Successor Required: `yes`
- Successor Path: 同 plan 798 Deferred

### 设计文档 50KB 超线（d2 56,320B/d3 61,065B/d4 66,123B，收口审计实测）

- Classification: `watch-only residual`
- Why Not Blocking: plan 798 Phase 1.5 显式裁决"引用链完整性优先"并经评审与 closure audit 双确认；豁免注三份落位
- Successor Required: `yes`
- Successor Path: F2 复评拆分（796/798 两代 follow-up 已合并指向 F2）

## Non-Blocking Follow-ups

- 全量 test:e2e 归 P1 阶段
- owner-doc-semantics（9→10 renderer families 文档改写）与 workspace-manifest-deps 由 flux-bundle owner 面/F2 承接（Deferred 已登记）

## Closure

Status Note: W2 全链落地（六端点 mock+entry+schema strict 零 error+9 测试三支柱）。closure audit 首轮 issues（1 Major：check 门禁记载漂移——&& 链短路致"其余全过"未验证，复跑发现另 2 失败子项 owner-doc-semantics/scanner-baselines）→ 修复（三失败子项逐一归因登记；scanner +1 系 W1 提交面已就地注册 694 修复现绿）→ 复核 **approved**。Minor-3 记录：focus ②/③ 与 D2 §5 编号互换、input-table"Esc 返回"以 Tab 驻留表格实现（dialog Esc 返回已断言）——三面覆盖无静默降级。W2 可关，M3 累计 2/21 页。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；首轮+复核两轮）
- Evidence: 首轮 `issues`（1 Major：check"其余 33 子项全过"系 && 链短路未验证的错误声称，补跑发现 owner-doc-semantics/scanner-baselines 两失败；4 Minor）→ 修复（三失败逐一归因、scanner 基线就地注册现绿、D2 勘误第 7 条、载体引用勘误、计数勘误、日志去重）→ 复核 `approved`（独立实跑 W2 9/9、W1 回归 13/13、unit 543/543、scanner-baselines exit 0）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- owner-doc-semantics（9→10 renderer families 文档改写）与 workspace-manifest-deps 由 flux-bundle owner 面/F2 承接（Deferred 已登记）
- 全量 test:e2e 归 P1 阶段
