# 维度 19：错误传播保真度

## 初审

- 初审提出 3 条：import cause 丢失、`ok:false` 重试元数据丢失、data-source `retry/backoff` compile/runtime 传递链丢失。

## 维度复核

- 三条均保留，且其中后两条需要逐段复核 compile/runtime 链路。

## 最终结论

### [维度19] runtime-factory 预加载导入错误丢失原始 cause/stack

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:290-293`, 对照 `packages/flux-runtime/src/import-stack.ts:54-61,272-277`
- **证据片段**:
  ```ts
  throw new Error(`Imported namespace ${prepared.spec.as} failed to load: ${...}`);
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: preload/import prepare 路径只保留拼接后的 message，原始异常类型与 stack 丢失。
- **修复建议**: 使用 `cause` 或复用 `import-stack` 的包装逻辑。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: `子项复核通过`

### [维度19] `ok:false` 请求失败在重试耗尽后丢失 `attempts` / `failureCount`

- **文件**: `packages/flux-runtime/src/async-data/request-runtime.ts:298-327`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts:226-240`
- **证据片段**:
  ```ts
  if (!response.ok) {
    throw new Error((responseData as { message: string }).message);
  }
  ```
- **严重程度**: P2
- **类别**: 计数遗漏
- **影响**: request-backed action / data-source 失败结果会丢失重试元数据，调试和监控保真度不足。
- **修复建议**: 在 `ok:false` 抛错前把 retry metadata 挂到错误或失败结果对象上。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: `维度复核通过`

### [维度19] data-source 顶层 `retry/backoff` 在 compile/runtime 传递链中丢失

- **文件**: `packages/flux-core/src/types/actions.ts:35-56`, `packages/flux-compiler/src/source-compiler.ts:39-55`, `packages/flux-core/src/types/compilation.ts:294-299`, `packages/flux-runtime/src/async-data/source-registry.ts:138-144`
- **证据片段**:
  ```ts
  retry?: OperationControlConfig['retry'];
  ```
  ```ts
  return { dedup, throttle, cacheTTL, cacheKey };
  ```
- **严重程度**: P1
- **类别**: 错误传播 / 运行控制链丢失
- **影响**: type surface 与 runtime executor 都允许 `control.retry`，但 data-source compile/runtime 链中间直接丢掉了该能力。
- **修复建议**: 让 compiled type、source compiler、source registry 一起透传 `retry`，并补回归测试。
- **参考文档**: `docs/architecture/api-data-source.md`
- **复核状态**: `维度复核通过`
