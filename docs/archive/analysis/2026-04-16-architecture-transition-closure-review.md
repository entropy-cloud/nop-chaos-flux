# 2026-04-16 架构转换期收口审查与文档修改意见

> 状态：当前基线
> 作用：检查 `docs/architecture/**/*.md` 中仍保留的转换期表述是否已经完成；对已完成项要求从 owner doc 中去掉陈旧过渡语气；对未完成项给出继续收口方案。
> 取代：`docs/analysis/2026-04-16-architecture-doc-consistency-audit.md` 中对若干“已收口”的过度乐观判断。

## 1. 结论

当前代码基线已经完成了一批关键转换，但还没有完全达到“文档可彻底去掉过渡态语言”的程度。

已经可以判定为**完成收口**的部分：

- `ScopeRef.read()` 旧接口已经移除，当前基线是 `readOwn()` / `readVisible()` / `materializeVisible()`。
- React 渲染主路径已经基于 `CompiledTemplate -> TemplateNode -> NodeInstance`，不是直接把 `CompiledSchemaNode` 带入 render path。
- 运行时节点身份已经以 `cid` 作为 live mounted identity，以 `instancePath` 作为 repeated context；`NodeLocator` 已从源码主路径移除。
- 依赖收集与命中判断已经按 lexical root 归一化，不再以 deep member path 作为主基线；`dependsOn` 也已经要求 root-only。
- Flow Designer 的 `designer:*` namespace provider 已经接入 `ActionScope`，不再是纯文档目标。

仍然**未完成收口**、还不能从 owner doc 中删除转换说明的部分：

- `CompiledSchemaNode` 仍然是公开类型和编译内部工件，尚未完全退到纯内部。
- `data-source` 仍保留 `dataPath` / `mergeToScope` 等兼容发布路径，最新设计尚未彻底收敛到 `name` 为主的发布模型。
- `dependsOn` 已经是 roots-first，但 source/reaction 仍保留 runtime-collected fallback，尚未完全变成“声明优先且可严格诊断”的终态。
- Flow Designer 的 schema/action 边界已经接上 `designer:*`，但 owner shell 内部仍大量直接调用 `core.*` 与 command adapter，距离“所有 schema-owned 行为都统一经 Capability 入口”还有一步。

因此，文档修改原则应该是：

- 已完成的转换，直接改成现在时，不再写成 “should converge” / “implementation in flight”。
- 未完成的转换，明确写成“当前兼容基线 + 剩余收口项”，不要写成模糊的 future narrative。
- 历史迁移过程保留在 `docs/analysis/` 或 `docs/plans/`，不要继续堆在 owner doc 正文里。

## 2. 已完成的转换项

### 2.1 Scope API 收口已完成

代码证据：

- `packages/flux-core/src/types/scope.ts`
- `packages/flux-runtime/src/scope.ts`

当前事实：

- `ScopeRef` 已稳定暴露 `readOwn()` / `readVisible()` / `materializeVisible()`。
- `read()` 已不在当前契约里。
- `readVisible()` 已是 prototype-backed visible view，`materializeVisible()` 才是 plain-object flatten。

文档修改意见：

- `docs/architecture/flux-core.md` 不应再把这部分写成重构过渡结果，应直接把它当作当前稳定基线。
- `docs/architecture/action-scope-and-imports.md` 等仍引用 `read()` 的文档要全部改掉，不能继续保留旧接口痕迹。

### 2.2 渲染主路径的模板/实例拆分已基本完成

代码证据：

- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-core/src/types/node-identity.ts`
- `packages/flux-react/src/schema-renderer.tsx`
- `packages/flux-react/src/node-renderer.tsx`

当前事实：

- `SchemaCompiler.compile()` 已返回 `CompiledTemplate`。
- React render path 已使用 `TemplateNode` 与 `NodeInstance`。
- `NodeRenderer` 已围绕 `TemplateNode` 解析 props/meta，并在挂载时分配 live `cid`。

仍未完全收口的点：

- `CompiledSchemaNode` 仍是公开类型，且仍出现在 `SchemaCompiler.compileNode()`、编译插件、debugger 辅助里。

文档修改意见：

- `docs/architecture/flux-core.md` 中“Current code still routes through `SchemaCompiler` and `CompiledSchemaNode`. Treat that as the implementation in flight”这一类表述应收紧。
- 更准确的说法应改为：React render path 已完成模板/实例拆分；`CompiledSchemaNode` 仍是编译内部工件和少量工具面残留，不应继续出现在 runtime-facing 叙述里。

### 2.3 节点 live identity 收口已完成

代码证据：

- `packages/flux-core/src/types/node-identity.ts`
- `packages/flux-runtime/src/index.ts`
- `packages/flux-react/src/node-renderer.tsx`

当前事实：

- `cid` 已是 mounted node 的 live identity。
- `instancePath` 已承担 repeated context。
- 源码主路径中已经看不到 `NodeLocator` 的继续使用。

剩余问题：

- 构建产物里仍可见个别旧声明残影，例如 `packages/flux-react/dist/useFormComponentHandleRegistration.d.ts` 仍提到 `NodeLocator`。这属于产物清理问题，不是源码主契约问题。

文档修改意见：

- `docs/architecture/flux-core.md`、`docs/architecture/template-instantiation-and-node-identity.md` 里凡是写成 “`cid` should converge ...” 的地方，都应改成现在时。
- 这类文档只需保留一句约束：`NodeLocator` 不得回流到源码和公开契约。

### 2.4 依赖追踪的 root-normalized 基线已落地

代码证据：

- `packages/flux-formula/src/scope.ts`
- `packages/flux-runtime/src/scope-change.ts`
- `packages/flux-runtime/src/reaction-runtime.ts`
- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/schema-compiler/shape-validation.ts`

当前事实：

- 公式层依赖收集已经通过 `normalizeRootPath()` 归一化到 lexical roots。
- `scopeChangeHitsDependencies()` 已按 root 集合命中，不再要求 deep path matching。
- `dependsOn` 已要求 root-only，deep member path 会被 schema diagnostics 拒绝。
- source/reaction 已经是 explicit roots first。

文档修改意见：

- `docs/architecture/dependency-tracking.md` 不应再把“从 deep member paths 收敛到 lexical roots”整体写成待完成计划。
- 文档应改成：root-normalized tracking 是当前基线；剩余未收口的是“是否彻底取消 runtime fallback”和“是否补 dev diagnostics”。

### 2.5 Flow Designer 的 namespace action 基线已落地

代码证据：

- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-action-provider.ts`

当前事实：

- `designer-page` 已通过 `actionScope.registerNamespace('designer', ...)` 注册 provider。
- `createDesignerActionProvider()` 已把大量 designer 命令暴露为 `designer:*` 方法面。
- toolbar/tests 中也已经有 `designer:undo`、`designer:redo`、`designer:export` 等 schema-visible action 用法。

文档修改意见：

- `docs/architecture/action-scope-and-imports.md` 中不能再把 Flow Designer 描述成“仍主要停留在 direct core calls，`designer:*` 只是目标架构”。
- 应改成：`designer:*` namespace provider 已经落地；剩余问题是 owner shell 内部仍直接依赖 `core.*` / command adapter，而不是所有 owner-local 交互都统一经 capability facade。

## 3. 未完成的转换项与继续改进方案

### 3.1 `CompiledSchemaNode` 仍未完全退回内部

代码证据：

- `packages/flux-core/src/types/renderer-compiler.ts`
- `packages/nop-debugger/src/controller-helpers.ts`

现状判断：部分未完成。

问题不在 React render path，而在编译/工具公开面：

- `CompiledSchemaNode` 仍出现在公开类型里。
- `SchemaCompiler.compileNode()` 仍直接返回它。
- debugger 辅助仍接受 `CompiledSchemaNode | CompiledSchemaNode[]`。

继续改进：

1. 把 `CompiledSchemaNode` 明确降级为 `@internal` 仅编译器/诊断使用，避免继续出现在 runtime-facing public API 教学路径里。
2. 为 debugger 改成面向 `CompiledTemplate` 的摘要接口，避免工具侧继续强化旧工件。
3. 评估是否保留 `compileNode()`；如果必须保留，也应在文档中明确其为编译诊断入口，而不是 runtime contract。

文档应如何写：

- 不要再写“模板/实例拆分仍在主路径过渡中”。
- 应写成“主路径已收口，编译工具面仍有内部工件残留，属于 API 收窄问题”。

### 3.2 `data-source` 仍未彻底收口到 `name` 发布模型

代码证据：

- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/data-source-runtime.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/runtime-action-helpers.ts`

现状判断：未完成。

当前基线同时存在三条路径：

- 推荐路径：`name`
- 兼容路径：`dataPath`
- 兼容扩展：`mergeToScope`

这说明最新设计希望的一资源一逻辑值发布模型还没有彻底收干净。

继续改进：

1. 在 `docs/architecture/api-data-source.md` 中把 `dataPath` 和 `mergeToScope` 明确标成 compatibility-only，不再和 `name` 并列成同强度主契约。
2. 新增 schema diagnostics：新设计路径下，默认禁止新 feature 继续引入 `dataPath`/`mergeToScope`；仅兼容模式放行。
3. 梳理 `ajax action.dataPath` 与 `data-source.dataPath` 两类语义，避免继续共用同一“发布目标”心智。
4. 后续若要彻底收口，优先保留：
   - `name` 作为 Resource publication
   - `resultMapping` 作为值整形
   - 明确的 action/setValue 作为写入副作用
     而不是继续扩大 `mergeToScope` 的责任。

文档应如何写：

- 不要再写“current code is not yet fully converged”这种泛泛表述。
- 应改成“当前稳定基线是 `name` first；`dataPath` / `mergeToScope` 仍是兼容通道，尚未移除”。

### 3.3 `dependsOn` 仍保留 runtime fallback，尚未达到最严格终态

代码证据：

- `packages/flux-runtime/src/source-registry.ts`
- `packages/flux-runtime/src/reaction-runtime.ts`

现状判断：部分未完成。

当前实现已经是：

- `dependsOn` 有值时，显式 roots authoritative。
- `dependsOn` 缺省时，仍从 runtime evaluation 收集依赖作为 fallback。

这比早期设计更先进，但还不是“完全声明优先、完全可诊断”的终态。

继续改进：

1. 在 owner doc 中把 remaining gap 精确写成“fallback 仍存在”，而不是继续笼统地说“依赖模型仍在收敛”。
2. 增加 dev-only diagnostics：source/reaction 若未声明 `dependsOn`，记录 runtime-collected roots，帮助作者补全显式声明。
3. 视产品要求决定是否收口到：
   - authoring/build-time 强制声明 `dependsOn`
   - runtime fallback 只保留给 formula broad-access 或兼容模式

### 3.4 Flow Designer 仍是 capability facade 与 direct core 调用并存

代码证据：

- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts`
- `packages/flow-designer-renderers/src/designer-action-provider.ts`

现状判断：部分未完成。

当前已经不是“没接 Capability”，而是“双轨并存”：

- schema-visible actions 已能走 `designer:*`
- owner shell 内部仍直接调用 `core.*` 和 command adapter

这在 owner-internal lifecycle 上可以接受，但会继续放大两套调用心智：

- schema 行为走 capability
- 壳层交互走 direct core API

继续改进：

1. 把 toolbar、create-dialog、export、undo/redo、palette/inspector toggle 等 schema-owned 或 UI-triggered semantic actions，尽量统一到 `designer:*` provider。
2. direct `core.*` 保留给真正的 owner-internal lifecycle、snapshot projection、canvas bridge 协调，不再让它承担普通交互入口。
3. `docs/architecture/action-scope-and-imports.md` 与 `docs/architecture/flow-designer/design.md` 应明确这层剩余差距，避免继续写成“未来某天才接 action namespace”。

## 4. 对 owner doc 的具体修改意见

### 4.1 `docs/architecture/flux-core.md`

应修改：

- 把已完成项改成现在时：
  - `cid` 已是 live runtime node identity
  - render path 已经使用 `TemplateNode` / `NodeInstance`
- 删除或收紧以下过渡语句：
  - “implementation in flight”
  - “should converge” 用在已经完成的 identity/render-path 上
- 保留但缩窄的剩余过渡项：
  - `CompiledSchemaNode` 仍是编译内部工件
  - validation / source / reaction 的更细收口另由窄文档负责

### 4.2 `docs/architecture/dependency-tracking.md`

应修改：

- 把 lexical-root tracking 写成当前基线，不再写成主要 future path。
- 把 remaining work 改成两件具体事：
  - fallback 何时收紧
  - diagnostics 何时补齐

### 4.3 `docs/architecture/api-data-source.md`

应修改：

- 把主契约改成：`name` first publication。
- 把 `dataPath` / `mergeToScope` 改成 compatibility-only lane。
- 删除宽泛的“整体尚未 fully converged”语气，改成精确列出哪些兼容机制仍存活。

### 4.4 `docs/architecture/action-scope-and-imports.md`

应修改：

- 更新 Flow Designer 章节，不再把 `designer:*` 描述成纯目标态。
- 准确写明剩余 gap：provider 已落地，但 owner shell 内 direct core facade 仍较重。

### 4.5 `docs/analysis/2026-04-16-architecture-doc-consistency-audit.md`

应修改：

- 不能继续作为“98% 已完成收口”的当前判断。
- 应标记为已被本报告取代，因为它把若干“主路径已落地但工具/API/兼容层未收口”的问题过度简化成“无需行动”。

## 5. 彻底实现最新设计的优先顺序

1. 先改 owner doc，把已完成转换改成现在时。
2. 再把未完成转换改写成“当前兼容基线 + 剩余收口项”，不要继续写抽象 future narrative。
3. 然后做实现收口，优先级如下：

- P1: 缩窄 `CompiledSchemaNode` 的公开面
- P1: 给 `dependsOn` 缺省场景补 dev diagnostics
- P1: 在 `api-data-source.md` 和 schema diagnostics 中把 `dataPath` / `mergeToScope` 降级为 compatibility-only
- P2: 让 Flow Designer 更多 schema-owned actions 统一走 `designer:*`
- P2: 清理构建产物中残留的 `NodeLocator` 旧声明，避免工具输出继续泄漏废弃契约

## 6. 最终判断

这次检查的关键不是“项目是否还处在大规模过渡期”，而是：

- 主路径已经比文档里写得更先进
- 但兼容层和工具层还没有完全收口

因此当前最需要改的不是再写更多历史迁移说明，而是：

- 把已经完成的转换从 owner doc 中彻底去历史化
- 把尚未完成的地方收敛成少数明确 gap
- 让后续实现围绕这些 gap 做真正的 closure，而不是继续维持大面积 current/future 双时态叙述
