# 维度 12: 表单字段与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] `formFieldRules` 未显式覆盖 BoundFieldSchemaBase 的 FieldFrame 输入

- **文件**: `packages/flux-renderers-form/src/field-utils/field-reading.tsx:10-21`; `packages/flux-react/src/node-frame-wrapper.tsx:25-43`
- **证据片段**:

  ```ts
  export const formLabelFieldRule: SchemaFieldRule = {
    key: 'label',
    kind: 'value-or-region',
    regionKey: 'label',
  };

  export const formBooleanFieldRules: SchemaFieldRule[] = [
    { key: 'readOnly', kind: 'prop', valueType: 'boolean' },
    { key: 'required', kind: 'prop', valueType: 'boolean' },
  ];
  ```

- **严重程度**: P3
- **违规类别**: field-rule / field-frame
- **现状**: `hint`、`description`、`remark`、`labelRemark`、`labelAlign`、`labelWidth` 等 FieldFrame inputs 未在共享 field rules 显式声明，当前依赖 compiler 默认 prop fallback。
- **风险**: tooling/设计器/有限 prop contract 从 `RendererDefinition.fields` 推导时看不到完整 field chrome 能力；未来默认 prop fallback 收紧会产生漂移。
- **建议**: 将完整 FieldFrame chrome inputs 纳入共享 field rules，按需要声明 `prop` 或 `value-or-region`。
- **为什么值得现在做**: 显式化可提升字段外壳契约可发现性。
- **误报排除**: 子项复核确认这些字段仍会因默认 prop fallback 进入 resolved props，故从 P1 降为 P3。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/field-frame.md`
- **复核状态**: 已降级

### [维度12-02] `chart.title` 建模为纯 prop，未支持 title slot

- **文件**: `packages/flux-renderers-data/src/data-renderer-definitions.ts:157-167`; `packages/flux-renderers-data/src/chart-renderer.tsx:43-64`
- **证据片段**:
  ```ts
  fields: [
    { key: 'source', kind: 'prop' },
    { key: 'series', kind: 'prop' },
    { key: 'chartType', kind: 'prop' },
    { key: 'title', kind: 'prop' },
    { key: 'xAxis', kind: 'prop' },
    { key: 'yAxis', kind: 'prop' },
    { key: 'height', kind: 'prop' },
  ```
- **严重程度**: P2
- **违规类别**: value-or-region / slot
- **现状**: chart `title` 仅为 string prop；owner docs 将 `title` 作为典型 slot-like 字段。
- **风险**: 同名 `title` 在 page/dialog 可为 schema fragment，在 chart 中不能，DSL 心理模型分裂。
- **建议**: 将 chart `title` 改为 `value-or-region`，renderer 用 slot resolver 并保留文本 fallback 用于 a11y。
- **为什么值得现在做**: 小范围修复，和现有 `empty` value-or-region 一致。
- **误报排除**: 不要求所有字段 slot 化；`title` 是文档明确代表字段。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 维度复核通过

### [维度12-03] table public schema 暴露 `loadingSlot` 内部后缀

- **文件**: `packages/flux-renderers-data/src/data-renderer-definitions.ts:120-141`; `packages/flux-renderers-data/src/schemas.ts:73-78`
- **证据片段**:
  ```ts
  { key: 'header', kind: 'value-or-region', regionKey: 'header' },
  { key: 'footer', kind: 'value-or-region', regionKey: 'footer' },
  { key: 'loading', kind: 'prop' },
  ...
  { key: 'empty', kind: 'value-or-region', regionKey: 'empty' },
  { key: 'loadingSlot', kind: 'value-or-region', regionKey: 'loadingSlot' },
  ```
- **严重程度**: P2
- **违规类别**: slot naming
- **现状**: `loading` 是 boolean state，`loadingSlot` 是 loading content slot，JSON 字段名泄漏内部 slot 后缀。
- **风险**: authoring schema 逐步出现 `*Slot`/`*Region`，削弱 field metadata 对 internal region key 的封装价值。
- **建议**: 裁定自然 author-facing 字段名，如 `loadingContent`/`loadingText`，或在文档中明确该例外并避免扩散。
- **为什么值得现在做**: 字段集中在 table，越早裁定越少兼容负担。
- **误报排除**: 不反对内部变量带 Slot；问题是 public schema 字段带 Slot。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

### [维度12-04] table column deep region 已支持但 `TableColumnSchema` 暴露内部 regionKey 而缺少 author-facing 字段

- **文件**: `packages/flux-renderers-data/src/schemas.ts:39-57`; `packages/flux-compiler/src/schema-compiler/tables.ts:18-39`
- **证据片段**:
  ```ts
  export interface TableColumnSchema extends BaseSchema {
    label?: string;
    labelRegionKey?: string;
    name?: string;
    cellRegionKey?: string;
    buttons?: BaseSchema[];
    buttonsRegionKey?: string;
    quickEditBodyRegionKey?: string;
  ```
  ```ts
  export const TABLE_COLUMN_REGION_FIELDS = [
    { key: 'label', regionKeySuffix: 'label', compiledKey: 'labelRegionKey' },
    { key: 'buttons', regionKeySuffix: 'buttons', compiledKey: 'buttonsRegionKey' },
    { key: 'cell', regionKeySuffix: 'cell', compiledKey: 'cellRegionKey' },
    { key: 'body', regionKeySuffix: 'quickEditBody', compiledKey: 'quickEditBodyRegionKey' },
  ```
- **严重程度**: P2
- **违规类别**: deep-region / schema typing
- **现状**: compiler 支持 `columns[].label/buttons/cell/body` deep region extraction，但 TS schema 只暴露 compiled `*RegionKey`，缺少 author-facing `cell`/`body`，且 `label` 仅 string。
- **风险**: 作者和 tooling 看不到真实 nested slot，反而可能手写 internal `*RegionKey` 编译产物。
- **建议**: 显式建模 `label?: string | SchemaInput`、`cell?: SchemaInput`、`body?: SchemaInput`，并隔离/标注 `*RegionKey` 为 compiler-internal normalized fields。
- **为什么值得现在做**: live compiler 已支持这些字段，类型面漂移会直接误导 schema authoring。
- **误报排除**: 不重复 `loadingSlot` 命名问题；这里是 nested slot authoring 类型缺失。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 维度复核通过

## 维度复核结论

- [维度12-01]: 降级为 P3。字段仍通过默认 fallback 进入 props，但显式 metadata 不完整。
- [维度12-02]: 保留 (P2)。chart title 不支持 slot-like 建模。
- [维度12-03]: 保留 (P2)。public schema 暴露 `loadingSlot` 后缀。
- [维度12-04]: 保留 (P2)。TableColumnSchema 与 deep region compiler contract 不一致。

## 子项复核结论

- [维度12-01]: 降级为 P3。不是运行时断裂，而是显式契约/tooling 完整性问题。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                    | 一句话摘要                                                       |
| ----- | -------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 12-01 | P3       | `packages/flux-renderers-form/src/field-utils/field-reading.tsx:10-21`  | shared field metadata 未显式覆盖 FieldFrame chrome inputs        |
| 12-02 | P2       | `packages/flux-renderers-data/src/data-renderer-definitions.ts:157-167` | chart title 未按 value-or-region slot 建模                       |
| 12-03 | P2       | `packages/flux-renderers-data/src/schemas.ts:73-78`                     | table public schema 暴露 `loadingSlot` 内部后缀                  |
| 12-04 | P2       | `packages/flux-renderers-data/src/schemas.ts:39-57`                     | table column nested slots 在 TS schema 中缺少 author-facing 字段 |
