# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] 父表单提交无法中止子校验，子 owner 挂死时会把 `submitting` 永久卡住

- **文件**: `packages/flux-runtime/src/form-runtime-submit-flow.ts`; `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts`
- **证据片段**:

  ```ts
  const childValidationPromises: Promise<ValidationResult>[] = [];
  for (const contract of childContractsSnapshot) {
    if (contract.mode === 'recurse-submit') {
      childValidationPromises.push(contract.triggerValidation());
    }
  }

  if (childValidationPromises.length > 0) {
    const childResults = await Promise.all(childValidationPromises);
  }
  ```

- **严重程度**: P1
- **问题类别**: 取消安全
- **异步操作**: 表单提交流程中的子 owner `triggerValidation()` / `draftForm.validateAll('submit')`
- **竞态场景或吞掉路径**: 父 `submit(options.signal)` 被中止后，代码没有把 signal 传给子 contract，也没有在 `await Promise.all(childValidationPromises)` 前后重新检查取消；只要某个子校验悬挂，父 submit 就一直不返回。
- **用户可见故障**: 提交按钮 loading 一直不消失，`submitting` 一直为 true；后续点击又会被并发保护直接拒绝，整张表单只能靠刷新恢复。
- **建议**: 给 child contract 增加 `signal` 透传；`executeFormSubmit()` 在等待子校验前后都检查 abort；对子校验使用可取消/可降级的聚合等待，而不是无条件 `Promise.all(...)`。
- **为什么值得现在做**: 这是核心 submit 主路径；一旦命中，就是整表单永久不可提交。
- **误报排除**: 这不是“理论上缺 signal”。当前 contract API 本身没有 signal 位，且父 submit 的 finally 依赖整个 try 结束；子 promise 不 settle 时，状态一定卡死。
- **历史模式对应**: 与 `docs/bugs/07-submit-concurrent-guard-fix.md` 同属提交态与真实异步状态失配问题，只是这次是“永不清除”而不是“过早清除”。
- **参考文档**: `docs/bugs/07-submit-concurrent-guard-fix.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度06-02] 无 validation plan 的 page/surface owner 会永远停在 `bootstrapping`，`validate*` Promise 不会 settle

- **文件**: `packages/flux-runtime/src/runtime-owned-factories.ts`; `packages/flux-react/src/schema-renderer.tsx`; `packages/flux-react/src/hooks/use-form-hooks.ts`; `packages/flux-runtime/src/form-runtime-validation.ts`
- **证据片段**:

  ```ts
  const pageValidation = input.createValidationScopeRuntime({
    ...
    initialLifecycleState: 'bootstrapping',
  });

  useEffect(() => {
    const validationPlan = rootNode.validationPlan;
    if (!validationPlan) {
      return;
    }
  ```

- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: page/surface 级 validation owner 的 `validateAt` / `validateSubtree` / `validateAll`
- **竞态场景或吞掉路径**: page/surface owner 默认以 `bootstrapping` 创建；只有存在 `validationPlan` 时才会 `refreshCompiledModel(...)` 进入 active。没有 plan 的页面/弹层里，hook 仍会把这个 owner 暴露给子组件，随后任何 `validate*` 都会卡在 waiter 上。
- **用户可见故障**: 非 form 包裹的控件在 page/dialog 上触发校验时，校验永远不返回；错误提示不更新，相关 fire-and-forget 校验 promise 持续堆积到卸载。
- **建议**: 无 validation plan 时应直接创建为 `active`，或在 schema mount 时显式把空 owner 激活；至少不要把永远不会激活的 owner 暴露给 `useCurrentValidationScope()`。
- **为什么值得现在做**: 这是框架级 owner 生命周期缺口，不修的话所有“页面级/弹层级但非 form”校验调用都带永久悬挂风险。
- **误报排除**: 不是测试专用状态；page owner 在运行时固定由 `createPageRuntime()` 建立，hook 也会默认回退到它。
- **历史模式对应**: 与 `P5 Predictable async behavior` 的“Promise 必须确定 settle”要求同类。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度06-03] schema prepare 阶段的 import 加载丢失 `AbortSignal`，已废弃准备请求仍会继续占用主路径

- **文件**: `packages/flux-runtime/src/runtime-factory.ts`; `packages/flux-core/src/types/actions.ts`; `packages/flux-runtime/src/import-stack.ts`
- **证据片段**:

  ```ts
  export interface ImportedLibraryLoader {
    load(spec: XuiImportSpec, signal?: AbortSignal): Promise<ImportedLibraryModule>;
  }

  options?.signal?.throwIfAborted?.();
  const promise = importLoader.load(prepared.resolvedSpec);
  ```

- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: `prepareSchema()` 中的 `importLoader.load(...)`
- **竞态场景或吞掉路径**: schema prepare 已经拿到了 `options.signal`，但实际调用 loader 时没有传；请求被 abort 后，旧 import 仍继续加载，并且 `moduleCache.pending` 还会让后续 prepare 复用这条“死请求”的 promise。
- **用户可见故障**: 快速切换 schema / 页面卸载后，过期 import 仍继续下载；下一次渲染可能被旧 pending import 额外阻塞，表现为准备阶段延迟、晚到错误、无意义网络/主机工作。
- **建议**: 在 `runtime-factory.ts` 中改为 `importLoader.load(prepared.resolvedSpec, options?.signal)`；并保留现有 requestId/aborted 检查作为第二层 stale guard。
- **为什么值得现在做**: 这是规范文档明确要求的双层取消之一；而且仓库里 `import-stack.ts` 已经按正确方式透传 signal，当前遗漏是主路径不一致。
- **误报排除**: 不是 loader 不支持取消；类型定义明确支持 `signal`，同仓其他 import 路径也已经透传。
- **历史模式对应**: 与 `P5 Predictable async behavior` 和“旧请求不得继续占用主路径”是同一类问题。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度06-04] `data-source` 的 `parallel` 刷新只在“新请求已 settle”后才丢弃旧 run，先返回的旧请求仍会发布过期 value/error/status

- **文件**: `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts`; `packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts`; `docs/architecture/api-data-source.md`
- **证据片段**:

  ```ts
  const settledRun = settleControllerRunIfNeeded(input, mutable, run, requestSequence, {
    outcome: 'succeeded',
  });

  if (settledRun?.outcome === 'stale-dropped') {
    updateControllerState(input, mutable, (current) => current);
    return;
  }

  mutable.latestSettledRequestSequence = Math.max(
    mutable.latestSettledRequestSequence,
    requestSequence,
  );

  publishControllerData(input, mutable, mappedValue);
  ```

- **严重程度**: P2
- **问题类别**: 竞态
- **异步操作**: `action` 型 `data-source` 在 `control.dedup: 'parallel'` 下的并发 refresh
- **竞态场景或吞掉路径**: 旧请求 A 先启动，新请求 B 成为 current run；若 A 比 B 更早 settle，当前 stale-drop 逻辑仍允许 A 发布旧 payload/status/error。
- **用户可见故障**: 界面会短暂甚至长时间显示过期数据；旧 run 还能先清掉 loading、写入 stale error/failureReason，直到新 run 后续再覆盖。
- **建议**: `parallel` 模式应只允许 current/authoritative run 发布 value 与 status；对非 current run 统一记为 `stale-dropped`，不发布 payload/error/status。
- **为什么值得现在做**: 这是 data-source 主路径的并发一致性缺口，直接影响 `statusPath`、scope published value 和 host error reporting。
- **误报排除**: 不是“旧请求晚于新请求返回时应 stale-drop”的已覆盖场景；现有测试恰好证明了相反顺序下旧请求会先发布旧数据。
- **历史模式对应**: stale response race / authoritative-run gating 缺失
- **参考文档**: `docs/architecture/api-data-source.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度06-01]: 保留 (P1)。父 submit 仍无法中止子校验，子 owner 挂死会卡住 `submitting`。
- [维度06-02]: 保留 (P2)。无 validation plan 的 page/surface owner 仍可能永久停在 `bootstrapping`。
- [维度06-03]: 保留 (P2)。schema prepare 主路径仍遗漏 import loader 的 `AbortSignal` 透传。
- [维度06-04]: 保留 (P2)。`parallel` data-source 仍允许先返回的旧 run 发布 stale value/status/error。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                         | 一句话摘要                                                      |
| ----- | -------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 06-01 | P1       | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                      | 父提交无法中止子校验，悬挂时会永久卡住提交态                    |
| 06-02 | P2       | `packages/flux-runtime/src/runtime-owned-factories.ts`                       | 无 validation plan 的 page/surface 校验 Promise 可能永不 settle |
| 06-03 | P2       | `packages/flux-runtime/src/runtime-factory.ts`                               | schema prepare 丢失 import loader 的 abort 透传                 |
| 06-04 | P2       | `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts` | `parallel` 模式允许旧 run 先发布 stale 结果                     |
