# useTouch Hook 设计

## 1. 定位

`useTouch` 是一个**非渲染**的通用触摸手势 Hook，为 PullRefresh、Tabs、BottomSheet、SwipeCell、Slider、Range 等交互组件提供统一的触摸事件抽象。它不是 renderer，不消费 schema，纯基础设施。

## 2. 来源 & 参考

| 来源              | 位置                                           | 行数     |
| ----------------- | ---------------------------------------------- | -------- |
| AMIS useTouch     | `amis/packages/amis-ui/src/hooks/use-touch.ts` | ~100     |
| Vant useTouch     | `vant/packages/vant-use/src/useTouch`          | 内部实现 |
| react-use-gesture | 第三方库                                       | —        |

## 3. API 设计

```typescript
interface TouchState {
  /** 触摸起始 X 坐标 */
  startX: number;
  /** 触摸起始 Y 坐标 */
  startY: number;
  /** 当前 X 偏移 */
  deltaX: number;
  /** 当前 Y 偏移 */
  deltaY: number;
  /** 偏移绝对值 */
  offsetX: number;
  /** 偏移绝对值 */
  offsetY: number;
  /** 触摸方向：'' | 'horizontal' | 'vertical' */
  direction: '' | 'horizontal' | 'vertical';
  /** 是否正在触摸中 */
  isTouching: boolean;
}

interface UseTouchOptions {
  /** 手势判定阈值，默认 10px */
  threshold?: number;
}

interface UseTouchReturn {
  /** 触摸状态（只读快照） */
  state: TouchState;
  /** 绑定到 touch 容器元素的 props */
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
  /** 重置触摸状态 */
  reset: () => void;
}
```

## 4. 手势阈值

| 参数           | 默认值 | 说明                                       |
| -------------- | ------ | ------------------------------------------ |
| `threshold`    | 10px   | 判定为滑动的最小偏移量，用于区分点击与滑动 |
| swipe 完成阈值 | 30px   | 外部消费组件按需判断                       |

## 5. 方向判定

```
水平方向: |deltaX| > |deltaY| && |deltaX| > threshold
垂直方向: |deltaY| > |deltaX| && |deltaY| > threshold
无方向:   |deltaX| <= threshold && |deltaY| <= threshold
```

## 6. 使用示例

```typescript
function PullRefresh({ children, onRefresh }: PullRefreshProps) {
  const { state, touchHandlers } = useTouch({ threshold: 10 });

  return (
    <div
      {...touchHandlers}
      style={{ transform: `translateY(${Math.max(0, state.deltaY)}px)` }}
    >
      {children}
    </div>
  );
}
```

## 7. 包归属

| 文件                     | 包                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `src/hooks/use-touch.ts` | `flux-renderers-mobile`                                                                                      |
| export                   | 从 `flux-renderers-mobile` 公共导出，供 PullRefresh、InfiniteScroll、SwipeCell、Tabs、BottomSheet 等组件消费 |

## 8. 边界情况

| 场景                 | 行为                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 快速滑动后 touchEnd  | 触发 swipe，delta 取最终值                                                                                                          |
| 滑动中途手指离开屏幕 | touchCancel 视为异常终止，reset                                                                                                     |
| 多指触摸             | 只跟踪第一个 touch                                                                                                                  |
| 嵌套滚动容器         | `useTouch` 仅判定方向（horizontal/vertical），不在 JS 层阻止滚动；手势所有权由消费组件的 CSS `touch-action` 提供（见 plan 3 MA-07） |
