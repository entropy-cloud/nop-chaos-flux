# 维度 05：响应式订阅精度

## 第 1 轮（初审）

### [维度05-01] 表单 owner 场景下多个 path-bound 字段保留未禁用的广域 scope 订阅

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:134-140`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:281-299`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:66-76`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:64-73`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:148-154`
  - `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\code-editor-renderer\use-code-editor-binding.ts:18-27`
- **证据片段**:
  ```ts
  const scopeValue = useScopeSelector((data) => (name ? getIn(data, name) : data), Object.is);
  const formValue = useCurrentFormState(name ?? '', {
    enabled: Boolean(parentForm && name),
    path: name ?? '',
  });
  ```
- **严重程度**: P2
- **现状**: 这些组件在 `parentForm/currentForm` 存在时，已经有 `useCurrentFormState(..., { path })` 的精确订阅，但同时仍常驻一个未加 `paths`、且未按 `!form` 禁用的 `useScopeSelector(getIn(..., name/scopePath))`。
- **风险**: `useScopeSelector` 在无 `paths` 时会退化为全 scope 变更唤醒；即使 equality 挡住最终 rerender，selector 仍会在每次无关 scope 写入时被唤醒。对复合字段、详情字段、代码编辑器等热路径组件，这是实际的订阅过宽。
- **建议**: scope fallback 应改成“仅在无 form owner 时启用”，并在有 `name/scopePath` 时传 `paths: [name/scopePath]`。
- **为什么值得现在做**: 这是共享字段渲染主路径的重复模式，修一处可同时降低复杂字段与代码编辑器的无关唤醒开销。
- **误报排除**: 这不是单纯 selector 风格偏好；live code 已同时存在 path-aware form 订阅和 broad scope fallback，说明组件只需要单路径值，当前广域唤醒是多余的。
- **历史模式对应**: 对应 `broad-scope-selector` suspect 的真实保留案例。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/architecture/renderer-runtime.md`、`docs/references/audit-tooling.md`
- **复核状态**: 未复核

### [维度05-02] `array-editor` 与 `key-value` 的 non-form fallback 按单一路径取值，却仍使用广域 scope 订阅

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\array-editor.tsx:188-206`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\key-value.tsx:240-263`
- **证据片段**:
  ```ts
  const scopeExternalValue = useScopeSelector(
    (scopeData) => (hasName ? getIn(scopeData, name) : undefined),
    Object.is,
    { enabled: !currentForm && hasName },
  );
  ```
- **严重程度**: P2
- **现状**: 这两处已正确在 form 场景禁用 scope fallback，但 non-form 场景仍是 `getIn(scopeData, name)` 的单路径读取，却没有传 `paths: [name]`。
- **风险**: sibling scope 更新也会唤醒每个 editor 的 selector；在列表、复合编辑器等热点里会形成不必要的热路径唤醒。
- **建议**: 保留 `enabled: !currentForm && hasName`，并补 `paths: hasName ? [name] : undefined`。
- **为什么值得现在做**: 这是同一模式在两类复杂编辑器中的重复缺陷，修复面小且收益直接。
- **误报排除**: 不是为了“更优雅”而改；组件明确只依赖单路径值，当前 broad subscription 与真实依赖范围不匹配。
- **历史模式对应**: 对应 `broad-scope-selector` suspect 的真实保留案例。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/references/audit-tooling.md`
- **复核状态**: 未复核

## 检查范围

- suspect 列表、`useScopeSelector` / `useCurrentFormState` / `useSyncExternalStoreWithSelector` 实现
- `packages/flux-react/src/render-nodes.tsx`
- `packages/flux-react/src/node-renderer.tsx`
- `packages/flux-react/src/node-renderer-resolved.tsx`
- `packages/flux-renderers-form-advanced/src/*` 相关复杂字段
- `packages/flux-renderers-data/src/table-renderer/*`

### 初审排除项

- `packages/flux-react/src/render-nodes.tsx:323`：位于 `useLayoutEffect` 内的 fragment own-snapshot 同步，不是 render-phase reactive read。
- `packages/flux-renderers-basic/src/scope-debug.tsx:54`：debug 路径，不报。
- `packages/flux-renderers-basic/src/page.tsx:18-20`：当前只取简单标量 `refreshTick`，本轮不足以认定为真实热路径问题。

## 深挖第 2 轮追加

### [维度05-03] `useNodeSourceProps` 只按 source 输入重跑，带 source 的节点会对普通 resolved props 暴露陈旧快照

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\use-node-source-props.ts:56-71`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-source-prop-controller.ts:184-205`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer-resolved.tsx:162-166`
- **证据片段**:

  ```ts
  const sourceInputsKey = useMemo(() => JSON.stringify(sourceInputs), [sourceInputs]);

  useEffect(() => {
    if (!hasSourceProps) return;
    controller.run(propsValueRef.current, scopeRef.current);
  }, [controller, hasSourceProps, sourceInputsKey]);
  ```

- **严重程度**: P1
- **现状**: 这个 hook 返回的是整份 `resolved props` 快照，但 effect 只在 `sourceInputsKey` 变化时重跑。只要 source schema 本身没变、而同节点的普通 resolved prop 变了，controller 里的 `baseValue` 就不会刷新。
- **风险**: source-enabled 组件会持续拿到旧的非 source props，直到 source 自己再次变化才顺带刷新；这是实质性的 stale snapshot，而不是单纯性能问题。
- **建议**: `controller.run()` 的触发条件不能只看 source 输入；至少要把完整 `propsValue` 的非 source 部分纳入刷新条件，或把 source 解析结果与普通 resolved props 分层合并，避免 controller 缓存整份 props。
- **为什么值得现在做**: 这是 `node-source props` 主路径的响应式精度缺口，会影响所有 `allowSource` 渲染器，而不是单个字段实现。
- **误报排除**: 这不是重复维度 15 的 `JSON.stringify` 热路径问题；这里的核心缺陷是普通 prop 变化不触发重算，属于 live stale-read。
- **历史模式对应**: 对应 source-aware renderer 共享基建上的 stale snapshot residual。
- **参考文档**: `docs/architecture/renderer-runtime.md`、`docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度05-04] `useFieldPresentation` 的 form 分支按单字段订阅，却读取跨字段 required 依赖与提交态

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-presentation.tsx:34-65`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\form-state.ts:154-205`
  - `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hook-subscriptions.ts:131-139`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:226-229`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:276-279`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:61-64`
- **证据片段**:
  ```ts
  const currentPresentation = useCurrentFormState(
    (state) =>
      selectCurrentFormFieldPresentation(state, {
        path: name,
        validation: currentValidationScope?.validation,
      }),
    undefined,
    { path: name },
  );
  ```
- **严重程度**: P1
- **现状**: form 分支只订阅 `path: name`，但 selector 实际还读取 `state.values` 里的 `requiredWhen/requiredUnless` 依赖，以及 `submitting/submitAttempted`。
- **风险**: 字段展示态会欠订阅：跨字段 required 变化、`submitAttempted/submitting` 切换时，`effectiveRequired`、`showError`、交互态可能不及时刷新。该 hook 已被多个 advanced 字段主路径消费。
- **建议**: form 分支不要只传 `{ path: name }`；应补上动态 required dependency `paths`，并为提交态单独订阅或改用已含 submitting 订阅的字段态组合。
- **为什么值得现在做**: 这是字段展示层公共 hook；修复后可同时收敛普通字段与 advanced 字段的欠订阅。
- **误报排除**: 这不是重复已知的 non-form required 缺陷；这里是 form owner 主路径下的欠订阅，而且问题不只 required，还包括 `submitting` / `submitAttempted`。
- **历史模式对应**: 对应 per-path subscription 与跨字段依赖未对齐的真实 residual。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度05-01]：保留 (P2)。表单 owner 场景 broad scope fallback 仍常驻，订阅粒度过宽成立。
- [维度05-02]：保留 (P2)。non-form fallback 仅取单一路径却未传 `paths`。
- [维度05-03]：保留 (P1)。`useNodeSourceProps` 会对普通 resolved props 暴露 stale snapshot。
- [维度05-04]：保留 (P1)。`useFieldPresentation` 的 form 分支存在明确欠订阅。
- [维度05-05]：保留 (P2)。CRUD selectors 读祖先路径又写祖先摘要，形成连带唤醒放大器。

## 子项复核结论

- [维度05-03]：成立。source controller 快照依赖整份 props，但刷新条件只看 source 输入。
- [维度05-04]：成立。selector 读取跨字段 required 依赖和提交态，但订阅只覆盖单路径。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                         | 一句话摘要                                                   |
| ----- | -------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 05-01 | P2       | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` | form owner 场景仍常驻 broad scope fallback                   |
| 05-02 | P2       | `packages/flux-renderers-form-advanced/src/array-editor.tsx`                 | non-form 单路径读取未传 `paths`                              |
| 05-03 | P1       | `packages/flux-react/src/use-node-source-props.ts`                           | source-enabled 节点对普通 resolved props 暴露 stale snapshot |
| 05-04 | P1       | `packages/flux-renderers-form/src/field-utils/field-presentation.tsx`        | 字段展示 hook 欠订阅跨字段 required 与提交态                 |
| 05-05 | P2       | `packages/flux-renderers-data/src/crud-renderer-state.ts`                    | CRUD selectors 同时订阅祖先和子路径导致连带唤醒              |

### [维度05-05] CRUD runtime state 同时订阅 owner 根路径与子路径，导致任一子状态变更都会唤醒全部 CRUD selector

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer-ownership.ts:36-43`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer-state.ts:237-291`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\crud-renderer.tsx:72-97`
- **证据片段**:

  ```ts
  const ownerStatePath = `$_crud.${String(id ?? cid ?? 'crud')}`;
  queryStatePath: `${ownerStatePath}.query`
  paginationStatePath: `${ownerStatePath}.pagination`

  const queryState = useScopeSelector(..., { paths: [ownerStatePath, queryStatePath] });
  const paginationState = useScopeSelector(..., { paths: [ownerStatePath, paginationStatePath] });
  ```

- **严重程度**: P2
- **现状**: 默认路径下，`queryStatePath/paginationStatePath/...` 全都是 `ownerStatePath` 的子路径；但每个 selector 仍额外订阅祖先 `ownerStatePath`。同时 CRUD 自己又在任一 slice 变化后回写整个 `ownerStatePath` 摘要。
- **风险**: query、分页、排序、过滤、选择任一交互，都会让其它 CRUD state selector 一起被唤醒，形成 owner-local 的连带失效；这是 table/CRUD 热路径上的实际放大器。
- **建议**: 初始化或兼容 fallback 可读 `ownerStatePath`，但稳定运行后订阅应只保留各自子路径；或把 owner summary 发布与 runtime state 读取拆开，避免“读祖先 + 写祖先”自激。
- **为什么值得现在做**: CRUD 是复合热点组件，这类祖先路径重叠会放大每次列表交互的 selector 执行成本。
- **误报排除**: 这不是重复“缺少 paths”的 broad-scope-selector；这里已经传了 `paths`，问题在于订阅集合本身包含了覆盖全部子状态的祖先路径。
- **历史模式对应**: 对应 owner-local summary 与 slice subscription 重叠的真实性能缺陷。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核
