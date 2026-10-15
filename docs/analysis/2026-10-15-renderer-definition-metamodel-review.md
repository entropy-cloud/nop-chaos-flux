# RendererDefinition 元模型设计分析报告

- 日期:2026-10-15
- 类型:分析报告(analysis,非 plan;结论需经独立评审后方可转为改造计划)
- 范围:`RendererDefinition` 及其配套元模型(`RendererDefinitionShape` / `RendererComponentProps` / `CompiledRendererContract` / `RendererPlugin` / `ResolvedAuthoringContract`),以及"编译期静态模板 ↔ 运行时实例"分层现状核实
- 方法:逐字段消费方追踪(flux-core / flux-compiler / flux-runtime / flux-react / 各 renderer 包)+ 与 `docs/architecture/renderer-runtime.md`、`docs/references/quick-reference.md` 的设计意图比对

## 〇、结论先行

`RendererDefinition` 的设计方向——单条注册记录自描述一切、编译期把声明物化到 `TemplateNode`、禁止核心代码硬编码 type dispatch——是健康且与文档高度对齐的。真正的问题不在"缺东西",而在**同一份事实往往有 2~3 个并行的声明通道,以及类型层存在 3 处手抄副本**,彼此靠运行时门禁(contract-honesty、schema-prop-coverage)对账,而不是靠类型系统收口。

"编译期静态模板 + 运行时多实例"的目标分层**基本成立**(详见第五节):模板零运行时写入、实例动态状态逐实例创建、可增内容挂 scope 侧。偏差集中在:不可变是约定而非强制、静态事实存在"节点快照 + 注册表原件"两份载体、可增内容的家在 scope 而非 NodeInstance。

另一个常见预期——"编译后原始 JSON schema 可完全舍弃、运行时不再触碰"——**不成立**:运行时保留并主动读原始 schema 的通道经盘点有 12 条,其中 6 条是框架内部消费;历史上(plan 132,已归档)只收口了 data-source/reaction 两条路径,"移除 `RendererComponentProps.schema`"被显式裁定为 Non-Goal。详见 5.4。

## 一、元模型全景

元模型实际由四层组成,`RendererDefinition` 是唯一"源":

| 层     | 载体                                                                                                                                                                                              | 角色                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 声明层 | `RendererDefinitionShape`(28 字段,`renderer-definition-types.ts:69`)+ `RendererDefinition`(`renderer-core.ts:216`,加 `component?`)+ flux-react 版(`react-contracts.ts:16`,再加 `reactComponent?`) | 注册表与 tooling 的事实源     |
| 编译层 | `CompiledRendererContract`(`compiled-renderer-contract.ts`)经 `toCompiledRendererContract` 物化到 `TemplateNode.component`(`node-compiler.ts:569`)                                                | Shape 的运行时子集,随编译固化 |
| 实例层 | `RendererComponentProps`(`renderer-core.ts:192`:props/meta/regions/events/reactions/helpers 六通道)                                                                                               | 渲染时数据面                  |
| 消费层 | `resolveRendererAuthoringContract`(`renderer-authoring-contract.ts:71`)→ page-designer(inspector-panel、data-binding-panel)/ nop-debugger                                                         | tooling 适配视图              |

## 二、确认的冗余(按严重度)

### A1. `propSchema` 是死字段 — 建议删除

`RendererDefinitionShape.propSchema`(`renderer-definition-types.ts:75`)在全仓**零生产声明**:唯一生产使用者是 `shape-validation-utils.ts:29,53`(`hasClosedPropModel` / `getAcceptedSchemaKeys`)。其语义("按 prop 声明值形状")与 `propContracts[key].shape` 完全重叠,所有真实 renderer 均已迁移到 `propContracts`。这是元模型里唯一"只有机制没有用户"的字段,留在 `getAcceptedSchemaKeys` 里等于让 accepted-keys 合成逻辑多养一个永不命中的来源。

> **勘误(2026-10-15,R1 共识审查 B1)**:初稿"唯一使用者是 flux-compiler 的两个 `*.test-support.ts` 文件"枚举失实——除 `schema-compiler-diagnostics.test-support.ts`、`schema-compiler-host-action-validation.test-support.ts` 外,flux-compiler 另有 **12 个** `*.test.ts` 内联声明 propSchema(`grep -rln propSchema packages/flux-compiler/src --include="*.test.ts"` 实测;如 `schema-compiler-shape-validation-region.test.ts:10`、`schema-compiler-registry-core.test.ts:50` 等)。"零生产声明"结论经全仓(含 apps/flux-guide)复核成立,删除决策不受影响;迁移面以"删除后 typecheck 全量枚举"为准。

### A2. `fields` 与 `propContracts` — 同一 prop key 双声明

`fields: SchemaFieldRule[]` 管编译期分类(region/event/reaction/prop),`propContracts` 管值形状校验 + tooling 元数据,职责在文档里分得清楚,但代价是:**凡是有形状契约的 prop,必须两处各写一遍**。实测:

- `page` 定义(`basic-renderer-definitions.ts`):`propContracts.breadcrumb` 声明 shape/displayName/editorType,紧接着 `fields` 里又有 `{ key: 'breadcrumb', kind: 'prop' }`。
- `crud`(`crud-renderer-definition.ts:412+`):`fields` 列了 40+ 个 key,`propContracts` 再声明其中一批。

key 集合的对账目前靠 `schema-prop-coverage` 门禁测试兜底。66 个文件声明 `fields`、41 个声明 `propContracts`（统一口径:`grep -rln "<pattern>" packages/flux-renderers-*/src --include="*.ts" --include="*.tsx" | grep -v "\.test\."`,pattern 分别取 `fields: \[` 与 `propContracts:`,2026-10-15 实测;初稿 66/33 系两 pattern 口径不对称[fields 计入 .tsx、propContracts 漏计 .tsx]的误计,R2 勘误）,双写面随 renderer 增长。

### A3. `eventContracts` 与 `fields(kind:'event')` — 同一事件双声明

`container` 的 `onClick` 同时出现在 `eventContracts`(带 payload shape)和 `fields`(`{ key: 'onClick', kind: 'event' }`)。`contract-honesty.ts:438-450` 的 `findUnreferencedContracts` 被迫把两个来源**合并成一个集合**再校验——这段代码本身就是"元模型承认有两个平行通道"的直接证据。

### A4. `scopeExportContracts` 与 `injectedLocals` — 同一 scope 符号双声明

`crud` 与 `form` 各自把 `$crud`/`$form` 声明了两次:一次在 `injectedLocals: { $crud: { kind: 'injected-local' } }`(编译器符号表消费,`symbol-helpers.ts:146`),一次在 `scopeExportContracts: { $crud: { kind: 'object', fields: {...} } }`(仅 tooling 经 `resolveRendererAuthoringContract` 消费)。同一符号名作 key 出现两遍,形状信息与符号信息之间没有任何类型层面的关联。合并为单一 scope-symbol 条目(kind + shape)即可消除。

### A5. 帧族 4 层 + 双词表

帧控制分散在 `wrap`(boolean)、`frameRootTag`、`frameWrap`(definition 默认)三层 definition 字段,加上 `schema.frameWrap` 实例覆盖和 `meta.frameWrap` 解析结果,共 4 层。两个问题:

1. **词表冗余**:`FrameWrapMode = boolean | 'label' | 'group' | 'none'` 中 `false ≡ 'none'`、`true ≡ 'label'`——`resolveFrameWrapMode`(`node-renderer-utils.ts:3-20`)第一步就是把 boolean 归一化掉。同一概念两套词表。
2. **链路绕**:definition 级 `frameWrap`(plan 460 B3 为 radio/checkbox-group 引入)不被 `resolveFrameWrapMode` 直读,须经 `metaProgram → resolvedMeta.frameWrap` 间接生效;而同级的 `wrap` 布尔却被直读。同一个"definition 帧默认值"关注点,两个字段走两条完全不同的路径。

### B6. `CompiledRendererContract` 手抄类型 — 漂移风险最高的一处

`compiled-renderer-contract.ts:12-24` 把 `ValidationContributor` 与 `RendererValidationDefaults` **逐字段重抄**,连回调 ctx 参数类型都换名重写(`renderer: CompiledRendererContract<S>` 代替 `RendererDefinitionShape<S>`),`scopePolicy` 也从 `ScopePolicy` 窄化成字面量副本。今后给 `ValidationContributor` 加字段,这里会**静默漏拷**——没有编译错误,只有行为差异。正确形态是对 Shape 子集做 `Pick`/泛型复用,而不是平行情形。

### B7. 双 `RendererDefinition` 与 component 双通道 — 有理由,但代价外溢

flux-core 的 `component?: BivariantCallback<[RendererComponentProps]>` 与 flux-react 的 `reactComponent?: (props) => ReactElement` 是两个并行组件通道,靠 `ensureRendererComponent`(`auto-renderer.tsx:112-149`)桥接。分层动机成立(host-neutral core 不依赖 React),但产生三个外溢代价:

- `registry.validateDefinition`(`registry.ts:3-7`)运行时强制 `component` 必填,而类型上它是 optional——"注册时必须已有 component"这一不变式只存在于 throw 里,类型系统不可见(可用 `RegisteredRendererDefinition = RendererDefinition & { component: ... }` 表达)。
- 桥接必须用 `WeakMap` 记忆化包装对象,以保住 registry `existing !== definition` 的身份豁免语义(`auto-renderer.tsx:120-123` 注释明确承认)——双通道复杂度的直接证据。
- `RendererPlugin.wrapComponent` 签名收发 `RendererDefinitionShape`(无 component),与 reducer 的完整 definition 累积器之间存在静态类型松动。

### A8. `RendererComponentProps` 里的便利重复通道

`node-renderer-resolved.tsx:378-391` 组装时 `schema: templateNode.schema`、`id: templateNode.id`、`path: templateNode.templatePath`——三个顶层字段是 `templateNode` 的纯投影。renderer 侧实测使用量:`props.node` 101 处、`props.templateNode` 11 处、`props.schema` 8 处。便利通道有真实用户,不宜硬删,但目前没有文档指明哪个是权威、两者分叉时以谁为准。同类问题:`props.props` 与 `props.meta` 对 `disabled/className/testid` 形成双镜像(`RendererResolvedProps` 显式重加这组控制字段),两个通道都活着,分叉即静默 bug。另外 `TemplateNode` 上 renderer type 存了三份:`type`、`rendererType`、`component.type`。

### C. 命名与形状瑕疵(小项)

| 项                                   | 位置                                  | 问题                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RendererRendererClass`              | `renderer-definition-types.ts:18`     | 命名口吃,应为 `RendererClass`/`RendererKind`                                                                                                                                            |
| `type` 重复声明                      | `renderer-core.ts:220`                | `RendererDefinition` 重新声明了从 Shape 继承的 `type`,纯冗余                                                                                                                            |
| `RendererResolvedProps` 的 Omit 清单 | `renderer-core.ts:93-108`             | 头部 `[key: string]: unknown` 使 `Partial<S>` 精化只对已知键生效,且 Omit 名单须与 `BaseSchema` 控制字段手工同步,漏一个就制造一对双通道(`frameWrap` 即漏项——authored 值会漏进 props bag) |
| `events` 通道 `\| undefined`         | `renderer-core.ts:204`                | 每个消费点都要 guard;`regions`/`reactions` 用"缺省即无"策略,同层三通道两种约定                                                                                                          |
| `defineRendererFamily` 断言          | `renderer-definition-builder.ts:31`   | `as RendererDefinition` 双重断言,类型系统没跟上 builder 的宽化                                                                                                                          |
| 28 字段平铺                          | `renderer-definition-types.ts:69-105` | 混合身份/分类/契约/策略/帧/编译 7 类关注点;`renderer-runtime.md` 明确反对收拢成 catch-all,平铺有意,但无分组注释                                                                         |

## 三、站得住、不应动的部分

以下"冗余嫌疑"经查证是**有意设计且边界有文档论证**,不建议合并:

- **`validation` / `validationDefaults` / `schemaValidator` 三分**:运行时验证模型、owner 边界默认、编译期 schema 形状检查,三者生命周期不同,`renderer-runtime.md` 已专门论证不能互相吞并。
- **`compilation` 声明式 lowering**:让 compiler 识别元数据而非 `if (type === 'data-source')`,是"无硬编码 type dispatch"原则的正面实现。
- **`hostContract` 与普通契约分离**、`rendererClass` 三分类(instance/flux-owner/domain-host):所有权边界的正交维度。
- **`wrap`/`staticCapable`/`frameRootTag`/`category`/`icon`/`displayName`**:全部有真实消费(auto-renderer 盖章、static-analysis、FieldFrame、page-designer palette),不是死重。

## 四、建议(按优先级)

1. **P1(低风险高收益)**:删除 `propSchema` 及其在 `getAcceptedSchemaKeys`/`hasClosedPropModel` 中的分支;`CompiledRendererContract` 改为对 Shape 子集的 `Pick` 泛型复用,消灭手抄副本。
2. **P2(需走 plan 流程)**:合并 `scopeExportContracts` + `injectedLocals` 为单一 scope-symbol 条目;合并 `fields` + `propContracts` 为单条目(kind + shape + tooling 元数据);`eventContracts` 收敛为 `fields(kind:'event')` 的唯一来源或反之。三项均触达 66 个 definition 文件与两个门禁测试,必须整体迁移。
3. **P3(锦上添花)**:`RendererRendererClass` 改名(留 alias 过渡);删除 `RendererDefinition` 的重复 `type`;文档钉死 `templateNode` 为权威、`schema/id/path` 为便利投影;`FrameWrapMode` 词表收敛(至少内部一次性 normalize);用 `RegisteredRendererDefinition` 类型化 registry 入参。
4. **P2(新增,源于 5.4)**:确立 runtime schema-retention policy 的 owner 文档(并入 `renderer-runtime.md` 或独立),对 5.4 的 12 条通道逐条裁决(契约保留 / 迁移编译产物 / 删除);第一批清理对象为 #4 `_schema` 死变量与 #5 `getNodeSchemaFrameWrap` 死代码;若裁定"运行时零 raw schema"为终态,按 5.4 的量级评估立项。

所有 P2 级改动都会牵动 `contract-honesty`、`schema-prop-coverage` 门禁和三个 renderer 包的声明面,属跨包契约变更,须按仓库协作纪律走独立 plan + 评审链。

## 五、"编译期静态模板 + 运行时多实例"分层现状核实

目标架构描述:用户输入 JSON schema → 编译得到静态不可变模板结构,静态信息只有这一份 → 运行时同一静态节点派生多个实例,实例上保存动态可变/可增加的内容。

**结论:该分层基本成立,四个要点有三个半落到实处;偏差集中在"不可变是约定而非强制"与"可增内容的家在 scope 而非实例"。**

### 5.1 符合的部分(逐条证据)

1. **编译一次、静态单份**:schema 经 `SchemaCompiler.compile` 产出 `CompiledTemplate { root: TemplateNode | TemplateNode[] }`。模板承载全部静态信息:raw schema、编译后的 `propsProgram`/`metaProgram`/`eventPlans`/`reactionPlans`、`regions` 子树、`scopePlan`/`providerPlan`、`staticAnalysis`、`compiledSources`/`compiledReactions`,以及 `CompiledRendererContract`(renderer 定义的运行时子集快照)。渲染路径零注册表查找——`TemplateNode.component` 直接携带编译期解析的 renderer 契约(`renderer-runtime.md:69` 明文)。
2. **模板零运行时写入**:全仓 grep 无任何对 `templateNode.*` 属性的赋值写点(flux-react/flux-runtime/flux-core 生产代码)。模板的不可变目前由约定维持。
3. **一模板多实例**:`NodeInstance { cid, instancePath, templateNode, scope, state }`(`node-instance.ts:44-59`)。`templateNode` 是共享引用;loop/recurse 结构经 `repeatedTemplateId:instanceKey` 的 `InstanceFrame` 派生实例路径(`useRenderInstancePath`),cid 由 `runtime.allocateMountedCid()` 逐实例分配。同一 `TemplateNode` 可同时支撑 N 个 `NodeInstance`。
4. **动态可变内容在实例/作用域一侧**:实例 `state` 由模板 dynamic program 的 `createState()` **逐实例新建**(`node-instance.ts:22-42`);`resolveNodeMeta`/`resolveNodeProps` 的解析缓存(`resolvedMeta`/`resolvedProps`/`_lastPropsResult`/`_staticPropsResult`)全部写在实例 state 上(`node-runtime.ts:271,344,404,412`),并对引用稳定做了 `shallowEqual` + `reusedReference` 优化。静态 props 只求值一次后缓存,值来源仍是模板 static program 的同一对象。

### 5.2 偏差与注意点

1. **不可变是约定,不是机制**:编译链无 `Object.freeze`/`deepFreeze`。`TemplateNode.schema` 是对输入 schema 的**引用别名**(编译不深拷贝;authoringTransform 产新对象不受影响,但未 transform 的节点与宿主输入共享引用)——宿主在编译后修改输入 JSON,模板会"看到"变化。同时 renderer 可经 `props.schema` 读到原始 authored 树(8 处使用),这条通道读的是"静态输入"而非"静态编译产物"。
2. **静态信息并非字面"只有一份"**:`CompiledRendererContract` 在**每个模板节点**上物化一份定义子集快照,而注册表里同时保留完整 `RendererDefinition` 原件(component、全部契约面,tooling 消费)。即"一份逻辑事实、两份静态载体 + 一个 tooling 适配视图"。这与第二节 B6/B7(手抄副本、双通道)是同一件事的运行时切面——本报告的 P1 建议(`Pick` 泛型化)只动类型层,不新增运行时拷贝,不破坏"静态单份"性质。
3. **可增加内容的家在 scope,不在 NodeInstance**:`NodeState` 是**固定形状**(metaState/propsState/两个依赖集/解析缓存/mounted),不是开放容器。真正"可增"的动态内容——数据源(`registerDataSource({scope})`)、反应(`registerReaction({scope})`)、component handle 注册表、子作用域、dialog(SurfaceRuntime/owned page)——全部挂在 `ScopeRef`/runtime 侧,实例与静态节点的关联仅靠 templateNode 共享引用 + instancePath 帧。若预期"实例信息可动态增字段",当前模型的回答是:增到 scope,不增到实例。
4. **无防写机制**:"模板零写入"目前靠纪律维持,没有任何机制阻止未来代码写模板(例如在 `TemplateNode` 上挂 memo cache 的诱惑)。`TemplateNode` 字段的 `Readonly<>` 标注也不完整(`schema: S`、`state: NodeState` 等未锁)。

### 5.3 对改造建议的约束

第五节的核实给第四节建议加了两条约束:

- 任何 P1/P2 改造**不得在模板上引入新的运行时可变状态**,也不得增加每节点静态快照的体积(P1 的 `Pick` 化是纯类型层收口,满足)。
- P2 的 fields/propContracts 合并若落地,应保持"编译期一次展开、模板只存结果"的现有性质,避免把合并后的复合条目原样带进 `TemplateNode`。

### 5.4 "编译后原始 schema 完全舍弃、运行时零触碰"——不成立

目标描述:编译为静态信息后,原始 JSON schema 即可完全舍弃,运行时任何地方都不再使用它。**现状与此不符**。运行时保留并消费原始 schema 的通道经逐点核实共 12 条:

**框架内部运行时读取(6 条):**

| #   | 通道                                                | 位置                                               | 性质                          |
| --- | --------------------------------------------------- | -------------------------------------------------- | ----------------------------- |
| 1   | `TemplateNode.schema` 保留原始 authored 树          | `node-identity.ts`;编译不深拷贝,与宿主输入共享引用 | 保留的根;下列各项的载体       |
| 2   | 表单 field-name 副作用直读 `props.node.schema.name` | `node-renderer-resolved.tsx:410`                   | 绕过 resolved props 的 raw 读 |
| 3   | 运行时 effect 从原始根 schema 读 `modalContainer`   | `schema-renderer.tsx:270-281`                      | raw 读,未编译进 metaProgram   |
| 4   | `NodeFrameWrapper` 的 `_schema` 死变量              | `node-frame-wrapper.tsx:26`                        | 读了不用——边界模糊的痕迹      |
| 5   | `getNodeSchemaFrameWrap` 读 `node.schema.frameWrap` | `node-renderer-utils.ts:65`                        | **零调用方死代码**            |
| 6   | 调试通道读 `templateNode.schema`                    | `use-node-debug-data.ts:34`                        | 合理,但同样是通道             |

**renderer 契约面 / 公开 API(6 条,设计上是"特性"):**

| #   | 通道                                                                                                                               | 位置                                                                                                                                                                               | 文档状态                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 7   | `RendererComponentProps.schema`("raw schema node")                                                                                 | `renderer-core.ts:198`;renderer 包 14 处生产使用/7 文件(flux-renderers-_ 全包,排除 `_.test.\*`;其中 8 处/2 文件为包根 `test-support.tsx`,严格生产口径 6 处/5 文件——R3 m3 口径括注) | quick-reference.md:75 明文记载为正式通道 |
| 8   | `RenderNodeInput = SchemaInput \| TemplateNode \| ...`——`helpers.render`/`useRenderFragment` 接受原始 schema 片段,渲染时 normalize | `render-fragment-types.ts`;renderer-runtime.md:135                                                                                                                                 | 已记载                                   |
| 9   | `dispatch()` 接受 raw `ActionSchema`(与 `CompiledActionProgram` 并列)                                                              | `renderer-core.ts:299`                                                                                                                                                             | 类型面可见,无政策说明                    |
| 10  | `executeSource({ source: SourceSchema })` raw source 执行入口                                                                      | `renderer-core.ts:303`                                                                                                                                                             | 同上                                     |
| 11  | `evaluate(target: unknown)` raw target 求值                                                                                        | `renderer-core.ts:250`                                                                                                                                                             | 同上                                     |
| 12  | imports 链路运行时接收 raw `XuiImportSpec[]`                                                                                       | `renderer-core.ts:277`(`resolvePreparedImports`)                                                                                                                                   | 同上                                     |

**历史脉络**:plan 132(`docs/archive/plans/132-runtime-schema-dependency-elimination-plan.md`,completed)只把 **data-source/reaction** 两条运行时路径收口到"只消费编译产物"(`compiledSources`/`compiledReactions` 的注释即源于此);"`RendererComponentProps.schema` 全量移除"与 "production schema strip" 被显式写入其 Non-Goals。也就是说,"运行时摆脱原始 schema"是一个**已知、已启动、但被裁定分阶段推进的方向**,当前不是既成事实。

**文档是否说清楚了?——没有。** 三点缺口:

1. 保留事实只是**零散记载**(quick-reference 记了 `props.schema` 通道、renderer-runtime 记了 RenderNodes normalize、132 plan 在归档里记了收口边界),没有任何一份现行 owner 文档正面回答"编译后原始 schema 能否舍弃 / 运行时允许读哪些"这一政策问题。
2. 框架内部自身边界不一致,无文档裁决哪些是契约哪些是债:`frameWrap` 同时存在编译 metaProgram 路径和 raw 读法(后者还是死代码);`name` 一处走 resolved(FieldFrame)、一处走 raw(`node-renderer-resolved.tsx:410`);`modalContainer` 只走 raw。
3. "runtime schema-retention policy"(每条通道:保留为契约 / 迁移到编译产物 / 删除)缺 owner。若确立"终态 = 运行时零 raw schema"为目标,上表 #2/#3/#4/#5 是第一批清理对象,#7/#8/#9/#10/#11/#12 需要逐条设计编译产物替代物,工作量与 plan 132 同量级。
