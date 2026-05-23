# 维度12 表单字段与 Slot 建模

- 初审发现数: 3
- 复核结果: 保留 2 / 降级 1 / 驳回 0

### [维度12] `detail-field` 在 `wrap: true` 下把交互按钮放进 FieldFrame label 子树

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:205-229,259-272`, `packages/flux-react/src/field-frame.tsx:138-155`
- **证据片段**:

```tsx
<Button type="button" ...>
```

- **严重程度**: P1
- **违规类别**: field-frame
- **现状**: `detail-field` 仍使用默认 wrapped field 路径，但内部渲染真实按钮触发详情面。
- **风险**: label 子树交互语义异常，可能造成点击区域/可访问性问题。
- **建议**: 参照 `variant-field` 改为 `FieldFrame rootTag="div"` 或移出 label 子树。
- **为什么值得现在做**: 文档已明确禁止这种模式，修复路径清晰。
- **误报排除**: 不是理论风险；仓内已有同类审计规则与现成规避模式。
- **历史模式对应**: wrapped-field action inside label subtree。
- **参考文档**: `docs/architecture/field-frame.md`
- **复核状态**: `维度复核通过`

### [维度12] `detail-field` / `detail-view` 公开 detail action 字段但 runtime 完全不消费

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/composite-schemas.ts:76-107`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:264-272`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:342-352`, `packages/flux-compiler/src/schema-compiler/fields.ts:23-47`
- **证据片段**:

```ts
openAction?: ActionSchema;
confirmAction?: ActionSchema;
cancelAction?: ActionSchema;
```

- **严重程度**: P1
- **违规类别**: event
- **现状**: schema 已公开这三组动作字段，但 definition 未声明为 event，renderer 也完全不读。
- **风险**: 作者写入这些字段时会 silently no-op，形成假契约。
- **建议**: 要么显式建模为 event 并消费，要么从公开 schema 中移除。
- **为什么值得现在做**: 这是“写了也不报错、也不生效”的高误导性接口。
- **误报排除**: 不是 lifecycle action，也不是 `ignored`；当前会被 compiler 当普通 prop 吞掉。
- **历史模式对应**: public schema field silently unused。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/value-adaptation-and-detail-field.md`
- **复核状态**: `维度复核通过`

### [维度12] `detail-view` 自带 label 读取路径但没有接入统一 `FieldFrame`

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:54,293-307,338-352`
- **证据片段**:

```tsx
const labelContent = resolveFieldLabelContent(props);
<FieldLabel content={labelContent} />;
```

- **严重程度**: P3
- **违规类别**: field-frame / wrapper-bypass
- **现状**: `label` 的 value-or-region 仍然正常，但 `required/hint/remark/frameWrap` 等共享 field chrome 没有接入。
- **风险**: `detail-view` 在 field 语义上成为特例，统一外壳能力缺口持续存在。
- **建议**: 明确其是否是字段面；若是，则接入 `FieldFrame`；若不是，则移除 field-like label 约定。
- **为什么值得现在做**: 当前实现已处于“半字段化”状态，最容易误导后续扩展。
- **误报排除**: 不是说 label slot 建模失效；问题在共享 wrapper 契约未接入。
- **历史模式对应**: partial field semantics without shared chrome.
- **参考文档**: `docs/architecture/field-frame.md`
- **复核状态**: `已降级`

## 复核备注

- 维度复核额外发现 `detail-field/detail-view` 的 nested path 读取仍有更高风险的浅读问题，但未纳入本轮已复核通过条目，建议另开 bug 追踪。
