# 维度06 异步模式与取消安全

- 初审发现数: 3
- 复核结果: 保留 2 / 降级 1 / 驳回 0

### [维度06] `validateForm()` 会吞掉真实校验崩溃

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:269-279,391-395`, `packages/flux-runtime/src/form-runtime-validation.ts:444-451`
- **证据片段**:

```ts
const settledResults = await Promise.allSettled(...)
if (settled.status === 'rejected') {
  continue;
}
```

- **严重程度**: P1
- **问题类别**: 异常吞掉
- **现状**: 非取消语义的字段校验 reject 会被直接跳过，最终 `ok` 只按剩余错误计算。
- **风险**: 表单可能把真实校验崩溃当成“无错误”放行。
- **建议**: 将 rejected 校验统一转成表单失败或 synthetic validation error，并上报 monitor。
- **为什么值得现在做**: 仓内测试已固化当前吞错行为，说明这是稳定存在的 live 风险。
- **误报排除**: 正常取消已通过 `VALIDATION_CANCELLED` 单独处理；这里是未处理异常。
- **历史模式对应**: swallowed rejection on critical path。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `子项复核通过`

### [维度06] formula data-source refresh 失败后状态不正确 settle

- **文件**: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:75-140,194-196`, `packages/flux-runtime/src/async-data/source-registry.ts:194-196`
- **证据片段**:

```ts
void source.refresh().catch((error) => {
  console.warn('[source-registry] refresh failed', error);
});
```

- **严重程度**: P2
- **问题类别**: 取消安全 / 异常吞掉
- **现状**: refresh 失败后只有 `console.warn`，controller state 没有统一落到 failed/error settle。
- **风险**: source 可能卡在 fetching，UI 显示陈旧数据或长期 loading。
- **建议**: 为 formula source 补齐与 API source 一致的 error settle / monitor 路径。
- **为什么值得现在做**: 该路径已是 runtime 异步 owner，状态半结算会直接影响调试和用户反馈。
- **误报排除**: 不是 fire-and-forget 本身，而是没有正确 settle 异步状态。
- **历史模式对应**: warn-only async failure。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `维度复核通过`

### [维度06] refresh/dispose 只 clear validation controllers，未先全量 abort

- **文件**: `packages/flux-runtime/src/form-runtime-owner-lifecycle.ts:44-48,125-128`, `packages/flux-runtime/src/form-runtime-validation.ts:99-123`
- **证据片段**:

```ts
args.sharedState.validationAbortControllers.clear();
```

- **严重程度**: P3
- **问题类别**: 取消安全
- **现状**: 已在飞的 async validator 可能继续跑到结束，只是最终结果通常被 stale guard 丢弃。
- **风险**: 产生无意义请求和调试噪声。
- **建议**: refresh/dispose 时先遍历 `abort()` 再 `clear()`。
- **为什么值得现在做**: 修复面小，能补齐取消语义闭环。
- **误报排除**: 这不是 stale guard 缺失，而是 in-flight 请求未被真正取消。
- **历史模式对应**: clear-without-abort。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: `已降级`
