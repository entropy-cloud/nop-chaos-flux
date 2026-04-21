# 20 MVP Implementation Task Matrix

## 1. 目标

本文把 `09` / `10` / `11` / `12` / `19` 收敛成可直接执行的 MVP 任务矩阵。

它不替代 phase blueprint，而是补充：

1. 具体任务项
2. 物理 owner package/module
3. 前置依赖
4. 完成证据

## 2. 使用规则

1. 任务按波次执行，不要求一次并行铺满所有包。
2. 每个任务必须绑定至少一个 conformance family 或可验证 artifact。
3. 若实现与本矩阵冲突，以 `01`-`19` 的协议 owner 文档为准，本文件只负责执行落点。

## 3. Wave 0: Repository Skeleton

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-000` | 建立 monorepo 根目录、workspace、基础脚本 | repo root | none | 根仓库可跑最小 `typecheck` / `test` |
| `MVP-001` | 建立 `runtime-contracts` package 壳 | `runtime-contracts` | `MVP-000` | package 可被 compiler/kernel/conformance import |
| `MVP-002` | 建立 `schema-authoring-types`、`package-compiler`、`kernel-*`、`host-protocol`、`renderer-contracts`、`runtime-facade`、`react-host`、`builtin-*`、`debugger-sdk`、`conformance-kit` 包壳 | packages | `MVP-000` | `09`/`11` 列出的最小起步 package 与建议早建包壳全部存在 |
| `MVP-003` | 建立 conformance runner 壳、fixture 目录、phase-gate case matrix | `apps/conformance-runner`, `conformance-kit` | `MVP-002` | 可发现空测试集、输出 phase-gate matrix，并为后续波次承载 case |
| `MVP-004` | 建立首批 P0/P1 conformance case 壳与命名规范 | `conformance-kit/cases` | `MVP-003` | `12` 中的 Phase 1/2/3B/4A/4B case families 都有可挂接 case 壳 |

## 4. Wave 1: Contracts And Deterministic Compiler

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-100` | 落 `ExecutionPackage` / `PublishedSnapshot` / `ScopeWrite` / `RuntimeFailureKind` DTO | `runtime-contracts` | `MVP-001` | DTO 与 `02` / `03` / `17` 对齐 |
| `MVP-101` | 落 authoring normalize 与 canonical traversal | `schema-authoring-types`, `package-compiler/authoring-normalizer`, `package-compiler/determinism` | `MVP-002`, `MVP-100` | `compiler-determinism-*` 可开始编写 |
| `MVP-102` | 落 template/value/event/action/resource/reaction/validation lowering 主干 | `package-compiler/lowering` | `MVP-101` | package closure 满足 `package-closure-*` |
| `MVP-103` | 落 hash/source-map/diagnostics 输出 | `package-compiler/hash`, `package-compiler/source-map`, `package-compiler/diagnostics` | `MVP-102` | `compiler-determinism-*`, `compiler-source-map-*`, `compiler-plugin-purity-*` 可过 |
| `MVP-104` | 落 composite bridge lowering: `itemKey -> itemKeyPath`, `useItemSchema -> itemTemplate reuse` | `package-compiler/lowering` | `MVP-102` | `19` 的 lowering bridge 可在 package 中表示 |
| `MVP-105` | 建立 Phase 1 conformance fixtures 并跑通 compiler/package gate | `conformance-kit` | `MVP-004`, `MVP-103` | `compiler-determinism-*`, `compiler-source-map-*`, `compiler-plugin-purity-*`, `package-closure-*` 可过 |

## 5. Wave 2: Session And Transaction Kernel

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-200` | 落 `RuntimeSession`、admission shell、published snapshot 基线 | `kernel-core/session`, `kernel-core/publish` | `MVP-100` | host 只能订阅 published snapshot |
| `MVP-201` | 落 scope/value/dependency substrate | `kernel-core/scope`, `kernel-core/values`, `kernel-core/dependency` | `MVP-200` | `tx-write-routing-*` 具备执行基础 |
| `MVP-202` | 落 transaction phase runner 与 write arbitration | `kernel-core/transaction` | `MVP-201` | `tx-ordering-*` 行为固定 |
| `MVP-203` | 落 async lane/runtime failure substrate | `kernel-core/async`, `kernel-core/failures` | `MVP-202` | `async-stale-drop-*`, `failure-mapping-*` 可过 |
| `MVP-204` | 落 resource/reaction substrate 接入 tx pipeline | `kernel-core/resources`, `kernel-core/reactions` | `MVP-202`, `MVP-203`, `MVP-102` | `reaction-scheduling-*`, `resource-lowering-*`, `resource-loop-guard-*` 可过 |
| `MVP-205` | 建立 Phase 2 conformance fixtures 并跑通 tx/async gate | `conformance-kit` | `MVP-004`, `MVP-204` | `tx-write-routing-*`, `tx-ordering-*`, `async-stale-drop-*`, `failure-mapping-*`, `reaction-scheduling-*` 可过 |

## 6. Wave 3: Actions And Capabilities

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-300` | 落 capability resolver 与 pipeline | `kernel-actions/resolver`, `capability-pipeline` | `MVP-203` | 所有 public writes 可经 capability 进入 tx |
| `MVP-301` | 落 action runtime: branch/parallel/finally | `kernel-actions/action-runtime` | `MVP-300`, `MVP-102` | `action-branch-*`, `action-parallel-*`, `action-finally-*` 通过 |
| `MVP-302` | 落 owner-free builtin capabilities: `setValue`, `refreshResource` | `builtin-capabilities` | `MVP-300`, `MVP-204` | `setValue` / `refreshResource` 跑通 headless demo |
| `MVP-303` | 落 admission version/namespace/rollback、trust validator wiring、diagnostics provenance hooks | `kernel-core/session`, `kernel-core/diagnostics`, `host-protocol` | `MVP-200`, `MVP-100` | `admission-version-*`, `admission-namespace-*`, `admission-rollback-*`, `diagnostics-provenance-*` 具备实现基础 |
| `MVP-304` | 建立 Phase 3B conformance fixtures 并跑通 admission gate | `conformance-kit` | `MVP-004`, `MVP-303` | `admission-version-*`, `admission-namespace-*`, `admission-rollback-*`, `diagnostics-provenance-*` 可过 |

## 7. Wave 4: Owners, Collection Identity, Validation

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-400` | 落 page/form/draft/surface/collection owner substrate | `kernel-owners/owner-runtime`, `page-owner`, `form-owner`, `draft-owner`, `surface-owner`, `collection-owner` | `MVP-201` | `owner-lifecycle-*` 可过 |
| `MVP-401` | 落 keyed/index collection identity consumption、rowKey derivation、row scope cache | `kernel-owners/collection-owner` | `MVP-400`, `MVP-104` | `collection-identity-*`、`performance-cache-*` 的 row cache 部分可过 |
| `MVP-402` | 落 structural sharing helpers 与 array structural op semantics | `kernel-owners/structural-sharing`, `kernel-core/transaction` | `MVP-201`, `MVP-400` | `structural-sharing-*` 可过 |
| `MVP-403` | 落 validation model/materialization/field-state/edge-cases | `kernel-validation` | `MVP-201`, `MVP-400`, `MVP-401`, `MVP-102` | `validation-edge-*` 可过 |
| `MVP-404` | 落 child owner contract | `kernel-owners/child-contract`, `kernel-owners/draft-owner`, `kernel-owners/surface-owner` | `MVP-400`, `MVP-403` | `child-owner-contract-*` 可过 |
| `MVP-405` | 落 draft confirm / `transformOut` 基线 | `kernel-owners/draft-owner` | `MVP-400`, `MVP-403` | `draft-confirm-*` 基线可过 |
| `MVP-406` | 落 row draft commit target freeze / resolve | `kernel-owners/draft-owner`, `collection-owner` | `MVP-401`, `MVP-405` | keyed row 可按 `rowKey` 重定位；index mode shape 变化 reject/reopen |
| `MVP-407` | 落 `variant-field.project` subtree revalidation | `kernel-validation/edge-cases`, `kernel-owners/composite-values` | `MVP-403`, `MVP-405` | `validation-edge-*` 中 variant project observable 固定 |
| `MVP-408` | 建立 Phase 4A/4B conformance fixtures 并跑通 owner/validation gates | `conformance-kit` | `MVP-004`, `MVP-401`, `MVP-402`, `MVP-404`, `MVP-406`, `MVP-407` | `owner-lifecycle-*`, `collection-identity-*`, `structural-sharing-*`, `validation-edge-*`, `draft-confirm-*`, `child-owner-contract-*` 可过 |

## 8. Wave 5: Facade, React Host, Builtin Renderers

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-500` | 落 `renderer-contracts` 与 `ResolvedNodeContract` 基线 | `renderer-contracts` | `MVP-100`, `MVP-102` | compiler/host 可共享 node contract |
| `MVP-501` | 落 `runtime-facade` 稳定 API | `runtime-facade` | `MVP-200`, `MVP-500`, `MVP-400` | UI 层无需直连 kernel 内部 |
| `MVP-502` | 落 `react-host` hooks/schema renderer/surface host | `react-host` | `MVP-501` | playground 可消费 published snapshot |
| `MVP-503` | 落基础 builtin renderers 与 null-renderer lifecycle 对齐 | `builtin-renderers` | `MVP-502`, `MVP-501` | `renderer-null-*`, `renderer-demo-*` 通过 |
| `MVP-504` | 建立 Phase 5 conformance fixtures 并跑通 renderer/resource demo gate | `conformance-kit` | `MVP-004`, `MVP-204`, `MVP-503` | `renderer-null-*`, `renderer-demo-*`, `resource-lowering-*`, `resource-loop-guard-*` 可过 |

## 9. Wave 6: Owner-Bound Capabilities And Host Protocol

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-600` | 落 owner-bound builtin capabilities: `submit`, `validate`, `openSurface`, `closeSurface` | `builtin-capabilities` | `MVP-403`, `MVP-404`, `MVP-405`, `MVP-500` | `owner-bound-capability-*`, `surface-capability-*`, `submit-validate-*` 具备实现基础 |
| `MVP-601` | 建立 Phase 5B conformance fixtures 并跑通 owner-bound capability gate | `conformance-kit` | `MVP-004`, `MVP-600` | `owner-bound-capability-*`, `surface-capability-*`, `submit-validate-*` 可过 |
| `MVP-602` | 落 host manifest / domain bridge / command envelope | `host-protocol` | `MVP-100`, `MVP-601` | host contract 与 command DTO 固定 |
| `MVP-603` | 落 headless domain-host renderer/demo 与 projection readonly contract | `builtin-renderers`, `react-host`, `host-protocol` | `MVP-503`, `MVP-602` | `host-command-*`, `projection-version-*`, `handle-lifecycle-*`, `host-projection-readonly-*` 具备实现基础 |
| `MVP-604` | 建立 Phase 6 conformance fixtures 并跑通 host gate | `conformance-kit` | `MVP-004`, `MVP-603` | `host-command-*`, `projection-version-*`, `handle-lifecycle-*`, `host-projection-readonly-*` 可过 |

## 10. Wave 7: Journal, Recovery, Collaboration

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-700` | 落 journal entry / checkpoint / replay cursor | `kernel-core/journal`, `kernel-core/snapshots` | `MVP-202`, `MVP-203` | `recovery-mode-*`, `checkpoint-replay-*` 具备实现基础 |
| `MVP-701` | 落 keyed/index array identity metadata emit/load | `kernel-core/journal`, `kernel-owners/collection-owner` | `MVP-401`, `MVP-700` | keyed replay 保持 row continuity；index replay 不承诺 continuity |
| `MVP-702` | 落 snapshot-only / snapshot+journal-replay / degraded-host-rebind | `kernel-core/session`, `kernel-core/journal` | `MVP-700`, `MVP-600` | `recovery-mode-*`, `snapshot-compatibility-*`, `crash-consistency-*` 具备实现基础 |
| `MVP-703` | 落 collaboration op boundary 与 tx reconcile | `kernel-core/transaction`, `kernel-core/journal` | `MVP-702` | `collab-ack-*`, `collab-reject-*`, `collab-rebase-*` 具备实现基础 |
| `MVP-704` | 建立 Phase 7/8 conformance fixtures 并跑通 recovery/collab gates | `conformance-kit` | `MVP-004`, `MVP-701`, `MVP-702`, `MVP-703` | `recovery-mode-*`, `checkpoint-replay-*`, `crash-consistency-*`, `snapshot-compatibility-*`, `collab-ack-*`, `collab-reject-*`, `collab-rebase-*` 可过 |

## 11. Wave 8: Conformance And Debug Explainability

| ID | Task | Owner | Depends On | Done When |
| --- | --- | --- | --- | --- |
| `MVP-800` | 汇总 P0/P1 conformance fixtures 与 runner glue 为完整 phase-gate matrix | `conformance-kit` | `MVP-105`, `MVP-205`, `MVP-304`, `MVP-408`, `MVP-504`, `MVP-601`, `MVP-604`, `MVP-704` | `12` 的 phase gates 可逐波执行并形成完整矩阵 |
| `MVP-801` | 落 diagnostics provenance / replay explanation / stale-drop explainability | `kernel-core/diagnostics`, `debugger-sdk` | `MVP-203`, `MVP-700` | `diagnostics-provenance-*`, `diagnostics-snapshot-*` 可过 |
| `MVP-802` | 落 debugger minimal UI | `apps/debugger`, `debugger-sdk` | `MVP-801`, `MVP-502` | debugger 能解释 replay/stale-drop/contract mismatch |

## 12. First 12 Execution Tasks

若只排最先落地的 12 个任务，建议顺序：

1. `MVP-000`
2. `MVP-001`
3. `MVP-002`
4. `MVP-003`
5. `MVP-004`
6. `MVP-100`
7. `MVP-101`
8. `MVP-102`
9. `MVP-103`
10. `MVP-105`
11. `MVP-200`
12. `MVP-201`

完成这 12 个之后，再进入 `MVP-202` 及后续 runtime/composite bridge 任务。

## 13. Composite Critical Path

如果目标是尽早验证 `object-field` / `variant-field` / `array-field` 核心闭环，最短链路是：

1. `MVP-104`
2. `MVP-400`
3. `MVP-401`
4. `MVP-402`
5. `MVP-403`
6. `MVP-404`
7. `MVP-405`
8. `MVP-406`
9. `MVP-407`
10. `MVP-503`
11. `MVP-800`

## 14. 明确不允许的偷跑

1. 不允许在 `react-host` 或 builtin renderer 中私做 keyed/index identity 判定。
2. 不允许在 row editor UI 层私存“当前 index 就是 commit target”的隐式契约。
3. 不允许跳过 conformance case 先把 recovery/collab 标成完成。
4. 不允许把 `useItemSchema: true` 实现成运行时复制第二份 item schema。
