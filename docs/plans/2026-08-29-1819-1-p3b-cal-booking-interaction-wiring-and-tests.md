# P3b Cal.com 预约流程复刻 — 交互接线与测试

> Plan Status: completed
> Mission: ui-review
> Work Item: P3b. Cal.com 预约流程复刻 — 交互接线与测试
> Last Reviewed: 2026-08-29
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P3b 条目 + Phase Details P3 + Cross-Cutting 5/6/7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（§2.1 mock 写端点、§2.2 e2e 骨架、§4.1 Pi-b 档位、§5 两段式边界）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/cal-booking.md` §4 交互清单（I1–I15）；能力缺口对照 `docs/analysis/ui-review/C2-capability-gaps.md` G-F/G-C 行
> Related: `docs/plans/2026-08-29-1413-2-p3a-cal-booking-static-replica.md`（P3a，completed——本计划的全部静态落点与「联动可模拟性实测结论」来源，P3b 直接采用其接线路径）；`docs/plans/2026-08-29-1413-1-p2b-antdpro-interaction-wiring-and-tests.md`（Pi-b 先例：写端点先红后绿、I 清单逐条处置表、C2 回写义务）；`docs/plans/457-sundial-replica-interactions-plan.md`、`docs/plans/460-sundial-replica-full-interactions-reimplementation-plan.md`（交互接线先例）

## Purpose

消费 P3a 已落盘的 3 张 `cal-*` 静态复刻页、分析篇 §4 交互清单（I1–I15）与 P3a「联动可模拟性实测结论」，把 Pi-b 段义务收口：补全 mock 写端点、接线交互状态机（选日/时长/时区刷新槽位 → 选槽进确认 → 提交预约 → 成功态与重排/取消）、分析篇 §4 逐条 e2e 锁定（先红后绿），closure 时按 roadmap Cross-Cutting 5 以追加方式回写 C2，并把"预测缺口 vs 实测缺口"对照记入应用分析篇。

## Current Baseline

live 复核 2026-08-29，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean：

- P3a 全部静态产物在库：3 张 `apps/playground/src/complex-pages/page-schemas/cal-booking.json` / `cal-confirm.json` / `cal-success.json`（category `app-replica` 已注册，`complex-pages-model.ts`）；`apps/playground/src/cal-replica/cal-replica.css`（`--cal-*` 令牌声明于 `.cal-root, .cal-dialog` 双作用域，品牌黑换名 `--cal-action*`，light-only）；`shared/mock-backend-cal.ts`（278 行）；`shared/showcase-env.ts`（691 行，≤700 红线，`Cal__` 读端点分支已委托）；`tests/e2e/cal-replica-visual.spec.ts`（248 行，3 条初屏用例）；`__tests__/cal-mock-backend.test.ts`（12 条单测）。
- **mock 读端点 get-only、零写端点**：`Cal__event`（活动 meta + 时长档）、`Cal__slots`（按 date/duration/timezone 参数过滤槽位，含上午/下午/晚上分组与 selected/attention/expired 状态样本）。
- **cal-booking.json 现有 data-source 名**：`event` 与 `slots`（schema 实测）——`refreshSource` 的 `targetId` 即这两个 name；slots 端点已按 `date/duration/timezone` 查询参数过滤（mock 侧参数支持在库）。
- **已接线（P3a 落地并有 e2e 证明）**：时长 tabs 静态选中态（`cal-booking-duration`）、月历月视图（`cal-booking-calendar`）、时区 select（`cal-booking-timezone`，searchable）、12h/24h switch 静态（`cal-booking-clock-format`）、槽位三态 CSS + 三分支 visible 双渲染（`cal-booking-slot/-selected/-attention/-expired`）、骨架屏静态样本（`cal-booking-skeleton`）、确认页表单字段族与错误样本（`cal-confirm-form`、`cal-confirm-error-sample` 静态）、成功页四外链占位 href（`cal-success-link-*`）。
- **静态未接线按钮/交互**（本计划接线对象，schema testid 实测清单）：`cal-confirm-guest-add`/`cal-confirm-guest-remove`（嘉宾增删）、`cal-confirm-submit`/`cal-confirm-back`（提交/回退）、`cal-success-copy-link`（复制链接）、`cal-success-reschedule`/`cal-success-cancel`（重排/取消）、月历选中日期 ↔ 槽位刷新链路（未绑定）、时长/时区切换刷新链路（未绑定）。
- **P3a 实测接线路径（本计划直接采用，file:line 证据见 P3a plan「实测结论」节）**：
  1. 选中日期写入 scope：calendar 声明 `dateOwnership: 'scope'` + `dateStatePath: 'calDate'`（`packages/flux-renderers-scheduling/src/calendar/calendar.tsx:109-115`；声明面 `calendar.types.ts:113-119`，`onDateChange` 同步派发 `{ date, view }`）。
  2. slots data-source 的 ajax url 模板 `"/r/Cal__slots?date=${calDate}&duration=${calDuration}&timezone=${calTimezone}"` 在每次 refresh 时按当前 scope 重新物化（`packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:279-283`；`prepareApiRequestForExecution` 见 `request-runtime.ts:370-389`，`materializeApiRequest` :339）。
  3. `onDateChange`/tabs `onChange`/时区 `onChange` 派发 `{ action: 'refreshSource', targetId: 'slots' }`（`packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:255-275`；`runtime-actions-advanced.test.ts:175` 实证按 name 命中）。
  4. P3a 已知形态限制（G-C 证据）：calendar 月视图为资源时间轴横条（`calendar/components/calendar-month-view.tsx:148-243`），非 Booker 式 6 周竖网格——本计划不由此改 renderer 包，形态证据随 C2 回写。
  5. 双触发注记：url 模板含 `${calDate}/${calDuration}/${calTimezone}` 后，scope 写入即会经 data-source 的 scope 依赖自动刷新内建（`source-registry.ts:292-322`，含 dedup/cascade 护栏）触发 refresh，与显式 `refreshSource` 派发语义重叠——接线时二选一或显式注记，避免 e2e 对刷新来源误判。
- **异步刷新策略（P3a 实测结论候选 2）**：定时 refetch 由 data-source `interval` 内建承载（`createDataSourceController` input `interval`/`stopWhen`）；**窗口聚焦 refetch 无内建支持**——本计划实测判断其模拟必要性，结论随 C2 回写（见 Phase 2 Decision）。
- **surface 与导航原语在库**：drawer 型别（`packages/flux-renderers-basic/src/surface-renderer-definitions.ts:197`，I14 day sheet 载体）；`navigate` action（`sundial-detail.json:73`、`antdpro-result.json:80` 先例）；ajax `messages` 反馈（`antdpro-list.json:95` 等先例）；**无剪贴板类 action**（动作词汇实测：ajax/navigate/component:refresh/openDialog/closeSurface/refreshSource/form submit/reset——I11 复制链接需 Decision 裁定模拟路径）。
- **已知能力缺口约束接线深度**（C2 登记在案，接线时不得绕道 renderer 包改码）：input-phone 原生 tel 语义缺口（电话字段已由 input-text 承载）；`timezoneSelector` 声明未消费（时区选择器已由独立 select 承载）；槽位三态 option-row 语义（G-F）与月/周多视图（G-C）产品化归 D1 流程。
- 治理线：`showcase-env.ts` 现 691 行（700 行 MUST-split 红线）——新增写端点分支体必须全部下沉 `mock-backend-cal.ts`（现 278 行，<500 治理线），showcase-env 仅允许 ≤10 行胶水；`mock-backend.ts` 零触碰。
- roadmap Cross-Cutting 5：Pi-b closure 必须以追加方式回写 C2（不重开 C2 状态）——本计划携带的回写输入：P3a 实测的 G-F/G-C 证据、候选 2 聚焦刷新裁定结论、input-phone/timezoneSelector 缺口注记、以及本计划执行期新撞见的缺口。

## Goals

- mock 写端点补全并先红后绿锁定：选槽会话指针、提交预约（含失效槽位失败分支）、取消预约，全部 in-memory 会话内可观察（沿 P2b `AntdPro__selectOrder`/sundial settings 写后端先例）。
- 分析篇 §4 交互清单 I1–I15 **逐条处置落字**（接线锁定 / 既有内建 e2e 锁定 / 显式裁决），Pi-b 档位 = `必须自动化`（P1 README §4.1），核心交互每条 ≥1 条先红后绿 e2e。
- P3a Deferred 项 I14（移动端 day sheet 窄屏形态）在本计划收口：底部 drawer 单列形态接线 + e2e。
- closure 时完成 C2 追加回写（G-F 槽位三态联动实测、G-C 月视图形态实测、候选 2 聚焦刷新裁定、input-phone/timezoneSelector 注记引用）+ 分析篇"预测缺口 vs 实测缺口"对照落字（沿 P2b §4.1 先例追加进 `cal-booking.md`）。
- 全量验证 full-green（typecheck/build/lint/test + 目标 e2e + `pnpm check` 零新红）。

## Non-Goals

- 不改 `packages/` 下任何 renderer/ui/runtime 代码；槽位三态 option-row（G-F）、月/周多视图（G-C）、input-phone、聚焦刷新等缺口的产品化归 D1/C2 流程。
- 不新增 schema 页面文件（3 张 `cal-*` 页面切分维持 P3a 裁定）；不做 Cal.com 后台管理面（P3a Non-Goals 已排除）。
- 不做 slot reservation 服务端锁语义（P3a 已裁定 `out-of-scope improvement`：复刻为静态演示 + mock 刷新，不承诺续约锁）；I15 日历叠加维持 P3a 裁定不接线。
- 不做暗色适配（P3a 差异声明已裁定 light-only）。
- 不重新评审 R1 分数、不做 P3 名单变更、不重开 C2 初版裁决表。

## Scope

### In Scope

- `apps/playground/src/complex-pages/shared/mock-backend-cal.ts`（追加写操作 + 会话指针态）
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（仅 ≤10 行胶水，如分支签名需透传；预期主要改动在 mock-backend-cal.ts 内）
- `apps/playground/src/complex-pages/page-schemas/cal-booking.json`、`cal-confirm.json`、`cal-success.json`（仅既有 3 张内接线动作/补 testid/补 visible·disabled 表达，不新增页面文件）
- `apps/playground/src/complex-pages/__tests__/cal-mock-backend.test.ts`（写操作单测）
- `tests/e2e/cal-replica-visual.spec.ts`（追加交互用例；落地前若将超 ~500 行则按 P1 README §2.2 拆分规则新建 `tests/e2e/cal-replica-interactions.spec.ts` 承载交互用例——现 248 行 + 预估交互用例体量，预计触发拆分）
- `docs/analysis/ui-review/C2-capability-gaps.md`（§3 追加区回写，closure 时）
- `docs/analysis/ui-review/P1-reference-apps/cal-booking.md`（仅追加 §4.1「预测 vs 实测」对照与事实勘误）
- roadmap Phase Status 区 P3b `todo`→`planned`（draft review 通过后）；closure audit 通过后 `planned`→`done`

### Out Of Scope

- `packages/` 全部代码；`tests/e2e/` 中非本 spec 的文件；`docs/analysis/` 既有文档的结构性改写；`mock-backend.ts`；新增 playground schema 页面。

## Failure Paths

> 涉及写端点与交互状态机，列最小集。

| 可测场景编号      | 触发                             | 行为                       | 可重试 | 用户可见表现                                                         |
| ----------------- | -------------------------------- | -------------------------- | ------ | -------------------------------------------------------------------- |
| cal-book-expired  | 提交的槽位为 expired 状态        | 写端点返回失败分支，不落库 | 是     | 错误 message + 「选择其他时段」提示，可返回槽位视图（I9 e2e 锁定）   |
| cal-book-miss     | 提交 payload 缺姓名/邮箱等必填   | 不发写请求（内建校验拦截） | 是     | 字段红环 + 错误文案（I7 e2e 锁定）                                   |
| cal-select-miss   | selectSlot 的槽位 id 无匹配      | 返回失败，会话指针不更新   | 是     | 停留槽位视图，可重选                                                 |
| cal-cancel-miss   | 取消预约的 booking id 无匹配     | 返回失败分支，状态不翻转   | 是     | message 错误提示，可重试                                             |
| cal-slots-refresh | 刷新参数（日期/时长/时区）无槽位 | 端点返回空数组             | 是     | 分组空态文案「该时段暂无可用预约」（P3a 已落库，I2/I3 刷新路径复用） |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（P1 README §4.1 Pi-b 档：分析篇 §4 交互清单逐条有 e2e 断言，交互契约无一豁免；先红后绿——新接线动作的 e2e 在接线前先断言失败或对既有内建行为补锁定断言）。档位口径注记（沿 P2b）：「逐条有断言、无一豁免」指不允许**未处置的静默跳过**；处置表中显式裁决为 out-of-scope 的条目（I15）属"逐条有处置"，不构成对档位的违反。最低证明：`cal-mock-backend.test.ts` 写操作单测全绿 + §4 处置表中每条"接线锁定/内建锁定"项 ≥1 条程序化 e2e 断言（testid 可见性/数据变化/getComputedStyle；截图仅视觉附件）。I14 窄屏用例经 `setViewportSize` 切换视口承载。

## Execution Plan

> 顺序 Phase。Phase 1 写端点基座先行（后续接线全部依赖）；Phase 2–4 按页面接线；Phase 5 回写与自查收口。

### Phase 1 - mock 写端点基座（先红后绿）

Status: completed
Targets: `apps/playground/src/complex-pages/shared/mock-backend-cal.ts`、`shared/showcase-env.ts`（≤10 行胶水，如需）、`__tests__/cal-mock-backend.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Decision——写端点语义裁定：post 端点定名与契约（候选集，Phase 内裁定终态）——`Cal__selectSlot`（槽位 id + 日期/时长/时区 → 记录会话当前选中槽位指针，供确认页无参读取，沿 P2b `AntdPro__selectOrder` 先例）、`Cal__book`（booking 表单 payload + 槽位 id → 成功落库返回 booking id；槽位为 expired 状态 → 失败分支 cal-book-expired）、`Cal__cancelBooking`（booking id + reason → 状态翻转 cancelled）；miss 行为按 Failure Paths 裁定并落字本计划
- [x] Decision——I5 选槽携带机制裁定：确认页摘要数据（选中槽位时间/时长/时区）读取路径——候选 ①`Cal__selectSlot` 写会话指针 + 确认页 data-source 无参读取（P2b 跨页取数先例）；②页内 dialog 承载确认步骤（sundial task-detail-dialog 先例，需改页面切分语义）；裁定结论落字，Phase 3 数据一致性断言据此执行
- [x] Proof——写操作单测先红后绿：每端点 ≥2 条（成功路径 + Failure Path）、会话内持久性断言（book 成功后 cancel 翻转、expired 槽位恒失败）——先于 Fix 编写，对未实现分支断言失败
- [x] Fix——`mock-backend-cal.ts` 扩展 post 分支：写操作修改 in-memory 预约态，同一 session 内跨页可观察；`showcase-env.ts` 零改动或仅 ≤10 行胶水且不回涨 700 行红线；`mock-backend.ts` 零触碰

> **Phase 1 Decision 注记（写端点契约落字，2026-08-29）**
>
> - `Cal__selectSlot`（post）：body `{slotId, timezone?}`。slotId 编码 `<date>_<duration>_<time24>`（如 `2026-09-03_30_10:00`，mock 端按编码重算槽位数据集定位 state——槽位数据确定性生成故重算稳定）；命中 → 记录会话指针（date/duration/timezone/time24/period/state 全量快照）返回 `{ok:true, slotId, state}`；未命中（含编码非法）→ `status:1 {ok:false}` 指针不更新（cal-select-miss）。expired 槽位 UI 侧 disabled 不可点，但端点不拒绝（e2e 经 mock 强制失效路径承载 cal-book-expired，见 Phase 3）。
> - `Cal__selectedSlot`（get，无参）：返回指针草稿 `{active, slotId, date, dateText, duration, durationKey, durationText, time, time24, timeText, period, state, timezone, timezoneLabel, guests, eventTitle, hostName}`；无指针 → inactive 兜底样本（2026-09-03 × 30min × 10:00，与 `event.preview` 同源），直访确认页/预约页不崩（沿 P2b `AntdPro__orderDetail` → A1001 兜底先例）。
> - `Cal__book`（post）：payload `{name, email, phone?, notes?, companySize, focusArea, channels?, guests?}` + 会话指针 → 追加 `CalBookingRecord`（id `BK<seq>`、status `confirmed`、payload + 槽位快照 + dateText/timeText/durationText/timezoneLabel + 会话嘉宾列表）返回 `{ok:true, id, status}`；指针 state=expired → `status:1` 不落库（cal-book-expired）；缺 name/email → `status:1`（服务端兜底，客户端校验归 I7）；`requiresConfirmation: true` 入参 → status `pending`（I8 pending 变体的单测可达路径，UI 恒不传该标记 → 恒走确认态，成功页徽章表达式兜底见 Phase 4）。
> - `Cal__cancelBooking`（post）：`{id?, reason?}`；缺 id 取最新预约；命中 → status 翻转 `cancelled` + reason 落库，返回 `{ok:true, id, status}`；未命中 → `status:1` 状态不翻转（cal-cancel-miss）。
> - `Cal__addGuest` / `Cal__removeGuest`（post，I6 会话嘉宾列表）：add 从确定性池追加（上限 30，超限 `status:1`）；remove 按下标删除（越界 `status:1` no-op）；`Cal__shareLink`（get）：`{ok:true, url:'#/complex-pages/cal-booking'}`（I11 裁定载体，Phase 4 落终态）。三端点为 Phase 3 I6「嘉宾增删」与 Phase 4 I11 的机制载体，属交互清单合同内的新增写端点（I6 处置见 Phase 3 Decision 注记）。
> - **I5 携带机制裁定 = 候选 ①（selectSlot 会话指针 + 确认页 data-source 无参读取）**。弃候选 ②：dialog 承载确认步骤需推翻 P3a 已裁定的三页切分语义。Phase 3 数据一致性断言按指针机制执行（选中槽位 → 确认页摘要三字段一致）。
> - 实现落点：全部分支体在 `mock-backend-cal.ts`（494 行 <500 治理线）；`showcase-env.ts` **零改动**（691 行，`Cal__` 分支委托本就透传 method/body）；`mock-backend.ts` 零触碰（463 行）。
> - Proof 先红后绿证据：10 条写端点单测先行编写并跑红（10 failed / 221 passed），Fix 后全绿（`pnpm --filter @nop-chaos/flux-playground test -- --run cal-mock-backend` 231/231，2026-08-29 实测）。

Exit Criteria:

- [x] 写端点契约（端点名/入参/miss 行为）与 I5 携带机制已落字本计划 Decision 注记
- [x] `pnpm --filter @nop-chaos/flux-playground test -- cal-mock-backend` 全绿且含新增写操作用例
- [x] `showcase-env.ts` ≤700 行、`mock-backend.ts` 零改动（`wc -l` 实测记录于本计划）

### Phase 2 - cal-booking 页接线（I1–I5 + I14）

Status: completed
Targets: `page-schemas/cal-booking.json`、`tests/e2e/cal-replica-visual.spec.ts`（或新建 interactions spec，按 500 行阈值裁定）

- Item Types: `Fix | Decision | Proof`

- [x] Fix——I2 选日刷新：calendar 声明 `dateOwnership: 'scope'` + `dateStatePath: 'calDate'` + `onDateChange` → `refreshSource` targetId `slots`；slots url 改模板物化（date/duration/timezone 参数）；选中日期标签 `cal-booking-selected-date` 随 scope 更新
- [x] Fix——I1 时长 tab 切换：tabs `onChange` → 更新 scope `calDuration` + `refreshSource` slots，槽位按新时长 refetch；骨架屏过渡表达按 Decision 裁定（候选：data-source loading 态表达式绑定 `cal-booking-skeleton` visible；若无 loading 表达通道则骨架维持静态样本 + 刷新结果断言，落字理由）
- [x] Fix——I3 时区切换：select `onChange` → 更新 scope `calTimezone` + `refreshSource` slots；`cal-booking-slot-timezone` 标签更新；12h/24h switch 切换槽位时间显示格式（schema 表达式或 mock `format` 参数，Phase 内裁定并落字）
- [x] Proof——I4 月份导航内建锁定：calendar ←/→/Today 既有行为 e2e 锁定（月头文本翻页变化、Today 回当月）
- [x] Fix——I5 选槽位 → 进确认：槽位按钮（非 expired）→ 按 Phase 1 裁定机制（selectSlot 指针 + navigate `cal-confirm`，或页内 dialog）进入确认步骤；expired 槽位不可点（disabled 既有）
- [x] Decision——I2 后半 interval 轮询与聚焦刷新裁定：data-source `interval` 是否接线（Booker 实证 5 分钟自动 refetch）——e2e 稳定性考量下候选 ①interval 配置接线 + e2e 仅断言配置存在与手动刷新路径（轮询周期断言归 mock 单测）②interval 不接线 + 登记 C2 注记；窗口聚焦 refetch 无内建支持——实测判断模拟必要性，结论落字并随 C2 回写
- [x] Fix——I14 移动端 day sheet：窄屏（view port ≤ 断点，`responsive` 容器或媒体可见性表达，Phase 内裁定）点日期格 → 底部 drawer 单列槽位列表（drawer 型别，`surface-renderer-definitions.ts:197`）；桌面双栏形态零回归；e2e 经 `setViewportSize` 切窄视口断言 drawer 打开与单列槽位
- [x] Proof——上述每条接线 ≥1 条程序化 e2e（先红后绿）；桌面既有 3 条初屏用例零回归

> **Phase 2 Decision 注记（2026-08-29）**
>
> - **刷新机制二选一裁定 = scope 依赖自动刷新（双触发注记的"二选一"）**：slots data-source url 改模板物化 `date=${calDate ?? selected?.date ?? "2026-09-03"}&duration=${calDuration ?? selected?.duration ?? 30}&timezone=${calTimezone ?? selected?.timezone ?? "Asia/Shanghai"}` + 显式 `dependsOn: [calDate, calDuration, calTimezone, selected]`，选日/时长/时区变更经 scope 写入触发内建自动刷新（`source-registry.ts:292-322` dedup/cascade 护栏）。**不派发显式 refreshSource**。理由：①时区 select 与 12h/24h switch 为 form 字段，无 schema 级 onChange action 钩子（字段 onChange 只做 scope 写入，`field-handlers.tsx`），显式派发路径对二者不存在；②统一单一刷新机制消除双触发重叠；③e2e 断言数据结果（标签/payload 变化）而非刷新次数，刷新来源不可误判。calendar 仍声明 `dateOwnership: 'scope'` + `dateStatePath: 'calDate'`（onDateChange 内建 scope.merge 承载日期写入）。
> - **I2 选日手势注记（G-C 形态限制）**：月视图为资源时间轴横条，日期格点击无内建"选中日期"语义（仅长按拖拽创建事件）——选日手势由内建月份导航（‹/›/今日）承载：导航触发的日期变更同样经 onDateChange 写 scope → 模板物化 → 槽位 refetch，选中日标签随 payload 更新。点格选择形态缺口随 G-C 回写（Phase 5）。
> - **I1 骨架过渡裁定 = 骨架维持静态样本 + 刷新结果断言**：mock 即时返回下加载态不可观察，loading 表达式绑定会在真刷新中产生骨架闪断；e2e 以 refetch 结果（durationText 标签、选中样本随档位消失/恢复、失效样本时间前移）承载 I1 证明。
> - **I3 12h/24h 裁定 = schema 表达式**：槽位按钮 label 绑 `${cal24h === false ? $slot.item.time : $slot.item.time24}`（mock 数据集同时携带 12h/24h 形态，零 mock 改动）；PAGE_DATA `cal24h: true` 维持默认 24 小时制（P3a 初屏零回归）。
> - **I2 后半裁定 = 候选 ①（interval 接线）**：slots source 声明 `interval: 300000`（Booker 实证 5 分钟轮询）；配置存在性由 schema 单测断言（`cal-mock-backend.test.ts` 'Cal booking schema wiring'），e2e 仅断言手动刷新路径（避免轮询时序依赖）；**窗口聚焦 refetch 裁定 = 不模拟**（无内建支持，P3a 实测结论候选 2 维持），随 C2 回写登记（Deferred But Adjudicated 已有 watch-only 条目）。
> - **I14 裁定 = responsive 容器双变体 + 底部 drawer**：右栏包 `responsive`（`max: 'md'` 移动变体 = 选中日头 + day sheet 触发按钮 + openDrawer `side: 'bottom'` 单列槽位列表；`min: 'md'` 桌面变体 = 既有槽位面板 + 新增 `cal-booking-slot-duration` 时长标签）；断点 md=768。"点日期格"手势同受 G-C 限制 → 触发按钮替代（C2 回写携带）。
> - **I5 接线**：三支可点槽位（available/selected/almost-full）按钮 onClick → ajax post `Cal__selectSlot`（`slotId: ${$slot.item.slotId}` + 当前时区）→ `then` navigate `cal-confirm`；确认页新增 `selected` data-source（无参读取指针）并绑定摘要三字段（durationText/dateText/timeText，fallback event.preview 保直访形态）。expired 分支维持 disabled（既有）。
> - **先红后绿证据**：首轮 e2e（接线前）5 failed / 1 passed（01/03/04/05/06 红；02 I4 内建锁定即时绿，符合"对既有内建行为补锁定断言"口径），接线后 6/6 全绿；`cal-replica-visual.spec.ts` 3/3 零回归；schema wiring 单测 2 条新增（233/233）。

Exit Criteria:

- [x] 选日/时长/时区任一变更 → 槽位列表按新参数 refetch（e2e 断言槽位数据变化与 selected-date/slot-timezone 标签更新）
- [x] 选槽位可进确认页且携带选中槽位数据（按裁定机制断言一致性）
- [x] I14 窄屏 drawer 形态 e2e 绿，桌面双栏零回归
- [x] I1–I5 处置结论逐条落字本计划（含 interval/聚焦刷新裁定与骨架过渡裁定）

### Phase 3 - cal-confirm 页接线（I6/I7/I8/I9 + I13 回退）

Status: completed
Targets: `page-schemas/cal-confirm.json`、`tests/e2e/cal-replica-visual.spec.ts`（或 interactions spec）

- Item Types: `Fix | Proof`

- [x] Fix——I6 嘉宾增删：`cal-confirm-guest-add` → 追加嘉宾邮箱行（机制 Phase 内裁定：scope 数组 + loop 重复字段组，或既有重复字段原语）；`cal-confirm-guest-remove` → 删除对应行；行集与 `cal-confirm-guest-row/chip` testid 对齐
- [x] Proof——I7 表单校验内建锁定：必填空提交 → 不发写请求 + 字段红环 + `cal-confirm-error-text` 类错误文案（既有静态样本旁路，e2e 锁定真实校验路径）
- [x] Fix——I8 提交预约：`cal-confirm-submit` → form submit → `Cal__book`（payload 含姓名/邮箱/备注/电话/嘉宾/自定义问题答案 + 选中槽位）→ 成功 navigate `cal-success`；pending 变体路径裁定（mock 返回需确认标记时成功页 `cal-success-pending-badge` 可见，或恒走确认态——落字）
- [x] Fix——I9 槽位失效：选 expired 样本路径不可达时（P3a 静态已置灰），经 mock 强制失效路径验证 `Cal__book` 失败分支：错误 message + 「选择其他时段」提示 + 返回槽位视图（该槽维持置灰）
- [x] Fix——I13 步骤回退：`cal-confirm-back` → navigate 回 `cal-booking`，已选时长/日期/时区状态保留（scope/会话态断言）；成功页 → 重排回槽位视图预填同语义
- [x] Proof——上述每条 ≥1 条程序化 e2e（先红后绿）；`cal-confirm` 既有初屏用例零回归

> **Phase 3 Decision 注记（2026-08-29）**
>
> - **I6 机制裁定 = 会话端点 + data-source loop（非 form 重复字段组）**：guests 属 mock 会话态（Phase 1 `Cal__addGuest`/`Cal__removeGuest` 端点 + `Cal__selectedSlot` 草稿 `guests` 字段），guest 行 = loop 渲染 `${selected?.guests}`（`$slot.item` 邮箱 + `$slot.index` 删行入参），增删后 `then → component:refresh`（componentId `cal-selected-source`，data-source 节点显式 id）回读。**实测撞墙记录**：form 内按钮对页面级 source 派发 `refreshSource` 必然 `Source not found`（scoped lookup 只查按钮所在 scope 桶、不走父链，`source-registry.ts`）——跨树刷新走 `component:refresh` + `componentId`（quick-reference 既定姿势），素材行已随 C2 回写 ④ 登记。
> - **I8 pending 变体裁定 = 恒走确认态**：UI 恒不传 `requiresConfirmation`（Phase 1 契约），pending 路径由端点级单测承载（mock 单测 requires-confirmation 用例）+ Phase 4 成功页徽章表达式兜底（`booking?.status` 三态绑定）。
> - **I9 mock 强制失效路径 = opt-in 端点同路径钩子**：expired 样本 UI 侧 disabled 无点击路径，`mock-backend-cal.ts` 增设 `__calTestHooks.selectSlot`（specs 经 `addInitScript` 预创建，production 永不设置 = no-op，沿 `__antdproEndpointCalls` 计数钩子先例），钩子走 `Cal__selectSlot` 端点同路径写指针 → `Cal__book` 失败分支可达。
> - **提交/失败反馈链落字**：`submitAction.messages` = success「预约提交成功」/ failed「该时段已失效，请选择其他时段」；`onSubmitSuccess` navigate cal-success / `onSubmitError` navigate cal-booking，二者均 `control: { debounce: 1200 }`（页级 host Toaster 随页卸载，回写 ③ 同源补丁）；校验失败走 `onValidateError`（schema 不声明 → 留页 + 字段红环），与 `onSubmitError` 语义隔离（form-runtime-submit-flow 实证）。
> - **I13 状态保留口径**：回退后时长档/选中日/选中槽位经会话指针回填可断言（tabs `value: selected?.durationKey`、槽位 selected 标记、dateText 标签，e2e 11）；时区回 PAGE_DATA 默认（scope 不跨页，会话指针仅携带时区到确认页摘要）。
> - **先红后绿证据**：新增 5 条 schema/钩子单测 + 5 条交互 e2e 先行跑红（unit 7 failed / 233 passed；e2e 9 failed / 7 passed——01–06 与 I10 href 锁定即时绿，符合既有内建锁定口径），接线后 unit 240/240、e2e interactions 16/16 全绿。

Exit Criteria:

- [x] 嘉宾增删可断言（追加行出现/删除行消失）
- [x] 提交链路全绿：合法 payload → `Cal__book` → 成功页；失效槽位 → 失败分支可见
- [x] 回退链路状态保留可断言；I6–I9/I13 处置结论逐条落字

### Phase 4 - cal-success 页接线（I10/I11/I12）

Status: completed
Targets: `page-schemas/cal-success.json`、`tests/e2e/cal-replica-visual.spec.ts`（或 interactions spec）

- Item Types: `Fix | Decision | Proof`

- [x] Proof——I10 加入日历内建锁定：四外链既有占位 href 的链接行为 e2e 锁定（`toHaveAttribute('href', ...)`，P3a 已断言存在性则本条补 target/可点性口径，落字）
- [x] Decision——I11 复制链接裁定：无剪贴板 action 词汇下的模拟路径——候选 ①`cal-success-copy-link` → ajax 无副作用端点（如 `Cal__shareLink` 返回预约链接）+ 成功 message「链接已复制」反馈（语义模拟，实际剪贴板写入不做）；②按钮维持静态 + 剪贴板能力缺口登记 C2 回写；裁定结论与理由落字
- [x] Fix——I12 重排/取消：`cal-success-reschedule` → navigate 回 `cal-booking` + 预填提示（reschedule 语义沿 I13 状态保留路径）；`cal-success-cancel` → 确认 dialog（含原因 textarea + `[secondary, primary]` 按钮序，沿 R3 沉淀规范）→ `Cal__cancelBooking` → 状态翻转反馈 + navigate
- [x] Proof——上述每条 ≥1 条程序化 e2e（先红后绿）；`cal-success` 既有初屏用例零回归

> **Phase 4 Decision 注记（2026-08-29）**
>
> - **I10 口径落字**：P3a 已断言存在性 + href 不指向真实日历端点；本条补 `toHaveAttribute('href', '#/complex-pages/cal-success')` 精确断言 + `toBeEnabled()` 可点性口径（e2e 12）。真实日历端点拼接属宿主能力，占位 href 维持。
> - **I11 裁定 = 候选 ①（语义模拟）**：copy-link 从静态 flex 升级为 `button`（icon link + label），onClick → `Cal__shareLink`（get，无副作用端点，Phase 1 已落）+ `messages.success`「链接已复制」；实际剪贴板写入不做——动作词汇无 clipboard 通道，语义模拟保住「按钮有真实行为 + 反馈成对可见」的模板感治理底线，能力缺口经 C2 回写 ④ 素材行（RendererEnv clipboard 通道候选，同 print 族）登记。理由：候选 ②（维持静态）会让成功页唯一主按钮成为「demo 占位」，违反 P1 README §4.2 自查线。
> - **I12 落字**：reschedule 从静态 text 升级为 button + navigate cal-booking，预填语义沿 I13 会话指针回填（e2e 14 断言 45 分钟档 + 09:00 选中槽位恢复）；cancel 从静态 text 升级为 button + `openDialog`（`cal-cancel-dialog`，`closeOnSubmit` + dialog 级 `onSubmitSuccess` navigate + debounce 1200），dialog body = surface form（`submitScope: 'surface'`，reason textarea）+ actions `[保留预约(cal-btn-outline, secondary), 确认取消(cal-btn-primary, primary)]` 按钮序；`Cal__cancelBooking` `messages` = success「预约已取消」/ failed「没有可取消的预约」（cal-cancel-miss 分支 e2e 16 锁定）。状态翻转会话内可观察：成功页新增 `booking` data-source（`Cal__latestBooking`），pending 徽章改 `${booking?.status}` 三态绑定（直接访问兜底「待确认」零回归；取消后徽章「已取消」e2e 15 断言），摘要三字段改 `${booking?.…?? event?.preview?.…}` 兜底绑定（I8 一致性断言载体）。CSS 新增仅 `.cal-btn-outline`（cal-replica.css scope 专用类）。
> - **先红后绿证据**：3 条 schema 单测 + 5 条 e2e 先行跑红（同 Phase 3 红轮），接线后全绿（unit 240/240；e2e interactions 16/16 + visual 3/3 零回归）。

Exit Criteria:

- [x] I10–I12 处置结论逐条落字（含 I11 裁定）
- [x] 取消链路（确认框 → 写端点 → 状态翻转 → 导航）e2e 绿
- [x] 重排回槽位视图且状态保留 e2e 绿

### Phase 5 - C2 回写、分析篇对照与自查收口

Status: completed
Targets: `docs/analysis/ui-review/C2-capability-gaps.md`（§3 追加区）、`docs/analysis/ui-review/P1-reference-apps/cal-booking.md`（§4.1 追加）、本计划

- Item Types: `Proof | Decision`

- [x] C2 追加回写（roadmap Cross-Cutting 5，只追加不重开初版裁决）：G-F 槽位三态联动实测证据（三态 CSS + visible 双渲染 + scope 刷新链路成立，option-row 语义缺口维持）、G-C 月视图形态证据（资源时间轴横条 vs 6 周竖网格，P3a 实测 + 本计划接线复核）、候选 1 联动容器降级结论（组合技巧级，P3a 已判）、候选 2 聚焦刷新裁定结论（Phase 2 输出）、input-phone/timezoneSelector 缺口注记引用、I11 剪贴板缺口（若裁定登记）
- [x] 分析篇 §4.1「预测 vs 实测」对照落字（沿 P2b 先例追加进 `cal-booking.md`）：§5 能力映射逐行复核，实测与预估不符处仅做事实勘误（无矛盾则不动）
- [x] AI 模板感自查（P1 README §4.2）：接线后无"demo 占位"按钮——hover/选中/空态/加载/错误态成对可见；数据经 mock 端点流动；静态 rail 类清单核对
- [x] 样式契约自查（§4.3）：零 renderer 包改动；变更面核查 `git status --porcelain` 仅含 In Scope 文件；新 CSS（如 drawer day sheet 形态所需）仅落 `cal-replica.css` scope 专用类
- [x] roadmap Phase Status 区 P3b 状态推进核对（`planned`，done 待 closure audit）

> **Phase 5 自查记录（2026-08-29）**
>
> - **C2 回写落点**：`C2-capability-gaps.md` §3 追加「回写 ④」——G-F 三态联动实测（CSS 形态 L1 已证 + scope 刷新链路 P3b 新证，option-row 语义缺口维持）、G-C 月视图形态差（资源时间轴横条 vs 6 周竖网格 + 降级承载记录）、候选 1 降级组合技巧级（不新增行）、候选 2 裁定落字（interval 接线 / 聚焦刷新不模拟，watch-only）、input-phone/timezoneSelector 注记引用、I11 剪贴板素材行（RendererEnv clipboard 通道候选）+ 执行期新素材行（refreshSource scope 桶限定 finding、toast debounce 复现引回写 ③）。初版裁决表零改动。
> - **分析篇对照落点**：`cal-booking.md` §4.1 追加 I1–I15 逐条对照表（终态 W/B/A + e2e 锚点）+ 5 条事实勘误行（嘉宾增删保真度上调高、wizard 未用、异步数据维度确证、I9 反馈通道补充、I5 reservation 差异维持）+ §7 两候选收口结论。
> - **AI 模板感自查 = 通过**：①无 demo 占位按钮——成功页 copy-link/reschedule/cancel 三控件全部由静态形态升级为接线动作（Phase 4 裁定），确认页 add/remove/submit/back 全部有真实行为与反馈；②状态成对——hover（cal-replica.css 8 处 `:hover` 规则含槽位/按钮/链接）、选中（slot-selected 黑底 + tabs data-active）、空态（分组「该时段暂无可用预约」+ 嘉宾空列表）、加载（骨架样本 + interval 声明）、错误态（校验红环 + field-error + failed toast）全部可见；③数据流动——摘要/徽章/嘉宾/槽位/预约记录全部经 `Cal__*` 端点（get 6 + post 5），schema 无写死展示数组（纯静态 rail：外链占位、reschedule 提示条、骨架形态样本，属 P3a 已裁定静态形态）；④视觉原创性——`--cal-*` 令牌架构复刻维持 P3a 差异声明（品牌黑换名、light-only 明示于 CSS 头注），零新硬编码色。
> - **样式契约自查 = 通过**：零 `packages/` 改动（`git status --porcelain` 实证，变更面 = mock-backend-cal.ts / cal-confirm.json / cal-success.json / cal-booking.json（Phase 2）/ cal-mock-backend.test.ts / cal-replica-interactions.spec.ts / cal-replica.css / e2e artifacts / C2 / cal-booking.md / roadmap / 本计划 + daily log，全部 In Scope 或其派生记录；`mock-backend.ts` 与 `showcase-env.ts` 零触碰）；新 CSS 仅 `.cal-btn-outline` 一条落 `cal-replica.css`（Phase 4 I12 secondary 按钮所需），scope 专用类、零 renderer 内部依赖。
> - **roadmap 状态核对**：Phase Status 区 P3b 行当前 `planned`（draft review 推进记录在案）；`planned`→`done` 随 closure audit 通过后的关闭编辑落至 roadmap（Closure Gates 项）。

Exit Criteria:

- [x] C2 追加区含本计划全部回写输入（逐条可指认）
- [x] `cal-booking.md` §4.1 对照节落字
- [x] 两维自查记录落字（通过/打回处置结论）
- [x] 变更面核查记录落字

## 交互清单处置表（I1–I15 逐条）

| #   | 交互             | 处置                                            | 落点                  |
| --- | ---------------- | ----------------------------------------------- | --------------------- |
| I1  | 时长 tab 切换    | 接线锁定（Phase 2）                             | 刷新 + 骨架裁定       |
| I2  | 选日刷新         | 接线锁定（Phase 2；interval/聚焦刷新 Decision） | refreshSource 链路    |
| I3  | 时区切换         | 接线锁定（Phase 2）                             | 刷新 + 标签 + 12h/24h |
| I4  | 月份导航         | 内建锁定（Phase 2）                             | calendar 既有         |
| I5  | 选槽位进确认     | 接线锁定（Phase 1/2，机制 Decision）            | selectSlot/navigate   |
| I6  | 嘉宾增删         | 接线锁定（Phase 3）                             | scope 数组/重复字段   |
| I7  | 表单校验         | 内建锁定（Phase 3）                             | form 校验             |
| I8  | 提交预约         | 接线锁定（Phase 3）                             | `Cal__book`           |
| I9  | 槽位失效         | 接线锁定（Phase 3）                             | 失败分支              |
| I10 | 加入日历         | 内建/静态锁定（Phase 4）                        | href 断言             |
| I11 | 复制链接         | Decision（Phase 4）                             | 模拟路径或 C2         |
| I12 | 重排/取消        | 接线锁定（Phase 4）                             | `Cal__cancelBooking`  |
| I13 | 步骤回退         | 接线锁定（Phase 3）                             | navigate + 状态保留   |
| I14 | 移动端 day sheet | 接线锁定（Phase 2，P3a Deferred 收口）          | drawer 窄屏           |
| I15 | 日历叠加         | 显式裁决 out-of-scope（P3a 同裁定，C2 注记）    | 不接线                |

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb2ece73cffePZpRk7cBVSnwqr`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker/零 Major，共识达成。3 Minor 已随共识修复：Baseline 接线路径 2 的 `materializeApiRequest` 行号勘误（`prepareApiRequestForExecution` :370-389、`materializeApiRequest` :339）；`calendar-month-view.tsx` 路径补 `components/` 子目录；新增双触发注记（url 模板 scope 依赖自动刷新内建 `source-registry.ts:292-322` 与显式 `refreshSource` 重叠，接线时二选一或注记）。

## Closure Gates

- [x] 分析篇 §4 交互清单 I1–I15 逐条处置完成（接线锁定/内建锁定/显式裁决，无静默跳过）
- [x] 写端点全部先红后绿锁定（`cal-mock-backend.test.ts` 含新增写操作用例全绿）
- [x] P3a Deferred 项 I14 已收口（窄屏 drawer + e2e）
- [x] C2 追加回写完成（不重开初版裁决）；分析篇 §4.1 对照落字
- [x] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 In Scope 清单）
- [x] `showcase-env.ts` ≤700 行且 `mock-backend.ts` 零触碰
- [x] AI 模板感治理与样式契约自查完成并落字
- [x] roadmap Phase Status 区 P3b 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap
- [x] 受影响的 owner docs 已同步：分析篇 §4.1 对照 + 仅事实勘误（C2 追加区为 In Scope 义务）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] 目标 e2e：`npx playwright test tests/e2e/cal-replica-visual.spec.ts`（或拆分后的 interactions spec）全绿

## Deferred But Adjudicated

### I15 日历叠加（busy 时段覆盖槽位）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: P3a 已裁定为业务层语义（登录访客自有日历叠加），不落入"预约流程交互复刻"结果面；静态形态亦未在 P3a 落盘
- Successor Required: `no`
- Successor Path: 无（如实测高频撞墙，随 C2 回写升级登记）

### 窗口聚焦 refetch（若 Phase 2 裁定不模拟）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 聚焦刷新无内建支持为 P3a 实测结论，属 runtime 能力候选而非本复刻页契约缺陷； Booker 语境下 interval 轮询已覆盖"数据保鲜"主语义
- Successor Required: `yes`
- Successor Path: C2 回写登记（候选 2 终态），产品化归 D1 流程

## Non-Blocking Follow-ups

- `Cal__` mock 数据集若在接线中发现状态样本不足（如 pending 变体路径），在 `mock-backend-cal.ts` 内补样本属本计划 Fix 范围；超出数据集语义的新端点需求走 C2/D1 评估
- `--cal-*` 变量架构共享复刻基建抽取（P3a follow-up 沿袭）：不入本计划
- `tests/e2e/cal-replica-interactions.spec.ts` 现 529 行（closure audit Minor 2）：`check:oversized-code-files` 门禁未标记（audit e2e specs 豁免面），若后续追加用例超 ~600 行按页级 describe 拆分（booking/confirm/success 三段）

## Closure

Status Note: 2026-08-29 收口。P3b 全 5 Phase 完成：Phase 1–2（前次 session）写端点基座 + cal-booking 页接线；Phase 3–5（本次执行）cal-confirm/cal-success 交互接线（I6–I13）、C2 回写 ④、分析篇 §4.1 对照与两维自查。分析篇 §4 交互清单 I1–I15 逐条处置落终态（接线锁定 W ×10 / 内建锁定 B ×4 / 显式裁决 A ×1[I15]，处置表见 §4.1）；写端点 10 条单测 + 交互 e2e 16 条先红后绿；零 `packages/` 改动，`showcase-env.ts` 691 / `mock-backend-cal.ts` 499 / `mock-backend.ts` 463 行均在治理线内。全量验证 full-green：typecheck/build/lint 37/37、`pnpm test` 68/68（playground 240/240）、`pnpm check` exit 0 零新增命中、目标 e2e 19/19（interactions 16 + visual 3 零回归）。剩余工作全部归位：I15 与聚焦刷新为 Deferred But Adjudicated；3 条 Non-Blocking Follow-ups（mock 数据集扩展通道、`--cal-*` 基建抽取、interactions spec 行数观察）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh session `ses_fb21272a7ffennzqXt26oRIoxX`（2026-08-29）
- Evidence: 审计清单 A–H 全 PASS（plan 文本一致性 / Phase 3 落地 file:line 复核 / Phase 4 落地复核 / 先红后绿诚实性（测试存在性 + 程序化断言核查）/ Phase 5 文档追加-only diff 核验 / 变更面纪律（零 packages/）/ deferred 诚实性 / roadmap 与 daily log 状态核对）。审计者独立复跑：cal-mock-backend 单测 240/240、目标 e2e 19/19、`pnpm typecheck` 37/37、`pnpm check` exit 0、行数门 499/691/463。Verdict **approved-with-minors**（零 Blocker/零 Major；Minor 1 = cal-confirm.json 嘉宾删除钮 onClick 缩进漂移——已随关闭编辑修复并复跑单测 240/240；Minor 2 = interactions spec 529 行超 ~500 启发线（门禁未标记）——已登记 Non-Blocking Follow-ups 观察项）。roadmap P3b `planned`→`done` 随本关闭编辑落盘。

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
- 见 Non-Blocking Follow-ups 三条（均 non-blocking，无 confirmed live defect 残留）
