# Mapping 组件设计

## 1. 组件定位

- `mapping` 是值到展示结果的映射 renderer，用来把业务值稳定地转换成文本、badge 或小片段内容。
- 它不是通用表达式 escape hatch，也不是地图组件。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `mapping` / `map`。
- Flux 只保留 canonical `mapping` 名称，不保留 `map` 作为第二个 type 名。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'mapping'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议正式字段为 `value`、`map`、`placeholder`、`defaultLabel`、`item`。

## 5. 字段分类

- `value`、`map`、`placeholder`、`defaultLabel`: `value`
- `item`: `region`

## 6. regions 与 slot 约定

- `item` 可作为命中映射项后的可选模板区。

## 7. 运行期状态归属

- `mapping` 无复杂 owner 状态。

## 8. 事件、动作与组件句柄能力

- 首版不要求专门事件或句柄。

## 9. 数据源、表达式、导入能力接入点

- `value` 可来自表达式，`map` 也可来自静态值或 loader 归一化结果。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-mapping` marker。

## 11. 实现拆分建议

- 映射规则归一化、默认显示、可选 badge/template 投影分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是继续把 `mapping` 和“任意值渲染逻辑”混为一谈，失去稳定 contract。
