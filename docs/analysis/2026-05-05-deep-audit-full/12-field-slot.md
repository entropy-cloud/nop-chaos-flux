# 维度 12：表单字段与 Slot 建模

## 初审

- 初审提出 3 条：`report-inspector.body` 分类、wrapped field 与 `FieldFrame<label>` 冲突、table quick-edit region 提取漂移。

## 维度复核

- 保留：wrapped field 在默认 `FieldFrame<label>` 下放次级按钮的冲突。
- 保留：公开 schema typings 中 `label/title` 仍落后于 live `value-or-region` 基线。
- 降级：table quick-edit region 规则是半成品漂移，而非已完全落地的 contract break。
- 驳回：`report-inspector.body` 当前 bridge shape 不按 slot 违约处理。

## 最终结论

### [维度12] wrapped field renderer 仍在默认 `FieldFrame<label>` 壳层内放次级按钮

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx:52-63`, `packages/flux-renderers-form-advanced/src/array-editor.tsx:322-353`, `packages/flux-renderers-form-advanced/src/key-value.tsx:360-389`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:259-266`
- **证据片段**:
  ```tsx
  <FieldFrame ... layout={... ? 'checkbox' : 'default'}>
  ```
  ```tsx
  <Button type="button" ...>{t('flux.form.addItem')}</Button>
  ```
- **严重程度**: P1
- **现状**: 这些 wrapped field 会落进默认 `<label>` 壳层，但内部又放次级按钮。
- **风险**: label 点击、副操作焦点与语义混杂，容易引发交互与可访问性冲突。
- **建议**: 对这类控件改用 `rootTag="div"`、关闭 `wrap`，或采用不依赖原生 labelable button 的本地 action 壳层。
- **参考文档**: `docs/architecture/field-frame.md`
- **复核状态**: `维度复核通过`

### [维度12] 公开 schema typings 中 `label/title` 仍落后于 live `value-or-region` 基线

- **文件**: `packages/flux-core/src/types/schema.ts`, `packages/flux-renderers-basic/src/basic-renderer-definitions.ts`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/report-designer-renderers/src/renderers.tsx`
- **证据片段**:
  ```ts
  // flux-core schema base still narrows label/title to string-only shape
  ```
- **严重程度**: P2
- **现状**: 多个 renderer definition 已按 `value-or-region` 工作，但共享 schema typing 仍停留在旧的窄类型。
- **风险**: 类型和 live renderer contract 脱节，降低 authoring/tooling 可理解性。
- **建议**: 为 `label/title` 提供与 current slot/value-or-region 基线一致的公开类型。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: `维度复核通过`

### [维度12] table quick-edit region 提取是未闭合的半成品规则

- **文件**: `packages/flux-compiler/src/schema-compiler/tables.ts:25-29`, `packages/flux-compiler/src/schema-compiler/regions.ts:89-107`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:42-55`
- **证据片段**:
  ```ts
  { key: 'body', regionKeySuffix: 'quickEditBody', compiledKey: 'quickEditBodyRegionKey' }
  ```
- **严重程度**: P3
- **现状**: 编译器出现了 `quickEditBodyRegionKey` 规则，但它并未真正闭合到 `quickEdit.body` 契约与 renderer 消费链。
- **风险**: 后续继续推进 deep region 规范时容易误以为该路径已收口。
- **建议**: 要么完整接通 `quickEdit.body` 的 deep region 链路，要么删除当前半成品规则。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: `已降级`

### [维度12] `report-inspector.body` 维持当前 prop-based schema carrier

- **文件**: `packages/report-designer-renderers/src/renderers.tsx:21-24`, `packages/report-designer-renderers/src/report-designer-inspector.tsx:27-29`
- **证据片段**:
  ```ts
  fields: [{ key: 'body', kind: 'prop' }];
  ```
- **严重程度**: P3
- **现状**: 当前 bridge shape 显式把 schema 作为 prop carrier 注入，不按 slot 违约处理。
- **风险**: 无。
- **建议**: 维持现状，除非后续 owner doc 明确收敛为 region。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: `已驳回`
