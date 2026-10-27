# 780 PH-16 WCAG 全仓基线文档

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-16（E 组；PH-17 axe 门禁 / PH-18 focus 台账的输入）
> Related: `docs/plans/2026-07-21-0800-2-scheduling-accessibility-plan.md`（completed，包级 WCAG 2.1 AA 先例）+ `2026-07-23-0000-1` 复核；`scripts/audit/find-canvas-wrapper-a11y-gaps.mjs`（PH-1 已接线，live 0 命中）；`eslint-plugin-jsx-a11y`（lint 链既有）；owner doc：`docs/testing/wcag-2.1-aa-baseline.md`（新，roadmap 指定）

## Purpose

建立全仓 WCAG 2.1 AA **基线文档**：目标等级、适用范围（哪些面受约束、哪些面豁免及理由）、现行机械保障清单（lint 规则 / 扫描器 / 测试）、已知差距（挂 PH-17/PH-18）、新渲染器的验收要求。范围=文档基线，不实现 axe 门禁（PH-17）。

## Current Baseline

2026-10-27 live：

- 无全仓 WCAG 基线文档；WCAG 提法散见 analysis 文档与组件 design.md（如 markdown-editor / transfer / flux-renderers-ai / mobile-roadmap）。
- 包级先例：scheduling accessibility plan（completed）+ 复核 plan，WCAG 2.1 AA 口径已在 scheduling 面落地。
- 机械保障（live 清点）：`eslint-plugin-jsx-a11y` 在 lint 链；`check:audit-canvas-wrapper-a11y-gaps` 扫描器（PH-1 接线，live 0 命中）；`packages/ui` 底座为 Base UI（ARIA/focus 原语）。
- 差距：无 axe 测试依赖（`axe-core` 仅作为 eslint 传递依赖存在于 lock，未进测试面）；无全组件 focus 管理台账（PH-18）。
- aria 使用面：517 个 `.tsx` 含 `aria-`（roadmap 10-19 口径；R1 审阅者复测 538，Phase 1 刷新）。
- **门禁事实（R1 勘正）**：`check:active-doc-code-anchors` 扫描面仅 `docs/architecture|components|references` + `docs/index.md`，**不含 `docs/testing/`**——本 plan 须先把新文档显式纳入其扫描面（`explicitActiveDocs`），否则唯一自动化门禁形同虚设。canvas 扫描器为 `check:scanner-baselines` 内基线 0 的棘轮项（非独立门禁），文档机械保障清单引用包装命令。

## Goals

- `docs/testing/wcag-2.1-aa-baseline.md`（新，目标 <20KB）：①目标等级与范围矩阵（widget 渲染器 / layout 渲染器 / canvas-类（3d/map/scada/svg）/ playground 宿主面——各自 WCAG 适用度与豁免理由）；②现行机械保障清单（逐项：lint a11y 规则集、canvas 扫描器、Base UI 原语、scheduling 包级 AA 实绩）；③已知差距登记（axe 测试缺位 → PH-17；focus 台账缺位 → PH-18；aria 契约无跨包一致性检查）；④新渲染器验收要求（进 `renderer` 验收清单的 a11y 条目）；⑤与 scheduling 先例的推广方式（包级 AA 实践提炼为全仓规则而非直接承诺全仓 AA 合规——诚实区分"基线标准"与"合规现状"）。
- `docs/testing/index.md` 加指针；roadmap PH-16 回写。

## Non-Goals

- 不引入 axe（PH-17）；不做 focus 台账（PH-18）。
- 不承诺"全仓已合规 AA"——文档是**基线标准 + 差距登记**，不是合规声明。
- 不改任何渲染器代码。

## Scope

### In Scope

- `docs/testing/wcag-2.1-aa-baseline.md`（新）、`docs/testing/index.md` 指针、roadmap、daily log

### Out Of Scope

- axe 接入（PH-17）、focus 台账（PH-18）、渲染器修复

## Failure Paths

不适用：纯文档基线。

## Test Strategy

本档选择：`不适用：纯文档基线，无行为变更`（Closure Gates 保留 `pnpm check`；`check:active-doc-code-anchors` 覆盖 `docs/testing/`）。

## Execution Plan

### Phase 1 - Proof：live 清点

Status: completed
Targets: 调查记录（写入文档基线节的证据列）

- Item Types: `Proof`

- [x] live 清点（R1 审阅者独立复核）：jsx-a11y 5 条 error 规则（`eslint.config.js:161-165`，test 文件放宽 4/5）；canvas 扫描器 0 命中（基线 0 棘轮）；scheduling plan completed + 复核；aria 538 个 `.tsx`（按包分布落文档）；Base UI `@base-ui/react ^1.3.0`。

Exit Criteria:

- [ ] 清点结果落文档（每条机械保障有命令/文件指针）。

### Phase 2 - Fix：基线文档

Status: completed
Targets: `docs/testing/wcag-2.1-aa-baseline.md`

- Item Types: `Fix`

- [x] 成文 + `explicitActiveDocs` +3（wcag / coverage-thresholds / e2e-baseline-ledger）+ `docs/testing/index.md` 指针 + roadmap PH-16 行（closure 同 commit done）+ daily log。

Exit Criteria:

- [x] `pnpm check` exit 0（audit 与执行者各自复跑） exit 0（新文档已入 anchor 扫描面且反向验证红）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agent `agent_11e29e91`（R1），R2 见下，2026-10-27
- Verdict: R1 `fail`（1 Major / 2 Minor）→ 修订（采纳审阅者修法 (a)：`explicitActiveDocs` 显式纳入）
- Rounds: 1（R2 免——审阅者明示"without a further full re-review round"）
- Rounds: <<>>
- Findings addressed: Major——active-doc-code-anchors 扫描面事实勘正 + 显式纳入修法；Minor——aria 计数不冻结（517→538 复测）、canvas 扫描器引用包装命令。

## Closure Gates

- [x] 基线文档落成且每条机械保障可核（closure audit 逐条复验）
- [x] 差距登记与 PH-17/PH-18 对齐
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_9900a04c`，2026-10-27，verdict `approved`（0 Blocker / 0 Major，2 Minor 均为本次回写项，见 §Closure）
- [ ] `pnpm check`

## Deferred But Adjudicated

### 全仓 AA 合规声明

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 交付基线标准；合规现状需 axe 面（PH-17）与 focus 台账（PH-18）先行。
- Successor Required: `no`（PH-17/18 完成后由其闭环评估）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: WCAG 2.1 AA 基线标准 + 机械保障清单 + 差距登记落 `docs/testing/`；显式不声明全仓合规（axe/focus 面归 PH-17/18）。`check:active-doc-code-anchors` 扫描面扩至 3 份 testing 基线文档。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_9900a04c`（2026-10-27）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 2 Minor）。审计者独立：anchor 门禁 exit 0（374 docs）+ 自做反向探针红并字节级还原；基线文档五条机械保障逐条复验（规则名/行号、基线 0、Base UI 版本、scheduling 状态、aria 538）；确认文档不含合规声明、差距映射 PH-17/18；`pnpm check` exit 0。2 Minor（plan 正文与 closure 同批回写项；roadmap artifact cell "拟建"措辞）已在本 closure commit 落地。

Follow-up:

- no remaining plan-owned work。axe 面 → PH-17；focus 台账 → PH-18。
