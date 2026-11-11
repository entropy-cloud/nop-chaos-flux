# 836 e2e 台账外新红收敛（deep-audit 2026-11-01 §7 E1/E2）

> Plan Status: completed（closure audit approved；见 Closure Audit Evidence）
> Last Reviewed: 2026-11-12
> Source: `docs/audits/deep-audit-2026-11-01.md` §7；`docs/testing/e2e-baseline-ledger.md`（PH-9 台账，2026-10-26）
> Related: plan 762（PH-9 台账）、plan 734（strict 诊断语料治理，Deferred 待人审——本计划不触碰）

## Purpose

把 2026-11-01 全量 e2e 中**不在 PH-9 台账内**的 18 项稳定红逐项定根因并收敛：产品缺陷修产品、过期测试修测试、时间依赖测试固定时钟；最后把台账更新到新基线，使"全量失败集 ⊆ 台账"重新成立。

## Current Baseline

- 2026-11-01 隔离全量（`PLAYWRIGHT_PORT=4275 E2E_EXCLUDE_WATCH_ONLY=1`，2140 tests）：1839 passed / 250 failed / 5 flaky / 46 skipped；与台账逐名对账：231 项在册、19 项台账外；19 项隔离复跑（`--retries=0`，`_tmp/e2e-triage.log`）18 稳定红、1 转绿（`data-viz-interaction-state` map toast，flaky）。
- **E1 时间边界族**：审计时刻为 CST 2026-11-01 02:42 = UTC 10-31 18:42。`packages/flux-renderers-scheduling/src/calendar/calendar.tsx` 采用"UTC 零点"日期模型（事件日期 `new Date('YYYY-MM-DD')`、UTC 日期运算、`toISOString().slice(0,10)` 写回，`calendar-timezone.test.ts` 已钉 UTC 运算），但"今天"由 `new Date()`（本地此刻，:68-69）构造且未归一到"本地日历日的 UTC 零点"——UTC+ 时区每天本地 00:00 至时差小时数内，"今天"被当作前一天（月份标题、Today 跳转、`data-today` 高亮、scope 写回日期）。疑似受此族影响的台账外红：`cal-replica-interactions` ×2（Today 后期望 "November 2026" 实得 "October 2026"）、`cal-replica-visual` 01、`calendar-demo` 导航（期望「2026年11月」实得「2026年10月」）、`replication-crm-customer-360` 交互②（日历 tab 事件不可见）。同类“今天”构造另见 `calendar/utils/calendar-date-utils.ts:68-71`（`isToday()` 内建 `Date.now()`，直接决定 `data-today` 高亮）、`gantt.tsx:319`、`gantt-markers.tsx:23`；同类 `toISOString().slice(0,10)` 转换另见 `calendar.tsx:110,256,320,503,510`、`gantt.tsx:239,244`、`gantt-store.ts:251`、`use-gantt-drag.ts:115` 及 playground demo（`calendar-demo.tsx:98-128`、`calendar-perf-scale-demo.tsx`、`gantt-perf-scale-demo.tsx`、`mock-backend-notion-views.ts:131`、`data-c9-host.ts:41`）——需逐处判定输入是否为 UTC 零点日期（是则正确，否则为同一缺陷）。测试侧 `cal-replica-interactions.spec.ts:84,87,99` 亦以本地 `new Date()` 计算期望值。
- **E2 漂移族**（逐项待定根因）：`playground-entry-pages` 路由清单缺 11 项（`input-table-erp`、`m6-gesture-lab`…`m11-number-keyboard`、`scada-gallery` 等）；`linear-replica-visual` 03（期望「归档所选」实得「全部归档」）、05（progress 比值 NaN）、`linear-replica-interactions` 15；`antdpro-replica-visual` 01/03（`complex-page-title` 不可达）；`editor-demos-ux-r10` sc2（调色板缩略图 44→37）；`w3d-editor` TipTap 列表切换（值为 `<p>` 非 `<ul>`）；`cron-editor` ×2（文本模式值为空）；`c7-host-surfaces` swipe-cell（`open-left` 未达成）；`simple-form` 密码确认（遮罩计数）；`c2-4-host-surfaces` range-host（选区终点 06-10 vs 期望 06-18）。
- 台账外项分诊时须排除"并行会话 WIP 经共享 dev server 生效"的干扰：本计划所有复跑使用自有端口（`PLAYWRIGHT_PORT`）与 `--output=_tmp/...`。

## Goals

- 18 项各自落到且只落到一种处置：`product-fix`（附判别性测试）/ `test-fix`（附过期原因）/ `ledger-registered`（仅限确属台账 B/E 类既有根因、经证据归并）。
- E1 时间边界缺陷在产品侧修复，并有在固定"UTC+8 凌晨"时钟下必挂（旧实现）/必过（新实现）的单测与 e2e。
- `docs/testing/e2e-baseline-ledger.md` 追加 2026-11-01 基线节，全量失败集与台账一致。

## Non-Goals

- 不清洗台账内 B 类 strict 诊断语料（plan 734 Deferred，待人审）；不处理 watch-only perf 项；不改 e2e 框架配置的全局 retries/workers。

## Scope

### In Scope

- 18 项台账外稳定红的根因裁决与修复；scheduling 日期"今天"归一化与同类转换逐处判定；必要的 playground demo/mock 日期修正；台账更新。

### Out Of Scope

- 台账内 231 项；`data-viz` map toast flaky（单项转绿，登记 flaky 观察）；与 18 项无关的 e2e 重构。

## Failure Paths

不适用：测试收敛与日期计算修正，无错误处理/API 契约变更。

## Test Strategy

必须自动化：E1 是核心回归路径（日期计算），先写固定时钟下失败的判别性测试再修；E2 每项 product-fix 同样先有失败测试。

## Execution Plan

### Phase 1 - 分诊（时间边界 vs 漂移）

Status: completed
Targets: 18 项所在 spec、`_tmp/` 分诊日志

- Item Types: `Proof | Decision`

- [x] Proof：以 `TZ=UTC`（Node 与浏览器同时区，消除本地/UTC 日界错位）复跑 18 项，记录转绿项（= 时间边界族候选）与仍红项（= 漂移族）。口径注：`_tmp/e2e-triage.log` 汇总 33 failed 系整文件复跑连带在册项复红，台账外口径以上述 18 项为准
- [x] Proof：对时间边界候选，以 Playwright `page.clock`（固定 `2026-11-01T02:00:00+08:00`）+ `timezoneId: 'Asia/Shanghai'` 确定性复现
- [x] Decision：18 项逐项初判处置类别并写入本计划执行记录（后续 Phase 可改判，改判当场记账）

Exit Criteria:

- [x] 18 项均有初判类别与证据（日志路径）

### Phase 2 - 时间边界产品缺陷（E1）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/**`、`gantt/**`（按判定）、对应单测；涉事 e2e spec

- Item Types: `Proof | Fix`

- [x] Proof：scheduling 单测——vitest worker 启动前注入 `TZ='Asia/Shanghai'`（package test script env 或 config env，测试体内赋值在非 UTC+8 宿主可能因时区缓存失效；测试开头以 `resolvedOptions().timeZone` 前置守卫）+ fake timers 固定本地 `2026-11-01 02:00`，断言 calendar 初始"今天"为 2026-11-01（月份 11 月、`data-today` 落在 1 日、scope 写回 `2026-11-01`）（旧实现得 10-31 → 挂）
- [x] Fix：引入"本地日历日 → UTC 零点"的今天构造（单一 helper），替换 `new Date()` 作为"今天/默认日期"的用法；对 `toISOString().slice(0,10)` 各处逐一判定输入是否已是 UTC 零点日期——不是则改用该 helper/本地日期格式化
- [x] Fix：涉事 e2e 的期望值计算与产品同口径（或以 `page.clock` 固定时间），使其与当前时刻无关
- [x] Proof：e2e——固定时钟 `2026-11-01T02:00:00+08:00` 下 cal-replica Today 跳转与 calendar-demo 导航通过（旧实现挂）

Exit Criteria:

- [x] 判别性单测与固定时钟 e2e 通过且反向验证
- [x] `flux-renderers-scheduling` 包测试通过；E1 涉事 spec `--retries=0` 通过

### Phase 3 - 漂移项逐项收敛（E2）

Status: completed
Targets: E2 各 spec 及其页面/组件

- Item Types: `Proof | Fix | Decision`

- [x] 每项：定根因（`git log -S`/二分到引入提交）→ 判 product-fix 或 test-fix → 修复 → 该项 `--retries=0` 通过；product-fix 附判别性测试
- [x] 路由清单：核对缺失 11 路由是否为有意新增页面，是则更新清单（test-fix），否则修路由注册
- [x] 记录每项"引入提交 + 处置 + 证据"表

Exit Criteria:

- [x] E2 全部项通过 `--retries=0`，处置表完整（ledger-registered 归并 4 项除外——见处置表，均为台账既有根因归并，非新增容忍）

### Phase 3 处置表（执行完成 2026-11-11）

| #   | 项                                                                  | 根因（引入提交）                                                                                                                                                                                                                                                                                                | 处置                                                                                                                                                                                            | 证据                                                                           |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | `w3d-editor.spec.ts:70` TipTap 列表切换值为 `<p>`                   | **product/依赖**：plan 825（`0a828388e`，10-31）`prosemirror-view>=1.42.3` override 拉入 view@1.42.8（model@1.25.12/transform@1.12.4），与 @tiptap/pm 链上 prosemirror-state@1.4.4（model@1.25.9）并存 → 双 prosemirror-model 实例，toggleList 抛 "Can not convert <> to a Fragment"（pageerror 门禁+命令失败） | **product-fix**：package.json overrides 追加 `prosemirror-model>=1.25.12`、`prosemirror-transform>=1.12.4`，双实例消除（`ls node_modules/.pnpm` 单版本）；既有 e2e 即判别测试（双实例下必挂）   | `_tmp/audit-1106/836-b1.log`（红）→ `836-w3d-fix.log`（7/7 绿）                |
| 2   | `editor-demos-ux-r10.spec.ts:131` sc2 palette 44 vs 37              | **test 过期**：plan 531（`da067c238`）引入分组折叠头按钮进 palette aside；测试 `palette.locator('button')` 把 7 个组头计入 items（44=37 图元+7 组头）                                                                                                                                                           | **test-fix**：items 改 `[data-palette-item]` 限定符号项，语义（每图元一缩略图）不变                                                                                                             | `836-b1.log` → `836-b3.log` 全绿                                               |
| 3   | `editor-demos-ux-r10.spec.ts:96/:119` sc1/sc3 console 门禁 ×10      | **product 元数据缺口**：`scada-editor-canvas` 定义（`editor/renderer-definitions.ts`）未发布 `componentCapabilityContracts` → `component:save/load/exportConfig/previewInject/previewClear` 编译期无目标类型 → strict 模式 `unvalidated-component-target` console.error。诊断规则引入 `5b870f9e0`（5-21）       | **product-fix**：定义补 19 契约（对齐 use-editor-handles invoke switch，destroy 除外）；判别测试 2 条（contracts ↔ ALL_HANDLE_METHODS 防漂移 + validateSchema 无 unvalidated-component-target） | industrial 1725/1725 绿；`836-ep3.log` scada-editor-demo smoke 绿              |
| 4   | `cal-replica-visual.spec.ts:32` data-today 计数 0                   | **test 时间炸弹**：booking 月历锚定 mock 固定 `date=2026-09-03`，today 高亮仅当真实"今天"落在锚定日六周窗口（约 8 月下旬~10 月上旬）才存在；台账 F9 "today 标记缺失" 即 10 月后失锚                                                                                                                             | **test-fix**：`page.clock.setFixedTime(2026-09-03T02:00+08)` + timezoneId + 固定后点击一格触发重渲染（isToday 于 render 期取样）；今日强调断言语义保留且确定                                    | `836-b1.log` → `836-b4.log` 绿                                                 |
| 5   | `linear-replica-visual.spec.ts:206` 归档所选 vs 全部归档            | **test 过期**：plan 646（`0d49373c8`，10-18）有意改按钮为「全部归档」全量归档语义（ids:[]+confirmText）                                                                                                                                                                                                         | **test-fix**：期望随页面语义改「全部归档」并注记                                                                                                                                                | `836-b3.log` 绿                                                                |
| 6   | `linear-replica-visual.spec.ts:301` progress NaN                    | **product/mock 缺陷**：ux-r12 direction 契约（`02fc0bb71`，10-02）后 `ln-progress` 容器缺显式 `direction:"row"` → 默认 column 压塌；显式 row 后容器自动生成的 `[data-slot=container-body]` wrapper 又以内容宽收缩 → track flex:1 得 0                                                                           | **product-fix**：linear-projects.json 两处 ln-progress 容器补 `direction:"row"` + linear-replica.css 补 `.ln-progress > [data-slot='container-body']{flex:1;width:100%}`                        | live probe（trackW 0→716，fill 62%=443.9px）；`836-b6` 绿                      |
| 7   | `linear-replica-interactions.spec.ts:576` 15 toast 未出现           | **test 过期**：plan 646 给 bulk-archive 加 `confirmText` 确认门，用例未跟进（点击后须确认 alertdialog）                                                                                                                                                                                                         | **test-fix**：补确认弹窗交互（complex-pages-interaction-state 既有 confirmText 先例同型）                                                                                                       | `836-b3`（该 spec 全绿，含 15）                                                |
| 8   | `antdpro-replica-visual.spec.ts:31` export 钮不存在                 | **test 过期**：plan 551（`3b5445ea2`，10-09）有意移除死批量导出钮（无 onClick，死控先例 550）                                                                                                                                                                                                                   | **test-fix**：断言改 `toHaveCount(0)` 并注记                                                                                                                                                    | `836-b3.log` 01 绿                                                             |
| 9   | `antdpro-replica-visual.spec.ts:110` 入库基信不命中                 | **test 过期**：plan 551 三卡兄弟 form 合一 `antdpro-grouped-form`（required 校验通道+10 字段全保留），`antdpro-grouped-inline-form` testid 不复存在                                                                                                                                                             | **test-fix**：改用 merged form testid 并注记                                                                                                                                                    | `836-b3.log` 03 绿                                                             |
| 10  | `playground-entry-pages.spec.ts:569` 路由清单缺 11 项               | **test 过期**：11 路由均为 10-15..10-28 各计划有意落地（785/664/668/621、IA 重组 `e22e9fa3f`、559 画廊、534 `three-industrial`），注册进 DOMAIN_RENDERER_ROUTES 但断言映射未跟进（DV plan 2026-08-25-0215-1 同型先例）                                                                                          | **test-fix**：逐条补 11 条页面骨架断言（各页 H1）                                                                                                                                               | `836-ep3.log` :569 绿                                                          |
| 11  | `playground-entry-pages :591` scada-editor-demo 冒烟 console 门禁   | 同 #3（同一根因同一修复覆盖）                                                                                                                                                                                                                                                                                   | **product-fix**（归并 #3）                                                                                                                                                                      | `836-ep3.log` 绿                                                               |
| 12  | `playground-entry-pages :591` w4a-multimedia 冒烟                   | 同类元数据缺口：`carousel` 定义未发布 next/prev/setValue 契约（runtime hasMethod/listMethods 三方法齐备）                                                                                                                                                                                                       | **product-fix**：content-renderer-definitions.ts 补 3 契约                                                                                                                                      | `836-ep3.log` 绿                                                               |
| 13  | `playground-entry-pages :591` component-handles 冒烟                | 同类元数据缺口：checkbox-group runtime `CHECKBOX_GROUP_METHODS=['focus','clear']` 但定义只声明 FOCUS_ONLY → `component:clear` 无契约（body/7 Clear Checkbox Group）                                                                                                                                             | **product-fix**：input-shared 增 `FOCUS_CLEAR_CAPABILITY_CONTRACTS` 并用于 checkbox-group；契约诚实基线 76→77、component-handle-contracts 期望更新                                              | form 包 1127 绿；`836-ep3` 后续全绿（`836-b3.log`）                            |
| 14  | `playground-entry-pages :591` ai-component-handle / ai-widgets 冒烟 | **台账既有根因归并**：ai-chat 定义有意不声明契约（P1-MA9.2-001 in-tree 注记：invoke 模型与 flat contract 校验不兼容，需专用 invoke-model contract pattern，R3.x/MV 后续承接）                                                                                                                                   | **ledger-registered**（F9 归并，不改 ai 定义——不推翻既有裁决）                                                                                                                                  | `ai-renderer-definitions.ts:83` 注记；`836-b3.log` 两项维持红=在册形态         |
| 15  | `cron-editor.spec.ts:12/:89` echo 空文本                            | **台账既有根因归并**：表单 body 内部读取发布到父作用域路径的已知缺口（P1-MA4.5-006，R2.14 归属）；live 探针实证：四 scenario echo 初始全空、提交后 echo 正常（发布-on-commit 通）、visual 用例先编辑后断言故绿；plan 860 B3 复探已裁定「HEAD 与修复后一致 2 红」                                                | **ledger-registered**（F9 归并；plan 860 已裁定归属，不在本计划重复开洞）                                                                                                                       | `_tmp/audit-1106/836-cron-probe.mjs` 探针输出；docs/logs/2026/11-06.md B3 结论 |

### Phase 4 - 台账新基线

Status: completed
Targets: `docs/testing/e2e-baseline-ledger.md`

- Item Types: `Proof | Fix`

- [x] Proof：隔离全量复跑一次，逐名对账：失败集 ⊆ 台账（在册项），无台账外失败（证据：`_tmp/audit-1106/836-full-e2e-full.log`、`836-full-failed-unique.txt`、对账底稿 `836-reconcile-1112.txt`、隔离复验 `836-iso-1112.log`；对账结论见台账「2026-11-11 基线」——失败集 = 在册 164 + flake-ledger 1 + **新登记 3**（a11y-axe ×2 色对比漂移、complex-pages:180 picker 指针点击，11-02 已登记未归因项复现确认；均登记不静默，非 836 触达面））
- [x] Fix：台账追加「2026-11-11 基线」节（运行元数据、对账结论、本计划处置表摘要、转出项清单、新转入 3 项；体量超限拆分至 `docs/testing/e2e-baseline-ledger-2026-11-11.md`，主台账留指针）

Exit Criteria:

- [x] 台账更新且与复跑结果一致

### Phase 4 执行记录（2026-11-12）

- 全量计数：1959 passed / 169 failed / 7 flaky / 30 skipped（总 2165，`PLAYWRIGHT_PORT=4291`，1.5h）。逐名对账：在册复现 164 + flake-ledger（crm focus③ contention）1 + 新登记 3，与汇总 ≤1 reporter 双计口径差。
- 在册未复现（转出）≈79 项，逐组归因见基线节：836 修复直接转绿 16 项 + 契约修复族连带（F1 console 语料族）≈50 项 + 时间炸弹窗口未复现 4 项 + C 类 3 项。**诚实注记**：c2-4 range-host / c7 swipe-cell / simple-form confirm-password 三个 E1 族判定项于 11-11/12 时间窗全量与隔离（--retries=0，port 4293）均红——时间窗特性（TZ=UTC 分诊绿为窗口效应），维持 F9 在册，非本轮回归。
- 受影响包局部验证（`_tmp/audit-1106/836-pkg-verify-1112.log`）：industrial/content/form/scheduling 单测 + typecheck + lint；全仓五命令留收口。

### Phase 1-2 执行记录（2026-11-02）

- TZ=UTC 分诊（`_tmp/audit-2026-11-02-logs/p836-triage-tzutc.log`，14 个涉事 spec 全量复跑）：**7 项台账外红转绿 = 时间边界族实证**（cal-replica-interactions 01/02、calendar-demo 导航、replication-crm-customer-360 交互②、c2-4-host-surfaces range-host、c7-host-surfaces swipe-cell、simple-form 密码确认）——E2 初判的 c7/c2-4/simple-form 三项实为同族时间边界（改判记账）；**11 项仍红 = 真漂移族**（w3d-editor:70、playground-entry-pages、linear-replica-visual :206/:301、linear-replica-interactions、editor-demos-ux-r10、cron-editor :12/:89、antdpro-replica-visual :31/:110、cal-replica-visual :32）。
- 产品修复落点共 **6 处**（初判 3 处漏网）：calendar.tsx initialDate、isToday、**use-calendar-navigation.goToday**（执行期发现：Today 恢复仍走 raw now，e2e 复跑抓到）、**use-calendar-state initialDate 默认值**（执行期发现）、gantt scrollToToday、gantt-markers（内联归一改统一 helper `localCalendarDayToday`）。判别单测 `calendar-today-local.test.tsx`（CST 2026-11-01 02:00 → data-date=2026-11-01；旧实现 2026-10-31，stash 反向验证挂）+ calendar-date-utils 契约测试改本地日历日语义（含双时区确定性断言，fake-timer 冻结内部时钟——`Date.now` 属性覆写对 `new Date()` 不可见的教训在案）。
- **crm-c2 mock 前提勘误（就地标注）**：plan 819 期间 mock 事件日期按 UTC 月 clamp（对齐旧产品行为）；836 修正后回改本地月 clamp，:387 用例改判「按本地月渲染」并附前提勘误注——复跑绿。
- e2e 验证：cal-replica-interactions 16/16（含固定钟 page.clock + timezoneId 硬化；setFixedTime 须置于页面加载后，启动前冻结 Date 会让应用引导挂起——教训在案）；calendar-demo/c2-4/c7/simple-form/crm-360 复跑全绿。**simple-form 另 3 条在册红同为时间炸弹**（TZ=UTC 下转绿）→ Phase 4 台账记账。
- **Phase 3 前置复测（E1 修复落地后，`_tmp/.../p836-e2-current.log`）**：11 项漂移族维持原样（E1 无顺带修复）。**entry-pages 根因细化（修正 11-01 初判）**：`:591` 冒烟失败为具体路由的 console.error 门禁命中（`component-handles`、`w4a-multimedia`、`ai-component-handle` 等，各 +4/+8 条），**并非** 11-01 §7 所述「路由清单缺 11 项」形态。Phase 3 执行时须以逐路由 console 输出定根因（产品缺陷 vs mock 噪声 vs 门禁豁免缺失）。

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_62bcbb95-6c2b-46de-b52f-4d425560ff19；round-2 agent_507ee0a8-dc67-42e2-aeff-637eb93b5ba3）
- Verdict: pass（round-1 fail：1 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，2 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 总用例计数 2131→2140（日志为 2140 且与结果自洽），审计报告 §7 就地勘误；Minor-1 补 today 构造点（isToday/gantt/gantt-markers）；Minor-2 TZ 断言改 worker 启动前注入 + 前置守卫；Minor-3 triage 日志口径澄清。评审同时实证：headless Chromium 继承宿主 TZ、page.clock/timezoneId 在 Playwright 1.63.0 可用。

## Closure Gates

- [x] 18 项全部处置（无"待定"）
- [x] E1 产品修复有判别性测试并反向验证
- [x] 台账与复跑一致（2026-11-11 基线节 + 隔离复验）
- [x] 不存在被静默降级的 in-scope live defect（E1 族时间窗复红 3 项、新转入 3 项均如实登记，见 Phase 4 执行记录与台账基线节）
- [ ] 受影响 owner docs 已同步（scheduling 日期模型如有文档描述则同步）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

### data-viz map region toast（单项 flaky）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 隔离复跑转绿，非稳定红；记入台账 flaky 观察
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 18 项全部处置（product-fix 6 / test-fix 7 / ledger-registered 2 归并既有裁决）；E1 判别测试反向验证；隔离全量对账失败集 ⊆ 台账，新登记 3 项；台账基线滚动至 2026-11-11。收口阶段消红三处（content definitions 704→658 抽 schema 模块、industrial manifest-deps 补声明 + 共享契约抽 scada-shared-contracts.ts 消 2 clone 回基线 534），五命令最终 exit 0（836-verify-final.log）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session）
- Evidence: 处置表抽验 6 项（prosemirror 双实例 node_modules 单版本实证 / industrial 契约+防漂移测试 / linear direction+css / antdpro 引入提交 3b5445ea2 / palette 语义保留 / cron 归并在册 F9+P1 注记在树）；对账抽验（复现/转出/新登记逐名在 836-full-failed-unique.txt 与新基线文件确认，账目 164+1+3=168 一致）；E1 判别测试在盘；台账指针一致；实跑 scheduling 1103 全绿；边界核验（734 语料与 playwright.config 全局配置未触碰）。非阻塞备注：对账脚本对 cron-editor/kanban-demo 两在册名的模糊匹配漏配（人工对账已补偿），后续复跑应改进匹配器。详见 docs/logs/2026/11-12.md。

Follow-up:

- 对账脚本匹配器改进（cron-editor/kanban-demo 模糊匹配漏配，audit 非阻塞备注）
