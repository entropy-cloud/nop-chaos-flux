# subagent-b-summary

- 发现者：独立子 agent B
- 方向：action-core 调度与控制流
- 是否发现新问题类别：是 (1 个)
- 是否只是扩大已有问题影响范围：否
- 该轮结束后是否已耗尽：是

## 确认问题

- ECT-001: withRetry failureCount 在 soft-fail 路径少计 1 次
  - `operation-control.ts:221-223` break 路径不增加 failureCount
  - throw 路径正确计数，soft-fail 路径不一致

## 否定的候选

- then branch failure replaces outer result — by design
- onError branch result discarded when continueOnError false — by design
- ok:false + skipped:true neutral — by design
- ok:true + cancelled:true + timedOut:true error undefined — by design

## 测试文件

- `packages/flux-action-core/src/__tests__/contract-control-flow-edge-cases.test.ts` (29 tests)
- `packages/flux-action-core/src/__tests__/contract-retry-and-classification.test.ts` (11 tests)
