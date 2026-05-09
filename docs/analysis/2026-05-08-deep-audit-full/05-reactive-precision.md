# 05 Reactive Precision

- 深挖轮次: 1
- 深挖发现数: 5

## 第 1 轮初审

### [维度05-01] `useScopeSelector` 的 `paths` 订阅在底层被折叠成 root，无法达到声明的 deep-path 精度

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hook-subscriptions.ts:17-24`
- **行号范围**: 17-24
- **证据片段**:
  ```ts
  const normalized = Array.from(
    new Set(
      paths
        .map((path) => path.trim())
        .filter((path) => path.length > 0)
        .map((path) => path.replace(/\[(\d+)\]/g, '.$1'))
        .map((path) => path.split('.').filter(Boolean)[0] ?? '*'),
    ),
  ).sort();
  ```
- **严重程度**: P2
- **订阅位置**: `useScopeSelector(..., { paths })` → `createScopeSubscribe(scope, paths)` → `createRootDependencySet(paths)`。
- **订阅范围**: 调用方传入 `user.profile.email` / `crud.pagination.currentPage` 这类 deep path 后，实际只订阅 root `user` / `crud`。
- **实际需要**: 保留调用方传入的完整 path，让 `scopeChangeHitsDependencies()` 已支持的 ancestor/descendant overlap 逻辑真正生效。
- **重渲染频率**: 同一 root 下任意 sibling 更新都会唤醒订阅者；例如 `user.settings` 更新会唤醒只读 `user.profile.email` 的控件。
- **建议**: 不要在 `flux-react` 的 `createRootDependencySet` 中截断到第一段；复用 `flux-runtime/src/scope-change.ts` 的 path normalization 语义，或改名明确表示这是 root-level subscription。
- **为什么值得现在做**: 计划 223 已补上 `paths` API 与多个调用点，当前残留会让新 API 看似精确但实际仍是 root 粒度，容易误导后续修复。
- **误报排除**: 这不是重报 “`useScopeSelector` 完全没有 path 参数” 的旧问题；live code 已有 `paths` 参数，本发现针对参数进入底层后被截断导致 deep-path 精度丢失。
- **历史模式对应**: FieldFrame / form field 曾因 broad subscription 导致大表单局部输入唤醒无关字段；这是同类“选择器表面收窄但订阅层仍过宽”模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Selective data access”。
- **复核状态**: 未复核

### [维度05-02] `useBoundFieldValue` 的非 form fallback 仍按全 scope 订阅单字段值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-handlers.tsx:48-57`
- **行号范围**: 48-57
- **证据片段**:
  ```tsx
  const formValue = useCurrentFormState(
    currentForm ? (state) => (name ? getIn(state.values, name) : state.values) : () => UNUSED_VALUE,
    eq,
    { enabled: Boolean(currentForm), path: name || undefined },
  );
  const scopeValue = useScopeSelector(
    (scopeData) => (name ? getIn(scopeData, name) : scopeData),
    eq,
    { enabled: !currentForm, fallback: UNUSED_VALUE },
  );
  ```
- **严重程度**: P2
- **订阅位置**: `useBoundFieldValue()` 中的 `scopeValue = useScopeSelector(...)`。
- **订阅范围**: 非 form 场景下只读取 `name` 对应路径，但未传 `{ paths: [name] }`，因此订阅当前 lexical visible scope 的所有变更。
- **实际需要**: 当 `!currentForm && name` 时只订阅该字段路径；当 `name` 为空且确实读取整 scope 时才保留 broad subscription。
- **重渲染频率**: 非 form 字段同处一个 scope 时，任何 sibling path 更新都会唤醒所有字段 binding，再由 equalityFn 过滤结果。
- **建议**: 将 options 改为 `{ enabled: !currentForm, fallback: UNUSED_VALUE, paths: !currentForm && name ? [name] : undefined }`，并补 focused test 验证 sibling path 不唤醒。
- **为什么值得现在做**: 这是基础字段控制器路径，影响 `input-*` 等大量普通字段；修复点小且与已落地的 223 path-aware hook API 对齐。
- **误报排除**: 不是重报计划 223 中“hook 没有 path-aware 能力”的旧问题；live hook 已支持 `paths`，但该核心调用点仍未使用，属于当前 live residual。
- **历史模式对应**: “FieldFrame 订阅 form.values” 类历史模式：字段实际只依赖单路径，却订阅 owner 全量状态。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` lines 44-55。
- **复核状态**: 未复核

### [维度05-03] `useTableVisibleColumns` 的 column settings 两个 scope selector 未传 path，表格任意 scope 写入会唤醒列配置计算

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\use-table-visible-columns.ts:37-46`
- **行号范围**: 37-46
- **证据片段**:
  ```tsx
  const scopeVisibleColumns = useScopeSelector(
    (scopeData) =>
      toggledStatePath ? toStringArray(getIn(scopeData, toggledStatePath)) : undefined,
    areStringArraysEqual,
  );
  const scopeOrderedColumns = useScopeSelector(
    (scopeData) =>
      orderedStatePath ? toStringArray(getIn(scopeData, orderedStatePath)) : undefined,
    areStringArraysEqual,
  );
  ```
- **严重程度**: P2
- **订阅位置**: `useTableVisibleColumns()` 的 `scopeVisibleColumns` 与 `scopeOrderedColumns`。
- **订阅范围**: 只读取 `columnSettings.toggledColumnsStatePath` / `orderedColumnsStatePath`，但订阅整个 render scope。
- **实际需要**: 分别订阅 `toggledStatePath` 与 `orderedStatePath`；无 path 时禁用或保持 fallback。
- **重渲染频率**: 表格所在 scope 中分页、排序、筛选、查询参数或外部 host projection 更新时，列可见性/排序计算都会被唤醒。
- **建议**: 与 `useTablePagination`、`useTableSort`、`useTableFilter`、`useTableSelection` 对齐，分别传 `{ paths: toggledStatePath ? [toggledStatePath] : undefined }` 与 `{ paths: orderedStatePath ? [orderedStatePath] : undefined }`。
- **为什么值得现在做**: 同目录其他 table hooks 已经使用 path options，此处是明显漏网点；修复局部且能减少大表格交互时的无关重算。
- **误报排除**: 不是重报计划 223 已收口的 CRUD/Table sort/filter/controlled owner 问题；本发现限定在 live column-settings selector，且相邻 table hooks 已显示当前预期模式。
- **历史模式对应**: data renderers 多个 scope-owned 状态拆成 selector 后仍需要 path 精度，否则每个交互轴互相唤醒。
- **参考文档**: `docs/architecture/performance-design-requirements.md` “Subscription granularity over broad invalidation”；`docs/architecture/renderer-runtime.md` “Selective data access”。
- **复核状态**: 未复核

### [维度05-04] `useOwnedAxisValue` 注释声称只订阅具体 path，但实现未把 `statePath` 传给 `useScopeSelector`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\interaction-owner.ts:18-25`
- **行号范围**: 18-25
- **证据片段**:
  ```tsx
  // Only subscribe to the specific path when ownership is 'scope' and statePath is defined.
  // Otherwise return UNUSED to skip subscription entirely.
  const scopeValue = useScopeSelector(
    ownership === 'scope' && statePath
      ? (scopeData) => getIn(scopeData, statePath) as TValue | undefined
      : () => UNUSED as unknown as TValue | undefined,
    Object.is,
  );
  ```
- **严重程度**: P2
- **订阅位置**: `useOwnedAxisValue()`；当前用于 `tabs` 的 `valueOwnership="scope"` / `valueStatePath`。
- **订阅范围**: 注释期望订阅具体 `statePath`，实际缺少第三参 options，仍订阅整个 scope。
- **实际需要**: 当 `ownership === 'scope' && statePath` 时仅订阅 `[statePath]`；非 scope ownership 时禁用订阅或使用 fallback。
- **重渲染频率**: tabs 所在 scope 任意 path 更新都会唤醒 active tab value selector；低频页面尚可接受，但在 host projection 或表单 scope 内会随 sibling 字段更新重复触发。
- **建议**: 传入 `{ enabled: ownership === 'scope' && Boolean(statePath), fallback: UNUSED as unknown as TValue | undefined, paths: statePath ? [statePath] : undefined }`。
- **为什么值得现在做**: 代码注释与实现已经不一致，后续维护者会误以为该 hook 已经是 path 精确订阅；修复成本低。
- **误报排除**: 不是“看起来可优化”的泛泛建议；注释明确宣称 specific path subscription，但 live implementation 没有传 path。
- **历史模式对应**: “契约已宣称收窄但实现仍 broad”的 reopened audit 高频残留。
- **参考文档**: `docs/architecture/renderer-runtime.md` lines 44-55；`docs/architecture/performance-design-requirements.md` lines 23-32。
- **复核状态**: 未复核

### [维度05-05] 复合字段的 non-form scope 读取仍缺少 path options，修复了 form path 后 fallback 路径仍会 broad wake-up

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:107-113`
- **行号范围**: 107-113
- **证据片段**:
  ```tsx
  const formValue = useCurrentFormState(
    (state) => (name ? getIn(state.values, name) : state.values),
    Object.is,
    { path: name || undefined },
  );
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  const rawValue = parentForm ? formValue : scopeValue;
  ```
- **严重程度**: P2
- **订阅位置**: `ObjectFieldRenderer` 的 `scopeValue`；同类模式也出现在 composite `array-field` 与 `variant-field` 的 non-form fallback。
- **订阅范围**: 有 `name` 时只读取该复合字段值，但 non-form fallback 订阅整个 visible scope。
- **实际需要**: 有 `name` 时订阅 `[name]`；没有 `name` 且确实读取整 scope 时才允许 broad subscription。
- **重渲染频率**: 大型详情/复合字段嵌在页面 scope 或 host projection scope 中时，任意 sibling path 更新都会唤醒复合字段，进而触发子项派生与适配逻辑。
- **建议**: 为 `useScopeSelector` 增加 `{ paths: name ? [name] : undefined }`，并对 `array-field`、`variant-field` 做同类收敛；若 `parentForm` 存在，可用 `enabled: !parentForm` 避免建立无效 scope subscription。
- **为什么值得现在做**: 223 已处理 `object-field` stale owner-state 类问题，但这个 live residual 是订阅精度而非 stale transform；同一文件继续保留 broad fallback 会削弱大表单/复合字段性能收益。
- **误报排除**: 不重报 `object-field` stale `transformOut` 或 `array-field` 双状态；本发现只针对当前 selector options 缺失，证据为 live `useScopeSelector` 未传第三参。
- **历史模式对应**: 复杂字段在 form store 路径已收窄，但非 form scope fallback 被遗漏，属于“主路径修复后旁路仍 broad”的历史模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Form And Table Expectations” 与 “Selective data access”。
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度05-06] `useScopeSelector` 对 inline `paths` 数组按引用依赖，已收窄调用点仍会每次 render 重建 subscription

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks.ts:101-107`；示例调用点 `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer-state.ts:220-249`
- **行号范围**: 101-107；220-249
- **证据片段**:
  ```ts
  const paths = options?.paths;
  const subscribe = useMemo(
    () => (enabled ? createScopeSubscribe(scope, paths) : () => emptyUnsubscribe),
    [enabled, paths, scope],
  );
  ```
  ```ts
  const queryState = useScopeSelector(
    // ...
    { paths: [ownerStatePath, queryStatePath] },
  );
  const paginationState = useScopeSelector(
    // ...
    { paths: [ownerStatePath, paginationStatePath] },
  );
  ```
- **严重程度**: P2
- **订阅位置**: `useScopeSelector(..., { paths: [...] })` 的常规 inline-array 调用路径。
- **订阅范围**: 语义上已指定窄路径，但 `paths` 数组本身每次 render 都是新引用，导致 `subscribe` 函数每次 render 重新创建。
- **实际需要**: hook 层应按路径内容稳定化 dependency key，或调用点必须 memoize paths，避免把“path-aware selector”变成“每 render 订阅函数 churn”。
- **重渲染频率**: CRUD/Table 这类交互 renderer 在分页、排序、筛选、选择变化时本来就会频繁 render；每次 render 都会让 path-aware subscription 失去引用稳定性收益。
- **建议**: 在 `useScopeSelector` 内部将 `paths` normalize 成稳定 key / stable array，再传给 `createScopeSubscribe`；不要要求所有调用点手写 `useMemo(() => [path], [path])`。
- **为什么值得现在做**: 计划 223 已推动大量调用点传入 `paths`，如果 hook API 对常见 inline 写法不稳定，会持续制造隐性 resubscribe churn。
- **误报排除**: 这不是重报 `[维度05-01]` 的 deep path 被截断；即使底层保留完整 path，只要 `paths` 引用每 render 变化，订阅函数仍会 churn。
- **历史模式对应**: “表面收窄但底层仍宽/不稳”的 reactive precision 残留。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Selective data access”。
- **复核状态**: 未复核

### [维度05-07] `CodeEditor` 字段绑定的 scope fallback 读取单路径但订阅整个 scope，且在 form 内仍建立无效 scope subscription

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer\use-code-editor-binding.ts:18-27`
- **行号范围**: 18-27
- **证据片段**:
  ```ts
  const formValue = useCurrentFormState(
    (state) => (hasName ? getIn(state.values, name) : undefined),
    Object.is,
    { enabled: hasName, path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (data) => (hasName ? getIn(data, name) : undefined),
    Object.is,
    { enabled: hasName, fallback: undefined },
  );
  ```
- **严重程度**: P2
- **订阅位置**: `useCodeEditorBinding()` 的 `scopeValue = useScopeSelector(...)`。
- **订阅范围**: 只读取 `name` 对应路径，但未传 `{ paths: [name] }`；并且 `enabled: hasName` 没有排除 `currentForm` 存在的场景。
- **实际需要**: 非 form 场景订阅 `[name]`；form 场景只保留 `useCurrentFormState`，scope fallback 应禁用。
- **重渲染频率**: 代码编辑器通常是重 widget；同 scope 内任意 sibling 更新都会唤醒编辑器 selector，form 内还会建立实际不会被使用的 scope 订阅。
- **建议**: 改为 `{ enabled: Boolean(!currentForm && hasName), fallback: undefined, paths: hasName ? [name] : undefined }`。
- **为什么值得现在做**: `CodeEditor` 是高成本控件，scope fallback 的无关 wake-up 比普通 input 更容易放大为可感知卡顿。
- **误报排除**: 不重报 `[维度05-02] useBoundFieldValue`；该代码编辑器使用独立 binding hook，没有走 `useBoundFieldValue()`。
- **历史模式对应**: 字段实际只依赖单路径，却订阅 owner scope 全量状态。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Selective data access”。
- **复核状态**: 未复核

### [维度05-08] `DetailView` / `DetailField` 的 scope 投影值缺少 path options，详情弹层入口会被 sibling scope 更新唤醒

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:60-69`；`C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:58-67`
- **行号范围**: 60-69；58-67
- **证据片段**:
  ```tsx
  const scopeProjectedValue = useScopeSelector(
    (data) => (scopePath ? (data as Record<string, unknown>)[scopePath] : undefined),
    Object.is,
  );
  ```
  ```tsx
  const scopeValue = useScopeSelector(
    (data) => (hasName ? getIn(data as Record<string, unknown>, name) : undefined),
    Object.is,
    { enabled: hasName, fallback: undefined },
  );
  ```
- **严重程度**: P2
- **订阅位置**: `DetailViewRenderer` 的 `scopeProjectedValue`；`DetailFieldRenderer` 的 `scopeValue`。
- **订阅范围**: 实际只读取 `scopePath` / `name`，但订阅整个 visible scope；`DetailField` 还在 parent form 存在时继续启用 scope fallback。
- **实际需要**: 非 form fallback 场景只订阅目标路径；form 场景禁用 scope selector。
- **重渲染频率**: 详情字段常位于复杂表单/详情页中，任意 sibling 字段或 host projection 更新都会唤醒详情入口和 draft 初始化相关派生。
- **建议**: 传入 `{ enabled: Boolean(!parentForm && scopePath), fallback: undefined, paths: scopePath ? [scopePath] : undefined }` / `{ enabled: Boolean(!parentForm && hasName), paths: [name] }`。
- **为什么值得现在做**: detail-view/detail-field 是 advanced form 的复合交互入口，修复局部且与现有 form path-aware hook保持一致。
- **误报排除**: 不重报 `[维度05-05]` 的 composite object/array/variant fallback；这里是 detail-view/detail-field 独立路径。
- **历史模式对应**: “主 form path 收窄后，non-form fallback 旁路仍 broad”的残留模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Form And Table Expectations”。
- **复核状态**: 未复核

### [维度05-09] `ArrayEditor` / `KeyValue` 的 non-form scope 外部值订阅未传 paths，列表型字段会被无关 scope 写入唤醒并重新派生数组

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:197-215`；`C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:240-263`
- **行号范围**: 197-215；240-263
- **证据片段**:
  ```tsx
  const scopeExternalValue = useScopeSelector(
    (scopeData) =>
      currentForm || !hasName ? undefined : toArrayEditorItems(getIn(scopeData, name)),
    // ...
    { enabled: Boolean(!currentForm && hasName), fallback: undefined },
  );
  ```
  ```tsx
  const scopeExternalValue = useScopeSelector(
    (scopeData) => (currentForm || !hasName ? undefined : toKeyValuePairs(getIn(scopeData, name))),
    // ...
    { enabled: Boolean(!currentForm && hasName), fallback: undefined },
  );
  ```
- **严重程度**: P2
- **订阅位置**: `ArrayEditorRenderer` / `KeyValueRenderer` 的 `scopeExternalValue`。
- **订阅范围**: 非 form 场景只读取 `name` 对应值，但订阅当前 visible scope 全量变化。
- **实际需要**: 当 `!currentForm && hasName` 时订阅 `[name]`。
- **重渲染频率**: 列表型字段每次 selector 唤醒都会执行 `toArrayEditorItems` / `toKeyValuePairs`，并进入数组 equality 逐项比较；大型页面中 sibling 更新会制造额外派生成本。
- **建议**: options 增加 `paths: hasName ? [name] : undefined`，并补回归测试验证 sibling path 更新不唤醒该 selector。
- **为什么值得现在做**: 这两个控件是 advanced form 中较重的动态列表控件，path 收窄收益高于普通标量字段。
- **误报排除**: 不是重复 `[维度05-05]` 的 composite-field object/array/variant；这里是 standalone advanced field renderer。
- **历史模式对应**: 复杂字段 non-form fallback 被遗漏，导致 sibling path broad wake-up。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Selective data access”。
- **复核状态**: 未复核

### [维度05-10] `PageRenderer` 只读取 `refreshTick` 却订阅整页 scope，页面任意数据更新都会重算并尝试发布 status summary

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\page.tsx:18-33`
- **行号范围**: 18-33
- **证据片段**:
  ```tsx
  const refreshTick = useScopeSelector((scopeData) =>
    Number((scopeData as Record<string, unknown>)?.refreshTick ?? 0),
  );
  const summary = useMemo<PageStatusSummary>(
    () => ({
      refreshTick,
    }),
    [refreshTick],
  );
  ```
- **严重程度**: P2
- **订阅位置**: `PageRenderer` 的 `refreshTick = useScopeSelector(...)`。
- **订阅范围**: 只读取 root-level `refreshTick`，但订阅页面 scope 的所有变更。
- **实际需要**: 订阅 `['refreshTick']`；如果没有 statusPath 或 refresh contract，可考虑禁用该 selector。
- **重渲染频率**: page 是根布局节点，页面内任意数据写入、host projection 替换或表单外 scope 更新都可能唤醒 page renderer。
- **建议**: 改为 `useScopeSelector(..., Object.is, { paths: ['refreshTick'] })`，并确认 `useStatusPathPublication` 不因无关 page render 重复工作。
- **为什么值得现在做**: page 是高层节点，broad subscription 会把低层局部更新向上冒泡为根级重渲染。
- **误报排除**: 不是泛泛要求 memo；证据是单 root key 读取却未声明 path subscription。
- **历史模式对应**: “组件实际只读一个路径，但订阅 owner scope 全量”的典型 reactive precision 问题。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Selective data access”。
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度05-11] `FieldFrame` 动态 required 依赖 paths 每次 render 新建，导致 per-path form subscription 反复重建

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\field-frame.tsx:116-132`；`C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks\use-form-hooks.ts:193-201`
- **行号范围**: 116-132；193-201
- **证据片段**:
  ```tsx
  const dynamicRequiredDependencyPaths = name
    ? getDynamicRequiredDependencyPaths(validationField)
    : EMPTY_DYNAMIC_REQUIRED_PATHS;
  const hasDynamicRequiredRule = dynamicRequiredDependencyPaths.length > 0;
  const dynamicRequired = useCurrentFormState(
    // ...
    {
      enabled: hasDynamicRequiredRule && Boolean(name),
      paths: dynamicRequiredDependencyPaths,
    },
  );
  ```
  ```ts
  const paths = options?.paths;
  const store = form?.store;
  const subscribe = useMemo(
    () => createFormStoreSubscribe(store, { enabled, path, paths }),
    [enabled, path, paths, store],
  );
  ```
- **严重程度**: P2
- **订阅位置**: `FieldFrame` 的 `useCurrentFormState(..., { paths: dynamicRequiredDependencyPaths })` 和 non-form `useCurrentValidationValues(..., { paths: dynamicRequiredDependencyPaths })`。
- **订阅范围**: 语义上只订阅 requiredWhen/requiredUnless 依赖路径，但 `getDynamicRequiredDependencyPaths()` 每次 render 返回新数组，`useCurrentFormState` 又按 `paths` 引用做 `useMemo` 依赖。
- **实际需要**: 对 dependency paths 做内容级稳定化，或在 `FieldFrame` 用 `useMemo` 缓存；更理想是在 `useCurrentFormState` / `useCurrentValidationValues` 内部按路径内容生成稳定 key。
- **重渲染频率**: 含动态 required 规则的字段在自身 focus、error、submitting、父级 renderer 更新时都会重新 render；每次都可能重建 `subscribe`，造成 per-path API 已收窄但订阅身份 churn。
- **现状**: form 侧已支持 `subscribeToPaths`，但 hot field shell 对 `paths` 的引用稳定性没有保护。
- **风险**: 大表单中大量动态 required 字段会在常规交互期间反复 unsubscribe/subscribe，抵消 P7 per-path subscription 的收益，并增加提交/验证高峰期的 listener 管理成本。
- **建议**: 将 `dynamicRequiredDependencyPaths` 包装为稳定 memo，依赖 `validationField`；同时考虑在 `useCurrentFormState` 内部 normalize `paths` 为稳定 key，避免所有调用点重复手写 memo。
- **为什么值得现在做**: 这是 `FieldFrame` 基础字段外壳路径，动态 required 是表单常见规则；修复局部且能防止刚落地的 per-path 订阅能力在真实字段树中被引用不稳定削弱。
- **误报排除**: 这不是重复 `[维度05-06] useScopeSelector inline paths`；本发现发生在 form hooks (`useCurrentFormState` / `useCurrentValidationValues`) 且触发源是 `getDynamicRequiredDependencyPaths()` 每次返回新数组。
- **历史模式对应**: “表面订阅已收窄，但 hook dependency identity 不稳定导致 subscription churn”的 reactive precision 残留模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Selective data access”。
- **复核状态**: 未复核

### [维度05-12] 字段错误 selector 额外订阅全局 submitting，`FieldFrame` 每个字段的 aggregate error 会被提交状态无关唤醒

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hook-subscriptions.ts:77-87`；`C:\can\nop\nop-chaos-flux\packages\flux-react\src\field-frame.tsx:104-111`
- **行号范围**: 77-87；104-111
- **证据片段**:

  ```ts
  if (path && typeof store.subscribeToPath === 'function') {
    const unsubPath = store.subscribeToPath(path, listener);
    const unsubSubmitting =
      typeof store.subscribeToSubmitting === 'function'
        ? store.subscribeToSubmitting(listener)
        : () => undefined;
    return () => {
      unsubPath();
      unsubSubmitting();
    };
  }
  ```

  ```tsx
  const rawFieldState = useCurrentFormFieldState(name ?? '', {
    path: name ?? '',
    ownerPath: name ?? '',
  });
  const fieldState = name ? rawFieldState : EMPTY_FORM_FIELD_STATE;

  const aggregateError = useAggregateError(name ?? '', { enabled: Boolean(name) });
  ```

- **严重程度**: P2
- **订阅位置**: `useAggregateError()` → `useCurrentFormError()` → `createFormErrorSubscribe()`；每个 `FieldFrame` 都会调用。
- **订阅范围**: 错误 selector 实际只读取当前 path 的 errors，但订阅了 `subscribeToPath(path)` 之外的全局 `subscribeToSubmitting()`。
- **实际需要**: error-only hook 只订阅 path errors；提交状态应由 `useCurrentFormFieldState()` 的 field presentation/state selector 负责，或提供显式选项区分 “error value” 与 “error visibility”。
- **重渲染频率**: 每次 submit/submitting/submitAttempted 切换都会唤醒所有字段的 aggregate-error selector；selector 最终大概率返回同一个 error，但 wake-up 和 selector 计算已经发生。
- **现状**: `FieldFrame` 同时调用 `useCurrentFormFieldState()` 和 `useAggregateError()`；前者已经包含 submitting/submitAttempted，后者再额外订阅 submitting 属于重复全局 wake-up。
- **风险**: 1,000 字段表单提交时，本应只由 presentation state 处理的全局提交状态会额外唤醒 1,000 个 error selector，形成不必要的 O(n) listener wake-up。
- **建议**: 将 `createFormErrorSubscribe()` 的 submitting 订阅拆出；只有确实计算 error visibility 的 hook 才订阅 submitting，`useCurrentFormError` / `useAggregateError` 默认保持 path-only。
- **为什么值得现在做**: 这是基础 `FieldFrame` 热路径，且修复能直接减少提交/验证峰值 wake-up；不会改变 error 数据语义。
- **误报排除**: 这不是 P7 允许的 form-level submit banner 订阅；证据显示订阅发生在每个字段的 path error hook 上，且 `FieldFrame` 已通过 `useCurrentFormFieldState` 单独读取 submitting。
- **历史模式对应**: FieldFrame 曾因订阅 form.values 造成大表单广播；本问题是同类“字段级 hook 被全局状态唤醒”的 residual。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P7；`docs/architecture/renderer-runtime.md` “Selective data access”。
- **复核状态**: 未复核

### [维度05-13] `useHostScope` 的 projection 更新只发布 root changed paths，host 深路径订阅会退化为 root 粒度

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\workbench\hooks.ts:84-86`；`C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\scope.ts:441-467`
- **行号范围**: 84-86；441-467
- **证据片段**:

  ```ts
  useLayoutEffect(() => {
    scope.replace?.(scopeData);
  }, [scope, scopeData]);
  ```

  ```ts
  for (const key of Object.keys(next)) {
    if (
      !Object.prototype.hasOwnProperty.call(current, key) ||
      !Object.is(current[key], next[key])
    ) {
      changedPaths.add(key);
    }
  }

  ownStore.setSnapshot(next, {
    paths: Array.from(changedPaths).sort(),
    sourceScopeId: input.id,
    kind: 'replace',
  });
  ```

- **严重程度**: P2
- **订阅位置**: `useHostScope(scopeData, ...)` 创建的 host projection scope；下游 `NodeRenderer` / `useScopeSelector(..., { paths })` 依赖 `ScopeChange.paths` 判断是否重算。
- **订阅范围**: host projection 替换时只按 root key 比较并发布 `document` / `workbook` / `activeSheet` / `runtime` 等 root path；深路径如 `activeSheet.cells.A1.value` 无法获得精确 change path。
- **实际需要**: 对 host projection scope 的 `replace` 支持深路径 diff，或允许 host bridge 传入 changed-path payload；至少对 spreadsheet/word/report 这类大 projection 提供增量更新入口。
- **重渲染频率**: spreadsheet/word/report 这类 host scope 中，某个 document/workbook root 内任意子节点变化都会唤醒同 root 下所有深路径依赖；例如一个 cell 变化会让其他 `activeSheet.*` 依赖 conservative invalidation。
- **现状**: consumer 侧即使传入 deep paths，producer 侧也只发 root changed paths；这独立于 `[维度05-01]` 的 consumer-side path 截断。
- **风险**: 大型 host surface 的局部编辑会退化为 root 级 invalidation，导致动态表达式、NodeRenderer resolved props/meta、host-scope selector 在同 root 下被无关唤醒。
- **建议**: 为 host projection store 增加深路径变化收集，复用 form store 的 path diff 思路；或让 domain core snapshot 暴露 changed paths，由 `useHostScope` 传给 scope store。
- **为什么值得现在做**: host projection 是 spreadsheet、word editor、designer 等高交互域的共享入口；这里的 producer-side 粗粒度会限制后续所有 selector/path API 的实际收益。
- **误报排除**: 不是重复 `[维度05-01] useScopeSelector paths 被截断`；即使 consumer 保留完整 deep path，本处 `replace()` 仍只发布 root changed paths，属于 change producer 精度缺失。
- **历史模式对应**: “per-path subscription API 已存在，但上游 change payload 没有携带足够路径信息”的 reactive precision 盲区。
- **参考文档**: `docs/architecture/performance-design-requirements.md` lines 28-33；`docs/architecture/renderer-runtime.md` lines 44-55。
- **复核状态**: 未复核
