# 复杂控件平台协议

> Status: active

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
| Spreadsheet | `SpreadsheetBridge` | 结构兼容 `DomainBridge<SpreadsheetHostSnapshot, SpreadsheetCommand, SpreadsheetCommandResult>`，当前未显式 `extends`，并额外暴露 `getCore()` |
| Report Designer | `ReportDesignerBridge` | 扩展 `SpreadsheetBridge`，附加 `getDesignerSnapshot()` / `dispatchDesigner()` / `getDesignerCore()` |
| Flow Designer | 无独立 bridge 类型 | 通过 `DesignerCore` 的 `subscribe` / `getSnapshot` / `dispatch` 可适配为 `DomainBridge`，目前由 `designer-page` 内部处理 |
| Word Editor | 无 bridge | 通过 `CanvasEditorBridge` + `editorStore`组合；暂无统一 `DomainBridge` 包装 |

## 4. `WorkbenchSessionState`

描述工作台会话的横切状态，可由各域 bridge/snapshot 派生或独立维护。

当前 live repo 中，这些类型首先属于 protocol-level reserved types：定义已经存在于 `@nop-chaos/flux-core/src/workbench/types.ts`，但尚无直接 runtime consumer 要求所有 host family 统一落地它们。

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

异步主动作的标准状态机，用于表示 preview、save、export 等动作的执行态。

当前 live repo 中，它同样是协议保留类型，而不是每个 host family 都已经统一接线到同一份运行时状态对象。

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

资源面板（字段面板、片段库、模板库等）的交互约定。

当前它也是 protocol-level reserved contract，用来约束跨 workbench 的交互语义，不代表所有现有 renderer 已共享同一份实现对象：

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

其中第三个参数只是 host boundary 标签，不是 schema-visible root key。

挂载规则：
- 只读快照投影（`doc`、`selection`、`activeNode`、`activeEdge`、`runtime` 等）放进 host scope
- 写操作必须通过 namespaced action（`designer:*`、`spreadsheet:*`、`report-designer:*` 等）提交
- schema 层不得直接持有 core store 引用

补充边界：

- host scope 是 **内部 host projection**，服务于宿主自己挂载的 schema 片段
- 如果宿主外部也需要读取该复杂控件的只读状态，应使用显式 `statusPath` 发布窄 summary DTO
- 不要把整份 host scope 提升为 page 全局可见字段
- 不要新增与 `statusPath` 平行的 `publishScope` 命名

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
- Word Editor：`word-editor:*`

## 9. Session / Dirty / Leave-guard 约定

1. 每个工作台 page-renderer 应通过 bridge snapshot 的 `dirty` 字段暴露未保存状态
2. Leave-guard（离开前确认）应通过宿主层 `leaveGuardActive` 语义控制，而不是各自实现不同的 `beforeunload` 逻辑
3. 保存动作必须通过 command dispatch（e.g. `report-designer:save`）而不是 renderer 直接调用 store 方法

## 10. 当前跨域基线

当前跨域 baseline 可以概括为：

- Flow Designer、Spreadsheet、Report Designer、Word Editor 都已经采用“只读 host projection + namespaced action 写入”的共同边界，而不是让 schema 片段直接持有 core store
- `designer-page`、`spreadsheet-page`、`report-designer-page` 都应把宿主摘要暴露为 projection/snapshot，而不是把 domain runtime 变成 page 全局可写对象
- `WorkbenchShell` 可以作为共享视觉壳复用，但它不是共享协议成立的前提；协议的关键仍然是 `getSnapshot/subscribe/dispatch`、host scope 投影和 namespace wiring
- Word Editor 当前也已经是 live adopter；它的内核和默认 UI 仍是 domain-owned，但 host boundary、host scope、namespace action、`WorkbenchShell` 复用边界与其他家族一致

更准确的定位应直接写清：

- Flux 本身仍首先是执行/runtime 内核
- 但它已经为一个**通用异构设计器内核**提供了统一的 runtime 支撑
- 共享的是 host boundary、host projection、namespaced action、`WorkbenchShell`、selection-aware inspector 与 per-family override contract 这些 runtime 支撑面
- 不共享的是每个 designer 的文档模型、默认 UI、交互语义和领域 runtime

因此，Flow Designer、Report Designer、Spreadsheet、Word Editor 这些家族不是“同一页面设计器的不同插件”，而是“同一异构设计器内核之上、由 Flux runtime 提供统一支撑的不同 domain host family”

### 10.1 共享工作台边界

对于 `domain-host-renderer` + `workbench-shell` 家族，当前共享边界还包括：

- 每个 host family 自己拥有 built-in default UI 与 explicit override surfaces
- 不存在一个强制所有 designer 共享的 universal workbench baseline object
- 可见内容的默认部分由 owner renderer 自己负责；override 面只在该 family 明确开放的区域成立
- host manifest / host projection 负责宿主边界，不负责描述完整可见 UI

因此，跨 designer 可以统一的是：

- host scope 注入规则
- namespaced action 写入规则
- `statusPath` 摘要发布规则
- override surface 的“有无、优先级、作用域”这类边界表达

但不应强行统一：

- region 集合
- 默认 toolbar/panel 结构
- 每个 designer 的具体 inspector/palette/field-panel UI 组织方式

### 10.2 共享 inspector 基线

跨 designer 的 inspector 共享基线应写成最小原则，而不是厚协议：

- inspector 首先是一个 selection-aware host shell
- inspector 的实际编辑体直接就是普通 Flux `SchemaInput` / form runtime，不需要再定义一套独立 inspector DSL、provider model 或 value-adapter model
- 属性编辑 UI 的布局、tab、字段拆分/组合、`object-field` / `variant-field` 组合、以及 `transformIn/transformOut` 一类编辑适配，原则上都集中在 `inspector` 定义里
- 如果某个 selection kind 没有显式可编辑 schema，则可以不提供可编辑内容；不要为了“统一体验”强行补一个 fallback form
- 写操作仍通过 namespaced action 提交，不直接修改 host projection 或 core store 引用

DSL 优先规则：

- inspector/property editing 本身属于 Flux 已有 DSL 可以描述的问题域
- 因此规范主路径就是直接复用 `SchemaInput` / form schema，而不是再定义第二套 inspector model
- 如果要减少手写成本，优先在 JSON/schema 组装层通过元编程生成 inspector schema；对前端 Flux runtime 来说这仍然只是普通 schema
- 只有在现有 DSL 真的无法表达时，才应讨论额外 host-side 组织层，而不是先发明新的属性编辑 DSL

补充边界：

- `propContracts.shape` / `required` / `defaultValue` 这类信息属于 authored schema 语义与 parse/validate 边界
- 不要把只用于属性编辑 UI 的信息分散回普通运行时 definition；若某信息只服务 inspector，优先把它留在 `inspector` 中集中维护

这意味着：

- Flow Designer 的 `nodeType.inspector.body` / `edgeType.inspector.body`
- Report Designer 的 `cell -> form -> patch`
- 以及其他 designer 的 selection-specific schema editor

都属于同一种共享模式：selection-aware shell + schema/form body + action-based writeback。

当前更准确的统一说法是：

- 不同类型的部分（node / edge / workbook / sheet / cell / range 等）都可以拥有自己对应的 inspector schema
- inspector 的显示方式也可以由 schema/config 决定，例如 `panel` / `drawer` / `dialog`
- 但这些 mode 选项是否已经在某个 family 的 live renderer 中全部接线，必须按各 family 当前实现分别判断，不能把“schema 已设计”直接写成“全部已落地”

即使出现多 target / 多 panel / profile 组合，也应优先继续停留在 Flux DSL 框架内：通过上游 schema 组装/元编程生成最终 inspector schema，而不是在 runtime 层保留一套平行的 provider/panel descriptor 组织模型。

参考实现判断：

- Flow Designer 仍然是最成熟的 host wiring 参考族，因为它同时覆盖 host scope、namespace action、snapshot 订阅和 shell 组织
- Spreadsheet/Report Designer 证明了同一协议可以承载另一类 workbench/editor，而不需要升级为第二套平台
- `useHostScope` 的关键语义是 snapshot replacement 和投影只读，而不是“把 domain state 注入 scope 里任意读写”

## 11. Related Documents

- `docs/architecture/flow-designer/runtime-snapshot.md` — Flow Designer 快照与 host scope 现状
- `docs/architecture/report-designer/design.md` — Report Designer 架构与当前实现状态
- `docs/components/code-editor/design.md` — Code Editor 字段控件声明面收口
- `packages/flux-core/src/workbench/` — 协议类型
- `packages/flux-react/src/workbench/` — React host wiring helpers
