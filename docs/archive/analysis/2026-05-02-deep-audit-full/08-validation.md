# 08 验证系统一致性

## 复核统计

- 初审条目: 3
- 维度复核: 完成
- 子项复核: 3 条
- 保留: 1
- 降级: 2
- 驳回: 0

## 保留

### [维度08] page-root validation owner 在 compiled model 为空时就以 `active` 暴露

- **文件**: `packages/flux-runtime/src/form-runtime.ts:151-153`, `packages/flux-runtime/src/runtime-owned-factories.ts:109-115`, `packages/flux-react/src/schema-renderer.tsx:228-240`
- **证据片段**:
  ```ts
  151:     hiddenFields: new Set(),
  152:     lifecycleState: 'active',
  153:     modelGeneration: 1,
  ```
  ```ts
  109: const pageValidation = input.createValidationScopeRuntime({
  115: });
  ```
  ```tsx
  228: useEffect(() => {
  239:   page.validationOwner?.refreshCompiledModel(validationPlan);
  240: }, [compiledRoot, page]);
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 编译 / 注册
- **现状**: page-root owner 先以 `active` 暴露到 `ValidationContext`，compiled model 直到后续 effect 才 attach。
- **风险**: 调试快照和依赖 lifecycle state 的调用方会在初始窗口看到错误的 `active` 状态。
- **建议**: 在没有 compiled model 时使用 `bootstrapping`/`refreshing`，再进入 `active`。
- **为什么值得现在做**: 这是 owner lifecycle contract 的公开偏差。
- **误报排除**: item review明确核对了 owner doc 和 live createPageRuntime/createSchemaRenderer 时序。
- **历史模式对应**: transitional state 被过早发布为 active
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: `子项复核通过`

## 已降级

### [维度08] non-form owner 已有 touch/visit，但 hidden-field participation 仍停留在 FormRuntime-only

- **文件**: `packages/flux-core/src/types/runtime.ts:305-329`, `packages/flux-runtime/src/runtime-owned-factories.ts:59-73`, `packages/flux-react/src/node-renderer.tsx:316-324`, `packages/flux-renderers-form/src/field-utils.tsx:485-495`
- **证据片段**:
  ```ts
  305:   registerField(registration: RuntimeFieldRegistration): FieldRegistrationHandle;
  310:   touchField?(path: string): void;
  311:   visitField?(path: string): void;
  ```
  ```ts
  320: export interface FormRuntime extends ValidationScopeRuntime {
  329:   notifyFieldHidden(path: string, hidden: boolean): void;
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 触发 / 参与策略
- **现状**: page/surface 非 form owner 已能接收 `touchField/visitField`，但 hidden 参与逻辑仍依赖 `notifyFieldHidden in hiddenOwner`，而该 API 只在 `FormRuntime` 上存在。
- **风险**: 非 form owner 下 hidden default-skip、stale error clear、`clearValueWhenHidden` 无法同步生效。
- **建议**: 为非 form owner 补上 hidden participation API，或把该能力提升到 `ValidationScopeRuntime`。
- **为什么值得现在做**: 这是 live page/surface owner 路径的真实契约缺口。
- **误报排除**: item review已驳回“touch/visit 也缺失”的子结论，最终问题仅限 hidden participation。
- **历史模式对应**: form-only capability 未同步扩展到 shared validation owner
- **参考文档**: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`
- **复核状态**: `已降级`

### [维度08] detail draft 写回后的 follow-up revalidation 在部分路径下退回到默认 `manual`

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:173-176`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:179-180`, `packages/flux-runtime/src/form-runtime-validation.ts:213-219`
- **证据片段**:
  ```ts
  173: parentForm.setValue(name, writeback);
  175: void parentForm.validateField(name);
  ```
  ```ts
  179: if (parentForm && scopePath) {
  180:   void parentForm.validateSubtree(scopePath);
  ```
  ```ts
  217:       cause: reason ?? 'manual',
  ```
- **严重程度**: P2
- **验证生命周期阶段**: 触发 / 执行
- **现状**: `detail-field` 和 `detail-view(scopePath)` 写回后未显式传入 reason，runtime 会按 `manual` 记账。
- **风险**: draft writeback follow-up 无法稳定落到文档定义的 owner-driven reason 语义。
- **建议**: 为这两条写回路径显式选择 `system`/`commit` 或统一走专门 API。
- **为什么值得现在做**: 这是已确认的 trigger-contract gap，只是修复方案需要 owner 再定。
- **误报排除**: item review确认问题范围小于“所有 detail writeback 路径”，因为无 `scopePath` 分支已有 `validateAll('commit')`。
- **历史模式对应**: 正确 API 被以错误缺省 reason 调用
- **参考文档**: `docs/references/form-validation-execution-details.md`
- **复核状态**: `已降级`

## 零发现

- 编译器 `create-owner` 边界和 parent/child owner partition 当前仍由 compile-time 控制。
- `fieldStates` flat map 和 async stale suppression 当前基线正常。
- per-path 错误展示订阅和 child submit gating 当前实现正常。
