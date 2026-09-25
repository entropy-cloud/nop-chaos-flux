# 502 Missing Components L0 — Playground 入口注册表统一

> Plan Status: completed
> Last Reviewed: 2026-09-25
> Source: `docs/backlog/missing-components-and-designer-roadmap.md` §3（L0 — Playground 入口补齐，工作项 L0.1–L0.4）
> Related: `docs/plans/501-visual-quality-r2-5-acceptance-recheck-and-guard-consolidation-plan.md`（守卫先例）；`missions/missing-components.json`

## Purpose

把 playground 首页入口从硬编码手抄清单改为消费 route-entries 注册表（单一事实源），使 78 个可路由域条目全部经注册表驱动露出（刻意不进首页的条目走显式 `homeVisible:false` 标记），补上漂移守卫测试与关键缺失入口的导航断言，并核验 print-designer demo 四链路接线完整。收口 roadmap L0 线（L0.1–L0.4）。

## Current Baseline

2026-09-25 live repo 核对：

- `apps/playground/src/pages/home-page.tsx` 硬编码 24 张 NavCard + 本地 `NavigationTarget` 联合类型（L1–L26、L36–L205），与注册表漂移：`DOMAIN_RENDERER_ROUTES`（`apps/playground/src/domain-route-entries.ts`）共 **78** 个可路由 id，首页仅可见 **22** 个；`print-designer`、`scada-editor-demo`、`report-designer-host`、`map-demo`、`pivot-table-demo` 等 56 个不可见。部分条目 home 文案与注册表文案已分叉（如 flow-designer、barcode-input；diff-view 两侧已一致，随统一幂等回灌）。
- `leafer-examples` 在 description 中带「不进 home 卡片」注释，但无机器可读标记；`dingtalk-flow-demo` 对应演示页已删（plan 2026-08-07-1053-2），App.tsx 无 case（路由 fallback 回首页），`tests/e2e/playground-entry-pages.spec.ts:500-508` 冒烟钉住该 fallback 行为。
- `apps/playground/src/route-matrix.test.ts` 已覆盖：parse/build round-trip、basic/form/data/layout/content renderer 定义枚举对齐、`RENDERER_LAB_REGISTRY` ↔ 路由清单双向覆盖（lab 守卫已存在）、domain 清单存量。`apps/playground/src/complex-pages/complex-pages.test.tsx` 已覆盖 `COMPLEX_PAGE_ENTRIES` ↔ `COMPLEX_PAGE_REGISTRY` 双向覆盖（showcase 守卫已存在）。**缺**：home 卡片集合 ↔ 域注册表的漂移不变式。
- `tests/e2e/playground-entry-pages.spec.ts`：`ROUTE_ASSERTIONS` 键集合 == 域清单（:531 硬断言），逐路由冒烟循环已覆盖全部 78 条（含 `print-designer`、`scada-editor-demo`、`report-designer-host`、`map-demo`、`pivot-table-demo` 的目标页断言），但均为 URL 直达，不经首页卡片点击。
- `tests/e2e/print-designer.spec.ts` 现状：数据绑定 ✓（`CK-2026-0901`、`货物-40`）、分页预览 ✓（page count ≥2、`>1/2<`）、PDF 导出 ✓（download 事件 + 文件名）；**浏览器打印链仅断言按钮存在**（:59-61「print button is present without opening a print dialog」），无「点击 → 隐藏打印 iframe 挂载 → 数据注入」链路断言。`flux-print-core` 侧 `printPrintTemplate` 会挂载 `iframe[data-print-frame]` 并写入 srcdoc（`packages/flux-print-core/src/print.ts:23-31,65-67`）。
- `docs/architecture/playground-experience.md`「Route Inventory」节描述 route-model 双注册表 + route-matrix 守卫，未描述 home 首页的注册表派生约定与 `homeVisible` 标记。
- 全量基线：plan 501 收口时 `pnpm typecheck/build/lint/test/check` 全绿、e2e 全矩阵 1456 captures 零新失败（2026-09-24，commit dbccedade）。

## Goals

- L0.1：首页卡片 = 注册表派生（`DOMAIN_RENDERER_ROUTES` + lab/showcase 两张合并卡），删除手抄清单与本地 `NavigationTarget` 联合类型；引入 `homeVisible` 显式标记机制。
- L0.2：`route-matrix.test.ts` 三条作用域化不变式——①域 id ⊆ 首页卡片集合（除 `homeVisible:false`）；②lab id ⊆ component-lab 注册表（已有，保持）；③showcase page ⊆ complex-pages 注册表（已有，保持并接入交叉核对）。
- L0.3：五个关键入口（`print-designer`、`scada-editor-demo`、`report-designer-host`、`map-demo`、`pivot-table-demo`）经首页卡片点击可导航到目标页，Playwright 程序化断言。
- L0.4：print-designer demo 四链路（数据绑定 / 分页预览 / 浏览器打印 / PDF 导出）各有程序化断言；补浏览器打印链缺口；核验结论回写。
- `docs/architecture/playground-experience.md` 同步入口注册表新约定；roadmap L0 状态回写；dev log 记录。

## Non-Goals

- 不改 `parseRoute`/`buildRoute` 路由语义、不动 hash 路由模型。
- 不清理 `dingtalk-flow-demo` 存量路由条目（存量条目处置归 QA.7 残余债登记册，见 Non-Blocking Follow-ups；本计划仅加 `homeVisible:false` 标记并保持既有 e2e fallback 钉住行为）。
- 不做首页视觉重设计（沿用现有卡片网格样式，仅换数据源）。
- 不逐一为 56 个新露出条目补首页点击 e2e（roadmap L0.3 明确「抽查五个关键入口即可」；全量冒烟由既有 playground-entry-pages 逐路由循环覆盖）。
- 不动 `flux-print-renderers` / `flux-print-core` 包代码（L0.4 为核验 + demo 链路断言；缺口才回填 issue 行，预期无代码改动）。

## Scope

### In Scope

- `apps/playground/src/route-model.ts`：`DomainRouteEntry` 增加 `homeVisible?: boolean`。
- `apps/playground/src/domain-route-entries.ts`：`leafer-examples`、`dingtalk-flow-demo` 标记 `homeVisible: false`（带注释）；把 home 版较优文案回灌若干稀疏注册表条目（单一事实源统一）。
- 新文件 `apps/playground/src/home-cards.ts`：注册表派生的 `HOME_NAV_CARDS`（两张合并卡 + 域条目卡），导出 `HomeNavigationTarget` 类型。
- `apps/playground/src/pages/home-page.tsx`：重写为消费 `HOME_NAV_CARDS`。
- `apps/playground/src/App.tsx`：`HomePage` onNavigate 改接 `HomeNavigationTarget`。
- `apps/playground/src/route-matrix.test.ts`：新增 home 漂移守卫 describe 块。
- 新 e2e `tests/e2e/home-entry-navigation.spec.ts`：首页 → 五关键入口点击导航断言。
- `tests/e2e/print-designer.spec.ts`：补浏览器打印链断言。
- `docs/architecture/playground-experience.md`、`docs/backlog/missing-components-and-designer-roadmap.md` §13 状态表、`docs/logs/2026/09-25.md`。

### Out Of Scope

- L0 以外的 roadmap 线（L1–L7）。
- `component-lab` / `complex-pages` / 域页面内部实现。
- home 页面信息架构重构（分组导航、搜索等）。

## Failure Paths

| 可测场景编号           | 触发                                     | 行为                                            | 可重试 | 用户可见表现                 |
| ---------------------- | ---------------------------------------- | ----------------------------------------------- | ------ | ---------------------------- |
| home-unknown-domain-id | 注册表新增 id 但 App.tsx 忘加 case       | 该卡片点击后命中 App default 分支回首页         | 否     | 点击后回到首页（守卫测试红） |
| home-visible-flag-miss | 新增可路由 entry 未登记 homeVisible      | 守卫不变式①红（新域 id 必须出现在首页卡片集合） | 否     | CI 红，提示补注册表          |
| print-frame-blocked    | printPrintTemplate 抛错（iframe 被禁等） | demo 状态行显示 error 文案（`打印失败：…`）     | 是     | 红色错误提示，非静默失败     |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**

理由：本计划交付物本身就是守卫与断言（roadmap L0 验收全为程序化断言）。Phase 2/3/4 的 Proof 项（守卫测试、导航 e2e、打印链 e2e）先于或随 Fix 项落地；守卫先红（对照现状 56 缺口）后绿不可行——守卫与 Phase 1 改造同批落地，以「删除手抄清单后守卫仍绿」为证明。

## Execution Plan

### Phase 1 - L0.1 入口注册表统一

Status: completed
Targets: `apps/playground/src/route-model.ts`、`apps/playground/src/domain-route-entries.ts`、`apps/playground/src/home-cards.ts`（新）、`apps/playground/src/pages/home-page.tsx`、`apps/playground/src/App.tsx`

- Item Types: `Fix`

- [x] `DomainRouteEntry` 增加 `homeVisible?: boolean` 字段；`leafer-examples` 与 `dingtalk-flow-demo` 置 `homeVisible: false` 并附一行注释（先例注释转机器可读）
- [x] 文案统一（执行注记：flux-basic/gantt 与注册表逐字相同幂等跳过、实改 11 条；m5-showcase/ai-widgets 为 registry 文案权威保留、home 旧漂移文案随派生消解而非回灌）：home 硬编码版明显优于注册表版的条目（flux-basic、flow-designer、gantt、kanban、scheduling-calendar、barcode-input、graph-demo、taskflow-designer、report-designer、spreadsheet、debugger-lab、condition-builder、code-editor、word-editor、performance-table、scada-demo、three-canvas-demo、scada-pressure-demo、scada-edge-cases、m5-showcase、ai-widgets；diff-view 两侧已一致则幂等跳过），把较优 description 回灌注册表条目；注册表从此为唯一文案源
- [x] 新建 `home-cards.ts`：`HOME_NAV_CARDS` = component-lab 合并卡（aggregates `ALL_SHARED_RENDERER_ROUTES`）+ complex-pages 合并卡（aggregates `COMPLEX_PAGE_ENTRIES`）+ `DOMAIN_RENDERER_ROUTES` 中 `homeVisible !== false` 的条目卡（title/eyebrow/description 直取注册表）；导出 `HomeNavigationTarget`（lab | showcase | domain）
- [x] 重写 `home-page.tsx`：删除 `NavigationTarget` 联合类型与 `NAV_CARDS` 手抄清单，卡片渲染消费 `HOME_NAV_CARDS`；`onNavigate` 签名改收 `HomeNavigationTarget`
- [x] `App.tsx`：`HomePage` onNavigate 改为按 `target.kind` 分发到 `navigate({kind:'lab'|'showcase'|'domain'})`；域渲染 switch 不变
- [x] 删除手抄清单后 `grep -n "scada-pressure-demo\|ai-widgets" apps/playground/src/pages/home-page.tsx` 零命中（卡片 id 仅存在于注册表与 home-cards 派生）

Exit Criteria:

- [x] `home-page.tsx` 不含任何硬编码卡片清单；`HOME_NAV_CARDS` 为注册表纯派生（域卡 id 集合 == 域注册表 `homeVisible !== false` 子集）
- [x] `pnpm --filter @nop-chaos/flux-playground typecheck` 通过；`app.test.tsx` / `app-diagnostics-route.test.tsx` 既有用例不因 HomePage mock 改动而红（两者均 `vi.mock('./pages/home-page')`）
- [x] 首页渲染卡片数 = 2（合并卡）+ 76（域条目），含 `print-designer`、`scada-editor-demo`、`report-designer-host`、`map-demo`、`pivot-table-demo`（Phase 3 e2e 首断言前先以 unit 守卫钉住）

### Phase 2 - L0.2 漂移守卫测试

Status: completed
Targets: `apps/playground/src/route-matrix.test.ts`

- Item Types: `Proof`

- [x] 不变式①：遍历 `DOMAIN_RENDERER_ROUTES`——`homeVisible !== false` 的 id 必须出现在 `HOME_NAV_CARDS` 域卡集合；`homeVisible === false` 的 id 必须不出现
- [x] 不变式②：保持既有 `RENDERER_LAB_REGISTRY` ↔ `ALL_SHARED_RENDERER_ROUTES` 双向覆盖（已有断言不改），并新增合并卡存在性断言（`HOME_NAV_CARDS` 含 id `component-lab`、target lab）
- [x] 不变式③：接入 `COMPLEX_PAGE_ENTRIES` 交叉核对（`HOME_NAV_CARDS` 含 id `complex-pages`、target showcase；条目级覆盖已有 complex-pages.test.tsx 守卫，此处补合并卡与注册表规模一致性断言）
- [x] 无孤儿卡断言：`HOME_NAV_CARDS` 每个域卡 id 都能被 `parseRoute(buildRoute({kind:'domain',domainId:id}))` round-trip

Exit Criteria:

- [x] `route-matrix.test.ts` 新 describe 块四条断言全绿；变红模拟：「绕过派生」方向——临时把 `HOME_NAV_CARDS` 替换为硬编码陈旧清单（或手工追加一张不在注册表的孤儿域卡 / 漏掉一条 `homeVisible !== false` 条目）时守卫红，还原后绿（本地验证后还原）
- [x] `pnpm --filter @nop-chaos/flux-playground test`（route-matrix 相关）绿

### Phase 3 - L0.3 缺失入口补挂（首页点击导航抽查）

Status: completed
Targets: `tests/e2e/home-entry-navigation.spec.ts`（新）

- Item Types: `Proof`

- [x] e2e：从 `#/` 起，对 `print-designer`、`scada-editor-demo`、`report-designer-host`、`map-demo`、`pivot-table-demo` 五张卡片各执行「定位卡片（按标题）→ 点击 → 断言目标页标志性元素可见」（复用 playground-entry-pages 的目标页断言模式，report-designer-host 用 lazy chunk 宽限超时）
- [x] 首页卡片可见性断言：五张卡片在 `#/` 页面均可定位（防「注册表有条目但首页不渲染」回归）

Exit Criteria:

- [x] 新 spec 五个用例全绿（`npx playwright test tests/e2e/home-entry-navigation.spec.ts`；15/15 含 print spec）
- [x] 既有 `playground-entry-pages.spec.ts` 逐路由冒烟零回归（79/79 全量通过，超出抽查要求）

### Phase 4 - L0.4 print-designer demo 完整性核验

Status: completed
Targets: `tests/e2e/print-designer.spec.ts`

- Item Types: `Proof`、`Fix`（若发现 demo 接线缺口）

- [x] 补浏览器打印链断言：点击「打印」→ `iframe[data-print-frame]` 挂载、srcdoc 含绑定数据（`CK-2026-0901`）→ demo 状态行出现「已发送到打印机对话框」
- [x] 四链路核验结论落 plan：数据绑定（既有 preview 断言）、分页预览（既有 page-count 断言）、浏览器打印（本 phase 新断言）、PDF 导出（既有 download 断言）；对照 `flux-print-renderers` 能力清单（canvas/palette/inspector/preview）确认 demo 接线无缺口
- [x] 若核验发现缺口：回填 `docs/backlog/missing-components-and-designer-roadmap.md` 或 flux-print-renderers issue 行；无缺口则在本 plan 记录「零缺口」结论

Exit Criteria:

- [x] `npx playwright test tests/e2e/print-designer.spec.ts` 全绿（含新增打印链用例）
- [x] 四链路 × 程序化断言映射表落在本 plan Closure 节；缺口结论（零缺口）有据

### Phase 5 - 文档同步与状态回写

Status: completed
Targets: `docs/architecture/playground-experience.md`、`docs/backlog/missing-components-and-designer-roadmap.md`、`docs/logs/2026/09-25.md`

- Item Types: `Fix`

- [x] `playground-experience.md`「Route Inventory」节增补：home 卡片注册表派生约定（`home-cards.ts` 单一事实源、`homeVisible` 标记、两张合并卡）与守卫不变式描述
- [x] roadmap §13 状态表 L0.1–L0.4 回写 `done`（closure audit 通过后执行，随附裁决注记：e2e 零新增——11 红中 1 已修复、10 为在册/存量；台账去向 = 本 plan Closure 红台账节 + QA.2 前消化 + QA.7 汇总）；dev log 记录 L0 收口

Exit Criteria:

- [x] 三份文档落盘且与 live repo 一致（文档描述的行为可在代码中逐条对应；roadmap 回写与 dev log 于 closure audit 通过后落盘，见 Closure 节）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh 子 agent（general-purpose，2026-09-25，两轮）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: Round 1 verdict `revised`——Major×2（pnpm filter 包名 `@nop-chaos/playground`→`@nop-chaos/flux-playground`；Phase 2 变红模拟在纯派生架构下不可达，改「绕过派生」方向）+ Minor×5（diff-view 漂移举例不实、:517→:500-508、commit 日期 2026-09-24、App 测试套件实际文件名、dingtalk successor 归属改 QA.7 残余债登记册）全部落实；Round 2 复核七点全落实，残留 Minor-A（Non-Goals 与 Follow-ups 归属表述一致性）/ Minor-B（修订痕迹词）已由起草者顺手修正，达成共识（零 Blocker / 零 Major）。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（首页↔注册表漂移、print 打印链断言缺口）
- [ ] 所有 in-scope confirmed contract drifts 已收敛（home 文案分叉统一回注册表）
- [ ] 行为/契约结果已达成（L0.1–L0.4 验收逐条成立）
- [ ] 必要 focused verification 已完成（守卫 unit + 导航 e2e + 打印链 e2e）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步到 live baseline（playground-experience.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（round 1 `issues` 2M/6m → 修复 → round 2 `approved` 0B/0M）；执行 session 未自审本项
- [x] `pnpm typecheck`（2026-09-25 通过）
- [x] `pnpm build`（通过）
- [x] `pnpm lint`（通过）
- [x] `pnpm test`（`--force` 零缓存 74/74 task 全绿；playground 390/390 含新守卫）
- [x] `pnpm check`（exit 0，零新增红）
- [x] `pnpm test:e2e`（全量 26.7min：**1537 passed / 43 skipped / 11 failed**；对账 **11 = 1（L0 打破：taskflow nav-cards 钉住旧漂移文案，已修至注册表权威值并复绿 8/8）+ 9（存量功能失败，经 `git stash -u` 在干净 master dbccedade 逐一复现，非本计划引入）+ 1（kanban-perf:34，project-context 在册 watch-only）**；19 did-not-run 为失败 spec 串行块级联（在册 watch-only 的 gantt-perf ×2 本轮未进入失败列表）。存量 9 项台账落本 plan Closure「存量 e2e 红台账」节 + dev log，QA.2 前专项消化、QA.7 残余债登记册汇总）

## Deferred But Adjudicated

（无——本计划无 deferred 项）

## Non-Blocking Follow-ups

- `dingtalk-flow-demo` 存量路由条目清理（App.tsx case 缺失的根修；注意 plan 2026-08-07-1053-2 已 completed 且声明无剩余工作，不得作为 successor 依据）：登记至 roadmap QA.7 残余债登记册，由 QA.7 sweep 决定立 successor plan 或随下批 playground 债务清理；本计划以 `homeVisible:false` + 既有 e2e fallback 钉住防恶化。

## Closure

Status Note: L0.1–L0.4 全部落地并经独立 closure audit 两轮通过（round 1 `issues`：存量红台账落点虚指 + 算术不自洽两 Major，均已实质修复；round 2 `approved` 0B/0M）。首页入口自此为注册表纯派生（78 卡全露出），漂移守卫/导航断言/打印链断言三类自动化护栏在案；四链路核验零缺口。unit 侧 full-green（74/74 task）+ check 零新增红；e2e 全量零新增红（11=1 已修复+9 存量+1 在册 watch-only，存量台账去向 QA.2 前消化/QA.7 汇总）。

L0.4 四链路 × 程序化断言映射表（`tests/e2e/print-designer.spec.ts`）：

| 链路       | 断言                                                                                                           | 来源                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 数据绑定   | preview srcdoc 含 `CK-2026-0901`（orderNo field 绑定）与 `货物-40`（表格 40 行）                               | 既有 `preview renders paginated same-source output…`                              |
| 分页预览   | page count ≥2、srcdoc 含 `>1/2<` 页码 token、行高闭合断言                                                      | 既有 `preview…` / `P5:…` 两条                                                     |
| 浏览器打印 | 点击「打印」→ `iframe[data-print-frame]` 挂载、srcdoc 含绑定数据与 `fmt-page` → 状态行「已发送到打印机对话框」 | 本 plan Phase 4 新增 `print button mounts the hidden print frame with bound data` |
| PDF 导出   | 点击「导出 PDF」→ download 事件、文件名 `A4 出库单.pdf`                                                        | 既有 `export button triggers a pdf download`                                      |

缺口核验结论：**零缺口**。demo（`print-designer-demo.tsx`）已接线 `PrintDesigner` 全部四能力面（canvas/palette/inspector/preview），四链路在 playground 可走通；无需回填 flux-print-renderers issue 行。

### 存量 e2e 红台账（2026-09-25 全量运行，均与本计划无关）

以下 9 个功能失败经 `git stash -u` 在干净 master（dbccedade）逐一复现，属存量回归（c6-3/c7 host-surfaces 在 2026-08-09 DV 基线为绿，回归窗口在 visual-quality R1/R2 期间，owner 待 triage）。另有 kanban-perf:34（在册 watch-only，60Hz rAF 口径）与 gantt-perf ×2（在册 watch-only，本轮未进入失败列表）。本计划不消化（out-of-scope）；**去向：QA.2 集成审计前专项消化（QA.2 pass 标准 = e2e 全量全绿，此 9 项为 blocking 输入），QA.7 残余债登记册汇总登记**：

| #   | spec:line                                                | 用例                                         | master 复现 |
| --- | -------------------------------------------------------- | -------------------------------------------- | ----------- |
| 1   | `tests/e2e/ai-coverage-widgets.spec.ts:77`               | loading sender disables textarea + submit    | ✓           |
| 2   | `tests/e2e/cal-replica-interactions.spec.ts:307`         | I7 empty required submit shows field errors  | ✓           |
| 3   | `tests/e2e/code-editor.spec.ts:450`                      | search panel opens via Mod-f                 | ✓           |
| 4   | `tests/e2e/component-lab/c6-3-host-surfaces.spec.ts:131` | status-host dialog scope eval + levelMap     | ✓           |
| 5   | `tests/e2e/component-lab/c7-host-surfaces.spec.ts:226`   | mobile-host notice-bar close/click           | ✓           |
| 6   | `tests/e2e/gantt-coverage-gaps.spec.ts:48`               | Zoom to Fit middle scale                     | ✓           |
| 7   | `tests/e2e/gantt-demo.spec.ts:16`                        | root container and aria live region          | ✓           |
| 8   | `tests/e2e/gantt-scale-today.spec.ts:106`                | aria-live count tracks visible tasks         | ✓           |
| 9   | `tests/e2e/w3c-value-mapping.spec.ts:82`                 | status levelMap Badge semantic color classes | ✓           |

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-25，两轮）
- Evidence: round 1 verdict `issues`（0B/2M/6m：Major-1 台账登记去向虚指 roadmap 登记册、Major-2 台账算术 1+9+3≠11）；修复后 round 2 verdict `approved`（逐项复核：台账 9 行 spec:line 逐一 sed 验真、11=1+9+1 与 project-context 在册 watch-only 记录互证、41=11 循环+30 静态可复算、Minor-6 注释已改）。全文见审计 agent 输出；随附条件 A（roadmap 回写附裁决注记）与 B（502 提交排除 503 文件、不声明 e2e full-green）已兑现于本次收口编辑与提交。

Follow-up:

- 存量 9 项 e2e 功能回归（台账见上）：QA.2 集成审计前专项消化（blocking QA.2「e2e 全量全绿」），QA.7 残余债登记册汇总。
- `dingtalk-flow-demo` 存量路由条目清理：QA.7 残余债登记册（非 blocking，`homeVisible:false` + e2e fallback 钉住）。
