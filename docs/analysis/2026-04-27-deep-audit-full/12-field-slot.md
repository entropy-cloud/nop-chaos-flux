# 维度 12：表单字段与 Slot 建模

## 审核范围

检查所有渲染器的 field metadata 完整性、value-or-region 实现、FieldFrame 集成、slot 分类。

## 发现清单

### [维度12] variant-field 手动实例化 FieldFrame 但未转发 BoundFieldSchemaBase 属性 ★ P1

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:243-256`
- **证据片段**:
  ```tsx
  <FieldFrame
    name={name || undefined}
    label={labelContent}
    rootTag="div"
    className={props.meta.className}
    testid={props.meta.testid}
    cid={props.meta.cid}
    rootProps={{ 'data-active-variant': activeKey }}
  >
  ```
- **严重程度**: P1
- **违规类别**: field-frame
- **现状**: variant-field 手动实例化 FieldFrame，但只传递了 7 个属性（name, label, rootTag, className, testid, cid, rootProps），缺少 BoundFieldSchemaBase 中的 7 个核心 UI 属性：`required`、`hint`、`description`、`remark`、`labelRemark`、`labelAlign`、`labelWidth`。
- **风险**: 用户在 schema 中配置的必填标记、提示文本、标签对齐、标签宽度等属性在 variant-field 中不生效。与其他 8 个 BoundField 渲染器（均通过 `wrap: true` + NodeFrameWrapper 自动完整转发）不一致。无测试覆盖此组合行为。
- **建议**: 按照 NodeFrameWrapper 的模式补全缺失的 7 个属性转发。variant-field 不能使用 `wrap: true`（需要传 `rootProps`），但手动实例化时应完整转发。
- **为什么值得现在做**: 用户可感知的 UI 缺陷——必填标记不显示、表单布局不一致、帮助文本丢失。修复路径清晰（纯属性转发补全）。
- **误报排除**: 不是合理的中间态——BoundFieldSchemaBase 是当前已生效的契约，variant-field 明确 extends 了这个接口但未完整实现。
- **历史模式对应**: 其他 8 个 BoundField 渲染器均通过 `wrap: true` 正确实现，variant-field 是唯一偏离。
- **参考文档**: `docs/architecture/field-frame.md`, `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 子项复核通过（P1 维持）

### [维度12] detail-view 使用 FieldLabel 而非 FieldFrame

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- **严重程度**: P2
- **违规类别**: field-frame
- **现状**: detail-view 渲染器使用 FieldLabel 组件显示字段标签，而非完整的 FieldFrame。这导致 hint、description、remark、labelRemark 等信息丢失。
- **风险**: detail-view 场景下字段帮助信息不显示。
- **建议**: detail-view 的只读字段应使用 FieldFrame（可能需要只读模式）而非仅 FieldLabel。
- **复核状态**: 维度复核通过

### [维度12] table header/footer 未在 fields 中显式声明（降级为 P3）

- **文件**: `packages/flux-renderers-data/src/`
- **严重程度**: P3
- **违规类别**: slot
- **现状**: table 的 header 和 footer 区域通过 regions 机制隐式处理，未在 field metadata 中显式声明为 slot。
- **风险**: 低。当前实现功能正确。
- **建议**: 可在 field metadata 统一完善时补充。
- **复核状态**: 维度复核通过，从 P2 降级为 P3

### 已驳回项

1. **fieldset title 为 string-only** — 不是 value-or-region 候选。fieldset 的 title 本身就是纯标签文本，不是 slot。

## 总结评估

1 个 P1（variant-field FieldFrame 属性转发不完整，子项复核确认 7 个属性缺失），1 个 P2（detail-view 使用 FieldLabel），1 个 P3（table slot 声明）。variant-field 是唯一需要立即修复的项目。
