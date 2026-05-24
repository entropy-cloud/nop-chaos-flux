# 维度 13：类型安全与动态边界

## 第 1 轮（初审）

基于必读文档与维度 13 口径，本轮只保留 1 个“内部已有精确类型但用 `any` 绕过”的高价值可疑项。未报告低代码合理动态边界（schema / scope / form values / host function / formula / action / heterogenous registry）。

### [维度13-01] TaskFlow 图/树同步用 `any` 绕过已有联合类型，可能生成不自洽 Step

- **文件**: `apps/playground/src/taskflow-designer-lib/sync.ts:76-89,119-132,145-158`
- **证据片段**:

  ```ts
  const step = existing?.step ?? {
    id: gn.id,
    type: gn.type as any,
    common: { name: gn.id },
    props: { type: gn.type as any } as any,
  };

  if (existing) {
    step.common = (gn.data?.step as any)?.common ?? step.common;
  ```

  ```ts
  branchType: (branch.data?.branchType as any) ?? 'then',
  ```

- **严重程度**: P2
- **分类**: 可疑（内部已有更精确类型但未使用）
- **现状**: `TaskFlowStepType`、`TaskFlowStepProps`、`TaskFlowTreeBranch['data']['branchType']` 已在同目录 `types.ts` 中定义为有限联合类型，但同步入口直接把 `GraphDocument` / `TreeDocument` 的动态 data 断言成目标类型。
- **真实风险**: 若图节点 `gn.type` 是未知字符串，或 `gn.data.step.props` 与 `gn.type` 不匹配，`syncFromGraphDocument` 会生成 `step.type !== step.props.type` 或不符合 `TaskFlowStepProps` 联合分支的模型；后续 `validateAuthoringModel()` 会报错，`lowering.ts` 的 `switch (step.props.type)` 也可能跳过必要字段，导致保存/导出 DSL 丢失步骤配置。
- **建议**: 复用或提取 `isValidStepType()`、`buildProps()` 一类窄化逻辑；对 `branchType` 增加有限集合 guard；对 `gn.data.step` 只接受结构校验后的 `Partial<TaskFlowStep>`，否则 fallback 到由 `TaskFlowStepType` 构造的默认 props。
- **为什么值得现在做**: 这是 playground 内当前设计器同步路径，修复可以直接利用已有联合类型，避免保存/导出时才暴露模型不自洽。
- **误报排除**: 这不是 schema/runtime 边界上不可避免的动态对象。该文件内部目标模型已经有有限联合类型，且 `validation.ts` 明确检查 `step.type !== step.props.type`，说明类型不自洽会成为真实模型错误。
- **历史模式对应**: 内部已有精确类型但未用，`any` 将动态边界扩散到业务模型核心。
- **参考文档**: `docs/skills/react19-best-practices-review.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## any 使用统计

统计方法：用 `rg --count-matches "\bany\b" packages apps tests -g "*.ts" -g "*.tsx"` 重建总量；再用 explicit-any / chained-assertion / ts-comment 搜索抽查生产代码与测试代码。总计约 **1690** 处 `any` token，其中生产代码约 **211**，测试/规格约 **1479**。

| 包/区域                                 | any 总数 | 生产代码 | 测试/规格 | 合理 | 可疑 | 危险 |
| --------------------------------------- | -------: | -------: | --------: | ---: | ---: | ---: |
| `apps/playground`                       |       49 |       25 |        24 |   41 |    8 |    0 |
| `packages/flux-runtime`                 |      331 |       60 |       271 |  331 |    0 |    0 |
| `packages/flux-react`                   |      214 |        7 |       207 |  214 |    0 |    0 |
| `packages/flux-renderers-form-advanced` |      239 |       47 |       192 |  239 |    0 |    0 |
| `packages/flux-renderers-data`          |      160 |        3 |       157 |  160 |    0 |    0 |
| `packages/word-editor-renderers`        |      118 |        0 |       118 |  118 |    0 |    0 |
| `packages/flow-designer-renderers`      |       80 |        0 |        80 |   80 |    0 |    0 |
| `packages/flux-compiler`                |       73 |        3 |        70 |   73 |    0 |    0 |
| `packages/flux-core`                    |       54 |       26 |        28 |   54 |    0 |    0 |
| `packages/flux-formula`                 |       39 |       24 |        15 |   39 |    0 |    0 |
| 其他 packages + `tests/`                |      333 |       16 |       317 |  333 |    0 |    0 |

## 可疑/危险项清单

- 可疑：`[维度13-01]` `apps/playground/src/taskflow-designer-lib/sync.ts` 有 8 处 `any` token 绕过已有 TaskFlow 联合类型。
- 危险：本轮未确认有已导致运行时错误的 `any`。

## 其他抽查结论

- `@ts-expect-error` / `@ts-ignore`: 仅发现 `packages/spreadsheet-renderers/src/canvas-styles.test.ts` 两处 `@ts-expect-error`，均有 test-only/node runtime 说明；未发现 `@ts-ignore` / `@ts-nocheck`。
- 多重断言：生产代码存在若干 `as unknown as`，抽查后多为低代码/host/compiled expression 边界或经过运行时验证后的收敛；未保留为发现。
- 公开 API any 文档可读性：`RendererEnv.functions`、`FormulaFunction`、scope/form `Record<string, any>` 等符合维度 13 明示例外；未报告。

## 总结评估

本仓库 `any` 数量较高，但绝大多数集中在测试 mock、低代码动态数据边界、公式系统、scope/form values、host 注入、action/schema payload 等合理区域。第 1 轮只保留 1 个内部已有精确联合类型却用 `any` 绕过的可疑项；未发现新的高风险危险项。

## 第 2 轮深挖方向

- `apps/playground/src/taskflow-designer-lib/` 的 graph/tree 投影、同步、lowering 是否还有同类有限联合绕过。
- `packages/*/src/*manifest*` 与 provider 之间，是否存在“manifest 有精确 shape，但 provider 只靠断言”的未验证路径。
- 生产代码中的 `as unknown as RendererComponentProps<...>` 是否只是 bridge 适配，还是掩盖了 props/node/templateNode 类型不自洽。

## 深挖第 2 轮追加

### [维度13-02] TaskFlow 实现的联合类型比当前架构契约少一大半，导入/编辑会把合法 DSL 类型降级为 `script`

- **文件+行号**: `apps/playground/src/taskflow-designer-lib/types.ts:1-9`; `apps/playground/src/taskflow-designer-lib/index.ts:551-562,623-648`; `docs/architecture/taskflow-visual-designer.md:233-256,327-390`
- **证据片段**:

  ```ts
  export type TaskFlowStepType =
    | 'script'
    | 'invoke'
    | 'sequential'
    | 'graph'
    | 'parallel'
    | 'if'
    | 'choose'
    | 'delay';
  ```

  ```ts
  function dslStepToTaskFlowStep(dsl: NopDSLStep, parseTree = false): TaskFlowStep {
    const stepType = isValidStepType(dsl.type) ? dsl.type : 'script';
    const id = dsl.id ?? `step-${dsl.name}-${Date.now()}`;

    const step: TaskFlowStep = {
      id,
      type: stepType,
      common: {
  ```

  ```md
  type TaskFlowStepType =
  | 'simple'
  | 'step'
  | 'script'
  | 'invoke'
  | 'invoke-static'
  | 'call-task'
  | 'call-step'
  | 'sequential'
  | 'selector'
  ```

- **严重程度**: P2
- **现状**: 上一轮已发现 `sync.ts` 用 `any` 绕过现有联合类型；本轮继续沿 TaskFlow 图/树同步与 lowering 深挖，发现更上游的 `TaskFlowStepType` / `TaskFlowStepProps` 本身未对齐当前架构文档中的完整 discriminated union。`isValidStepType()` 只接受 8 种类型，合法 DSL 类型如 `selector`、`fork`、`loop-n`、`invoke-static`、`call-task`、`sleep`、`suspend`、`custom` 会在导入时被 fallback 成 `script`。
- **风险**: 合法 nop-task DSL 导入 playground 后会丢失步骤类型语义；后续 `lowerToTaskFlowDSL()` 输出 `type: "script"`，造成保存/导出时不可逆数据损坏。这不是单纯文档增强问题，因为 live code 的 `import-json` 已调用该转换路径。
- **建议**: 将 `types.ts` 的 `TaskFlowStepType` / `TaskFlowStepProps` 与 `docs/architecture/taskflow-visual-designer.md` 的当前契约对齐；`isValidStepType()` 改为基于同一常量表；`buildProps()` / `lowerCommonStep()` 为每个分支提供显式映射。对暂未支持但应 round-trip 的类型，不应降级为 `script`，至少保留 `raw` / `custom` 或返回导入错误。
- **误报排除**: 这不是低代码动态边界可接受的宽类型问题。文档明确要求 `TaskFlowStep.type === TaskFlowStep.props.type`，且 `TaskFlowStep.type` 使用 DSL tag id；当前代码主动把未知但文档列为合法的 DSL tag 改写为 `script`，属于类型契约收窄导致的数据语义丢失。
- **参考文档**: `docs/architecture/taskflow-visual-designer.md`; `docs/skills/deep-audit-prompts.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度13-03] TaskFlow flush 只按 GraphDocument 重建投影，丢弃 `node.data.step` 后依赖 `any` fallback，保存会把新节点生成为不合法 Step

- **文件+行号**: `apps/playground/src/taskflow-designer-lib/index.ts:26-72,75-86,170-183,201-217`; `apps/playground/src/taskflow-designer-lib/sync.ts:76-95`; `apps/playground/src/taskflow-designer-lib/validation.ts:42-48,178-184`
- **证据片段**:

  ```ts
  nodes: doc.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { x: n.position.x, y: n.position.y },
    data: {},
  })),
  ```

  ```ts
  const designerDoc = getDesignerDoc(ctx);
  if (!designerDoc || !model || !containerId) {
    return model;
  }

  return syncFromGraphDocument(model, containerId, buildGraphDocFromProjection(designerDoc));
  ```

  ```ts
  const step = existing?.step ?? {
    id: gn.id,
    type: gn.type as any,
    common: { name: gn.id },
    props: { type: gn.type as any } as any,
  };
  ```

- **严重程度**: P2
- **现状**: `save` / `export-json` 会先 `flushDesignerProjectionIntoModel()`，但该函数从 `$designer.doc` 重建 `GraphDocument` 时把每个 node 的 `data` 清空。对于已有节点，`syncFromGraphDocument()` 还能复用 `existing.step`；对于画布中新建节点，则会进入上一轮已指出的 `gn.type as any` fallback，且 `gn.type` 在配置中通常是 `tf-script` / `tf-invoke` 这类视觉节点 id，不是 `TaskFlowStepType` 的 `script` / `invoke`。
- **风险**: 用户在 TaskFlow workflow 画布新增节点后保存/导出，authoring model 可能出现 `step.type = "tf-script"`、`props.type = "tf-script"` 这类不在联合类型内的伪 Step。当前 `validateAuthoringModel()` 只检查 `step.type !== step.props.type`，不会校验 `step.type` 是否属于允许集合，因此错误可能绕过保存校验并进入 lowering，导出不合法 DSL。
- **建议**: `DesignerProjection.doc.nodes` 应保留或重建 TaskFlow step payload，不能在 flush 时丢弃 `data.step`；新增节点应通过 TaskFlow 专用 factory 将视觉 node type 映射为合法 `TaskFlowStepType` 与默认 `TaskFlowStepProps`。同时在 `validateStep()` 增加 step type 集合校验，防止 `as any` 生成的非法类型通过保存路径。
- **误报排除**: 这不是单纯“GraphDocument 是宽动态投影”的合理情况。架构文档明确 `GraphDocument` 只是投影，owner truth 是 `TaskFlowAuthoringModel`；而当前保存主路径直接从投影反写 owner truth，并在缺失 step payload 时用 `any` 构造 owner model，风险落在最终保存/导出路径上。
- **参考文档**: `docs/architecture/taskflow-visual-designer.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度13-04] SpreadsheetPage 将动态 resolved props 直接断言为 core 输入，缺少 report-designer 同类边界 guard

- **文件+行号**: `packages/spreadsheet-renderers/src/page-renderer.tsx:92-105`; `packages/spreadsheet-core/src/core.ts:32-35`
- **证据片段**:
  ```ts
  export function SpreadsheetPageRenderer(props: RendererComponentProps<SpreadsheetPageSchema>) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const resolvedDocument = props.props.document as SpreadsheetDocument;
    const resolvedConfig = props.props.config as SpreadsheetConfig | undefined;
    const resolvedReadOnly = props.props.readOnly as boolean | undefined;
  ```
  ```ts
  export function createSpreadsheetCore(options: CreateSpreadsheetCoreOptions): SpreadsheetCore {
    const { document, config, readonly = false } = options;
    const initialDocument = cloneSpreadsheetDocument(document);
    const firstSheetId = initialDocument.workbook.sheets[0]?.id ?? '';
  ```
- **严重程度**: P2
- **现状**: `spreadsheet-page` 的 `document` / `config` / `readOnly` 虽然在 schema 类型和 renderer definition 中有精确契约，但运行时读取的是低代码 resolved `props.props` 动态值，当前直接用 `as SpreadsheetDocument` / `as SpreadsheetConfig` / `as boolean` 推入 `createSpreadsheetCore()`。同类 `report-designer-page` 已对 `document` / `config` 做 `unknown` guard 和 fallback。
- **风险**: schema authoring、动态表达式或外部 host 传入 malformed `document` 时，`cloneSpreadsheetDocument(document)` / `initialDocument.workbook.sheets` 可在 renderer 初始化阶段直接抛错，导致整个 spreadsheet host render 崩溃，而不是得到结构化 host issue 或安全 fallback。
- **建议**: 复用 report-designer 的边界模式，为 `SpreadsheetDocument`、`SpreadsheetConfig`、`readOnly` 增加 runtime guard；无效 `document` 应 fallback 到 `createEmptyDocument(...)` 并通过 host issue/reporting 暴露配置错误；`config` 只接受当前公开的 `defaultRowHeight` / `defaultColumnWidth` / `maxUndoDepth` 数字字段。
- **误报排除**: 这不是低代码动态边界上合理的 `unknown`。问题发生在越过 renderer 边界后进入 spreadsheet core owner 之前，且本包已有 `propContracts` 和 core 类型说明可用于窄化；相邻 `report-designer-page` 已证明该类 domain-host 输入需要 guard，而不是裸断言。
- **参考文档**: `docs/components/spreadsheet-page/design.md`; `docs/architecture/renderer-runtime.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度13-05] CodeEditor 动态 `sqlConfig/expressionConfig` 仅断言不校验，scope source 返回的坏数组会进入补全核心并崩溃

- **文件+行号**: `packages/flux-code-editor/src/code-editor-renderer.tsx:71-72`; `packages/flux-code-editor/src/source-resolvers.ts:65-72`; `packages/flux-code-editor/src/extensions/sql/completion.ts:119-125`
- **证据片段**:
  ```ts
  const expressionConfig = props.props.expressionConfig as ExpressionEditorConfig | undefined;
  const sqlConfig = props.props.sqlConfig as SQLEditorConfig | undefined;
  ```
  ```ts
  const items = getDataAtPath(data, resolveSourceRefPath(raw));
  return Array.isArray(items) ? (items as TableSchema[]) : [];
  ```
  ```ts
  const table = aliasMap.get(prefix);
  if (table) {
    const options = table.columns
      .filter((c) => c.name.toLowerCase().startsWith(partial.toLowerCase()))
  ```
- **严重程度**: P2
- **现状**: `code-editor` schema/docs 对 `sqlConfig.tables`、`expressionConfig.variables/functions` 有精确结构约束，但 renderer 对 resolved props 直接 `as` 成目标类型；从 scope source 读取动态数组时只检查 `Array.isArray`，没有校验元素 shape。后续 SQL/Expression completion 假定 `table.columns`、`column.name`、`group.items`、`variable.value` 等字段必然存在。
- **风险**: 动态 source、表达式或 host data 返回 malformed tables/variables/functions 时，renderer 初始化可能不报错，但用户触发补全后会在 CodeMirror completion source 中抛错，导致编辑器交互失效或渲染异常。该风险位于公开动态 source 接入点，不是单纯测试 mock 问题。
- **建议**: 在 `source-resolvers.ts` 增加 `isTableSchema`、`isVariableItem`、`isFuncGroup` 等 element-level guard；直接 props 的 `expressionConfig/sqlConfig` 也应先做浅层结构窄化。无效条目应过滤或降级为空数组，并通过 host issue/diagnostic 暴露配置错误。
- **误报排除**: 这不是 TaskFlow，也不是 SpreadsheetPage props guard。问题不是“低代码边界必须是 unknown”的合理动态，而是已经越过 renderer 边界进入 CodeMirror completion 核心前仍未完成契约窄化；下游代码明确按精确结构访问必填字段。
- **参考文档**: `docs/components/code-editor/design.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度13-06] Chart renderer 只用 `Array.isArray` 窄化 `series`，元素坏值可在 render 阶段直接崩溃

- **文件+行号**: `packages/flux-renderers-data/src/chart-renderer.tsx:48-65`; `packages/flux-renderers-data/src/chart-schemas.ts:3-10`
- **证据片段**:
  ```ts
  const chartType = (props.props.chartType as ChartType) ?? 'bar';
  const source = Array.isArray(props.props.source)
    ? (props.props.source as Array<Record<string, unknown>>)
    : [];
  const series = Array.isArray(props.props.series)
    ? (props.props.series as ChartSeriesSchema[])
    : [];
  ```
  ```ts
  const isEmpty = source.length === 0 && series.every((s) => !s.data || s.data.length === 0);
  ```
  ```ts
  export interface ChartSeriesSchema {
    name?: string;
    type?: ChartType;
    data?: Array<number | { name?: string; value: number }>;
    dataRegionKey?: string;
  }
  ```
- **严重程度**: P2
- **现状**: `ChartSeriesSchema` 已有精确结构，但 renderer 仅确认 `series` 是数组后就整体断言为 `ChartSeriesSchema[]`。若动态表达式/source 返回 `[null]`、`[{}]`、`[{ data: "bad" }]` 等坏元素，render 阶段的 `series.every((s) => !s.data...)`、后续 `series[0].type` / `s.dataRegionKey` / `s.data.map` 路径会按合法对象访问。
- **风险**: chart 是数据展示 renderer，`series/source` 明确可由 loader 或 data-source 提供。坏数据会让整个 chart 渲染崩溃，而不是显示 empty/fallback；同时 `chartType as ChartType` 也会掩盖非法枚举，导致 schema contract 与实际渲染分支不一致。
- **建议**: 增加 `normalizeChartType()`、`normalizeChartSeries()`、`normalizeChartDataPoint()`；非法 `series` 元素过滤或降级为空 series，非法 `chartType` 明确 fallback 到 `'bar'` 并记录 diagnostic。避免把 `Array.isArray` 当作 element-level contract guard。
- **误报排除**: 这不是低代码动态数据天然宽松的误报。文件已有 `ChartType` / `ChartSeriesSchema` 精确类型，下游 render 也按这些类型的必备对象结构执行；当前 `as ChartSeriesSchema[]` 把动态边界扩散进图表核心渲染路径。
- **参考文档**: `docs/components/chart/design.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度13-07] 表单 choice options 只校验数组不校验元素，source 返回坏项会让 select/radio/checkbox 渲染崩溃

- **文件+行号**: `packages/flux-renderers-form/src/schemas.ts:9-15`; `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:76-80,107-110,225-226,257-260,282-305`
- **证据片段**:

  ```ts
  export interface SelectOptionSchema {
    [key: string]: import('@nop-chaos/flux-core').SchemaValue;
    label: string;
    value: string;
  }

  export type SelectOptionsValue = SelectOptionSchema[] | SourceSchema;
  ```

  ```tsx
  const options = Array.isArray(props.props.options) ? props.props.options : [];
  const optionsSourceState = props.props.optionsSourceState as SourceTransientState | undefined;
  ...
  {options.map((option) => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  ))}
  ```

- **严重程度**: P2
- **现状**: `select` / `radio-group` / `checkbox-group` 的 `options` schema 已有精确 `SelectOptionSchema[]` 契约，且 renderer definition 将 `options` 声明为 `allowSource`。运行时 renderer 只判断 `props.props.options` 是否为数组，随后直接按 `{ label: string; value: string }` 访问元素字段；`radio-group` 与 `checkbox-group` 也同样直接读取 `option.value` / `option.label`。
- **风险**: 当动态 source、表达式或 host action 返回 `[null]`、`["x"]`、`[{ label: 1 }]`、`[{ value: undefined }]` 等坏数组时，`option.value` 访问可在 render 阶段直接抛错，或把非字符串/缺失 value 传入 UI primitive，导致表单字段不可渲染、选项状态异常或提交值不符合契约。
- **建议**: 增加统一 `normalizeSelectOptions()` / `isSelectOptionSchema()`，对 source-resolved `options` 做 element-level guard；无效项过滤或降级为空，并通过 source state / host issue 暴露配置错误。`value` 应明确要求非空字符串，`label` 可要求字符串或显式 `String()` 归一化。
- **误报排除**: 这不是低代码动态边界本身的合理宽类型。`options` 是已声明的 source-enabled 入口，schema 已有精确元素结构，下游 renderer 也按精确对象结构访问；当前问题是只用 `Array.isArray` 把动态边界扩散进 UI 渲染核心，缺少元素级 contract narrowing。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/components/select/design.md`; `docs/components/radio-group/design.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

未发现新的高价值问题。深挖结束。

第 6 轮候选中出现 Flow Designer `moveNodes` payload 契约问题，但该问题已作为 `[维度03-02]` 保存；为避免重复，维度 13 不另存新条目。

## 维度复核结论

- `[维度13-01]`: 保留（P2）。live `sync.ts` 仍在 `gn.type as any`、`gn.data?.step as any`、`branch.data?.branchType as any` 处绕过 `TaskFlowStepType` / `TaskFlowStepProps` / branchType 联合类型，且 `validation.ts` 只检查部分一致性，动态 `GraphDocument` / `TreeDocument` 坏值可进入 owner model。
- `[维度13-02]`: 保留（P2）。live `types.ts` 的 `TaskFlowStepType` 仍只有 8 种，而 `docs/architecture/taskflow-visual-designer.md` 当前契约列出 `selector`、`fork`、`loop-n`、`invoke-static` 等更多类型；`index.ts` 的 `isValidStepType()` 仍把未列入类型 fallback 为 `script`。
- `[维度13-03]`: 保留（P2）。live `flushDesignerProjectionIntoModel()` 仍通过 `buildGraphDocFromProjection()` 将 node `data` 清空，新增节点会落入 `syncFromGraphDocument()` 的 `gn.type as any` fallback；playground schema 中 palette 节点类型仍是 `tf-script` / `tf-invoke` / `tf-if` 等视觉 id，且 `validation.ts` 未校验 step type 集合。
- `[维度13-04]`: 保留（P2）。live `SpreadsheetPageRenderer` 仍直接把 `props.props.document/config/readOnly` 断言为 core 输入，`createSpreadsheetCore()` 随即 `cloneSpreadsheetDocument(document)` 并访问 `initialDocument.workbook.sheets`，无 malformed/missing document guard；相邻 report-designer page 仍存在 `unknown` guard + fallback 模式可对照。
- `[维度13-05]`: 保留（P2）。live `CodeEditorRenderer` 仍裸断言 `expressionConfig/sqlConfig`，`source-resolvers.ts` 对 scope source 只做 `Array.isArray` 后整体 cast；SQL/expression completion 仍直接访问 `table.columns`、`c.name`、`group.items`、`v.value` 等精确结构字段。
- `[维度13-06]`: 保留（P2）。live chart renderer 仍只用 `Array.isArray` 窄化 `series` 后按 `ChartSeriesSchema[]` 访问，`series.every((s) => !s.data...)` 对 `[null]` 会直接访问崩溃，坏 `data` 也可进入 `.map` 路径；`chartType` 仍裸 cast。
- `[维度13-07]`: 保留（P2）。live select/radio/checkbox-group renderer 仍只确认 `options` 是数组后直接读取 `option.value` / `option.label`，而 schema 明确元素应为 `{ label: string; value: string }`，source 返回坏元素可在 render 或 UI primitive 层破坏渲染/状态契约。

## 子项复核建议

无。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                                                                    | 摘要                                                                                                |
| --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 维度13-01 | P2       | `apps/playground/src/taskflow-designer-lib/sync.ts`                                                                                                                         | TaskFlow 图/树同步仍用 `any` 绕过已有 Step 与 branch 联合类型。                                     |
| 维度13-02 | P2       | `apps/playground/src/taskflow-designer-lib/types.ts`; `apps/playground/src/taskflow-designer-lib/index.ts`                                                                  | TaskFlow 实现的 step 联合类型仍少于当前架构契约，合法 DSL 类型会 fallback 为 `script`。             |
| 维度13-03 | P2       | `apps/playground/src/taskflow-designer-lib/index.ts`; `apps/playground/src/taskflow-designer-lib/sync.ts`; `apps/playground/src/taskflow-designer-lib/validation.ts`        | TaskFlow flush 仍丢弃 node data，新节点可经 `any` fallback 生成非法 Step。                          |
| 维度13-04 | P2       | `packages/spreadsheet-renderers/src/page-renderer.tsx`                                                                                                                      | `SpreadsheetPageRenderer` 仍直接断言动态 props 为 core 输入，缺少 malformed document/config guard。 |
| 维度13-05 | P2       | `packages/flux-code-editor/src/code-editor-renderer.tsx`; `packages/flux-code-editor/src/source-resolvers.ts`; `packages/flux-code-editor/src/extensions/sql/completion.ts` | CodeEditor 动态 `sqlConfig/expressionConfig` 与 source 数组仍缺少元素级结构校验。                   |
| 维度13-06 | P2       | `packages/flux-renderers-data/src/chart-renderer.tsx`                                                                                                                       | Chart renderer 仍只用 `Array.isArray` 窄化 `series`，坏元素可破坏渲染路径。                         |
| 维度13-07 | P2       | `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`                                                                                                     | select/radio/checkbox-group options 仍只校验数组，不校验 `{ label, value }` 元素结构。              |
