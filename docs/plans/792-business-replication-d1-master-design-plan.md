# 792 D1 复刻总体设计（business-page-replication roadmap M2-D1）

> Plan Status: completed
> Last Reviewed: 2026-10-30
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M2-D1（依赖 M1 done，已达成）
> Related: M1 交付（`docs/analysis/business-replication/r{1..4}-*.md`，尤其 R4 §4.1 对 M2 强制设计输入）；`docs/plans/781-ph17-axe-gate-plan.md`、`docs/plans/782-ph18-focus-ledger-plan.md`（验收设施先例）；D2-D4 后继

## Purpose

产出 21 个复刻页的总体设计：playground 路由规划、mock fixture 规范、每页验收断言模板（交互断言 + axe 基线 + focus 断言三支柱）。这是 D2-D4 分域设计与 M3 实现的统一前置契约。收口为 roadmap §2 D1 状态 `todo → planned → done`。

## Current Baseline

- M1 已交付：21 页盘点（R1-R3）、G1-G26 三色分级与 21 页可行性结论（R4：16 直接组合/3 能力扩展/2 新 type 临时形态）。
- **R4 §4.1 强制设计输入（D1 必须逐项承接）**：① per-page axe 策略——PH-17 对 map-demo 显式超时排除（`tests/e2e/a11y-axe-baseline.spec.ts` L25，>120s heavy SVG；V3 以 map 为底座需对策）、axe 基线 7 条代表路由中 mobile 族零覆盖（W1/M3/S1 需从零建立）；② mock fixture 规范与 21 页验收优先级（M1 未覆盖）；③ 验收断言模板沿用 roadmap §1 三支柱，不得只验 renderer 覆盖。
- 既有验收设施（live 核实）：`tests/e2e/a11y-axe-baseline.spec.ts` + `tests/e2e/__fixtures__/axe-baseline.json` 棘轮基线（7 路由）；PH-18 focus ledger 设施（782 plan 交付）；playwright.config.ts。
- playground 路由机制：`apps/playground/src` 下 route-entries 注册表（missing-components L56 曾盘点 78 个可路由 id）；现有演示页（lab/replica/demo）先例可循。
- D2-D4 必做纪律（R4 §4.1）：各域设计做 R4 §2↔§4 双向核对、归集散落验证项（C1 kanban moveStage 绑定、C1 footer 统计带、G2 拖拽绑定语义）——D1 在模板中为此预留位置。

## Goals

- 新建 `docs/analysis/business-replication/d1-replication-master-design.md`，包含：
  1. **路由规划**：21 页的 playground 路由命名（统一前缀如 `#/replication/<domain>-<page>`）、注册位置与入口组织；与 R4 §1 页清单一一对应（含 O1/V3 临时形态页的标注）。
  2. **mock fixture 规范**：fixture 文件位置/命名/schema 数据形状（对齐 flux data-source 消费契约 `{items,total}`）、21 页的 fixture 清单与验收优先级分级（P0 核心业务流页先行）。
  3. **验收断言模板**：每页三支柱断言的统一模板——程序化交互断言（locator/evaluate/getComputedStyle）+ axe 基线策略（per-page：标准棘轮 / mobile 新建基线 / V3 map 对策）+ focus 断言（**PH-18 为静态原语分类台账+check 门禁，非运行时断言设施**；逐页 focus 断言为手写 e2e，台账用于选取 focus 管理原语）；e2e spec 组织与命名规范。
  4. **D2-D4 设计模板**：分域设计文档必须包含的章节（页面 schema 结构、renderer 组合、§2↔§4 双向核对记录、验证项归集表）。
- 不写具体页面的 schema（D2-D4 职责）。

## Non-Goals

- 不产出 D2-D4 的分域设计内容；不实现任何 playground 页面（M3）。
- 不改 axe-baseline 棘轮基线现有内容（新建基线的动作发生在 M3 各页落地时）。
- 不裁决 retention；不改上游仓库。

## Scope

### In Scope

- 调研 playground 路由注册、axe 棘轮、focus ledger、现有 e2e 断言模式的 live 机制。
- 撰写 d1-replication-master-design.md（上述 Goals 1-4）。
- roadmap §2 D1 状态回写（`planned` 于草案评审通过时、`done` 于 closure audit 通过时）。

### Out Of Scope

- D2-D4 内容、M3 实现、验收基线 JSON 的实际新建。

## Failure Paths

不适用：纯设计文档，无运行时行为。

## Test Strategy

不适用：纯文档产出，无行为变更。

## Execution Plan

### Phase 1 - 设施机制调研与设计文档产出

Status: completed
Targets: `docs/analysis/business-replication/d1-replication-master-design.md`

- Item Types: `Decision | Proof`

- [x] 调研 live 机制：playground 路由注册（complex-pages surface auto-glob 免注册——设计决策①的依据）、axe 棘轮（ROUTES 数组含 2 个失效 id 需 M3 修正）、PH-18 focus ledger（静态台账+门禁，非运行时设施——决策⑥）、e2e 断言先例（crud-demo/airtable/spreadsheet-visual-tokens 三个 spec）
- [x] 撰写设计文档（六项落地决策 + §1 路由 21 页 + §2 mock 规范 + §3 三支柱模板 + §4 axe 三分支 + §5 D2-D4 模板 + §6 引用）
- [x] R4 §4.1 三项强制输入逐项落实：① per-page axe 策略→§4 三分支（V3 对策/ mobile 补建/失效 id 修正）；② fixture 规范与优先级→§2+§1 优先级列（P0 6/P1 12/P2 3）；③ 三支柱模板→§3

Exit Criteria:

- [x] 设计文档存在且节结构齐备（§0 六决策/§1 路由/§2 mock/§3 模板/§4 axe/§5 D2-D4 模板/§6 引用）；21 页路由与 R4 §1 页清单一一对应（§1 表 21 行，含 O1/V3 临时形态标注列）
- [x] axe 策略节明确 V3 对策（先纳入实测、>30s 切排除裁决且 axe 排除≠功能验收排除）与 W1/M3/S1 mobile 基线建立方式（375×667 describe + ROUTES/JSON 各加一行），并引用 PH-17 机制实况（含 gantt-demo/crud-demo 失效 id 修正义务）
- [x] mock fixture 规范含数据形状契约（{status:0,data:{items,total}} + 错误分支）与 21 页 fixture 组织（8 域模块）+ P0/P1/P2 优先级
- [x] 验收模板含三支柱且 focus 断言引用 PH-18 设施实况（静态台账定性 + toBeFocused/activeElement 两先例）
- [x] roadmap §2 D1 回写 `done`（随 closure audit 通过的同一次回写提交完成，guide When Closing 9）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass-with-minors`（零 Blocker/Major，2 Minor 已当场修订）
- Rounds: 1
- Findings addressed:
  - Minor 1：Goal 3 措辞补注 PH-18 设施实况（静态台账+门禁，逐页 focus 断言为手写 e2e）
  - Minor 2：In Scope 补 roadmap `planned` 中间段流转归属

## Closure Gates

> 纯文档计划：`pnpm typecheck/build/lint/test` 不适用，按 guide 从 Closure Gates 删除。

- [x] in-scope 工作全部落地（设计文档 + roadmap 回写）
- [x] 设计文档声称与 live repo 设施机制对照无 drift（closure audit 首轮 2 Major 计数漂移 [49→43 entry、分支 A 14→17 页] + 2 Minor 行号偏移已全部修正，原审计员就地复核 approved，残留扫描零命中）
- [x] 不存在被静默降级的 in-scope 缺口（axe 失效 id 修正与基线新建为 Non-Goals 显式排除 + §4 写明 M3 successor 义务，非静默降级）
- [x] 受影响 owner docs 已同步（daily log 记录本计划收口）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据

## Deferred But Adjudicated

（无——closure audit 复核通过，无遗留裁决）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: D1 六项落地决策（complex-pages surface/命名/8 域 mock 模块/e2e 组织/axe 三分支/focus 手写断言）+ 21 页路由（P0 6/P1 12/P2 3）+ mock 规范 + 三支柱模板 + D2-D4 六节模板齐备；R4 §4.1 三项强制输入全部承接（§4 三分支 axe 策略、§2 fixture 规范与优先级、§3 三支柱）。closure audit 首轮 issues 修正后复核 approved。D1 可关，D2-D4 可开工。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose；含同审计员就地复核轮）
- Evidence: 首轮 verdict `issues`（2 Major 计数漂移 + 2 Minor 行号）→ 修正 → 复核 verdict `approved`（逐项落地核对 7/7 + 残留 grep 零命中）；审计同时完成 13 条 live 声称对账（complex-pages auto-glob/axe ROUTES 失效 id/map-demo 排除/focus 两先例/airtable mock 先例等全命中）；详见 `docs/logs/2026/10-30.md`。

Follow-up:

- no remaining plan-owned work（axe 失效 id 修正随 M3 首个 axe 扩展执行；D2-D4 按 §5 模板开工）
