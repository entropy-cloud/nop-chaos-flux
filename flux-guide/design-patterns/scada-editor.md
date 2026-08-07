# Scada Editor Canvas 组态编辑器

工业 HMI/SCADA **编辑态**画布组件：基于 leafer-editor 的双态编辑器（`scada-editor-canvas`，`@nop-chaos/flux-renderers-industrial/editor`）。在运行态 `scada-canvas` 之上叠加图元库面板 + 属性面板 + 工具箱 + undo/redo + 连线编辑，**与运行态严格双态隔离**（编辑操作不派发 `symbol:*` 运行事件）。

## 基础用法

```json
{
  "type": "scada-editor-canvas",
  "id": "editor-canvas",
  "width": 960,
  "height": 520,
  "mode": "edit",
  "config": {
    "version": 1,
    "variables": [],
    "symbols": [
      {
        "id": "demo-rect",
        "type": "scada-rect",
        "x": 200,
        "y": 160,
        "width": 160,
        "height": 120,
        "fill": "#1565c0"
      }
    ]
  },
  "events": {
    "onReady": { "action": "console.log", "args": { "msg": "editor ready" } },
    "onSessionChange": {
      "action": "console.log",
      "args": { "msg": "${event.canUndo}/${event.selection}" }
    }
  }
}
```

> `config` 是组态 JSON 单一字段（与 `scada-canvas` 同构）；`mode: 'edit'` 装配 leafer Editor（手柄/选区/transform），`mode: 'preview'` 退化为运行态浏览。palette/inspector/toolbox/statusBar 为 **region**（缺省内置面板，host 可经 region override 注入自定义 UI）。

## 双态隔离（R5）

编辑态与运行态共享 leafer 引擎但**事件通道隔离**：

- **编辑态适配层**（editor-adapter）抽纯 payload + nodeId，只更新 working copy 几何 + session.selection，**不派发 `symbol:click`/`symbol:hover` 运行事件**。
- 测试句柄命名空间隔离：编辑态 `window.__flux_scada_editor_<cid>`，运行态 `window.__flux_scada_<cid>`，互不覆盖。
- 工具箱操作（对齐/分布/层级/复制粘贴/导入导出）经编辑器扩展句柄 + undo 栈，**不派发 `symbol:*` action**。

## 工具箱（E9.1）

工具箱面板（`toolbox` region 缺省内容，`EditorToolboxPanel`）编排五项工具，全部复用 runtime 引擎命令面 / 序列化面 / 图元注册表（**不重复实现**）：

| 工具组     | 能力                                                                         | 复用面                                                                            |
| ---------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 视图       | fit / center / reset / zoom（+ wheel）                                       | `engine.fit/center/setViewport/zoomAt/getViewport`                                |
| 对齐/分布  | 左/右/水平居中/顶/底/垂直居中 + 水平/垂直等距（selection ≥2 对齐 / ≥3 分布） | 编辑器适配层算法（基于 selection 包围盒）+ undo 栈                                |
| 层级       | toTop/toBottom/moveUp/moveDown                                               | working copy `symbols` 数组重排（**不调 leafer Editor toTop**，与序列化往返一致） |
| 复制粘贴   | copy/cut/paste（编辑器内 clipboard，不接 OS）                                | 编辑器内 clipboard + 新 id 分配（防冲突）                                         |
| 导入导出   | export/import config                                                         | runtime 序列化 `serializeScadaConfig`/`parseScadaConfig`/`validateScadaConfig`    |
| 图元库浏览 | 24 内置图元只读                                                              | runtime `listScadaSymbols()`（只读，禁止写入）                                    |

导入弹**确认对话框**（提示「导入将清空当前编辑历史」，默认取消）→ 校验 → 替换 working copy + 重置 undo/redo 栈。

## 提交语义（save/load）

- **manual 提交**（缺省）：编辑态 working copy 与运行态不自动同步；`component:save` 序列化 working copy 返回 config 字符串（并提升 committedBaseline）；`component:load(config)` 装入外部 config 替换 working copy + 重置 session。
- 编辑器扩展句柄：`component:addSymbol` / `component:removeSymbol` / `component:updateSymbol` / `component:group` / `component:ungroup` / `component:undo` / `component:redo`（均入 undo 栈）。

## Undo/Redo

diff 命令栈（forward + inverse 增量，**无全量快照**，R4 内存约束）：transform 族经事务语义节流（一拖拽 = 一 undo 步，防逐帧入栈）；连续同方向对齐/分布/层级在合并窗口内合并为 1 步；undo/redo 往返一致。

## 测试句柄（e2e 程序化断言）

`window.__flux_scada_editor_<cid>`（恒开，与运行态命名空间隔离）：

- `session`：`workingConfig` / `committedBaseline` / `canUndo` / `canRedo` / `selection` / `mode`
- `engine` / `editor` / `app`：leafer 实例
- 操作：`switchMode` / `setSelection` / `clearSelection` / `save` / `load` / `addSymbol` / `removeSymbol` / `updateSymbol` / `group` / `ungroup` / `undo` / `redo`
- `connection`：`connect` / `disconnect` / `listConnections`（连线编辑）
- `undoRedo`：`undo` / `redo` / `getStackState` / `pushUndo`
- `toolbox`：`fit` / `center` / `zoomAt` / `align` / `distribute` / `toTop` / `copy` / `cut` / `paste` / `exportConfig` / `importConfig` / `listSymbolLibrary`

## 字段参考

| 字段                                        | 类型                                            | 说明                                                                                       |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `config`                                    | `string \| object`                              | 组态 JSON（version/variables/symbols），与 `scada-canvas` 同构                             |
| `width`/`height`                            | `number`                                        | 画布尺寸（缺省容器自适应）                                                                 |
| `mode`                                      | `'edit' \| 'preview'`                           | 编辑模式（缺省 `edit`）                                                                    |
| `commitPolicy`                              | `'manual' \| 'auto'`                            | 提交策略（缺省 `manual`）                                                                  |
| `viewport`                                  | `{ fit?: 'contain'\|'fill'; center?: boolean }` | 视口策略                                                                                   |
| `palette`/`inspector`/`toolbox`/`statusBar` | region                                          | 面板 region（缺省内置，host 可 override）                                                  |
| `events`                                    | `ScadaEditorCanvasEvents`（整体 prop）          | `onReady`/`onError`/`onSelectionChange`/`onModeChange`/`onSessionChange`/`onSave`/`onLoad` |

> 编辑器文档基线：`docs/components/industrial-hmi-editor/design-*.md`（6 份设计文档）+ `docs/analysis/industrial-hmi-editor/editing-envelope-2026-08-06.md`（编辑态包络裁定建议值）。编辑态拖拽包络 ≥30fps @ 选区 ≤1k（primary，R7 待人工最终确认）。
