# P7b Stripe dashboard 数据面板复刻 — 交互接线与测试

> Plan Status: completed
> Mission: ui-review
> Work Item: P7b. Stripe 风格数据面板复刻 — 交互接线与测试
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P7b 条目 + Phase Details P7 + Cross-Cutting 5/6/7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（§2.1 mock 写端点、§2.2 e2e 骨架与拆分规则、§4.1 Pi-b 档位、§5 两段式边界）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/stripe-dashboard.md` §4 交互清单（I1–I11）+ §6.2 差异声明 + §7 转 C2 候选；P7a plan「G-E/G-B3 静态实测结论（P7a 实测）」§1–§9（P7b 接线落点与显式裁决清单）
> Related: `docs/plans/2026-08-30-0953-2-p7a-stripe-dashboard-static-replica.md`（P7a，completed 2026-08-30——本计划全部静态落点、差异声明 D1–D3 与 §1–§9 结论来源，P7b 直接采用）；`docs/plans/2026-08-30-0953-1-p6b-airtable-interaction-wiring-and-tests.md`（Pi-b 最近先例：url 参数物化 + dependsOn、mini-form 跨 dialog 子 scope、写端点会话态、mock 模块拆分、opt-in e2e 钩子、className 表达式状态驱动、C2 回写 ⑦）；`docs/plans/2026-08-30-0040-1-p4b-linear-interaction-wiring-and-tests.md`（Pi-b 先例：交互清单逐条处置表、语义模拟端点、C2 回写 ⑤）
> 执行顺序约束：roadmap 实线 `P7a → P7b` 已满足（P7a `done`，2026-08-30 closure audit 通过）；本计划先于同批起草的 D1 首项 plan（`docs/plans/2026-08-30-1333-2-d1-gf-option-row-primitive.md`，draft）执行；两计划无内容冲突（P7b 零 `packages/` 改动，D1 plan 零 playground 复刻页改动）；顺序共写面二处——roadmap Phase Status 区（仅状态流转）与 `docs/analysis/ui-review/C2-capability-gaps.md`（追加式共写：本计划回写 ⑧、D1 plan 回写 G-F/G-F2 终态，均追加不改动既有段落，零冲突）

## Purpose

消费 P7a 已落盘的单页 `stripe-payments` 静态复刻、分析篇 §4 交互清单（I1–I11）与 P7a「G-E/G-B3 静态实测结论」§1–§9 接线落点清单，把 Pi-b 段义务收口：补全 `Stripe__` mock 写/会话端点（终态集合 Phase 1 裁定）、接线可模拟交互（筛选 chip 增删与组合收窄、日期范围刷新、搜索参数化、列排序生效、widget 增删近似、导出语义模拟、明细 drawer 操作裁决），对不可模拟项（筛选 URL 同步、语法搜索解析器、密度档切换、真实 CSV 下载通道等）逐条显式裁决，分析篇 §4 逐条 e2e 先红后绿锁定，closure 时按 roadmap Cross-Cutting 5 以追加方式回写 C2（回写 ⑧：G-E 终态实测 + G-B3「无批量栏」对照终态 + 分析篇 §7 两候选归属裁决 + formatCurrency/语义 pill 型别等 D1 输入池落字），并把「预测缺口 vs 实测缺口」对照记入应用分析篇。

## Current Baseline

- **P7a 产物已收口（2026-08-30 closure audit 通过，fresh session `ses_faee9e7d7ffecXp5lpwKVzYIJA` APPROVED）**：单页 `apps/playground/src/complex-pages/page-schemas/stripe-payments.json`（1349 行，category `app-replica`，`COMPLEX_PAGE_ENTRIES` 注册可达）+ `apps/playground/src/stripe-replica/stripe-replica.css`（606 行，`--st-*` 令牌 `.st-root,.st-dialog` 双作用域，light-only）+ `Stripe__` 3 个 get-only 端点（`payments` 列表 `keyword`/`status`/分页兜底、`payment?id=` 明细 + `st-payment-miss` 占位兜底、`overview` KPI + 30 点双曲线 + 空序列兜底）+ 15 条 mock 单测 + 5 条 e2e 全绿 + 全量验证 full-green。
- **数据集形态（P7a 锁定）**：36 行确定性支付记录按 6 循环分布四状态（succeeded 18 / pending 6 / failed 6 / refunded 6），客户端分页 pageSize 10 共 4 页；`mock-backend-stripe-payments.ts` 已支持 `keyword` 过滤与 `status` 枚举过滤（非枚举 `status` 忽略返回兜底全量，`isStStatus` 守卫）。
- **静态形态与零生效注记（P7a D2 裁定，全部带 `*-note` 归 P7b）**：chip 条双 chip（`stripe-chip-status`/`stripe-chip-amount`，各带 `*-remove` 移除按钮形态）+ `stripe-filter-button`；日期范围 `stripe-daterange` 四档分段控件（上月默认选中）；搜索 `stripe-search` 静态形态；金额/日期两列排序 chevron 形态；导出 dialog（`stripe-export-trigger` → 时区/范围/列勾选 + `stripe-export-confirm`）；添加 widget dialog（六项 `st-check` 勾选列表 + Apply/Edit 形态）；明细 drawer（客户列链接 `openDrawer` + form `loadAction Stripe__payment?id=` + 摘要/时间线/元数据三分区 + 退款等操作按钮形态零生效）；无批量栏（I11）。
- **接线机制先例池（live 实测，Phase 1 Decision 输入）**：
  1. **url 参数物化 + `dependsOn` 自动刷新**（P6b A1/A5/A8、P3b slots 先例）：page body 域容器/mini-form `onClick`/`submitAction` `setValue` 写页面 scope → data-source url 模板参数物化 → mock 端点按参数预应用。
  2. **className 表达式状态驱动**（P6b A9 先例）：scope 变量 → wrapper className 表达式 → CSS 覆写，静态节点表达式对 scope 变量的响应性已 e2e 实测成立。
  3. **table 内建 sorter 在库**（`packages/flux-renderers-data/src/table-renderer/use-table-sort.ts`，P7a §8 实测口径）；P6b A5 会话排序（端点 `sort=` 参数 + 服务端预应用）为备选变体。
  4. **语义模拟端点先例**（`Cal__shareLink`/`Linear__copyLink`/`Notion__copyLink`）：零副作用 get 端点 + `messages.success` 成对，替代无 action 词汇的真实通道。
  5. **动作词汇无键盘序列/剪贴板/下载通道**（C2 回写 ③/④/⑤/⑦ 多例同源；`RendererEnv` 无 print/clipboard/download 通道）→ 键盘与真实下载类交互预期显式裁决，禁止 hack 绕道。
  6. **toast 生命周期与页面 host 绑定**（回写 ③/④/⑤ 三例同源）：跳转型动作链需 `control: {debounce}` 延迟保 toast 可观察。
- **治理线（live 实测 2026-08-30）**：`shared/showcase-env.ts` 687 行（wc 口径）/ 688（门禁口径）距 700 ERROR 线余量 ≤13 行——新增端点分支体必须全部下沉 `mock-backend-stripe*.ts`，showcase-env **预期零改动**（沿 P6b 先例：写请求经既有 `Stripe__` 数组分支流入，分支内按 method 分派；若实测确需胶水行，必须先做等价余量整理并保持双口径 ≤700，落字记录）；`mock-backend.ts` 零触碰；stripe mock 四件 103/116/242/52 行全 ≤500 WARN 线，新增/扩写模块保持 ≤500（超载沿 linear/notion 实体模块先例拆分，Phase 1 Decision 裁定组织形态）。
- **e2e 载体现状**：`tests/e2e/stripe-replica-visual.spec.ts` 291 行（5 条初屏/浮层/令牌用例）；预估交互用例体量超 ~500–600 行，沿 P4b/P5b/P6b 先例新建 `tests/e2e/stripe-replica-interactions.spec.ts` 承载交互用例（是否拆分 Phase 4 落字确认）。

## Goals

- `Stripe__` mock 写/会话端点补全（终态集合 Phase 1 Decision 裁定，候选：`Stripe__exportPayments`（导出语义模拟）、视机制裁定可选的筛选/排序会话端点变体）+ opt-in e2e 钩子（`__stripeEndpointCalls`/`__stripeTestHooks`，生产 no-op，沿 linear/notion/airtable 先例），全部先红后绿单测锁定。
- 分析篇 §4 交互清单 I1–I11 逐条处置落终态表（接线锁定 / 内建锁定 / 显式裁决，无静默跳过）：筛选 chip 增删与组合收窄、日期范围预设档刷新、搜索 keyword 参数化、金额/日期列排序生效、明细 drawer 操作裁决、导出语义模拟、图表-日期范围联动候选、widget 增删近似（`visible` 表达式驱动，P7a §7 候选）。
- C2 回写 ⑧（追加式）：G-E 终态实测（密度档 L2 证据终态/等宽格式化 formatCurrency registry 候选/语义 pill 型别候选）、G-B3「无批量栏」对照终态、分析篇 §7 两候选归属裁决（筛选 URL 同步 / 语法搜索解析）、D1 输入池素材行落字。
- 分析篇「预测 vs 实测」对照（§4.1 对照节）+ §5/§7 勘误落字；两维自查（P1 README §4.2/§4.3）。
- 全量验证 full-green（`pnpm typecheck`/`build`/`lint`、`pnpm test`、`pnpm check` 零新增红、目标 e2e 全绿）。

## Non-Goals

- **零 `packages/` 改动**：本计划只动 playground 层（schema/CSS/mock/e2e）与文档；密度档语义字段、语义 pill 型别、`formatCurrency` registry 函数、筛选 URL 同步 runtime 能力等产品化项一律归 D1 流程（回写 ⑧ 落字，不在本计划实现）。
- **语法搜索解析器不复刻**（§6.2 降级声明维持）：搜索接线止步于 keyword 参数化。
- **不新增批量栏/选择集列**（I11 调研结论「Stripe 原生无批量栏」维持，与原版结构一致）。
- **密度档切换不接线**（显式裁决候选，Phase 4 落终态）：Stripe 原版无密度切换控件（I8 注记「密度档为拟定补充」），复刻页维持三档静态样本；className 表达式机制证据已由 P6b A9 承载，不为本页发明原版不存在的控件。
- **真实 CSV 文件下载不做**（`RendererEnv` 无 download 通道，禁止 `window.open`/blob hack 绕道；语义模拟候选见 Phase 1）。
- 不复刻 Balance/报表页（P7a D1 裁定单页不拆，维持）；不重做 P7a 已锁定的静态形态与初屏 e2e。

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/stripe-payments.json`（交互接线）
- `apps/playground/src/complex-pages/shared/mock-backend-stripe*.ts`（写/会话端点 + 过滤域扩展 + 钩子）
- `apps/playground/src/stripe-replica/stripe-replica.css`（接线必需的状态类/选中态类增量，维持令牌双作用域契约）
- `apps/playground/src/complex-pages/__tests__/stripe-mock-backend.test.ts`（单测扩展，先红后绿）
- `tests/e2e/stripe-replica-interactions.spec.ts`（新建）与 `tests/e2e/stripe-replica-visual.spec.ts`（零回归）
- `shared/showcase-env.ts` 预期零改动（例外路径见 Current Baseline 治理线）
- `docs/analysis/ui-review/C2-capability-gaps.md`（回写 ⑧，追加式）+ `docs/analysis/ui-review/P1-reference-apps/stripe-dashboard.md`（§4.1 对照 + 勘误）+ `docs/backlog/ui-review-roadmap.md` Phase Status 区（仅状态流转）

### Out Of Scope

- `packages/` 全部子树；`apps/playground/src/complex-pages/shared/mock-backend.ts` 零触碰（既有复刻 slug mock 模块不动，与 Closure Gates 双条款口径一致）
- 语法搜索解析器、批量栏、Balance 页、真实下载/剪贴板/键盘序列通道
- D1 产品化项（密度档语义字段/语义 pill 型别/`formatCurrency`/筛选 URL 同步 runtime 能力）

## Failure Paths

| 可测场景编号      | 触发                                       | 行为（含错误语义）                                              | 可重试 | 用户可见表现                |
| ----------------- | ------------------------------------------ | --------------------------------------------------------------- | ------ | --------------------------- |
| st-filter-unknown | 筛选/排序参数携带非法值（status 非枚举等） | 端点忽略该参数返回兜底全量（`isStStatus` 守卫已备）             | 否     | 列表显示全量                |
| st-export-empty   | 导出确认时列勾选为空集                     | Phase 1 裁定：端点 miss 语义 + 失败 toast（候选）或前端校验拦截 | 是     | 导出 dialog 保持打开 + 提示 |
| st-payment-miss   | drawer 打开指向不存在 id                   | 端点占位兜底（P7a 已备 `st-payment-miss`）                      | 否     | drawer 内占位文案           |
| st-refund-miss    | 退款操作指向不存在 id（若裁决接线）        | 端点 miss 返回 + 失败 toast，会话态不变                         | 否     | drawer 内失败提示           |
| st-widget-invalid | widget 勾选集表达式求值失败/非法值         | `visible` 表达式兜底维持默认四卡可见                            | 否     | KPI 卡区维持默认形态        |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（P1 README §4.1 Pi-b 档位）。分析篇 §4 交互清单逐条有 e2e 断言；每条接线锁定项 ≥1 条先红后绿用例；mock 写/会话端点契约单测先红后绿；交互契约（chip 组合收窄/排序/筛选刷新/widget 状态）无一豁免。断言纪律：pass/fail 判定必须是程序化断言（`getByTestId().toBeVisible()` / `toHaveAttribute` / `getComputedStyle` / `page.evaluate()` / `__stripeEndpointCalls` 端点计数）；截图仅作视觉证据附件。

## Execution Plan

> 顺序 Phase。Phase 1 写/会话端点基座与生效机制裁定先行（后续接线全部依赖）；Phase 2–3 按区块接线；Phase 4 回写与自查收口。

### Phase 1 - mock 写/会话端点基座与生效机制裁定（先红后绿）

Status: completed
Targets: `shared/mock-backend-stripe*.ts`、`__tests__/stripe-mock-backend.test.ts`、本计划 Decision 注记

> **Phase 1 Decision 落字（2026-08-30 执行实测）**
>
> 1. **I1/I2/I3 筛选区生效机制 = 候选① url 参数物化 + 显式 `dependsOn`**（P6b A1 同型；三个入口全部在 page body 域——chip 条/日期分段/搜索框均为 page body 域容器，setValue 直写页面 scope，无 in-table 开启位置精化问题）。页面 scope 变量集：`stKeyword`（搜索词）、`stStatusFilter`（状态枚举值，'' = 不过滤）、`stMinAmount`（金额下限 major 单位，'' = 不过滤）、`stDateRange`（日期档 key，默认 `'lastmonth'`）、chip 固定态 `stChipStatus`/`stChipAmount`（默认 `'on'`）。`stripe-source-payments` url 物化为 `/r/Stripe__payments?perPage=100&keyword=${stKeyword ?? ''}&status=${stStatusFilter ?? ''}&minAmount=${stMinAmount ?? ''}&range=${stDateRange ?? 'lastmonth'}` + `dependsOn` 四变量。mock 过滤域扩展：`minAmount=` 按 major 单位数值过滤（非法值忽略，st-filter-unknown 口径）、`range=` 区间过滤（样本数据月 = 2026-08 = 复刻语义「上月」，与导出 dialog「上月（8月1日 - 8月31日）」文案一致；`prev`/`mtd` = 数据月之外 → 空集；`lastmonth`/`custom`/未知 → 全量——custom 无自定义 picker 降级全量，落字注记）。**chip 语义近似裁决落字**：初始双 chip 为「已固定维度样本」（P7a 静态初态维持——值未应用；约束 = visual 01 初屏断言零回归：全量 36 行 + 四语义 pill 齐现与真实应用初始筛选态不相容，任一状态过滤即降至单色 pill），移除 = 取消固定 + 清值，筛选 dialog 增改值时按值重固定——增（dialog 应用 → 列表收窄）→ 组合叠加 → 单个移除（剩余组合维持）→ 全移除（全量恢复）全周期真实生效可观察，仅初始固定态为近似（P7a §7「近似增删」同款注记口径）。断言口径：筛选 dialog 应用 状态=已失败 → 列表 36→6 行且 pill 全「已失败」；叠加 金额≥100 → 5 行（组合收窄）；移除金额 chip → 6 行（剩余组合维持）；移除状态 chip → 首页 10 行全量恢复。**I2 断言口径**：切「本月至今」→ 空态文案「当前筛选条件下没有交易」+ KPI 随 `Stripe__overview?range=` 空载荷（CN¥0.00/空曲线，st-overview-empty 载荷复用）；切回「上月」→ 列表与 KPI 恢复。**I3 断言口径**：搜索 dialog（P6b A1 终态姿势 form `submitScope:'surface'` + `submitOnChange` + `submitAction: setValue('stKeyword')` + dialog `onSubmitSuccess` `$formData` 兜底）输入即过滤、零命中空态（st-payments-miss 路径）、清空恢复、端点计数随动。
> 2. **I4 列排序 = 候选① table 内建 sorter 客户端排序**：36 行全量流动（perPage=100）+ 客户端分页形态下 source 驱动排序实测可达（`table-data.ts` `processTableData` 客户端 sort 在库 + `use-table-sort.ts` 单列 asc→desc→null 循环）。落点：金额列 name `amountLabel`→`amountMinor`（minor 单位数值比较，跨币种确定性序）、日期列 name `dateLabel`→`createdAt`（ISO 串字典序 = 时间序），两列 `sortable: true`；排序方向视觉态 = renderer 内建升降箭头 + `th[aria-sort]`（静态 chevron 图标移除，避免双 chevron）。断言口径：金额列两次点击 → `aria-sort` ascending→descending + desc 首行变为全集 minor 最大行（TX-1035）可观察；日期列 desc → 首行日期标签含「8月28日」。
> 3. **I9 导出语义载体 = 候选① `Stripe__exportPayments` get 语义模拟端点**（零副作用返回导出确认载荷 + `messages.success`「导出任务已创建」，沿 `Cal__shareLink`/`Linear__copyLink` 先例）；候选② 真实 CSV blob 下载实测预期不可达（`RendererEnv` 无 download 通道，回写 ③/④/⑤/⑦ 同源）——**显式裁决 + D1 输入池素材（print/download 族），禁止 `window.open`/blob hack 绕道**（Phase 3 落终态注记）。端点契约：get 携列标志 `{amount|date|status|customer|method}` → 全空 → status 1 `{ok:false,error:'no columns selected'}`（st-export-empty：失败提示 + 导出 dialog 保持打开）；任一列 → status 0 `{ok:true,count,columns,filename}` 零会话态变更（count = 当时会话库全量 36）。schema 载体：导出 dialog 5 个静态 check 行改为内建 `checkbox` 字段（`className: 'st-check'` 维持 visual 03 `.st-check`×5 断言 + option label 维持文案断言），确认钮 = form `submitForm` → `submitAction: ajax` get（url 表达式引用字段名——P5b 实测 submitAction 求值域可解析字段名）+ messages 成对 + dialog `closeOnSubmit: true`（成功才关——P6b 实测教训⑦显式声明）。
> 4. **widget 增删近似载体 = P7a §7 候选（visible 表达式驱动勾选状态集）**：页面 scope 变量 `stWidgetChart/stWidgetCharges/stWidgetAvg/stWidgetRefunds`（默认 `'on'`——`?? 'on'` 表达式兜底即 st-widget-invalid Failure Path：求值失败/非法值维持默认四卡可见）；净额走势项驱动净额 KPI 卡 + 曲线容器两者（同指标双承载，落字），交易笔数/平均交易额/退款总额项各驱动对应 KPI 卡；客户余额/入账记录两项**无预置区块——勾选仅存于 dialog 表单不产生区块**（近似边界落字：「近似增删，非真重组」）。widget dialog 6 项改内建 `checkbox` 字段（`className: 'st-check'` 维持 visual 04 `.st-check`×6 断言），Apply = `submitForm` → `submitAction: setValue('stWidgetChart', "${widgetChart ? 'on' : ''}")`（字段名求值域）+ dialog `onSubmitSuccess` 链 setValue 其余三项（`$formData` surface 域——P4b L12 姿势）+ `closeOnSubmit: true`（Apply 后生效，非即时预览）；Edit 按钮维持形态（与 Apply 同浮层语义重复——显式裁决落字 Phase 3）。**refunds 默认值裁决**：checkbox 默认勾选（= KPI 卡默认可见），偏离 P7a dialog 静态未勾选形态——visual 04 退款 KPI 值断言零回归约束，落字注记。**I5 drawer 操作 = 低成本语义模拟升级（P6b A11 同款升级条款）**：仅退款钮接线——post `Stripe__refundPayment` `{id}`（drawer 域 `${id}` 表达式，`evaluateActionArgs` 求值在库）→ 会话库 status→`refunded` + timeline 追加退款事件 → success toast「退款任务已创建」→ `then` 链 `[component:refresh stripe-source-payments, closeDialog]`（component:refresh 跨浮层刷新页面级 data-source——P6b A11a 实测通道）；再次收款/发送收据维持形态零生效（注记更新保持「零生效」关键词——visual 02 断言）。st-refund-miss：未知 id / `__stripeTestHooks.refundMiss` 强制 → status 1 失败 toast「退款失败：交易不存在」+ 会话态不变 + drawer 保持；已退款重复退款 → `{ok:false,error:'already refunded'}`。
> 5. **mock 模块组织裁定：新开 `-writes.ts`（P5b/P6b 先例）**——`refundStripePayment` + `exportStripePayments` 写/语义核心落新模块 `mock-backend-stripe-writes.ts`；`range=`/`minAmount=` 过滤域扩展 + `isStEmptyRange` 助手落 `-payments.ts`；`Stripe__overview` range 分派落主模块分支（`-overview.ts` 零改动）；fetcher 分支扩展（post 分支 + export get/post + 钩子）落主模块（终态 201 行）；`-types.ts` 零改动。opt-in e2e 钩子沿 linear/notion/airtable 先例落位主模块：`__stripeEndpointCalls`（端点计数）+ `__stripeTestHooks`（`refundMiss` 强制 miss），生产 no-op。`showcase-env.ts` **预期零改动**（写请求经既有 `/r/Stripe__` 数组分支流入，分支内按 method 分派）；`mock-backend.ts` 零触碰；全部 stripe 模块保持 ≤500 WARN 线。
> 6. **先红后绿证据记录**：新增单测仅经既有导出面（`createStripeDatabase`/`createStripeFetcherBranch`/`createShowcaseEnv`）断言，对 pre-P7b 实现（get-only 分支）跑红——红态 **`9 failed | 15 passed`**（24 用例：新增 9 条全红 + 既有 15 条即时绿）；Fix 落地后转绿 **24 passed 全绿（1 文件）**。红态截图无，以失败输出为准。

- Item Types: `Decision | Fix | Proof`

- [x] Decision——I1/I2/I3 筛选区生效机制裁定（候选 ①url 参数物化：page body 域容器/搜索 form `submitScope:'surface'` + `setValue` 写页面 scope → data-source url 追加 `status=`/`keyword=`/日期区间参数 + 显式 `dependsOn`（P6b A1 同型；`keyword`/`status` mock 已备，日期区间参数为 mock 过滤域扩展）；②会话写端点 + 服务端预应用变体（P5b `updateViewConfig` 同型））——裁定含逐项断言口径（如：chip 移除后列表按剩余组合收窄可观察；切日期档后行集随动可观察）并落字本计划 → **已落字（Phase 1 Decision 注记 1）：三入口全 page body 域 → 候选① url 物化（`keyword=`/`status=`/`minAmount=`/`range=` + dependsOn 四变量）；chip 初始固定态近似语义 + 全周期生效断言口径、I2 空区间语义（样本月=2026-08=「上月」，prev/mtd → 空集 + overview 空载荷）、I3 P6b A1 终态姿势断言口径逐项落字**
- [x] Decision——I4 列排序机制裁定（候选 ①table 内建 sorter 客户端排序（36 行全量流动 + 客户端分页形态下 Phase 内实测 source 驱动数据排序可达性）；②P6b A5 会话端点变体 `sort=` 参数 + mock 服务端预应用）——断言口径：点金额/日期列头后首行变化可观察，落字 → **已落字（注记 2）：候选① table 内建 sorter（`processTableData` 客户端 sort 在库实测可达）；金额列 name→`amountMinor` 数值序、日期列 name→`createdAt` 字典序；方向视觉态 = 内建箭头 + `aria-sort`；断言口径：金额 desc 首行 TX-1035、日期 desc 首行 8月28日**
- [x] Decision——I9 导出语义载体裁定（候选 ①`Stripe__exportPayments` get 语义模拟端点（零副作用返回导出确认载荷）+ `messages.success`「导出任务已创建」，沿 copyLink/shareLink 先例；②真实 CSV blob 下载实测——`RendererEnv` 无 download 通道预期不可达，不可达则显式裁决 + D1 输入池素材（print/download 族，回写 ③ 同源））——落字 → **已落字（注记 3）：候选① 语义模拟端点（全空列 → st-export-empty status 1 + dialog 保持打开；有列 → `{ok,count,columns,filename}` 零副作用）；候选② 真实下载显式裁决不可达 + D1 输入池素材落字；schema 载体 = checkbox 字段化 + submitForm ajax + closeOnSubmit**
- [x] Decision——widget 增删近似载体裁定（P7a §7 候选：预置 widget 区块 + `visible` 表达式驱动勾选状态集——勾选集 scope 变量 + Apply/Edit `setValue`；落字「近似增删，非真重组」注记）+ I5 drawer 操作（退款等）处置裁定（§6.2 差异声明「静态演示」维持 or 低成本语义模拟升级，沿 P6b A11 同款升级条款）——落字 → **已落字（注记 4）：widget = visible 表达式驱动（4 scope 变量 + `?? 'on'` 兜底即 st-widget-invalid Failure Path；净额走势项驱动 KPI 卡+曲线双承载；余额/入账两项无预置区块近似边界落字；Apply 后生效 submitForm 链 + closeOnSubmit；Edit 维持形态裁决 Phase 3 落字；refunds 默认勾选偏离 P7a 静态落字注记）；I5 = 低成本语义模拟升级（仅退款钮接线 post `Stripe__refundPayment` + then 链 component:refresh + closeDialog；其余两钮维持零生效；st-refund-miss/already-refunded 守卫）**
- [x] Decision——mock 模块组织裁定：写/会话操作与过滤域扩展落点（追加 `-payments.ts` 242 行 or 新开 `-writes.ts`，沿 P5b/P6b 先例）；全部文件 ≤500 WARN 线；`__stripeEndpointCalls`/`__stripeTestHooks` 钩子落位主模块，生产 no-op——落字 → **已落字（注记 5）：新开 `-writes.ts`（93 行，refund + export 核心）；range/minAmount 过滤域扩展 + `isStEmptyRange` 落 `-payments.ts`（262 行）；overview range 分派落主模块（179 行）；`-types.ts`/`-overview.ts` 零改动；钩子落主模块生产 no-op；showcase-env 预期零改动**
- [x] Fix——Phase 1 裁定终态的端点/过滤域扩展实现 + 单测先红后绿（契约：参数解析、兜底分支、miss 分支、会话态变更如设立） → **已完成：post 分支（refundPayment + hooks.refundMiss 强制 miss + already-refunded 守卫）+ exportPayments get 语义端点 + minAmount/range 过滤域 + overview range 分派 + `__stripeEndpointCalls` 计数；先红后绿：红态 `9 failed | 337 passed`（346 全仓，新增 9 条全红）→ 绿 `346 passed` 全仓（stripe 文件 24/24）；中途 1 处期望值修正（minAmount=340 手算 2 → 实算 4，漏计 JPY i=17 行）**

Exit Criteria:

- [x] Phase 1 五项 Decision 全部落字本计划（机制候选、断言口径、mock 组织形态、行数记录） → **Decision 注记 1–5 全部落字**
- [x] 新增/扩展端点的 mock 单测先红后绿全绿（`pnpm --filter @nop-chaos/flux-playground test -- stripe-mock-backend`） → **红态 9 failed（新增 9 条全红，既有 15 条即时绿）→ 绿 24/24（stripe 文件）；全仓 346 passed**
- [x] `mock-backend-stripe*.ts` 全文件 ≤500 WARN 线、`showcase-env.ts` 双口径 ≤700 维持（或等价余量整理已落字）、`mock-backend.ts` 零触碰 → **mock 五件（Phase 1 时点）wc 179/116/262/52/93（主模块 Phase 3 扩展后终态 201）全 ≤500；showcase-env.ts 687 行零改动（git diff 空）；mock-backend.ts 463 行零触碰**

### Phase 2 - 筛选区与表格接线（I1/I2/I3/I4）

Status: completed
Targets: `page-schemas/stripe-payments.json`、`stripe-replica.css`（状态类增量）

> **Phase 2 执行落字（2026-08-30 实测）**
>
> 1. **接线落位（机制沿 Phase 1 裁定，全部 e2e 绿）**：I1 = 双 chip `visible` 表达式（`stChip* ?? 'on'`）+ 移除钮 onClick 动作链（取消固定 + 清值）+ `stripe-filter-button` openDialog 筛选 dialog（select 支付状态五选项 + input-number 金额下限，form `data` 从页面 scope 回显当前值——二次打开预填当前筛选态，沿搜索 dialog 同款姿势）；I2 = 四档分段控件 onClick setValue + 选中态 className 表达式（A9 同型）+ url `range=` 物化；I3 = 搜索框 openDialog + P6b A1 终态姿势表单；I4 = 金额列 name→`amountMinor` + 日期列 name→`createdAt` + `sortable: true`（内建箭头 + aria-sort，静态 chevron 移除避免双箭头）。
> 2. **执行期实测发现（submitAction 求值域边界，C2 回写 ⑧ 素材行）**：**select 字段名在 form `submitAction` 表达式域不可解析**（`${filterStatus}` 求值失败 → 该 setValue 静默不执行——live 探针：`__stripeTestHooks.lastUrl` 显示 refetch 发生但参数为空；input-text 字段名可解析——P5b 口径精化：可解析性随字段型别/值注册路径而异）；**`$formData` 在 dialog 级 `onSubmitSuccess` 域可解析且携带 select 选中值**（`status=failed` 物化探针证据）——筛选 dialog 终态 = submitAction 保留字面量 `''` 预写（保证 submit 成功链）+ onSubmitSuccess 四连 setValue（`$formData.filterStatus`/`filterMin` 映射 + 按值重固定 chip）。
> 3. **visual 05 走查适配落字（沿 P5b visual 02/P6b 注记更新先例）**：搜索框接线后点击打开搜索浮层——walkthrough 在搜索点击后补 Esc 关闭断言（浮层走查语义不变：逐层开 + Esc 关 + 列表零回归）；其余 4 条 visual 用例零改动零回归。
> 4. **先红后绿证据**：interactions 4 条先行编写对未接线 HEAD 跑红 = **`4 failed`**（01 搜索浮层不存在 / 02 筛选 dialog 不存在 / 03 空态不出现 / 04 aria-sort 缺失）；接线后迭代转绿（I1 经 2 轮：submitAction 求值域探针排除 → onSubmitSuccess $formData 域落地 + dialog data 回显；红态截图无，以失败输出为准）。终态 **interactions 4/4 + visual 5/5 = 9/9 全绿**。

- Item Types: `Fix | Proof`

- [x] I1 筛选 chip 增删/组合收窄接线（Phase 1 裁定机制）：`stripe-chip-status-remove`/`stripe-chip-amount-remove` 移除单 chip → 列表按剩余组合收窄；`stripe-filter-button` 增 chip 候选载体（openDialog 维度选择 + form `setValue`，Phase 1 落字最小集——不发明分析篇 §4 外维度） → **已接线（执行落字 1）：双 chip visible 表达式 + 移除动作链 + 筛选 dialog（状态/金额下限两维度 + data 回显 + onSubmitSuccess $formData 四连 setValue）；e2e 02 绿（6→5 组合收窄 → 移除金额 chip 6 行 → 移除状态 chip 全量恢复）**
- [x] I2 日期范围预设档接线：`stripe-daterange` 四档点击 → `setValue` → 列表与（Phase 3 裁定的）图表数据按区间刷新（`control` 去抖沿 toast 生命周期先例预判） → **已接线（四档 setValue + 选中态 className 表达式 + `range=` url 物化；prev/mtd → 空态）；e2e 03 绿（空态出现/切回恢复/端点计数 ≥4）；图表联动随 Phase 3 overview dependsOn 落位**
- [x] I3 搜索参数化接线：`stripe-search` keyword → url 物化 + `dependsOn` 自动刷新（P6b A1 同型；P7a 已备 mock `keyword=` 路径与 st-payments-miss 单测） → **已接线（搜索框 openDialog + P6b A1 终态姿势）；e2e 01 绿（客户名命中 3 行/邮箱属性值命中 6 行/零命中空态/清空恢复/端点计数）**
- [x] I4 排序生效接线（Phase 1 裁定机制）：金额/日期两列 chevron 排序生效 + 排序方向视觉态 → **已接线（候选① 内建 sorter：amountMinor 数值序 + createdAt 字典序 + sortable；方向视觉态 = 内建箭头 + aria-sort）；e2e 04 绿（asc/desc 翻转 + desc 首行 €345.95/8月28日 + 第三击清除恢复 CN¥18.00）**
- [x] 筛选 URL 同步显式裁决落字（分析篇 §7 候选：路由 query ↔ 筛选状态双向绑定零通道——runtime/页面壳层能力候选，G-B2 同族口径，禁止 hack） → **已落字（筛选 dialog 注记 + 处置表 I1 行）：路由 query ↔ 筛选状态双向绑定零通道维持，runtime/页面壳层能力候选归 D1 输入池（回写 ⑧ 素材行），Phase 4 处置表终态收口**

Exit Criteria:

- [x] I1–I4 每条接线锁定项 ≥1 条先红后绿 e2e 全绿（新 spec 文件承载） → **4/4 绿（interactions 01–04）；红态 `4 failed` 落字（执行落字 4）**
- [x] 显式裁决项落字 Phase 2 处置注记（零静默跳过） → **筛选 URL 同步裁决注记落筛选 dialog note + 本 item 行；语法搜索降级注记落搜索 dialog note（I3 行）**
- [x] `stripe-replica-visual.spec.ts` 既有 5 条零回归 → **5/5 绿（visual 05 走查适配落字执行落字 3——搜索浮层 Esc 补步，其余断言零改动）**

### Phase 3 - 浮层、图表与 drawer 接线（I9/I10/widget/I5）

Status: completed
Targets: `page-schemas/stripe-payments.json`、`shared/mock-backend-stripe*.ts`

> **Phase 3 执行落字（2026-08-30 实测）**
>
> 1. **I9 导出链路接线**：导出 dialog 5 个静态 check 行改为内建 `checkbox` 字段（`className: 'st-check'` 维持 visual 03 `.st-check`×5 断言；form `data` 预填列勾选默认集），确认钮 = form `submitForm` → `submitAction: ajax post Stripe__exportPayments`（`includeScope: '*'`——checkbox boolean 值经请求体 `col*` 键流入，mock 分支兼容 `col*`/平铺双键）+ `messages: {success: '导出任务已创建', failed: '导出失败：请至少勾选一列'}` 成对 + dialog `closeOnSubmit: true`（成功才关；st-export-empty 空列集 → status 1 失败提示 + dialog 保持打开）。**真实下载通道裁决落字**：`RendererEnv` 无 download 通道（回写 ③/④/⑤/⑦ 同源），语义模拟为终态，`window.open`/blob hack 禁止——注记落导出 dialog note + D1 输入池素材（回写 ⑧ 携带）。
> 2. **执行期实测发现（checkbox 默认值通道，C2 回写 ⑧ 素材行）**：checkbox 字段的 `defaultValue` prop **不生效**（`aria-checked=false` live 探针——`useDefaultValuePush` 管线对 checkbox 未触达或被跳过）；**form 级 `data` 预填为可达通道**（搜索 dialog keyword 回显同款机制实测成立，`aria-checked` 随 data 翻转）。widget dialog 据此进一步将 `data` 绑页面 scope 表达式（`${(stWidgetChart ?? 'on') === 'on'}` 等）——**重开浮层预填当前会话态**（export 列勾选为 dialog 瞬态、每次开默认集，落字注记）。
> 3. **I10 图表-日期范围联动接线**：`stripe-source-overview` url 追加 `range=${stDateRange ?? 'lastmonth'}` + `dependsOn: ['stDateRange']`；mock `Stripe__overview` range 分派（prev/mtd → 空载荷 st-overview-empty 复用）。e2e 06：切「本月至今」→ KPI CN¥0.00/0 + `.recharts-line` 归零；切回「上月」→ 恢复；端点计数 ≥4。hover tooltip 维持 recharts 内建（零接线）。
> 4. **widget 增删近似接线（Phase 1 裁定载体）**：KPI 卡 ×4 `visible` 表达式 + 曲线容器 `stripe-chart-wrap` `visible`（`?? 'on'` 兜底即 st-widget-invalid Failure Path）；widget dialog 6 项 checkbox 字段化 + Apply `submitForm` → `submitAction` 字面量预写（submitAction 求值域 select/checkbox 字段名不可解析——Phase 2 同坑，字面量保证成功链）+ dialog `onSubmitSuccess` 四连 setValue（`$formData.widget*` 域）+ `closeOnSubmit: true`（Apply 后生效）。净额走势项驱动净额 KPI 卡 + 曲线容器双承载；客户余额/入账记录两项无预置区块（近似边界落字 note）；Edit 维持形态（显式裁决——与 Apply 同浮层语义重复）。
> 5. **I5 drawer 退款语义模拟接线（低成本升级条款）**：退款钮 onClick `ajax post Stripe__refundPayment`（`data: {id: '${id}'}` drawer 域求值）+ messages 成对 + `then` 链 `[component:refresh stripe-source-payments, closeDialog]`；再次收款/发送收据维持形态零生效（note 更新保持「零生效」关键词）。st-refund-miss：`__stripeTestHooks.refundMiss` 强制 → 失败提示 + drawer 保持 + 列表不变。e2e 08/09 绿（会话态行 pill 已退款随动/强制 miss 分支）。
> 6. **先红后绿证据**：Phase 3 用例 5 条（05–09）先行编写对未接线 HEAD 跑红 = **`5 failed`**（05 成功/失败 toast 均缺、06 KPI 不随动、07 卡不隐藏、08/09 toast 缺失）；接线后迭代转绿（3 轮：checkbox defaultValue 探针排除 → form data 预填 → widget data 绑 scope 表达式修正重开预填）。终态 **interactions 9/9 + visual 5/5 = 14/14 全绿**；新增 mock post-导出分支单测与实现同批落地（1 条，347 全绿）。

- Item Types: `Fix | Decision | Proof`

- [x] I9 导出链路接线（Phase 1 裁定载体）：`stripe-export-dialog` 勾选/范围 → `stripe-export-confirm` → 语义模拟端点 + toast；真实下载通道裁决落字 → **已接线（执行落字 1/2）：checkbox 字段化 + form data 预填 + submitForm ajax post includeScope + messages 成对 + closeOnSubmit；e2e 05 绿（st-export-empty 失败分支 dialog 保持 + 成功分支 toast + 关闭 + 端点计数 2）；真实下载通道裁决落字 note + D1 素材**
- [x] I10 图表-日期范围联动候选接线：`Stripe__overview` 端点区间参数化（mock 过滤域扩展）+ `dependsOn` 日期范围变量（联动失败/空序列兜底 P7a 已备）；hover tooltip 维持 recharts 内建 → **已接线（overview url `range=` 物化 + dependsOn stDateRange；mock prev/mtd → 空载荷）；e2e 06 绿（KPI 归零 + 空曲线 + 恢复 + 端点计数）；tooltip 内建零接线**
- [x] widget 增删近似接线（Phase 1 裁定载体）：widget dialog 勾选 + Apply/Edit → `visible` 表达式驱动 KPI 卡区显隐随动 → **已接线（KPI ×4 + 曲线容器 visible 表达式 + Apply submitForm 链 + data 绑 scope 预填当前会话态）；e2e 07 绿（取消勾选 → Apply → 卡隐藏 → 重开重勾 → 恢复）；近似边界（余额/入账无预置区块）+ Edit 形态裁决落字 note**
- [x] I5 drawer 操作处置落地（Phase 1 裁定）：退款等操作按钮接线 or 维持 §6.2 静态演示裁决落字；`st-refund-miss` Failure Path（若接线） → **已接线（低成本语义模拟升级）：退款钮 post Stripe\_\_refundPayment + then 链 component:refresh + closeDialog；st-refund-miss 经 refundMiss 钩子锁定；e2e 08/09 绿；再次收款/发送收据维持零生效落字 note**
- [x] I6/I7/I8/I11 终态落字（内建/静态已锁定项与显式裁决项归并处置表） → **已落字（Phase 4 处置表 I6/I7/I8/I11 行）：I6 色阶对 pill 内建锁定（mock 投影 className）、I7 等宽等额内建锁定（mock 轨 + tabular-nums）、I8 分页内建锁定 + 密度档切换显式裁决、I11 无批量栏对照维持（G-B3）**

Exit Criteria:

- [x] Phase 3 接线锁定项每条 ≥1 条先红后绿 e2e 全绿 → **05–09 五条全绿；红态 `5 failed` 落字（执行落字 6）**
- [x] I5/I9/I10 裁定注记落字（候选升级 or 维持裁决，零静默跳过） → **执行落字 1/4/5 + 各 dialog/drawer note 落位**
- [x] 目标 e2e（visual + interactions）全绿 → **visual 5/5 + interactions 9/9 = 14/14 全绿**

### Phase 4 - 处置表落字、C2 回写 ⑧ 与收口

Status: completed
Targets: 本计划、`docs/analysis/ui-review/C2-capability-gaps.md`、`docs/analysis/ui-review/P1-reference-apps/stripe-dashboard.md`、`docs/backlog/ui-review-roadmap.md`

> **Phase 4 执行记录（2026-08-30）**
>
> 1. **C2 回写 ⑧** 已落 `C2-capability-gaps.md` §3 追加区（回写 ⑦ 之后），全部回写输入逐条可指认：G-E 终态实测（密度档证据链闭环——切换不接线裁定 + P6b A9 机制证据引用；formatCurrency registry 候选维持；语义 pill 型别候选维持）、G-B3「无批量栏」对照终态（复刻页零选择集列 + flux 批量通道维持 crud 域内建现状、无新缺口证据）、分析篇 §7 两候选归属裁决（筛选 URL 同步 → runtime/壳层能力候选 D1 输入池；语法搜索解析 → 自研解析器候选 D1 输入池、复刻维持降级）、D1 输入池素材行六条、新素材行四条（checkbox defaultValue 通道坑 + form data 预填、submitAction 求值域按字段型别精化、table 内建 sorter 可达、`lastUrl` 观察 affordance）。初版裁决表零改动。
> 2. **分析篇对照**落 `stripe-dashboard.md` **§4.1**「P7b 接线实测『预测 vs 实测』对照」（§4 原无子节，编号不冲突）：12 行逐条「预判 vs 实测」对照（I1–I11 + §2.4 `?` 附录）+ §5 两行落点勘误（列排序行：crud 列配置 → table 内建 sortable 承载；日期范围行：input-datetime 家族 → 预设档分段控件 + url 物化承载）+ §7 两候选终态段。其余行与预判一致或为形态注记，无矛盾行不动。
> 3. **两维自查（P1 README §4.2）＝通过**：产品完成度——接线后无"demo 占位"按钮：搜索/筛选/日期档/排序/导出/widget/退款全部真实行为 + 反馈成对（interactions e2e 01–09）；显式裁决项全部携带裁决注记（筛选 URL 同步/语法搜索降级/密度档切换/真实下载通道/再次收款·发送收据零生效/无批量栏）且有锁定断言（e2e 05/09 + visual 01/02 注记断言）；数据全部经 mock 端点流动（列表/KPI/曲线/明细/导出确认/退款写全链）。视觉原创性——对照分析篇 §2 令牌抽查维持（密度 40px 默认行高/13px 正文/四语义色阶对/blurple `#635bff`/圆角阶/等宽字 tabular-nums）；新增交互零新增 CSS（复用既有 `.st-*` 形态类 + 内建 checkbox/箭头）；light-only 维持。
> 4. **样式契约自查（§4.3）＋变更面核查＝通过**：`git status --porcelain` 变更面仅 In Scope（`packages/` 零改动实测为空；`mock-backend.ts` 零触碰；showcase-env.ts 零改动 687 行双口径维持）；`stripe-replica.css` 零改动（接线全部复用既有形态类——Phase 1 预期的"状态类/选中态类增量"实测不需要：选中态经 className 表达式翻转既有 `st-seg-item-active`，勾选态经内建 checkbox 字段承载）；变更面 = schema 单页 + mock 五件（`-writes.ts` 新建）+ 单测 + interactions spec 新建 + visual spec 一处走查适配 + C2/分析篇/roadmap/plan 本体 + e2e artifacts + `_tmp/` 探针（已清理）。
> 5. **e2e spec 拆分确认**：沿 P4b/P5b/P6b 先例新建 `tests/e2e/stripe-replica-interactions.spec.ts` 承载交互用例 9 条（终态 346 行 < 500 不再二次拆分）；visual spec 保留初屏/浮层结构 5 条（294 行，仅 05 走查一处 Esc 适配落字）。
> 6. **全量验证 full-green**：`pnpm typecheck` 37/37、`pnpm build` 37/37、`pnpm lint` 37/37、`pnpm test` 68/68 任务（playground 33 files / 347 tests，含 stripe mock 单测 25 条）、`pnpm check` exit 0 零新增红（mock 五件 wc 201/116/262/52/93 全 ≤500，showcase-env 687/688 双口径维持）、目标 e2e visual 5/5 + interactions 9/9 = 14/14。

- Item Types: `Proof | Decision | Follow-up`

- [x] 分析篇 §4 交互清单 I1–I11 逐条处置终态表落字本计划（接线锁定 / 内建锁定 / 显式裁决 + §2.4 `?` 快捷键面板附录裁决——G-B2 口径同源，无静默跳过） → **已落字「交互清单处置表（I1–I11 + 附录）」节：接线锁定 6（I1/I2/I3/I5/I9/I10 复合计）/内建锁定 3（I4/I6/I7，I8 分页子项内建）/显式裁决 6 子项（I1 URL 同步、I3 语法解析、I8 密度切换、I11、附录 `?`、I5 次级操作），无静默跳过**
- [x] C2 回写 ⑧（追加式，初版裁决零改动）：G-E 终态实测、G-B3「无批量栏」对照终态、分析篇 §7 两候选归属裁决、`formatCurrency`/语义 pill 型别/密度档语义字段等 D1 输入池素材行落字 → **已追加（执行记录 1）**
- [x] 分析篇「预测 vs 实测」对照节（§4.1）+ §5/§7 勘误落字 → **已落 §4.1 十二行对照 + §5 两行落点勘误 + §7 两候选终态段（执行记录 2）**
- [x] 两维自查（P1 README §4.2 产品完成度/视觉原创性 + §4.3 样式契约）记录落字 → **自查通过（执行记录 3/4）**
- [x] e2e spec 拆分与否落字确认（Current Baseline 预登记的 interactions spec 承载终态） → **拆分落字（执行记录 5）：interactions spec 9 条 346 行，visual 5 条 294 行**

Exit Criteria:

- [x] 处置表 I1–I11 + 附录逐条有终态，C2 回写 ⑧ 与分析篇对照落字完成 → **处置表节 + 执行记录 1/2**
- [x] 两维自查通过（零打回项）并落字 → **执行记录 3/4**
- [x] roadmap Phase Status 区 P7b `planned`→`done` 仅在 closure audit 通过后执行 → **closure audit 通过后随收口翻转（见 Closure 节）**

## 交互清单处置表（I1–I11 + 附录，对应分析篇 §4/§2.4；终态 2026-08-30 执行落定）

> 起草期预登记处置方向；执行期按 Phase 落终态（接线锁定 / 内建锁定 / 显式裁决），无静默跳过。**全部处置完成**：接线锁定 6 条（I1/I2/I3/I5/I9/I10——其中 I1/I3/I5 为复合行含子项裁决）、内建锁定 3 条（I4/I6/I7）+ I8 分页子项、显式裁决 6 子项。每条接线/内建锁定项 ≥1 条程序化 e2e（interactions 01–09 + visual 01–05）；显式裁决项以注记 + 锁定断言承载，不构成档位违反（沿 P3b I15/P4b L/P5b N 口径）。

| #    | 交互（分析篇出处）                         | 终态                                                  | 落点与证据                                                                                                                                                                                            |
| ---- | ------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1   | 筛选 chip 增删/组合收窄（§4；🌐 URL 书签） | **接线锁定 + URL 同步子项显式裁决**                   | chip visible 表达式 + 移除动作链 + 筛选 dialog（状态/金额）→ url 物化 + dependsOn；组合收窄/移除恢复全周期 e2e 02；初始双 chip 固定样本近似落字；URL 同步 → runtime/壳层候选 D1 输入池（dialog 注记） |
| I2   | 日期范围预设档（§4 🌐）                    | **接线锁定**                                          | 四档 setValue + 选中态 className 表达式 → `range=` 物化，列表 + 图表双源联动；prev/mtd → 空集/空载荷；自定义档降级全量落字；e2e 03/06                                                                 |
| I3   | 语法搜索（§4 🌐）                          | **keyword 参数化接线锁定 + 解析器显式裁决**           | 搜索 dialog form submitOnChange + setValue → `keyword=` 物化（五域匹配）；e2e 01；语法解析器降级维持（§6.2）归 D1 输入池（dialog 注记）                                                               |
| I4   | 表格列排序（§4 🌐 部分列）                 | **内建锁定**                                          | table 列 `sortable` 内建（asc→desc→null + 内建箭头 + aria-sort）；amountMinor 数值序/createdAt 字典序；e2e 04                                                                                         |
| I5   | 行点击 → 明细 drawer + 退款（§4 拟定）     | **drawer 内建锁定 + 退款接线锁定 + 次级操作显式裁决** | drawer 打开/加载 P7a 维持（visual 02）；退款钮 post `Stripe__refundPayment` 会话态 + component:refresh 行 pill 随动 + refundMiss 钩子失败分支（e2e 08/09）；再次收款/发送收据维持零生效（注记）       |
| I6   | 状态 pill 语义色（§4 🌐 色阶对）           | **内建锁定**                                          | mock 投影 `statusPillClass` + 色阶对三件套令牌；visual 01 computed bg ≥4 断言；型别缺口维持 D1                                                                                                        |
| I7   | 金额右对齐等宽（§4 🌐）                    | **内建锁定**                                          | `.st-money` tabular-nums + 右对齐 + mock 轨千分位/币种小数位；visual 01 computed 断言 + 单测双轨对照；`formatCurrency` 候选维持 D1                                                                    |
| I8   | 分页/密度（§4；密度为拟定补充）            | **分页内建锁定 + 密度切换显式裁决**                   | 客户端分页 4 页内建维持（visual 01）；密度档切换不接线——原版无此控件 + P6b A9 机制证据已承载 G-E 链；三档样本维持（visual 04）                                                                        |
| I9   | 导出 CSV（§4 🌐 Schedule 裁剪）            | **语义模拟接线锁定 + 真实下载显式裁决**               | checkbox 列勾选 form → post includeScope 端点（零副作用确认载荷）+ messages 成对 + closeOnSubmit；空列失败分支 dialog 保持（e2e 05）；download 通道缺口 → D1 输入池（回写 ③ 同源第五例）              |
| I10  | 图表联动（§4 拟定）                        | **接线锁定 + tooltip 内建锁定**                       | overview `range=` 物化 + dependsOn 日期档；KPI + 曲线随档刷新/空载荷兜底（e2e 06）；hover tooltip recharts 内建                                                                                       |
| I11  | 批量操作（§4 调研结论）                    | **显式裁决维持「无批量栏」**                          | 零选择集列零批量栏（visual 01 注记断言）；flux 批量通道维持 crud 域内建现状——G-B3 对照终态收口（回写 ⑧）                                                                                              |
| 附录 | `?` 快捷键面板（§2.4 🌐）                  | **显式裁决不模拟**                                    | 键盘呼出无通道（G-B2 同族）；静态帮助面板不移植——本页快捷键面非核心交互（排序/筛选均按钮面接线），随键盘全谱归 D1                                                                                     |

> 终态计数：接线锁定 6 + 内建锁定 3（+ I8 分页子项）+ 显式裁决 6 子项；Esc 浮层关闭内建（visual 走查锁定）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session 独立子 agent `ses_faeceb4d3ffeaPGsrBvwm81ga3`（R1 全量四查 review + R2 scoped re-check，同 session 两轮）
- Verdict: `pass`（R1 `pass-with-minors`——零 Blocker/零 Major、5 Minor；5 Minor 随共识修复后 R2 scoped re-check `pass`）
- Rounds: 2
- Findings addressed: R1 ①mock 四件行数误植五数（103/116/242/103/52 → 103/116/242/52）；②Out-Of-Scope `mock-backend.ts` 归属路径错置（改写为 playground shared 路径 + 对齐 Closure Gates 双条款）；③Follow-ups「属本计划 Fix 范围」自相矛盾（改写为条件性 in-phase Fix）；④Phase 4 Item Types 缺 Decision（补为 `Proof | Decision | Follow-up`）；⑤执行顺序约束共写面漏列 C2 文档（补齐追加式共写说明）——零 Blocker/Major

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。全量验证归此处，Phase 内只做保证后续 Phase 能继续的局部验证。

- [x] 分析篇 §4 清单 I1–I11 逐条处置完成：接线锁定项全部先红后绿 e2e 锁定，显式裁决项全部落字（零静默跳过、零 hack 绕道） → **处置表节（Phase 4）+ 分析篇 §4.1 十二行对照**
- [x] `Stripe__` 写/会话端点终态集合契约单测全绿（先红后绿留痕） → **25 条 stripe 单测（新增 10 条，红态 `9 failed`/post 分支与实现同批）；347 全仓绿**
- [x] 零 `packages/` 改动、`mock-backend.ts` 零触碰（`git status --porcelain` 核查落字） → **`git status --porcelain` 无 `packages/` 条目、`mock-backend.ts` 不在变更面（Phase 4 执行记录 4）**
- [x] C2 回写 ⑧ 与分析篇对照/勘误落字完成 → **回写 ⑧ 追加（G-E/G-B3/两候选/D1 素材六条/新素材四条）；分析篇 §4.1 + §5 两行勘误 + §7 终态段**
- [x] 两维自查（P1 README §4.2/§4.3）通过并落字 → **Phase 4 执行记录 3/4，通过零打回**
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项 → **closure audit 通过（fresh session 独立子 agent `ses_fae64ea42ffesnymhQ21CVu2Pk` 1 轮）：verdict **APPROVED** 零 Blocker/零 Major（2 Minor 随收口修正：plan 执行记录 5 spec 行数 413/295 → live wc 346/294；playground 文件数 34 → 33/347 tests）。审计独立复核：plan 内部一致性（四 Phase 全 `completed` 零遗留 `[ ]`，唯一未勾项=本 gate 本体）、变更面（`packages/`/`mock-backend.ts`/`showcase-env.ts`/`stripe-replica.css` 均不在 diff）、品牌边界（schema 5 处 "Stripe" 全为端点 URL）、mock 契约（refund 会话态 + 双守卫/export 零副作用/钩子生产 no-op）、五件 ≤500、url 物化 + dependsOn 落位、红绿数字自洽（15+9+1=25 单测；4+5=9 e2e 新例）、用例真实性抽查（21 个 spec-referenced testid 全部 grep 命中 schema；refund then 链逐项核对）、C2 ⑧ append-only（29+/0−）、分析篇 §4.1/§5/§7 落位、Closure 节审计前保持未填。证据见 Closure 节**
- [x] `pnpm typecheck` → **37/37 全绿**
- [x] `pnpm build` → **37/37 全绿**
- [x] `pnpm lint` → **37/37 全绿**
- [x] `pnpm test` → **68/68 任务全绿（playground 33 files / 347 tests 确认）**
- [x] `pnpm check`（零新增命中，红项仅限既有登记） → **exit 0；oversized 仅既有 2 个注册豁免 i18n 文件 + showcase-env 688 既有 WARN（门禁口径，零改动维持）**
- [x] 目标 e2e（`stripe-replica-visual` + `stripe-replica-interactions`）全绿 → **visual 5/5 + interactions 9/9 = 14/14**

## Deferred But Adjudicated

### 筛选/搜索/排序状态写入 URL（可书签/分享，分析篇 §2.4 🌐 + §7 候选）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 需路由 query ↔ 筛选状态双向绑定，属 runtime/页面壳层能力候选；schema 层零通道维持（P7a §8 初判一致），归属裁决归本计划 C2 回写 ⑧，产品化归 D1 流程
- Successor Required: `no`
- Successor Path: D1 输入池（回写 ⑧ 素材行）

### 密度档切换接线

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Stripe 原版无密度切换控件（I8「密度档为拟定补充」）；复刻页三档样本 + className 表达式机制证据（P6b A9）已覆盖 G-E 密度档 L2 缺口证据链，无需为本页发明控件
- Successor Required: `no`
- Successor Path: D1 密度档语义字段候选（回写 ⑧ 携带）

## Non-Blocking Follow-ups

- `Stripe__` mock 数据集状态样本在接线中发现不足（筛选组合中间态/时间线变体/曲线区间样本）时在 `mock-backend-stripe*.ts` 内补样本——此为**条件性 in-phase Fix**（触发即在本计划 Phase 2/3 内执行，非 closure 后遗留债务）；登记于此仅沿 P7a Follow-up 惯例保留可追溯性
- 语义 pill 型别、`formatCurrency` registry 函数、下载/print 宿主通道等 D1 输入池候选，随回写 ⑧ 登记后由 D1 独立 plan 承载

## Closure

Status Note: 四个 Phase 全部 `completed`、Exit Criteria 全勾、Closure Gates 全部通过：Pi-b 义务收口成立——`Stripe__` mock 写/会话端点补全（`Stripe__refundPayment` post 会话态（status 翻转 + timeline 追加 + miss/already-refunded 双守卫 + `refundMiss` 钩子）、`Stripe__exportPayments` get/post 双路零副作用语义模拟（空列集 st-export-empty 失败分支）+ `minAmount=`/`range=` 过滤域扩展 + `__stripeEndpointCalls`/`__stripeTestHooks.lastUrl` 生产 no-op 钩子；mock 五件 201/116/262/93/52 全 ≤500，showcase-env 687/688 双口径零改动，`mock-backend.ts` 零触碰）；单页 schema 交互接线——筛选 chip 增删/组合收窄（visible 表达式 + 筛选 dialog url 物化）、日期范围四档（列表 + 图表双源联动）、搜索 keyword 参数化、金额/日期列内建排序（aria-sort 视觉态）、导出链路（checkbox 列勾选 → 语义模拟端点 + messages 成对 + 空列拦截）、widget 增删近似（visible 表达式驱动 + Apply 后生效）、drawer 退款语义模拟（会话态行 pill 随动）全部先红后绿 e2e 锁定（interactions 9 条；visual 5 条零回归——05 走查一处 Esc 适配落字）；显式裁决零静默跳过（筛选 URL 同步/语法搜索解析器/密度档切换/真实 CSV 下载通道/再次收款·发送收据/无批量栏 I11/`?` 快捷键面板附录——处置表 + 分析篇 §4.1 十二行对照落字）；C2 回写 ⑧ 追加（G-E 终态实测 + G-B3 无批量栏对照终态 + 分析篇 §7 两候选归属裁决 + D1 输入池素材六条 + 执行期新素材四条，append-only 29+/0−，初版裁决零改动）+ 分析篇 §5 两行落点勘误 + §7 两候选终态段；两维自查（P1 README §4.2/§4.3）通过零打回；全量验证 full-green（typecheck/build/lint 37/37、test 68/68 任务含 playground 33 files/347 tests——stripe mock 单测 25 条、check exit 0 零新增红、目标 e2e visual 5/5 + interactions 9/9 = 14/14）；执行期三项机制实测发现（submitAction 求值域按字段型别精化、checkbox defaultValue 通道坑 + form data 预填可达、`lastUrl` 观察 affordance）随回写 ⑧ 落字。执行顺序约束 `P7a → P7b` 满足；无 in-scope live defect 或 contract drift 被降级（closure audit R1 APPROVED 零 Blocker/零 Major，2 Minor 随收口修正）。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh session `ses_fae64ea42ffesnymhQ21CVu2Pk`（1 轮全量审计）
- Evidence: verdict **APPROVED** 零 Blocker/零 Major（2 Minor 随收口修正：spec 行数记录 413/295 → live wc 346/294；playground 文件数 34 → 33/347 tests）。7 项 checklist 全 Pass：①plan 内部一致性（四 Phase 全 `completed`、唯一未勾项 = 审计 gate 本体）；②变更面（`packages/`、`mock-backend.ts`、`showcase-env.ts`、`stripe-replica.css` 全不在 diff）；③契约抽查（品牌边界 5 处 "Stripe" 全 URL、refund/export/钩子契约逐项、mock 五件 ≤500、url 物化 + dependsOn 落位）；④红绿数字自洽（15+9+1=25 单测、4+5=9 e2e 新例、终态 14/14）；⑤用例真实性（21 个 spec-referenced testid grep 命中 + refund then 链逐项核对）；⑥文档落位（C2 ⑧ append-only 29+/0−、分析篇 §4.1 十二行 + §5 两行勘误 + §7 终态段）；⑦审计前 Closure 节未填 + roadmap 未翻转（顺序纪律）。审计独立复跑：typecheck/build/lint 37/37、playground 347/347、目标 e2e 14/14（2 例冷启动抖动经 config retry=1 通过）、`pnpm check` exit 0、`_tmp/` 零残留。收口记录见 `docs/logs/2026/08-30.md`（P7b 执行条目，unit + e2e 双全绿）。

Follow-up:

- 处置表显式裁决项的 D1 产品化候选新增已随回写 ⑧ 素材行登记（formatCurrency/语义 pill 型别/密度档语义字段/下载-print 宿主通道/筛选 URL 同步/语法搜索解析六条）；checkbox defaultValue 通道与 submitAction 求值域两条 deep-audit 候选随回写 ⑧ 新素材行登记；除此之外 no remaining plan-owned work
