# 维度 03：API 表面积与契约一致性

## 复核状态：1×Low 保留

### 发现

### [维度03] flux-action-core 无消费者 re-export

- **文件**: `packages/flux-action-core/src/index.ts:37`
- **严重程度**: Low
- **现状**: re-export `cancelPendingDebounce`/`scheduleDebounce` from flux-core，无下游消费者使用此路径
- **风险**: API 表面积混乱
- **建议**: 移除 re-export
- **复核状态**: 子项复核通过

### 合规确认

- ✅ 核心契约类型（RendererComponentProps, ScopeRef, RendererRegistry）统一归 flux-core
- ✅ package.json exports 字段与 index.ts 对齐
- ✅ 无死代码文件
- ✅ 跨包契约一致
