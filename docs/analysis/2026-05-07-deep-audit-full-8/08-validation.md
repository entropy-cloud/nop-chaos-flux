# 维度 08: 验证系统一致性

## 深挖轮次

- 第 1 轮: surface bootstrapping owner, no-model success, dependent one-layer, hidden descendant async。
- 第 2 轮: runtime registration stale/index, non-form owner/FieldFrame, hidden hint/aria, hidden policy。
- 第 3 轮: submit child snapshot, hiddenFields refresh, clear descendant values。
- 第 4 轮: array externalErrors remap。
- 第 5 轮: projected writes, applyChanges external errors, validation overwrites external errors。

## 维度复核结论

| 条目                                                               | 结论 | 严重程度 | 证据/说明                                                                           |
| ------------------------------------------------------------------ | ---- | -------- | ----------------------------------------------------------------------------------- |
| action-opened surface validation owner bootstrapping no activation | 保留 | P1       | `surface-runtime.ts:122-129`; no refresh/activate path in `dialog-host.tsx`         |
| validateForm/validateSubtree no model returns success              | 降级 | P2       | no model/no registrations path returns clean success; not always submit blocker     |
| dependent revalidation one layer                                   | 保留 | P2       | `form-runtime-owner.ts:96-148` only direct dependents                               |
| hidden parent doesn't invalidate descendants async                 | 保留 | P1       | `form-runtime-field-ops.ts:306-315`; descendant runs/controllers not invalidated    |
| runtime registration async/stale weaker                            | 降级 | P2       | runId/modelGeneration guard exists; no abort/governance                             |
| childPaths index not updated                                       | 驳回 | -        | live code updates old/new child path map                                            |
| non-form owner modelGeneration/FieldFrame issues                   | 降级 | P3       | partial generic validation owner handling exists; weak consistency only             |
| hidden error hides hint/aria                                       | 保留 | P2       | `field-frame.tsx` uses `!error` not `!showError` for hint/description ids/rendering |
| runtime registration hidden policy                                 | 保留 | P2       | runtime-only registration lacks per-registration hidden policy                      |
| submit child contracts not snapshot                                | 保留 | P2       | submit iterates live `childContracts.values()` after awaits                         |
| hiddenFields not cleared on refresh                                | 保留 | P2       | refresh clears many maps but not `hiddenFields`                                     |
| clearValueWhenHidden descendants                                   | 保留 | P2       | hide parent clears parent value only, not descendant policies                       |
| array externalErrors remap                                         | 保留 | P1       | array mutation remaps fieldStates/runs but not external error side map              |
| projected validation writes not prefixed                           | 保留 | P1       | `projected-validation-runtime.ts` prefixes changedPaths but not writes              |
| applyChanges no external error clear                               | 保留 | P1       | owner apply changes writes values without `clearExternalErrorsForPath`              |
| validation overwrites/removes external errors                      | 保留 | P1       | normal validation replaces/deletes field errors without external overlay merge      |

## 子项复核

验证 P1 子项复核确认 A, C, D, E, F 成立；hidden descendant async 成立但范围限定为 in-flight async residual。

## 最终保留项

- P1: surface owner activation, hidden descendant async invalidation, external error remap/clear/overlay, projected writes prefix。
- P2: dependency closure, no-model semantics, hiddenFields refresh, child snapshot, FieldFrame hint/aria。
