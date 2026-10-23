# Context Menu（声明式右键菜单）能力设计

> 能力文档（非 retained type）。G3D 裁决与协议，plan `716-arc-g3d-context-menu-design.md`，出处 `docs/backlog/arc-component-gap-roadmap.md` §5.1 G3。实现归 G3I。

## 1. 定位

- `contextMenu` 是**meta 通道能力扩展**：任意 wrap:true 节点可在 schema 上声明右键菜单（items + action 派发），由通用 wrap 层附着监听并渲染自由定位菜单 surface。
- 不新增 retained type、不改变任何节点 DOM 结构；菜单 surface portal 至 body。

## 2. 挂载契约裁决（G3D 一票裁决）

| 候选                                                   | 结论     | 理由                                                                                                                                           |
| ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) meta 属性 `contextMenu` 能力扩展                   | **采纳** | 零新 type（无 matrix human gate）、零 DOM 结构变更、横切能力与任意 renderer 组合；META_FIELDS 是"所有节点接受"的既有通用通道                   |
| (b) wrapper 新 type                                    | 拒绝     | 新 retained type 需 matrix 增行（human gate）；包裹改变 DOM 结构与 marker/classname 契约冲突面大；右键是附着型横切能力，强制包一层违背组合习惯 |
| (c) 纯事件委托（COMMON_EVENT_FIELDS 增 onContextMenu） | 拒绝     | 事件只解决触发，不解决 items 声明与菜单 surface；缺口未闭合                                                                                    |

## 3. schema 形状

```typescript
// META_FIELDS 增列（flux-core/src/constants.ts）
contextMenu?: {
  items: ContextMenuItemSchema[];
};

type ContextMenuItemSchema =
  | { key?: string; label: string; icon?: string; disabled?: boolean;
      destructive?: boolean; visible?: boolean; action: ActionSchema }  // onClick 为兼容 fallback（对齐 dropdown-button resolveItemAction）
  | { separator: true };
```

- **形状复用、代码不复用**：item 形状对齐 `dropdown-button` items（含 `resolveItemAction` 的 action/onClick 口径与静态信封语义），但 compiled-items/信封解包逻辑归 flux-renderers-layout 包内 seam——flux-react 分层不可 import layout，G3I 在 flux-core/flux-react 可达层独立实现形状收窄。
- **meta 通道 ActionSchema**：现有 META_FIELDS 消费（when/disabled 表达式）无 action 编译先例；items 内嵌 ActionSchema 的编译与派发由 G3I 经 `useActionDispatcher`/node scope 显式补齐。

## 4. 覆盖范围

- 附着点 = wrap:true 帧根（`node-frame-wrapper`；`frameWrapMode==='none'` 不产生帧根）。
- wrap:false 节点声明 `contextMenu`：不挂监听、无菜单，开发态 console.warn 一次（Failure Path `ctx-wrap-none`）。

## 5. 触发与交互

- 触发：目标帧根 `contextmenu` 事件 / `Shift+F10` / `Menu` 键。
- 定位：clientX/Y + `useContextMenuShell` 视口钳制（VIEWPORT_MARGIN 8）。
- 关闭：item 点击（先派发 action，无论成败均关闭，失败走 env.notify）/ Escape / 外点 pointerdown。
- 键盘：shell roving 方向键 + Enter 执行。
- disabled 节点：不打开。嵌套两层均声明：最内层优先（打开后 stopPropagation）。
- item 形态首版仅 item 与 separator 两种；子菜单不做。

## 6. a11y 与 DOM

- surface：`role="menu"`；item 为原生 `<button role="menuitem" disabled?>`——shell 选择器 `[role="menuitem"]:not([disabled])` 命中原生 disabled 属性。
- marker：`data-slot="context-menu-surface"`（portal 至 body）；destructive item 走 `text-destructive` 语义色。
- 样式对齐 dropdown menu 既有视觉（bg-popover / border / shadow token）。

## 7. 边界声明

- 三个设计器画布右键（page/flow/spreadsheet）与 industrial 编辑器私有右键**不在本能力范围**，保留私有实现；后续可自愿迁移 `useContextMenuShell`（CX-16 注释已预留方向）。

## 8. 命名 pass（对照 `docs/references/naming-conventions.md`）

- 采纳 `contextMenu`（camelCase meta 字段）；拒绝 `contextmenu`（违 camelCase）、`onContextMenu`（事件名不是配置名）、`menuItems`（丢失挂载语义）。

## 9. 失败路径

| 编号              | 触发                 | 行为                                      |
| ----------------- | -------------------- | ----------------------------------------- |
| ctx-empty-items   | items 空/未声明      | 不挂 handler，无菜单                      |
| ctx-disabled-node | `meta.disabled`      | 不打开                                    |
| ctx-action-fail   | item action 派发失败 | 先派发，无论成败均关闭；错误走 env.notify |
| ctx-wrap-none     | wrap:false 声明      | 无操作 + dev warn 一次                    |
| ctx-nested        | 嵌套声明             | 最内层优先                                |

## 10. 测试面（G3I 承接，必须自动化）

右键打开 / Shift+F10 / Escape / 外点关闭 / item action 派发 / disabled 节点 / 嵌套优先 / wrap-none 无操作 / destructive 样式 / separator 渲染。
