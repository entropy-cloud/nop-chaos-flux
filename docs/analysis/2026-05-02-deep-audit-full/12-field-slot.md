# 12 表单字段与 Slot 建模

## 复核统计

- 初审条目: 5
- 维度复核: 完成
- 子项复核: 2 条
- 保留: 2
- 降级: 1
- 驳回: 2

## 保留

### [维度12] `NodeFrameWrapper` 仍直接从 raw schema 读取 hint/description/remark

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx:25-46`
- **证据片段**:
  ```tsx
  25: const schema = props.templateNode.schema as Record<string, unknown>;
  28: const hintValue = typeof schema.hint === 'string' ? schema.hint : undefined;
  29: const descriptionValue = typeof schema.description === 'string' ? schema.description : undefined;
  31: const remarkValue =
  ```
- **严重程度**: P2
- **违规类别**: field-frame / normalized wrapper input
- **现状**: label 已走 normalized channel，但 hint/description/remark/labelRemark 仍靠 wrapper 重新扫描原始 schema。
- **建议**: 为这组 field chrome 输入补齐更一致的 normalized handoff，或把 schema fallback 明确文档化为例外。
- **为什么值得现在做**: 这是 wrapper contract 里最后一块明显混用 raw schema 的缝隙。
- **误报排除**: item review确认问题是 owner channel 混用，不要求把所有 chrome 都转成 region。
- **历史模式对应**: normalized handoff 与 raw-schema fallback 共存
- **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: `子项复核通过`

### [维度12] `variant-field` 手动 `FieldFrame`，绕过公共 `wrap/frameWrap` 路径

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:303-323`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:326-340`
- **证据片段**:
  ```tsx
  303: return (
  304:   <FieldFrame
  315:     className={props.meta.className}
  319:     rootProps={{ 'data-active-variant': activeKey }}
  ```
  ```tsx
  326: export const variantFieldRendererDefinition: RendererDefinition = {
  327:   type: 'variant-field',
  328:   component: VariantFieldRenderer as any,
  ```
- **严重程度**: P2
- **违规类别**: field-frame / wrapper contract
- **现状**: `variant-field` 不是“没有 field frame”，而是自己实例化 `FieldFrame`，没有声明 `wrap: true`，因此不会走公共 `frameWrap` 分支。
- **建议**: 单独评估 `variant-field` 是否应进入公共 wrapper path，至少要把 `frameWrap` contract 语义补齐或文档化。
- **为什么值得现在做**: 这是会影响 `frameWrap: false/'none'/'group'` 的真实 contract gap。
- **误报排除**: item review已把原 lead 收窄为“绕过公共路径”，而非“完全缺失 field frame”。
- **历史模式对应**: 手动 wrapper 分叉
- **参考文档**: `docs/architecture/field-frame.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度12] `detail-view` 是 field-like surface，但是否必须接入 `FieldFrame` 仍需 owner 再定

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:260-267`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:311-325`
- **证据片段**:
  ```tsx
  260: return (
  261:   <div
  266:     <FieldLabel content={labelContent} />
  ```
- **严重程度**: P2
- **违规类别**: field-frame
- **现状**: `detail-view` 当前确实跳过 `FieldFrame` / `wrap: true` 路径，但 live doc 同时把它定位为 detail owner surface，不完全等同普通 field。
- **建议**: 作为 owner decision follow-up 跟进，不直接把它定成当前必修违约。
- **为什么值得现在做**: 需要先决定 detail-view 的产品/架构角色。
- **误报排除**: item review确认这不是零问题，但也不足以直接认定为明确 contract defect。
- **历史模式对应**: field-like owner surface 角色未完全收口
- **参考文档**: `docs/architecture/value-adaptation-and-detail-field.md`
- **复核状态**: `已降级`

## 已驳回

### [维度12] 所有 `*Action` 字段都应从 `prop` 改成 `event`

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:330-339`, `docs/architecture/field-metadata-slot-modeling.md:227-244`
- **证据片段**:
  ```md
  241: - a field may still be classified as `event` metadata even when its schema name is not `onXX`
  244: - field kind and naming convention are related but not identical concerns
  ```
- **严重程度**: P3
- **现状**: 当前文档并未规定所有 owner semantic action slot 必须建模成 `event`；原 lead 过强。
- **风险**: 若继续按原说法推动，会与现有 live baseline 冲突。
- **建议**: 不作为本轮问题汇总项。
- **为什么值得现在做**: 防止把尚未收口的 modeling choice 误写成 live defect。
- **误报排除**: 该路径已有 plan/log 记录为当前允许的中间态。
- **历史模式对应**: semantic action naming 与 field kind 被机械绑定
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: `已驳回`

### [维度12] `variant-field` 的 `variants[].content/viewer` 当前必须进入 deep region normalization

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:63-65`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:330-333`
- **证据片段**:
  ```tsx
  63: const variants = React.useMemo(
  64:   () => ((props.schema as VariantFieldSchema).variants ?? []) as VariantOption[],
  ```
- **严重程度**: P3
- **现状**: 该行为属实，但 current plan/log 已把它标为接受中的 schema-owned static config 例外。
- **风险**: 若无新的 owner doc 变更，不宜再按 defect 重报。
- **建议**: 暂不纳入最终问题清单。
- **为什么值得现在做**: 避免与当前已接受的 baseline 冲突。
- **误报排除**: item review已核对相关计划与日志记录。
- **历史模式对应**: accepted exception 被误报为 defect
- **参考文档**: `docs/plans/169-complex-renderer-contract-and-field-slot-convergence-plan.md`, `docs/logs/2026/05-01.md`
- **复核状态**: `已驳回`

## 零发现

- table deep extraction、tabs.items 等 compiler/runtime 协作当前正常。
- `code-editor` 的 field metadata 完整度当前正常。
- 多数 basic/form/data renderer 的 field metadata 当前无可报告缺口。
