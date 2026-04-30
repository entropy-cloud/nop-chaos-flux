# 11 Implementation Sequence And Milestones

## 1. 目标

本文不是正式计划文件，而是实验目录中的实现顺序蓝图。

它回答：

1. 从零实现时先做什么。
2. 什么必须先于什么。
3. 每一阶段的退出条件是什么。

## 2. 总原则

1. 先建立协议闭环，再做 UI。
2. 先建立 deterministic compiler/runtime，再做复杂 host。
3. 先把 conformance runner 跑起来，再扩功能面。
4. 任何阶段都不允许通过“跳过 transaction/admission/failure taxonomy”来抢进度。

每个 Phase 都必须明确三类工作：

1. 必须真实实现
2. 允许 mock/stub
3. 明确延期

## 3. Phase 0: Skeleton

目标：

1. 建 repo
2. 建 package 壳
3. 建 shared types
4. 建 conformance runner 壳

退出条件：

1. `package-compiler`、`kernel-core`、`kernel-actions`、`kernel-validation`、`kernel-owners`、`renderer-contracts`、`react-host`、`builtin-renderers`、`builtin-capabilities`、`conformance-kit` 已存在。
2. `runtime-contracts` 与 `runtime-facade` 已存在。
3. 根脚本可跑最小 `typecheck` / `test`。

允许 mock/stub：

1. host bridge
2. snapshot/journal adapter
3. renderer registry

明确延期：

1. debugger UI
2. real host integration

## 4. Phase 1: Compiler Determinism + Execution Package

目标：

1. authoring normalize
2. lowering
3. execution package emit
4. deterministic hash
5. diagnostics/source-map

先不做：

1. host protocol
2. draft owner
3. collaboration

退出条件：

1. 相同输入两次编译 hash 一致。
2. events/actions/resources/reactions/validations 均能 emit 到 package。
3. conformance cases `compiler-determinism-*` 全通过。

允许 mock/stub：

1. renderer metadata 可先用 headless registry
2. trust validator 可先用 in-memory allow/deny

明确延期：

1. 复杂 host manifest

## 5. Phase 2: Runtime Session + Transaction Core

目标：

1. runtime session
2. admission/session attach-detect shell
3. scope/value/dependency
4. transaction phases
5. published snapshot
6. failure taxonomy

退出条件：

1. host 只能订阅 published snapshot。
2. 无任何 public write API 可绕过 `RuntimeTransaction`。
3. conformance cases `tx-write-routing-*`、`tx-ordering-*`、`async-stale-drop-*`、`failure-mapping-*` 通过。

允许 mock/stub：

1. headless renderer registry
2. in-memory resource transport
3. minimal diagnostics sink

明确延期：

1. full journal replay
2. debugger UI

## 6. Phase 3A: Owner-Free Capability + Action Runtime

目标：

1. capability resolver
2. built-in capabilities
3. action runtime
4. branch / parallel / finally

本阶段只要求 owner-free capabilities：

1. `setValue`
2. `refreshResource`
3. simple hostless navigation stub

退出条件：

1. `setValue`、`refreshResource` 可跑通。
2. action conformance cases `action-branch-*`、`action-parallel-*`、`action-finally-*` 通过。

允许 mock/stub：

1. headless surface host
2. fake permission validator

明确延期：

1. owner-bound capabilities
2. host-targeted real command integration

## 7. Phase 3B: Admission Shell + Diagnostics Hooks

目标：

1. admission/session attach-detect shell
2. minimal diagnostics sink / provenance hooks
3. trust validator wiring point

退出条件：

1. conformance cases `admission-version-*`、`admission-namespace-*`、`diagnostics-provenance-*` 通过。

允许 mock/stub：

1. signature validator
2. remote package source

明确延期：

1. full debugger model

## 8. Phase 4A: Owner + Collection Baseline

目标：

1. page/form/draft/surface/collection owner
2. collection identity / row scope cache
3. structural sharing
4. keyed / index collection identity mode

退出条件：

1. form/draft/collection owner lifecycle 有固定行为。
2. conformance cases `owner-lifecycle-*`、`collection-identity-*`、`structural-sharing-*` 通过。
3. `itemKey` lowering 为 keyed mode，缺失 `itemKey` 时固定退化到 index mode。

允许 mock/stub：

1. validation runtime 只保留空壳

明确延期：

1. full validation edge cases

## 9. Phase 4B: Validation + Draft Commit Pipeline

目标：

1. validation runtime
2. child owner contract
3. draft confirm / `transformOut`
4. row draft commit target freeze / resolve

退出条件：

1. form submit / draft confirm / collection row identity 跑通。
2. hidden/disabled/readonly/variant-switch/reorder-remove edge cases 有固定行为。
3. conformance cases `validation-edge-*`、`draft-confirm-*`、`child-owner-contract-*` 通过。
4. row draft owner open 时已冻结 commit target；`useItemSchema: true` 不生成第二套 item schema；keyed row draft confirm 可按 `rowKey` 重定位，index mode shape 变化后 reject/reopen。

允许 mock/stub：

1. async validation backend 可先 fake

明确延期：

1. large-table performance optimization

## 10. Phase 5: React Host + Builtin Renderers

目标：

1. React hooks/context
2. schema renderer / node renderer
3. surface host
4. page/form/field/table/dialog 基础 renderer

退出条件：

1. playground 能跑 page + form + table + dialog + detail-view 示例。
2. `null-renderer` 的 `data-source` / `reaction` 能正常参与 runtime lifecycle。

允许 mock/stub：

1. debugger UI hooks

明确延期：

1. sheet/popover

## 11. Phase 5B: Owner-Bound Capabilities

目标：

1. `openSurface`
2. `closeSurface`
3. `submit`
4. `validate`

退出条件：

1. 这些 capability 已绑定真实 owner/validation/surface substrate，而不是 renderer 层临时 stub。
2. conformance cases `owner-bound-capability-*`、`surface-capability-*`、`submit-validate-*` 通过。

允许 mock/stub：

1. no-UI surface host

明确延期：

1. real host-targeted domain command

## 12. Phase 6: Host Protocol + Domain Host

目标：

1. host contract manifest
2. domain bridge
3. host command envelope
4. first domain-host renderer

建议先做：

1. 一个 `headless-domain-host`
2. projection version mismatch case

退出条件：

1. host command taxonomy 与 runtime failure taxonomy 对齐。
2. host projection 是只读 DTO。
3. conformance cases `host-command-*`、`projection-version-*`、`handle-lifecycle-*` 通过。

允许 mock/stub：

1. no-UI headless host bridge

明确延期：

1. real designer canvas host

## 13. Phase 7: Persistence + Recovery + Journal

目标：

1. snapshot export/import
2. journal entry / checkpoint / replay cursor
3. recovery modes
4. keyed / index array identity replay contract

退出条件：

1. `snapshot-only`、`snapshot+journal-replay`、`degraded-host-rebind` 可验证。
2. conformance cases `recovery-mode-*`、`checkpoint-replay-*`、`crash-consistency-*` 通过。
3. keyed collection replay 可按 journal identity metadata 维持 row continuity；index mode 只恢复结构结果，不承诺 row continuity。

允许 mock/stub：

1. in-memory persistence adapter

明确延期：

1. journal compaction optimization
2. real browser storage backend

## 14. Phase 8: Collaboration + Undo/Redo

目标：

1. collaboration operation input boundary
2. optimistic tx reconcile
3. undo/redo journal integration

退出条件：

1. remote ack/reject/rebase 全部进入 transaction pipeline。
2. redo branch invalidation 可诊断。
3. conformance cases `collab-ack-*`、`collab-reject-*`、`collab-rebase-*` 通过。

允许 mock/stub：

1. headless collaboration authority

明确延期：

1. full CRDT/OT engine integration

## 15. Phase 9: Debugger + Conformance Freeze

目标：

1. debugger UI
2. resource/dependency/owner/validation/transaction 可视化
3. 全矩阵 conformance freeze

退出条件：

1. debugger 能解释 stale-dropped、permission-denied、contract-mismatch、journal replay 等关键行为。
2. 所有 P0/P1 conformance case 通过。

允许 mock/stub：

1. partial debugger visualization polish

明确延期：

1. advanced performance dashboards

## 16. 风险最高的三段

### A. Phase 1 -> Phase 2

风险：

compiler emit 对 runtime 过早妥协，导致 Execution Package 不纯。

控制：

1. 先固定 package IR。
2. conformance case 先行。

### B. Phase 4A/4B/5B

风险：

owner/validation 复杂度膨胀，renderer 反向偷逻辑。

控制：

1. validation edge cases 必须集中到 `kernel-validation`。
2. draft/transformOut 只允许在 `kernel-owners/draft-owner`。
3. keyed/index identity lowering 只允许在 compiler lowering + collection owner 中实现，不允许 renderer 私拼。

### C. Phase 7/8

风险：

recovery / collaboration 边界不清，破坏 deterministic transaction。

控制：

1. 远端输入必须先归一成 collaboration operation。
2. replay cursor/checkpoint 先固定，再写代码。

## 17. 实施冻结点

达到以下条件后应冻结协议，不再大改：

1. Phase 4 完成且 conformance 基本通过。
2. host protocol 与 failure taxonomy 已对齐。
3. snapshot/journal/replay cursor 已跑通最小恢复链路。

冻结后允许：

1. 扩 renderer
2. 扩 host domain
3. 扩 debugger 展示

冻结后不应再改：

1. primitive closure
2. transaction phases
3. capability 单出口原则
4. owner family 主边界
5. admission/session 主协议
