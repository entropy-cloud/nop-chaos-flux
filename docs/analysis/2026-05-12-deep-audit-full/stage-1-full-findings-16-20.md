# Stage-1 Full Findings: Dimensions 16-20

> 状态：第 1 轮初审条目重建稿。内容来自 live repo 复查，用于补救早期维度文件只保留一句话摘要的问题；最终结论仍需与第 2-5 轮 raw findings 合并后重新独立复核。

## 维度 16：文档-代码一致性

### [维度16-01] Report Designer `selection`/`target` alias docs 与 live host projection 不一致

- **文件**: `docs/architecture/report-designer/design.md:404-410`; `packages/report-designer-renderers/src/host-data.ts:155-195`
- **证据片段**:
  ```md
  ### `report-designer-page` 额外暴露

  - `designer` — 主投影，包含 `selectionTarget`、`inspector`...
  - `selectionTarget` — 当前选择目标（canonical）
  - `selection`、`target` — `selectionTarget` 的兼容别名
  ```
  ```ts
  return {
    designer: {
      selectionTarget: snapshot.selectionTarget,
    },
    selectionTarget: snapshot.selectionTarget,
    reportDocument,
    inspector: snapshot.inspector,
    inspectorPanels: snapshot.inspector.resolvedSchema,
  ```
- **严重程度**: P2
- **现状**: 文档称顶层 `selection`/`target` 是 `selectionTarget` 兼容别名；live `buildReportDesignerScopeData()` 发布 `selectionTarget`，未发布顶层 `selection/target`。
- **风险**: 按文档编写的 schema 可能引用 runtime 不存在的 aliases，导致 expression silent failure 或自定义区域缺 state。
- **建议**: 实现文档化 aliases，或从 active docs 移除并标注旧 alias 已移除。
- **误报排除**: 不涉及 spreadsheet nested `spreadsheet.selection`；文档 aliases 是 report 顶层 `selectionTarget` aliases。
- **复核结论**: 保留 P2。

### [维度16-02] `inspectorPanels` support 状态在 docs 与 live projection 冲突

- **文件**: `docs/architecture/report-designer/design.md:427-460`; `packages/report-designer-renderers/src/host-data.ts:156-164`, `189-193`
- **证据片段**:
  ```md
  - retained convenience mirrors:
    - top-level `workbook`, `activeSheet`, `canUndo`, ...
  - removed from the supported schema-visible boundary:
    ...
    顶层便利字段 ... 当前 live code 如仍暴露 `inspectorPanels` 一类字段，应视为 implementation lag / compatibility detail，而不是规范主路径。
  ```
  ```ts
  designer: {
    inspector: snapshot.inspector,
    inspectorPanels: snapshot.inspector.resolvedSchema,
  },
  ...
  inspector: snapshot.inspector,
  inspectorPanels: snapshot.inspector.resolvedSchema,
  ```
- **严重程度**: P2
- **现状**: docs 将 `inspectorPanels` 视为 implementation lag/non-canonical；live host data 同时发布 `designer.inspectorPanels` 与顶层 `inspectorPanels`。
- **风险**: builder tooling 与 schema authors 对该字段是否 supported 产生分歧；后续移除可能破坏从 live projection 学到的 schemas。
- **建议**: 明确决策：支持则作为 retained compatibility 文档化；不支持则移除或 deprecate live projection 并给 migration。
- **误报排除**: 这是 schema-visible host scope data，不是内部 TS field。
- **复核结论**: 保留 P2。

### [维度16-03] `setValues` current-scope/no-targeting 文档契约与 live behavior 漂移

- **文件**: `docs/references/flux-json-conventions.md:131-145`; `packages/flux-runtime/src/action-adapter.ts:92-110`
- **证据片段**:
  ```md
  - `setValue` 使用 `args: { path, value }`
  - `setValues` 使用 `args: { values }` 或 `args: { path, values }`
  - `path` 是推荐字段名，不使用 `dataPath`
  - `setValues.args.path` 存在时，`args.values` 的 key 相对这个基准路径
  - `setValue` / `setValues` 不使用 `componentPath` / 顶层 `value` / 顶层 `values`
  ```
  ```ts
  case 'setValues': {
    const values = (invocation.args?.values as Record<string, unknown> | undefined) ?? {};
    if (ctx.form) {
      ctx.form.setValues(values);
    }
    const basePath =
      typeof invocation.args?.path === 'string'
        ? invocation.args.path
        : invocation.targeting.targetId;
  ```
- **严重程度**: P1
- **现状**: form context 下 `setValues` 忽略 `args.path`，直接 `ctx.form.setValues(values)`；非 form context 下仍可 fallback 到 `invocation.targeting.targetId`。
- **风险**: documented relative-path semantics 不一致；hidden targeting fallback 让写入位置依赖 compiled targeting metadata 而非 explicit `args.path`。
- **建议**: form/non-form path 都一致 honor `args.path`，并移除或文档化 `targeting.targetId` fallback。
- **误报排除**: 非 `component:setValues`；此条针对 built-in `setValues` action。
- **复核结论**: 保留 P1。

## 维度 17：命名与术语一致性

### [维度17-01] Code editor source refs 仍接受 legacy `dataPath`

- **文件**: `packages/flux-code-editor/src/types.ts:188-192`; `packages/flux-code-editor/src/types.test.ts:41-44`
- **证据片段**:
  ```ts
  export function resolveSourceRefPath(sourceRef: {
    path?: string;
    dataPath?: string;
  }): string | undefined {
    return sourceRef.path ?? sourceRef.dataPath;
  }
  ```
- **严重程度**: P3
- **现状**: `path` 优先，但 `dataPath` 仍作为 fallback 支持。
- **风险**: 旧术语 `dataPath` 会继续出现在 schemas/examples，与当前推荐 `path` 命名分裂。
- **建议**: 如需兼容则标记 `dataPath` legacy/deprecated，并避免出现在示例。
- **误报排除**: fallback 真实存在，但不是 primary authoring contract，因为 `path` 优先。
- **复核结论**: 降级保留 P3。

### [维度17-02] Button `variant` docs 与 live `ButtonSchema` 值域冲突

- **文件**: `docs/references/flux-json-conventions.md:189-204`; `packages/flux-renderers-basic/src/schemas.ts:143-147`
- **证据片段**:
  ```md
  | **Button** | `variant` | `'default' | 'primary' | 'danger'` | 按钮样式变体 |
  ...
  "type": "button",
  "label": "保存",
  "variant": "primary"
  ```
  ```ts
  export interface ButtonSchema extends BaseSchema {
    type: 'button';
    label?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  ```
- **严重程度**: P2
- **现状**: active JSON conventions 推荐 `primary/danger`，live generic button schema 接受 shadcn-style variants。
- **风险**: 按 reference doc 编写 generic button schema 会产生不支持的 values。
- **建议**: 更新 docs 匹配 `ButtonSchema`，或实现并文档化 `primary/danger` aliases。
- **误报排除**: domain-specific toolbar configs 也用 `primary/danger`，但本条专指 generic `button` renderer contract。
- **复核结论**: 保留 P2。

### [维度17-03] Toolbar button `variant` vocabulary 与 generic Button vocabulary 分裂

- **文件**: `packages/flow-designer-core/src/types.ts:229-237`; `packages/flow-designer-renderers/src/designer-toolbar.tsx:219-234`; `packages/report-designer-renderers/src/report-designer-toolbar.tsx:97-106`
- **证据片段**:
  ```ts
  | {
      type: 'button';
      action: string;
      variant?: 'default' | 'primary' | 'danger';
    }
  ```
  ```tsx
  const isPrimary = item.variant === 'primary';
  const variant = active || isPrimary ? 'default' : 'outline';
  ```
  ```tsx
  variant={
    item.variant === 'primary'
      ? 'default'
      : item.variant === 'danger'
        ? 'destructive'
        : 'outline'
  }
  ```
- **严重程度**: P2
- **现状**: flow/report toolbar configs 用 `default|primary|danger`，generic `ButtonSchema` 用 `default|destructive|outline|secondary|ghost|link`；renderers 做映射。
- **风险**: 同一个“button variant”术语在不同 schema surface 代表不同值域，增加 author 和 validator 复杂度。
- **建议**: 对齐 domain toolbar variants 与 generic `ButtonSchema`，或明确文档化 toolbar variants 是独立 semantic vocabulary。
- **误报排除**: renderers 有意映射 `primary/danger`；问题是命名/值域一致性，不是渲染失败。
- **复核结论**: 降级保留 P2。

### [维度17-04] Button example 使用 unsupported `size: "md"`

- **文件**: `docs/components/button/example.json:1-6`; `packages/flux-renderers-basic/src/schemas.ts:143-147`
- **证据片段**:
  ```json
  {
    "type": "button",
    "label": "提交",
    "variant": "default",
    "size": "md",
    "disabled": false
  }
  ```
  ```ts
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  ```
- **严重程度**: P3
- **现状**: component example 使用 `md`，live `ButtonSchema.size` 不包含 `md`。
- **风险**: 复制示例会得到 invalid schema 或被忽略的样式。
- **建议**: 改为 `size: "default"`，或实现 explicit `md` alias。
- **误报排除**: 这是 active component example，不是 archived experiment。
- **复核结论**: 保留 P3。

### [维度17-05] Flow Designer icon examples 使用 PascalCase，与 kebab-case convention 冲突

- **文件**: `docs/architecture/flow-designer/config-schema.md:723-743`; `docs/references/flux-json-conventions.md:219-231`
- **证据片段**:
  ```json
  {
    "type": "button",
    "action": "designer:undo",
    "icon": "RotateCcw",
    "label": "撤销"
  }
  ...
  {
    "type": "button",
    "action": "designer:save",
    "icon": "Save",
    "label": "保存",
    "variant": "primary"
  }
  ```
  ```md
  使用 Lucide Icons，配置中采用 **kebab-case**：
  "icon": "rotate-ccw", // ✅ 推荐
  运行时转换为 PascalCase：`'rotate-ccw'` → `'RotateCcw'`
  ```
- **严重程度**: P3
- **现状**: flow-designer config example 使用 `RotateCcw/Save`，reference convention 推荐 authored icons 使用 kebab-case。
- **风险**: 示例训练 schema authors 使用不同 icon naming style。
- **建议**: 示例改为 `rotate-ccw/save`，或明确 PascalCase 也受支持。
- **误报排除**: runtime 可能解析 PascalCase；finding 是 authoring convention 一致性问题。
- **复核结论**: 保留 P3。

### [维度17-06] `createFlowDesignerRegistry` 是 deferred naming residual

- **文件**: `packages/flow-designer-renderers/src/index.tsx:148-154`; `docs/architecture/flow-designer/design.md:85-97`
- **证据片段**:

  ```ts
  export function registerFlowDesignerRenderers(registry: RendererRegistry) {
    return registerRendererDefinitions(registry, flowDesignerRendererDefinitions);
  }

  export function createFlowDesignerRegistry(baseRegistry: RendererRegistry): RendererRegistry {
    return registerFlowDesignerRenderers(baseRegistry);
  }
  ```

  ```md
  - `registerFlowDesignerRenderers(registry)`
  - `createFlowDesignerRegistry()` 当前仍保留在 root stable surface；其 create 命名语义漂移已被明确列为 deferred naming residual
  ```

- **严重程度**: P3
- **现状**: `createFlowDesignerRegistry(baseRegistry)` 实际向传入 registry 注册 definitions，而不是创建 fresh registry；docs 已标为 deferred naming residual。
- **风险**: API 名称会误导用户期待分配新 registry。
- **建议**: 保留 stable export 兼容，但推广 `registerFlowDesignerRenderers()`，未来考虑 deprecate/alias。
- **误报排除**: docs 已标为 residual，因此不是 closure blocker 或功能缺陷。
- **复核结论**: 降级保留 P3。

### [维度17-07] Condition-builder operator IDs 使用 snake_case

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/operators.ts:10-28`; `apps/playground/src/pages/conditionBuilderSchema.json:129-135`; `docs/references/flux-json-conventions.md:233-244`
- **证据片段**:
  ```ts
  export const OPERATOR_LABEL_KEYS: Record<string, string> = {
    equal: 'conditionBuilder.operators.equal',
    not_equal: 'conditionBuilder.operators.notEqual',
    less_or_equal: 'conditionBuilder.operators.lessOrEqual',
    is_empty: 'conditionBuilder.operators.isEmpty',
    select_any_in: 'conditionBuilder.operators.selectAnyIn',
    select_not_any_in: 'conditionBuilder.operators.selectNotAnyIn',
  };
  ```
  ```json
  "operators": {
    "labels": {
      "equal": "等于",
      "not_equal": "不等于",
  ```
- **严重程度**: P2
- **现状**: public condition-builder operator IDs 与 override keys 使用 snake_case，而 JSON convention 推荐 ordinary keys 使用 camelCase。
- **风险**: operator config 成为长期命名例外，validator 和文档需要 special-case。
- **建议**: 引入 camelCase canonical IDs 并兼容 snake_case，或明确 document operator IDs 是 DSL tokens 例外。
- **误报排除**: operator IDs 有 DSL token 属性，不完全等同 schema prop；但它们仍作为 author-facing JSON keys 暴露。
- **复核结论**: 保留 P2。

## 维度 18：跨包模式一致性

### [维度18-01] `designer-page` 声明 `$designer` scope export，但 live host scope 不发布 `$designer`

- **文件**: `packages/flow-designer-renderers/src/index.tsx:93-112`; `packages/flow-designer-renderers/src/designer-context.ts:113-158`; `packages/flow-designer-renderers/src/designer-provider-and-manifest.test.tsx:230-248`
- **证据片段**:
  ```tsx
  scopeExportContracts: {
    $designer: {
      kind: 'object',
      fields: {
        kind: { kind: 'literal', value: 'designer' },
        dirty: { kind: 'boolean' },
        busy: { kind: 'boolean' },
        canUndo: { kind: 'boolean' },
  ```
  ```ts
  return {
    doc: {
    },
    selection: {
    },
    activeNode: snapshot.activeNode,
    activeEdge: snapshot.activeEdge,
    activeBranch: snapshot.activeBranch,
    runtime: {
  ```
- **严重程度**: P2
- **现状**: renderer metadata 声明 `$designer` export contract，测试也断言 metadata 存在；live `buildDesignerScopeData()` 发布 `doc/selection/activeNode/activeEdge/activeBranch/runtime`，没有 `$designer` 对象。
- **风险**: builder/static tools 宣传 `$designer`，但 runtime expressions 读不到。
- **建议**: 发布符合 contract 的 `$designer`，或修改 `scopeExportContracts` 匹配实际 projection。
- **误报排除**: 不涉及 `designer:*` action namespace；这是 schema-visible read-scope projection。
- **复核结论**: 保留 P2。

## 维度 19：错误传播保真度

### [维度19-01] Request-backed actions 跳过 action-layer retry

- **文件**: `packages/flux-action-core/src/action-dispatcher/program-utils.ts:10-12`; `packages/flux-action-core/src/action-dispatcher/action-execution.ts:229-249`, `251-268`
- **证据片段**:
  ```ts
  export function isRequestBackedAction(action: CompiledActionNode): boolean {
    return action.action === 'ajax' || action.action === 'submitForm' || action.action === 'submit';
  }
  ```
  ```ts
  async function runSingleActionWithRetry(
    ...
    if (isRequestBackedAction(action)) {
      const result = await runSingleActionWithTimeout(ctx, action, actionCtx);
      return {
        ...result,
        attempts:
  ```
  ```ts
  const retry = getRetryControl(action.control?.retry);
  const { result } = await withRetry(
    () => runSingleActionWithTimeout(ctx, action, actionCtx),
  ```
- **严重程度**: P1
- **现状**: `ajax/submitForm/submit` 走 special path，不调用 `withRetry()`；common retry path 位于 early return 后。
- **风险**: authoring-level retry controls 对关键 request-backed actions 被忽略，除非下层独立实现兼容 retry。soft failures 不重试/计数不一致。
- **建议**: request-backed actions 也进入 action-layer retry，或明确文档和测试 retry delegated to request runtimes。
- **误报排除**: 不是 HTTP adapter retry internals；问题是 action dispatcher 的 `control.retry` path 被绕过。
- **复核结论**: 保留 P1。

## 维度 20：可访问性 (WCAG)

### [维度20-01] `FieldFrame` label 在 composite controls 上未程序化关联

- **文件**: `packages/flux-react/src/field-frame.tsx:162-168`, `225-250`
- **证据片段**:
  ```tsx
  const isGroup = layout === 'checkbox' || layout === 'radio';
  const Tag = isGroup ? 'fieldset' : (rootTag ?? 'label');
  const LabelTag = isGroup ? 'legend' : 'span';
  const errorId = name ? `${name}-error` : undefined;
  const controlId = name ? `${name}-control` : undefined;
  ```
  ```tsx
  {label ? (
    <LabelTag data-slot="field-label" style={labelStyle}>
      {label}
    </LabelTag>
  ) : null}
  <div
    data-slot="field-control"
    aria-describedby={describedBy}
  ```
- **严重程度**: P2
- **现状**: 非 group 且 `rootTag="div"` 或 composite children 时，label 是 `span`，无 `htmlFor/aria-labelledby` 关联；control wrapper 有 error attrs，但 visible label 不稳定关联实际 focus target。
- **风险**: screen reader 可能无法为复合控件/自定义 renderer 输出读出 field label。
- **建议**: 生成 stable label ID，并应用到实际 focusable control 或 group root；单一具体控件路径使用 `<label htmlFor>`。
- **误报排除**: 基础 input 在外层 `<label>` 或 child id 匹配时可能正常；问题是 composite/rootTag div 路径。
- **复核结论**: 保留 P2。

### [维度20-02] Select/RadioGroup errors 未稳定关联 focus targets

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:166-180`, `317-335`
- **证据片段**:
  ```tsx
  <SelectTrigger
    id={name ? `${name}-control` : undefined}
    aria-invalid={presentation.showError ? true : undefined}
    aria-describedby={errorMessage && name ? `${name}-source-error` : undefined}
    aria-errormessage={errorMessage && name ? `${name}-source-error` : undefined}
  ```
  ```tsx
  <RadioGroup
    data-slot="radio-group-options"
    aria-required={props.props.required ? true : undefined}
    aria-invalid={presentation.showError ? true : undefined}
  ...
  {errorMessage ? (
    <span data-slot="radio-group-error" role="alert">
  ```
- **严重程度**: P2
- **现状**: Select 只把 source errors 关联到 trigger；validation errors 可能由 FieldFrame 关联到 wrapper。RadioGroup source errors 没有 stable ID，也未被 group 引用。
- **风险**: AT 用户 focus 字段时可能听不到错误，或 `aria-errormessage` target 不稳定。
- **建议**: 每个 field error/source-error 使用 stable ID，并把 `aria-describedby/aria-errormessage` 加到具体 focus target 或 group root。
- **误报排除**: visual errors 与 `role="alert"` 可能异步 announce；问题是 focus-target association。
- **复核结论**: 保留 P2。

### [维度20-03] Submit validation failure 不聚焦首个 invalid field

- **文件**: `packages/flux-runtime/src/form-runtime-submit-flow.ts:150-175`, `233-245`
- **证据片段**:

  ```ts
  ownerRuntime.supersedeLowerPriorityWork();
  const validation =
    !currentValidation && runtimeFieldRegistrations.size === 0
      ? ({ ok: true, errors: [], fieldErrors: {} } as FormValidationResult)
      : await validateForm('submit');

  if (!validation.ok) {
    const validationFailure = {
      ok: false,
      error: validation.errors,
      data: validation.fieldErrors,
  ```

- **严重程度**: P2
- **现状**: submit 标记/touch fields 并返回 errors，但未触发首个 invalid field focus。
- **风险**: 键盘和 screen reader 用户提交失败后可能停留在 submit button，无法立即定位第一个问题。
- **建议**: 添加 form-level focus-invalid-field hook 或 runtime/React bridge，在 submit failure 后 focus 第一个 visible invalid control。
- **误报排除**: error state 已发布；缺失的是 focus movement。
- **复核结论**: 保留 P2。

### [维度20-04] Condition-builder AND/OR selected state 只用视觉样式表达

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:266-295`; `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:108-118`
- **证据片段**:
  ```tsx
  <WrappedFieldAction
    className={
      value.conjunction === 'and'
        ? 'bg-primary text-primary-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }
  ```
  ```tsx
  <span
    role="button"
    tabIndex={disabled ? -1 : 0}
    aria-disabled={disabled ? 'true' : undefined}
  ```
- **严重程度**: P2
- **现状**: AND/OR state 只通过 class changes 表示；底层 `role="button"` 没有 `aria-pressed/aria-checked/role="radio"` 等 selected state。
- **风险**: screen reader 用户无法知道当前 conjunction 选择。
- **建议**: 使用 toggle group/radio group pattern，或给 active AND/OR buttons 添加 `aria-pressed`。
- **误报排除**: buttons 可键盘访问；缺失的是 selected-state semantics。
- **复核结论**: 保留 P2。

### [维度20-05] Remove subgroup button 缺 stable accessible name

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:251-261`; `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:108-118`
- **证据片段**:
  ```tsx
  {depth > 0 && onRemove && (
    <WrappedFieldAction
      variant="outline"
      size="icon-xs"
      className="absolute -right-2 -top-2 z-10 rounded-full ..."
      onClick={onRemove}
      title={removeGroupLabel}
    >
      ×
  ```
  ```tsx
  <span
    role="button"
    tabIndex={disabled ? -1 : 0}
    aria-disabled={disabled ? 'true' : undefined}
    data-slot="button"
  ```
- **严重程度**: P2
- **现状**: remove action 是 `×` + `title`，没有 explicit `aria-label`。
- **风险**: accessible name 可能变成 “×”，或依赖不稳定的 title fallback。
- **建议**: 添加 `aria-label={removeGroupLabel}`，必要时将视觉 `×` 标为装饰。
- **误报排除**: `title` 可提供 tooltip，但不是可靠的 icon-only action accessible-name strategy。
- **复核结论**: 保留 P2。

### [维度20-06] Interactive table rows 缺 role/name/state semantics

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:93-125`; `packages/ui/src/components/ui/table.tsx:42-49`
- **证据片段**:
  ```tsx
  const { rowKey, rowInstancePath, isExpanded, isSelected, isEven, entry, rowScope } = item;
  const isRowInteractive = Boolean(parentProps.events.onRowClick) || expandRowByClick;
  ...
  <TableRow
    data-slot="table-row"
    data-interactive={isRowInteractive || undefined}
    data-expanded={isExpanded || undefined}
    tabIndex={isRowInteractive ? 0 : undefined}
    onClick={isRowInteractive ? handleRowActivate : undefined}
  ```
  ```tsx
  return (
    <tr data-slot="table-row" className={cn(getTableRowClassName(variant), className)} {...props} />
  );
  ```
- **严重程度**: P2
- **现状**: rows 可 keyboard-focusable/activatable，但仍是 `<tr>`，没有 role、accessible name 或 `aria-expanded`，虽然发出 `data-expanded`。
- **风险**: AT 可能不知道 row 是 interactive control，也不知道 expanded/collapsed state。
- **建议**: row interactive 时补 semantics，例如 expand-by-row-click 添加 `aria-expanded` 和 action name；或将 activation 移入命名 button/control。
- **误报排除**: 独立 expand button 有 aria-label；本条针对 row itself 被设为 interactive 的路径。
- **复核结论**: 保留 P2。

### [维度20-07] Chart renderer 缺数据文本替代

- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:117-119`, `256-303`
- **证据片段**:
  ```tsx
  const chartHeight = typeof height === 'number' ? `${height}px` : height || '400px';
  const chartAccessibleName = title?.trim() || t('flux.common.chart');
  ```
  ```tsx
  <div
    data-slot="chart-canvas"
    ref={chartRef}
    style={{ width: '100%', height: '100%' }}
    role={props.events.onClick ? 'button' : undefined}
    tabIndex={props.events.onClick ? 0 : undefined}
    aria-label={chartAccessibleName}
  >
    <ChartContainer config={chartConfig} style={{ height: '100%' }}>
      {renderChart()}
  ```
- **严重程度**: P2
- **现状**: 非空 chart 有 accessible name，但没有 textual data summary、table、description 或 screen-reader-only 数据等价物。
- **风险**: screen reader 用户知道存在图表，但无法获取 bars/lines/pie segments 表达的数据。
- **建议**: 从 `source/series` 生成 offscreen table/summary，或支持 authored `description/dataTable` slot。
- **误报排除**: `aria-label` 只命名 chart，不描述 chart data。
- **复核结论**: 保留 P2。
