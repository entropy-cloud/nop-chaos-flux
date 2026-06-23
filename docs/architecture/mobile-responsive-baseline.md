# 移动端响应式基线（Mobile Responsive Baseline）

> Status: done
> Owner: mobile mission / M0
> 关联: `docs/components/mobile-roadmap.md`（M0 工作项交付物）
> 来源: `docs/analysis/2026-06-21-amis-mobile-support-research.md`、`docs/analysis/2026-06-21-mobile-mall-component-analysis-for-flux.md`

---

## Purpose

确立 Flux 移动端响应式实现的一级约定，供所有组件在 design.md "响应式行为"小节中直接引用。本文档是 M1–M4 逐组件响应式改进的硬前置依赖。

---

## 1. 响应式断点基线

对齐 Tailwind v4 默认断点（已在 `styles.css` 中经由 `@theme inline` 启用），**不自定义**额外断点：

| 断点名称 | Tailwind 类前缀 | 最小宽度 | 典型设备                       |
| -------- | --------------- | -------- | ------------------------------ |
| `sm`     | `sm:`           | 640px    | 竖屏手机（大屏手机横屏起点）   |
| `md`     | `md:`           | 768px    | 横屏手机 / 小平板（iPad mini） |
| `lg`     | `lg:`           | 1024px   | 竖屏平板（iPad Air/Pro）       |
| `xl`     | `xl:`           | 1280px   | 桌面窄屏                       |
| `2xl`    | `2xl:`          | 1536px   | 桌面宽屏                       |

### 规则

1. **移动优先**：基础样式面向小屏，使用 `sm:` `md:` `lg:` 等前缀叠加桌面端样式。不编写独立的移动端 CSS。
2. **组件内部使用断点**：交互行为切换使用 Tailwind 响应式类（如 `hidden lg:flex`），而非全局 `mobileUI` 标志位。
3. **必要时运行时分支**：当 CSS 无法表达行为差异时（如 Select 下拉 vs BottomSheet），在组件内部使用 `useMediaQuery('(max-width: 767px)')` 做运行时分支。**不允许**预设 `mobileUI` 全局标志。
4. **amis 的 768px 断点不继承**：amis 使用 `<768px` 作为 isMobile 阈值。Flux 使用 Tailwind sm/md/lg 的 move-first 原子断点，不做单一阈值标记。

---

## 2. 安全区域适配

参考 Vant 和 AMIS 的 safe-area 处理：

### CSS 环境变量

```css
/* 标准安全区域变量，由浏览器在 notch 设备上自动注入 */
safe-area-inset-top
safe-area-inset-bottom
safe-area-inset-left
safe-area-inset-right
```

### 应用位置

| 场景            | CSS 变量                                              | 使用位置                         |
| --------------- | ----------------------------------------------------- | -------------------------------- |
| 页面顶部导航    | `padding-top: env(safe-area-inset-top)`               | `page.header` region             |
| 底部固定栏      | `padding-bottom: env(safe-area-inset-bottom)`         | `page.footer` region、底部操作栏 |
| BottomSheet     | `padding-bottom: env(safe-area-inset-bottom)`         | BottomSheet 容器                 |
| Dialog 全屏模式 | `padding-top/bottom: env(safe-area-inset-top/bottom)` | Dialog content                   |

### 辅助类

```css
/* 契约定义，归属 @nop-chaos/ui。
 * 实现状态：todo（M0.1a），当前代码库尚未实现。 */
.nop-safe-top {
  padding-top: env(safe-area-inset-top);
}
.nop-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
.nop-safe-left {
  padding-left: env(safe-area-inset-left);
}
.nop-safe-right {
  padding-right: env(safe-area-inset-right);
}
```

---

## 3. 触摸目标尺寸规范

参考 WCAG 2.5.5（Target Size）、Apple HIG、Google Material Design：

| 控制类型                                   | 最小尺寸  | 示例                         |
| ------------------------------------------ | --------- | ---------------------------- |
| 可点击控件（按钮、图标按钮、复选框、开关） | 44×44px   | Button、Checkbox、IconButton |
| 可交互列表项                               | 44px 高度 | Select option、Cell          |
| 输入框                                     | 44px 高度 | Input、Textarea              |
| 滑动控件把手                               | 44×44px   | Slider handle、Stepper +/-   |
| BottomSheet 中的选项                       | 48px 高度 | Picker item                  |

### CSS 约定

```css
/* 在组件中通过 Tailwind 类实现 */
.min-h-touch {
  min-height: 44px;
}
.min-w-touch {
  min-width: 44px;
}
.min-h-touch-lg {
  min-height: 48px;
}
```

> 这些尺寸类在 `@nop-chaos/ui` 的组件中默认启用，renderer 层无需重复声明。

---

## 4. Mobile Surface 约定

### 4.1 BottomSheet（底部弹出面板）

用于小屏 Select、TreeSelect、Picker 等选项选择场景。

| 属性     | 约定                                                            |
| -------- | --------------------------------------------------------------- |
| 打开方式 | 从底部滑入，背景半透明遮罩                                      |
| 高度     | 默认 50%（安全区域自动适配）；可拖拽或通过 schema `height` 控制 |
| 关闭方式 | 点击遮罩、下滑手势、Escape 键                                   |
| 动画     | 滑入 300ms ease-out，滑出 200ms ease-in                         |
| 阻止滚动 | 打开时阻止 body 滚动                                            |
| 安全区域 | `padding-bottom: env(safe-area-inset-bottom)`                   |

**实现位置**：复用 `@nop-chaos/ui` Sheet 组件的 mobile 变体，不新建独立组件。

### 4.2 FullScreen Dialog（全屏覆盖 Dialog）

小屏 Dialog 自动切换为全屏覆盖模式。

| 属性     | 约定                                                  |
| -------- | ----------------------------------------------------- |
| 触发条件 | 视口宽度 < 640px                                      |
| 样式     | 覆盖整个视口，无圆角，无阴影                          |
| 标题栏   | 顶部包含标题 + 关闭按钮                               |
| 过渡动画 | 从底部滑入                                            |
| 安全区域 | `padding-top/bottom: env(safe-area-inset-top/bottom)` |

**实现方式**：Dialog 组件内部通过 `useMediaQuery` + Tailwind 类 `sm:rounded-lg` / 无圆角。

### 4.3 CardStack（卡片堆叠）

小屏 Table 切换到卡片式列表。

| 属性     | 约定                                    |
| -------- | --------------------------------------- |
| 触发条件 | 视口宽度 < 768px                        |
| 布局     | 每个行数据渲染为独立卡片，垂直堆叠      |
| 卡片结构 | 左标签右值 + 底部操作栏                 |
| 参考     | AMIS CRUD2 mobileMode + Vant `van-card` |

**实现方式**：Table 组件内部 `responsive.mode: 'expand'` 扩展为卡片模式，不创建独立 `cards-table` 组件。

---

## 5. 触摸手势约定

以下手势由 `useTouch` Hook（见 `docs/components/use-touch/design.md`）统一处理：

| 手势          | 触发条件           | 使用组件                                     |
| ------------- | ------------------ | -------------------------------------------- |
| `swipe-left`  | 水平滑动 > 30px    | Tabs（切 tab）、SwipeCell（显示操作）        |
| `swipe-right` | 水平滑动 > 30px    | Tabs                                         |
| `swipe-up`    | 垂直滑动 > 30px    | PullRefresh（释放刷新）、BottomSheet（关闭） |
| `swipe-down`  | 垂直滑动 > 30px    | PullRefresh、BottomSheet                     |
| `tap`         | touch 时间 < 300ms | 可代替 click（可选）                         |

### 阈值

| 参数           | 值                                           |
| -------------- | -------------------------------------------- |
| 手势判定阈值   | 10px（区分水平/垂直）                        |
| Swipe 完成阈值 | 30px                                         |
| 触摸响应优化   | `touch-action: manipulation` 关闭 300ms 延迟 |

### 手势所有权（touch-action / overscroll-behavior）

每个监听 touchmove 的移动端渲染器必须在根元素上声明 `touch-action`，告诉浏览器该渲染器拥有的手势轴，从而避免真机上原生滚动 / overscroll / 浏览器回退手势抢夺触摸序列。`overscroll-behavior` 用于防止父滚动容器的链式滚动/回弹。这些是 CSS 提示（不是 JS 拦截），由浏览器在手势判定阶段消费。

> 语义提醒：`touch-action` 的值命名的是 **浏览器允许 pan 的轴**，而不是元素自己处理的轴。`pan-y` = 浏览器可垂直滚动、元素接收水平手势；`pan-x` = 浏览器可水平滚动、元素接收垂直手势。因此渲染器要"拥有"某轴，就必须声明**对侧**的 `pan-*`。

| 渲染器         | 根元素 `touch-action` | 根元素 `overscroll-behavior`     | 理由                                                                                     |
| -------------- | --------------------- | -------------------------------- | ---------------------------------------------------------------------------------------- |
| `pull-refresh` | `pan-x`               | `overscroll-behavior-y: contain` | pull-refresh 拥有垂直下拉：`pan-x` 让浏览器水平 pan、把垂直手势留给渲染器的 JS           |
| `swipe-cell`   | `pan-y`               | —                                | swipe-cell 拥有水平滑动：`pan-y` 让浏览器垂直 pan（页面可滚）、把水平手势留给渲染器的 JS |

> 来源：`docs/plans/2026-06-23-0655-3-mobile-ux-a11y-and-styling-hygiene-plan.md`（MA-07）。这两个值在 `packages/flux-renderers-mobile/src/{pull-refresh,swipe-cell}.tsx` 根元素 inline style 落地，并有 `getComputedStyle` 契约测试。

### 拖拽中的文本选择抑制（select-none）

水平/垂直拖拽过程中，浏览器可能选中被拖过的文本或图标，污染交互观感。监听触摸拖拽的渲染器（`swipe-cell`）在拖拽进行中（`state.isTouching`）或操作区已展开（`openState !== 'closed'`）时，对 content pane 加 `select-none` + `user-select: none`，松手/收起后清除。这仅是观感卫生，不影响可达性或契约。

> 来源：同上 plan（MA-24）。`packages/flux-renderers-mobile/src/swipe-cell.tsx` 的 content pane 在 `suppressSelect` 为真时附加该类。

---

## 6. 软键盘视口处理

| 场景                     | 行为                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------- |
| Input 聚焦               | 页面不应自动缩放，使用 `viewport meta: user-scalable=no`                                    |
| Fixed 元素（底部操作栏） | 软键盘弹起时 `position: fixed` 元素应保持在视口底部，使用 `VisualViewport` API 监听键盘高度 |
| BottomSheet + Input      | BottomSheet 内容区应可滚动，避免被键盘遮挡                                                  |
| 滚动行为                 | `overflow-y: auto` + `-webkit-overflow-scrolling: touch`                                    |

### Meta Viewport

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
/>
```

---

## 7. CSS 策略优先级

| 策略                         | 使用场景                     | 示例                                      |
| ---------------------------- | ---------------------------- | ----------------------------------------- |
| Tailwind 响应式类（主力）    | 布局变化、尺寸变化、显隐控制 | `flex-col md:flex-row`, `hidden lg:block` |
| CSS container query（辅助）  | 组件容器级自适应（未来）     | `@container (max-width: 400px)`           |
| `useMediaQuery` 运行时分支   | CSS 无法表达的行为变化       | Select → BottomSheet 切换                 |
| 传统 CSS media query（忌用） | 仅限全局布局修正             | 避免，优先用 Tailwind 类                  |

### 禁止

- ❌ 全局 `.is-mobile` / `.is-pc` 类切换（AMIS 的坏设计）
- ❌ 全局 `mobileUI` 标志位
- ❌ 独立的 `*-mobile` 组件

---

## 8. 各组件 design.md 响应式章节模板

每个组件在响应式改进时，在其 design.md 末尾添加以下结构的"响应式行为"小节：

```markdown
## 响应式行为

| 断点              | 行为           | 实现方式                                   |
| ----------------- | -------------- | ------------------------------------------ |
| < 640px (default) | [小屏行为描述] | [Tailwind 类 / useMediaQuery / 组件内分支] |
| ≥ 640px (sm)      | [中屏行为描述] |                                            |
| ≥ 768px (md)      | [桌面行为描述] |                                            |

### 触摸适配

- 触摸目标: [满足 44×44px 的控件列表]
- 手势: [使用的手势类型]
- 软键盘: [键盘弹起时的行为]
```

---

## 9. 验证方法

| 验证项       | 工具                                                 | 标准                 |
| ------------ | ---------------------------------------------------- | -------------------- |
| 触摸目标尺寸 | Playwright `page.evaluate` + `getBoundingClientRect` | > 44×44px            |
| 断点切换     | Playwright `setViewportSize`                         | 每个断点关键功能可用 |
| 安全区域     | 浏览器 DevTools 安全区域模拟                         | CSS 变量生效         |
| 键盘弹起     | 移动端真机 / BrowserStack                            | Fixed 元素不被遮挡   |

---

## 10. 移动端基础设施层（M0.1）

> 来源：`docs/analysis/2026-06-21-flux-vs-vant-full-comparison.md` §3 核查发现，Vant 的移动端成熟度很大程度来自基础设施而非组件清单。Flux 当前代码库这 4 项**均未实现**（仅本基线文档有 safe-area 约定）。本节是这 4 项的契约定义，落地工作项归 `mobile-roadmap.md` M0.1（`todo`，涉及 Protected Area，执行前必须拟 plan 经 draft review）。

### 10.1 safe-area 辅助类（M0.1a）

见 §2 辅助类。契约已定义（`nop-safe-top/bottom/left/right`），归属 `@nop-chaos/ui`，实现状态 `todo`（M0.1a）。

### 10.2 hairline 0.5px 细线（M0.1b）

高 DPI 屏（Retina）的 1px 物理边框是移动端基本要求，普通 `border: 1px` 在高 DPI 下偏粗。Vant 用 `van-hairline` mixin（`::after` 伪元素 + `transform: scaleY(0.5)`）实现。

#### 契约

```css
/* 契约定义，归属 @nop-chaos/ui 或 tailwind-preset。
 * 实现状态：todo（M0.1b），当前代码库尚未实现。 */
.nop-hairline {
  position: relative;
}
.nop-hairline--top::after,
.nop-hairline--right::after,
.nop-hairline--bottom::after,
.nop-hairline--left::after {
  content: '';
  position: absolute;
  pointer-events: none;
  background-color: var(--nop-hairline-color, currentColor);
}
/* 单边示例：bottom */
.nop-hairline--bottom::after {
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  transform: scaleY(0.5);
  transform-origin: bottom;
}
/* @media (-webkit-min-device-pixel-ratio: 2/3) 下 scale 比例相应调整 */
```

#### 使用约定

- 移动端列表分隔线、卡片边框、表单 hairline-bottom 用 `nop-hairline--*` 替代 `border-*`。
- 颜色通过 `--nop-hairline-color` CSS 变量主题化，默认 `currentColor` 或主题 border 色。

### 10.3 haptics 触感反馈（M0.1c）

移动端按压应有视觉反馈（opacity/缩放微动），Vant 用 `HAPTICS_FEEDBACK` class（`van-haptics-feedback`）在所有可点击组件默认启用。

#### 契约

```css
/* 契约定义，归属 @nop-chaos/ui。
 * 实现状态：todo（M0.1c），当前代码库尚未实现。 */
.nop-haptic {
  transition: opacity 0.1s ease;
  cursor: pointer;
}
.nop-haptic:active {
  opacity: 0.7;
}
```

#### 使用约定

- 高频可点击控件（`Button`、`Card`、`Cell`、`tabbar item`、`action-bar item`）默认加 `nop-haptic`。
- 不影响桌面端（桌面 `:active` 同样适用，视觉一致）。
- 可通过组件 `variant` 或 className 关闭（如不可点击状态）。

### 10.4 global z-index 栈管理（M0.1d）

当前 `packages/ui/src` 所有 overlay（dialog/drawer/sheet/popover/tooltip）都用扁平 `z-50`，**多浮层叠加时层级混乱**（如 dialog 内打开 popover、toast 盖在 dialog 上无序）。Vant 用 `useGlobalZIndex`（自增计数器，popup/dialog/toast 共享 2000+ 栈）解决。

#### 契约

```typescript
// 契约定义，归属 surface-runtime（flux-react 或 flux-runtime）。
// 实现状态：todo（M0.1d），当前代码库尚未实现。
//
// 设计要点（落地时再细化）：
// - surface-runtime 维护一个全局自增计数器，dialog/drawer/sheet/toast/popover
//   打开时各自取一个递增的 z-index，保证后打开的盖在先打开的之上。
// - 基线起始值（对齐 Vant）：2000。
// - 提供 useGlobalZIndex()（取值并自增）+ setGlobalZIndex(v)（重置，测试用）。
// - 与 surface-owner.md 的 SurfaceRuntime 集成，不重建第二套 surface 状态模型。
```

#### 优先级约定（过渡期，z-index 栈未实现前）

| 层级         | z-index 范围（建议） | 组件                               |
| ------------ | -------------------- | ---------------------------------- |
| 普通内容     | auto / 0             | page body                          |
| 固定栏       | 10–19                | page.header/footer、tabbar、sticky |
| dropdown     | 20–29                | dropdown-menu、combobox            |
| popover      | 30–39                | popover、tooltip                   |
| drawer       | 40–49                | drawer                             |
| dialog/sheet | 50–59                | dialog、sheet、bottom-sheet        |
| toast/notify | 60–69                | toast、notify                      |

> 当前代码用扁平 `z-50`，M0.1d 落地后应迁移到此分层约定。`docs/architecture/surface-owner.md` 需在 M0.1d plan 中补 z-index 章节。

#### 过渡兼容（重要）

当前 `packages/ui/src` 所有 overlay 用扁平 `z-50`，**直接切到分层会破坏现有 dialog/popover 叠加行为**。M0.1d plan 必须含一个**"现有 z-50 平滑迁移"Phase**：

1. 先实现 `useGlobalZIndex()` 自增计数器（新 overlay 取递增值）。
2. 把 dialog/drawer/sheet/popover/tooltip 各自的 `z-50` 改为从 `useGlobalZIndex()` 取值，**保持初始值落在原 z-50 附近**（如基线 2000 对应 z-50 语义），确保单浮层行为不变。
3. 再逐步验证多浮层叠加（dialog 内 popover、toast 盖 dialog）按分层表正确。
4. **禁止**在迁移完成前混用扁平 `z-50` 与分层值（会产生新 bug）。

分层表是**目标约定**，迁移路径由 M0.1d plan 具体化。

### 10.5 M0.1 与 M1–M5 的关系

| M0.1 子项        | 软前置对象                                                             | 不阻塞谁               |
| ---------------- | ---------------------------------------------------------------------- | ---------------------- |
| M0.1a safe-area  | M3a（page header/footer）、M5a（pull-refresh）                         | M1/M2/M4               |
| M0.1b hairline   | M4b（cards/list 分隔线）                                               | 其余                   |
| M0.1c haptics    | **M5 全部**、M2c（button）、M3a（tabbar/navbar/action-bar/submit-bar） | M1/M2a/M2b/M3b/M4a/M4c |
| M0.1d z-index 栈 | **M5 全部**、M1c（dialog/drawer）、M1a（bottom-sheet）                 | M1b/M1d/M2/M3b/M4b     |

> M0.1 整体是 M1–M5 的**软前置**（不硬阻塞 todo 推进），但 M5 与 M1c/M1a 落地前最好先有 M0.1c + M0.1d。
