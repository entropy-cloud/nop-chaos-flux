# 维度 20：可访问性 (WCAG)

## 第 1 轮（初审）

### [维度20-01] `radio-group` / `checkbox-group` 的 group widget 缺少程序化名称

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:315-325,359-365`
- **证据片段**:
  ```tsx
  <RadioGroup ... aria-required={...} aria-invalid={...} ... />
  <div ... role="group" aria-required={...} aria-describedby={...}>
  ```
- **严重程度**: P1
- **现状**: group root 没有 `aria-label` / `aria-labelledby`，而 `FieldFrame` 默认包装方式不会自动把 label 关系传给该 widget root。
- **风险**: 屏幕阅读器用户进入 group 时无法获得字段名，影响表单定位与错误理解。
- **建议**: 把这些控件按 interactive composite control 路径处理，或使用 `fieldset/legend` / 显式 `aria-labelledby`。
- **为什么值得现在做**: 这是基本 Name/Role/Value 缺口。
- **误报排除**: 不是说每个单项无标签；问题在 group widget 自身没有名字。
- **历史模式对应**: composite field root unnamed。
- **参考文档**: `packages/ui/src/index.ts`
- **复核状态**: 未复核

### [维度20-02] input-tree / tree-select 的 `role="tree"` 根节点缺少 accessible name

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:158-165,199-223`
- **证据片段**:
  ```tsx
  <div data-slot="tree-option-items" role="tree"
    aria-multiselectable={props.multiple || undefined}
    aria-describedby={props.describedBy}
    aria-errormessage={props.errorMessage}
    aria-invalid={props.invalid || undefined}
  >
  ```
- **严重程度**: P1
- **现状**: `role="tree"` 元素自身没有 `aria-label` / `aria-labelledby`。
- **风险**: assistive tech 用户进入一个“无名树控件”，尤其在多个树控件共存时问题更明显。
- **建议**: 把 FieldFrame 生成的 label 关系传到真正的 `tree` root。
- **为什么值得现在做**: 这是表单型复杂控件的直接可达性缺口。
- **误报排除**: 不是 item label 缺失；item label 在树项层已有。
- **历史模式对应**: composite widget root unnamed。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度20-03] data tree renderer 的 `role="tree"` 根节点缺少名称，但影响相对次级

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:465-472`
- **证据片段**:
  ```tsx
  <div
    ref={rootRef}
    className={cn('nop-tree', props.meta.className)}
    data-testid={props.meta.testid || undefined}
    data-cid={props.meta.cid || undefined}
    role="tree"
  >
  ```
- **严重程度**: P2
- **现状**: data tree 同样没有 accessible name，但它不是表单字段控件。
- **风险**: 读屏用户仍会听到泛化的“tree”，缺少上下文名称。
- **建议**: 为 data tree 增加 `ariaLabel` / `ariaLabelledby` 支持。
- **为什么值得现在做**: 这是可修复的 WCAG 语义提升，但优先级低于表单控件型树。
- **误报排除**: 复核已把它降为次级，不与 form-widget 问题同级。
- **历史模式对应**: unnamed viewer widget root。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度20-01]：保留 (P1)。radio/checkbox group widget root 缺少程序化名称。
- [维度20-02]：保留 (P1)。input-tree / tree-select 的 tree root 缺少 accessible name。
- [维度20-03]：降级为 P2。问题真实，但影响低于 form-widget 情形。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                                           |
| ----- | -------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 20-01 | P1       | `packages/flux-renderers-form/src/renderers/input.tsx:315-325`        | `radio-group` / `checkbox-group` 的 group widget 缺少程序化名称      |
| 20-02 | P1       | `packages/flux-renderers-form-advanced/src/tree-controls.tsx:158-165` | input-tree / tree-select 的 `role="tree"` 根节点缺少 accessible name |
| 20-03 | P2       | `packages/flux-renderers-data/src/tree-renderer.tsx:465-472`          | data tree renderer 的 `role="tree"` 根节点缺少名称                   |
