# ScrollMask 组件设计

> Source: plan 668（M10b，2026-10-20）；roadmap 裁定：通用件落 ui 层，不占 mobile 包红线

## 1. 组件定位

- `ScrollMask` + `useScrollMask` 是横向/纵向**滚动容器两端渐隐提示**（「还有内容」）：滚动位置检测（hook）与渐隐展示（组件）分离。
- 归属 `@nop-chaos/ui`（通用件，桌面/移动通用）。

## 2. API

```typescript
function useScrollMask(
  ref: RefObject<HTMLElement | null>,
  axis?: 'x' | 'y',
): {
  startMask: boolean; // 起始方向仍有内容（未滚到起点）
  endMask: boolean; // 结束方向仍有内容（未滚到终点）
};

interface ScrollMaskProps {
  state: { startMask: boolean; endMask: boolean };
  axis?: 'x' | 'y'; // 默认 'x'
  size?: number; // 渐隐宽度 px，默认 24
  className?: string;
}
```

- hook 监听 scroll（passive）+ resize；内容不足一屏双 false。
- 组件纯展示：`data-slot="scroll-mask"` + `data-axis` + `data-start`/`data-end`（e2e 断言通道）；渐变颜色 `--nop-scroll-mask-color`、宽度 `--nop-scroll-mask-size`（缺省 24px）。

## 3. 用法

```tsx
const scrollerRef = useRef(null);
const mask = useScrollMask(scrollerRef, 'x');
<div className="relative">
  <div ref={scrollerRef} className="overflow-x-auto">
    …
  </div>
  <ScrollMask state={mask} axis="x" />
</div>;
```
