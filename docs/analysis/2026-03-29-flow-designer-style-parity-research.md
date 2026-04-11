# Flow Designer 样式对齐调研

> 目标参考文件: `flow-editor-static.html`（玻璃态设计风格）

## 一、整体样式架构

项目采用 **Tailwind CSS v4** + **shadcn/ui 模式** + **JSON Schema 驱动样式** 三层体系：

| 层级 | 职责 | 文件 |
|------|------|------|
| **设计令牌** | CSS 变量 (`--primary`, `--border` 等) + 自定义工具类 | `tailwind-preset/src/styles/base.css` |
| **UI 组件库** | shadcn/ui (Radix + CVA + tailwind-merge) | `packages/ui/` (Button, Badge, Input 等) |
| **Schema 样式** | `classAliases` 映射语义名 → Tailwind 类名 | `workflow-designer-schema.json` 的 `config.classAliases` |
| **渲染器组件** | 固定布局结构 + 引用 classAliases | `flow-designer-renderers/src/*.tsx` |

## 二、样式流转机制

```
JSON Schema (classAliases) → ClassAliasesContext → RenderNodes → className
```

1. **`workflow-designer-schema.json`** 定义 `classAliases`，例如：
   - `"node-card"` → `"nop-glass-card flex flex-col gap-2 px-3 py-3 rounded-xl shadow-lg min-w-[192px]"`
   - `"node-icon--start"` → `"nop-gradient-start"`

2. **`DesignerXyflowNode.tsx:112`** 通过 `ClassAliasesContext.Provider` 将 aliases 传入 `RenderNodes`，后者解析 JSON body 中的 `className` 引用并替换为实际 Tailwind 类。

3. **`DesignerXyflowCanvas.tsx:254`** 定义画布容器外壳，`designer-page.tsx:192` 定义三栏布局。

## 三、与参考 HTML 的关键差异

| 区域 | 参考目标 | 当前实现 | 差距 |
|------|----------|----------|------|
| **整体布局** | `grid-template-columns: 15rem 1fr 22rem` | `grid-cols-[240px_minmax(0,1fr)_352px]` | 基本一致 |
| **页面背景** | `linear-gradient(135deg, 绿/紫/青 渐变)` | 无渐变背景 | **缺失** |
| **Toolbar** | `rounded-xl border backdrop-blur: blur(20px) card-surface` | `rounded-[20px] bg-white/72 backdrop-blur-[8px]` | 圆角和模糊度不同，缺少标题+元数据双行结构 |
| **Toolbar 布局** | 返回按钮 + 标题/元数据区 → 网格开关 → 撤销重做 → JSON → 保存 | 同样顺序但样式简化 | 缺少网格开关的 Switch 组件 |
| **Palette 分组** | 每组 `rounded-lg` 半透明背景 + 大写标题 (letter-spacing:0.18em) | `rounded-2xl bg-muted` 组 + 普通标题 | 组标题样式不同(缺少大写/letter-spacing) |
| **Palette 节点** | 左侧渐变图标(32px) + 右侧添加按钮，卡片式 | 图标较小(`w-8 h-8`)，无单独添加按钮 | 图标尺寸和交互模式不同 |
| **Canvas 背景** | `radial-gradient` (蓝/粉) + 可选网格 `24px` | `bg-muted` + xyflow `Background` | 缺少渐变装饰层 |
| **Canvas 控件** | 左上角纵向排列 `rounded-lg` + 右下 minimap `rounded-2xl` | xyflow 默认 Controls + MiniMap | 控件样式不匹配参考 |
| **Canvas 提示** | 右上角 pill 形状提示 "拖拽节点..." | 无 | **缺失** |
| **节点卡片** | `min-width:192px rounded-xl backdrop-blur:20px shadow-lg` | `nop-glass-card rounded-xl shadow-lg min-w-[192px]` | 基本一致 |
| **节点选中** | `border-color:primary` + `0 0 0 2px` glow ring | `nop-glass-card-glow` | 基本一致 |
| **节点图标** | `40x40px rounded-xl` + 渐变 + `shadow-sm` | `w-10 h-10 rounded-xl shadow-sm` + `nop-gradient-*` | 基本一致 |
| **Edge 连线** | SVG `<path>` 贝塞尔曲线 + 可选 dashed/dotted + 箭头 | xyflow `getSmoothStepPath` + strokeDasharray | 线型一致，但贝塞尔 vs 平滑阶梯 |
| **Edge 标签** | 圆形药丸按钮 `rounded-full backdrop-blur` | `rounded-full border bg-white/88 backdrop-blur` | 基本一致 |
| **Inspector** | 分区卡片 + 大写标题 + 流程信息/选中/表单三段 | 简单列表(默认实现) | **差距大** |

## 四、核心发现

1. **节点卡片样式已基本对齐** — `nop-glass-card` + `nop-gradient-*` + `classAliases` 已正确映射。

2. **主要差距在布局装饰层面**：
   - 页面背景缺少渐变色
   - Canvas 缺少径向渐变装饰
   - Palette 组标题缺少 uppercase + letter-spacing
   - Inspector 是简化版，缺少参考的三段式分区布局

3. **样式架构设计合理** — 通过 classAliases + RenderNodes 实现 JSON 驱动节点样式，大部分差距可通过修改 JSON schema 弥补。

4. **需要代码修改的部分**：
   - `designer-page.tsx` — 页面背景、canvas 渐变装饰
   - `designer-palette.tsx` — 节点图标尺寸、添加按钮、组标题样式
   - `designer-inspector.tsx` — 分区布局
   - `DesignerXyflowCanvas.tsx` — canvas 控件和 minimap 样式、提示文字
   - `DesignerXyflowEdge.tsx` — 改用贝塞尔曲线
   - `workflow-designer-schema.json` — classAliases 调整
