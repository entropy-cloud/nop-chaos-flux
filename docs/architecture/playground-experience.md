# Playground Experience Design

## Purpose

本文记录 `apps/playground` 与 `@nop-chaos/nop-debugger` 的目标交互设计，重点解决两个问题：

- playground 不再作为一个把所有示例堆在同一页里的巨型演示页
- debugger 不再默认占用主工作区，而是变成可拖拽、可展开、可收起的悬浮工具

这份文档描述的是接下来应当落地的产品化设计方向，供后续实现、拆分页面与 debugger 交互重构时对照。

## Current Code Anchors

- `apps/playground/src/App.tsx`
- `packages/nop-debugger/src/panel.tsx`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/store.ts`
- `packages/nop-debugger/src/types.ts`

## 1. 当前问题

### 1.1 Playground 信息架构过于拥挤

当前 `apps/playground/src/App.tsx` 直接承载大量 AMIS、表单、数据、Flow Designer 与调试相关内容。

问题在于：

- 进入页面后没有明确的场景入口
- 不同主题的测试内容共享同一个 page scope 和视觉空间
- 新增一个实验场景时，通常只能继续往同一页追加内容
- 调试 timeline 容易混入无关操作，降低问题定位效率

### 1.2 Debugger 默认展开，会侵占主工作区

当前 debugger 已经具备：

- floating panel
- 左下角 launcher
- 展开态拖拽

但现状仍然不理想：

- playground 默认把 debugger 打开
- launcher 本身不能拖拽
- “Hide” 更像临时隐藏，而不是明确的“收起为小按钮”
- 小按钮与大面板之间缺少稳定的产品语义

## 2. 目标设计

### 2.1 Playground 改为“导航大厅 + 独立测试页”

进入 playground 后，首先看到的是一个测试导航首页，而不是所有示例的堆叠页面。

首页应包含若干大按钮或大卡片，点击后进入独立测试页。

推荐首批入口：

- `AMIS Basic` - 基础 renderer、表单、动作、数据联动
- `Flow Designer` - `designer-page`、toolbar / inspector / dialogs、画布交互
- `Report Designer` - 后续报表设计器测试入口
- `Debugger Lab` - debugger API、trace、network、automation 示例
- `Action Scope / Imports` - namespaced action、import、host scope 相关实验页

核心原则：

- 一个页面只承载一个主题
- 页面之间通过导航切换，而不是在单页里继续向下堆内容
- 每个测试页都应该可以独立打开、独立描述、独立截图、独立回归

### 2.2 Playground 首页职责

首页只承担三件事：

- 告诉开发者当前有哪些测试主题
- 提供清晰入口
- 简短说明每个主题主要验证什么

首页不应再承载复杂表单、表格、designer 或调试示例本身。

### 2.3 子页面职责

每个子页面都应只围绕一种主题组织内容。

例如：

- `AMIS Basic` 页面可以包含 2-4 个基础场景，但仍应围绕“基础 AMIS 能力验证”组织
- `Flow Designer` 页面只保留 Flow Designer 相关场景
- `Debugger Lab` 页面专门展示 debugger 人机界面与 automation API

推荐进一步使用路由或等价的页面状态，让 URL 能稳定表达当前所在测试页。

## 3. Debugger 目标交互模型

### 3.1 缺省形态

debugger 缺省不应展开为完整面板。

缺省形态应为：

- 一个小型 launcher
- 位于左下角
- 不占据主体工作区
- 不挤压 playground 主布局

### 3.2 展开与收起

点击 launcher 后，debugger 展开为完整形态。

完整形态应提供：

- 查看 overview / timeline / network
- 暂停、恢复、清空
- 一个明确的“最小化”动作

点击“最小化”后：

- 不应彻底消失
- 应收起回 launcher
- launcher 位置应保持不变

### 3.3 拖拽行为

launcher 与完整面板都应支持拖拽。

交互规则建议：

- 默认放在左下角
- 用户可拖到其他角落或合适位置
- 展开后与收起后共享同一套位置状态
- 位置应尽量持久化，避免每次刷新都丢失用户意图

### 3.4 状态语义

建议把 debugger 视为三态模型，而不是简单的开/关：

- `disabled` - 完全禁用，不显示 launcher
- `launcher` - 只显示小按钮
- `panel` - 显示完整调试面板

其中：

- `launcher` 是默认可见态
- `panel` 是工作态
- `disabled` 是显式关闭后的态

这样可以区分：

- “我现在不想让它占空间”
- “我完全不想要它”

## 4. 推荐实现约束

### 4.1 Playground 侧

- `apps/playground/src/App.tsx` 应拆为首页与主题页入口，而不是继续扩张为巨型单页
- 具体主题场景应拆到独立文件，例如 `AmisBasicPage.tsx`、`FlowDesignerPage.tsx`、`DebuggerLabPage.tsx`
- playground 首页应保持轻量，不应再直接包含完整业务示例 schema
- playground 主题页面应挂在 `.nop-theme-root` 下，让 dialog、debugger、Flow Designer renderer 与页面自有样式共享同一组 CSS 变量契约
- playground 自己特有的示例布局样式应放在 `apps/playground/src/styles.css`，但 Flow Designer 的节点、连线、inspector、palette 等可复用视觉应尽量复用包级 class 契约，而不是继续散落在 `FlowDesignerExample.tsx` 的 inline style 里

### 4.2 Debugger 侧

- `@nop-chaos/nop-debugger` 应把“launcher”视为正式 UI 形态，而不是 panel 关闭后的附属物
- 面板上的“Hide”应重命名或重构为语义更明确的“Minimize”
- launcher 也应支持拖拽
- 默认 window flag / playground 配置应改为 launcher 默认可见、panel 默认关闭

## 5. 设计收益

这套设计的收益主要在于：

- playground 更像测试导航中心，而不是内容仓库
- 每个主题的验证范围更清晰
- debugger 不再与主工作区争夺注意力
- 问题定位时能减少跨主题噪音
- 后续新增 report designer、spreadsheet 或 import/action-scope 实验页时更容易扩展

## 6. 后续落地方向

推荐按下面顺序推进：

1. 先重构 playground 信息架构，做首页与独立测试页入口
2. 再调整 debugger 的 launcher / panel / disabled 三态模型
3. 最后把现有大页内容按主题分流到独立页面，并补测试与文档

## Related Documents

- `docs/architecture/frontend-baseline.md`
- `docs/analysis/framework-debugger-design.md`
- `docs/references/maintenance-checklist.md`
