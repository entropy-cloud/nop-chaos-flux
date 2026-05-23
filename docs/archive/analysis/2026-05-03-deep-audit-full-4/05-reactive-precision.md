# 维度05 响应式订阅精度

- 初审发现数: 3
- 复核结果: 保留 3 / 降级 0 / 驳回 0

### [维度05] Dialog/Drawer host 订阅整份 visible surface scope

- **文件**: `packages/flux-react/src/dialog-host.tsx:71,146`, `packages/flux-react/src/dialog-host-surface.tsx:50-72`
- **证据片段**:

```ts
useSurfaceScopeSnapshot(props.surface.scope);
```

- **严重程度**: P1
- **现状**: `DialogView` / `DrawerView` 未传 `paths`，直接订阅 `scope.readVisible()` 整体对象。
- **风险**: 任意 surface scope 或父级 visible scope 写入都会唤醒 host 外壳，导致整棵 surface 内容额外重渲染。
- **建议**: 去掉无路径订阅，或只订阅 host 壳层实际需要的少数字段。
- **为什么值得现在做**: 这是 dialog 输入/校验等高频路径上的系统性额外重渲染。
- **误报排除**: 下游 `RenderNodes` 已有自己的响应式订阅；这里是重复的 host 层全量订阅。
- **历史模式对应**: broad host subscription。
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: `子项复核通过`

### [维度05] form 场景下同时挂 form-path 订阅和 broad `useScopeSelector`

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:95-101`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:103-109`, `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:9-20`
- **证据片段**:

```ts
const formValue = useCurrentFormState(..., { path: name || undefined });
const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
```

- **严重程度**: P2
- **现状**: 组件在有 `currentForm` 时仍保留 broad scope 订阅。
- **风险**: 每次 form/scope 写入都会产生多余唤醒，复杂表单里会累积成 O(组件数) 的无用开销。
- **建议**: 统一改为 `useScopeSelector(..., { enabled: !currentForm })`。
- **为什么值得现在做**: 仓内已经有正确模式可复用，属于低风险高回报收敛。
- **误报排除**: 不是理论性“双取值”；这些 hooks 在 live code 中真实 mount。
- **历史模式对应**: dual subscription after path narrowing。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `维度复核通过`

### [维度05] `useCurrentFormModelGeneration()` 用整 store 广播读低频标量

- **文件**: `packages/flux-react/src/hooks.ts:457-462`
- **证据片段**:

```ts
const subscribe = useMemo(() => form?.store.subscribe ?? (() => () => undefined), [form]);
const getSnapshot = useMemo(() => () => form?.modelGeneration ?? 0, [form]);
```

- **严重程度**: P2
- **现状**: 极低频的 `modelGeneration` 变化复用了整个 form store 广播。
- **风险**: 所有相关消费者会在普通字段写入时被无意义唤醒。
- **建议**: 提供 `subscribeToModelGeneration` 或独立信号通道。
- **为什么值得现在做**: 消费者已分布在多个 advanced field 中，负担持续存在。
- **误报排除**: 问题不在 selector 返回值，而在订阅源本身过宽。
- **历史模式对应**: low-frequency signal on high-frequency bus。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `维度复核通过`
