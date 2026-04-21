# 12 Conformance Case Catalog

## 1. 目标

本文把前面分册里提到的 conformance cases 组织成统一目录，给实现阶段提供稳定 case ID 和 phase gate 对应关系。

这里不写测试代码，只定义：

1. case 分类
2. case ID 规则
3. phase gate 引用方式
4. 每类 case 至少覆盖什么

## 2. Case ID 规则

统一格式：

```text
<domain>-<topic>-<index>
```

例如：

1. `compiler-determinism-001`
2. `tx-ordering-002`
3. `validation-edge-003`
4. `host-command-004`

规则：

1. `domain` 是大类。
2. `topic` 是子主题。
3. `index` 固定三位数字。
4. 已发布的 case ID 不重用、不改名。

## 3. 优先级分层

### P0

协议阻断项，不通过就不能进入下一阶段。

### P1

关键语义项，不通过不能冻结协议。

### P2

可观测性、性能、增强型恢复与次级边界。

## 4. Case 模板

每个 case 至少包含：

```ts
interface ConformanceCaseSpec {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  precondition: string[];
  stimulus: string[];
  requiredObservables: string[];
  phaseGate?: string[];
}
```

## 5. Compiler / Package

### compiler-determinism-*

必须覆盖：

1. 相同输入两次编译 hash 完全一致
2. diagnostics 顺序稳定
3. source-map 顺序稳定
4. plugin impure transform 被诊断

建议 case：

1. `compiler-determinism-001`
2. `compiler-determinism-002`
3. `compiler-source-map-001`
4. `compiler-plugin-purity-001`

### package-closure-*

必须覆盖：

1. events/actions/resources/reactions/validations 均完整 emit
2. package 顶层表之间引用闭合
3. 缺失引用产生稳定 diagnostics

### admission-*

必须覆盖：

1. execution format mismatch reject
2. host contract mismatch reject
3. namespace collision reject
4. atomic attach rollback

建议 case：

1. `admission-version-001`
2. `admission-version-002`
3. `admission-namespace-001`
4. `admission-rollback-001`

## 6. Transaction / Async

### tx-write-routing-*

必须覆盖：

1. 所有 public write API 都进入 transaction pipeline
2. 没有绕过 transaction 的 direct store write

### tx-ordering-*

必须覆盖：

1. 同 tick async settle 线性化顺序固定
2. write arbitration 优先级固定

### async-stale-drop-*

必须覆盖：

1. 旧 run 不覆盖新 publish
2. owner dispose 后 run cancelled/stale-dropped

### failure-mapping-*

必须覆盖：

1. host contract mismatch -> `contract-mismatch`
2. denied capability -> `permission-denied`
3. validation stale -> `stale-dropped`
4. timeout / cancelled 不伪装成其他 failure kind

### reaction-scheduling-*

必须覆盖：

1. reaction 不在当前 transaction `apply/recompute` 阶段重入
2. reaction 触发的新写入进入下一 transaction

## 7. Action / Capability

### action-branch-*

1. when branch 正确执行
2. failure branch 正确执行

### action-parallel-*

1. parallel steps 汇总结果固定
2. partial failure 的 failure envelope 固定

### action-finally-*

1. finally 总是执行
2. finally 不覆盖原主失败分类

### owner-bound-capability-*

必须覆盖：

1. `submit`
2. `validate`
3. `openSurface`
4. `closeSurface`

### resource-capability-*

必须覆盖：

1. `refreshResource` 必须经 capability family 驱动
2. denied resource capability 的 failure mapping 固定

### resource-lowering-*

必须覆盖：

1. resource publish 最终 lowering 到 `ScopeWrite[]`
2. publish target / mapping 行为固定

### resource-loop-guard-*

必须覆盖：

1. self-write 不触发无限自循环
2. dependency hit 与 refresh routing 行为固定

### surface-capability-*

必须覆盖：

1. open/close surface 通过 capability family 驱动
2. active surface summary 行为固定

### submit-validate-*

必须覆盖：

1. submit 与 validate 的 owner-bound 行为固定
2. child owner contract 对 submit 的影响固定

## 8. Owner / Validation / Data Model

### owner-lifecycle-*

1. bootstrapping -> active
2. refreshing 保持上次 summary
3. disposed 清理 async/resource/reaction/handle

### collection-identity-*

1. rowKey 稳定
2. reorder 不 remount 全部子树
3. remove 后被删除项状态清理
4. 无 `itemKey` 时必须退化到 index mode，并产出 continuity-risk diagnostics
5. `itemKeyPath` 为空、重复或非稳定标量时必须拒绝 keyed execution，并产出 diagnostics

### structural-sharing-*

1. 只复制祖先链
2. 数组单元素改动不 deep clone 全数组

### validation-edge-*

必须覆盖：

1. hidden
2. disabled
3. readonly
4. suspended owner
5. variant switch
6. array reorder/remove
7. stale async validation
8. `variant-field.project` 切换后 subtree revalidation

### draft-confirm-*

1. `validate -> transformOut -> commit -> parent revalidate`
2. transformOut failure mapping
3. row draft keyed target 按 `rowKey` 重定位，index mode shape 变化后必须 reject 或 reopen
4. keyed row target 缺失时必须 `stale-dropped` 或 `business-error`，不得静默 fallback
5. `useItemSchema: true` 不允许物化第二套 item schema

### child-owner-contract-*

1. `ignore`
2. `summary-gate`
3. `recurse-submit`

## 9. Host / Renderer / Domain

### host-command-*

必须覆盖：

1. envelope required fields
2. failure taxonomy mapping
3. idempotency / timeout / cancelled

### projection-version-*

1. expectedProjectionVersion 命中
2. mismatch -> stale-dropped or retry path

### handle-lifecycle-*

1. handle dispose 后 target miss
2. stale command 到达时分类固定

### renderer-null-*

1. `data-source` / `reaction` 作为 `null-renderer` 的 lifecycle 行为固定

### renderer-demo-*

1. page/form/table/dialog/detail-view 固定 demo route 的断言稳定

## 10. Recovery / Journal / Collaboration

### recovery-mode-*

1. `strict-reject`
2. `snapshot-only`
3. `snapshot+journal-replay`
4. `degraded-host-rebind`

### checkpoint-replay-*

1. replay cursor 从 checkpoint 后一位开始
2. 不重复回放已在 snapshot 中的 tx

### crash-consistency-*

1. snapshot 已写 journal 未写
2. journal 已写 snapshot 未写

### snapshot-compatibility-*

1. compatible snapshot 可恢复
2. incompatible snapshot 必须 reject 或降级到固定模式

### collab-ack-*

1. optimistic tx 被 ack

### collab-reject-*

1. optimistic tx 被 reject
2. diagnostics 指向被拒绝 groupId/txId

### collab-rebase-*

1. rebase 后 redo branch invalidation
2. remote op 仍进入 transaction pipeline

## 11. Diagnostics / Security / Performance

### diagnostics-provenance-*

1. write provenance
2. stale-dropped explanation
3. replay diagnostics

### diagnostics-snapshot-*

1. dependency/resource/reaction/owner/validation/surface/host projection 均可进入 debug snapshot
2. debugger 所需摘要字段稳定

### security-permission-*

1. denied capability -> `permission-denied`
2. trust validator deny -> admission reject

### security-sandbox-*

1. expression DSL 不允许任意 JS 执行
2. host command payload 不允许函数/bridge object 注入

### security-redaction-*

1. diagnostics 默认 redaction 生效
2. 敏感 payload 不直接裸露到 debug snapshot

### budget-enforcement-*

1. expression/validation/resource refresh 的 budget 行为固定

### plugin-admission-*

1. plugin version mismatch
2. untrusted / revoked plugin reject

### performance-cache-*

1. expression cache
2. row scope cache
3. validation materialization cache

### performance-invalidation-*

1. lexical-root invalidation 范围固定
2. exact-path validation closure 不扩大普通 dataflow invalidation

### collection-windowing-*

1. 未渲染项不创建完整 child scope
2. active data set 下 aggregate validation 行为固定

### projection-memo-*

1. host projection memo by snapshot version 行为固定

### host-projection-readonly-*

1. projection DTO 只读
2. schema 无法直接修改 host projection

## 12. Phase Gate 对照

| Phase | Required case families |
| --- | --- |
| Phase 1 | `compiler-determinism-*`, `compiler-source-map-*`, `compiler-plugin-purity-*`, `package-closure-*` |
| Phase 2 | `tx-write-routing-*`, `tx-ordering-*`, `async-stale-drop-*`, `failure-mapping-*`, `reaction-scheduling-*` |
| Phase 3A | `action-branch-*`, `action-parallel-*`, `action-finally-*` |
| Phase 3B | `admission-version-*`, `admission-namespace-*`, `admission-rollback-*`, `diagnostics-provenance-*` |
| Phase 4A | `owner-lifecycle-*`, `collection-identity-*`, `structural-sharing-*` |
| Phase 4B | `validation-edge-*`, `draft-confirm-*`, `child-owner-contract-*` |
| Phase 5 | `renderer-null-*`, `renderer-demo-*`, `resource-lowering-*`, `resource-loop-guard-*` |
| Phase 5B | `owner-bound-capability-*`, `surface-capability-*`, `submit-validate-*` |
| Phase 6 | `host-command-*`, `projection-version-*`, `handle-lifecycle-*`, `host-projection-readonly-*` |
| Phase 7 | `recovery-mode-*`, `checkpoint-replay-*`, `crash-consistency-*`, `snapshot-compatibility-*` |
| Phase 8 | `collab-ack-*`, `collab-reject-*`, `collab-rebase-*` |
| Phase 9 | all P0/P1 + `diagnostics-snapshot-*`, `security-sandbox-*`, `security-redaction-*`, `budget-enforcement-*`, `plugin-admission-*`, `performance-invalidation-*`, `collection-windowing-*`, `projection-memo-*` |

## 13. 最小首批 case

建议最先实现的 12 个：

1. `compiler-determinism-001`
2. `compiler-source-map-001`
3. `admission-version-001`
4. `tx-write-routing-001`
5. `tx-ordering-001`
6. `async-stale-drop-001`
7. `action-branch-001`
8. `owner-lifecycle-001`
9. `validation-edge-001`
10. `host-command-001`
11. `recovery-mode-001`
12. `collab-reject-001`
