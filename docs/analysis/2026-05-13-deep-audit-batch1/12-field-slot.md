# 维度 12：表单字段与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] `tag-list` 仍违反 wrapped-field label 交互语义

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx:69-89`; `packages/flux-renderers-form-advanced/src/tag-list.tsx:85-147`; `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:111-125`; `packages/flux-renderers-form-advanced/src/tag-list.test.tsx:149-186`
- **证据片段**:
  ```tsx
  const usesInteractiveControlRoot =
    props.templateNode.type === 'array-editor' ||
    props.templateNode.type === 'array-field' ||
    props.templateNode.type === 'input-tree' ||
    props.templateNode.type === 'tree-select' ||
    props.templateNode.type === 'condition-builder' ||
    props.templateNode.type === 'key-value' ||
    props.templateNode.type === 'detail-field';
  ```
- **严重程度**: P2
- **违规类别**: field-frame
- **现状**: `tag-list` 声明 `wrap: true`，内部通过 `WrappedFieldAction` 渲染 labelable `Button` 动作，但 `NodeFrameWrapper` 的 `rootTag="div"` 例外列表没有包含 `tag-list`；测试还在验证点击 `.nop-field` shell 会触发内部 tag action。
- **建议**: 要么把 `tag-list` 加入 `NodeFrameWrapper` 的 interactive-control `rootTag="div"` 路径，要么把内部 tag action 切回 non-labelable button-like control 模式。
- **为什么值得现在做**: 当前 live regression test 已证明字段壳点击会改变内部值，属于直接的 wrapped-field 契约违例。
- **误报排除**: 不是 blanket migration 压力；这是 `field-frame-wrap-interaction-semantics` 所定义的直接契约违例。
- **历史模式对应**: wrapped field shell 误把内部二级动作暴露为 label forwarding 目标。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/field-frame.md`
- **复核状态**: 未复核

### [维度12-02] `NodeFrameWrapper` 仍把 resolved field chrome 与 raw schema fallback 混用

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx:25-68`; `packages/flux-core/src/types/schema.ts:56-67`; `packages/flux-compiler/src/schema-compiler/fields.ts:23-42`
- **证据片段**:
  ```tsx
  const hintValue =
    typeof props.resolvedPropsValue.hint === 'string'
      ? props.resolvedPropsValue.hint
      : typeof schema.hint === 'string'
        ? schema.hint
        : undefined;
  const descriptionValue =
    typeof props.resolvedPropsValue.description === 'string'
      ? props.resolvedPropsValue.description
      : typeof schema.description === 'string'
        ? schema.description
        : undefined;
  ```
- **严重程度**: P2
- **违规类别**: slot
- **现状**: wrapper chrome 先读 `resolvedPropsValue`，缺失时又回退到 `templateNode.schema` 原始值。
- **建议**: `NodeFrameWrapper` 只消费规范化后的 `props`/`regions`，不要在运行时可见 field chrome 上回退 raw schema。
- **为什么值得现在做**: 如果这些字段是表达式驱动或被编译时规整，raw schema fallback 会重新暴露过时/未解析值，破坏运行时契约边界。
- **误报排除**: 这不是 metadata 或 debug-only raw schema 读取；这些是 live UI 字段外壳输入。
- **历史模式对应**: runtime-visible wrapper input 回落到 raw schema。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度12-03] deep region ownership 仍分裂在 compiler-global renderer tables 中

- **文件**: `packages/flux-compiler/src/schema-compiler/tables.ts:9-236`; `packages/flux-compiler/src/schema-compiler/node-compiler.ts:342`; `docs/architecture/field-metadata-slot-modeling.md:375-420`
- **证据片段**:
  ```ts
  export const DEEP_FIELD_NORMALIZERS: Record<string, Record<string, DeepFieldNormalizer>> = {
    table: {
      columns(input) {
        return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
      },
    },
    crud: {
      columns(input) {
        return normalizeTableColumns(input.value, input.path, input.regions, input.compileSchema);
      },
    },
  };
  ```
- **严重程度**: P2
- **违规类别**: deep-region
- **现状**: renderer-specific deep slot extraction 仍位于 compiler-owned 的 `DEEP_FIELD_NORMALIZERS` 表中，以 renderer type 为 key 维护。
- **建议**: 把 deep-region 声明迁移到 renderer-owned metadata/extension point，让 compiler 泛化消费。
- **为什么值得现在做**: 现在新增或修改 nested slot 行为仍要改 compiler 全局表，违背 deep region 由 renderer 契约自描述的 owner 规则。
- **误报排除**: 这不是中性 helper；表中直接命名 renderer id、nested field、region key、params 和隔离策略。
- **历史模式对应**: field/slot semantics 分裂在 renderer 定义与 compiler-global registry 之间。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

### [维度12-04] `report-field-panel` / `report-inspector-shell` 的 `title` typing 仍窄于 live `value-or-region` metadata

- **文件**: `packages/report-designer-renderers/src/renderers.tsx:16-23,34-43`; `packages/report-designer-renderers/src/schemas.ts:23-30`; `packages/report-designer-renderers/src/types.ts:51-56`; `packages/report-designer-renderers/src/field-panel-renderer.tsx:16-18`; `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:18-21`
- **证据片段**:
  ```tsx
  {
    type: 'report-field-panel',
    component: ReportFieldPanelRenderer,
    fields: [
      { key: 'title', kind: 'value-or-region', regionKey: 'title' },
  ```
- **严重程度**: P2
- **违规类别**: value-or-region
- **现状**: 两个 renderer definition 都已把 `title` 声明为 `value-or-region`，组件也按 slot 路径消费；但对应 schema 类型仍只继承 `BaseSchema.title?: string`，没有扩成可表达 region 的类型。
- **建议**: 将这两个 schema 的 `title` typing 扩展为统一的 value-or-region 形态，避免 runtime 已支持、类型层却继续误报非法。
- **为什么值得现在做**: 这是已激活能力的 typing 漂移，直接误导 TS authoring 与工具提示。
- **误报排除**: 不是单纯跨包一致性建议；这里已有 live metadata、live renderer consumption 和公开 schema surface 同时成立。
- **历史模式对应**: public/internal schema typing 滞后于 field metadata 的 `value-or-region` 基线
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度12-01]: 保留 (P2)。`tag-list` 仍违反 wrapped-field label 交互语义。
- [维度12-02]: 保留 (P2)。`NodeFrameWrapper` 仍把 resolved field chrome 与 raw schema fallback 混用。
- [维度12-03]: 降级为 P3。deep-region 规则仍放在 compiler-global 表中，但当前更像 architecture debt，而非直接 live contract breakage。
- [维度12-04]: 保留 (P2)。`report-field-panel` / `report-inspector-shell` 的 `title` typing 仍窄于 live `value-or-region` metadata。

## 子项复核结论

- [维度12-03]: 成立 (P3)。compiler-global deep normalizer 表仍存在 owner drift，但证据更适合 architecture debt 级别。
- [维度12-04]: 成立 (P2)。`title` typing 确认仍落后于 live metadata 与 renderer slot 消费。

## 最终保留项

| 编号  | 严重程度 | 文件                                                     | 一句话摘要                                                  |
| ----- | -------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| 12-01 | P2       | `packages/flux-renderers-form-advanced/src/tag-list.tsx` | `tag-list` 仍违反 wrapped-field label 交互语义              |
| 12-02 | P2       | `packages/flux-react/src/node-frame-wrapper.tsx`         | field chrome 仍混用 resolved props 与 raw schema fallback   |
| 12-03 | P3       | `packages/flux-compiler/src/schema-compiler/tables.ts`   | deep-region 规则仍分裂在 compiler-global renderer tables 中 |
| 12-04 | P2       | `packages/report-designer-renderers/src/renderers.tsx`   | `title` typing 仍窄于 live `value-or-region` metadata       |
