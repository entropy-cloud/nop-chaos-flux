# BottomSheet 移动端浮层设计

## 1. 定位

BottomSheet 是移动端**浮层表面（surface）** 的一种，从屏幕底部滑入的半屏/全屏面板，用于 Select/TreeSelect/Picker 等控件在小屏下的选项选择。它不是独立 renderer，而是 `surface-runtime` family 的 mobile 变体。

## 2. 设计决策

| 决策                     | 选择                                            | 理由                                                                                                         |
| ------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 独立组件 vs surface 变体 | **surface 变体**                                | 已有 `SurfaceRuntime` / `SurfaceEntry` 模型（见 `surface-owner.md`），BottomSheet 只是该 family 的移动端外形 |
| 放在 ui 层 vs runtime 层 | **`@nop-chaos/ui` + flux-runtime surface-host** | `@nop-chaos/ui` 提供 Sheet 组件作为 UI 基座；surface-host 负责打开/关闭/状态管理                             |
| 新 type vs 隐藏行为      | **隐藏行为**                                    | Select 在移动端内部切换为 BottomSheet，不暴露 `type: 'bottom-sheet'`                                         |

## 3. 与 Surface Runtime 的关系

```
SurfaceRuntime（dialog/drawer/sheet 共享）
  ├── dialog    → `@nop-chaos/ui` Dialog
  ├── drawer    → `@nop-chaos/ui` Drawer
  └── sheet     → `@nop-chaos/ui` Sheet（BottomSheet 的 UI 基座）
       └── mobile variant ← 新增：响应式断点触发的 surface 外形
```

### 扩展 surface-owner.md

BottomSheet 遵循 `surface-owner.md` 中定义的 surface family 规则：

- `open` / `active` / `opening` / `closing` 状态归 `SurfaceRuntime`
- 不重建第二套状态模型
- closeOnOutside / closeOnEsc 等行为纳入统一 SurfaceEntry 配置

## 4. UI 表现

| 属性     | 约定                                          |
| -------- | --------------------------------------------- |
| 打开方式 | 从底部滑入（translateY 动画）                 |
| 背景     | 半透明遮罩（同 dialog overlay）               |
| 高度     | 默认 50vh；可拖拽调整；schema `height` 控制   |
| 圆角     | 顶部圆角 `rounded-t-xl`                       |
| 关闭     | 点击遮罩、下滑手势 > 30px、Escape 键          |
| 安全区域 | `padding-bottom: env(safe-area-inset-bottom)` |
| 滚动     | 内容区域可滚动；打开时阻止 body 滚动          |

### 移动端 Select 使用示例

```json
{
  "type": "select",
  "name": "city",
  "label": "城市",
  "options": [
    { "label": "北京", "value": "beijing" },
    { "label": "上海", "value": "shanghai" }
  ]
  // 无需手动指定 bottom-sheet
  // 视口 < 640px 时 Select 内部自动使用 BottomSheet
}
```

## 5. 动画

| 状态      | 动画                             | 时间           |
| --------- | -------------------------------- | -------------- |
| entering  | translateY(100%) → translateY(0) | 300ms ease-out |
| exiting   | translateY(0) → translateY(100%) | 200ms ease-in  |
| 遮罩 fade | opacity 0 → 1                    | 200ms          |

## 6. 与 Popover / Drawer 边界

| Surface                | 位置     | 用途              | 移动端行为               |
| ---------------------- | -------- | ----------------- | ------------------------ |
| Dialog                 | 居中     | 确认弹窗、表单    | < 640px 全屏             |
| Drawer                 | 左右滑入 | 导航、详情面板    | 小屏保持抽屉             |
| Popover                | 相对锚点 | 下拉菜单、tooltip | 小屏禁用或转 BottomSheet |
| **BottomSheet** (新增) | 底部滑入 | 选项选择、Picker  | 仅小屏启用               |

## 7. 包归属

| 文件              | 包                                    |
| ----------------- | ------------------------------------- |
| Sheet UI 组件     | `@nop-chaos/ui`（已有 shadcn Sheet）  |
| surface-host 扩展 | `flux-runtime`（SurfaceRuntime 扩展） |
| Select 内部使用   | `flux-renderers-form`                 |
