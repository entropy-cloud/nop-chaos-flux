# 维度13：类型安全与动态边界 — 初审报告

**审核日期**: 2026-04-18

---

## 统计概览

| 包 | : any | as any | as unknown as | @ts-expect-error |
|---|---|---|---|---|
| flux-core | 3 | 0 | 0 | 0 |
| flux-formula | 4 | 8 | 0 | 0 |
| flux-runtime | 15 | 69(~60在测试中) | 11 | 0 |
| flux-react | 1 | 2 | 2 | 0 |

## 可疑/有收敛空间的发现

### [维度13-1] node-runtime.ts state?: any 丢失精确类型 — P2
- **文件**: packages/flux-runtime/src/node-runtime.ts:54
- **现状**: `state?: any` 但实际类型是 `RuntimeValueState<unknown>`
- **建议**: 改为 `state?: RuntimeValueState<unknown>`

### [维度13-2] action-runtime-handlers.ts 冗余 as any — P3
- **文件**: packages/flux-runtime/src/action-runtime-handlers.ts:102
- **现状**: 类型本就匹配的冗余断言
- **建议**: 直接删除

### [维度13-3] navigate 签名与实际使用不匹配 — P2
- **文件**: packages/flux-runtime/src/action-runtime-handlers.ts:226-228
- **现状**: 声明 `(to: string)` 但实际传 `-1`(number) 和 `{replace: true}`
- **建议**: 修改签名以反映真实使用

### [维度13-4] setTimeout 返回值断言为 setInterval 返回类型 — P3
- **文件**: packages/flux-runtime/src/data-source-runtime.ts:643
- **建议**: 统一计时器类型

### [维度13-5] schema-compiler fields.ts as any 可避免 — P3
- **文件**: packages/flux-runtime/src/schema-compiler/fields.ts:74
- **建议**: 改用更精确的联合类型

### [维度13-6] lifecycleActions 类型 unknown 应收窄 — P3
- **文件**: packages/flux-react/src/node-renderer-effects.ts:67,74
- **建议**: 将 `unknown` 收窄为 `ActionSchema | ActionSchema[]`

## 合理的 any（不报告）

- 异构容器 existential 擦除（RendererDefinition.component）
- Host 注入边界（functions/filters）
- 公式求值器动态类型（evaluator.ts 7处）
- 注册表边界（validators.ts, registry.ts）
- 动态 scope 数据桥接（hooks.ts 2处，有注释）
- API 响应缓存中间层（request-runtime.ts）
- 测试辅助代码（~60处 as any）

---

## 复核结论

| 发现 | 维度复核 | 子项复核 | 最终严重程度 |
|------|---------|---------|------------|
| F1: node-runtime.ts state?: any | **保留** | **成立**（应为 RuntimeValueState&lt;T&gt;） | P2 |
| F2: action-runtime-handlers.ts 冗余 as any | **保留** | **成立**（两端同为 RendererRuntime） | P3 |
| F3: navigate 签名不匹配 | **保留** | **成立**（to 应为 string\|number，options 需类型化） | P2 |
| F4: setTimeout 返回值断言 | **保留** | **成立**（类型谎言，应为 ReturnType&lt;typeof setTimeout&gt;） | P3 |
| F5: schema-compiler fields.ts as any | **保留** | **成立**（可用 mapped type 避免） | P3 |
| F6: lifecycleActions 类型 unknown | **保留** | **成立**（应为 ActionSchema\|ActionSchema[]\|undefined） | P3 |
