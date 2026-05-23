# 维度 08：验证系统一致性

## 第 1 轮（初审）

### [维度08-01] owner-level `validateAll` / `validateSubtree` 在无可执行模型或已失活时返回 clean success

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts`
- **证据片段**:

  ```ts
  async function validateForm(reason?: ValidationReason) {
    const currentValidation = input.getCurrentValidation();

    if (!currentValidation) {
      const lifecycleActive = await waitForActiveLifecycle(input.sharedState);
      if (!lifecycleActive) {
        return {
          ok: true,
          errors: [],
          fieldErrors: {},
        } as FormValidationResult;
      }
    }
  }
  ```

- **严重程度**: P1
- **验证生命周期阶段**: 执行
- **现状**: field-level `validatePath()` 已在 disposed / transitional 失活时返回 blocked result，但 owner-level `validateForm()` / `validateSubtree()` 仍把同类场景折叠成 `ok: true`。
- **风险**: 调用方会把“owner 尚未可执行 / 已失活”误判成“整棵 scope 校验通过”，从而错误放行 gating、跨 owner 协调或 host 侧提交流程。
- **建议**: 让 owner-level API 与文档和 `validatePath()` 一致，返回可区分的 blocked / lifecycle failure 结果，而不是 clean success。
- **为什么值得现在做**: 这是公共运行时 API 语义错误，不是内部实现细节；越晚修，越容易把错误语义扩散到更多调用点。
- **误报排除**: 不是“未完成的目标态”误报；文档已把该点写成 current live baseline，且代码已在同一模块中对 field-level path 采用了更严格语义。
- **历史模式对应**: 在 v1 baseline 下，live main-path clean-success 语义本身就是缺陷证据。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-02] projected validation owner 的 `validateAll()` 泄漏为父 owner 全域校验

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/projected-validation-runtime.ts`
- **证据片段**:
  ```ts
  const proxy: LiveValidationScopeRuntime = {
    validateAt(path, reason) {
      return parentOwner.validateAt(options.prefixPath(path), reason);
    },
    validateSubtree(path, reason) {
      return parentOwner.validateSubtree(options.prefixPath(path), reason);
    },
    validateAll(reason) {
      return parentOwner.validateAll(reason);
    },
  };
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 触发
- **现状**: projected owner 对 `validateAt` / `validateSubtree` 都做了 subtree rebasing，但 `validateAll` 直接回退到父 owner 全域 traversal，没有保持 projected 子树边界。
- **风险**: 任何把 projected owner 当作“当前子树 validation scope”来调用 `validateAll()` 的路径，都会意外校验整个父 owner，拉入无关 sibling 错误并破坏 owner-local traversal 语义。
- **建议**: 让 projected validation owner 的 `validateAll()` 映射为 ownerRoot subtree 的 `validateSubtree(...)`，或显式禁止该 API 在 projected inherit-owner proxy 上暴露为全量当前子树校验。
- **为什么值得现在做**: 这类 proxy 一旦进入更多 non-form / projected owner 路径，会持续制造隐蔽的 cross-scope validation 偏差；现在收口代价最低。
- **误报排除**: 不是抽象一致性建议；这是 live API 行为不一致，且同仓 `createProjectedFormRuntime()` 已经实现了 subtree-scoped `validateAll()`。
- **历史模式对应**: projected owner 语义泄漏问题。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`, `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts`
- **复核状态**: 未复核

### [维度08-03] `variant-field` 在 inherit-owner / projected 路径上仍注册 child contract，混淆 parent-owned subtree 与 create-owner child scope

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- **证据片段**:

  ```ts
  const variantValidationOwner = React.useMemo(() => {
    if (parentForm || !parentValidationOwner || !name) {
      return parentValidationOwner;
    }

    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: name,
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 注册
- **现状**: non-form 路径下这里创建的是 rebased projected owner，不是独立 `create-owner` child scope；但运行时仍把它注册成 `recurse-submit` child contract。
- **风险**: parent submit orchestration 会把 parent-owned polymorphic subtree 当成 child owner 递归处理，模糊 owner 边界；再叠加上一条 `validateAll()` 泄漏，会把伪 child contract 变成整父 owner 的重复 submit 校验。
- **建议**: inherit-owner / projected editor 不应注册 `ChildValidationContract`；如果只需要 subtree gating，应走 parent owner 本地 subtree 语义，而不是伪造 child owner。
- **为什么值得现在做**: 这是 validation ownership 核心约束；继续放任会让 renderer 层各自发明“伪 child owner”补丁，后续很难收敛。
- **误报排除**: 不是单纯 bridge 味道问题；文档明确限定 `ChildValidationContract` 只适用于 `create-owner` child scope，inherit-owner subtree 不产出 contract。
- **历史模式对应**: projected owner / child-owner 混用模式。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度08-04] `variant-field` 的 hidden-branch 参与收敛只扫描第一层具名子节点

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- **证据片段**:

  ```ts
  function collectNamedChildPathsFromTemplateNode(templateNode) {
    const nodes = Array.isArray(templateNode) ? templateNode : templateNode ? [templateNode] : [];
    const names = new Set<string>();

    for (const node of nodes) {
      const candidateName = (node.schema as { name?: unknown }).name;
      if (typeof candidateName === 'string' && candidateName.length > 0) {
        names.add(candidateName);
      }
    }
  }
  ```

- **严重程度**: P2
- **验证生命周期阶段**: 结果展示
- **现状**: inactive branch 只从顶层节点提取 `name`，不会深度遍历未命名 wrapper 下的后代字段，因此真实子字段可能不会进入 `hiddenVariantChildPaths`。
- **风险**: inactive branch 的嵌套 required 字段、聚合错误或异步校验仍可能继续参与当前 owner 的 `valid/ready/canSubmit` 计算。
- **建议**: 不要靠浅层 `name` 扫描推导 hidden branch 路径；改为基于编译期已知子树路径做深度收集。
- **为什么值得现在做**: 这会直接破坏 `variant-field` 最核心的 active/inactive branch 参与语义，而未命名布局包裹是常见 schema 形态。
- **误报排除**: 不是旧的 `notifyFieldHidden` 缺失问题；这里剩下的是“隐藏路径发现本身过浅”。
- **历史模式对应**: renderer 本地 participation 推导只覆盖顶层节点，遗漏编译期已存在的后代字段
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度08-01]: 保留 (P1)。owner-level `validateAll` / `validateSubtree` 在失活/无模型时仍返回 clean success。
- [维度08-02]: 保留 (P2)。projected validation owner 的 `validateAll()` 仍泄漏为父 owner 全域校验。
- [维度08-03]: 保留 (P2)。`variant-field` 在 projected/inherit-owner 路径仍注册 child contract。
- [维度08-04]: 保留 (P2)。hidden-branch 参与路径发现仍过浅，会遗漏 wrapper 下的后代字段。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                    | 一句话摘要                                            |
| ----- | -------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 08-01 | P1       | `packages/flux-runtime/src/form-runtime-owner.ts`                                       | owner-level 校验在失活场景仍返回 clean success        |
| 08-02 | P2       | `packages/flux-renderers-form-advanced/src/detail-view/projected-validation-runtime.ts` | projected `validateAll()` 泄漏为父 owner 全域校验     |
| 08-03 | P2       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`             | projected/inherit-owner 路径仍被注册成 child contract |
| 08-04 | P2       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`             | hidden-branch 参与发现只扫描第一层具名子节点          |
