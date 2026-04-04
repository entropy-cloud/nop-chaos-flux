# Flux DSL VM 可扩展性设计

## 1. 目的

本文定义 Flux 的正确可扩展性边界。

核心判断如下：

- Flux 不是扩展性的主要发生地
- Flux 不是设计器平台本体
- Flux 是最终执行 schema DSL 的运行时环境
- 大部分结构级扩展应在后端服务加载 JSON 时完成
- 运行时看到的应当是已经装配完成的最终 DSL 模型

因此，Flux 的定位更接近：

- 一个 DSL 虚拟机
- 一个声明式组件运行时
- 一个在 React 上执行最终模型的宿主

而不是：

- 一个通过大量 runtime interface/provider/adapter 来承载所有变化的平台

## 2. 核心设计判断

### 2.1 扩展性优先发生在加载期，而不是运行期

Flux 需要消费的是“最终模型”，不是“基础模型 + 各种运行时补丁历史”。

推荐分层：

1. DSL 定义层
2. Loader 装配层
3. Flux 运行时执行层

```text
base schema / delta schema / generated schema / feature switches / policy trimming
  -> loader merge / compile / normalize / validate
  -> final flux schema
  -> flux runtime execute
```

因此，以下能力原则上应前移到加载期：

- 继承
- 覆盖
- 删除
- feature 开关
- 模块合并
- 元编程生成
- 默认值补全
- 权限裁剪
- 领域 profile 展开
- 结构规范化

### 2.2 Flux 运行时只负责执行，不负责发明结构

Flux 运行时的职责应被严格收敛为：

- 编译并执行最终 schema
- 建立 scope、action、component handle 三套执行树
- 调用宿主环境能力
- 响应用户交互
- 管理局部运行时状态
- 渲染特殊 type 对应的复杂控件 shell

Flux 不应承担：

- 设计器元模型的主扩展机制
- 领域结构演化的主扩展机制
- 大量业务 profile 的主装配机制
- 通过 runtime interface 解决所有变化

### 2.3 设计器本质上仍然是组件

Flow Designer、Report Designer、Word Designer 从运行时视角看，不应被视为另一类平台实体。

它们本质上只是：

- 一种特殊 `type` 对应的复杂控件
- 该控件可以拥有自己的 shell
- 该控件可以消耗特定数据模型和行为模型
- 这些模型通过 schema 注入，而不是通过单独的平台协议注入

因此：

- 设计器不是架构一级概念
- 设计器不需要一套独立于组件系统之外的扩展协议
- 设计器与普通复杂组件的区别仅在于其 data/behavior 模型更复杂，shell 更特殊

### 2.4 最终模型原则

Flux 运行时应坚持一个硬原则：

- 浏览器端拿到的 schema 必须被视为最终模型

这里的“最终模型”指：

- 结构已经确定
- 默认值已经展开
- 静态 feature 裁剪已经完成
- 继承/覆盖/删除已经完成
- 复杂控件需要的静态 model/behavior/shell 配置已经准备好

运行时允许继续发生的，只能是：

- 动态表达式求值
- 动态 action 解析
- 用户驱动的状态变化
- 宿主环境驱动的异步行为

不允许继续发生的，是结构层的主装配过程。

## 3. 统一抽象：三棵树分离

Flux 的运行时抽象应继续坚持三棵树分离。

1. ComponentTree
2. StateTree
3. ActionTree

这三棵树在运行时正交存在，但共享统一的链式词法查找直觉。

### 3.1 ComponentTree

负责：

- schema 结构
- renderer type
- region/slot 关系
- 特殊 shell 组织

### 3.2 StateTree

负责：

- 页面数据
- 表单数据
- 行作用域数据
- 组件局部状态暴露
- 特殊控件的数据模型投影

### 3.3 ActionTree

负责：

- 动作命名空间
- 行为模型
- 事件触发的能力解析
- 导入模块后的行为注入

### 3.4 三棵树分离的意义

设计器或复杂控件的“可扩展性”不应被误解为必须有一个集中式 designer runtime。

在三棵树分离下：

- 组件结构可以来自 schema 注入
- 数据模型可以沿 state tree 注入
- 行为模型可以沿 action tree 注入

三者不必在运行时被强制绑定成一个单一对象。

这正是复杂控件可扩展的根本来源。

## 4. Flux 的正确扩展边界

### 4.0 加载期与运行期边界表

为避免职责漂移，推荐用下表判断一个能力该放在哪一层：

| 能力 | Loader/装配期 | Flux 运行期 |
| --- | --- | --- |
| `x:extends` / 结构继承 | 必须 | 不应出现 |
| schema 覆盖/删除 | 必须 | 不应出现 |
| feature flag 静态裁剪 | 必须 | 不应出现 |
| 权限静态裁剪 | 优先 | 仅保留真正动态权限判断 |
| 默认值展开 | 必须 | 不应依赖 renderer 二次补齐 |
| 设计器 shell 结构生成 | 优先 | 只负责渲染 |
| 表达式执行 | 不负责 | 必须 |
| action 调度 | 不负责 | 必须 |
| form/page/dialog 状态 | 不负责 | 必须 |
| 动态 import 的能力接入 | 不负责 | 可以 |
| 用户交互反馈 | 不负责 | 必须 |

判断规则：

- 如果某项变化只依赖静态模型与装配上下文，就应前移到 Loader
- 如果某项变化依赖用户当前交互、环境状态或异步结果，才留在 Flux

### 4.1 应在 Loader 层解决的扩展

只要某种变化不依赖用户当前交互上下文，就优先在 Loader 层解决。

包括：

- schema 继承与覆盖
- region 注入
- 属性面板片段注入
- toolbar / dialogs / side panels 组装
- feature flag 裁剪
- 按角色/租户进行结构裁剪
- 基础 schema 与行业 schema 合并
- 组件默认参数展开
- 设计器专用 schema 的生成
- 行为模型的静态声明展开

### 4.2 应在 Flux Runtime 层解决的扩展

只有真正依赖运行期上下文的能力才留在 Flux。

包括：

- 表达式求值
- 事件到 action 的调度
- 表单交互状态
- 页面局部状态
- 对话框/异步请求等副作用
- 组件句柄调用
- 特殊控件 shell 内部的交互生命周期

### 4.3 运行时扩展是辅助边界，不是主扩展机制

Flux 可以保留这些运行时扩展面：

- `xui:imports`
- namespaced action
- component handle
- renderer registry
- env host hooks

但这些能力的地位应明确为：

- 用于执行最终模型
- 用于边界接驳
- 用于运行时能力引入

而不是：

- 作为整个可扩展体系的核心

### 4.4 运行时允许的最小扩展面

本文立场下，运行时只需要稳定下面这些最小扩展面：

1. renderer type 注册
2. namespaced action 解析
3. `xui:imports` 动态能力引入
4. component handle 暴露
5. env 宿主能力桥接

除此之外，不再引入新的平台级抽象层。

## 5. 设计器与复杂控件的统一模型

设计器不单独定义一套特殊平台协议，而是落在统一的组件模型上。

### 5.1 最小统一结论

一个设计器类控件只需要额外具备三件事：

1. 特殊 `type`
2. 特殊 shell
3. 特定数据模型与行为模型的抽象封装

除此之外，它和其他复杂控件没有本质差别。

### 5.2 设计器控件的运行时构成

从 Flux 看，一个设计器控件由这些输入构成：

- `schema` 中声明的组件结构与 slots/regions
- 注入的数据模型入口
- 注入的行为模型入口
- 特殊 shell renderer
- 宿主提供的 env 能力

输出仍然是：

- React 渲染结果
- 运行时交互副作用
- 通过 action/component handle 暴露出的局部能力

### 5.3 为什么不单独设计“设计器协议”

因为一旦给设计器单独设计协议，就会自然走向：

- designer-specific bridge
- designer-specific manifest
- designer-specific provider
- designer-specific lifecycle

最后设计器会脱离统一组件系统，变成平台里的另一个平台。

这与 Flux 作为 DSL 运行时的角色不一致。

### 5.4 复杂控件不是“大对象统一注入”

复杂控件的输入虽然可以被文档写成 `model` 和 `behavior`，但运行时不应把它们理解成必须先组装成一个统一超级对象。

更准确的原则是：

- `model` 描述的是该控件关心的数据抽象
- `behavior` 描述的是该控件关心的能力抽象
- 二者在运行时可以沿不同树注入
- shell 只负责组合这些输入，不负责重新定义平台协议

这点对设计器尤其重要。

例如：

- Flow Designer 的图文档可从状态树读取
- `designer:*` 一类行为可从 action tree 解析
- 节点/面板结构仍然来自 component tree

三者不必先合成为一个 `designerRuntime` 对象再交给 renderer。

## 6. 需要固定下来的运行时接口与做法

下面不是“可选建议”，而是本文主张下应固定的做法。

### 6.1 顶层原则

运行时只认三类输入：

1. 结构输入
2. 数据输入
3. 行为输入

运行时不要求它们在装配前必须被聚合成一个统一 designer object。

### 6.2 结构输入接口

结构输入仍然是 schema 节点树。

建议保持：

```ts
interface SchemaRendererProps {
  schema: SchemaInput;
  data?: Record<string, any>;
  env: RendererEnv;
  formulaCompiler: FormulaCompiler;
  registry?: RendererRegistry;
  plugins?: RendererPlugin[];
  pageStore?: PageStoreApi;
  parentScope?: ScopeRef;
  onComponentRegistryChange?: (componentRegistry: ComponentHandleRegistry | null) => void;
  onActionScopeChange?: (actionScope: ActionScope | null) => void;
  onActionError?: (error: unknown, ctx: ActionContext) => void;
}
```

约束：

- `schema` 必须视为最终装配产物
- Flux 不负责在运行时再做大规模结构级装配
- 小范围的 ad hoc fragment 渲染是执行能力，不是结构扩展机制

### 6.3 数据模型注入接口

设计器或复杂控件的数据模型，统一通过 scope/state tree 注入。

建议固定两类路径：

1. 初始化注入
2. 局部子作用域注入

运行时接口继续使用现有的：

```ts
interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  store?: ScopeStore;
  value: Record<string, any>;
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  read(): Record<string, any>;
  update(path: string, value: unknown): void;
}
```

固定做法：

- 复杂控件自己的数据模型可以映射到当前 scope 或专用子 scope
- 不要求 runtime 看见“designer model”这一类特殊对象
- 允许数据模型在不同 region/子树中以不同投影暴露

推荐规则：

- 若复杂控件需要稳定宿主数据视图，应通过 child scope 投影实现
- 若复杂控件需要局部高频状态，应保持在控件内部状态或其局部 store 中
- 只把确实需要被 schema 表达式消费的数据投影进 scope

### 6.4 行为模型注入接口

行为模型统一通过 action tree 注入。

继续固定现有两层机制：

1. built-in actions
2. namespaced actions

以及补充一条明确原则：

- 行为模型是被注入和解析的，不是被组件实例硬编码持有的

保持：

```ts
type ActionResolutionOrder = [
  'built-in actions',
  'component:<method> through ComponentHandleRegistry',
  'namespaced actions through ActionScope'
];
```

固定做法：

- 复杂控件若要暴露操作能力，优先通过 `component:<method>` 或 namespaced action
- 行为模型可以来自 loader 装配后的 schema，也可以来自 `xui:imports`
- 运行时只负责解析和执行，不负责生成行为模型

推荐规则：

- 页面级/宿主级行为优先走 namespaced action
- 实例级局部能力优先走 `component:<method>`
- 行为能力是否存在，不应靠组件 props 中塞函数来表达

### 6.5 特殊 shell 控件接口

设计器之所以特殊，只是因为它通常需要特殊 shell。

因此需要明确一种稳定模式：

- 一个特殊 `type`
- 一个对应 renderer
- renderer 内部可以用特殊 shell 组织多个 region

保持现有 renderer contract：

```ts
interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  id: string;
  path: string;
  schema: S;
  node: CompiledSchemaNode<S>;
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;
  regions: Readonly<Record<string, RenderRegionHandle>>;
  events: Readonly<Record<string, RendererEventHandler | undefined>>;
  helpers: RendererHelpers;
}
```

固定做法：

- shell 不应越过统一 schema runtime 自建平行渲染协议
- shell 内部的 toolbar/body/inspector 等内容优先通过 region 组合
- shell 可以建立局部 action scope 或 component registry 边界
- shell 可以为复杂控件封装专用上下文，但这只是组件内部实现，不是平台级新协议

必须再补三条硬约束：

1. shell 不拥有结构装配权，只拥有结构组织权
2. shell 不直接吞掉 schema 片段，优先通过 region/render handle 消费
3. shell 不把内部实现细节泄露成新的公共运行时协议

### 6.6 复杂控件的推荐 schema 组织方式

复杂控件不需要平台级特殊协议，只需要约定其 schema shape。

建议统一遵循：

```ts
interface ComplexControlSchema extends BaseSchema {
  type: string;
  model?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
  shell?: Record<string, unknown>;
  body?: SchemaInput;
  toolbar?: SchemaInput;
  inspector?: SchemaInput;
  dialogs?: SchemaInput;
}
```

说明：

- `model` 只表示该控件需要的静态/初始数据模型描述
- `behavior` 只表示该控件需要的静态/初始行为模型描述
- `shell` 只表示壳层布局或专用外观配置
- `body/toolbar/inspector/dialogs` 仍然是普通 schema region

这些字段最终都应由 loader 在进入 Flux 前整理好，不要求 Flux 自己完成高度动态的二次装配。

推荐再补一个更贴近三棵树映射的理解：

| 字段 | 主要归属 | 说明 |
| --- | --- | --- |
| `type` | ComponentTree | 决定 renderer |
| `body/toolbar/inspector/dialogs` | ComponentTree | 决定结构片段 |
| `model` | StateTree | 描述静态/初始数据模型 |
| `behavior` | ActionTree | 描述静态/初始行为模型 |
| `shell` | ComponentTree | 描述特殊壳层组织方式 |

这里的“归属”是主归属，不代表运行时实现上必须形成单一对象。

### 6.6.1 推荐的复杂控件装配结果形态

Loader 输出到 Flux 时，复杂控件节点最好接近下面这种形态：

```ts
interface AssembledComplexControlSchema extends BaseSchema {
  type: string;
  model?: Record<string, unknown>;
  behavior?: Record<string, unknown>;
  shell?: Record<string, unknown>;
  toolbar?: SchemaInput;
  body?: SchemaInput;
  inspector?: SchemaInput;
  dialogs?: SchemaInput;
  className?: string;
  visible?: unknown;
  disabled?: unknown;
}
```

重点不是字段名本身，而是：

- Flux 接收到的已经是装配完成后的扁平节点
- renderer 不需要再理解“它来自哪个 profile、哪层继承、哪个租户补丁”

### 6.7 Loader 输出约束

为了让 Flux 真正成为 DSL VM，后端 Loader 输出必须满足以下约束：

1. 输出的是最终 schema
2. 已完成继承/覆盖/删除/特性裁剪
3. 已完成组件默认值展开
4. 已完成复杂控件的静态 model/behavior/shell 装配
5. 不把装配历史泄露到运行时

可以允许保留的只有：

- 调试字段
- source map 类定位信息
- 版本/来源摘要

不应保留的包括：

- 需要在浏览器端再执行的结构合并脚本
- 大量未展开的 profile 规则
- 需要 renderer 再次理解的继承链

### 6.8 Loader 最小输出合同

为了保证前后端职责清晰，推荐把 Loader 输出收敛到下面这个最小合同。

```ts
interface FluxAssembledResource<TSchema = SchemaInput> {
  schema: TSchema;
  meta?: {
    resourceId?: string;
    resourceVersion?: string;
    sourceMap?: unknown;
    diagnostics?: ReadonlyArray<unknown>;
  };
}
```

约束：

- `schema` 是 Flux 唯一需要真正执行的主体
- `meta` 只用于调试、追踪、诊断
- `meta` 不得要求 renderer/runtime 改变结构执行逻辑

### 6.9 Loader 失败与运行时失败的边界

应明确区分两类失败：

1. Loader/装配失败
2. Flux 运行时失败

Loader/装配失败示例：

- 继承链冲突
- profile 展开失败
- feature 组合非法
- schema 结构未规范化完成

运行时失败示例：

- 表达式执行失败
- action 执行失败
- import loader 失败
- renderer 内部交互错误

这条边界很重要，因为它决定问题该在哪里修，而不是把所有失败都丢给浏览器端 runtime。

## 7. 复杂控件的具体落地模式

### 7.1 普通复杂控件

例如图表、表格、代码编辑器。

模式：

- `type` 对应 renderer
- `props` 读最终 schema 注入的静态模型
- 运行时通过 scope/action/env 完成交互

### 7.2 设计器类复杂控件

例如 Flow Designer、Report Designer、Word Designer。

模式仍然相同，只是：

- `model` 更复杂
- `behavior` 更复杂
- shell 更复杂
- region 组合更多

但不引入平台级新实体。

### 7.3 为什么这种做法更一致

因为 Flux 运行时始终只处理同一种事：

- 执行 schema
- 维护三棵树
- 调用 renderer

而不是根据是否“设计器”切换到另一套体系。

### 7.4 特殊 shell 的标准模式

建议把特殊 shell 固定成下面的通用模式：

```text
special type renderer
  -> read assembled model/behavior/shell props
  -> create local boundaries if needed (action scope / component registry)
  -> render shell layout
  -> render declared regions through handles
  -> expose local capabilities through action/component handle
```

这比另起一套 designer runtime 协议更稳定，也更符合现有 renderer 体系。

## 8. React 最佳实践下的运行时约束

即使 Flux 被定义为 DSL 虚拟机，也必须遵守 React 最佳实践。

### 8.1 运行时增强不能破坏不可变语义

Flux 可以在运行时做：

- compiled value 缓存
- 选择性订阅
- 结构共享
- 局部 scope 更新

但不能做：

- 向 React 暴露共享可变对象然后原地修改
- 在 render 阶段触发写入
- 让复杂控件依赖不可追踪的隐式可变状态

### 8.2 三棵树分离不等于三棵树耦合

在 React 集成里需要保持：

- data lookup 通过 `ScopeRef` / selector
- behavior lookup 通过 `ActionScope`
- instance capability lookup 通过 `ComponentHandleRegistry`

三者不要被“方便使用”而重新揉成一个大上下文对象。

### 8.3 特殊 shell 仍然只是 renderer

设计器 shell 再复杂，也应遵守普通 renderer 的基本规则：

- render 只读
- effect 管理注册和订阅
- 交互事件触发 dispatch 或组件句柄调用
- child fragments 通过 region 或 helper 渲染

### 8.4 复杂控件内部状态的 React 约束

复杂控件可以有自己的局部状态或局部 store，但必须满足：

- 状态边界清晰
- 共享给 React 的结果保持不可变语义
- 不把内部可变对象直接暴露到 schema 运行时
- 不因局部 store 更新而重建无关 scope/action 边界

## 9. 性能优化设计

在本文立场下，性能优化要围绕“最终模型执行器”展开，而不是围绕“运行时适配平台”展开。

### 9.1 最重要的性能原则

1. 大部分结构复杂性在加载期消化
2. 运行时只执行最终模型
3. 静态部分零成本
4. 动态部分保持引用复用
5. 订阅粒度尽量窄

### 9.2 编译期和加载期优先

应优先前移的计算：

- schema 结构规范化
- region 提取
- 复杂控件 slots 组织
- 静态 model/behavior/shell 展开
- feature 裁剪
- 权限裁剪

如果这些不前移，浏览器端 runtime 会被迫承担不必要复杂度。

### 9.3 运行时编译缓存

Flux 运行时应继续坚持：

- whole value-tree compilation
- static fast path
- dynamic identity reuse

即：

- 无表达式时返回静态值
- 有表达式时只重算动态部分
- 语义未变时复用旧引用

### 9.4 三棵树的窄订阅

性能优化应继续围绕三棵树分离展开：

- 读数据，只订阅必要 scope
- 读行为，不因数据变化重建 action lookup
- 读组件句柄，不因 scope 变化无关重渲染

这比“把所有能力合成一个 designer runtime 对象再统一订阅”更稳定。

### 9.5 特殊 shell 的性能约束

复杂 shell 容易成为性能放大器，因此应固定：

- shell 本身只组织 region 和边界，不承担过多数据推导
- 复杂推导放在 compile 阶段、loader 阶段或专门 hook 中
- 不因 shell 视图变化重建整份 model/behavior 输入

### 9.6 大对象场景

对于 Flow/Report/Word 这类复杂控件：

- 大模型应尽量在 loader 层预规范化
- runtime 只保留交互所需的局部状态
- 渲染层采用局部订阅、局部 scope、必要时虚拟化

### 9.7 复杂控件输入的稳定性要求

复杂控件常常会接收较大的 `model` 或 `behavior` 结构，因此应强制：

- Loader 生成稳定字段布局
- 运行时在语义未变时复用引用
- shell renderer 不自行深拷贝输入对象
- region render 时仅传递必要 override

### 9.8 为什么这种性能模型优于平台式运行时扩展

因为它把高复杂度工作分散到正确阶段：

- 结构复杂度在 Loader 解决
- 执行复杂度在 Flux runtime 控制
- 渲染复杂度在 React selector 和局部 shell 控制

这样不会出现“浏览器端同时承担结构装配、平台扩展、复杂控件运行、React 渲染”四件事叠在一起的情况。

## 10. 反模式

以下做法在本文立场下是错误方向：

- 为设计器单独发明一套平台级协议体系
- 让运行时承担 profile/继承/结构拼装主责任
- 用 provider/adapter/manifest registry 承载大部分结构扩展
- 把设计器从组件系统中抽离成另一套对象模型
- 把数据模型、行为模型、组件结构强行揉成一个集中式 designer runtime object
- 在浏览器端保留大量未装配完成的 schema 变体

还包括：

- shell renderer 自己重新发明 region 协议
- 用 props 直接传递大量行为函数替代 action tree
- 用单一巨型 context 同时承载结构、数据、行为三类能力

## 11. 最终结论

Flux 的正确方向不是“设计一个更强的运行时扩展平台”，而是：

- 接受 Flux 只是最终执行环境
- 接受可扩展性的主战场在 Loader 层和 DSL 层
- 接受设计器只是特殊类型的复杂组件
- 在运行时坚持三棵树分离和统一 renderer contract

最终应形成这样的结构分工：

1. 后端 Loader 负责把世界装配成最终 DSL
2. Flux 负责把最终 DSL 正确、高效地运行起来
3. React 负责承载最终渲染结果和交互边界

这种设计的好处是：

- 结构复杂性不会无限侵入前端运行时
- 设计器不需要成为平台里的特殊公民
- 复杂控件与普通组件共享同一个执行框架
- Flux 能保持为稳定、可预测、边界清晰的 DSL 虚拟机

## Related Documents

- `docs/articles/flux-design-introduction.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
