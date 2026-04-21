# 06 Persistence Journal Collaboration

## 1. Persistence 范围

kernel 可以持久化：

1. `PublishedSnapshot`
2. transaction journal
3. owner summary state
4. resource summary state
5. selected validation summary state

kernel 不直接持久化：

1. DOM ref
2. AbortController
3. timer handle
4. host private bridge/store/controller

## 2. Snapshot 恢复规则

1. 只能恢复 structured-clone-safe 状态。
2. snapshot version 不兼容时必须拒绝恢复。
3. 恢复后必须重新绑定 host projection 和 subscription。
4. 恢复后必须重新校验 resource authoritative state 和 owner lifecycle state。

## 2.1 Recovery Modes

1. `strict-reject`
2. `snapshot-only`
3. `snapshot+journal-replay`
4. `degraded-host-rebind`

规则：

1. execution format 不兼容时必须 `strict-reject`。
2. snapshot 兼容但 journal 不兼容时可进入 `snapshot-only`。
3. snapshot 和 journal 都兼容时才允许 `snapshot+journal-replay`。
4. host contract 暂不可用但 package 兼容时，可进入 `degraded-host-rebind`，只恢复 kernel summaries，不恢复 host authoritative projection。

## 3. Transaction Journal

```ts
interface TransactionJournalEntry {
  txId: string;
  publishSeq: number;
  ownerId: string;
  reversible: boolean;
  forward: ScopeWrite[];
  inverse?: ScopeWrite[];
  groupId?: string;
  committedAt: number;
}

interface CheckpointRecord {
  checkpointId: string;
  publishSeq: number;
  txId: string;
  snapshotHash: string;
  committedAt: number;
}

interface JournalCursor {
  fromPublishSeqExclusive: number;
  untilPublishSeqInclusive?: number;
}
```

规则：

1. 普通 scope write 若可逆，应生成 inverse patch。
2. 跨 owner 事务默认拆成 owner-local journal entry，再由 orchestration 形成复合提交记录。
3. 不可逆 capability 必须显式标记，并通过 checkpoint 或补偿策略处理。
4. journal replay 必须从 `CheckpointRecord.publishSeq` 对应的下一个 publishSeq 开始，不能重复回放已包含在 checkpoint snapshot 中的 transaction。

## 3.1 Crash Consistency And Atomicity

规则：

1. snapshot 和 journal 必须有明确的写入顺序标记。
2. 若 snapshot 已写、journal 未写，恢复时以 snapshot 为准，丢弃未确认 journal tail。
3. 若 journal 已写、snapshot 未写，可在兼容模式下 replay journal 到上一个 checkpoint。
4. `PublishedSnapshot.publishSeq`、`CheckpointRecord.publishSeq` 与 replay cursor 必须单调对齐，避免重复回放或跳过已提交事务。

## 3.2 Journal Compaction

1. journal 可按 `groupId` 做合并。
2. 完整 checkpoint 之后，已被覆盖的 journal 段可压缩。
3. 不可逆 command 不能被伪装成普通 reversible patch；压缩后也必须保留不可逆边界元数据。

## 3.3 Replay Anchor Rules

1. 若存在兼容 `CheckpointRecord`，replay 起点为 `JournalCursor.fromPublishSeqExclusive = checkpoint.publishSeq`。
2. 若不存在 checkpoint，只允许从空 session 或显式 full-replay 模式恢复。
3. replay 过程中若发现 journal entry 的 `txId` 与 publish 序列不连续，必须中止恢复并发出 diagnostics。

## 4. Undo / Redo

规则：

1. `undo/redo` 默认针对业务值和语义状态，不默认包含焦点、hover、surface z-order。
2. selection、focus、surface stack 只有在 owner family 明确声明为语义状态时才进入 undo。
3. domain-host owner 若支持 undo，必须通过 host manifest 声明 `undo` / `redo` command。
4. redo branch 在 remote reconcile 后可失效，但必须留下 diagnostics。

## 5. Collaboration Operation

```ts
interface CollaborationOperation {
  opId: string;
  source: string;
  logicalClock: string;
  targetOwnerId: string;
  resolution?: 'ack' | 'reject' | 'rebase' | 'replace';
  basePublishSeq?: number;
  writes: ScopeWrite[];
}
```

规则：

1. collaboration 不进入 core primitive。
2. remote patch 必须先被 host/domain 决议为 `CollaborationOperation`，再进入 transaction pipeline。
3. kernel 不直接实现 OT/CRDT/LWW；它只接收已决议 operation。
4. local optimistic tx 与 remote ack/reject/rebase 的 reconcile 也必须进入 transaction pipeline。

## 5.1 Collaboration Boundary Rules

1. kernel 不接受 opaque remote patch，必须是显式 `CollaborationOperation`。
2. remote reject 必须能指向被拒绝的 local optimistic transaction 或 `groupId`。
3. remote rebase 后若 redo branch 失效，必须写入 diagnostics。

## 6. Authority Model 边界

authority model 由 host/domain 决定，但 kernel 只接受两种输入：

1. 已决议的 `ScopeWrite[]`
2. 已决议的 `CollaborationOperation`

这样可以保证：

1. kernel 保持 deterministic transaction。
2. 协作策略不反向污染 primitive closure。

## 7. SSR

SSR 只做：

1. package 预编译
2. 使用稳定 resource snapshot 的首屏结构渲染

SSR 额外规则：

1. 只允许执行 `server-safe` capability/resource。
2. hydration 必须接收一个 `PublishedSnapshot` 作为首轮基线。
3. hydration mismatch 记录 diagnostics，并以客户端 authoritative runtime 为准。

## 8. Worker

worker 只能运行 kernel 的无 DOM 子集。

适合：

1. compiler
2. expression precompile
3. validation materialization
4. diagnostics analysis

规则：

1. worker 与主线程之间交换 structured-clone-safe DTO。
2. worker 产出的 settle/write 仍需回主 session transaction pipeline 线性化。

## 9. Recovery 顺序

冷恢复顺序：

1. admit package
2. import snapshot
3. restore journal pointer
4. rebind host projections
5. re-arm reactions/resources
6. publish recovered snapshot

热恢复顺序：

1. import compatible snapshot in rehydrate mode
2. diff current publishSeq
3. run reconcile transaction
4. publish new authoritative snapshot

## 10. 后续阅读

继续读：`07-diagnostics-security-performance-conformance.md`
