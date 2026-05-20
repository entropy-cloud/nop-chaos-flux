# 维度 12: 表单字段与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] code-editor `wrap: true` 但未声明共享 field chrome 规则，schema-fragment `hint/description` 会落入 prop 通道

- **文件**: `packages/flux-code-editor/src/code-editor-renderer.tsx`
- **行号范围**: `31-52`, `203-222`
- **证据片段**:
  ```ts
  export const codeEditorFieldRules: SchemaFieldRule[] = [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    { key: 'value', kind: 'prop' },
    { key: 'language', kind: 'prop' },
    { key: 'mode', kind: 'prop' },
    { key: 'placeholder', kind: 'prop' },
    { key: 'readOnly', kind: 'prop', valueType: 'boolean' },
    { key: 'required', kind: 'prop', valueType: 'boolean' },
    { key: 'expressionConfig', kind: 'prop' },
    { key: 'sqlConfig', kind: 'prop' },
  ```
  ```ts
  export const codeEditorRendererDefinition: RendererDefinition = {
    type: 'code-editor',
    component: CodeEditorRenderer,
    fields: codeEditorFieldRules,
    validation: {
      kind: 'field',
  ```
  ```ts
    },
    wrap: true,
  };
  ```
- **严重程度**: P2
- **违规类别**: field-rule / value-or-region / field-frame
- **现状**: `code-editor` 是 `wrap: true` 的表单字段渲染器，但 `fields` 只显式声明了 `label`，没有复用或等价声明 `formFieldChromeRules` 中的 `hint`、`description`、`remark`、`labelRemark`、`labelAlign`、`labelWidth`。在当前 compiler 默认规则下，`hint` / `description` 会作为普通 `prop` 编译，而不是 `value-or-region`。
- **风险**: 文档允许 field chrome slot 通过 field metadata 统一建模；如果 schema 作者写 `hint: { type: 'tpl', ... }` 或 `description: [...]`，该值不会进入 `regions.hint` / `regions.description`，而会作为普通对象进入 `props`，随后 `NodeFrameWrapper` 把它当 `ReactNode` 传给 `FieldFrame`，轻则 slot 丢失，重则出现 “object is not a valid React child” 类渲染错误。
- **建议**: 让 `codeEditorFieldRules` 复用 `formFieldRules` 或至少补齐与 `formFieldChromeRules` 等价的显式规则；若 `code-editor` 有意不支持某些 chrome 字段，应在 renderer definition 中显式 `ignored` 并在组件设计文档说明，而不是依赖默认 prop 分类。
- **为什么值得现在做**: 这是已进入主路径的 `wrap: true` 字段渲染器，不是 blanket FieldFrame adoption；问题直接发生在 field metadata 与 FieldFrame chrome handoff 之间，修复范围小且可避免后续复杂字段继续复制不完整规则。
- **误报排除**: 不是要求所有复杂控件迁移到同一个 shell；`code-editor` 已声明 `wrap: true`，因此必须满足共享 wrapper 输入契约。当前问题也不是单纯“缺少美观一致性”，而是 schema fragment slot 被错误分类到 prop 通道。
- **历史模式对应**: 命中 calibration pattern 9 的高举证门槛后仍保留：这里不是泛化要求采用 FieldFrame，而是 `wrap: true` 已采用后未声明完整 field chrome metadata，导致 slot contract 破坏。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`（renderer metadata owns field semantics、value-or-region、renderer consumes normalized props/regions）；`docs/architecture/field-frame.md`（NodeFrameWrapper / FieldFrame normalized wrapper handoff）；`docs/architecture/renderer-runtime.md`（slot-like fields 从 metadata + compiler normalization 而来）。
- **复核状态**: 未复核

### [维度12-02] variant-field 直接 FieldFrame 路径丢弃 `hint/description` 的 value-or-region 区域

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx`
- **行号范围**: `variant-field.tsx:89-102`, `variant-field-view.tsx:208-216`
- **证据片段**:
  ```ts
  export const variantFieldRendererDefinition: RendererDefinition<VariantFieldSchema> = {
    type: 'variant-field',
    component: VariantFieldRenderer,
    fields: [
      ...formFieldRules,
      { key: 'variants', kind: 'prop' },
      { key: 'selector', kind: 'prop' },
      { key: 'selectorMode', kind: 'prop' },
      { key: 'defaultVariant', kind: 'prop' },
      { key: 'detectVariantAction', kind: 'event' },
  ```
  ```tsx
  return (
    <FieldFrame
      name={name || undefined}
      label={labelContent}
      required={schemaProps.required === true || undefined}
      hint={schemaProps.hint as string | undefined}
      description={schemaProps.description as string | undefined}
      remark={remarkValue}
      labelRemark={labelRemarkValue}
  ```
- **严重程度**: P2
- **违规类别**: field-frame / slot / value-or-region
- **现状**: `variant-field` 的 definition 使用 `formFieldRules`，其中 `hint` 和 `description` 是 `value-or-region`；但渲染层绕过 `NodeFrameWrapper` 直接调用 `FieldFrame`，只从 `schemaProps.hint` / `schemaProps.description` 读取字符串，并未像 `NodeFrameWrapper` 或 `resolveRendererSlotContent` 那样读取 `props.regions.hint` / `props.regions.description`。
- **风险**: schema 作者使用 richer field chrome（例如 fragment 形式的 hint/description）时，compiler 会正确抽取为 region，但 `VariantFieldView` 不消费这些 region，导致字段提示/描述在 variant-field 上静默消失。该问题还会误导后续维护者：definition 看起来已声明共享 chrome 规则，实际 direct FieldFrame path 没有履行同一 contract。
- **建议**: 将 `hintContent` / `descriptionContent` 在 `VariantFieldRenderer` 中通过 `resolveRendererSlotContent(props, 'hint')` 和 `resolveRendererSlotContent(props, 'description')` 解析后传入 `VariantFieldView`；或让 `VariantFieldView` 接收完整 `regions` 并在本地按标准 helper 解析，避免只 cast 字符串。
- **为什么值得现在做**: `pnpm check:audit-fieldframe-bypasses` 已把该文件列为唯一 direct FieldFrame suspect；这里有直接 slot 丢失证据，满足 calibration pattern 9 要求的“直接 shell/slot contract 问题”，不是为了统一外观而做 blanket adoption。
- **误报排除**: `field-frame.md` 允许特殊控件在无法安全承载 secondary action 时使用 local `FieldFrame rootTag="div"`，因此 direct FieldFrame 本身不是问题；本发现只针对该 local path 未实现与 `formFieldRules` 相匹配的 `hint/description` value-or-region 消费。
- **历史模式对应**: 对应 calibration pattern 9 的保留条件：直接 wrapper 路径造成共享 field chrome slot 丢失；也与 reopened adjudication 1 不冲突，因为本条不要求替换 wrapped secondary actions，只检查 FieldFrame chrome 输入。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`（value-or-region 应 normalize 到 props 或 regions，renderer 不应猜 raw schema）；`docs/architecture/field-frame.md`（FieldFrame normalized wrapper handoff、local rootTag path 必须保留 frameWrap 语义）；`docs/references/audit-tooling.md`（fieldframe-bypass suspect 需人工确认）。
- **复核状态**: 未复核

## 渲染器 field metadata 完整性摘要（初审辅助）

- **命令基线**: 已运行 `pnpm check:audit-fieldframe-bypasses`，输出 `variant-field-view.tsx` direct `FieldFrame` 使用 3 处 suspect；本轮只将其中存在直接 slot contract 证据的部分写为发现。
- **硬门禁基线**: 主 agent 提供 `pnpm lint` 包含 `check:renderer-definition-fields-only` 与 `check:finite-prop-contracts` 的背景；本轮未把这些硬门禁覆盖项重复报告。
- **覆盖范围**: 抽查了 renderer definition field metadata、`value-or-region` 消费、deep region extraction、direct `FieldFrame` path、`resolveRendererSlotContent` 使用路径，重点文件包括 `flux-code-editor`、`flux-renderers-form(-advanced)`、`flux-renderers-data`、`flux-renderers-basic`、`flux-compiler/schema-compiler/*`、`flux-react/node-frame-wrapper.tsx`。
- **未作为发现的已合规样例**: `table/chart/tree` 的 `empty/title/header/footer/loadingContent` 基本通过 renderer metadata + `resolveRendererSlotContent` 或显式 region handle 消费；`table.columns[]`、`tabs.items[]`、`variant-field.variants[]` 的 deep region extraction 已有集中 normalizer，并非本轮问题点。
- **需复核关注**: 上述两条均是初审发现，尚未经过独立维度复核或子项复核。

## 深挖第 2 轮追加

### [维度12-03] quick-save action 已改为 `event` metadata，但 table/crud 仍从 `props` 读取，导致 action 不执行

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\data-renderer-definitions.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer-definition.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\table-body-row-rendering.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\table-quick-edit-controller.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer.tsx`
- **行号范围**: `data-renderer-definitions.ts:132-133`, `crud-renderer-definition.ts:258-259`, `table-body-row-rendering.tsx:309-317`, `table-quick-edit-controller.ts:321-330`, `crud-renderer.tsx:109-111,258-260,285-313`
- **证据片段**:
  ```ts
  { key: 'quickSaveAction', kind: 'event' },
  { key: 'quickSaveItemAction', kind: 'event' },
  ```
  ```tsx
  <TableQuickEditCell
    column={column}
    rowScope={rowScope}
    quickSaveAction={schemaProps.quickSaveAction}
    quickSaveItemAction={schemaProps.quickSaveItemAction}
  />
  ```
  ```ts
  if (!saveAction || !dirty || savingRef.current) {
    return;
  }
  const result = await helpers.dispatch(saveAction, { scope: draftRowScope });
  ```
- **严重程度**: P1
- **违规类别**: event / field-rule
- **现状**: `quickSaveAction` / `quickSaveItemAction` 在 `table` 与 `crud` definitions 中已声明为 `event`，compiler 会放入 `eventPlans` 并由 `NodeRenderer` 暴露为 `props.events.*` handler；但 table quick-edit 仍从 `schemaProps.quickSaveAction` / `schemaProps.quickSaveItemAction` 读取旧 prop 通道。由于 event 字段不会进入 `props.props`，`saveAction` 实际会是 `undefined`，`runSave()` 直接 return。
- **风险**: inline/dialog quick-edit 的保存按钮看似可用，但 schema 中声明的保存动作不会触发。CRUD 路径还从 authored/raw schema 回填 quick-save action 到 synthetic table props，同时只 cast `props.events` 给 table，导致同一 action 字段同时存在 event metadata 与 raw prop fallback 两套语义，破坏 field metadata owns event semantics 的契约。
- **建议**: 让 `TableQuickEditCell` / controller 接收 normalized event handler，例如 `props.events.quickSaveItemAction ?? props.events.quickSaveAction`，调用时传入 draft row event payload 和 `{ scope: draftRowScope }`；CRUD synthetic table props 不应再从 authored schema 回填 quick-save action 到 props，应显式转发或重包 quick-save event handler 到 table `events`。
- **为什么值得现在做**: 这是前序 action-intent 修复后的消费层残留，直接影响数据表/CRUD quick-edit 保存主路径，不是抽象一致性问题；修复范围集中在 quick-edit action handoff，且可用现有 CRUD quick-edit 测试补回回归覆盖。
- **误报排除**: 这不是重复报告“quickSaveAction 应改为 event”的旧问题；live code 已经把 metadata 改为 `event`。本条新发现是消费层仍按旧 prop/action-schema 路径读取，导致已编译 event channel 被绕开且保存动作丢失。
- **历史模式对应**: 对应此前维度 12 中 action-intent schema field 误走普通 prop 通道的历史模式，但本次是修复迁移后的半收口残留：definition 进入 event channel，renderer adapter 未同步消费 normalized `events`。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`（event 字段应保留 declarative action data 并由 renderer adapter 合成回调）；`docs/architecture/renderer-runtime.md`（RendererComponentProps 的 `events` 是 declarative event fields 派生出的 runtime event handlers）；`docs/references/deep-audit-calibration-patterns.md`（V1 Override，live partial migration 不应作为过渡态豁免）。
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度12-04] NodeFrameWrapper 未消费 `hint/description` regions，导致所有标准 `wrap: true` 字段的 fragment chrome 静默丢失

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-reading.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-frame-wrapper.tsx`
- **行号范围**: `field-reading.tsx:21-33`, `node-frame-wrapper.tsx:36-43,69-75`
- **证据片段**:
  ```ts
  export const formFieldChromeRules: SchemaFieldRule[] = [
    { key: 'hint', kind: 'value-or-region', regionKey: 'hint' },
    { key: 'description', kind: 'value-or-region', regionKey: 'description' },
    { key: 'remark', kind: 'prop' },
    { key: 'labelRemark', kind: 'prop' },
    { key: 'labelAlign', kind: 'prop' },
    { key: 'labelWidth', kind: 'prop' },
  ];
  ```
  ```tsx
  const hintValue =
    typeof props.resolvedPropsValue.hint !== 'undefined'
      ? (props.resolvedPropsValue.hint as ReactNode)
      : undefined;
  const descriptionValue =
    typeof props.resolvedPropsValue.description !== 'undefined'
      ? (props.resolvedPropsValue.description as ReactNode)
      : undefined;
  ```
  ```tsx
  <FieldFrame
    name={fieldName}
    label={labelValue}
    required={requiredValue}
    hint={hintValue}
    description={descriptionValue}
  ```
- **严重程度**: P1
- **违规类别**: field-frame / slot / value-or-region
- **现状**: 标准表单字段通过 `formFieldChromeRules` 将 `hint` / `description` 声明为 `value-or-region`，schema fragment 会被 compiler 归一化到 `regions.hint` / `regions.description`；但通用 `NodeFrameWrapper` 只读取 `resolvedPropsValue.hint` / `resolvedPropsValue.description`，没有像 `label` 一样 fallback 到 region。
- **风险**: 所有复用 `formFieldRules` 且 `wrap: true` 的普通字段（input、select、textarea、array-field、object-field、tree-select 等）在作者使用 fragment 形式的 hint/description 时都会静默丢失 FieldFrame chrome。该问题位于共享 wrapper 主路径，会让 renderer metadata 看似正确、实际运行时不履行 `value-or-region` contract，后续开发者还可能误以为问题在单个字段渲染器。
- **建议**: 在 `NodeFrameWrapper` 中按标准 slot 解析规则补齐 `hint` / `description` 的 region fallback，例如 `props.regions.hint?.render() ?? props.resolvedPropsValue.hint`、`props.regions.description?.render() ?? props.resolvedPropsValue.description`，或抽出可在 wrapper 层复用的 `resolveRendererSlotContent` 等价 helper；同时补充覆盖 fragment hint/description 的 FieldFrame wrapper 回归测试。
- **误报排除**: 这不是重复报告 [维度12-01] 的 `code-editor` 未声明 chrome 规则，也不是 [维度12-02] 的 `variant-field` direct FieldFrame 路径；本条针对已经正确声明 `formFieldChromeRules` 的通用 `NodeFrameWrapper` 主路径。也不是要求 blanket FieldFrame adoption，受影响渲染器已经显式 `wrap: true` 并进入共享 wrapper contract。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`（`value-or-region` 应 normalize 到 props 或 regions，renderer 只消费 normalized outputs）；`docs/architecture/field-frame.md`（NodeFrameWrapper / FieldFrame normalized wrapper handoff）；`docs/architecture/renderer-runtime.md`（slot-like fields 应来自 metadata + compiler normalization）。
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的高价值问题。深挖结束。
