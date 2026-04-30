# 59 DOM Ref, Event Passthrough, And Lifecycle Actions

> Plan Status: completed
> Last Reviewed: 2026-04-10; closure-audited against live repo
> Source: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md`, discussion on xui:imports capability boundary
> Related: `12-action-scope-imports-and-component-invocation-plan.md` (completed)

## Purpose

为 `xui:imports` 导入的 namespace provider 补齐 DOM 访问和原生事件传递能力，并引入通用组件生命周期 action 支持（`onMount`/`onUnmount`），使 "JSON schema + import JS" 模型能覆盖需要操作 DOM 元素的场景（如 ECharts 挂载、拖拽初始化、Canvas 绑定），无需为此编写专门的渲染器。

## Current Baseline

- `ActionContext.event` is now a structured `FluxActionEvent`, and runtime normalizes incoming renderer events before dispatch.
- `BaseSchema` now declares `onMount` / `onUnmount`, and compiled nodes carry those actions through `lifecycleActions` rather than ordinary event metadata.
- `ComponentHandle` now supports `ref?: HTMLElement | null`, so renderers can expose mounted DOM anchors through the existing component registry.
- `NodeRenderer` centrally dispatches compiled lifecycle actions, while ordinary renderers only forward UI events.
- `ButtonRenderer` now forwards click events, and `ChartRenderer` registers a DOM-ref-backed component handle with explicit chart capabilities.
- Architecture and reference docs now describe the DOM ref access pattern, the event passthrough contract, and lifecycle action handling as current baseline rather than future intent.

## Outdated Note

- Earlier versions of this plan and the 2026-04-10 mid-audit notes captured a real repo gap: missing structured events, missing lifecycle compilation, and missing DOM refs.
- Those notes are preserved in the execution history below, but they are no longer the live-repo baseline after the landing recorded in `docs/logs/2026/04-10.md`.

## Goals

- `ComponentHandle` 增加正式的 `ref` 字段，渲染器可注册 DOM 引用，provider 可通过 `componentRegistry.resolve()` 获取
- 所有带事件回调的渲染器统一传递原生事件，`ActionContext.event` 可靠可用
- 事件类型从 `unknown` 改为结构化类型，提供基本类型安全
- `BaseSchema` 增加 `onMount`/`onUnmount` 支持，由编译器在编译时识别并输出到 `CompiledSchemaNode.lifecycleActions`，运行时由 `NodeRenderer` 统一处理——**没有声明 lifecycle 的组件零开销**
- 不破坏现有渲染器和 provider 的兼容性

## Non-Goals

- 不把 DOM ref 放进 `ActionContext` 或 `ImportedNamespaceContext`——ref 是组件实例的属性，不是 action 触发瞬间的快照
- 不要求所有渲染器都注册 DOM ref——按需注册，有 DOM 操作需求的渲染器才需要
- 不引入 React-specific 类型到 `flux-core`——`ref` 字段用 `HTMLElement | null`，保持框架无关
- 不改造高频 canvas 交互（拖拽、pointermove）走 action dispatch——这些仍属于命令式层
- 不废弃 form 的 `initAction`——它与 `onMount` 含义不同（业务初始化 vs 组件挂载），保持共存
- 不增加 `onUpdate`/`onVisible` 等更多生命周期——当前只做 mount/unmount，后续按需扩展

## Scope

### In Scope

- `ComponentHandle` 接口增加 `ref?: HTMLElement | null`
- `ActionContext.event` 类型从 `unknown` 改为 `FluxActionEvent`
- 定义 `FluxActionEvent` 结构化类型
- 修改 `button.tsx` 等渲染器，统一传递原生事件
- 修改 `chart-renderer.tsx` 注册 DOM ref 到 component handle
- `BaseSchema` 增加 `onMount?: ActionSchema`、`onUnmount?: ActionSchema`
- 编译器识别 lifecycle 字段，输出到 `CompiledSchemaNode.lifecycleActions`，不放进 `eventActions`
- `NodeRenderer` 根据 `lifecycleActions` 是否存在决定是否注册 `useEffect`——无声明时零开销
- 更新相关架构文档

### Out Of Scope

- Spreadsheet canvas 的 pointer/mouse 交互改造
- Flow designer canvas 的高频事件通道
- 第三方库（ECharts、Monaco）的封装 provider 实现
- SSR 相关的 ref 处理
- `onUpdate`、`onVisible` 等更多生命周期钩子

## Execution Plan

### Phase 1 - 类型扩展：ComponentHandle.ref、FluxActionEvent、BaseSchema lifecycle

Status: completed
Targets: `packages/flux-core/src/types/renderer-component.ts`, `packages/flux-core/src/types/actions.ts`, `packages/flux-core/src/types/schema.ts`, `packages/flux-core/src/types/renderer-compiler.ts`

- [x] 在 `ComponentHandle` 接口增加 `ref?: HTMLElement | null` 字段
- [x] 定义 `FluxActionEvent` 类型：
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
- [x] 将 `ActionContext.event` 类型从 `unknown` 改为 `FluxActionEvent | undefined`
- [x] 在 `BaseSchema` 接口增加 `onMount?: ActionSchema` 和 `onUnmount?: ActionSchema`
- [x] 在 `CompiledSchemaNode` 接口增加 `lifecycleActions?: { onMount?: ActionSchema; onUnmount?: ActionSchema }`
- [x] 在 `flux-core/src/types/` 的 barrel export 中导出新类型

Exit Criteria:

- [x] `ComponentHandle.ref` 字段存在且类型为 `HTMLElement | null | undefined`
- [x] `FluxActionEvent` 类型已导出
- [x] `BaseSchema.onMount` / `BaseSchema.onUnmount` 类型为 `ActionSchema | undefined`
- [x] `CompiledSchemaNode.lifecycleActions` 字段存在
- [x] `pnpm typecheck` 通过（下游可能需要适配 `event` 类型变更）

### Phase 2 - 编译器：识别 lifecycle 字段并单独编译

Status: completed
Targets: `packages/flux-runtime/src/schema-compiler/fields.ts`, `packages/flux-runtime/src/schema-compiler.ts`

- [x] 在 `fields.ts` 的 `classifyField` 中，增加 lifecycle key 的优先判断：

  ```ts
  const LIFECYCLE_KEYS = new Set(['onMount', 'onUnmount']);

  export function classifyField(renderer: RendererDefinition, key: string): SchemaFieldRule {
    if (LIFECYCLE_KEYS.has(key)) {
      return { key, kind: 'ignored' }; // 阻止进入 eventActions
    }
    // ... 现有逻辑
  }
  ```

  这确保 `onMount`/`onUnmount` 不会被 `/^on[A-Z]/` 规则误归类为 event。

- [x] 在 `schema-compiler.ts` 的 `compileSingleNode` 中，在现有 `for (const key of Object.keys(schema))` 循环之前或之后，单独提取 lifecycle 字段：
  ```ts
  const lifecycleActions = extractLifecycleActions(schema);
  // schema 中 onMount/onUnmount 已被 classifyField 标记为 ignored，
  // 所以不会进入 eventActions 或 props，只需单独提取
  ```
- [x] 将 `lifecycleActions` 写入编译结果（仅当 `onMount` 或 `onUnmount` 存在时才赋值，否则为 `undefined`）：
  ```ts
  return {
    // ... 现有字段
    lifecycleActions: lifecycleActions ?? undefined,
  };
  ```

Exit Criteria:

- [x] `onMount`/`onUnmount` 不出现在 `CompiledSchemaNode.eventActions` 或 `eventKeys` 中
- [x] 声明了 `onMount` 的节点，`lifecycleActions.onMount` 非空
- [x] 没有声明 lifecycle 的节点，`lifecycleActions` 为 `undefined`（非空对象）
- [x] `pnpm typecheck` 和 `pnpm test` 通过

### Phase 3 - NodeRenderer：统一处理 lifecycle actions

Status: completed
Targets: `packages/flux-react/src/node-renderer.tsx`

- [x] 在 `NodeRenderer` 中增加 lifecycle 处理，**仅在 `lifecycleActions` 非空时注册 useEffect**：

  ```ts
  const lifecycle = props.node.lifecycleActions;

  useEffect(() => {
    if (!lifecycle) return;
    if (lifecycle.onMount) {
      void helpers.dispatch(lifecycle.onMount);
    }
    return () => {
      if (lifecycle.onUnmount) {
        void helpers.dispatch(lifecycle.onUnmount);
      }
    };
  }, [lifecycle, helpers]);
  ```

  关键点：当 `lifecycleActions` 为 `undefined` 时，React 的 `useEffect` 仍然会注册，但由于 `if (!lifecycle) return` 会立即返回空 cleanup，实际开销极小。如果后续需要进一步优化，可以考虑在 `NodeRenderer` 外层条件判断是否渲染 lifecycle wrapper 组件。但当前的判断式 overhead 是可接受的，因为：
  - 大量节点是 static 的，走 `isStatic` fast path，根本不会进入 `NodeRenderer` 的 effect 逻辑
  - 非静态节点本身已有其他 useEffect（scope subscription），多一个轻量判断的边际成本为零

Exit Criteria:

- [x] 声明 `onMount` 的组件在挂载时触发 dispatch
- [x] 声明 `onUnmount` 的组件在卸载时触发 dispatch
- [x] 未声明 lifecycle 的组件不产生任何 lifecycle action dispatch
- [x] `pnpm test` 通过

### Phase 4 - 事件传递标准化

Status: completed
Targets: `packages/flux-react/src/helpers.tsx`, `packages/flux-renderers-basic/src/button.tsx`, 所有含 `onClick`/`onChange`/`onSubmit` 的渲染器

- [x] 在 `helpers.tsx` 的 `mergeActionContext` 中增加事件规范化逻辑：如果传入的 event 是 React SyntheticEvent，提取 `nativeEvent`、`currentTarget`、`target`、`type`、`preventDefault`、`stopPropagation` 构造 `FluxActionEvent`
- [x] 修改 `button.tsx`：`onClick={(e) => void props.events.onClick?.(e)}`（传递原生 React 事件）
- [x] 审计所有渲染器中的事件调用点，统一传递原生事件参数（而非丢弃）
- [x] 确保现有测试不被事件参数变更破坏（因为 `mergeActionContext` 已处理规范化）

Exit Criteria:

- [x] 所有渲染器的 `onClick`/`onChange`/`onSubmit` 回调均传递原生事件参数
- [x] `ActionContext.event` 在 action dispatch 时非空且为 `FluxActionEvent`
- [x] `pnpm test` 通过

### Phase 5 - Chart Renderer 注册 DOM ref

Status: completed
Targets: `packages/flux-renderers-data/src/chart-renderer.tsx`, `packages/flux-renderers-data/src/chart-schemas.ts`

- [x] 在 `ChartRenderer` 中注册 `ComponentHandle`，包含 `ref: chartRef.current`
- [x] 在 handle 的 `capabilities.invoke` 中暴露 `resize`、`setOption`、`getDataURL` 等图表操作方法
- [x] 在 `ChartSchema` 中增加可选 `componentId` 字段（用于外部定位）

Exit Criteria:

- [x] Chart 渲染器的 DOM ref 通过 `componentRegistry.resolve({ componentId })` 可获取
- [x] `handle.ref` 为 chart 容器的 `HTMLDivElement`
- [x] `pnpm test` 通过

### Phase 6 - 文档更新

Status: completed
Targets: `docs/architecture/action-scope-and-imports.md`, `docs/architecture/renderer-runtime.md`

- [x] 在 `action-scope-and-imports.md` 增加 "DOM Ref Access" 段落，说明 provider 通过 `componentRegistry.resolve()` 获取 DOM ref 的模式
- [x] 在 `renderer-runtime.md` 增加 "Event Passthrough Contract" 段落，明确渲染器必须传递原生事件的规范
- [x] 在 `renderer-runtime.md` 增加 "Lifecycle Actions" 段落，说明 `onMount`/`onUnmount` 的编译时处理和运行时行为
- [x] 更新 `docs/references/renderer-interfaces.md`（如存在）中 `ComponentHandle` 的文档

Exit Criteria:

- [x] DOM ref 获取模式、事件传递契约、lifecycle action 机制在文档中有明确说明
- [x] 文档中的代码示例与实际接口一致

## Validation Checklist

- [x] `ComponentHandle.ref` 可被 provider 通过 `ctx.componentRegistry.resolve()` 获取
- [x] `ActionContext.event` 在按钮点击、表单提交等场景下为非空 `FluxActionEvent`
- [x] 声明 `onMount`/`onUnmount` 的组件正确触发 lifecycle action dispatch
- [x] 未声明 lifecycle 的组件 `CompiledSchemaNode.lifecycleActions` 为 `undefined`，不产生 dispatch
- [x] `onMount`/`onUnmount` 不出现在 `eventActions` 或 `eventKeys` 中
- [x] 现有 form handle、table handle 不受 `ref` 字段新增影响（向后兼容）
- [x] 现有 form `initAction` 不受 lifecycle 机制影响（两者共存）
- [x] `pnpm typecheck` 通过
- [x] `pnpm build` 通过
- [x] `pnpm lint` 通过
- [x] `pnpm test` 通过
- [x] `docs/logs/` 已更新

## Closure

Status Note: The live repo now matches the plan's intended contract: structured action events, compiled lifecycle actions, normalized event passthrough, component-handle DOM refs, chart handle registration, and matching architecture/reference docs are all landed and verified.

Follow-up:

- 后续可基于此 DOM ref 通道实现 ECharts provider、Monaco provider 等具体 import 模块
- 后续可评估是否为 `ImportedNamespaceContext` 增加 `getElement(componentId: string)` 便捷方法
- 后续可按需扩展 `onUpdate`、`onVisible` 等更多生命周期钩子
