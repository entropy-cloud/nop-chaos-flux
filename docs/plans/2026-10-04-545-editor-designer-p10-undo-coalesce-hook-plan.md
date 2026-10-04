# 545 editor-core 合并钩子补齐（P1.0）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P1.0；`docs/architecture/editor-core.md` §6.1（唯一语义缺口登记）；`docs/architecture/editor-designer-standard.md` §2.1/§6 裁决①
> Related: plan 544（P0.1 规范成文）；P1.1（SCADA 迁移，本计划为硬前置）

## Purpose

补齐 `editor-core.md` §6.1 登记的唯一内核语义缺口：`UndoCommandStack`/`EditorCore` 无跨操作合并 API。向后兼容新增 `replaceUndoTop` 栈原语 + generic group 合并钩子，使 P1.1 SCADA 迁移（`UndoStack` coalesceGroup + replaceUndoTop 语义）可落。

## Current Baseline

- `packages/editor-core/src/undo-command-stack.ts`：双栈原语 push/peek/pop/深度/canUndo/canRedo/clear；**无** replaceUndoTop/coalesce。
- `packages/editor-core/src/types.ts`：`EditorDiffEntry` 有 `operationKind?`/`timestamp`，**无** `coalesceGroup`。
- `packages/editor-core/src/editor-core.ts`：`record(forward, inverse, operationKind?)` 只做普通入栈；栈不暴露给外部。
- 语义蓝本：`flux-renderers-industrial/src/editor/undo-redo/undo-stack.ts` `replaceUndoTop`（替换栈顶 + U6 截断 redo + 空栈等价 push）与 `operation-coalesce.ts` `tryCoalesce`——其中 **M3 group 合并**（同 `coalesceGroup` + 时间窗 ≤500ms → forward 取新 forward、inverse 保留栈顶原 inverse）是 diff 无关的通用规则，可下沉 editor-core；**M2 属性合并**是 ScadaConfigDiff 专属（单 nodeId patch 覆盖），留在域层，经栈原语 `replaceUndoTop` 实现。
- `DEFAULT_COALESCE_WINDOW_MS = 500`（industrial `operation-coalesce.ts:22`）。
- 包既有测试：`packages/editor-core/src/editor-core.test.ts`（347 行，全绿基线）。

## Goals

- `UndoCommandStack` 增 `replaceUndoTop(entry)`（向后兼容新增；替换栈顶、空栈等价 push、U6 截断 redo）。
- `EditorDiffEntry` 增 `coalesceGroup?: string`；editor-core 导出 `DEFAULT_COALESCE_WINDOW_MS = 500`。
- `EditorCore` 增两个合并钩子（均为向后兼容新增）：
  - `recordCoalesced(forward, inverse, coalesceGroup, operationKind?, windowMs?)`：M3 generic group 合并（同 group + 时间窗内 → 栈顶替换为合并 entry；否则普通入栈）；返回是否发生合并。
  - `replaceTop(forward, inverse, operationKind?, coalesceGroup?)`：域内自算合并（M2 路径）的替换钩子——把栈顶整体替换为该 entry（空栈等价 push、截断 redo）。
- 单测锁定全部新行为（含 U6 截断、空栈边界、时间窗边界、事务内 no-op、disposed no-op、现有契约零变化回归）。
- owner doc `editor-core.md` 同步新 API 面（§2 表 + §6.1 缺口闭合）。

## Non-Goals

- 不迁移任何家族（P1.1/P1.2/P1.3 各自的 plan 负责）。
- 不实现 M2 属性合并的域逻辑（ScadaConfigDiff 专属，归 SCADA 域层）。
- 不改既有方法签名/语义（`update`/`record`/`undo`/`redo`/事务三件套/commit 不动）。
- 不做历史面板只读投影（industrial `listUndoEntries` 是产品功能，roadmap 未列）。

## Scope

### In Scope

- `packages/editor-core/src/`：`types.ts`、`undo-command-stack.ts`、`editor-core.ts`、`index.ts`（导出新符号）、测试。
- `docs/architecture/editor-core.md`（owner doc 同步）。

### Out Of Scope

- `packages/flux-renderers-industrial` 及其他任何家族包。
- roadmap/mission 状态之外的 backlog 文档。

## Failure Paths

| 触发                                        | 行为                                                             | 可重试                 | 用户可见表现 |
| ------------------------------------------- | ---------------------------------------------------------------- | ---------------------- | ------------ |
| `recordCoalesced`/`replaceTop` 在事务内调用 | no-op（事务收口才入栈语义不被破坏）                              | 是（事务收口后可再调） | 无           |
| disposed 后调用                             | no-op                                                            | 否                     | 无           |
| `replaceTop` 空栈                           | 等价 push（与 industrial `replaceUndoTop` 一致）                 | 是                     | 无           |
| 时间窗边界（差值 == windowMs）              | 合并（≤ 为界，与 industrial `> windowMs return undefined` 一致） | 是                     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（公共内核 API 新增；failing-first：Proof 项在 Fix 之前）。

## Execution Plan

### Phase 1 - 失败测试先行（Proof）

Status: completed
Targets: `packages/editor-core/src/editor-core.test.ts`

- Item Types: `Proof`

- [x] 新增 describe 块锁定目标行为（先红）：栈 `replaceUndoTop`（栈顶替换/空栈 push/U6 截断 redo）；`recordCoalesced`（同 group 合并、异 group 普通入栈、时间窗内/外边界、合并后 undo 回到最初态、3 连同 group 链式合并不断链、返回值 true/false）；`replaceTop`（替换 + 截断 redo）；事务内/disposed no-op；`DEFAULT_COALESCE_WINDOW_MS` 值。时间戳用内核 `Date.now()`——时间窗用例以 `vi.useFakeTimers`/`setSystemTime` 或 `windowMs?` 参数构造
- [x] `pnpm --filter @nop-chaos/editor-core test` 确认新增用例红（API 不存在）——12 failed / 21 passed

Exit Criteria:

- [x] 新测试块存在且当前红（12 新用例红：导出不存在 + 断言失败）

### Phase 2 - 实现与绿灯（Fix）

Status: completed
Targets: `packages/editor-core/src/types.ts`、`undo-command-stack.ts`、`editor-core.ts`、`index.ts`

- Item Types: `Fix`

- [x] `EditorDiffEntry` 增 `coalesceGroup?: string`；新增导出常量 `DEFAULT_COALESCE_WINDOW_MS = 500`
- [x] `UndoCommandStack.replaceUndoTop(entry)`：替换栈顶、空栈 push、截断 redo（对齐 industrial 语义）
- [x] `EditorCore.recordCoalesced` + `replaceTop` 实现（事务内/disposed no-op；`recordCoalesced` 合并产出 forward=incoming.forward、inverse=top.inverse、operationKind=incoming.operationKind、coalesceGroup=incoming.coalesceGroup、timestamp=incoming.timestamp——对齐 industrial M3 全字段传播，保证 ≥3 连同 group 链式合并不断链）
- [x] `index.ts` 导出 `DEFAULT_COALESCE_WINDOW_MS`
- [x] 全包测试绿（新用例 + 既有回归零失败）

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/editor-core test` 全绿（含既有全部用例零回归）——33/33
- [x] `pnpm --filter @nop-chaos/editor-core typecheck` 通过（局部 typecheck 解阻塞 P1.1）

### Phase 3 - owner doc 同步（Follow-up）

Status: completed
Targets: `docs/architecture/editor-core.md`

- Item Types: `Follow-up`

- [x] §2 公共 API 表补 `replaceUndoTop`/`recordCoalesced`/`replaceTop`/`coalesceGroup`/`DEFAULT_COALESCE_WINDOW_MS`；§6.1 缺口条目更新为已闭合（M3 下沉内核、M2 留域层经 replaceTop 的裁定）；§6 迁移矩阵缺口行改"直接映射（P1.0 已闭合）"

Exit Criteria:

- [x] `editor-core.md` 与 live API 一致，无"唯一语义缺口"的过时表述

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_37876712-9f77-42c2-a166-b9e079b3d96d）
- Verdict: pass
- Rounds: 1
- Findings addressed: 零 Blocker/Major；4 Minor 已处理——M1 合并产出补全 operationKind/coalesceGroup 全字段传播 + 链式合并用例；M2 follow-ups 增"域读不到栈顶"设计注记；M3 时间窗用例测试手法注明；M4 Failure Paths 可重试列补齐。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复（本计划无 live defect，纯缺口补齐）
- [x] 新 API 语义与 industrial 蓝本一致（replaceUndoTop/U6/时间窗边界；recordCoalesced 判定已按 audit Minor 对齐 truthiness 语义）
- [x] 既有 editor-core 契约零变化（既有测试零回归，test 文件 146 增 0 删）
- [x] 必要 focused verification 已完成（editor-core 33/33）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] owner doc `editor-core.md` 已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78 tasks 全绿，含 editor-core 33/33）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

- P1.1 SCADA 迁移 plan 落地 M2 属性合并的域侧实现（本计划只提供 replaceTop 原语）。设计注记：内核不外露栈，M2 域逻辑读栈顶 patch 需域层自行 side-track 最近 record 的 entry（undo/redo/update 交错时自行失效）；若不敷使用，届时向内核加加法式 top-read API（向后兼容）。

## Closure

Status Note: §6.1 登记的唯一内核语义缺口已闭合：replaceUndoTop/recordCoalesced/replaceTop/coalesceGroup/DEFAULT_COALESCE_WINDOW_MS 全部落地，failing-first（12 新用例先红后绿），既有契约零变化（test 文件 append-only），owner doc 同步；独立 closure audit approved（0B/0M/2m），2 Minor 中空字符串 group 判定已当场对齐 industrial truthiness 语义。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_7088f646-1076-4bba-8bc6-0f1b56d66840）
- Evidence: VERDICT: approved——逐行核对 replaceUndoTop（undo-stack.ts:66-73）对齐 industrial U6 语义、recordCoalesced 全字段传播与 ≤windowMs 边界、replaceTop 原语；独立复跑 editor-core 33/33 + 全仓 typecheck/build/lint/test/check 全绿；git diff --numstat 证实 test 文件 146 增 0 删。

Follow-up:

- P1.1 SCADA 迁移 plan 落地 M2 域侧合并（side-track 设计注记已录入 editor-core.md §6.1）；no remaining plan-owned work。
