# 维度 13：类型安全与动态边界

## 第 1 轮（初审）

包级摘要（非测试源码，聚焦 `any`、双重断言、明显边界重塑）：

- `@nop-chaos/flux-react`: 少量公共 API 级弱化类型，最值得保留的是 `helpers.tsx` 里公共 `dispatch` 被降成 `any`。
- `@nop-chaos/flux-compiler`: 有一组 `as unknown as CompiledRuntimeValue<...>`；多数是冗余重标注，本轮保留 1 处真实不安全的 `resultMapping` 类型伪装。
- `@nop-chaos/flux-renderers-data`: 有几处 CRUD -> Table 的桥接断言，但大多仍处于低代码动态边界内，本轮未保留为缺陷。
- `@nop-chaos/flux-core` 与 `@nop-chaos/flux-formula`: 存在动态求值或路径工具所需的弱类型；按本次基线未机械上报。

### [维度13-01] 公共 renderer helper 的 `dispatch` 用 `any` 抹掉了动作边界

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\helpers.tsx:119-131`
- **证据片段**:
  ```ts
  export function createHelpers(input: {
    runtime: RendererRuntime;
    scope: ScopeRef;
    actionScope?: ActionScope;
    componentRegistry?: ComponentHandleRegistry;
    form?: FormRuntime;
    page?: PageRuntime;
    surfaceRuntime?: SurfaceRuntime;
  }): RendererHelpers {
    const dispatch = (action: any, ctx?: Partial<ActionContext>) =>
      input.runtime.dispatch(action, mergeActionContext(input, ctx));
  ```
- **严重程度**: P2
- **分类**: 危险
- **现状**: `createHelpers()` 返回的是 repo 级公共 `RendererHelpers`，但内部把 `dispatch` 参数直接降成了 `any`。
- **真实风险**: 调用方会在最靠近 renderer 的位置失去 `ActionSchema | ActionSchema[] | CompiledActionProgram` 这层静态约束，任意对象都能被传进去；真正的失败会被推迟到更深层 `runtime.dispatch()`，定位点远离调用现场。
- **建议**: 直接用已有精确签名，例如 `const dispatch: RendererHelpers['dispatch'] = (action, ctx) => ...`，或显式写出 `ActionSchema | ActionSchema[] | CompiledActionProgram`。
- **为什么值得现在做**: 这是单点收紧、全局受益的公共 helper；修复成本很低，但能立刻阻止 renderer/plugin 侧误传。
- **误报排除**: 这不是在 schema/runtime 动态边界上机械排斥弱类型；这里已经进入标准化后的公共 helper API，且本地已有更精确类型可直接复用。
- **历史模式对应**: 更接近弱类型不要扩散进核心逻辑，而不是低代码天然弱类型边界的可降级情形。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `docs/skills/react19-best-practices-review.md`
- **复核状态**: 未复核

### [维度13-02] `resultMapping` 在编译期被伪装成 `Record<string, string>`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\source-compiler.ts:125-129`
- **证据片段**:
  ```ts
  if (schema.resultMapping !== undefined) {
    compiled.resultMapping = compiler.compileValue(schema.resultMapping, {
      ...options,
      sourcePath: `${basePath}.resultMapping`,
    }) as unknown as CompiledRuntimeValue<Record<string, string>>;
  }
  ```
- **严重程度**: P2
- **分类**: 危险
- **现状**: `schema.resultMapping` 的源类型允许 `Record<string, SchemaValue>`，但这里被双重断言成了 `CompiledRuntimeValue<Record<string, string>>`。
- **真实风险**: 这会向后续编译、runtime、工具链传递错误信息，好像 `resultMapping` 的求值结果只能是字符串映射；但真实运行时可得到数字、布尔、对象甚至嵌套结构。当前 runtime 已把它重新按 `CompiledRuntimeValue<unknown>` 处理，说明上下游契约已不一致。
- **建议**: 对齐真实边界：把 `CompiledDataSource.resultMapping` 改成与运行时一致的更宽类型，至少 `Record<string, unknown>`，删除这层 `as unknown as`；若确实只允许字符串路径映射，应先在 schema/validator 层收紧，而不是在 compiler 里伪装。
- **为什么值得现在做**: 这是 compile/runtime 之间的核心类型契约问题，面不大，但能避免后续在数据源链路上继续累积看起来更强、实际上更假的类型。
- **误报排除**: 不是机械抱怨 `unknown` 或动态对象；低代码动态边界本来允许弱类型。这里的问题恰恰相反：代码把动态结果假装成了更窄、更确定的类型。
- **历史模式对应**: 当前 live compile/runtime 契约直接不一致。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `docs/skills/react19-best-practices-review.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度13-03] spreadsheet-page 把动态 resolved props 直接伪装成 `SpreadsheetDocument` 或 `SpreadsheetConfig`

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\page-renderer.tsx:92-105`
- **证据片段**:

  ```ts
  export function SpreadsheetPageRenderer(props: RendererComponentProps<SpreadsheetPageSchema>) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const resolvedDocument = props.props.document as SpreadsheetDocument;
    const resolvedConfig = props.props.config as SpreadsheetConfig | undefined;
    const resolvedReadOnly = props.props.readOnly as boolean | undefined;

    const spreadsheetCore = useMemo(
      () =>
        createSpreadsheetCore({
          document: resolvedDocument,
          config: resolvedConfig,
  ```

- **严重程度**: P2
- **分类**: 危险
- **现状**: renderer contract 基线里 `props.props` 只是 resolved runtime values，本质仍是 `Record<string, unknown>`；这里却把 `document`、`config`、`readOnly` 直接断言成 spreadsheet core 需要的强类型，再立刻传入 `createSpreadsheetCore(...)`。
- **真实风险**: 一旦 host schema、表达式结果或外部注入把 `document` 解析成错误形态，类型系统不会再给任何保护，但 `createSpreadsheetCore()` 会按真实 `SpreadsheetDocument` 语义立即读取内部结构，结果不是安静降级，而是页面挂载时直接崩溃。
- **建议**: 在 renderer 边界先做真实 runtime narrowing，而不是裸 `as`。至少用局部 type guard 校验 `document.workbook.sheets` 的基本形态、`config` 是否为对象、`readOnly` 是否为 boolean；校验失败时走明确 fallback 或 diagnostic，而不是把假类型继续下传给 core。
- **为什么值得现在做**: 这是 owner core 的入口边界，改动面很小，但能把类型看起来安全、运行时直接炸的问题收敛在 page renderer 一层，而不是让 spreadsheet core 被迫承受脏输入。
- **误报排除**: 这不是机械反对低代码场景里的弱类型。弱类型本来允许存在于 schema/runtime 动态边界；这里的问题是代码把该边界伪装成了已经验证过的强类型，并把它直接送进强约束 core 构造函数。
- **历史模式对应**: 与本轮已保留的 compile/runtime 边界把动态结果伪装成更窄类型 是同一类问题，只是这里发生在 renderer -> owner core 的实时入口。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `AGENTS.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度13-04] flow-designer page 用泛型 helper 伪收窄 `config`、`document`、`treeDocument`，且只做 truthy 检查

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx:19-44`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-tree-mode.tsx:10-23`
- **证据片段**:

  ```ts
  function readDesignerResolvedProp<T>(
    props: RendererComponentProps<DesignerPageSchema>,
    key: string,
  ): T | undefined {
    return props.props[key] as T | undefined;
  }

  const config = readDesignerResolvedProp<DesignerConfig>(props, 'config');
  if (!config) {
  ```

- **严重程度**: P2
- **分类**: 危险
- **现状**: `readDesignerResolvedProp<T>()` 只是对 `props.props[key]` 做泛型断言，没有任何真实 narrowing；随后页面层只靠 truthy 检查来决定是否进入 graph 或 tree 主路径。
- **真实风险**: 任意 truthy 值都可能被当成 `DesignerConfig`、`GraphDocument` 或 `TreeDocument`。这会让错误输入穿过页面边界，进一步驱动 mode 分支选择、`createDesignerCore(...)` 初始化、tree/graph 投影与 shell 渲染；最终故障点会延后到更深层 owner 逻辑，表现为挂载崩溃、模式误判或 split-brain 异常，而不是在入口处得到清晰拒绝。
- **建议**: 删除这个泛型即校验的 helper，改成显式 runtime guards，例如 `isDesignerConfig`、`isGraphDocument`、`isTreeDocument`；布尔型入口不要用 truthiness 代替结构校验。校验失败时返回现有 fallback 文案，必要时补 host diagnostics。
- **为什么值得现在做**: Flow Designer page 是 host-facing 根入口之一；现在修正能同时收紧 graph 模式与 tree 模式两条主路径，避免以后继续复制这种假收窄 helper。
- **误报排除**: 这不是要求所有 dynamic prop 都做过度严格验证。问题在于当前 helper 明面上提供了已收窄类型的错觉，但实际只做 `as T`，后续代码再用 truthy 当结构合法性替代，已经越过了可接受的动态边界噪声。
- **历史模式对应**: 属于弱类型不要扩散进核心逻辑 的重复模式；同时也与 owner/bridge/coherence 类历史问题相邻，因为错误入口值会把 page shell、mode 分支和 designer core 推入不一致状态。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `AGENTS.md`; `docs/references/architecture-guardrails-from-bugs.md`
- **复核状态**: 未复核

## 维度复核结论

- 结论: 保留新增发现。
- 理由: 复核后 `13-01` 到 `13-04` 都仍成立，且问题集中在同一类动态边界伪收窄：公共 helper 把 `dispatch` 降成 `any`，compiler 用双重断言把 `resultMapping` 伪装成更窄结果类型，spreadsheet page 与 flow-designer page 则把 `props.props` 里的动态 resolved 值直接断言成 owner core 期待的强类型。它们都不是低代码天然弱类型的合理容忍，而是已经越过边界后继续向内层传播假强类型。

## 子项复核结论

- `13-01`: 保留。问题点位于公共 `RendererHelpers` API，而不是局部实现细节。
- `13-02`: 保留。`compile` 与 `runtime` 对 `resultMapping` 的类型口径仍未对齐。
- `13-03`: 保留。`SpreadsheetPageRenderer` 入口确实把动态 props 直接伪装成 `SpreadsheetDocument` / `SpreadsheetConfig`。
- `13-04`: 保留。`readDesignerResolvedProp<T>()` 没有任何真实 narrowing，后续仍只靠 truthy 检查驱动 graph/tree 主路径。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                                                                | 一句话摘要                                                    |
| ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 13-01 | P2       | `packages/flux-react/src/helpers.tsx:119-131`                                                                                       | 公共 renderer helper 的 `dispatch` 用 `any` 抹掉动作边界      |
| 13-02 | P2       | `packages/flux-compiler/src/source-compiler.ts:125-129`                                                                             | `resultMapping` 在编译期被伪装成 `Record<string, string>`     |
| 13-03 | P2       | `packages/spreadsheet-renderers/src/page-renderer.tsx:92-105`                                                                       | spreadsheet page 把动态 resolved props 直接断言成 core 强类型 |
| 13-04 | P2       | `packages/flow-designer-renderers/src/designer-page.tsx:19-44`; `packages/flow-designer-renderers/src/designer-tree-mode.tsx:10-23` | flow-designer page 用泛型 helper 伪收窄动态 props             |
