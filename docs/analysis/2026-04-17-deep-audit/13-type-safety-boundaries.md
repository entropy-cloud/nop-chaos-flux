# 13 类型安全与动态边界

- Task ID: `ses_268cac141ffeYNzPyFPpuY790y`
- Source prompt: `docs/skills/deep-audit-prompts.md`

# 维度13审计：类型安全与动态边界

统计口径：基于 `packages/**` 下 `: any` / `as any` / `any[]` / `<T = any>` 等 explicit any 的行级命中做分组；“合理”主要包括测试桩、mock、受控动态边界；详细清单只列需要关注的可疑/危险项。

## any 使用统计（按包分组）

| 包 | 合理 | 可疑 | 危险 |
|---|---:|---:|---:|
| flow-designer-core | 22 | 0 | 0 |
| flow-designer-renderers | 38 | 2 | 0 |
| flux-code-editor | 3 | 0 | 3 |
| flux-core | 0 | 18 | 5 |
| flux-formula | 4 | 15 | 1 |
| flux-react | 23 | 14 | 0 |
| flux-renderers-basic | 1 | 2 | 0 |
| flux-renderers-data | 3 | 11 | 2 |
| flux-renderers-form | 5 | 2 | 0 |
| flux-renderers-form-advanced | 45 | 9 | 2 |
| flux-runtime | 106 | 54 | 0 |
| report-designer-core | 7 | 1 | 0 |
| report-designer-renderers | 18 | 4 | 0 |
| spreadsheet-core | 4 | 0 | 0 |
| spreadsheet-renderers | 6 | 2 | 0 |
| word-editor-core | 11 | 0 | 0 |
| word-editor-renderers | 59 | 0 | 0 |
| ui | 0 | 0 | 0 |
| tailwind-preset | 0 | 0 | 0 |
| theme-tokens | 0 | 0 | 0 |
| nop-debugger | 0 | 0 | 0 |
| packages/types | 0 | 0 | 0 |

补充检查结论：

- `@ts-expect-error` / `@ts-ignore`：在 `packages/**` 下未发现。
- `packages/types/`：目录不存在，未发现全局声明污染风险。
- `as unknown as Xxx`：生产代码里有少量 host/boundary 转换，但本轮未发现比下列问题更高优先级的新增逃逸口。
- `Record<string, unknown>`：大多数落在 schema/runtime payload 边界，未见需要单独上报的普遍误用。

### [维度13] RendererDefinition 对外类型把 schema 泛型擦成 `any`
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\renderer-core.ts:97-100`
- **严重程度**: P1
- **分类**: 危险
- **现状**: `RendererDefinition<S>` 的 `component` 被定义为 `ComponentType<RendererComponentProps<any>>`。
- **逃逸路径**: 渲染器注册表接受 `RendererDefinition<S>` 后，组件 props 的 schema 泛型在公共 API 边界被抹掉，后续所有 renderer 定义都能把 `props.props` 退化为 `any` 风格消费。
- **建议**: 改成 `ComponentType<RendererComponentProps<S>>`；若注册表内部需要异构容器，保留内部 existential wrapper，不要在公开类型面暴露 `any`。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-core.md`

### [维度13] RendererEnv 的 functions/filters 在公开 API 上直接暴露 `any`
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\renderer-api.ts:54-60`
- **严重程度**: P1
- **分类**: 危险
- **现状**: `functions?: Record<string, (...args: any[]) => any>`，`filters?: Record<string, (input: any, ...args: any[]) => any>`。
- **逃逸路径**: host env 注入后，`any` 直接进入公式求值与运行时调用面，调用方/实现方两侧都丢失参数与返回值约束。
- **建议**: 公开类型至少收敛到 `unknown[] -> unknown`；如需保留灵活性，可用泛型 helper 或注册函数包装器，而不是在顶层 API 暴露 `any`。
- **参考文档**: `docs/architecture/flux-core.md`

### [维度13] CodeEditorSchema 的公开 schema 字段使用 `any`
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-code-editor\src\types.ts:27-44`
- **严重程度**: P1
- **分类**: 危险
- **现状**: `expressionConfig?: any`、`sqlConfig?: any`、`options?: any`。
- **逃逸路径**: schema -> 编译/解析 -> renderer props -> editor 扩展消费，全链路都接受未收敛的 `any`，而该文件本身已经定义了更具体的 `ExpressionEditorConfig` / `SQLEditorConfig`。
- **建议**: 公开 schema 面改为 `unknown` 或可序列化边界类型，再在解析阶段用 type guard 收敛；`options` 至少可改成 `Record<string, unknown>`。
- **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度13] Condition Builder 公开 schema 仍以 `any[]` / `any` 暴露核心配置
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\types.ts:133-149`
- **严重程度**: P1
- **分类**: 危险
- **现状**: `fields?: any[]`、`operators?: any`。
- **逃逸路径**: 表单 schema 直接把条件字段定义与操作符配置放成 `any`，后续 condition-builder 内部逻辑、渲染和校验都无法在编译期约束。
- **建议**: `fields` 改为 `ConditionField[]`；`operators` 改为明确的 override/config 类型，至少先收敛到 `Record<string, unknown>` + runtime guard。
- **参考文档**: `docs/architecture/form-validation.md`, `docs/architecture/renderer-runtime.md`

### [维度13] ChartSchema 的公开数据入口仍是 `any`
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\chart-schemas.ts:12-18`
- **严重程度**: P2
- **分类**: 危险
- **现状**: `series?: any`、`source?: any`。
- **逃逸路径**: 图表 schema 的核心输入直接以 `any` 进入 renderer/data adapter，后续很难区分“低代码边界数据”与“内部已收敛结构”。
- **建议**: 用显式 union 表达支持形态；若暂时无法完全建模，也应先改成 `unknown` 并在消费前集中收敛。
- **参考文档**: `docs/architecture/renderer-runtime.md`

### [维度13] 编译后的 action 在 React 层被存成 `unknown`，再用 `as any` 送入 dispatch
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\node-identity.ts:76-90`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\helpers.tsx:103-115`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer.tsx:159-175`, `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer-effects.ts:65-79`
- **严重程度**: P1
- **分类**: 可疑
- **现状**: `TemplateNode.eventPlans` / `lifecycleActions` 用 `unknown` 保存；`createHelpers().dispatch` 实现签名是 `(action: any)`；React 层在事件和生命周期里大量 `as any` 后再调 runtime。
- **逃逸路径**: schema 编译结果 -> `TemplateNode` -> React renderer -> `helpers.dispatch(any)` -> runtime action dispatcher；`any` 从边界跨进了所有 renderer 的公共执行路径。
- **建议**: 在编译产物层把 action 收敛成 `ActionSchema | ActionSchema[]`；让 `createHelpers` 与 `RendererHelpers` 的实现签名一致，删除 React 层 `as any`。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`

### [维度13] Node runtime 在核心求值路径上把状态参数降成 `any`
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\node-runtime.ts:49-60`
- **严重程度**: P2
- **分类**: 可疑
- **现状**: `evaluateCompiledValue<T>(..., state?: any)`。
- **逃逸路径**: `NodeRuntimeState.meta/props` 的运行时状态进入表达式编译器前被擦掉类型，后续 `evaluateValue` 无法依赖 `RuntimeValueState<T>` 保持一致性。
- **建议**: 将参数改成 `RuntimeValueState<T> | undefined`；若确有多态状态需求，也应引入受控 union，而不是直接 `any`。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`

### [维度13] 内建校验器注册表用 `SyncValidator<any>` 擦除了 rule-kind 对应关系
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\validation\validators.ts:16-24`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\validation\validators.ts:100-202`
- **严重程度**: P2
- **分类**: 可疑
- **现状**: `builtInValidators` 被声明为 `Record<SyncValidationRuleKind, SyncValidator<any>>`。
- **逃逸路径**: validator map 建立时就丢掉了 `kind -> rule subtype` 的静态映射，新规则一旦接错字段，调用侧很难在编译期发现。
- **建议**: 改成映射类型：`{ [K in SyncValidationRuleKind]: SyncValidator<Extract<SyncValidationRule, { kind: K }>> }`。
- **参考文档**: `docs/architecture/form-validation.md`

### [维度13] Formula 注册函数的公开签名仍是 `(...args: any[]) => any`
- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-formula\src\registry.ts:1-4`
- **严重程度**: P2
- **分类**: 危险
- **现状**: `FormulaFunction` 公开类型直接使用 `any` 入参与返回值。
- **逃逸路径**: registry -> evaluator 调用链会默认接受/返回任意值，外部注册函数的弱类型可直接扩散进公式核心执行面。
- **建议**: 公开类型先收敛到 `(...args: unknown[]) => unknown`；确需强类型内建函数时，用单独 helper/overload 保留精确信息。
- **参考文档**: `docs/architecture/flux-core.md`

## 结论

本维度不是“any 很多”，而是“少数公开类型与核心执行路径仍在放大 any”。本轮最值得优先收敛的是：

1. `flux-core` 的公开类型面：`RendererDefinition`、`RendererEnv`
2. 公开 renderer schema：`flux-code-editor`、`condition-builder`、`chart`
3. React -> runtime 的 action 传递链
4. runtime/validation/formula 的少数核心内部擦除点

其余大量命中主要集中在测试、mock 和动态边界，当前不建议作为问题批量上报。
