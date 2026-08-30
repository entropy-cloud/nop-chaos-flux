# P7a Stripe dashboard 数据面板复刻 — 分析与静态复刻

> Plan Status: active
> Mission: ui-review
> Work Item: P7a. Stripe 风格数据面板复刻 — 分析与静态复刻
> Last Reviewed: 2026-08-30
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P7a 条目 + Phase Details P7 + Cross-Cutting 1–7）；复刻工程规范 `docs/analysis/ui-review/P1-reference-apps/README.md`（slug `stripe`/CSS 前缀 `st`/端点 `Stripe__` 分配表 + §1–§5 全部硬规则）；应用分析篇 `docs/analysis/ui-review/P1-reference-apps/stripe-dashboard.md`（§2 令牌结构含色阶对规则、§3 五页面复杂度、§4 交互清单 I1–I11、§5 能力映射、§6.2 差异声明、§7 转 C2 候选）
> Related: `docs/plans/2026-08-29-0419-2-p1-reference-app-research-and-replication-spec.md`（P1，completed）；`docs/plans/2026-08-30-0614-2-p6a-airtable-grid-static-replica.md`（Pi-a 最近先例：单页裁定型制、差异声明节、mock 模块行数双口径记录、行高密度档样本、静态实测结论节）；`docs/plans/2026-08-30-0040-2-p5a-notion-database-static-replica.md`（单页多区块先例）
> 执行顺序约束：roadmap 虚线 `P6b -.-> P7a`——本计划在 P6b `done` 前不得开始执行（P6b plan 已同批起草：`docs/plans/2026-08-30-0953-1-p6b-airtable-interaction-wiring-and-tests.md`，draft）；两计划无内容冲突，`showcase-env.ts` 与 roadmap Phase Status 区为顺序共写面——执行启动时必须重新 live 复核本节 baseline（尤其 `showcase-env.ts` 行数余量与 P6b 对 `mock-backend-airtable*.ts` 的模块组织改动）

## Purpose

消费 P1 已产出的复刻工程规范与 Stripe dashboard 分析篇，把「金融数据面板的密度与排版标杆」（高密度交易列表 + 筛选 chip 条 + 状态语义色 pill 色阶对 + 金额等宽排版 + 明细 drawer + 图表卡区）以 flux schema + 复刻 CSS + mock 读端点做**静态复刻**落进 playground，压测 `table` 底座与 `chart`/`badge`/CSS 令牌对 G-E（高密度排版——本应用主对照行）与 G-B3（批量操作栏——调研结论「参考应用无此件」的对照素材行）的承载度，并为 P7b（交互接线与测试）提供全部静态落点与 G-E/G-B3 静态实测结论。

## Current Baseline

live 复核 2026-08-30，worktree `nop-chaos-flux-ui-review`（分支 `ui-review`），working tree clean（HEAD `6e69351be`）：

- 上游全部就绪：roadmap R0–R3、C1、C2、P1、P2a/P2b、P3a/P3b、P4a/P4b、P5a/P5b、P6a 均 `done`；P6b plan 已起草（`docs/plans/2026-08-30-0953-1-p6b-airtable-interaction-wiring-and-tests.md`，draft——虚线前置，无文件冲突）。P1 产出 `docs/analysis/ui-review/P1-reference-apps/README.md`（`stripe` slug/`st` CSS 前缀/`Stripe__` 端点前缀分配表 + 目录/mock/e2e/验收规范）与 `stripe-dashboard.md`（§2 令牌到变量级 + 色阶对结构规则 🌐、§3 五页面 ★~★★★★★、§4 交互 I1–I11、§5 能力映射、§6.2 差异声明、§7 两候选）已落盘。
- **`stripe` 复刻产物零存在**（`ls apps/playground/src/complex-pages/page-schemas/`、`tests/e2e/`、`complex-pages/__tests__/`、`shared/` 实测无 stripe 条目；`showcase-env.ts` 无 `Stripe__` 分支），本计划为该 slug 的建立者。
- 复刻基建先例在库（五 slug）：`showcase-env.ts`（**699 行**（wc）、门禁切分口径 **700 行**——双口径零余量贴线）`replicaBranches` `[prefix, handler]` 数组派发循环——追加 `Stripe__` 需数组条目 + import 约 2 行胶水，**必须先做等价余量整理**（零行为变化的行合并/压缩，P5a Phase 1 整理先例）使总行数 ≤700 双口径，整理与本计划新增行数以 wc + 门禁双口径落字记录；`styles.css` 头部 @import 簇（@import 必须位于 `@source` 指令之前）；`complex-pages-model.ts` `COMPLEX_PAGE_ENTRIES` 注册（category `app-replica`）；`tests/e2e/airtable-replica-visual.spec.ts`（336 行）e2e 骨架（openPage 模式）。`mock-backend.ts`（463 行）零触碰红线。
- **render-host registry 已注册 7 包**（`apps/playground/src/complex-pages/shared/render-host.tsx:5-22`：basic/form/form-advanced/data/content/layout/scheduling）——本计划所需 `table`/`chart`（flux-renderers-data，recharts，含单 series 逐点上色 `colorRegionKey`，roadmap Platform Reuse 表在案）/`drawer`/`dialog`/form 族全部可达，预期零 render-host 改动。
- **关键承载实测结论（先例证据，Phase 1 Decision 输入）**：
  1. **高密度交易表格底座 = `table` renderer**（P6a 底座裁定同源实测：`source` 端点流动 + `columns[].cell` 分派 + 客户端分页 pageSize 10 ≥3 页 + 行 hover 纯 CSS；crud 工具栏/查询 chrome 与 Stripe 列表页形态偏差大，不采用）。部分列排序形态（分析篇 I4「some of which provide sorting」）以列头 chevron 形态静态承载，排序生效归 P7b（table 内建 sorter vs mock 参数化 Phase 内实测口径落字）。
  2. **状态 pill 色阶对**：分析篇 §2.1 🌐 官方结构——每语义色为色阶对（Badge = 背景 +1 档、文字再 +1 档），非单色——`--st-*` 令牌按 succeeded/pending/failed/refunded 四语义 × bg/text 成对声明（具体 hex 📊/拟定逐项标注），pill 以 badge/chip 静态承载。
  3. **金额等宽排版**：`tabular-nums` + 右对齐以 `.st-*` 复刻类承载（金融表格硬约束，分析篇 §2.2）；金额格式化以 mock 预计算为主（P6a 先例），schema 表达式格式化对比实测结论 Phase 2 落字（P6a G-D §3 同源口径）。
  4. **筛选 chip 条**：手写 chip 形态（分析篇 §5 原语缺失自研）——静态 chip 条样本（2–3 chip + 单个移除按钮形态 + Filter 按钮形态）零生效；chip 增删/组合收窄/URL 同步生效归 P7b（I1）。
  5. **日期范围**：预设档静态形态（上月默认选中样本 + 此前各月/本月至今/自定义档位形态）；`input-datetime` 家族接线归 P7b（I2；P3a/P3b 实测在库）。
  6. **语法搜索降级**（§6.2 差异声明维持）：不复刻语法解析器，降级为「chip 筛选 + keyword 搜索」组合——搜索框静态形态，接线归 P7b。
  7. **明细 drawer**：`openDrawer` side right + form `loadAction` 明细端点（摘要 + 时间线 + 元数据分区静态形态）；行点击打开 = 打开类最小静态动作（沿 P2a/P3a/P4a/P5a/P6a 先例允许）；退款等操作按钮形态零生效。
  8. **图表卡区**：`chart` renderer（recharts line）+ KPI 卡静态承载 net volume 曲线与总览指标；chart 数据经 mock 端点预计算序列流动（非写死展示数组——P1 README §4.2）；hover tooltip 为 recharts 内建行为（样本允许）；图表-表格联动归 P7b（I10）。
  9. **widget 增删形态**：Add under Your overview → 勾选 → Apply/Edit（分析篇 §3 🌐）——「添加 widget」入口 + 勾选列表 dialog 静态形态（真实打开 + 零生效注记，生效归 P7b）。
  10. **无批量栏（G-B3 对照素材）**：分析篇 I11 调研结论——Stripe 原生无批量栏，复刻页**不新增**（与原版结构一致）；G-B3 回写素材（「参考应用无此件」+ flux 侧选择集/批量动作通道现状对照）Phase 3 静态实测结论落字。
  11. **导航 shell**：左侧分组导航（Home/Balances/Transactions + Shortcuts 固定/最近 + Products 分组 + More 收纳 🌐）——页面级静态侧栏形态（分组标题 + 条目 + blurple 选中态样本），路由切换零动作静态（多页裁定若成立则为页间 navigate 候选，Phase 1 裁定）。
  12. **无 popover 原语**（P4a/P5a/P6a 实测口径维持）——导出模态、添加 widget、Filter 面板等载体为 dialog/drawer（P5a D2/P6a D2 先例）。
- **schema JSON 不入 oversized 门禁**：`scripts/check-oversized-code-files.mjs` 仅扫描 `.js/.jsx/.ts/.tsx/.mjs/.cjs`——页面粒度裁定仍以可维护性为准，且**新落盘 ts 文件行数必须以 wc 与门禁切分双口径诚实记录**（P5a/P6a closure audit Major 教训：行数记录不实即打回）。
- C2 对应行：**G-E（高密度排版——本应用主对照行：密度档/等宽计数/语义色状态/chip 筛选条）**、G-B3（批量操作栏——「无批量栏」对照素材）、G-A（明细侧板/图表卡/导航 shell）、G-F（hover/选中态/焦点 ring）——P7a 只做静态实测证据记录，不做裁决与接线（回写义务归 P7b）。
- 分支纪律与命名（P1 README §0 分配表）：文件名 `stripe-*.json`、CSS 类/变量 `.st-*`/`--st-*`、mock 端点 `Stripe__`、页面 id `stripe-payments`（终态以 Phase 1 D1 裁定为准）；testid 一律 `stripe-<语义名>`（P1 README 硬规则 3）。

## Goals

- （Phase 1 裁定终态数量的）`stripe-*` 页面 schema 落盘并注册（category `app-replica`），覆盖分析篇 §3 裁剪后的复刻清单：支付列表主对照页（导航 shell 形态 + 筛选 chip 区 + 日期范围预设档形态 + 语法搜索降级形态 + 高密度表格 ≥30 行经 mock 流动 + 状态 pill 色阶对 + 金额等宽右对齐 + 分页 + 导出模态形态）+ 交易明细 drawer（摘要/时间线/元数据分区）+ 图表卡区（KPI 卡 + net volume 曲线 + widget 增删形态）；Balance ★★ 页入/裁 Phase 1 裁定落字。
- `stripe-replica.css` 落盘：浅色令牌架构（品牌紫 blurple `#635bff` 📊、深蓝灰 `#0a2540` 📊、页面底/卡片白/冷灰边框/slate 次级文字拟定值逐项标注、四语义状态 pill 色阶对结构 🌐、行密度三档 32/40/48px 拟定、`tabular-nums` 金额、13px 高密度正文）声明于 `.st-root, .st-dialog` 双作用域（变量 `--st-*`、类 `.st-*`）；差异声明（📊/拟定标注、Söhne→Inter/system-ui 近似栈、色阶对结构声明、light-only）落字本计划 + CSS 头注（两处一致）。
- `shared/mock-backend-stripe*.ts`（+ 按需拆分，全部 ≤500）+ `showcase-env.ts` fetcher 追加 `Stripe__` 读端点分支（get-only，候选：payments 列表（分页 ≥3 页 + keyword/status 参数兜底）、payment 明细（`?id=`，drawer 取数）、overview（KPI + 曲线序列预计算）；分支体下沉，showcase-env 整理后 ≤700 双口径）。
- 每页至少 1 条初屏结构 e2e 用例（`tests/e2e/stripe-replica-visual.spec.ts`）全绿；`stripe-mock-backend.test.ts` 单测全绿。
- G-E/G-B3 静态实测结论落字（密度三档实测、色阶对结构承载、等宽排版承载、金额格式化双轨对比、chip 条/日期范围/搜索形态的 schema 表达边界、无批量栏对照、widget 增删 schema 表达边界——P7b 起点与 C2 回写携带）。
- 完成复刻验收自查（P1 README §4.2 两维 + §4.3 样式契约）。

## Non-Goals

- 不做交互接线与写端点（chip 增删/组合生效、日期范围刷新、搜索参数化、列排序生效、行点击 drawer 的取数已属打开类最小静态动作但 drawer 内操作零生效、导出 CSV 下载、widget 增删生效、图表联动等属 P7b；Pi-a 只做「可见可点」的静态形态——浮层/dialog/drawer 的打开类最小静态动作沿 P2a/P3a/P4a/P5a/P6a 先例允许）。
- 不回写 C2（Pi-b closure 义务，roadmap Cross-Cutting 5）；本计划只落字「G-E/G-B3 静态证据与可模拟性结论」供 P7b 携带。
- 不改 `packages/` 下任何 renderer/ui/runtime 代码；筛选 chip 原语、密度档语义字段、语法搜索解析、筛选状态 URL 同步（分析篇 §7 候选）、批量操作栏等产品化归 D1 流程。
- 不新增批量操作栏（I11 差异声明：与原版结构一致，Stripe 无此件）。
- 不实现语法搜索解析器（§6.2 降级声明维持）；退款/Dispute 业务操作、报表 Schedule（日/周/月+列+币种→邮件）不复刻（静态演示差异声明维持）。
- 不复制任何 Stripe 品牌资产（logo/词标/Marks Usage Agreement 约束素材/Söhne 原字体/插画/产品截图/原文案）；文案全部自拟中文，产出界面不得出现 "Stripe" 名称与商标。
- 不复刻分析篇 §3 未列的 Stripe 面（Connected accounts drawer、Reporting 报表页深形态、Billing/Terminal 等产品域），仅复刻裁剪后清单内条目。
- 不做暗色适配（Stripe dashboard 以浅色为默认场景；light-only 声明落字）。

## Scope

### In Scope

- `apps/playground/src/complex-pages/page-schemas/stripe-*.json`（一页一文件；页面集与浮层归属仅限 Phase 1 Decision 裁定）
- `apps/playground/src/stripe-replica/stripe-replica.css`
- `apps/playground/src/styles.css`（仅追加一行 `@import './stripe-replica/stripe-replica.css';`，限头部 @import 簇内——不得置于 `@source` 指令之后）
- `apps/playground/src/complex-pages/shared/mock-backend-stripe.ts`（+ 按需拆分 `-types.ts`/`-payments.ts`/`-overview.ts` 等实体模块）
- `apps/playground/src/complex-pages/shared/showcase-env.ts`（`Stripe__` 分支委托；**前置等价余量整理**，总行数 ≤700 双口径，分支体在 mock-backend-stripe\*.ts）
- `apps/playground/src/complex-pages/complex-pages-model.ts`（仅追加 `COMPLEX_PAGE_ENTRIES` 条目；features 用机制词、端点名仅入 description——P4a 惯例）
- `apps/playground/src/complex-pages/__tests__/stripe-mock-backend.test.ts`
- `tests/e2e/stripe-replica-visual.spec.ts`（初屏结构用例）
- roadmap Phase Status 区 P7a `todo`→`planned`（draft review 通过后）

### Out Of Scope

- `packages/` 全部代码、`tests/e2e/` 中非本 spec 的文件、roadmap 状态区以外文档改动、`docs/analysis/` 既有文档回写（分析篇修订仅当复刻实测与调研结论矛盾时做事实勘误，见终期 Phase）、`mock-backend.ts`、`mock-backend-antdpro.ts`/`mock-backend-cal.ts`/`mock-backend-linear*.ts`/`mock-backend-notion*.ts`/`mock-backend-airtable*.ts`、新增 playground 非 stripe schema 页面、新 CSS 文件（仅 `stripe-replica.css`）。

## Failure Paths

> 涉及 mock 读端点，列最小集（`st-` 前缀沿 P6a `at-` 惯例）。

| 可测场景编号      | 触发                         | 行为                        | 可重试 | 用户可见表现                                   |
| ----------------- | ---------------------------- | --------------------------- | ------ | ---------------------------------------------- |
| st-payments-miss  | payments 端点过滤参数无匹配  | 返回空数组                  | 是     | 表格空态文案，不报错                           |
| st-status-unknown | status 筛选参数非枚举        | 返回兜底全量形态            | 是     | 默认列表，不崩                                 |
| st-payment-miss   | payment 明细端点 id 无匹配   | 返回兜底记录                | 是     | drawer 占位字段（linear/notion/airtable 先例） |
| st-overview-empty | overview 序列数据缺          | 空序列占位                  | 是     | 图表空态/KPI 占位，不崩                        |
| st-page-unknown   | 注册 id 拼写不一致           | 复刻页不可达（开发期即修）  | 否     | showcase 列表无该页                            |
| st-drawer-missing | drawer testid/目标配置不一致 | drawer 打不开（开发期即修） | 否     | 行点击无响应（P7b 接线对象）                   |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（P1 README §4.1 Pi-a 档位）。最低证明：`stripe-mock-backend.test.ts` 全绿 + 每页 ≥1 条初屏结构 e2e 用例全绿（程序化断言：testid 可见性 / 关键文案 / 数据来自 mock 端点 / `getComputedStyle` 断言 `--st-*` 令牌在 `.st-root` 子树可解析 / 行密度默认档 ≈40px 实测 / 金额列 `tabular-nums` computed style / 状态 pill 四语义色阶对可辨识 / 无 "Stripe" 商标字样断言；截图仅作视觉证据附件）。chip 增删/搜索/排序/图表联动等交互契约的先红后绿锁定归 P7b（必须自动化档）。

## Execution Plan

> 顺序 Phase。Phase 1 基座先行（页面粒度/CSS/mock/注册是后续每页的依赖）；Phase 2 支付列表主对照页；Phase 3 图表卡区 + G-E/G-B3 静态实测结论与验收自查收口。

### Phase 1 - 基座：页面粒度与承载裁定 + 复刻 CSS + mock 读端点 + 注册

Status: planned
Targets: `apps/playground/src/stripe-replica/stripe-replica.css`、`styles.css`（仅追加 @import 一行）、`shared/mock-backend-stripe*.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/stripe-mock-backend.test.ts`

- Item Types: `Decision | Fix | Proof`

- [ ] Decision——页面粒度裁定：分析篇 §3 五页面（支付列表 ★★★★★ / 明细 drawer ★★★★ / 图表卡区 ★★★ / Balance ★★ / 导航 shell ★★）映射为 schema 集的默认切分——默认提案单页 `stripe-payments`（导航 shell 形态 + 列表 + 明细 drawer + 导出模态 + 图表卡区页内承载，G-E 压测对象是「同页密度族」，沿 P5a/P6a D1 型制），图表卡区过载则拆 `stripe-home` 独立页并落字理由（终态清单必出）；Balance ★★ 入/裁裁定落字；导航 shell 静态承载与（若多页）页间 navigate 归属裁定 → 结论落字「差异声明（P7a 裁定）」D1
- [ ] Decision——浮层与替代承载裁定：筛选 chip 条/日期范围/搜索/导出模态/添加 widget/明细 drawer 载体与零生效注记（D2 ①–⑥）+ 语义状态 pill 四态清单与数据集状态覆盖裁定 → 结论落字「差异声明（P7a 裁定）」D2
- [ ] Decision——令牌差异裁定：按分析篇 §2 提取 `--st-*` 变量架构；📊/拟定逐项标注、色阶对结构（bg+1/text+1）声明、blurple/Downward 深蓝灰定位（复刻层独立令牌，不映射 flux `--primary` hsl 体系——sundial/notion/airtable 先例）、Söhne→Inter 近似栈、行密度三档 px、`tabular-nums`、light-only——结果写入本计划「差异声明（P7a 裁定）」节 + CSS 文件头注 → 结论落字 D3
- [ ] Decision——`showcase-env.ts` 余量整理裁定：现 699/700 双口径零余量，追加 `Stripe__` 胶水约 2 行前必须先做等价余量整理（零行为变化的行合并/压缩，P5a Phase 1 先例）——整理后与追加后的行数以 wc + 门禁切分双口径落字记录，总行数 ≤700
- [ ] Fix——`stripe-replica.css`：令牌块声明于 `.st-root, .st-dialog` 双作用域，变量名 `--st-*`、类名 `.st-*`；行密度三档密度类、行 hover、pill 色阶对四语义态、`tabular-nums` 金额类、chip 形态、KPI 卡、导航 shell 形态类等品牌专有视觉就绪；只写品牌专有视觉，布局/间距用 schema 内 Tailwind 工具类与 container props（双轨规则，P5a/P6a container-body 教训注记）
- [ ] Fix——`styles.css` 在头部 @import 簇内追加 `@import './stripe-replica/stripe-replica.css';`（仅此一行，置于 `@source` 指令之前）
- [ ] Fix——`mock-backend-stripe*.ts`：类型 + 工厂 + 过滤/分页/序列助手；数据结构真实（payments ≥30 行满足默认页大小 10 至少 3 页、四语义状态全覆盖、金额/币种/卡品牌/风险字段样本、明细记录含时间线与元数据分区、overview KPI + 曲线预计算序列）；沿既有 fetcher 分支工厂模式导出分支，全部 get-only；行数以 wc + 门禁切分双口径记录
- [ ] Fix——`showcase-env.ts` 追加 `Stripe__` 分支委托（`replicaBranches` 数组条目 + handler 下沉，Phase 1 Decision 余量整理后追加）；总行数 ≤700 双口径且五 slug 既有端点零回归（既有单测证明）；`mock-backend.ts` 零触碰
- [ ] Fix——`COMPLEX_PAGE_ENTRIES` 追加页面条目（id/title/category: `app-replica`/description 写明复刻区块与端点名、features 4 个机制词标签——P1 README 硬规则 6 + P4a 惯例）
- [ ] Proof——`stripe-mock-backend.test.ts`：数据集结构断言（分页 ≥3 页、状态覆盖、明细分区、overview 序列、空过滤路径、未知参数兜底、get-only 契约、showcase-env 路由、注册断言）

Exit Criteria:

- [ ] 页面粒度、浮层承载、令牌差异、showcase-env 余量整理四类 Decision 全部落字「差异声明（P7a 裁定）」节
- [ ] `Stripe__` 端点经 fetcher 分支可命中且全部 get-only；showcase-env 总行数 ≤700 双口径，既有五 slug 端点零回归（既有单测全绿证明）
- [ ] CSS/mock/注册/test 四类文件落盘；`pnpm --filter @nop-chaos/flux-playground test -- stripe-mock-backend` 全绿
- [ ] showcase 页面列表可见全部 `stripe-*` 条目（注册生效；页面可达性 e2e 证明归 Phase 2）

### Phase 2 - stripe-payments：支付列表主对照页（导航 shell 形态 + 筛选区 + 高密度表格 + 明细 drawer + 导出模态）

Status: planned
Targets: `page-schemas/stripe-*.json`、`tests/e2e/stripe-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [ ] 导航 shell 形态：左侧分组导航静态（分组标题/条目/Shortcuts 与最近/More 收纳形态 + blurple 选中态样本；零路由动作或多页 navigate——Phase 1 D1 裁定落地）（`stripe-*` testid 逐节点落位，P1 README 硬规则 3）
- [ ] 筛选区形态：筛选 chip 条静态样本（2–3 chip + 单个移除按钮形态 + Filter 按钮形态，零生效 + 归 P7b 注记）+ 日期范围预设档形态（上月默认选中样本 + 自定义档位形态）+ 语法搜索降级搜索框形态（§6.2 降级注记）
- [ ] 高密度交易表格：列头行（金额右对齐/日期/状态/客户/支付方式等列集——📊 推断列集按分析篇 §3 落字）+ 记录行 ≥30 行经 mock 流动 + 客户端分页 ≥3 页 + 行 hover 浅灰铺底 + 部分列排序 chevron 形态（零生效注记）+ 行密度默认档 ≈40px 实测
- [ ] 状态 pill 四语义色阶对（succeeded 绿/pending 琥珀/failed 红/refunded 灰——bg+1/text+1 成对令牌）+ 金额 `tabular-nums` 等宽右对齐 + 小数位按币种样本
- [ ] 交易明细 drawer：行点击 openDrawer（打开类最小静态动作先例）→ form `loadAction` 明细端点 → 摘要/时间线/元数据分区静态形态 + 退款等操作按钮形态零生效 + miss 占位兜底
- [ ] 导出模态形态：Export 按钮 → dialog（时区/日期范围/列勾选静态形态 + 确认按钮零生效注记——CSV 下载归 P7b）
- [ ] 无批量栏声明落字（I11 差异声明：表格无选择集列、无批量栏——与原版结构一致）
- [ ] e2e：初屏结构用例 ≥1 条（表格列头/行数据来自 mock/pill 色阶对辨识/`getComputedStyle` 断言 `--st-*` 令牌与行密度 40px 与 `tabular-nums`/drawer 打开与端点数据/导出模态打开/无 "Stripe" 商标字样）

Exit Criteria:

- [ ] Phase 1 D1 裁定的主对照页 id 可达（`#/complex-pages/<D1 裁定 id>`）且初屏结构 e2e 用例绿
- [ ] 高密度表格/pill 色阶对/金额等宽/筛选区/drawer/导出模态在 schema 与 CSS 中可辨识；金额格式化双轨对比实测结论落字（mock 预计算 vs 表达式格式化）
- [ ] 金额列 `tabular-nums`、行密度默认档、色阶对 pill 三项 computed style 断言绿

### Phase 3 - 图表卡区 + G-E/G-B3 静态实测结论收口

Status: planned
Targets: `page-schemas/stripe-*.json`、`tests/e2e/stripe-replica-visual.spec.ts`、本计划、`docs/analysis/ui-review/P1-reference-apps/stripe-dashboard.md`（仅事实勘误时）

- Item Types: `Fix | Proof | Decision`

- [ ] 图表卡区静态复刻（Phase 1 D1 裁定的承载落点）：KPI 卡（net volume/交易笔数等指标静态值经 mock 端点流动）+ net volume 曲线（`chart` renderer recharts line，数据经 overview 端点预计算序列）+ widget 增删形态（「添加 widget」入口 → 勾选列表 dialog 静态形态 + Apply/Edit 按钮形态零生效注记）
- [ ] e2e：图表卡区初屏用例（KPI 值来自 mock/曲线渲染/添加 widget dialog 打开）+ 全部浮层走查用例（chip 区→日期→搜索→导出→widget→drawer 走查 + Esc 关闭 + 列表零回归）
- [ ] G-E/G-B3 静态实测结论清单落字（供 P7b 起点与 C2 回写携带）：密度三档实测（32/40/48 样本 + computed style）、色阶对结构承载终判、等宽排版承载、金额格式化双轨结论、chip 条/日期范围/搜索形态的 schema 表达边界、无批量栏对照（flux 侧选择集/批量动作通道现状 vs Stripe 无此件——G-B3 素材行）、widget 增删 schema 表达边界、部分列排序/筛选 URL 同步（分析篇 §7 候选）的可模拟性初判——不接线、不裁决
- [ ] AI 模板感自查（P1 README §4.2）+ 样式契约自查（§4.3）：浮层全部有真实打开行为、数据经 mock 端点流动、新 CSS 全在 `.st-*` scope、零 renderer 包改动、`git status` 变更面仅 In Scope → 记录落字
- [ ] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；无矛盾则不动）
- [ ] `npx playwright test tests/e2e/stripe-replica-visual.spec.ts --reporter=list` 全绿；`pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates）
- [ ] 变更面核查：`git status --porcelain` 仅含 In Scope 文件 → 记录落字

Exit Criteria:

- [ ] 图表卡区落位且走查 e2e 绿（含浮层全走查 + 列表零回归）
- [ ] G-E/G-B3 静态实测结论清单节落字（含密度/色阶对/等宽/chip/无批量栏/widget 表达边界）
- [ ] 两维自查记录落字（通过/打回处置结论）；目标 e2e 与包级检查全绿记录落字；变更面核查记录落字

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_faf94f6d4ffeq6yERh5IxyuQu8`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: R1 `pass-with-minors`（零 Blocker/零 Major，2 Minor 已随共识修复）——Minor-1 Phase 2 Exit 硬编码页面 id `stripe-payments` 与 D1 裁定保留 `stripe-home` 拆分选项矛盾，已改为「Phase 1 D1 裁定的主对照页 id 可达」；Minor-2 执行顺序约束「无文件冲突」表述偏乐观（`showcase-env.ts` 与 roadmap 状态区实为共同触碰面），已改为「无内容冲突 + 顺序共写面 + 启动时复核」并同步 P6b plan 同款表述。审阅者并经 live 复核确认：stripe 产物全仓零存在、showcase-env 699/700 双口径零余量、`replicaBranches` Airtable** 条目 :123、render-host 7 包、@import 簇 :1-24 先于 `@source` :25、C2 回写最新 ⑥（下一个 ⑦）、roadmap P6b/P7a todo 与虚线 `P6b -.-> P7a`、HEAD `6e69351be` clean、P1 分配表 stripe/st/Stripe** 命名全部准确；单页默认提案两分支（单页/拆 stripe-home）均不破坏 Phase 结构。

## Closure Gates

- [ ] 全部（或 Phase 1 裁定终态数量）`stripe-*` schema 落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿（含浮层走查）
- [ ] 差异声明已裁定并落字（📊/拟定标注/色阶对结构/Söhne 近似/无批量栏/light-only 逐项）→ 「差异声明（P7a 裁定）」节 + CSS 头注两处一致
- [ ] `stripe-mock-backend.test.ts` 全绿；`Stripe__` 端点全部 get-only；`mock-backend.ts` 零触碰；既有五 slug 端点零回归
- [ ] `showcase-env.ts` 总行数 ≤700（wc 与门禁切分双口径实测记录于本计划）
- [ ] G-E/G-B3 静态实测结论清单落字（P7b 起点与 C2 回写可引用）
- [ ] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs）
- [ ] 无品牌资产复制（产出界面无 "Stripe" 名称与商标；logo/词标/Söhne/插画/原文案全部隔离）→ e2e 断言 + 数据集自拟中文
- [ ] AI 模板感治理与样式契约自查完成并落字
- [ ] roadmap Phase Status 区 P7a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap
- [ ] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] 目标 e2e：`npx playwright test tests/e2e/stripe-replica-visual.spec.ts` 全绿

## Deferred But Adjudicated

### 交互接线全谱（chip 增删/日期范围刷新/搜索/排序/导出下载/widget 增删/图表联动——分析篇 §4 交互清单主体）

- Classification: `watch-only residual`（对 P7a 而言非缺口，为 Pi-b 既定范围）
- Why Not Blocking Closure: 两段式边界（P1 README §5）固定 Pi-a = 静态形态；交互接线与先红后绿契约锁定属 P7b 义务，roadmap 既有 work item
- Successor Required: `yes`
- Successor Path: P7b plan（本 roadmap 既有 work item，无需新建）

### 筛选状态 URL 同步 / 语法搜索解析（分析篇 §7 两候选）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 属 runtime/页面壳层能力候选与自研解析器，分析篇 §6.2 已记降级声明；归属判断归 P7b 回写（候选登记在案）
- Successor Required: `yes`
- Successor Path: P7b C2 回写一并处理（分析篇 §7 既有登记）

## Non-Blocking Follow-ups

- `Stripe__` mock 数据集若在 P7b 接线中发现状态样本不足（筛选组合中间态/时间线变体/曲线区间样本），在 `mock-backend-stripe*.ts` 内补样本属 P7b Fix 范围（P6a follow-up 惯例沿袭）
- `--st-*` 变量架构共享复刻基建抽取（P3a/P4a/P5a/P6a follow-up 沿袭）：不入本计划

## Closure

Status Note: （完成或关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立审计者或独立子 agent）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （只记录 non-blocking follow-up；confirmed live defect 不得出现在这里）
