# 148 Test Contract Gap Closure Plan

> Plan Status: in progress
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
- `flow-designer` 当前已有 minimap、collapse、toolbar、JSON 预览、增删节点等 E2E，但缺少真正的浏览器手势连线创建契约；代码上 `designer-canvas.tsx` 与 XYFlow canvas 已明确支持 `addEdge` 交互。
- `word-editor` 当前已有打开页面、按钮可见、打开对话框、保存动作可触发等 E2E；`word-editor-renderers`/`word-editor-core` 也已经明确使用 `nop-word-editor-document` 持久化文档并在 reload 时恢复，适合作为隐藏但真实的持久化契约。

## Goals

- 为 `theme-tokens`、`tailwind-preset`、`ui` 补最小而稳定的契约测试面。
- 把 `theme-tokens`、`tailwind-preset` 纳入 package-local Vitest workspace 配置，确保新增测试进入正式验证链路。
- 为 `performance-table` 新增 1 组页面行为 E2E，覆盖当前缺失的浏览器真实契约。
- 为 `flow-designer` 新增 1 条真实连线创建 E2E，保护 pointer/drag 级行为。
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

Status: in progress
Targets: `docs/plans/148-test-contract-gap-closure-plan.md`, `docs/analysis/2026-04-27-test-gap-audit-e2e-vs-contract.md`

- [x] 基于 live repo audit 明确真正需要新增的 package-level contract tests 和 E2E 范围。
- [x] 把 `theme-tokens` / `tailwind-preset` 缺少 `vitest.config.ts`、`performance-table` 缺少真实 E2E、`flow-designer` 缺少连线创建 E2E、`word-editor` 缺少保存后刷新恢复 E2E 写入 baseline。
- [ ] 启动至少两个独立子 agent 对本计划做 scope/exit-criteria 审阅，并根据审阅意见收敛计划文字。

Exit Criteria:

- [ ] 计划边界、阶段目标、非目标、验证口径都经过独立子 agent 复核
- [ ] 若子 agent 发现 scope drift、验证缺口或 closure 标准过弱，已在计划中修正
- [ ] `docs/analysis/2026-04-27-test-gap-audit-e2e-vs-contract.md` 与本计划不冲突，且本计划已明确 owner result surface
- [ ] 测试-only 变更不需要更新 `docs/architecture/` 或 `docs/components/`；该判断已在计划 baseline 中明确
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 2 - Add Package-Level Contract Test Coverage And Workspace Hooks

Status: planned
Targets: `packages/theme-tokens/*`, `packages/tailwind-preset/*`, `packages/ui/src/components/ui/{field,native-select,button-group}*.test.tsx`

- [ ] 为 `theme-tokens` 增加 package-local `vitest.config.ts` 并补 token/root-selector/关键变量契约测试。
- [ ] 为 `tailwind-preset` 增加 package-local `vitest.config.ts` 并补 preset export shape、关键 theme extension、plugin 配置契约测试。
- [ ] 为 `ui` 补 `Field`、`NativeSelect`、`ButtonGroup` 的 repo-level 行为/slot/ARIA 契约测试。
- [ ] 保持这些测试以输入/输出、公开导出、稳定 DOM slot/role 为断言面，不锁实现细节。

Exit Criteria:

- [ ] `theme-tokens` 与 `tailwind-preset` 的测试会被 workspace Vitest 正式收集执行
- [ ] `theme-tokens` 已覆盖关键 CSS 变量与 theme root 选择器的静态契约
- [ ] `tailwind-preset` 已覆盖 preset 导出形状、关键 colors/radius/shadow/plugin 基线
- [ ] `ui` 已覆盖 `Field`、`NativeSelect`、`ButtonGroup` 的最小 repo-level 契约
- [ ] 测试断言没有依赖 React internals、非契约 class 细节或偶然布局数值
- [ ] 测试-only 变更不需要更新 `docs/architecture/` 或 `docs/components/`；该判断在对应提交日志中说明
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 3 - Add High-Value Browser-Only E2E Contracts

Status: planned
Targets: `tests/e2e/`, `apps/playground/src/pages/performance-table-page.tsx`, `apps/playground/src/pages/flow-designer-page.tsx`, `apps/playground/src/pages/word-editor-page.tsx`

- [ ] 为 `performance-table` 新增真实页面契约 E2E，至少覆盖 host mutation/interactive result 的用户可见结果。
- [ ] 为 `flow-designer` 新增真实连线创建 E2E，覆盖 pointer gesture -> edge creation 的完整链路。
- [ ] 为 `word-editor` 新增保存并刷新恢复 E2E，覆盖编辑/保存/刷新后的持久化契约。
- [ ] 若测试稳定性需要最小辅助属性或可观测输出，只做最小非语义支撑，并保持页面对用户可见行为不变。

Exit Criteria:

- [ ] `performance-table` E2E 已从 entry smoke 提升到至少一条真实行为契约
- [ ] `flow-designer` E2E 已覆盖真实 edge creation，而不只是 palette/minimap/visibility 断言
- [ ] `word-editor` E2E 已覆盖 save + reload persistence 契约，而不只是按钮可见或 localStorage 时间戳存在
- [ ] 新增 E2E 断言面聚焦浏览器专属行为、跨层链路或隐藏设计要求，没有退化成实现细节探针
- [ ] 如新增最小测试支撑代码，未改变功能语义且已通过 focused verification 证明
- [ ] 测试-only 变更不需要更新 `docs/architecture/` 或 `docs/components/`；如存在例外，已在 phase 内同步说明
- [ ] `docs/logs/` 对应日期条目已更新

### Phase 4 - Verification And Independent Closure Audit

Status: planned
Targets: affected packages, root verification, this plan, daily log

- [ ] 运行受影响 package 与 workspace 验证，处理所有由本计划引入的问题。
- [ ] 对照计划逐条复核 Phase 1-3 的 exit criteria，不把“接口已出现”误判为“语义已落地”。
- [ ] 启动独立子 agent 做 closure audit，并把结论写回本计划和 daily log。

Exit Criteria:

- [ ] 受影响 package 的 focused tests 与新增 E2E 已通过
- [ ] `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 均通过
- [ ] 所有 phases 已完成并有可追溯证据
- [ ] 独立子 agent closure audit 明确确认无剩余 plan-owned work；若发现剩余工作，已在本计划或 successor plan 中明确归属
- [ ] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [ ] `theme-tokens` package-level contract tests landed and run in workspace
- [ ] `tailwind-preset` package-level contract tests landed and run in workspace
- [ ] `ui` repo-level contract tests for `Field` / `NativeSelect` / `ButtonGroup` landed
- [ ] `performance-table` high-value E2E landed
- [ ] `flow-designer` edge-creation E2E landed
- [ ] `word-editor` save-and-reload E2E landed
- [ ] 独立子 agent plan review 已完成并记录
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: pending

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- pending until implementation and closure audit complete
