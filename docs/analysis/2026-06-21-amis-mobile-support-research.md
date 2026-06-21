# AMIS 移动端页面支持机制调研报告

> 调研日期: 2026-06-21
> 源码位置: `~/app/amis-react19`
> 目的: 理解百度 AMIS 如何支持移动端页面渲染，为 Flux 移动端设计提供参考

---

## 1. 概述

AMIS 对移动端的支持采用的是**同一 schema + 运行时自适应**的策略。核心思路是：**同一套 JSON schema，同一套 renderer 注册，通过 `mobileUI` 布尔标志在运行时切换渲染行为**。不存在独立的"移动端 renderer"注册体系。

---

## 2. 移动端检测机制（5 层）

### 2.1 媒体查询检测（主路径）

**文件**: `packages/amis-core/src/utils/helper.ts:66-69`

```typescript
export function isMobile() {
  return (window as any).matchMedia?.('(max-width: 768px)').matches;
}
```

以 768px 为断点，宽度 ≤768px 视为移动端。

### 2.2 User-Agent 检测（辅助）

**文件**: `packages/amis-core/src/utils/helper.ts:71-79`

```typescript
export function isMobileDevice() {
  const userAgent = navigator.userAgent;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone|Opera Mini|IEMobile|Mobile/i.test(
    userAgent,
  );
}
```

用于少数需要判断真实设备类型而非视口宽度的场景（如动画、颜色选择器）。

### 2.3 Env 层可覆盖检测

**文件**: `packages/amis-core/src/env.tsx:111`

`RendererEnv` 接口定义 `isMobile: () => boolean` 回调，创建 AMIS 环境时可由调用方注入覆盖。

### 2.4 模块加载时静态检测

**文件**: `packages/amis-core/src/envOverwrite.ts:7-9`

在模块加载时执行一次性的 `isMobile()` 检测，用于 schema 预处理阶段的 `mobile` key 合并。

### 2.5 断点系统

**文件**: `packages/amis-core/src/utils/helper.ts:730-765`

```typescript
export function isBreakpoint(str: string): boolean {
  // xs: ≤767px, sm: 768-991px, md: 992-1199px, lg: ≥1200px
}
```

用于表格列的响应式显隐（footable 机制）。

---

## 3. `mobileUI` 标志传播链路

### Step 1: 入口计算

**文件**: `packages/amis-core/src/index.tsx:394-401`

```typescript
if (options.useMobileUI !== false) {
  props.mobileUI = env.isMobile();
}
schema = envOverwrite(schema, locale, env.isMobile() ? 'mobile' : 'pc');
```

全局选项 `useMobileUI` 默认 `true`（`factory.tsx:427`），用户可传入 `useMobileUI: false` 全局禁用。

### Step 2: Schema 预处理

**文件**: `packages/amis-core/src/envOverwrite.ts:33`

`envOverwrite()` 递归遍历 schema，当检测到节点有 `mobile` 属性时，将其合并到当前节点上：

```json
{
  "type": "form",
  "title": "Form Title",
  "mobile": {
    "title": "Mobile Form Title",
    "static": true
  }
}
```

同时在 PC 端忽略 `mobile` 属性。

### Step 3: 逐层传递

**文件**: `packages/amis-core/src/SchemaRenderer.tsx:599`

```typescript
mobileUI: schema.useMobileUI === false ? false : rest.mobileUI;
```

每个 schema 节点可单独通过 `useMobileUI: false` 退出移动端模式。

### Step 4: 组件消费

各 renderer 在渲染时读取 `mobileUI` prop，决定渲染行为。

---

## 4. 移动端适配策略（4 种）

### 策略 A：完整替换为移动端组件

当 `mobileUI=true` 时，某些表单控件直接替换为独立的移动端优化组件：

| 桌面组件                | 移动端组件                   | 切换位置                   |
| ----------------------- | ---------------------------- | -------------------------- |
| `Select`（下拉浮层）    | `SelectMobile`（全屏选择器） | `Select.tsx:1226`          |
| `Calendar`（内联/浮层） | `CalendarMobile`（底部弹出） | `CalendarMobile.tsx`       |
| `City`（级联选择）      | `CityArea`（Picker 选择）    | `InputCity.tsx:597`        |
| `MonthRangePicker`      | 移动端 CalendarMobile        | `MonthRangePicker.tsx:645` |

### 策略 B：同一组件，不同行为

常见组件通过 `mobileUI` 标志改变行为：

| 组件           | 移动端变化                                  | 位置                     |
| -------------- | ------------------------------------------- | ------------------------ |
| `Tabs`         | 启用触摸滑动切换（`onTouchStart/Move/End`） | `Tabs.tsx:96-128`        |
| `Toast`        | 单例、居中、3s 超时、隐藏关闭按钮和图标     | `Toast.tsx:135-157`      |
| `Pagination`   | 切换到简化分页器                            | `Pagination.tsx:420-421` |
| `Modal/Drawer` | 禁用 `closeOnOutside`（防止误触关闭）       | `Modal.tsx:182-191`      |
| `Slider`       | 启用触摸拖拽                                | `Slider.tsx:55-103`      |
| `InputRange`   | 不同布局、更大的触摸目标                    | `Range.tsx:527-615`      |
| `InputTag`     | 全屏选择模式、不同键盘行为                  | `InputTag (renderer)`    |

### 策略 C：CSS 类切换 `.is-mobile`

大量组件在根元素上添加 `.is-mobile` 类，SCSS 中通过该类选择器应用移动端样式：

**关键样式文件**（60+ 处引用）：

- `_input-box.scss:85` — 移除外边框，改用 `hairline-bottom`（0.5px 细线）
- `_select.scss` — 不同下拉外观
- `_checks.scss:22` — 更大触摸目标
- `_number.scss:74` — 移动端数字输入
- `_table.scss:159,727` — 表格变为卡片式列表
- `_tabs.scss:121` — 移动端标签样式
- `_combo.scss:278,302` — 组合布局
- `_collapse.scss:57,162` — 手风琴效果

**hairline-bottom mixin**（`_mixins.scss:630-647`）：通过 `::after` 伪元素实现 0.5px 细边框，适配高 DPI 屏幕。

### 策略 D：表单项布局变化

**文件**: `packages/amis-core/src/renderers/Item.tsx:1234,1521`

- 移动端不应用 `is-inline` 类（`inline && !mobileUI`）
- 移动端表单项包裹 `Form-item-controlBox` div
- 移动端隐藏 tooltip（`data-tooltip={!mobileUI ? __('delete') : null}`）

---

## 5. 移动端专用 UI 组件

| 组件            | 文件                                       | 功能                                                       |
| --------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `PullRefresh`   | `amis-ui/src/components/PullRefresh.tsx`   | 下拉刷新 / 上拉加载更多，支持 `direction:'down'` 或 `'up'` |
| `useTouch` Hook | `amis-ui/src/hooks/use-touch.ts`           | 触摸手势检测，区分水平和垂直滑动                           |
| `PopUp`         | `amis-ui/src/components/PopUp.tsx`         | 移动端底部弹出面板（bottom sheet），阻止 body 滚动         |
| `PickerColumn`  | `amis-ui/src/components/PickerColumn.tsx`  | iOS 风格滚轮选择器                                         |
| `MobileDevTool` | `amis-ui/src/components/MobileDevTool.tsx` | 编辑器中的移动设备模拟器（iPhone、iPad、Galaxy 等预设）    |

### 5.1 PullRefresh 状态机

`normal → pulling → loosing → loading → success`

由 `Page` renderer（`Page.tsx:1107-1114`）和 `CRUD2` renderer（`CRUD2.tsx:1680-1801`）消费。

### 5.2 useTouch Hook

- 追踪 `touchstart/touchmove/touchend`
- 10px 阈值区分垂直/水平手势
- 被 PullRefresh、Range、PickerColumn、Slider、Tabs 使用

---

## 6. 编辑器中的移动端支持

### 6.1 编辑态切换

**文件**: `packages/amis-editor-core/src/store/editor.ts:171,1168-1169`

- `isMobile: false`（默认）
- `setIsMobile(value?)` 切换

### 6.2 移动端预览

**文件**: `packages/amis-editor-core/src/component/Preview.tsx:652-725`

- `isMobile=true` 时使用 `IFramePreview` 替代 `SmartPreview`
- 应用 `.is-mobile-body` / `.is-pc-body` 包装类
- 通过 `key` prop 强制 remount

### 6.3 IFramePreview

**文件**: `packages/amis-editor-core/src/component/IFramePreview.tsx:93-94`

- 始终返回 `isMobile() = true`
- 传入 `useMobileUI: true`
- 使用 `<iframe>` 模拟设备尺寸

### 6.4 拖拽限制

**文件**: `packages/amis-editor-core/src/dnd/flex.ts:133,157,171,188,200`

- 移动端禁用水平拖拽
- 不同放置区域行为

---

## 7. 移动端 Schema 属性

| Schema 属性             | 定义位置                        | 说明                                             |
| ----------------------- | ------------------------------- | ------------------------------------------------ |
| `mobile` (object)       | 任意 schema 节点                | 仅在移动端生效的属性覆盖                         |
| `useMobileUI` (boolean) | `schema.ts:173`                 | 禁用该子树下的移动端 UI                          |
| `mobileCSS`             | `Page.tsx:156`                  | 仅移动端生效的 CSS                               |
| `pullRefresh`           | `Page.tsx:239`、`CRUD2.tsx:220` | 下拉刷新配置                                     |
| `mobileMode`            | `CRUD2.tsx:1493`                | 表格切换为卡片模式（`'cards'` 字符串或配置对象） |
| `breakpoint`            | `table.ts:123`                  | 表格列在不同视口的显隐控制                       |
| `swipeable`             | `Tabs.tsx:140`                  | 启用触摸滑动切换 Tab                             |

---

## 8. Renderer 注册体系

**文件**: `packages/amis-core/src/factory.tsx:151-185`

**不存在独立的移动端 renderer 注册体系**。renderer 通过 `@Renderer(config)` 装饰器或 `registerRenderer()` 统一注册，同一个 renderer 在渲染时根据 `mobileUI` prop 做分支。

---

## 9. CSS 策略总结

AMIS 采用**混合方案**：

| 方案                       | 用途                             | 占比                 |
| -------------------------- | -------------------------------- | -------------------- |
| 运行时 `.is-mobile` 类切换 | 组件级移动端样式变化             | 主力（60+ 处）       |
| 传统 CSS media query       | 布局级响应式（grid、utility 类） | 辅助（约 10 处）     |
| 运行时 JS 分支             | 组件替换或行为变化               | 关键组件（约 15 处） |

---

## 10. 架构评价

### 优点

1. **同一 schema**：无需维护两套 JSON schema，降低心智负担
2. **渐进增强**：现有组件可通过添加 `mobileUI` 分支逐步支持移动端
3. **Schema 级灵活**：`mobile` 属性提供 schema 级别的移动端覆盖能力

### 缺点（Flux 不采纳的原因）

1. **`mobileUI` 全局标志位是坏设计**：组件内部充斥 `if (mobileUI) ... else ...` 分支，增加复杂度
2. **双实现组件**（Select/SelectMobile、Calendar/CalendarMobile）导致代码重复
3. **CSS 命名空间问题**：`.is-mobile` 仅在根组件生效，深层嵌套子组件无法感知
4. **检测与渲染耦合**：768px 断点硬编码，不可配置
5. **编辑器模拟不彻底**：iframe 预览与真实移动端体验有差距

---

## 11. 对 Flux 的参考价值

| AMIS 的做法                        | Flux 的决策（来自 `mobile-roadmap.md`）                        |
| ---------------------------------- | -------------------------------------------------------------- |
| `mobileUI` 全局标志位 + 运行时分支 | **不采纳**：同组件同属性，Tailwind 响应式断点 + 必要运行时分支 |
| `SelectMobile` 双组件              | **不采纳**：不新建 `*-mobile` 组件                             |
| `PopUp` 底部弹出                   | **复用**：bottom-sheet 复用 surface runtime                    |
| `PullRefresh` 下拉刷新             | **参考**：需考虑是否内置                                       |
| Schema 级 `mobile` 覆盖            | **参考**：可考虑类似机制                                       |
| 编辑器设备模拟                     | **参考**：需规划                                               |
