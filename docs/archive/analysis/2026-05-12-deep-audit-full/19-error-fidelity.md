# 维度 19：错误传播保真度

## 范围与状态

- 审核范围：错误、重试、失败原因在 action/runtime/package 边界传递时是否保留语义和根因。
- 资料来源：仅使用同目录 `stage-1-full-findings-16-20.md`、`raw-findings-07-20.md`、`final-review-results-16-20.md`、`summary.md`。
- 最终状态：保留 2 项，驳回 0 项。
- 严重程度分布：P2 2 项。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 19-01。
- 第 2-5 轮追加 raw findings 发现 19-02。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核保留 2 项。19-01 从 P1 降级为 P2 并改窄：广义 “ajax skips retry” 表述过宽，ajax 已委托 request runtime retry 且有测试，剩余问题主要是 `submitForm` action-level retry 被跳过。19-02 保留为 Word editor save 错误根因丢失。

## 最终保留项

### [19-01] `submitForm` action-level retry 被 request-backed special path 跳过

- 文件：`packages/flux-action-core/src/action-dispatcher/program-utils.ts:10-12`; `packages/flux-action-core/src/action-dispatcher/action-execution.ts:229-249`, `251-268`
- 证据片段：`isRequestBackedAction(action)` 将 `ajax`、`submitForm`、`submit` 归为 request-backed；`runSingleActionWithRetry()` 对 request-backed action 先调用 `runSingleActionWithTimeout()` 并 early return，common path 才调用 `withRetry()`。
- 严重程度：P2
- 当前行为：原始 finding 称 `ajax/submitForm/submit` 走 special path，不调用 `withRetry()`；最终复核改窄为 `submitForm` action-level retry 被跳过，ajax retry 已委托 request runtime。
- 风险：authoring-level retry controls 对 `submitForm` 这类关键 request-backed action 可能被忽略；soft failures 不重试或计数不一致。
- 建议：让 `submitForm` 等 request-backed actions 也进入 action-layer retry，或明确文档和测试 retry delegated to request runtimes。
- 误报排除：不是 HTTP adapter retry internals；问题是 action dispatcher 的 `control.retry` path 被绕过。最终复核进一步排除了 ajax 作为主问题。
- 最终复核 verdict：降级保留。
- 修订标题/理由：标题由“Request-backed actions 跳过 action-layer retry”改窄为 “`submitForm` action-level retry 被跳过”；理由是 ajax 已委托 request runtime retry 且有测试，广义 claim 误导。

### [19-02] Word editor save 将存储/bridge/序列化错误折叠为泛化失败

- 文件：`packages/word-editor-core/src/document-io.ts:69-97`; `packages/word-editor-renderers/src/word-editor-action-provider.ts:40-49`
- 证据片段：`saveDocument()` catch 所有异常并返回 `null`；action provider 在 `!saved` 时统一返回 `fail('Unable to save word document.')`。
- 严重程度：P2
- 当前行为：`saveDocument()` catch 所有异常并返回 null；action provider 将 null 统一转成 `Unable to save word document.`。
- 风险：quota exceeded、localStorage security exception、serialization failure、bridge data failure 与 no storage/empty document 无法区分，telemetry 和用户反馈丢失根因。
- 建议：返回 `{ ok, saved?, error?, reason? }` 或抛出带 cause 的错误；action provider 保留原始 message/reason。
- 误报排除：不重复 request-backed action retry；这是 word-editor-core 到 renderer action provider 的错误保真损失。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Word editor save catch all errors 返回 null，action provider 映射为泛化失败，丢失 quota/security/serialization/bridge root cause。

## 驳回项

无。
