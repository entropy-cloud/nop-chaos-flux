# 16 - Flow Designer 样式 JSON 驱动迁移计划

## 目标

将 flow designer 示例中所有**特定于业务场景的样式**从框架 CSS (`styles.css`) 迁移到 JSON 配置中，通过 TailwindCSS + `classAliases` 机制表达样式，使框架包不再包含任何业务特定样式。

## 问题分析

### 当前状态

`packages/flow-designer-renderers/src/styles.css`（2063行）中存在三类样式混杂：

#### A. 框架骨架样式（应保留）— 约1200行

| 类别 | 选择器 | 说明 |
|------|--------|------|
| CSS 变量 | `.nop-theme-root`, `--fd-*` | 主题 token |
| 页面布局 | `.fd-page`, `.fd-page__content` | 三栏 grid 布局 |
| 调色板 | `.fd-palette__*` | 分组、搜索、拖拽项 |
| 画布 | `.fd-xyflow-live__surface`, `.fd-xyflow-node` | xyflow 画布外壳 |
| 边 | `.fd-edge__label-wrapper` | 边标签容器 |
| 工具栏 | `.fd-toolbar__*` | 工具栏按钮、分隔符 |
| Inspector | `.fd-inspector__*` | 面板、表单字段 |
| Minimap/Controls | `.react-flow__controls`, `.react-flow__minimap` | xyflow 控件覆盖 |

#### B. 独立示例样式（应移出框架包）— 约400行

| 类别 | 行范围 | 选择器 |
|------|--------|--------|
| 独立示例布局 | 612-677, 1275-1322 | `.flow-designer-example__*` |
| 独立示例画布 | 624-652 | `.flow-designer-example__canvas*` |
| 独立示例 toast | 654-677 | `.flow-designer-example__toast` |
| 独立流程组件 | 1078-1272 | `.flow-canvas`, `.flow-node`, `.flow-edge`, `.flow-toolbar`, `.flow-palette`, `.flow-inspector`, `.flow-list-*` |

#### C. workflow 示例特定样式（核心迁移目标）— 约460行

| 类别 | 行范围 | 选择器 |
|------|--------|--------|
| Tailwind 布局 polyfill | 1616-1705 | `.fd-page .flex`, `.fd-page .gap-2`, `.fd-page .px-3` 等 |
| 节点边框颜色 | 1679-1689 | `.fd-page .border-green-500`, `.border-red-500`, `.border-yellow-400` |
| 图标颜色+渐变 | 1721-1767 | `.fd-page .text-green-600`, `.fd-page .react-flow__node .nop-flex > .nop-icon.w-5.h-5.text-green-600` |
| 文字颜色 | 1783-1791, 1803, 2029-2063 | `.fd-page .text-gray-*`, `.text-sky-700`, `.text-emerald-700` 等 |
| 背景颜色 | 1650-1656, 1795-1801, 2025-2063 | `.fd-page .bg-white`, `.bg-sky-100`, `.bg-emerald-100` 等 |
| xyflow 节点内覆盖 | 1827-1877, 1860-1872 | `.fd-xyflow-live__surface .react-flow__node .fd-xyflow-node .nop-flex.bg-white` 等 |
| 调色板图标渐变 | 220-237 | `.fd-palette__item-icon--start`, `--end`, `--task` 等 |

### 核心矛盾

JSON schema 中使用 Tailwind 类名（如 `border-green-500`），但这些类名的**实际 CSS 定义**被硬编码在框架的 `styles.css` 中。这导致：

1. 框架包被业务样式污染
2. 不同设计器示例无法有独立的配色方案
3. 添加新的颜色/样式需要修改框架代码

### 已有基础设施

| 机制 | 位置 | 能力 |
|------|------|------|
| `classAliases` | `flux-core/src/class-aliases.ts` | 支持别名展开、嵌套、继承 |
| `ClassAliasesContext` | `flux-react/src/contexts.ts` | React 层的别名上下文传递 |
| `BaseSchema.classAliases` | `flux-core/src/types.ts:25` | 每个 schema 节点可定义别名 |
| `NodeRenderer` | `flux-react/src/node-renderer.tsx:74-76` | 自动合并父级+节点级别名并解析 className |
| TailwindCSS | `postcss.config.cjs` + `tailwind.config.ts` | 项目已配置 Tailwind v4 |

---

## 迁移方案

### 总体策略

**"Tailwind 类名走 Tailwind，自定义样式走 classAliases"**

1. 确保项目 Tailwind 配置正确覆盖 flow designer 所需的所有 utility 类
2. 将节点 body 中无法用 Tailwind 表达的样式（如图标渐变背景）通过 `classAliases` 机制引入
3. `DesignerConfig` 增加 `classAliases` 字段，允许在 JSON 顶层定义全局别名
4. 删除 `styles.css` 中所有业务特定样式和 Tailwind polyfill
5. 将独立示例样式移到 playground

### 详细步骤

#### Step 1: 在 DesignerConfig 中增加 classAliases 支持

**文件**: `packages/flow-designer-core/src/types.ts`

在 `DesignerConfig` 接口中添加可选字段：

```typescript
export interface DesignerConfig {
  // ... existing fields
  classAliases?: Record<string, string>;
}
```

**原因**: `DesignerConfig` 是 JSON 配置的入口类型，`classAliases` 应该在此定义，以便不同的 designer 示例通过 JSON 定义自己的样式别名。

#### Step 2: 将 classAliases 传递给 RenderNodes

**文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowNode.tsx`

在 `RenderNodes` 的 `options` 中添加 `classAliases`：

```typescript
<RenderNodes
  input={nodeType.body}
  options={{
    data: nodeRenderData,
    scopeKey: `node:${props.id}`,
    pathSuffix: 'node',
    classAliases: config.classAliases  // 从 context 或 config 传递
  }}
/>
```

**需要确认**: `RenderNodes` 的 `options` 是否已支持 `classAliases` 传递。如果不支持，需要在 `flux-react` 的 `RenderNodes` / `NodeRenderer` 中添加支持。

**文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowEdge.tsx`

同样处理 edge body 的 `RenderNodes`。

#### Step 3: 清理 styles.css — 移除 Tailwind polyfill（1616-1825行）

**文件**: `packages/flow-designer-renderers/src/styles.css`

删除以下所有规则（约210行）：

```
.fd-page .flex
.fd-page .flex-col
.fd-page .items-center
.fd-page .items-start
.fd-page .justify-between
.fd-page .gap-2
.fd-page .px-3
.fd-page .py-2
.fd-page .bg-white
.fd-page .bg-blue-50
.fd-page .rounded-lg
.fd-page .rounded
.fd-page .border
.fd-page .border-blue-200
.fd-page .border-2
.fd-page .border-green-500
.fd-page .border-red-500
.fd-page .border-yellow-400
.fd-page .shadow-sm
.fd-page .w-5
.fd-page .h-5
.fd-page .w-full
.fd-page .react-flow__node .nop-flex > .nop-icon.w-5.h-5 (所有变体)
.fd-page .text-green-600, .text-red-600, .text-blue-600 等
.fd-page .text-sm, .text-xs, .font-medium
.fd-page .text-gray-900, .text-gray-600, .text-gray-500
.fd-page .bg-slate-100, .bg-sky-100
.fd-page .text-sky-700
.fd-page .rounded-full
.fd-page .react-flow__node .nop-flex > .nop-container
.fd-page .px-1\.5
.fd-page .py-0\.5
```

**前提**: 确保项目 Tailwind 配置能生成这些 utility 类。

#### Step 4: 清理 styles.css — 移除 workflow 特定颜色 polyfill（2025-2063行）

删除：
```
.fd-page .bg-emerald-100 / .text-emerald-700
.fd-page .bg-rose-100 / .text-rose-700
.fd-page .bg-amber-100 / .text-amber-700
.fd-page .bg-violet-100 / .text-violet-700
.fd-page .bg-fuchsia-100 / .text-fuchsia-700
```

这些是 Tailwind 标准颜色类，Tailwind v4 会自动生成。

#### Step 5: 将图标渐变背景迁移到 classAliases

当前 CSS 中有节点图标渐变背景样式（每个节点类型不同）：

```css
.fd-page .react-flow__node .nop-flex > .nop-icon.w-5.h-5.text-green-600 {
  background: linear-gradient(135deg, #34d399, #10b981);
}
```

**迁移方案**: 在 JSON 的 `config.classAliases` 中定义语义化别名，配合内联 style 或 Tailwind 任意值语法：

```json
{
  "config": {
    "classAliases": {
      "icon-start": "w-5 h-5",
      "icon-end": "w-5 h-5",
      "icon-task": "w-5 h-5",
      "icon-condition": "w-5 h-5",
      "icon-parallel": "w-5 h-5",
      "icon-loop": "w-5 h-5"
    }
  }
}
```

对于渐变背景（Tailwind 无法表达），需要引入**节点类型级别的 CSS 类**。有两种方案：

**方案 A（推荐）**: 在 `DesignerConfig` 中增加 `themeStyles` 字段，由框架注入为 `<style>` 标签

```typescript
export interface DesignerConfig {
  // ...
  themeStyles?: string;  // 原始 CSS 字符串，注入到 designer 作用域
}
```

```json
{
  "config": {
    "themeStyles": ".fd-icon-start { background: linear-gradient(135deg, #34d399, #10b981); } ..."
  }
}
```

**方案 B**: 使用 Tailwind 任意值 `[background:linear-gradient(...)]` 配合 classAliases

```json
{
  "classAliases": {
    "icon-start": "w-5 h-5 [background:linear-gradient(135deg,#34d399,#10b981)] rounded-full text-white"
  }
}
```

**决定**: 采用方案 A，因为渐变等复杂样式不适合用 Tailwind 任意值表达，且 `themeStyles` 是一个通用的 escape hatch。

#### Step 6: 将调色板图标渐变迁移到 themeStyles

**当前 CSS**（220-237行）:
```css
.fd-palette__item-icon--start { background: linear-gradient(135deg, #34d399, #10b981); }
.fd-palette__item-icon--end { background: linear-gradient(135deg, #fb7185, #f43f5e); }
...
```

**迁移方案**: 将这些样式移入 `config.themeStyles`，并修改 `DesignerPaletteContent` 组件使用节点类型 ID 作为 data attribute 或 class：

```json
{
  "config": {
    "themeStyles": ".fd-palette-icon[data-type='start'] { background: linear-gradient(...); } ..."
  }
}
```

**文件**: `packages/flow-designer-renderers/src/designer-palette.tsx`

将 `fd-palette__item-icon--${nt.id}` 改为 `fd-palette-icon` + `data-type="${nt.id}"`，使其可被 `themeStyles` 选择。

#### Step 7: 清理 xyflow 节点内部覆盖样式

**当前 CSS**（1827-1877行）:

这些是针对 xyflow 节点内部渲染结果的精细覆盖，如：

```css
.fd-xyflow-live__surface .react-flow__node .fd-xyflow-node { border: 0; border-radius: 0; background: transparent; }
.fd-xyflow-live__surface .react-flow__node.selected .fd-xyflow-node > .nop-flex.bg-white { ... }
```

**分析**:
- `.fd-xyflow-node` 的 `border: 0; background: transparent` 是让 xyflow 节点 wrapper 变成透明的壳，样式完全由内部 schema body 承担 — 这是**框架骨架行为**，应保留
- `.bg-white` 选择器引用是 workflow 示例特有的 — 迁移后不再需要（因为节点 body 自带样式）

**迁移方案**:
1. 保留 `.fd-xyflow-node { border: 0; background: transparent; }` — 这是骨架
2. 删除所有引用 `.bg-white`、`.shadow-sm` 等 Tailwind 类名的选择器
3. 选中状态样式改为通用规则：
   ```css
   .fd-xyflow-live__surface .react-flow__node.selected .fd-xyflow-node > :first-child {
     outline: 2px solid var(--fd-node-border-active);
     outline-offset: 2px;
   }
   ```

#### Step 8: 移除独立示例样式

**文件**: `packages/flow-designer-renderers/src/styles.css`

删除以下所有样式（约200行）：
- `.flow-designer-example__*`（612-677, 1275-1322行）
- `.flow-canvas__*`（239-1077行中 `.flow-canvas` 相关）
- `.flow-node__*`（1078-1107行）
- `.flow-edge__*`（1110-1119行）
- `.flow-toolbar__*`（1122-1170行）
- `.flow-palette__*`（1173-1208行）
- `.flow-inspector__*`（1211-1272行）
- `.flow-list-*`（1324-1483行）

**目标位置**: 这些样式应移到 `apps/playground/src/styles.css` 或独立的 playground CSS 文件中。

#### Step 9: 确保 Tailwind 正确生成所需 utility 类

**文件**: `tailwind.config.ts`

确认 `content` 数组包含：
```typescript
content: [
  // 已有
  './apps/playground/src/**/*.{ts,tsx}',
  './packages/flow-designer-renderers/src/**/*.{ts,tsx}',
  // 需确认
  './apps/playground/src/schemas/**/*.json',  // JSON schema 中的 Tailwind 类名
]
```

**注意**: Tailwind v4 的 `@tailwindcss/postcss` 使用 content detection，但 JSON 文件中的类名可能不会被自动扫描。需要：
- 要么在 `tailwind.config.ts` 的 `content` 中加入 JSON 文件路径
- 要么确保 JSON 中使用的所有 Tailwind 类名也出现在某个 `.ts/.tsx` 文件中（作为注释或代码引用）

**建议方案**: 创建一个 `tailwind-safelist.ts` 文件，列出所有在 JSON schema 中使用的 Tailwind 类名，让 Tailwind 扫描器能发现它们。

#### Step 10: 更新 workflow-designer-schema.json

**文件**: `apps/playground/src/schemas/workflow-designer-schema.json`

1. 在 `config` 中添加 `classAliases`（简化节点 body 中的重复 className）：

```json
{
  "config": {
    "classAliases": {
      "node-card": "flex flex-col gap-2 px-3 py-2 bg-white rounded-lg shadow-sm",
      "node-header": "flex items-start gap-2",
      "node-footer": "flex items-center justify-between w-full text-xs text-gray-500"
    },
    "themeStyles": "...",
    // ...existing config
  }
}
```

2. 简化各节点类型 `body` 中的 `className`，使用别名：

```json
{
  "id": "start",
  "body": {
    "type": "flex",
    "className": "node-card border-2 border-green-500",
    "items": [...]
  }
}
```

#### Step 11: 在 DesignerPageRenderer 中注入 themeStyles

**文件**: `packages/flow-designer-renderers/src/designer-page.tsx`

```tsx
export function DesignerPageRenderer(props) {
  const config = rawSchemaProps.config as unknown as DesignerConfig;
  // ...
  return (
    <DesignerContext.Provider value={ctxValue}>
      <div className="fd-page nop-theme-root fd-theme-root">
        {config.themeStyles && <style>{config.themeStyles}</style>}
        {/* ... */}
      </div>
    </DesignerContext.Provider>
  );
}
```

---

## 执行顺序

| 阶段 | 步骤 | 文件 | 风险 |
|------|------|------|------|
| 1. 基础设施 | Step 1 | `flow-designer-core/src/types.ts` | 低 — 新增可选字段 |
| 2. 基础设施 | Step 9 | `tailwind.config.ts` + safelist | 低 — 配置变更 |
| 3. 传递机制 | Step 2 | `DesignerXyflowNode.tsx`, `DesignerXyflowEdge.tsx`, `designer-page.tsx` | 中 — 需确认 RenderNodes 支持 |
| 4. 注入机制 | Step 11 | `designer-page.tsx` | 低 — 新增 `<style>` 标签 |
| 5. JSON 迁移 | Step 10 | `workflow-designer-schema.json` | 低 — 纯 JSON 变更 |
| 6. 调色板 | Step 6 | `designer-palette.tsx` | 低 — 选择器变更 |
| 7. CSS 清理 | Step 3-4 | `styles.css` | **高** — 可能影响视觉 |
| 8. 节点覆盖 | Step 7 | `styles.css` | **高** — 选中状态样式 |
| 9. 示例迁移 | Step 8 | `styles.css` → `playground/styles.css` | 中 — 文件移动 |
| 10. 验证 | - | 全部 | 运行所有测试 |

---

## 验证清单

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
  - `packages/flow-designer-renderers/src/index.test.tsx`
  - `packages/flow-designer-renderers/src/index.xyflow.test.tsx`
  - `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`
  - `packages/flow-designer-renderers/src/designer-command-adapter.test.ts`
  - `apps/playground/src/flow-designer/parity.test.tsx`
  - `apps/playground/src/pages/FlowDesignerPage.test.tsx`
- [ ] `pnpm dev` 启动 playground，视觉验证：
  - 各节点类型（开始/结束/任务/条件/并行/循环）显示正确
  - 节点颜色、边框、图标渐变与迁移前一致
  - 选中节点的高亮效果正常
  - 调色板图标渐变正确
  - 边的标签和线型正常
  - 工具栏、Inspector 功能正常
- [ ] `styles.css` 中不再包含任何 workflow 特定颜色或 Tailwind polyfill
- [ ] 独立示例样式已移到 playground

---

## 迁移后 styles.css 预期结构

```
styles.css (约1200行，纯骨架)
├── CSS 变量定义（--fd-*）          ~56行
├── 页面布局（.fd-page__*）          ~80行
├── 调色板骨架（.fd-palette__*）     ~120行 (不含 --start/--end 等图标渐变)
├── 画布骨架（.fd-xyflow-*）         ~300行 (不含 .bg-white/.shadow-sm 选择器)
├── 边骨架（.fd-edge__*）           ~60行
├── 工具栏骨架（.fd-toolbar__*）     ~140行
├── Inspector 骨架（.fd-inspector__*）~80行
├── Minimap/Controls 覆盖            ~60行
├── 响应式（@media）                 ~30行
└── 通用 xyflow 节点选中状态          ~20行
```

## 风险与回退

1. **Tailwind 类名扫描不到 JSON**: 使用 safelist 文件兜底
2. **xyflow 选中状态样式丢失**: 保留通用的 `:first-child` 选择器规则
3. **图标渐变无法用 Tailwind 表达**: 使用 `themeStyles` escape hatch
4. **视觉回归**: 每个 Step 完成后运行 `pnpm dev` 目视验证，可随时回退
