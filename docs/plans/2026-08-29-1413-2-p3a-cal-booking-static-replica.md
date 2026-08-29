# P3a Cal.com 预约流程复刻 — 分析与静态复刻

> Plan Status: active
> Mission: ui-review
> Work Item: P3a. Cal.com 预约流程复刻 — 分析与静态复刻
> Last Reviewed: 2026-08-29
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P3a 条目 + Phase Details P3 + Cross-Cutting 1–7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（slug `cal`/前缀 `cal`/端点 `Cal__` 分配表 + §1–§5 全部硬规则）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/cal-booking.md`（令牌 §2、页面清单 §3、交互清单 §4、能力映射 §5、可复刻边界与差异声明 §6、转 C2 候选 §7）
> Related: `docs/plans/2026-08-29-0419-2-p1-reference-app-research-and-replication-spec.md`（P1，completed）；`docs/plans/2026-08-29-1240-1-p2a-antdpro-template-static-replica.md`（Pi-a 先例：分支体下沉 mock 模块、styles.css @import 簇、steps 受控语义注记）；`docs/plans/460-sundial-replica-full-interactions-reimplementation-plan.md`（input-datetime/日历接线先例 B6/B7）
> 执行顺序约束：roadmap 虚线 `P2b -.-> P3a`（一次一应用、先静态后交互）——本计划在 P2b `done` 前不得开始执行；执行启动时必须重新 live 复核本节 baseline

## Purpose

消费 P1 已产出的复刻工程规范与 Cal.com 分析篇，把 roadmap P3 点名的预约流程（时长选择 → 时区/日历槽位 → 确认表单 → 成功态）以 flux schema + 复刻 CSS + mock 读端点做**静态复刻**落进 playground，验证 scheduling 包 calendar 与表单族在"自服务预约"品类下的承载度，并为 P3b（交互接线与测试）提供全部静态落点与联动可模拟性实测结论。

## Current Baseline

live 复核 2026-08-29，HEAD `2b3fa8d9a`，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean：

- 上游全部就绪：roadmap R0–R3、C1、C2、P1、P2a 均 `done`；P1 产出 `docs/analysis/ui-review/P1-reference-apps/README.md`（`cal` slug/`cal` CSS 前缀/`Cal__` 端点前缀分配表 + 目录/mock/e2e/验收规范）与 `cal-booking.md`（§2 令牌含 `--cal-*` 8 组变量架构 + radius/spacing 双基准、§3 四页面复杂度 ★★★★★~★★、§4 交互 I1–I15、§5 能力映射、§6.2 差异声明要求、§7 两个转 C2 候选）已落盘。
- **`cal` 复刻产物零存在**（`grep -r "Cal__|cal-replica|cal-booking" apps/playground/src tests/e2e` 零命中），本计划为该 slug 的建立者。
- 复刻基建先例在库：`mock-backend-antdpro.ts` 的 `createAntdProFetcherBranch`（按 slug 拆分 mock 模块 + fetcher 分支体下沉、showcase-env 零涨线模式，showcase-env.ts 现 680 行 / 700 行红线）；`styles.css` 头部 @import 簇（现 1–20 行，:19 sundial/:20 antdpro 先例；@import 必须位于 `@source` 指令之前的约束不变，执行启动时复核实际行号）；`complex-pages-model.ts` `COMPLEX_PAGE_ENTRIES` 注册；`antdpro-replica-visual.spec.ts` e2e 骨架（openPage 模式）。
- **calendar renderer 契约实测（含声明/消费口径区分，guide Lesson 6/Rule 11）**：type `calendar`，defaultSchema `{ type: 'calendar', view: 'month' }`（`flux-renderers-scheduling/src/scheduling-renderer-definitions.ts:205-209`）；`calendar.types.ts:98-119` 声明 `view`/`events`/`eventTemplate`、视图状态绑定 `viewOwnership`/`viewStatePath`（:113-114）、选中日期绑定 `dateOwnership`/`dateStatePath`/`onDateChange`（:115-119；`eventClassName` 另声明于 :135）。**`timezoneSelector`（:106）仅为已声明 prop，calendar 组件零消费**（组件源码 grep 无 timezone 渲染语义命中；`calendar-timezone.test.ts` 仅覆盖日期数算）——因此时区选择器静态形态按分析篇 §5 映射（"时区选择器 = input-select + Combobox 搜索"）以独立 input-select 承载，calendar 只承载月网格，不依赖该未消费 prop。
- 其余引用原语 schema 实证：wizard/steps（form-wizard.json；P2a 注记 steps 受控 value 需 `valueOwnership: 'controlled'`）、dialog/drawer（sundial 3 张 schema）、form 族（注册型别 `input-text/input-email/input-password/input-number` + date/time/datetime + select/checkbox/radio/textarea 于既有 schema 广泛使用；**无 `input-phone` 注册型别**——确认页电话字段以 input-text 承载，Phase 3 落字）、data-source、card/badge/avatar、Skeleton（ui 包）。
- C2 对应行：G-F（槽位三态 option-row 型按钮——分析篇 §2.4 明示 Cal.com 槽位按钮为 G-F 变体直接参照）、G-C（月/周多视图边缘）；分析篇 §7 预登记 2 个候选（预约槽位联动容器、slot 异步刷新策略）——P3a 只做实测结论记录，不做接线与裁决。
- 分析篇 §6.2 差异声明要求：品牌黑语义换名、radius 基准 10px（📁 常识档）落 CSS 时以开源实现核对后可微调、Cal Sans → Inter/系统栈（字形可见差异）、文案自拟中文 + lucide 图标——上述裁定落入本计划 Phase 1 Decision 项。

## Goals

- 3 张 `cal-*` 页面 schema 落盘并注册（category `app-replica`）：`cal-booking`（预约入口 + 双栏槽位选择视图）、`cal-confirm`（确认表单）、`cal-success`（成功态）——页面切分粒度若实测需调整，按 Phase 1 Decision 裁定并落字。
- `cal-replica.css` 落盘：保留 `--cal-*` **变量架构**（语义分组 + radius/spacing 双基准派生），令牌声明在 `.cal-root, .cal-dialog` 双作用域；差异声明（换名/字体/取值核对结论）落字本计划。
- `shared/mock-backend-cal.ts` + `showcase-env.ts` fetcher 追加 `Cal__` 读端点分支（get-only：活动 meta + 时长档、按日期/时长/时区的槽位数据集；分支体沿 antdpro 先例下沉，showcase-env 零涨线）。
- 每页至少 1 条初屏结构 e2e 用例（`tests/e2e/cal-replica-visual.spec.ts`）全绿；`cal-mock-backend.test.ts` 单测全绿。
- 实测结论落字：calendar 选中态 ↔ 槽位列表联动在现有原语下的可模拟性（表达式/scope 绑定路径探查，不接线）→ 供 P3b 与 C2 回写。
- 完成复刻验收自查（P1 README §4.2 两维 + §4.3 样式契约）。

## Non-Goals

- 不做交互状态机接线与写端点（选日刷新槽位、时区换算重渲染、slot reservation、嘉宾增删、提交预约、Copy link toast、步骤回退链路等属 P3b；Pi-a 只做"可见可点"的静态形态——dialog 打开类最小静态动作沿 P2a 先例允许）。
- 不做三页之间的 navigate 接线（P3b 交互状态机承载；三页各自经 showcase 列表可达）。
- 不回写 C2（Pi-b closure 义务，roadmap Cross-Cutting 5）；本计划只落字"联动可模拟性实测结论"供 P3b 携带。
- 不改 `packages/` 下任何 renderer/ui/runtime 代码；槽位三态若 CSS 模拟不到位，登记 G-F 实测证据，不做 renderer 改码。
- 不复制任何 Cal.com 品牌资产（logo/字标/Cal Sans 字体文件/插画/营销文案）；文案全部自拟中文，图标 lucide 同风格。
- 不复刻分析篇 §3 未列的 Cal.com 后台管理面（availability/teams/routing 等），仅复刻公开预约流程（Booker）四态。

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/cal-booking.json`、`cal-confirm.json`、`cal-success.json`（一页一文件；粒度调整仅限 Phase 1 Decision 裁定）
- `apps/playground/src/cal-replica/cal-replica.css`
- `apps/playground/src/styles.css`（仅追加一行 `@import './cal-replica/cal-replica.css';`，限头部 @import 簇内——不得置于 `@source` 指令之后）
- `apps/playground/src/complex-pages/shared/mock-backend-cal.ts`
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（仅追加 `Cal__` fetcher 分支委托，分支体在 mock-backend-cal.ts）
- `apps/playground/src/complex-pages/complex-pages-model.ts`（仅追加 `COMPLEX_PAGE_ENTRIES` 条目）
- `apps/playground/src/complex-pages/__tests__/cal-mock-backend.test.ts`
- `tests/e2e/cal-replica-visual.spec.ts`（初屏结构用例）
- roadmap Phase Status 区 P3a `todo`→`planned`（draft review 通过后）

### Out Of Scope

- `packages/` 全部代码、`tests/e2e/` 中非本 spec 的文件、roadmap 状态区以外文档改动、`docs/analysis/` 既有文档回写（分析篇修订仅当复刻实测与调研结论矛盾时做事实勘误，见 Phase 5）。

## Failure Paths

> 涉及 mock 读端点，列最小集。

| 可测场景编号     | 触发                   | 行为                           | 可重试 | 用户可见表现           |
| ---------------- | ---------------------- | ------------------------------ | ------ | ---------------------- |
| cal-slots-miss   | 槽位端点日期无可用槽位 | 返回空数组                     | 是     | 槽位区空态文案，不报错 |
| cal-event-miss   | 活动 meta 端点无匹配   | 返回兜底记录，页面不崩         | 是     | 占位标题/时长档        |
| cal-page-unknown | 注册 id 拼写不一致     | 复刻页不可达（开发期发现即修） | 否     | showcase 列表无该页    |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（P1 README §4.1 Pi-a 档位）。最低证明：`cal-mock-backend.test.ts` 全绿 + 每页 ≥1 条初屏结构 e2e 用例全绿（程序化断言：testid 可见性 / 关键文案 / 数据来自 mock 端点 / `getComputedStyle` 断言 `--cal-*` 令牌在复刻页子树可解析；截图仅作视觉证据附件）。交互契约（选日刷新/时区换算/reservation/提交流）的先红后绿锁定归 P3b（必须自动化档）。

## Execution Plan

> 顺序 Phase。Phase 1 基座先行（CSS/mock/注册是后续每页的依赖）；Phase 2–4 每页落 schema 即补该页初屏 e2e；Phase 5 实测结论与验收自查收口。

### Phase 1 - 基座：页面粒度与令牌差异裁定 + 复刻 CSS + mock 读端点 + 注册

Status: planned
Targets: `apps/playground/src/cal-replica/cal-replica.css`、`styles.css`（仅追加 @import 一行）、`shared/mock-backend-cal.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/cal-mock-backend.test.ts`

- Item Types: `Decision | Fix`

- [ ] Decision——页面粒度裁定：分析篇 §3 四态（入口 ★★ / 槽位 ★★★★★ / 确认 ★★★ / 成功 ★★）映射为 3 张 schema 的默认切分（入口+槽位合一页）是否成立；若 calendar+双栏+时长 tabs 单页 schema 过载，裁定替代切分并落字理由（三页或四页均须给出一页一文件终态清单）
- [ ] Decision——令牌差异裁定：按分析篇 §2 提取 `--cal-*` 变量架构（黑白极简 8 组语义 + 品牌黑 `#111827` 换名方案 + radius 10px 开源核对结论 + 字体 Cal Sans → Inter/系统栈替代），落实 §6.2 差异声明要求；结果写入本计划「差异声明（P3a 裁定）」节 + CSS 文件头注（含 light-only 声明，沿 sundial/antdpro 先例）
- [ ] `cal-replica.css`：令牌块声明于 `.cal-root, .cal-dialog` 双作用域，变量名 `--cal-*`（换名裁定后）、类名 `.cal-*`；槽位按钮三态（默认描边 → hover 浅底 → 选中黑底白字）CSS 形态就绪；只写品牌专有视觉，布局/间距用 schema 内 Tailwind 工具类（双轨规则）
- [ ] `styles.css` 在头部 @import 簇内追加 `@import './cal-replica/cal-replica.css';`（仅此一行，置于 `@source` 指令之前——antdpro-replica.css :20 先例）
- [ ] `mock-backend-cal.ts`：类型 + 工厂 + 槽位过滤助手；数据结构真实（活动 meta 含时长档 15/30/45/60、槽位按日期×时长×时区生成、含上午/下午/晚上分组标记与个别"名额将满/已失效"状态样本、确认页摘要与 bookingFields 字段定义样本）；沿 `createAntdProFetcherBranch` 模式导出 fetcher 分支工厂
- [ ] `showcase-env.ts` 追加 `Cal__` 读端点分支委托（`/r/Cal__event`、`/r/Cal__slots`，全部 get-only；分支体在 mock-backend-cal.ts，showcase-env.ts 不得回涨 700 行红线）
- [ ] `COMPLEX_PAGE_ENTRIES` 追加 3 条目（id/title/category: `app-replica`/description 写明复刻区块与端点名/features 4 个标签）
- [ ] `cal-mock-backend.test.ts`：数据集结构断言（时长档完整性、槽位分组/状态样本、空日期路径）

Exit Criteria:

- [ ] 页面粒度与差异声明两节在本计划内落字
- [ ] CSS/mock/注册/test 四类文件落盘，`Cal__` 两端点经 fetcher 分支可命中（mock 单测证明）；`--cal-*` 令牌子树解析的 e2e 证明由 Phase 2 首个落地页初屏用例承载（`getComputedStyle` 断言），本 Phase 不单独建探针页
- [ ] `pnpm --filter @nop-chaos/flux-playground test -- cal-mock-backend` 全绿
- [ ] showcase 页面列表可见 3 个 `cal-*` 条目（注册生效）

### Phase 2 - cal-booking（入口 + 双栏槽位选择视图）

Status: planned
Targets: `page-schemas/cal-booking.json`、`tests/e2e/cal-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] 入口区：头像 + 活动标题 + meta 行（时长/地点/时区，lucide 前缀图标）+ 描述 + 时长 tabs（15/30/45/60 分段静态选中态，tabs 内建选中）——分析篇 §3 入口页 ★★ 全区块
- [ ] 双栏槽位视图：左 = 月历（calendar renderer 月视图：月网格 + 今日强调静态形态；**不用 `timezoneSelector` prop——已声明未消费，见 Current Baseline 口径注记**）+ 时区选择器（独立 input-select 静态呈现，含搜索形态按 Combobox 能力裁定）+ 12h/24h switch 静态；右 = 选中日槽位列表（上午/下午/晚上分组标签 + 槽位按钮 2 列网格 + 三态 CSS 形态 + 个别"名额将满"attention 徽章与"已失效"禁用样本）；数据经 `Cal__slots` 流动
- [ ] 骨架屏态静态可见（加载占位样本）；移动端 day sheet 不做（窄屏形态归 P3b 一并裁处，登记 Phase 5）
- [ ] 每区块带 `data-testid="cal-<语义名>"`（P1 README 硬规则 3 前缀=slug）
- [ ] e2e：初屏结构用例 ≥1 条（活动文案、时长 4 档、月历网格存在、槽位分组与数量来自 mock、含 `getComputedStyle` 断言 `--cal-*` 令牌在 `.cal-root` 子树可解析——Phase 1 @import 生效的证明载体）

Exit Criteria:

- [ ] `#/complex-pages/cal-booking` 可达且初屏结构 e2e 用例绿
- [ ] 双栏结构（月历+时区选择器 | 分组槽位网格）在 schema 中可辨识；槽位三态 CSS 抽查通过（默认/hover/选中样式声明在盘）

### Phase 3 - cal-confirm（确认表单）

Status: planned
Targets: `page-schemas/cal-confirm.json`、`tests/e2e/cal-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] reschedule 提示条静态形态（回排场景样本）+ 左摘要卡（头像/标题/时长/地点/时区，数据来自 mock）+ 右表单区：姓名/邮箱/备注 + 电话（input-text 承载——注册型别无 `input-phone`，`input.tsx:448-635` 实证；原生 tel 语义缺口记入 Phase 5 注记）+ 嘉宾增删静态形态（一行嘉宾 + 删除钮形态，增删交互归 P3b）+ 自定义问题字段族（select/radio/checkbox 各 ≥1，对照分析篇 bookingFields 型别）+ Confirm 黑按钮（`--cal-*` 品牌黑令牌）
- [ ] 校验红环/错误文案静态样本（分析篇 §2.1 error 令牌形态，必填星标）
- [ ] e2e：初屏结构用例 ≥1 条（摘要卡字段值来自 mock、字段族型别可断言、Confirm 按钮令牌抽查）

Exit Criteria:

- [ ] schema 落盘且页面可达，初屏 e2e 用例绿
- [ ] 确认页三要素（摘要卡 / 含自定义问题的动态表单 / 品牌黑 Confirm）在 schema 中可辨识

### Phase 4 - cal-success（成功态）

Status: planned
Targets: `page-schemas/cal-success.json`、`tests/e2e/cal-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] 大圆 ✓（绿，`--cal-*` success 令牌）+ 摘要卡 + Add to calendar 四外链静态形态（Google/Outlook/Office365/ICS——`href` 为占位示意链接，不指向真实日历端点）+ Copy link 静态按钮 + Reschedule/Cancel 链接形态 + 「待确认」pending 徽章变体静态样本
- [ ] e2e：初屏结构用例 ≥1 条（成功文案、四外链存在、pending 变体可见）

Exit Criteria:

- [ ] schema 落盘且页面可达，初屏 e2e 用例绿
- [ ] 成功态要素（✓ + 摘要 + 四外链 + 重排/取消链接 + pending 变体）在 schema 中可辨识；零品牌资产引用

### Phase 5 - 实测结论、复刻验收自查与事实勘误

Status: planned
Targets: 本计划、`docs/analysis/ui-review/P1-reference-apps/cal-booking.md`（仅事实勘误时）

- Item Types: `Proof | Decision`

- [ ] 联动可模拟性实测结论落字：calendar 选中日期 ↔ 槽位列表刷新（分析篇 §7 候选 1）与 slot 异步刷新策略（候选 2）在现有原语下的可模拟性——探查 calendar **选中日期**的 scope 绑定路径（`dateOwnership: 'scope'`/`dateStatePath`/`onDateChange` 出参，`calendar.types.ts:115-119`；注意 `viewOwnership`/`viewStatePath` 是视图切换态而非选中日期态）与 data-source 参数化刷新语义，记录可行路径/阻塞点；不接线、不裁决，供 P3b 起点与 C2 回写
- [ ] AI 模板感自查（P1 README §4.2）：无"demo 占位"按钮；hover/空态/骨架态静态成对可见；数据经 mock 端点流动（静态 rail 类除外）；对照 §2 令牌表抽查密度/圆角/黑白极简/等宽槽位数字与原版结构一致性
- [ ] 缺口注记核对：input-phone 原生 tel 语义、timezoneSelector 声明未消费两条实测口径，确认已随 Phase 3/Current Baseline 落字并可被 P3b 的 C2 回写引用
- [ ] 样式契约自查（§4.3）：新 CSS 全部在 `cal-replica.css` scope 专用类；零 renderer 包改动；`git status` 确认变更面仅 In Scope 清单
- [ ] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；无矛盾则不动）
- [ ] 移动端 day sheet（I14）窄屏形态处置登记：裁决归 P3b 或登记 C2 注记，落字理由

Exit Criteria:

- [ ] 联动可模拟性实测结论节落字（含证据路径 file:line）
- [ ] 两维自查记录落字（通过/打回处置结论）
- [ ] `npx playwright test tests/e2e/cal-replica-visual.spec.ts --reporter=list` 全绿（≥3 初屏用例）
- [ ] `pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates，此处仅做解阻塞所需的包级检查）
- [ ] 变更面核查：`git status --porcelain` 仅含 In Scope 文件

## 差异声明（P3a 裁定）

> Phase 1 Decision 项产出后落字。按分析篇 §6.2 要求记录：令牌偏离、布局偏离、交互偏离、light-only 与否。

- <<待 Phase 1 落字>>

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb3d26ccdffeDayA2Mzzb1gI5B`
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1-Major1 baseline 将 `timezoneSelector` 误述为"语义字段在库/静态形态直接落点"，实为声明未消费的 prop（组件零消费）——Current Baseline 改为声明/消费口径区分（含证据），Phase 2 时区选择器改由独立 input-select 承载并显式弃用该 prop。R1-Minor1 Phase 5 联动探查改引选中日期绑定三元组 `dateOwnership`/`dateStatePath`/`onDateChange`（:115-119）并注明 viewOwnership 对为视图态；R1-Minor2 baseline 修正注册 input 型别（无 input-phone），Phase 3 电话字段改 input-text 承载 + Phase 5 缺口注记核对项；R1-Minor3 styles.css @import 簇行号修正为 1–20 并加执行启动复核注记。R2 复核零 Blocker/零 Major 达成共识；R2-Minor（`eventClassName` 声明行号 :135 出列引用区间）已随共识落字。

## Closure Gates

- [ ] 3 张（或 Phase 1 裁定终态数量）`cal-*` schema 全部落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿
- [ ] 差异声明已裁定并落字（换名/字体/半径核对/交互偏离逐项）
- [ ] `cal-mock-backend.test.ts` 全绿；`Cal__` 端点全部 get-only；`showcase-env.ts` ≤700 行且 `mock-backend.ts` 零触碰
- [ ] 联动可模拟性实测结论落字（分析篇 §7 两候选的证据路径）
- [ ] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs）
- [ ] 无品牌资产复制（logo/字体文件/插画/文案全部替换）
- [ ] AI 模板感治理与样式契约自查完成并落字
- [ ] roadmap Phase Status 区 P3a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap
- [ ] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] 目标 e2e：`npx playwright test tests/e2e/cal-replica-visual.spec.ts` 全绿

## Deferred But Adjudicated

### 移动端 day sheet 窄屏形态（I14）

- Classification: `watch-only residual`
- Why Not Blocking Closure: Pi-a 静态边界为桌面 1440 初屏结构；窄屏抽屉形态依赖 drawer 打开链路（交互态），归 P3b 交互状态机裁处不影响"预约流程静态复刻"结果面成立
- Successor Required: `yes`
- Successor Path: P3b plan（本 roadmap 既有 work item，无需新建）

### slot reservation 续约/overlay 日历服务端语义

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分析篇 §6.2 已裁定为业务层语义，复刻为静态演示 + mock 刷新，不承诺服务端锁；本计划零写端点，该语义天然不落入 Pi-a 范围
- Successor Required: `no`
- Successor Path: 无（如 P3b 实测高频撞墙，经其 C2 回写升级 L4 观察项 G-L 同级登记）

## Non-Blocking Follow-ups

- 联动可模拟性实测结论若判定"可低成本模拟"：路径注记供 P3b 直接采用；若判定"阻塞"：转 P3b C2 回写一并升级候选，不在本计划裁决
- `--cal-*` 变量架构若未来抽出为共享复刻基建（多应用令牌分层）：属 playground 层治理优化，不入本计划

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
