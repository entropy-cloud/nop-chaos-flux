# FloatingPanel 组件设计（含 M8c Sheet 手势关闭契约）

> Source: plan 666（M8a/M8c，2026-10-19）；交互基线 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.1（vant FloatingPanel）与 §4.6（f7 swipeToClose）

## 1. 组件定位

`floating-panel` 是移动端**多锚点可拖拽底部面板** renderer（常驻、非模态）：面板可在 `anchors` 高度档位间拖拽，内容区在面板满屏后可滚动。归属 `flux-renderers-mobile`。

## 2. Schema 设计

```typescript
interface FloatingPanelSchema extends BaseSchema {
  type: 'floating-panel';
  anchors?: number[]; // 锚点高度数组（px，升序）
  defaultHeight?: number; // 初始高度，默认吸附第一锚点
  body?: SchemaInput; // 内容 region
  disabled?: boolean;
  onChange?: ActionSchema | ActionSchema[]; // { type:'anchor', index, height }
}
```

## 3. 滚动仲裁契约（核心交互）

8 格真值表（`panel-logic.ts shouldScrollContent`，deltaY>0=下拉，逐 touchmove 重评）：

| panelAtTop | contentScrollTop>0 | 方向 | 归属         |
| ---------- | ------------------ | ---- | ------------ |
| false      | 任意               | 任意 | 面板（4 格） |
| true       | 任意               | 上拉 | 内容（2 格） |
| true       | true               | 下拉 | 内容         |
| true       | false              | 下拉 | 面板（收起） |

- 面板归属 move：非 passive 监听 `preventDefault` + 高度跟手（clamp [第一锚点, 顶锚点]）。
- 松手：`snapToAnchor`（nearest）吸附，MomentumAnimator 240ms 插值；锚点变更派发 `onChange`。
- **data-anchor 只在 settle 提交**（拖拽中不高亮）——e2e 断言通道与 onChange 前值判定共用同一 committed 语义。
- touch-action 分时：未满屏根 `none`、满屏内容区 `pan-y`。
- 局部滚动锁：M6 `useLockScroll(enabled, { localRef })` 的首个消费方（锁管穿透、面板监听管归属）。
- DOM：`nop-floating-panel` + `data-slot="floating-panel"` + `data-anchor`/`data-height`；handle 装饰条 `floating-panel-handle`；内容 `floating-panel-content`。
- 调色板：`--nop-floating-panel-bg` 覆盖变量（包 CSS 定义缺省）。

## 4. M8c：ui Sheet 手势下拉关闭契约

- 落点：`@nop-chaos/ui` 新增 `useSheetGestureClose`（body 级事件委托——Base-UI Portal 挂载时序与直接绑定竞态）+ `Sheet` 组件新可选 `gestureClose?: boolean` / `onGestureClose?: () => void`（**默认关闭，向后兼容**；Protected Area 凭据链见 plan 666 Scope）。
- 判定（f7 swipeToClose）：`(t<300 && d>20) || d > h/2` → `onGestureClose()`（app 关受控 open）；否则回弹。上拉恒不关闭。
- 拖拽期：面板 `translateY` 跟手（仅向下）+ backdrop `opacity = 1 - progress`；`--sheet-progress` 设于 portal 公共祖先；拖拽期禁用面板/backdrop 的进出场 transition，回弹时还原。
- **breakpoints 半开档位不在此实现**——多档定位是 floating-panel 锚点的职责（本计划裁定；roadmap M8c 行已注记）。
- 仅 `side=bottom` 启用；panelHeight 回退（无布局环境）取视口高 60%。
- DOM 断言：`--sheet-progress`（portal 祖先）、面板 transform、backdrop opacity。

## 5. 边界情况

| 场景                                  | 行为                     |
| ------------------------------------- | ------------------------ |
| anchors 为空/全非正数                 | 面板高度 0，不响应拖拽   |
| 满屏下拉中 scrollTop 打到 0（同手势） | 仲裁翻转，续拖变面板拖拽 |
| 惯性落点越界                          | clamp 到边界锚点         |
| disabled                              | 不响应触摸               |
