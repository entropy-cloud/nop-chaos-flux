# Scheduling + AI 测试缺口修复

> Plan Status: active
> Last Reviewed: 2026-07-28
> Source: `docs/audits/arm-index.md`, `docs/bugs/71-scheduling-deep-audit-blind-spot-display-operability-test-effectiveness.md`, live audit 2026-07-28
> Related: `docs/backlog/audit-remediation-roadmap.md`

## Purpose

将 Scheduling + AI + Compiler + Runtime 四个包的测试缺口修复到 baseline-ready 状态：覆盖 Gantt store-wiring 集成和真实交互测试、清理 dead code with tests、强化三个包的弱断言模式。

## Current Baseline

- Scheduling 包 70 test files, 816 tests, 全绿
- AI 包 59 test files, 474 tests, 全绿
- Audit 文档声称 "no test renders a full Gantt/Kanban/Calendar and asserts DOM output" 不准确 — 实际 `gantt.test.tsx`/`gantt.integration.test.tsx`、`kanban.integration.test.tsx`、`calendar.integration.test.tsx` 均渲染完整组件并断言 DOM 结构
- Gantt 测试中 `gantt.test.tsx` 将所有 4 个交互 hook（`useGanttDrag`、`useGanttLinkDraw`、`useGanttScroll`、`useGanttKeyboard`）全部 mock 掉，真实交互路径零测试覆盖
- `gantt.integration.test.tsx` 只 mock 了 `useGanttScroll`，保留 drag/link/keyboard 真实 hook，但从不触发任何用户事件 — 仍然是只测渲染不测交互
- Kanban DnD integration 测试存在（`kanban-dnd-integration.test.tsx` 用 `fireEvent.keyDown` 测试键盘列重排），但之前版本存在 silent no-op（SCHED-F73 已修复）
- Calendar 集成测试（`calendar.integration.test.tsx`）只 mock 了 `@nop-chaos/flux-react` 的三个 runtime hook，保留了全部内部 hook，支持真实事件
- 没有测试验证 `gantt.tsx:33-49` 的 `createInitialStore` 能正确将 props（zoomLevels, cellWidth 等）传递到 store — P0 zoomLevels 回归无保护
- `calendar-layout-utils.test.ts` 的 assert-the-bug 模式（bug-71 记载的 `expect(width).toBe(25)`）已修复，现在正确断言 `width === 100`
- Dead code with tests: `BaselineBars`、`useKanbanAdder`、`useKanbanCollab`、`getMonthDays`、`CalendarBatchScheduler`、`CalendarTimezoneSelector` 有测试但无生产消费者
- AI 包有专用回归测试验证 P1 修复（`use-conversation-delete-during-abort.test.ts`），集成测试使用 real engine + real renderer，无 bug-71 盲区
- Gantt 的 config props（zoomLevels, cellWidth, taskBarHeight, defaultZoom, rowHeight）通过 `gantt.tsx:33-49` 的 `createInitialStore` 传入 store，但这条通路没有回归测试保护 — P0 zoomLevels 类型问题可能复发
- Compiler 包 `schema-compiler-prop-coverage-*.test.ts` 有 ~17 个测试用例的唯一断言是 `expect(...).toBeDefined()` — 不检查编译产物的内容/类型，属于 Assert-the-Bug 弱断言模式
- Runtime 包 `validators-edge-cases.test.ts` 有 ~12 个测试用例的唯一断言是 `expect(validate(...)).toBeDefined()` — 不检查返回的 error 的 `rule`/`path`/`message`
- 上述两个包的弱断言模式与 Scheduling P0 的 "assert-the-bug" 根因相同：测试存在且全绿，但不验证正确行为

## Goals

- Scheduling 包 Gantt 组件的 store-wiring 集成回归测试（含 config props）
- Scheduling 包 Gantt 组件的真实交互（drag/keyboard）integration 测试
- 清理 dead code with tests，消除 test count inflation
- AI 包弱断言强化
- Compiler 包 `prop-coverage` 测试弱断言强化（`.toBeDefined()` → 具体行为断言）
- Runtime 包 validators 测试弱断言强化
- 全量验证通过

## Non-Goals

- 不覆盖 Scheduling 包的 Barcode/ResourceLoad 等子组件测试（scope 聚焦 Gantt 交互）
- 不改变 Scheduling/AI/compiler/runtime 包的代码逻辑 — 纯测试变更
- 不涉及 e2e 测试（playground 级集成属于后续计划）
- 不做 bundle size 分析

## Scope

### In Scope

1. Gantt `createInitialStore` integration proof — 验证 props→store 完整通路（含 zoomLevels/cellWidth 等 config props）
2. Gantt 真实交互 integration test — 不 mock 交互 hook，用 `fireEvent` 测试 drag/keyboard
3. Scheduling dead code with tests — 移除未使用的组件/文件及其测试
4. AI 包弱断言（`.not.toBeNull()` / tag name only）强化
5. Compiler 包 `schema-compiler-prop-coverage-*.test.ts` 弱断言（`.toBeDefined()` 唯一断言）强化
6. Runtime 包 `validators-edge-cases.test.ts` 弱断言（`.toBeDefined()` 唯一断言）强化
7. 全量 `pnpm typecheck + build + test` 验证

### Out Of Scope

- Scheduling 包的代码重构（非测试逻辑变更）
- E2E 测试编写
- Coverage threshold 调整
- 并发 fuzz 测试
- 其他包的 `toBeDefined()` 扫描（已有 Guard 脚本 `check:audit-test-global-leaks` 监控）

## Test Strategy

Scheduling Gantt integration proof（Phase 1）：`必须自动化`。这是对 P0 回归的直接保护。
Scheduling Gantt interaction test（Phase 2）：`必须自动化`。关键交互路径的 focused 测试。
Dead code cleanup（Phase 3）：`建议有测`。清理后确认剩余测试仍全绿。
AI weak assertion fix（Phase 4）：`必须自动化`。与 Scheduling P0 同根因（assert-the-bug）。
Compiler weak assertion fix（Phase 5）：`必须自动化`。与 AI Phase 4 同根因。
Runtime weak assertion fix（Phase 6）：`必须自动化`。与 AI Phase 4 同根因。

## Execution Plan

### Phase 1 — Gantt store-wiring integration proof

Status: planned
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-store-proof.test.ts` (追加)

- Item Types: `Proof`

- [ ] 当前 `gantt-store-proof.test.ts` 的 store 级 proof 已覆盖 setZoom/getAvailableZooms/布局坐标，但所有测试都通过 `new GanttStore({...})` 直接构造，不经过 `createInitialStore`（`gantt.tsx:33-49`）。追加 proof: 构造 `resolved` props（含 zoomLevels/cellWidth/defaultZoom），手动调用 `createInitialStore(resolved)`，验证 store 的初始状态与 props 一致。
- [ ] Proof: `createInitialStore` 在不传 `zoomLevels` 时正确使用默认值回退
- [ ] Proof: `createInitialStore` 传空 `tasks`/`links` 时 store 初始状态正确（0 tasks, 0 links, revision 0）

Exit Criteria:

- [ ] 新增 proof 通过：验证 `zoomLevels` 从 resolved props 正确传递到 store
- [ ] 新增 proof 通过：验证默认值回退行为
- [ ] 现有 816 tests 不受影响，仍全绿

### Phase 2 — Gantt 真实交互 integration test

Status: planned
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-interactions.test.tsx` (追加)

- Item Types: `Proof`

当前 `gantt-interactions.test.tsx` (168 行) 只测 store 级的 interaction primitives（`new GanttStore()` + `store.updateTask()` 等），不涉及真实 DOM 事件。`gantt.integration.test.tsx` 渲染完整组件但不触发事件。

追加 integration 测试，使用真实 `<Gantt>` 组件（不 mock 交互 hook），通过 `@testing-library/react` 的 `fireEvent` 触发：

- [ ] keyboard arrow keys: 渲染带任务树的 Gantt，用 `fireEvent.keyDown` 模拟箭头键展开/折叠树
- [ ] keyboard Enter: 聚焦任务后按 Enter 打开编辑器
- [ ] grid cell rendering: 对含嵌套任务的结构断言 `data-slot="gantt-grid-row"` 数量和 `aria-expanded` 状态（现有测试已通过 mock 覆盖此路径，需要 real-hook 版确认）

注：`gantt.integration.test.tsx` 当前 mock 了 `useGanttScroll`。如果 `useGanttScroll` 的 mock 移除后导致测试不稳定（scrollRef 初始化问题），保留 mock 但确保 drag/link/keyboard hook 不被 mock。

Exit Criteria:

- [ ] 新增 real-hook interaction test 通过（至少 3 个 focused 用例）
- [ ] 不对现有 `gantt.test.tsx`/`gantt.integration.test.tsx` 做任何修改（仅追加新文件或新 describe block）
- [ ] 全部 Scheduling 816 tests 仍全绿

### Phase 3 — Dead code with tests 清理

Status: planned
Targets: `packages/flux-renderers-scheduling/src/` (多个文件)

- Item Types: `Fix`

根据审计报告的已识别的 dead code:

- [ ] `BaselineBars` (`src/gantt/components/baseline-bars.tsx` + related test) — 确认无生产消费者后删除
- [ ] `getMonthDays` — 确认在 `calendar` 中是否有使用（`calendar-date-utils.ts` 已有 `getDaysInMonth`）
- [ ] 搜索所有 `src/**/*.ts` 和 `src/**/*.tsx` 中 export 但未被同一包内其他文件 import 的函数/组件

注意：只删除 `dead code with tests` 且确认零生产消费者（cross-package grep 验证）。不确定的移到 deferred。

Exit Criteria:

- [ ] 每次删除先 grep 确认无消费者然后才删除文件/export
- [ ] 每次删除后立即 `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck && test` 通过
- [ ] 所有 cleanup 完成后全量 Scheduling 816 tests 仍全绿（或略少于 816 因 dead file 移除）

### Phase 4 — AI 包弱断言强化

Status: planned
Targets: `packages/flux-renderers-ai/src/**/*.test.{ts,tsx}`

- Item Types: `Fix | Follow-up`

根据 2026-07-24 和 2026-07-25 audit 发现的弱断言模式：

- [ ] `aitoken-usage` clamp test: 将 `.not.toBeNull()` 改为具体数值断言
- [ ] `safeMarkdownSlice` wiring test: 增加 end-to-end 断言，不只测 tag name
- [ ] `tmp-sanitize-check.*` debug artifacts: 确认已删除（open audit P2-1: `expect(true).toBe(true)` no-op test）

Exit Criteria:

- [ ] 所有修改后的 test assertions 验证具体值/行为，而非仅 `.not.toBeNull()` 或 tag name
- [ ] 不存在 no-op test（`expect(true).toBe(true)` 模式）
- [ ] `pnpm --filter @nop-chaos/flux-renderers-ai test` 全绿
- [ ] test count 没有因弱断言强化而下降（仅 assertion 变强，不删 test）

### Phase 5 — Compiler prop-coverage 弱断言强化

Status: planned
Targets: `packages/flux-compiler/src/**/schema-compiler-prop-coverage-*.test.ts`

- Item Types: `Fix`

`schema-compiler-prop-coverage-dialog-form.test.ts` 和 `schema-compiler-prop-coverage-data-structures.test.ts` 中有约 16 个测试用例唯一断言是 `expect(...).toBeDefined()`。它们编译 schema 后只检查某 region/eventPlan 存在，不验证其内容。

- [ ] `dialog-form`: 所有 `expect(root.regions.actions).toBeDefined()` 改为断言 region 的 `type`/`items`/`params` 结构
- [ ] `dialog-form`: 所有 `expect(root.eventPlans.*).toBeDefined()` 改为断言 event 的 `type`/`handler`/`action` 具体值
- [ ] `data-structures`: 所有 `expect(root.eventPlans.*).toBeDefined()` 类似强化

注意：不改 `schema-compiler-contract-exploration-*.test.ts` 中的 `toBeDefined()`——那组文件的模式是做大量 schema 变体编译、验证编译器不崩，`toBeDefined()` 是 "did not throw" 的合法简写。只改 `prop-coverage` 系列的 cover-the-coverage 测试。

Exit Criteria:

- [ ] 所有修改后的 test 断言验证编译产物的具体内容/类型/值
- [ ] 任何测试都不再以 `toBeDefined()` 作为唯一断言
- [ ] `pnpm --filter @nop-chaos/flux-compiler typecheck && test` 全绿（test count 不变或略有增加）

### Phase 6 — Runtime validators 弱断言强化

Status: planned
Targets: `packages/flux-runtime/src/validation/validators-edge-cases.test.ts`

- Item Types: `Fix`

该文件有 ~12 个测试用例唯一断言是 `expect(validate(...)).toBeDefined()` 或 `expect(invoke(rule, ...)).toBeDefined()`。测试名称描述行为，但断言只证明 "有返回值"。

- [ ] 所有 "fails for X" 用例：追加断言验证返回 error 的 `rule` 字段匹配预期规则名
- [ ] 所有 "passes for X" 用例：追加断言验证返回值是 `null`/`undefined`（无 error）
- [ ] "fails for email with trailing dot" 等变体：追加断言验证 error 的 `path`/`message` 内容

注意：不改 `validators.test.ts` 中的主要验证逻辑——那些测试已有 `.toEqual()` 等具体断言。只改 `validators-edge-cases.test.ts` 的 weak pattern。

Exit Criteria:

- [ ] 所有 "fails for" 测试断言 error 的 `rule` 字段
- [ ] 所有 "passes for" 测试断言返回 null/undefined
- [ ] 没有任何测试以 `toBeDefined()` 作为唯一行为验证
- [ ] `pnpm --filter @nop-chaos/flux-runtime typecheck && test` 全绿

## Draft Review Record

- Reviewer / Agent: mission-driver review session
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major: Phase 6 Targets path corrected (wrong `__tests__/` prefix — actual file is at `validators-edge-cases.test.ts` directly under `validation/`)

## Closure Gates

- [ ] Phase 1 所有 proof 通过
- [ ] Phase 2 所有 integration test 通过
- [ ] Phase 3 dead code 已清理，无消费者确认
- [ ] Phase 4 AI weak assertions 已强化
- [ ] Phase 5 compiler weak assertions 已强化
- [ ] Phase 6 runtime validators weak assertions 已强化
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步（docs/logs/ 更新）
- [ ] 由独立子 agent 执行的 closure-audit 已完成并记录证据
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck`
- [ ] `pnpm --filter @nop-chaos/flux-renderers-scheduling test`
- [ ] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck`
- [ ] `pnpm --filter @nop-chaos/flux-renderers-ai test`
- [ ] `pnpm --filter @nop-chaos/flux-compiler typecheck`
- [ ] `pnpm --filter @nop-chaos/flux-compiler test`
- [ ] `pnpm --filter @nop-chaos/flux-runtime typecheck`
- [ ] `pnpm --filter @nop-chaos/flux-runtime test`
- [ ] `pnpm typecheck` (全量)
- [ ] `pnpm build` (全量)
- [ ] `pnpm lint` (全量)
- [ ] `pnpm test` (全量)

## Deferred But Adjudicated

### Gantt E2E playground smoke test

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: E2E 测试依赖 playground 环境和 schema 加载机制，需要在更高的测试基础设施层解决。Phase 2 的 integration test 已确保 DOM 级交互覆盖。
- Successor Required: `yes`
- Successor Path: 后续 e2e 专用计划

### AI 并发 fuzz test

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: AI 包的集成测试使用 real engine + real renderer，并发竞争路径已在 `deleteConversation` 专用回归测试（`use-conversation-delete-during-abort.test.ts`）中覆盖。真实网络 jitter 场景需要专用工具。
- Successor Required: `no`

### Scheduling Barcode/ResourceLoad 子组件测试

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Barcode 和 ResourceLoad 作为独立功能子组件，未被审计列为关键风险路径。scope 聚焦 Gantt 交互集成。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 持续监控 `check:audit-test-global-leaks` 的 test-module-top-let 和 test-global-patch 计数（目前 48，MV 基线）
- 考虑为 compiler 和 runtime 增加 `check:audit-weak-assertions` guard 脚本，检测 `toBeDefined()`/`not.toBeNull()` 作为唯一断言的模式（类似 `check:audit-suspects` 的模式）

## Closure

Status Note: （完成时填写）

Closure Audit Evidence:

- Auditor / Agent: （closure 时填写）
- Evidence: （closure 时填写）

Follow-up:

- （closure 时填写）
