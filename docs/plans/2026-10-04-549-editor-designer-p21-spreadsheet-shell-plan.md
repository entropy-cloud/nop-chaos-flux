# 549 spreadsheet page shell → WorkbenchShell（P2.1）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P2.1；`docs/architecture/designer-workbench-shell.md`；`docs/architecture/editor-designer-standard.md` §2.2
> Related: plan 544（Shell 标准化裁定）；word-editor-page.tsx / report page-renderer.tsx（既有 shell 消费先例）

## Purpose

把 `spreadsheet-renderers/src/page-renderer.tsx` 的手拼 section/header/toolbar/main/dialogs 结构收敛到 `WorkbenchShell` 槽位组合，消灭 roadmap §3 登记的手拼 shell 缺口（spreadsheet 行）。**DOM/契约与交互不变，采纳 shell 标准 chrome 为新视觉基线**（M1 裁定）：家族 marker 类与 `data-slot="spreadsheet-page-*"` 契约保持（unit 测试锁定）、交互行为（toolbar 条件渲染/fallback body/dialogs）零变化；WorkbenchShell 无条件 chrome 差异经裁定接受为新基线——canvas 卡片 chrome（rounded-xl border shadow-sm overflow-hidden）、槽位间 gap-3（12px）、body 改 grid 行模型（auto_minmax(0,1fr) + h-full）。这正是标准化目的（shell doc 即标准 chrome；report 家族已在用 default density p-6，spreadsheet 用 flush + 卡片 chrome 同 word-editor）。外壳 section 高度策略：加 `min-h-0`（配合父级 flex/grid 约束；无约束父级下 h-full 解析为 auto 不破坏现状）。

## Current Baseline

- 手拼结构：`page-renderer.tsx:224-262` `section.nop-spreadsheet-page` > `header[data-slot=spreadsheet-page-header]`（标题+状态）+ toolbar div + `main[data-slot=spreadsheet-page-body]`（body 区域或 DefaultSpreadsheetPageBody 含 toolbar/grid/tab bar）+ dialogs div。
- 无左右面板（spreadsheet page 现状无 side panel；collapsed rail/resize 不适用）。
- 先例：word-editor（`word-editor-page.tsx:327-349`）为「家族 marker 外壳 div + WorkbenchShell density=flush」；report（`page-renderer.tsx:645-648`）为「shell className 携带家族类、无外壳元素、default density p-6」。spreadsheet 采用 word-editor 形态（外壳 + flush）——保留家族 marker section 供 e2e/CSS 命中，flush 保持无 padding。
- 契约锁定面：unit `schema-integration.test.tsx:319-321` pin `.nop-spreadsheet-page`、`[data-slot=spreadsheet-page-header]`、`[data-slot=spreadsheet-page-body]`；e2e `spreadsheet-visual-tokens.spec.ts` 的 `.nop-spreadsheet-page` 选择器命中的是 playground demo 自建宿主容器（非 renderer DOM，迁移不受影响）。
- spreadsheet-renderers `package.json` 已依赖 `@nop-chaos/flux-react`（WorkbenchShell 来源）。

## Goals

- page-renderer 迁移为「家族 marker section 外壳 + `WorkbenchShell`（density="flush"）」：header 槽 = 标题/状态内容（内层保留 `spreadsheet-page-header` marker）；canvas 槽 = 条件渲染 toolbar div（有内容才渲染，现状保持）+ `main[data-slot=spreadsheet-page-body]`；dialogs 槽 = dialogs 内容。无左右面板（undefined = 槽位隐藏，shell 规则）。
- 全部既有 unit 测试零回归（契约 marker 断言不改动）；e2e 不受影响（demo 自建宿主）。

## Non-Goals

- 不引入左右面板/collapsed rail/resize（家族 config 无此诉求，shell 规则「隐藏 unavailable sides」）。
- 不改 DefaultSpreadsheetPageBody、bridge、命令面、scope/statusPath 投影。
- 不改 playground demo（其自带 marker 容器是宿主样式，非 renderer 契约）。

## Scope

### In Scope

- `packages/spreadsheet-renderers/src/page-renderer.tsx`（JSX 结构迁移）。
- `docs/architecture/designer-workbench-shell.md`（Spreadsheet family mapping 节）。

### Out Of Scope

- DefaultSpreadsheetPageBody / bridge / 命令面 / scope 投影 / playground demo。
- 左右面板与 collapsed rail/resize。

## Failure Paths

| 触发                                     | 行为                                                                         | 可重试 | 用户可见表现             |
| ---------------------------------------- | ---------------------------------------------------------------------------- | ------ | ------------------------ |
| shell 槽位包装破坏 marker 断言           | 既有 unit 红 → 保持家族 marker 于槽内层修复                                  | 是     | 无                       |
| shell chrome 视觉差异（卡片/gap/行模型） | M1 已裁定接受为新视觉基线（见 Purpose）；unit/e2e 契约断言不锁定这些视觉属性 | 是     | 卡片化外观（shell 标准） |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（既有 unit 契约断言即行为不变证明；迁移零新契约）。

## Execution Plan

### Phase 1 - shell 迁移（Fix）

Status: completed
Targets: `packages/spreadsheet-renderers/src/page-renderer.tsx`

- Item Types: `Fix`

- [x] 迁移 JSX 结构（section 外壳保留 + WorkbenchShell 三槽位，家族 marker 内层保留）
- [x] spreadsheet-renderers 全量测试绿（26 文件 178/178，契约断言零改动）

Exit Criteria:

- [x] `page-renderer.tsx` 无手拼三栏结构；WorkbenchShell 经 @nop-chaos/flux-react 导入
- [x] spreadsheet-renderers 全量测试零回归（178/178）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_13562a21-0028-4904-a392-b679fada655c）
- Verdict: pass（round 1 fail → 修订）
- Rounds: 2（round 2 为修订核对）
- Findings addressed: M1 视觉差异重裁定（DOM/契约/交互不变 + shell chrome 为新基线，卡片/gap/行模型/高度策略逐一记录）；M2 owner doc Spreadsheet 节改无条件 gate；m1 report 先例描述纠正；m2 补 Scope 节；m3 补 roadmap 回写 gate；m4 toolbar 条件渲染显式保持。

## Closure Gates

- [x] shell 槽位迁移完成（手拼结构消灭）
- [x] 行为不变：spreadsheet-renderers 全量测试零回归（家族 marker 契约保持，178/178）
- [x] 必要 focused verification 已完成（spreadsheet-renderers 26 文件全绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] owner doc `designer-workbench-shell.md` Family Mapping 增 Spreadsheet 节（无条件，roadmap §7 Owner doc 归属 + §10 Rule 4）：无 side panel（left/right 不定义）、canvas = toolbar+body、marker 契约保持
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）
- [x] roadmap §6 P2.1 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: shell 迁移按 M1 裁定落地（DOM/契约/交互不变 + shell chrome 新基线）；家族 marker 契约断言零改动零回归（178/178）；owner doc Spreadsheet family mapping 落地；独立 closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_e1e1b5da-df54-487a-92db-a45d5f9dd9de）
- Evidence: VERDICT: approved——JSX 三槽位/无面板/flush/toolbar 条件渲染逐项核实；body 三分支逐字节等价；schema-integration.test.tsx git diff 为空（契约断言未动）；26 文件 178 测试独立复跑；owner doc Spreadsheet 节与 live 行为一致；CSS 全为后代选择器（workbench 包装层不破坏）；typecheck/build/lint/test/check 独立复核。1 Minor（owner doc "unit-locked" 措辞精确化）已随手修正。

Follow-up:

- no remaining plan-owned work.
