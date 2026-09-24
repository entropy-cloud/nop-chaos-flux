# 500 视觉质量二期 R2-4：缺陷与家族消化·首批——dark 主题平价/对比度族修复

> Plan Status: active
> Last Reviewed: 2026-09-24
> Source: `docs/backlog/visual-quality-r2-roadmap.md`（R2-4 work item）、`docs/analysis/2026-09-23-r2-2a-walkthrough/summary.md` §5（终裁建议：dark 平价族 = 首批）、`docs/analysis/2026-09-24-r2-2b-walkthrough/summary.md` §5（刷新：≈50 面 P1×9 P2 14+）、`docs/analysis/2026-09-23-r2-1a-walkthrough/summary.md` §6（R2-1a 侧输入）
> Related: plan 490（R2-3a）、plan 499（R2-3b 弹层 actions 族——并行可执行，修复面不相交）

## Purpose

落地首批 local 族（dark 主题平价/对比度族，R2-2a/R2-2b 两轮终裁输入均为最大 local 族，本 plan 立项即终裁登记）的修复：令牌表 dark 块补齐/校正 + 宿主主题层解钉 + 高危消费面单修，对该族涉及页面/控件**同探针批内复检**（像素采样口径），通过后回写台账。这是 roadmap R2-4 行的执行批。

## Current Baseline（2026-09-24）

- 族规模：R2-1a ≈14 页 P1×3（antdpro `--adp-*` 无 dark 块 9 页 + 宿主 `:root` --popover 覆盖 + showcase pills）；R2-1d P1×4（bg-white 头部 8 页、code-editor dark 不同步、diff-view light-only、flux-basic 白卡）；R2-2a P1×2（badge/button `--secondary-foreground`）+ P2×4；R2-2b P2×3 + chart 专项 + 集群实例。合计 ≈50 面。
- 令牌层坐实根因（live 行号 2026-09-25 核对）：`packages/theme-tokens/src/styles.css`——`--secondary-foreground` dark 块 L198（classic）/L318（glass）值导致徽章/按钮文字 1.06–1.1:1；`--primary` dark L191（63% 过亮，7/7 ai 页 3.26:1）；`--table-striped-bg` L98 `transparent` 占位（table 斑马纹零呈现）；`--destructive` 双现值——light/`:root` `0 84% 60%`（L72/L144/L264）过亮（destructive tint 3.12:1）、dark `0 70% 50%`（L204/L324）；修值须按块定位，防串块。
- 宿主层坐实根因：`apps/playground/src/styles.css` L86–87 `--popover: 30 20% 98%` 宿主覆盖（全站弹层 dark 亮底——date/picker/tree-select/select/crud quick-edit/ai 系等 ≥10 载体实例）；L172 `.nop-theme-root`（或等效宿主根）`color-scheme: light` 钉死（原生控件 dark 不随）。
- 消费面坐实缺陷：ui chart 主题化选择器与 recharts 3.8.1 DOM 空匹配（dark 轴刻度 3.27:1，R2-2b review-b）；antdpro 域 `--adp-*` 无 dark 块（R2-1a）；stat-tile/status 12px 语义色文本直用语义色（2.13–3.76:1）。
- 方法学：对比度判定一律 PNG 像素采样（oklch/渐变底 DOM 合成失真，R2-2a/2b 复核口径）；复检探针沿 `_tmp/r2-2b-probes/w5-png.mjs` 采样器。

## Goals

- 令牌层：**四主题块内按主题将本族点名的失败令牌修至 WCAG 达标**（文本 ≥4.5:1、UI 边界 ≥3:1；dark 平价为主——`--secondary-foreground` dark、`--primary` dark、`--popover` dark、宿主 color-scheme；light 侧仅动本族点名的失败值——`--destructive` light 档〔B1-05/B1-02 根因〕等，B1-40 选中态以 `--primary` 修值后的双主题复检为准）；`--table-striped-bg` 落实际条纹值；宿主 `color-scheme` 解钉。
- 宿主/消费面：antdpro 域 dark 块补齐、showcase pills dark 配色、ui chart 主题化选择器修复、stat-tile/status 语义色文本档位调整（tone 或字重/尺寸档）。
- 该族涉及载体同探针批内复检通过；台账 `verified` 按口径翻转；theme-compatibility.md / styling-system.md 契约回写。

## Non-Goals

- 不修其他族（弹层 actions 归 plan 499）；demo 载体 `bg-white` 头部模板（R2-1d local 散项，归 R2-4 字母后缀批或 R2-5 前消化批——本批只收令牌/组件契约层）；code-editor/diff-view 编辑器主题同步（R2-1d P1 实例，编辑器主题通道独立，字母后缀批承接）；性能度量。

## Scope

### In Scope

- `packages/theme-tokens/src/styles.css` dark 块令牌修复（含四主题块对称：classic/glass × light/dark）；`apps/playground/src/styles.css` 宿主 `--popover` 覆盖与 `color-scheme` 解钉；antdpro `--adp-*` dark 块；showcase pills；ui chart 主题化选择器；stat-tile/status 语义色文本档；focused 样式断言；批内复检；owner docs 回写；台账翻转；daily log。

### Out Of Scope

- 其他族；demo 模板层修复；编辑器主题通道；新令牌语义扩展（只调值不新增语义，如需新增走后续批）。

## Failure Paths

| 可测场景编号     | 触发                              | 行为                                                                                                                                                                                   | 可重试 | 用户可见表现 |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| light-regression | 修值波及非本批目标令牌的 light 值 | 对称性断言收窄口径：**非本批目标令牌**（background/foreground/card/border/muted 等基底档）light 值不变，破坏即回滚；本批目标令牌（`--destructive` light 档等）按修值后断言             | 是     | 断言失败     |
| contrast-miss    | 修值后仍有组合 <4.5:1             | 复检探针全量扫描族载体；漏网组合追加修值迭代（上限 3 轮）；**3 轮后仍未收敛 → 剩余组合逐条 adjudicate（successor 字母批 / watch-pool），对应单元保持 `digested` 并在 recheck.md 记录** | 是     | 复检报告记录 |
| consumer-cascade | 令牌修值引发非族消费面视觉变化    | 全量 `pnpm test` + 受影响 e2e + 抽查主要页面截图；回归即收窄为作用域限定修复                                                                                                           | 是     | —            |

## Test Strategy

档位选择：**建议有测**——令牌修值加 focused 断言（四主题块对称性 + 关键对比度组合的像素级断言，沿 styles.test.ts 模式）；批内复检用同探针（像素采样对比度）程序化判定；全量 `pnpm test` 回归。

## Execution Plan

### Phase 1 - 令牌层修复

Status: planned
Targets: `packages/theme-tokens/src/styles.css`、`apps/playground/src/styles.css`

- Item Types: `Fix | Proof`

- [ ] Fix：按块修值——dark 块：`--secondary-foreground`（classic L198/glass L318）、`--primary`（L191）、`--popover`（宿主 L86 覆盖处置：dark 块显式覆盖或宿主覆盖移入 light 域）；light/`:root` 块：`--destructive`（L72/L144/L264 过亮修至语义红双主题可读档）；`--table-striped-bg`（L98）落条纹实际值；`color-scheme` 解钉（L172，随 data-mode 切换）
- [ ] Proof：focused 断言——四主题块对称性 + 关键组合对比度（secondary 徽章、primary 按钮、destructive 文本、popover 底）像素级/计算值断言（沿 styles.test.ts 模式）
- [ ] Proof：`pnpm typecheck`/`build` 局部 + 全量 `pnpm test` 回归（令牌是全局消费面，必须全量）

Exit Criteria:

- [ ] 令牌修值落地且四块对称断言过；focused 对比度断言过；全量 test 回归零新增失败

### Phase 2 - 宿主与消费面修复

Status: planned
Targets: `apps/playground/src/`（antdpro 域、showcase pills）、`packages/ui/`（chart 主题化选择器）、stat-tile/status 渲染器

- Item Types: `Fix | Proof`

- [ ] Fix：antdpro `--adp-*` 补 dark 块（值映射 `--adp-*` 语义，9 页生效）；showcase pills dark 配色；ui chart 主题化选择器适配 recharts 3.8.1 DOM 结构（复核已定位）；stat-tile/status 12px 语义色文本档位（tone 调整或前景适配）
- [ ] Proof：抽 4 类消费面各 1 载体探针坐实（antdpro 一页 dark 可读、pills ≥4.5:1、chart dark 轴 ≥4.5:1、stat-tile delta ≥4.5:1）

Exit Criteria:

- [ ] 四类消费面探针达标；`pnpm test` 回归零新增失败

### Phase 3 - 批内同探针复检与收口

Status: planned
Targets: `_tmp/r2-4-recheck/`、`docs/analysis/2026-09-24-r2-4-dark-recheck/recheck.md`、`docs/architecture/theme-compatibility.md`、`docs/architecture/styling-system.md`、`docs/audits/visual-quality-r2/ledger.md`

- Item Types: `Proof | Decision | Fix`

- [ ] Proof：族涉及载体全量同探针复检（清单 = grep 各批 cards 中 dark 平价/对比度族命中的 ledger 单元实时枚举，预计 ≈50）：双主题像素采样对比度全量扫描（contrast-miss 失败路径迭代上限 3 轮）；复检报告 recheck.md（逐载体前/后对比 + verified 翻转建议）
- [ ] Decision：台账 `verified` 翻转口径执行（沿 plan 499 同口径：单元全部正式 P0–P2 发现均被已收口批修复且复检通过才翻 `verified`；部分收口保持 `digested` 并记录）
- [ ] Fix：theme-compatibility.md dark 契约与 styling-system.md 令牌小节回写（含 `--popover` 宿主覆盖处置说明）；daily log 记录（含 full-green）

Exit Criteria:

- [ ] 复检零新增 fail（或 3 轮迭代后收敛）；台账翻转与 recheck.md 一致；owner docs 回写；daily log 更新

## Closure Gates

- [ ] 令牌层 + 宿主/消费面修复落地，focused 断言与四类消费面探针过（Phase 1/2）
- [ ] 族涉及载体同探针复检零新增 fail，contrast-miss 迭代收敛（Phase 3）
- [ ] 台账 verified 翻转按口径执行且与 recheck.md 一致；owner docs 回写
- [ ] `pnpm typecheck`/`build`/`lint`/`check`/`test` 全过（full-green）
- [ ] 独立子 agent closure audit 完成并记录证据（执行 session 不得自审勾选本项）
- [ ] roadmap R2-4 行回写（done + Plan 列链接）+ Rule 5 logs 同步

## Deferred But Adjudicated

### demo 载体 bg-white 头部模板（R2-1d，8 页）

- Classification: `out-of-scope improvement`（本批）
- Why Not Blocking Closure: 属 demo 模板层而非令牌/组件契约层（R2-1d 原判 P1×4 级；dark 令牌修复后残余缺口预计降级，以本批复检实测为准——若复检仍 P1 则升格为字母批首批成员而非留 deferred）；模板统一修复归 R2-4 字母后缀批（R2-4b 候选，roadmap Rule 3 预授权）。
- Successor Required: `yes`
- Successor Path: R2-4 字母后缀批（立项时登记）

### code-editor dark 主题同步 / diff-view light-only（R2-1d P1×2）

- Classification: `out-of-scope improvement`（本批）
- Why Not Blocking Closure: 该两项为**已确认 P1 live defect**，按 Anti-Slacking 以 explicit successor ownership 移出本批（非降级为可选优化）；编辑器主题通道（monaco/diff 组件主题切换）与令牌表修复面不同轴，混入会放大回归面。
- Successor Required: `yes`
- Successor Path: R2-4 字母后缀批

## Non-Blocking Follow-ups

- 语义色文本档 token 化（`--success-foreground-contrast` 类）评估——归 R2-3 字母批或设计系统后续批。
- 对比度门禁（关键令牌组合 checker 进 `check:audit-ui-consistency-gaps`）——归 R2-5 门禁收口评估。

## Draft Review Record

- Reviewer / Agent: 独立 draft reviewer（fresh sub-agent session，单轮 revised）
- Verdict: `revised`（0 Blocker / 1 Major / 6 Minor）→ 1 Major + 6 Minor 定点修复后升 active
- Rounds: 1
- Findings addressed: MAJ-1 light 侧族内实例无处置路径（采纳建议①：修值面改"四主题块内按主题修至 WCAG，light 侧仅动点名的失败值 `--destructive`"；light-regression 断言收窄为"非本批目标令牌 light 值不变"；contrast-miss 补 3 轮不收敛出口——剩余组合逐条 adjudicate，对应单元保持 digested）；MIN-1 `--destructive` 双现值归块标注；MIN-2 bg-white 判级注记（残余以复检实测为准）；MIN-3 Deferred 显式 "confirmed live defect → explicit successor ownership" 措辞；MIN-4 不收敛出口（并入 MAJ-1）；MIN-5 Draft Review Record 补齐（本行）；MIN-6 日期对齐实际起草日 2026-09-24。审查核实：令牌行号 6 处中 5 处精确、`--popover` 覆盖链（theme-tokens 四块均无 --popover 声明 + 宿主 :root 源序胜出）与 color-scheme 钉死机制、ui chart L10/L90、antdpro 无 dark 选择器、stat-tile L149-150/L200、复检枚举可行性全部 live 坐实。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待独立 closure audit>>
- Evidence: <<待填>>

Follow-up:

- <<完成时填写>>
