# subagent-f-summary

- 发现者：独立子 agent F
- 方向：runtime scope & ownership 边界
- 是否发现新问题类别：是 (1 个)
- 是否只是扩大已有问题影响范围：否
- 该轮结束后是否已耗尽：是

## 确认问题

- ECT-004: isolated scope get()/has() 仍穿透父链
  - `scope.ts:290-312` 的 `resolveScopePath` 无条件遍历 `scope.parent`，不检查 isolation
  - `readVisible()` 和 `materializeVisible()` 正确遵守 isolate flag
  - 低层 get()/has() 不遵守

## 测试文件

- `packages/flux-runtime/src/__tests__/scope-ownership-edge-cases.test.ts` (110 tests)

## 否定的候选

- scopeChangeHitsDependencies 空 paths 当作 wildcard — normalizeRootPaths([]) 返回 []，不匹配
- readVisible() 返回非 flat object — by design (prototype-based inheritance)
