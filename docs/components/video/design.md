# Video 组件设计

## 1. 组件定位

- `video` 是视频媒体 renderer。
- 它负责视频资源展示和播放控制，不承接媒体上传或剪辑工作台能力。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `video`。
- Flux 正式契约应围绕媒体 URL、封面、控件和自动播放等稳定字段。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'video'`
- 归属 `@nop-chaos/flux-renderers-content`（roadmap 权威包分配；组件重组后从 basic 拆出）

## 4. schema 设计

- 建议正式字段为 `src`、`poster`、`title`、`autoPlay`、`loop`、`controls`、`muted`。

## 5. 字段分类

- `src`、`poster`、`autoPlay`、`loop`、`controls`、`muted`: `value`
- `title`: `value-or-region`

## 6. regions 与 slot 约定

- `title` 可作为视频标题展示位。

## 7. 运行期状态归属

- 播放态属于组件局部交互状态。

## 8. 事件、动作与组件句柄能力

- 后续可支持 `component:play`、`component:pause`。

## 9. 数据源、表达式、导入能力接入点

- `src` 可由表达式求值。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-video` marker。

## 11. 实现拆分建议

- 媒体标签适配与封面/标题壳分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是和 `image`、`carousel`、上传工作台边界重叠。
