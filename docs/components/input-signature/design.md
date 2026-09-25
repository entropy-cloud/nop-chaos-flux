# input-signature

> Status: runtime（missing-components L2.3，plan 507，2026-09-25 flip）
> Owner package: `@nop-chaos/flux-renderers-form`
> 基准: Vant Signature / Form.io Signature（均不含指针压感线宽）

## 1. 组件定位

手写签名控件：在 canvas 上以鼠标/触摸/笔指针绘制签名，值 = 当前画布位图的 PNG dataURL 字符串。用于审批签名、收据确认等场景。**值语义不变式：零笔画 ⇔ 值 undefined**——初始未绘制、undo 撤销至零笔画、clear 三条路径一致提交 `undefined`，任何笔画集变化都以当前位图重新提交。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无直接对位 type。Vant Signature：固定 lineWidth、笔色/背景可配、导出 PNG。Form.io Signature（signature_pad）：速度调宽、导出 dataURL。本实现取公共核心：pointer events 绘制 + 逐笔画撤销 + 清空 + PNG dataURL 值；压感线宽（roadmap 行压缩措辞「笔迹压感取消」中的「压感」）与速度调宽均不在 v1（两基准亦无压感）。

## 3. Flux 中的 renderer/type 定义

`type: 'input-signature'`，定义于 `renderers/signature-renderer-definitions.ts`（`inputSignatureRendererDefinition`），组件 `InputSignatureRenderer`（`renderers/signature-renderer.tsx`），`wrap: true`。

## 4. schema 设计

```json
{
  "type": "input-signature",
  "name": "signature",
  "label": "签名",
  "penColor": "#1f2937",
  "penWidth": 2,
  "height": 160,
  "backgroundColor": "#ffffff",
  "clearable": true
}
```

`InputSignatureSchema` extends InputSchema（`src/schemas-signature.ts`）。`backgroundColor` 以 CSS 背景呈现于画布元素；导出的 PNG 为透明背景（v1 裁决：位图不含合成背景，便于叠放场景）。`value` 为只绑定输出值（初值可用于回显）。

## 5. 字段分类

- 值字段：`name`（必绑）、`value`（PNG dataURL 字符串 | undefined）。
- 呈现 prop：`label`/`penColor`/`penWidth`/`height`/`backgroundColor`/`clearable`/`description`/`readOnly`/`required`/`disabled`。

## 6. regions 与 slot 约定

无 region。

## 7. 运行期状态归属

- 值：form 字段（`stringAdapter`）。
- 笔画集（`StrokePoint[][]`）、绘制中标记：组件内部 ref，零 scope 写入。
- 画布位图：canvas 元素自身；**画布尺寸一次定型**（容器 CSS 宽 × `height` × devicePixelRatio；后续重跑不再重设 `canvas.width`——重赋值会清空位图）。

## 8. 事件、动作与组件句柄能力

组件句柄：`clear`（清空笔画并提交 undefined）、`reset`（回绑当前值）。绘制经原生 pointer 事件（pointerdown/move/up/cancel/leave 绑定于 canvas 元素，不经 React 合成委派）。

## 9. 数据源、表达式、导入能力接入点

无外部数据源。初值回显：非空 dataURL 经 `Image` 异步解码后 `drawImage` 回绘（仅外部供给值触发；自身提交值经 `lastCommittedRef` 识别跳过）；解码失败（onerror）→ 画布保持空白、值保留原字符串不崩（signature-invalid-echo）。IO 零需求（INV-1/2 不涉）。

## 10. 样式与 DOM marker 约定

Widget 自建样式。marker：`nop-input-signature-field` 根类 + `data-slot="signature-canvas|canvas-wrap|toolbar|undo|clear|unsupported|readonly-overlay"`；`data-unsupported` 标记降级态；无 BEM。

## 11. 实现拆分建议

单文件 `signature-renderer.tsx`（定义模块分立 `signature-renderer-definitions.ts`，503 atoms 先例）。关键工程点：①绘制事件绑定为 canvas 原生 `addEventListener`（React 合成委派在本形态下有信任事件投递缺口）；②`pointerdown` 上 `preventDefault()` 抑制兼容性 click 合成；③笔画结束后 400ms 内的 document 捕获期一次性 click 吞除器——防止笔画收笔的布局位移把浏览器合成 click 丢进滚到指针下的工具条按钮（undo 误触根因）；④绘制坐标 = getBoundingClientRect 相对值 × DPR scale；⑤单点笔画以 arc 圆点渲染（零长度线段不渲染）。

## 12. 风险、取舍与后续阶段

- v1 取舍：无压感线宽、无速度调宽、无 JPG 导出/裁剪/高清倍率；画布尺寸一次定型（容器 resize 不重排位图——重排会清空已签名内容，登记 Follow-up）。
- 风险：宿主无 2d context（测试/SSR）→ 降级占位（signature-unsupported），工具条隐藏、值保持 undefined。

## 13. 响应式行为

画布宽度随容器；高度由 `height` prop。窄容器布局无特殊分支。
