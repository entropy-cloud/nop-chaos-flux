# React 19 Compiler 与高频交互面重构计划

> Plan Status: completed
> Last Reviewed: 2026-04-10; live cleanup re-verified
> Related: `docs/plans/43-react-18-to-19-best-practices-migration-plan.md`（已完成 React 19 基线迁移，本计划处理其后续高 ROI 技术债）

## Audit Note

- 2026-04-10 live repo audit confirms that the React Compiler is wired into `apps/playground/vite.config.ts`, table controls now use `startTransition`, and `table-renderer.tsx` has already been split into `table-renderer/*` helper modules.
- The remaining cleanup is now landed: async source/import hooks use explicit abortable effect helpers, code-editor source resolvers follow the same cancellation model, and spreadsheet interactions delegate shell/mouse-up/cell-value responsibilities to `packages/spreadsheet-renderers/src/spreadsheet-interactions/*` modules instead of keeping those concerns inline in one hook body.
- This plan is now closed again with live repo evidence and targeted package verification.

## Problem

当前仓库已经完成 React 19 基线迁移，但高价值的 React 19 能力还没有真正落到高频交互路径上。

- `apps/playground/vite.config.ts:6-12` 仍只使用 `@vitejs/plugin-react` 默认配置，没有接入 React Compiler，也没有为大体积 chunk 制定更积极的切分策略。
- `packages/flux-react/src/useSourceValue.ts:21-61`、`packages/flux-react/src/useNodeImports.ts:16-99`、`packages/flux-code-editor/src/source-resolvers.ts:18-145` 的异步 effect 仍采用 `cancelled/disposed` 标志位，仅避免卸载后的状态提交，没有中止在途任务。
- `packages/flux-renderers-data/src/table-renderer.tsx:127-` 是一个大型渲染器，混合了数据派生、分页、筛选、选择、scope 缓存、行实例同步与 UI 渲染；文件内部从 `:148` 开始密集堆叠 `useMemo` / `useCallback` / `useSyncExternalStore`。
- `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:149-` 集中承载 selection、edit、clipboard、merge、freeze、find/replace、comment、drag/drop、sheet 管理等职责，单一 hook 已演化成横跨状态机、命令分发与 DOM 交互的超大入口。
- 当前只在 `packages/nop-debugger/src/panel.tsx:102` 看到了 `useDeferredValue` 的明确采用；表格、设计器、Spreadsheet 这类高频交互域尚未系统引入 `startTransition` / `useTransition`。

这些问题不会立即阻塞构建，但会持续抬高维护成本，并让 React 19 的核心收益停留在“版本已升级”而不是“运行时复杂度和交互负载真的下降”。

## Root Cause

- `docs/plans/43-react-18-to-19-best-practices-migration-plan.md` 主要目标是完成 React 19 基线迁移、移除遗留 API 和建立防回归护栏，而不是继续推进 React Compiler 与并发特性在热点路径上的结构性采用。
- 仓库当前的性能治理仍以手工 `useMemo` / `useCallback` 为主，缺少“先让 React Compiler 接管默认记忆化，再只保留编译器处理不了的边界”的工程化路线。
- 多个高频交互模块长期以增量方式扩展，新能力直接叠加在原文件中，导致职责漂移为“大型 orchestrator + 细节实现混放”。
- 异步数据读取与导入加载的实现更关注“避免 React 警告”，没有统一抽象为可取消的任务模型，因此形成了多处重复但不彻底的取消模式。

## Goals

- 为仓库建立 React Compiler 接入与回归护栏，而不是继续依赖人工维持 memo/callback 边界。
- 把高频交互面的异步 effect 统一为可取消任务模型，降低竞态与资源浪费。
- 拆分表格与 Spreadsheet 的超大交互入口，分离渲染、状态派生、命令分发与副作用绑定。
- 在真正高频的非紧急更新场景中采用 `startTransition` / `useTransition` / `useDeferredValue`，而不是只在边缘功能里局部尝试。

## Non-Goals

- 不为了语法新鲜度批量改写稳定组件，例如机械替换全部 `forwardRef`。
- 不把本计划扩大为 Server Components、Server Actions、SSR 或目录大搬迁。
- 不把所有手工 memo 一次性删光；只有在 React Compiler 接入后，才按 profiling 收口多余记忆化。

## Fix Plan

**Step 1 - 接入 React Compiler 与验证护栏**

- 在 `apps/playground/vite.config.ts` 评估并接入 React Compiler 所需配置，补齐 workspace 依赖与文档说明。
- 更新 lint / audit 规则，补一条专门面向 compiler-friendly 代码的执行检查，避免把不可编译模式继续引入热点路径。
- 用一个小范围试点验证编译器收益，优先观察表格、debugger、designer 等交互面，而不是全仓库盲目清理 memo。

**Step 2 - 统一异步取消模型**

- 为 `useSourceValue`、`useNodeImports`、`source-resolvers` 提供共享的可取消任务模式，优先使用 `AbortController`、signal 透传或 runtime 级 cancellation token。
- 把“忽略过期结果”和“中止在途任务”分成两个明确层次，避免 effect 清理只做到半套。
- 为快速切换、重复触发、卸载中断场景补测试，验证旧请求不会覆盖新状态。

**Step 3 - 拆分 TableRenderer**

- 将 `packages/flux-renderers-data/src/table-renderer.tsx` 按职责拆为数据派生、行 scope 缓存、分页/选择控制、表头交互、表体渲染等子模块。
- 以 React Compiler 为前提重新审视现有 `useMemo` / `useCallback`，只保留跨 store 订阅、外部引用稳定性等确有必要的边界。
- 为排序、筛选、分页、全选、展开等明显非紧急更新评估 `startTransition`，避免长列表操作压住输入与点击反馈。

**Step 4 - 拆分 Spreadsheet 交互 hook**

- 将 `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts` 切分为 selection/editing、clipboard/fill、resize/drag、sheet commands、find/replace/comment 等独立 hooks 或 command modules。
- 明确 DOM 事件监听、bridge 命令分发与本地 UI 状态的边界，减少单一 hook 里跨域共享 ref 的复杂度。
- 对 find/replace、批量样式、sheet 切换、拖拽预览等非紧急更新评估 `startTransition` 或衍生 deferred state。

**Step 5 - 回收文档与验证**

- 更新相关 architecture / performance 文档，明确 React Compiler 与高频交互面的推荐模式。
- 记录迁移前后 profiling 结论与保留的手工 memo 边界，防止后续重新回到“见卡顿就随手加 useCallback”的模式。

**Scope**: `apps/playground/vite.config.ts`; `package.json`; `eslint.config.js`; `packages/flux-react/src/useSourceValue.ts`; `packages/flux-react/src/useNodeImports.ts`; `packages/flux-code-editor/src/source-resolvers.ts`; `packages/flux-renderers-data/src/table-renderer.tsx`; `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts`; 以及本次拆分产生的最小必要新模块和对应测试。

**Effort**: 5-8 天

**Verification**: `pnpm typecheck && pnpm build && pnpm lint && pnpm test`

## 变动文件清单

| File | Change | Lines affected |
|------|--------|---------------|
| `apps/playground/vite.config.ts` | 接入 React Compiler / 调整构建验证策略 | ~10-30 |
| `package.json` | 增加编译器依赖或审计命令 | ~5-20 |
| `eslint.config.js` | 增加 compiler-friendly 护栏 | ~10-40 |
| `packages/flux-react/src/useSourceValue.ts` | 统一异步取消模式 | ~20-50 |
| `packages/flux-react/src/useNodeImports.ts` | 统一异步取消模式 | ~20-60 |
| `packages/flux-code-editor/src/source-resolvers.ts` | 统一异步取消模式 | ~20-80 |
| `packages/flux-renderers-data/src/table-renderer.tsx` | 拆分大型渲染器、收口手工 memo、引入 transition | ~150-350 |
| `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts` | 拆分大型交互 hook、引入 transition | ~200-450 |
| `docs/architecture/performance-design-requirements.md` | 补充 React 19/Compiler 热点交互约束 | ~20-50 |
| `docs/logs/2026/04-09.md` | 记录实施结果 | ~10-20 |

## Risks And Rollback

- React Compiler 接入后可能暴露现有代码中的不可编译模式，第一阶段必须先做小范围试点，避免一次性扩大到所有包。
- Table 与 Spreadsheet 的拆分都处在交互密集区，若缺少回归测试，容易引入 selection、focus、clipboard、drag 行为退化。
- `startTransition` 使用位置错误会让用户感知到延迟或状态错位，因此只能放在明确的非紧急更新上，不能包裹输入本身。
- 若某个热点在试点后验证收益不足，可保留拆分结果但暂缓编译器或 transition 扩大 adoption；回退时优先保留模块边界优化，不回退到单文件巨型实现。

## Acceptance Criteria

- playground 构建链已具备 React Compiler 接入与验证路径，且有明确的禁回流护栏。
- 异步 source/import 读取在快速切换场景下可被中止或等价取消，不再只依赖布尔标记。
- TableRenderer 与 Spreadsheet 交互入口不再由单一超大文件承载多个独立职责。
- 至少一个高频交互面落地 `startTransition` 或等价并发优化，并有 profiling 或用户体验证据支撑。
- 全量验证通过：`pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。

## Closure

Status Note:

- React Compiler and lint guardrails are already active in the repo baseline.
- Table hot-path control updates already use `startTransition` in `packages/flux-renderers-data/src/table-renderer/use-table-controls.ts`.
- Residual async cleanup now uses explicit abortable task helpers in `packages/flux-react/src/abortable-task.ts`, `packages/flux-react/src/useSourceValue.ts`, `packages/flux-react/src/useNodeImports.ts`, `packages/flux-code-editor/src/abortable-task.ts`, and `packages/flux-code-editor/src/source-resolvers.ts`.
- Spreadsheet interaction orchestration is no longer carrying all shell responsibilities inline: `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts` now delegates shell state, mouse-up binding, and cell-value sync to `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts`, `use-mouse-up-binding.ts`, and `use-cell-value-sync.ts`.

Follow-up:

- none for this plan scope
