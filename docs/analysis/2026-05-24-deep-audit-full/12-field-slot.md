# 维度 12：表单字段与 Slot 建模

## 第 1 轮（初审）

### [维度12-01] variant-field 的 direct FieldFrame 路径回读 raw `hint` / `description` 并用 `renderFragment` 重新编译 slot

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:29-99`
- **证据片段**:

  ```tsx
  const authoredSchema = props.templateNode.schema as VariantFieldSchema | undefined;
  ...
  const resolvedHintContent = resolveRendererSlotContent(props, 'hint');
  const resolvedDescriptionContent = resolveRendererSlotContent(props, 'description');
  const rawHintContent =
    isSchema(authoredSchema?.hint) || isSchemaArray(authoredSchema?.hint)
      ? authoredSchema.hint
      : resolvedHintContent;
  ```

  ```tsx
  const renderSlotContent = (value: unknown): React.ReactNode => {
    if (isSchema(value) || isSchemaArray(value)) {
      return toReactNode(renderFragment(value));
    }

    return toReactNode(value);
  };
  ```

- **严重程度**: P1
- **违规类别**: value-or-region / slot / field-frame
- **field metadata 完整性**: 部分完整。`variant-field` 通过 `...formFieldRules` 声明了 `label`、`hint`、`description` 为 `value-or-region`，但运行时没有只消费 normalized `props/regions` 通道。
- **现状**: `variant-field` 的 field metadata 已声明 `hint` / `description` 属于 shared field chrome 的 `value-or-region`，编译器会把 schema fragment 正规化到 `props.regions.hint/description`。但 renderer 又从 `props.templateNode.schema` 取 raw schema，并用 `useRenderFragment()` 重新渲染。
- **风险**: 这绕开了 `field-metadata-slot-modeling.md` 规定的“renderer components only consume normalized outputs”和 FieldFrame 的 normalized wrapper handoff。后续 slot param、region isolation、compiled diagnostics、source-path/node identity、预编译 import/region 语义都可能在该 direct path 与普通 `NodeFrameWrapper` path 分裂；维护者也会被测试固化的 raw fallback 误导，继续在 renderer 内做 raw schema 猜测。
- **建议**: 删除 `authoredSchema` / `renderFragment` raw fallback；`hintContent` 与 `descriptionContent` 只通过 `resolveRendererSlotContent(props, 'hint'/'description')` 或等价的 `props.regions.*?.render() ?? props.props.*` 获得。若 direct `FieldFrame` 仍必须保留，应保证它只接收 normalized field chrome。
- **为什么值得现在做**: `variant-field` 已有 metadata 与 slot helper，收口成本低且可消除同一 field 的 compiled path 与 ad-hoc path 分裂。
- **误报排除**: 这不是“机械报告 direct FieldFrame”。`variant-field-view.tsx` 的 `<FieldFrame rootTag="div">` 本身有 owner doc 支撑；真正违约点是 direct FieldFrame 的上游 slot 内容由 raw schema 回读 + ad-hoc `renderFragment` 合成，违反 active field-frame/slot contract。该项与维度 09 已发现的 `variant-field` raw schema 回读是同一根因从 field/slot metadata 角度的复核；主汇总时应交叉引用维度 09，避免重复最终项。
- **历史模式对应**: renderer 绕过 `value-or-region` 编译通道，运行期从 raw schema 重新判定 slot 类型。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`; `docs/architecture/field-frame.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度12-02] code-editor 声明为 wrapped field，却把 `props.meta.className` 消费在内部 root，导致 FieldFrame 与 control slot className 归属重叠

- **文件**: `packages/flux-code-editor/src/code-editor-renderer.tsx:33-55,160-164,313-328`
- **证据片段**:
  ```tsx
  export const codeEditorFieldRules: SchemaFieldRule[] = [
    { key: 'label', kind: 'value-or-region', regionKey: 'label' },
    ...formFieldChromeRules,
    { key: 'value', kind: 'prop' },
    ...
  ];
  ```
  ```tsx
  return (
    <div
      className={cn('nop-code-editor', props.meta.className)}
      data-cid={props.meta.cid != null ? String(props.meta.cid) : undefined}
      data-testid={props.meta.testid}
      data-theme={editorTheme}
  ```
- **严重程度**: P2
- **违规类别**: field-frame / slot
- **field metadata 完整性**: 部分完整。`label` / `hint` / `description` 使用 `value-or-region`，且 `wrap: true`，但 wrapper meta class 与 control root class 未隔离。
- **现状**: `code-editor` 选择 shared `FieldFrame` 包裹，`NodeFrameWrapper` 会把 `props.meta.frameClassName` 给 FieldFrame，把 `testid/cid` 给外层 field chrome。但 `CodeEditorRenderer` 又把 `props.meta.className/testid/cid` 用在内部 `.nop-code-editor` root。与普通 input renderers 不同，这使同一 schema-level meta 同时影响 field chrome 和 control root。
- **风险**: field slot（FieldFrame 外壳）与 content/control slot（CodeMirror 容器）样式/测试锚点边界不清。调用者难以判断 `className`、`testid` 应作用于字段外框还是编辑器控件；后续若对 FieldFrame root 做 selector 或测试定位，可能出现重复/错位锚点。
- **建议**: 对 wrapped field 统一约束：schema-level `className/testid/cid` 属于 FieldFrame；内部 control root 使用独立字段（如 `controlClassName` / `editorClassName`）或只保留稳定 marker，不消费 `props.meta.className/testid/cid`。若 code-editor 需要特殊实例锚点，应在 field-frame owner doc/组件契约中显式声明双锚点语义。
- **为什么值得现在做**: code-editor 是复杂 field，class/test hooks 错位会影响宿主样式和自动化定位；修复可以通过明确 control-level prop 避免长远混乱。
- **误报排除**: 不是要求所有复杂 field 机械迁移到 FieldFrame；它已经 `wrap: true`。问题在于 active FieldFrame contract 要求 outer chrome 统一管理 field wrapper meta，而这里 wrapped renderer 同时消费相同 meta，破坏 field slot/content slot 隔离。
- **历史模式对应**: field chrome 与 control slot meta 边界重叠。
- **参考文档**: `docs/architecture/field-frame.md`; `docs/architecture/field-metadata-slot-modeling.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 每个主要 renderer family 的 field metadata 审计摘要

- **basic renderers**: `page/dialog/drawer/tabs` 的 `title` 使用 `value-or-region`；`body/header/footer/actions/toolbar` 使用 region；`button` 事件在 `onClick` event channel；`tabs.items` deep region extraction 显式生成 `*RegionKey`。未发现新的高价值问题。
- **data renderers**: `table.columns[]`、`expandable.expandedRow`、`crud.columns[]` deep extraction 明确；`empty/header/footer/loadingContent/title` 等 slot 使用 `value-or-region`；表格事件为 event channel。未发现新的高价值问题。
- **form basic renderers**: `formFieldRules` / `formFieldChromeRules` 正确集中声明 `label/hint/description` value-or-region；input/select/textarea/checkbox/switch/radio 等 `wrap: true`；form submit/init lifecycle action 走 event channel。`fieldset.title` 当前只是 string prop 且 definition 未声明 title slot，但该组件设计为 grouping renderer，不构成 active FieldFrame slot 违约。
- **form advanced renderers**: 多数 field/composite renderer 复用 `formFieldRules`，`object-field/array-field/detail-*` 的 content region 与 FieldFrame chrome 基本隔离；`variant-field` 存在 `[维度12-01]`。
- **code-editor**: field chrome metadata 完整，但 wrapped field 内部 root 消费 `props.meta.className/testid/cid`，见 `[维度12-02]`。
- **flow designer renderers**: `designer-page.title` / `designer-field.label` value-or-region；`config` 使用 custom `compile` 处理 schema-within-prop；toolbar/inspector/dialogs 为 region。未发现新的高价值问题。
- **spreadsheet / report / word editor renderers**: host page `title` value-or-region，toolbar/panels/dialogs 为 region，主要 action 字段为 event channel；report toolbar `itemsOverride` 使用 custom compile。未发现新的高价值问题。

## 违规清单

- `[维度12-01]` `variant-field` raw `hint/description` 回读绕过 normalized value-or-region 通道（P1）。
- `[维度12-02]` `code-editor` wrapped FieldFrame 与内部 root 共享 `props.meta.className/testid/cid`，field/content slot 边界重叠（P2）。

## suspect 排除

- `pnpm check:audit-fieldframe-bypasses` 输出 `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:11,195,217`。
- 排除 direct use 本身：`field-frame.md` 允许 owner renderer 在不能安全承载 secondary action 于 `<label>` 下时采用 local `FieldFrame rootTag="div"`，前提是保留 frameWrap semantics。`variant-field-view.tsx` 使用 `rootTag="div"`、`frameWrap` 分支、`remark/labelRemark/labelAlign/labelWidth` 转发，不能机械报告为违规。
- 保留相关问题：direct path 上游 raw `hint/description` 合成违反 normalized slot contract，见 `[维度12-01]`。

## 第 2 轮深挖方向

- 围绕 `[维度12-01]` 继续深挖：`variant-field-controller.ts` 中 `authoredDetectVariantAction` / nested transform action 是否还有同类 raw schema 旁路，需区分 action owner 语义与 slot metadata 语义，避免与维度 09 重复。
- 围绕 `[维度12-02]` 深挖所有 `wrap: true` renderers 是否仍消费 `props.meta.className/testid/cid` 于内部 control root，确认是否为 code-editor 单点问题还是 wrapped field contract 漂移。
- 抽查 `resolveRendererSlotContent` 调用的 fallback/metaKey 用法，重点看是否把 field chrome slot 与 content slot 混用。

## 深挖第 2 轮追加

### [维度12-03] `input-number` 为 `wrap: true` 字段，却把 node-level `testid/cid` 复制到内部 control root

- **文件+行号**: `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:78-84`; `packages/flux-renderers-form/src/renderers/input.tsx:177-182`
- **证据片段**:
  ```tsx
  return (
    <div
      className={cn('nop-input-number', props.meta.className)}
      data-slot="field-control"
      data-testid={props.meta.testid}
      data-cid={props.meta.cid}
    >
  ```
  ```tsx
  {
    type: 'input-number',
    fields: formFieldRules,
    validation: createFieldValidation(),
    schemaValidator: validateInputFieldSchema,
    wrap: true,
    component: InputNumberRenderer,
  },
  ```
- **严重程度**: P2
- **现状**: `input-number` 复用 `formFieldRules` 且声明 `wrap: true`，会进入 `NodeFrameWrapper -> FieldFrame` 路径。外层 `FieldFrame` 已由 `NodeFrameWrapper` 接收并渲染 `props.meta.testid/cid`，但 `InputNumberRenderer` 又把同一份 `props.meta.testid/cid` 写到内部 `.nop-input-number` control root。`props.meta.className` 下沉到 control root 与当前 field-like widget className baseline 一致，本条问题集中在 `testid/cid` 的重复落点。
- **风险**: 同一个 schema node 会出现两个相同的 `data-testid` / `data-cid`：外层 FieldFrame field slot root 与内部 input-number control slot root。测试查询可能命中不稳定；debugger/inspect DOM bridge 也会在同一 mounted node 子树下看到重复 cid，削弱 `cid` 作为 mounted inspectable node root identity 的约束。
- **建议**: 对 `wrap: true` 字段，保留 `props.meta.testid/cid` 只由 FieldFrame 承载；内部 control root 如需专用测试锚点，应使用独立 control-level prop，或依赖稳定 marker / `data-slot="field-control"`。保留 `props.meta.className` 在 canonical control root 的现有样式语义，避免把 className 与 testid/cid 机械等同处理。
- **误报排除**: 这不是重复报告 code-editor meta root overlap；`input-number` 是基础 form renderer，且同包其他基础输入大多只下沉 `className`，没有复制 `testid/cid`。这也不是反对 field-like widget 的 control root className；问题仅在 node-level test/inspect meta 被 FieldFrame 和内部 root 双重消费。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-frame.md`
- **复核状态**: 未复核

### [维度12-04] `condition-builder` 的 picker 模式在 wrapped FieldFrame 内重复消费 `testid/cid`

- **文件+行号**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:125-144,181-183,219-245`
- **证据片段**:
  ```tsx
  if (!embed) {
    return (
      <PickerModeContent
        value={effectiveValue}
        fields={fields}
        schema={schemaProps}
        className={props.meta.className}
        testid={props.meta.testid}
        cid={props.meta.cid}
  ```
  ```tsx
  return (
    <div className={cn('nop-condition-builder', className)} data-testid={testid} data-cid={cid}>
      <Popover>
        <PopoverTrigger
  ```
  ```tsx
  export const conditionBuilderRendererDefinition: RendererDefinition = {
    type: 'condition-builder',
    sourcePackage: '@nop-chaos/flux-renderers-form-advanced',
    component: ConditionBuilderRenderer,
    fields: formFieldRules,
    validation: {
  ```
  ```tsx
    wrap: true,
    frameRootTag: 'div',
  };
  ```
- **严重程度**: P2
- **现状**: `condition-builder` 使用 `formFieldRules` 且声明 `wrap: true` / `frameRootTag: 'div'`，因此外层 FieldFrame 会承载字段 chrome 与 node-level `testid/cid`。但当 `embed === false` 时，renderer 将 `props.meta.testid/cid` 传入 `PickerModeContent`，并在内部 `.nop-condition-builder` root 上再次写入 `data-testid/data-cid`。`embed !== false` 分支只下沉 `className`，没有复制 `testid/cid`，因此问题集中在 picker 模式。
- **风险**: picker 模式下同一 renderer 实例存在两个 test/debug 锚点：FieldFrame 是 field slot/root，PickerModeContent 是 content/control slot/root。schema 作者、测试代码和 debugger 自动化都难以稳定判断 `testid/cid` 指向字段 chrome 还是具体 picker shell；后续若围绕 FieldFrame root 做 selector、inspect 或错误定位，容易产生双锚点歧义。
- **建议**: `embed=false` 分支停止向 `PickerModeContent` 传递 `props.meta.testid/cid`，让 node-level test/inspect identity 保留在 FieldFrame。若 picker shell 需要专用锚点，应新增明确的 control-level schema prop，或使用已有 `.nop-condition-builder` marker / `data-slot` 作为内部定位契约。
- **误报排除**: 这不是对所有 `props.meta.className` 下沉的 blanket 反对；当前 live 文档允许 field-like widget 的 className 命中 canonical control root。本条也不重复 code-editor：code-editor 同时复制 className/testid/cid 到内部 editor root，而 condition-builder 的高价值问题是 picker 分支把 `testid/cid` 从 FieldFrame root 复制到内部 picker shell，导致 field slot 与 content/control slot 的 test/inspect identity 混用。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-frame.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度12-05] `detail-field` / `detail-view` 把 value-adaptation action 字段建模为普通 prop，绕过 event/action 编译通道

- **文件+行号**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:184,238,272,390-392`; `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:325,442,464,572-574`
- **证据片段**:
  ```tsx
  await runTransformIn(
    schemaProps.transformInAction,
    {
      rawValue: currentValue,
      name,
      readOnly,
    },
    runAdaptationAction,
  );
  ```
  ```tsx
  fields: [
    { key: 'name', kind: 'prop' },
    { key: 'viewer', kind: 'region', regionKey: 'viewer' },
    { key: 'content', kind: 'region', regionKey: 'content' },
    ...formFieldRules,
    { key: 'transformInAction', kind: 'prop' },
    { key: 'validateValueAction', kind: 'prop' },
    { key: 'transformOutAction', kind: 'prop' },
  ],
  ```
- **严重程度**: P1
- **现状**: `transformInAction` / `transformOutAction` / `validateValueAction` 是 `field-metadata-slot-modeling.md` 明确列出的 owner semantic action slots，但 `detail-field` 与 `detail-view` 的 RendererDefinition 将其声明为 `prop`。编译器因此把 action schema 当作普通值树放进 `propsProgram`，renderer 再从 `props.props` 取出并通过 `helpers.dispatch()` 运行。
- **风险**: 这些 action 字段不会进入 `eventPlans` / action compile path，action `args`、`when`、`then/onError/onSettled/parallel` 等 action-specific 子结构会被普通 value compilation 先行求值或改写；也绕开 action 字段统一 diagnostics、sourcePath、future event/action contract 增强。尤其 value-adaptation 文档要求显式 `args` 采用 replace 规则，而 prop 编译会在 renderer dispatch 前改变 action schema 的 authored 结构，容易导致默认 payload 注入、import binding、action branch 表达式语义与标准 action channel 分裂。
- **建议**: 为 owner semantic action slot 建立统一 metadata：要么将这三类字段声明为 `event` 并通过 `props.events`/等价 handler 执行，要么引入明确的 `action`/owner-action field kind，在编译期产出 normalized compiled action channel；renderer 不应从普通 `props` 消费 action schema 再临时 dispatch。同步调整 `object-field` 等同类 value-adaptation owner，避免只修一处。
- **误报排除**: 这不是重复 `[维度09-02]/[维度09-03]` 的 `variant-field` raw schema 回读问题；本条不依赖 `templateNode.schema`，而是 live RendererDefinition 把已被 owner docs 定义为 semantic action slots 的字段归类为普通 prop。也不是所有 `xxxAction` 都必须命名为 `onXX`：文档允许 `xxxAction` 命名，但 field kind 仍需要表达 action intent，不能退化为普通 JSON value prop。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`; `docs/architecture/value-adaptation-and-detail-field.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度12-06] `array-field.item` 已建模为 region，却回读 region 内部 raw schema 推导 scalar 子项校验

- **文件+行号**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:206-220,379-383,459-464,590-599`
- **证据片段**:

  ```tsx
  function getScalarItemFieldSchemaFromRegion(
    templateNode: TemplateNode | readonly TemplateNode[] | null | undefined,
  ): BaseSchema | undefined {
    const node = Array.isArray(templateNode) ? templateNode[0] : templateNode;
    ...
    return node.schema as BaseSchema;
  }

  const scalarItemField =
    itemKind === 'scalar'
      ? getScalarItemFieldSchemaFromRegion(props.regions.item?.templateNode) ??
        getScalarItemFieldSchema(props.props.item)
      : undefined;
  ```

- **严重程度**: P2
- **现状**: `array-field` definition 已将 `item` 声明为 `{ key: 'item', kind: 'region', regionKey: 'item', params: ['index', 'value'] }`，渲染路径也使用 `props.regions.item.render(...)`。但 scalar item 的 `label` / `required` 校验注册又从 `props.regions.item?.templateNode.schema` 和 fallback `props.props.item` 反推字段 schema。
- **风险**: 同一个 `item` slot 同时存在 normalized region 渲染通道和 raw schema 校验推导通道。若 compiler 改变 region template 保留形态、wrapper/validation contributor 结构变化，或 `item` 从单字段扩展为复合片段，scalar 子项校验会与真实渲染/验证计划分裂。
- **建议**: 将 scalar item 校验所需的 `label` / `required` 在编译期提取为明确 normalized metadata/prop，或复用 child validation plan/contributor 结果；renderer 不应读取 `region.templateNode.schema` 来驱动业务校验。
- **误报排除**: 这不是重复 variant/code-editor/input-number/condition-builder/detail action；也不是普通 `regions.item.render()` 使用问题。渲染通道本身正常，问题在同一已声明 region 外另行窥探内部 raw schema。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`; `docs/architecture/renderer-runtime.md`; `docs/architecture/form-validation.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度12-07] `dynamic-renderer.loadAction` 文档定义为 action/event slot，但 RendererDefinition 仍建模为普通 prop

- **文件+行号**: `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:243-285`; `packages/flux-renderers-basic/src/dynamic-renderer.tsx:54-70`; `docs/components/dynamic-renderer/design.md:26-29`
- **证据片段**:

  ```ts
  fields: [
    { key: 'loadAction', kind: 'prop' },
    { key: 'body', kind: 'region', regionKey: 'body' },
  ],
  ```

  ```tsx
  const loadAction = props.props.loadAction;
  ...
  const result = await props.helpers.dispatch(loadAction, {
    signal: controller.signal,
  });
  ```

  ```md
  ## 5. 字段分类

  - `loadAction`: `event`
  - `body`: `region`
  ```

- **严重程度**: P1
- **现状**: `dynamic-renderer` 的 owner 文档明确将 `loadAction` 归类为 `event`，且类型层是 `ActionSchema`；但 live RendererDefinition 将其声明为普通 `prop`，运行时再从 `props.props.loadAction` 取 action schema 并调用 `helpers.dispatch()`。
- **风险**: `loadAction` 作为动态 schema 加载入口，本质是 owner semantic action slot。当前 prop 通道会把 action schema 先经过普通 value compilation，而不是标准 action/event compile path；这会让 action branch、`args`、`when`、`then/onError/onSettled`、`xui:actions` 解析、diagnostics/sourcePath 等 action 语义与标准事件通道分裂。后续若 action 编译或 import lowering 收口，`dynamic-renderer` 会继续作为独立旁路。
- **建议**: 将 `loadAction` 从 `kind: 'prop'` 改为 `kind: 'event'`，运行时通过 `props.events.loadAction?.(undefined, { signal: controller.signal })` 或等价 normalized action channel 执行；若它不是普通 DOM event，而是 owner action slot，应在 field metadata 中显式支持 owner-action 语义，避免退回 prop。
- **误报排除**: 这不是已报的 variant/code-editor/input-number/condition-builder/detail/array-field 问题；也不是 `body` region 建模问题。`body` 已正确声明为 region，问题集中在 `loadAction` 这个动态 schema 加载 action slot 的 metadata 与消费通道不一致。`schemaValidator` 里的手写 shape 检查不能替代 action compile/event channel。
- **参考文档**: `docs/architecture/field-metadata-slot-modeling.md`; `docs/components/dynamic-renderer/design.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度12-01]`: 保留（P1）。live code 仍在 `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx` 回读 `props.templateNode.schema` 并用 `useRenderFragment()` 渲染 `hint/description`，与 field metadata normalized `value-or-region` 通道不符。
- `[维度12-02]`: 保留（P2）。`className` 下沉到 field-like widget root 已被 live docs 允许，但 `packages/flux-code-editor/src/code-editor-renderer.tsx` 仍在 wrapped `FieldFrame` 内重复写入 `data-testid/data-cid`，违反 `cid/testid` 只落 FieldFrame mounted root 的 live 规则。
- `[维度12-03]`: 保留（P2）。`packages/flux-renderers-form/src/renderers/input-number-renderer.tsx` 在 `wrap: true` 的 `input-number` control root 复制 `props.meta.testid/cid`，而 `NodeFrameWrapper` 已把同一 meta 交给 FieldFrame。
- `[维度12-04]`: 保留（P2）。`packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx` 的 picker 分支仍把 wrapped field 的 `testid/cid` 传给内部 `.nop-condition-builder` root，形成 FieldFrame 与 control shell 双锚点。
- `[维度12-05]`: 保留（P1）。`detail-field/detail-view` live definitions 仍把 `transformInAction/validateValueAction/transformOutAction` 声明为 `prop`，而 compiler 只有 `event` 字段进入 `compileActions`/`eventPlans`，与 value-adaptation owner action slot 文档语义分裂。
- `[维度12-06]`: 保留（P2）。`packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx` 的 `item` 已是 parameterized region，但 scalar 校验仍读取 `props.regions.item?.templateNode.schema` / `props.props.item` 推导 label/required。
- `[维度12-07]`: 保留（P1）。`dynamic-renderer` 文档仍声明 `loadAction: event`，但 `packages/flux-renderers-basic/src/basic-renderer-definitions.ts` 仍为 `kind: 'prop'`，运行时从 `props.props.loadAction` 直接 `helpers.dispatch()`，绕过 event compile channel。

## 子项复核建议

无。

## 子项复核结论

- `[维度12-01]`: 子项复核通过（P1）。live `variant-field` 仍回读 raw `hint/description` 并重新 fragment render，违反 normalized field chrome slot handoff。
- `[维度12-02]`: 子项复核通过（P2）。live `code-editor` 是 `wrap: true` 字段，但内部 root 仍重复写入 `props.meta.testid/cid`。
- `[维度12-03]`: 子项复核通过（P2）。live `input-number` 在 wrapped FieldFrame 内部 control root 仍复制同一 `testid/cid`。
- `[维度12-04]`: 子项复核通过（P2）。live `condition-builder` picker 模式仍把 wrapped field 的 `testid/cid` 下传到内部 picker shell。
- `[维度12-05]`: 子项复核通过（P1）。live `detail-field/detail-view` definitions 仍把 value-adaptation action slots 声明为普通 prop。
- `[维度12-06]`: 子项复核通过（P2）。live `array-field.item` 已是 region，但 scalar child validation 仍读取 region/raw item schema 推导校验元数据。
- `[维度12-07]`: 子项复核通过（P1）。live `dynamic-renderer.loadAction` 文档仍声明为 event，但 RendererDefinition 仍是 prop 且运行时从 `props.props` 直接 dispatch。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                          | 摘要                                                                                                           |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 维度12-01 | P1       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`                                                                       | `variant-field` 仍回读 raw `hint/description` 并重新 fragment render，绕过 normalized field chrome slot 通道。 |
| 维度12-02 | P2       | `packages/flux-code-editor/src/code-editor-renderer.tsx`                                                                                          | `code-editor` 是 wrapped 字段，但内部 root 仍重复写入 `props.meta.testid/cid`。                                |
| 维度12-03 | P2       | `packages/flux-renderers-form/src/renderers/input-number-renderer.tsx`                                                                            | `input-number` 在 wrapped FieldFrame 内部 control root 仍复制同一 `testid/cid`。                               |
| 维度12-04 | P2       | `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`                                                               | `condition-builder` picker 模式仍把 wrapped field 的 `testid/cid` 下传到内部 picker shell。                    |
| 维度12-05 | P1       | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`; `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx` | `detail-field/detail-view` 仍把 value-adaptation action slots 声明为普通 prop。                                |
| 维度12-06 | P2       | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`                                                                       | `array-field.item` 已是 region，但 scalar child validation 仍读取 region/raw item schema 推导校验元数据。      |
| 维度12-07 | P1       | `packages/flux-renderers-basic/src/basic-renderer-definitions.ts`; `packages/flux-renderers-basic/src/dynamic-renderer.tsx`                       | `dynamic-renderer.loadAction` 文档声明为 event，但 RendererDefinition 仍是 prop 且运行时直接 dispatch。        |
