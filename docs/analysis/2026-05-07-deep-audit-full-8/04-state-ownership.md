# 维度 04: 状态所有权与单一事实来源

## 深挖轮次

- 第 1 轮: surface cleanup close、table visible/order local defaults。
- 第 2 轮: surface runtime `onClose` 生命周期、CRUD/Table shape mismatch。
- 第 3 轮: CRUD ownership/double write/Table controlled/Flow host replace/report collapse。
- 第 4 轮: object-field stale transformOut、dynamic-renderer stale schema。
- 第 5 轮: table expandedRowKeys、word-editor charts/codes、variant-field non-form、tabs stale local value。

## 维度复核结论

| 条目                                                       | 结论 | 严重程度 | 证据                                                                                              |
| ---------------------------------------------------------- | ---- | -------- | ------------------------------------------------------------------------------------------------- |
| surface cleanup deps close                                 | 保留 | P1       | `packages/flux-renderers-basic/src/use-surface-renderer.ts:281-294`                               |
| table visible/order local defaults no resync               | 保留 | P2       | `table-renderer/use-table-visible-columns.ts:22-67`                                               |
| `SurfaceRuntime.close/closeTop/dispose` not call `onClose` | 保留 | P1       | `packages/flux-runtime/src/surface-runtime.ts:101-115,178-192`                                    |
| CRUD/Table sort/filter shape mismatch                      | 保留 | P1       | CRUD `{field, order}` vs Table `{column, direction}`; filter plain record vs `{filters, keyword}` |
| CRUD ownership config ignored forcing scope                | 保留 | P1       | `crud-renderer.tsx:254-269`                                                                       |
| ownerStatePath summary + individual paths double write     | 保留 | P2       | `crud-renderer-state.ts:220-294`, `crud-renderer.tsx:77-97`                                       |
| Table controlled sort/filter fallback local                | 保留 | P1       | `use-table-sort.ts`, `use-table-filter.ts`                                                        |
| Report Designer collapses local vs core                    | 驳回 | -        | 仅 shell UI local state，无 core 同一事实源                                                       |
| Flow host replace pushes history/dirty                     | 保留 | P1       | `flow-designer-core/src/core.ts:378-383`, `core/shell-controls.ts:106-115`                        |
| object-field async transformOut stale overwrite            | 保留 | P1       | `object-field.tsx:230-254`                                                                        |
| dynamic-renderer shows stale schema while pending          | 保留 | P1       | `dynamic-renderer.tsx:33-87`                                                                      |
| table expandedRowKeys only initial                         | 保留 | P2       | `use-table-expand.ts:4-7`                                                                         |
| word-editor charts/codes dual owner                        | 降级 | P2       | live/saved projection语义不清，需复现保存覆盖                                                     |
| variant-field non-form selection local only                | 保留 | P2       | `variant-field.tsx:122-132,216-273`                                                               |
| tabs local value stale after items change                  | 保留 | P2       | `tabs.tsx`, `interaction-owner.ts`                                                                |

## 子项复核

状态 P1 子项复核确认: surface cleanup, runtime onClose, CRUD/Table shape, CRUD ownership forcing scope, Table controlled fallback, Flow host replace history/dirty, object-field stale transformOut, dynamic-renderer stale schema 均成立。

## 最终保留项

- P1: surface lifecycle, CRUD/Table owner contract, Table controlled, Flow host replace, object-field transformOut, dynamic-renderer stale schema。
- P2: table column visibility/order/expanded keys, ownerStatePath double write, variant-field non-form, tabs local value stale。
