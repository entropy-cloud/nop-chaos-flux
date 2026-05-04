# 维度 08：验证系统一致性

## 复核状态：零发现确认

### 架构契约对齐确认

| 契约条款                                             | 实现状态                              |
| ---------------------------------------------------- | ------------------------------------- |
| 验证 owner = 最近的 validation-capable scope runtime | ✅ form-runtime-owner.ts              |
| fieldStates = single flat map (true\|undefined)      | ✅ form-store.ts:68-73                |
| Async generation-aware stale suppression             | ✅ form-runtime-validation.ts:148-158 |
| Hidden field skip + clear errors                     | ✅ form-runtime-field-ops.ts:242-290  |
| showErrorOn = UI display filter only                 | ✅ field-error-visibility.ts          |
| Registration containment check                       | ✅ form-runtime-field-ops.ts:101-121  |
| Submit supersedes lower-priority work                | ✅ form-runtime-submit-flow.ts:146    |
| Lifecycle transitional state rejection               | ✅ form-runtime-submit-flow.ts:93-99  |

### 复核确认

generation-aware stale suppression 通过 `capturedGeneration = sharedState.modelGeneration` + 多检查点比对实现，机制完整。
