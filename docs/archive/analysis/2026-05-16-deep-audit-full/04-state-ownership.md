# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] `object-field` 在 `transformOutAction` 失败后保留本地 working value

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:265-314`
- **证据片段**:
  ```ts
  if (usesWorkingValue) {
    setResolvedValue(nextWorkingValue);
  }
  if (schemaProps.transformOutAction) {
    void committedValue.catch((error: unknown) => {
      console.warn('[object-field] transformOut failed', error);
    });
  }
  ```
- **严重程度**: P2
- **现状**: 初审认为 local working value 与 parent owner 可能长期分叉。
- **风险**: 若判断错误，会把当前允许的 adapted draft tradeoff 当成 owner defect。
- **建议**: 交由独立复核确认是否已越过 reopened adjudication 边界。
- **为什么值得现在做**: 该模式历史上高频被重开，必须复核。
- **误报排除**: 暂不直接保留为最终问题。
- **历史模式对应**: reopened adjudication #4。
- **参考文档**: `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

### [维度04-02] `table-quick-edit-controller` 用单字段快照决定是否重建整行 draft

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:207-215`
- **证据片段**:
  ```ts
  const nextValue = toOptionalDraftValue(record, field);
  const fieldChanged = lastFieldRef.current !== field;
  const valueChanged = lastRecordValueRef.current !== nextValue;
  if (!fieldChanged && !valueChanged) {
    draftRecordRef.current = { ...record };
  }
  ```
- **严重程度**: P2
- **现状**: whole-row draft 的 reset/preserve 判定只盯住配置字段快照。
- **风险**: custom-body 或多字段草稿有机会被覆盖。
- **建议**: 复核后按 residual 范围决定保留级别。
- **为什么值得现在做**: 该控制器位于 CRUD quick-edit 主路径。
- **误报排除**: 不是旧的广义 row identity churn 问题，而是更窄的 residual 候选。
- **历史模式对应**: table quick-edit local draft tradeoff residual。
- **参考文档**: `docs/architecture/table-row-identity-and-scope-performance.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度04-03] `detail-field` 在 commit 失败时已先把值写入父 owner，且不会在校验失败后回滚

- **文件**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:245-257`
- **证据片段**:
  ```ts
  if (parentForm) {
    parentForm.setValue(name, writeback);
    parentForm.touchField(name);
  } else {
    parentScope.update(name, writeback);
  }
  const fieldValidationResult = await settleParentValidation();
  if (!fieldValidationResult) {
    return;
  }
  ```
- **严重程度**: P1
- **现状**: 父 owner 在 commit-level 校验完成前已被写入，校验失败时 draft 保持打开但父值已被污染。
- **风险**: 外层 viewer、兄弟节点或后续提交会读到未通过校验的“失败写回值”。
- **建议**: 改为原子 commit，或在失败时严格回滚父 owner。
- **为什么值得现在做**: 这是 staged editor 主路径的真实 owner 泄漏。
- **误报排除**: 不属于允许的 local draft cache；这里越过了 child owner 到 parent owner 的发布边界。
- **历史模式对应**: staged owner atomicity breach。
- **参考文档**: `docs/architecture/form-validation.md`、`docs/architecture/value-adaptation-and-detail-field.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度04-01]：驳回。仍属于已裁定的 adapted/local working-state tradeoff，证据不足以重开。
- [维度04-02]：降级为 P2。问题真实，但范围更窄，应表述为 custom-body / multi-field residual overwrite 风险。
- [维度04-03]：保留 (P1)。先写父 owner 再校验且失败不回滚，已越过当前基线。

## 子项复核结论

- [维度04-03]：`detail-revalidation.test.tsx` 也证明了“父写回先发生，失败后 draft 仍保持打开”，复核通过。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                     | 一句话摘要                                              |
| ----- | -------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 04-03 | P1       | `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:245-257`         | `detail-field` commit 失败时不会回滚已写入父 owner 的值 |
| 04-02 | P2       | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:207-215` | whole-row draft 的保留/重置只由单字段快照控制           |
