# 维度 17：命名与术语一致性

## 审核范围

检查同一概念在代码库中的命名一致性、术语偏离、命名模式统一性。

## 发现清单

### [维度17] adaptor vs adapter 拼写不一致

- **文件**: `packages/flux-core/src/types/schema.ts:107-108` vs `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts`
- **严重程度**: P2
- **冲突名称**: `adaptor` vs `adapter`
- **冲突位置**: flux-core ApiSchema 中使用 `adaptor`，flux-runtime 中文件名和代码使用 `adaptor`。标准英语两种拼写均可，但项目应统一。
- **统一建议**: 项目中 `adaptor` 占多数（源在 flux-core），统一为 `adaptor`。
- **为什么值得现在做**: 拼写不一致增加搜索成本和新人困惑。
- **误报排除**: 不是低代码动态边界的合理容忍——这是纯拼写问题。
- **参考文档**: `docs/references/terminology.md`
- **复核状态**: 维度复核通过

### [维度17] RendererRendererClass 双前缀

- **文件**: `packages/flux-core/src/types/renderer-core.ts:118`
- **严重程度**: P2
- **冲突名称**: `RendererRendererClass`
- **冲突位置**: 类型名包含重复的 "Renderer" 前缀。
- **统一建议**: 简化为 `RendererClass` 或 `RendererComponentClass`。
- **复核状态**: 维度复核通过

### 已驳回项

1. **ValidationPlan 类型别名** — 仅是透明类型别名（type alias），不构成命名冲突。实际使用中与底层类型名一致。

## 已确认的正确命名

- ScopeRef / scope / scopeRef 用法一致 ✓
- RendererRuntime / runtime / env 用法一致 ✓
- CompiledSchemaNode / TemplateNode 区分清晰 ✓
- FormStoreApi / FormRuntime 用法一致 ✓
- 工厂函数统一 create* 前缀 ✓
- 注册函数统一 register* 前缀 ✓
- use* 前缀仅用于 React hooks ✓
- 测试文件统一 .test.ts / .test.tsx 后缀 ✓
- 文件命名模式一致 ✓

## 总结评估

2 个 P2（adaptor/adapter 拼写、RendererRendererClass 双前缀）。整体术语一致性高，与 terminology.md 对齐良好。
