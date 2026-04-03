# 领域运行时与调试器重构计划

> Plan Status: completed
> Last Reviewed: 2026-04-03
> Source: 2026-04-03 repository refactor review as a focused follow-up to domain-package maintainability work left after `docs/plans/23-architecture-audit-fix-plan.md` and the now-completed repo-wide audit `docs/plans/27-comprehensive-code-remediation-plan.md`.

## 第一步：理解项目

### 主要目录与模块职责

- `packages/flux-*`: 低代码核心链路，负责 schema 编译、runtime、React 集成和基础 renderer；这部分已有 plan #23 和 #27 跟踪或执行过。
- `packages/spreadsheet-core`: 纯表格 runtime，负责文档模型、命令分发、撤销重做、剪贴板、查找替换和单元格变更。
- `packages/flow-designer-core`: 纯图运行时，负责 graph document、约束校验、selection、history、viewport、clipboard 和 transaction。
- `packages/report-designer-core`: 在 spreadsheet 之上叠加报表设计语义，负责 metadata、field source、inspector、preview 和 codec 适配。
- `packages/nop-debugger`: 浮动调试器面板，负责事件聚合、拖拽/缩放、JSON 查看、节点检查和调试 UI。
- `packages/word-editor-*`: 新领域包，已有单独的功能型执行计划 `docs/plans/24-word-editor-development-plan.md`。
- `apps/playground`: 所有领域能力的集成入口和回归验证面。

### 当前代码组织存在的核心问题

- 领域包里仍有多个超大文件把 store、纯函数、命令分发、React UI、样式和交互钩子混在一起，已经超过“单文件单职责”的可维护阈值。
- repo-wide 审计已经发现并部分记录了领域包问题，但这些问题大多停留在审计或补丁修复层，没有形成本轮可执行的专项结构重构计划。
- 一些文件内部已经出现明显的模板重复：同类 `applyXxx` 文档变更函数、同类 `pushUndo -> setState` 命令处理、同类 tab 渲染分支和拖拽/inspect hook，适合做结构性收口，但不需要改动业务逻辑。

### 最值得优先处理的 8 个重构点

1. `packages/spreadsheet-core/src/core.ts:48-1705`：拆分文档变更函数、查找替换、剪贴板、sheet 操作和命令分发。
2. `packages/spreadsheet-core/src/core.ts:1175-1658`：仅收口简单的 document mutation case，避免把带 selection/clipboard/transaction 副作用的 case 过度抽象。
3. `packages/flow-designer-core/src/core.ts:77-1060`：拆分 document clone/constraint validation/history/selection/transaction，降低 graph runtime 入口文件复杂度。
4. `packages/flow-designer-core/src/core.ts:386-1013`：提取节点边操作与 selection/history/viewport/transaction 辅助逻辑，保持 `createDesignerCore()` 为 orchestrator。
5. `packages/report-designer-core/src/core.ts:108-257`：提取 metadata 读写与 merge 逻辑，避免 core 文件同时承担文档仓储职责。
6. `packages/report-designer-core/src/core.ts:344-457`：提取 adapter context、field source 加载和 inspector panel 解析逻辑，减少 runtime store 与适配器选择耦合。
7. `packages/nop-debugger/src/panel.tsx:38-615`：提取巨型样式字符串和 JSON/event 辅助视图，避免单文件承载样式协议与交互逻辑。
8. `packages/nop-debugger/src/panel.tsx:846-1856`：提取 drag/resize/inspect hooks 与 tab 组件，保留 `panel.tsx` 作为薄壳。

## Problem

当前最明确、ROI 最高的重构候选集中在 4 个领域文件：

- `packages/spreadsheet-core/src/core.ts:48-1705` 当前为 1705 行。文件同时包含 snapshot 构建、cell/sheet 文档变更、剪贴板、查找替换、批量填充、评论操作以及 `dispatch()` 的超长 `switch`。这会让任何一个新命令都必须穿过整份文件，review 和回归成本都很高。
- `packages/flow-designer-core/src/core.ts:77-1060` 当前为 1060 行。文件同时承担 config normalize、document clone、约束校验、selection、history、viewport、clipboard、transaction 和 graph CRUD，已经偏离架构文档中“graph core 是清晰领域 runtime”的目标边界。
- `packages/report-designer-core/src/core.ts:108-828` 当前为 828 行。metadata 仓储、adapter context 构建、field source 加载、inspector panel 解析和 Zustand store orchestration 都聚合在一个文件里，边界不清。
- `packages/nop-debugger/src/panel.tsx:38-1856` 当前为 1856 行。一个文件里同时放了 CSS 字符串、JSON viewer、事件聚合、拖拽/缩放 hooks、inspect overlay 和 4 个 tab 的 UI 分支，已经明显超出可独立理解的范围。

这些问题都属于典型的“增量开发无提取”而不是业务设计错误，因此适合用不改行为的结构性拆分解决。

## Root Cause

- 近几轮工作优先处理了 React 19 snapshot 稳定性、构建问题和 correctness bug，先保证能跑，再逐步补结构整理。
- `docs/plans/27-comprehensive-code-remediation-plan.md` 已完成 repo-wide audit 和 correctness/perf 修复，但其遗留项更多是问题归档，不是这几个领域包的结构拆分执行方案。
- 这些领域文件都处在“自然的总入口”位置，后续功能持续追加时没有及时提取纯函数和子模块，最终把 orchestration、数据变换和 UI 细节都堆进同一个文件。

## 第二步：制定方案

### 拟调整的模块结构

#### A. `@nop-chaos/spreadsheet-core`

目标：把 `core.ts` 还原成 runtime orchestrator，纯文档变更和命令辅助逻辑迁移到 `core/` 子目录。

建议结构：

```text
packages/spreadsheet-core/src/
├── core.ts
└── core/
    ├── snapshot.ts
    ├── document-access.ts
    ├── cell-operations.ts
    ├── sheet-operations.ts
    ├── clipboard-operations.ts
    ├── search-operations.ts
    └── mutation-helpers.ts
```

- `snapshot.ts`: `buildSnapshot`、内部 state 辅助。
- `document-access.ts`: `ensureSheetCells`、`getCell`、`setCell`、`updateCellStyle`。
- `cell-operations.ts`: `applySetCellValue`、`applySetCellFormula`、样式/批量填充/评论相关函数。
- `sheet-operations.ts`: add/remove/move/rename/hide/protect/freeze/insert/delete row/column。
- `clipboard-operations.ts`: copy/cut/paste/clear。
- `search-operations.ts`: find/replace/replaceAll。
- `mutation-helpers.ts`: 只为简单的 document-only mutation case 提供小型辅助函数，例如“push undo + replace document + dirty”。涉及 `activeSheetId`、`selection`、`clipboard`、transaction 的 case 保持显式。

不改变逻辑的原因：`SpreadsheetCore` 接口、`createSpreadsheetCore()` 入口、命令类型和状态结构全部保持不变，只移动实现位置并提取简单重复模板，不对复杂状态迁移做泛化抽象。

#### B. `@nop-chaos/flow-designer-core`

目标：让 `core.ts` 回到 graph runtime orchestrator 角色，把纯辅助逻辑和大块状态子域拆到 `core/` 子目录，符合 `docs/architecture/flow-designer/design.md` 与 `docs/architecture/flow-designer/collaboration.md` 对 core 边界的描述。

建议结构：

```text
packages/flow-designer-core/src/
├── core.ts
└── core/
    ├── clone.ts
    ├── config.ts
    ├── constraints.ts
    ├── selection.ts
    ├── history.ts
    ├── viewport.ts
    ├── node-operations.ts
    ├── edge-operations.ts
    └── transactions.ts
```

- `clone.ts`: `cloneNode`、`cloneEdge`、`cloneDocument`。
- `config.ts`: `normalizeConfig`。
- `constraints.ts`: node/edge 计数、连接校验、实例数限制。
- `selection.ts`: selection summary 与 selection mutation 辅助。
- `history.ts`: history push、undo/redo 状态辅助。
- `viewport.ts`: viewport normalize/clamp/compare。
- `node-operations.ts` / `edge-operations.ts`: 纯文档级 node/edge 变更辅助，不直接持有外部状态。
- `transactions.ts`: begin/commit/rollback 所需的纯辅助逻辑和数据结构收口。

不改变逻辑的原因：`DesignerCore` 对外方法、事件类型、配置契约和 source-of-truth 位置都不变；只把内部算法和子域逻辑从单文件中抽离。

#### C. `@nop-chaos/report-designer-core`

目标：把 `core.ts` 中的 metadata 仓储、adapter 解析和 derived-state 刷新拆开，保留 `createReportDesignerCore()` 为唯一公开入口。

建议结构：

```text
packages/report-designer-core/src/
├── core.ts
└── runtime/
    ├── metadata.ts
    ├── adapter-context.ts
    ├── field-sources.ts
    ├── inspector-panels.ts
    ├── preview-commands.ts
    └── codec-commands.ts
```

- `metadata.ts`: `getMetaContainer`、`writeMetadata`、`mergeMetadata`、metadata normalize/compare。
- `adapter-context.ts`: `cloneDocument`、`cloneMetadataBag`、`createAdapterContext`。
- `field-sources.ts`: `loadFieldSources`、field source snapshot cloning。
- `inspector-panels.ts`: provider grouping、panel 解析、dedupe/sort。
- `preview-commands.ts`: preview adapter lookup 与调用辅助。
- `codec-commands.ts`: import/export codec lookup 与调用辅助。

不改变逻辑的原因：对外仍暴露同一个 `ReportDesignerCore` API；adapter registry、command union、snapshot 结构和 profile/config 输入都不变。`refreshDerivedState()` 仍保留在 `core.ts` 作为 store orchestration，只提取纯函数和可独立测试的 adapter helpers，避免制造新的“伪 orchestrator 模块”。

#### D. `@nop-chaos/nop-debugger`

目标：把 `panel.tsx` 从“单文件应用”改成“壳组件 + 子模块”。

建议结构：

```text
packages/nop-debugger/src/
├── panel.tsx
└── panel/
    ├── styles.ts
    ├── json-viewer.tsx
    ├── event-groups.ts
    ├── use-draggable-position.ts
    ├── use-launcher-drag.ts
    ├── use-resizable-panel.ts
    ├── use-inspect-mode.ts
    ├── OverviewTab.tsx
    ├── TimelineTab.tsx
    ├── NetworkTab.tsx
    └── NodeTab.tsx
```

- `styles.ts`: `DEBUGGER_STYLE_ID`、`DEBUGGER_STYLES`、`useInjectDebuggerStyles`。
- `json-viewer.tsx`: `JsonViewer` / `JsonNode`。
- `event-groups.ts`: `mergeNetworkRequests`、`groupErrors`、`formatTraceSummary`。
- `use-*.ts`: drag / resize / inspect 交互 hook。
- `*Tab.tsx`: 4 个 tab 的 JSX 分支拆分，`panel.tsx` 只保留状态组合和 tab 切换。

不改变逻辑的原因：controller 接口、类名、数据流和 tab 行为不变，主要是把已存在的局部逻辑显式化，方便单测和局部修改。

### 不纳入本次计划的范围

- `packages/flux-*` 主链路：已有 `docs/plans/23-architecture-audit-fix-plan.md` 和 `docs/plans/27-comprehensive-code-remediation-plan.md`，避免重复立项。
- `packages/word-editor-*`：已有 `docs/plans/24-word-editor-development-plan.md` 作为主执行计划。当前 `WordEditorPage.tsx:17-220` 体量尚可，优先级低于上面三个热点。
- 任何业务规则修正或新功能开发，例如 spreadsheet 命令语义调整、debugger 新能力扩展、report designer adapter 契约变化。

### 与现有计划的关系

- 与 `docs/plans/23-architecture-audit-fix-plan.md` 的关系：#23 主要记录 core/runtime 主链路问题，并把领域包审计列为后续专项工作；本计划承接其中的领域包结构债务。
- 与 `docs/plans/27-comprehensive-code-remediation-plan.md` 的关系：#27 已完成 correctness/performance/remediation 工作，并明确剩余更适合拆成单独 follow-up 的结构性 refactor。本计划就是这些 follow-up 之一，不重复做 repo-wide audit。
- 与 `docs/plans/24-word-editor-development-plan.md` 的关系：word editor 当前仍以功能落地为主，本计划不把其开发计划改写成重构计划。

### 调整顺序与依赖关系

**Step 1 — Spreadsheet Core 拆分**

- 先提取纯文档辅助函数和操作模块，再只收口简单的 document-only mutation 模板。
- 这是最大的热点文件，且对其他领域包有示范价值。

**Step 2 — Flow Designer Core 拆分**

- 先提取 clone/config/constraint/selection/history/viewport 这些纯辅助子域，再处理 node/edge/transaction 辅助。
- 保持 `createDesignerCore()` 为唯一 runtime 入口，避免破坏 `flow-designer-renderers` 当前的 bridge 契约。

**Step 3 — Report Designer Core 拆分**

- 在 spreadsheet 和 flow-designer 两个 runtime 模式稳定后，拆 metadata 与 adapter helper。
- 保留 `refreshDerivedState()` 在 `core.ts`，优先拆纯函数和 preview/codec adapter 辅助，避免抽出新的高耦合 orchestrator 文件。

**Step 4 — Debugger Panel 拆分**

- 最后处理 UI 文件，优先抽离无状态模块（styles、viewer、event groups），再拆 hooks 和 tabs。
- 避免一开始就在单个 1800+ 行 React 文件里同时动视图和交互状态。

### 风险点与验证方式

- 风险 1：`spreadsheet-core` 的命令提交流程顺序被意外改动，导致 undo/dirty/selection 行为漂移。
- 风险 2：`flow-designer-core` 的 history、selection 或 transaction 语义被拆分时打乱，导致 command adapter 与 renderer bridge 回归。
- 风险 3：`report-designer-core` 的 snapshot identity 被破坏，重新触发 React 19 外部 store 循环问题。
- 风险 4：`nop-debugger` 的 DOM 结构或类名被无意改动，导致现有测试和 UI 样式漂移。
- 风险 5：workspace 级 `typecheck` / `build` 可能继续受既有 unrelated 问题阻塞，不能把它们误判为本计划自身失败。

验证方式：

- 每一步先跑包级验证，再跑全仓验证。
- 重点包级验证：
  - `pnpm --filter @nop-chaos/spreadsheet-core typecheck`
  - `pnpm --filter @nop-chaos/spreadsheet-core build`
  - `pnpm --filter @nop-chaos/spreadsheet-core lint`
  - `pnpm --filter @nop-chaos/spreadsheet-core test`
  - `pnpm --filter @nop-chaos/flow-designer-core typecheck`
  - `pnpm --filter @nop-chaos/flow-designer-core build`
  - `pnpm --filter @nop-chaos/flow-designer-core lint`
  - `pnpm --filter @nop-chaos/flow-designer-core test`
  - `pnpm --filter @nop-chaos/report-designer-core typecheck`
  - `pnpm --filter @nop-chaos/report-designer-core build`
  - `pnpm --filter @nop-chaos/report-designer-core lint`
  - `pnpm --filter @nop-chaos/report-designer-core test`
  - `pnpm --filter @nop-chaos/nop-debugger typecheck`
  - `pnpm --filter @nop-chaos/nop-debugger build`
  - `pnpm --filter @nop-chaos/nop-debugger lint`
  - `pnpm --filter @nop-chaos/nop-debugger test`
- 最终全仓验证：`pnpm typecheck && pnpm build && pnpm lint && pnpm test`
- 若 workspace 级 `typecheck` / `build` 仍被 `packages/ui`、`packages/word-editor-core` 等既有问题阻塞，需要在执行记录中单独注明，不把 unrelated blocker 记为本计划回归。

## Scope

- `packages/spreadsheet-core/src/core.ts`
- `packages/spreadsheet-core/src/core/*.ts`
- `packages/flow-designer-core/src/core.ts`
- `packages/flow-designer-core/src/core/*.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/runtime/*.ts`
- `packages/nop-debugger/src/panel.tsx`
- `packages/nop-debugger/src/panel/*.ts(x)`
- 文档记录：`docs/logs/2026/04-03.md`

## Effort

- 预计 5-7 天。
- 建议拆成 4 个独立提交或 PR：spreadsheet core、flow-designer core、report-designer core、nop-debugger panel。

## Verification

- 包级：见上方分包 `typecheck` / `build` / `lint` / `test`。
- 全仓：`pnpm typecheck && pnpm build && pnpm lint && pnpm test`
- 若全仓验证命中已知 unrelated blocker，记录阻塞路径并保留分包验证结果作为本计划验收主依据。

## 变动文件清单

| File | Change | Lines affected |
|------|--------|---------------|
| `packages/spreadsheet-core/src/core.ts` | 缩减为 orchestrator，移除纯函数和简单 mutation 模板重复 | ~1200-1400 |
| `packages/spreadsheet-core/src/core/*.ts` | 新增 cell/sheet/search/clipboard/snapshot 辅助模块 | ~1200 |
| `packages/flow-designer-core/src/core.ts` | 缩减为 graph runtime orchestrator | ~650-800 |
| `packages/flow-designer-core/src/core/*.ts` | 新增 clone/config/constraints/selection/history/transactions 辅助模块 | ~500-800 |
| `packages/report-designer-core/src/core.ts` | 缩减为 public runtime orchestrator | ~500-650 |
| `packages/report-designer-core/src/runtime/*.ts` | 新增 metadata、adapter-context、field-sources、inspector、preview/codec helper 模块 | ~450-650 |
| `packages/nop-debugger/src/panel.tsx` | 缩减为壳组件和状态组装层 | ~1200-1500 |
| `packages/nop-debugger/src/panel/*.ts(x)` | 新增 styles、viewer、hooks、tab 子模块 | ~1200-1500 |
| `docs/logs/2026/04-03.md` | 记录本计划的评估结论 | ~6 |

## 风险与回退

- 实施时遵循“先创建新文件，再替换调用方”的方式，不在同一步同时重写旧文件和新增模块。
- 对 `packages/spreadsheet-core/src/core.ts`、`packages/flow-designer-core/src/core.ts` 和 `packages/nop-debugger/src/panel.tsx` 这类 900+ 行文件，实施阶段建议采用 `.bak` 方法，保留原文件作为短期回退参照。
- 如果包级验证通过但全仓验证暴露 unrelated failure，不在本计划里顺手修 unrelated 问题，只记录阻塞项并单独建后续计划。
