# IndexBar 组件设计

> Source: plan 668（M10a，2026-10-20）；交互基线 `docs/analysis/2026-10-19-mobile-advanced-libs-deep-research.md` §4.5（tdesign indexes 非 passive touchmove/elementFromPoint 定位）

## 1. 组件定位

- `index-bar` 是**字母/键索引侧栏** renderer：纵排键列表，触摸滑动定位当前键并联动目标列表滚动。归属 `flux-renderers-mobile`。
- **非弹层**：不消费 useGlobalZIndex/useLockScroll；气泡使用组件内局部 z-index。
- roadmap M10a 行两子句裁定：sticky 顶推 transform 归列表容器样式职责（out-of-scope improvement）；从尾向头方向性 v1 按键序正向（watch-only）。见 plan 668 Deferred 节。

## 2. Schema 设计

```typescript
interface IndexBarItem {
  label: string;
  value: string | number;
}
interface IndexBarSchema extends BaseSchema {
  type: 'index-bar';
  items?: IndexBarItem[];
  targetSelector?: string; // 联动滚动容器（键定位后 scrollIntoView）
  disabled?: boolean;
  onChange?: ActionSchema | ActionSchema[]; // { type:'select', index, value, label }
}
```

## 3. 定位机制

- 非 passive touchmove（原生 addEventListener，React 合成 touchmove 为 passive 无法 preventDefault——floating-panel 同款）。
- 定位：`document.elementFromPoint(x, y)` 命中元素 → `closest('[data-index-key]')` 解析当前键；未命中键时**几何 fallback**（遍历键 rect 含 y / 钳制首末键——真实浏览器 rect 可用；happy-dom 无布局由单测 stub elementFromPoint 覆盖，calendar-drag-drop-visual.test.tsx 先例）。
- 侧栏 touch-action: none。

## 4. DOM markers

`nop-index-bar` + `data-slot="index-bar"`；键 `index-bar-key` + `data-index-key` + `data-active`（触摸中高亮）+ `data-selected`（释放后持久选中，e2e 断言通道）；气泡 `index-bar-bubble`（组件内局部 z-index）。

## 5. 联动契约

- `targetSelector` 命中容器内 `[data-index-anchor="{index}"]` → `scrollIntoView({ block: 'start' })`（原生滚动全部可滚祖先）；未命中 no-op 不抛错。
- 消费布局约定：侧栏与联动列表同处一个 bounded 容器（列表用自身 scroller 或父容器滚动均可）。

## 6. 边界情况

| 场景                  | 行为                                  |
| --------------------- | ------------------------------------- |
| items 空              | 渲染 null                             |
| disabled              | 冻结触摸响应                          |
| 键间空隙定位          | 几何 fallback（rect 含 y / 钳制首末） |
| targetSelector 未命中 | no-op 不抛错                          |
