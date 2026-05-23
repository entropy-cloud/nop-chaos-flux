# 维度 16：文档-代码一致性

## 范围与状态

- 审核范围：文档中的 schema/API/host-scope 约定与审计源文件记录的 live code 行为是否一致。
- 资料来源：仅使用同目录 `stage-1-full-findings-16-20.md`、`raw-findings-07-20.md`、`final-review-results-16-20.md`、`summary.md`。
- 最终状态：保留 3 项，驳回 1 项。
- 严重程度分布：P1 1 项，P2 2 项。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 16-01、16-02、16-03。
- 第 2-5 轮追加 raw findings 发现 16-04。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核保留 report designer host projection 文档漂移、`inspectorPanels` 支持状态冲突、`setValues.args.path` 在 form context 下被忽略这三项。其中 16-03 为 P1。16-04 被驳回，因为 final review 认定 formula compiler expression normalization 会接受 pure `${...}` adaptor examples。

## 最终保留项

### [16-01] Report Designer `selection`/`target` alias docs 与 live host projection 不一致

- 文件：`docs/architecture/report-designer/design.md:404-410`; `packages/report-designer-renderers/src/host-data.ts:155-195`
- 证据片段：文档称 `selection`、`target` 是 `selectionTarget` 的兼容别名；host projection 片段只显示 `designer.selectionTarget` 与顶层 `selectionTarget`，未显示顶层 `selection`/`target`。
- 严重程度：P2
- 当前行为：文档宣称顶层 `selection`/`target` aliases 可用；live `buildReportDesignerScopeData()` 发布 `selectionTarget`，未发布顶层 `selection`/`target`。
- 风险：按文档编写的 schema 可能引用 runtime 不存在的 aliases，导致 expression silent failure 或自定义区域缺 state。
- 建议：实现文档化 aliases，或从 active docs 移除并标注旧 alias 已移除。
- 误报排除：不涉及 spreadsheet nested `spreadsheet.selection`；文档 aliases 是 report 顶层 `selectionTarget` aliases。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持“report designer docs 宣传 top-level `selection`/`target` aliases，但 live host scope 不发布”。

### [16-02] `inspectorPanels` support 状态在 docs 与 live projection 冲突

- 文件：`docs/architecture/report-designer/design.md:427-460`; `packages/report-designer-renderers/src/host-data.ts:156-164`, `189-193`
- 证据片段：文档称 `inspectorPanels` 这类字段如仍暴露应视为 implementation lag / compatibility detail；host projection 同时显示 `designer.inspectorPanels` 与顶层 `inspectorPanels`。
- 严重程度：P2
- 当前行为：docs 将 `inspectorPanels` 视为 non-canonical/implementation lag；live host data 仍将其作为 schema-visible 字段发布。
- 风险：builder tooling 与 schema authors 对该字段是否 supported 产生分歧；后续移除可能破坏从 live projection 学到的 schemas。
- 建议：明确决策；若支持则作为 retained compatibility 文档化；若不支持则移除或 deprecate live projection 并给 migration。
- 误报排除：这是 schema-visible host scope data，不是内部 TS field。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 `inspectorPanels` docs 标为 non-canonical/implementation lag，但 live host scope 仍 schema-visible。

### [16-03] `setValues` current-scope/no-targeting 文档契约与 live behavior 漂移

- 文件：`docs/references/flux-json-conventions.md:131-145`; `packages/flux-runtime/src/action-adapter.ts:92-110`
- 证据片段：文档写明 `setValues` 使用 `args: { values }` 或 `args: { path, values }`，且不使用 `componentPath` / 顶层 `values`；代码片段显示 form context 下直接 `ctx.form.setValues(values)`，非 form context 才计算 `basePath` 为 `args.path` 或 `invocation.targeting.targetId`。
- 严重程度：P1
- 当前行为：form context 下 `setValues` 忽略 `args.path`，直接 `ctx.form.setValues(values)`；非 form context 下仍可 fallback 到 `invocation.targeting.targetId`。
- 风险：documented relative-path semantics 不一致；hidden targeting fallback 让写入位置依赖 compiled targeting metadata 而非 explicit `args.path`。
- 建议：form/non-form path 都一致 honor `args.path`，并移除或文档化 `targeting.targetId` fallback。
- 误报排除：非 `component:setValues`；此条针对 built-in `setValues` action。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 强调 `setValues.args.path` 在 form context 被忽略，explicit author intent 失效。

## 驳回项

### [16-04] API adaptor 文档示例的 `${...}` 语法会被 live adaptor compiler 作为裸表达式处理

- 文件：`docs/architecture/api-data-source.md:174-189`; `packages/flux-runtime/src/async-data/request-runtime-adaptor.ts:15-23`, `112-121`
- 证据片段：raw finding 记录文档示例使用 `"requestAdaptor": "${withRequestData(api.data, { timestamp: now() })}"` 与 `"responseAdaptor": "${payload.data.items}"`；runtime adaptor normalization 片段只显示剥 `return` 与末尾分号，然后传给 expression compiler。
- 原始严重程度：P2
- 原始当前行为：raw finding 认为 runtime adaptor normalization 不会剥模板表达式包装，随后直接传给 expression compiler。
- 原始风险：按文档复制 adaptor 示例可能解析失败或执行语义不符合预期，导致 request/response transform 无法工作。
- 原始建议：文档示例改为裸表达式或 `return <expression>;`；或 runtime 显式支持 `${...}` wrapper。
- 误报排除：raw finding 将其限定为 async-data adaptor authoring contract 的独立冲突，不重复 `setValues` 或 report designer docs 漂移。
- 最终复核 verdict：驳回。
- 修订标题/理由：final review 认定 `formulaCompiler.compileExpression()` 会通过 `normalizeExpressionSource()` 接受 pure `${...}` adaptor examples；原 finding 忽略 expression normalization。
