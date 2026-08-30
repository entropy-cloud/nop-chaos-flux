# P7a Stripe dashboard 数据面板复刻 — 分析与静态复刻

> Plan Status: completed
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

## 差异声明（P7a 裁定）

> Phase 1 Decision 落字节（已全部裁定，见 Phase 1 勾选项内逐条理由）；CSS 侧同步声明于 `stripe-replica.css` 文件头注（两处一致）。

- **D1 页面粒度（已裁定）**：**单页 `stripe-payments`**（导航 shell 形态 + 筛选 chip 区 + 日期范围预设档 + 搜索降级形态 + 高密度交易表格 + 明细 drawer + 导出模态 + 图表卡区全部页内承载——G-E 压测对象是「同页密度族」，金融表格与图表/KPI 同屏对照「总览→交易」的同族密度排版，跨页拆分会稀释压测，沿 P5a/P6a D1 型制）。图表卡区不触发过载拆分：4 KPI 卡 + 单折线图 + widget 勾选 dialog 的体量（antdpro-dashboard 单页图表卡先例同量级）远小于 P5a 单页 7191 行 JSON 先例的承载证据，**不拆 `stripe-home`**。**Balance ★★ 页裁定不入**：余额/入账/payouts 域的复刻增量不新增 G-E 对照证据（crud+筛选形态已被主对照页全覆盖），入册只增页面维护面——裁剪注记归档此处，分析篇 §3 五页面中 Balance/结算页与报表页深形态维持分析篇 §6.2 裁剪口径（Non-Goals 既有）。**导航 shell 静态承载**：页面级静态侧栏（分组标题 + 条目 + blurple 选中态样本），零路由动作；单页裁定下页间 navigate 无适用面（终态清单 = `page-schemas/stripe-payments.json` 一页一文件——P1 README 硬规则 1）。
- **D2 浮层与替代承载（已裁定）**：①筛选 chip 条 = 静态 chip 行（2 chip + 单个移除按钮形态 + Filter 按钮形态；chip 增删/组合收窄/URL 同步零生效——I1 归 P7b）；②日期范围 = `.st-seg` 分段控件静态形态（上月默认选中样本 + 此前各月/本月至今/自定义档位形态；刷新零生效——I2 归 P7b）；③语法搜索降级 = 搜索框静态形态（§6.2 降级声明维持，参数化归 P7b）；④导出模态 = dialog（时区/日期范围/列勾选 checkbox 静态形态 + 确认按钮零生效注记，CSV 下载归 P7b I9）；⑤添加 widget = dialog（勾选列表静态形态 + Apply/Edit 按钮形态零生效注记，增删生效归 P7b）；⑥明细 drawer = `openDrawer` side right + form `loadAction` `Stripe__payment?id=`（摘要/时间线/元数据三分区 + 退款等操作按钮形态零生效；miss → 占位兜底 st-payment-miss）；行点击打开以客户列链接承载（打开类最小静态动作，P2a–P6a 先例）。**状态 pill 四态清单**：succeeded 已成功 / pending 待处理 / failed 已失败 / refunded 已退款——数据集 36 行按 6 循环分布（18/6/6/6），四语义全覆盖且 pill 类名/标签由 mock 预计算投影。**无批量栏维持 I11**：表格无选择集列、无批量栏（与原版结构一致，G-B3 对照素材）。
- **D3 令牌差异（已裁定）**：§2 逐项考证状态全量落 CSS——品牌 blurple `#635bff` 📊（第三方多源，官方未公开 hex）保留为复刻层独立令牌 `--st-blue`（**不映射 flux `--primary` hsl 体系**，sundial/notion/airtable 先例）；深蓝灰 Downriver `#0a2540` 📊 为正文/标题令牌 `--st-text`；页面底 `#f6f9fc`/卡片白/冷灰边框 `#e3e8ee`/slate 次级 `#425466` 为拟定值（CSS 内逐项标注）；**状态 pill 四语义色阶对**（结构 🌐 官方 Badge 规则：背景 +1 档、文字再 +2 档；具体 hex 拟定）以 `--st-ok/pending/failed/refunded` × `bg/text/dot` 三件套声明；行密度三档 32/40/48px 拟定（`--st-row-compact/default/relaxed`）；金额 `tabular-nums` + 右对齐（金融表格硬约束）；正文 13px 高密度；Söhne（商业授权）→ `Inter/system-ui` 近似栈并声明非原字体；**light-only**（无暗色映射，头注声明）。差异声明（📊/拟定标注、色阶对结构、Söhne 近似、light-only）落字本节 + CSS 头注，两处一致。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**建议有测**（P1 README §4.1 Pi-a 档位）。最低证明：`stripe-mock-backend.test.ts` 全绿 + 每页 ≥1 条初屏结构 e2e 用例全绿（程序化断言：testid 可见性 / 关键文案 / 数据来自 mock 端点 / `getComputedStyle` 断言 `--st-*` 令牌在 `.st-root` 子树可解析 / 行密度默认档 ≈40px 实测 / 金额列 `tabular-nums` computed style / 状态 pill 四语义色阶对可辨识 / 无 "Stripe" 商标字样断言；截图仅作视觉证据附件）。chip 增删/搜索/排序/图表联动等交互契约的先红后绿锁定归 P7b（必须自动化档）。

## Execution Plan

> 顺序 Phase。Phase 1 基座先行（页面粒度/CSS/mock/注册是后续每页的依赖）；Phase 2 支付列表主对照页；Phase 3 图表卡区 + G-E/G-B3 静态实测结论与验收自查收口。

### Phase 1 - 基座：页面粒度与承载裁定 + 复刻 CSS + mock 读端点 + 注册

Status: completed
Targets: `apps/playground/src/stripe-replica/stripe-replica.css`、`styles.css`（仅追加 @import 一行）、`shared/mock-backend-stripe*.ts`、`shared/showcase-env.ts`、`complex-pages-model.ts`、`__tests__/stripe-mock-backend.test.ts`

- Item Types: `Decision | Fix | Proof`

- [x] Decision——页面粒度裁定：分析篇 §3 五页面（支付列表 ★★★★★ / 明细 drawer ★★★★ / 图表卡区 ★★★ / Balance ★★ / 导航 shell ★★）映射为 schema 集的默认切分——默认提案单页 `stripe-payments`（导航 shell 形态 + 列表 + 明细 drawer + 导出模态 + 图表卡区页内承载，G-E 压测对象是「同页密度族」，沿 P5a/P6a D1 型制），图表卡区过载则拆 `stripe-home` 独立页并落字理由（终态清单必出）；Balance ★★ 入/裁裁定落字；导航 shell 静态承载与（若多页）页间 navigate 归属裁定 → **裁定单页 `stripe-payments` 不拆分（D1 已落字「差异声明（P7a 裁定）」）：图表卡区体量（4 KPI 卡 + 单折线图 + widget 勾选 dialog）不触发过载（antdpro-dashboard 单页图表卡先例同量级，远小于 P5a 7191 行单页先例承载证据）；Balance ★★ 裁定不入（复刻增量不新增 G-E 对照证据）；导航 shell 页面级静态承载、零路由动作（单页下页间 navigate 无适用面）。终态清单 = `page-schemas/stripe-payments.json` 一页一文件**
- [x] Decision——浮层与替代承载裁定：筛选 chip 条/日期范围/搜索/导出模态/添加 widget/明细 drawer 载体与零生效注记（D2 ①–⑥）+ 语义状态 pill 四态清单与数据集状态覆盖裁定 → 结论落字「差异声明（P7a 裁定）」D2 → **六项载体裁定 + 四态清单全部落字（D2 ①–⑥ 已更新）：chip 条静态行/日期范围分段控件/搜索框降级形态/导出 dialog/widget 勾选 dialog/明细 drawer（客户列链接打开 + loadAction 取数 + miss 占位）；pill 四语义 succeeded/pending/failed/refunded 数据集 6 循环分布 18/6/6/6 全覆盖，pill 类名/标签 mock 预计算投影**
- [x] Decision——令牌差异裁定：按分析篇 §2 提取 `--st-*` 变量架构；📊/拟定逐项标注、色阶对结构（bg+1/text+1）声明、blurple/Downward 深蓝灰定位（复刻层独立令牌，不映射 flux `--primary` hsl 体系——sundial/notion/airtable 先例）、Söhne→Inter 近似栈、行密度三档 px、`tabular-nums`、light-only——结果写入本计划「差异声明（P7a 裁定）」节 + CSS 文件头注 → **D3 已裁定并落字（「差异声明（P7a 裁定）」D3 + stripe-replica.css 头注两处一致）：blurple `#635bff` 📊/Downriver `#0a2540` 📊 为复刻层独立令牌（不映射 flux `--primary`）；页面底/边框/次级拟定逐项标注；pill 四语义色阶对结构 🌐（bg+1/text+2 档，hex 拟定）× bg/text/dot 三件套；密度三档 32/40/48 拟定；`tabular-nums` 金额；13px 正文；Söhne→Inter 近似栈声明非原字体；light-only**
- [x] Decision——`showcase-env.ts` 余量整理裁定：现 699/700 双口径零余量，追加 `Stripe__` 胶水约 2 行前必须先做等价余量整理（零行为变化的行合并/压缩，P5a Phase 1 先例）——整理后与追加后的行数以 wc + 门禁切分双口径落字记录，总行数 ≤700 → **已整理（零行为变化）：`./mock-backend` 具名导入 19→7 行 + antdpro 导入 4→1 行（行合并压缩，零语义变化）；追加 stripe import 1 行 + `replicaBranches` 数组条目 1 行 + 注记扩 1 行。终值 wc 实测 **687 行**、门禁切分口径（`split(/\r?\n/).length`，check-oversized-code-files.mjs:85）= **688 行**——双口径均 ≤700（由零余量贴线转为 +12 余量受控）；`git diff` 复核仅 import 块合并 + stripe 胶水 + 注记三处**
- [x] Fix——`stripe-replica.css`：令牌块声明于 `.st-root, .st-dialog` 双作用域，变量名 `--st-*`、类名 `.st-*`；行密度三档密度类、行 hover、pill 色阶对四语义态、`tabular-nums` 金额类、chip 形态、KPI 卡、导航 shell 形态类等品牌专有视觉就绪；只写品牌专有视觉，布局/间距用 schema 内 Tailwind 工具类与 container props（双轨规则，P5a/P6a container-body 教训注记）→ **已落盘 `apps/playground/src/stripe-replica/stripe-replica.css`（wc 实测 606 行——终态；oversized 门禁仅扫 `.js/.jsx/.ts/.tsx/.mjs/.cjs`，CSS 不入门禁——Baseline 已声明）：§1 令牌块双作用域（blurple/Downriver/四语义色阶对三件套/密度三档/Inter 栈）+ §2 导航 shell + §3 按钮/chip/风险 chip/日期分段/搜索框 + §4 高密度表格（默认 40px 行高变量驱动 + 行 hover 铺底 + 密度三档样本类 + 排序 chevron 形态）+ §5 pill 色阶对四语义 + §6 KPI 卡/图表卡区 + §7 明细 drawer（时间线/元数据/勾选形态）；金额 `.st-money` tabular-nums + 右对齐；布局/间距未入 CSS（双轨规则）**
- [x] Fix——`styles.css` 在头部 @import 簇内追加 `@import './stripe-replica/stripe-replica.css';`（仅此一行，置于 `@source` 指令之前）→ **已追加于 airtable 行后（:25）、`@source` 指令（现 :26）之前，仅此一行**
- [x] Fix——`mock-backend-stripe*.ts`：类型 + 工厂 + 过滤/分页/序列助手；数据结构真实（payments ≥30 行满足默认页大小 10 至少 3 页、四语义状态全覆盖、金额/币种/卡品牌/风险字段样本、明细记录含时间线与元数据分区、overview KPI + 曲线预计算序列）；沿既有 fetcher 分支工厂模式导出分支，全部 get-only；行数以 wc + 门禁切分双口径记录 → **已落盘四模块（沿 P5b/P6a 拆分先例）：`mock-backend-stripe.ts`（wc 103/门禁 104，入口 + get-only fetcher 分支 + 占位兜底）/`-types.ts`（wc 116/门禁 117，类型 + 四语义 pill 注册表 + 五币种小数位注册表 + 风险/品牌注册表）/`-payments.ts`（wc 242/门禁 243，36 行确定性数据集 + 行投影 + keyword/status 过滤 + 分页）/`-overview.ts`（wc 52/门禁 53，KPI + 30 点净额/上期双曲线预计算 + 空序列兜底）；wc 双口径：四文件全部 ≤500 WARN 线（门禁零新增命中——`pnpm check:oversized-code-files` 仅既有 2 个注册豁免文件），合计 wc 513；36 行默认页大小 10 → 4 页 ≥3 页；四语义 6 循环分布 18/6/6/6；JPY 0 位小数对照样本**
- [x] Fix——`showcase-env.ts` 追加 `Stripe__` 分支委托（`replicaBranches` 数组条目 + handler 下沉，Phase 1 Decision 余量整理后追加）；总行数 ≤700 双口径且五 slug 既有端点零回归（既有单测证明）；`mock-backend.ts` 零触碰 → **数组条目一行（`['/r/Stripe__', createStripeFetcherBranch(createStripeDatabase(), clone)]`，工厂内联与 airtable 条目先例同型）+ import 一行，胶水 2 行；wc 实测 687 行、门禁切分口径 688 行——双口径均 ≤700；既有单测全绿（`pnpm test` 68/68 任务、playground 33 文件 336 用例——antdpro/cal/linear/notion/airtable 既有端点零回归）；`mock-backend.ts` 零触碰（git status 核查）**
- [x] Fix——`COMPLEX_PAGE_ENTRIES` 追加页面条目（id/title/category: `app-replica`/description 写明复刻区块与端点名、features 4 个机制词标签——P1 README 硬规则 6 + P4a 惯例）→ **`stripe-payments` 条目已追加（id `stripe-payments`/title「金融数据面板 · 支付流水」/category `app-replica`/description 含 `Stripe__payments`/`Stripe__payment`/`Stripe__overview` 端点名 + 复刻区块清单/features 4 机制词【复刻样式/高密度表格/状态色阶对/明细抽屉】），单测锁定（features 不含端点名——P4a 惯例）**
- [x] Proof——`stripe-mock-backend.test.ts`：数据集结构断言（分页 ≥3 页、状态覆盖、明细分区、overview 序列、空过滤路径、未知参数兜底、get-only 契约、showcase-env 路由、注册断言）→ **已落盘（14 用例全绿）：数据集 36 行 + 分页 ≥3 页（默认页大小 10 服务器分页口径 `paginateStPayments(payments,1,10).pages ≥3` + 端点默认请求 10 行/总数 36 双证）、四语义 pill 色阶对类名注册表断言、五币种小数位格式化断言（JPY 0 位对照）、行投影 pill/chip/标签预计算断言、时间线按状态分区断言（pending tone/refunded 退款两步/failed tone）、元数据四行断言、st-payments-miss 空过滤、enum status 收窄 + st-status-unknown 兜底全量、st-payment-miss 占位、overview 30 点曲线 + KPI 标签 + st-overview-empty 空序列、get-only 契约（post/put → status 1）、showcase-env 路由（list/detail/overview 三端点 + post 拒绝）、注册断言**

Exit Criteria:

- [x] 页面粒度、浮层承载、令牌差异、showcase-env 余量整理四类 Decision 全部落字 → **D1/D2/D3 + showcase-env 余量整理裁定全部落字「差异声明（P7a 裁定）」节（余量整理双口径数据在该 item 行）**
- [x] `Stripe__` 端点经 fetcher 分支可命中且全部 get-only；showcase-env 总行数 ≤700 双口径，既有五 slug 端点零回归（既有单测全绿证明） → **单测证明：get-only 契约用例（post/put → status 1）+ showcase-env 路由用例绿；wc 687 / 门禁 688 双口径 ≤700；`pnpm test` 68/68 任务 336 用例绿（既有五 slug 端点零回归）**
- [x] CSS/mock/注册/test 四类文件落盘；`pnpm --filter @nop-chaos/flux-playground test -- stripe-mock-backend` 全绿 → **14 用例全绿（`Test Files 33 passed`，336 用例含既有零回归）**
- [x] showcase 页面列表可见全部 `stripe-*` 条目（注册生效；页面可达性 e2e 证明归 Phase 2） → **`COMPLEX_PAGE_ENTRIES` `stripe-payments` 条目已注册（单测锁定 category/features/description 契约）；页面可达性 e2e 证明归 Phase 2（schema 落盘后 `#/complex-pages/stripe-payments` 初屏用例）**

### Phase 2 - stripe-payments：支付列表主对照页（导航 shell 形态 + 筛选区 + 高密度表格 + 明细 drawer + 导出模态）

Status: completed
Targets: `page-schemas/stripe-*.json`、`tests/e2e/stripe-replica-visual.spec.ts`

- Item Types: `Fix | Proof`

- [x] 导航 shell 形态：左侧分组导航静态（分组标题/条目/Shortcuts 与最近/More 收纳形态 + blurple 选中态样本；零路由动作或多页 navigate——Phase 1 D1 裁定落地）（`stripe-*` testid 逐节点落位，P1 README 硬规则 3）→ **已落位：总览/资金/交易三功能分组 + 快捷入口（Shortcuts 形态）/最近/产品（Products 分组）/更多（More 收纳）七组 + 14 条目；`stripe-nav-transactions` 挂 `st-nav-item-active` blurple 选中态样本（e2e getComputedStyle 锁定 `rgb(99, 91, 255)` = `--st-blue` 📊）；`stripe-nav-note` 零路由动作注记；testid 逐节点 `stripe-nav-*` 14 落位**
- [x] 筛选区形态：筛选 chip 条静态样本（2–3 chip + 单个移除按钮形态 + Filter 按钮形态，零生效 + 归 P7b 注记）+ 日期范围预设档形态（上月默认选中样本 + 自定义档位形态）+ 语法搜索降级搜索框形态（§6.2 降级注记）→ **已落位：chip 条 `stripe-chip-status`（支付状态：已成功 + `stripe-chip-status-remove` 移除 ×）/`stripe-chip-amount`（金额：≥ CN¥100.00 + remove）双 chip + `stripe-filter-button`（list-filter 图标 + 筛选）+ `stripe-chip-note`（I1/I3 归 P7b）；日期范围 `stripe-daterange` 四档（此前各月/上月[st-seg-item-active 默认选中]/本月至今/自定义+calendar 图标）零生效；搜索 `stripe-search` 静态形态（magnifier 图标 + 占位文案，§6.2 降级维持）**
- [x] 高密度交易表格：列头行（金额右对齐/日期/状态/客户/支付方式等列集——📊 推断列集按分析篇 §3 落字）+ 记录行 ≥30 行经 mock 流动 + 客户端分页 ≥3 页 + 行 hover 浅灰铺底 + 部分列排序 chevron 形态（零生效注记）+ 行密度默认档 ≈40px 实测 → **已落位：六列集（金额[align right]/日期/状态/客户[主链接列]/支付方式/风险——📊 推断列集按分析篇 §3 落字）；36 行经 `Stripe__payments?perPage=100` 一次流动、table 客户端分页 pageSize 10（4 页 ≥3，e2e 锁定首页 10 行 + 首行 CN¥18.00）；行 hover 浅灰铺底（`.st-table tbody tr:hover` 纯 CSS）；金额/日期两列头 `st-sort-head` + chevrons-up-down 图标排序形态（`stripe-sort-note` 零生效注记——部分列排序 I4 口径）；行密度默认档 td height `var(--st-row-default)` = 40px，e2e getComputedStyle 实测 38–42 区间通过**
- [x] 状态 pill 四语义色阶对（succeeded 绿/pending 琥珀/failed 红/refunded 灰——bg+1/text+1 成对令牌）+ 金额 `tabular-nums` 等宽右对齐 + 小数位按币种样本 → **已落位：pill 容器 className 由 mock 预计算投影 `${statusPillClass}`（四语义 `st-pill-ok/pending/failed/refunded`，bg+text+dot 三件套令牌），首页 10 行四语义齐现（6 循环分布），e2e 收集 10 行 computed backgroundColor 得 ≥4 个不同值（色阶对可辨识）；金额列 `.st-money` e2e 断言 `fontVariantNumeric` 含 tabular-nums + `textAlign` right；小数位按币种样本 = JPY 0 位对照（ST_CURRENCY_META 注册表 + formatStAmount 单测锁定 CN¥1,234.56 / JP¥128,000 / $9.90）**
- [x] 交易明细 drawer：行点击 openDrawer（打开类最小静态动作先例）→ form `loadAction` 明细端点 → 摘要/时间线/元数据分区静态形态 + 退款等操作按钮形态零生效 + miss 占位兜底 → **已落位：客户列链接 `stripe-row-open`（st-link 形态，Stripe 客户名蓝链接形态即行入口——静态承载变体注记）→ openDrawer side right `stripe-payment-drawer`（className `st-dialog` portal 作用域）；form loadAction `Stripe__payment?id=${id}`；摘要分区（st-detail-amount 26px + pill + 描述）/元数据四行（创建日期/支付方式/客户/风险评估 + 金额表达式轨对照行）/操作按钮形态（退款/再次收款/发送收据 + `stripe-detail-actions-note` 零生效注记）/时间线 loop（tone 三态 dot 着色）；miss 占位兜底单测锁定（st-payment-miss）；e2e 02 全走查**
- [x] 导出模态形态：Export 按钮 → dialog（时区/日期范围/列勾选静态形态 + 确认按钮零生效注记——CSV 下载归 P7b）→ **已落位：`stripe-export-trigger` → openDialog `stripe-export-dialog`（st-dialog）；时区行（账户时区 UTC+8）/日期范围行（上月 8月1日-8月31日）st-meta-row 形态 + 列勾选五行 st-check 形态（金额/日期/状态 ✓ 选中 + 客户邮箱/支付方式未选）+ `stripe-export-confirm` 确认按钮形态 + `stripe-export-note`（CSV 下载与完成通知零生效，I9 归 P7b）；e2e 03 锁定**
- [x] 无批量栏声明落字（I11 差异声明：表格无选择集列、无批量栏——与原版结构一致）→ **已落位：`stripe-no-batch-note`（「按调研结论原版无批量操作栏，复刻不新增（I11——G-B3 对照素材）」）+ 表格 schema 无 select 列（与 D2 裁定一致）；e2e 01 断言注记含「无批量」**
- [x] e2e：初屏结构用例 ≥1 条（表格列头/行数据来自 mock/pill 色阶对辨识/`getComputedStyle` 断言 `--st-*` 令牌与行密度 40px 与 `tabular-nums`/drawer 打开与端点数据/导出模态打开/无 "Stripe" 商标字样）→ **用例 01/02/03 全绿（18.3s）：01 初屏（导航 shell + blurple 选中态 computed color/筛选区三形态/六列头/10 行 mock 数据/四语义 pill bg 色集合 ≥4/tabular-nums + right/行高 38–42px/`--st-blue` #635bff + `--st-row-default` 40px 解析/无批量注记/无 "Stripe" 字样）；02 drawer（端点数据 + pill bg/时间线 3 事件/元数据 4 行 + 表达式轨 CN¥18.00/操作形态/Esc 关闭）；03 导出模态（时区/范围/5 列勾选/确认 + 注记/Esc 关闭）**

Exit Criteria:

- [x] Phase 1 D1 裁定的主对照页 id 可达（`#/complex-pages/<D1 裁定 id>`）且初屏结构 e2e 用例绿 → **D1 裁定 id = `stripe-payments`（单页）；`#/complex-pages/stripe-payments` 可达（`complex-page-title` 含「金融数据面板 · 支付流水」断言即注册+可达双证），e2e 01/02/03 全绿**
- [x] 高密度表格/pill 色阶对/金额等宽/筛选区/drawer/导出模态在 schema 与 CSS 中可辨识；金额格式化双轨对比实测结论落字（mock 预计算 vs 表达式格式化） → **六区块 schema testid 逐节点可断言 + CSS §3–§5/§7 对应类齐备；双轨对比实测：表达式轨 `${'CN¥' + (amountMinor / 100).toFixed(2)}` 在 drawer 元数据行 live 渲染 e2e 锁定 CN¥18.00（expression evaluator 支持成员调用）——表达力边界 = 无千分位分隔 + 按币种小数位需另写分支（单测对照：`'CN¥' + (123456/100).toFixed(2)` = `CN¥1234.56` ≠ mock 轨 `CN¥1,234.56`）；主对照页金额列维持 mock 预计算轨（P6a G-D §3 同源口径），G-E 静态实测结论 Phase 3 收口引用**
- [x] 金额列 `tabular-nums`、行密度默认档、色阶对 pill 三项 computed style 断言绿 → **e2e 01 三项断言全绿（fontVariantNumeric 含 tabular-nums + textAlign right / 行高 38–42px / pill bg 色集合 ≥4 且非透明）**

### Phase 3 - 图表卡区 + G-E/G-B3 静态实测结论收口

Status: completed
Targets: `page-schemas/stripe-*.json`、`tests/e2e/stripe-replica-visual.spec.ts`、本计划、`docs/analysis/ui-review/P1-reference-apps/stripe-dashboard.md`（仅事实勘误时）

- Item Types: `Fix | Proof | Decision`

- [x] 图表卡区静态复刻（Phase 1 D1 裁定的承载落点）：KPI 卡（net volume/交易笔数等指标静态值经 mock 端点流动）+ net volume 曲线（`chart` renderer recharts line，数据经 overview 端点预计算序列）+ widget 增删形态（「添加 widget」入口 → 勾选列表 dialog 静态形态 + Apply/Edit 按钮形态零生效注记）→ **已落位：`stripe-source-overview` data-source → KPI 卡 ×4（净额 CN¥486,210.75 + 较上月 +12.4%/交易笔数 1286 + +8.2%/平均交易额 CN¥378.15/退款总额 CN¥12,930.00——全为 `overviewData?.kpi?.*` mock 端点流动，e2e 锁定逐值）+ `stripe-netvolume-chart` recharts line 双 series（本期 #635bff/上期 #b3b0ff——series color 走 schema prop 非 CSS 覆盖）+ `stripe-widget-trigger`「添加 widget」→ `stripe-widget-dialog` 六项勾选列表（净额走势/交易笔数/平均交易额 ✓ 选中 + 退款总额/客户余额/入账记录）+ Apply/Edit 按钮形态 + `stripe-widget-note` 零生效注记；e2e 04 锁定**
- [x] e2e：图表卡区初屏用例（KPI 值来自 mock/曲线渲染/添加 widget dialog 打开）+ 全部浮层走查用例（chip 区→日期→搜索→导出→widget→drawer 走查 + Esc 关闭 + 列表零回归）→ **用例 04/05 全绿：04（KPI 五值断言 + svg ≥1 + recharts-line ≥2 + 图例 本期/上期 + widget dialog 六项 + Apply/Edit + Esc + 密度三档 32/40/48 ±2px 实测）；05（chip remove/日期档/搜索 → 导出 → widget → drawer 全走查 + 逐层 Esc 关闭 + 列表零回归 10 行 + 首行 CN¥18.00）**
- [x] G-E/G-B3 静态实测结论清单落字（供 P7b 起点与 C2 回写携带）：密度三档实测（32/40/48 样本 + computed style）、色阶对结构承载终判、等宽排版承载、金额格式化双轨结论、chip 条/日期范围/搜索形态的 schema 表达边界、无批量栏对照（flux 侧选择集/批量动作通道现状 vs Stripe 无此件——G-B3 素材行）、widget 增删 schema 表达边界、部分列排序/筛选 URL 同步（分析篇 §7 候选）的可模拟性初判——不接线、不裁决 → **落字本计划「G-E/G-B3 静态实测结论（P7a 实测）」节 §1–§8**
- [x] AI 模板感自查（P1 README §4.2）+ 样式契约自查（§4.3）：浮层全部有真实打开行为、数据经 mock 端点流动、新 CSS 全在 `.st-*` scope、零 renderer 包改动、`git status` 变更面仅 In Scope → **自查通过，记录见 Phase 3 Exit Criteria 后「两维自查记录（P7a 收口）」**
- [x] 对照分析篇 §5 能力映射逐行复核保真度预估：实测与预估不符处做事实勘误（仅当矛盾时改分析篇，记勘误行；无矛盾则不动）→ **逐行复核完成：13 行映射中 12 行实测与预估无矛盾（逐行对照结论见「G-E/G-B3 静态实测结论」§9）；一处落点勘误已落分析篇：§5「金额等宽排版」行原写「列配置 `tabular-nums`」——table 列配置无 tabular 字段，实际承载为 cell `className` 复刻类（`.st-money`）双轨，保真度「高」不变，已按 P6a `upload`→`input-file` 勘误先例落分析篇勘误行**
- [x] `npx playwright test tests/e2e/stripe-replica-visual.spec.ts --reporter=list` 全绿；`pnpm --filter @nop-chaos/flux-playground typecheck`、`pnpm --filter @nop-chaos/flux-playground test` 全绿（全量仓库验证归 Closure Gates）→ **e2e 5/5 全绿（20.7s）；playground typecheck 绿；playground test 33 文件 337 用例全绿**
- [x] 变更面核查：`git status --porcelain` 仅含 In Scope 文件 → **核查通过（明细见 Phase 3 Exit Criteria 后「变更面核查记录」）**

Exit Criteria:

- [x] 图表卡区落位且走查 e2e 绿（含浮层全走查 + 列表零回归） → **e2e 04/05 全绿（KPI/曲线/widget dialog + 六浮层走查 + 逐层 Esc + 列表零回归）**
- [x] G-E/G-B3 静态实测结论清单节落字（含密度/色阶对/等宽/chip/无批量栏/widget 表达边界） → **「G-E/G-B3 静态实测结论（P7a 实测）」§1–§9 落字（密度三档/色阶对终判/等宽/双轨格式化/chip·日期·搜索边界/无批量栏 G-B3 对照/widget 边界/排序与 URL 同步初判/分析篇逐行复核）**
- [x] 两维自查记录落字（通过/打回处置结论）；目标 e2e 与包级检查全绿记录落字；变更面核查记录落字 → **「两维自查记录（P7a 收口）」节通过零打回；e2e 5/5 + typecheck + playground 337 用例全绿记录于 Phase 3 item 行；「变更面核查记录」节落字**

## G-E/G-B3 静态实测结论（P7a 实测）

> 供 P7b 起点与 C2 回写携带。只记录静态实测证据，不接线、不裁决；裁决义务归 P7b（roadmap Cross-Cutting 5）。

### 1. 密度三档实测（G-E 主对照）

- 纯 CSS 密度档承载成立：`--st-row-compact/default/relaxed` = 32/40/48px（📊 拟定档，CSS 变量 + `.st-density-*` 样本类），e2e getComputedStyle 实测三档 ±2px 全过；**live 表格默认档** td height `var(--st-row-default)` 实测 38–42px 区间锁定。
- 档位切换生效无绑定：本页无切换控件（Stripe 原版未文档化密度档——I8 注记「密度档为拟定补充」），复刻仅档位样本；className 表达式驱动切换的机制可用性已由 P6b A9（airtable 行高 className 表达式）证实，P7b 如需可沿。

### 2. 色阶对结构承载终判

- **高承载（结构层）**：四语义 pill 以 `--st-{ok,pending,failed,refunded}-{bg,text,dot}` 三件套令牌对（bg+1 档/text+2 档结构 🌐，hex 拟定）+ `.st-pill-*` 类承载成立——首页 10 行四语义齐现，e2e 收集 computed backgroundColor 得 ≥4 个不同非透明值。
- **型别层缺口**：renderer 无内建「语义状态 pill」型别（badge/status 字段语义无 colorLadder 类语义字段）——复刻经 mock 预计算 `statusPillClass` 投影 className（P5a notion `statusChipClass` 同源口径）；语义色阶对字段若产品化归 D1。

### 3. 等宽排版承载

- `.st-money`（`font-variant-numeric: tabular-nums` + `text-align: right`）computed 断言绿——金融表格等宽排版硬约束可承载；**落点勘误**：table 列配置无内建 tabular/right 语义字段组合，实际走 cell `className` 双轨（分析篇 §5 该行已按 P6a 先例勘误）。

### 4. 金额格式化双轨结论

- **mock 预计算轨（主轨）**：`formatStAmount` 按币种注册表（五币种小数位，JPY 0 位对照）+ 千分位——表格与 drawer 主显示均走此轨；P6a G-D §3 口径沿袭。
- **schema 表达式轨（对照样本）**：`${'CN¥' + (amountMinor / 100).toFixed(2)}` 在 drawer 元数据行 live 渲染成立（expression evaluator 支持成员调用，e2e 锁定 CN¥18.00）；**表达力边界**：无千分位分隔（`CN¥1234.56` ≠ `CN¥1,234.56`，单测对照锁定）、按币种小数位需另写三元分支——结论：表达式轨可作简单格式化，金融级格式化（千分位 + 币种小数位 + locale）需 registry 内建函数（`formatCurrency` 类候选，D1 登记）或维持 mock 预计算。

### 5. chip 条 / 日期范围 / 搜索形态的 schema 表达边界

- **chip 条**：静态 chip 行（chip + remove 形态 + Filter 按钮）container 类承载成立；**chip 增删/组合收窄零通道**——需筛选状态集（数组 setValue/移除表达式）+ 数据源参数联动，现无声明式筛选状态集语义；筛选词 URL 同步（I1 🌐）为 runtime/壳层能力候选（分析篇 §7）。
- **日期范围**：预设档分段控件静态形态成立；`input-datetime` 家族接线归 P7b（I2；P3a/P3b 实测在库）；预设档→端点参数绑定沿 data-source `dependsOn` + URL 表达式先例可模拟（P6b A1 同源）。
- **搜索**：语法搜索解析器不复刻（§6.2 降级维持）；keyword 搜索框静态形态 + mock `keyword=` 参数已备（st-payments-miss 路径单测锁定）——P7b 沿 P6b A1（url 物化 keyword）先例可模拟。

### 6. 无批量栏对照（G-B3 素材行）

- **Stripe 原生无批量栏**（I11 调研结论：未发现多选 checkbox/批量退款 UI）——复刻页未新增选择集列与批量栏（与原版结构一致，e2e 注记断言）。
- **flux 侧通道现状对照**：table 逐行 checkbox 为普通字段（P4a 实测：零修饰键处理）、crud 选择集 + 批量动作 API 在库（standard-crud 页实测）——即「批量能力存在但为 crud 域内建，非 table 复刻面自带」；G-B3 回写素材：**参考应用无此件，复刻无需新增；flux 批量通道维持 crud 域内建现状，无新缺口证据**。

### 7. widget 增删 schema 表达边界

- 勾选列表 dialog + Apply/Edit 按钮形态成立（六项 st-check + 零生效注记）；**widget 增删生效零通道**——页面区块动态重组无声明式表达；P7b 近似候选：预置 widget 区块 + `visible` 表达式驱动勾选状态（近似增删，非真重组）。

### 8. 部分列排序 / 筛选 URL 同步可模拟性初判（不接线、不裁决）

- **列排序**：静态 chevron 形态已落位（金额/日期两列——「部分列提供排序」🌐 口径）；生效路径实测在库——table 内建 sorter 字段 + P6b A5 会话排序先例（`sortAirtableRecords` 同型 `sort=` 参数已可参数化）→ P7b 可模拟（先红后绿候选）。
- **筛选 URL 同步**（分析篇 §7 候选）：需路由 query ↔ 筛选状态双向绑定，runtime/页面壳层能力候选——静态复刻面零通道维持，归属判断归 P7b 回写。

### 9. 分析篇 §5 逐行复核结论

13 行映射逐行复核：**一处落点勘误**（金额等宽行「列配置 `tabular-nums`」→ cell `className` 复刻类承载，保真度「高」不变，已落分析篇）；其余 12 行实测与预估无矛盾——表格行「高」成立（crud 不采用口径同 P6a）、pill 行「高」成立（§2 型别层注记）、drawer 行「高」成立（时间线 loop 自研承载）、KPI/曲线行「高/中」成立（widget 形态「中」确认——生效零通道）、导航 shell 行「中」成立（静态分组侧栏）、hover 行「高」成立（行 hover 纯 CSS）、批量行「无此件」一致、chip 行「中」成立（静态承载 + 生效零通道）、日期范围行静态面为形态承载（交互「高」待 P7b 接线验证，无矛盾）、排序/导出行形态可承载（生效归 P7b）、导出反馈行静态不复刻（I9 归 P7b，无矛盾）、语法解析行降级一致。

## 两维自查记录（P7a 收口）

> P1 README §4.2（AI 模板感）+ §4.3（样式契约）逐项自查。结论：**通过**（零打回项）。

- **产品完成度**：复刻页无 demo 占位按钮——全部零生效入口带归 P7b 注记（chip remove/Filter/日期档/搜索/排序 chevron/导出确认/widget Apply·Edit/退款操作，各有 `*-note` 注记，D2 裁定形态）；三浮层（导出 dialog/widget dialog/明细 drawer）全部真实打开 + Esc 关闭（e2e 03/04/05 锁定）；数据全部经 mock 端点流动（表格 36 行 `Stripe__payments`、KPI/曲线 `Stripe__overview` 预计算序列、drawer `Stripe__payment?id=`——e2e 逐层断言 mock 值）；hover/空态成对（行 hover 浅灰铺底 / `empty` 文案块在 schema）。
- **视觉原创性**：对照分析篇 §2 令牌抽查——密度（默认行高 40px 实测、13px 高密度正文）、圆角（chip/pill 999、按钮 4px、卡 8px）、语义色（四语义色阶对 + blurple `#635bff` 📊）、等宽字用法（金额列 tabular-nums + 右对齐）与原版结构一致；零品牌资产（e2e 复刻页子树无 "Stripe" 字样断言 + 全自拟中文文案 + 品牌位 F 字块自绘 + 无 logo/词标/Söhne/插画/原文案）。
- **样式契约（§4.3）**：复刻新 CSS 全落 `apps/playground/src/stripe-replica/stripe-replica.css`（令牌 `.st-root,.st-dialog` 双作用域 + `.st-*` 类）；`styles.css` 仅追加 1 行 @import（:25，先于 :26 `@source`）；零 renderer 包改动（git status 证明）；主题独立性 light-only（CSS 头注 + D3 声明）；布局/间距走 container props + Tailwind 工具类双轨（P5a container-body 教训全程遵循——横向布局全部 `direction/align/gap` props）。
- **处置结论**：两维全部通过，无打回项；`pnpm check` 归 Closure Gates 全量验证。

## 变更面核查记录（P7a 收口）

`git status --porcelain` 核查通过——变更面仅 In Scope + 文档 + 截图证据附件，`packages/` 零改动、`mock-backend.ts` 与既有四 slug mock 模块零触碰：

- 新增：`apps/playground/src/stripe-replica/stripe-replica.css`、`apps/playground/src/complex-pages/page-schemas/stripe-payments.json`、`apps/playground/src/complex-pages/shared/mock-backend-stripe{,-types,-payments,-overview}.ts`、`apps/playground/src/complex-pages/__tests__/stripe-mock-backend.test.ts`、`tests/e2e/stripe-replica-visual.spec.ts`、`tests/e2e/artifacts/stripe-replica/`（spec 截图视觉证据附件，antdpro/cal/notion/airtable 先例同轨入库）
- 修改：`apps/playground/src/styles.css`（仅 @import 1 行）、`apps/playground/src/complex-pages/shared/showcase-env.ts`（余量整理 + Stripe 胶水）、`apps/playground/src/complex-pages/complex-pages-model.ts`（仅 `stripe-payments` 条目）、`docs/analysis/ui-review/P1-reference-apps/stripe-dashboard.md`（§5 一处落点勘误）、本计划、roadmap

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 plan guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_faf94f6d4ffeq6yERh5IxyuQu8`
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: R1 `pass-with-minors`（零 Blocker/零 Major，2 Minor 已随共识修复）——Minor-1 Phase 2 Exit 硬编码页面 id `stripe-payments` 与 D1 裁定保留 `stripe-home` 拆分选项矛盾，已改为「Phase 1 D1 裁定的主对照页 id 可达」；Minor-2 执行顺序约束「无文件冲突」表述偏乐观（`showcase-env.ts` 与 roadmap 状态区实为共同触碰面），已改为「无内容冲突 + 顺序共写面 + 启动时复核」并同步 P6b plan 同款表述。审阅者并经 live 复核确认：stripe 产物全仓零存在、showcase-env 699/700 双口径零余量、`replicaBranches` Airtable** 条目 :123、render-host 7 包、@import 簇 :1-24 先于 `@source` :25、C2 回写最新 ⑥（下一个 ⑦）、roadmap P6b/P7a todo 与虚线 `P6b -.-> P7a`、HEAD `6e69351be` clean、P1 分配表 stripe/st/Stripe** 命名全部准确；单页默认提案两分支（单页/拆 stripe-home）均不破坏 Phase 结构。

## Closure Gates

- [x] 全部（或 Phase 1 裁定终态数量）`stripe-*` schema 落盘、注册并可达，每页 ≥1 条初屏结构 e2e 用例绿（含浮层走查） → **单页 `stripe-payments.json`（D1 终态）落盘注册可达；e2e 5/5 全绿（01/02/03 初屏 + 浮层 + 04 图表区 + 05 全走查）**
- [x] 差异声明已裁定并落字（📊/拟定标注/色阶对结构/Söhne 近似/无批量栏/light-only 逐项）→ 「差异声明（P7a 裁定）」节 + CSS 头注两处一致 → **D1/D2/D3 全部落字，CSS 头注两处一致（审计 live 复核通过）**
- [x] `stripe-mock-backend.test.ts` 全绿；`Stripe__` 端点全部 get-only；`mock-backend.ts` 零触碰；既有五 slug 端点零回归 → **15 条单测全绿；get-only 契约用例锁定（post/put → status 1）；`mock-backend.ts` 零触碰（git diff 空，审计复核）；playground 全量 33 文件 337 用例绿（既有五 slug 端点零回归）**
- [x] `showcase-env.ts` 总行数 ≤700（wc 与门禁切分双口径实测记录于本计划） → **wc 实测 687 行、门禁切分口径 688 行——双口径均 ≤700（Phase 1 item 行记录，审计独立复算一致）**
- [x] G-E/G-B3 静态实测结论清单落字（P7b 起点与 C2 回写可引用）→ 对应落字节 → **「G-E/G-B3 静态实测结论（P7a 实测）」§1–§9（密度三档/色阶对终判/等宽/双轨格式化/chip·日期·搜索边界/无批量栏 G-B3 对照/widget 边界/排序与 URL 同步初判/分析篇逐行复核）**
- [x] 零 renderer/ui/runtime 包改动（`git status` 证明变更面仅 playground + tests/e2e 本 spec + docs） → **「变更面核查记录」节 + 审计复核：`packages/` 零条目**
- [x] 无品牌资产复制（产出界面无 "Stripe" 名称与商标；logo/词标/Söhne/插画/原文案全部隔离）→ e2e 断言 + 数据集自拟中文 → **e2e 01 复刻页子树无 "Stripe" 断言；schema 全部 "Stripe" 命中仅端点 URL（审计逐值复核）；自拟中文数据集 + F 字块自绘品牌位**
- [x] AI 模板感治理与样式契约自查完成并落字 → **「两维自查记录（P7a 收口）」节，通过零打回**
- [x] roadmap Phase Status 区 P7a 已 `todo`→`planned`（review 通过时）；closure audit 通过后 `planned`→`done` 随关闭编辑落至 roadmap → **closure audit 通过（本节审计项），roadmap 已随关闭编辑 `planned`→`done`**
- [x] 受影响的 owner docs 已同步：分析篇仅事实勘误（无矛盾则 No owner-doc update required）——终期 Phase 逐行复核结论落字 → **分析篇 §5 一处落点勘误（金额等宽行：列配置 → cell `className` 复刻类，保真度不变）；逐行复核结论见 G-E/G-B3 §9**
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项 → **closure audit 通过（fresh session 独立子 agent `ses_faee9e7d7ffecXp5lpwKVzYIJA` 1 轮）：verdict **APPROVED** 零 finding——35 项 `[x]` + 三 Phase `completed` 一致性、契约抽查（CSS 双作用域/@import 先于 @source/get-only/注册惯例/schema 无品牌词/双口径行数 687/688 独立复算）、playground 33 文件 337 用例 + 目标 e2e 5/5 + oversized 门禁 exit 0（仅 2 豁免 i18n）独立复跑绿、变更面与 In Scope 完全一致、`mock-backend.ts`/`packages/` 零触碰；证据见 Closure 节**
- [x] `pnpm typecheck` → **37/37 全绿**
- [x] `pnpm build` → **37/37 全绿**
- [x] `pnpm lint` → **37/37 全绿**
- [x] `pnpm test` → **68/68 任务全绿（playground 33 文件 337 用例确认）**
- [x] 目标 e2e：`npx playwright test tests/e2e/stripe-replica-visual.spec.ts` 全绿 → **5/5 全绿（20.6s，审计独立复跑确认）**

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

Status Note: 三个 Phase 全部 `completed`、Exit Criteria 全勾、Closure Gates 全部通过：静态复刻结果面成立（单页 `page-schemas/stripe-payments.json` 落盘注册可达、`stripe-replica.css` 令牌与形态类、mock 四件 + `Stripe__` 3 端点 get-only、`COMPLEX_PAGE_ENTRIES` 注册、单测 15 条、目标 e2e 5/5）；「差异声明（P7a 裁定）」D1/D2/D3 与「G-E/G-B3 静态实测结论」§1–§9 落字供 P7b 起点与 C2 回写携带；`showcase-env.ts` 余量整理后 687/688 双口径（零余量贴线解除）；全量验证 full-green（typecheck/build/lint 37/37、test 68/68 任务含 playground 33 文件 337 用例、check exit 0 零新增命中）；deferred 项全部为 P7b 既定范围（两段式边界）或 D1/P7b 产品化候选，无 in-scope live defect 或 contract drift 被降级。

Closure Audit Evidence:

- Auditor / Agent: independent sub-agent fresh session `ses_faee9e7d7ffecXp5lpwKVzYIJA`（1 轮）
- Evidence: verdict **APPROVED** 零 finding。审计独立复核：plan 35 项 `[x]` 与三 Phase `completed` 一致（无 status-only/Items-only 不一致态）；契约抽查全过（`.st-root,.st-dialog` 双作用域、@import :25 先于 `@source` :26、get-only 分支 + 四类兜底路径、注册惯例、schema 内 "Stripe" 仅存于 3 处端点 URL、testid 全 `stripe-*`）；双口径行数独立复算一致（showcase-env 687/688、mock 四件 103/104·116/117·242/243·52/53、CSS 606）；`mock-backend.ts` git diff 空、`packages/` 零触碰、变更面与 In Scope 完全一致；playground 33 文件 337 用例 + 目标 e2e 5/5 + `pnpm check:oversized-code-files` exit 0（仅 2 个注册豁免 i18n 文件）独立复跑绿。收口记录见 `docs/logs/2026/08-30.md`（P7a closure 条目，unit + e2e 双全绿）。

Follow-up:

- `Stripe__` mock 数据集在 P7b 接线中发现状态样本不足时补样本（P7b Fix 范围，见 Non-Blocking Follow-ups）；除此之外 no remaining plan-owned work
