# 3 文件结构治理与所有权文档同步（02-01/02-02/02-03/02-04）

> Plan Status: active
> Mission: component-audit
> Work Item: Follow-up Backlog 文件结构治理与所有权文档同步（02-01 / 02-02 / 02-03 / 02-04）
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（维度 02 ×4，4 条 P2）、`docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 2026-08-06-0711 节）
> Related: `docs/plans/2026-08-06-0556-1-followup-backlog-and-r1-p2-routing.md`（completed，R2 复核）、`docs/logs/2026/08-06.md`（check:oversized-code-files 14 文件治理债清单）

## Purpose

收口 4 条文件结构与所有权文档治理发现：02-01（crud-renderer-state.ts 职责混合 801 行，提取异步 load 编排）、02-02（table-renderer.tsx 二次膨胀 734 行，提取 responsive 实现）、02-04（diff-view/utils 过度拆分，2 个 62 行小文件）、02-03（flux-runtime-module-boundaries.md 所有权映射不完整，≥12 个 live 模块缺条目）。均为纯结构/文档治理——行为不变、测试不弱化，验证以既有测试全绿 + `check:oversized-code-files` 零新增 + 文档锚点零失效为准。

## Current Baseline

- **4 条发现全部 open**（roadmap Follow-up Backlog 2026-08-06-0711 节，未勾选）。
- **live 核对（2026-08-07）**：
  - `packages/flux-renderers-data/src/crud-renderer-state.ts` = **801 行**；`useCrudLoadAction` 从 :490 起（约 312 行异步 load 编排），与 state 职责混合；`crud-renderer-ownership.ts` 已独立存在（:75 有 useScopeSelector）。
  - `packages/flux-renderers-data/src/table-renderer.tsx` = **734 行**；responsive 实现内联（`resolveResponsiveBreakpoint` :70、`splitResponsiveColumns` :85、`useIsBelowResponsiveBreakpoint` :124、:243-252 消费点）；`table-renderer/` 子目录已有 use-column-resize/use-table-pagination 等 hooks 先例。
  - `packages/flux-renderers-content/src/diff-view/utils/` = `diff-stats.ts`（23 行）+ `diff-template.ts`（39 行），共 62 行独占二级目录；`diff-view/` 下另有 adapters/model/components 平级目录。
  - `docs/architecture/flux-runtime-module-boundaries.md` = 494 行；审计指出 ≥12 个 live 模块无条目（form-store-owned.ts、form-runtime-owner-validation-utils.ts、refresh-nearest.ts、surface-hooks.ts、async-data/request-in-flight-registry.ts、form-store-diagnostics-bridge.ts、flux-compiler schema-compiler 8 子模块等——live 核对：doc 覆盖 22 个子模块中 14 个，8 个缺条目；"≥12" 总量论断成立）。
- **既有治理基线**：`check:oversized-code-files` 14 文件 >700 行 pre-existing 登记债（08-06 清单）；本 plan 拆分后不得新增命中（crud-renderer-state.ts 拆出后应 <700 或登记）。
- **验证基线**：CV full-green（2026-08-06）；data 包 723 单测绿、content 包 268 单测绿、`pnpm check` 零新增命中。

## Goals

- 02-01：`crud-renderer-state.ts` 提取 `crud-renderer-load.ts`（useCrudLoadAction + CrudLoadActionResult 约 320 行），双方落回 <500 行（或至少退出 >700 行登记区）。
- 02-02：`table-renderer.tsx` 提取 `table-renderer/responsive.ts`（约 85 行 responsive 实现），主文件降至 ~650 行。
- 02-04：`diff-view/utils/` 两文件合并为 `diff-view/utils.ts`（或并入 adapters/），消除 62 行独占二级目录。
- 02-03：`flux-runtime-module-boundaries.md` 补齐 live 模块所有权条目（≥12 个，含 schema-compiler 缺的 8 子模块），锚点零失效。
- 全程零行为变更：既有测试原样全绿，无测试改写弱化。

## Non-Goals

- 不改任何组件行为、props、事件契约（纯结构/文档治理）。
- 不处理 14 文件 pre-existing 治理债清单中的其他文件（已登记归独立 successor，见 `docs/logs/2026/08-06.md` 0529-1 Phase 2）。
- 不处理 10-xx/11-xx/12-xx/13-xx/18-xx/20-xx/O-P2-1/O-P2-2（后续轮次）。

## Scope

### In Scope

- data：02-01（crud-renderer-state.ts 拆分）、02-02（table-renderer.tsx responsive 提取）。
- content：02-04（diff-view/utils 合并）。
- docs：02-03（flux-runtime-module-boundaries.md 补条目）；如拆分引入新模块，同步登记。
- `pnpm check` 零新增命中复核。

### Out Of Scope

- 组件行为修复（本 plan 内无 Fix 项）。
- 其他治理债文件拆分。

## Failure Paths

> 不适用：纯结构/文档治理，无外部 IO/鉴权/错误码契约。风险形态为「拆分引入导入路径断裂」或「文档锚点失效」——由全量 typecheck/build/test + anchors 检查覆盖。

## Test Strategy

本档选择：`不适用：纯结构拆分与文档补全，无行为变更；验证以既有测试全绿 + `pnpm check` 零新增 + 文档锚点检查为准`。

## Execution Plan

### Phase 1 - diff-view/utils 合并（02-04）

Status: planned
Targets: `packages/flux-renderers-content/src/diff-view/utils/`（diff-stats.ts + diff-template.ts）→ `diff-view/utils.ts`（或并入 adapters/）

- Item Types: `Fix`（结构治理）

- [ ] 合并 `diff-stats.ts` + `diff-template.ts` 为单文件 `diff-view/utils.ts`（62 行），更新全部 import（5 处相对导入，`rg "diff-view/utils/diff-stats|diff-template"` 全仓核对后逐个更新）。
- [ ] 删除 `utils/` 二级目录；确认 diff-view 包 typecheck + 既有测试全绿。

Exit Criteria:

- [ ] `packages/flux-renderers-content` typecheck + test 全绿；`rg "diff-view/utils/diff-stats|diff-template"` 零命中。

### Phase 2 - crud-renderer-state.ts 拆分（02-01）

Status: planned
Targets: `packages/flux-renderers-data/src/crud-renderer-state.ts` → 新 `crud-renderer-load.ts`

- Item Types: `Fix`（结构治理）

- [ ] 提取 `useCrudLoadAction` + `CrudLoadActionResult` 及 load 专属依赖至 `crud-renderer-load.ts`（约 320 行），state 文件保留纯 state 规约函数（normalizePagination/normalizeSort/normalizeCrudFilters 等）。
- [ ] 更新全部 import（crud-renderer.tsx 等消费方），复核 re-export 面不破坏现有外部 import（若有）。
- [ ] 确认两文件行数（目标 state <500、load 约 320）并核对 `check:oversized-code-files` 不再命中 crud-renderer-state.ts。

Exit Criteria:

- [ ] data 包 typecheck + test 全绿；`crud-renderer-state.ts` 退出 >700 行命中区（或 ≤500）；`check:oversized-code-files` 相对 14 文件基线零新增。

### Phase 3 - table-renderer.tsx responsive 提取（02-02）

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer.tsx` → 新 `table-renderer/responsive.ts`

- Item Types: `Fix`（结构治理）

- [ ] 提取 responsive 实现（resolveResponsiveBreakpoint、splitResponsiveColumns、useIsBelowResponsiveBreakpoint 及消费逻辑约 85 行）至 `table-renderer/responsive.ts`，主文件降至 ~650 行。
- [ ] 更新 import 并复核 responsive 行为（isBelowResponsiveBreakpoint/responsiveExpandActive 语义不变）。

Exit Criteria:

- [ ] data 包 typecheck + test 全绿；`table-renderer.tsx` ≤ ~650 行；既有 responsive 相关测试（table-e1b/enhancements 等）原样通过。

### Phase 4 - flux-runtime-module-boundaries.md 补全（02-03）

Status: planned
Targets: `docs/architecture/flux-runtime-module-boundaries.md`、`packages/flux-runtime/src/`、`packages/flux-compiler/src/`

- Item Types: `Fix`（文档治理）

- [ ] 以 live 模块清单为据补齐缺失条目（form-store-owned.ts、form-runtime-owner-validation-utils.ts、refresh-nearest.ts、surface-hooks.ts、async-data/request-in-flight-registry.ts、form-store-diagnostics-bridge.ts、flux-compiler schema-compiler 缺条目的 8 子模块等），含职责一句话 + 归属。
- [ ] 检查 anchors 零失效（`docs/` 内指向该文档的锚点 `rg` 核对）；文件不超 40 KB。

Exit Criteria:

- [ ] 文档条目与 live 模块一一对应（抽查：`ls packages/flux-runtime/src/*.ts` 逐项对照）；锚点零失效。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_0273febf6ffefyGw0BNHFtTc4Q`，2026-08-07）
- Verdict: `pass-with-minors`
- Rounds: 1（零 Blocker / 零 Major）
- Findings addressed: 行数（801/734/62/494）、useCrudLoadAction 起点 :490、responsive 代码点、diff-view/utils 内容与 5 处消费者导入、缺失模块 live 存在性逐项核实；Minor×3 已修正——①schema-compiler 缺条目实为 8 子模块（doc 覆盖 14/22）非 7；②import 定位用相对路径模式 `rg "diff-view/utils/diff-stats|diff-template"`（`diff-view/utils/` 前缀模式不匹配相对导入）；③request-in-flight-registry.ts 实位于 `async-data/` 子目录，已补前缀。

## Closure Gates

- [ ] 4 条 in-scope 发现全部落地（结构拆分 + 文档补全），既有测试全绿
- [ ] `check:oversized-code-files` 零新增命中（相对 14 文件 pre-existing 基线）
- [ ] 无行为变更：无测试改写弱化（原样迁移）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 14 文件 pre-existing 治理债清单

- Classification: `out-of-scope improvement`（已登记治理债）
- Why Not Blocking Closure: `docs/logs/2026/08-06.md` 0529-1 Phase 2 已登记归独立 successor；本 plan 只保证零新增。
- Successor Required: `yes`
- Successor Path: 已登记的治理债 successor（`docs/logs/2026/08-06.md`）

## Non-Blocking Follow-ups

- 拆分中发现的其他结构问题（同文件内可低成本顺手治理的）当场处理或登记，不静默跳过。

## Closure

Status Note: （未完成）

Closure Audit Evidence:

- Auditor / Agent: （待定）
- Evidence: （待定）

Follow-up:

- （待定）
