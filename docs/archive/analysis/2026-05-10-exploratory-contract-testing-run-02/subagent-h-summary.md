# subagent-h-summary

- 发现者：独立子 agent H
- 方向：async data source & API cache
- 是否发现新问题类别：是 (1 个，2 个表现合并)
- 是否只是扩大已有问题影响范围：否
- 该轮结束后是否已耗尽：是

## 确认问题

- ECT-005: generateCacheKey falsy data 碰撞 (已修复)
  - C1: `data:0`/`data:false`/`data:""`/`data:null` 与 `data:undefined` 产生相同缓存键
  - C2: `stableStringify(undefined)` 返回 undefined 而非 string (类型违规，与 C1 同根因)

## 否定的候选

- C3: canonicalizeUrlWithParams array → "1,2,3" — design choice
- C5: Cache TTL exact boundary — by design
- C6: Pre-aborted signal not rejected — contract gap (fetcher responsibility)

## 测试文件

- `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts` (38 tests)
