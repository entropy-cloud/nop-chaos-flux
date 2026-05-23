# Round 2-5 Raw Findings: Dimensions 03-06

> 状态：原始追加深挖发现。以下条目尚未经过最终独立复核；不得直接作为最终结论使用。

## 维度 03：API 表面积与契约一致性

### [维度03-03] `reactComponent` 便捷注册路径只在初始化数组归一化，传入 `SchemaRendererProps.registry` 后续注册会绕过公开契约

- **文件**: `packages/flux-react/src/schema-renderer.tsx:122-145`
- **证据片段**:

  ```ts
  export function createSchemaRenderer(registryDefinitions: RendererDefinition[] = []) {
    const registry = createRendererRegistry(registryDefinitions.map(ensureRendererComponent));

    return function SchemaRenderer(props: SchemaRendererProps) {
      ...
      const runtime = useMemo(() => {
        const resolvedRegistry = props.registry ?? registry;
        ...
        return createRendererRuntime({
          registry: resolvedRegistry,
  ```

- **严重程度**: P2
- **现状**: React 层公开支持 `reactComponent` 便捷字段，但只在 `createSchemaRenderer([...])` 和 `createDefaultRegistry([...])` 的初始 definitions 上调用 `ensureRendererComponent`。宿主若通过 `SchemaRendererProps.registry` 传入 registry，或创建 registry 后再 `registry.register({ type, reactComponent })`，定义会绕过归一化并进入 core registry。
- **风险**: 同一个 `RendererDefinition` 形状在不同接线路径下行为不一致：初始化数组可用，外部 registry / 后续注册会因缺少 `component` 失败。这会误导第三方 renderer 集成和 host tooling。
- **建议**: 提供 React-owned registry wrapper，使 `registry.register` 也归一化 `reactComponent`；或明确 `SchemaRendererProps.registry` 必须是 core-normalized registry，并提供 `createReactRendererRegistry/registerReactRendererDefinitions` 公开入口。
- **误报排除**: 不是要求 `reactComponent` 回流 core，而是 React 层公开 seam 自身不一致。
- **复核状态**: 未复核。

### [维度03-04] `FormErrorQuery` 已进入公开 hook 契约和 core 导出，但 public runtime type docs 未定义其 shape

- **文件**: `packages/flux-core/src/types/runtime.ts:44-49`
- **证据片段**:
  ```ts
  export interface FormErrorQuery {
    path?: string;
    ownerPath?: string;
    sourceKinds?: Array<NonNullable<ValidationError['sourceKind']>>;
    rule?: ValidationRule['kind'];
  }
  ```
- **严重程度**: P2
- **现状**: `FormErrorQuery` 是 `@nop-chaos/flux-core` root surface 导出的公开类型，并被 `useCurrentFormErrors/useCurrentFormError/useCurrentFormFieldState` 等公开 hook 使用；`docs/architecture/renderer-runtime.md` 也直接在 hook 签名中引用该类型。但 `docs/references/form-validation-runtime-types.md` 未列出字段含义。
- **风险**: 使用者只能从源码推断 `path / ownerPath / sourceKinds / rule` 的筛选语义，容易误用为普通 field path 查询或忽略 owner/source-kind 过滤。
- **建议**: 在 `docs/references/form-validation-runtime-types.md` 补充 `FormErrorQuery` shape，并说明各字段过滤的是 `ValidationError.path / ownerPath / sourceKind / rule`。
- **误报排除**: 不重复 03-02；03-02 是 `subscribeToModelGeneration` 文档缺口，本条是另一个 public query contract。
- **复核状态**: 未复核。

### [维度03-05] `@nop-chaos/flux-renderers-form/test-support` 已声明为公开子路径，但 build 不会产出对应文件

- **文件**:
  - `packages/flux-renderers-form/package.json:19-22`
  - `packages/flux-renderers-form/tsconfig.build.json:12-20`
  - `packages/flux-renderers-form/src/test-support.tsx:1-23`
- **证据片段**:
  ```json
  "./test-support": {
    "types": "./dist/test-support.d.ts",
    "default": "./dist/test-support.js"
  }
  ```
  ```json
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/test-support*",
    "src/**/*-test-support*"
  ]
  ```
- **严重程度**: P1
- **现状**: `package.json` 已公开 `./test-support`，但 `tsconfig.build.json` 排除了 `src/test-support.tsx`，因此不会生成 `dist/test-support.js` / `dist/test-support.d.ts`。该源码还依赖 `@testing-library/react`，但该依赖未在 package manifest 中作为运行依赖声明。
- **风险**: workspace 源码 alias 下测试可用，但 built package 的公开 API 子路径不可用。`exports`、build output、依赖声明三者不一致，属于 public surface contract 断裂。
- **建议**: 若该子路径是正式测试辅助 API，从 build exclude 中移除并声明依赖；若不应公开，删除 package exports 与 workspace alias/paths，改为内部测试工具包或包内相对导入。
- **误报排除**: 不是未导出文件问题，而是已经声明 public exports 但构建产物缺失。
- **复核状态**: 未复核。

### [维度03-06] 多个已导出的 CSS public subpath 未同步到 workspace dev alias/paths

- **文件**:
  - `packages/flux-code-editor/package.json:16-18`
  - `packages/flux-renderers-form/package.json:16-18`
  - `packages/report-designer-renderers/package.json:16-18`
  - `packages/word-editor-renderers/package.json:16`
  - `packages/flow-designer-renderers/package.json:20-22`
  - `vite.workspace-alias.ts:25-100`
  - `tsconfig.base.json:19-54`
- **证据片段**:
  ```json
  "./form-renderers.css": {
    "default": "./dist/form-renderers.css"
  }
  ```
  ```ts
  export const workspaceAliases = {
    '@nop-chaos/flux-react/default-spacing.css': ...,
    '@nop-chaos/theme-tokens/styles.css': ...,
    '@nop-chaos/ui/styles.css': ...,
  };
  ```
- **严重程度**: P2
- **现状**: package exports 声明了多个 CSS 子路径，例如 `@nop-chaos/flux-code-editor/code-editor-styles.css`、`@nop-chaos/flux-renderers-form/form-renderers.css`、`@nop-chaos/report-designer-renderers/report-field-panel.css`、`@nop-chaos/word-editor-renderers/styles.css`、`@nop-chaos/flow-designer-renderers/designer-theme.css`，但 `vite.workspace-alias.ts` / `tsconfig.base.json` 只同步了部分 CSS 子路径。
- **风险**: dist/package exports 视角下这些 CSS 子路径是公开 API，但 workspace dev/test 解析面没有同等支持。源码或 demo 若按公开 API 导入这些 CSS，可能被 root alias 错误匹配或解析失败。
- **建议**: 为所有公开 CSS subpath 补齐 `vite.workspace-alias.ts` 和 `tsconfig.base.json` paths，或删除不应作为 public API 的 CSS exports。
- **误报排除**: 不是普通 CSS 是否导入问题，而是 public exports 与 workspace dev alias contract 漂移。
- **复核状态**: 未复核。

### [维度03-07] `@nop-chaos/flux-i18n` 的公开 locale 子路径缺少 workspace 开发期 alias/path 契约

- **文件**:
  - `packages/flux-i18n/package.json`
  - `tsconfig.base.json`
  - `vite.workspace-alias.ts`
- **证据片段**:
  ```json
  "./locales/zh-CN": {
    "types": "./dist/locales/zh-CN.d.ts",
    "default": "./dist/locales/zh-CN.js"
  },
  "./locales/en-US": {
    "types": "./dist/locales/en-US.d.ts",
    "default": "./dist/locales/en-US.js"
  }
  ```
  ```json
  "@nop-chaos/flux-i18n": ["./packages/flux-i18n/src/index.ts"]
  ```
- **严重程度**: P2
- **现状**: `flux-i18n` 公开 `./locales/zh-CN` 与 `./locales/en-US`，但 workspace 开发期解析只配置了 root alias，没有对应 locale 子路径。
- **风险**: 开发/测试环境中若 dogfood 这些 public subpaths，会绕过源码 alias，依赖 `dist/locales/*.d.ts/js` 是否存在和新鲜。
- **建议**: 为 `@nop-chaos/flux-i18n/locales/zh-CN`、`@nop-chaos/flux-i18n/locales/en-US` 补齐 tsconfig paths 与 Vite aliases。
- **误报排除**: 这些是 package exports 承认的 public API，不是内部 locale 文件。
- **复核状态**: 未复核。

## 维度 04：状态所有权与单一事实来源

### [维度04-03] Tree mode 的 `TreeDocument` 同时由 React state 与 DesignerCore history 维护

- **文件**:
  - `packages/flow-designer-renderers/src/designer-tree-mode.tsx:21-29`
  - `packages/flow-designer-renderers/src/designer-command-adapter.ts:62-68`
  - `packages/flow-designer-core/src/core.ts:129-136`
  - `packages/flow-designer-core/src/core.ts:397-412`
- **证据片段**:

  ```ts
  const inputTreeDocument = readDesignerResolvedProp<TreeDocument>(props, 'treeDocument');
  const [treeDocument, setTreeDocument] = useState<TreeDocument | undefined>(inputTreeDocument);

  useEffect(() => {
    setTreeDocument(inputTreeDocument);
  }, [inputTreeDocument]);
  ```

  ```ts
  function pushHistory() {
    historyState = pushHistoryEntry(
      historyState,
      doc,
      docRevision,
      maxHistorySize,
      treeOwner?.getTreeDocument(),
    );
  }
  ```

- **严重程度**: P1
- **现状**: tree mode owner truth `TreeDocument` 存在两份可写状态：renderer React state 与 `DesignerCore` history entry。`replaceDocumentWithHistory(nextDoc, treeDocument)` 收到显式 treeDocument 后，后续 `pushHistory()` 仍通过 React state callback 读取当前 tree，可能读到旧值。
- **风险**: tree command 修改 owner tree 后，history entry 可能保存“新 GraphDocument + 旧 TreeDocument”的错配快照；undo/redo 会破坏 `TreeDocument 是 owner truth` 的设计基线。
- **建议**: 让 `DesignerCore` 在 tree mode 内部接收并同步记录当前 `TreeDocument`，或让 `pushHistory()` 直接使用显式参数，避免通过 React state callback 读取异步外部镜像。
- **误报排除**: 不是已驳回 report/spreadsheet bridge；这里存在明确双写 owner state，且 history 写入路径读取异步 React state 镜像。
- **复核状态**: 未复核。

### [维度04-04] `variant-field` 默认 parent-owned projected editor 却无条件注册 child validation contract

- **文件**:
  - `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:408-446`
  - `packages/flux-renderers-form-advanced/src/variant-field/variant-field-runtime.ts:19-35`
- **证据片段**:

  ```ts
  React.useEffect(() => {
    const owner = parentForm ?? parentValidationOwner;
    const childOwner = parentForm ? variantForm : variantValidationOwner;

    if (!owner || !childOwner || !name) {
      return;
    }
  ```

  ```ts
  owner.registerChildContract({
    childOwnerId,
    mode: 'recurse-submit',
    active: true,
  ```

- **严重程度**: P2
- **现状**: 架构文档规定 `variant-field` 默认是 parent-owned projected polymorphic editor，但 live code 即使只是 projected `variantForm` / `variantValidationOwner`，也无条件向 parent owner 注册 `recurse-submit` child contract。
- **风险**: parent submit/validation 会同时把同一字段当作 parent-owned path 与 child contract 处理，owner 事实来源不清晰，可能导致重复验证、错误 gating 或 submit 行为漂移。
- **建议**: 仅在 compiler/runtime 明确判定为 `create-owner` 时注册 child contract；默认 `inherit-owner` 路径只使用 projected scope/form/validation view。
- **误报排除**: 注册的是影响 submit orchestration 的 live child contract，不是 UI transient state。
- **复核状态**: 未复核。

## 维度 05：响应式订阅精度

### [维度05-05] `useScopeSelector` 的 `paths` 选项按引用参与订阅 memo，内联数组会导致每次渲染重建 subscribe

- **文件**: `packages/flux-react/src/hooks.ts:96-107`
- **订阅位置**: `useScopeSelector(..., options?.paths)`
- **证据片段**:
  ```ts
  export function useScopeSelector<T, S = Record<string, unknown>>(
    selector: (scopeData: S) => T,
    equalityFn: (a: T, b: T) => boolean = Object.is,
    options?: { enabled?: boolean; fallback?: T; paths?: readonly string[] },
  ): T {
    const scope = useRenderScope();
    const enabled = options?.enabled !== false;
    const paths = options?.paths;
    const subscribe = useMemo(
      () => (enabled ? createScopeSubscribe(scope, paths) : () => emptyUnsubscribe),
      [enabled, paths, scope],
    );
  ```
- **严重程度**: P3
- **现状**: `paths` 内容相同但数组引用每次 render 都变时，`subscribe` 会被重建，`useSyncExternalStoreWithSelector` 需要退订/重订。调用点存在内联 `{ paths: [ownerStatePath, queryStatePath] }`。
- **风险**: CRUD/table 等热路径组件正常重渲染时会产生额外订阅 churn。
- **建议**: hook 内部将 `paths` 规范化为稳定 key 或提供单值 `path` 选项；调用方可临时 useMemo 包装。
- **误报排除**: equalityFn 能避免选中值不变时重渲染，但不能消除 subscribe 函数引用变化导致的订阅重建成本。
- **复核状态**: 未复核。

### [维度05-06] deep-path dependency matcher 会把同 root sibling 当命中，深路径订阅退化为祖先级唤醒

- **文件**:
  - `packages/flux-runtime/src/scope-change.ts`
  - `packages/flux-runtime/src/__tests__/scope-ownership-edge-cases.test.ts`
- **证据片段**:
  ```ts
  const prefixes = getPathPrefixes(changePath);
  for (const prefix of prefixes) {
    if (dependencyIndex.descendantsByPrefix.has(prefix)) {
      return true;
    }
  }
  ```
- **严重程度**: P2
- **现状**: `scopeChangeHitsDependencies()` 对 deep path 做 prefix 匹配时，会把依赖 `user.email` 和变更 `user.name` 判定为命中。测试中还固化了 sibling paths match 的行为。
- **风险**: 即使调用方声明精确 deep path，订阅过滤仍按共同祖先过度唤醒。影响 `useScopeSelector` path-aware 订阅、data source dependsOn、reaction dependsOn。
- **建议**: overlap 规则改为“完全相等、change 是 dependency 祖先、dependency 是 change 祖先”才命中；`user.name` vs `user.email` 应返回 false。
- **误报排除**: 不是 `useScopeSelector paths` 引用不稳定；这里是 matcher 语义把 sibling path 误判为 overlap。
- **复核状态**: 未复核。

### [维度05-07] `useTableVisibleColumns` 的 scope 订阅缺少 `paths` 过滤

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts:37-46`
- **证据片段**:
  ```ts
  const scopeVisibleColumns = useScopeSelector(
    (scopeData) => toStringArray(getIn(scopeData, toggledStatePath)),
    shallowEqualStringArray,
  );
  const scopeOrderedColumns = useScopeSelector(
    (scopeData) => toStringArray(getIn(scopeData, orderedStatePath)),
    shallowEqualStringArray,
  );
  ```
- **严重程度**: P3
- **现状**: selector 只读取 `toggledStatePath` 和 `orderedStatePath`，但 `useScopeSelector` 未传 `{ paths: [...] }`。
- **风险**: 启用 columnSettings 且配置 scope path 时，任意 scope change 都会唤醒 selector；复杂表格场景产生额外 selector 计算。
- **建议**: 传入 `{ paths: [toggledStatePath, orderedStatePath].filter(Boolean) }`，与 `useCrudVisibleColumnNames` 的 pattern 对齐。
- **误报排除**: 不重复 table event/CRUD query 等问题；这是 column visibility hook 的订阅精度漏配。
- **复核状态**: 未复核。

### [维度05-08] tabs scope ownership 缺 paths，非 tabs 状态变更会误唤醒

- **文件**: `packages/flux-renderers-basic/src/interaction-owner.ts:20-25`
- **证据片段**:
  ```ts
  const scopedValue = useScopeSelector(
    (scopeData) => (statePath ? getIn(scopeData, statePath) : undefined),
    Object.is,
  );
  ```
- **严重程度**: P3
- **现状**: 注释说明只订阅 specific path，但实际没有传 `{ paths: statePath ? [statePath] : undefined }`。
- **风险**: tabs `valueOwnership: 'scope'` 且配置 `valueStatePath` 时，只读取一个 scope path，却订阅整个 scope。
- **建议**: 给 `useScopeSelector` 添加 paths 选项。
- **误报排除**: 不是 field fallback/table columns/surface broad subscribe；这是 basic tabs 共享 ownership hook 漏传 paths。
- **复核状态**: 未复核。

## 维度 06：异步模式与取消安全

### [维度06-05] SourceObserver 的 `allSettled().then(...)` 链尾无 `.catch()`

- **文件**: `packages/flux-runtime/src/async-data/source-observer.ts:74-83`
- **证据片段**:
  ```ts
  void Promise.allSettled(
    input.entries.map(async (entry) => {
      const result = await runtime.executeSource({
        source: entry.source,
        scope: input.scope,
        ctx: { signal: controller.signal },
      });
      return [entry, result] as const;
    }),
  ).then((settled) => {
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉 / fire-and-forget Promise 链尾缺失错误处理
- **现状**: `Promise.allSettled(...)` resolve 后 `.then` 回调内仍可能抛错，但链路是 `void ... .then(...)` 且无 `.catch()`。
- **风险**: source UI 可能停留在 loading 或旧值状态；宿主只能看到 unhandled rejection，无法通过 runtime monitor 定位。
- **建议**: 链尾追加 `.catch(...)`，对非 abort 错误上报并写入 transient error state；或改成内部 async 函数统一 try/catch。
- **误报排除**: 问题发生在 `allSettled` resolve 后的 `.then` 同步处理阶段，不是“allSettled 已处理 rejection”的误报。
- **复核状态**: 未复核。

### [维度06-06] WordEditor save provider 未在 host onSave 返回后检查 AbortSignal

- **文件**: `packages/word-editor-renderers/src/word-editor-action-provider.ts:51-59`
- **证据片段**:
  ```ts
  if (input.saveEvent) {
    const result = await input.saveEvent(undefined, ctx);
    if (!result.ok) {
      return result;
    }
  }
  input.editorStore.setDirty(false);
  input.onDocumentSaved?.(saved);
  return ok({ saved: true });
  ```
- **严重程度**: P2
- **问题类别**: 取消安全 / stale settlement
- **现状**: `onSave` 执行期间若组件卸载或下一次保存触发 abort，`saveEvent` 正常返回 ok 后 provider 不检查 `ctx.signal.aborted`，继续清 dirty 并发布 saved document。
- **风险**: 已取消或已卸载的保存仍可能把旧 document 标记为已保存，dirty 状态被清除。
- **建议**: 在 `await input.saveEvent(...)` 后、写入 store 前检查 `ctx.signal.aborted`，返回 cancelled result。
- **误报排除**: UI 层 mounted guard 无法阻止 provider 内部已发生的 `editorStore.setDirty(false)` 和 `onDocumentSaved(saved)`。
- **复核状态**: 未复核。

### [维度06-07] CRUD 查询按钮丢弃异步提交 Promise，失败无反馈

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:409`; `packages/flux-renderers-data/src/crud-renderer-ownership.ts:189-204`
- **证据片段**:
  ```tsx
  <Button onClick={() => void handleQuerySubmit()}>{queryLabel}</Button>
  ```
  ```ts
  const valid = await queryForm.validate();
  const values = await queryForm.getValues();
  ```
- **严重程度**: P3
- **问题类别**: 异步失败无反馈 / Promise rejection 未捕获
- **现状**: `handleQuerySubmit` 内部 await query form validate/getValues capability，但调用处 `void handleQuerySubmit()` 没有 catch。
- **风险**: 表单校验运行时异常或 capability reject 时，用户点击搜索后无 UI 反馈，并可能产生 unhandled rejection。
- **建议**: 调用处 `.catch()` 并通过 `env.notify` 或表单错误状态反馈。
- **误报排除**: 不重复 create dialog feedback；这是 CRUD query form capability 路径。
- **复核状态**: 未复核。

### [维度06-08] Spreadsheet 单元格编辑保存先清草稿，再 await dispatch

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:31-43`; `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:321-324`
- **证据片段**:
  ```ts
  const currentEditCell = editingCellRef.current;
  const currentEditValue = editValueRef.current;
  editingCellRef.current = null;
  editValueRef.current = '';
  setEditingCell(null);
  await bridge.dispatch({
    type: 'spreadsheet:setCellValue',
  ```
- **严重程度**: P2
- **问题类别**: 异步失败 / 数据丢失反馈缺失
- **现状**: `handleEditSave` 先清空 editing refs 和退出编辑态，然后才 await `bridge.dispatch(setCellValue)`。`SpreadsheetGrid` 的 blur/Enter 直接调用 `onEditSave`，签名是 `() => void`，无错误反馈路径。
- **风险**: 保存失败/取消时编辑态和草稿已被清掉，用户会误以为保存成功。
- **建议**: dispatch 成功后再退出编辑，失败保留草稿并显示错误；或保留 last draft 供恢复。
- **误报排除**: 不重复 spreadsheet dispatch ok:false 观察性；这里是编辑草稿生命周期和保存失败顺序。
- **复核状态**: 未复核。

### [维度06-09] Spreadsheet 全局快捷键调用 async handlers 没有 await/catch

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-keyboard.ts:21-52`
- **证据片段**:
  ```ts
  if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
    event.preventDefault();
    handleCopy();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
    event.preventDefault();
    handlePaste();
  }
  ```
- **严重程度**: P3
- **问题类别**: 异步失败无反馈
- **现状**: 快捷键调用 `handleCopy/handleCut/handlePaste/handleUndo/handleRedo/handleStyleTool/handleClear` 时没有 await / catch，这些 handler 是 async 且会调用 `bridge.dispatch`。
- **风险**: dispatch reject 时快捷键操作无日志/Toast/状态反馈，并可能产生 unhandled rejection。
- **建议**: 包装为 `void handler().catch(reportSpreadsheetCommandError)`。
- **误报排除**: 鼠标路径的部分日志不能覆盖键盘路径。
- **复核状态**: 未复核。

### [维度06-10] Report Field Panel 键盘插入异步失败未捕获、无反馈

- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.tsx:62-97`, `148-150`
- **证据片段**:
  ```tsx
  async function handleKeyboardInsert(source, field) {
    const resolved = resolveHostActionProvider(...);
    await resolved.provider.invoke(...);
  }
  ```
  ```tsx
  onClick={() => void handleKeyboardInsert(source, field)}
  ```
- **严重程度**: P3
- **问题类别**: 异步失败无反馈
- **现状**: `handleKeyboardInsert` await provider.invoke，但点击处 `void handleKeyboardInsert(...)` 无 `.catch()`。
- **风险**: 字段插入动作失败会形成 unhandled rejection，用户看不到失败提示。
- **建议**: 调用处补 `.catch()`，通过 `env.notify` 或 runtime host issue 上报错误。
- **复核状态**: 未复核。

### [维度06-11] Flow Designer toolbar back 外部动作失败未捕获、无反馈

- **文件**: `packages/flow-designer-renderers/src/designer-toolbar.tsx:125-136`, `210-212`
- **证据片段**:
  ```ts
  async function invokeAction(action: string) {
    const resolved = resolveActionProvider(action);
    return await resolved.provider.invoke(...);
  }
  ```
  ```tsx
  onClick={() => void invokeAction('designer:navigate-back')}
  ```
- **严重程度**: P3
- **现状**: `designer:navigate-back` 等宿主动作失败时没有 catch，也不会提示用户。
- **风险**: 导航失败静默且可能产生 unhandled rejection。
- **建议**: 对 `invokeAction` 调用补 catch，并复用 `notifyCommandFailure` / `env.notify`。
- **复核状态**: 未复核。

### [维度06-12] object-field 非表单提交后的异步重校验 rejection 会漏出

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:70-78`, `277-282`, `306-311`
- **证据片段**:
  ```ts
  async function applyNonFormObjectFieldCommit(...) {
    await revalidateProjectedOwner(...);
  }
  ```
  ```tsx
  void applyNonFormObjectFieldCommit(...);
  ```
- **严重程度**: P3
- **现状**: `applyNonFormObjectFieldCommit` 会 await `parentValidationOwner.validateSubtree`，调用处用 `void` 且没有 catch。
- **风险**: 非 form 场景下 validateSubtree 拒绝会产生 unhandled rejection，UI 也不会展示提交/校验失败。
- **建议**: await 或 `.catch()`，将错误写入字段错误状态或通知。
- **复核状态**: 未复核。

### [维度06-13] object-field transformOut 异步结果无卸载取消保护，可能过期写回

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:263-295`
- **证据片段**:
  ```ts
  const result = await runTransformOut(...);
  if (parentForm) {
    await parentForm.setValue(name, result.value);
  } else {
    parentScope.update(name, result.value);
  }
  ```
- **严重程度**: P2
- **现状**: transformOut Promise resolve 后直接写回 parent form/scope，没有 cleanup、AbortController 或 mounted guard。
- **风险**: 组件卸载、字段切换或父作用域变化后，旧 transformOut 仍可能把过期值写回父表单/作用域。
- **建议**: 为 transformOut 增加 sequence/mounted guard，卸载或依赖变化时 invalidate。
- **复核状态**: 未复核。

### [维度06-14] detail-view/detail-field 打开编辑面板失败仅 console.warn

- **文件**:
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:206-234`, `427-429`
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:128-160`, `274-276`
- **证据片段**:
  ```tsx
  onClick={() => {
    handleOpen().catch((error) => {
      console.warn('[detail-view] open failed', error);
    });
  }}
  ```
- **严重程度**: P3
- **现状**: `handleOpen` 会 await `runTransformIn`，点击 catch 仅 `console.warn`。
- **风险**: transformIn/load 初始化失败时，弹层不打开且用户无可见提示。
- **建议**: 设置可见错误状态或调用 `env.notify`。
- **复核状态**: 未复核。

### [维度06-15] ReportSpreadsheetCanvas 字段拖拽落格异步失败未捕获/无反馈

- **文件**:
  - `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:147-165`
  - `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-field-drop.ts:7-15`
- **证据片段**:
  ```ts
  function handleFieldDrop(cb: (targetCell: SpreadsheetCellRef) => void) {
    if (!dropTargetCell) return;
    cb(dropTargetCell);
    setDropTargetCell(null);
  }
  ```
- **严重程度**: P3
- **现状**: `handleFieldDropOnCell` 是 async，会 await spreadsheet/report designer dispatch，但 `useFieldDrop` callback 类型是 sync 且内部直接调用，无 await/catch。
- **风险**: dispatch reject 会形成 unhandled rejection；dropTargetCell 清空，用户看到拖拽结束但字段可能未写入。
- **建议**: 让 `useFieldDrop` 支持 Promise 回调并捕获错误，或调用处包装 `.catch()`。
- **复核状态**: 未复核。

### [维度06-16] CodeEditor SQL 执行缺少取消/竞态保护，旧请求可覆盖新结果

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:161-192`
- **证据片段**:
  ```ts
  setSqlResult({ status: 'loading' });
  const result = await props.helpers.dispatch(action, ...);
  setSqlResult({ status: 'success', data: result.data });
  ```
- **严重程度**: P2
- **现状**: 连续点击 SQL Run 时没有 request id、AbortSignal、mounted guard；旧请求后返回会覆盖新结果。
- **风险**: 结果显示过期；组件卸载后异步返回仍可能 setState；无法取消正在执行的 SQL action。
- **建议**: 增加 requestIdRef 或 AbortController，只允许最新请求提交结果，cleanup 时 abort/ignore。
- **复核状态**: 未复核。

### [维度06-17] WordEditor 图片插入 FileReader 异步失败无反馈

- **文件**: `packages/word-editor-renderers/src/toolbar/insert-controls.tsx:42-55`
- **证据片段**:
  ```ts
  const reader = new FileReader();
  reader.onload = () => {
    bridge?.command?.executeImage(String(reader.result));
  };
  reader.readAsDataURL(file);
  ```
- **严重程度**: P3
- **现状**: FileReader 只绑定 `onload`，没有 `onerror/onabort`；`executeImage` 也无错误处理。
- **风险**: 文件读取失败、被中止或编辑器命令执行失败时用户无反馈。
- **建议**: 增加 `onerror/onabort` 和 try/catch，通过 toolbar error、toast 或上层日志反馈。
- **复核状态**: 未复核。
