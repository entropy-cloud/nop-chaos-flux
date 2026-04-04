# 复杂控件平台协议

> Status: active — 2026-04-04
> Source: Plan `docs/plans/33-complex-control-platform-convergence-refactor-plan.md`

## 1. 目的

本文定义跨复杂控件（Flow Designer、Spreadsheet、Report Designer、Word Editor）共享的宿主桥接、会话、命名空间注册和异步动作协议。这些协议是各域核心能力的最小公分母；各 domain 保留自身的文档模型和底层引擎。

## 2. 包归属

| 能力 | 放置位置 | 理由 |
|------|---------|------|
| 纯协议类型 + 无副作用 helper | `@nop-chaos/flux-core/src/workbench/` | 可被 React 侧和非 React 侧共享 |
| React host wiring helper | `@nop-chaos/flux-react/src/workbench/` | 依赖 React hooks |
| 视觉壳 `WorkbenchShell` | `@nop-chaos/flux-react/src/workbench/` | 保持 React-level presentational API |
| 独立 package | 仅当 visual shell API 稳定且明显超出 flux-react 职责时才创建 |

## 3. `DomainBridge<TSnapshot, TCommand, TResult>`

最小泛型桥接协议，所有复杂控件 bridge 均应实现或通过 wrapper 适配：

```ts
export interface DomainBridge<TSnapshot, TCommand, TResult> {
  getSnapshot(): TSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: TCommand): Promise<TResult>;
}
```

### 3.1 已有实现与映射

| Domain | Bridge 类型 | 实现 |
|--------|-------------|------|
| Spreadsheet | `SpreadsheetBridge` | 直接实现 `DomainBridge<SpreadsheetHostSnapshot, SpreadsheetCommand, SpreadsheetCommandResult>` + `getCore()` |
| Report Designer | `ReportDesignerBridge` | 扩展 `SpreadsheetBridge`，附加 `getDesignerSnapshot()` / `dispatchDesigner()` / `getDesignerCore()` |
| Flow Designer | 无独立 bridge 类型 | 通过 `DesignerCore` 的 `subscribe` / `getSnapshot` / `dispatch` 可适配为 `DomainBridge`，目前由 `designer-page` 内部处理 |
| Word Editor | 无 bridge | 通过 `CanvasEditorBridge` + `editorStore`组合；暂无统一 `DomainBridge` 包装 |

## 4. `WorkbenchSessionState`

描述工作台会话的横切状态，可由各域 bridge/snapshot 派生或独立维护：

```ts
export interface WorkbenchSessionState {
  dirty: boolean;
  busy: boolean;
  canUndo: boolean;
  canRedo: boolean;
  leaveGuardActive: boolean;
}
```

## 5. `BusyActionState`

异步主动作的标准状态机，用于表示 preview、save、export 等动作的执行态：

```ts
export type BusyActionPhase = 'idle' | 'running' | 'done' | 'error';

export interface BusyActionState {
  phase: BusyActionPhase;
  error?: unknown;
}
```

### 5.1 异步主动作规范

1. 进入 `running` 时触发按钮 disable / stop 切换（防重入）
2. 完成后进入 `done`，若有错误进入 `error`
3. 可取消的动作需在 `running` 时暴露 stop 入口
4. 结果反馈通过宿主 `notify` 或内联状态面板，不阻断其他操作

## 6. `ResourceBrowserInteractionPolicy`

资源面板（字段面板、片段库、模板库等）的交互约定：

```ts
export interface ResourceBrowserInteractionPolicy {
  primaryAction: 'select' | 'insert';
  supportsKeyboard: boolean;
  supportsDragAndDrop: boolean;
  secondaryActions: Array<'edit' | 'delete' | 'more'>;
}
```

规则：
- 主点击负责选中或插入（不能将 drag-and-drop 作为唯一入口）
- 编辑/删除/更多操作作为次级动作（悬停或右键）
- 必须提供键盘等价路径（e.g. click-to-insert / Enter to insert）

## 7. Host Scope 注入约定

复杂控件 page-renderer 应使用 `useHostScope` 在 Flux schema 片段中暴露只读快照字段：

```ts
const hostScope = useHostScope(scopeData, props.path, 'designer');
```

挂载规则：
- 只读快照投影（`doc`、`selection`、`activeNode`、`activeEdge`、`runtime` 等）放进 host scope
- 写操作必须通过 namespaced action（`designer:*`、`spreadsheet:*`、`report-designer:*` 等）提交
- schema 层不得直接持有 core store 引用

## 8. Namespace Action 注册约定

所有复杂控件 page-renderer 应在 `useLayoutEffect` 中注册对应 namespace：

```ts
useLayoutEffect(() => {
  if (!actionScope) return;
  return actionScope.registerNamespace('designer', provider);
}, [actionScope, provider]);
```

Namespace 命名规则：
- Flow Designer：`designer:*`
- Spreadsheet：`spreadsheet:*`
- Report Designer：`report-designer:*`
- Word Editor：`word-editor:*`（计划中）

## 9. Session / Dirty / Leave-guard 约定

1. 每个工作台 page-renderer 应通过 bridge snapshot 的 `dirty` 字段暴露未保存状态
2. Leave-guard（离开前确认）应通过宿主层 `leaveGuardActive` 语义控制，而不是各自实现不同的 `beforeunload` 逻辑
3. 保存动作必须通过 command dispatch（e.g. `report-designer:save`）而不是 renderer 直接调用 store 方法

## 10. 当前实现状态矩阵

| 能力 | Flow Designer | Spreadsheet | Report Designer | Word Editor |
|------|--------------|-------------|-----------------|-------------|
| `DomainBridge` 实现 | 内部（DesignerCore 可适配） | ✓ `SpreadsheetBridge` | ✓ `ReportDesignerBridge` | ✗ 待接入 |
| Host scope 注入 | ✓ `useDesignerHostScope` | 通过 region data | 通过 region data | ✗ 无（非 Flux renderer） |
| Namespace action 注册 | ✓ `designer:*` | ✓ `spreadsheet:*` | ✓ `report-designer:*` | ✗ 无（非 Flux renderer） |
| Session/dirty/leave-guard | 通过 `isDirty` snapshot | 通过 `dirty` snapshot | 通过 `dirty` snapshot | ✓ `isDirty` + `handleBack` leave-guard |
| 真实 canvas 默认挂载 | ✓ | fallback when no body | ✓ `ReportSpreadsheetCanvas` | ✓（直接渲染） |
| toolbar ↔ core 命令面对齐 | ✓ | ✓ | ✓ undo/redo/save/stopPreview 命令已实现 | ✓ `RibbonToolbar` + `handleSave` |
| `WorkbenchShell` 复用 | ✓ 已迁移 | ✗ 自有布局 | ✓ 已迁移 | ✓ 已迁移 |
| datasets 保存边界 | N/A | N/A | N/A | ✓ `saveDatasets`/`loadDatasets` 已接线 |

## 11. 参考实现基线（Phase 2 结论）

Flow Designer 的 `designer-page.tsx` + `designer-context.ts` 是当前最成熟的 host wiring 参考实现：

- `useDesignerHostScope` → 等价于 `useHostScope`（Phase 1 提炼的共享 helper）
- `createDesignerActionProvider` + `useLayoutEffect` → namespace 注册模式
- `useDesignerSnapshot` → 等价于 `useBridgeSnapshot`（Phase 1 提炼的共享 helper）
- `DesignerContext` → 域内部 React context，不应被共享协议强制替换

## 12. 已完成工作

- **Phase 4** ✓：从 flow-designer 与 report-designer 共同验证后抽取 `WorkbenchShell`（完成 2026-04-04）
- **Phase 5** ✓：Word Editor 接入 `WorkbenchShell` + datasets 保存边界 + leave-guard（完成 2026-04-04）
- **Phase 6** ✓：Code Editor source-ref 解析（scope/api）、change/focus/blur 事件全部接入 Flux 事件系统，与其他字段控件对齐（完成 2026-04-04）

Plan 33 全部阶段已完成。

## Related Documents

- `docs/architecture/flow-designer/runtime-snapshot.md` — Flow Designer 快照与 host scope 现状
- `docs/architecture/report-designer/design.md` — Report Designer 架构与当前实现状态
- `docs/architecture/code-editor.md` — Code Editor 字段控件声明面收口
- `packages/flux-core/src/workbench/` — 协议类型
- `packages/flux-react/src/workbench/` — React host wiring helpers
