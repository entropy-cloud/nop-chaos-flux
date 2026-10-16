# Bounded Diagnostic Events 提案（perf locality 权威证明的开源面仪表化）

> Status: open proposal（未实现；从 `docs/architecture/performance-diagnostics-and-e2e-design.md` 迁出——plan 622 A7 裁决，architecture docs 只保留最终设计）
> Date: 2026-10-16
> Related: docs/architecture/performance-diagnostics-and-e2e-design.md（现状设计）、docs/architecture/debugger-runtime.md、docs/architecture/form-store-diagnostics.md

## 背景与现状（截至 2026-10-16）

- 调试器事件流 `NopDebugEventKind` 现有 12 个 kind（`compile:start/end`、`render:start/end`、`action:start/end`、`api:start/end`、`api:abort`、`state:snapshot`、`notify`、`error`，见 `packages/nop-debugger/src/types.ts:47`）。
- runtime-owned form-store 诊断已提供显式门控的有界 session 面（`commitCount`/`changedPaths`/`changedKinds`/`droppedCommitCount`），经 `RendererRuntime.getFormStoreDiagnosticsBridge()` 暴露。
- 本提案覆盖的是**尚不存在**的仪表化：为 "row/item-local publication" 类断言提供权威 E2E 证明所需的计数器与事件。

## Authoritative Locality Proofs 所需指标

| Metric                                            | 所需 source                                                                          | Gate example                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `scopePublishCountByScopeId`                      | gated scope/debug instrumentation                                                    | target row/item scope publishes once                     |
| `scopePublishPathsByScopeId`                      | gated scope/debug instrumentation                                                    | table row publishes `record`, not whole collection       |
| `affectedRowKeys` / `affectedItemKeys`            | collection owner diagnostic event                                                    | exactly one key for single-item update                   |
| `renderCountByProbeKey`                           | diagnostic probe renderer                                                            | target row/item changed, siblings unchanged              |
| `mountCountByProbeKey` / `unmountCountByProbeKey` | diagnostic probe renderer                                                            | no remount for unchanged keys                            |
| `cidByInstancePath` before/after                  | `inspectByCid()` / `inspectByElement()` or future explicit component-tree automation | stable mounted identity for unchanged materialized nodes |
| `subscriberWakeupCount`                           | temporary low-level instrumentation                                                  | optional, used only when optimizing subscription fanout  |
| DOM mutation summary                              | optional MutationObserver                                                            | secondary sanity check, not primary proof                |

## 提案的有界诊断事件

扩展 `NopDebugEventKind` 或新增通用 diagnostic event domain，载荷如下：

| Event                  | Payload summary                                                       | Purpose                                  |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `perf:session:start`   | session id, scenario, mode                                            | bracket one diagnostic run               |
| `perf:session:end`     | session id, summary counters                                          | stable E2E wait target                   |
| `scope:publish`        | scope id, owner kind, paths, source scope id, reason                  | prove row/item-local publication         |
| `collection:reconcile` | owner id, changed keys, created keys, disposed keys, republished keys | prove collection-to-row/item translation |
| `component:probe`      | probe key, phase, render count, mount count, unmount count            | prove render/remount locality            |

Rules:

- all payloads must be shallow and capped
- no raw deep scope snapshots in high-frequency events
- events must be disabled unless the host enables performance diagnostics
- session summaries may keep aggregate counts even if individual events are sampled
- ordinary debugger enabled mode must not imply `scope:publish` or `component:probe` capture

## 与现有 `render:*` 事件的关系

现有 `render:*` 事件在性能诊断语境下继续作为 `debuggerRenderHints` 消费，不改名为 benchmark counters；本提案事件是增量域，不迁移现有语义。
