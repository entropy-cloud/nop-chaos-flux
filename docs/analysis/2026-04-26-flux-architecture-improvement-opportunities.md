# Flux 架构可继续改进的方向

> 分析日期: 2026-04-26  
> 性质: decision-oriented analysis，非现行规范基线  
> 相关文档: `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/architecture/capability-projection-manifest.md`, `docs/architecture/complex-control-host-protocol.md`

---

## 1. 结论

当前 `nop-chaos-flux` 的总体方向是正确的，不需要推翻式重构。

真正值得继续推进的，不是把 Flux 变成另一套 authoring 平台，也不是让前端复制 `nop-entropy` 的 Loader / Delta / 可逆计算能力，而是围绕下面四条主线，并附两条治理项，继续补齐闭环：

1. 固定 `Final Execution Schema` 的输入不变量
2. 强化基于稳定 source-location 元数据的 diagnostics 闭环
3. 在不破坏现有 primitive closure 的前提下收紧依赖追踪和订阅粒度
4. 把 `RendererDefinition.hostContract -> resolveManifest(...)` 的直接消费路径固定成统一约定

治理项：

5. 继续压缩 host/workbench helper 的平台化漂移
6. 把 React 19 的使用约束写得更具体

这些改进都应遵守已有主张：

- Flux 是最终 DSL 运行时，不是主扩展平台
- 结构装配主战场在 Loader 层；Flux 浏览器执行核心不应重新打开 loader 风格语义
- 设计器和复杂控件仍然是跨越同一 Flux 执行边界的特殊 schema/host family
- 读通过 `Host Projection`，写通过 `Capability`

---

## 2. 不应改变的基线

在讨论改进之前，必须先固定哪些东西不应被“优化”掉。

### 2.1 Flux 仍然是 DSL VM

`docs/architecture/flux-dsl-vm-extensibility.md` 已经明确：Flux 消费的是 Loader 装配完成后的最终模型，而不是“基础模型 + 运行时补丁历史”。

因此不应做以下事情：

- 在前端重做 `x:extends`、Delta、feature trimming、profile 装配
- 让 renderer/runtime 理解复杂继承链和装配历史
- 把 Flux 扩成 authoring / reversible-computation 平台

### 2.2 现有 primitive closure 不应被打破

`docs/architecture/frontend-programming-model.md` 已经给出了七个 primitive：

- `Template`
- `ScopeRef`
- `Value`
- `Resource`
- `Reaction`
- `Capability`
- `Host Projection`

后续改进应优先作为 derived runtime system 或 compiler/tooling layer 落地，而不是继续增加新的 core primitive。

### 2.3 host boundary 的基本方向已经是对的

当前已经形成：

- runtime bridge / host scope / namespaced action 接线
- `RendererDefinition.hostContract`
- `HostCapabilityProjectionManifest`
- 编译期 host action validation

这条线不需要推翻。需要做的是把它补齐成真正的跨 Loader / compiler / runtime / tooling 闭环。

---

## 3. 改进方向一：收紧 `Final Execution Schema` 边界与输入不变量

> **Status**: The input invariants proposed in this section have been codified in the owning architecture doc `docs/architecture/frontend-programming-model.md` under "Input Invariants". This section is retained as analysis context; the normative wording lives in the owner doc.

### 3.1 当前问题

架构文档已经反复强调"最终模型原则"，但这里真正需要固定的，不是再给 Flux 发明一个比 `schema` 更高一层的执行对象，而是明确：

- Flux 执行的主体仍然是 crossing 了执行边界之后的 `schema`
- 这个 `schema` 必须已经处于 `Final Execution Schema` 语义阶段
- 哪些 authoring / loader 语义绝不能漏到浏览器端 runtime

换句话说，这里的改进重点是输入不变量，而不是输入对象膨胀。

### 3.2 为什么值得做

如果这些不变量不够明确，前端很容易被迫处理以下灰区：

- 半装配 schema
- 运行时再理解 host version / profile / inheritance
- runtime error 无法准确回溯到 `XView` / `XPage` / Delta 来源
- Loader 失败和 runtime 失败边界不清

这会直接削弱 `flux-dsl-vm-extensibility.md` 中“结构复杂性前移”的核心主张。

### 3.3 建议固定的内容

建议固定的不是新的执行 envelope，而是下面这些 `Final Execution Schema` 不变量：

1. 交给 Flux 的唯一执行主体仍然是 crossing 了执行边界之后的 `schema`
2. `schema` 已经完成继承 / 覆盖 / 删除 / 静态裁剪 / 默认值展开 / 结构规范化
3. `schema` 不再携带需要浏览器端继续执行的 authoring merge 语义
4. 与执行无关但对定位有帮助的元数据可以额外存在，例如 `xui:version`、diagnostics，以及稳定 source-location 元数据
5. 这些元数据不能要求 renderer/runtime 改变结构执行逻辑

这里的重点不是额外 envelope，而是：`schema` 仍然是 DSL，也是唯一执行主体。

### 3.4 设计理由

- 这和 `nop-entropy` 的职责边界一致: 后端负责模型生产线，前端负责执行
- 这让 Flux 可以继续保持为“最终模型执行器”，而不是“半装配模型解释器”
- 这有利于未来做独立 schema validator、loader smoke test、远程资源缓存和差异比较

### 3.5 不建议的替代方案

不建议让浏览器端继续拿到：

- 未展开的继承规则
- 需要 renderer 理解的 profile 选择逻辑
- 结构级 patch script
- 运行时再执行的 authoring merge plan

这些能力属于 Loader 层，不属于 React 19 runtime。

补充说明：

- 这里不主张把 DSL 从 `schema` 改成别的主执行对象
- 也不主张在 Flux 前再发明一套厚 transport protocol
- 真正要固定的是 `schema` 已经满足哪些前置条件

---

## 4. 改进方向二：建立 authoring-to-runtime diagnostics 回溯链

### 4.1 当前问题

Flux 已经很强调编译期结构校验，但从整个平台视角看，错误定位链路仍然可以更完整。

需要进一步打通：

- authoring source
- compiled template / node path
- runtime mounted instance
- debugger / diagnostics UI

### 4.2 为什么值得做

对 Nop 体系来说，前端不是孤立 runtime，而是 `XMeta -> XView -> XPage -> Flux execution` 生产线的一环。

如果缺少稳定定位信息，系统会出现两个高成本问题：

- 运行时错误只能定位到“某个 schema 节点”，无法回到 `XView` / Delta 来源
- 设计器或调试器能看到结果，但很难解释“为什么这里是这样装配出来的”

### 4.3 建议的改进方向

优先补齐这些能力：

1. 约定 Loader/Compiler 为可诊断节点保留稳定来源定位信息
2. expression / action / validation 错误优先回报对应节点的来源定位信息
3. host contract validation 结果附带发布 owner、capability publication attribution 和相关节点的来源定位信息
4. debugger 中优先展示 `authoring location -> compiled path -> runtime path` 这条最小定位链

最小化实现上，一个候选方案是为节点保留可选 `xui:location` 字符串；如果未来证明不够，再考虑更复杂的资源级定位结构。

### 4.4 设计理由

- 这不会扩大 runtime primitive surface
- 它符合“编写-执行分离”原则: authoring 信息进入编译与诊断通道，而不是侵入执行语义
- 它可以让 `nop-entropy` 和 Flux 的协同更像一条完整生产线，而不是两个相互独立的系统
- 在最小方案下，它可以直接复用 schema-native 的扩展字段，而不必立刻设计额外全局结构

---

## 5. 改进方向三：收紧依赖追踪与订阅粒度，而不是改写整个响应式模型

### 5.1 当前问题

现有响应式基线是对的：

- 运行时 store 自洽
- React 只是订阅宿主
- 读写分离
- `Value` / `Resource` / `Reaction` 共享依赖模型

但实现层面仍然有继续优化空间，尤其是大 schema、复杂表单、设计器壳层场景下的订阅粒度和失效成本。

### 5.2 为什么值得做

这不是“追求纯理论更优雅”，而是直接影响：

- 大页面局部更新成本
- 表达式较多时的重算范围
- 复杂 shell 下 inspector / toolbar / body 的相互干扰
- 调试器开启时的观察成本

### 5.3 建议的方向

建议采用“渐进增强”的方式，而不是推倒现有模型：

1. 继续保留现有 runtime/store 基线
2. 保持运行期动态依赖收集作为基线语义
3. 对可静态证明的简单表达式增加编译期依赖推断，用于优化订阅和收窄失效范围
3. 优先在 owner-local 和 hot-path 区域实现窄订阅
4. 不把 `ScopeRef`、`ActionScope`、`ComponentHandleRegistry` 再揉成统一大对象

更具体地说，这里不主张“编译期和运行期双算常态化”。更合理的策略是：

1. 运行期动态依赖收集仍然是统一语义基线
2. 编译期可精确判定的子集: 直接生成依赖计划，减少无意义的宽订阅
3. 编译期无法可靠判定的部分: 继续按现有模型在运行期收集

编译期推断的价值在于优化，而不是替代动态依赖收集这条基线语义。

优先级上，更值得先做：

- 简单表达式的编译期依赖推断
- owner summary 的窄发布
- row / composite field / designer shell 的局部订阅收口

### 5.4 为什么不是改成另一套响应式内核

不建议为了追踪粒度，直接把 Flux 改写成新的“全局自动响应式平台”。

原因：

- 会破坏现有 `ScopeRef` / `Resource` / `Reaction` 分层
- 会模糊 `Settled Update Turn` 和 React 调度边界
- 会把当前清晰的 execution model 改成更难验证的隐式系统

更合适的路径是：在现有执行模型内增加 dependency refinement，而不是替换执行模型。

---

## 6. 改进方向四：统一 `RendererDefinition.hostContract / manifest` 的工具消费路径

### 6.1 当前问题

当前 `hostContract` / `HostCapabilityProjectionManifest` 已经不是空想，它已经进入：

- renderer metadata
- compiler validation
- host family version resolution

而且从当前设计看，在 publishing owner 上下文明确，或显式提供 host contract context 的工具流程里，编辑器和调试器已经有可直接消费的静态入口：

1. 先从当前节点的 `RendererDefinition.hostContract` 读取 `family`、`defaultVersion`、`resolveManifest(...)`
2. 再按节点上的 `xui:version` 或默认版本解析出具体 `HostCapabilityProjectionManifest`
3. 最后直接用于补全、参数提示、调试展示或文档导出

因此这里真正的问题不是“工具拿不到 manifest”，而是这条消费路径还可以进一步固定成统一约定，避免每个工具各自重复 resolve 和拼装。

### 6.2 为什么值得做

如果这条直接消费路径没有被固定，平台仍然会出现实现分散：

- 编辑器不知道 host projection 有哪些字段
- action 配置界面不知道 namespace method 的参数 shape
- 调试器知道某次 action 失败，但不知道它对应哪个 contract
- 文档和代码容易再次分离，最终回到“靠经验记忆”的状态

### 6.3 建议的方向

在不改变“host-only”定位的前提下，建议把 publishing owner 上下文下的下面这条直接消费路径固定为标准做法：

1. 给定当前节点 `type`
2. 从 `RendererDefinition.hostContract` 读取 host family 和 resolver
3. 用节点上的 `xui:version` 或默认版本 resolve manifest
4. 把已解析 manifest 直接提供给编辑器、调试器和文档导出逻辑

在这个统一约定之上，再把 manifest 用到：

1. schema 编辑器中 `${...}` 对 host projection 字段的补全和提示
2. action 配置界面中 `designer:*` / `spreadsheet:*` 这类方法的参数 shape 提示
3. 调试器里展示当前 host family、version、可见 projection 字段、可调用 capability 方法
4. 从 manifest 自动生成一份面向开发者的 contract 参考文档

应保持的边界：

- `hostContract` 只属于 `domain-host-renderer`
- 不要把所有 ordinary renderer 都升级成 host manifest
- 共享的是 contract language，不是统一 runtime registry
- 独立片段校验或无宿主上下文的工具场景，仍然可能需要显式传入 host context；这不否定直接消费路径，只是说明片段上下文有时无法仅靠当前节点自动推断

### 6.4 设计理由

这样做的收益不是“再加一层抽象”，而是把当前已经存在的能力变成统一做法：

- schema authoring
- compiler 校验
- runtime 执行
- debugger / docs / editor 消费

这几方共同理解。

这也更符合 Nop 整体“模型驱动 + 契约先行”的思路。

---

## 7. 治理项一：继续压缩 host/workbench helper 的平台化漂移

### 7.1 当前问题

`complex-control-host-protocol.md` 已经明确，复杂宿主需要一层很薄的共享 host protocol。但这条线需要持续警惕另一种风险：

- helper 越写越多
- workbench 语义越堆越厚
- 设计器族逐渐脱离普通复杂组件模型

### 7.2 为什么值得做

如果这一层失控，Flux 会出现与 `flux-dsl-vm-extensibility.md` 正面冲突的结果：

- designer-specific lifecycle
- designer-specific provider
- designer-specific runtime protocol

最终“设计器是组件”会被重新扭回“设计器是平台里的另一个平台”。

### 7.3 建议的方向

继续坚持：

- host protocol 只解决 `getSnapshot/subscribe/dispatch`、namespace wiring、session summary 这类最小公共问题
- shell 负责 region 组织，不负责结构装配
- 复杂控件内部上下文可以存在，但不要上升为新的平台级公开协议

### 7.4 设计理由

这是为了保护当前最有价值的统一性：

- 普通复杂控件与设计器类控件共享一套 renderer contract
- host boundary 是 platform-extension architecture，不是第二 primitive system

---

## 8. 治理项二：把 React 19 的使用约束写得更具体

### 8.1 当前问题

项目已经基于 React 19，但还可以把“哪些地方该用 React 19 能力、哪些地方不该让 React 语义进入 Flux 核心”写得更具体。

### 8.2 建议的方向

建议把 React 19 的使用约束写成更具体的规则：

1. `useSyncExternalStore` 继续作为 runtime store 订阅基线，Flux 的响应式结算语义仍然定义在 store 层，不定义在 React effect 排序里
2. `startTransition` 只用于明显偏 UI 体验的非阻塞更新，例如设计器属性面板切换、搜索过滤、大纲树刷新；不要把它作为核心 action / validation 语义的一部分
3. `useDeferredValue` 只用于搜索词、过滤条件、列表视图这类显示延迟，不要拿它承载 schema 数据一致性语义
4. `useEffectEvent` 适合 bridge 订阅、宿主事件转发、调试器监听；不要借它绕过现有 `ActionScope` / `ComponentHandleRegistry` 边界
5. `Suspense` / `use` 可以用于远程资源加载、模块加载、按需 renderer 装载；不要让 schema primitive 的求值语义依赖 React suspend 机制

### 8.3 设计理由

这样可以避免两个误区：

- 把 React 19 并发能力误当成 Flux 自身语义的一部分
- 反过来又因为担心语义混乱而完全不用 React 19 的优势

更准确的说法应该是：React 19 是执行宿主和 UI 体验优化工具，不是 Flux primitive 的替代品，也不是 loader/compiler 语义的归属层。

---

## 9. 优先级建议

如果只按收益和风险排序，建议优先顺序如下：

### P1

- 固定 `Final Execution Schema` 输入不变量
- 补齐基于稳定 source-location 元数据的 diagnostics 回溯链

原因：这两项最符合 Nop 整体生产线思路，也最能避免前后端边界重新混乱。

### P2

- 收紧依赖追踪和订阅粒度

原因：这对性能和大规模页面稳定性影响最大，但可以渐进落地，不必推翻执行模型。

### P3

- 固定 publishing owner 上下文下 `RendererDefinition.hostContract -> resolveManifest(...) -> tool consumption` 这条统一路径

原因：当前基础已经有了，继续推进的边际成本相对可控，平台收益很大。

### 治理项

- 继续压缩 workbench/platform helper 漂移
- 明确 React 19 使用边界

原因：这两项更像长期治理规则，应持续做，但不与前三条主线竞争同一优先级。

---

## 10. 最终判断

Flux 当前最需要的，不是更强的运行时平台抽象，而是更完整的执行闭环。

最合理的演进方向是：

1. 让 `nop-entropy` 更稳定地输出跨过 `Final Execution Schema` 边界的最终 DSL 资源
2. 让 Flux compiler 更完整地理解来源、契约和错误边界
3. 让 Flux runtime 更精确地执行和订阅最终模型
4. 让编辑器、调试器和文档工具沿同一条 `hostContract -> manifest` 路径消费与 compiler 相同的 contract 和 diagnostic surface

这条路线的核心优点在于：

- 不复制后端能力
- 不破坏现有 primitive closure
- 不把设计器重新平台化
- 继续把 Flux 保持为 React 19 上的稳定 DSL VM

这比“增加更多 runtime provider / adapter / platform registry”更符合当前项目已经确立的方向。
