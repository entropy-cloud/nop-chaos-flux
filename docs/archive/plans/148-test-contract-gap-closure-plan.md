# 148 Test Contract Gap Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-04-27
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-27-test-gap-audit-e2e-vs-contract.md`, live repo audit of `packages/theme-tokens`, `packages/tailwind-preset`, `packages/ui`, `tests/e2e`, `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/flow-designer-page.tsx`, `apps/playground/src/pages/word-editor-page.tsx`
> Related: `docs/analysis/2026-04-17-deep-audit/14-test-coverage-quality.md`, `docs/plans/143-unit-test-coverage-80-percent-target-plan.md`

## Purpose

这份计划把当前测试审计中最值得立即收口的缺口落成一轮完整执行：为基础设施包和共享 UI 边界补最小契约测试，并只新增 3 条浏览器专属高价值 E2E，避免继续把测试面无边界地扩张成页面可见性堆积。

## Current Baseline

- 仓库已经拥有大量 package-level unit/integration tests，核心 runtime/compiler/react/renderer/domain package 并不缺总体测试密度。
- `tests/e2e` 已覆盖 component-lab、playground entry pages、debugger、flow-designer、code-editor、report-designer、word-editor 等多个页面，当前主要问题不是“完全没有 E2E”，而是少数 domain route 仍停留在 smoke 级别，且部分历史 Playwright 文件更接近调试/样式冻结。
- `packages/theme-tokens` 和 `packages/tailwind-preset` 当前没有源码级测试文件，也没有 package-local `vitest.config.ts`，即使添加测试文件也不会被 `vitest.workspace.ts` 自动收集。
- `packages/ui` 虽然已有少量测试，但和其 repo-wide 复用程度不匹配；当前最合适补的是 `Field`、`NativeSelect`、`ButtonGroup` 这类 repo-level 稳定边界，而不是机械覆盖全部 shadcn 包装。
- `performance-table` 当前只有 entry-page smoke，但页面本身已经暴露可稳定断言的用户结果：模式切换、`Run 20 Host Mutations`、`Ping` 行为、summary/metrics 面板。
- `flow-designer` 当前已有 minimap、collapse、toolbar、JSON 预览、增删节点等 E2E，但缺少高价值 edge-creation 契约；代码上 `designer-canvas.tsx` 与 XYFlow canvas 已明确支持 `addEdge` 交互，而 raw pointer 手势在当前 Playwright + XYFlow 组合中未能稳定进入连接态。
- `word-editor` 当前已有打开页面、按钮可见、打开对话框、保存动作可触发等 E2E；`word-editor-renderers`/`word-editor-core` 也已经明确使用 `nop-word-editor-document` 持久化文档并在 reload 时恢复，适合作为隐藏但真实的持久化契约。

## Goals

- 为 `theme-tokens`、`tailwind-preset`、`ui` 补最小而稳定的契约测试面。
- 把 `theme-tokens`、`tailwind-preset` 纳入 package-local Vitest workspace 配置，确保新增测试进入正式验证链路。
- 为 `performance-table` 新增 1 组页面行为 E2E，覆盖当前缺失的浏览器真实契约。
- 为 `flow-designer` 新增 1 条高价值 edge-creation E2E，优先保护 add-edge 跨层链路与页面可观察结果；若 raw pointer/drag 手势在当前栈中无法稳定自动化，则允许退到经批准的最小非语义 test hook。
- 为 `word-editor` 新增 1 条保存并刷新恢复 E2E，固化持久化链路契约。
- 用独立子 agent 对计划和最终 closure 做复核，避免只在实现者视角下宣布完成。

## Non-Goals

- 不把这份计划扩成“为所有 package 补测试”的全面运动。
- 不继续增加 component-lab shared renderer 的横向 E2E 数量。
- 不继续扩张 debugger/code-editor/report-designer 的 page-level Playwright 覆盖，除非为新的公开契约服务。
- 不把历史调试型 Playwright 文件统一清理或重写；本计划只避免沿该模式继续新增。
- 不修改任何业务功能、schema contract、renderer contract、样式设计基线，除非为测试稳定性所需的最小非语义支撑。

## Scope

### In Scope

- `packages/theme-tokens/package.json`
- `packages/theme-tokens/vitest.config.ts`
- `packages/theme-tokens/src/*.test.ts`
- `packages/tailwind-preset/package.json`
- `packages/tailwind-preset/vitest.config.ts`
- `packages/tailwind-preset/src/*.test.ts`
- `packages/ui/src/components/ui/{field,native-select,button-group}*.test.tsx`
- `tests/e2e/*performance*`
- `tests/e2e/*flow-designer*`
- `tests/e2e/*word-editor*`
- 与上述测试直接相关的最小 helper/fixture 支撑
- 本计划、对应 `docs/logs/` 条目、必要的测试审计结论同步

### Out Of Scope

- 其它 package 的广泛测试补齐
- 全量重构或删除现有 debug-style Playwright files
- 任何架构文档或组件设计文档的语义改写
- 与本计划无关的业务实现修复、UI 重做、测试大规模重组

## Execution Plan

### Phase 1 - Freeze Scope And Reviewable Plan Baseline

Status: completed
Targets: `docs/plans/148-test-contract-gap-closure-plan.md`, `docs/analysis/2026-04-27-test-gap-audit-e2e-vs-contract.md`

- [x] 基于 live repo audit 明确真正需要新增的 package-level contract tests 和 E2E 范围。
- [x] 把 `theme-tokens` / `tailwind-preset` 缺少 `vitest.config.ts`、`performance-table` 缺少真实 E2E、`flow-designer` 缺少连线创建 E2E、`word-editor` 缺少保存后刷新恢复 E2E 写入 baseline。
- [x] 启动至少两个独立子 agent 对本计划做 scope/exit-criteria 审阅，并根据审阅意见收敛计划文字。

Exit Criteria:

- [x] 计划边界、阶段目标、非目标、验证口径都经过独立子 agent 复核
- [x] 若子 agent 发现 scope drift、验证缺口或 closure 标准过弱，已在计划中修正
- [x] `docs/analysis/2026-04-27-test-gap-audit-e2e-vs-contract.md` 与本计划不冲突，且本计划已明确 owner result surface
- [x] 测试-only 变更不需要更新 `docs/architecture/` 或 `docs/components/`；该判断已在计划 baseline 中明确
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Add Package-Level Contract Test Coverage And Workspace Hooks

Status: completed
Targets: `packages/theme-tokens/*`, `packages/tailwind-preset/*`, `packages/ui/src/components/ui/{field,native-select,button-group}*.test.tsx`

- [x] 为 `theme-tokens` 增加 package-local `vitest.config.ts` 并补 token/root-selector/关键变量契约测试。
- [x] 为 `tailwind-preset` 增加 package-local `vitest.config.ts` 并补 preset export shape、关键 theme extension、plugin 配置契约测试。
- [x] 为 `ui` 补 `Field`、`NativeSelect`、`ButtonGroup` 的 repo-level 行为/slot/ARIA 契约测试。
- [x] 保持这些测试以输入/输出、公开导出、稳定 DOM slot/role 为断言面，不锁实现细节。

Exit Criteria:

- [x] `theme-tokens` 与 `tailwind-preset` 的测试会被 workspace Vitest 正式收集执行，并通过 focused package test invocation 证明不是“只写了文件未进验证链路”
- [x] `theme-tokens` 已覆盖 `package.json` 中 `./styles.css` 导出、基础 `:root` block、`classic/glass + light/dark` theme root 选择器、以及代表性 token 变量（至少含 `--radius-*`、`--shadow-*`、`--primary`、`--background`）
- [x] `tailwind-preset` 已覆盖 preset 导出形状、`darkMode` 基线、关键 `theme.extend.colors`、`borderRadius`、`boxShadow`、以及 animate plugin 注册
- [x] `ui` 已覆盖 `Field`、`NativeSelect`、`ButtonGroup` 的最小 repo-level 契约：稳定 role/data-slot/data-orientation 输出，以及 disabled/value/onChange 等公开行为面
- [x] 测试断言没有依赖 React internals、非契约 class 细节或偶然布局数值
- [x] 测试-only 变更不需要更新 `docs/architecture/` 或 `docs/components/`；该判断在对应提交日志中说明
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Add High-Value Browser-Only E2E Contracts

Status: completed
Targets: `tests/e2e/`, `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/flow-designer-page.tsx`, `apps/playground/src/pages/word-editor-page.tsx`

- [x] 为 `performance-table` 新增真实页面契约 E2E，至少覆盖 host mutation/interactive result 的用户可见结果。
- [x] 为 `flow-designer` 新增真实连线创建 E2E；由于 XYFlow handle 手势在 Playwright 中未能稳定进入连接态，最终采用经批准的最小页面级测试 hook `nop-designer:test-connect` 驱动正常 `dispatch({ type: 'addEdge' ... })` 链路，并继续断言真实页面 edge 数量与 toolbar summary 更新。
- [x] 为 `word-editor` 新增保存并刷新恢复 E2E，覆盖编辑/保存/刷新后的持久化契约。
- [x] 若测试稳定性需要最小辅助属性或可观测输出，只做最小非语义支撑，并保持页面对用户可见行为不变。

Exit Criteria:

- [x] `performance-table` E2E 已从 entry smoke 提升到真实行为契约：模式切换会改变场景文案可见性，`Run 20 Host Mutations` 后 `Last Measurement` 面板稳定出现，`Reset Metrics` 会清空 measurement surface
- [x] `flow-designer` E2E 已覆盖真实 edge creation，而不只是 palette/minimap/visibility 断言；在经批准的最小页面级 test hook 驱动下，edge 数量与 toolbar summary 都会出现可观察增加
- [x] `word-editor` E2E 已覆盖 save + reload persistence 契约，而不只是按钮可见或 localStorage 时间戳存在；完成标准是唯一文本标记在保存并刷新后仍可通过持久化 payload 确认存在
- [x] 新增 E2E 断言面聚焦浏览器专属行为、跨层链路或隐藏设计要求，没有退化成实现细节探针
- [x] 如新增最小测试支撑代码，未改变功能语义且已通过 focused verification 证明
- [x] 测试-only 变更不需要更新 `docs/architecture/` 或 `docs/components/`；如存在例外，已在 phase 内同步说明
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 - Verification And Independent Closure Audit

Status: completed
Targets: affected packages, root verification, this plan, daily log

- [x] 运行受影响 package 与 workspace 验证，处理所有由本计划引入的问题。
- [x] 对照计划逐条复核 Phase 1-3 的 exit criteria，不把“接口已出现”误判为“语义已落地”。
- [x] 启动独立子 agent 做 closure audit，并把结论写回本计划和 daily log。

Exit Criteria:

- [x] 受影响 package 的 focused tests 与新增 E2E 已通过
- [x] `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 均通过
- [x] 所有 phases 已完成并有可追溯证据
- [x] 独立子 agent closure audit 明确确认无剩余 plan-owned work；若发现剩余工作，已在本计划或 successor plan 中明确归属
- [x] `docs/analysis/2026-04-27-test-gap-audit-e2e-vs-contract.md` 中属于本计划 owner subset 的事项已经全部落地，或显式移交 successor plan
- [x] `docs/logs/` 对应日期条目已更新

## Risks And Rollback

- `flow-designer` 连线创建 E2E 可能因 XYFlow handle 缺少稳定定位点而变脆；若 raw selector 不稳定，只允许添加最小非语义 selector/testid 支撑，不改动连接语义。
- `word-editor` 保存恢复 E2E 可能被残留 localStorage 干扰；测试必须在开始时显式清理或隔离存储。
- `theme-tokens` / `tailwind-preset` 即使新增了测试文件，也可能因缺少 `vitest.config.ts` 而未进入 workspace 验证；因此先完成 package-level Vitest 配置，再写测试。
- 若某条新增 E2E 只能依赖实现细节或极易抖动的样式/像素断言，则该用例应收窄为更稳定的公开契约，不能为了“完成计划”强行保留脆弱断言。

## Validation Checklist

- [x] `theme-tokens` package-level contract tests landed and run in workspace
- [x] `tailwind-preset` package-level contract tests landed and run in workspace
- [x] `ui` repo-level contract tests for `Field` / `NativeSelect` / `ButtonGroup` landed
- [x] `performance-table` high-value E2E landed
- [x] `flow-designer` edge-creation E2E landed
- [x] `word-editor` save-and-reload E2E landed
- [x] 独立子 agent plan review 已完成并记录
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: completed. Independent closure audit confirmed the landed package-test scope, the three planned E2E files, and full workspace verification. The shipped `flow-designer` coverage is the narrower, user-approved `addEdge` contract path via minimal test hook rather than raw pointer/handle automation; raw gesture stabilization is not plan-owned follow-up unless separately scoped later.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent closure audit `ses_231760c06ffeDKgO4R44Q0drd9`
- Evidence: audit confirmed package-level contract tests for `theme-tokens`, `tailwind-preset`, and `ui`; confirmed `tests/e2e/performance-table.spec.ts`, `tests/e2e/word-editor-persistence.spec.ts`, and `tests/e2e/flow-designer-edge-creation.spec.ts`; and confirmed repo-backed verification evidence for `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`. The audit initially flagged a mismatch between the original pointer-gesture wording and the landed `nop-designer:test-connect` hook path; this closure updates the plan text to reflect the user-approved narrower contract surface.

Follow-up:

- No remaining plan-owned work. If future work wants to cover raw XYFlow pointer/handle gesture automation specifically, open a successor plan for browser-gesture stabilization rather than reopening this closure.
