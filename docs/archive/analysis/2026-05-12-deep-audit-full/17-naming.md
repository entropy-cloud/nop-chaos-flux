# 维度 17：命名与术语一致性

## 范围与状态

- 审核范围：schema、文档、renderer/API surface 中同一概念的命名和值域是否一致，legacy 名称是否明确标注。
- 资料来源：仅使用同目录 `stage-1-full-findings-16-20.md`、`raw-findings-07-20.md`、`final-review-results-16-20.md`、`summary.md`。
- 最终状态：保留 8 项，驳回 0 项。
- 严重程度分布：P2 1 项，P3 7 项。

## 深挖轮次与收敛说明

- 第 1 轮初审重建发现 17-01 至 17-07。
- 第 2-5 轮追加 raw findings 发现 17-08。
- `summary.md` 记录第 5 轮仍有新增，因此本次按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核保留全部 8 项。17-02 保持 P2，因为 generic Button docs 与 live `ButtonSchema` 值域直接冲突。17-03、17-07、17-08 在最终复核中降级为 P3，原因分别是 toolbar variants 可视为独立 semantic vocabulary、condition-builder operators 可视为 DSL token 例外、`navigate.args.to` 位于 historical discussion 文档。

## 最终保留项

### [17-01] Code editor source refs 仍接受 legacy `dataPath`

- 文件：`packages/flux-code-editor/src/types.ts:188-192`; `packages/flux-code-editor/src/types.test.ts:41-44`
- 证据片段：`resolveSourceRefPath(sourceRef: { path?: string; dataPath?: string })` 返回 `sourceRef.path ?? sourceRef.dataPath`。
- 严重程度：P3
- 当前行为：`path` 优先，但 `dataPath` 仍作为 fallback 支持。
- 风险：旧术语 `dataPath` 会继续出现在 schemas/examples，与当前推荐 `path` 命名分裂。
- 建议：如需兼容则标记 `dataPath` legacy/deprecated，并避免出现在示例。
- 误报排除：fallback 真实存在，但不是 primary authoring contract，因为 `path` 优先。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 建议标 deprecated/legacy。

### [17-02] Button `variant` docs 与 live `ButtonSchema` 值域冲突

- 文件：`docs/references/flux-json-conventions.md:189-204`; `packages/flux-renderers-basic/src/schemas.ts:143-147`
- 证据片段：文档表格与示例使用 `variant: 'default' | 'primary' | 'danger'` 和 `"variant": "primary"`；live `ButtonSchema.variant` 为 `default/destructive/outline/secondary/ghost/link`。
- 严重程度：P2
- 当前行为：active JSON conventions 推荐 `primary/danger`，live generic button schema 接受 shadcn-style variants。
- 风险：按 reference doc 编写 generic button schema 会产生不支持的 values。
- 建议：更新 docs 匹配 `ButtonSchema`，或实现并文档化 `primary/danger` aliases。
- 误报排除：domain-specific toolbar configs 也用 `primary/danger`，但本条专指 generic `button` renderer contract。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 generic Button docs 与 live schema 冲突。

### [17-03] Toolbar button `variant` vocabulary 与 generic Button vocabulary 分裂

- 文件：`packages/flow-designer-core/src/types.ts:229-237`; `packages/flow-designer-renderers/src/designer-toolbar.tsx:219-234`; `packages/report-designer-renderers/src/report-designer-toolbar.tsx:97-106`
- 证据片段：toolbar item type 使用 `variant?: 'default' | 'primary' | 'danger'`；renderers 将 `primary` 映射到 `default`，将 `danger` 映射到 `destructive` 或其他 UI variant。
- 严重程度：P3
- 当前行为：flow/report toolbar configs 用 `default|primary|danger`，generic `ButtonSchema` 用 `default|destructive|outline|secondary|ghost|link`；renderers 做映射。
- 风险：同一个 “button variant” 术语在不同 schema surface 代表不同值域，增加 author 和 validator 复杂度。
- 建议：对齐 domain toolbar variants 与 generic `ButtonSchema`，或明确文档化 toolbar variants 是独立 semantic vocabulary。
- 误报排除：renderers 有意映射 `primary/danger`；问题是命名/值域一致性，不是渲染失败。
- 最终复核 verdict：降级保留。
- 修订标题/理由：final review 将其降为 P3，理由是 toolbar button variants 可视为独立 semantic vocabulary，但未与 generic Button terminology 区分清楚。

### [17-04] Button example 使用 unsupported `size: "md"`

- 文件：`docs/components/button/example.json:1-6`; `packages/flux-renderers-basic/src/schemas.ts:143-147`
- 证据片段：component example 使用 `"size": "md"`；live `ButtonSchema.size` 为 `default/xs/sm/lg/icon/icon-xs/icon-sm/icon-lg`。
- 严重程度：P3
- 当前行为：component example 使用 `md`，live `ButtonSchema.size` 不包含 `md`。
- 风险：复制示例会得到 invalid schema 或被忽略的样式。
- 建议：改为 `size: "default"`，或实现 explicit `md` alias。
- 误报排除：这是 active component example，不是 archived experiment。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 Button example 使用 unsupported `size: "md"`。

### [17-05] Flow Designer icon examples 使用 PascalCase，与 kebab-case convention 冲突

- 文件：`docs/architecture/flow-designer/config-schema.md:723-743`; `docs/references/flux-json-conventions.md:219-231`
- 证据片段：flow-designer config example 使用 `"icon": "RotateCcw"` 与 `"icon": "Save"`；reference convention 推荐 authored icons 使用 kebab-case，如 `"rotate-ccw"`。
- 严重程度：P3
- 当前行为：flow-designer config example 使用 `RotateCcw/Save`，reference convention 推荐 authored icons 使用 kebab-case。
- 风险：示例训练 schema authors 使用不同 icon naming style。
- 建议：示例改为 `rotate-ccw/save`，或明确 PascalCase 也受支持。
- 误报排除：runtime 可能解析 PascalCase；finding 是 authoring convention 一致性问题。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持 PascalCase example 与 kebab-case convention 冲突。

### [17-06] `createFlowDesignerRegistry` 是 deferred naming residual

- 文件：`packages/flow-designer-renderers/src/index.tsx:148-154`; `docs/architecture/flow-designer/design.md:85-97`
- 证据片段：`createFlowDesignerRegistry(baseRegistry)` 实际返回 `registerFlowDesignerRenderers(baseRegistry)`；文档称其 create 命名语义漂移已列为 deferred naming residual。
- 严重程度：P3
- 当前行为：`createFlowDesignerRegistry(baseRegistry)` 实际向传入 registry 注册 definitions，而不是创建 fresh registry；docs 已标为 deferred naming residual。
- 风险：API 名称会误导用户期待分配新 registry。
- 建议：保留 stable export 兼容，但推广 `registerFlowDesignerRenderers()`，未来考虑 deprecate/alias。
- 误报排除：docs 已标为 residual，因此不是 closure blocker 或功能缺陷。
- 最终复核 verdict：保留。
- 修订标题/理由：无标题修订；final review 维持名称暗示 create 但实际 mutates/registers into existing registry。

### [17-07] Condition-builder operator IDs 使用 snake_case

- 文件：`packages/flux-renderers-form-advanced/src/condition-builder/operators.ts:10-28`; `apps/playground/src/pages/conditionBuilderSchema.json:129-135`; `docs/references/flux-json-conventions.md:233-244`
- 证据片段：operator label keys 包含 `not_equal`、`less_or_equal`、`is_empty`、`select_any_in`；JSON convention 推荐 ordinary keys 使用 camelCase。
- 严重程度：P3
- 当前行为：public condition-builder operator IDs 与 override keys 使用 snake_case，而 JSON convention 推荐 ordinary keys 使用 camelCase。
- 风险：operator config 成为长期命名例外，validator 和文档需要 special-case。
- 建议：引入 camelCase canonical IDs 并兼容 snake_case，或明确 document operator IDs 是 DSL tokens 例外。
- 误报排除：operator IDs 有 DSL token 属性，不完全等同 schema prop；但它们仍作为 author-facing JSON keys 暴露。
- 最终复核 verdict：降级保留。
- 修订标题/理由：final review 将其降为 P3，理由是 condition-builder operator IDs 是 snake_case DSL tokens，作为 convention exception 需文档化或 alias。

### [17-08] navigate action 文档示例使用 `args.to`，live contract 只接受 `url/back`

- 文件：`docs/discussions/2026-04-06-programming-model-optimality-critique.md:404-410`; `packages/flux-core/src/types/actions.ts:24-28`; `packages/flux-runtime/src/action-adapter.ts:271-279`
- 证据片段：discussion 示例写 `"onSubmitSuccess": [{ "action": "navigate", "args": { "to": "/confirmation" } }]`；live `NavigateActionArgs` 有 `url/replace/back`，runtime 在无 `args.url` 或 `args.back` 时返回 `navigate action requires args.url or args.back`。
- 严重程度：P3
- 当前行为：docs discussion 示例使用 `to`，但类型和 runtime 只识别 `url/back`。
- 风险：用户复制示例会得到 `navigate action requires args.url or args.back`，也增加 navigation payload 术语分裂。
- 建议：将示例改为 `args.url`，或明确该 discussion 非规范/历史草稿。
- 误报排除：runtime 没有 `to` alias，非 deliberate compatibility。
- 最终复核 verdict：降级保留。
- 修订标题/理由：final review 因该示例位于 `docs/discussions` historical discussion，将其降级为低风险 P3。

## 驳回项

无。
