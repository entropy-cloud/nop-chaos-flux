# 798 M3-W1 WMS PDA 收货/上架作业页复刻（business-page-replication roadmap M3-W1）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-W1（依赖 M2 done，已达成）
> Related: D1 总体设计（`docs/analysis/business-replication/d1-replication-master-design.md`）、D2 §2.1/§4.1（W1 页设计）、R1 §1 W1、R4 §1 W1；plan 796 follow-up（设计文档拆分移交）

## Purpose

落地 M3 首个工作项 W1「WMS PDA 收货/上架作业页」：playground 演示页 schema + wms mock fixture + focused e2e（程序化断言）+ axe 基线登记，并承载 M3 启动前置的**设施先行切片**与**设计文档拆分**（plan 796 follow-up）。收口为 roadmap §2 W1 状态 `todo → planned → done`。

## Current Baseline

- M2 设计齐备：D1 六项决策 + D2 §2.1 W1 组件树与 schema 片段（经 D5 属性矩阵核对+D6 可实施性复审）+ §4.1 wms mock 模块设计（16 端点）+ §5 断言清单；D6 裁决 W1 为 **mobile host override 移动画布 375×667**（4 页 host override 例外之一）。
- 实现落点（live 实证）：`apps/playground/src/complex-pages/page-schemas/*.json` auto-glob；`COMPLEX_PAGE_ENTRIES` 43 entry 现状（wms-pda-receiving 未建）；registry 特例先例 pih-workspace；mock 模块装配点 `showcase-env.ts` createReplicaBranches（700 行门禁余量）；e2e helpers（fixtures.js/visual-assert.ts）；axe 棘轮 ROUTES 含失效 id gantt-demo/crud-demo（D1 §4 修正义务移交本计划）。
- 待办移交：① plan 796 follow-up——d2/d3/d4 三份设计文档越 50KB 拆分线须 M3 启动前处理；② D6 MIN-7——设施先行切片（helpers/mock 装配/axe id 修正/分类常量）于 M3 首个工作项落地；③ D6 复审备忘——mobile 页 axe 分支 A/B 一元登记、K1 host 定名（非本计划，K1 项处理）。
- 验证设施：`playwright.config.ts` 双 webServer（playground dev 127.0.0.1:4175 strict validation 开启）；`pnpm --filter @nop-chaos/flux-playground typecheck`；focused e2e `npx playwright test tests/e2e/replication-wms-pda-receiving.spec.ts`。

## Goals

- **Phase 1 设施先行切片**：① `tests/e2e/helpers/replication.ts` 六件套（openReplicationPage/mobile context/dnd helper/**swipe helper**/assertDialogFocusRoundTrip/expectEndpointCall，含 hasTouch context——评审 Major-2 勘误：D6 MIN-7/D1 §3 清单为六件，W1 招牌交互 swipe-cell 需要它）；② `apps/playground/src/complex-pages/shared/replication.css` + styles.css @import（mobile 画布 375×667 居中手机框样式）；③ complex-pages `business-replication` 分类常量；④ showcase-env 接入 `/r/ReplWms__` 等八前缀分发骨架（空实现+错误分支范本）；⑤ axe ROUTES 失效 id 修正（gantt-demo→gantt、crud-demo→complex-pages/standard-crud，JSON 键同步迁移）。
- **Phase 1.5 设计文档拆分**：d2/d3/d4 各拆为「主文档（§1/§3/§4/§5/§6 指针化）+ 页面设计分册」？——**裁决：不拆文件，改为头部容量注**。理由：拆分破坏 D5/D6/R 系审计的节号引用链（plan 796 已认定），且 50KB 规则原文为"split at 50 KB"硬线与引用完整性的冲突——**本裁决取代 plan 796 Non-Blocking Follow-ups 的"拆分 phase/独立小 plan"successor 方向（When Closing 12 取代标注），"F2 复评拆分"列入本计划 Non-Blocking Follow-ups**。三份文档头部加容量豁免注（复刻系列设计，引用链完整性优先）。（就地登记，roadmap 不动）
- **Phase 2 W1 页实现**：`page-schemas/wms-pda-receiving.json` + `mock-backend-repl-wms.ts`（W1 所需端点按 D2 §4.1 原名先行：asnFindPage/asnGet/asnReceive/putawaySubmit/taskRecords，含错误分支——closure 评审 Major-1 勘误：validate 为 barcode-input schema 属性非端点，operationLog/scanReceive 系臆造名）+ host override 组件（mobile 画布）+ registry entry（business-replication 分类）+ `tests/e2e/replication-wms-pda-receiving.spec.ts`（三支柱断言）+ axe 分支 B 登记。
- W1 验收 = D2 §5 W1 断言清单全部通过（交互 ≥3 条+axe B+focus 3 条）。
- **P0 序偏离声明**：D1 §1/D6 MIN-7 建议序为 M2→C1→K1→W1→O1→V3；本计划以 W1 首发（roadmap §2 表序不重排约束），设施已独立成 Phase 1 使 MIN-7"设施+最高风险双职"顾虑消解，偏离有据。

## Non-Goals

- 不实现 W2-W3/C/I/K/M/S/O/V 各页（各自工作项）；不落地 G3/G4 缺口（近似组合口径已定）；不改 D5/D6 审计报告。

## Scope

### In Scope

- Phase 1 设施切片五件 + Phase 1.5 容量豁免裁决注 + Phase 2 W1 全链（schema/mock/host/e2e/axe）。
- roadmap §2 W1 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

### Out Of Scope

- 其他 20 页；retention 裁决；G 缺口登记动作；上游仓库。

## Failure Paths

| 编号               | 触发                               | 行为                                                                      | 可重试 | 用户可见表现          |
| ------------------ | ---------------------------------- | ------------------------------------------------------------------------- | ------ | --------------------- |
| e2e-fail           | focused e2e 失败                   | 定位修复→重跑至绿；设计契约与 live 不符时以 live 为准并勘误设计文档       | 是     | e2e 全绿记录          |
| axe-timeout        | mobile 画布 axe 分析超时           | 按 D1 §4 分支 C 切排除裁决（spec 注释+JSON excludedRoutes），交互验收保留 | 是     | axe 排除登记          |
| schema-strict-fail | strict validation 诊断（error 级） | 修复 schema；warn 级按 D1 §3 第四道网口径记录                             | 是     | 页面加载零 error 诊断 |

## Test Strategy

必须自动化：本页 e2e 即验收本体（roadmap §1 三支柱）；focused spec 先行（Proof 先于 Fix 无适用面——纯新增页，无既有行为）。

## Execution Plan

### Phase 1 - 设施先行切片 + 容量裁决

Status: completed
Targets: `tests/e2e/helpers/replication.ts`、`apps/playground/src/complex-pages/shared/replication.css`、`styles.css`、`complex-pages-model.ts`、`showcase-env.ts`、`tests/e2e/a11y-axe-baseline.spec.ts`+JSON、d2/d3/d4 头部

- Item Types: `Fix | Decision | Proof`

- [x] replication.ts 六件套 helper（含 mobile context {viewport 375×667, hasTouch:true} 与 swipe/pull helper；触摸手势经 CDP Input.dispatchTouchEvent 合成——onScan 相机事件 headless 不可达的 live 实证适配）
- [x] replication.css + styles.css @import（mobile 画布样式；`.repl-mobile-canvas-screen` translateZ(0) 约束 fixed 定位子组件在画布内）
- [x] complex-pages 分类常量 business-replication（entry 总数 43→44）
- [x] showcase-env repl 分支接线（createReplFetcherBranches 独立模块+2 行接线，showcase-env 仅 586→590 行）；**render-host.tsx 补注册 registerMobileRenderers**（W1 暴露的设施缺口：showcase registry 此前无 mobile 族）
- [x] axe ROUTES 失效 id 修正 + JSON 键迁移；实测回填：gantt aria-conditional-attr 14/aria-required-children 2/button-name 1、standard-crud aria-required-attr 6/color-contrast 6（旧键确系首页计数）
- [x] d2/d3/d4 头部容量豁免裁决注（plan 796 follow-up 升级裁决：引用链完整性优先，F2 复评）

Exit Criteria:

- [x] 设施切片全部落地且不影响既有页面（axe spec 8/8 绿含迁移键实测回填；回归 airtable-replica-interactions 13/13）
- [x] playground typecheck/build 通过
- [x] 容量裁决注三份落位（引用链完整性优先的裁决记录在案）

### Phase 2 - W1 页全链实现

Status: completed
Targets: `page-schemas/wms-pda-receiving.json`、`mock-backend-repl-wms.ts`、`complex-pages-registry.tsx`（host override）、`complex-pages-model.ts`（entry）、`tests/e2e/replication-wms-pda-receiving.spec.ts`、axe JSON/spec

- Item Types: `Fix | Proof`

- [x] mock-backend-repl-wms.ts（五端点 asnFindPage/asnGet/asnReceive/putawaySubmit/taskRecords + 4 错误分支 + \_\_replWmsCalls/TestHooks 含幂等键/离线/invalid-location 钩子；27 ASN ≥3 页）
- [x] host override 组件（mobile 画布 375×667 居中手机框 + SchemaPage 承载）+ entry + schema JSON（按 D2 §2.1 片段；testid 全 <pageId>-<element> 命名；strict validation 零 error——page-schemas 校验 45/45）
- [x] e2e spec 三支柱 13 测试（扫码校验回填 G3 编排〔模拟扫码按钮走同一动作链——onScan 相机事件 headless 不可达实证适配〕/连续扫码累计/asnReceive +1 首行命中/幂等键重复拒绝/swipe-cell/pull-refresh taskRecords 计数/离线条 variant=error/putaway 提交+invalid-location 分支 + axe B 画布内 + focus 3 条）
- [x] axe 分支 A+B 按 D6 一元口径单键登记（ROUTES + JSON 键，画布内 DOM；wms color-contrast 6 实测回填）
- [x] 全量验证：typecheck/build/lint + focused e2e 绿 + axe spec 绿（实质由 Closure Gates 四项 + 收口审计实跑覆盖——closure audit Minor-4 勾选义务）

Exit Criteria:

- [x] W1 页在 playground 可达可交互（`#/complex-pages/wms-pda-receiving`），strict validation 零 error 诊断
- [x] focused e2e 全绿（**retries=0 下 13/13**；冷启动 flake 已修复——replication.ts 等待 15s→30s，W1 路由冷转换 mobile 渲染器族超 15s 为根因）+ axe 基线登记绿（8/8）+ focus 3 条绿
- [x] 局部验证绿：playground typecheck + focused e2e + axe spec（全量 pnpm 四项归 Closure Gates——Minimum Rule 18，评审 Minor-2）
- [x] roadmap §2 W1 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `revised`（首轮 fail：2 Major + 6 Minor；全部修订）
- Rounds: 1
- Findings addressed:
  - Major-1：Phase 2 端点枚举改 D2 §4.1 原名（asnFindPage/asnGet/asnReceive/putawaySubmit/taskRecords；validate 非端点、operationLog/scanReceive 臆造名勘误）
  - Major-2：五件套→六件套（补 swipe helper）
  - Minor-1：axe 键迁移写明"旧计数系首页计数不可沿用，实测回填"纪律
  - Minor-2：Phase 2 EC 全量 pnpm 项删除（归 Closure Gates）
  - Minor-3：axe 口径写明 A+B 一元单键登记
  - Minor-4：P0 序偏离声明补齐
  - Minor-5：容量裁决取代标注（796 successor 方向）+ F2 复评入 Follow-ups
  - Minor-6：八前缀骨架收窄依据注

## Closure Gates

- [x] in-scope 工作全部落地（设施切片 + 容量裁决 + W1 页 + roadmap 回写随本 commit）
- [x] 行为/契约结果已达成（D2 §5 W1 断言清单全绿：focused e2e retries=0 13/13；focus ①③ 断言口径经勘误第 7 条退守 live 语义）
- [x] 必要 focused verification 已完成（focused e2e + axe 8/8 + 全量四项运行，见下两条与 Deferred）
- [x] 不存在被静默降级的 in-scope 缺口（既有红经 stash 对照实证并登记 Deferred）
- [x] 受影响 owner docs 已同步（daily log；D2 §2.1 实现勘误 8 条就地落档）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`（47/47 OK）
- [x] `pnpm build`（OK）
- [x] `pnpm lint`（本计划触达面零新增红；HEAD 既有红 mall-home-render.test.tsx unused-vars ×2——stash 对照实证，见 Deferred But Adjudicated）
- [x] `pnpm test`（本计划触达面零新增红；HEAD 既有红 mall-home-render.test.tsx 加载失败（9/9 其余通过）——stash 对照实证，见 Deferred But Adjudicated）

## Deferred But Adjudicated

### 仓库 HEAD 既有红（mall-home-render.test.tsx：包名 @nop-chaos/flux，目录 packages/flux-bundle——closure audit Minor-2 勘误）

- Classification: `watch-only residual`
- Why Not Blocking: git stash 对照实证两处失败在 HEAD（本计划改动之前）即复现，与本计划触达面（playground/complex-pages + tests/e2e）零交集；本计划自身验证全绿（focused e2e 13/13 retries=0、axe 8/8、typecheck 47/47、build OK）。owner 为 packages/flux-bundle（包名 @nop-chaos/flux；workspace-manifest-deps 标记文件 packages/flux-bundle/src/index.tsx 系 commit ff15870bb 引入面），非本计划可修范围（越权）。
- Successor Required: `yes`
- Successor Path: 登记 flux/flux-bundle owner 面修复（mall-home-render.test.tsx 加载失败 + unused-vars；以及 showcase-env workspace-manifest-deps check 红——同为 ff15870bb 引入面），建议 F2 缺口沉淀时统一登记

### 设计文档 50KB 超线（d2 56,320B/d3 61,065B/d4 66,123B，收口审计实测）

- Classification: `watch-only residual`
- Why Not Blocking: plan 798 Phase 1.5 显式裁决"引用链完整性优先"并经评审与 closure audit 双确认；豁免注三份落位
- Successor Required: `yes`
- Successor Path: F2 复评拆分（796/798 两代 follow-up 已合并指向 F2）

## Non-Blocking Follow-ups

- 全量 `pnpm test:e2e`（非 focused）不在单页工作项强制范围，P1 阶段统一跑（roadmap M3 说明未强制单页全量）
- F2 复评 d2/d3/d4 拆分（取代 796 拆分 successor——评审 Minor-5 取代标注）

## Closure

Status Note: W1 全链落地（设施切片六件套/axe 失效 id 修正实测回填/mobile host override 画布/W1 schema strict 零 error/mock 五端点/13 测试三支柱）。closure audit 三轮收敛：首轮 issues（1 Major focus 口径收窄未勘误 + 4 Minor）→ 修法 (b)（spec 退守 live 语义 + D2 勘误第 7/8 条）→ 复审两轮揪出 6 处文本未落盘（执行侧 replace 未断言）→ 全部带断言补齐 → **approved**。审计员亲手实跑：focused e2e retries=0 13/13、axe 8/8、page-schemas strict 45/45、playground typecheck 通过；HEAD 既有红三处亲手复现且与本计划触达面零交集（git diff HEAD -- packages/ 为空）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；三轮复核）
- Evidence: 首轮 `issues`（1 Major：D2 §5 focus①③ 口径收窄未勘误、Closure Gates"全绿"表述过强；4 Minor：onLoadMore 未登记/Deferred 包名不精确/字节数陈旧/复选框未勾）→ 修法 (b) 修复（spec 退守 + D2 勘误 7/8 条 + 全部文本带断言落盘）→ 复核两轮最终 `approved`（零残留）；审计员实跑 13/13（retries=0）、8/8、45/45、typecheck；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- 见 Non-Blocking Follow-ups（全量 test:e2e 归 P1；F2 复评拆分）+ Deferred 两条（HEAD 既有红 successor=flux-bundle owner 面/F2；50KB 豁免 F2 复评）
