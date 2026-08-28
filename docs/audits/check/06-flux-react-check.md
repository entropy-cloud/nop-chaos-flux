# 06 flux-react 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-react/src/` 55 个源文件 / 8139 行（排除 `*.test.*` 与 `__tests__`）；渲染管线与 hooks 全文精读，其余文件 grep 扫描 + 抽读。为核实 hooks 真实行为，交叉精读了 flux-runtime 的 `scope.ts`、`scope-change.ts`、`form-store.ts`、`source-observer.ts`、`component-handle-registry.ts`、`form-runtime.ts`（只读，未修改任何 packages 文件）。
- 结论概览：P0 x1 / P1 x3 / P2 x6 / P3 x8。总评：flux-react 渲染管线纪律良好（渲染期 store 写已按 bug-15a 模式全部移入 layout effect、StrictMode 清理普遍采用 queueMicrotask+owner 校验、无 as any/@ts-ignore），但存在一条跨包 setState-in-render 缺陷链（已知线索归因成立，责任在 form 包渲染期创建 form runtime + runtime 构造期同步发布）、一个公开 hook 的注册生命周期错误、env 身份漂移导致全树重编译重挂载的正确性问题，以及成体系的"渲染期 useMemo 创建 runtime 资源"StrictMode 孤儿。

## P0 缺陷

### F-01 setState-in-render 警告链归因：`Cannot update a component (NodeRendererResolved) while rendering a different component (FormRenderer)`

- 位置（触发侧）：`packages/flux-renderers-form/src/renderers/form.tsx:65-90`（FormRenderer 在 render-phase `useMemo` 中调用 `runtime.createFormRuntime`）
- 位置（写入侧）：`packages/flux-runtime/src/form-runtime.ts:642`（`setupExternalPublication()` 在构造函数尾部同步执行）→ `:257-279`（`publish()` 同步 `parentScope.update(valuesPath, values)` / `publishOwnerStatus(parentScope, statusPath, summary)`）
- 本包位置（受害者）：`packages/flux-react/src/node-renderer-resolved.tsx:99-131`（`useSyncExternalStoreWithSelector` 订阅 scope store，`getSnapshot = store.getLastChange()`）

输入 → 路径 → 错误结果推理链：

1. 输入：声明了 `statusPath` / `valuesPath` 的 `form` 节点（复现用例：`packages/flux-renderers-form/src/__tests__/form-submit-actions.values.test.tsx`「reroutes dynamic publication paths」——`valuesPath: 'forms.${activeId}.values'`，点击按钮改 `activeId`）。
2. `setValue` 写 scope（事件处理器，合法）→ 页面 scope 订阅者（各 `NodeRendererResolved`）重渲染 → form 节点的 `NodeRendererResolved` 重渲染 → 其子组件 `FormRenderer` 开始渲染。
3. `FormRenderer` 渲染期 `props.props.valuesPath` 解析出新字符串 `'forms.b.values'` → `ownedForm` useMemo 依赖变化 → **渲染期**执行 `runtime.createFormRuntime({ parentScope, statusPath, valuesPath, initialValues })`。
4. `createManagedFormRuntime` 构造尾部同步执行 `setupExternalPublication()`，其 `publish()` 立即 `parentScope.update('forms.b.values', values)` → 页面 scope store `setSnapshot` → zustand **同步**通知全部订阅者。
5. 其他（或本链祖先）`NodeRendererResolved` 实例的 `useSyncExternalStore` 订阅回调在 `FormRenderer` 渲染期间被同步触发 → React 检测到"渲染 A 组件时更新 B 组件"→ 输出警告。测试断言最终通过（写入本身生效），但该反模式在并发渲染下可能丢失/重排该次更新。

归因裁定：

- **直接责任不在 flux-react**：本包渲染路径（node-renderer / render-nodes / schema-renderer / renderer-helpers）经逐行核对无渲染期 store 写；fragment scope 的 `setSnapshot` 已在 `useLayoutEffect`（render-nodes.tsx:327-370，bug-15a 修复形态）；`useNodeSourceProps` 的 source 执行全部在 effect。
- 责任分布：`flux-renderers-form/form.tsx`（渲染期 useMemo 创建 form runtime，是同步发布的触发点）+ `flux-runtime/form-runtime.ts`（构造函数内同步向 parentScope 发布）。`renderer-runtime.md:59` 基线允许"renderer-owned form runtimes created during render"（配合延迟 dispose），但 runtime 构造期同步发布使该基线不安全——基线未要求"首次发布延迟到 commit 后"。
- 修复方向（三选一，优先 a）：(a) `createManagedFormRuntime` 将首次 `publish()` 延迟到首个 microtask/订阅周期（runtime 侧，一处修复全局生效）；(b) form.tsx 改为 commit-safe 创建（首渲染 preparing/null 态，对齐 renderer-runtime.md:98 基线）；(c) flux-react 提供 `useOwnedRuntime` 类 commit-safe 创建 hook 供 owner renderer 使用。修好后应在 form 包补一条回归测试（监听 console 警告为零）。

## P1 隐患

### F-02 `useContainerDomRegistration` 注册在首次重渲染后被静默注销

- 位置：`packages/flux-react/src/container-hooks.ts:42-77`
- 摘录（effect 无依赖数组 + ref 守卫提前返回）：
  ```ts
  useLayoutEffect(() => {
    ...
    if (registeredRef.current.containerId === containerId && ... ) {
      return;                       // 未返回任何 cleanup，也不重新注册
    }
    registeredRef.current = { containerId, componentRegistry, element };
    return componentRegistry.register({ id: containerId, type: 'container', ... });
  });                               // ← 无 deps，每次 commit 都重跑
  ```
- 推理链：`componentRegistry.register()` 返回注销函数（`component-handle-registry.ts:361-367` 已核实）。无依赖 effect 的语义是"每次 commit 前先调用上一次返回的 cleanup"。第 1 次 commit：注册，cleanup₁=注销；第 2 次 commit：React 先调 cleanup₁ → **句柄被注销**，随后 effect 重跑但 ref 守卫命中 → 提前返回（既不重注册也无 cleanup）。此后容器永远处于未注册态，`resolveContainerElement(containerId, registry)` 返回 null，dialog/drawer 定向容器失效。对比同包正确范式：`hooks/use-input-component-handle.ts:65-70` 用 `useEffect(..., [componentRegistry, handle, cid])` + 始终返回 register 的注销函数。
- 影响：公开导出的稳定 API（index.tsx:95），仓库内暂无消费者（grep 仅见 barrel 导出），故未在现有页面爆发；任何 host/renderer 一旦使用，宿主组件第一次重渲染即触发。
- 修复方向：守卫命中分支也返回"注销该次注册"的 cleanup，或改为有依赖数组 + `element` 变化时先注销旧句柄再注册；并补一条"重渲染后容器仍可 resolve"的回归测试。

### F-03 `compiledRoot` useMemo 依赖 `props.env` 且编译器无缓存 → env 身份漂移引发全树重编译 + 重挂载丢状态

- 位置：`packages/flux-react/src/schema-renderer.tsx:55-87`（deps 含 `props.env`）；`packages/flux-compiler/src/schema-compiler.ts:218-224`（`compile` 无任何按 schema 身份的缓存，每次编译产出新 `templateNodeId`）；`render-nodes.tsx:511`（单根 `key={compiled.templateNodeId}`）。
- 条件 + 后果：host 每次渲染传入新字面量 `env={{...}}`（React 常见写法），或 env 包装对象身份变化 → `compiledRoot` 每次重算 → 整棵 schema 重编译（新 templateNodeId、新 cid 计数）→ 根节点 key 变化 → React 全树 unmount/remount → 表单值、输入焦点等所有本地状态丢失 + 全量编译开销。
- 契约冲突（D2）：`renderer-runtime.md:1239-1245` 明确"SchemaRenderer keeps runtime/page instances stable across non-structural env identity churn ... without dropping form/page state""memoization is now an optimization, not a correctness requirement"——当前实现里 env 身份恰是 correctness 依赖。runtime/page 实例确实稳定了，但编译产物没有。
- 修复方向：memo 内改读 `envRef.current`（第 132-133 行渲染期已同步该 ref），仅当 `env.importLoader`/`env.resolveImportUrl` 函数身份真正变化时才重编译；或给 schemaCompiler 增加 (schema 身份, 相关 env 字段) 的编译缓存。

### F-04 渲染期 `useMemo` 创建 runtime 属主资源：StrictMode 双渲染 / 并发丢弃渲染产生永不释放的孤儿

- 位置（本包内全部点位）：
  - `schema-renderer.tsx:142-201, 281-291` — `createRendererRuntime`、`createPageRuntime`、`createSurfaceRuntime`、root `createActionScope`、`createComponentHandleRegistry`；
  - `node-renderer.tsx:77-83, 188-200` — import-owned `createActionScope`、import bindings 的 `runtime.createChildScope`；
  - `use-node-scopes.ts:42-56` — node-owned action scope / component registry；
  - `workbench/hooks.ts:56-65` — host projection scope（useState 初始化器内）。
- 推理链：`createChildScope` 会向 `ownedScopeDisposers` 注册处置闭包、`createActionScope` 进入 `ownedActionScopes`（`runtime-factory.ts:128-135, 170-179, 360-376` 已核实），这些登记在 runtime `dispose()` 前不释放。上述创建全部发生在**渲染期** useMemo/初始化器中：StrictMode 双渲染（dev）会丢弃一次工厂执行结果；并发模式下被高优先级更新打断的渲染同样会丢弃。被丢弃实例的 scope id / action scope 已登记进 runtime 集合，但对应组件从未 commit，effect 清理（queueMicrotask 延迟 dispose 只追踪 commit 后的实例）不会触及它们 → 孤儿累积到 runtime 销毁。`useMountedCid`（node-renderer.tsx:34-36）与 `normalizeNodeInput` 编译计数同理（无害但同属渲染期不纯）。
- 契约冲突（D2/D3）：`renderer-runtime.md:98` 基线"Runtime-owned React boundaries must allocate owner resources only after commit ... pre-commit passes may temporarily render a preparing/null state"。当前实现是"渲染期创建 + 延迟销毁"，只覆盖了基线的后半句。
- 影响：dev StrictMode 下长时间会话内存缓慢增长（每个带 importsPlan 的节点双渲染各漏一个 child scope/action scope）；并发渲染打断时生产路径同样可能泄漏。功能正确性不受影响（孤儿不参与渲染）。
- 修复方向：对"有属主语义"的创建统一改为 commit 后创建（首渲染 preparing/null，参照 RenderNodes fragment scope 的 version-gating 范式）；或接受现状但在 runtime 侧提供"渲染期创建、commit 确认、未确认即回收"的记账 API。

## P2 风险

### F-05 `useScopeSelector` / `useOwnScopeSelector` 在 scope 无可订阅 store 时静默失去响应性

- 位置：`hook-subscriptions.ts:214-231`（`createScopeSubscribe`：`if (!subscribe) return emptyUnsubscribe`）、`hooks.ts:110-116`（`getSnapshot` 回退 `scope.readVisible()`）。
- 问题：当 ScopeRef 实现未暴露 `store.subscribe` 时，hook 退化为"一次性读 + 永不更新"，无任何 dev 警告。渲染结果基于过期快照（违反 `renderer-runtime.md:96` "Reactive render paths must subscribe" 守则），且契约文档未声明该回退。`DialogHost`（dialog-host.tsx:153-159）的 `surfaceRuntime` 缺失分支同理：getSnapshot 每次返回新 `[]`，靠 subscribe no-op 掩盖了快照不稳定。
- 修复方向：dev/strictMode 下 `console.warn` 一次性提示"scope store 不可订阅，selector 将不响应更新"；文档在 hooks 契约中显式登记该边界。

### F-06 FieldFrame 以裸字段名生成 DOM id：同页多表单字段名冲突时 aria 指向错误

- 位置：`field-frame.tsx:169-176`（`errorId = name ? \`${name}-error\` : undefined`；`hintId`/`descriptionId` 同型）。`useId()`（:102）已取得但仅用于 label 兜底。
- 条件 + 后果：同一页面两个 form 都有 `name="username"` 字段 → 两个 `username-error` id → `aria-errormessage`/`aria-describedby` 解析到首个匹配，屏幕阅读器播报错误归属错表单。
- 修复方向：id 前缀混入 `reactId` 或表单 runtime id（form 内唯一即可，跨表单用 form.id 消歧）。

### F-07 `useFormErrorStoreSelector` 的 selector useCallback 以 `args` 对象为依赖 → 记忆化每渲染失效

- 位置：`hooks/use-form-hooks.ts:153-157`
  ```ts
  const selector = useCallback(
    (state: FormStoreState) => args.selector(state, resolvedQuery),
    [args, resolvedQuery], // args 为每次渲染的新字面量对象
  );
  ```
- 后果：`useSyncExternalStoreWithSelector` 的 memo 以 selector 身份为依赖（use-sync-external-store-with-selector.ts:105），selector 每渲染必变 → memo 清零 → 每次渲染都对全量 `state.fieldStates` 重新执行 `selectCurrentFormErrors` 过滤（O(字段数)），且 `useCurrentFormErrors()`（无 query 时走整 store 订阅，`createFormErrorSubscribe` 无 path 分支）在每次键入都触发全量重过滤。正确性不受影响（isEqual 兜底），属 D6 重渲染放大。
- 修复方向：拆出稳定依赖（`args.selector`、`args.equalityFn`、`args.query`、`args.enabled` 逐项入 deps），或让调用方直接传具名 selector。

### F-08 quick-reference.md hooks 返回类型漂移（D2）

- 位置：`docs/references/quick-reference.md:549-562` vs `context-hooks.ts:44-54`
  - `useCurrentNodeMeta()` 文档标注返回 `ResolvedNodeMeta`，实际返回 `RenderNodeMeta`（`{ id, path, type, cid?, templateNode, node }`，与 renderer-runtime.md:866-873 一致、quick-reference 错）；
  - `useCurrentSurfaceRuntime()` 文档标注 `SurfaceRuntime`，实际 `SurfaceRuntime | undefined`；
  - `useCurrentNodeInstance()` 文档标注 `NodeInstance`，实际 `NodeInstance | undefined`；
  - `useValidationNodeState(node)` 实参是 `path: string` 非 node。
- 影响：下游 renderer 包按文档写 `useCurrentSurfaceRuntime().open(...)` 会在 undefined 上崩溃（TypeScript 能拦，JS 侧/文档读者不能）。本报告作为权威 hooks 事实源，以附录为准；建议同步修 quick-reference。

### F-09 `usePublishedFormStatus` / `usePublishedFormValues` 与 runtime 属主发布并存：公开面重复且可能双写

- 位置：`form-publication.ts:5-91`（本包导出，index.tsx:100）；对照 `flux-runtime/form-runtime.ts:246-294`（`setupExternalPublication` 已内化同语义发布）与 `form.tsx:65-90`（form 包已不再调用本包这两个 hook，仅测试直接使用）。
- 风险：(1) 公开 API 与 runtime 属主发布是同一契约的两套实现，行为有细微差异（本包版本比较字段集不同、无 `clearExternalPublication` 对应物）；(2) host 若同时传 `valuesPath` 给 createFormRuntime 并调用 `usePublishedFormValues`，同路径双写、双订阅放大。
- 修复方向：标注 `@deprecated` 指向 runtime 属主路径（对齐 `docs/skills/deprecated-feature-cleanup.md`），或收窄为测试支持导出。

### F-10 `unwrapBooleanLiteral` 接受 `'true'`/`1`：与 Resolved Boolean Props fail-closed 契约相逆

- 位置：`preserve-literal.ts:43-46`（`if (input === true || input === 'true' || input === 1) return true;`）
- 契约：`renderer-runtime.md:300-315`"Runtime renderers must not coerce boolean-like props with JavaScript truthiness ... `Boolean("false")` is `true`, so renderer-side truthiness checks are contract bugs"。本函数将 `'true'`、`1` 显式判真（虽未把 `"false"` 判真，破坏面小于 `Boolean()`），且作为包级公开工具（index.tsx:106-109）为 wizard/collapse/tabs/variant-field 提供解包范式，等于官方化了一种宽松布尔语义。
- 修复方向：保留 envelope 解包，删除 `'true'`/`1` 字面分支（编译层已用 `literal` kind 保真布尔，宽松分支无必要）；或在该文件注释中明确豁免范围仅限嵌套 item 配置。

## P3 提示

### F-11 NodeRendererResolved 渲染面：`'use no memo'` + 每渲染重建的 props 对象与类型断言

- `node-renderer-resolved.tsx:65`（`'use no memo'`）、`:377-389`（`componentProps` 字面量每渲染新建，下游 `Comp` 无 memo 包装，全量重渲染依赖上游 `NodeRenderer` memo 与订阅过滤收敛——当前链路成立，但属"单点保障"）、`:391`（`templateNode.component.component as React.ComponentType<...>` 单向断言绕过 host-neutral/React 组件区分，registry 未走 `ensureRendererComponent` 时无类型防线）、`:355`（`reactionPlans!` 非空断言，由 `reactionProxyEntries.length` 守卫，当前安全）。
- 建议：断言处补运行时 dev 校验（typeof component === 'function'）；`componentProps` 保持现状可接受（渲染频率已被订阅过滤约束）。

### F-12 渲染期不纯 useMemo（计数器类）

- `node-renderer.tsx:34-36`（`runtime.allocateMountedCid()` 于 useMemo，StrictMode 双渲染多耗 cid）、`render-nodes.tsx:283-286`（`normalizeNodeInput` 编译于 useMemo，丢弃渲染中编译产物作废、templateNodeId 计数前进）。无功能性错误，dev 观测（cid 跳号）与 F-04 同源，随 F-04 一并治理即可。

### F-13 reaction-handle-proxy 内部 setter 命名不一致

- `reaction-handle-proxy.ts:179-181` 转发目标为 `_setBindingsProvider`（下划线），而 `__setScopeOverride`/`__setIgnoreWritesTo`/`__setLoadCallbacks`（:184-204）均为双下划线；接口声明（:45）为 `__setBindingsProvider`。内部约定应统一（依赖 flux-runtime `renderer-reaction-handle.ts` 的实际方法名，跨包核对后统一）。

### F-14 node-frame-wrapper 死变量

- `node-frame-wrapper.tsx:25`：`const _schema = props.templateNode.schema as Record<string, unknown>;` 从未使用，删除。

### F-15 超 500 行文件（D8）

- `dialog-host.tsx` 574 行、`render-nodes.tsx` 526 行，处于 `check:oversized-code-files` 的 WARN 档（500-700，`scripts/check-oversized-code-files.mjs` 核实：仅 >700 需豁免注册，flux-react 无条目）→ **无未注册红**，但按仓库约定应评估拆分：dialog-host 的 `DialogView`/`DrawerView` 约 180 行近似重复可提共享 surface 视图；render-nodes 的 fragment-scope version-gating 段（:300-447）可独立成 hook。

### F-16 DialogHost 边界快照稳定性

- `dialog-host.tsx:153-159`：`surfaceRuntime` 为 undefined 时 getSnapshot 每次返回新 `[]`（不稳定快照），当前被 no-op subscribe 掩盖；建议 `?? EMPTY_SURFACES` 常量兜底，消除潜在 "getSnapshot should be cached" 隐患。

### F-17 `useRenderFragment` 渲染期非响应式读

- `use-render-fragment.ts:33`：`dialogId: scope.get('dialogId')` 为渲染期命令式读（不订阅），scope 中 `dialogId` 后续变化不会更新 helpers 闭包。仅影响 dialog 内动态改名的极端场景；如需精确改为 `useScopeSelector((s) => s.dialogId)`。

### F-18 隐藏字段通知的翻转抖动 + handle hooks 的数组身份依赖

- `node-renderer-resolved.tsx:410-420`：`isFieldHidden` 翻转时 cleanup 先 `notifyFieldHidden(fieldName, false)` 再 setup 通知真值 → 验证 owner 同步收到两次状态写（中间态"未隐藏"瞬时可见于其它订阅者）。可在 cleanup 中记忆上次通知值，仅翻转时通知。
- `hooks/use-input-component-handle.ts:57`（及 composite/surface 同型）：`options.methods` 进 useMemo deps，调用方传内联数组会导致 handle 每渲染重建→注册/注销churn；建议文档标注"methods 需模块级常量"。

## 附录：hooks 契约事实（后续 renderer 包审计的权威依据）

以下事实全部来自源码逐行核对（含 flux-runtime 交叉验证），与文档冲突处以本节为准。

### A1 `useSyncExternalStoreWithSelector`（use-sync-external-store-with-selector.ts，npm with-selector 手抄 fork）

- 内部 memo 以 `[getServerSnapshot, getSnapshot, isEqual, selector]` 身份为依赖；任一变化即清零 memo（下次取值重新执行 selector 并与 `inst.value` 比较，isEqual 命中则返回旧选择 → 不触发重渲染）。`inst.value` 由 `useEffect` 在 commit 后写入——因此内联 selector/equalityFn（每渲染新身份）是合法但低效的用法。
- `getServerSnapshot` 第三参可选（React 19 语义）；相等性默认 `Object.is`。

### A2 `useScopeSelector(selector, equalityFn = Object.is, { enabled, fallback, paths })`

- **相等性**：默认 `Object.is`（对象按引用）。selector 返回新对象字面量 + 默认 equalityFn 时，每次"相关变更"都会触发重渲染；需浅比较请显式传入。
- **快照**：`scope.store?.getSnapshot() ?? scope.readVisible()`。复合 scope 的 `getSnapshot` 即 memoized `readVisible()`（flux-runtime scope.ts:177-199）——own 与 parent 快照均未变时返回同一引用，不会引发 useSyncExternalStore 循环告警。
- **订阅**：经复合 store 同时订阅 own 与 parent 链（parent 变更仅在可见视图引用变化时转发，scope.ts:266-299）——父 scope 写会传播到子 selector，这是"订阅词法可见快照"的语义。
- **paths 过滤**：`createScopeDependencySet`（hook-subscriptions.ts:41-83）归一化后经 `scopeChangeHitsDependencies`（flux-runtime scope-change.ts:134-192）匹配：路径**双向前缀重叠**命中（依赖 `a` 时写 `a.b` 命中；依赖 `a.b` 时写 `a` 也命中）；`'*'` 或依赖集缺失（无 paths）→ 任何写都通知。paths 语义为写入路径（相对写入 scope），跨 scope 链传播的是原始 change.paths。
- **enabled=false**：不订阅、快照恒为 `undefined`、返回 `fallback`。
- **边界**：scope 无 `store.subscribe` 时静默退化为非响应读（见 F-05）。

### A3 `useOwnScopeSelector(selector, equalityFn = Object.is)`

- 快照 `scope.readOwn()`（own store 快照，不含 parent）；订阅经 `scope.store.subscribe`（复合 store 会转发 parent 通知，但 listener 先比较 `readOwn()` 引用未变则跳过，hook-subscriptions.ts:191-212）→ parent 变更不触发（仅多一次空通知开销）。dispose 语义同 A2。

### A4 form 系 hooks（hooks/use-form-hooks.ts + hook-subscriptions.ts + flux-runtime form-store.ts）

- `useCurrentFormState`：仅订阅 `form.store`（**不**回退 validation owner）；`{ path }`/`{ paths }` 走 `subscribeToPath(s)`（精确路径 + 祖先后代双向路径监听：写 `a.b` 会通知 `a` 与 `a.b` 的订阅者）并叠加 `subscribeToSubmitting`；无 path → 整 store 订阅。快照 `getState()`（zustand，引用稳定）。
- `useCurrentValidationValues`：store 取 `form.store ?? validationOwner.store`，其余同上。
- `useCurrentFormErrors(query?)`：有 `query.path` → path 订阅；否则整 store。equality `shallowEqualArrays`。注意 F-07 的每渲染重过滤。
- `useCurrentFormFieldState(path)`：path 为 `''`/undefined → 不订阅、恒 `EMPTY_FORM_FIELD_STATE`；否则 path+submitting 订阅；equality `shallowEqualFormFieldState`（七字段逐个 `===`）。
- `useFieldError(path)`：path 订阅；取首个 `sourceKind` 为空/`field`/`runtime-registration`/`external` 的错误；equality `Object.is`。
- `useCurrentFormModelGeneration`：`subscribeToModelGeneration` ?? `store.subscribe`；快照数值。
- `useAggregateError(path)` = `useCurrentFormError({ path, ownerPath: path, sourceKinds: ['array','object','form','runtime-registration','external'] })`。
- `useChildFieldState(path)` = `useCurrentFormFieldState(path, { path })`；`useOwnedFieldState(path)` 追加 `ownerPath: path`。

### A5 上下文 hooks（context-hooks.ts / contexts.ts）

- `useCurrentNodeMeta()`：返回 `NodeMetaContext`（`{ id, path, type, cid?, templateNode, node }`，provider 值 memo 于 node-renderer-providers.tsx:95-105），缺失时 **throw**（`useRequiredContext`）。
- `useCurrentNodeInstance()` = `useContext(NodeMetaContext)?.node ?? undefined`（不 throw）。`useCurrentPage`/`useCurrentSurfaceRuntime`/`useCurrentActionScope`/`useCurrentComponentRegistry`/`useCurrentImportFrame`/`useStructuralLoopContext` 均可为 `undefined`。
- `useRendererRuntime()`/`useRenderScope()`：缺失即 throw（仅可在 SchemaRenderer 树内使用）。
- `useCurrentValidationScope()`（use-form-hooks.ts:40-54）：优先 `FormContext`，其次 `ValidationContext`（`NO_VALIDATION_OWNER` symbol → undefined），最后 `PageContext.validationOwner`。

### A6 渲染管线事实（NodeRenderer / NodeRendererResolved / RenderNodes）

- **重渲染时机**：`NodeRenderer` 为 `memo`（浅比较 node/scope/renderFragment/actionScope/componentRegistry）。`NodeRendererResolved` 订阅 `scope.store`，listener 先用 `scopeChangeHitsDependencies(change, metaDependencies|propsDependencies)` 过滤（依赖集由 runtime 在首次 resolve 时记录）；快照 token 为 `store.getLastChange()`；token 变化 → 重跑 `resolveNodeMeta`+`resolveNodeProps` → 自定义 equality 比较 `prev.meta === next.meta && prev.resolvedProps.value === next.resolvedProps.value`（引用级）→ 命中才重渲染。`propsProgram.kind === 'static'` 且全部 metaProgram 静态 → **完全不订阅**。
- **props 对象稳定性**：`componentProps`（含 props/meta/regions/events/reactions/helpers）在 NodeRendererResolved 每次渲染重建；`regions`/`events`/`helpers`/`nodeInstance` 各自 useMemo，身份随其依赖（nodeInstance、helpers、renderFragment、contexts）变化。regions 的 `render()` 每次调用新建 RenderNodes 元素（不缓存）。
- **key 生成**：RenderNodes 数组按 `node.id`（编译产物稳定 id）、单根按 `compiled.templateNodeId`；同一 schema 身份重编译会产生新 templateNodeId → 全树 remount（F-03 的根源）。
- **卸载清理**：reaction 句柄 layout-effect dispose→重激活可 drain 缓冲调用（StrictMode 安全，reaction-handle-proxy.ts）；import frame `importStack.pop` 于 layout cleanup；import bindings child scope 于 layout effect 中 dispose 上一代 + 卸载 dispose（node-renderer.tsx:202-224）；lifecycle onUnmount 在 effect cleanup 派发（nodeInstance 身份或 enabled 翻转都会触发 mount/unmount 对——instancePath 变化 = 语义上的重新挂载）。
- **渲染期写 store**：本包渲染路径零写入（bug-15a 修复保持）；fragment bindings 同步与 scope 创建均在 layout effect，首渲染经 version-gating 返回 null 直至 scope committed（render-nodes.tsx:300-416, 481-483）。
- **参数化 region**：`params` 声明时 bindings 装入 `$slot` 帧（外层 `$slot` 通过 `$parent` 链接，slot-frame.ts）；非参数化 region 直接并入子 scope。
- **错误边界**：每节点 `NodeErrorBoundary`（渲染期异常，带 retry，不随 children 变化自动复位）；根级 `SchemaRootErrorBoundary`（attemptKey 强制重挂载 children）；surface body 各段独立包 `SurfaceBodyBoundary`；lazy 组件加载失败依赖上层 boundary；import 预载失败渲染 `SchemaRootError` 而非 null。
- **隐藏节点**：`when === false || !visible || hidden` → 渲染 null（hooks 已全部执行，lifecycle enabled=false）；`notifyFieldHidden` 向 `form ?? validationScope` 上报（见 F-18 抖动）。

### A7 其他行为事实

- `useActionDispatcher()` 返回 `runtime.dispatch`（绑定 runtime，非 memo——恒定引用）。
- `useDataSourceStatus(path)`：`getIn(可见快照, path)` + `paths:[path]` 订阅过滤。
- `useStrictMode()`/`useFormLayout()`：直接读 runtime 标志 / `FormLayoutContext ?? {}`。
- `useNodeSourceProps`：source 型 prop 的执行全部在 effect（observer.run 内部同步 notify loading 态，source-observer.ts:89 核实——loading UI 会正常显示）；快照相等用 `shallowEqual`；controller 随 `hasSourceProps`/node/runtime 身份重建并 dispose。
- `useHostScope`（workbench）：scope 创建于 useState 初始化器，数据同步/替换/销毁均在 layout effect；`__fdDisposed__` 标记支持 StrictMode dispose→重建。
- 渲染期创建 + queueMicrotask 延迟销毁（mountedRef + 身份校验）是本包统一的 StrictMode 清理范式（schema-renderer runtime/page、useNodeScopes、FormRenderer ownedForm 同型）；该范式保证"不误杀"，但不覆盖"未 commit 的渲染期孤儿"（F-04）。

## 检查过程记录

1. 读基线文档：`docs/architecture/renderer-runtime.md`（全文 1371 行）、`docs/references/quick-reference.md`、`docs/architecture/field-metadata-slot-modeling.md`；读 `packages/flux-react/package.json`。
2. `find` 枚举 src 全部源文件（55 个 / 8139 行，wc 核对与任务描述一致）；按体量排序定精读顺序。
3. 精读 hooks 核心：`hooks.ts`、`use-sync-external-store-with-selector.ts`、`hook-subscriptions.ts`、`hooks/use-form-hooks.ts`、`context-hooks.ts`、`contexts.ts`；交叉精读 flux-runtime `scope.ts`（复合 store 订阅/快照 memoization）、`scope-change.ts`（路径命中语义）、`form-store.ts`（path 订阅语义）核实 A2-A4 事实。
4. 精读渲染管线：`node-renderer.tsx`、`node-renderer-resolved.tsx`、`node-renderer-providers.tsx`、`node-renderer-effects.ts`、`node-renderer-utils.ts`、`use-node-scopes.ts`、`use-node-source-props.ts`、`node-source-prop-controller.ts`、`node-instance.ts`、`use-node-debug-data.ts`、`render-nodes.tsx`、`schema-renderer.tsx`、`renderer-helpers.ts`、`helpers.tsx`。
5. 精读外围：`dialog-host.tsx`、`dialog-host-surface.tsx`、`field-frame.tsx`、`node-frame-wrapper.tsx`、`node-error-boundary.tsx`、`reaction-handle-proxy.ts`、`use-source-value.ts`、`form-publication.ts`、`form-state.ts`、`status-path.ts`、`field-error-visibility.ts`、`slot-frame.ts`、`fragment-scope.ts`、`preserve-literal.ts`、`resolve-gap.ts`、`auto-renderer.tsx`、`lazy-renderer-component.tsx`、`react-contracts.ts`、`unstable.ts`、`defaults.ts`、`container-hooks.ts`、`runtime-context-hooks.ts`、`structural-loop-provider.tsx`、`use-render-fragment.ts`、`render-fragment-element.tsx`、`workbench/*`、`hooks/use-*-handle.ts`、`test-support*`（扫读）。
6. setState-in-render 线索归因：读 `docs/audits/check/00-baseline-tooling.md`、`docs/bugs/15a-render-nodes-setstate-during-render-fix.md`、复现用例 `flux-renderers-form/src/__tests__/form-submit-actions.values.test.tsx`、`form.tsx`、flux-runtime `form-runtime.ts` `setupExternalPublication` —— 闭合 F-01 推理链（本包渲染路径无写入，写点在 runtime 构造期发布，触发点在 form 包渲染期创建）。
7. F-02 验证：读 `component-handle-registry.ts:351-367` 确认 `register` 返回注销函数；对照 `use-input-component-handle.ts` 正确范式；grep 确认 `useContainerDomRegistration` 仓库内无消费者。
8. F-03/F-04 验证：读 `flux-compiler/src/schema-compiler.ts:218-224`（无编译缓存）、`flux-runtime/src/runtime-factory.ts:100-196`（ownedActionScopes/ownedScopeDisposers 登记）。
9. grep 扫描：`as any`/`@ts-ignore`（0 命中）、空 catch（3 处均带注释说明）、非空断言（1 处已守卫）、`addEventListener`/`setInterval`（仅 workbench-shell matchMedia，有清理）、TODO/FIXME（0）。
10. D8 核对：`scripts/check-oversized-code-files.mjs` —— WARN 档 500-700 / ERROR 档 >700，flux-react 两文件（574/526）处 WARN 档，无未注册红。
11. 全程只读：未运行任何 pnpm 命令、未修改 packages 下任何文件；唯一写入为本报告。
