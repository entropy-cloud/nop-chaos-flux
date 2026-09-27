# 标准页面设计器（L6）S1 架构设计

> **阶段**：roadmap L6 S1（架构设计；design-first——本文档过独立 review gate 前不写任何实现代码）
> **日期**：2026-09-26
> **输入来源**：`docs/analysis/standard-page-designer-research.md`（S0 产品裁决 + 底座盘点 + 竞品调研）、`docs/backlog/missing-components-and-designer-roadmap.md` §9（L6 线）与 §11 QA.6、`docs/plans/00-plan-authoring-and-execution-guide.md`（含规则 14：本文只写最终设计，不写演进叙事）、`docs/architecture/flow-designer/canvas-adapters.md`、`docs/architecture/report-designer/inspector-design.md`、`docs/architecture/editor-core.md`。
> **S0 已确认基线**：产品方向 = 选项 B 全页编排器；目标用户 U-a（顾问/开发者）为主；S2 MVP 锁定「布局容器 + 表单原子拖放」；CRUD 向导并入 S4 模板画廊；六域设计器产物以「不透明叶子 + propContracts 级编辑」接入。

## 1. 设计器定位

标准页面设计器是 flux 生态的**主入口可视化编排工具**：编排对象是整棵页面授权态 schema 树（`SchemaInput`）——布局容器（page/flex/panel/tabs/grid）、表单原子（input/select/…）、以及 S3 起的数据展示与动作编排。它不渲染页面（运行时渲染归属 flux-react/flux-bundle），不生成代码（schema 即产物），不编辑六域设计器的内部文档（边界见 §10）。

三句话边界：

- **编排的是授权态 JSON，不是编译产物**。编译图（TemplateNode/reaction/action 工件）只读，永不回写（§6 INV-F）。
- **画布是 flux 运行时真渲染，不是第二套 DSL**（§5）。
- **属性面板是生成的 flux form schema，不是第二套面板模型**（§8，report-designer inspector 先例的直接复用）。

交付阶段对齐 roadmap §9：S1（本文档）→ S2 MVP（palette + canvas 拖放 + inspector + 导入导出 + undo/redo）→ S3 数据与动作 → S4 模板画廊与深化。QA.6 集成审计 #5 在 S2 完成时执行，验收三条（round-trip 0 丢失 / inspector 由 propContracts 生成 / 边界 0 越界）在本文 §6、§8、§10 分别落为可检验契约。

## 2. 与既有设计器及竞品的能力对照

| 维度      | 本设计器（B 全页编排）      | flow/report/word/scada 六域 | amis-editor    | lowcode-engine  |
| --------- | --------------------------- | --------------------------- | -------------- | --------------- |
| 编排对象  | flux 授权态 schema 树       | 各域专有文档模型            | amis schema    | 搭建协议 schema |
| canvas    | 运行时真渲染 + 覆盖层       | 各域专有（xyflow/leafer/…） | 真渲染+覆盖层  | 模拟器隔离      |
| 属性面板  | propContracts → form schema | report 已立约同构           | 插件 form 面板 | setter 物料声明 |
| undo/会话 | editor-core 复用            | scada 同源先例              | 内建           | 内建            |
| 数据/动作 | S3（表达式/动作编排）       | 各域自洽                    | 事件面板       | 数据源插件      |

收敛结论（承接 S0 §3.6）：没有竞品为属性面板发明第二套 DSL；编排对象都是授权态 schema；全页编排器都把数据绑定作为独立层（对应本文 S3 预埋，§11.2）。本设计器对六域的关系是**宿主**而非竞争者：六域产物在页面树中收敛为叶子节点（§10）。

## 3. 编排对象与文档模型

### 3.1 文档 = 授权态 SchemaInput

```ts
type DesignerDocument = SchemaInput; // BaseSchema | BaseSchema[]，唯一事实源
```

- 文档是页面的**唯一**事实源：画布、结构树、inspector、JSON 源码视图都是它的投影，没有任何第二存储（对齐 flow-designer「host 不得成为第二 graph document store」纪律）。
- `BaseSchema` 是开放 `SchemaObject`：未知键与自定义 `xui:*` 键是用户资产，设计器必须逐字保留（§6 INV-B）。
- 运行时装配（编辑态预览）复用 `flux-bundle` 的 `createFluxSchemaRendererWithRegistry(createFluxRendererRegistry())`——设计器自持 registry 实例（§11.1），与宿主应用零共享。

### 3.2 renderer 定义是唯一契约面

设计器对「一个 type 能不能拖、有什么属性、哪些字段是子树槽位」的全部认知来自 `RendererDefinitionShape`（`flux-core/src/types/renderer-definition-types.ts`）：`defaultSchema`（脚手架）、`propContracts`（属性契约）、`eventContracts`、`fields`（region/event/reaction 规则）、`rendererClass`（域分类）、`schemaValidator`（校验）、`authoringTransform`（授权态变换）。设计器**不维护自己的组件描述文件**——这是与 lowcode-engine 物料协议的根本差异：本仓物料协议与运行时协议是同一份 definition。

## 4. 架构总览与包结构（裁决 1）

**终裁：新建两包 `page-designer-core` + `page-designer-renderers`，对齐六域「core 纯逻辑 + renderers React 壳」先例；playground 只做薄入口。**

理由：core 承载的树域命令、round-trip、inspector 生成器、palette 过滤、节点分类全部是零 React 纯逻辑，可独立单测、可被未来 CLI/调试器复用，也符合 oversized-code-files 治理（大文件按职责拆包）；renderers 承载 palette/canvas/inspector/toolbar 三栏壳，依赖 React 与 flux-bundle。六域（flow/report/word/print/scada）无一例外采用该两包切分，是本仓已收敛的包结构范式。

拒绝项：

- **单包 + 壳进 playground**（S0 选项 b）：playground 是宿主示例场，不是产品代码存放地；S3/S4 增长后迁移成本高于现在建包。
- **塞进 `editor-core`**（S0 选项 c，已预否）：editor-core 是领域无关内核，边界文档明令不含 flux 语义。
- **复用 `flow-designer-core` 扩展**：图域语义（节点/边/端口）与嵌套页面树（region 容器/原子）不同构，强行共包会让两域互相妥协。

### 4.1 分层与依赖方向

```text
apps/playground            路由入口 + home 卡片（经 L0 注册表，lazy import）
  └─ page-designer-renderers   三栏壳（palette / canvas / inspector / toolbar）
       ├─ page-designer-core   树域命令、round-trip、inspector 生成器、palette 过滤、节点分类
       │    ├─ @nop-chaos/flux-core      （类型与契约面，只 import types + resolveRendererAuthoringContract）
       │    └─ @nop-chaos/editor-core    （EditorDomainAdapter / EditorCore 契约）
       ├─ @nop-chaos/flux-bundle         （编辑态真渲染装配，仅 renderers 依赖）
       └─ @nop-chaos/ui                  （Button/Dialog/Tabs 等壳层控件）
```

依赖铁律：`flux-bundle`/`flux-core`/`editor-core` **不得**反向依赖 `page-designer-*`（静态扫描守卫，§10.2）；`page-designer-core` 零 React 依赖；`page-designer-renderers` 不 import 六域内部模块（§10）。

### 4.2 会话组装

```ts
interface PageDesignerSessionOptions {
  registry: FluxRendererRegistry; // 设计器自持实例（§11.1）
  env: FluxRendererEnv; // 编辑态预览 env（host 提供）
  commitPolicy?: EditorCommitPolicy; // 缺省 'manual'
}

interface PageDesignerSession {
  core: EditorCore<DesignerDocument, JsonTreePatch[]>; // undo/redo/双态整层复用（§7）
  dispatch(command: DesignerTreeCommand): DesignerCommandResult; // 树命令唯一写入口（§7.2）
  getSnapshot(): EditorSessionState<DesignerDocument>;
  subscribe(listener: (s: EditorSessionState<DesignerDocument>) => void): () => void;
}

function createPageDesignerSession(options: PageDesignerSessionOptions): PageDesignerSession;
```

## 5. Canvas：真渲染 + 覆盖层适配器（裁决 2）

**终裁：画布 = flux 运行时真渲染（编辑态装配的 SchemaRenderer）+ 独立覆盖层（overlay）接管选择/拖拽/插入指示；继承 flow-designer「host 拥有变更所有权、canvas 只翻译手势」契约；沿用 canvas-adapters.md 的单实现立场，不设 `canvasAdapter` 多实现协议。**

理由：真渲染的保真度天然 100%，布局语义完全交给已有布局 renderer 家族，规避自研画布最大的隐藏成本（Appsmith 的 reflow 重排引擎教训）；「host 拥有变更所有权」契约在 flow-designer 已验证，原样继承把 canvas 层降级为纯手势翻译器。单实现是有意的声明：本设计器只有一种画布（真渲染），多实现协议是 YAGNI——canvas-adapters.md 已明示该立场是产品选择而非实现偷懒。

拒绝项：

- **结构树画布**（S0 选项 b）：自绘嵌套框等于重写一遍布局体系，保真随 renderer 演进持续漂移，六域无一采用。
- **预留多实现接口**：第二个画布实现需求出现时再提炼协议，届时抽象有真实样本。

### 5.1 bridge 契约

```ts
interface PageCanvasBridgeProps {
  document: SchemaInput; // 编辑态真渲染输入（working 投影）
  selection: readonly SessionNodeId[];
  hoverNodeId: SessionNodeId | null;
  dropHint: DropHint | null; // 插入位置指示（§5.3）
  mode: EditorMode; // 'edit' | 'preview'，经 core.setMode
  onNodePointerDown(nodeId: SessionNodeId, event: React.PointerEvent): void;
  onNodeHover(nodeId: SessionNodeId | null, event: React.PointerEvent): void;
  onPaneClick(): void;
  onDragOver(hint: DropHint): void;
  onDragLeave(): void;
  onDrop(payload: DragPayload, hint: DropHint): void;
  onRequestDelete(nodeId: SessionNodeId): void;
  onRequestDuplicate(nodeId: SessionNodeId): void;
}

type DragPayload =
  | { source: 'palette'; type: string } // 新落节点
  | { source: 'canvas'; nodeId: SessionNodeId }; // 画布内移动

type DropHint =
  | { kind: 'inside'; parentId: SessionNodeId; regionKey: string; index: number }
  | { kind: 'before' | 'after'; parentId: SessionNodeId; regionKey: string; index: number };
```

职责切分：canvas 层只做手势→回调翻译与 dropHint 的几何计算（命中检测读覆盖层锚点矩形，§5.2），**不产生任何文档变更**；所有变更经 `session.dispatch` 走树命令。宿主（三栏壳）保持 transient 意图（hover/dropHint），但不成为第二文档存储。

### 5.2 编辑态装配与 DOM 锚点契约

编辑 chrome 必须**零污染**运行时公共路径：

- 编辑态渲染经设计器自持的装配器（`flux-bundle` 工厂 + 编辑装配插件）完成：装配层在每个可选中节点的 frame 根元素上标注 `data-psid="<SessionNodeId>"`（锚点属性），供覆盖层命中检测与矩形计算（`getBoundingClientRect`）使用。
- 锚点只落在 renderer 已有的 frame 根元素（运行时 `frameWrap`/frame 通道），**不得**改动 renderer 内部 DOM、不得进 renderer definition、不得进非编辑装配。预览态（`setMode('preview')`）渲染剥离 sid 后的 committed 文档（§6 INV-E），装配层退化为纯渲染。
- 覆盖层与真渲染层同级叠放：覆盖层 `pointer-events` 仅在选择/hover 热区开启，其余事件穿透给运行时（表单原子在编辑态可交互性受 `meta.disabled` 编辑态策略控制，S2 plan 细化）。

DOM marker 约定：`nop-page-designer-canvas`（画布根）、`data-psid`（节点锚点，编辑态专属）、`data-page-designer-overlay`（覆盖层根）、`data-drop-hint="inside|before|after"`（插入指示）。选区/hover/drop 视觉全部由覆盖层按 token 绘制，不写进运行时样式。

### 5.3 插入语义

插入位置由 `definition.fields` 驱动：含 `kind: 'region'` 规则的 type 是容器；`DropHint.kind='inside'` 仅对容器合法，`before/after` 对兄弟序列合法。落点合法性计算所需信息（regionKey 列表）由 core 的 palette/分类模块提供（§9），canvas 不重复实现规则。

## 6. Round-trip 契约与稳定节点标识（裁决 3）

**终裁：会话节点标识 `xui:sid` 以文档态注入（载入/导入单点全树注入，新建/复制命令内生成），导出投影统一剥离；剥离后恒等式由变异 fuzz 锁定。sid 是设计器私有保留键，与用户 `id`、用户 `xui:*` 键正交。**

理由：undo 的 JSON patch、selection、画布锚点都需要一个「跨结构变换稳定」的节点标识；路径寻址在移动/删除后失稳（需迁移表），外部映射表则在 undo/redo 回放时需要 side-band 同步、破坏「working 文档是唯一事实源」。文档态注入让标识随树一起被 diff/回放，天然稳定；污染风险在导出投影单点收口（amis-editor `$$id` 同构路线，竞品已验证）。键名取 `xui:sid`（保留命名空间），不触碰 `BaseSchema.id` 的运行时语义。

拒绝项：

- **路径寻址**（S0 选项 b）：无侵入但 move/remove 后全量失稳，undo 跨步下路径迁移表复杂度高于注入方案。
- **纯外部 id↔节点弱映射**（S0 选项 c）：文档不污染的代价是映射表成为第二事实源，undo/redo/导入/模板替换四处都要同步维护。

### 6.1 不变式清单（QA.6 round-trip 验收的判定基准）

| #     | 不变式                                                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| INV-A | **导出恒等式**：`stripSessionIds(injectSessionIds(doc))` 与 `doc` 深相等且键序一致；QA.6 fuzz 直接断言本式。                     |
| INV-B | **逐字保留**：未知键与用户 `xui:*` 键原样保留（值、键序、嵌套结构）。设计器只经结构化命令触碰文档，禁止任何「归一化重写」。      |
| INV-C | **键序保留**：树编辑采用结构共享（只重建被触碰节点及其祖先链），未触碰子树保持引用与键序；`JSON.stringify` 按插入序输出。        |
| INV-D | **sid 稳定性**：sid 树内唯一；节点 move/父级变更/undo/redo 后不变；复制节点生成新 sid；删除即失效，redo 恢复时恢复原 sid。       |
| INV-E | **运行时零感知**：导出产物（serialize 输出）不含 `xui:sid`；预览态渲染剥离后文档；`xui:sid` 不出现在任何运行时消费路径。         |
| INV-F | **授权态单向**：serialize/diff/applyDiff 全部作用于授权态 `SchemaInput`；编译工件（TemplateNode 等）只读，永不作为编辑载体回写。 |

```ts
type SessionNodeId = string; // `psid-` 前缀 + 随机串

function injectSessionIds(doc: SchemaInput, rng: SidRandom): SchemaInput; // 载入/导入单点
function stripSessionIds(doc: SchemaInput): SchemaInput; // 导出投影单点（adapter.serialize 内部调用）
type SidRandom = () => number; // 可注入 PRNG，fuzz 用固定种子
```

### 6.2 导入/导出与校验

- **导入**：`JSON.parse` → `adapter.validate`（definition.schemaValidator + flux-compiler 诊断收集器，结构非法拒绝导入并保留 working）→ `injectSessionIds` → 事务内整体替换（1 条 undo 步）。
- **导出**：`commit()` → `adapter.serialize`（内部 `stripSessionIds`）→ 授权态 JSON 文本。导出即交付物，无出码步骤。
- **authoringTransform 参与面**：仅两个入口——palette 落节点（`defaultSchema` 经授权态变换管线）与 S4 模板替换。导入与普通编辑**不**跑 authoringTransform（避免对既有文档做非用户意图的改写，破坏 INV-B）。
- **fuzz 种子策略**：固定种子 PRNG + 变异算子集枚举（子树插入/删除/移动、prop 值变异、未知键注入、region 子树替换、`xui:*` 注入、深层嵌套构造），每算子 × 固定种子矩阵快照入库；断言 INV-A（及 INV-C 键序）。变异 fuzz 是 QA.6 的程序化验收载体，属「必须自动化」层。

## 7. 会话、undo/redo 与命令粒度（裁决 4）

**终裁：editor-core 整层复用，不写新命令栈。diff 载体 = `JsonTreePatch[]`（最小树 patch 集，page-designer-core 自研，editor-core 保持领域无关）；粒度规则：一次用户意图 = 一条 undo 步，连续手势以事务收口。**

理由：`EditorCore` 已提供 working/committed 双态、forward/inverse 对称 diff 栈（`EditorDiffEntry`）、事务（`beginTransaction/endTransaction` 一拖拽一步语义已内建）与提交策略——这正是六域会话模型收敛后的产物；缺的只是 flux 授权态树的 patch 实现与 sid 维护，属领域层职责，落 page-designer-core 的 `PageDesignerDomainAdapter`。

拒绝项：

- **自研命令栈**：与 editor-core 存在性冲突（rebuild 已收敛底座）。
- **全量快照 undo**：违反 editor-core R4 内存约束（栈元素只存增量）。

### 7.1 域适配器

```ts
type JsonTreePatch =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; from: string; path: string }; // JSON Pointer 风格 path

interface PageDesignerDomainAdapter extends EditorDomainAdapter<DesignerDocument, JsonTreePatch[]> {
  kind: 'flux-page-schema';
  // load(): 空页脚手架；serialize(doc): stripSessionIds 后 JSON 文本（§6）
  // validate(doc): schemaValidator + 诊断收集器；diff/applyDiff: patch 生成与回放（纯函数，forward/inverse 对称）
}
```

patch 的 path 是文档位置寻址——在**单条** diff 命令内 forward/inverse 位置对称，回放安全；跨步的节点稳定性由 sid 承担（§6），两层各司其职。

### 7.2 树命令与粒度表

树命令是 canvas/inspector/palette/JSON 视图的**唯一**写入口；命令内部完成「patch 生成 + sid 维护」，经 `session.dispatch` 落 `core.update`（事务外自动入栈 1 条）。

```ts
type DesignerTreeCommand =
  | {
      kind: 'insertNode';
      parentId: SessionNodeId;
      regionKey: string;
      index?: number;
      node: SchemaInput;
    }
  | { kind: 'removeNode'; nodeId: SessionNodeId }
  | {
      kind: 'moveNode';
      nodeId: SessionNodeId;
      targetParentId: SessionNodeId;
      targetRegionKey: string;
      index: number;
    }
  | { kind: 'updateProps'; nodeId: SessionNodeId; props: Record<string, unknown> } // 批量字段合并（S3 动作编排复用）
  | { kind: 'replaceRegion'; nodeId: SessionNodeId; regionKey: string; node: SchemaInput | null }
  | { kind: 'importDocument'; doc: SchemaInput };
```

| 用户意图              | 命令/事务                                         | undo 步 | operationKind |
| --------------------- | ------------------------------------------------- | ------- | ------------- |
| palette 落节点        | `insertNode`                                      | 1       | `insert`      |
| 删除节点（含子树）    | `removeNode`                                      | 1       | `remove`      |
| 画布拖拽移动          | `beginTransaction` → 移动 → `endTransaction` 收口 | 1       | `move`        |
| inspector 字段编辑    | 编辑会话事务，blur/确认收口（§8.3）               | 1       | `set-prop`    |
| region 子树替换       | `replaceRegion`                                   | 1       | `set-region`  |
| JSON 源码视图整段粘贴 | `importDocument`                                  | 1       | `import`      |
| 模板替换（S4）        | `replaceRegion`（页级 region）                    | 1       | `template`    |

栈深沿用缺省 `MAX_UNDO_STACK_DEPTH = 100`：每条命令只存受影响子树的 forward/inverse patch，整页树典型尺寸下 100 步内存上限在 MB 量级，成立；不调大缺省值。

## 8. Inspector 自动生成契约（裁决 5）

**终裁：inspector body = 生成的 flux form `SchemaInput`——输入 `resolveRendererAuthoringContract(definition)`，输出标准 form schema，交 form runtime 渲染；生成器 `buildInspectorSchema` 是 page-designer-core 纯函数。不发明第二套面板 DSL（report-designer inspector-design.md 立约的直接复用）。**

理由：`ResolvedAuthoringContract.editableProps` 已携带 inspector 所需全部信息（shape/displayName/editorType/defaultValue/required），生成器只做「契约→表单 schema」的翻译；面板体复用 flux form 意味着校验、表达式、联动机制全部免费继承。六域先例（report-inspector-shell）已验证「薄 selection-aware 壳 + schema body + action 回写」三件套。

拒绝项：

- **per-renderer 手写面板**（amis-editor plugin panel 模式）：本仓 renderer 数量远超 amis 插件生态维护能力，且 definition 已声明契约，手写面板制造 definition↔panel 双源漂移。
- **第二套 panel descriptor 模型**：inspector-design.md §3 明令优先「上游 schema 组装元编程」而非平行 DSL。

### 8.1 生成器规格

> **QA.6 inspector 验收载体（review Minor-②）**：程序化断言 = 对注册表中每个带 `propContracts` 的 definition，`buildInspectorSchema` 生成的 form schema 覆盖 `editableProps` 全部键（无遗漏、无幻影键），region/event 键分流为零泄漏（不出现在 inspector 字段集）。断言落 S2 的 focused 单测矩阵，QA.6 复核其全量运行结果。

```ts
interface InspectorBuildOptions {
  controlAdapters?: Readonly<Record<string, InspectorControlAdapter>>; // editorType 覆盖位（S3 formula 编辑器挂点）
}
interface InspectorControlAdapter {
  renderCell(input: { value: unknown; onChange(next: unknown): void }): ReactNode; // 形状对齐 report-designer ExpressionEditorAdapter
}
function buildInspectorSchema(
  contract: ResolvedAuthoringContract,
  options: InspectorBuildOptions,
): SchemaInput;
```

- **editorType→控件映射**（core 内置缺省表，host 经 `controlAdapters` 覆盖）：`select`/`switch`/`input`/`textarea`/`input-number`/`json` 直映 flux form 同名控件；`editorType` 缺失时按 `FluxValueShape.kind` 推导兜底：`union`(anyOf 全 literal)→`select`（选项即字面量集，与 `check-finite-prop-contracts.mjs` 的 union 模式互为镜像）、`boolean`→`switch`、`number`→`input-number`、`string`→`input`、`object`/`array`/`record`→`json` 文本域、其余→只读展示。
- **混合 union**（如 `number | 'sm' | 'md'`）：select 附自由输入降级为 `input` + shape 校验提示，不静默截断选项。
- **region/event 分流**：生成器按 `definition.fields` 规则把 `kind: 'region'` 键从属性面板剔除（region 属结构树子树编辑，§5.3/§7.2 `replaceRegion`），`kind: 'event' | 'reaction'` 键路由到事件面板位（S2 只读清单 + S3 可视化编排，§11.2）——propContracts 纪律（quick-reference：regions/events 不得注册为 propContracts）在生成器侧强制执行。
- **表达式值 prop**（string 型 `${...}`）：S2 降级为原样 JSON 文本框（不解析、不失真）；S3 经 `controlAdapters` 换 formula 编辑器，生成器主干不动。
- **无 propContracts 的 renderer**：面板降级为「只读属性清单 + 原始 JSON 直编」——不是空白面板，也不假装可结构化编辑。

### 8.2 提交与状态

- 面板初始值取选中节点的规范化投影（`nodeId` + propContracts 键集），不暴露整树。
- 回写统一走 `page-designer:updateProps` action → `dispatch({ kind: 'updateProps' })`，面板不得直改 store（report-designer §7.2 纪律）。
- shell 只订阅 `selectionTarget` + 当前节点投影；生成的 inspector schema 按 `(rendererType, contractVersion)` 缓存编译产物。

### 8.3 编辑会话与 undo 衔接

inspector 打开即开编辑事务，字段 change 实时改 working（不入栈），blur/显式确认/面板切换时 `endTransaction` 收口为 1 条 undo 步（§7.2 粒度表）——简单字段即时生效的体验与「一次编辑会话一条命令」的 undo 粒度并存。

## 9. Palette 家族范围（裁决 6）

**终裁：palette 清单 = registry 驱动（`registry.list()` 经 `evaluatePaletteEntry` 过滤），拒绝静态 manifest。基线 = 设计器自持 registry 注册的默认七家族；S2 叠加 category 白名单只放行「布局容器 + 表单原子」。**

理由：registry 是「host 实际注册了什么」的单一事实源，静态 manifest 与它双源漂移（mobile/ai/graph 等家族不在默认 bundle，host 注册面波动时 manifest 必然滞后）；`RendererDefinitionShape` 已带 palette 所需全部元数据（displayName/icon/category/defaultSchema），过滤器是薄规则不是新机制。

拒绝项：**静态 manifest**——需要第二套登记与同步纪律，漂移是时间问题。

### 9.1 过滤规则（三条，序贯）

```ts
type PaletteStage = 's2-layout-form' | 's3-plus-data' | 's4-full';

interface PaletteVerdict {
  include: boolean;
  reason?: 'domain-host' | 'no-default-schema' | 'category-not-in-stage';
}
function evaluatePaletteEntry(definition: RendererDefinition, stage: PaletteStage): PaletteVerdict;

interface PaletteItem {
  type: string;
  displayName: string;
  icon?: string;
  group: string; // category 分组展示
  isContainer: boolean; // fields 含 kind:'region' 规则
  isOpaqueLeaf: boolean; // classifyNode 结果（§10.1）
}
```

1. **排除 `rendererClass === 'domain-host-renderer'`**：六域节点不进 palette（§10）；host 显式 allowlist 放入的除外，放入即强制叶子规则。
2. **排除无 `defaultSchema` 的 definition**：无脚手架的 type 无法安全落画布，缺省脚手架是「新节点产生合法 schema」的前提。
3. **stage 白名单**：`s2-layout-form` 只放行 layout 家族容器 + form 家族原子；`s3-plus-data` 放开 data/content/basic 展示类；`s4-full` 放开 scheduling。stage 是产品阶段参数，不是硬编码类型清单——新家族按阶段策略进白名单即可。

palette 拖出即 `insertNode`（`defaultSchema` 经 authoringTransform，§6.2），`PaletteItem` 的 `isContainer` 驱动落点合法性（§5.3）。

## 10. 与六域设计器的边界治理（裁决 7）

**终裁：双防线——运行时分类断言（数据驱动）+ `pnpm check` 静态 import 边界扫描；QA.6 审计是验证手段而非防线本体。六域产物在本画布中是不透明叶子：只允许 propContracts 级属性编辑与整体替换，不得展开编辑内部文档。**

理由：单靠人工审计不可程序化、不可持续（S0 已预判）；import 边界是机器可执行的最强约束（越界即红），运行时分类则守住「即使类型被 host 注册进来，行为也收敛」的兜底。分类按 `rendererClass` 数据驱动而非硬编码六域 type 清单——新增 domain-host-renderer 自动纳入约束，无需改设计器。

拒绝项：**仅 QA.6 人工 + e2e 审计**（S0 选项 c）——事后审计无法阻止越界代码合入，只能事后返工。

### 10.1 运行时防线：节点分类

```ts
type PageNodeClass = 'page' | 'opaque-leaf';
function classifyNode(definition: RendererDefinition): PageNodeClass;
// rendererClass === 'domain-host-renderer' → 'opaque-leaf'；
// 兜底（review Major-1）：rendererClass 缺失或非核心值时按 sourcePackage 判定——
//   sourcePackage 属六域包（flow-designer-* / report-designer-* / word-editor-* /
//   flux-print-* / flux-renderers-industrial / spreadsheet-*）→ 'opaque-leaf'；其余 → 'page'。
// 理由：industrial 现声明 `instance-renderer`、print 部分定义无 rendererClass——仅按
// rendererClass 判定会在 importDocument 路径漏判（palette 有白名单挡板，import 没有），
// sourcePackage 兜底保证六域产物无论声明与否都收敛为不透明叶子。
```

`opaque-leaf` 的行为收敛（设计器 core 内置，不可关闭）：

- inspector 仅生成 propContracts 可编辑字段（region/event 分流规则同样适用，§8.1）；
- 结构树不展开其子树，唯一结构操作是整体替换（`replaceRegion`）与删除；
- palette 默认排除（§9.1 规则 1）；
- 不 import、不实例化六域编辑器——叶子在画布上由其所属 renderer definition 真渲染，编辑动作引导跳转对应域设计器（宿主路由，设计器只承载跳转意图，不内嵌六域编辑器）。

### 10.2 静态防线：import 边界扫描

`pnpm check` 新增检查项：`page-designer-core` / `page-designer-renderers` 的 import 图中禁止出现六域内部模块——`flow-designer-core`、`flow-designer-renderers`、`report-designer-core`、`report-designer-renderers`、`spreadsheet-core`、`spreadsheet-renderers`、`word-editor-*`、`flux-print-core`、`flux-print-renderers`、`flux-renderers-industrial`（含 `/editor` 子路径）。六域**类型**若确需引用（如仅 `RendererDefinition` 已由 flux-core 提供，通常无需），逐项登记豁免并给理由。import 即越界，零豁免缺省。

## 11. Playground 入口隔离与 S3 预埋点（裁决 8、9）

### 11.1 入口与 bundle 隔离（裁决 8）

**终裁：playground 入口经 L0 统一注册表接入（route entry + `homeVisible` 显式标记，designer 分组）；页面 lazy import 隔离；设计器自持 registry 实例，与 playground 主 registry 零共享。**

理由：L0 注册表是 home↔route parity 的单一事实源（roadmap §3 现场核查结论：硬编码清单已造成 56 个入口不可见，前车之鉴）；lazy import 是本仓重依赖页面成熟范式（report-designer/word-editor/leafer 先例）；自持 registry 保证设计器的 palette/画布注册面不受宿主页面注册（mobile/graph/map 等实验家族）污染，反之亦然——`flux-bundle` 与 `page-designer-*` 零反向依赖由 §4.1 铁律锁定。

落地要点：路由 id `page-designer`；入口文案走 `flux-i18n`（zh/en）；入口 chunk 收敛 designer 两包 + flux-bundle 全量 renderer，playground 主 bundle 零增量。若未来出现编辑器专用 renderer 变体，沿用 scada `/editor` 子路径导出隔离先例，不进主入口。

### 11.2 S3 预埋点（裁决 9）

**终裁：S1 锁定三个契约位，S3 填充时不改 S2 主干。**

| 契约位               | S2 形态                                                                  | S3 填充                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| inspector 控件适配位 | `InspectorBuildOptions.controlAdapters`（§8.1），S2 仅内置映射           | formula 编辑器（复用 `flux-code-editor`，S2 不 import 它，依赖出清）+ condition-builder 数据绑定控件（S0 §2.4 形态复用）                    |
| 批量树命令           | `updateProps`（多字段合并）、`replaceRegion`（整段子树替换）天然支持批量 | `xui:actions` 可视化编排 = 事件面板位的结构化编辑器，一次编排整段替换 onEvent = 1 条 undo 步，**无需新增命令种类**                          |
| 左栏数据面板位       | 左栏两 tab（palette / 大纲树）                                           | 第三 tab「数据」，只产出标准 source 节点与 `xui:imports` schema，不改文档模型（数据绑定面向 host env 注入的数据源表达式，不引入数据建模层） |

> **S3/S4 状态回写（plan 524，2026-09-26 实施后注记）**：三预埋位已全部填充，未改 S2 命令种类与文档模型。
>
> - **inspector 控件适配位（done）**：`createFormulaExpressionAdapter()`（page-designer-renderers `inspector-adapters.tsx`）经 `buildInspectorSchema({ controlAdapters })` 挂点注册（editorType `expression`）；校验复用 `flux-formula` `compileTemplate`（与 flux-code-editor expression linter 同引擎，不拖入 CodeMirror——依赖出清形态的择优落地）；expr-invalid 失败路径 = 行内错误、不落文档。
> - **批量树命令位（done）**：`ActionsEditorPanel`（`actions-editor.tsx`）编辑节点 `xui:actions` 命名动作链 record（`XuiActionDefinitions` 契约），动作类型下拉（内建已知集 `BUILT_IN_ACTION_REGISTRY`）/参数键值对（JSON 归一化）/顺序增删；未知类型保留 + 标注；extras/preserved 条目原样保留。整 record 经一次 `updateProps` 合并 = 1 条 undo 步，零新增命令种类。`updateProps` 语义补全：值为 `undefined` 的键 = 移除该键（清空绑定/动作不留 undefined 幻影键）。
> - **左栏数据面板位（done，形态收敛）**：第三 tab「数据」= `DataSourceCatalog`（文档内 `data-source`/`source` 节点 `name` 扫描 + 宿主 env 注入清单，二者并集）+ `DataBindingPanel`（选中节点 `${source.field}` 绑定的结构化编辑，产出经 updateProps 落文档；同一面板挂接 inspector 数据绑定区）。未产 source 节点插入（`data-source` renderer 不在设计器自持 registry 白名单内，插入即破坏 rt-unknown-type 导入不变式）——数据源声明留给宿主 env/数据面板后续阶段，本阶段不引入数据建模层。
> - **S4（done）**：键盘漫游（core `buildKeyboardNavRows`/`resolveKeyboardMove` 纯函数 + 页面 keydown 接线：方向键移动选择、Delete 走 `removeNode`，全命令通道）；模板画廊（`TemplateGallery` + `PageDesignerTemplateStore` 宿主回调面 + `createInMemoryTemplateStore` demo 实现；实例化 = `importDocument` 1 条 undo 步）；协作命令模型预留（core `serializeCommand`/`deserializeCommand`，JSON 形态往返 + 入站校验，不实现传输）。

预埋原则：S2 的命令面与文档模型按 S3 的最坏形状设计（批量 patch、整段替换、adapter 位），但不实现任何 S3 行为、不提前 import S3 依赖。

## 12. 风险、取舍与后续阶段

| 风险/取舍                                         | 说明                                                  | 缓解                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 真渲染画布的事件拦截复杂度                        | 运行时组件消费 pointer 事件，覆盖层需精确控制穿透热区 | §5.2 锚点契约 + `pointer-events` 穿透策略；S2 plan 以 e2e 程序化断言命中精度            |
| 编辑态交互与运行态行为冲突（表单原子可聚焦/提交） | 编辑态点选与控件交互争抢事件                          | 编辑装配层按 `meta.disabled` 编辑态策略冻结控件交互；预览态（剥离装配）验证行为不受污染 |
| `xui:sid` 剥离遗漏导致运行时感知                  | 新增序列化路径绕过导出投影                            | INV-A fuzz + 静态断言 serialize 单点调用（§6）；`data-psid` 仅编辑装配层注入            |
| patch path 与 sid 双寻址的心智负担                | diff 层位置寻址、selection 层 sid 寻址                | 职责已切分：跨步稳定性归 sid，单步回放对称性归 patch（§7.1）；实现层由 adapter 单点封装 |
| 范围蔓延到六域领域                                | 用户需求倒逼「在页面画布里编辑报表」                  | §10 双防线 + 叶子跳转引导；蔓延需求路由到对应域设计器 backlog                           |
| 默认七家族之外的 renderer 治理                    | host 注册 graph/map/ai 等家族后 palette 行为          | §9 过滤规则天然处理：无 defaultSchema/domain-host 排除，stage 白名单控节奏              |

后续阶段（对齐 roadmap §9，本文档过 review gate 后启动 S2 plan）：

- **S2 MVP**：palette（§9）+ canvas 拖放（§5，布局容器+表单原子）+ inspector（§8）+ JSON 导入导出（§6）+ undo/redo（§7）+ playground 入口（§11.1）；QA.6 审计为出口 gate。
- **S3 数据与动作**：§11.2 三个契约位填充（formula 编辑器、动作编排、数据面板）+ 设计补节。
- **S4 深化**：键盘漫游、模板画廊（CRUD 向导并入此处）、（可选）协作命令模型预留。

### 相关文档

- S0 输入：`docs/analysis/standard-page-designer-research.md`
- 路线与验收：`docs/backlog/missing-components-and-designer-roadmap.md` §9、§11（QA.6）
- 底座契约：`docs/architecture/editor-core.md`、`docs/architecture/flow-designer/canvas-adapters.md`、`docs/architecture/report-designer/inspector-design.md`、`docs/architecture/renderer-env.md`
- 契约面代码锚点：`packages/flux-core/src/types/renderer-authoring-contract.ts`（`resolveRendererAuthoringContract`）、`packages/flux-core/src/types/renderer-definition-types.ts`（`RendererPropContract`/`RendererDefinitionShape`）、`packages/editor-core/src/types.ts`（`EditorCore`/`EditorDomainAdapter`）、`packages/flux-bundle/src/index.tsx`（默认注册与真渲染装配）
