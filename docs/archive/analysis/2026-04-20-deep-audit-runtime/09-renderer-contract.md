# 维度09：渲染器契约合规性

## 审核日期: 2026-04-20

## 发现清单（经初审+维度复核）

### [P2] CrudRenderer 内部区域使用 nop-\* class 标记

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:218,224,230`
- **严重程度**: P2
- **现状**: 内部子区域 div 同时使用 `nop-crud-query`/`nop-crud-toolbar`/`nop-crud-table` class 和 `data-slot` 属性。根标记 `nop-crud` 正确，但内部区域应仅用 `data-slot`。
- **建议**: 移除内部区域 nop-\* class，仅保留 `data-slot`。

### [P2] variant-field detail-view detail-field 使用 `as any` 类型转换

- **文件**:
  - `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:270`
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:288`
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:214`
- **严重程度**: P2
- **现状**: `component: XxxRenderer as any` — 复核确认去掉 `as any` 后 typecheck 仍通过，说明类型转换不必要。
- **建议**: 移除 `as any`，修正 Schema 类型或 RendererComponentProps 泛型参数。

### [P2→P3] variant-field helpers.render(xxx as any) 可移除的 as any

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:258,262,266`（约）
- **严重程度**: P3（同类问题扫描新增）
- **现状**: 3 处 `helpers.render(xxx as any)` 调用。与上方 component `as any` 同文件。
- **建议**: 检查是否可移除 `as any`，同上。

### [P2] detail-view/detail-field dispatch(xxx as any) 掩盖 undefined 风险

- **文件**:
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`（约 :288 附近）
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`（约 :214 附近）
- **严重程度**: P2（同类问题扫描新增）
- **现状**: 2 处 `dispatch(xxx as any)` 可能掩盖了 dispatch 参数类型不匹配或 undefined 传入的问题。
- **建议**: 排查 dispatch 的实际参数类型，移除 `as any` 并修正调用签名。

### [P3] value-adaptation-helper ValidationRule 类型缺少 'custom' 变体

- **文件**: `packages/flux-runtime/src/value-adaptation-helper.ts`（约）
- **严重程度**: P3（同类问题扫描新增）
- **现状**: 1 处 `as any` 因 ValidationRule 类型定义缺少 `'custom'` 变体，导致需要强制类型转换。
- **建议**: 在 ValidationRule 类型中添加 `'custom'` 变体，移除 `as any`。

### [P3] designer-palette 内部使用 nop-\* class

- **文件**: `packages/flow-designer-renderers/src/designer-palette.tsx`（约）
- **严重程度**: P3（同类问题扫描新增）
- **现状**: 内部区域使用 nop-\* class（视觉效果 class，非 marker）。与 crud-renderer 同类但影响更小。
- **建议**: 低优先级，逐步迁移到 data-slot。

### [P3] flux-renderers-form 9 个 input 定义缺少 displayName/sourcePackage

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:294-357`
- **严重程度**: P3
- **现状**: 9 个 input RendererDefinition 缺少可选的 `displayName` 和 `sourcePackage` 字段，与同包 FormRenderer 及其他包的惯例不一致。

### [P3] flux-renderers-form-advanced 全部定义缺少 displayName/sourcePackage

- **文件**: `packages/flux-renderers-form-advanced/src/index.tsx` 及各定义文件
- **严重程度**: P3
- **现状**: 11 个 RendererDefinition 缺少这两个字段。

### [驳回] condition-builder className 未用 cn()

- **排除理由**: `wrap: true` 渲染器的 `props.meta.className` 由 FieldFrame 处理。内部 `className="nop-condition-builder"` 是静态标记字符串，无动态合并需求。

## 同类问题扫描备注

`as any` 扩展扫描从 3 处扩展到 9 处：

- 3 处 component 定义（已记录，P2）
- 3 处 helpers.render(xxx as any)（新增，P3，variant-field.tsx）
- 2 处 dispatch(xxx as any)（新增，P2，detail-view/detail-field）
- 1 处 ValidationRule 类型缺 custom 变体（新增，P3，value-adaptation-helper）

内部区域 nop-\* class：

- crud-renderer 3 处（已记录，P2）
- designer-palette 1 处（新增，P3）

## 整体评估

42 个渲染器中 39 个 A 评分，3 个 A-（as any），1 个 B（crud 内部 marker）。核心契约（RendererComponentProps、数据来源、Store 隔离、无 ad-hoc Context）全部合规。
