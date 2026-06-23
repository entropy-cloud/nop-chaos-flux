# Dropdown Button 组件设计

## 1. 组件定位

- `dropdown-button` 是带下拉菜单的动作按钮 renderer。
- 它服务于“主动作 + 次级菜单动作”场景，不替代通用导航菜单组件。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `dropdown-button`。
- Flux 正式契约应优先对齐当前 `button` 与 menu primitive 语言，而不是复制历史 `level` / `hideCaret` 兼容面作为核心字段。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'dropdown-button'`
- 归属 `@nop-chaos/flux-renderers-layout`

## 4. schema 设计

- 建议正式字段为 `label`、`icon`、`variant`、`size`、`items`、`trigger`、`disabled`。

## 5. 字段分类

- `label`: `value-or-region`
- `icon`、`variant`、`size`、`items`、`trigger`、`disabled`: `value`

## 6. regions 与 slot 约定

- 首版优先使用 `items` 值配置，不开放额外 menu regions。

## 7. 运行期状态归属

- 打开态属于组件自身交互状态。

## 8. 事件、动作与组件句柄能力

- 可长期支持 `component:open`、`component:close`，但首版重点仍是稳定 items contract。

## 9. 数据源、表达式、导入能力接入点

- `items` 可由表达式或 loader 产出最终菜单项。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-dropdown-button` marker。
- 视觉层复用 `Button` 与 `DropdownMenu` 相关 primitive。

## 11. 实现拆分建议

- 主按钮桥接、菜单项归一化、弹层状态桥接分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是和 `button-group`、导航菜单或通用 dropdown 重新重叠。
