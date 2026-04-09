# 59 DOM Ref And Event Passthrough

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md`, discussion on xui:imports capability boundary
> Related: `12-action-scope-imports-and-component-invocation-plan.md` (completed)

## Purpose

为 `xui:imports` 导入的 namespace provider 补齐 DOM 访问和原生事件传递能力，使 "JSON schema + import JS" 模型能覆盖需要操作 DOM 元素的场景（如 ECharts 挂载、拖拽初始化、Canvas 绑定），无需为此编写专门的渲染器。

## Current Baseline

### 已有

- `ActionContext` 传递 `runtime`, `scope`, `form`, `page`, `actionScope`, `componentRegistry`, `nodeInstance`, `event?` 等 (`packages/flux-core/src/types/actions.ts:46-62`)
- `ImportedNamespaceContext` 传递 `runtime`, `env`, `actionScope`, `scope`, `spec`, `node?`, `nodeInstance?` (`packages/flux-core/src/types/actions.ts:108-117`)
- `ComponentHandle` 接口有 `capabilities: { store?, invoke(), hasMethod?(), listMethods?(), getDebugData?() }` (`packages/flux-core/src/types/renderer-component.ts:46-56`)
- form 和 table 已通过 `componentRegistry.register()` 注册 handle (`packages/flux-react/src/useFormComponentHandleRegistration.ts`, `packages/flux-renderers-data/src/table-renderer/use-table-handle.ts`)
- 部分渲染器传递了原生事件：`chart-renderer.tsx:135` 传了 `onClick={(event) => void props.events.onClick?.(event, {})}`
- `ActionContext.event` 字段已存在，dispatch 链路 `node-renderer.tsx:184-189` 已把 `event` 传入 `mergeActionContext`

### 缺口

1. **无 DOM ref 通道**：`ComponentHandle` 没有 `ref` 字段，provider 无法通过 `componentRegistry.resolve()` 获取任何组件的 DOM 元素
2. **事件传递不一致**：
   - `button.tsx:21` — `onClick={() => void props.events.onClick?.()}` — 原生事件被丢弃
   - `chart-renderer.tsx:135` — `onClick={(event) => void props.events.onClick?.(event, {})}` — 传了原生事件
   - 无规范要求渲染器必须/禁止传递原生事件
3. **事件类型不明确**：`ActionContext.event` 类型为 `unknown`，无法区分是 React SyntheticEvent 还是自定义事件

## Goals

- `ComponentHandle` 增加正式的 `ref` 字段，渲染器可注册 DOM 引用，provider 可通过 `componentRegistry.resolve()` 获取
- 所有带事件回调的渲染器统一传递原生事件，`ActionContext.event` 可靠可用
- 事件类型从 `unknown` 改为结构化类型，提供基本类型安全
- 不破坏现有渲染器和 provider 的兼容性

## Non-Goals

- 不把 DOM ref 放进 `ActionContext` 或 `ImportedNamespaceContext`——ref 是组件实例的属性，不是 action 触发瞬间的快照
- 不要求所有渲染器都注册 DOM ref——按需注册，有 DOM 操作需求的渲染器才需要
- 不引入 React-specific 类型到 `flux-core`——`ref` 字段用 `HTMLElement | null`，保持框架无关
- 不改造高频 canvas 交互（拖拽、pointermove）走 action dispatch——这些仍属于命令式层

## Scope

### In Scope

- `ComponentHandle` 接口增加 `ref?: HTMLElement | null`
- `ActionContext.event` 类型从 `unknown` 改为 `FluxActionEvent`
- 定义 `FluxActionEvent` 结构化类型
- 修改 `button.tsx` 等渲染器，统一传递原生事件
- 修改 `chart-renderer.tsx` 注册 DOM ref 到 component handle
- 更新 `docs/architecture/action-scope-and-imports.md` 中 DOM ref 相关段落
- 更新 `docs/architecture/renderer-runtime.md` 中事件传递契约

### Out Of Scope

- Spreadsheet canvas 的 pointer/mouse 交互改造
- Flow designer canvas 的高频事件通道
- 第三方库（ECharts、Monaco）的封装 provider 实现
- SSR 相关的 ref 处理

## Execution Plan

### Phase 1 - 类型扩展：ComponentHandle.ref 和 FluxActionEvent

Status: planned
Targets: `packages/flux-core/src/types/renderer-component.ts`, `packages/flux-core/src/types/actions.ts`

- [ ] 在 `ComponentHandle` 接口增加 `ref?: HTMLElement | null` 字段
- [ ] 定义 `FluxActionEvent` 类型：
  ```ts
  interface FluxActionEvent {
    nativeEvent?: Event;
    currentTarget?: HTMLElement;
    target?: HTMLElement;
    type: string;
    preventDefault?(): void;
    stopPropagation?(): void;
  }
  ```
- [ ] 将 `ActionContext.event` 类型从 `unknown` 改为 `FluxActionEvent | undefined`
- [ ] 在 `flux-core/src/types/renderer-component.ts` 和 `actions.ts` 的 barrel export 中导出新类型

Exit Criteria:

- [ ] `ComponentHandle.ref` 字段存在且类型为 `HTMLElement | null | undefined`
- [ ] `FluxActionEvent` 类型已导出
- [ ] `pnpm typecheck` 通过（下游可能需要适配 `event` 类型变更）

### Phase 2 - 事件传递标准化

Status: planned
Targets: `packages/flux-react/src/helpers.tsx`, `packages/flux-renderers-basic/src/button.tsx`, 所有含 `onClick`/`onChange`/`onSubmit` 的渲染器

- [ ] 在 `helpers.tsx` 的 `mergeActionContext` 中增加事件规范化逻辑：如果传入的 event 是 React SyntheticEvent，提取 `nativeEvent`、`currentTarget`、`target`、`type`、`preventDefault`、`stopPropagation` 构造 `FluxActionEvent`
- [ ] 修改 `button.tsx`：`onClick={(e) => void props.events.onClick?.(e)}`（传递原生 React 事件）
- [ ] 审计所有渲染器中的事件调用点，统一传递原生事件参数（而非丢弃）
- [ ] 确保现有测试不被事件参数变更破坏（因为 `mergeActionContext` 已处理规范化）

Exit Criteria:

- [ ] 所有渲染器的 `onClick`/`onChange`/`onSubmit` 回调均传递原生事件参数
- [ ] `ActionContext.event` 在 action dispatch 时非空且为 `FluxActionEvent`
- [ ] `pnpm test` 通过

### Phase 3 - Chart Renderer 注册 DOM ref

Status: planned
Targets: `packages/flux-renderers-data/src/chart-renderer.tsx`, `packages/flux-renderers-data/src/chart-schemas.ts`

- [ ] 在 `ChartRenderer` 中注册 `ComponentHandle`，包含 `ref: chartRef.current`
- [ ] 在 handle 的 `capabilities.invoke` 中暴露 `resize`、`setOption`、`getDataURL` 等图表操作方法
- [ ] 在 `ChartSchema` 中增加可选 `componentId` 字段（用于外部定位）

Exit Criteria:

- [ ] Chart 渲染器的 DOM ref 通过 `componentRegistry.resolve({ componentId })` 可获取
- [ ] `handle.ref` 为 chart 容器的 `HTMLDivElement`
- [ ] `pnpm test` 通过

### Phase 4 - 文档更新

Status: planned
Targets: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md`

- [ ] 在 `action-scope-and-imports.md` 增加 "DOM Ref Access" 段落，说明 provider 通过 `componentRegistry.resolve()` 获取 DOM ref 的模式
- [ ] 在 `renderer-runtime.md` 增加 "Event Passthrough Contract" 段落，明确渲染器必须传递原生事件的规范
- [ ] 更新 `docs/references/renderer-interfaces.md`（如存在）中 `ComponentHandle` 的文档

Exit Criteria:

- [ ] DOM ref 获取模式和事件传递契约在文档中有明确说明
- [ ] 文档中的代码示例与实际接口一致

## Validation Checklist

- [ ] `ComponentHandle.ref` 可被 provider 通过 `ctx.componentRegistry.resolve()` 获取
- [ ] `ActionContext.event` 在按钮点击、表单提交等场景下为非空 `FluxActionEvent`
- [ ] 现有 form handle、table handle 不受 `ref` 字段新增影响（向后兼容）
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] `docs/logs/` 已更新

## Closure

Status Note: （完成时填写）

Follow-up:

- 后续可基于此 DOM ref 通道实现 ECharts provider、Monaco provider 等具体 import 模块
- 后续可评估是否为 `ImportedNamespaceContext` 增加 `getElement(componentId: string)` 便捷方法
