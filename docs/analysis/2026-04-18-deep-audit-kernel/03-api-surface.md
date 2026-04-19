# 维度03：API表面积与契约一致性 — 初审报告

**审核日期**: 2026-04-18

## 发现

### [维度03-1] RendererHookApi 契约类型不完整 — P2
- **文件**: packages/flux-core/src/types/renderer-hooks.ts:109-134
- **现状**: 接口定义了24个hook方法，但flux-react实际导出26个（多了useCurrentFormState和useCurrentFormModelGeneration）
- **建议**: 补充这两个hook到契约类型

### [维度03-2] flux-core/types.ts 冗余 type re-export — P3
- **文件**: packages/flux-core/src/types.ts:2
- **现状**: TemplateNode/TemplateProviderPlan的re-export已通过types/index.ts链路覆盖

### [维度03-3] rendererHooks 便捷导出对象无外部消费者 — P3
- **文件**: packages/flux-react/src/hooks.ts:404-430
- **现状**: 整个仓库无任何消费者通过rendererHooks.xxx使用

### [维度03-4] dateHelper 公开导出仅被内部和测试消费 — P3（观察项）
- **文件**: packages/flux-formula/src/index.ts:21
- **现状**: 作为公开API保留是合理的（表达式运行时扩展点）

## 跨包契约一致性

| 契约 | 状态 |
|------|------|
| ScopeRef | ✅ 一致 |
| FormStoreApi / PageStoreApi | ✅ 一致 |
| RendererComponentProps | ✅ 一致 |
| FormRuntime | ✅ 一致 |
| exports map 对齐 | ✅ 一致 |
| 无死代码 | ✅ 确认 |

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: RendererHookApi 缺2个hook | **保留** | **成立**（22+跨包消费者，接口不完整） | P2 |
| F2: flux-core/types.ts 冗余 re-export | **保留** | **成立**（链路已覆盖，死导出） | P3 |
| F3: rendererHooks 便捷对象零消费者 | **保留** | **成立**（零 import/usage，且自身缺 useCurrentFormState） | P3 |
| F4: dateHelper 公开导出仅内部消费 | **保留** | —（观察项） | P3 |
