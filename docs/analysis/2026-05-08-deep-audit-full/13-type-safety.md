# 13 Type Safety

- 深挖轮次: 1
- 深挖发现数: 0

## 第 1 轮初审

### 零发现结论

本轮按维度 13「类型安全与动态边界」执行了全量初审，未发现需要作为正式 finding 报告的类型安全问题。

检查范围包括：

- 必读文档：`docs/index.md`、`AGENTS.md`、`docs/references/deep-audit-calibration-patterns.md`、`docs/references/reopened-design-decisions-and-audit-adjudications.md`、`docs/skills/deep-audit-prompts.md` 中共享提示词前缀、发现条目完整性守则、维度 13 正文、附录 A、`docs/skills/react19-best-practices-review.md` 的低代码例外章节、`docs/references/renderer-interfaces.md`。
- 代码搜索范围：`packages`、`apps`、`scripts`、`tests`。
- 重点检查项：explicit `any`、多重断言、`@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`、内部已有精确类型但仍对外暴露危险 `any`、文档不可读的危险公开 API。
- 已知历史项排除：未重报 230 已修的 `object-field dispatch any`，也未重报 229/224 已修残留。

## any 使用统计摘要

- 全仓 explicit `any` 命中约 1159 处，分布在 244 个 `.ts/.tsx` 文件。
- 非测试/非 `__tests__`/非 spec 路径约 183 处。
- 按维度 13 的低代码例外口径分类：合理约 183 处生产代码命中基本都属于 schema/runtime payload/action/host/formula/异构注册表/第三方库透传/动态 scope 或测试支撑边界；可疑 0 个达到正式 finding 门槛；危险 0 个。
- `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`: 未发现。

## 问题清单

本轮无正式问题清单。

已排除的典型非问题包括：

- `RendererEnv.functions` / `filters`、`FormulaFunction`、公式 evaluator 中的 `any`: 属于 host 注入与表达式系统动态边界。
- `RendererResolvedProps<S> = Record<string, any> & Partial<S>`: 文档明确为低代码 runtime resolved props 的当前 typing baseline。
- `RendererHelpers.dispatch(action: any)` 实现侧: 公开接口仍约束为 `ActionSchema | ActionSchema[] | CompiledActionProgram`，实现签名用于多态 action 动态边界，不重报已修的 object-field dispatch any。
- `ScopeRef` / `ScopeStore` / form values 中的 `Record<string, any>`: 动态 scope 与表单值边界。
- `CompiledRuntimeValue<T>` 的若干 `as unknown as`: 当前 `ExpressionCompiler.compileValue<T>` 已有泛型能力，代码可未来清理，但未形成公开 API 不可读或运行时错误证据，不作为第 1 轮 finding。
- 测试、e2e、test-support 中大量 `as any`: 主要用于 mock、坏输入注入、第三方组件替身和断言内部状态，不作为生产类型安全缺陷。

未发现新的问题。深挖结束。

## 维度复核结论

- [维度13-零发现] 保留：已按阶段二规则回到 live code 复查生产代码中的 explicit `any`、`@ts-ignore/@ts-expect-error/@ts-nocheck`、`as unknown as` 多重断言与公开 API 类型边界；未发现越过维度13举证门槛的真实类型安全缺陷。现有命中主要落在低代码动态边界、scope/form values、公式/host 注入、异构 renderer/action/schema 桥接、测试支撑或局部 React/event 类型适配；未发现 TS suppress 注释，也未发现内部已有精确类型却对外危险暴露 `any` 且造成可证运行时风险的案例。
- 需子项复核：无。

## 子项复核结论

- [维度13-零发现] 保留：零发现结论已由独立复核确认，无需额外子项复核。

最终进入汇总：无。
