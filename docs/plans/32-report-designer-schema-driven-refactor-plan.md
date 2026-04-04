# 32 Report Designer Schema-Driven 重构计划

> Plan Status: ✅ completed
> Last Reviewed: 2026-04-04
> Completed: 2026-04-04


## 背景与目标

### 当前问题

`report-designer-renderers` 尚未实现 JSON Schema 驱动架构，组件结构与渲染逻辑紧耦合：

1. **左侧字段面板（FieldPanel）**：`renderFallbackFieldPanel` 直接消费 `FieldSourceSnapshot[]`，字段来源、可选字段列表等由 core 内部决定，外部无法灵活定制。
2. **右侧属性面板（Inspector）**：`renderFallbackInspector` 仅展示 `MetadataBag` 的原始键值对，具体展示哪些字段、编辑控件类型均由内部隐式定义。
3. **控制条（Toolbar）**：当前为 hardcoded 布局，与 Excel 工具条外观一致的需求未通过 schema 表达。

而 `flow-designer-renderers` 已验证了完整的 schema-driven 方案：
- `DesignerPageSchema` 定义页面级结构（toolbar/inspector/palette 通过 config 注入 items）
- `DesignerPaletteSchema` + `palette.groups` + `nodeTypes` 定义左侧节点库
- `DesignerFieldSchema` / `DesignerInspectorSchema` 按类型消费 schema 数据

### 重构目标

将 report-designer 改造为 JSON Schema 驱动，**使以下内容的结构与数据来源均由外部 schema 控制**：

| 区域 | 改造前 | 改造后 |
|------|--------|--------|
| 左侧字段面板 | `renderFallbackFieldPanel(FieldSourceSnapshot[])` | `ReportFieldPanelSchema` + fieldSources 由外部注入 |
| 右侧属性面板 | `renderFallbackInspector(MetadataBag)` | `ReportInspectorSchema` + inspectorPanels 由外部注入 |
| 控制条 | hardcoded | `ReportToolbarSchema` 定义 items，布局/样式内部固定但可扩展 |

**与 flow-designer 的核心区别**：
- flow-designer toolbar items 完全由 config 数组驱动（外部控制）
- report-designer toolbar **布局和 Excel 一致性样式内部固定**，仅 items 数组由外部注入，支持按 id 合并定制

## 实现方案

### 1. 文件组织结构

新增 / 重构后的文件结构：

```
packages/report-designer-renderers/src/
├── schemas.ts                                 # 所有 schema 类型定义（Page/Toolbar/FieldPanel/Inspector）
├── types.ts                                  # 保留现有 core 类型引用，重导出 schema 类型
├── report-designer-toolbar-helpers.ts        # evalBooleanExpr / evalTextTemplate / toCommand
├── report-designer-toolbar-defaults.ts       # DEFAULT_TOOLBAR_ITEMS 常量
├── report-designer-toolbar.tsx               # Toolbar 渲染逻辑（合并 + 渲染）
├── report-designer-field-panel.tsx           # FieldPanel Renderer（新增）
├── report-designer-inspector.tsx             # Inspector Renderer（新增）
├── page-renderer.tsx                         # PageRenderer：schema 驱动各区域
├── renderers.tsx                             # 注册 schema → renderer 映射
```

### 2. Schema 类型设计

所有 schema 类型集中在 `schemas.ts` 中：

```typescript
// schemas.ts
export interface ReportDesignerPageSchema extends BaseSchema {
  type: 'report-designer-page';
  document: ReportTemplateDocument;
  designer: ReportDesignerConfig;
  profile?: ReportDesignerProfile;
  adapters?: Partial<ReportDesignerAdapterRegistry>;
  toolbar?: ReportToolbarSchema;
  fieldPanel?: ReportFieldPanelSchema;
  inspector?: ReportInspectorSchema;
  dialogs?: BaseSchema | BaseSchema[];
  body?: BaseSchema | BaseSchema[];
}

export interface ReportToolbarSchema extends BaseSchema {
  type: 'report-toolbar';
  itemsOverride?: ToolbarItem[];  // 与默认 items 按 id 合并，visible:false 删除
}

export interface ReportFieldPanelSchema extends BaseSchema {
  type: 'report-field-panel';
  fieldSources?: FieldSourceSnapshot[];
  emptyLabel?: string;
  showFieldSourceHeader?: boolean;
  dragEnabled?: boolean;
}

export interface ReportInspectorSchema extends BaseSchema {
  type: 'report-inspector';
  inspectorPanels?: InspectorPanelDescriptor[];
  emptyLabel?: string;
  noSelectionLabel?: string;
}

export interface ToolbarItem {
  type: 'button' | 'divider' | 'spacer' | 'text' | 'badge' | 'switch' | 'title';
  id?: string;
  label?: string;
  text?: string;
  body?: string;
  icon?: string;
  action?: string;
  disabled?: boolean | string;
  active?: boolean | string;
  variant?: 'default' | 'primary' | 'danger';
  level?: string;
  visible?: boolean | string;
}
```

### 3. Toolbar 默认 items（独立文件）

`report-designer-toolbar-defaults.ts` 导出 `DEFAULT_TOOLBAR_ITEMS`，所有 item 带有唯一 `id`，供 `itemsOverride` 按 id 合并。每个 item 包含 label（Excel 一致）、icon、action、状态表达式（`${!canUndo}` 等）。

**合并规则**：
- override item 的 `id` 匹配默认 item 的 `id` → 覆盖该 item
- override item 的 `id` 在默认 items 中不存在 → 追加
- 默认 item 的 `id` 在 override 中不存在 → 保留
- `visible: false` 的 override item → 从默认列表中删除（通过 id 匹配）

外部只需指定需要定制或删除的那几个，无需复制全部默认 items。

### 4. Toolbar 辅助函数抽取

`evalBooleanExpr`、`evalTextTemplate`、`toCommand` 等工具函数目前内联在 flow-designer 的 `designer-toolbar.tsx` 中。新建 `report-designer-toolbar-helpers.ts` 集中放置这些逻辑，供 `report-designer-toolbar.tsx` 调用。

### 5. 组件重构

#### 5.1 Toolbar（`report-designer-toolbar.tsx`）

接收 `itemsOverride?: ToolbarItem[]`，内部导入 `DEFAULT_TOOLBAR_ITEMS` 做合并后渲染。样式（Excel 一致）内部固定，不暴露给外部。

#### 5.2 FieldPanel（`report-designer-field-panel.tsx`，新增）

实现 `ReportFieldPanelRenderer`，基于 `ReportFieldPanelSchema` 消费 `fieldSources`，支持 `emptyLabel`、`showFieldSourceHeader`、`dragEnabled` 配置项。

#### 5.3 Inspector（`report-designer-inspector.tsx`，新增）

实现 `ReportInspectorRenderer`，基于 `InspectorPanelDescriptor[]` 动态渲染 panel 和字段（支持 fieldType：text/select/date 等）。

#### 5.4 PageRenderer（`page-renderer.tsx`）

从 schema 读取 toolbar / fieldPanel / inspector 配置，按 schema 类型分发渲染。

### 6. 与 flow-designer 的对比

| 特性 | flow-designer | report-designer（改造后） |
|------|--------------|--------------------------|
| Toolbar 布局来源 | 100% 由 config.items 驱动 | **内部固定**，itemsOverride **按 id 合并**，visible:false 删除 |
| Toolbar 样式 | Tailwind class 外部指定 | **内部固定为 Excel 一致样式**，无需外部指定 |
| FieldPanel 数据来源 | config.nodeTypes + palette.groups | schema.fieldSources 注入 |
| Inspector 数据来源 | config + snapshot.activeNode | schema.inspectorPanels 注入 + activeMeta |
| schema 文件 | `schemas.ts` | `schemas.ts`（新增） |
| toolbar items 文件 | 内联在 `designer-toolbar.tsx` | `report-designer-toolbar-defaults.ts`（独立） |
| page-renderer 模式 | RendererComponentProps + slot | RendererComponentProps + schema 驱动 |

## 执行计划

### Phase 1: Schema 类型定义

1. 新建 `schemas.ts`，定义 `ReportDesignerPageSchema`、`ReportToolbarSchema`、`ReportFieldPanelSchema`、`ReportInspectorSchema`。
2. 将 `types.ts` 中的 `ReportDesignerPageSchemaInput` 合并到 `schemas.ts`。
3. 更新 `types.ts` 导出，重导出 schema 类型。

### Phase 2: Toolbar schema 化

1. 新建 `report-designer-toolbar-defaults.ts`，导出 `DEFAULT_TOOLBAR_ITEMS`（所有 item 带有唯一 `id`）。
2. 新建 `report-designer-toolbar-helpers.ts`，抽取 `evalBooleanExpr` / `evalTextTemplate` / `toCommand`。
3. 新建 `report-designer-toolbar.tsx`，实现 Toolbar 渲染逻辑：**合并** `DEFAULT_TOOLBAR_ITEMS` + `itemsOverride`（按 id 匹配，`visible: false` 删除），样式（Excel 一致）内部固定。
4. `ReportToolbarSchema` 定义 `itemsOverride` 字段。
5. `ReportDesignerPageRenderer` 从 schema 读取 toolbar 配置，传递给 toolbar 组件。
6. 更新 playground demo 使用新的 toolbar schema。

### Phase 3: FieldPanel schema 化

1. 新建 `report-designer-field-panel.tsx`，实现 `ReportFieldPanelRenderer`。
2. 支持 schema 中的 `emptyLabel`、`showFieldSourceHeader`、`dragEnabled` 配置项。
3. `fieldSources` 从 `ReportFieldPanelSchema.fieldSources` 读取（外部注入）。
4. 更新 `renderers.ts` 注册新的 renderer 类型。

### Phase 4: Inspector schema 化

1. 新建 `report-designer-inspector.tsx`，实现 `ReportInspectorRenderer`。
2. 基于 `InspectorPanelDescriptor[]` 动态渲染 panel 和字段（支持 fieldType：text/select/date 等）。
3. 支持 schema 中的 `emptyLabel`、`noSelectionLabel` 配置项。
4. `inspectorPanels` 从 `ReportInspectorSchema.inspectorPanels` 读取（外部注入），由 schema 全权决定。

### Phase 5: Playground demo 更新

1. 更新 `ReportDesignerDemo.tsx` 使用新的 schema 方式配置 toolbar / fieldPanel / inspector。
2. 验证所有区域均可通过 schema 驱动。

### Phase 6: 测试与验收

1. 为 schema 驱动的 renderer 编写单元测试。
2. 全 workspace 测试通过。

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `packages/report-designer-renderers/src/schemas.ts` | 新建：所有 schema 类型 |
| `packages/report-designer-renderers/src/types.ts` | 修改：重导出 schema 类型 |
| `packages/report-designer-renderers/src/report-designer-toolbar-helpers.ts` | 新建：toolbar 辅助函数 |
| `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts` | 新建：`DEFAULT_TOOLBAR_ITEMS` 常量 |
| `packages/report-designer-renderers/src/report-designer-toolbar.tsx` | 新建：Toolbar 渲染（合并逻辑） |
| `packages/report-designer-renderers/src/report-designer-field-panel.tsx` | 新建：FieldPanel Renderer |
| `packages/report-designer-renderers/src/report-designer-inspector.tsx` | 新建：Inspector Renderer |
| `packages/report-designer-renderers/src/page-renderer.tsx` | 修改：schema 驱动各区域 |
| `packages/report-designer-renderers/src/renderers.tsx` | 修改：注册新 renderer |
| `apps/playground/src/pages/ReportDesignerDemo.tsx` | 修改：使用新 schema |
| `apps/playground/src/pages/ReportDesignerPage.tsx` | 修改：schema 适配 |

## 风险与决策

1. **全新实现**：这是第一版实现，不考虑向后兼容，无需 fallback 逻辑，直接按 schema 驱动实现。
2. **Excel 样式固定**：toolbar items 内部定义、样式固定，避免外部逐项传入的复杂性。
3. **itemsOverride 合并策略**：按 `id` 合并，非替换；`visible: false` 删除默认项，外部只需指定需要定制或删除的那几个，无需复制全部默认 items。
