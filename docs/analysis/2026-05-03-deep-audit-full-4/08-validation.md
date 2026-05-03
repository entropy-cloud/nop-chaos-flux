# 维度08 验证系统一致性

- 初审发现数: 4
- 复核结果: 保留 2 / 降级 2 / 驳回 0

### [维度08] surface-root validation owner 的 hidden participation 未覆盖 runtime registration path

- **文件**: `packages/flux-runtime/src/form-runtime-field-ops.ts:239-287`, `packages/flux-runtime/src/form-runtime-validation.ts:419-437`
- **证据片段**:

```ts
if (field && !field.hiddenFieldPolicy.validateWhenHidden) {
  ...
}
// runtimeRegistration 分支没有对应 hidden 判定
```

- **严重程度**: P2
- **验证生命周期阶段**: 执行
- **现状**: compiled field 有 hidden guard，runtime-only registration 路径没有。
- **风险**: 复杂控件/运行时子路径在 hidden 后仍可能继续验证、复活错误或 validating 状态。
- **建议**: 让 runtime registration 路径同样走 owner-scoped hidden participation 规则。
- **为什么值得现在做**: 这是 compiled 与 runtime participation contract 的直接裂缝。
- **误报排除**: 不是在指责 compiled field；问题只在 runtime registration 分支。
- **历史模式对应**: hidden policy mismatch between compiled/runtime paths。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: `维度复核通过`

### [维度08] `FieldFrame` 在 non-form validation owner 下不会正确重算 dynamic required

- **文件**: `packages/flux-react/src/field-frame.tsx:102-124`, `packages/flux-react/src/hooks.ts:275-298`
- **证据片段**:

```ts
const model = currentValidationScope?.validation;
const dependentValue = useCurrentFormState(...)
```

- **严重程度**: P2
- **验证生命周期阶段**: 结果展示
- **现状**: `FieldFrame` 读取的是 validation owner 的 model，但 dynamic required 订阅只从 `currentForm.store` 取值。
- **风险**: page-root / surface-root 等 non-form owner 下，required 标记会与真实 materialization 结果不一致。
- **建议**: 为 `FieldFrame` 增加 validation-owner 值订阅 fallback。
- **为什么值得现在做**: 这会直接制造“验证真相和 UI 提示不一致”的用户感知错误。
- **误报排除**: 不是说 non-form owner 完全不能验证；问题只在 required 展示同步。
- **历史模式对应**: form-only UI subscription on shared validation contract。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: `维度复核通过`

### [维度08] managed surface owner 没有接上 compiled validation plan

- **文件**: `packages/flux-react/src/schema-renderer.tsx:260-272`, `packages/flux-runtime/src/surface-runtime.ts:74-82`, `packages/flux-react/src/dialog-host-surface.tsx:75-87`
- **证据片段**:

```ts
page.validationOwner?.refreshCompiledModel(validationPlan);
// surface owner 没有对应 attach 路径
```

- **严重程度**: P2
- **验证生命周期阶段**: 编译 / 注册
- **现状**: page-root owner 会 attach root validation plan，surface-root owner 没有对等接线。
- **风险**: managed surface 中未包在 inner form 里的可编辑内容会落入“有 owner 上下文、但无 compiled plan”的半接线状态。
- **建议**: 为 surface-root owner 增加和 page-root 对等的 `bootstrapping -> refreshCompiledModel(...) -> active` 路径。
- **为什么值得现在做**: 文档已把 managed surface owner 定义为 live baseline，不是 future contract。
- **误报排除**: inner form 自己创建 `FormRuntime` 的路径不受此条影响。
- **历史模式对应**: owner published before model attach.
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: `已降级`

### [维度08] surface-root owner 以 active 状态启动但没有 validation model

- **文件**: `packages/flux-runtime/src/surface-runtime.ts:74-82`, `packages/flux-runtime/src/form-runtime.ts:89,155,196-205`
- **证据片段**:

```ts
const currentValidation = inputValue.validation;
const lifecycleState = inputValue.initialLifecycleState ?? 'active';
```

- **严重程度**: P2
- **验证生命周期阶段**: 注册
- **现状**: surface owner 未传 `initialLifecycleState`，默认 active；同时未传 validation model。
- **风险**: owner 会表现为 active/ready，但底层没有可执行 validation plan。
- **建议**: surface owner 初始应像 page-root 一样进入 `bootstrapping`。
- **为什么值得现在做**: 这是 owner lifecycle contract 的直接偏离。
- **误报排除**: 不是 page-root 问题；page-root 当前已走 bootstrapping attach 流程。
- **历史模式对应**: active-without-model owner.
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: `已降级`
