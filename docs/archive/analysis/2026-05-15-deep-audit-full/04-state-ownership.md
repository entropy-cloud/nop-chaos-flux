# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] `object-field` 在 async `transformOutAction` 失败后保留本地 working value，导致界面值与父 owner 提交值长期分叉

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\object-field.tsx`
- **证据片段**:
  ```ts
  261:       if (usesWorkingValue) {
  262:         setResolvedValue(nextWorkingValue);
  263:       }
  265:       if (schemaProps.transformOutAction) {
  274:         if (isPromiseLike(committedValue)) {
  277:           void committedValue
  304:             .catch((error: unknown) => {
  309:               console.warn('[object-field] transformOut failed', error);
  312:               if (getPendingTransformOut(pendingTransformOutOwner) === committedValue) {
  313:                 setPendingTransformOut(pendingTransformOutOwner, null);
  314:               }
  ```
- **严重程度**: P1
- **现状**: 编辑子字段时，renderer 先把本地 `resolvedValue` 更新为新 working value，再异步把 `transformOutAction` 结果写回父 form/scope。若异步提交失败，代码只清掉 pending 并打日志，不回滚本地值，也不把该失败转成阻断性的 owner 状态。
- **风险**: 用户看到的是新值，但父 owner 中的 canonical value 仍是旧值；后续整表单校验/提交可继续基于旧值通过，形成静默数据丢失。
- **建议**: 失败后必须收敛到单一事实源，至少回滚 `resolvedValue` 到 `rawValue`，或将该字段置为阻断性错误/invalidating 状态，禁止父提交在 pending/failed 后把旧值当成功提交值。
- **为什么值得现在做**: 这是 live inline 编辑主路径上的可见错配，不是未来收敛问题；用户会直接看到“界面已改、提交仍旧值”的违约行为。
- **误报排除**: 这不是 calibration pattern #8 的纯 UI 状态，也不是 reopened adjudication #4 里可接受的 draft cache：这里在 async 失败后没有独立 staged owner/confirm 边界继续托管该 draft，却让本地值长期压过父 owner 展示；也不是 `use-surface-renderer.ts` 的 plan 211 旧问题。
- **历史模式对应**: 对应 `reopened-design-decisions-and-audit-adjudications.md` 第 4 条，但本例已越界成真实 residual：失败后 local draft 与 parent-owned committed value 长期分叉，并可进入用户可见的提交/持久化故障。
- **参考文档**: `docs/architecture/object-field.md`、`docs/architecture/value-adaptation-and-detail-field.md`、`docs/architecture/form-validation.md`、`docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核
- **双状态详情**: 本地状态：`resolvedValue` / projected child scope / projected child form；canonical owner 状态：父 `FormRuntime` 或父 `ScopeRef` 中的 `rawValue` / committed value。
- **同步失败症状**: 编辑 `object-field` 子字段后 `transformOutAction` reject，当前控件继续显示已编辑值，但父 owner 仍保留旧值；后续 submit/validate 走父 owner 时提交旧 payload，用户可见为“界面改了但保存没生效”。

## 检查范围

- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts`
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
- `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts`
- `packages/flux-renderers-form/src/renderers/input.tsx`
- `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flow-designer-renderers/src/designer-page-body.tsx`
- `packages/flow-designer-renderers/src/designer-tree-mode.tsx`
- `packages/flow-designer-renderers/src/designer-page-inner.tsx`
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`

### 初审排除项

- `array-editor` / `key-value` 当前是 ref 桥接，不再是旧 bug 06 的无同步双状态。
- `CheckboxGroup` / `TreeSelect` 仅见局部 UI 状态或直接走 field controller，无真实第二事实源。
- `variant-field` 当前本地 selector 状态已按 owner-derived active key 收敛，未证明新的 live residual。
- `detail-field` / `detail-view` 属 staged child owner，不属于“同一事实源被 local/store 双持有”的当前缺陷。
- 设计器 `treeDocument` props-to-state 仍像 tradeoff，但本轮未证明当前 baseline 下的数据丢失或用户可见故障，故不报。

## 深挖第 2 轮追加

### [维度04-02] `detail-field` / `detail-view` 在 commit 后置校验失败时，先把变换后的值写进父 owner，再保持 draft 打开，造成“未提交”界面与已污染父值并存

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx`；`C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx`
- **证据片段**:

  ```ts
  // detail-view.tsx
  269:       if ('patch' in draftValues && Array.isArray(draftValues.patch)) {
  273:           parentForm.setValues(
  278:             parentScope.update(`${scopePath}.${p.path}`, p.value);
  299:         if (parentForm) {
  300:           parentForm.setValue(scopePath, commitValue);
  302:           parentScope.update(scopePath, commitValue);
  306:       if (parentForm) {
  307:         return await settleParentValidation();
  317:       return await validateCommittedDraftLocally(draftValues);
  ```

  ```ts
  // detail-field.tsx
  235:       if (parentForm) {
  236:         parentForm.setValue(name, writeback);
  239:         parentScope.update(name, writeback);
  242:       const fieldValidationResult = await settleParentValidation();
  246:       if (!fieldValidationResult) {
  247:         return;
  250:       closeDraft();
  ```

- **严重程度**: P1
- **现状**: 这两个 staged editor 都把 `transformOutAction` 结果先发布到父 `FormRuntime` / 父 `ScopeRef`，再做 parent commit validation。若后置校验失败，surface 保持打开并显示错误，但父 owner 已经被新值污染。
- **风险**: draft owner 本应“校验成功才提交”；现在却变成“提交后再告诉你没提交成功”。同页 viewer、兄弟字段、数据源、后续 submit/readers 都可能先读到这份被拒绝的值。
- **建议**: 把 writeback 与 revalidate 收敛成原子 commit：先在 child或temporary candidate 上完成 commit-level 校验，再一次性发布；或失败时严格回滚父 owner。
- **为什么值得现在做**: 这是 detail 主路径的契约违背，且已有测试明确证明“校验失败时 dialog 保持打开”；现在的问题是 dialog 虽没关，父值却已经变了。
- **误报排除**: 这不是可接受的 local draft cache。这里的 draft 已是 `create-owner` staged 边界，按文档应在 commit 成功前隔离；当前代码把 rejected outbound value 泄漏进了父 owner。
- **历史模式对应**: 对应 reopened adjudication #4 的新 residual，但已越界成真实 owner/publication 破坏。
- **参考文档**: `docs/architecture/value-adaptation-and-detail-field.md`、`docs/architecture/form-validation.md`
- **复核状态**: 未复核
- **双状态详情**: 本地状态：child draft `FormRuntime` 中的 working value / draft errors；canonical owner 状态：父 `FormRuntime` 或父 `ScopeRef` 上的 committed subtree value。
- **同步失败症状**: 点击 Confirm 后若 transformOut 产物触发 parent commit 校验失败，dialog 仍打开并报错，但外层 viewer / sibling scope 已可能显示失败后的新值。

### [维度04-03] `variant-field` 在非 form owner 下切换 variant 时只改本地 selector，不写回父 owner，导致切换失效或长期与 canonical value 分叉

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx`
- **证据片段**:

  ```ts
  179:   const activeKey = React.useMemo(() => {
  180:     if (matchedKey) return matchedKey;
  182:     if (userSelectedKey) return userSelectedKey;
  184:   }, [matchedKey, detectedKey, userSelectedKey, initialKey]);

  273:   const handleVariantSwitch = React.useCallback(
  279:       if (parentForm) {
  321:         parentForm.setValue(name, nextValue);
  322:         parentForm.touchField(name);
  329:       setUserSelectedKey(key);
  ```

- **严重程度**: P1
- **现状**: 切换逻辑只在 `parentForm` 分支里执行 migration / `initialValue` writeback。对 page-root / non-form owner，代码最终只 `setUserSelectedKey(key)`，但 `activeKey` 又优先跟随 `matchedKey`，即父 owner 当前值推导结果。
- **风险**: 非 form 场景下，用户切换 variant 可能立刻被 canonical match 打回旧分支；即使暂时切过去，也没有把目标 variant 初始值或迁移结果写进父 owner，形成“selector 说已切换，owner 仍是旧值”的双源状态。
- **建议**: 非 form owner 路径必须与 form 路径等价地完成 switch migration，并把结果写回父 `ScopeRef` / parent validation owner，再让 `matchedKey` 从新的 canonical value 重新判定。
- **为什么值得现在做**: 文档已把 page/root non-form owner 列为支持基线；当前实现会让这条主路径上的 variant switch 失效或半失效。
- **误报排除**: 这不是纯 UI selector state。这里的 `userSelectedKey` 被拿来承载本应由父 owner 提交的 variant switch 事务，但 parent-owned canonical value 没有同步更新。
- **历史模式对应**: 不属于 adjudication #4 中可接受的 draft cache；这是 live supported owner family 上的实际切换故障。
- **参考文档**: `docs/architecture/variant-field.md`、`docs/architecture/form-validation.md`
- **复核状态**: 未复核
- **双状态详情**: 本地状态：`userSelectedKey` / `detectedKey`；canonical owner 状态：父 `FormRuntime` 或父 `ScopeRef` 中的 `name` 对应值及其 `matchedKey`。
- **同步失败症状**: 在 page/root 非 form 场景点击切换后，分支可能立即弹回旧 variant，或只切了展示分支但父 owner 仍保留旧值，初始值/迁移结果未落地。

### [维度04-04] table quick-edit 把未保存或保存失败的草稿直接写进共享 `rowScope.record`，使同一行 sibling actions 或 expanded content 读取 draft，而表格 canonical row 仍是旧值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\table-quick-edit-controller.ts`；`C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\table-body-row-rendering.tsx`
- **证据片段**:

  ```ts
  // table-quick-edit-controller.ts
  84:   const handleInlineValueChange = useCallback(
  86:       setDraftValue(nextValue);
  88:         rowScope.update(`record.${field}`, nextValue);
  94:   const runSave = useCallback(async () => {
  114:     } catch (error) {
  115:       setSaveError(error);
  116:       onSaveError?.(error);
  ```

  ```ts
  // table-body-row-rendering.tsx
  216:                           helpers.render(button, {
  217:                             scope: rowScope,
  268:               <TableQuickEditCell
  270:                 rowScope={rowScope}
  271:                 record={entry.record}
  293:             {column.name ? String(entry.record[column.name] ?? '') : ''}
  355:                           cellRegion.render({
  357:                               record: rowScope.get('record'),
  ```

- **严重程度**: P1
- **现状**: quick-edit 输入时立即改写共享 `rowScope.record.*`；若 save 失败，只保留 `saveError`，不回滚 `rowScope`。但同一行别的消费面并不统一：普通单元格读 `entry.record`，button actions / expanded content 却读 `rowScope`。
- **风险**: 同一行会同时存在两份事实源：表格主单元格还是旧值，row-scope actions 或 expanded 区域却已看到新 draft；保存失败后这种分叉持续存在，后续行操作可能基于未提交值执行。
- **建议**: 未保存 draft 不应写进共享 `rowScope.record`。应保留在 cell-local state 或显式 row draft owner 中；只有 save 成功后才发布到共享 row canonical carrier，失败则回滚。
- **为什么值得现在做**: quick-edit 是 CRUD 主路径；当前不仅是视觉不一致，还会把失败草稿暴露给同一行的 action scope。
- **误报排除**: 这不是 adjudication #4 里可接受的“本地 quick-edit cache”。问题不在 `draftValue` 本身，而在它被发布进共享 `rowScope.record`，并被 sibling renderers/actions 当成行 canonical 数据继续消费。
- **历史模式对应**: 对应 reopened adjudication #4 的越界 residual。
- **参考文档**: `docs/architecture/scope-ownership-and-isolation.md`、`docs/architecture/table-row-identity-and-scope-performance.md`
- **复核状态**: 未复核
- **双状态详情**: 本地状态：`draftValue` / `savedValue` / `saveError`；共享但非 canonical 状态：`rowScope.record.*`；canonical owner 状态：`entry.record` / table processed data source。
- **同步失败症状**: 输入后 save 失败，普通表格 cell 仍显示旧值，但 expanded row 或 row button action scope 已读取到新草稿；同一行出现“看见一个值、操作另一个值”的分叉。

## 维度复核结论

- [维度04-01]：保留后经子项复核驳回。当前 `object-field` 的 adapted working value 属文档允许的适配态，不足以构成 P1 owner 违约。
- [维度04-02]：保留 (P1)。先写父 owner 再做 parent commit validation，违背 staged child owner 在 commit 成功前不影响父 scope 的基线。
- [维度04-03]：保留 (P1)。non-form owner 切换只改本地 selector、不写回父 owner。
- [维度04-04]：保留 (P1)。quick-edit 直接改 `rowScope.record` 且同一行混用 `entry.record` 与 `rowScope.record`。

## 子项复核结论

- [维度04-01]：驳回。`object-field` 持有 adapted working value 属受支持适配态。
- [维度04-02]：成立。父 owner 污染发生在 commit-level 校验之前。
- [维度04-03]：成立。non-form owner 缺少 canonical writeback。
- [维度04-04]：成立。row scope 与 row canonical payload 并行存在且会被不同消费面读取。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                             | 一句话摘要                                            |
| ----- | -------- | -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 04-02 | P1       | `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`          | detail commit 在父 owner 写回后才做 parent validation |
| 04-03 | P1       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`      | non-form variant switch 未写回父 owner                |
| 04-04 | P1       | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts` | quick-edit 草稿直接发布进共享 `rowScope.record`       |
