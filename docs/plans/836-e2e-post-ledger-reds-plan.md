# 836 e2e 台账外新红收敛（deep-audit 2026-11-01 §7 E1/E2）

> Plan Status: active（停滞：立项 2026-11-01 后仅少量推进即停滞；收口归属见 docs/logs/2026/11-10.md，plan 864 G4 勘注）
> Last Reviewed: 2026-11-01
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

Status: planned
Targets: E2 各 spec 及其页面/组件

- Item Types: `Proof | Fix | Decision`

- [ ] 每项：定根因（`git log -S`/二分到引入提交）→ 判 product-fix 或 test-fix → 修复 → 该项 `--retries=0` 通过；product-fix 附判别性测试
- [ ] 路由清单：核对缺失 11 路由是否为有意新增页面，是则更新清单（test-fix），否则修路由注册
- [ ] 记录每项"引入提交 + 处置 + 证据"表

Exit Criteria:

- [ ] E2 全部项通过 `--retries=0`，处置表完整

### Phase 4 - 台账新基线

Status: planned
Targets: `docs/testing/e2e-baseline-ledger.md`

- Item Types: `Proof | Fix`

- [ ] Proof：隔离全量复跑一次，逐名对账：失败集 ⊆ 台账（在册项），无台账外失败
- [ ] Fix：台账追加「2026-11-01 基线」节（运行元数据、对账结论、本计划处置表、新转入/转出项）

Exit Criteria:

- [ ] 台账更新且与复跑结果一致

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

- [ ] 18 项全部处置（无"待定"）
- [ ] E1 产品修复有判别性测试并反向验证
- [ ] 台账与复跑一致
- [ ] 不存在被静默降级的 in-scope live defect
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

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待填写
- Evidence: 待填写

Follow-up:

- 待收口填写
