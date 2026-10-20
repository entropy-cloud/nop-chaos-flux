# ImageViewer 组件设计

> Source: plan 667（M9a，2026-10-20）；交互基线 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.1（vant ImagePreview 双指触点缩放 + 缩放态冻结横翻）

## 1. 组件定位

- `image-viewer` 是**受控打开**的全屏图片预览弹层 renderer：遮罩 + 黑底 + 手势交互。
- 归属 `flux-renderers-mobile`；弹层承载复用 M7/M8 模式（useGlobalZIndex 栈位 + M6 useLockScroll）。
- 与 M8c Sheet 同一关闭所有权模式：app 自持受控 `open` 状态，viewer 经 `onClose` 请求关闭。

## 2. Schema 设计

```typescript
interface ImageViewerSchema extends BaseSchema {
  type: 'image-viewer';
  images?: string[]; // 图片 URL 列表
  open?: boolean; // 受控打开
  initialIndex?: number; // 打开页（0 基，越界钳制）
  disabled?: boolean; // 冻结手势响应（弹层仍渲染）
  onClose?: ActionSchema | ActionSchema[]; // { type:'close', index }
  onChange?: ActionSchema | ActionSchema[]; // { type:'change', index }
}
```

## 3. 手势仲裁

`resolveGesture`（viewer-matrix.ts）：

| 指针数 | 缩放态  | 手势                                                   |
| ------ | ------- | ------------------------------------------------------ |
| ≥2     | 任意    | **pinch**——双指触点中点为不动点缩放，scale clamp [1,4] |
| 1      | scale>1 | **pan**——平移图片（panClamp 边界），横翻冻结           |
| 1      | scale=1 | **page/pull-down**——横翻翻页或下拉关闭                 |

- pinchMatrix 不动点公式：ratio = clamp 后新 scale / 旧 scale；translate' = anchor − (anchor − translate)·ratio。anchor 逐 move 事件取当前双指中点重锚定（中点跟随）。
- 下滑关闭：未缩放页下拉 >120px 松手关闭；跟手 translateY。
- 双击：300ms 窗口内二次 tap，scale 1↔2（以 tap 点为中心）。
- 双指采集用 TouchEvent 以 identifier 为键的 map（不复用 useTouch：其单指 touches[0] 快照无法表达双指逐指追踪）。

## 4. DOM markers

`nop-image-viewer` + `data-slot="image-viewer"` + `data-scale`（当前缩放，e2e 双击断言通道）+ `data-index`（当前页）；图片 `image-viewer-image`；遮罩 `image-viewer-mask`（点击关闭）；页码 `image-viewer-indicator`。

## 5. 边界情况

| 场景                   | 行为                                |
| ---------------------- | ----------------------------------- |
| images 空 / open=false | 渲染 null                           |
| initialIndex 越界      | 钳制到首末页                        |
| 图片加载失败           | 浏览器破图占位，viewer 其余功能可用 |
| disabled               | 弹层渲染但手势冻结                  |
| 缩放态下拉             | 归 pan（不关闭）                    |
