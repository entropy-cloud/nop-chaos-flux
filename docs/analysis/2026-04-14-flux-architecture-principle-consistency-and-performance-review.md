# 2026-04-14 Flux Architecture 文档一致性、设计原则与性能评审

## 1. 范围

本文只审查 `docs/architecture/**/*.md` 之间的契约一致性、原则一致性和性能设计取向，不以“当前代码是否已经完全实现”为主要判断标准。

它补充 `docs/analysis/2026-04-12-architecture-doc-consistency-audit.md`，但关注点不同：

- 该审计更偏全量清单和 doc-vs-code 漂移
- 本报告更偏 doc-vs-doc、Flux 设计原则、是否已达到更优设计/性能边界

## 2. 执行摘要

总体判断如下：

| 维度 | 结论 |
| --- | --- |
| 文档整体一致性 | 核心 owner-doc 冲突已在同日收口；剩余问题主要是过渡张力、兼容面和最优性问题 |
| 是否符合 Flux 设计原则 | 主干上符合，局部边界被少数文档重新放宽 |
| 是否已经达到最优设计 | 没有。核心模型很强，但仍混有兼容语义、双重契约和边界泄漏 |
| 性能选择是否最优 | 热点路径有多个接近最优的决策，但全局还不能称为“最优” |

换句话说，`docs/architecture` 已经具备一套高质量的核心架构基线：`Final Execution Schema`、七原语闭包、词法所有权、Capability-only effect path、compile once/execute many、row-local invalidation、spreadsheet perf-first subtree。这些主轴是成立的。

但它还没有完全到达“文档契约层面的最优状态”。最主要的问题不是方向错，而是少数文档仍把历史兼容路径、实现中间态或局部便利机制重新带回了规范层，导致边界不够纯。

更新说明：本文初稿在 2026-04-14 同日识别出 5 处 owner-doc 真实矛盾。随后这些冲突已通过 `docs/plans/88-owner-doc-conflict-closure-plan.md` 收口。下面的内容已同步到收口后的当前基线，因此重点转为“哪些冲突已经关闭”以及“还剩哪些非致命但重要的张力”。

## 3. 已经很强的设计部分

以下部分在文档中已经形成比较稳定且高质量的共同基线。

### 3.1 七原语闭包与顶层边界是清晰的

`docs/architecture/frontend-programming-model.md` 把 `Base Tree`、`ScopeRef`、`Value`、`Resource`、`Reaction`、`Capability`、`Host Projection` 定义成闭包原语集，并明确规定派生系统不能随便升格为新原语。这一点与 `docs/architecture/flux-design-principles.md` 的“渐进式演化”“领域隔离与抽象”是对齐的。

这是整个文档集最强的部分之一，因为它防止了 flow designer、report designer、debugger、surface runtime 之类的重要系统反向污染核心词汇表。

### 3.2 词法所有权主线是正确的

`docs/architecture/frontend-programming-model.md`、`docs/architecture/flux-design-principles.md`、`docs/architecture/scope-ownership-and-isolation.md`、`docs/architecture/action-scope-and-imports.md` 在主线上都强调：

- `ScopeRef` 负责数据可见性
- `ActionScope` 负责命名空间能力查找
- `ComponentHandleRegistry` 负责实例能力调用

这种三分法明显优于把所有东西都塞进一个 ambient runtime object，也符合 Flux 的“数据环境”和“行为环境”分离原则。

### 3.3 表格行身份与局部失效设计接近最优

`docs/architecture/table-row-identity-and-scope-performance.md` 明确区分 `index` 与 `rowKey`，把 value path、React key、instance identity、row-scope cache key 分离，并要求 row-local invalidation 停在行边界。这是面向大表格/可编辑表格的高质量设计，和 `docs/architecture/performance-design-requirements.md` 的热点路径约束高度一致。

### 3.4 Spreadsheet canvas 的混合 CSS 策略是正确的特化

`docs/architecture/report-designer/spreadsheet-canvas-css.md` 明确把 spreadsheet canvas 定义成一个性能敏感、自包含的渲染子树，采用 `ss-*` class + inline style + `data-*` 的混合方案。这不是对 Tailwind/shadcn 体系的破坏，而是一个被清楚界定的性能例外。

对 2600+ cell 的场景，这个选择明显优于 Tailwind-per-cell 的纯工具类路线。

## 4. 已关闭的同日冲突

本次评审初稿曾识别出 5 处 owner-doc 真实矛盾。这些矛盾已在同日通过 `docs/plans/88-owner-doc-conflict-closure-plan.md` 收口，因此它们不再属于当前 active baseline 的冲突，而更适合作为“收口证据”保留。

### C1. `dependsOn` 当前基线已统一

`docs/architecture/api-data-source.md` 与 `docs/architecture/dependency-tracking.md` 现在都统一为：

- `dependsOn` 已存在于 `DataSourceSchema` / `ReactionSchema`
- 当前基线是 explicit roots first
- 当 `dependsOn` 缺省时，runtime-collected dependencies 作为 fallback

这消除了“已落地”与“尚不存在”的冲突。

### C2. `label` / `title` channel 归属已统一

`docs/architecture/renderer-runtime.md` 已删除把 `label` 放入稳定全局 `meta` 的表述，现与 `docs/architecture/field-binding-and-renderer-contract.md` 一致：

- `label` / `title` 不属于稳定全局 `meta`
- 它们由 renderer metadata 决定进入 `props` 或 `value-or-region`

这消除了 normalized channel 的 owner 冲突。

### C3. Region render API 已收口为一主两辅

`docs/architecture/renderer-runtime.md`、`docs/architecture/field-metadata-slot-modeling.md`、`docs/architecture/scoped-render-slots.md` 现在统一为：

- `render({ bindings, instancePath })` 是规范入口
- `data` 只是 `bindings` 的兼容别名
- `instantiate()` 是兼容入口
- `scopeKey` 仅保留为 advanced/internal reuse hint

这消除了 region render contract 的 owner-doc 冲突。

### C4. Runtime permission 边界已统一

`docs/architecture/flux-dsl-vm-extensibility.md` 已与 `docs/architecture/security-design-requirements.md` 对齐：

- Flux runtime 不承担 permission policy semantics
- Flux runtime 只消费宿主已经投影好的 permission facts

这消除了 loader/runtime 安全边界上的直接冲突。

### C5. Report/Spreadsheet namespace ownership 已统一

`docs/architecture/report-designer/api.md` 已不再暗示 `register*Actions(runtime)` / 全局 handler registry，而是改成 page-owned `ActionScope.registerNamespace(...)` provider 模型。

这与 `docs/architecture/action-scope-and-imports.md` 的词法 owner 模型重新一致。

结论：上述 5 个点不再是当前 active owner-doc baseline 的冲突。当前剩余的问题主要是下面这些非致命但重要的张力。

## 5. 非致命但重要的张力

下面这些问题还没有形成“逻辑互斥”的矛盾，但已经影响文档纯度与设计最优性。

### T1. 顶层优先级在原则上清楚，阅读竞争感已缩小但仍需持续保持

`docs/architecture/frontend-programming-model.md:20-29` 明确自己拥有 top-level precedence。`docs/architecture/flux-design-principles.md:207-219` 也承认这一点。

此前 `docs/architecture/flux-core.md` 一度把自己描述成“highest-level answer”，容易让读者误以为 `flux-core.md` 与 top-level programming model 是并列总纲。这个 wording 已在同日收口，当前风险更多来自后续编辑是否会再次模糊这条边界。

这不再是当前 active owner-doc 的直接冲突，但仍值得持续保持，因为总纲层级一旦重新模糊，会放大整个文档树的阅读歧义。

### T2. `xui:imports` 的 helper/capability 边界写得不够清楚

`docs/architecture/action-scope-and-imports.md:726-740` 允许在表达式中使用 import 得到的 `$demo.formatName(...)` 之类函数调用。这本身不应被视为问题，反而是 Flux 为了避免在 JSON 中堆复杂代码而应当支持的能力。

真正需要收敛的是文档表述：当前文档容易让人读成“同一个 imported capability set 同时既是 expression helper object，也是 action capability provider”。

更准确的 owner 说法应是：

- imported functions 可以作为 expression helper 被调用
- imported namespaces 也可以作为 action capability provider 被调度
- 但建议作者在使用上保持收敛：算值走 expression，做事走 action

所以这里更适合作为设计建议和边界澄清，而不是硬性冲突。

### T3. 样式所有权 wording 已收紧，但仍需继续保持边界清晰

此前 `docs/architecture/styling-system.md` 一度把 schema 写成“owns all visual and layout decisions”，这与 component chrome、stable class structure、host token override 的边界不够一致。该 wording 已在同日收紧，当前基线改成了 schema explicit choices / component UI chrome / global theme layer 的三分表述。

真正更准确的说法应该是：

- renderer 不得注入作者不可见的隐式布局
- schema 决定 schema-controlled visual/layout choices
- package/ui library 拥有组件 chrome 与交互视觉
- host/theme token 拥有跨宿主主题覆写点

当前风险已经从“过度绝对化”收窄为“后续文档是否持续沿用这套更准确的三分边界”。同日内 `theme-compatibility.md` 也已同步到这套 schema explicit choices / component chrome / theme layer 的三分表达，因此当前 active baseline 基本一致。

### T4. `classAliases` 的执行时机心智已收紧，但仍需避免重新漂移

此前 `docs/architecture/styling-system.md` 更像在强调“render time via context”的心智，而 `docs/architecture/renderer-runtime.md` 更强调 node-local boundary + `NodeRenderer` 执行。这两种说法并非绝对互斥，但容易把读者带向不同的性能心智模型。

当前 wording 已收紧为：

- alias map 的合并与 boundary publication 属于 `NodeRenderer` / provider 边界
- concrete `className` 的解析发生在 render 阶段

这比单纯写成“render time via context”更接近 compile once / execute many 的目标心智。当前剩余风险主要是后续文档不要再把它重新写回成 runtime re-derivation 的印象。

### T5. `FieldFrame` 示例漂移已缩小，但周边示例仍需持续保持

此前 `docs/architecture/field-frame.md` 的示例曾大量直接读取 `props.schema.*` 并手工包 `<FieldFrame>`，这会把“先直读 schema，之后再归一化”的旧心智重新带回来。该文档已在同日更新到 wrapper-handoff / normalized-props baseline，但同类风险仍可能出现在其他教学型示例中。

### T6. `mergeToScope` 是可接受的兼容特例，但不是最优设计

`docs/architecture/frontend-programming-model.md:89-92,307-317` 希望 `Resource` 保持“一资源一逻辑值”的权威发布模型。

但 `docs/architecture/api-data-source.md:475-483` 允许 `name + resultMapping + mergeToScope: true` 把对象再浅合并到当前 lexical scope。

这不是原则级错误，因为文档已经把它收窄成显式例外；但它会扩大：

- collision surface
- invalidation surface
- 资源所有权的解释复杂度

所以它更像兼容 tradeoff，而不是 clean final design。

### T7. Debugger 可观测性 contract 已补预算规则，但仍需后续实现/测试持续跟上

此前 `docs/architecture/debugger-runtime.md` 主要定义能力面，缺少 event budget、snapshot discipline、sampling、export-boundary 等性能约束。该文档已在同日补上这部分规则，并且与当前 bounded event retention、timeline virtualization、deferred search 的实现锚点对齐。

当前剩余风险已从“文档没有预算规则”收窄为“后续实现与测试是否持续满足这些预算规则”。

## 6. 是否满足 Flux 设计原则

按原则逐项判断如下。

| 原则 | 判断 | 说明 |
| --- | --- | --- |
| DSL 优先 | 基本满足 | 大部分文档都坚持 loader/runtime 分层，少数扩展文档仍把兼容逻辑带回 runtime |
| 编写-执行分离 | 基本满足 | 主线成立，但部分文档仍会混入 current/future 双时态，需要持续收紧表述 |
| 响应式数据驱动 | 满足主干 | root-based invalidation、narrow subscription、row-local invalidation 方向正确 |
| 渐进式演化 | 基本满足 | 值、动作、结构的渐进升级路径清楚；imports helper/capability 边界还应写得更明确 |
| 词法所有权 | 基本满足 | `ScopeRef` / `ActionScope` / `ComponentHandleRegistry` 的三分法强；当前 owner docs 已基本对齐，但仍需防止后续扩展文档重新放宽边界 |
| 领域隔离与抽象 | 基本满足 | Flow/Report/Spreadsheet 主体上保持为 host/domain family；少数 API 仍暗示全局注册式扩展 |

结论不是“原则不成立”，而是“原则成立，但还没有被每一份 architecture doc 严格执行到底”。

## 7. 是否已经到达最优设计

结论：没有。

更准确地说，Flux 的核心抽象已经接近一个很强的局部最优，但 `docs/architecture` 整体还没有达到“最优设计文档集”的状态。

原因主要有五个。

第一，规范文档里仍存在历史兼容面。例如 `mergeToScope`、legacy `dataPath`、旧 action targeting、双套 region render API，这些兼容路径可以存在，但不应继续和 target contract 并列叙述得同样强。

第二，少数扩展文档虽然已完成 owner-doc 收口，但更广义的边界纯度仍受兼容面影响，例如 `mergeToScope`、旧式 region compatibility API 等还在文档中保留为窄兼容路径，而不是被彻底删除。

第三，renderer normalized contract 的主契约已收口，但周边示例与兼容入口仍会分散读者注意力。`instantiate()` 兼容入口、以及少量 raw-schema fallback 叙述，仍说明“renderer 作者到底应该依赖哪一层契约”还可以更单一。

第四，性能导向的 hot path 设计已经很成熟，但围绕这些 hot path 的 owner docs 和实现约束还没有全部同样成熟。例如 debugger 的预算规则虽已补齐，report designer 的 host-scope invalidation discipline 仍不如 table/spreadsheet 那样彻底收敛。

第五，文档集还混有“当前实现状态”和“目标契约状态”的双重语气。分析文档可以容忍这种写法，architecture owner docs 不适合长期保留。

补充说明：`docs/architecture/flux-runtime-module-boundaries.md` 已在同日继续同步到当前代码拆分，补上了 `action-runtime-core.ts`、`action-runtime-handlers.ts`、`imports.ts`、`action-scope.ts`、`component-handle-registry.ts`、`operation-control.ts`、`status-owner.ts` 等稳定运行时边界。因此当前剩余问题更多不是 runtime module ownership 本身冲突，而是其他文档是否持续沿用这套边界语言。

## 8. 性能选择是否是最优

结论：不是全局最优，但有几块已经非常接近最优。

### 8.1 接近最优的性能设计

`compile once, execute many`、narrow subscription、stable identity reuse 是正确的大方向；这一点由 `docs/architecture/flux-core.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/performance-design-requirements.md` 共同支持。

`table row` 的 `rowKey` / `index` 分离、row-local scope、owner-side row reconciliation，是目前这类 low-code table 里非常成熟的一种路线，`docs/architecture/table-row-identity-and-scope-performance.md` 质量很高。

`spreadsheet canvas` 用专用 CSS 子系统而不是硬套通用 renderer styling contract，也是明显正确的性能分层，见 `docs/architecture/report-designer/spreadsheet-canvas-css.md:13-23,166-179`。

### 8.2 还不能称为最优的性能点

`dependsOn` / root-only invalidation 的 owner-doc 冲突已经关闭，但当前实现仍然保留 explicit roots first + runtime fallback second 的折中模型。这是合理的工程平衡，但比“全量静态可声明且高度可验证”的终态更偏折中。

`RenderRegionHandle` 的 owner-doc 主契约已经统一，但 live design 仍保留 `data` / `instantiate()` 兼容路径。这不会造成当前冲突，但说明这一层还未达到最纯净的终态。

`mergeToScope` 虽然方便 linked-data projection，但它不是最优 invalidation/ownership 方案。它是带着明确收益的兼容性折中。

`report-designer-page` 固定宿主 scope 在 `docs/architecture/report-designer/design.md:341-358,377-390` 中暴露得比较宽，而与之配套的精细 invalidation/runtime-snapshot discipline 还不像 flow/table 那样细化。因此它更像“方向合理、工程上待收紧”，还不是最优取舍。

`debugger-runtime` 的事件/快照模型能力很强，但在没有 sampling/throttling/budget 规则前，不能宣称它是性能上最优的 observability 设计。

## 9. 优先建议

1. 把 imported library 的文档表述明确成两条通道：expression helper 与 capability namespace。实现上可以同时支持两类函数，但建议使用上保持“算值走 expression，做事走 action”。
2. 继续让 `field-binding-and-renderer-contract.md` 作为 `props/meta/regions/events` 的冻结 owner，并进一步清理 `field-frame.md` 等周边示例里的旧心智。
3. 继续把 region render API 收紧到 `render({ bindings, instancePath })` 的单一路径心智，让 `data/instantiate()` 只作为明确标注的兼容接口存在。
4. 继续把 debugger 预算规则落实到 focused tests 和实现习惯中，而不只是停留在文档层。
5. 继续保持样式三方 ownership wording 的一致性，避免其他文档重新回到“schema 拥有全部视觉”的过度绝对表述。

## 10. 最终结论

`docs/architecture` 已经拥有一条很强的核心主线，且这条主线基本符合 Flux 的设计原则。经过同日的 owner-doc 收口后，最突出的问题已经不再是“直接冲突”，而是“仍保留若干兼容面和非最优表述”。

所以最终判断是：

- 它们在当前 active owner-doc baseline 上已经基本一致
- 它们大体符合 Flux 设计原则，但仍有若干兼容面和非最优边界表达
- 它们还没有到达最优设计
- 性能上若只看 table/spreadsheet 等热点子系统，已经非常强；若看整个文档集，还不能称为全局最优

最需要优先修正的已经不再是那几处 owner-contract 冲突，而是继续减少兼容路径带来的双重心智，并把剩余“不是错但也不是最优”的文档表述进一步收紧。
