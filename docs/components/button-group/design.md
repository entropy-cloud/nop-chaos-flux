# Button Group 组件设计

## 1. 组件定位

- `button-group` 是一组动作按钮的容器 renderer。
- 它负责动作聚合与视觉分组，不负责菜单弹层或复杂状态 owner 语义。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `button-group`。
- `button-toolbar` 不作为第二个 canonical type 保留，应由 `button-group` 和自然的 `toolbar` region/composition 承接。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'button-group'`
- 归属 `@nop-chaos/flux-renderers-layout`

## 4. schema 设计

- 建议正式字段为 `items`、`orientation`、`variant`、`size`、`selectionMode`、`value`、`defaultValue`。

## 5. 字段分类

- `items`、`orientation`、`variant`、`size`、`selectionMode`、`value`、`defaultValue`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- 首版优先使用 `items` 值配置，而不是开放自由 regions。

## 7. 运行期状态归属

- 若支持 toggle-like 选中态，应明确为自身交互状态；普通纯动作组则无复杂 owner 状态。
- `value` / `defaultValue` 是**初始种子**（seed only）：selection 为 **local controlled state**（renderer 自维护），运行时改 `value` 不会移动选中（非响应式）。这是诚实裁定（per-component Decision (B) 文档化为 local-only，见 `docs/plans/2026-06-25-0510-2-new-package-advertised-contract-and-lifecycle-honesty-plan.md` WS-A）——button-group 不声明 `valueOwnership`/`valueStatePath`，不暗示受控/scope 能力。若未来需要运行时受控选中，应引入显式 ownership 契约**并同时实现**响应式读/写（对齐 steps/collapse canonical duo），再恢复受控语义——不得保留误导性死契约。

## 8. 事件、动作与组件句柄能力

- 推荐最小事件为 `onChange`。

## 9. 数据源、表达式、导入能力接入点

- `items` 可由表达式或 loader 归一化结果提供。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-button-group` marker。
- 视觉层复用 `@nop-chaos/ui` ButtonGroup。

## 11. 实现拆分建议

- item 归一化、toggle 状态桥接和 primitive 适配分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是把普通 action 分组和 toggle-like value owner 混成同一套模糊协议。
