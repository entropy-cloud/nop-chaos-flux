# Picker 组件设计

## 1. 组件定位

- `picker` 是弹层选择字段 renderer，用来通过内嵌表单、列表或局部页面选择最终值。
- 它是 advanced form family 的选择壳，不是通用 dialog 或 table 的别名。
- **边界裁定（W4c 收敛）**：picker 是**字段值选择壳**：值 owner = 表单字段；打开态 = 复用既有 dialog/drawer surface owner（首版 pickerDialog 为配置对象，非自由 region）。picker 复用 transfer 新建的 valueKey/labelKey 归一化 helper + dialog surface，通过 handle 对外（`open`/`clear` 经 `useInputComponentHandle` 的 `openMenu`/`clearValue` slot），不重造与 dialog/table/list 平行的子系统协议。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `picker`。
- Flux 应优先用 `dialog` / `drawer` + field value owner 的组合语言表达它，而不是复制历史大而全 picker 协议。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'picker'`
- 归属 `@nop-chaos/flux-renderers-form-advanced`（roadmap 权威；本节早期写作 `flux-renderers-form` 为 drift，W4c 收敛）。随 `registerFormAdvancedRenderers` 注册。

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`options`、`valueKey`、`labelKey`、`pickerDialog`、`multiple`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`options`、`valueKey`、`labelKey`、`pickerDialog`、`multiple`、`required`: `value`
- `onPick`: `event`

## 6. regions 与 slot 约定

- 首版 `pickerDialog` 为配置对象（引用 dialog schema：title/size/placement），不开放自由 region（自由 region successor）。

## 7. 运行期状态归属

- 字段值归表单 owner；打开态归内部 surface owner。

## 8. 事件、动作与组件句柄能力

- 推荐句柄为 `component:open`、`component:clear`。picker 的 open/clear 非 item-op，**不复用** `createCompositeFieldHandle`（method-locked addItem/removeItem/moveItem）；经 `useInputComponentHandle`（`InputHandleMethod` 含 `'open'/'clear'`）的 `openMenu`/`clearValue` slot 注册，与既有 input 句柄基座一致，不重造 open/clear 协议。

## 9. 数据源、表达式、导入能力接入点

- picker 内部数据源与选择 UI 应继续复用 `dialog`、`table`、`list`、`tree` 等既有 owner 语义。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-picker` marker。

## 11. 实现拆分建议

- field bridge、surface bridge、selection result mapping 分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是重新发明一套与 dialog/table/list 平行的子系统协议——已通过复用 dialog surface（ui Dialog 组件）+ valueKey/labelKey 归一化 helper + useInputComponentHandle 句柄收敛，边界见 §1。自由 pickerDialog region 模板为首版 Non-Goal（successor）。
