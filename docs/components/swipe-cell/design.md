# SwipeCell 组件设计

## 1. 组件定位

- `swipe-cell` 是一个**容器型** renderer，为移动端列表项提供左滑/右滑露出操作按钮的交互能力。
- 它是手势驱动的交互组件，桌面端无等价物（桌面端用右键菜单或 inline 操作按钮）。
- 典型场景：购物车左滑删除、消息列表左滑归档/删除、TODO 左滑完成。
- 它不是数据源——操作按钮的回调由 `onAction` 事件驱动。

## 2. 与 AMIS 或既有产品的能力对照

| 来源                 | 组件             | 特点                                     |
| -------------------- | ---------------- | ---------------------------------------- |
| Vant van-swipe-cell  | Vant 4           | 左右滑动露出操作按钮，支持禁用、异步关闭 |
| AMIS SwipeCell       | 无独立组件       | 未提供                                   |
| newbee-mall-vue3-app | `van-swipe-cell` | 购物车左滑删除                           |

### Flux 决策表

| 能力                       | 采纳                                    | 不采纳     | 理由                          |
| -------------------------- | --------------------------------------- | ---------- | ----------------------------- | --- | ------------ |
| 左滑露出操作按钮           | **实现**：`left` region 放置操作按钮    | —          | 核心交互                      |
| 右滑露出操作按钮           | **实现**：`right` region 放置操作按钮   | —          | 对称设计                      |
| 滑动阈值控制               | **实现**：`threshold`（px）             | —          | 控制触发灵敏度                |
| 禁用滑动                   | **实现**：`disabled`                    | —          | 标准布尔                      |
| 异步关闭（操作后自动回弹） | **实现**：配合 action 的 `onClose` 事件 | —          | 操作完成后回弹                |
| 点击外部自动关闭           | **实现**：`closeOnOutside`（默认 true） | —          | 标准交互                      |
| 滑动方向锁定               | **实现**：`direction: 'left'            | 'right'    | 'both'`                       | —   | 限制可滑方向 |
| amis 组件级 `api`          | —                                       | **不采纳** | 请求下沉 data-source + action |
| 嵌套 SwipeCell             | —                                       | **不采纳** | 不支持嵌套，避免手势冲突      |

## 3. Flux 中的 renderer/type 定义

- `type: 'swipe-cell'`
- `sourcePackage: '@nop-chaos/flux-renderers-mobile'`
- regions: `body`（主体内容）、`left`（左滑操作区）、`right`（右滑操作区）

## 4. Schema 设计

```typescript
interface SwipeCellSchema extends BaseSchema {
  type: 'swipe-cell';
  /** 主体内容 region */
  body?: SchemaInput;
  /** 左滑露出的操作区 region */
  left?: SchemaInput;
  /** 右滑露出的操作区 region */
  right?: SchemaInput;
  /** 滑动触发阈值（px），默认 30 */
  threshold?: number;
  /** 限制滑动方向 */
  direction?: 'left' | 'right' | 'both';
  /** 禁用滑动交互 */
  disabled?: boolean;
  /** 点击外部区域自动关闭，默认 true */
  closeOnOutside?: boolean;
}
```

- `body`/`left`/`right` 是 region 字段，在 renderer definition 中声明 `{ key: 'body', kind: 'region' }` 等，编译器预编译为 `props.regions.body`/`left`/`right`。

### Events

```typescript
interface SwipeCellEvents {
  /** 滑动操作触发（由操作按钮的 action 驱动） */
  onAction?: ActionSchema;
  /** 滑动状态变化 */
  onOpen?: ActionSchema;
  /** 关闭（回弹完成） */
  onClose?: ActionSchema;
}
```

## 5. 交互状态机

```
closed → sliding-left → open-left → closing
closed → sliding-right → open-right → closing
```

| 状态            | 触发                           | 表现                         |
| --------------- | ------------------------------ | ---------------------------- | ----------- | ------------------------------ |
| `closed`        | 初始 / 回弹完成                | 内容完全可见                 |
| `sliding-left`  | 水平左滑 deltaX < 0            | 内容跟手左移，露出右侧操作区 |
| `open-left`     | touchend 且                    | deltaX                       | > threshold | 内容固定在左侧，操作区完全可见 |
| `sliding-right` | 水平右滑 deltaX > 0            | 内容跟手右移，露出左侧操作区 |
| `open-right`    | touchend 且                    | deltaX                       | > threshold | 内容固定在右侧，操作区完全可见 |
| `closing`       | 点击外部 / 操作完成 / 程序调用 | 回弹动画 300ms 回到 closed   |

## 6. 触摸交互

- 使用 `useTouch` Hook 检测水平拖拽
- 仅水平方向触发（`direction: 'horizontal'`）
- 拖拽阻尼：接近操作区边缘时减速 `deltaX * 0.3`
- 松手回弹：`transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- 操作区宽度自动测量，滑动距离不超过操作区宽度

## 7. 样式与 DOM marker

```html
<div class="nop-swipe-cell" data-slot="swipe-cell" data-state="closed">
  <div data-slot="swipe-cell-left">
    <!-- left region 内容 -->
  </div>
  <div data-slot="swipe-cell-content">
    <!-- body region 内容 -->
  </div>
  <div data-slot="swipe-cell-right">
    <!-- right region 内容 -->
  </div>
</div>
```

- 根节点 `nop-swipe-cell` marker；开合状态通过 `data-state`（closed/open-left/open-right）承载
- 内部 region 仅用 `data-slot` 标识结构身份，不使用 `nop-X__region` BEM 类
- `overflow: hidden` 防止操作区在 closed 状态下可见；并配合 `inert` 真正移出可访问性树/Tab 序列（OA-08：`overflow:hidden` 只裁绘制，不阻止键盘 Tab/读屏到达屏幕外的删除按钮；非当前 open 侧的 wrapper 设 `inert`，open 时清除）
- 根节点 `touch-action: pan-y`（MA-07）：把水平手势所有权留给渲染器 JS，垂直滚动仍交给浏览器
- 拖拽中（`isTouching` 或非 closed）content pane 加 `select-none`（MA-24），避免横滑选中文字/图标
- 操作区使用 `position: absolute` 定位在 content 两侧
- 操作按钮建议使用 `Button` 组件，`size: 'sm'` 或 `size: 'md'`；点击操作区会派发 `onAction` 并自动回弹关闭（MA-09/OA-02）

## 8. 边界情况

| 场景                                                          | 行为                                                                                                                  |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| left 和 right 都为空                                          | 不渲染滑动容器，只渲染 body                                                                                           |
| 同一个 SwipeCell 内多个可滑动区域                             | 不支持嵌套，只响应最外层                                                                                              |
| 快速连续滑动                                                  | 取最终方向，忽略中途反转                                                                                              |
| 滑动过程中滚动容器                                            | 水平手势阻止垂直滚动（useTouch 方向锁定）                                                                             |
| 系统 touchcancel（多点/滚动接管/来电，2026-06-23 OA-05 裁定） | **不提交**：恢复到手势前的 `openState`（回弹），不触发 `onOpen`/`onClose`。touchcancel 与 touchend 拆分为两条独立路径 |
| disabled=true                                                 | 不响应任何触摸事件                                                                                                    |
| 另一个 SwipeCell 已打开                                       | 自动关闭前一个（需配合全局状态或父容器管理）                                                                          |
| 操作按钮点击                                                  | 触发 action 后自动回弹关闭                                                                                            |

## 9. 包归属

| 文件                | 包                                                     |
| ------------------- | ------------------------------------------------------ |
| renderer definition | `flux-renderers-mobile`                                |
| 运行时组件          | `flux-renderers-mobile/src/swipe-cell.tsx`             |
| schema              | `flux-renderers-mobile/src/schemas.ts`                 |
| useTouch Hook       | `flux-renderers-mobile/src/hooks/use-touch.ts`（共享） |

## 10. 实现拆分建议

- `SwipeCell` renderer：接收 `RendererComponentProps`，通过 `props.regions.left/right/body` 渲染三个区域
- 内部使用 `useTouch` Hook 追踪水平手势
- 滑动动画用 `transform: translateX()` + CSS transition
- 操作区宽度通过 `ResizeObserver` 观察左/右 wrapper 自动测量（OA-12：region 内容变化——异步图标、locale 长文案、条件按钮——后自动重测，不再只在挂载时测一次）
- 全局互斥（同一时间只允许一个 SwipeCell 打开）可通过父容器 scope 状态管理，不在组件内硬编码全局 store

## 11. 风险、取舍与后续阶段

- 手势与滚动容器的冲突是最常见问题：`useTouch` 仅判定方向（horizontal/vertical）做状态机分发，**不在 JS 层 `preventDefault`**；手势所有权与滚动抑制由消费组件的 CSS `touch-action` 提供（见 plan 3 MA-07）。渲染器层只负责方向判定与 `translateX`，不抢占浏览器原生滚动
- **触摸目标尺寸**：操作按钮需满足 M0 基线规范（`docs/architecture/mobile-responsive-baseline.md` §3）的 44×44px 最小尺寸
- 后续可考虑增加 `autoClose` timeout（无操作自动回弹）
- 与 `pull-refresh` 共用 `useTouch`，需确保手势不冲突（水平 vs 垂直方向分离）
