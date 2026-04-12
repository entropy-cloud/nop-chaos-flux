# Audio 组件设计

## 1. 组件定位

- `audio` 是音频媒体 renderer。
- 它负责音频资源展示和播放控制，不承担上传、编辑或工作台语义。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `audio`。
- Flux 正式契约应优先围绕媒体 URL、播放控件和封面/标题等稳定字段。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'audio'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议正式字段为 `src`、`title`、`poster`、`autoPlay`、`loop`、`controls`。

## 5. 字段分类

- `src`、`poster`、`autoPlay`、`loop`、`controls`: `value`
- `title`: `value-or-region`

## 6. regions 与 slot 约定

- `title` 可作为音频标题展示位。

## 7. 运行期状态归属

- 播放态属于组件局部交互状态，不提升为全局 owner 语义。

## 8. 事件、动作与组件句柄能力

- 后续如需句柄，可支持 `component:play`、`component:pause`。

## 9. 数据源、表达式、导入能力接入点

- `src` 可由表达式求值。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-audio` marker。

## 11. 实现拆分建议

- 媒体标签适配、封面/标题壳分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是与上传、播放列表、复杂媒体工作台过度耦合。
