# 维度 09：渲染器契约合规性

## 总体评估

| 评分         | 渲染器数量 |
| ------------ | ---------- |
| A (完全合规) | 25         |
| B (轻微问题) | 9          |
| C (需要修复) | 0          |
| D (严重违规) | 0          |

---

## 合规亮点

1. **RendererComponentProps 模式**: 所有渲染器均使用 `RendererComponentProps<SchemaType>` 类型签名
2. **数据来源正确性**: 绝大部分渲染器从正确来源读取数据
3. **标准 Hooks 使用**: 使用 `useRendererRuntime()`, `useRenderScope()`, `useCurrentForm()` 等
4. **注册模式规范**: 所有包都正确导出 `RendererDefinition` 并遵循 `registerXxxRenderers(registry)` 模式
5. **marker class 规范**: 根元素使用 `nop-*` 语义标识，内部区域使用 `data-slot`
6. **cn() 合并**: className 合并均使用 `cn()` from `@nop-chaos/ui`

---

## A 级渲染器（完全合规）

- PageRenderer
- ContainerRenderer
- FlexRenderer
- ButtonRenderer
- TabsRenderer
- DialogRenderer / DrawerRenderer
- LoopRenderer / RecurseRenderer
- ReactionRenderer
- DynamicRenderer
- ScopeDebugRenderer
- FormRenderer
- InputRenderer 系列
- ArrayFieldRenderer
- ObjectFieldRenderer
- VariantFieldRenderer
- DetailFieldRenderer / DetailViewRenderer
- TableRenderer
- ChartRenderer
- DataSourceRenderer

---

## B 级渲染器（轻微问题）

### ConditionBuilderRenderer

- **问题**: className 未与 meta.className 合并
- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx:126,158`

### KeyValueRenderer / ArrayEditorRenderer / TagListRenderer

- **问题**: 内部布局类硬编码（`grid`/`flex`/`gap-*`）
- **说明**: 组件内部 UI 结构需求，可考虑通过 schema 使间距可配置

### TreeRenderer

- **问题**: 内部布局样式
- **说明**: 交互组件的 UI 壳层需要

### CrudRenderer

- **问题**: 使用 `className="nop-crud-*"` 而非 `data-slot`
- **说明**: 不影响功能，但与其他渲染器不一致

---

## 注册模式合规性

| 包                           | 导出 RendererDefinition[]         | 注册函数                        | 合规 |
| ---------------------------- | --------------------------------- | ------------------------------- | ---- |
| flux-renderers-basic         | `basicRendererDefinitions`        | `registerBasicRenderers`        | ✅   |
| flux-renderers-form          | `formRendererDefinitions`         | `registerFormRenderers`         | ✅   |
| flux-renderers-form-advanced | `formAdvancedRendererDefinitions` | `registerFormAdvancedRenderers` | ✅   |
| flux-renderers-data          | `dataRendererDefinitions`         | `registerDataRenderers`         | ✅   |

---

## 架构合规确认

- **复杂字段状态管理**: 正确通过 `FormContext.Provider` 切换子上下文
- **局部 UI 状态**: `DetailFieldRenderer` 的 `open`, `confirming` 等状态是合理的
- **交互组件内部样式**: TreeRenderer, TableBodyRows 中的内部样式是合理的

---

## 建议修复项

### 优先级 P2

**ConditionBuilderRenderer className 合并**

```tsx
// 从
<div className="nop-condition-builder">
// 改为
<div className={cn('nop-condition-builder', props.meta.className)}>
```

### 优先级 P3

1. 复合字段内部间距可配置化
2. CrudRenderer 内部区域改用 data-slot
