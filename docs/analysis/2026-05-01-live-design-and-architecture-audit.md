# 2026-05-01 Live 设计与架构审计

> 审计范围：live 源码与 active architecture/component docs
> 审计方法：只根据当前仓库中可直接定位的代码和文档证据下结论
> 口径说明：本次按要求不把 lint、格式化、测试覆盖率当主审计对象，重点关注公共契约、包边界、运行时抽象、host projection 与持久化策略

## 结论摘要

这次复核后，当前仓库里仍然成立的问题主要集中在四类：

- 核心公共契约与文档存在几处明确漂移，尤其是 `flux-core` 的 framework 边界、`SchemaRenderer` 的公开 root seam、以及 validation owner 从 page/root 到 managed surface 的落地边界。
- renderer 统一契约已经建立，但 `detail-view` / `detail-field` / `variant-field` 等高级控件仍然绕过 `props` / `meta` / `regions` / `events` 归一化通道。
- `flow-designer`、`report-designer`、`word-editor` 三个 host/workbench 家族都存在“文档中的 host contract”与“实现里真实注入/持久化行为”不完全一致的问题。
- 一些复杂 renderer 已经把跨包耦合和产品策略写进 UI 层，例如 CRUD 对 form imperative handle 的依赖、report designer 画布对表达式字符串和表格尺寸的硬编码、word editor 的 localStorage 持久化泄露。

## 详细问题

### A-01 `@nop-chaos/flux-core` 已经带有明显 React 依赖，和文档中的“framework-agnostic foundation”不一致

- 证据：`docs/architecture/flux-core.md:27-35`
- 证据：`packages/flux-core/src/types/renderer-core.ts:1,87-96,186-189`
- 证据：`packages/flux-core/src/types/renderer-hooks.ts:1,23-85,160-180`
- 证据：`packages/flux-core/package.json:21-23`
- 问题：文档把 `flux-core` 定义为“纯契约 + 纯工具 + 无 framework-specific code”的最低层，但当前 `RendererDefinition.component`、`SchemaRendererComponent`、`RenderRegionHandle.render`、`RendererHelpers.render` 等核心类型已经直接使用 `ComponentType`、`ReactNode`、`ReactElement`。
- 影响：`flux-core` 现在已经不是纯粹的跨运行时基础层；未来如果要支持非 React host，或者只是想把 renderer contract 和 React host specialization 分开，这一层都会成为反向耦合点。这里的问题不是单个 `ComponentType` 字段命名不够中性，而是整套 render surface 已经在 core package 上暴露成 React contract。
- 改进方向：把 React-specialized renderer surface 整体从 `flux-core` 拆出去，而不是只做一个名义上的类型占位替换。`flux-core` 只保留 host-neutral contract IR；`RendererDefinition.component`、`SchemaRendererComponent`、`RenderRegionHandle.render`、`RendererHelpers.render` 一类 React 输出面应迁到 `flux-react` 或单独的 host adapter contract 层。

### A-02 `SchemaRendererProps.surfaceRuntime` 是公开 root contract，但 `SchemaRenderer` 实现没有使用它

- 证据：`docs/architecture/renderer-runtime.md:850-863`
- 证据：`packages/flux-core/src/types/renderer-hooks.ts:160-180`
- 证据：`packages/flux-react/src/schema-renderer.tsx:65-67,248-267`
- 问题：root props 明确声明了 `surfaceRuntime?: SurfaceRuntime`，文档也把它列为 root entry contract 的一部分，但 `SchemaRenderer` 始终执行 `runtime.createSurfaceRuntime()`，没有消费 `props.surfaceRuntime`。
- 影响：这是一个真实的 public seam 未接线问题。调用方以为可以注入共享 surface runtime，但实际并不能，文档和类型都比实现更宽。
- 改进方向：要么在 `SchemaRenderer` 中真正支持外部 `surfaceRuntime`，要么把这个 root prop 从 contract 和文档里移除。

### A-03 page/root non-form owner 已落地第一步，但 `ValidationScopeRuntime` 仍然是 form-shaped substrate，managed dialog/drawer 也还没有 surface-root validation owner

- 证据：`docs/architecture/form-validation.md:132-166,202-212,280-286,1034-1047`
- 证据：`packages/flux-core/src/types/runtime.ts:278-353`
- 证据：`packages/flux-runtime/src/runtime-owned-factories.ts:42-47,139-163`
- 证据：`packages/flux-react/src/hooks.ts:153-188`
- 证据：`packages/flux-react/src/schema-renderer.tsx:65-67,104-106,254-267`
- 证据：`packages/flux-react/src/dialog-host.tsx:78-86,146-154`
- 证据：`packages/flux-runtime/src/surface-runtime.ts:61-88`
- 证据：`docs/architecture/surface-owner.md:203-216`
- 问题：`SchemaRenderer` 现在确实已经给 page-owned root 提供了第一个 concrete non-form validation owner，这点是 live baseline，不应继续写成“完全未落地”。但更深一层的 substrate 仍然是 form-first：`createValidationScopeRuntime()` 实际返回 `createManagedFormRuntime(...)`，page runtime 仍把它的 store 强转成 `FormStoreApi`，React hooks 的消费面也仍然沿用 form-like state 形状。与此同时，managed `dialog` / `drawer` surface path 只传递 `scope`、`actionScope`、`componentRegistry`、`ownerNodeInstance`，没有为每个 surface entry 创建并提供 surface-root validation owner。
- 影响：当前 live code 已经证明“validation 不必局限于 `<form>`”，但 page/root 之外的 owner family 还没有真正收口。这样会继续把 non-form owner 语义绑在 `FormRuntime` substrate 上，也会让 dialog/drawer 内的验证边界继续依赖 parent owner 或 renderer-local ad hoc runtime，而不是稳定的 surface-root owner。
- 改进方向：保留 page-owned root 作为已经落地的第一批 non-form owner，同时把 `ValidationScopeRuntime` 从 `FormRuntime` 的 store/read model 中继续拆开；进一步为 managed `dialog` / `drawer` surface entry 建立 surface-root validation owner，并在 React host/provider path 中显式接线。`FormRuntime` 应成为 `ValidationScopeRuntime` 的 submit/touch specialization，而不是 generic validation owner 的隐藏实现。

### A-04 `NodeRenderer` 和 debugger 仍然通过 raw `schema.name` 回退读取字段绑定，统一 renderer contract 没有完全收口

- 证据：`docs/architecture/field-binding-and-renderer-contract.md:17-20,43-58,94-115`
- 证据：`packages/flux-react/src/node-renderer.tsx:314-334`
- 证据：`packages/flux-react/src/use-node-debug-data.ts:30-55`
- 问题：`NodeRenderer` 的 hidden-field 同步直接从 `props.node.schema.name` 取 `fieldName`，debug data 也在 `resolvedPropsValue.name` 缺失时回退到 `schema.name`。
- 影响：这会继续鼓励“raw schema 兜底”而不是完全依赖归一化后的 `props` / `meta` / `regions` 通道，也让 field binding contract 很难真正收口。
- 改进方向：把 field identity 明确下沉到 normalized runtime channel；debugger 如果要看 authoring source，可单独暴露 `authoring` 视图，而不是在 runtime contract 上回退读 raw schema。

### B-01 `detail-view` / `detail-field` / `variant-field` 把关键字段标成 `ignored`，但运行时又直接读取 raw schema

- 证据：`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:45-47,119-121,210-211,228-229,295-309`
- 证据：`packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:41-43,98-100,138-139,157-158,233-241`
- 证据：`packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:64-70,117-125,173-176,294-315,327-341`
- 问题：这几个 renderer 在 definition 里把 `surface`、`variants`、`selector`、`detectVariantAction`、`transformInAction`、`transformOutAction`、`validateValueAction` 等字段标为 `ignored`，但组件实现里又直接通过 `schema.xxx` 读取它们。
- 影响：这等于把统一编译/归一化契约绕过去了。compiler 无法稳定拥有这些字段的归类、校验和后续演化；组件层又重新持有一套 authoring 解释逻辑。
- 改进方向：要么这些字段属于运行时 `props` / `events` / `regions`，就明确纳入字段规则；要么单独引入 host-specific compiled plan，不要继续保留 `ignored + raw schema read` 这种半收口状态。

### B-02 `tag-list` / `key-value` / `array-editor` 把“至少一项”写成了默认行为，而不是 `required` 语义

- 证据：`packages/flux-renderers-form/src/schemas.ts:17-28,114-131`
- 证据：`packages/flux-renderers-form-advanced/src/tag-list.tsx:19-22,44-67`
- 证据：`packages/flux-renderers-form-advanced/src/key-value.tsx:201-205,388-410`
- 证据：`packages/flux-renderers-form-advanced/src/array-editor.tsx:151-154,311-319`
- 问题：这三个 schema 都沿用了 `InputSchema`，调用侧也会传 `required: Boolean(props.props.required)` 给 field controller，但实际 validation 里仍然无条件要求非空：`tag-list` 空数组直接报 required，`key-value` 和 `array-editor` 无条件加 `minItems: 1`。
- 影响：控件语义和通用 field contract 不一致。作者即使没有声明 `required`，也无法得到真正可选的空值行为。
- 改进方向：把“至少一项”改成显式 authoring 语义，例如 `required` 或专门的 `minItems`，不要在 renderer 内部硬编码默认必填。

### B-03 CRUD query form 通过 component handle 直接依赖 form 的私有能力集合，跨包耦合偏重

- 证据：`packages/flux-renderers-data/src/crud-renderer.tsx:321-344,366-377`
- 证据：`packages/flux-renderers-data/src/crud-renderer-ownership.ts:124-149,182-204`
- 问题：CRUD 内部先合成一个 `type: 'form'` 的 query form schema，再通过 component registry 按 `componentId` 找到该 form handle，并假定它支持 `validate`、`getValues`、`reset` 三个方法。
- 影响：`flux-renderers-data` 不是只依赖通用 runtime contract，而是实质上依赖了 `form` renderer 暴露的特定 imperative API。这会让 CRUD 和 form 的演化绑定得更紧。
- 改进方向：把 query bridge 提升成更窄的 shared abstraction，例如显式的 query-form contract，避免 CRUD 直接写死 form handle 方法名。

### B-04 `flux-renderers-form` 仍维护一套和 `@nop-chaos/ui` 平行的 field chrome，实现和语义已经开始漂移

- 证据：`packages/ui/src/components/ui/field.tsx:10-38,69-107,167-213`
- 证据：`packages/flux-renderers-form/src/renderers/shared/label.tsx:3-12`
- 证据：`packages/flux-renderers-form/src/renderers/shared/error.tsx:3-8`
- 证据：`packages/flux-renderers-form/src/renderers/shared/help-text.tsx:3-8`
- 问题：UI 包已经提供了 `Field` / `FieldLabel` / `FieldError` / `FieldDescription` 等完整语义组件，但 form renderers 仍保留自己的 `FieldLabel` / `FieldError` / `FieldHelpText`，而且语义更弱，例如 error 只是普通 `span`，没有 `role="alert"`。
- 影响：字段框架被维护成两套，后续无论是样式系统、a11y 还是 slot contract 都会继续分叉。
- 改进方向：收口到 `@nop-chaos/ui` 的 field primitives；如果 form family 有特例，再在 UI primitive 之上做薄包装，而不是继续平行复制。

### C-01 `flow-designer-core` 仍然内嵌 `SchemaInput` / `ActionSchema` 级别的 UI 面，和“纯图核心”目标不一致

- 证据：`docs/architecture/flow-designer/design.md:54-69,87-99,242-243`
- 证据：`packages/flow-designer-core/src/types.ts:1,86-107,154-175`
- 问题：`NodeTypeConfig` 和 `EdgeTypeConfig` 直接把 `body`、`inspector.body`、`createDialog.body`、`quickActions`、`submitAction` 放进 core config 类型里。
- 影响：`flow-designer-core` 已经不是“graph-only core”，而是携带了 Flux schema authoring surface 的领域 core。这样会让 core 和 renderers 的边界继续模糊。
- 改进方向：把 graph/runtime 配置和 SchemaRenderer-facing shell 配置拆层；core 只保留 graph semantics，renderer 包再把 node/edge types 映射到 schema surfaces。

### C-02 Flow Designer 的 host manifest 已经和实际注入到 schema scope 的字段不一致

- 证据：`packages/flow-designer-renderers/src/designer-context.ts:108-149`
- 证据：`packages/flow-designer-renderers/src/designer-manifest.ts:59-137`
- 证据：`docs/architecture/flow-designer/runtime-snapshot.md:228-239`
- 问题：实际 host scope 里 `selection` 已经暴露 `kind`、`count`、`nodeIds`、`edgeIds`、`activeNodeId`、`activeEdgeId`、`activeBranchId`，`runtime` 里暴露 `dirty`、`isDirty`、`gridEnabled`、`zoom`、`viewport`；但 manifest 仍只声明 `selectedNodeIds` / `selectedEdgeIds`，并把 runtime 写成 `gridVisible`、`paletteCollapsed`、`inspectorCollapsed`。
- 影响：compiler/tooling 看到的 host contract 和 schema 运行时真实能读到的字段不是同一套，host-family authoring 很容易出现“文档合法但运行时没有”或“运行时有但 manifest 不认识”。
- 改进方向：以 `buildDesignerScopeData()` 为当前事实基线，统一修正 manifest 和 family docs。

### C-03 Report Designer 的 host projection 在文档、manifest、实现三处已经分叉

- 证据：`docs/components/report-designer-page/design.md:69-103`
- 证据：`packages/report-designer-renderers/src/report-designer-manifest.ts:102-189`
- 证据：`packages/report-designer-renderers/src/host-data.ts:151-187`
- 问题：组件文档把 `selection` / `target` 标成兼容别名，并把 `designer.inspectorPanels`、顶层 `inspectorPanels` 写进 vocabulary；manifest 又声明了顶层 `fieldSources`、`preview`；但实际 `buildReportDesignerScopeData()` 没有注入这些字段，反而注入了 manifest 未声明的 `inspectorBody`。
- 影响：report designer 的 host contract 已经不是单一来源真相，schema authoring、compiler 校验和运行时读取看到的是三套略有差异的接口。
- 改进方向：先明确“当前 live host scope 到底是什么”，再同步删掉未接线字段或补齐未声明字段，避免继续平行演化。

### C-04 `report-spreadsheet-canvas` 把产品策略直接写进 renderer：固定 30x10 网格，并在 UI 层写死字段表达式格式

- 证据：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:15-17,39-44,179-184`
- 证据：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:146-165`
- 证据：`docs/architecture/report-designer/design.md:243-254`
- 问题：这个 renderer 同时写死了两类不该由 UI 层拥有的策略：一是 `ROWS = 30`、`COLS = 10`，把主工作区限制成 demo 级网格；二是在字段拖拽落点时先向 spreadsheet 写入 `${fieldId}` 字符串，再调用 `report-designer:dropFieldToTarget`。
- 影响：共享 renderer 同时承担了可视尺寸策略和表达式语言策略，适配器/core 的角色被削弱，后续换公式语法或改不同 document size 时都要先改 UI 层。
- 改进方向：把 grid bounds 与 cell-binding representation 交回 spreadsheet/runtime 或 report-designer adapter 决定，renderer 只负责命中位置和交互归一化。

### D-01 Word Editor 的默认持久化策略泄露到了 host 边界，而且分散在 core / renderer / page 三处

- 证据：`packages/word-editor-core/src/document-io.ts:8-10,56-78,84-120`
- 证据：`packages/word-editor-renderers/src/editor-canvas.tsx:31-53,55-81`
- 证据：`packages/word-editor-renderers/src/word-editor-page.tsx:170-179`
- 证据：`docs/architecture/word-editor/design.md:119-141`
- 问题：`document-io.ts` 使用固定 localStorage key，`EditorCanvas` 自己也直接 `localStorage.setItem(...)` / `loadDocument()`，`WordEditorPage` 又在 mount 时 `loadDatasets()`。这意味着 persistence policy 不是一个清晰的 host-owned decision，而是被分散进多个层级。
- 影响：一旦需要把 word editor 嵌入不同宿主、改成 remote persistence、或做多文档隔离，这个默认 localStorage 策略会变成到处都要拆的耦合点。
- 改进方向：把持久化策略收回到 host owner 明确注入的 save/load port；core 只负责序列化，renderer 不直接触碰 localStorage。

### D-02 Word Editor 的 autosave 和显式保存并没有持久化同一份文档面

- 证据：`packages/word-editor-renderers/src/editor-canvas.tsx:38-49`
- 证据：`packages/word-editor-renderers/src/word-editor-action-provider.ts:38-55`
- 证据：`packages/word-editor-renderers/src/word-editor-page.tsx:55-65,136-151,393-400`
- 问题：autosave 生成 `SavedDocumentData` 时使用的是 `initialDocument?.charts` / `initialDocument?.codes`，而显式 `word-editor:save` 使用的是当前 `getCharts()` / `getCodes()`。同时 host scope 里的 `document` 又来自 autosave 更新的 `savedDocument`。
- 影响：新增 chart/code 后，runtime host scope 中的 `document` 和显式保存到持久化介质的文档可能不是同一内容；这是一个真实的状态面分叉。
- 改进方向：统一 autosave 与 explicit save 的 document assembly 入口，确保 `document`、autosave、manual save 三者来自同一个 source of truth。

### D-03 Word Editor 的 dataset source model 在文档和实现中已经不一致

- 证据：`docs/components/word-editor-page/design.md:117-123`
- 证据：`packages/word-editor-core/src/dataset-model.ts:1,43-52,67-69`
- 证据：`packages/word-editor-renderers/src/panels/dataset-panel.tsx:32-39`
- 证据：`packages/word-editor-renderers/src/panels/field-list.tsx:28-36`
- 问题：组件文档仍写“`static`、`api`、`graphql` 三种源类型”，但 live code 实际支持的是 `sql`、`api`、`mongo`、`static`，UI 也按这四种类型显示标签。
- 影响：这是 host-facing authoring contract 的直接漂移，调用方会根据文档构造出当前实现根本不认的 dataset type。
- 改进方向：统一更新组件文档和架构文档，以 `dataset-model.ts` 为当前事实来源。

## 收敛建议

如果只做最有回报的一轮收敛，建议按下面顺序处理：

1. 先修 core public boundary：`flux-core` 去 React specialization，并同时处理 `SchemaRenderer.surfaceRuntime` 这个未接线 root seam。
2. 再修 validation owner family：保留已落地的 page-owned root baseline，同时把 `ValidationScopeRuntime` 去 form 化，并补齐 managed dialog/drawer 的 surface-root validation owner。
3. 再修 renderer contract bypass：`detail-view` / `detail-field` / `variant-field`，以及 `NodeRenderer` 对 raw `schema.name` 的回退。
4. 最后处理 host contract 漂移和产品策略硬编码：Flow/Report/Word host projection drift、CRUD query form imperative coupling、report canvas 的 grid bounds 与 `${fieldId}` 写法、field chrome 双轨实现、Word Editor persistence port 化。
