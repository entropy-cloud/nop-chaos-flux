# Round 03 - Compiler To Runtime Handoff Review

## Findings

### 1. P1 | 跨层断层 / 契约未覆盖

- 契约：`TemplateNode.structuralWhen` 的 compiler/runtime handoff 必须被 live runtime/react 路径真正消费，而不是只在编译侧生成、文档侧声明。
- 位置：
  - 实现：`packages/flux-compiler/src/schema-compiler/node-compiler.ts`，`packages/flux-runtime/src/node-runtime.ts`，`packages/flux-react/src/node-renderer-resolved.tsx`，`packages/flux-react/src/node-renderer-effects.ts`
  - 测试：`packages/flux-react/src/__tests__/schema-renderer-runtime-monitoring.test.tsx`
  - 文档：`docs/architecture/renderer-runtime.md`
- 现状：
  - 编译侧会把 `when` lowering 到 `structuralWhen`。
  - 但 live code 中 `node-runtime` 解析的仍是 `metaProgram.when`，`node-renderer-resolved` 和 `node-renderer-effects` 也只依据 `resolvedMeta.when` / `visible` / `hidden` gating。
  - 现有回归只验证 `when: false` 的可见行为和 lifecycle 不触发；即使 `structuralWhen` 完全是死字段，这些测试仍会绿，因为行为仍由 `meta.when` 驱动。
- 为什么 coverage 会误导：
  - 测试看起来证明了“when gating”没问题，但它们没有证明 runtime 真走了文档承诺的 `structuralWhen` 通道。
  - 这会给出一个假阳性安全感：编译产物、文档和 runtime 之间的 handoff 已落地，实际上没有。
- 最小补强建议：
  - 增加一个 compile-to-runtime 契约测试，直接断言 `structuralWhen` 被实际消费，而不是仅靠 `meta.when` 的最终可见结果。
  - 如果当前设计决定暂不使用 `structuralWhen`，则应删除或降级相关文档承诺与编译字段，避免死字段继续制造假覆盖。

## 本轮新增证据 / 新增结论

- 这不是前两轮 owner、submit、source、import 同类入口断层，而是更纯粹的 `compiler -> runtime -> react` handoff 断层。
- 当前仓库对“compile-time structural lowering 已落地”的保护是弱断言：测试证明了 `when` 行为正确，但没有证明运行时真的走了 `structuralWhen` 这条文档承诺的通道。
