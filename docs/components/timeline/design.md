# Timeline 组件设计

## 1. 组件定位

- `timeline` 是按时间顺序展示事件项的 renderer。
- 它是展示型集合组件，不负责流程 owner 或步骤提交语义。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `timeline`。
- Flux 应保留一个简单稳定的时间线 contract，不扩散为导航或 workflow owner。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'timeline'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议正式字段为 `items`、`mode`、`orientation`、`reverse`。

## 5. 字段分类

- `items`、`mode`、`orientation`、`reverse`: `value`

## 6. regions 与 slot 约定

- `items` 中每一项建议包含 `time`、`title`、`detail`、`icon`、`level`。

## 7. 运行期状态归属

- `timeline` 本身无复杂 owner 状态。

## 8. 事件、动作与组件句柄能力

- 首版不要求专门事件或句柄。

## 9. 数据源、表达式、导入能力接入点

- `items` 可由表达式或 loader 产出最终时间线数组。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-timeline` marker。

## 11. 实现拆分建议

- item 归一化、时间点视觉 primitive 适配、详情渲染分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是和 `steps`、`list` 混为一类，丢失时间线专有语义。
