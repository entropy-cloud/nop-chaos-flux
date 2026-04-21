# 07 Diagnostics Security Performance Conformance

## 1. Diagnostics 是一等能力

每个长期运行实体都必须可检查：

1. value last dependencies
2. resource status / run history
3. reaction fire history
4. scope write provenance
5. owner summary / lifecycle
6. validation active rules / errors / overlays
7. async lanes
8. surface stack
9. host projection snapshots

```ts
interface RuntimeDebugSnapshot {
  packageId: string;
  sessionId: string;
  scopes: ScopeDebugEntry[];
  owners: OwnerDebugEntry[];
  resources: ResourceDebugEntry[];
  reactions: ReactionDebugEntry[];
  transactions: TransactionDebugEntry[];
  asyncRuns: AsyncRunDebugEntry[];
}
```

## 2. 必备调试视图

1. dependency inspector
2. action trace
3. resource timeline
4. validation inspector
5. surface stack viewer
6. host contract viewer
7. package/source-map viewer

## 3. Security 基线

1. expression 是 sandboxed DSL，不是 JS。
2. capability 必须走 allowlist / manifest 校验。
3. dynamic package admission 必须校验 trust policy / signature。
4. host command 不允许 schema 传递 bridge object 或函数。
5. projection 是 readonly snapshot，不允许把 mutable host object 注入 scope。
6. diagnostics 默认做 payload redaction。

## 4. 执行配额

必须对以下运行单元施加 budget：

1. expression
2. validation run
3. resource refresh
4. host command bridge

budget 维度：

1. CPU / wall-clock time
2. recursion depth
3. output payload size
4. diagnostics retention length

## 5. 插件安全

插件分三级：

1. compiler plugin
2. runtime capability plugin
3. host domain plugin

规则：

1. 每一级都必须声明权限面。
2. plugin API version 必须参与 package version 协商。
3. 被撤销签名或不再信任的插件必须拒绝 admission。

## 6. Performance 基线

1. compile once, execute many times
2. static zero-cost fast path
3. lexical-root targeted invalidation
4. path-based structural sharing
5. row-local invalidation and row scope reuse
6. owner-local publish
7. diagnostics 不污染热路径

## 7. 大集合规则

1. table/list/tree/loop 必须支持 windowing。
2. row scope cache 按 `rowKey` 回收。
3. 未渲染项不得创建完整 child scope。
4. `validateAll('change')` 不是允许的默认基线。

## 8. 必备 cache

1. compiled expression cache
2. resolved props/meta cache
3. owner-local validation materialization cache
4. row scope cache
5. host projection memo by snapshot version

## 9. Conformance 测试矩阵

从零实现必须至少通过以下合规案例：

每个 case 至少包含：

1. `Case ID`
2. `Precondition`
3. `Stimulus`
4. `Required Observable`

### Package / Admission

1. incompatible execution format 被拒绝
2. host contract version mismatch 被拒绝
3. fragment attach 失败时无残留 namespace 和 runtime state
4. 同输入两次编译的 package hash 完全相同
5. diagnostics 顺序稳定

### Transaction / Async

1. 旧 async 结果不会覆盖新 publish
2. reaction 不会在当前 transaction `apply/recompute` 阶段重入
3. owner dispose 会取消未完成 async run
4. timeout 与 cancelled 不会落成普通 infra-error

### Owner / Validation

1. child draft error 不泄露到 parent field map
2. `summary-gate` 只影响 readiness，不暴露 child field errors
3. reorder 后 row identity 保持，field state 不按旧 index 粗暴复制
4. hidden/disabled/readonly/variant-switch 后 validation edge-case 行为固定

### Resource / Capability

1. resource publish 最终 lowering 成 `ScopeWrite[]`
2. resource refresh 必须通过 capability family 驱动
3. self-write 不会触发 resource 无限自循环
4. denied capability 会映射为统一 `permission-denied`

### Host / Domain

1. host projection 是 readonly DTO，不可写
2. host command 结果按统一 taxonomy 归类
3. handle 不泄露底层 store/controller
4. projection version mismatch 的 host command 行为固定

### Recovery / Collaboration

1. incompatible snapshot 不能恢复
2. remote operation 必须进入 transaction pipeline
3. redo branch 在 reconcile 后的失效行为可诊断
4. snapshot-only / snapshot+journal-replay / degraded-host-rebind 三种恢复模式行为固定

## 10. 发布建议

对于一个 clean-slate 总纲设计，达到以下条件即可认定为“协议级完成”：

1. primitive closure 稳定
2. package/admission/session 协议稳定
3. transaction/async 语义稳定
4. owner/validation/collection 规则稳定
5. host/domain 窄协议稳定
6. recovery/security/conformance 边界明确

本目录以此作为完成标准。

## 11. 后续阅读

继续读：`08-end-to-end-lowering-example.md`
