# Round 2-5 Raw Findings: Dimensions 07-20

> 状态：原始追加深挖发现。以下条目尚未经过最终独立复核；不得直接作为最终结论使用。

## 维度 07：生命周期与副作用归属

### [维度07-06] status publication 在同 target 的 summary 变化上缺少每次发布 cleanup 归属

- **文件**: `packages/flux-react/src/status-path.ts:50-69`
- **证据片段**:

  ```ts
  useEffect(() => {
    const nextTarget = scope && statusPath ? { scope, statusPath } : undefined;
    const targetChanged = !samePublishedTarget(publishedTargetRef.current, nextTarget);
    const summaryChanged = !shallowEqualSummary(publishedSummaryRef.current, summary);

    if (publishedTargetRef.current && targetChanged) {
      publishOwnerStatus(publishedTargetRef.current.scope, publishedTargetRef.current.statusPath, undefined);
    }

    if (nextTarget && (targetChanged || summaryChanged)) {
      publishOwnerStatus(nextTarget.scope, nextTarget.statusPath, summary);
  ```

- **严重程度**: P2
- **现状**: hook 在 target 改变或 unmount 时清理旧 path；但同一个 `scope/statusPath` 仅 `summary` 变化时没有“本次发布实例”的 cleanup，只是覆盖写入新 summary。
- **风险**: 如果 publisher 的生灭和 summary 更新在并发渲染/快速切换下交错，host scope 可能暴露陈旧 status。问题会影响使用 `useStatusPathPublication` 的 designer/report/CRUD/page host 状态发布。
- **建议**: 将一次 `(scope,statusPath,summary)` 发布建模为 effect cleanup 所拥有的副作用；或在每次依赖变化时显式清旧再写新，并保留 unmount cleanup。
- **误报排除**: 这不是 ActionScope cleanup 问题；此处副作用是 React hook 向 scope 发布 owner status，且只在 target 变化时清旧。
- **复核状态**: 未复核。

### [维度07-07] ArrayEditor focus RAF 未在卸载或 items 变化时取消

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:226-247`
- **证据片段**:

  ```tsx
  React.useEffect(() => {
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;

    requestAnimationFrame(() => {
      if (pending.kind === 'add') {
        const lastItem = items[items.length - 1];
        if (lastItem) {
          inputRefs.current.get(lastItem.id)?.focus();
        }
  ```

- **严重程度**: P2
- **现状**: add/remove 后调度 `requestAnimationFrame` 执行 focus，但没有保存 RAF id，也没有 effect cleanup 取消。
- **风险**: 组件卸载或 items 已变化后仍可能执行过期 focus 副作用，导致焦点跳转到不再属于当前组件生命周期的 DOM/ref。
- **建议**: 保存 RAF id 并在 cleanup 中 `cancelAnimationFrame`；必要时加 mounted/sequence guard。
- **误报排除**: ref 为空会让部分操作 no-op，但调度的副作用仍越过组件 ownership 边界。
- **复核状态**: 未复核。

## 维度 08：验证系统一致性

### [维度08-05] TagListRenderer 绕过 validateOn 策略，点击变更总是触发校验

- **文件**: `packages/flux-renderers-form-advanced/src/tag-list.tsx:37-50`, `116-126`
- **证据片段**:

  ```tsx
  const syncErrorVisibility = React.useCallback(() => {
    if (!name) {
      return;
    }

    if (currentForm && (currentForm.isTouched(name) || fieldState.submitting)) {
      void currentForm.validateField(name);
      return;
    }

    if (currentValidationScope?.touchField && fieldState.touched) {
      void currentValidationScope.validateAt(name, 'change');
  ```

  ```tsx
  if (currentForm) {
    if (!currentForm.isTouched(name)) {
      currentForm.touchField(name);
    }
    currentForm.setValue(name, nextValue);
    syncErrorVisibility();
  } else {
    currentValidationScope?.touchField?.(name);
    scope.update(name, nextValue);
    void currentValidationScope?.validateAt(name, 'change');
  }
  ```

- **严重程度**: P1
- **现状**: tag-list 虽调用 `useFormFieldController`，但点击路径直接 `setValue/scope.update` 并调用 `validateField/validateAt('change')`，没有使用 field controller handlers 或 `shouldValidateOn` gate。
- **风险**: 字段配置 `validateOn: 'submit'` 或 `'blur'` 时，tag toggle 仍会在 change 时暴露错误，破坏验证策略一致性。
- **建议**: 变更路径复用 `useFormFieldController` 返回的 handlers，或用 shared validation behavior helper gate 直接校验调用。
- **误报排除**: 不重复“sync 错误被 async 延后”；本条是校验过早触发并绕过 validateOn。
- **复核状态**: 未复核。

### [维度08-06] ArrayEditor add/sync/remove 忽略 field validateOn 策略

- **文件**: `packages/flux-renderers-form-advanced/src/array-editor.tsx:249-264`, `376-379`
- **证据片段**:

  ```tsx
  const syncItems = React.useCallback(
    (nextItems: ArrayEditorItem[]) => {
      itemsRef.current = nextItems;

      if (!currentForm || !name) {
        scope.update(name, nextItems);
        return;
      }

      if (!currentForm.isTouched(name)) {
        currentForm.touchField(name);
      }

      currentForm.setValue(name, nextItems);
      void currentForm.validateField(name);
    },
  ```

  ```tsx
  if (currentForm && name) {
    currentForm.appendValue(name, nextItem);
    void currentForm.validateField(name);
    return;
  }
  ```

- **严重程度**: P2
- **现状**: array editor 在同步 items 和 append 时无条件触发 `validateField(name)`。
- **风险**: `validateOn: 'submit'/'blur'` 的数组字段会在编辑阶段立即显示 minItems/child errors，和基础 field handler 行为不一致。
- **建议**: 对 change 类操作使用 `shouldValidateOn(name, currentForm, 'change')`；若结构变更需要内部 child state 同步，应和用户可见 validation publication 分离。
- **误报排除**: 这是高级 array editor 的 eager validation，不是 owner context 解析问题。
- **复核状态**: 未复核。

## 维度 09：渲染器契约合规性

### [维度09-05] ObjectFieldRenderer 直接导入 unstable contexts 并手工重接 form/scope/validation

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:10-11`, `438-444`
- **证据片段**:
  ```tsx
  import { resolveRendererSlotContent } from '@nop-chaos/flux-react';
  import { FormContext, ScopeContext, ValidationContext } from '@nop-chaos/flux-react/unstable';
  ```
  ```tsx
  <FormContext.Provider value={childForm ?? undefined}>
    <ScopeContext.Provider value={childScope}>
      <ValidationContext.Provider value={childValidationOwner}>
        <div data-slot="object-field-body">{bodyContent}</div>
      </ValidationContext.Provider>
    </ScopeContext.Provider>
  </FormContext.Provider>
  ```
- **严重程度**: P2
- **现状**: renderer 直接使用 `/unstable` 暴露的 context provider 重新提供 projected form/scope/validation，而不是通过稳定 renderer helper 或标准 hook 边界。
- **风险**: 复合字段 projection 与 flux-react 内部 context/lifecycle 语义绑定，未来 hooks/runtime boundary 改动时容易漂移；也违背 renderer contract 中“不创建 ad-hoc context/providing chains”的方向。
- **建议**: 在 `flux-react` 提供稳定 projection boundary API；object-field 改用该 API，避免直接依赖 unstable contexts。
- **误报排除**: 不是“没有使用 hook”；该组件同时使用 hooks 和 unstable provider，问题是直接改写核心 context 边界。
- **复核状态**: 未复核。

## 维度 10：样式系统合规性

### [维度10-04] ContainerRenderer 作为 layout renderer 发出 hardcoded flex/gap/align visual classes

- **文件**: `packages/flux-renderers-basic/src/container.tsx:24-52`
- **证据片段**:
  ```tsx
  const useFlexChild =
    wrap || align !== undefined || gap.className || gap.style || direction !== 'row';
  return (
    <div
      className={cn('nop-container', props.meta.className)}
      data-testid={props.meta.testid || undefined}
      data-cid={props.meta.cid || undefined}
    >
      ...
      className={cn(
        'flex',
        resolveDirection(direction),
        wrap && 'flex-wrap',
        align === 'center' && 'items-center justify-center',
  ```
- **严重程度**: P2
- **现状**: container layout renderer 根据 semantic props 发出 `flex/flex-wrap/items-*/justify-*` 和 gap class/style。
- **风险**: layout renderer 形成第二套样式事实来源，和“layout renderers emit marker classes only; styling comes from schema”契约冲突。
- **建议**: 只输出 marker/data attributes；布局由 schema className/slot class 和 `stack-*`/`hstack-*` aliases 指定。若保留 semantic props，需要在 styling contract 中明确 exception。
- **误报排除**: 第 1 轮 09-01 指向 `flex.tsx`，本条是另一个 layout renderer `container.tsx`。
- **复核状态**: 未复核。

### [维度10-05] Word editor package renderer 直接依赖 `--nop-*` app/theme variables

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:80-103`
- **证据片段**:
  ```tsx
  const headerSlot = (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-[var(--nop-nav-surface)]">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
      ...
          <FileText className="w-5 h-5 text-[var(--nop-accent)]" />
          <h1 className="text-lg font-semibold text-[var(--nop-text-strong)]">
  ```
- **严重程度**: P3
- **现状**: package renderer 使用 `bg-[var(--nop-nav-surface)]`、`text-[var(--nop-accent)]`、`text-[var(--nop-text-strong)]` 等 app 层变量。
- **风险**: 可复用 renderer package 与 playground/app theme variable 名称耦合，在非 playground shell 下 theme compatibility 脆弱。
- **建议**: 改用共享 UI/token class，例如 `bg-background/text-foreground/text-muted-foreground`，或为 word editor 定义并文档化 package-local semantic tokens。
- **误报排除**: widget renderer 可以自带视觉样式；问题是直接依赖非共享 `--nop-*` 变量名。
- **复核状态**: 未复核。

## 维度 11：UI 组件使用合规性

### [维度11-02] SpreadsheetGrid 生产代码使用 raw input/table/button 绕过 UI primitives

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:316-330`, `455`, `547-554`
- **证据片段**:
  ```tsx
  <input
    type="text"
    className="ss-cell-edit-input"
  ```
  ```tsx
  <table key={activeSheetId}>
  ```
  ```tsx
  <button
    type="button"
    className="ss-row-header-button"
    aria-label={`Select row ${r + 1}`}
  ```
- **严重程度**: P3
- **现状**: spreadsheet production renderer 使用 raw `input/table/button`，而 `@nop-chaos/ui` 已提供 `Input/Table/Button`。
- **风险**: 共享 focus、disabled、density、token 和 a11y 约定无法统一；spreadsheet 表面与设计系统漂移。
- **建议**: 尽量替换为 UI primitives；若因 grid/virtualization/semantics 需要 raw DOM，应在 renderer contract 附近写明豁免。
- **误报排除**: 排除了 `packages/ui` 内部实现和测试文件；这里是生产 renderer package。
- **复核状态**: 未复核。

### [维度11-03] Word editor 字体工具栏使用 visible raw color inputs

- **文件**: `packages/word-editor-renderers/src/toolbar/font-controls.tsx:110-123`
- **证据片段**:
  ```tsx
  <input
    type="color"
    value={selection.color || '#000000'}
    onChange={(e) => bridge?.command?.executeColor(e.target.value)}
  />
  ...
  <input
    type="color"
    value={selection.highlight || '#ffff00'}
    onChange={(e) => bridge?.command?.executeHighlight(e.target.value)}
  />
  ```
- **严重程度**: P3
- **现状**: visible toolbar controls 使用 raw `input type="color"`，而同文件已使用 UI select/cn。
- **风险**: 颜色控件无法继承设计系统尺寸、focus ring、disabled 和 theme 约定。
- **建议**: 新增/导出 UI color input primitive，或确认 `Input` 支持 color type 后替换。
- **误报排除**: hidden file input 属于浏览器 file picker 特例，本条针对可见 toolbar controls。
- **复核状态**: 未复核。

## 维度 12：表单字段与 Slot 建模

### [维度12-04] array-field projected item form 未启用 array mutation delegation

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts:47-72`
- **证据片段**:
  ```ts
  export function createItemFormProxy(
    parentForm: FormRuntime,
    itemFullPrefix: string,
    prefixPath: string,
    itemKind: ArrayItemKind,
  ): FormRuntime {
    return createProjectedInlineForm({
      parentForm,
      ownerRootPath: itemFullPrefix,
      prefixPath,
      scalarValueAlias: itemKind === 'scalar' ? 'value' : undefined,
      projectValues(state) {
  ```
- **严重程度**: P2
- **现状**: array-field item 子树获得 projected form，但没有传 `supportsArrayMutations: true`；variant-field projected form 已显式 opt-in。
- **风险**: array item 内嵌 `array-editor/key-value/array-field` 等组件时，子组件通过 projected form 调用 `appendValue/removeValue` 可能不可用或跨 FormRuntime boundary 失败。
- **建议**: 在 `createItemFormProxy` 传入 `supportsArrayMutations: true`，并新增嵌套 array-field/array-editor 的回归测试。
- **误报排除**: 不是类型层面小问题；`FormRuntime` array mutation 是 runtime capability，variant-field-runtime 已显示 intended delegation pattern。
- **复核状态**: 未复核。

## 维度 13：类型安全与动态边界

### [维度13-02] table data pipeline 用 `Record<string, any>` 吞掉数据源边界类型

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-data.ts:9-16`, `28-35`, `60-62`
- **证据片段**:
  ```ts
  export function normalizeRowKey(
    record: Record<string, any>,
    rowKey?: string,
    fallbackIndex?: number,
  ): string {
  ```
  ```ts
  export function buildTableRowEntries(
    source: Array<Record<string, any>>,
    rowKey?: string,
  ): TableRowEntry[] {
  ```
  ```ts
  export function processTableData(
    source: Array<Record<string, any>>,
  ```
- **严重程度**: P3
- **现状**: 表格核心数据处理接受 `Record<string, any>`，之后直接读取字段用于 row key、排序、过滤和渲染。
- **风险**: schema/runtime 数据源边界无法阻止非 record row 或 unsafe member access，TypeScript 也无法提示错误使用。
- **建议**: 改为 `Record<string, unknown>[]`，在进入 table processing 前 validate/coerce 行数据，字段读取处显式 narrow。
- **误报排除**: 排除测试 any；该处是 production data renderer 的数据源入口。
- **复核状态**: 未复核。

## 维度 14：测试覆盖与质量

### [维度14-03] table select-all 缺少 filter/sort/pagination 交互覆盖

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:214-225`, `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:54-68`
- **证据片段**:
  ```tsx
  const processedData = useMemo(
    () =>
      processTableData(
        source,
        schemaProps.rowKey,
  ```
  ```ts
  const normalizedRows = useMemo(
    () => buildTableRowEntries(source, schemaProps.rowKey),
  ```
  ```ts
  const nextKeys = checked ? new Set(normalizedRows.map((row) => row.rowKey)) : new Set<string>();
  ```
- **严重程度**: P3
- **现状**: 渲染使用 filter/sort/pagination 后的 `processedData`，select-all 则基于原始 `source` 的 `normalizedRows`。现有测试只覆盖基础 rowKey/ownership，没有覆盖过滤/分页后的 select-all 语义。
- **风险**: “全选”可能选中被过滤掉或当前页不可见的行；如果这是 intended 全源选择，也缺少测试和文档锁定。
- **建议**: 新增 filter/pagination 下 select-all 的回归测试，然后明确选择基于 visible rows 还是 whole source。
- **误报排除**: 不是说行为一定错误；本条是测试覆盖缺口且当前代码存在两套数据视角。
- **复核状态**: 未复核。

## 维度 15：安全与性能红线

### [维度15-02] Formula docs 将 `$JSON` 记录为原生 JSON，掩盖 live sanitize 安全边界

- **文件**: `docs/architecture/flux-formula.md:342-365`, `packages/flux-formula/src/builtins.ts:41-64`
- **证据片段**:
  ```md
  | `$Math` | `Math`（原生对象） | `$Math.abs(-3)`、`$Math.round(1.5)`、`$Math.max(1, 2)` |
  | `$JSON` | `JSON`（原生对象） | `$JSON.stringify(obj)`、`$JSON.parse(str)` |
  ...
  registry.registerNamespace('$Math', Math);
  registry.registerNamespace('$JSON', JSON);
  ...
  `$Math` 和 `$JSON` 直接返回原生对象，零成本。
  ```
  ```ts
  const DANGEROUS_KEYS_SET = new Set(['__proto__', 'constructor', 'prototype']);
  function deepSanitize(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map(deepSanitize);
    const result: Record<string, unknown> = Object.create(null);
  ...
  registry.registerNamespace('$JSON', {
    parse(text: string) {
      return deepSanitize(JSON.parse(text));
  ```
- **严重程度**: P2
- **现状**: 文档声称 `$JSON` 直接返回原生 JSON 且零成本；live code 实际使用包装对象，`parse()` 会深度 sanitize 并移除危险 key。
- **风险**: 安全语义被文档误导，后续维护者可能为“对齐文档”移除 prototype pollution hardening。
- **建议**: 更新 formula docs，明确 `$JSON.parse()` 返回 sanitized value，移除 `__proto__/constructor/prototype`，不是原生 JSON 直通。
- **误报排除**: 当前代码不是漏洞；问题是安全边界文档低估 live hardening。
- **复核状态**: 未复核。

## 维度 16：文档-代码一致性

### [维度16-04] API adaptor 文档示例的 `${...}` 语法会被 live adaptor compiler 作为裸表达式处理

- **文件**: `docs/architecture/api-data-source.md:174-189`, `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts:15-23`, `112-121`
- **证据片段**:

  ```md
  - adaptor strings remain expression-surface inputs, not general statement blocks
  - `return <expression>;` is accepted today as compatibility sugar; runtime strips the leading `return` and trailing semicolon before compiling the adaptor expression
    ...
    "requestAdaptor": "${withRequestData(api.data, { timestamp: now() })}",
  "responseAdaptor": "${payload.data.items}"
  ```

  ```ts
  function normalizeAdaptorSource(source: string): string {
    const trimmed = source.trim();
    if (trimmed.startsWith('return ')) {
      return trimmed.slice(7).replace(/;\s*$/, '').trim();
    }
    return trimmed.replace(/;\s*$/, '').trim();
  }

  const compiled = getCachedAdaptorExpression<ApiSchema>(expressionCompiler, api.requestAdaptor);
  ```

- **严重程度**: P2
- **现状**: docs 示例写 `"${...}"`，runtime adaptor normalization 只剥 `return` 和末尾分号，不会剥模板表达式包装，随后直接传给 expression compiler。
- **风险**: 按文档复制 adaptor 示例可能解析失败或执行语义不符合预期，导致 request/response transform 无法工作。
- **建议**: 文档示例改为裸表达式或 `return <expression>;`；或 runtime 显式支持 `${...}` wrapper。
- **误报排除**: 不重复 `setValues`/report designer docs 漂移；这是 async-data adaptor authoring contract 的独立冲突。
- **复核状态**: 未复核。

## 维度 17：命名与术语一致性

### [维度17-08] navigate action 文档示例使用 `args.to`，live contract 只接受 `url/back`

- **文件**: `docs/discussions/2026-04-06-programming-model-optimality-critique.md:404-410`, `packages/flux-core/src/types/actions.ts:24-28`, `packages/flux-runtime/src/action-adapter.ts:271-279`
- **证据片段**:
  ```md
  "onSubmitSuccess": [{ "action": "navigate", "args": { "to": "/confirmation" } }],
  ```
  ```ts
  export interface NavigateActionArgs extends SchemaObject {
    url?: SchemaValue;
    replace?: SchemaValue;
    back?: SchemaValue;
  }
  ```
  ```ts
  if (args.back) {
    env.navigate(-1);
  } else if (typeof args.url === 'string') {
    env.navigate(args.url, args.replace ? { replace: true } : undefined);
  } else {
    return { ok: false, error: new Error('navigate action requires args.url or args.back') };
  }
  ```
- **严重程度**: P3
- **现状**: docs discussion 示例使用 `to`，但类型和 runtime 只识别 `url/back`。
- **风险**: 用户复制示例会得到 `navigate action requires args.url or args.back`，也增加 navigation payload 术语分裂。
- **建议**: 将示例改为 `args.url`，或明确该 discussion 非规范/历史草稿。
- **误报排除**: runtime 没有 `to` alias，非 deliberate compatibility。
- **复核状态**: 未复核。

## 维度 18：跨包模式一致性

### [维度18-02] Spreadsheet host manifest 漏列大量 core-supported commands

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:115-136`, `249-271`, `packages/spreadsheet-core/src/commands.ts:146-211`
- **证据片段**:
  ```ts
  const spreadsheetCapabilities: HostCapabilityContract = {
    namespace: 'spreadsheet',
    methods: {
      setActiveSheet: {
  ...
      beginTransaction: {
  ...
      undo: {
        description: 'Undo last spreadsheet operation.',
      },
      redo: {
        description: 'Redo last spreadsheet operation.',
      },
  ```
  ```ts
  export type SpreadsheetCommand =
    ...
    | CopyCellsCommand
    | CutCellsCommand
    | PasteCellsCommand
    | ClearCellsCommand
    | InsertRowCommand
    ...
    | AddCommentCommand
    | EditCommentCommand
    | DeleteCommentCommand
    | AutoFitRowCommand
    ...
    | FindCommand
    | FindNextCommand
    | ReplaceCommand
    | ReplaceAllCommand;
  ```
- **严重程度**: P2
- **现状**: spreadsheet renderer provider 能接受 `spreadsheet:${method}`，core command union 支持 copy/cut/paste、insert/delete row/column、sheet 操作、format/comment/find 等；manifest 只声明较小子集。
- **风险**: builder tooling、静态分析和跨包 host contract 低估实际 API，合法命令被工具视为 unsupported。
- **建议**: 从 command surface 生成或共享 `spreadsheetCapabilities.methods`；或显式声明 extended/untyped command passthrough，并加 manifest-vs-command contract test。
- **误报排除**: 不重复 flow designer `$designer` projection；本条是 spreadsheet manifest/core/provider 三方漂移。
- **复核状态**: 未复核。

### [维度18-03] Spreadsheet action provider 的 `listMethods()` 永远返回空数组

- **文件**: `packages/spreadsheet-renderers/src/host-action-provider.ts:30-45`
- **证据片段**:
  ```ts
  export function createSpreadsheetActionProvider(
    dispatch: (command: SpreadsheetCommand) => Promise<SpreadsheetCommandResult>,
  ): ActionNamespaceProvider {
    return {
      kind: 'host',
      listMethods() {
        return [];
      },
      async invoke(method, payload) {
        const args = isCommandRecord(payload) ? payload : {};
        const result = await dispatch({
          type: `spreadsheet:${method}`,
  ```
- **严重程度**: P2
- **现状**: provider 可以按任意 method 转发命令，但 introspection surface 返回空。
- **风险**: runtime/debugger/builder 如果依赖 namespace discovery，会认为 spreadsheet 没有可用动作。
- **建议**: 返回和 manifest/core command 共享的 method list。
- **误报排除**: 其他 host providers 有返回 concrete method list 的模式；空列表不是无害实现细节。
- **复核状态**: 未复核。

### [维度18-04] Report-designer action provider 同样隐藏所有 methods

- **文件**: `packages/report-designer-renderers/src/host-action-provider.ts:34-49`, `packages/report-designer-core/src/commands.ts:3-15`, `49-79`
- **证据片段**:
  ```ts
  export function createReportDesignerActionProvider(
    dispatch: (command: ReportDesignerCommand) => Promise<ReportDesignerCommandResult>,
  ): ActionNamespaceProvider {
    return {
      kind: 'host',
      listMethods() {
        return [];
      },
      async invoke(method, payload) {
        const args = isCommandRecord(payload) ? payload : {};
        try {
          const result = await dispatch({
            type: `report-designer:${method}`,
  ```
  ```ts
  export type ReportDesignerCommand =
    | DropFieldToTargetCommand
    ...
    | SaveCommand
    | ImportTemplateCommand
    | ExportTemplateCommand;
  ```
- **严重程度**: P2
- **现状**: report designer 有有限 command union 和 manifest，但 runtime namespace provider `listMethods()` 返回空。
- **风险**: 调试器、builder 和静态 contract 无法发现 report-designer commands，而字符串调用仍可执行，形成跨包 contract 不一致。
- **建议**: 提供共享 `REPORT_DESIGNER_METHODS`，provider 与 manifest/test 共用。
- **误报排除**: 独立于 spreadsheet namespace，影响 report-designer host package。
- **复核状态**: 未复核。

## 维度 19：错误传播保真度

### [维度19-02] Word editor save 将存储/bridge/序列化错误折叠为泛化失败

- **文件**: `packages/word-editor-core/src/document-io.ts:69-97`, `packages/word-editor-renderers/src/word-editor-action-provider.ts:40-49`
- **证据片段**:
  ```ts
  export function saveDocument(
    bridge: CanvasEditorBridge,
    extras?: { charts?: DocChart[]; codes?: DocCode[] },
  ): SavedDocumentData | null {
    try {
      const storage = getStorage();
      if (!storage) return null;
      ...
      storage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return saved;
    } catch {
      return null;
    }
  }
  ```
  ```ts
  const saved = saveDocument(input.bridge, { charts, codes });
  if (!saved) {
    return fail('Unable to save word document.');
  }
  ```
- **严重程度**: P2
- **现状**: `saveDocument()` catch 所有异常并返回 null；action provider 将 null 统一转成 `Unable to save word document.`。
- **风险**: quota exceeded、localStorage security exception、serialization failure、bridge data failure 与 no storage/empty document 无法区分，telemetry 和用户反馈丢失根因。
- **建议**: 返回 `{ ok, saved?, error?, reason? }` 或抛出带 cause 的错误；action provider 保留原始 message/reason。
- **误报排除**: 不重复 request-backed action retry；这是 word-editor-core 到 renderer action provider 的错误保真损失。
- **复核状态**: 未复核。

## 维度 20：可访问性 (WCAG)

### [维度20-08] Word editor icon-only toolbar buttons 只有 title，没有稳定 accessible name

- **文件**: `packages/word-editor-renderers/src/toolbar/shared.tsx:39-51`
- **证据片段**:
  ```tsx
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className={cn('flex-shrink-0', active && 'bg-accent text-accent-foreground')}
    >
      {Icon && <Icon className="w-4 h-4" />}
    </Button>
  ```
- **严重程度**: P2
- **现状**: `ToolbarButton` 在无 label 时只渲染 SVG icon 和 `title`，没有 `aria-label`。
- **风险**: undo/redo/bold/italic/insert 等 icon-only toolbar action 对 screen reader 可能无稳定名称。
- **建议**: icon-only 时设置 `aria-label={title}`，并将装饰 icon 标为 `aria-hidden`。
- **误报排除**: 第 1 轮 a11y findings 覆盖 field/table/chart/condition-builder；本条是 word editor toolbar 独立问题。
- **复核状态**: 未复核。

### [维度20-09] DingFlow add-node popover 缺 keyboard dismissal、focus management 和 menu semantics

- **文件**: `packages/flow-designer-renderers/src/dingflow/ding-flow-add-node-menu.tsx:26-52`, `packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx:121-128`
- **证据片段**:
  ```tsx
  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />
      <div
        className="fixed z-[101] flex gap-4 rounded-lg border border-border bg-popover px-5 py-3 shadow-lg"
        style={{ left: screenX - 100, top: screenY - 110 }}
      >
        {items.map((item) => (
          <Button
  ```
  ```tsx
  {
    popover && (
      <DingFlowAddNodeMenu
        screenX={popover.screenX}
        screenY={popover.screenY}
        items={menuItems}
        onSelect={handleSelect}
        onClose={handleClose}
      />
    );
  }
  ```
- **严重程度**: P2
- **现状**: popover 是 fixed content + mouse-only backdrop；没有 `role="menu"/menuitem`、Escape 关闭、初始 focus、焦点恢复或 focus trap。
- **风险**: 键盘用户打开 add-node chooser 后可能无法明确进入/退出该 transient menu，screen reader 也缺少菜单语义。
- **建议**: 使用 `Popover/DropdownMenu` from `@nop-chaos/ui`；或补齐 focus management、Escape close、`role="menu"`、命名 menu items 和 trigger focus restore。
- **误报排除**: 不重复 condition-builder a11y；该问题发生在 flow designer DingFlow overlay。
- **复核状态**: 未复核。

### [维度20-10] Spreadsheet grid virtualization 可能让 `aria-activedescendant` 指向未挂载 cell id

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:237-247`, `382-395`
- **证据片段**:

  ```tsx
  const visibleColIndices: number[] = [];
  for (let c = 0; c < frozenCols; c++) visibleColIndices.push(c);
  for (let c = visStartCol; c <= visEndCol; c++) visibleColIndices.push(c);

  const visibleRowIndices: number[] = [];
  for (let r = 0; r < frozenRows; r++) {
    if (!snapshot.activeSheet?.rows?.[String(r)]?.filteredOut) visibleRowIndices.push(r);
  }
  for (let r = visStartRow; r <= visEndRow; r++) {
  ```

  ```tsx
  <ContextMenuTrigger
    tabIndex={0}
    role="grid"
    aria-label="Spreadsheet grid"
    aria-activedescendant={
      selectedCellAddress ? `spreadsheet-cell-${selectedCellAddress}` : undefined
    }
  ```

- **严重程度**: P2
- **现状**: grid 只挂载 visible/frozen cells，但 container 总是将 selected cell address 写入 `aria-activedescendant`。
- **风险**: 若选中 cell 不在当前 virtualized viewport，active descendant ID 不存在，assistive tech 失去当前活动格引用。
- **建议**: 设置 `aria-activedescendant` 前确保 active cell 已挂载；或先 scroll into visible range；或只对 mounted cell 使用 active-descendant。
- **误报排除**: 不重复 table row semantics；这是 spreadsheet virtual grid 的 active descendant 完整性问题。
- **复核状态**: 未复核。

### [维度20-11] Word document preview back buttons 为 icon-only 且缺少 `aria-label`

- **文件**: `packages/word-editor-renderers/src/preview/doc-preview-page.tsx:61-71`, `87-98`
- **证据片段**:
  ```tsx
  <Button
    type="button"
    variant="outline"
    size="icon-sm"
    onClick={onBack}
    title={t('flux.wordEditor.back')}
  >
    <ArrowLeft className="w-4 h-4" />
  </Button>
  ```
  ```tsx
  <Button
    type="button"
    variant="outline"
    size="icon-sm"
    onClick={onBack}
    title={t('flux.wordEditor.back')}
  >
    <ArrowLeft className="w-4 h-4" />
  </Button>
  ```
- **严重程度**: P3
- **现状**: preview page 的两个 back button 仅有 icon 和 `title`，没有 `aria-label`。
- **风险**: assistive tech 对 title fallback 支持不一致，按钮名称可能不稳定。
- **建议**: 两处添加 `aria-label={t('flux.wordEditor.back')}`，并将 icon 标为装饰。
- **误报排除**: `WordEditorPage` back button 已有 label；本条专指 preview page。
- **复核状态**: 未复核。
