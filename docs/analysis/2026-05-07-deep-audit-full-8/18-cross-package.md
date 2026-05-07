# 维度 18: 跨包模式一致性

## 深挖轮次

- 第 1 轮: data quick-edit fallback reuses `flux.reportDesigner.saveFailed`。
- 第 2 轮: word-editor same i18n key; flow manifest/projection mismatch; namespace registration candidate。
- 第 3 轮: spreadsheet manifest not root exported。
- 第 4 轮: spreadsheet host action manifest/provider/core three sources; report bridge snapshot mismatch。
- 第 5 轮: 无新增。

## 维度复核结论

| 条目                                                               | 结论 | 严重程度 | 说明                                                                                     |
| ------------------------------------------------------------------ | ---- | -------- | ---------------------------------------------------------------------------------------- |
| data quick-edit / word-editor use `flux.reportDesigner.saveFailed` | 保留 | P3       | cross-domain i18n key coupling                                                           |
| flow manifest/projection mismatch                                  | 保留 | P1       | manifest declares `runtime.gridVisible`, live projection uses `runtime.gridEnabled` etc. |
| domain namespace registration inconsistent                         | 驳回 | -        | hand-written `useLayoutEffect(registerNamespace)` is behaviorally equivalent to helper   |
| spreadsheet manifest not root exported                             | 保留 | P2       | flow/report/word root export manifests; spreadsheet only internal                        |
| spreadsheet host action manifest/provider/core three sources       | 保留 | P1       | manifest list, provider `listMethods()` empty/dynamic, core supports wider commands      |
| report bridge snapshot vs host projection mismatch                 | 保留 | P1       | public bridge snapshot shape differs from manifest/host scope projection                 |

## 最终保留项

- Align flow manifest/projection naming。
- Make spreadsheet manifest/action methods discoverable from one source of truth。
- Clarify/report bridge snapshot vs schema host projection contract。
- Move generic save-failed i18n keys out of report-designer namespace。
