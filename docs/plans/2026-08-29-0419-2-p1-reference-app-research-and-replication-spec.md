# P1 参考应用线上调研与复刻工程规范

> Plan Status: active
> Mission: ui-review
> Work Item: P1. 参考应用线上调研与复刻工程规范
> Last Reviewed: 2026-08-29
> Source: roadmap `docs/backlog/ui-review-roadmap.md`（P1 条目 + Phase Details + 调研锚点 + Cross-Cutting 2 五步复刻模板）；方法论底稿 `docs/analysis/sundial-ui-reproduction-analysis.md`（§3 复杂度分级、§5 gap 分类）；复刻接线先例 plans 457/460
> Related: `docs/analysis/ui-review/R1-framework-benchmark.md`、`docs/analysis/ui-review/C1-complex-page-conceptions.md`、`docs/analysis/ui-review/C2-capability-gaps.md`（P2a–P7b 的上游输入）

## Purpose

线上调研 P2–P7 名单中的 6 个参考应用并各产出分析篇，同时制定统一的复刻工程规范，落盘 `docs/analysis/ui-review/P1-reference-apps/`，使 P2a–P7b 12 个复刻子项（6 应用 × a/b 两段）可以直接消费调研结论与工程规范开工，不重复调研、不各自发明目录/命名/测试约定。

## Current Baseline

- P1 依赖 R1（对标分析，`done`）与 C1（复杂页构想，`done`）已满足；C2 初版裁决已收口（G-A/G-B1/G-B2/G-B3/G-C/G-D/G-E 等缺口行带 L 级与回写归属）。
- 输出目录 `docs/analysis/ui-review/P1-reference-apps/` 尚不存在（live 复核 2026-08-29），本计划为该目录的建立者。
- 复用先例全部在库（live 复核 2026-08-29）：复杂页 harness `apps/playground/src/complex-pages/`（19 张 schema，`shared/mock-backend.ts`、`shared/showcase-env.ts`、`shared/render-host.tsx`）；复刻页 CSS 令牌模式 `apps/playground/src/sundial-replica/sundial-replica.css`；sundial 分析五步复刻模板；plans 457/460 交互接线与 e2e 模式。
- 调研锚点已由 roadmap 登记进行性：[Ant Design Pro 官方预览](https://preview.pro.ant.design/)、[Ant Design 页面规格](https://ant.design/docs/spec/detail-page/)、[Linear 交互文档](https://linear.app/docs/select-issues)、[Linear 设计细节](https://medium.com/linear-app/invisible-details-2ca718b41a44)、[Linear 快捷键全集](https://shortcuts.design/tools/toolspage-linear/)、[shadcn/ui blocks](https://ui.shadcn.com/blocks)、[Retool 系对比](https://www.stackfyi.com/guides/retool-vs-appsmith-vs-budibase-2026)、[Appsmith/Budibase/ToolJet 对比](https://blog.tooljet.com/appsmith-vs-budibase-vs-tooljet/)。
- 参考应用名单固定为 6 个（P2 Ant Design Pro / P3 Cal.com / P4 Linear / P5 Notion database / P6 Airtable grid / P7 Stripe dashboard）；更换/增删属结构性变更，须人工确认，不在本计划权限内。
- 法律/品牌边界（roadmap Cross-Cutting 3）：只仿制布局结构、交互模式与令牌结构；不复制 logo、品牌资产、文案、图标原图；闭源产品以"风格等价物"复刻并记录差异声明。

## Goals

- 产出 `docs/analysis/ui-review/P1-reference-apps/README.md` 复刻工程规范总篇：目录命名、mock 端点约定、e2e 模板、分析篇文档模板、验收维度（含 AI 模板感治理）。
- 产出 6 篇应用分析篇，每篇含四要素：设计令牌结构 / 页面清单与复杂度排序（sundial §3 口径）/ 核心交互清单 / 可复刻边界（闭源应用附差异声明）。
- 每篇给出能力映射初稿（页面元素 → flux 原语 + 保真度预估），显式对照 C2 已登记缺口行，供对应 Pi-a 直接消费。

## Non-Goals

- 不做任何 schema / CSS / renderer / playground 代码复刻（P2a 起才动手）。
- 不回写 C2 裁决（回写义务由各 Pi-b plan 承载，roadmap Cross-Cutting 5）。
- 不变更参考应用名单、不新增 P 系列 work item。
- 不复制任何品牌资产/文案/图标原图。
- 不重新评审 R1 对标结论（分析篇引用 R1 分数，不重打分）。

## Scope

### In Scope

- `docs/analysis/ui-review/P1-reference-apps/` 目录下：`README.md`（总规范）+ 6 篇 `ant-design-pro.md` / `cal-booking.md` / `linear.md` / `notion-database.md` / `airtable-grid.md` / `stripe-dashboard.md`。
- 每篇分析篇的线上调研（官方文档/预览页优先，开源应用可读源码与令牌）。

### Out Of Scope

- `apps/playground/`、`packages/`、`tests/` 的任何代码/schema/CSS 变更。
- roadmap 状态流转之外的其他 backlog 文档改动。

## Failure Paths

不适用（纯文档产出，无错误处理/API/外部集成行为；调研链接失效时以官方文档其他入口或存档快照替代并在分析篇记录替代来源）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用：纯文档产出（调研与规范），无任何代码行为变更**；工程规范中约定的 e2e/mock 模板在 P2a–P7b 各自的 Test Strategy 中按 Must automate 落地。

## Execution Plan

> Workstream 1 先行（规范总篇定义分析篇模板，是 WS2–WS7 的输入）；WS2–WS7 相互独立，可任意顺序执行。

### Workstream 1 - 复刻工程规范总篇

Status: planned
Targets: `docs/analysis/ui-review/P1-reference-apps/README.md`

- Item Types: `Decision | Proof`

- [ ] 制定目录与命名规范：`apps/playground/src/complex-pages/page-schemas/<app>-*.json` + `<app>-replica.css` + mock 端点文件约定（沿 sundial 先例逐项落字）
- [ ] 制定 mock 后端与 e2e 模板约定：`shared/mock-backend.ts` 扩展方式、`tests/e2e/` spec 命名与骨架（沿 plans 457/460 接线模式）
- [ ] 制定分析篇文档模板（四要素章节骨架 + 能力映射表格式 + 差异声明格式）
- [ ] 制定验收维度清单：roadmap Cross-Cutting 6 测试档位 + Cross-Cutting 7 AI 模板感治理（产品完成度/视觉原创性两维）+ Cross-Cutting 4 样式契约约束（playground scope 专用类 + CSS 变量，禁止 CSS 覆盖回流 renderer）

Exit Criteria:

- [ ] `README.md` 落盘，四个规范块齐备且与 live 先例路径逐条对应（mock-backend.ts / sundial-replica.css / e2e 目录真实存在）
- [ ] WS2–WS7 可仅凭 README 模板开工（模板含章节占位与填写说明）

### Workstream 2 - Ant Design Pro 分析篇（P2 输入）

Status: planned
Targets: `docs/analysis/ui-review/P1-reference-apps/ant-design-pro.md`

- Item Types: `Proof`

- [ ] 线上调研：官方预览页 + 页面规格文档（detail/form/visualization spec）；开源，可读源码与令牌
- [ ] 四要素：设计令牌结构 / 页面清单与复杂度排序（dashboard / list / form 四布局 / detail 基础+高级 / result，★ 分级）/ 核心交互清单 / 可复刻边界
- [ ] 能力映射初稿：PageHeader 区、查询区+表格区组合、高级详情分组（tabs/steps）→ flux 原语；显式对照 C2 G-A（页面模板层）行

Exit Criteria:

- [ ] `ant-design-pro.md` 落盘，四要素齐备，复杂度 ★ 分级覆盖 P2 全部模板族
- [ ] 能力映射表逐行标注保真度预估与 C2 缺口对照

### Workstream 3 - Cal.com 分析篇（P3 输入）

Status: planned
Targets: `docs/analysis/ui-review/P1-reference-apps/cal-booking.md`

- Item Types: `Proof`

- [ ] 线上调研：预约页全流程（时长选择 → 时区/槽位 → 确认表单 → 成功态 + 加入日历）
- [ ] 四要素 + 能力映射初稿：槽位网格、时区切换、多步向导回退 → scheduling calendar / input-datetime / dialog；闭源，附差异声明

Exit Criteria:

- [ ] `cal-booking.md` 落盘，四要素齐备，预约全流程拆到交互步级
- [ ] 差异声明记录令牌/布局与原版的偏离点

### Workstream 4 - Linear 分析篇（P4 输入）

Status: planned
Targets: `docs/analysis/ui-review/P1-reference-apps/linear.md`

- Item Types: `Proof`

- [ ] 线上调研：官方交互文档 + 设计细节文 + 快捷键全集（⌘K 命令面板、G-then-X chord、Space hover-peek、多选批量、Alt+↑↓ 重排）
- [ ] 四要素 + 能力映射初稿：issue 列表/board/peek → table/kanban 现状；键盘优先缺口显式对照 C2 G-B1/G-B2 行；闭源，附差异声明

Exit Criteria:

- [ ] `linear.md` 落盘，四要素齐备，快捷键清单完整到可逐条做能力映射
- [ ] 键盘交互清单与 C2 G-B1/G-B2 逐条对照（支持/模拟/缺口三态标注）

### Workstream 5 - Notion database 分析篇（P5 输入）

Status: planned
Targets: `docs/analysis/ui-review/P1-reference-apps/notion-database.md`

- Item Types: `Proof`

- [ ] 线上调研：table/board/gallery/calendar 视图切换、filter/sort 面板、行内编辑、新建行插行
- [ ] 四要素 + 能力映射初稿：视图切换状态机、filter 构建器（对照 condition-builder）、行内属性编辑；闭源，附差异声明

Exit Criteria:

- [ ] `notion-database.md` 落盘，四要素齐备，视图状态机拆到状态/迁移级
- [ ] 能力映射对照 C2 G-C 行并标注状态机 L4 风险点的实测判断

### Workstream 6 - Airtable grid 分析篇（P6 输入）

Status: planned
Targets: `docs/analysis/ui-review/P1-reference-apps/airtable-grid.md`

- Item Types: `Proof`

- [ ] 线上调研：单元格全型别行内编辑、列菜单（类型/排序/隐藏/着色）、行高切换、分组
- [ ] 四要素 + 能力映射初稿：编辑器矩阵 → input-table/inline-edit-table 底座；对照 C2 G-D（网格编辑深度）行；闭源，附差异声明

Exit Criteria:

- [ ] `airtable-grid.md` 落盘，四要素齐备，单元格编辑器矩阵列全型别清单
- [ ] 能力映射对照 C2 G-D 行并给出矩阵缺口初判（终判归 P6a）

### Workstream 7 - Stripe dashboard 分析篇（P7 输入）

Status: planned
Targets: `docs/analysis/ui-review/P1-reference-apps/stripe-dashboard.md`

- Item Types: `Proof`

- [ ] 线上调研：交易列表（高密度表格 + 筛选 chip + 批量栏）、图表卡、明细 drawer
- [ ] 四要素 + 能力映射初稿：密度档位、金额/状态排版（等宽/语义色）、图表-表格联动；对照 C2 G-B3/G-E 行；闭源，附差异声明

Exit Criteria:

- [ ] `stripe-dashboard.md` 落盘，四要素齐备，数据密度与排版令牌提取到变量级
- [ ] 能力映射对照 C2 G-B3/G-E 行

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent fresh session `ses_fb5f487e8ffeHcweDvJm1S1KIi`
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: R1-Minor1 Source 行五步模板归属改为 roadmap Cross-Cutting 2（sundial 文档为底稿）；R1-Minor2 "八个复刻 work item" 更正为 "12 个复刻子项（6 应用 × a/b 两段）"。R2 复审零 Blocker/Major，达成共识。

## Closure Gates

> 纯文档计划：不涉及任何代码变更，`pnpm typecheck`/`build`/`lint`/`test`/`test:e2e` 条目按 guide 规则删除，不执行。

- [ ] 7 份产出文档全部落盘且章节骨架符合 WS1 模板（README + 6 篇分析篇）
- [ ] 每篇分析篇四要素齐备；5 个闭源应用差异声明齐备；能力映射表逐行有 C2 对照
- [ ] 规范块与 live 先例（mock-backend.ts / sundial-replica.css / e2e 模式）无路径失实
- [ ] 无品牌资产/文案/图标原图复制（差异声明仅记录结构与令牌）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无——调研深度不足的应用篇按未完成处理，不以 deferred 名义带病关闭。）

## Non-Blocking Follow-ups

- 调研中撞见的 C2 未登记能力缺口：不做 C2 裁决变更，仅在对应分析篇"转 C2 候选"小节登记，供 Pi-b 回写时一并处理。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
