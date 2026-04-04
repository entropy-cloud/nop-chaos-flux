# 开放设计器平台扩展规范

## 1. 目的

本文定义 Flux 作为“设计器的设计器”所需要补充的统一规范、扩展协议和标准结构。

核心判断不是“内置了多少组件”，而是：

- 是否能用同一套内核稳定承载 Flow Designer、Report Designer、Word Designer 等不同领域设计器
- 是否能在不破坏 React 最佳实践的前提下，做到高扩展、低耦合、可渐进演化
- 是否能让后续新增设计器、适配器、组件、属性面板、导入导出协议时，不需要重写平台骨架

本文的约束明确偏向开放平台，而不是固化页面搭建器：

- Flux 不是“预置一组控件给用户拖拽”的封闭低代码平台
- Flux 的目标是提供一套通用内核，使上层能够定义“什么是一个设计器、这个设计器暴露什么命令、如何编辑对象、如何保存、如何扩展”

因此，本文把“开放设计器平台”视为第一原则。

## 2. 设计原则

### 2.1 内核稳定优先于功能数量

- 组件数量不是当前阶段的核心竞争力
- 只要扩展协议稳定，新组件、新设计器、新 profile 都可以持续增加
- 如果协议不稳定，组件越多，后续兼容和重构成本越高

### 2.2 统一抽象必须服务真实差异

抽象不是为了抽象。

统一协议必须同时满足这些真实差异：

- Flow Designer 关注节点、边、端口、布局、连接校验
- Report Designer 关注 workbook、sheet、cell、metadata、field drop、preview
- Word Designer 关注文档块、数据集、片段、模板变量、导入导出

如果某个统一层无法同时承载这些对象，它就不是有效抽象。

### 2.3 React 集成必须保持最佳实践

- render 阶段只读，不做写入、副作用、命令分发
- 对 React 暴露的 props 和 snapshot 保持不可变语义
- 用结构共享和选择性订阅减少重渲染，而不是靠可变对象绕过 React
- 外部 store 可以更细粒度，但 React 看到的仍然应是语义稳定、引用可比较的数据

### 2.4 写操作统一走命令面

- schema 片段、toolbar、inspector、快捷键、画布回调都不能直接改 domain store
- 所有写操作必须通过 namespaced command/action 进入统一执行链
- 这样才能保证历史、校验、权限、监控、协作、回放和调试都落在同一边界上

## 3. 平台定位

Flux 的统一模型不是“页面渲染器 + 一堆特殊组件”，而是三层平台：

1. 通用运行时层
2. 领域设计器层
3. Profile / Adapter 层

```text
schema / config / profile
  -> compile + runtime + react integration
  -> domain core + domain bridge + host scope
  -> toolbar / inspector / canvas / dialogs / import-export / validators
```

其中：

- 通用运行时层负责 schema、scope、action、form、dialog、编译与 React 边界
- 领域设计器层负责 flow / spreadsheet / word 等特定文档模型与命令执行
- Profile / Adapter 层负责接入具体业务模型，而不是把业务语义硬编码进通用设计器 core

## 4. 必须补充的统一规范与协议

下面这些协议是开放设计器平台的最小补齐面。

### 4.0 协议分层原则

所有扩展协议都必须明确自己属于哪一层，避免把不同问题混成一个“大而全”的接口。

建议固定分成 5 层：

1. 平台识别协议
2. 领域桥接协议
3. UI 供给协议
4. 业务装配协议
5. 演进兼容协议

对应关系：

- 平台识别协议：`DesignerManifest`
- 领域桥接协议：`DomainBridge`、`HostScopeProjection`
- UI 供给协议：`InspectorProvider`、`ResourceProvider`、`CommandDescriptor`
- 业务装配协议：`ProfileManifest`
- 演进兼容协议：`SchemaMigration`、version policy

这样做的原因是：

- 新增一个设计器时，平台先识别它是什么，再决定如何承载它
- 新增一个业务 profile 时，不需要修改平台识别层
- 新增一个 inspector panel 时，不需要触碰领域 core
- 新增一个导入导出协议时，不需要污染 renderer 层

### 4.1 `DesignerManifest`

定义“一个设计器由什么组成”，而不是只定义一个 renderer type。

建议最小结构：

```ts
interface DesignerManifest {
  kind: string;
  version: string;
  pageType: string;
  commandNamespace: string;
  objectKinds: string[];
  regions: {
    toolbar?: string;
    resource?: string;
    canvas?: string;
    inspector?: string;
    dialogs?: string;
    statusbar?: string;
  };
  capabilities: {
    history: boolean;
    selection: boolean;
    clipboard?: boolean;
    preview?: boolean;
    import?: boolean;
    export?: boolean;
  };
}
```

作用：

- 让平台认识“这是一类设计器”，而不是只认识一个页面组件
- 让 workbench、调试器、会话管理、插件系统可以按设计器能力而不是按 if/else 分支工作

还应补充两个约束字段：

```ts
interface DesignerManifest {
  stability?: 'experimental' | 'stable' | 'deprecated';
  snapshotVersion?: string;
}
```

原因：

- 调试器、自动化测试、插件运行时不能默认假设所有设计器快照都同版本
- 平台要能显式区分实验态设计器和可对外承诺稳定协议的设计器

### 4.2 `DomainBridge<TSnapshot, TCommand, TResult>`

定义 React 壳层与领域 core 的统一桥接。

```ts
interface DomainBridge<TSnapshot, TCommand, TResult> {
  getSnapshot(): TSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: TCommand): Promise<TResult>;
}
```

必须约束：

- `getSnapshot()` 返回只读视图
- `dispatch()` 是唯一写入口
- 允许不同 domain 的 command 不同，但桥接方式一致

建议再补两个可选能力，但必须保持只读/单向写语义：

```ts
interface DomainBridge<TSnapshot, TCommand, TResult> {
  getRevision?(): number;
  inspect?(path: string): unknown;
}
```

用途：

- `getRevision()` 让 React 和调试器能更便宜地判断快照是否推进
- `inspect()` 让调试器和自动化工具获取局部诊断信息，而不暴露底层 store

### 4.3 `HostScopeProjection`

定义领域快照如何稳定投影到 schema 片段可消费的 scope 中。

```ts
interface HostScopeProjection<TSnapshot> {
  buildScopeData(snapshot: TSnapshot): Record<string, unknown>;
  rootKey?: string;
}
```

约束：

- schema 层看到的是只读派生数据，不是底层 store 实例
- 派生结果允许结构共享
- 不允许把 command API、可变引用、私有内部状态直接放进 scope

推荐把 host scope 投影分成三类字段：

1. 文档字段
2. 选择字段
3. 运行时摘要字段

例如：

- Flow Designer：`doc`、`selection`、`activeNode`、`activeEdge`、`runtime`
- Report Designer：`workbook`、`activeCell`、`activeRange`、`selectionTarget`、`preview`
- Word Designer：`document`、`activeBlock`、`datasets`、`outline`、`runtime`

不要混入：

- 可写命令函数
- bridge 对象本身
- 私有缓存对象
- React event 对象

### 4.4 `CommandDescriptor` 与命令注册规范

当前 namespaced action 已经是基础，但还需要显式命令描述，便于设计器、自定义 toolbar、权限、快捷键、调试器共享理解。

```ts
interface CommandDescriptor {
  name: string;
  title?: string;
  payloadSchema?: unknown;
  selectionPolicy?: 'none' | 'optional' | 'required';
  undoStrategy?: 'none' | 'snapshot' | 'patch' | 'domain';
  dangerous?: boolean;
  hotkey?: string[];
  telemetryKey?: string;
  visibleWhen?: string;
  enabledWhen?: string;
}
```

约束：

- `visibleWhen` 和 `enabledWhen` 只用于 UI 层声明，不改变 command 执行层的权限判断
- 真正的命令合法性仍由 domain core 或 command handler 校验
- `undoStrategy` 不是 UI 建议，而是领域实现约束的一部分

这样做的价值是：

- toolbar、右键菜单、命令面板、快捷键帮助都可以消费同一份描述
- 权限、只读态、对象选择约束可以在 UI 层统一体现
- 调试器可以按 `telemetryKey` 聚合命令统计

### 4.5 `InspectorProvider` / `ResourceProvider` / `CodecAdapter`

这些是开放设计器和普通低代码平台的关键分界线。

建议统一为三类平台扩展面：

1. `InspectorProvider`
2. `ResourceProvider`
3. `CodecAdapter`

```ts
interface InspectorProvider<TTarget> {
  id: string;
  match(target: TTarget): boolean;
  getPanels(target: TTarget): InspectorPanelDescriptor[] | Promise<InspectorPanelDescriptor[]>;
}

interface ResourceProvider<TItem> {
  id: string;
  load(): Promise<TItem[]> | TItem[];
}

interface CodecAdapter<TDocument> {
  id: string;
  importDocument(payload: unknown): Promise<TDocument> | TDocument;
  exportDocument(document: TDocument, format?: string): Promise<unknown> | unknown;
}
```

这三类能力可以覆盖：

- 左侧资源面板
- 右侧属性面板
- 外部模型导入导出

而且都不要求 core 直接理解业务模型细节。

还应补一个可选的 `PreviewAdapter`，因为预览通常不是导出，也不应写进 core。

```ts
interface PreviewAdapter<TDocument> {
  id: string;
  preview(document: TDocument, args?: Record<string, unknown>): Promise<unknown> | unknown;
}
```

这类 provider/adapter 的共同约束：

- 输入输出稳定
- 不泄露平台内部 store
- 可单元测试
- 可被 profile 选择或替换

### 4.6 `ProfileManifest`

定义某个具体业务如何装配通用设计器。

```ts
interface ProfileManifest {
  id: string;
  designerKind: string;
  version: string;
  inspectorProviderIds: string[];
  resourceProviderIds?: string[];
  codecAdapterId?: string;
  previewAdapterId?: string;
  expressionEditorId?: string;
  commandPolicy?: Record<string, { visible?: boolean; enabled?: boolean }>;
}
```

它解决的是“同一个 report designer 如何适配不同后端模板模型”的问题。

还应增加两个原则：

- profile 只能装配能力，不应重写领域核心语义
- profile 可以裁剪、替换、扩展，但不应绕过统一命令面

### 4.7 `SchemaMigration` 规范

开放平台必须允许 profile、designer config、文档模型演进。

```ts
interface SchemaMigration<TDocument> {
  fromVersion: string;
  toVersion: string;
  migrate(document: TDocument): TDocument;
}
```

这不是附属功能，而是扩展平台的稳定性基础。

推荐同时支持三类迁移：

1. 文档迁移
2. config 迁移
3. profile 数据迁移

这样平台升级时，不会因为某个设计器或某个 profile 的结构调整而卡死。

### 4.8 `ExtensionPackageManifest`

如果后续允许第三方扩展包，需要一个明确的包级描述，而不是只靠约定目录名。

```ts
interface ExtensionPackageManifest {
  name: string;
  version: string;
  designers?: DesignerManifest[];
  profiles?: ProfileManifest[];
  inspectorProviders?: string[];
  resourceProviders?: string[];
  codecAdapters?: string[];
  previewAdapters?: string[];
  migrations?: string[];
}
```

这样平台启动时可以完成：

- 扩展包发现
- 版本冲突检测
- 能力注册
- 调试器中的扩展可见性

### 4.9 `SnapshotContract`

为了让 React、调试器、自动化和 host scope 都能稳定工作，需要给 snapshot 规定统一约束。

```ts
interface SnapshotContract {
  revision: number;
  kind: string;
  version: string;
  readonly: boolean;
}
```

每个领域快照都应满足：

- 有 revision
- 有 version
- 有只读语义
- 允许结构共享
- 不暴露原始 store 引用

## 5. 标准结构

建议把开放设计器平台的标准结构固定为以下层次。

```text
packages/
  flux-core/                    # 通用协议类型、纯 helper、共享 contracts
  flux-runtime/                 # schema compile、scope、action、form、data、plugins
  flux-react/                   # React integration、hooks、SchemaRenderer、workbench shell

  <domain>-core/               # flow/report/word/spreadsheet 等纯领域运行时
  <domain>-renderers/          # 对 SchemaRenderer 的集成层
  <domain>-profile-*/          # 可选：具体业务 profile / adapter 集合

  <designer-extension-sdk>/    # 可选：若第三方扩展包面正式稳定，再抽独立 SDK
```

每个领域设计器都应包含三类稳定入口：

1. core
2. renderers
3. profiles/adapters

还应在结构上保持四条硬约束：

1. `core` 不能依赖 React
2. `renderers` 不能直接篡改 `core` 内部状态
3. `profiles/adapters` 不能把业务 if/else 注入 `core`
4. `flux-core/flux-runtime/flux-react` 不直接绑定某个具体 designer 的对象模型

## 6. 运行时与扩展的标准执行链

为了保证扩展既可插拔又不失控，所有设计器都应遵循统一执行链。

```text
user interaction / schema action / canvas callback / hotkey
  -> command descriptor lookup
  -> profile command policy check
  -> namespaced dispatch
  -> domain bridge dispatch(command)
  -> domain core validation / normalization / transaction / history
  -> revision bump + snapshot update
  -> host scope projection refresh
  -> React selective subscription update
```

这条链的意义在于：

- 扩展点清楚
- 调试点清楚
- 性能优化点清楚
- 错误归因清楚

## 7. 统一抽象如何体现出更强扩展性

下面用具体例子说明为什么这些协议优于常见的固定平台设计。

### 7.1 例子一：同一套 workbench 壳层承载不同设计器

目标：

- Flow Designer 有 palette + canvas + inspector
- Report Designer 有 field panel + spreadsheet canvas + inspector
- Word Designer 有 datasets + document canvas + outline

如果平台设计成“内建一个固定页面编辑器”，通常会出现：

- layout 区域名称写死
- toolbar 行为写死
- inspector 只认组件属性
- 复杂控件只能硬编码接入

开放设计器平台的做法是：

- `DesignerManifest` 声明区域和能力
- `DomainBridge` 统一连接 core
- `WorkbenchShell` 只负责壳层布局，不认识 flow/report/word 语义
- 各设计器通过 host scope 和 namespaced command 接上自己的行为

为什么更好：

- 新增一个 `diagram-designer` 不需要复制整套工作台
- 平台不需要知道“字段面板”和“palette”哪一个更高级，它们只是 resource region 的不同配置
- 视觉壳、会话管理、调试器面板可以跨设计器复用

### 7.2 例子二：Inspector 不再绑定某一种对象模型

常见固定平台的问题：

- inspector 假设所有对象都是“组件实例”
- 面板字段直接绑定组件 props
- 一旦对象不是组件，而是 edge/cell/range/section，就需要特殊分支

开放设计器平台的做法：

- inspector 面板按 `target` 匹配，而不是按“组件类型”匹配
- 面板本身仍可复用 schema/form runtime
- 写回统一变成 command/action，不直接写对象

示例：

- Flow Designer 选中 edge，`InspectorProvider` 返回 edge style / condition panels
- Report Designer 选中 cell，`InspectorProvider` 返回 formatting / binding / expression panels
- Word Designer 选中 block，`InspectorProvider` 返回 block style / dataset binding panels

为什么更好：

- inspector 成为通用编辑壳，而不是页面组件编辑器
- 新对象种类只增加 provider，不需要重写 inspector 框架

### 7.3 例子三：Profile 让通用设计器适配多种业务模型

Report Designer 是最典型场景。

固定平台常见做法：

- 直接把某个后端模板模型写死进 designer core
- 字段拖拽规则、metadata 结构、导出格式都内建

这样短期快，但后续要支持另一套模板模型时，通常只能 fork。

开放设计器平台的做法：

- 通用 report designer 只认识 `selection target`、`metadata bag`、`field source`、`preview adapter`
- 具体业务通过 `ProfileManifest + CodecAdapter + FieldDropAdapter + InspectorProvider` 装配

为什么更好：

- 同一个 designer core 可以复用到多个产品线
- 领域语义变化不必侵入核心运行时
- 平台的复用边界是真实可用的，不是口头上的“理论可扩展” 

### 7.4 例子四：Flow / Report / Word 都走同一条写路径

开放设计器平台里，以下入口应统一：

- toolbar 按钮
- 快捷键
- 右键菜单
- inspector 提交
- canvas 交互回调

统一方式：

- 全部变成 namespaced command/action
- 全部进入 `dispatch(command)`

为什么更好：

- undo/redo 语义统一
- debug trace 统一
- future collaboration / replay / audit 有天然落点
- 不会出现 toolbar 直接写 store、canvas 又走 command、inspector 再单独调 API 的三套写模型

### 7.5 例子五：新增设计器，而不是新增组件

假设未来新增 `rule-designer`。

固定低代码平台的典型做法：

- 再做一个复杂组件塞进现有页面平台
- 组件内部自己维护 store、toolbar、inspector、导入导出
- 平台本身对它几乎一无所知

开放设计器平台的做法：

1. 提供 `rule-designer-core`
2. 提供 `rule-designer-renderers`
3. 声明 `DesignerManifest`
4. 暴露 `DomainBridge`
5. 注册 `rule-designer:*` commands
6. 通过 profile 挂接 resource / inspector / codec / preview

为什么更好：

- 平台级能力天然生效：会话、快捷键、调试器、trace、workbench 壳层
- 新设计器接入成本可控，而且边界清晰
- 它不是“页面里多了一个自定义大组件”，而是真正接入了开放设计器平台

### 7.6 例子六：同一个表达式和表单运行时为不同设计器服务

开放平台与固定平台的另一个区别，是它不需要为每个设计器再造一套属性编辑引擎。

示例：

- Flow Designer 的节点配置表单
- Report Designer 的单元格绑定面板
- Word Designer 的模板变量编辑面板

三者都可以：

- 使用同一个 schema/form runtime
- 通过不同 `InspectorProvider` 输出不同 panel schema
- 通过不同 command 提交到不同 domain core

为什么更好：

- 通用能力真正复用
- 复杂度集中在对象模型和命令面，而不是重复造表单系统
- bug fix 和 React 最佳实践可以一次修复，多处受益

### 7.7 例子七：导入导出不污染领域核心

固定平台经常把导入导出直接写进设计器 core，导致 core 越来越像业务应用。

开放平台做法：

- core 只负责内存文档和命令语义
- `CodecAdapter` 负责外部格式进出
- `ProfileManifest` 决定当前业务使用哪一种 codec

为什么更好：

- 同一个 Flow Designer 可以导入不同 DSL 或 JSON 变体
- 同一个 Report Designer 可以对接不同报表模板持久化格式
- Word Designer 可以保留多种导入导出路径，而不污染核心编辑命令

## 8. 性能优化设计

开放平台如果没有性能约束，扩展性最终会变成理论能力。下面这些优化不是可选项，而是与扩展设计同时成立的基础。

### 8.1 性能总原则

1. compile once, execute many
2. 结构共享优先于整树重建
3. 订阅粒度优先于全局失效
4. 领域状态与 React 渲染状态分层
5. 文档大对象更新必须增量化
6. 性能优化不能破坏 React 不可变语义

### 8.2 编译阶段优化

所有能在 compile 阶段确定的东西，都不应拖到高频运行时。

应尽量编译的对象：

- schema value tree
- action payload 表达式
- command `visibleWhen` / `enabledWhen`
- host scope projection mapping
- inspector panel 匹配条件
- resource filter / sort 规则
- designer config 索引

具体要求：

- node type / edge type / object kind 用 `Map` 索引
- panel/provider 匹配规则先标准化
- command descriptor 先注册好，不在 render 里动态拼装

### 8.3 Snapshot 结构共享策略

每个 domain snapshot 都应支持结构共享。

例如：

- 节点位置变化，只替换受影响节点、相关 selection 摘要、runtime summary
- 单个 cell metadata 变化，只替换对应 sheet/cell/meta 路径
- Word block 变更，只替换对应 block 链和必要摘要

禁止：

- 每次命令执行后深拷贝整份 document
- 每次订阅通知后重新 materialize 整个 host scope
- 为了图省事使用 `JSON.stringify` 判断变化

### 8.4 订阅粒度与失效传播

推荐分成三层订阅：

1. domain snapshot 订阅
2. host scope selector 订阅
3. renderer prop/meta selector 订阅

原则：

- canvas 不订阅 inspector 需要的数据
- inspector 不订阅整个 document
- resource panel 不订阅无关 viewport 中间态
- toolbar 只订阅 command 可用性摘要

更进一步的优化方向：

- 编译后的表达式依赖路径收集
- command 后的局部 invalidation
- revision + subrevision 模型

### 8.5 Host Scope Projection 缓存

host scope 是开放平台的核心桥接点，也是高风险性能点。

必须满足：

- 不因无关字段变化就重建整份 scope record
- 文档字段、选择字段、运行时字段尽量分块派生
- 派生时复用未变化子对象引用

推荐模式：

```text
domain snapshot
  -> derive document slice
  -> derive selection slice
  -> derive runtime slice
  -> assemble stable scope record
```

### 8.6 命令执行与历史性能

undo/redo 和 transaction 设计直接影响开放平台性能上限。

要求：

- 高频命令支持 transaction 合并
- 大对象命令优先 patch/history，而不是全量 snapshot
- domain core 决定最佳历史策略，UI 只声明 `undoStrategy`

例如：

- Flow 拖动多个节点应合并为一次逻辑历史提交
- Spreadsheet 连续 resize 应支持事务聚合
- Word Designer 批量格式改动应统一提交而不是逐字提交历史

### 8.7 大文档与虚拟化策略

开放平台必须默认支持大对象场景，而不是把它当后补优化。

应明确：

- Flow Designer 1000+ 节点
- Report Designer 大 sheet、多 metadata 面板
- Word Designer 长文档、多 block outline

推荐策略：

- canvas 视图虚拟化或视口裁剪
- resource panel 列表虚拟化
- outline / inspector 的延迟渲染
- 大文档导出、校验、预览允许后台异步执行

### 8.8 React 安全的响应式增强

性能增强允许做的事：

- 在 runtime 里记录表达式依赖路径
- 用 revision 和 path-level invalidation 缩小重新求值范围
- 缓存 panel descriptors、projection slices、selector results

性能增强不允许做的事：

- 让 React 组件直接消费可变文档对象
- 让组件依赖命令执行后的原地修改
- 在 render 里触发隐式 recompute side effect

### 8.9 监控与诊断指标

要让性能优化可验证，而不是靠感觉。

建议平台统一暴露这些指标：

- command dispatch 次数
- snapshot revision 增长次数
- host scope projection 重建次数
- inspector panel 重新匹配次数
- 大对象更新的影响范围
- React render 次数与热点节点

这使得“扩展后是否拖慢平台”可以被量化追踪。

## 9. React 最佳实践约束

开放扩展不允许以牺牲 React 边界为代价。

### 9.1 不可变语义必须保持

更细粒度响应式更新不会改变 React 的不变对象假定。

必须满足：

- React render 中看到的 `props`、resolved meta、scope selector 结果仍然按不可变语义对待
- 当语义未变时，可以复用旧引用
- 当语义变化时，必须产生新引用
- 不允许把共享可变对象直接塞进 React props 再原地修改

因此，更优的响应式设计应当是：

- 在 React 外部做依赖追踪、脏标记、选择性订阅
- 在进入 React 前输出不可变 snapshot 或 selector result

而不是：

- 用可变对象直接驱动 React，希望组件“自己感知变化”

### 9.2 订阅粒度优化发生在 React 之外

更细粒度更新的目标是：

- 让真正依赖某条路径的节点重新求值
- 减少无关节点的求值和渲染

它不意味着：

- 破坏 React 的单向数据流
- 允许 render 阶段写 store
- 让组件依赖不可追踪的隐藏可变状态

推荐模式：

- domain core / runtime 用外部 store 或 bridge 维护状态
- React 通过 `useSyncExternalStore` 风格订阅只读 snapshot
- selector 结果保持结构共享

### 9.3 Render 与命令分离

React 侧必须保持：

- render 只读
- effect 负责注册、订阅、桥接清理
- 用户交互事件里调用 `dispatch`

不允许：

- render 中直接 `dispatch(command)`
- render 中更新 host scope 或 domain store

### 9.4 对大对象使用结构共享，而不是整树重建

例如：

- Flow Designer 更新单节点位置，不应重建整份 graph 文档中的所有节点对象
- Report Designer 修改单个 cell metadata，不应重建整份 workbook 的所有 sheet/cell
- Word Designer 修改一个 block，不应替换整篇文档所有段落对象

这既符合 React 最佳实践，也符合性能要求。

### 9.5 React 最佳实践下的 host scope 规则

host scope 虽然是桥接层，但对 React 仍然应表现为普通只读输入。

因此：

- host scope 更新来自 effect/subscription，不来自 render 内联写入
- 传给 schema 片段的 scope 对象应稳定复用
- 只有派生数据语义变化时才更新相关引用

### 9.6 React 最佳实践下的 provider/adapter 规则

provider 和 adapter 的实现应遵守：

- 同步路径纯函数优先
- 异步加载通过 effect 或显式 action 触发
- 不在 render 中隐式拉取远端资源
- 若 provider 需要缓存，应缓存于 React 外部或稳定 hook 中，而不是每次 render 新建

## 10. 响应式更新的推荐边界

Flux 后续若增强响应式更新，推荐按下面边界做，而不是引入与 React 对立的可变模型。

### 10.1 可以增强的内容

- 编译后的表达式依赖收集
- selector/path 粒度订阅
- 节点级脏标记
- 领域 snapshot 的局部派生缓存
- command 执行后的增量 invalidation

### 10.2 不应改变的内容

- React props 仍按不可变语义消费
- `SchemaRenderer` 和 renderer component 仍是显式边界
- host scope 仍是只读投影，不暴露可变内部对象
- render 阶段保持纯函数约束

### 10.3 推荐的依赖追踪模型

推荐把响应式增强限定在“可解释、可调试”的依赖模型：

1. 编译时尽可能收集静态依赖
2. 运行时补充动态路径依赖
3. command 完成后按路径或对象种类做 invalidation
4. React 订阅层只消费 invalidation 结果，而不理解依赖图内部细节

这样可以获得更高性能，而不把整个平台变成难以调试的隐式响应式系统。

## 11. 错误模型与反模式

扩展设计和性能设计都必须明确哪些做法是错误方向。

### 11.1 错误模型

至少区分：

1. manifest/config 错误
2. migration 错误
3. provider/adapter 装配错误
4. command 执行错误
5. projection 错误
6. performance degradation 警告

### 11.2 反模式

以下模式在开放设计器平台中应视为反模式：

- 把一个新设计器当作“平台里的一个超级组件”直接塞进去
- 让 inspector 直接写对象而不是发 command
- 让 profile 修改 core 内部对象模型
- 把业务 DSL 直接嵌进通用 runtime
- 用全局可变单例承载所有设计器状态
- 每次更新后重建整份 host scope
- 用深拷贝和整树比较维持正确性
- 用 render 阶段副作用维持同步

## 12. 标准落地方式

后续新增或重构设计器时，至少应满足以下标准结构。

### 12.1 领域 core

- 定义 document model
- 定义 snapshot
- 定义 command 与 result
- 定义 `dispatch/getSnapshot/subscribe`
- 定义 migration 边界

### 12.2 renderer 集成层

- 注册 page renderer
- 创建 host scope
- 注册 namespaced command provider
- 将 toolbar/resource/canvas/inspector/dialogs 片段接到统一工作台壳层

### 12.3 profile / adapter 层

- 定义 inspector providers
- 定义 resource providers
- 定义 codec / preview / expression / reference adapters

### 12.4 最小验收清单

一个设计器若要算真正接入开放平台，至少应满足：

1. 有 `DesignerManifest`
2. 有 `DomainBridge`
3. 有 host scope projection
4. 有 namespaced command 面
5. inspector 写回统一走 command
6. 至少一种 profile/adapters 装配方式
7. snapshot 支持 revision 和结构共享
8. React 集成通过显式订阅，不依赖可变对象
9. 大对象更新不依赖整树重建
10. 调试器能识别其 designer kind、revision 和 command trace

## 13. 建议的实现优先级

为了避免重新走向“先堆功能后补协议”，建议优先级如下：

1. 固化 `DesignerManifest`、`DomainBridge`、`SnapshotContract`
2. 固化 host scope projection 与 command descriptor 规则
3. 固化 `InspectorProvider` / `ResourceProvider` / `CodecAdapter` / `PreviewAdapter`
4. 固化 `ProfileManifest` 与 migration 规则
5. 补齐 revision、结构共享、transaction、path-level invalidation 的实现约束
6. 再增加更多 designer 和组件能力

原因很简单：

- 协议先稳定，新增能力才是增量成本
- 协议不稳定，功能越多，返工越重

## 14. 最终判断

Flux 要成为开放的设计器平台，必须把扩展能力的重心从“新增 renderer”提升到“新增设计器协议、profile、adapter、命令面、host scope 规则”。

这套设计比一般低代码平台更强的原因，不是概念更多，而是它能稳定满足这些条件：

- 同一个平台承载多种异构设计器
- 同一个 inspector/form/runtime 复用到不同对象模型
- 同一个 workbench/session/debugger 壳层复用到不同领域
- 同一个命令链承载 toolbar、快捷键、inspector、canvas 回调
- 同一个通用设计器可以通过 profile 适配不同业务模型

只要这些协议稳定，后续新增组件、设计器、适配器、业务 profile 都是增量工作，而不是平台级返工。

同时，性能优化不能作为后补专题，它本身就是开放平台设计的一部分。

如果没有：

- 结构共享
- revision 驱动
- 选择性订阅
- host scope 派生缓存
- transaction/history 优化
- React 安全的响应式边界

那么平台的可扩展性最终会被运行时成本拖垮。

因此，Flux 的正确方向不是“功能尽快铺满”，而是：

- 先把开放设计器协议和性能边界一起稳定下来
- 再让更多设计器、profile、组件沿这套边界自然增长

## Related Documents

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/performance-design-requirements.md`
