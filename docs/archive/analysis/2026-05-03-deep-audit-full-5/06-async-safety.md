# 06 异步模式与取消安全

- 初审发现数: 3
- 维度复核: 完成
- 子项复核: 3
- 最终结果: 保留 3 / 降级 0 / 驳回 0

## 保留

### [维度06] create dialog 只有 UI disabled，没有方法级并发 guard

- **文件**: `packages/flow-designer-renderers/src/designer-page.tsx:227-248,436-445`
- **证据片段**:
  ```tsx
  const handleConfirmCreateDialog = useCallback(async () => {
    if (!pendingCreateDialog) {
      return;
    }
    setCreatingNode(true);
  ```
- **严重程度**: P1
- **现状**: `handleConfirmCreateDialog()` 未在方法入口检查 `creatingNode`，只靠按钮 `disabled={creatingNode}` 避免重复提交。
- **风险**: 双击在禁用重渲染前可重入，导致重复 `addNode`。
- **建议**: 在方法入口增加并发 guard，并与当前创建流程绑定 token/AbortSignal。
- **为什么值得现在做**: 它命中仓库已有的并发提交历史缺陷模式。
- **误报排除**: 这不是“UI 上已 disabled 就安全”的误报；Bug 07 已明确要求方法级 guard。
- **历史模式对应**: UI flag 代替方法 gate。
- **参考文档**: `docs/bugs/07-submit-concurrent-guard-fix.md`
- **复核状态**: 子项复核通过

### [维度06] `revalidateDependents(...)` 的 fire-and-forget 调用漏掉 rejection 处理

- **文件**: `packages/flux-runtime/src/form-runtime.ts:444`, `packages/flux-runtime/src/form-runtime-array.ts:194`
- **证据片段**:
  ```ts
  void ownerRuntime.revalidateDependents(name, 'change');
  ```
  ```ts
  void ctx.revalidateDependents(ctx.arrayPath, 'change');
  ```
- **严重程度**: P2
- **现状**: 两个调用点直接 `void` 掉 `revalidateDependents(...)`，没有 `.catch(...)`；而同仓库 `executeSetValues()` 已专门使用失败处理 helper。
- **风险**: 依赖字段校验异常会形成未处理 rejection，导致错误状态缺失或验证结果停留在旧值。
- **建议**: 对齐 `form-runtime-values.ts` 的处理方式，统一接入 dependent revalidation failure handler。
- **为什么值得现在做**: 这是同一模块内不一致的异步失败处理，根因清晰、修复成本低。
- **误报排除**: 子项复核确认异常源真实存在，且 `VALIDATION_CANCELLED` 之外的错误会继续抛出。
- **历史模式对应**: fire-and-forget promise 漏掉 rejection 路径。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 子项复核通过

### [维度06] word editor 保存入口缺少 catch 和失败反馈

- **文件**: `packages/word-editor-renderers/src/word-editor-page.tsx:212-236,378-387`, `packages/word-editor-renderers/src/hooks/use-word-editor-shortcuts.ts:68-71`
- **证据片段**:

  ```tsx
  const handleSave = useCallback(async () => {
    const result = await actionProvider.invoke('save', undefined, {} as any);
  }, [actionProvider]);

  onClick={() => void handleSave()}
  ```

- **严重程度**: P2
- **现状**: `handleSave()` 只有 `try/finally`，没有 `catch`；按钮和快捷键都把 async 保存当 fire-and-forget 使用。
- **风险**: `saveEvent` reject 时，界面缺少明确失败提示，还可能留下未处理 rejection。
- **建议**: 在 `handleSave()` 内部统一 catch，并写入用户可见失败状态；快捷键入口通过 `Promise.resolve(...).catch(...)` 对齐。
- **为什么值得现在做**: 所有保存入口都汇聚到同一处，修一次即可覆盖按钮与快捷键。
- **误报排除**: 子项复核确认 `actionProvider.invoke('save')` 存在真实 reject 源，不是理论上的异常路径。
- **历史模式对应**: async UI 入口缺少失败反馈与 promise 收口。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 子项复核通过
