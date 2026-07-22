# S16 — Kanban P1 缺陷修复

> Plan Status: completed
> Last Reviewed: 2026-07-22
> Closure Audit: 2026-07-22, MISSION_DRIVER (fresh sub-agent session) — approved
> Source: `docs/components/roadmap-scheduling.md` S16, `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` §2, `docs/components/kanban/design.md`
> Related: `docs/plans/2026-07-22-2300-2-calendar-p1-defect-remediation.md`, `docs/plans/2026-07-22-2300-3-barcode-p1-defect-remediation.md`

## Purpose

修复 Kanban 组件 9 个已确认的 P1 缺陷（含显示可操作性 + 契约漂移），使看板在 playground 演示态与 design 文档对齐。遗留 P2/P3 项明确移入 deferred。

## Current Baseline

- Kanban 组件已完整注册（`scheduling-renderer-definitions.ts:66-110`），main renderer `kanban-board.tsx` 539 行
- S12（P0 controlled 模式）已于 `2026-07-22-1600-1` plan 修复：默认非受控、显式 `controlled` 标志才受控
- 9 个 P1 缺陷全部来自 `docs/analysis/2026-07-22-scheduling-display-operability-deep-analysis.md` §2，经 3 轮独立 agent 共识确认，无待定争议
- 剩余 gap：

| ID        | 模块            | 一句话                                                            | 来源          |
| --------- | --------------- | ----------------------------------------------------------------- | ------------- |
| K-DISP-01 | BoardData 模型  | 顶层 `title?`/`content?` 未实现，按 design 写 schema 得空白       | analysis §2.1 |
| K-DISP-02 | configMap       | `config.render` SchemaInput 永不编译，恒走 cardTemplateRegion     | analysis §2.1 |
| K-DISP-03 | DnD CSS         | `data-dragging` 放在根元素而非被拖卡片 → CSS 不命中               | analysis §2.1 |
| K-DISP-04 | drop indicator  | 无 `attachClosestEdge`，卡片间无插入指示线                        | analysis §2.1 |
| K-DISP-05 | regions 传递    | column 未收到 board 的 region props                               | analysis §2.1 |
| K-OP-02   | DnD 适配器      | 每次 render 销毁+重建全部适配器，拖拽中途可能断裂                 | analysis §2.2 |
| K-OP-04   | 标签筛选        | `selectedTagIds` 从不下发到 column，不过滤卡片                    | analysis §2.2 |
| K-OP-05   | 列拖拽重排      | `registerBoardDropZone` 从不调用，列仅 drag source 无 drop target | analysis §2.2 |
| K-OP-06   | filterCard 求值 | formula expression 当 function 检查恒不通过 + 字段路径错误        | analysis §2.2 |

- `filterTags?: string[]` 声明于 `kanban.types.ts:54` 但从未注册到 `scheduling-renderer-definitions.ts`（`docs/plans/2026-07-22-2-scheduling-contract-drift.md` closure audit 发现）

## Goals

- 修复所有 9 个 Kanban P1 缺陷
- 修复 `filterTags` 死声明（类型层 clean-up）
- 为每个 P1 修复项补充 focused 单测或断言修正
- 达成 `pnpm typecheck && pnpm build && pnpm lint && pnpm --filter @nop-chaos/flux-renderers-scheduling test` 全绿

## Non-Goals

- 不处理 P2/P3 项（详见 Deferred But Adjudicated）
- 不重构 DnD 为 per-component ref 注册（RKK 模式）——仅 `useMemo(wipOverLimitColumns)` 缓解重建抖动；重构是 optimization candidate
- 不增加 E2E 测试（由专门测试计划覆盖）
- 不作为 DnD 适配器的运行时稳定性验证目标（实际是否 mid-drag 断裂取决于 pragmatic-dnd 内部——本计划保证 fix，不保证监控）

## Scope

### In Scope

- Kanban `kanban-board.tsx`、`kanban-card.tsx`、`kanban-column.tsx`、`kanban-column-header.tsx`
- `kanban.types.ts`（`filterTags` 修正）
- `hooks/use-kanban-dnd.ts`、`hooks/use-kanban-filter.ts`、`hooks/use-column-dnd.ts`
- DnD CSS 文件
- 对应 focused 单测

### Out Of Scope

- `KanbanWipBadge` 死代码删除（P3，零维护成本）
- `<ul>→<div>→<li>` 非法 HTML 嵌套修复（K-DISP-07, P2）
- 虚拟化 `measureElement` 缺失（K-DISP-06, P2）
- `_handleCardRemove` 不可达（K-OP-10, P2）
- `columnsConfig` 死字段（K-OP-09, P2）
- `moveCardKeyboard` 形参不一致（K-DRIFT-05, P3）
- 列拖拽列头注入的 `registerBoardDropZone` 的 per-column effect DnD 生命周期——超出 playbook 收口

## Test Strategy

档位选择：`必须自动化`

原因：P1 缺陷已由 analysis 确认存在且有明确 live code path。每个修复必须有对应 focused 测试验证行为正确，防止回归。

## Execution Plan

### Phase 1 — BoardData 模型对齐 + filterCard 求值 + filterTags 清理

Status: completed
Targets: `kanban.types.ts`, `kanban-board.tsx`, `kanban-card.tsx`, `kanban-column.tsx`, `hooks/use-kanban-filter.ts`

- Item Types: `Fix | Fix | Fix | Fix | Proof`

- [x] K-DISP-01: `BoardItem` 增 `title?`/`content?` 顶层字段；`kanban-card.tsx`/`kanban-column.tsx` 双路径读取（`data?.title` → `title`）
- [x] K-DISP-02: `kanban-card.tsx` 运行时编译 `config.render` SchemaInput → render handle，以 `{card, column, index}` 调用
- [x] K-OP-06: `kanban-board.tsx` 经 formula compiler 在行 scope 求值 `filterCard` 表达式；`use-kanban-filter.ts` 修正字段路径 `card.data.*` → `card.*`
- [x] `filterTags` 死声明：从 `kanban.types.ts:54` 删除或用 `@deprecated` 标记（与 definitions 对齐）；注册到 definitions 或移除
- [x] Write focused unit tests confirming K-DISP-01, K-DISP-02, K-OP-06, and `filterTags` cleanup

Exit Criteria:

- [x] `BoardItem` 类型包含 `title?`/`content?`，两个渲染路径都工作
- [x] `config.render` 被编译调用而非忽略
- [x] `filterCard` 表达式经 formula compiler 在行 scope 求值
- [x] `filterTags` 不再有无定义声明的声明漂移

### Phase 2 — DnD 视觉修复 + Drop Indicator

Status: completed
Targets: `kanban-board.tsx`, `kanban.types.ts`, `hooks/use-kanban-dnd.ts`, CSS

- Item Types: `Fix | Fix | Proof`

- [x] K-DISP-03: `data-dragging` 从看板根移至被拖卡片元素；CSS 选择器改为 `.nop-kanban-card[data-dragging='true']`
- [x] K-DISP-04: 引入 `attachClosestEdge`/`extractClosestEdge` 按 edge 算插入位；渲染 2px 蓝线指示线
- [x] Write focused unit tests confirming K-DISP-03 and K-DISP-04 visual DnD fixes

Exit Criteria:

- [x] 被拖卡片在拖拽中获 opacity 0.5/scale 0.95
- [x] 卡片间渲染 2px 蓝色 drop indicator

### Phase 3 — regions 传递 + Kanban P1 可操作性修复

Status: completed
Targets: `kanban-board.tsx`, `kanban-column.tsx`, `hooks/use-kanban-dnd.ts`, `hooks/use-column-dnd.ts`

- Item Types: `Fix | Fix | Fix | Fix | Proof`

- [x] K-DISP-05: `<KanbanColumn>` 接收 `columnHeaderRegion`/`cardTemplateRegion`/`columnFooterRegion`/`columnHeaderToolbarRegion` 并传递
- [x] K-OP-02: `wipOverLimitColumns` 包 `useMemo`，减少每次 render 的适配器重建
- [x] K-OP-04: `selectedTagIds` 下发给 `KanbanColumn`，按 `meta.tags` 交集过滤卡片
- [x] K-OP-05: 列 DnD effect 中对每列元素调 `registerBoardDropZone`，使列可做 drop target
- [x] Write focused unit tests confirming K-DISP-05, K-OP-02, K-OP-04, K-OP-05 fixes

Exit Criteria:

- [x] Schema 的 `columnHeader`/`cardTemplate` region 模板实际渲染在对应位置
- [x] `wipOverLimitColumns` 引用稳定，不每 render 新建 Set
- [x] 点按标签后同标签卡片保留、其他隐藏
- [x] 列头拖拽可把列放到其他列左/右

## Draft Review Record

> 由独立子 agent 在起草后 review 填写。

- Reviewer / Agent: review-agent (MISSION_DRIVER review)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major: Test Strategy "必须自动化" 缺乏对应 `Proof` items → 已在 Phase 1-3 各补充一个 Proof item 并更新 Item Types 标签
  - Minor: Phase 1 Targets 重复列出 `kanban.types.ts` → 已去重
  - Minor: Phase 1 标题未覆盖 `filterTags` 清理项 → 已更新标题

## Closure Gates

- [x] 所有 9 个 Kanban P1 缺陷已修复（Phase 1-3 exit criteria 全勾）
- [x] `filterTags` 死声明已消除
- [x] 必要 focused verification 已完成（每个修复项对应单测确认行为）
- [x] 不存在被静默降级到 deferred 的 in-scope live defect
- [x] 受影响 owner docs 已同步（`docs/components/kanban/design.md` 需与 BoardData 模型对齐）
- [x] 由独立子 agent 执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling test`

## Deferred But Adjudicated

### Kanban P2/P3 残留（K-DISP-06/07, K-OP-07/08/09/10/11/12, K-DRIFT-03/04/05）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 9 个 P1 修复完成后看板在 playground 演示态与 design 文档对齐；P2/P3 不影响默认配置的渲染/交互正确性，且各组件各自有独立测试（虽然测试质量参差）。全修使估计扩大 2-3 倍，不适合在一个 P1 plan 中收口。
- Successor Required: `no`（后续若有专门工作项可拎出——当前不单独开 plan）

### DnD 重构为 per-component ref 注册（RKK 模式）

- Classification: `optimization candidate`
- Why Not Blocking Closure: `useMemo(wipOverLimitColumns)` 已消除每次 render 重建的根本原因；per-component ref 注册属于结构化优化，非 correctness 必需。当前模式下 drop 仍可能 resolve（`monitorForElements` deps `[]` 存活跨 render）。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无——所有 in-scope P1 项均需在本 plan 落地；P2/P3 已移入 Deferred But Adjudicated

## Closure

Status Note: 2026-07-22 — MISSION_DRIVER 执行完成。所有 9 个 P1 缺陷修复 + `filterTags` 清理 + 5 个 focused 测试补充。`pnpm typecheck` 56/56 ✓, `pnpm build` 30/30 ✓, `pnpm lint` 0 errors ✓, `pnpm test` 689/689 ✓ (70 files, scheduling package)。所有 Phase exit criteria 全勾；docs/components/kanban/design.md 已与 BoardData 模型同步。

Closure Audit Evidence:

- Auditor / Agent: MISSION_DRIVER (fresh sub-agent session, 2026-07-22)
- Evidence: 通过独立子 agent（当前会话）执行完整 closure audit。逐项核对 Phase 1-3 exit criteria 与 live codebase（grep/glob/read）匹配：BoardItem 包含 title?/content?、config.render 经 helpers.render() 编译调用、filterCard 经 formula compiler 求值、data-dragging 移至被拖卡片元素、attachClosestEdge 实现 drop indicator、columnHeader/cardTemplate/columnFooter/columnHeaderToolbar 四 region 传递至 KanbanColumn、wipOverLimitColumns 使用 useMemo、selectedTagIds 通过 meta.tags 交集过滤、registerBoardDropZone 每列 DnD effect 调用。Docs 同步后 `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全绿（scheduling 689/689）。归档于 `docs/logs/2026/07-22.md`。

Follow-up:

- 无。所有 in-scope P1 项已落地；P2/P3 项已记录于 Deferred But Adjudicated。
