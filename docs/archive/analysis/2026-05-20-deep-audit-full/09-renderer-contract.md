# 维度 09: 渲染器契约合规性

## 第 1 轮（初审）

本轮已按要求阅读：`docs/index.md`、`AGENTS.md`、`docs/references/audit-tooling.md`、`docs/references/deep-audit-calibration-patterns.md`、`docs/references/reopened-design-decisions-and-audit-adjudications.md`、`docs/skills/react19-best-practices-review.md`、`docs/skills/deep-audit-prompts.md` 的共享前缀与维度 09 正文，以及 owner 文档 `docs/architecture/renderer-runtime.md`、`docs/architecture/styling-system.md`、`docs/architecture/renderer-markers-and-selectors.md`、`docs/references/renderer-interfaces.md`。主 agent 提供的自动化基线已消费：renderer marker suspect 为零；`variant-field-view.tsx` 命中 FieldFrame bypass；`render-nodes.tsx` / `scope-debug.tsx` 响应式读 suspect 中，`scope-debug.tsx` 属维度 05 性能订阅问题，未在本维度重复报告。

### [维度09-01] `quickSaveAction` 被声明为 event，却按 ActionSchema prop 消费，导致表格快编保存契约错位

- **文件**: `packages/flux-renderers-data/src/data-renderer-definitions.ts:132-133`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:60-80`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:321-331`
- **行号范围**: `data-renderer-definitions.ts:132-133`, `table-quick-edit-cell.tsx:60-80`, `table-quick-edit-controller.ts:321-331`
- **证据片段**:
  ```ts
  // data-renderer-definitions.ts
  { key: 'quickSaveAction', kind: 'event' },
  { key: 'quickSaveItemAction', kind: 'event' },
  ```
  ```ts
  // table-quick-edit-cell.tsx
  quickSaveAction?: ActionSchema;
  quickSaveItemAction?: ActionSchema;
  ...
  const saveAction = quickSaveItemAction ?? quickSaveAction;
  ```
  ```ts
  // table-quick-edit-controller.ts
  if (!saveAction || !dirty || savingRef.current) {
    return;
  }
  const result = await helpers.dispatch(saveAction, { scope: draftRowScope });
  ```
- **严重程度**: P1
- **契约条款**: `RendererComponentProps` 中 `props` 承载 schema 驱动的值，`events` 承载运行时事件处理器；field metadata 应决定字段进入 `props` / `regions` / `events` 的标准通道。
- **现状**: `quickSaveAction` / `quickSaveItemAction` 在 renderer definition 中被声明为 `event`，但快编控制器实际需要原始 `ActionSchema` 并调用 `helpers.dispatch(saveAction, ...)`。这不是 DOM/renderer event handler，而是 owner 语义动作配置。
- **风险**: 独立 `table` 的 quick-edit 保存动作可能不会进入 `props.props`，快编单元格拿不到 `saveAction` 后直接 `return`，形成“编辑 UI 存在但保存动作失效”的契约级回归。后续开发者也会误以为这两个字段应从 `props.events` 调用，进一步扩大错位。
- **建议**: 将 `quickSaveAction` / `quickSaveItemAction` 改为适合原始动作配置的 prop/语义 action 字段，或显式设计一个 owner action slot 规则；表格快编消费端只从规范通道读取，不从 raw schema 或伪造 props 补洞。
- **为什么值得现在做**: 这是 renderer definition 与 concrete renderer 消费方式的核心契约不一致，且直接影响快编保存主路径；v1 基线下不应保留“字段声明为 event、实际当 prop 用”的主路径错位。
- **误报排除**: 这不是“命名为 Action 就必须是 event”的机械判断。证据显示消费端需要 `ActionSchema` 并主动 `helpers.dispatch`，而 `events` 通道按 owner 文档应提供 `RendererEventHandler`。
- **历史模式对应**: 对应 field metadata / slot modeling 中“字段语义必须由 renderer metadata 定义，renderer 只消费规范化输出”的历史收敛模式；也与 v1 基线下不接受过渡补洞一致。
- **参考文档**: `docs/architecture/renderer-runtime.md`（Renderer Component Contract、props versus events）；`docs/architecture/field-metadata-slot-modeling.md`（Renderer metadata defines field semantics、event field）；`docs/references/renderer-interfaces.md`（RendererDefinition field map、RendererEventHandler）
- **复核状态**: 未复核

### [维度09-02] `CrudRenderer` 手工伪造 `RendererComponentProps<TableSchema>` 并直接调用 `TableRenderer`，绕过 NodeRenderer/definition 装配契约

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:285-315`
- **行号范围**: `crud-renderer.tsx:285-315`
- **证据片段**:
  ```tsx
  const tableEvents = props.events as unknown as RendererComponentProps<TableSchema>['events'];
  const tableResolvedProps: RendererComponentProps<TableSchema>['props'] = {
    ...tableSchema,
    disabled: props.props.disabled,
    className: props.props.className,
    frameClassName: props.props.frameClassName,
    testid: props.props.testid,
    cid: props.props.cid,
  };
  const tableRendererProps: RendererComponentProps<TableSchema> =
    ({
      id: `${props.id}-table`,
      path: `${props.path}.table`,
      schema: tableSchema,
      templateNode:
        props.templateNode as unknown as RendererComponentProps<TableSchema>['templateNode'],
  ```
- **严重程度**: P1
- **契约条款**: `NodeRenderer` 负责解析 meta/props/events/regions/helpers 并调用 concrete renderer；renderer components 应接收 runtime 装配好的 `RendererComponentProps`，而不是由另一个 renderer 手工 cast/拼装。
- **现状**: `CrudRenderer` 构造了一个伪 `RendererComponentProps<TableSchema>`，复用 CRUD 的 `templateNode`、强转 `events`、改写 `node.scope`、清空 `meta.cid/testid/className` 后直接 `<TableRenderer {...tableRendererProps} />`。
- **风险**: 该路径绕过 `table` 自己的 `RendererDefinition.fields`、node identity、生命周期、wrap、source/field metadata、debugger DOM 桥和 future static metadata 装配。任何 TableRenderer 依赖由 NodeRenderer 保证的新增字段，都可能在 CRUD 内部表格中静默缺失。
- **建议**: 不要从 CRUD 直接伪造 renderer boundary。优先用 `props.helpers.render(tableSchema, { scope: crudScope, pathSuffix: 'table' })` 走正常编译/NodeRenderer 路径；如果需要共享表格实现，应抽出纯 `TableView`/controller 层，让 `TableRenderer` 与 `CrudRenderer` 共同调用，而不是伪造 `RendererComponentProps`。
- **为什么值得现在做**: 这是跨 renderer 主路径复用方式的基础契约问题，不只是代码风格；后续 table definition、field metadata、node identity 或 data-cid 规则演进都会被这条旁路放大维护成本。
- **误报排除**: 这不是“组合 renderer 不能复用表格 UI”的泛化指控。问题点在于复用方式是伪造完整 renderer boundary，而不是调用共享 UI/controller 或走 `helpers.render` 的规范子节点渲染路径。
- **历史模式对应**: 对应 renderer-runtime 中“NodeRenderer assembles final renderer contract”和 field metadata normalization 的历史收敛；也类似过往避免 renderer-local 猜测 raw schema / runtime props 的模式。
- **参考文档**: `docs/architecture/renderer-runtime.md`（End-To-End Render Pipeline、NodeRenderer Responsibilities、Renderer Component Contract）；`docs/references/renderer-interfaces.md`（Render-Time React Contracts）；`docs/architecture/field-metadata-slot-modeling.md`（renderer consumes normalized outputs）
- **复核状态**: 未复核

### [维度09-03] `CrudRenderer` 为弥补字段通道错位读取 `templateNode.schema` 原始 schema，破坏“只消费规范化 props/events”的 renderer contract

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:42-53,109-111`
- **行号范围**: `crud-renderer.tsx:42-53`, `crud-renderer.tsx:109-111`
- **证据片段**:
  ```tsx
  export function CrudRenderer(props: RendererComponentProps<CrudSchema>) {
    const defaultEmptyLabel = t('flux.common.noData');
    const onRefresh = props.events.onRefresh;
    const nodeScope = props.node.scope;
    const schemaProps = useSchemaProps(props);
    const authoredSchema = props.templateNode.schema as CrudSchema | undefined;
    const normalizedSchema = normalizeCrudSchema(schemaProps as CrudSchema);
  ```
  ```tsx
  const quickSaveAction = normalizedSchema.quickSaveAction ?? authoredSchema?.quickSaveAction;
  const quickSaveItemAction =
    normalizedSchema.quickSaveItemAction ?? authoredSchema?.quickSaveItemAction;
  ```
- **严重程度**: P2
- **契约条款**: Concrete renderer 应从 `props.props`、`props.meta`、`props.regions`、`props.events`、`props.helpers` 读取规范化运行时输入；raw schema / `templateNode.schema` 主要是声明源形态，不应作为运行时补洞主路径。
- **现状**: CRUD 在 runtime render 期间读取 `props.templateNode.schema`，并用 raw authored schema 回填 `quickSaveAction` / `quickSaveItemAction`。这说明字段没有通过 definition metadata 正确归入 renderer-facing 通道。
- **风险**: raw schema fallback 会绕过表达式解析、source/field metadata、authoringTransform 后的规范形态和未来 schema validator/diagnostics。若这些 action 字段后续支持表达式、import alias、transform 或严格校验，该旁路很容易与 runtime 规范结果不一致。
- **建议**: 先修正 `quickSaveAction` / `quickSaveItemAction` 的 field metadata，使其通过 `props.props` 或明确的 owner action channel 到达 CRUD/Table；删除 `authoredSchema` fallback。若确实需要访问声明源，应把需求提升为显式 contract，而不是 renderer-local raw schema 读取。
- **为什么值得现在做**: 该 fallback 是维度09-01 字段错位的实时代偿路径；如果先不清理，会掩盖独立 table 与 CRUD 内 table 行为差异，后续复核更难定位真实 contract owner。
- **误报排除**: 不是所有 `templateNode.schema` 读取都自动违规；本条成立的关键是该 raw schema 值被用来恢复 renderer 运行时 action 配置，并影响快编保存主路径。
- **历史模式对应**: 对应 field metadata 文档中“renderer components should not repeatedly inspect raw schema”的反模式；也命中 v1 基线下不接受主路径补洞的口径。
- **参考文档**: `docs/architecture/renderer-runtime.md`（Renderer Component Contract、Slot And Field Semantics）；`docs/architecture/field-metadata-slot-modeling.md`（Renderer components only consume normalized outputs）；`docs/references/deep-audit-calibration-patterns.md`（V1 Override）
- **复核状态**: 未复核

### [维度09-04] `useFieldHandlers` 直接读取 `RuntimeContext` unstable 上下文，绕过公开 `useRendererRuntime()` 标准 hook

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:11-18,157-176`
- **行号范围**: `field-handlers.tsx:11-18`, `field-handlers.tsx:157-176`
- **证据片段**:
  ```tsx
  import {
    useCurrentForm,
    useCurrentFormState,
    useCurrentValidationScope,
    useRenderScope,
    useScopeSelector,
  } from '@nop-chaos/flux-react';
  import { RuntimeContext } from '@nop-chaos/flux-react/unstable';
  ```
  ```tsx
  export function useFieldHandlers(args: {
    name: string;
    currentForm: FormRuntime | undefined;
    scope: ScopeRef;
    ...
  }) {
    const { name, currentForm, scope, toFormValue = identityValue, adapter, adapterContext } = args;
    const currentValidationScope = useCurrentValidationScope();
    const runtime = useContext(RuntimeContext);
  ```
- **严重程度**: P2
- **契约条款**: 渲染器与 renderer utility 应通过公开标准 hooks 获取 ambient runtime 服务；`RuntimeContext` 是 React integration 内部上下文，不应在 renderer 包中直接读取。
- **现状**: 同一文件已经从 `@nop-chaos/flux-react` 使用了多个公开 hooks，但 runtime 单独通过 `@nop-chaos/flux-react/unstable` 的 `RuntimeContext` + `useContext` 获取，并在错误上报路径中允许 `runtime` 缺失后静默返回。
- **风险**: renderer 包绑定 unstable context 细节，会削弱 `flux-react` hook surface 的封装性；如果 runtime context 拆分、命名或 required-context 语义变化，字段处理器可能不经类型/契约提示地失效。`if (!runtime) return` 还会让字段更新错误在错误的挂载环境中被静默吞掉。
- **建议**: 改用公开 `useRendererRuntime()`。若确实需要可选 runtime，应在 `flux-react` 暴露明确的 optional hook contract，而不是从 renderer 包读取 unstable context。
- **为什么值得现在做**: 字段处理器是所有基础输入控件共享路径，影响范围大；这是低成本移除 renderer -> unstable context 耦合的收敛点。
- **误报排除**: 这不是对 form owner 使用 `FormContext.Provider` 的泛化否定；本条只针对读取 runtime 服务时绕过已有公开 hook。owner 文档和 AGENTS 都明确列出 `useRendererRuntime()`。
- **历史模式对应**: 对应 renderer-runtime 的“ambient runtime capabilities come from hooks”和“split context boundaries are owned by flux-react”模式。
- **参考文档**: `AGENTS.md`（MANDATORY: Renderer Component Contract / standard hooks）；`docs/architecture/renderer-runtime.md`（Props Versus Hooks、Current Hooks）；`docs/references/renderer-interfaces.md`（Render-Time React Contracts）
- **复核状态**: 未复核

### [维度09-05] `variant-field` 直接拥有 `FieldFrame`，复制 NodeFrameWrapper 的 frameWrap/FieldFrame 装配逻辑

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:10-39,207-226`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:89-102`
- **行号范围**: `variant-field-view.tsx:10-39`, `variant-field-view.tsx:207-226`, `variant-field.tsx:89-102`
- **证据片段**:
  ```tsx
  import { FieldFrame, toFieldRemarkProps } from '@nop-chaos/flux-react';
  ...
  function resolveVariantFrameWrap(
    frameWrap: boolean | 'label' | 'group' | 'none' | undefined,
  ): 'label' | 'group' | 'none' {
    if (frameWrap === false || frameWrap === 'none') {
      return 'none';
    }
  ```
  ```tsx
  return (
    <FieldFrame
      name={name || undefined}
      label={labelContent}
      required={schemaProps.required === true || undefined}
      ...
      testid={meta.testid}
      cid={meta.cid}
      rootProps={{ 'data-active-variant': activeKey, 'data-frame-wrap': frameWrapMode }}
    >
  ```
- **严重程度**: P2
- **契约条款**: FieldFrame wrapping、`frameWrap` override、`data-testid` / `data-cid` placement and field chrome are centralized runtime/frame concerns; direct FieldFrame use outside known frame owner paths must prove it is not duplicating shell ownership.
- **现状**: `variant-field` definition 没有 `wrap: true`，而 renderer view 直接 import/use `FieldFrame`，并本地实现 `resolveVariantFrameWrap`、required/hint/description/remark/labelRemark/labelAlign/labelWidth/testid/cid/rootProps` 转发。
- **风险**: `NodeFrameWrapper` 与 `variant-field` 形成两套 FieldFrame 装配规则。后续 FieldFrame 根节点、`data-cid`、`data-testid`、`frameClassName`、label layout 或 required 规则变化时，variant-field 需要手动同步，容易产生字段外壳行为漂移。
- **建议**: 将 `variant-field` 收敛为 `wrap: true`，让 NodeFrameWrapper/FieldFrame owner 统一处理 field chrome；`data-active-variant` 可放在 canonical control root，或为 NodeFrameWrapper 设计显式、受控的 rootProps 扩展，而不是 renderer-local 复制 FieldFrame。
- **为什么值得现在做**: 主 agent 的 `pnpm check:audit-fieldframe-bypasses` 已稳定命中该文件；当前代码不是临时测试路径，而是 live renderer 主路径。v1 基线下应避免保留并行 shell owner。
- **误报排除**: 已按 calibration pattern 9 排除“所有复杂字段都必须机械套 FieldFrame”的误报。本条不是要求 blanket adoption，而是指出该 renderer 已经直接复制 FieldFrame owner 装配，并与 `RendererDefinition.wrap`/NodeFrameWrapper 中央路径并行。
- **历史模式对应**: 对应“Blanket FieldFrame Or Shared Shell Adoption Pressure”中的保留条件：存在直接 FieldFrame bypass 和外壳 ownership 复制；也对应 renderer-runtime 中 `cid` 属于 mounted inspectable node root 的历史规则。
- **参考文档**: `docs/architecture/renderer-runtime.md`（cid placement、props versus meta、NodeFrameWrapper/FieldFrame 语义）；`docs/architecture/field-metadata-slot-modeling.md`（FieldFrame chrome inputs owner surface）；`docs/references/deep-audit-calibration-patterns.md`（Pattern 9）；`docs/references/audit-tooling.md`（`check:audit-fieldframe-bypasses` suspect）
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度09-06] `variant-field` 从 `templateNode.eventPlans` 反抽 raw `ActionSchema` 并自行 dispatch，绕过标准 `props.events.detectVariantAction` 事件通道

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:89-101`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts:48-53,118-130`, `packages/flux-renderers-form-advanced/src/variant-field/variant-field-helpers.ts:33-43`
- **行号范围**: `variant-field.tsx:89-101`, `variant-field-controller.ts:48-53,118-130`, `variant-field-helpers.ts:33-43`
- **证据片段**:
  ```ts
  fields: [
    ...formFieldRules,
    { key: 'variants', kind: 'prop' },
    { key: 'selector', kind: 'prop' },
    { key: 'selectorMode', kind: 'prop' },
    { key: 'defaultVariant', kind: 'prop' },
    { key: 'detectVariantAction', kind: 'event' },
    { key: 'transformInAction', kind: 'ignored' },
  ],
  ```
  ```ts
  const detectVariantPlan = (
    props.templateNode as { eventPlans?: Record<string, unknown> } | undefined
  )?.eventPlans?.detectVariantAction;
  const detectVariantAction = React.useMemo(
    () => getAuthoredActionSchema(detectVariantPlan),
    [detectVariantPlan],
  );
  ```
  ```ts
  const result = await props.helpers.dispatch(
    injectDetectVariantArgs(detectVariantAction, {
      value: currentValue,
      variants: variants.map((variant) => variant.key),
    }),
  ```
- **严重程度**: P1
- **契约条款**: `event` 字段应由 `NodeRenderer` 编译并装配为 `props.events` 上的 `RendererEventHandler`；concrete renderer 应从 `props.events` 消费事件处理器，而不是读取 `templateNode.eventPlans`、反抽 compiled action program 的 raw source 后自行 dispatch。
- **现状**: `detectVariantAction` 在 renderer definition 中声明为 `event`，但 `variant-field` 没有调用 `props.events.detectVariantAction`。它直接读取 `props.templateNode.eventPlans.detectVariantAction`，再通过 `getAuthoredActionSchema()` 从 `CompiledActionProgram.nodes[].source` 提取原始 `ActionSchema`，注入默认 args 后调用 `props.helpers.dispatch()`。
- **风险**: 该路径绕过 `NodeRenderer` 对事件字段的统一适配、默认 scope/nodeInstance/event 语义，以及未来 tracing、diagnostics、cancellation 或 event contract 变更。若 compiled action program 后续不再保留 `source`，或 event handler 增强语义只在 `props.events` 中实现，`variant-field` 会静默偏离标准事件通道。
- **建议**: 优先将 `detectVariantAction` 作为真正事件从 `props.events.detectVariantAction` 调用，并通过 event payload / eventContext 传递 `{ value, variants }`。如果该字段确实需要 renderer 主动持有并改写 action schema，应重新建模为明确的 owner action prop / semantic action channel，而不是声明为 `event` 后读取 `eventPlans`。
- **为什么值得现在做**: `variant-field` 是高级表单字段主路径，`detectVariantAction` 已有测试和实际 schema 行为覆盖；当前实现会把后续 event channel 收敛、action diagnostics 或 compiled action program 内部结构调整的成本集中到 live renderer 主路径上。
- **误报排除**: 这不是重复 quickSaveAction event 问题。这里的问题不在表格 quick-edit，也不是单纯“event 被当 prop 读”，而是 `variant-field` 直接读取 compiled `eventPlans` 并从中反抽 raw action source，绕过 `props.events` 的标准 handler。
- **历史模式对应**: 对应 field metadata / slot modeling 中“字段语义由 renderer metadata 定义，renderer 只消费规范化输出”的收敛模式；也对应 renderer-runtime 中 “NodeRenderer builds events” 与 concrete renderer boundary 不应依赖 compiled template 内部结构的模式。
- **参考文档**: `docs/architecture/renderer-runtime.md`（NodeRenderer Responsibilities、Renderer Component Contract、Props Versus Hooks）；`docs/architecture/field-metadata-slot-modeling.md`（Renderer metadata defines field semantics、event field、renderer consumes normalized outputs）；`docs/references/renderer-interfaces.md`（RendererDefinition field map、RendererEventHandler、Render-Time React Contracts）
- **复核状态**: 未复核

### [维度09-07] `ReportInspectorShellRenderer` 手工伪造 `ReportInspectorRenderer` props 并直接调用子 renderer，绕过 `report-inspector` definition/NodeRenderer 装配

- **文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-41,70-72`, `packages/report-designer-renderers/src/renderers.tsx:153-160`
- **行号范围**: `inspector-shell-renderer.tsx:32-41,70-72`, `renderers.tsx:153-160`
- **证据片段**:
  ```tsx
  const inspectorProps: RendererComponentProps<ReportInspectorSchema | ReportInspectorShellSchema> =
    {
      ...props,
      meta: {
        visible: true,
        hidden: false,
        disabled: false,
        changed: false,
      },
      props: { ...props.props, body: inspector?.resolvedSchema },
    };
  ```
  ```tsx
  ) : (
    <ReportInspectorRenderer {...inspectorProps} />
  )}
  ```
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
- **严重程度**: P2
- **契约条款**: `NodeRenderer` 负责根据目标 renderer definition 解析 `meta` / `props` / `events` / `regions` / `helpers` 并调用 concrete renderer；一个 renderer 不应手工构造另一个 renderer 的 `RendererComponentProps` 后直接调用其 component。
- **现状**: `report-inspector-shell` 读取 owner scope 后，把自身 `props` 展开并改写 `meta` 与 `props.body`，直接 `<ReportInspectorRenderer {...inspectorProps} />`。这条路径没有经过 `report-inspector` 自己的 renderer definition field map、node identity、path、cid/testid、events/regions 装配。
- **风险**: 当前 `report-inspector` 字段面较窄，所以问题局部可控；但一旦它新增字段 metadata、wrap、region、event、debug/diagnostics 或 node identity 依赖，shell 内嵌路径会与正常 schema 使用路径分叉。手工覆盖 `meta` 也会让内层 inspector 是否是独立 inspectable node 变得不明确。
- **建议**: 若 shell 需要组合 inspector，应通过 `props.helpers.render({ type: 'report-inspector', body: inspector?.resolvedSchema, ... }, { pathSuffix: 'inspector' })` 走标准渲染路径；或者抽出纯 `ReportInspectorView` / controller，让 `ReportInspectorRenderer` 与 shell 共享 view 层，而不是伪造完整 renderer boundary。
- **为什么值得现在做**: 这是除 CRUD/Table 外另一个 live renderer-to-renderer direct call；如果现在不收敛，report designer 后续扩展 inspector 字段、事件或调试桥时会复制同类旁路维护成本，并扩大 renderer contract 漂移面。
- **误报排除**: 这不是重复 `CrudRenderer` 伪造 `TableRenderer` props 的发现；它位于 `report-designer-renderers`，目标 renderer 与字段面不同。也不是禁止组合 renderer UI，问题点是组合方式伪造了完整 `RendererComponentProps` boundary，而不是使用 `helpers.render` 或共享纯 view。
- **历史模式对应**: 对应 renderer-runtime 中 “NodeRenderer assembles final renderer contract” 的历史收敛模式；也对应 v1 基线下不接受主路径 renderer boundary 伪造 / raw props 拼装补洞的模式。
- **参考文档**: `docs/architecture/renderer-runtime.md`（End-To-End Render Pipeline、NodeRenderer Responsibilities、Renderer Component Contract）；`docs/architecture/field-metadata-slot-modeling.md`（renderer consumes normalized outputs）；`docs/references/renderer-interfaces.md`（RendererDefinition field map、Render-Time React Contracts）
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度09-08] 多个 `wrap: true` 字段渲染器把 node-level `data-testid` / `data-cid` 盲目镜像到内层 control root

- **文件**: `packages/flux-react/src/node-frame-wrapper.tsx:58-84`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx:255-260`, `packages/flux-renderers-form-advanced/src/array-editor.tsx:334-340`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:544-550`
- **行号范围**: `node-frame-wrapper.tsx:58-84`, `tree-controls.tsx:255-260`, `array-editor.tsx:334-340`, `array-field.tsx:544-550`
- **证据片段**:
  ```tsx
  const usesInteractiveControlRoot =
    props.templateNode.type === 'array-editor' ||
    props.templateNode.type === 'array-field' ||
    props.templateNode.type === 'input-tree' ||
    props.templateNode.type === 'tree-select' ||
    props.templateNode.type === 'tag-list' ||
    props.templateNode.type === 'condition-builder' ||
    props.templateNode.type === 'key-value' ||
    props.templateNode.type === 'detail-field';
  ```
  ```tsx
  <FieldFrame
    ...
    testid={props.resolvedMeta.testid}
    cid={props.resolvedMeta.cid}
  >
  ```
  ```tsx
  <div
    className={cn('nop-input-tree', props.meta.className)}
    data-slot="input-tree-control"
    data-testid={props.meta.testid}
    data-cid={props.meta.cid}
  >
  ```
  ```tsx
  <div
    className={cn('nop-array-field', props.meta.className)}
    data-slot="field-control"
    data-testid={props.meta.testid}
    data-cid={props.meta.cid}
  >
  ```
- **严重程度**: P2
- **契约条款**: `renderer-runtime.md` 明确规定 `testid` / `cid` 是 node-level anchor；对 `wrap: true` 字段渲染器，mounted inspectable node root 通常是 `FieldFrame`，因此 `props.meta.testid` 和 `props.meta.cid` 属于 `FieldFrame`，内层 control 不应盲目镜像。
- **现状**: `NodeFrameWrapper` 已经对 `array-editor`、`array-field`、`input-tree`、`tree-select`、`tag-list`、`condition-builder`、`key-value` 等 `wrap: true` 字段把 `testid` / `cid` 传给 `FieldFrame`。但这些字段渲染器自身仍把同一 `props.meta.testid` / `props.meta.cid` 写到内层 control root，形成同一 node id/test anchor 在 FieldFrame 与内层 DOM 上重复出现。
- **风险**: DOM/debugger/registry lookup 依赖最近的 `data-cid` 时，重复 cid 会让“mounted inspectable node root”边界变得不稳定；测试选择器也可能同时命中外层 FieldFrame 与内层 control，掩盖 wrapper contract 变化。后续若 FieldFrame 根节点、`frameClassName`、分组布局或调试桥规则调整，这些内层镜像点需要逐个同步。
- **建议**: 对 `wrap: true` 字段删除内层对 node-level `props.meta.testid` / `props.meta.cid` 的盲目透传，只保留 `props.meta.className` 到 canonical control root。若某个复杂字段确实需要 control-level 专用测试锚点，应新增明确命名的 control-level prop 或 data attribute，而不是复用 node-level `testid` / `cid`。
- **误报排除**: 这不是要求所有复杂字段机械采用 FieldFrame；这些 renderer definition 已经声明 `wrap: true`，且 `NodeFrameWrapper` 已经是外层 FieldFrame owner。本条只针对同一 node-level anchor 被内外两层同时写入，符合 calibration pattern 9 中“直接违反当前 shell contract / 外壳 ownership 漂移”的保留条件。
- **参考文档**: `docs/architecture/renderer-runtime.md`（cid placement、props versus meta、`testid` and `cid` follow a different rule from `className`）；`AGENTS.md`（Renderer Component Contract）；`docs/references/deep-audit-calibration-patterns.md`（Pattern 9）
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度09-01]: 保留 (P1)。`packages/flux-renderers-data/src/data-renderer-definitions.ts:132-133` 仍把 `quickSaveAction` / `quickSaveItemAction` 声明为 `event`，但 `table-quick-edit-cell.tsx:59-80` 与 `table-quick-edit-controller.ts:321-350` 仍把它们当 `ActionSchema` prop 直接 `helpers.dispatch(...)`。
- [维度09-02]: 保留 (P1)。`packages/flux-renderers-data/src/crud-renderer.tsx:236-315` 仍手工伪造 `RendererComponentProps<TableSchema>` 并直接 `<TableRenderer {...tableRendererProps} />`，没有走 `helpers.render` / NodeRenderer 装配路径。
- [维度09-03]: 保留 (P2)。`crud-renderer.tsx:46-48,109-111` 仍从 `props.templateNode.schema` 回填 `quickSaveAction` / `quickSaveItemAction`，raw schema fallback 仍在 live 主路径承担 contract 补洞。
- [维度09-04]: 保留 (P2)。`packages/flux-renderers-form/src/field-utils/field-handlers.tsx:11-18,165-188` 仍通过 `RuntimeContext` from `@nop-chaos/flux-react/unstable` 读取 runtime，而不是公开 `useRendererRuntime()` hook。
- [维度09-05]: 保留 (P2)。`packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:10-39,207-226` 仍直接拥有 `FieldFrame` 并复制 frame-wrap / chrome 装配逻辑，与 `variant-field` definition 未声明 `wrap: true` 的中央路径并行。
- [维度09-06]: 保留 (P1)。`packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts:48-54,118-131` 仍从 `templateNode.eventPlans.detectVariantAction` 反抽 raw `ActionSchema`，经 `variant-field-helpers.ts:33-44` 读取 compiled program `source` 后自行 `helpers.dispatch(...)`，未走 `props.events.detectVariantAction`。
- [维度09-07]: 保留 (P2)。`packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-41,70-72` 仍手工构造 `inspectorProps` 并直接渲染 `<ReportInspectorRenderer />`，绕过 `report-inspector` definition/NodeRenderer 正常装配。
- [维度09-08]: 保留 (P2)。`packages/flux-react/src/node-frame-wrapper.tsx:58-84` 已把多个 `wrap: true` 字段的 node-level `testid/cid` 交给 `FieldFrame`，而 `array-editor.tsx:334-340`、`array-field.tsx:544-550`、相关复杂字段 renderer 仍把同一 `props.meta.testid/cid` 镜像到内层 control root，重复 anchor 仍存在。

## 子项复核结论

- [维度09-01] 至 [维度09-08]: 均成立。复核后仍集中指向 renderer boundary 被 props/raw schema/unstable/runtime internals 手工旁路，适合作为一组 renderer contract 收口项保留。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                                | 一句话摘要                                                                 |
| ----- | -------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 09-01 | P1       | `packages/flux-renderers-data/src/data-renderer-definitions.ts:132-133`                             | table quick save actions 仍声明为 event，但消费端按 ActionSchema prop 使用 |
| 09-02 | P1       | `packages/flux-renderers-data/src/crud-renderer.tsx:236-315`                                        | CRUD 仍手工伪造 Table renderer props 并直接调用组件                        |
| 09-03 | P2       | `packages/flux-renderers-data/src/crud-renderer.tsx:46-48,109-111`                                  | CRUD 仍用 raw schema fallback 回填 quickSave contract 缺口                 |
| 09-04 | P2       | `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:11-18,165-188`                     | field handlers 仍从 unstable RuntimeContext 读 runtime                     |
| 09-05 | P2       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:10-39,207-226`      | variant-field view 仍自带 FieldFrame 并复制 wrap/chrome 装配               |
| 09-06 | P1       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts:48-54,118-131` | variant-field 仍绕过 `props.events` 反抽 raw action 自行 dispatch          |
| 09-07 | P2       | `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:32-41,70-72`                   | report inspector shell 仍直接构造 inner renderer props                     |
| 09-08 | P2       | `packages/flux-react/src/node-frame-wrapper.tsx:58-84`                                              | wrap=true 字段的 node-level `cid/testid` 仍被内外层重复镜像                |
