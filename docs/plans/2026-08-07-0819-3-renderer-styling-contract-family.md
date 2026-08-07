# 03 渲染器样式契约族修复

> Plan Status: active（draft → active：独立子 agent 两轮审查，首轮 revised（1 Blocker + 1 Major）已修订解决，复检 pass-with-minors 且 4 条 Minor 全部处理，零 Blocker/零 Major，共识达成）
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（10-01/10-02/10-03）、`docs/backlog/component-audit-roadmap.md` Follow-up Backlog
> Related: `docs/architecture/styling-system.md`、`docs/architecture/theme-compatibility.md`、`docs/architecture/renderer-markers-and-selectors.md`
> Mission: component-audit
> Work Item: 样式契约族（10-01/10-02/10-03）

## Purpose

修复三条 open P2 样式契约违例：10-01（spreadsheet-renderers 包 CSS 锚定 playground 专属类名 `.report-designer-demo`，7 处）、10-02（spreadsheet-toolbar BEM 死类名 `rd-toolbar` 系列，约 16 处 + e2e 定位基准）、10-03（diff-view 文件列表内联硬编码语义色 10 处，绕过 `--nop-diff-*` token 体系）。收口后 roadmap Follow-up Backlog 三行翻转 `[x]`。

## Current Baseline

- **10-01（live 复核）**：`packages/spreadsheet-renderers/src/canvas-styles.css:349,363,371,381,391,400,409` 共 7 处 `.report-designer-demo [data-slot='spreadsheet-toolbar*']` 选择器与正统 `[data-slot='spreadsheet-default-toolbar'] [data-slot=...]` 选择器**逗号并列且声明体完全一致**（不是「差异样式」，是同一组规则的第二锚点）；`.report-designer-demo` 仅存在于 playground（`apps/playground/src/styles.css:181` 定义、`apps/playground/src/pages/report-designer-demo.tsx:440` 使用）；**playground demo 页直接挂载 `<SpreadsheetToolbar>` 于 `.report-designer-demo` 之下，无 `data-slot="spreadsheet-default-toolbar"` 祖先**（该 wrapper 仅在 `default-page-body.tsx:152`）——这 7 处变体是 demo 工具栏样式（flex/gap/padding/背景/边框/min-height）的唯一来源，删除前必须保留等价锚定；playground `styles.css` 当前零 spreadsheet-toolbar 规则。
- **10-02（live 复核）**：`packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx:11` `<div className="rd-toolbar rd-toolbar--single-row" data-slot="spreadsheet-toolbar">` + `spreadsheet-toolbar/toolbar-status.tsx:9,10,14` + `spreadsheet-toolbar/toolbar-groups.tsx` 共 16 处 `rd-*`；全仓无任何 CSS 定义 `rd-*`（样式全走 data-slot）；e2e 定位基准 `tests/e2e/report-designer-demo.spec.ts:25,168,186` 与 `tests/e2e/exploratory/subagent-a-independent-review.spec.ts:414,417` 使用 `.rd-toolbar`；`rd-` 前缀为 report-designer 迁移残留。
- **10-03（live 复核）**：`packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx:108,112,121,157-158,180,192-193,201-202` 内联硬编码 `#16a34a`/`#dc2626`/`#ca8a04`/`#dcfce7`/`#fef2f2`/`#fefce8` + 非家族 token/裸 hex（`--nop-bg-active, #e5f0ff` :108/:157、`--nop-text, #333` :112、`#999` :121、`--nop-bg-hover, #f5f5f5` :158、`background: '#1677ff'` 裸 hex :180）；同目录 `diff-view.css` 文件头声明「All color values use variables; no hardcoded oklch」并以 `--nop-diff-*` token 全量主题化（add/del/context/conflict bg 家族齐全，另有 `--nop-diff-stat-added-text`/`--nop-diff-stat-removed-text` :49-50 用于 diff-header 状态色）。
- **roadmap backlog 现状**：`docs/backlog/component-audit-roadmap.md` Follow-up Backlog `10-01`/`10-02`/`10-03` 三行均为 `[ ]`。

## Goals

- 修复 10-01：移除包 CSS 对 `.report-designer-demo` 宿主类名的锚定（7 处变体与正统锚定同声明体，合并为独立 `[data-slot='spreadsheet-toolbar']` 裸选择器），demo 页样式保持；`rg "report-designer-demo" packages/spreadsheet-renderers/` 零命中。
- 修复 10-02：删除全部 `rd-*` BEM 死类名仅留 data-slot，同步更新 e2e 定位基准与 playground 单测断言（`.rd-toolbar` → data-slot 选择器）。
- 修复 10-03：`diff-file-list.tsx` 状态色与非家族 token 映射到 `--nop-diff-*` 家族（补齐缺失的 stat 徽标 token），组件内用 `var(--nop-diff-*, fallback)`，硬编码 hex 清零。

## Non-Goals

- 不重做 spreadsheet/diff-view 的整体视觉设计（仅契约收敛）。
- 不处理 backlog 其余开放项（13-02/18-01/18-02/O-P2-2/12-xx 归其他计划轮次）。
- 不改 data-slot 选择器契约本身（DOM 契约测试锁定的选择器不变）。

## Scope

### In Scope

- `packages/spreadsheet-renderers/src/canvas-styles.css:349-409`（10-01，7 处变体并入裸选择器）
- `apps/playground/src/styles.css`（10-01：仅当核实存在 playground 专属差异时下沉；当前复核结论为无差异可下沉）
- `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx:11`、`spreadsheet-toolbar/toolbar-status.tsx`、`spreadsheet-toolbar/toolbar-groups.tsx`（10-02）
- `tests/e2e/report-designer-demo.spec.ts`、`tests/e2e/exploratory/subagent-a-independent-review.spec.ts`（10-02 定位基准）
- `apps/playground/src/pages/report-designer-demo.test.tsx`（10-02 单测断言，:43,50 用 `.rd-toolbar`）
- `packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx`、`packages/flux-renderers-content/src/diff-view/diff-view.css`（10-03）

### Out Of Scope

- 其他包的样式契约违例（新发现归独立 successor）。
- `docs/backlog/component-audit-roadmap.md` 其余 open backlog 行。

## Failure Paths

| 场景             | 触发                                      | 行为                                                         | 可重试 | 用户可见表现     |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------ | ------ | ---------------- |
| 10-01 宿主同名类 | 宿主页面恰好有 `.report-designer-demo` 类 | 移除包 CSS 锚定后不再意外套 spreadsheet-toolbar 样式         | —      | 无跨包泄漏       |
| 10-01 playground | playground report-designer-demo 页        | 7 处变体并入裸选择器后样式保持（计算样式断言验证），视觉不变 | —      | 演示页外观不变   |
| 10-02 e2e        | report-designer-demo e2e 回归             | 定位基准改 data-slot 后全绿                                  | 是     | 测试通过         |
| 10-03 主题切换   | dark mode / 宿主主题                      | diff 状态色跟随 `--nop-diff-*` token 变化                    | —      | 状态色随主题正确 |

## Test Strategy

本档选择：`建议有测`（样式契约修复：DOM 契约断言 + 相关 e2e 回归；canvas-styles 既有 `canvas-styles.test.ts` 保持绿）。

## Execution Plan

### Phase 1 - 10-01 spreadsheet 包 CSS 去 playground 锚定

Status: planned
Targets: `packages/spreadsheet-renderers/src/canvas-styles.css`、`apps/playground/src/styles.css`

- Item Types: `Fix`

- [ ] 将 `canvas-styles.css:349,363,371,381,391,400,409` 7 处 `.report-designer-demo` 选择器变体并入独立的 `[data-slot='spreadsheet-toolbar']`（及同组子槽位）裸选择器，与 `[data-slot='spreadsheet-default-toolbar']` 锚定规则保持同声明体；包内不再引用 `.report-designer-demo`。
- [ ] 核实 playground 演示页工具栏样式保持（flex/gap/padding/背景/边框/min-height 等），如存在包 CSS 无法覆盖的 playground 专属差异，下沉到 `apps/playground/src/styles.css`（当前复核结论：7 处变体与正统锚定声明体一致，无差异可下沉）。
- [ ] `canvas-styles.test.ts` 保持绿；`pnpm check:package-css-exports` 绿。

Exit Criteria:

- [ ] `rg "report-designer-demo" packages/spreadsheet-renderers/` 零命中；`canvas-styles.css` 存在独立的 `[data-slot='spreadsheet-toolbar']`（及同组子槽位）裸选择器，声明体与 default-toolbar 锚定规则一致。
- [ ] **demo 页视觉保持验证**：`apps/playground/src/pages/report-designer-demo` 渲染后工具栏仍有背景/边框/间距（程序化断言：e2e 或 vitest computed-style 断言背景色/display flex/边框非默认），不能只靠 rg 零命中。
- [ ] spreadsheet-renderers 包 `pnpm --filter @nop-chaos/spreadsheet-renderers test` 全绿 + `pnpm check:package-css-exports` 绿。

### Phase 2 - 10-02 rd-toolbar 死类名清理 + e2e 基准更新

Status: planned
Targets: `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx`、`spreadsheet-toolbar/toolbar-status.tsx`、`spreadsheet-toolbar/toolbar-groups.tsx`、`apps/playground/src/pages/report-designer-demo.test.tsx`、`tests/e2e/report-designer-demo.spec.ts`、`tests/e2e/exploratory/subagent-a-independent-review.spec.ts`

- Item Types: `Fix`

- [ ] 删除 16 处 `rd-*` 类名（`rd-toolbar`/`rd-toolbar--single-row` 等），仅留 `data-slot`（DOM 契约不变）。
- [ ] **同步更新 playground 单测断言**：`apps/playground/src/pages/report-designer-demo.test.tsx:43,50` 用 `querySelector('.rd-toolbar')` + `className` 包含 `rd-toolbar--single-row` 断言——`rd-*` 删除后该测试抛错，且既有 exit 准则的 `rg` 只扫 `packages/ tests/e2e/` 不覆盖 `apps/`。改断言为 `[data-slot='spreadsheet-toolbar']` 定位 + 非 className 的可观测属性（如 computed-style flex 方向或 data-slot 存在性）。
- [ ] e2e 定位基准更新：`report-designer-demo.spec.ts:25,168,186` 与 `subagent-a-independent-review.spec.ts:414,417` 的 `.rd-toolbar` 改为 `[data-slot='spreadsheet-toolbar']` 定位。
- [ ] 相关 e2e 回归：`report-designer-demo` spec 全绿（`npx playwright test tests/e2e/report-designer-demo.spec.ts`）。

Exit Criteria:

- [ ] `rg "rd-toolbar|rd-toolbar--" packages/ tests/e2e/ apps/` 零命中（含 playground 单测与 e2e spec）；`rg "rd-" packages/spreadsheet-renderers/src/ apps/` 仅剩非 BEM 前缀命中（如有则逐一核对）。
- [ ] **playground 单测回归绿**：`report-designer-demo.test.tsx` 断言已改为 data-slot 定位（`pnpm --filter playground test` 或全量 `pnpm test` 中该文件绿）。
- [ ] spreadsheet 包 `pnpm --filter @nop-chaos/spreadsheet-renderers test` 全绿；report-designer-demo e2e 全绿。

### Phase 3 - 10-03 diff-view token 化

Status: planned
Targets: `packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx`、`packages/flux-renderers-content/src/diff-view/diff-view.css`

- Item Types: `Fix`

- [ ] `diff-view.css` 补齐缺失 token：状态徽标文字/背景色沿用 `--nop-diff-stat-*` 家族命名风格（既有 :49-50 `--nop-diff-stat-added-text`/`--nop-diff-stat-removed-text`），新增 modified 对应色；fallback 与现 hex 一致。
- [ ] `diff-file-list.tsx` 硬编码色改 `var(--nop-diff-*, <fallback>)`：状态色（:192-193 add/del/modified fg+bg）用家族 token；`:108/:157` 的 `--nop-bg-active`、`:112` `--nop-text`、`:158` `--nop-bg-hover` 非家族 token 与 `:180` 裸 `#1677ff`、`:121` `#999` 逐一核对后改家族 token 或加注保留理由。
- [ ] content 包 `pnpm --filter @nop-chaos/flux-renderers-content test` 全绿（含既有 diff 测试）。

Exit Criteria:

- [ ] `rg "#16a34a|#dc2626|#ca8a04|#dcfce7|#fef2f2|#fefce8|#999|#1677ff" packages/flux-renderers-content/src/diff-view/components/` 零命中（fallback hex 仅允许出现在 `diff-view.css` token 定义处，`components/` 目录内不残留裸 hex）。
- [ ] content 包测试全绿。

### Phase 4 - 台账收口

Status: planned
Targets: `docs/backlog/component-audit-roadmap.md`、`docs/logs/2026/08-07.md`

- Item Types: `Fix`

- [ ] roadmap Follow-up Backlog `10-01`/`10-02`/`10-03` 三行翻转 `[x]` 附收口注记。
- [ ] daily log `docs/logs/2026/08-07.md` 追加本 plan 收口条目。

Exit Criteria:

- [ ] roadmap 三行 `[x]`；daily log 有条目。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02663c404ffewM8bee9AreOAOC` 首轮 revised → `ses_0265ea43effePeUq2zDnwFYKtk` 复检 pass-with-minors）
- Verdict: pass-with-minors（首轮 B1/M1 已解决，复检 4 条 Minor 已全部修订）
- Rounds: 2
- Findings addressed: B1（Blocker）——Phase 2 补 `apps/playground/src/pages/report-designer-demo.test.tsx:43,50` 到 Targets/Exit Criteria（rg 覆盖 apps/，断言改 data-slot）；M1（Major）——10-01 baseline/机制修正（7 处变体为同声明体第二锚点、demo 无 default-toolbar wrapper、变体是唯一样式来源），Phase 1 改为并入裸选择器 + demo 计算样式保持 exit 准则。复检 Minor：M-A `:180` 为裸 `#1677ff`（非 --nop-accent）+ exit rg 补 `#1677ff`；M-B exit rg 收窄到 `components/` 目录、fallback hex 仅允许在 diff-view.css token 定义处；M-C Closure Gates/Scope/Failure Paths「差异样式下沉」措辞统一；M-D Scope/Targets 补 report-designer-demo.test.tsx。

## Closure Gates

- [ ] 10-01 包 CSS 不再锚定 playground 类名（rg 零命中），7 处变体已并入裸选择器且 demo 工具栏计算样式保持
- [ ] 10-02 `rd-*` 死类名已删除，e2e 定位基准已更新且回归绿
- [ ] 10-03 diff 状态色已 token 化（rg 零命中硬编码 hex）
- [ ] roadmap Follow-up Backlog 10-01/10-02/10-03 三行已翻转 `[x]` 附收口注记
- [ ] daily log 已记录（`docs/logs/2026/08-07.md`）
- [ ] 不存在被静默降级到 deferred 的 in-scope confirmed live defect
- [ ] 受影响的 owner docs 已同步（styling-system/theme-compatibility 契约未变则核实时注明；diff token 命名如扩展需在 diff-view design.md 或 css 文件头注明）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增命中）
- [ ] 相关 e2e 回归绿（report-designer-demo spec；diff-view 相关 spec）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- `docs/backlog/component-audit-roadmap.md` 其余 open backlog 行（13-02/18-01/18-02/O-P2-2/12-xx）归后续计划轮次。

## Closure

Status Note: （完成或关闭时填写）

Closure Audit Evidence:

- Auditor / Agent: （独立审计者或独立子 agent）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （只记录 non-blocking follow-up；confirmed live defect 不得出现在这里）
