# Transfer 组件设计

## 1. 组件定位

- `transfer` 是双栏或双区转移选择字段 renderer。
- 它承接“候选集 <-> 已选集”语义，不替代普通 `select` 或 `checkbox-group`。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `transfer`。
- Flux 正式契约应聚焦值模型、候选项来源、已选项呈现与移动动作，不复制历史展示 mode 细节为第一优先级。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'transfer'`
- 预期归属 `@nop-chaos/flux-renderers-form`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`options`、`multiple`、`valueKey`、`labelKey`、`searchable`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`options`、`multiple`、`valueKey`、`labelKey`、`searchable`、`required`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- 首版不要求开放自由 regions。

## 7. 运行期状态归属

- 选中值归最近表单或 owner scope。
- 左右栏搜索与临时高亮属于组件内部交互状态。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onChange`。

## 9. 数据源、表达式、导入能力接入点

- `options` 可由表达式或 source-enabled value 提供。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-transfer` marker。

## 11. 实现拆分建议

- options 归一化、双栏状态桥接、值写回分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是和 `select`、`tree-select` 的能力边界再次重叠。
