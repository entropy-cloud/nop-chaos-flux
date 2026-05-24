# 维度 09：渲染器契约合规性

## 第 1 轮（初审）

### [维度09-01] `variant-field` 运行期回读 raw schema 并用 ad-hoc fragment 渲染 `hint` / `description`

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:31,79-93`
- **证据片段**:
  ```ts
  const authoredSchema = props.templateNode.schema as VariantFieldSchema | undefined;
  ...
  const rawHintContent =
    isSchema(authoredSchema?.hint) || isSchemaArray(authoredSchema?.hint)
      ? authoredSchema.hint
      : resolvedHintContent;
  const rawDescriptionContent =
    isSchema(authoredSchema?.description) || isSchemaArray(authoredSchema?.description)
      ? authoredSchema.description
      : resolvedDescriptionContent;
  ```
- **严重程度**: P1
- **合规评分**: C（该 renderer 大部分遵循 `RendererComponentProps`，但在字段 chrome slot 上绕开已编译 region）
- **契约条款**: `renderer-runtime.md` 要求子片段优先从 `props.regions` 读取、schema 驱动值从 `props.props` 读取；`field-binding-and-renderer-contract.md` 将 `hint` / `description` 归类为 `value-or-region`；维度 09 compile-once 硬门禁禁止运行期从 `props.templateNode.schema` 或 `props.schema` 读取业务数据。
- **现状**: `variant-field` 已在 definition 中引入 `formFieldRules`，其中 `hint` / `description` 是 `value-or-region`，但 renderer 仍回读 `props.templateNode.schema` 判断原始 authored shape，并对 raw schema 走 `useRenderFragment()`。
- **风险**: 绕开已编译 `props.regions.hint` / `props.regions.description`，削弱 compile-once 与 field metadata 归一化契约；后续 slot 编译、path suffix、diagnostics、region identity 或 validation/inspection 行为变化时，`variant-field` 会成为单独旁路。
- **建议**: 删除 `authoredSchema` 回读路径，直接使用 `resolveRendererSlotContent(props, 'hint')` / `resolveRendererSlotContent(props, 'description')` 的结果，或显式从 `props.regions.hint?.render()` / `props.props.hint` 分派；如确有 `variant-field` 特殊 slot 需求，应在 renderer metadata / owner doc 中声明并由编译期 region 支撑。
- **为什么值得现在做**: 该路径位于 live renderer render path，且已有 metadata 与 helper 可承载修复，收口后能恢复 compile-once 契约一致性。
- **误报排除**: 这不是类型标注、normalize 入参、测试支持代码或文档注释；该代码在 live renderer render path 中读取 `templateNode.schema` 并决定 UI 内容渲染。`pnpm check:audit-runtime-raw-schema-reads` 当前通过，但 live code 显示该路径被工具规则排除，属于硬门禁覆盖洞而不是契约已满足。
- **历史模式对应**: renderer-level workarounds reading raw schema instead of resolved props/regions 的 compile-once 违约模式。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-binding-and-renderer-contract.md`; `docs/references/audit-tooling.md`
- **复核状态**: 未复核

## renderer 合规评分摘要

- `flux-renderers-basic`: A-。抽查 `page`、`container`、`flex`、`button`、`tabs`、`loop`、`recurse`、`fragment`、`dynamic-renderer`，整体使用 `RendererComponentProps`、`props.props/meta/regions/events/helpers` 通道；layout renderer 的 marker / slot / `cn()` 基本符合 owner docs。
- `flux-renderers-form`: A-。抽查 `form`、`input`、`select`、`textarea`、checkbox/radio/switch group，field renderer 主要通过 `props.props` 与标准 field hooks 工作；`FormRenderer` 作为 owner renderer 发布 `FormContext`/`ScopeContext` 与 owner doc 相符。
- `flux-renderers-data`: A-。抽查 `table`、`crud`、`tree`、`chart` 及 table row/cell helpers，widget renderer 的局部 UI state、内部 Tailwind 布局和 data-slot 属于允许的自持 UI shell；事件调用多数采用 `void props.events...`。
- `flux-renderers-form-advanced`: B。大部分 widget/composite renderer 使用标准 props/hook/marker 模式；`variant-field` raw schema slot 回读是本轮唯一保留初审发现。

## suspect 排除清单

- `pnpm check:audit-fieldframe-bypasses`: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:11,195,217`。初审排除理由：`docs/architecture/variant-field.md` 明确要求 `variant-field` 字段级 chrome 复用 `FieldFrame`，并声明当前 wrapper baseline 使用 `FieldFrame rootTag="div"`、支持 `frameWrap: 'none' | 'group'`。live code 将 `meta.testid` / `meta.cid` 放在 `FieldFrame` wrapped root，`frameWrap="none"` 时才放在 inner body，符合 `renderer-runtime.md` 的 mounted inspectable node root 规则。
- `reactive-render-read` / `broad-scope-selector`: 本轮仅作为维度 09 背景查看；主要归维度 05，不在此机械报告。
- widget renderer 内部 `flex/gap/padding` 等 Tailwind 类: 按 `styling-system.md`，table/tree/condition-builder/key-value/tag-list/array-editor/chart 等 widget renderers 是完整 UI 控件，内部局部 style 与 UI state 不按 layout renderer 隐式布局违规处理。
- `regions.render()` 无显式 key 的普通 slot: `page/container/form/table` 等非 repeated slot 直接 render 属于正常 region handle 使用；`loop` / `tabs` 等 repeated region 已使用 stable `key`、`instancePath` / `pathSuffix`。

## 总结评估

第 1 轮初审未发现大面积 renderer contract 漂移；注册模式、`RendererComponentProps` 签名、root marker、`data-slot`、`cn()` 合并、`data-testid`/`data-cid` 根锚点整体收敛。唯一高价值线索是 `variant-field` 对 `hint` / `description` 的 raw schema 回读，它绕开已存在的 `value-or-region` metadata 与 precompiled region 通道。

## 建议第 2 轮深挖方向

- 聚焦 `variant-field` 周边：`variant-field-controller.ts`、`variant-field-owner.ts`、`variant-field-runtime.ts` 是否还有被工具 allowlist 掩盖的 raw authored schema / event / region 旁路。
- 针对 composite field family（`object-field`、`array-field`、`detail-field`、`detail-view`）复查是否存在同类“已声明 metadata 但 renderer 另走 raw schema / ad-hoc renderFragment”模式。
- 不建议继续机械深挖普通 widget 内部样式；当前更高 ROI 是验证 `value-or-region` slot 是否全部走编译通道。

## 深挖第 2 轮追加

### [维度09-02] `variant-field` 将 `detectVariantAction` 声明为 event，却优先回读 raw authored schema 并自行 dispatch

- **文件+行号**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts:47-49,118-126`; `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:210`
- **证据片段**:
  ```ts
  const authoredSchema = props.templateNode.schema as VariantFieldSchema | undefined;
  const detectVariantAction = props.events.detectVariantAction;
  const authoredDetectVariantAction = authoredSchema?.detectVariantAction;
  ...
  const result = authoredDetectVariantAction
    ? await props.helpers.dispatch(injectDetectVariantArgs(authoredDetectVariantAction, payload), {
        scope: parentScope,
        form: parentForm ?? undefined,
      })
    : await detectVariantAction(payload, {
  ```
- **严重程度**: P1
- **现状**: `variant-field` definition 将 `detectVariantAction` 声明为 `{ key: 'detectVariantAction', kind: 'event' }`，controller 也读取了 `props.events.detectVariantAction`，但实际执行时只要 `props.templateNode.schema.detectVariantAction` 存在，就优先绕过标准 event handler，直接将 raw authored `ActionSchema` 注入 payload 后交给 `props.helpers.dispatch()`。
- **风险**: 该路径绕开 `NodeRenderer`/event channel 对事件字段的统一装配、scope/nodeInstance 语义、diagnostics、tracing、cancellation 与未来 event contract 增强；同时把 renderer 绑定到 `templateNode.schema` 必须保留 authored action shape 的内部实现细节。
- **建议**: 删除 `authoredDetectVariantAction` 分支，统一通过 `props.events.detectVariantAction(payload, context)` 执行；如果该字段本质上不是 event，而是 owner semantic action slot，应把 renderer metadata 从 `event` 改为明确的 action prop/owner action channel，并同步 `variant-field`/field metadata 文档。
- **误报排除**: 这不是上一轮已报告的 `hint` / `description` raw schema slot 问题；该问题位于 variant detection 的 live action 执行主路径，并且已有标准 `props.events.detectVariantAction` 可用却被 raw authored schema 分支优先覆盖。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-metadata-slot-modeling.md`; `docs/architecture/variant-field.md`; `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

### [维度09-03] `variant-field` 的 nested variant switch migration 已有 normalized `variants` prop，却回读 raw authored option 的 `transformInAction`

- **文件+行号**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts:47,201-219,264`; `packages/flux-renderers-form-advanced/src/variant-field/variant-field-helpers.ts:18-24`; `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:39-42,184-210`
- **证据片段**:

  ```ts
  const nextOptionIndex = variants.findIndex((variant) => variant.key === key);
  const nextOption = nextOptionIndex >= 0 ? variants[nextOptionIndex] : undefined;
  const authoredNextOption =
    nextOptionIndex >= 0 ? getAuthoredVariantOption(authoredSchema, key, nextOptionIndex) : undefined;

  if (authoredNextOption?.transformInAction) {
    const adapter = actionAdapter(
      authoredNextOption.transformInAction,
      undefined,
      undefined,
  ```

- **严重程度**: P1
- **现状**: `variant-field` 已将 `variants` 通过 definition 声明为 normalized prop：`{ key: 'variants', kind: 'prop' }`，并通过 `deepFields` 编译 nested `content` / `viewer` region；renderer 主体也从 `props.props.variants` 派生 `variants`。但在用户切换 variant 时，controller 不使用已经解析的 `nextOption.transformInAction`，而是通过 `authoredSchema = props.templateNode.schema` 和 `getAuthoredVariantOption(authoredSchema, key, index)` 回到 raw authored option，再读取 `authoredNextOption.transformInAction` 执行迁移。
- **风险**: 该实现让同一个 `variants` 字段形成两个事实源：展示/region 使用 normalized `props.props.variants`，switch migration action 使用 raw authored schema。后续如果 compiler 对 nested action、import lowering、diagnostics、expression preservation、region identity 或 action payload 规则做统一收口，`variant-field` 的 nested `transformInAction` 会继续停留在 renderer 内部 raw schema 旁路；已有测试还会固化“authored schema 优先于 resolved variant copy”的错误基线。
- **建议**: 将 variant switch migration 改为消费 normalized `nextOption.transformInAction`，或者在 `deepFields` / compiler 阶段显式产出 nested action channel，再由 renderer 消费该 normalized output；不要在 controller 中通过 `props.templateNode.schema.variants` 回填业务 action。若 nested variant action 必须保持 authored-source 语义，应在 renderer definition metadata 与 `variant-field` owner 文档中显式建模，而不是作为 render/controller 旁路存在。
- **误报排除**: 这不是普通局部 selector state，也不是重复 `hint` / `description` raw slot；该分支直接决定切换 variant 时执行哪个 `transformInAction`，属于 live mutation/action path。并且 `variants` 已经是声明过的 renderer prop，当前实现仍绕开它读取 raw authored option。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-metadata-slot-modeling.md`; `docs/architecture/variant-field.md`; `docs/architecture/value-adaptation-and-detail-field.md`
- **复核状态**: 未复核

### [维度09-04] `array-field` 已把 `item` 声明为 region，却在运行期读取 `props.regions.item.templateNode.schema` 推导 scalar item 校验

- **文件+行号**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:206-220,379-383,459-464,590-599`
- **证据片段**:
  ```ts
  function getScalarItemFieldSchemaFromRegion(
    templateNode: TemplateNode | readonly TemplateNode[] | null | undefined,
  ): BaseSchema | undefined {
    const node = Array.isArray(templateNode) ? templateNode[0] : templateNode;
    ...
    return node.schema as BaseSchema;
  }
  ```
- **严重程度**: P2
- **现状**: `array-field` definition 已将 `item` 声明为 region：`{ key: 'item', kind: 'region', regionKey: 'item', params: ['index', 'value'] }`，渲染 repeated item 时也正常使用 `props.regions.item.render(...)`。但 scalar item 的 `label` / `required` 校验推导又额外读取 `props.regions.item?.templateNode.schema`，并 fallback 到 `props.props.item`，用于注册 scalar child validation 与错误消息。
- **风险**: 这让 scalar item validation 与编译后的 region/field metadata 分裂。若 region template 被 wrapper 包裹、compiler 改变 `TemplateNode.schema` 保留形态、child validation contributor 调整，或 `item` region 变成更复杂结构，`array-field` 会继续根据 region 内部 raw schema 的第一节点猜测 required/label，产生与实际 child renderer/validation plan 不一致的校验行为。
- **建议**: 将 scalar item 校验需要的 `label` / `required` 在编译期提取为明确 normalized metadata/prop，或复用 validation plan/child field contributor 的结果；renderer 应只通过 `props.regions.item.render(...)` 渲染 region，不应读取 `region.templateNode.schema` 来驱动业务校验。
- **误报排除**: 这不是普通 `regions.item.render()` 调用问题；渲染路径本身使用了 region handle。问题在同一已声明 region 之外，renderer 又窥探其内部 `TemplateNode.schema` 来推导运行期 validation metadata，属于 composite field family 的 raw schema 旁路。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-metadata-slot-modeling.md`; `docs/architecture/array-field.md`; `docs/architecture/form-validation.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度09-05] `crud.queryForm` 被声明为普通 prop，却在 renderer 内拼 raw form schema 后 `helpers.render`

- **文件+行号**: `packages/flux-renderers-data/src/crud-renderer-definition.ts:362-364`; `packages/flux-renderers-data/src/crud-renderer.tsx:310-332,358-362`
- **证据片段**:

  ```ts
  { key: 'quickSaveAction', kind: 'prop' },
  { key: 'quickSaveItemAction', kind: 'prop' },
  { key: 'queryForm', kind: 'prop' },
  { key: 'toolbar', kind: 'region' },
  { key: 'listActions', kind: 'region' },
  ```

  ```tsx
  const queryFormSchema: BaseSchema | null = (() => {
    const queryForm = normalizedSchema.queryForm;
    if (!queryForm?.body) {
      return null;
    }

      const base: Record<string, unknown> = {
        type: 'form',
        id: queryFormId,
        data: queryState.values,
        body: queryForm.body,
  ```

  ```tsx
  {queryFormSchema ? (
    <div className="nop-crud-query" data-slot="crud-query">
      {asReactNode(
        props.helpers.render(queryFormSchema, { pathSuffix: 'queryForm', scope: crudScope }),
      )}
  ```

- **严重程度**: P1
- **现状**: `crud` 的 `queryForm` 字段在 renderer definition 中是 `kind: 'prop'`，其中 `body`/`actions` 又是 renderable schema；运行期 `CrudRenderer` 从 `props.props` 取出该嵌套 schema，临时组装 `{ type: 'form', body: queryForm.body }`，再调用 `props.helpers.render()` 编译/渲染。
- **风险**: `queryForm.body` 没有通过 `props.regions` 或 `deepFields` 预编译通道进入 renderer，绕开 compile-once、nested region identity、diagnostics、imports/path 归属和 slot 参数建模；后续 compiler 对嵌套 schema、表单 owner、region path 或 diagnostics 收口时，CRUD 查询表单会继续作为运行期 raw-schema 渲染旁路。
- **建议**: 将 `queryForm.body` / `queryForm.actions` 建模为 `deepFields` nested regions，或把整个 `queryForm` 改为明确的 renderer-owned custom compilation 字段，在编译期产出 form template/region handle；`CrudRenderer` 只消费 normalized props 与 `props.regions`，不要在 render path 临时拼 raw form schema。
- **误报排除**: 这不是已有 [维度09-04] 的 `array-field.item` 校验窥探，也不是允许的动态 renderer 从 action 返回新 schema；`queryForm` 是静态 authored CRUD schema 的一部分，当前 definition 已把相关 toolbar/listActions/empty 建模为 region/value-or-region，却单独让 query form body 作为 prop 在运行期重新渲染。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-metadata-slot-modeling.md`; `docs/references/renderer-interfaces.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度09-06] `designer-page.config` 内嵌 node/edge/createDialog schema 被声明为 prop，却在 canvas/dialog 路径运行期直接渲染

- **文件+行号**: `packages/flow-designer-renderers/src/renderer-definitions.ts:73-75,267-270`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:208-212`; `packages/flow-designer-renderers/src/designer-page-body.tsx:493-500`
- **证据片段**:
  ```ts
  if (isSchemaInput(child)) {
    result[key] = child;
    continue;
  }
  ...
  { key: 'config', kind: 'prop', compile: compileDesignerConfig },
  { key: 'toolbar', kind: 'region', regionKey: 'toolbar' },
  { key: 'inspector', kind: 'region', regionKey: 'inspector' },
  { key: 'dialogs', kind: 'region', regionKey: 'dialogs' },
  ```
  ```tsx
  <RenderNodes
    input={nodeType.body}
    options={{ bindings: nodeRenderData, scopeKey: `node:${props.id}`, pathSuffix: 'node' }}
  />
  ```
  ```tsx
  props.helpers.render(pendingCreateDialog.nodeType.createDialog.body, {
    scope: designerScope,
    actionScope,
    pathSuffix: `create-dialog:${pendingCreateDialog.nodeType.id}`,
  });
  ```
- **严重程度**: P1
- **现状**: `designer-page` 只把 `toolbar` / `inspector` / `dialogs` 声明为 region，`config` 是普通 prop；但 `compileDesignerConfig()` 遇到 `nodeType.body`、`quickActions`、`edgeType.body`、`createDialog.body` 等 schema input 时原样保留，后续由 canvas/dialog 运行期 `RenderNodes` / `helpers.render()` 渲染。
- **风险**: Flow Designer 的 node/edge/dialog schema surface 绕过 `props.regions` / `deepFields` 的预编译通道，形成 config 内部 raw schema 旁路；后续 compiler 对 region identity、diagnostics、imports、slot params、path ownership 或 action scope 规则收口时，这些 schema 片段会继续停留在 renderer/domain-host 内部临时渲染路径。
- **建议**: 将 `config.nodeTypes[].body`、`quickActions`、`inspector.body`、`createDialog.body`、`edgeTypes[].body` 等显式建模为 `deepFields` nested regions，或建立 Flow Designer owner 专用的编译期 region/index 输出；运行期只消费 compiled region handles / normalized region keys，不直接渲染 config 中保留的 authored schema。
- **误报排除**: 这不是普通 `toolbar` / `inspector` / `dialogs` region 渲染；这些字段已走 `props.regions`。问题集中在 `config` prop 内部的 schema-bearing 字段，definition 未把它们声明为 region/deepFields，且 live canvas/dialog 路径确实运行期渲染这些 raw schema。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/components/designer-page/design.md`; `docs/architecture/flow-designer/api.md`
- **复核状态**: 未复核

### [维度09-07] `report-inspector.body` 被声明为 prop，却作为 schema body 在 renderer 内 `helpers.render`

- **文件+行号**: `packages/report-designer-renderers/src/renderers.tsx:207-213`; `packages/report-designer-renderers/src/report-designer-inspector.tsx:30-32,68-71`
- **证据片段**:
  ```ts
  {
    type: 'report-inspector',
    component: LazyReportInspectorRenderer,
    fields: [
      { key: 'body', kind: 'prop' },
      { key: 'emptyLabel', kind: 'prop' },
      { key: 'noSelectionLabel', kind: 'prop' },
    ],
  },
  ```
  ```tsx
  const body = (props.props.body ?? slice.inspectorBody ?? slice.resolvedSchema) as
    | SchemaInput
    | undefined;
  ...
  props.helpers.render(body, {
    pathSuffix: 'inspector-body',
  }) as React.ReactNode
  ```
- **严重程度**: P1
- **现状**: `report-inspector` 的 `body` 在 renderer definition 中是普通 prop；renderer 又把 `props.props.body` 或 host scope 中的 resolved schema 当作 `SchemaInput` 直接交给 `props.helpers.render()`。
- **风险**: 静态 authored `report-inspector.body` 不会进入 `props.regions` / compile-once 通道，绕开 region identity、imports、diagnostics、path ownership 与 renderer field metadata；host resolved inspector schema 与 authored body 也共用同一运行期 render 旁路，容易固化“schema prop 可直接 render”的模式。
- **建议**: 若 `body` 是正式 authored schema surface，应改为 `region` 或 `value-or-region`；若只允许 host runtime 动态注入 resolved inspector schema，应把 authored `body` 从公开 renderer fields 中拆出，改为明确的 owner/runtime channel，并在文档中区分静态 region 与动态 host schema。
- **误报排除**: 这不是上一轮已覆盖的 CRUD `queryForm`；这里是 Report Designer inspector 独立 renderer 的 `body` prop。也不是已修复的旧“直接调用子 renderer”问题；当前确实经过 `helpers.render()`，但仍未经过 `report-inspector.body` 的预编译 region 通道。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/components/report-inspector/design.md`; `docs/components/report-inspector-shell/design.md`; `docs/architecture/report-designer/inspector-design.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度09-08] `table.columns[].quickEdit.body` 仍作为 schema-bearing prop 在 quick edit 内运行期 `helpers.render`

- **文件+行号**: `packages/flux-renderers-data/src/schemas.ts:17-20`; `packages/flux-renderers-data/src/data-renderer-definitions.ts:240-244`; `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:109-123`
- **证据片段**:
  ```ts
  export interface TableColumnQuickEditConfig extends SchemaObject {
    mode?: 'dialog' | 'inline';
    body?: SchemaInput;
    saveImmediately?: boolean | SchemaValue;
  }
  ...
  {
    key: 'body',
    regionKeySuffix: 'quickEditBody',
    compiledKey: 'quickEditBodyRegionKey',
  }
  ...
  : config?.body
    ? asReactNode(
        helpers.render(config.body, {
  ```
- **严重程度**: P1
- **现状**: `table.columns[].body` 已通过 deep region extraction 编译为 `columns.N.quickEditBody`，但 `quickEdit: { body }` 这个公开 quick edit 配置面仍保留为普通 nested prop。运行期若没有 `quickEditBodyRegionKey`，`TableQuickEditCell` 会直接把 `config.body` 交给 `helpers.render()`。
- **风险**: 同一个 quick edit body 存在两套 authoring/执行通道：顶层 `columns[].body` 走预编译 region，嵌套 `columns[].quickEdit.body` 走运行期 schema render。后者绕开 compile-once、region identity、diagnostics、imports/path 归属和 slot 参数建模，后续 nested region 规则或调试/诊断增强时会成为残留旁路。
- **建议**: 将 `columns[].quickEdit.body` 也纳入 renderer-owned deepFields 归一化，编译为稳定的 `quickEditBodyRegionKey`，并让 `TableQuickEditCell` 只消费 `regions[quickEditBodyRegionKey].render(...)`；或明确废弃/拒绝 nested `quickEdit.body` schema surface，仅保留 `columns[].body` 作为自定义 quick edit body authoring 入口。
- **误报排除**: 这不是已关闭的 `table.columns[].body -> columns.N.quickEditBody` 路径；该路径已存在并会优先使用 `quickEditBodyRegion`。问题是另一个 live public shape：`quickEdit.body` 仍能作为 `SchemaInput` 留在 `props.props.columns` 内，并在 renderer 内运行期渲染。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

### [维度09-09] `table.columns[].buttons` 已有 deep region，但 renderer 仍保留 raw `column.buttons` 运行期渲染分支

- **文件+行号**: `packages/flux-renderers-data/src/data-renderer-definitions.ts:226-232`; `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:243-280`
- **证据片段**:
  ```ts
  {
    key: 'buttons',
    regionKeySuffix: 'buttons',
    compiledKey: 'buttonsRegionKey',
    params: ['record', 'index'],
    isolate: true,
  }
  ...
  {buttonRegion
    ? asReactNode(buttonRegion.render({ ... }))
    : (column.buttons ?? []).map((button: BaseSchema, buttonIndex: number) => (
        helpers.render(button, {
  ```
- **严重程度**: P2
- **现状**: `columns[].buttons` 已声明为 nested region，并在静态 schema input 下会被抽取为 `buttonsRegionKey`。但 table 行渲染仍保留 `Array.isArray(column.buttons)` fallback，对留在 resolved column prop 中的 `BaseSchema[]` 逐个 `helpers.render()`。
- **风险**: 对动态/未抽取的 `column.buttons`，操作列按钮会绕过 `props.regions` 的预编译通道，形成 row-level action UI 的 raw schema 旁路；diagnostics、imports、pathSuffix、region params、instance identity 与 tracing 行为都可能与已抽取的 `buttonsRegionKey` 分裂。
- **建议**: 收口为只消费 `buttonsRegionKey` 对应 region；若确需支持动态按钮 schema，应显式建模为动态 renderer/action-returned schema 能力，而不是让 table renderer 直接渲染 `column.buttons` prop。
- **误报排除**: 这不是普通 `buttonRegion.render()` 调用；region 分支是合规路径。问题是 region 分支之外仍存在 `helpers.render(button)` 的 raw schema fallback，且 `buttons` 已在 renderer definition 中有明确 deep region 规则。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/field-metadata-slot-modeling.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度09-01]`: 保留（P1）。live `variant-field.tsx` 仍读取 `props.templateNode.schema.hint/description` 并对 schema 形态调用 `useRenderFragment()`，而 docs 要求 `value-or-region` 字段消费 `props.regions/props.props` 的归一化结果。
- `[维度09-02]`: 保留（P1）。live `variant-field-controller.ts` 仍在 `detectVariantAction` 已声明为 `event` 且 `props.events.detectVariantAction` 存在时，优先读取 authored schema 并 `helpers.dispatch()` raw action，绕过 `NodeRenderer` 事件通道。
- `[维度09-03]`: 保留（P1）。live controller 仍从 `props.templateNode.schema.variants` 经 `getAuthoredVariantOption()` 读取 `transformInAction`，而 `variants` 已是 renderer prop 且 nested region normalization 已存在，形成 raw authored action 旁路。
- `[维度09-04]`: 保留（P2）。live `array-field` 仍通过 `props.regions.item?.templateNode.schema` 推导 scalar item 的 `label/required` 校验信息；渲染虽走 region handle，但校验业务元数据仍窥探已编译 region 内部 raw schema。
- `[维度09-05]`: 保留（P1）。live `crud` definition 仍把 `queryForm` 声明为 prop，`CrudRenderer` 运行期拼 `{ type: 'form', body: queryForm.body }` 后 `helpers.render()`，未通过 region/deep/custom compile 产出预编译子树。
- `[维度09-06]`: 保留（P1）。live `designer-page.config` 虽使用 `compileDesignerConfig`，但对 `isSchemaInput(child)` 原样保留，canvas/dialog 路径仍用 `RenderNodes` / `helpers.render()` 渲染 `nodeType.body/createDialog.body`；这与 field-metadata 文档中 schema-within-prop 应由 compile function 编译子 schema 的方向不一致。
- `[维度09-07]`: 降级（P2）。live `report-inspector.body` 仍是 prop 且 `helpers.render(body)`，但 report inspector 文档同时承认 host runtime 可按 selection 动态提供 plain `SchemaInput`；问题更准确地限定为 authored `props.props.body` 与 host dynamic schema 共用同一未建模旁路。
- `[维度09-08]`: 保留（P1）。live table deepFields 只抽取 `columns[].body -> quickEditBodyRegionKey`，`columns[].quickEdit.body` 仍可留在 prop 内并在 `TableQuickEditCell` 中 `helpers.render(config.body)`。
- `[维度09-09]`: 保留（P2）。live `columns[].buttons` 已有 deep region 抽取，但 `table-body-row-rendering.tsx` 仍保留无 `buttonsRegionKey` 时对 `column.buttons` 数组逐项 `helpers.render()` 的 fallback，主要暴露于动态/未抽取列配置。

## 子项复核建议

- `[维度09-02]`
- `[维度09-03]`
- `[维度09-06]`
- `[维度09-07]`

## 子项复核结论

- `[维度09-01]`: 子项复核通过（P1）。live `variant-field` 仍回读 `props.templateNode.schema.hint/description` 并用 `useRenderFragment()` 渲染 schema slot，绕过 normalized value-or-region 通道。
- `[维度09-02]`: 子项复核通过（P1）。live controller 仍优先用 authored `detectVariantAction` + `helpers.dispatch()`，而不是统一走已声明的 `props.events.detectVariantAction`。
- `[维度09-03]`: 子项复核通过（P1）。live controller 仍通过 authored schema option 读取 `transformInAction`，而不是消费 normalized `variants` prop。
- `[维度09-04]`: 子项复核通过（P2）。live `array-field.item` 渲染走 region，但 scalar 校验仍窥探 `props.regions.item?.templateNode.schema` 推导 label/required。
- `[维度09-05]`: 子项复核通过（P1）。live `crud.queryForm` 仍是 prop，renderer 运行期拼 form schema 并 `helpers.render()`。
- `[维度09-06]`: 子项复核通过（P1）。live `designer-page.config` compile 函数仍原样保留 schema input，canvas/create dialog 路径继续运行期 `RenderNodes` / `helpers.render()`。
- `[维度09-07]`: 子项复核通过（P2）。live `report-inspector.body` 仍是 prop 且 `helpers.render(body)`，但 docs 同时承认 host runtime 动态提供 plain `SchemaInput`，因此维持 P2 限定。
- `[维度09-08]`: 子项复核通过（P1）。live table 仍只抽取 `columns[].body`，`columns[].quickEdit.body` fallback 仍会在 quick edit cell 内 `helpers.render()`。
- `[维度09-09]`: 子项复核通过（P2）。live table operation column 仍在无 `buttonsRegionKey` 时对 `column.buttons` raw schema 数组逐项 `helpers.render()`。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                                                                                              | 摘要                                                                                                               |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 维度09-01 | P1       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`                                                                                                                                           | `variant-field` 回读 raw schema 渲染 `hint` / `description`，绕过 normalized value-or-region 通道。                |
| 维度09-02 | P1       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts`                                                                                                                                 | `detectVariantAction` 已声明为 event，但 controller 优先读取 authored schema 并自行 dispatch。                     |
| 维度09-03 | P1       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts`                                                                                                                                 | variant switch migration 从 authored schema option 读取 `transformInAction`，未消费 normalized `variants` prop。   |
| 维度09-04 | P2       | `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`                                                                                                                                           | `array-field.item` 渲染走 region，但 scalar 校验仍窥探 region 内部 raw schema 推导 `label/required`。              |
| 维度09-05 | P1       | `packages/flux-renderers-data/src/crud-renderer.tsx`                                                                                                                                                                  | `crud.queryForm` 是 prop，renderer 运行期拼 form schema 并 `helpers.render()`。                                    |
| 维度09-06 | P1       | `packages/flow-designer-renderers/src/renderer-definitions.ts`; `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx`; `packages/flow-designer-renderers/src/designer-page-body.tsx` | `designer-page.config` 内 schema input 被原样保留，canvas/dialog 路径运行期渲染。                                  |
| 维度09-07 | P2       | `packages/report-designer-renderers/src/renderers.tsx`; `packages/report-designer-renderers/src/report-designer-inspector.tsx`                                                                                        | `report-inspector.body` 仍是 prop 且 `helpers.render(body)`，authored body 与 host dynamic schema 共用未建模旁路。 |
| 维度09-08 | P1       | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`                                                                                                                                           | `columns[].quickEdit.body` 仍可留在 prop 内并由 quick edit cell 运行期 `helpers.render()`。                        |
| 维度09-09 | P2       | `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`                                                                                                                                        | `columns[].buttons` 已有 deep region，但无 `buttonsRegionKey` 时仍 raw schema 数组逐项 `helpers.render()`。        |
