# CID Allocation And Runtime Fragment Compilation

## 第 1 轮

### 用户原始表述

用户关注 `data-cid` 的生成方式，提出了几条具体问题与约束：

- `data-cid` 现在到底是每个 runtime 内部编码，还是全局编码。
- 更倾向于“每个 runtime / 每个 JSON 描述内部一套稳定编号器”。
- 不希望把 `_cid` 这种内部字段写回 raw schema 对象；既然已经有编译对象，就应该挂在编译对象上。
- `dynamic-renderer` 这类运行时再装配出来的 schema 片段，也应纳入同一份 JSON 描述的统一 `cid` 编号序列。
- 讨论过程需要记录到 `docs/discussions/`，随后同步修改文档和实现。

随后用户进一步补充了两类约束：

1. 不赞成用 `const cidNamespaces = new WeakMap<object, CompileCidNamespace>()` 一类“按 raw schema 对象身份全局追踪命名空间”的设计，认为归属应更显式。
2. `id` / `name` 的静态解析边界需要收紧：
   - `id` 在同一份 JSON 描述里应视为唯一；一旦重复，需要报告重复的 `path`
   - `name` 不能做整份 JSON 全局唯一假设；条件分支下可能存在同名但互斥挂载的控件，因此不能简单做 compile-time 全局静态解析

最后用户追问：

- `runtime.schemaCompiler.compile(...)` 为什么看起来调用频繁，是否会导致重复编译。
- 是否可以把“编译后的结果”作为一个隐藏属性挂在被编译节点上做缓存。

### AI 复述

本轮讨论实质上在收敛四个问题：

1. `cid` 的所有权到底属于 raw schema、compiled node，还是 runtime 级上下文。
2. 运行时 later-compile 片段（如 `dynamic-renderer`、dialog body/title）是否应继续沿用当前页面/描述的同一编号空间。
3. `componentId` / `componentName` 哪些可以安全做 compile-time 预解析，哪些必须保留到 runtime registry 解析。
4. 为了避免 later-compile 重复编译，是否可以直接缓存“完整 compiled result”，还是需要区分模板编译与实例化。

### AI 分析

#### 一、`cid` 不应写回 raw schema

这个判断成立。

`cid` 是编译产物的内部定位索引，不属于作者可声明的 schema 语义。把它写回 raw schema 会带来两个问题：

- raw schema 被内部实现细节污染，编译前/编译后对象边界变模糊
- 同一份 raw schema 若被多次装配或多实例复用，内部写回字段会让缓存、调试、实例隔离更混乱

因此更合适的落点是：

- `cid` 挂在 `CompiledSchemaNode` 上
- raw schema 保持 authoring/source 语义，不承载 compile-time 内部索引

#### 二、`cid` 的编号空间应随“当前描述的装配上下文”延续

用户提出“一个 JSON 对应一个稳定编号器”，这个方向是合理的，但要精确定义“稳定”的边界：

- 对于同一份描述的同一装配顺序，`cid` 应是稳定的 DFS 顺序编号
- later-compile 片段如果属于当前页面/描述的一部分，也应继续沿用同一编号空间，而不是每次从 `1` 重新开始
- 但这不等于跨不同时序、不同异步到达顺序都能保持绝对相同的数字；`cid` 仍是内部调试/定位索引，不应被提升为跨版本持久 ID

这意味着：

- root compile 需要创建一份编译期 `cid` 状态
- `dynamic-renderer`、dialog body/title 等 later-compile 片段如果由某个已编译节点触发，应显式继承该 owner node 所属的 `cid` 状态

这里的关键点不是是否暴露一个名为 `CompileContext` 的公开对象，而是“上下文归属必须显式”，不能靠 raw schema 对象身份的全局 `WeakMap` 去猜。

#### 三、静态预解析只应覆盖 `componentId`，不应覆盖 `componentName`

这条边界在讨论中被明确收紧：

- `componentId` 可以做 compile-time `_targetCid` 预解析，但前提是当前编译片段里该 `id` 唯一
- `componentName` 不应做整份 JSON 全局静态预解析，因为 `name` 允许在条件互斥分支下重复，且其合理唯一性边界更接近 runtime registry / visible scope boundary

因此当前更合适的规则是：

- `componentId`：若唯一，则编译期写 `_targetCid`
- `componentId`：若重复，则输出带 `path` 的告警，并禁用该 `id` 的静态 `_targetCid` 解析
- `componentName`：保留 runtime registry 解析，不做全局 compile-time `_targetCid` 注入

#### 四、重复 `id` 应报告 `path`

用户特别指出：每个 JSON 节点都有唯一 `path`，因此重复 `id` 的错误信息必须指出是哪些 `path` 冲突。

这个要求成立，而且比只报 `id` 本身更有可操作性。

因此编译期重复 `id` 检查应输出类似：

```text
[SchemaCompiler] Duplicate component id "dup-form" detected. Static cid resolution is disabled for this id. Paths: $.body[0], $.body[1]
```

这属于编译配置错误报告，而不是 runtime registry 的 mounted/unmounted 诊断。

#### 五、为什么会看到较多 `runtime.schemaCompiler.compile(...)`

这并不等于“每次 render 都会重新编译”。当前需要分三类理解：

1. root schema：
   - `SchemaRenderer` / `RenderNodes` 对 raw schema 的 compile 受 `useMemo` 保护
   - 只要输入 schema 引用没变，不会在普通 rerender 中反复 compile

2. `dynamic-renderer`：
   - 属于 later-compile 场景
   - 只有当远程返回的新 schema 到达并进入 render path 时才 compile
   - 如果 API 返回对象引用不变，普通 rerender 不会重复 compile

3. dialog body/title：
   - 属于 action 触发时的 runtime materialization
   - 每次打开 dialog 都会对该片段 compile 一次
   - 这是 later-compile 的真实重复点

当前之所以显式调用 `runtime.schemaCompiler.compile(...)`，是为了把 owner-node 继承的 `cidState` / `basePath` 传进去；这不是新增了“每 render 强制 compile”的机制，而是把 later-compile 的上下文显式化了。

#### 六、不能直接缓存“完整 compiled result”

用户问是否可以在被编译节点上挂一个隐藏的“编译后结果属性”。

结论是：

- **不能把完整 compiled result 当作通用缓存复用**

因为完整 compiled result 已经包含：

- 当前实例分配到的 `cid`
- 当前装配位置对应的 `path`

如果同一份 raw schema 以后再次被实例化：

- 会复用旧 `cid`，造成 `data-cid` 冲突
- 会复用旧 `path`，破坏同一页面描述内的唯一路径语义

因此，若未来要系统性减少 later-compile 的重复成本，正确方向应是：

- 缓存“模板级编译结果”
- 然后在实例化阶段再分配新的 `cid` / `path`

也就是更接近 `template compile + instantiate`，而不是“缓存完整 compiled node tree”。

### 待澄清问题

1. 后续是否需要把 later-compile 场景正式抽象成 `template + instantiate` 双阶段模型，而不仅仅是当前的 owner-node `cid/path` 继承？
2. 是否要为 dialog / dynamic-renderer 引入局部 compile cache，并明确其 key 至少包含 owner-node 语义，而不是仅按 raw schema object identity 缓存？

---

## 总结

### 最终需求

收敛 `cid` 的设计与实现边界：

- `cid` 不再写回 raw schema
- `cid` 挂在 `CompiledSchemaNode` 上
- later-compile 片段沿 owner-node 所属的同一描述编号空间继续分配 `cid`
- `componentId` 在唯一时可静态 `_targetCid` 预解析，重复时按 `path` 报告并禁用静态解析
- `componentName` 不做全局 compile-time `_targetCid` 注入

### 关键决策

- 不使用基于 raw schema object identity 的全局 `WeakMap` 命名空间设计
- 不把 `_cid` 写回 raw schema
- later-compile 片段通过 owner-node 显式继承 `cid/path` 编译上下文
- 不缓存“完整 compiled result”；若要优化 later-compile，后续应设计 `template compile + instantiate`

### 待定事项

- later-compile 的模板化缓存是否要单独形成后续设计文档

### 后续行动

- 修改 `packages/flux-runtime/src/schema-compiler.ts`、`packages/flux-runtime/src/node-runtime.ts`、`packages/flux-react/src/render-nodes.tsx`、`packages/flux-runtime/src/page-runtime.ts`
- 更新 `docs/architecture/component-resolution.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/flux-core.md`
- 在 `docs/logs/2026/04-07.md` 记录本次实现与设计决策
