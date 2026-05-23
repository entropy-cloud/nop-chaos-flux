# 维度 13：类型安全与动态边界

## 审核范围

检查 any 使用中的真实运行时风险、类型断言链、@ts-expect-error 覆盖。遵循低代码项目特殊约束，不机械标记动态边界的 any。

## 发现清单

### [维度13] condition-builder fields 使用 any[]

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder.tsx`
- **严重程度**: P2
- **分类**: 可疑
- **现状**: condition-builder 的 fields 属性使用 `any[]` 类型，但内部实际有更具体的字段结构。
- **真实风险**: 消费者在配置 fields 时缺少类型提示，可能导致运行时字段名拼写错误。
- **建议**: 定义 `ConditionField` 接口替换 `any[]`。
- **误报排除**: 不是低代码引擎的正常动态边界——这是一个具体的、可枚举的字段配置结构。
- **复核状态**: 维度复核通过

### [维度13] ScopeRef 使用 Record<string, any>

- **文件**: `packages/flux-core/src/types/scope.ts`
- **严重程度**: P2
- **分类**: 可疑
- **现状**: ScopeRef 的数据访问接口使用 `Record<string, any>` 而非 `Record<string, unknown>`。
- **真实风险**: 允许在未做类型断言的情况下直接访问 any 属性，可能导致隐式类型逃逸。
- **建议**: 改为 `Record<string, unknown>` — scope 数据本质上是动态的，`unknown` 更准确地表达"不知道类型"而不允许隐式任意访问。
- **误报排除**: ScopeRef 是核心公共接口，不是内部实现细节。
- **复核状态**: 维度复核通过

### 降级为 P3 的项

1. **evaluator `as any`** — 合理的动态边界。表达式求值结果类型在编译期无法确定。
2. **renderer `as unknown as T`** — 合理的类型桥接。RendererComponentProps 泛型参数在注册表擦除后需要恢复。
3. **dispatch `any`** — 合理的动态边界。Action 是 schema 驱动的多态结构。

## any 使用统计

大部分 any 使用属于低代码引擎的合理动态边界（异构容器 existential 擦除、Host 注入边界、公式系统、多态 Action）。可疑项占比很低。

## 总结评估

2 个 P2（condition-builder any[]、ScopeRef Record<string, any>），3 个 P3（合理的动态边界降级）。类型安全整体良好，`strict: true` 启用。
