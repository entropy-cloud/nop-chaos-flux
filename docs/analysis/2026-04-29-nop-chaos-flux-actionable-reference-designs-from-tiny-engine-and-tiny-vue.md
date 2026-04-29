# 从 tiny-engine 与 tiny-vue 可借鉴给 nop-chaos-flux 的可落地设计

> 日期: 2026-04-29
> 性质: decision-oriented analysis，非现行规范基线
> 范围: 只讨论能在当前 `Flux` 架构边界内逐步实现的改进，不讨论推翻 `Final Execution Schema` runtime 的方向
> 相关文档: `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/analysis/2026-04-29-nop-chaos-flux-vs-tiny-engine-tiny-vue-ecosystem-deep-comparison.md`

---

## 1. 结论

真正值得 `nop-chaos-flux` 参考的，不是把自己改造成另一套 `tiny-engine`，而是吸收 tiny 生态里那些已经被证明对工作台产品化、物料组织、作者体验和交付链有价值、同时又不破坏 Flux 核心边界的设计。

在本次审阅范围内，最值得参考的设计有七类。

| 设计 | 来源锚点 | 与当前 Flux 边界的适配度 | 推荐优先级 | 首个落点 |
| --- | --- | --- | --- | --- |
| 基于“内置缺省 UI + schema/config 差量覆盖”的工作台装配收敛 | `tiny-engine/docs/extension-capabilities-overview/registry.md`, `tiny-engine/designer-demo/registry.js` | Good fit now | 高 | 先在各 host family 的 override 面与默认内容边界上收敛 |
| 工具化 material catalog | `tiny-engine/scripts/buildMaterials.mjs`, `tiny-engine/designer-demo/public/mock/bundle.json` | Good fit now | 高 | 先落在 tooling/domain 包，再视复用度上提 |
| 基于 `ResolvedAuthoringContract` 的属性面板/配置器协议 | `tiny-engine/packages/settings/props/src/composable/useProperties.ts` | Good fit now | 高 | `ResolvedAuthoringContract` 的 tooling 消费层 |
| Flow Designer 的 `quickActions` / `contextActions` / authoring hints | `tiny-engine/designer-demo/public/mock/bundle.json` | Good fit now | 高 | `flow-designer` config + renderers |
| 可选 schema export / codegen pipeline | `tiny-engine/packages/vue-generator/README.md` | Good fit now | 中 | 先原型化在 tooling，再决定是否独立包 |
| iframe 隔离预览 host | `tiny-engine/packages/canvas/README.md` | Good fit later | 中 | `apps/playground` 或 workbench host |
| 复杂控件的局部 headless/controller 抽取 | `tiny-vue/packages/renderless/src/button/vue.ts` | Good fit later | 中 | 从个别复杂 renderer 试点 |

最重要的判断是：

- Tiny 最值得 Flux 学的不是动态执行模型。
- Tiny 最值得 Flux 学的是工作台装配、物料组织、配置器协议、预览隔离和导出链路这些**tooling/productization surface**。
- 这些能力应该被放在 `Flux` core 之外，作为 loader/tooling/workbench layer 渐进补齐。

---

## 2. 选择标准

本报告只保留同时满足下面四条的建议：

1. 不打破 `docs/architecture/frontend-programming-model.md` 中的七个 primitive closure。
2. 不把 loader/装配期职责重新搬回浏览器 runtime。
3. 在当前仓库中已经存在可承接的落点，而不是要求先发明第二套平台。
4. 可以拆成一到数个窄计划逐步落地，而不是需要推翻式重构。

因此，以下东西不在本报告的建议范围内：

- 运行期重新解释继承、profile、结构 patch
- 用 `with($scope)` / `Function(...)` 打开任意 JS 执行面
- 让设计器工作台变成 `Flux` core primitive taxonomy 的一部分
- 为了“像 tiny”而在浏览器端重做一套厚重 authoring engine

---

## 3. 不应直接照搬的部分

先把不该学的部分说清楚，否则后面的“借鉴”很容易越界。

### 3.1 不应照搬 tiny 的动态执行路径

`tiny-engine/packages/canvas/render/src/data-function/parser.ts` 与 `packages/design-core/src/preview/src/preview/generate.js` 里的 `with($scope)`、`newFn`、`Function(...)`，不适合作为 Flux 的参考方向。

原因很直接：

- 这与 `docs/architecture/security-design-requirements.md` 的硬边界相冲突
- 会削弱 `Flux` 的 compile/runtime boundary
- 会让 explainability、diagnostics 和 host validation 失去收敛性

### 3.2 不应照搬全局 `window.*` 物料解析路径

`tiny-engine/packages/canvas/render/src/material-function/material-getter.ts` 依赖 `window.TinyLowcodeComponent`、`window.blocks` 和 block blob import。这是 Tiny 当前生态与工作台分发方式的一部分，但不适合直接搬到 Flux。

Flux 已经有更清晰的边界：

- renderer lookup 走 `RendererRegistry`
- host action 走 `ActionScope`
- host read 走 `Host Projection`

因此 Flux 可以借鉴“物料 catalog 和 workbench authoring metadata”，但不应退回到浏览器端全局对象拼装。

### 3.3 不应把 tiny 的产品壳层扩展直接升格为 core surface

`docs/architecture/flux-dsl-vm-extensibility.md` 已经明确：toolbar / dialogs / side panels / designer shell 这些东西优先属于 loader 或 workbench layer，不应因此重开 `Flux` core 本体。

所以后面的建议都遵守一个规则：

- 能放在 tooling/workbench layer 的，绝不放进 `flux-runtime`

---

## 4. 可直接参考的设计一：基于“内置缺省 UI + schema/config 差量覆盖”的工作台装配收敛

### 4.1 Tiny 的现成做法

`tiny-engine` 的 registry 不是一个小语法糖，而是工作台装配的正式入口。

证据非常明确：

- `tiny-engine/docs/extension-capabilities-overview/registry.md` 定义了 `root / config / layout / themes / toolbars / plugins / settings / canvas`
- `tiny-engine/designer-demo/registry.js` 展示了真实装配方式，包括 layout options、toolbar 分组、settings、canvas

它的价值不在于“动态得很花”，而在于：

- 工作台外壳有一个显式配置入口
- panel / toolbar / theme / canvas 的组合不需要每个产品壳层自己手搓

### 4.2 Flux 当前基线

Flux 里这条线不能被理解成 tiny 那种 plugin/registry 平台，更不能被理解成“visible workbench content 由 manifest 或 registry 描述”。

当前正确基线其实更明确，而且已经在 Flow Designer 落地了：

- `domain-host-renderer` 通过 `RendererDefinition.hostContract` 发布 host family 静态契约；这个契约负责 projection/capability/version 边界，不负责描述实际显示内容，见 `docs/architecture/capability-projection-manifest.md`
- runtime 侧通过 `useHostScope` 和 namespaced `ActionScope` 接线，把 host snapshot 与 `designer:*` 等动作能力暴露给 schema 片段，见 `docs/architecture/complex-control-host-protocol.md`
- Flux 当前并不是“所有可见工作台内容都必须由 schema 显式给出”，而是更接近：**内置缺省 UI + 选定 override 面允许 schema/config 差量覆盖**。
- 这些 override 面已经相当明确：
  - `DesignerPageSchema.toolbar / inspector / dialogs: SchemaInput`
  - `NodeTypeConfig.body / inspector.body / createDialog.body / quickActions: SchemaInput`
  - `ReportDesignerPageSchema.toolbar / fieldPanel / inspector / dialogs: SchemaInput`
- live code 也是按“内置默认 + 差量覆盖”工作的：
  - `packages/flow-designer-renderers/src/designer-page.tsx` 中，`toolbar / inspector / dialogs` 可由 schema 覆盖，但默认仍有 `DesignerToolbarContent` 与 `DefaultInspector`
  - `packages/flow-designer-renderers/src/designer-inspector.tsx` 先渲染 `activeNodeTypeConfig.inspector.body`，没有时 fallback 到通用字段
  - `packages/report-designer-renderers/src/page-renderer.tsx` 中，`toolbar / fieldPanel / inspector / body` 可由 schema 覆盖，但默认仍有 fallback panel/canvas
  - `packages/word-editor-renderers/src/word-editor-page.tsx` 更明显地体现了这条模式：toolbar / leftPanel / rightPanel 可以 override，但默认 Ribbon/Panel 仍然内建，而且像 Word 这种 domain 本来就不适合要求每个控制都由 schema 单独声明

如果强行把 tiny 的 registry 概念映射到 Flux，更准确的对位应该是：

- tiny 的统一 workbench registry，在 Flux 中被拆成了几块各自有 owner 的东西
- 静态 host/domain 契约 -> `RendererDefinition.hostContract` / manifest
- 运行期宿主接线 -> `useHostScope` + namespaced `ActionScope`
- 差量可配置内容 -> `designer-page` / `report-designer-page` 等 owner schema 的 `SchemaInput` region 与 domain config
- 视觉壳层复用 -> `WorkbenchShell`
- 内置缺省 UI 与更上游的默认装配 -> owner renderer + loader/workbench tooling layer

也就是说，Flux 不是“还缺一个 registry”；而是已经把 tiny registry 里混在一起的几类职责拆开，并把“哪些部分内置、哪些部分允许 schema/config 覆盖”这件事单独定义得更清楚。

因此，Flux 真正缺的不是“再加一个工作台注册表”，而是：

- 让不同 host family 的内置缺省 UI、page schema override 面、domain config 与 manifest/tooling 消费路径更系统化地收敛

### 4.3 推荐的具体设计

推荐做的是**“内置缺省 UI + schema/config 差量覆盖”模型的 host workbench 装配收敛**，而不是新的 workbench registry。

更 Flux-native 的落地方式应是：

1. 继续以 `domain-host-renderer + hostContract + useHostScope + namespaced ActionScope + WorkbenchShell` 作为 host 边界基线。
2. 把“哪些内容内置、哪些内容允许差量覆盖”继续明确地放在 owner schema 与 domain config 上，而不是放进 manifest 或新的 registry。
3. 对于 override 面已经稳定的区域，让 loader/workbench tooling 可以按需生成 schema/config 覆盖；但不要求把所有默认 UI 都翻译成 schema。
4. 把当前 `DesignerToolbarContent`、`DefaultInspector`、`RibbonToolbar` 这类内置内容视为正式 default UI，而不是简单过渡物；需要收敛的是 override 面与默认边界，不是消灭默认实现。

如果需要一个最小、可实现的收敛对象，它更应该长这样：

```ts
interface DomainWorkbenchSchemaBaseline<TConfig> {
  ownerRendererType: string;
  configPatch?: Partial<TConfig>;
  regions?: {
    toolbar?: SchemaInput;
    inspector?: SchemaInput;
    dialogs?: SchemaInput;
    fieldPanel?: SchemaInput;
    body?: SchemaInput;
  };
}
```

这里的重点不是再发明新协议，也不是要求“默认显示内容全部 schema 化”，而是把**差量覆盖的入口**系统化下来。

### 4.4 最小可实现路径

1. 不新增工作台注册表或 plugin-style workbench registry。
2. 先从 `designer-page` 开始，收敛清楚默认 toolbar / inspector / dialogs 与 schema override 的边界，而不是一边继续加默认内容、一边随意新增 schema 入口。
3. 第二步推广到 `report-designer-page` / `spreadsheet-page` / `word-editor-page`，但允许不同 domain 保留不同宽度的 override 面；像 Word Editor 这类强产品化界面，不必强求每个控制都 schema 化。
4. 同时增加一条工具消费路径：基于 owner renderer `hostContract` 校验这些 schema 片段能否合法读取 host projection、调用 host actions。
5. 目标不是取消默认 UI，而是让“默认什么、可覆盖什么、如何覆盖”成为清晰稳定的 contract。

### 4.5 为什么这条值得尽早规划

因为它的收益很直接：

- Flow/Report/Spreadsheet/Word 的默认 UI 与 override 面边界更一致
- 对确实需要定制的区域，可以更稳定地做差量覆盖
- 后续做领域发行版时，更容易在 loader/tooling 层生成不同 override baseline，而不是改 renderer 内部逻辑

### 4.6 边界约束

这条建议一旦越界，就会变成错误方向。必须明确：

- manifest 只负责 host boundary 静态契约，不能被拿来描述实际显示内容
- 不要把“有 schema override 面”误写成“所有默认 UI 都应 schema 化”
- Flux 当前更准确的模型是：内置缺省 UI + 选定区域支持 `SchemaInput` / domain config 差量覆盖
- 不能把工作台注册表或 plugin 式平台装配重新定义成 Flux 的主扩展模型
- 不能替代 `hostContract + host scope + namespaced action` 这条既有工作台边界
- 不能变成运行期 schema 组装器
- 不能变成第二套 designer runtime

---

## 5. 可直接参考的设计二：工具化 material catalog

### 5.1 Tiny 的现成做法

`tiny-engine` 的 material 体系最值得参考的，不是具体 JSON 长相，而是它把“供工作台消费的作者元数据”做成了一等对象。

关键证据：

- `tiny-engine/scripts/buildMaterials.mjs` 把分散 JSON 汇总为 `components / blocks / snippets / packages / componentsMap`
- `tiny-engine/designer-demo/public/mock/bundle.json` 里已经有：
  - palette/category 信息
  - `schema.properties`
  - `widget.component`
  - `slots`
  - `shortcuts`
  - `contextMenu`
  - `nestingRule`

### 5.2 Flux 当前基线

Flux 已经有很强的静态 contract 入口：

- `RendererDefinition.propContracts`
- `RendererDefinition.eventContracts`
- `RendererDefinition.componentCapabilityContracts`
- `RendererDefinition.scopeExportContracts`
- `resolveRendererAuthoringContract()`

但它当前更像“contract language 已经收口”，还不算“material catalog 已经 productized”。

当前缺口是：

- palette 分组
- snippets
- tooling-only nesting hints
- context actions
- quick actions
- package/export mapping for exporter tooling

这些东西不应该硬塞回 `RendererDefinition` 的 runtime-facing 部分。

### 5.3 推荐的具体设计

推荐继续沿着 `RendererDefinition` 作为**单一静态入口**的方向扩展，而不是再发明第二个并列 static root。

更合适的做法是：

- 保持 `ResolvedAuthoringContract` 作为 tooling-facing adapter
- 把 palette/discovery/builder hint 这类普通 renderer 静态元数据继续挂在 `RendererDefinition` 上
- 需要更重的 domain/workbench-specific authoring 信息时，再由具体 consumer 在本地做附加投影，而不是先定义第二套全局 descriptor

最小设计可以是给 `RendererDefinition` 补一个 tooling-only 子对象，例如：

```ts
interface RendererDefinition {
  // ...existing fields...
  authoringMeta?: {
    palette?: {
      group?: string;
      order?: number;
      keywords?: string[];
    };
    snippets?: readonly Array<{ title: string; schema: unknown }>;
    nestingHints?: {
      allowedParents?: readonly string[];
      allowedChildren?: readonly string[];
    };
    exportHint?: {
      package?: string;
      exportName?: string;
    };
  };
}
```

如果当前不想扩 `RendererDefinition` 字段，也可以先在单个 consumer 内做一层**本地投影表**，但那张表应被明确视为过渡实现，而不是新的平台级静态根。

### 5.4 最小可实现路径

1. Phase 1 不要先上提到 `flux-runtime` 的新协议。
2. 先选一个工具消费方原型化 `RendererDefinition -> ResolvedAuthoringContract + authoringMeta` 的读取路径，例如：
   - `packages/flow-designer-renderers/src/authoring/material-catalog.ts`
   - 或 `apps/playground/src/authoring/material-catalog.ts`
3. 先只补三类普通 renderer 静态元数据：
   - palette group/order
   - snippets
   - exportHint
4. 如果第二个独立 consumer 也需要这组字段，再把它们正式收敛进 `RendererDefinition` 的 tooling-only 子对象，而不是另开并列 descriptor。

### 5.5 为什么这条值得先做

因为 Flux 现在已经有 `ResolvedAuthoringContract` 这条正确基线。现在最缺的不是再发明 contract，而是把 contract 组织成真正可供 palette / inspector / exporter / docs generator 消费的 catalog。

这条线做成以后，后面的属性面板、导出器、在线编辑器都会更容易做。

### 5.6 边界约束

必须保持：

- material catalog 是 tooling-only
- 运行时执行不依赖它
- 它不能变成新的 schema 解释层

---

## 6. 可直接参考的设计三：基于 `ResolvedAuthoringContract` 的属性面板/配置器协议

### 6.1 Tiny 的现成做法

`tiny-engine/packages/settings/props/src/composable/useProperties.ts` 展示了一个很实用的想法：

- 属性面板不是任意 DOM 表单
- 它有统一的 property metadata
- 它通过 configurator widget resolver/映射层进行编辑
- 它的读写路径是可替换的

### 6.2 Flux 当前基线

Flux 在静态 contract 上已经具备很好的起点：

- `RendererPropContract.editorType`
- `ResolvedAuthoringContract.editableProps`
- `renderer-runtime.md` 和 `capability-contract-model.md` 已经明确说 future tooling 应建立在这条线之上
- `nop-debugger` 已经开始消费 `resolveRendererAuthoringContract()`

现在缺的不是 contract，而是**真正 productized 的 property panel protocol**。

### 6.3 推荐的具体设计

推荐定义一个 tooling 层的 editor resolution layer，而不是让每个在线编辑器自己猜测 prop 怎样编辑。

最小设计：

```ts
interface AuthoringFieldEditorContext {
  rendererType: string;
  propName: string;
  contract: RendererPropContract;
  value: unknown;
  onChange(nextValue: unknown): void;
}

type AuthoringFieldEditor = (ctx: AuthoringFieldEditorContext) => React.ReactNode;

interface AuthoringFieldEditorResolver {
  resolve(editorType: string): AuthoringFieldEditor | undefined;
}
```

这里有两个关键约束：

1. 它编辑的是 authored schema input，不是 renderer 运行时 `props.props`
2. host projection 是只读的，property panel 不能把它当成可写 state

### 6.4 最小可实现路径

1. 先做一组通用内置 editor：
   - `text`
   - `select`
   - `switch`
   - `path`
   - `object`
   - `region`
   - `source`
2. 先在一个最小 consumer 上验证，例如：
   - 通用 schema node inspector
   - 或 `designer-field` 的共享编辑器层
3. 像 `designer-config` 这种 domain-specific editor 不应作为通用内置 editor，而应由对应 domain tooling 自己注册覆盖项。
4. 写路径不要直接耦合任意 store，先通过显式 adapter 提交补丁，例如：

```ts
interface AuthoringNodeAdapter {
  read(node: unknown, propName: string): unknown;
  write(node: unknown, propName: string, nextValue: unknown): unknown;
}
```

### 6.5 为什么这条值得优先做

这是当前最容易转化为真实生产力的地方。

一旦这条线建立起来：

- 在线编辑器
- palette 插入后的默认属性编辑
- renderer docs 自动生成
- 调试器里的 authoring contract 展示

都能复用同一套 contract 和 editor resolution layer。

### 6.6 边界约束

这条线必须坚持：

- 不直接编辑 runtime-resolved props
- 不把 host projection 误当作可写数据域
- 不把 `ResolvedAuthoringContract` 重新膨胀成新的 runtime protocol

---

## 7. 可直接参考的设计四：把 Flow Designer 里已经存在但未接线的 authoring UX 真正接起来

### 7.1 Tiny 的现成做法

Tiny 的物料 bundle 里，除了属性定义，还有很多直接服务工作台交互的字段：

- `shortcuts`
- `contextMenu.actions`
- `nestingRule`

这类字段的价值在于：

- 提高编辑效率
- 让 palette / context menu / node card 之间形成统一作者体验

### 7.2 Flux 当前基线

Flow Designer 这边其实已经有相当一部分结构预留了，但还没完全产品化：

- `docs/architecture/flow-designer/config-schema.md` 已经定义 `NodeTypeConfig.quickActions?: SchemaInput`
- `docs/plans/24-improvement-plan.md` 明确写着 `quickActions schema 从未渲染`
- `docs/plans/15-canvas-bridge-schema-driven-rendering-refactor-plan.md` 也记录了 `NodeTypeConfig` 的丰富配置长期未消费

这说明这里不是“需要先发明新架构”，而是一个很适合拿 tiny 做参考的现成缺口。

### 7.3 推荐的具体设计

推荐分两阶段做。

第一阶段：把现有 `quickActions` 真的渲染出来。

- 节点 hover 或 active selection 时显示
- 仍然使用现有 schema render path
- 仍然走 `designerScope + actionScope`

第二阶段：增加一个明确的 authoring 子对象，而不是把更多 UI hint 平铺在 `NodeTypeConfig` 顶层。

```ts
interface NodeTypeConfig {
  // ...现有字段...
  quickActions?: SchemaInput;
  authoring?: {
    contextActions?: SchemaInput;
    nestingHints?: {
      allowedParents?: string[];
      allowedChildren?: string[];
    };
    paletteKeywords?: string[];
  };
}
```

### 7.4 最小可实现路径

1. 在 `designer-canvas` 上给 active node 增加 `quickActions` 挂载位。
2. 先只做 schema-driven 的按钮式 quick actions，不做字符串 id 映射表。
3. `contextActions` 先作为右键菜单或 “More” 下拉菜单的 schema 片段。
4. `nestingHints` 只用于：
   - palette 过滤
   - create dialog 建议
   - 拖拽时提示文案
5. 不把 `nestingHints` 直接当成 graph core 约束；真正约束仍由 designer rules / domain validator 负责。

### 7.5 为什么这条值得优先做

因为这是最容易让 Flow Designer 从“有架构”走向“更好用工作台”的地方，而且当前 schema/config 已经预留了相当多结构。

### 7.6 边界约束

这里要特别防止一件事：

- 不要把 authoring UX hints 和 graph semantic constraints 混成一个东西

作者体验字段服务的是 workbench；真正语义校验仍应由 domain config、rules、validator 或导入库负责。

---

## 8. 可直接参考的设计五：可选 schema export / codegen pipeline

### 8.1 Tiny 的现成做法

`tiny-engine/packages/vue-generator/README.md` 的价值不只是“能出码”，而是它把导出链路做成了正式的分阶段流水线：

- `transformStart`
- `transform`
- `transformEnd`

这让 “导出为另一种交付形态” 变成正式的 tooling surface，而不是工程角落里的脚本。

### 8.2 Flux 当前基线

从 `docs/architecture/frontend-programming-model.md` 和 `docs/architecture/flux-dsl-vm-extensibility.md` 看，Flux 完全可以做 exporter/codegen，但前提是：

- 这必须放在 execution core 之外
- 不能因此把结构装配重新塞回 runtime

换句话说，Flux 不是不能做导出，而是不该把导出逻辑做成运行时本体。

### 8.3 推荐的具体设计

推荐增加一个**完全在 tooling 层的一次性导出阶段管线**。

最小设计：

```ts
interface FluxExportStage {
  name: string;
  transformStart?(ctx: ExportContext): void | Promise<void>;
  transform?(bundle: ExportBundle, ctx: ExportContext): void | Promise<void>;
  transformEnd?(files: FileArtifact[], ctx: ExportContext): void | Promise<void>;
}
```

这里的 `ExportContext` 可以只包含：

- schema
- renderer registry
- `ResolvedAuthoringContract`
- resolved host manifest

### 8.4 最小可实现路径

1. Phase 1 先不要新建 package，先在 tooling 侧原型化，例如 `apps/playground/src/export/`。
2. 官方第一批 exporter 不需要一步到位做“大而全 React 出码”，更适合先做：
   - normalized schema export
   - dependency/import report export
   - minimal standalone React page scaffold export
3. 如果后续 exporter 真正稳定、出现第二个独立 consumer，再考虑独立成 `@nop-chaos/flux-export`。

### 8.5 为什么这条是值得做的

因为它补的不是 `Flux` core，而是平台交付面。

它能让 `nop-chaos-flux` 多出一条路线：

- 在线 runtime 持续执行
- 或导出为明确 artifact

这两条路线并不冲突，只要 exporter 明确是 tooling，而不是 core 语义来源。

### 8.6 边界约束

必须坚持：

- exporter 是单向工具
- 不反向决定 runtime 执行语义
- 不引入浏览器端结构重写新职责
- `flow-designer` 这类 domain document 的 round-trip/export 仍优先属于 domain adapter，而不是 `Flux` core

---

## 9. 可直接参考的设计六：iframe 隔离预览 host

### 9.1 Tiny 的现成做法

`tiny-engine/packages/canvas/README.md` 明确说明其 canvas 在 iframe 内运行，并通过独立 external/importmap 策略处理内外依赖边界。

其价值主要有三点：

- CSS/运行时隔离更强
- 预览宿主与工作台壳层解耦
- 调试嵌入式场景更贴近真实产品环境

### 9.2 Flux 当前基线

Flux 当前已经有：

- 清晰的 host projection / namespace action boundary
- `nop-debugger` automation API
- `apps/playground` 作为 scenario host

这意味着它完全有条件做一个 iframe sandbox host，但这不是当前最紧迫的 core 缺口，所以更适合归为 `Good fit later`。

### 9.3 推荐的具体设计

推荐做一个很窄的 `PreviewFrameHost`。

消息面只保留少数几个：

```ts
type PreviewFrameMessage =
  | { kind: 'load-schema'; schema: unknown; data?: Record<string, unknown> }
  | { kind: 'dispatch-action'; action: unknown }
  | { kind: 'get-debug-snapshot' }
  | { kind: 'inspect-by-cid'; cid: number };
```

frame 内部运行的仍然是同一个 `Flux` runtime 与 `nop-debugger`，不是第二套 preview engine。

### 9.4 最小可实现路径

1. 先在 `apps/playground` 内做，不要先抽共享 package。
2. frame 内加载的是同一个 `SchemaRenderer` host。
3. 通过 `postMessage` 代理少数调试与动作调用。
4. 第一批用途只针对：
   - CSS/theme 隔离验证
   - embedding 场景模拟
   - debugger automation 的跨 frame 验证

### 9.5 边界约束

必须坚持：

- 不允许跨 frame 直接共享 store 引用
- 不绕过 host capability / projection boundary
- frame 里执行的仍是同一个 `Final Execution Schema` runtime

---

## 10. 可直接参考的设计七：复杂控件的局部 headless/controller 抽取

### 10.1 Tiny 的现成做法

`tiny-vue/packages/renderless/src/button/vue.ts` 展示了一个清楚的模式：

- 组件逻辑先放在 renderless/controller 层
- 视图层只负责模板和外观

这不一定要被升格成全仓库总原则，但对复杂交互控件是有价值的。

### 10.2 Flux 当前基线

Flux 并不缺 hook-based runtime helper，但部分复杂控件里仍然存在“状态/搜索/筛选/选择/展示混在一个文件里”的情况。

一个很直接的例子是：

- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`

这个文件同时承担：

- tree option flatten/filter
- 查询状态
- selected label 推导
- toggle 逻辑
- 视图渲染

### 10.3 推荐的具体设计

推荐的不是“全仓库 renderless 化”，而是对个别复杂控件抽出 local controller hook。

例如：

```ts
function useTreeSelectController(input: {
  options: unknown[];
  value: unknown;
  multiple: boolean;
  searchable: boolean;
}) {
  // 只管理筛选、展开、选择、标签派生
}
```

视图层继续保留在 renderer 文件中，`RendererDefinition` 和 `RendererComponentProps` 契约不变。

### 10.4 最小可实现路径

1. 只在 1-2 个复杂控件试点，不做全仓 sweep。
2. 第一批候选就从 `tree-controls.tsx` 开始。
3. 抽出去的是 controller/hook，不是第二套框架协议。
4. 视觉结构、`@nop-chaos/ui` 组件组合和 renderer contract 保持不变。

### 10.5 为什么这条放在 later

因为它改善的是实现质量和维护性，不是当前平台能力闭环里最缺的那个洞。

相比之下，material catalog、property panel、quick actions 的收益会更直接。

### 10.6 边界约束

必须避免两种错误：

- 把局部 hook 模式升级成新的平台本体
- 为了 headless 化而破坏 `RendererComponentProps` 统一契约

---

## 11. 推荐落地顺序

如果只按“收益 / 成本比”来排，建议按下面顺序推进。

### Phase 1

1. 工具化 material catalog
2. 基于 `ResolvedAuthoringContract` 的属性面板/配置器协议
3. Flow Designer `quickActions` 正式接线

原因：

- 这些都已经有现成 contract 或 config 入口
- 产出最容易被 palette / inspector / authoring tooling 直接消费
- 不需要改 `flux-runtime` 本体

### Phase 2

1. 基于“内置缺省 UI + 差量覆盖”的 workbench 内容装配收敛
2. exporter/codegen pipeline 原型

原因：

- 这两条线都属于平台产品化增强
- 但都应该建立在前面的 material catalog / authoring contract / quickActions 接线之上
- 其中 workbench 内容装配收敛值得尽早规划，但真正大规模推进之前，更适合先完成前面的 authoring 基础设施

### Phase 3

1. iframe preview sandbox
2. 复杂控件的局部 controller 抽取

原因：

- 这两条线更偏“完善工作台体验”和“提高维护性”
- 不是当前最核心的 authoring/productization 缺口

---

## 12. 最后的判断

`tiny-engine + tiny-vue` 对 Flux 最有参考价值的部分，不是“让 Flux 变成另一套 tiny”，而是下面这句话：

> 在不打开 runtime 语义面的前提下，把工作台默认 UI、差量覆盖入口、物料目录、属性编辑、预览隔离和导出链做成正式 tooling surface。

如果把这个判断再压缩一点，就是：

- Flux 的强项已经是执行内核与正式 contract
- Tiny 最值得借鉴的是如何把这些 contract 进一步产品化成作者可直接使用的工作台能力

因此，`nop-chaos-flux` 真正值得做的改进，不是重写 core，而是补齐上层 tooling/workbench/productization 闭环。

---

## 13. 一级证据锚点

### `nop-chaos-flux`

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/capability-contract-model.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/config-schema.md`
- `packages/flux-react/src/workbench/workbench-shell.tsx`
- `packages/flux-react/src/workbench/hooks.ts`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/renderer-authoring-contract.ts`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-manifest.ts`
- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
- `docs/plans/24-improvement-plan.md`
- `docs/plans/15-canvas-bridge-schema-driven-rendering-refactor-plan.md`

### `tiny-engine`

- `docs/extension-capabilities-overview/registry.md`
- `designer-demo/registry.js`
- `scripts/buildMaterials.mjs`
- `designer-demo/public/mock/bundle.json`
- `packages/settings/props/src/composable/useProperties.ts`
- `packages/vue-generator/README.md`
- `packages/canvas/README.md`

### `tiny-vue`

- `PACKAGES.md`
- `packages/renderless/src/button/vue.ts`
