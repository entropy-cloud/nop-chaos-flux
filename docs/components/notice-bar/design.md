# NoticeBar 组件设计

## 1. 组件定位

- `notice-bar` 是一个**展示型** renderer，用于显示滚动或静态的通知/公告/提示信息。
- 典型场景：活动公告、系统通知、操作提示、跑马灯广告。
- 它不是表单字段，不是交互控件，是纯展示组件。
- 它不是数据源——内容由 schema 文本或 region 提供。

## 2. 与 AMIS 或既有产品的能力对照

| 来源                | 组件              | 特点                                 |
| ------------------- | ----------------- | ------------------------------------ |
| Vant van-notice-bar | Vant 4            | 滚动模式、静态模式、多行模式、可关闭 |
| AMIS notice         | 无独立组件        | 未提供                               |
| yudao-mall-uniapp   | 自定义 notice-bar | 首页活动公告滚动                     |

### Flux 决策表

| 能力                 | 采纳                                             | 不采纳     | 理由                                                                                 |
| -------------------- | ------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------ |
| 滚动模式（marquee）  | **实现**：`scrollable: true`                     | —          | 核心交互                                                                             |
| 静态模式（多行文字） | **实现**：`scrollable: false`（默认）            | —          | 多行通知                                                                             |
| 可关闭               | **实现**：`closable: true` + `onClose` 事件      | —          | 用户可控                                                                             |
| 滚动速度             | **实现**：`speed`（px/s，默认 50）               | —          | 控制阅读节奏                                                                         |
| 滚动方向             | **实现**：`direction: 'left'`（默认）/ `'right'` | —          | 见 §5：值与运动方向**相反**（`'left'`→文本左→右移动，`'right'`→右→左移动）；锁定不变 |
| 左侧图标             | **实现**：`icon`（Icon schema 或 region）        | —          | 视觉提示                                                                             |
| 自定义内容           | **实现**：`body` region 替代默认文本             | —          | 灵活展示                                                                             |
| 点击回调             | **实现**：`onClick: ActionSchema`                | —          | 跳转详情                                                                             |
| 循环滚动             | **实现**：`loop: true`（默认 true）              | —          | 持续展示                                                                             |
| amis 组件级 `api`    | —                                                | **不采纳** | 请求下沉 data-source + action                                                        |
| 多条轮播             | —                                                | **不采纳** | 用 `loop` + 多条文本自动轮播，不引入复杂轮播逻辑                                     |

## 3. Flux 中的 renderer/type 定义

- `type: 'notice-bar'`
- `sourcePackage: '@nop-chaos/flux-renderers-mobile'`
- regions: `body`（自定义内容，替代默认文本）、`icon`（左侧图标）

## 4. Schema 设计

```typescript
interface NoticeBarSchema extends BaseSchema {
  type: 'notice-bar';
  /** 通知文本（scrollable 模式下支持多条文本自动轮播） */
  text?: string | string[];
  /** 是否开启滚动，默认 false */
  scrollable?: boolean;
  /** 滚动速度（px/s），默认 50 */
  speed?: number;
  /** 滚动方向：`'left'`（默认）文本左→右移动；`'right'` 文本右→左移动。值与运动方向相反（历史命名，锁定不变，见 §5） */
  direction?: 'left' | 'right';
  /** 是否循环滚动，默认 true（仅 scrollable 模式） */
  loop?: boolean;
  /** 是否可关闭，默认 false */
  closable?: boolean;
  /** 左侧图标 */
  icon?: IconSchema;
  /** 语义颜色变体 */
  variant?: 'info' | 'warning' | 'success' | 'error';
}
```

### Events

```typescript
interface NoticeBarEvents {
  /** 点击通知栏 */
  onClick?: ActionSchema;
  /** 关闭通知栏 */
  onClose?: ActionSchema;
}
```

### 字段分类

- `text`、`scrollable`、`speed`、`direction`、`loop`、`closable`、`variant`: `value`
- `icon`: `value`（Icon schema）
- `body`: `region`
- `onClick`、`onClose`: `event`

## 5. 滚动实现

### 滚动模式（`scrollable: true`）

- 单条文本：使用 CSS `@keyframes marquee` 或 `transform: translateX()` 动画
- 多条文本（`text: string[]`）：轮播显示，每条停留 `carouselDwell` 后切换下一条
- 计算公式：`duration = max(1, ceil((textWidth + 100) / speed))` 秒（`+100px` 缓冲保证无缝循环衔接；单位为秒；`max/ceil` 防止零/极小值）
- `loop: true` 时轮播无限循环
- `loop: false` 时滚动到末条停止
- **OA-15**：轮播切换由独立 `setTimeout` 驱动，**不依赖** marquee 动画的 `animationiteration` 事件。这样即使某条文本不溢出容器（`scrollWidth <= clientWidth`，marquee 不启动），多文本 bar 仍能正常轮播。marquee 动画只负责视觉滚动，不再驱动 index 变更
- **OA-20**：轮播停留时长 `carouselDwell` 按当前项是否溢出分流——不溢出时为固定 `CAROUSEL_INTERVAL_MS`（默认 3000ms，保留 OA-15 的非溢出轮播）；溢出时为 `max(CAROUSEL_INTERVAL_MS, 一个完整 marquee 周期)`，保证溢出项跑完一整圈再切换（否则 3000ms 会把长 marquee 截断在约 25% 处）

### 滚动方向（`direction`）

- `@keyframes nop-notice-bar-marquee`（`packages/flux-renderers-mobile/src/styles.css`）是常规的"右→左"跑马灯（`from translateX(100%) to translateX(-100%)`），`animation-direction: normal` 即右→左运动
- `direction: 'left'`（默认）→ `animation-direction: reverse` → 文本**左→右**移动
- `direction: 'right'` → `animation-direction: normal` → 文本**右→左**移动
- **OA-22 裁定**：`direction` 的值与实际文本运动方向**相反**（`'left'` 使文本向右移动），属历史命名异味。为保持公开 schema 稳定（仓库内无 schema 设置 `direction: 'right'`），Decision A 选择锁定当前映射并在此显式说明语义，不做重命名。映射由 `notice-bar.test.tsx`（MM-24）锁定；若未来要改为"值即运动方向"，需同时翻转 `notice-bar.tsx` 的 `animationDirection` 三元映射并升级 schema 版本

### 静态模式（`scrollable: false`）

- 多行文本换行显示，不滚动
- 适合较长的公告内容

## 6. 样式与 DOM marker

```html
<div class="nop-notice-bar" data-slot="notice-bar" data-variant="info" role="status">
  <span data-slot="notice-bar-icon">
    <!-- icon region 或默认 info 图标 -->
  </span>
  <div data-slot="notice-bar-content">
    <span data-slot="notice-bar-text"> 通知文本 </span>
  </div>
  <button data-slot="notice-bar-close" aria-label="关闭">
    <!-- 关闭图标 -->
  </button>
</div>
```

- 根节点 `nop-notice-bar` marker；variant 通过 `data-variant` 承载（不发 BEM 修饰符，遵循 markers 契约）
- 内部 region 仅用 `data-slot` 标识结构身份，不使用 `nop-X__region` BEM 类
- 无障碍角色按用途分流（OA-04）：绑定了 `onClick` 时根节点为 `role="button"`（可聚焦、Enter/Space 激活）；未绑定 `onClick` 时为 `role="status"`（advisory 公告，不聚焦）。不再混用 `role="alert"` 的 assertive 语义
- 滚动容器 `overflow: hidden`，内部文本 `white-space: nowrap`
- 关闭按钮使用 `@nop-chaos/ui` Button（`size: 'sm'`，icon only）
- 变体配色走主题 token，不再在组件内硬编码 Tailwind 调色板字面量（MA-06）：组件只发 `data-variant`，包 CSS（`packages/flux-renderers-mobile/src/styles.css`）用 `[data-slot="notice-bar"][data-variant="..."]` 选择 `--nop-notice-bar-*-bg/-fg` token，并带 `.dark` / `:root[data-mode='dark']` 暗色变体
- 跑马灯 `@keyframes nop-notice-bar-marquee` 也已从运行时 `document.head` 注入迁入包 CSS（MA-05），消除全局样式注入

## 7. 边界情况

| 场景                                | 行为                                                      |
| ----------------------------------- | --------------------------------------------------------- |
| `text` 为空或未提供                 | 不渲染                                                    |
| `text` 为数组但只有一条             | 按单条处理，不轮播                                        |
| `scrollable: true` 但文本不溢出容器 | marquee 不启动；多文本仍由独立 timer 轮播（OA-15）        |
| `closable: true`                    | 显示关闭按钮，点击后触发 `onClose` 并隐藏                 |
| 快速切换 `scrollable`               | 正确启停 marquee 动画                                     |
| 容器宽度变化（响应式）              | 重新计算滚动距离                                          |
| 嵌套在 SwipeCell 内                 | 滚动手势不与 SwipeCell 水平滑动冲突（垂直容器内滚动优先） |

## 8. 包归属

| 文件                | 包                                         |
| ------------------- | ------------------------------------------ |
| renderer definition | `flux-renderers-mobile`                    |
| 运行时组件          | `flux-renderers-mobile/src/notice-bar.tsx` |
| schema              | `flux-renderers-mobile/src/schemas.ts`     |

## 9. 实现拆分建议

- `NoticeBar` renderer：纯展示组件，接收 `RendererComponentProps`
- 滚动逻辑用 CSS animation 实现（性能更好），不用 JS 定时器
- 关闭状态用 React 本地 state `visible` 控制
- 多条文本轮播用 index + timeout 切换（OA-15：独立 `setTimeout`，不依赖 marquee 的 `animationiteration`；不溢出容器也能轮播；OA-20：停留时长按是否溢出分流——溢出项 `max(CAROUSEL_INTERVAL_MS, 一个完整 marquee 周期)`，不溢出项固定 `CAROUSEL_INTERVAL_MS`）
- 不需要 store 或 scope 状态——纯展示，不参与表单

## 10. 风险、取舍与后续阶段

- CSS marquee 动画在部分浏览器有兼容性问题，可降级为 `transform` + JS 计算
- **触摸目标**：关闭按钮需满足 M0 基线规范（`docs/architecture/mobile-responsive-baseline.md` §3）的 44×44px 最小尺寸
- 后续可考虑 `pauseOnHover`（桌面端鼠标悬停暂停滚动）
- 多条轮播的切换动画可后续增强（fade/slide）
