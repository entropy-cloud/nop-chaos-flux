# 维度 08：验证系统一致性

## 第 1 轮（初审）

### [维度08-01] `validateForm()` 和 `validateSubtree()` 等待 owner 激活后仍使用旧 validation 快照，可能把 bootstrapping/refreshing 请求错误当成 clean success

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-owner.ts:335-350,497-532`
- **证据片段**:
  ```ts
  const currentValidation = input.getCurrentValidation();
  await waitForActiveLifecycle(...);
  // 等待后未重新读取 currentValidation
  // 仍按旧的 undefined 分支返回 { ok: true }
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 执行
- **现状**: 两处都先读取 `currentValidation`，再等待 lifecycle active；等待结束后没有重新抓取 compiled model，可能直接按旧的 `undefined` 分支返回成功。
- **风险**: submit 前、手动校验、子树校验会漏跑真实 compiled validation，过渡期请求被错误地视为“验证通过”。
- **建议**: `waitForActiveLifecycle()` 返回后必须重新读取 validation owner 当前模型，再决定是否 short-circuit。
- **为什么值得现在做**: 这是验证 owner 核心入口的 correctness defect，会直接影响提交流程判断。
- **误报排除**: 不是已接受的 staged owner 边界；文档明确要求 transitional 期请求等待 active 后不能退化成 clean success。
- **历史模式对应**: 对应 validation owner lifecycle 与请求执行快照脱节的 residual。
- **参考文档**: `docs/architecture/form-validation.md`、`docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-02] `summary-gate` 子作用域在 parent submit 时被当成 `recurse-submit` 执行了实际子校验，跨 scope 边界被打穿

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-submit-flow.ts:255-303`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-draft-controller.ts:203-225`
- **证据片段**:
  ```ts
  // summary-gate 分支先读 child summary state
  // 只要 child 当前 ready/valid，代码仍调用 contract.triggerValidation()
  // detail child 的 triggerValidation() 实际执行 draftForm.validateAll('submit')
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 触发
- **现状**: `summary-gate` 分支不只通过 child summary gating，而是仍递归触发 child 内部 submit 校验。
- **风险**: parent submit 会额外触发 child 内部验证，语义变成半个 `recurse-submit`，破坏跨 scope 验证边界。
- **建议**: `summary-gate` 只应读取 child summary gating 结果，不应递归执行 child submit 校验；递归行为必须仅归属于 `recurse-submit`。
- **为什么值得现在做**: 这是 submit 语义分类的 live contract break，不修会继续误导 nested draft owner 行为。
- **误报排除**: 这不是 staged owner 自带的验证传播；是明确的策略名和真实执行行为不一致。
- **历史模式对应**: 对应 nested validation scope 边界被 submit 递归打穿的残留缺陷。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 未复核

### [维度08-03] `object-field`、`array-field`、`detail-field` 在非 form owner 下丢失当前 `ValidationScopeRuntime`，导致 `showErrorOn` 与 required 展示退回默认值

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\field-utils\field-presentation.tsx:22-84`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx:226-229`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:276-279`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:61-64`
- **证据片段**:
  ```ts
  useFieldPresentation(name, parentForm, ...)
  // 第二参应为当前 validation owner；在非 form owner 场景这里变成 undefined
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 结果展示
- **现状**: 这几个调用点把 `parentForm` 传给 `useFieldPresentation` 作为 owner；在 page/root 或 surface-root 非 form owner 下会退回默认 `showErrorOn` 和 required 展示。
- **风险**: 非 form owner 中错误展示时机错误，required 星号和动态 required 展示错误，导致验证 UI 与实际 owner baseline 脱节。
- **建议**: 第二参应统一传当前 `ValidationScopeRuntime`，而不是只传 `FormRuntime`；让非 form owner 也能读到正确 validation model。
- **为什么值得现在做**: 当前 live baseline 已支持非 form validation owner，这条缺陷会让一整类高级字段在该主路径上退化。
- **误报排除**: 这不是动态边界尚未收敛；是支持基线已存在而实现仅在 form owner 下正确。
- **历史模式对应**: 对应 field presentation hook 将 form owner 错当 validation owner 的真实残留。
- **参考文档**: `docs/architecture/form-validation.md`、`docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

### [维度08-04] detail value-adaptation 错误发布没有把相对 issue path rebasing 到 owner 路径，嵌套错误会挂错位置

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\value-adaptation-helper.ts:104-111`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:202-204`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:378-380`
- **证据片段**:
  ```ts
  path: issue.path ?? fieldPath;
  // 若 fieldPath = profile 且 issue.path = email，则当前会写到 email，而不是 profile.email
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 结果展示
- **现状**: helper 直接把 `issue.path` 或 `fieldPath` 写入 owner 错误存储，没有把相对 issue path rebasing 到 owner 路径。
- **风险**: 嵌套 detail/object 草稿校验错误可能不显示在正确字段上，还可能污染同 owner 下错误 bucket。
- **建议**: 对嵌套 issue path 做 owner-local absolute path rebase，例如 `fieldPath.issue.path`。
- **为什么值得现在做**: 错误路径挂错会直接影响用户定位与验证 UI 可信度。
- **误报排除**: 不是单纯错误文案问题；是 owner-path 存储契约被破坏。
- **历史模式对应**: 对应 nested detail validation issue path 错位的真实缺陷。
- **参考文档**: `docs/architecture/form-validation.md`
- **复核状态**: 未复核

### [维度08-05] detail value-adaptation 成功时用 `clearErrors(fieldPath)` 清空整条路径错误，违反 external overlay 的 source-local 清理规则

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\value-adaptation-helper.ts:97-99`
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-owner-external-errors.ts:71-122`
- **证据片段**:
  ```ts
  if (result.valid) {
    form.clearErrors(fieldPath);
  }
  ```
- **严重程度**: P1
- **验证生命周期阶段**: 结果展示
- **现状**: `publishValidateResultErrors()` 在 `result.valid` 时直接 `clearErrors(fieldPath)`，会把 compiled/object/array/runtime-registration 等已有错误一并删掉，而不是只清 `value-adaptation:<fieldPath>` 这类 overlay。
- **风险**: 一次成功的 `validateValueAction` 可能误清真实编译规则错误或聚合错误，导致 validation state 失真。
- **建议**: 改为 source-local merge/replace/clear，只移除当前 value-adaptation overlay 对应的错误源。
- **为什么值得现在做**: 这是错误来源隔离的基线契约，误清错误会直接影响提交与错误展示正确性。
- **误报排除**: 不是“清空错误更干净”的实现选择；owner docs 已明确 external/runtime overlay 要 source-local 合并与清理。
- **历史模式对应**: 对应 external overlay 清理越权的真实 defect。
- **参考文档**: `docs/architecture/form-validation.md`、`docs/references/form-validation-execution-details.md`
- **复核状态**: 未复核

## 初审排除项

- hidden 字段策略：已见隐藏父路径时清 descendant errors/validating 并 abort descendant async。
- `fieldStates` 单一来源：当前仍是单 map 主导，未见新的多源漂移。
- async validation stale suppression：runId/generation/abort/hidden subtree invalidation 主链路成立。
- object/array/variant 的 projected owner / inherit-owner 代理本身：结合 calibration 与 reopened adjudications，本轮不误报已接受的动态边界或 staged owner 语义。

## 维度复核结论

- [维度08-01]：保留 (P1)。等待 owner active 后继续使用旧 validation 快照。
- [维度08-02]：保留 (P1)。`summary-gate` 实际递归触发 child submit 校验。
- [维度08-03]：保留 (P1)。advanced 字段在非 form owner 下丢失当前 `ValidationScopeRuntime`。
- [维度08-04]：保留后经子项复核降级为 P2。错挂问题仍存在，但范围收窄到 helper 的 form-owner 发布路径。
- [维度08-05]：保留 (P1)。成功分支直接清 path error bucket，会越权清掉同 path 非本来源错误。

## 子项复核结论

- [维度08-01]：成立。`validateForm()` / `validateSubtree()` 等待后未重读 `currentValidation`。
- [维度08-02]：成立。`summary-gate` 路径仍调用 `triggerValidation()`，detail child 会执行 `validateAll('submit')`。
- [维度08-03]：成立。`useFieldPresentation` 的 owner 参数仍被错误地传成 `parentForm`。
- [维度08-04]：降级。错挂问题只在 helper 的 form-owner 分支仍成立。
- [维度08-05]：成立。`clearErrors(fieldPath)` 会清掉同 path 整桶错误，而非仅当前 source。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                               | 一句话摘要                                          |
| ----- | -------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| 08-01 | P1       | `packages/flux-runtime/src/form-runtime-owner.ts`                                  | 等待 active 后仍使用旧 validation 快照              |
| 08-02 | P1       | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                            | `summary-gate` 实际递归触发 child submit 校验       |
| 08-03 | P1       | `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`       | non-form owner 下丢失当前 `ValidationScopeRuntime`  |
| 08-05 | P1       | `packages/flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts` | value-adaptation 成功时越权清掉同 path 非本来源错误 |
