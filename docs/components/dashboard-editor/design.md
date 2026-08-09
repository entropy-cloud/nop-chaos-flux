# dashboard-editor 设计

> 状态：本文只描述当前最新设计状态（最终方案、选择原因、拒绝的替代方案）。
> 组件：`@nop-chaos/flux-renderers-dashboard`（运行态 `dashboard` + 编辑态 `dashboard-editor`），
> 编辑内核：`@nop-chaos/editor-core`。

## 1. 定位

BI 看板编辑能力：**运行态**把布局 JSON 渲染为网格面板（KPI/chart/table 等面板类型）；
**编辑态**提供拖拽/缩放/网格吸附/undo/redo/保存 的看板编辑器。编辑器三段式外壳复用
`WorkbenchShell`（flow-designer 同款装配），编辑会话由领域无关内核 `editor-core` 持有。

## 2. Schema

### 2.1 `dashboard`（运行态）

```ts
interface DashboardLayoutSchema extends BaseSchema {
  type: 'dashboard';
  panels?: DashboardPanelSchema[]; // 空 → empty region
  cols?: number; // 网格列数，缺省 12
  rowHeight?: number; // 行高 px，缺省 40
  gap?: number; // 面板间距 px，缺省 8
  height?: number; // 画布高度 px（缺省按面板底沿推导）
  empty?: SchemaInput;
}
```

### 2.2 面板坐标模型（编辑/运行同构）

```ts
interface DashboardPanelSchema extends SchemaObject {
  id: string; // 布局内唯一；选区/undo diff 锚点
  type: string; // 面板内容 renderer 类型
  title?: string; // panel chrome 标题
  x: number;
  y: number;
  w: number;
  h: number; // 网格单位（0 起）
  props?: SchemaValue; // 面板内容 schema props（表达式可用）
  source?: SchemaValue; // 数据绑定表达式 → 注入面板 fragment 的 data + source 通道
}
```

**裁定（运行态布局方案）**：自研绝对定位 + 网格对齐渲染（`panelToPixels`），**不复用** `grid`
renderer（CSS grid flow 语义，无绝对坐标）。判据：编辑态坐标 → 运行态渲染零转换，
`DashboardPanelSchema` 为坐标模型单一来源。对照结论：`grid` renderer 保留其 CSS grid flow
语义（响应式流式布局），与 dashboard 的网格吸附坐标模型语义不同，不混用（记录于
Non-Blocking Follow-ups）。

### 2.3 `dashboard-editor`（编辑态）

```ts
interface DashboardEditorSchema extends BaseSchema {
  type: 'dashboard-editor';
  layout?: SchemaValue; // 初始布局（对象或 JSON 字符串；表达式可用）
  cols?: number;
  rowHeight?: number;
  gap?: number;
  height?: number;
  mode?: 'edit' | 'preview'; // 初始模式，缺省 edit
  commitPolicy?: 'manual' | 'auto';
  onSave?: ActionSchema; // dashboard-editor:save { serialized }
  onError?: ActionSchema; // dashboard-editor:error { code, message }
}
```

## 3. 编辑内核（editor-core 集成）

- 会话文档 = `{ panels: DashboardPanelSchema[] }`（`DashboardDocument`）；网格配置经 schema
  props 传入，不属会话文档。
- **拖拽/resize 纯函数**：`layout-math.ts`（`dragPanel`/`resizePanel`/`snapToGrid`/
  `clampPanelPosition`/`clampPanelSize`/`findOverlappingPanels`/`sanitizePanels`/
  `panelToPixels`）——pointer 交互坐标全部经纯函数计算 → `core.update`（事务内不入栈）→
  pointerup `core.endTransaction()` 单 undo 步（一拖拽 = 一 undo 步，对齐 hmi transform 事务）。
- **undo/redo**：editor-core diff 命令栈（forward/inverse 增量，无全量快照）；`commit` 后栈保留
  （对齐 hmi save() 语义）；`revert`/重建清栈。
- **保存链路**：`component:save()` 句柄 / 头部 Save 按钮 → `core.commit()`（`validate` → 失败
  拒绝保留 working → `serialize` 布局 JSON）→ `dashboard-editor:save` schema 事件
  （payload `{ serialized }`）→ host 下游同步（playground：localStorage 持久化 + scope 回推）。
- **controlled push-back**：host 经 `layout` prop 回推且与 committed 不同 → dispose 旧会话重建
  （避免保存回推时误重建；`diffDashboardDocument` 判定）。
- **palette 类型清单**（以执行时已注册 renderer 为准）：`chart`/`table`/`stat-tile`/`iframe`/
  `html`/`text` 候选清单 ∩ `runtime.registry.has(type)`；未注册类型自动隐藏。
  **跨计划依赖回退结论**：`pivot-table`（plan `2026-08-09-pivot-table-vtable-wrapper-plan.md`
  review 未过，未落地）→ 不入 palette；`stat-tile`（plan `2026-08-09-bi-kpi-filter-chart-enhance-plan.md`
  已落地）→ 入 palette（已注册时显示）。
- **选区**：单面板选中（点击/拖拽落点）；画布空白处 pointerdown 清空；Delete/Backspace 删除、
  Ctrl/Cmd+D 复制（原地复制新 id）、Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z（或 Cmd+Y）undo/redo、
  Escape 清选区。
- **组件句柄**：`save`/`undo`/`redo`/`getLayout`（`useDashboardEditorHandles`，对齐 hmi
  editor 句柄注册模式）。失败路径：`not-mounted` / `no-undo` / `no-redo` / `unknown method`。

## 4. 复用点清单

| 复用面            | 来源                                               | 用途                                                                                               |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| WorkbenchShell    | `flux-react/src/workbench/workbench-shell.tsx`     | 三段式外壳（header/left/canvas/right + dialogs），对齐 flow-designer `designer-page-body.tsx` 用法 |
| editor-core       | `@nop-chaos/editor-core`                           | 会话/undo 栈/提交策略/适配器注册表                                                                 |
| 坐标纯函数        | `layout-math.ts`（自研，可单测）                   | 编辑/运行共享网格坐标模型                                                                          |
| data-source/scope | `useScopeSelector` + 表达式求值                    | 面板 props/source 表达式联动页面数据                                                               |
| 面板内容          | 现有 renderer（chart/table/stat-tile/…）           | `helpers.render` fragment 装配                                                                     |
| @nop-chaos/ui     | `Button`/`Input`/`Label`/`NativeSelect`/`Textarea` | 编辑器 UI                                                                                          |

## 5. 失败路径

| 场景                     | 触发                  | 行为                                           |
| ------------------------ | --------------------- | ---------------------------------------------- |
| dashboard-layout-invalid | 布局 JSON 缺字段/越界 | 校验降级：非法项忽略 + dev warn；全非法 → 空态 |
| dashboard-drag-out       | 拖拽面板超出画布边界  | 网格吸附到边界内（clamp）                      |
| dashboard-resize-min     | resize 小于最小尺寸   | clamp 到最小尺寸（minW=1/minH=1）              |
| dashboard-save-fail      | 保存动作失败          | commit 拒绝，working 保留，错误经 onError 透传 |
| dashboard-empty-data     | 布局为空              | empty region（运行态）                         |

## 6. INV-1~5 审计

- **INV-1（IO 边界）**：渲染器无直接 `fetch`/`localStorage`/`WebSocket` 等 IO；保存经
  `dashboard-editor:save` schema 事件交 host 持久化（playground host 层才使用 localStorage）。
- **INV-2（新 IO）**：无新 IO 类型，未扩 `RendererEnv`。
- **INV-3（复用）**：外壳复用 WorkbenchShell；undo/会话复用 editor-core（不重造）；面板内容
  复用现有 renderer；UI 全走 `@nop-chaos/ui`。
- **INV-4（内部 state 不进 scope）**：会话 working/committed/selection/mode + undo 栈由
  editor-core 域内部持有（React 侧经 `useSyncExternalStore` 投影）；保存结果经事件/host
  projection 出域，不写 scope。
- **INV-5（RendererComponentProps 契约）**：两 renderer 均 `(props: RendererComponentProps<S>)`；
  数据从 `props.props`/`meta`/`regions`/`events`/`helpers` 读取；响应式读走 selector hooks；
  无平行组件协议。

## 7. 后续项（Non-Goal 记录）

- 面板内容配置器（编辑面板内部字段建模）——后续独立评估（plan Deferred 记录）。
- dashboard 布局 JSON 与后端（nop-app）持久化协议对齐——应用层接入时。
- hmi-editor 迁移实施与外壳统一——归迁移 successor plan。
