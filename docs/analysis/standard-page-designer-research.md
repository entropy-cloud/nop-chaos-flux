# 标准页面设计器（L6）S0 产品裁决 + 调研报告

- **日期**：2026-09-26
- **用途**：roadmap L6 S0 交付物（`docs/backlog/missing-components-and-designer-roadmap.md` §9）。回答三件事：①目标用户与能力边界三选项（表单编排 / 全页编排 / CRUD 向导）怎么裁；②本仓六域设计器之外新建标准设计器，可复用底座有多少；③竞品（amis-editor、lowcode-engine、form-create-designer-tdesign、Retool、Appsmith）的编排形态各是什么。**本文档只裁决方向，不做架构终裁**——S1 架构问题以「待裁决问题清单」形式列出（§5），S0 未过 human gate 不写任何实现代码。
- **上游依据**：roadmap §9 现状描述（六域设计器齐备、标准页面设计器缺失）、QA.6 gate 标准（round-trip 0 丢失 + inspector 由 propContracts 生成 + 与六域设计器边界 0 越界）。

---

## 1. 背景与 S0 裁决框架

### 1.1 现状

本仓设计器版图（六域，均已交付）：

| 域       | 包                                                      | 编排对象                                 |
| -------- | ------------------------------------------------------- | ---------------------------------------- |
| 工作流   | `flow-designer-core` + `flow-designer-renderers`        | 图（节点/边），canvas 为 `@xyflow/react` |
| 任务 DSL | `apps/playground/src/taskflow-designer-lib/`            | 任务 DSL（dsl/lowering/projection/sync） |
| 报表     | `report-designer-core` + `report-designer-renderers`    | workbook/sheet/row/column/cell 元数据    |
| 打印     | `flux-print-core` + `flux-print-renderers`              | 打印版面                                 |
| 文档     | `word-editor-core` + `word-editor-renderers`            | 富文本文档                               |
| 组态     | `flux-renderers-industrial/src/editor/`（scada-editor） | 画面 symbol/连接（leafer）               |

**缺口**：没有任何工具可以「可视化编排任意 flux JSON 页面」。playground 的页面全部以手写 JSON schema 示例形式存在（`apps/playground/src/schemas/`、route entries），主入口能力缺失（roadmap §9：「playground 无入口，packages 无实现」）。

### 1.2 目标用户选项

| 选项                | 用户画像                                                         | 判据                                                         |
| ------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| U-a 开发者/实施顾问 | 会读 schema、要的是「比手写 JSON 快」，需要表达式/动作编排（S3） | 与本仓 schema 生态最贴合；S3 的数据绑定/动作编排对其才有意义 |
| U-b 业务人员        | 零代码拖表单；不理解 schema 与表达式                             | 需要 wizard 化、模板化（更接近选项 C 的形态）                |
| U-c 混合            | 顾问搭骨架、业务填内容                                           | 需要权限/视图分层设计，超出 S2 MVP 量级                      |

**裁决提示**：三选项的复用面差异不大（底座相同），真正分叉在**边界**与**S3 依赖**——面向 U-a 的全页编排器可以「先编排、后绑定」，面向 U-b 的向导器必须先解决数据建模，而本仓没有数据建模底座（flux 是无头 schema 运行时，env 由 host 提供，见 `docs/architecture/renderer-env.md`）。S0 建议 U-a 为主、U-b 靠模板画廊渐进覆盖（S4）。

### 1.3 裁决框架（本文采用的判据）

1. **底座复用最大化**：优先选择让 `flux-core` registry / propContracts / `editor-core` / inspector-shell 先例直接产生杠杆的方案。
2. **边界不越界**：新设计器不得吞并六域设计器的编辑职责；六域产物在新画布中必须收敛为「叶子节点」，只允许经 propContracts 编辑其属性。
3. **roadmap 一致性**：选项必须能兑现 QA.6 的三条验收（round-trip 无损、inspector 由 propContracts 生成、边界 0 越界）。
4. **design-first**：只比方向与风险，S1 未过 review 不写实现。

---

## 2. 本仓底座盘点（file:line 证据）

### 2.1 editor-core：领域无关编辑器内核（undo/命令栈/会话）

`packages/editor-core/src/types.ts`：

- `types.ts:117` `EditorCore<TDocument, TDiff>`：`getState/subscribe/update/record/beginTransaction/endTransaction/abortTransaction/undo/redo/commit/revert/setMode/setSelection/dispose` 完整会话面。
- `types.ts:64-84` `EditorDomainAdapter`：`load/serialize/validate/diff/applyDiff` + 可选 `domainCommands`、`getDocumentIds`。**新设计器只要实现一个 flux-schema 域 adapter 即可获得 undo/redo + 双态隔离 + 提交策略**。
- `types.ts:20-29` `EditorDiffEntry`：栈元素只存 forward/inverse 两条增量 diff，不存全量快照（R4 内存约束）——对 JSON 树编辑意味着需要一棵树的 diff 算法或结构化 patch（S1 裁决点，见 §5.4）。
- `types.ts:35-54` `EditorSessionState`：working/committed 双态 + selection + undo 派生面，经 subscribe 投影（INV-4）。
- `types.ts:9-12` `EditorMode = 'edit' | 'preview'`、`EditorCommitPolicy = 'manual' | 'auto'`——设计器「编辑↔预览」双态直接有内核支撑。
- `types.ts:4-5` 自述对齐 `ScadaEditorSession`（`flux-renderers-industrial/src/editor/editor-session.ts`），是六域设计器会话模型收敛后的产物。
- 工厂与注册：`editor-core.ts:48` `createEditorCore`；`domain-registry.ts:12-24` `registerEditorDomain/getEditorDomain/listEditorDomains`；`undo-command-stack.ts:4` `MAX_UNDO_STACK_DEPTH = 100`。

**结论**：undo/命令栈这层**不需要新写**，问题只剩 flux 树的 diff/patch 契约（§5.4）。

### 2.2 flow-designer-core：canvas/adapter 先例

- `packages/flow-designer-core/src/designer-core-types.ts:10` `DesignerCore`：addNode/updateNode/moveNode/duplicateNode/deleteNode/addEdge/reconnectEdge/select\* 的领域命令面；`core.ts:61,74` `createDesignerCore/createTreeDesignerCore`。
- **canvas 适配器契约先例**：`docs/architecture/flow-designer/canvas-adapters.md` 定义 `DesignerCanvasBridgeProps`——canvas 层只把 UI 手势翻译成回调（onNodeSelect/onMoveNode/...），**图状态变更所有权始终在 host**；且明确「当前公开基线只支持一种 canvas 实现（@xyflow/react），不存在 `designer-page.canvasAdapter` 多实现选择」。→ 对 S1 的含义：page-designer 若要 canvas 可替换性，需要**有意打破该先例的单实现立场**或同样声明单实现（§5.2）。
- **结构树先例**：`flow-designer-core/src/tree-domain.ts / tree-session-impl.ts / tree-projection.ts`——纵向结构树（钉钉审批流式布局）的领域建模。页面 schema 树与之同构度中等（无自由坐标、嵌套 region），可参考其「树域 + 投影 + session」分层，但 page-designer 的画布是嵌套 DOM 布局而非固定槽位树，不能直接照搬（§5.2 选项 b）。
- **三栏壳先例**：`apps/playground/src/flow-designer/flow-designer-{palette,canvas,inspector,toolbar,hover-toolbar}.tsx`——palette/canvas/inspector 三栏壳在 playground 已有一套完整布局参考。

### 2.3 report-designer-core：inspector shell 先例

- `docs/architecture/report-designer/inspector-design.md` 核心结论：「inspector 直接使用 Flux 自己的 `SchemaInput` + form runtime 来定义，不再单独设计第二套 inspector model」；薄 selection-aware 壳 + schema/form body + action 回写；「优先在 schema 组装层通过元编程生成 inspector schema」。
- 代码落点：`packages/report-designer-core/src/runtime/inspector-panels.ts:8` `resolveInspectorSchemaForTarget`（按 targetKind/profile 解析出一段 `SchemaInput` 作为面板体）；`runtime/registry.ts` adapter registry（fieldSources/fieldDrops/previews/codecs/expressions/references 六张 Map）；`adapters.ts:12-123` `ReportDesignerAdapterContext/FieldSourceProvider/TemplateCodecAdapter/ExpressionEditorAdapter` 等。
- **对 page-designer 的含义**：属性面板的「生成物」应该是一段 flux form schema，而不是第二套面板描述 DSL。这一点与 §2.5 的 propContracts 契约面正好咬合：**propContracts 提供属性清单，inspector 组装层把清单编译成 flux form schema**。

### 2.4 condition-builder：表单式结构化编辑面板先例

- `packages/flux-renderers-form-advanced/src/condition-builder/`：`types.ts:4-33` 定义字段描述符（`ConditionFieldType` 文本/数字/日期/select/boolean/custom）、`and/or` 组合、custom operator（含预留 `values` 动态表单扩展点）；`field-select.tsx / operator-select.tsx / value-input.tsx / condition-group.tsx` 实现「描述符驱动的结构化表单面板」。
- **对 page-designer 的含义**：S3 的数据绑定/过滤条件编辑可直接复用该形态；更重要的是它示范了「按字段描述符渲染对应编辑控件」的模式——inspector 生成器本质上是同一模式的泛化。

### 2.5 flux-core renderer registry：palette 清单与契约面

- `packages/flux-core/src/registry.ts:7` `createRendererRegistry`（register/get/has/list，重复注册抛错或 override）；`types/renderer-core.ts:280-286` `RendererDefinition = RendererDefinitionShape + component`。
- `packages/flux-core/src/types/renderer-definition-types.ts:69-105` `RendererDefinitionShape` 已带 **palette 所需元数据**：`displayName/icon/category/defaultSchema`（69-74 行）——组件面板的展示名/图标/分类/初始 schema 不需要新增机制；`propContracts?: Record<string, RendererPropContract>`（78 行）；`eventContracts`（79）；`fields: SchemaFieldRule[]`（85，region/event/reaction 编译指令）；`authoringTransform`（87，per-renderer 授权态变换，消费点在 `flux-compiler/src/schema-compiler/authoring-transform.ts`）；`schemaValidator`（86）。
- `types/renderer-definition-types.ts:23-30` `RendererPropContract = { shape: FluxValueShape; displayName; description?; editorType?; defaultValue?; required? }`——**inspector 自动生成的数据源已经存在**（editorType 决定编辑控件形态，defaultValue 决定新建节点初值）。
- **工具侧消费面已预留**：`packages/flux-core/src/types/renderer-authoring-contract.ts:71-96` `resolveRendererAuthoringContract(definition)`，注释明示「Tooling-facing adapter over RendererDefinition…for authoring/autocomplete/inspection」，返回 `editableProps/events/componentCapabilityContracts/scopeExports/hostProjection`。这是 inspector 生成器的标准入口，S1 不必新造契约面。
- **运行时已注册 renderer 清单从哪来**：`packages/flux-bundle/src/index.tsx:37-50` `registerDefaultFluxRenderers` 依次注册 basic/form/form-advanced/data/content/layout/scheduling 七个家族，`createFluxRendererRegistry()` 是聚合点。**注意范围**：mobile/ai/graph/map/3d/pivot/dashboard/industrial 等 renderer 家族**不在**默认 bundle 注册之列——palette 若直接 `registry.list()`，拿到的就是这七家族（恰好是「页面级」能力）；是否纳入其余家族是 S1 裁决点（§5.6）。
- 治理配套：`scripts/check-finite-prop-contracts.mjs`（schema 枚举与 propContracts 一致性抽查）、`scripts/check-schema-prop-coverage.mjs`（LAYER1/2：definition 声明的每个可见 prop 必须有测试覆盖）、`docs/references/quick-reference.md:576-647` propContracts 纪律（含 **645 行：regions/events 不得注册为 propContracts**——inspector 生成器必须据此把 region/event 字段从属性面板分流到结构树/事件面板）。

### 2.6 schema round-trip 相关面（flux-core compile/schema 类型面）

- 编排对象类型面：`packages/flux-core/src/types/schema.ts:102-124` `BaseSchema`（开放 `SchemaObject`，含 when/visible/className/xui:imports 等通用键）+ `SchemaInput`。
- **round-trip 的根本约束**：编译产物 ≠ 授权产物。`flux-compiler/src/action-compiler.ts:213`、`reaction-compiler.ts:41`、`source-compiler.ts:62` 把 schema 编译为 TemplateNode/reaction/action 工件；`packages/flux-react/src/preserve-literal.ts` 显示编译层会把布尔/字符串字面量包成 `{ __nopPreserveLiteral: true, value }` 信封。→ **设计器必须编辑授权态 JSON 树（SchemaInput），导出也必须是授权态**；任何「在编译图上做编辑再回写」的方案都会丢真。
- 已有的授权态变换先例：`RendererDefinitionShape.authoringTransform`（renderer-definition-types.ts:87）——per-renderer 的授权 schema 变换管线已在 flux-compiler 存在（`schema-compiler/authoring-transform.ts`），设计器的「新建节点默认 schema」「模板替换」可挂同一管线。
- 结构抽取先例：`flux-core/src/nested-regions.ts`（region 编译与参数校验）——子树会被编译期抽取，设计器树操作需按 `fields: { kind: 'region' }`（definition fields 规则）识别可插入容器位。
- **缺口**：本仓没有「授权态 JSON 树的 diff/patch/稳定节点 id」公共件。`BaseSchema.id?` 是可选的（schema.ts:104），编译期有 node-identity（`types/node-identity.ts` TemplateNode）但那是编译产物。设计器选区/undo/协同都需要稳定 id——是 S1 必须裁决的契约（§5.3）。

### 2.7 底座盘点小结

| L6 S2 MVP 需求（roadmap）       | 底座就绪度                                                                                                                                                  | 缺口                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| palette（registry 驱动清单）    | **高**：`registry.list()` + definition displayName/icon/category/defaultSchema（registry.ts:41、renderer-definition-types.ts:69-74）                        | 家族范围裁决（默认 bundle 只含 7 家族）                         |
| canvas（布局容器+表单原子拖放） | **中**：真渲染可复用 `flux-bundle` 的 `createFluxSchemaRendererWithRegistry`（index.tsx:56-88）；树域分层有 flow-designer tree 先例                         | 画布手势→树命令的 bridge 契约、嵌套容器插入语义、编辑态视觉隔离 |
| inspector（propContracts 生成） | **高**：`resolveRendererAuthoringContract`（renderer-authoring-contract.ts:71）+ report-designer「inspector=flux form schema」先例（inspector-panels.ts:8） | 契约→form schema 的生成器本体；editorType→控件映射表            |
| schema JSON 导入导出            | **高**：授权态 SchemaInput 即文档；`EditorDomainAdapter.serialize/validate`（editor-core types.ts:70-72）                                                   | round-trip 无损校验（QA.6 要求变异 fuzz）+ 未键保留策略         |
| undo/redo（editor-core 复用）   | **高**：整层现成（§2.1）                                                                                                                                    | flux 树 diff/patch 契约、稳定节点 id                            |

---

## 3. 竞品调研（2025-2026 检索）

### 3.1 amis-editor（百度，aisuda/amis-editor）

amis 官方可视化编辑器，编排对象就是 **amis JSON schema**（与本仓对标物同构）。扩展走 **plugin 机制**：每个组件一个编辑器插件（继承 `BasePlugin`），声明渲染器 `type` 关联、面板体（panelBody = 一段 amis form 控件配置）、脚手架/初始 schema；自定义组件经 `registerAmisEditorPlugin` 注册基本属性与 controls 面板。Canvas 策略是**真渲染 + 编辑器包装层**：编辑态仍由 amis 渲染器渲染 schema，外层 EditorManager 叠加选中/拖拽覆盖层，属性改动实时回写 schema 并重渲染。属性面板生成方式：**schema 驱动**（面板本身就是 amis form schema）。与代码模式的关系：提供 JSON 源码编辑 tab，可视化与源码双模式共享同一份 schema 文档。对本仓的直接启示：plugin 面板 = form schema 的思路本仓已有等价物（§2.3/§2.5），amis-editor 证明了「编辑态真渲染 + 覆盖层」在 amis 同构 DSL 上是成熟可行路线。
来源：<https://github.com/aisuda/amis-editor>、<https://baidu.github.io/amis/zh-CN/docs/extend/editor>、<https://aisuda.bce.baidu.com/aisuda-docs/NPM组件扩展包/开发amis组件扩展包>

### 3.2 alibaba lowcode-engine（阿里低代码引擎）

定位「最小内核 + 最强生态」，官方公式：**低代码设计器 = 低代码引擎 + 设计器插件 × n + 物料 × n + 设置器 × n**。编排对象是**搭建协议 schema**（页面级 JSON 协议）+ 物料协议（组件描述）。核心模块：editor 骨架（skeleton）、plugin（大纲树/数据源/代码面板等均为插件，面板、canvas、拖拽全部经插件 API 暴露）、material 物料（组件原型：props/setters/snippet 描述）、setter 属性设置器（右侧面板按物料声明的 setter 描述生成）、`react-simulator-renderer` 模拟渲染器。Canvas 策略：**模拟器架构**——designer 与 renderer 分离为两个独立构建产物，renderer 在画布内（iframe/沙箱）渲染 schema，designer 在其上叠加拖拽/选中；这是与 amis-editor 同类的「真渲染 + 覆盖层」，但把画布隔离做到了进程级。与代码模式的关系：schema 是唯一事实源，出码为生态可选项。对本仓的启示：**setter ≈ propContracts 生成 inspector** 的对应关系成立；「内核不含任何物料/插件」的边界纪律值得本仓包结构裁决参考（§5.1）。
来源：<https://github.com/alibaba/lowcode-engine>（packages/engine/README.md）、<https://www.51cto.com/article/704506.html>、<https://lowcode-engine.cn>

### 3.3 form-create-designer-tdesign（TDesign 生态表单设计器）

基于 `@form-create/tdesign`（Vue3）的表单设计器，是「表单编排器」品类的代表。编排对象：**表单控件树**（form-create JSON schema），范围限定在表单字段 + 行布局。三栏形态：左侧组件物料区 + 中间拖拽画布（排序）+ 右侧属性面板（字段属性：label/校验/数据源）；支持设计/预览切换、schema 生成与解析。Canvas 策略：数据驱动渲染（拖拽只改 schema 树，画布即 schema 的渲染结果）。属性面板：按控件类型声明的属性规则生成。与代码模式的关系：纯表单场景无需代码模式，复杂逻辑走组件的事件/联动配置。对本仓的启示：它是选项 A 的成品样例——**表单编排器是已被充分解决的窄问题**，本仓若只做到这个量级，价值增量有限（form 字段手写 schema 成本本就低于整页）。
来源：<https://github.com/form-create/form-create-designer-tdesign>（仓库页）、<https://view.form-create.com>

### 3.4 Retool

闭源内部工具平台，全页应用编排品类的标杆。编排对象：**页面 = 组件树 + 查询/JS**（app 存储为组件及属性的声明式定义，由 render engine 渲染为 React 应用）。三栏形态：左栏组件库/查询/多页管理，中栏画布（拖拽 + 边缘缩放 + 网格布局），右栏每组件属性面板（数据绑定/事件/样式）。Canvas 策略：组件在画布上真实布局渲染，属性改动即时反映（其社区提到「新 render engine」重构以提升性能）。属性面板：按组件声明的配置面生成。与代码模式的关系：查询/JS 是一等公民，组件经 `{{ }}` 响应式绑定查询结果——**数据与 UI 双轨**是全页编排器与纯表单编排器的分水岭。对本仓的启示：S3（数据绑定 + 动作编排 + 表达式编辑器）正是对标这一层，也是选项 B 复杂度的主要来源。
来源：<https://docs.retool.com>、<https://community.retool.com>（render engine 讨论）

### 3.5 Appsmith

开源全页应用编排器。编排对象：**页面 = widget DSL JSON 树** + 查询/API。编辑器三区：widget 面板 / 画布 / 属性面板；画布为网格布局（16 列网格起步，后增 auto-layout flexbox reflow 重排引擎）；拖拽落点计算为网格单元并更新 DSL 树，碰撞时挤压兄弟节点。属性面板：每个 widget 声明 `PropertyPaneConfig`，控件（输入框/绑定/JS 编辑器）由配置生成，编辑直接回写 DSL 节点。状态：Redux 管理 DSL，evaluator 解析 `{{ }}` 绑定后回喂 widget；Git 版本化。与代码模式的关系：JS 绑定/转换器贯穿全编辑器。对本仓的启示：PropertyPaneConfig ≈ 本仓 propContracts；**布局重排（reflow）是自研画布的最大隐藏成本**——本仓选择「flux 运行时真渲染」画布可把布局交给运行时自己（布局 renderer 已实现），规避重排引擎。
来源：<https://github.com/appsmithorg/appsmith>、<https://docs.appsmith.com>、<https://www.appsmith.com/blog>（widget reflow round-up）

### 3.6 竞品横向结论

| 维度     | amis-editor             | lowcode-engine        | form-create-tdesign | Retool       | Appsmith           |
| -------- | ----------------------- | --------------------- | ------------------- | ------------ | ------------------ |
| 编排对象 | amis schema             | 搭建协议 schema       | 表单 schema         | 组件树+查询  | widget DSL 树+查询 |
| canvas   | 真渲染+覆盖层           | 模拟器（iframe 隔离） | 数据驱动渲染        | 真布局+网格  | 真布局+网格+reflow |
| 属性面板 | form schema（插件声明） | setter 物料声明       | 控件属性规则        | 组件配置面   | PropertyPaneConfig |
| 代码模式 | JSON tab 双模式         | 出码（生态）          | 无                  | 查询/JS 双轨 | JS 绑定双轨        |
| 品类     | 全页（amis 语义）       | 引擎（全页）          | 表单                | 全页         | 全页               |

三点收敛：①**没有一家为属性面板发明第二套 DSL**——全部是「声明契约 → 生成面板」，与本仓 propContracts/inspector-shell 路线一致；②**编排对象是授权态 schema**（非编译产物），与本仓 round-trip 约束一致；③成熟全页编排器都把「数据绑定」作为独立层（Retool/Appsmith 的查询、lowcode-engine 的数据源插件），对应本仓 S3 而非 S2。

---

## 4. 能力边界三选项对比与推荐

### 4.1 选项 A：表单编排器

- **范围**：只编排单个 `form` 容器内的字段原子（input/select/radio/…）与行布局；产出局部 schema 片段。
- **复用面**：palette/inspector 全部复用 §2.5 底座；画布最简单（表单是线性流式布局，无嵌套容器插入问题）；condition-builder 形态可参考。
- **风险**：最低。技术风险几乎不存在，产品风险是**价值不足以立项**——roadmap 对 L6 的定义是「可视化编排任意 flux JSON 页面」「低代码平台的主入口能力」（§9 现状），表单编排器只覆盖主入口的一小块。
- **边界冲突点**：与 `flux-renderers-form` 自身的 schema 声明面几乎 1:1 重叠，等于为单容器做了个语法糖壳；将来升级全页时画布层需重做（表单画布无容器插入语义）。

### 4.2 选项 B：全页编排器

- **范围**：编排整棵页面 schema 树——布局容器（page/flex/panel/tabs/grid 等 `flux-renderers-layout` 家族）+ 表单原子 + 数据展示（table/crud/list）+ 内容组件；每个 renderer 在画布上是「按 definition 声明的节点」，S2 限布局容器+表单原子拖放（roadmap 原文），数据/动作到 S3。
- **复用面**：最大——palette（registry.list + definition 元数据）、inspector（resolveRendererAuthoringContract + report-designer shell 先例）、undo（editor-core 整层）、canvas 真渲染（flux-bundle 的 SchemaRenderer）、validation（definition.schemaValidator + flux-compiler 诊断收集器）。
- **风险**：最高，集中在四处：①画布手势→树命令的 bridge（嵌套容器的插入/移动语义、拖拽热区）；②round-trip 无损（未知键/键序保留、稳定节点 id）；③编辑态与运行态视觉隔离（编辑 chrome 不得污染运行时）；④范围蔓延到六域设计器领域。
- **边界冲突点与防线**：六域产物（flow/report/print/word/scada/taskflow 节点）在本画布中必须是**不透明叶子**——只能经其 definition 的 propContracts 编辑属性、经默认 schema 整体替换，**不得展开编辑其内部文档**（那六域各有自己的编辑器）。该防线可直接映射 QA.6「边界 0 越界」审计项。
- **与选项 C 的关系**：CRUD 向导降级为 B 的 S4「模板画廊」特性（见 4.3）。

### 4.3 选项 C：CRUD 向导器

- **范围**：向导式生成 CRUD 页面 schema（选数据源 → 列表列 → 过滤条件 → 表单字段 → 生成整页 crud+table+filter schema），参考 NocoBase 区块/Retool generate CRUD 模式。
- **复用面**：registry + defaultSchema + 本仓既有 `crud`/`table`/`query-filter`/condition-builder renderer；不需要画布或只需极薄预览。
- **风险**：技术最低，产品上**它不是设计器而是生成器**：一次生成后缺乏迭代编辑路径，二次修改仍要回手写 JSON——不解决 roadmap 指出的主入口缺口。且「向导生成」依赖数据源元数据（字段/类型），本仓 env 由 host 注入、无统一数据建模层，向导第一步就得先发明模型协议，反而把 S0 拖进数据层设计。
- **边界冲突点**：与 `flux-renderers-data` 的 crud/query-filter 能力面最接近，容易长成「第二个 crud 配置器」。

### 4.4 对比与推荐

| 判据                       | A 表单编排  | B 全页编排             | C CRUD 向导              |
| -------------------------- | ----------- | ---------------------- | ------------------------ |
| 底座复用率                 | 中          | **高**                 | 中高（但绕开画布底座）   |
| 兑现 roadmap「主入口」目标 | ✗           | **✓**                  | 部分（只覆盖 CRUD 原型） |
| 六域边界可守护             | 易          | **可守护（叶子规则）** | 易但易长歪               |
| S1 架构增量                | 小          | 大但全部有先例         | 小但需新数据模型协议     |
| QA.6 三条验收可检验性      | 部分        | **逐条可映射**         | 部分                     |
| 后续可扩展为另外两者       | →B 需重画布 | **⊇C（模板画廊）**     | →B 需补全部画布          |

**推荐：选项 B（全页编排器），S2 按 roadmap 收窄为「布局容器 + 表单原子拖放」MVP，选项 C 并入 S4 模板画廊。**

理由（按 §1.3 判据）：

1. **复用最大化**：B 是唯一把 §2 五块底座（registry 契约面 / editor-core / inspector-shell / condition-builder / 真渲染画布）全部转化为杠杆的选项；inspector 与 palette 两块几乎是「只写生成器，不写机制」。
2. **边界不越界且可审计**：叶子规则把六域边界变成一条可程序化检验的断言（画布树中出现六域节点时只允许 propContracts 级编辑），直接支撑 QA.6。
3. **不越权数据层**：B 的 S2/S3 都不要求本仓先有数据建模（数据绑定仍面向 host env 注入的数据源表达式），而 C 的第一步就卡在模型协议上。
4. **A/C 都可后置并入 B**：表单编排是 B 在 form 子树上的退化情形；CRUD 向导是 B 的模板/脚手架特性。反之不成立（A→B 需重做画布，C→B 需补全部编排能力），选 B 是唯一不可逆损失最小的序。

**S0 需 human gate 确认的裁决项**：①采纳 B 为产品方向；②目标用户 U-a 为主（顾问/开发者），U-b 靠 S4 模板覆盖；③六域叶子规则作为边界基线写入 S1 设计输入。

---

## 5. S1 架构设计待裁决问题清单

> 以下只列问题与选项，不替 S1 终裁。每项在 `docs/components/page-designer/design-architecture.md` 族文档中需有独立小节。

### 5.1 包结构：新包 vs 复用

- 问题：page-designer 放哪。
- 选项：(a) 新包 `page-designer-core` + `page-designer-renderers`（六域先例：core 纯逻辑 + renderers React 壳）；(b) 只建一个 `page-designer-core`，壳直接进 playground（先验证再固化）；(c) 塞进 `editor-core`（已否——editor-core 是领域无关内核，按 `docs/architecture/editor-core.md` 边界不得含 flux 语义）。
- 关联约束：`pnpm check` 链（oversized-code-files / package-css-exports）、新增包流程（AGENTS.md「Adding New Packages」）、flux-bundle 不得反向依赖设计器。

### 5.2 canvas 适配器：真渲染+覆盖层 vs 结构树画布 vs 单实现声明

- 问题：画布形态与适配器契约。
- 选项：(a) **真渲染 + 覆盖层**——`flux-bundle` SchemaRenderer 编辑态渲染 + 外部覆盖层接管选中/拖拽（amis-editor/lowcode-engine 验证过的路线；保真度天然 100%，难点在事件拦截与容器插入指示）；(b) **结构树画布**——自绘嵌套框（flow-designer tree-domain 分层可参考），渲染自己接管（成本高、保真漂移风险）；(c) 沿用 flow-designer canvas-adapters 立场声明**单实现**（不设 `canvasAdapter` 多实现协议）还是预留多实现接口。
- 关联约束：`docs/architecture/flow-designer/canvas-adapters.md` 的「host 拥有变更所有权、canvas 只翻译手势」契约应原样继承；双态隔离（编辑 chrome 不进运行时）可参考 scada editor 的 `/editor` 子路径注册隔离（`apps/playground/src/App.tsx:16-18`）。

### 5.3 round-trip 契约与稳定节点 id

- 问题：文档恒等式与选区标识。
- 选项：(a) 设计器内部为每个节点注入 id 字段，导出前剥离（id 污染风险在 commit 边界收口）；(b) 路径寻址（`body.0.items.2`），无侵入但 undo/移动后路径失稳，需路径迁移表；(c) 设计器维护 id↔节点弱映射表（外部一致，不碰文档）。
- 必须一并裁决：未知键/自定义 `xui:*` 逐字保留（BaseSchema 是开放 SchemaObject）、JSON 键序保留策略、`authoringTransform` 参与哪些编辑操作、QA.6 的「随机 schema 变异 → 导入→导出 → 比对」fuzz 用什么种子策略。
- 关联缺口：本仓无授权态 JSON 树公共 diff/patch（§2.6），editor-core 的 `EditorDomainAdapter.diff/applyDiff` 需要一个 JSON 树 patch 实现作为 flux 域 adapter 的载体。

### 5.4 undo 粒度：editor-core diff 粒度与事务边界

- 问题：一次拖拽/一次 inspector 提交 = 几条命令。
- 选项：per-node JSON patch（对齐 EditorDiffEntry forward/inverse 对称，types.ts:20-29）+ 拖拽走 `beginTransaction/endTransaction`（一拖拽一 undo 步，types.ts:138-146 已有语义）；inspector 面板提交按「一次确认 = 一条命令」。
- 关联约束：`MAX_UNDO_STACK_DEPTH=100` 的内存假设对整页树 patch 是否成立需在 S1 估。

### 5.5 inspector 自动生成契约

- 问题：propContracts → 面板 schema 的生成器规格。
- 裁决点：①生成器放 core 还是新模块（输入 `resolveRendererAuthoringContract` 产物，输出 flux form `SchemaInput`——消费 §2.3 先例）；②`editorType` → flux form 控件映射表（select/input/switch/...）在哪注册、缺省映射策略；③region/event 字段分流（quick-reference.md:645 禁入 propContracts——region 进结构树、event 进事件面板，S3 接管）；④表达式值 prop（string 型表达式）在 S2 的降级表现（原样 JSON 文本框？S3 换 formula 编辑器）；⑤`shape: FluxValueShape` 联合枚举到 select 选项的提取（`check-finite-prop-contracts.mjs` 的 union 模式是反向校验基准）；⑥definition 无 propContracts 的 renderer 的面板降级（只读属性清单 + JSON 直编）。

### 5.6 palette 来源与家族范围

- 问题：组件面板清单的边界。
- 选项：(a) 运行时 `registry.list()` 过滤（category/rendererClass），天然与 host 实际注册一致，但随 host 注册面波动（默认 bundle 只含 7 家族，§2.5）；(b) 静态 manifest（显式列出可编排类型，可控但与 registry 双源漂移）。
- 关联约束：六域 renderer（如 scada symbol、report 单元格）若被 host 注册进 registry，palette 是否展示、展示后是否强制叶子规则——需与 §5.1 边界基线合并裁决。

### 5.7 边界治理机制

- 问题：「六域叶子规则」如何从约定变成可检验约束。
- 选项：(a) 设计器 core 内置节点分类断言（六域类型集 → leaf-only）；(b) 新增 `pnpm check` 项静态扫描设计器对六域内部模块的 import（import 边界即越界）；(c) 仅 QA.6 人工+e2e 审计。
- 建议 S1 至少落 (b)（静态可执行），(a) 作为运行时兜底。

### 5.8 playground 入口与 bundle 隔离

- 问题：入口路由与产物隔离（沿用 scada `/editor` 子路径注册隔离先例，`App.tsx:16-18`；report-designer lazy import 先例，`App.tsx:97-115`）。
- 裁决点：page-designer 是否要求 flux-bundle 与 designer 包零耦合（设计器自持 registry 实例，复用 `registerDefaultFluxRenderers`）。

### 5.9（S3 预埋）数据绑定与动作编排的挂点

- 问题：S2 的 inspector/树命令接口是否为 S3 的表达式编辑器（flux-code-editor formula）、`xui:actions` 可视化编排、condition-builder 复用预留契约位。
- 建议：S1 只需保证 inspector 单元格渲染可替换（report-designer `ExpressionEditorAdapter` 先例，adapters.ts:88）+ 树命令支持批量 patch（动作编排会整段改写 onEvent）。

---

## 6. 来源列表

**本仓（file:line 均为 2026-09-26 工作区实态）**

- `packages/editor-core/src/types.ts`（:9-12 模式/提交策略；:20-29 diff 栈元素；:35-54 会话状态；:64-84 域适配器；:117-169 EditorCore）
- `packages/editor-core/src/editor-core.ts`（:31 cloneDocument；:48 createEditorCore）；`packages/editor-core/src/domain-registry.ts`（:12-24）；`packages/editor-core/src/undo-command-stack.ts`（:4）
- `packages/flow-designer-core/src/designer-core-types.ts`（:10 DesignerCore）；`packages/flow-designer-core/src/core.ts`（:61,74）
- `docs/architecture/flow-designer/canvas-adapters.md`（DesignerCanvasBridgeProps 契约、单实现立场）
- `apps/playground/src/flow-designer/`（palette/canvas/inspector/toolbar 三栏壳先例）
- `packages/report-designer-core/src/runtime/inspector-panels.ts`（:8 resolveInspectorSchemaForTarget）；`packages/report-designer-core/src/runtime/registry.ts`；`packages/report-designer-core/src/adapters.ts`（:12-123）
- `docs/architecture/report-designer/inspector-design.md`（inspector = SchemaInput + form runtime 的立约）
- `packages/flux-renderers-form-advanced/src/condition-builder/`（types.ts:4-33；field-select/operator-select/value-input/condition-group）
- `packages/flux-core/src/registry.ts`（:7 createRendererRegistry；list()）；`packages/flux-core/src/types/renderer-core.ts`（:280-286 RendererDefinition）
- `packages/flux-core/src/types/renderer-definition-types.ts`（:23-30 RendererPropContract；:69-105 RendererDefinitionShape）
- `packages/flux-core/src/types/renderer-authoring-contract.ts`（:71-96 resolveRendererAuthoringContract）
- `packages/flux-bundle/src/index.tsx`（:37-50 默认注册 7 家族；:56-88 SchemaRenderer 装配）
- `scripts/check-finite-prop-contracts.mjs`；`scripts/check-schema-prop-coverage.mjs`；`docs/references/quick-reference.md`（:213-229 registry 面；:576-647 propContracts 纪律）
- `packages/flux-core/src/types/schema.ts`（:102-124 BaseSchema/SchemaInput）；`packages/flux-react/src/preserve-literal.ts`；`packages/flux-compiler/src/schema-compiler/authoring-transform.ts`；`packages/flux-compiler/src/action-compiler.ts`（:213）/`reaction-compiler.ts`（:41）/`source-compiler.ts`（:62）；`packages/flux-core/src/nested-regions.ts`
- `packages/flux-renderers-industrial/src/editor/editor-session.ts`（editor-core 的模型来源）；`apps/playground/src/App.tsx`（:16-18 /editor 隔离；:26-27,:97-115 六域入口；:230-256,:342 路由）

**外部**

- amis-editor：<https://github.com/aisuda/amis-editor>；amis 可视化编辑器扩展文档 <https://baidu.github.io/amis/zh-CN/docs/extend/editor>；aisuda 组件扩展包 <https://aisuda.bce.baidu.com/aisuda-docs/NPM组件扩展包/开发amis组件扩展包>
- lowcode-engine：<https://github.com/alibaba/lowcode-engine>（packages/engine/README.md）；开源报道 <https://www.51cto.com/article/704506.html>；官网 <https://lowcode-engine.cn>
- form-create-designer-tdesign：<https://github.com/form-create/form-create-designer-tdesign>；文档 <https://view.form-create.com>
- Retool：<https://docs.retool.com>；社区（render engine）<https://community.retool.com>
- Appsmith：<https://github.com/appsmithorg/appsmith>；<https://docs.appsmith.com>；widget reflow <https://www.appsmith.com/blog>
