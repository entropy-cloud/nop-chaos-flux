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
/* 在 @nop-chaos/ui 或 flux-react 中提供 */
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
