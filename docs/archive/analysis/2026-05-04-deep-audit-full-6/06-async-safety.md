# 维度 06：异步模式与取消安全

## 复核状态：零 P0/P1/P2，3×P3 观察项保留

### 良好模式确认

- ✅ Submit 并发保护（getIsSubmitting guard + cancelled result）
- ✅ API 请求 dedup（cancel-previous / ignore-new / parallel）
- ✅ DataSource 竞态防护（requestSequence + stale-drop）
- ✅ AbortController per-request + stop() aborts all
- ✅ Polling 清理、Debounce 清理完整
- ✅ Action retry/timeout + signal propagation
- ✅ Error reporting 不静默吞掉

### P3 观察项

1. `reaction-runtime.ts:321` — void Promise.resolve().then(invoke) 无 .catch()（内部已有 try/catch，当前安全）
2. `reaction-runtime.ts:267/313/318` — void runReaction() 模式（已有内部 catch）
3. `import-stack.ts:96` — bare catch {} 用于 intentional retry

### 复核状态：维度复核通过（runReaction 确认有 try/catch 包裹）
