# 框架稳定性与复杂控件统一抽象分析

> 分析日期: 2026-04-04
> 分析范围: `flux-core` / `flux-runtime` / `flux-react`，以及 `flow-designer`、`spreadsheet` / `report-designer`、`flux-code-editor`、`word-editor`
> 分析方法: 架构文档与当前源码、测试、交互评审结论交叉核对
> 说明: 本文是分析结论，不替代 `docs/architecture/` 下的规范性文档

## 一、结论摘要

当前框架的结论不应该简单说成“已经足够稳定”或“还不稳定”，而应该拆成两层看：

1. `SchemaRenderer` 核心层已经相当合理。
2. 复杂控件平台层还没有完全收敛。

更具体地说：

- `flux-core` / `flux-runtime` / `flux-react` 这一层已经具备比较清晰且可持续演进的架构骨架，特别是值树编译、显式渲染器契约、`ScopeRef` / `ActionScope` / `ComponentHandleRegistry` 三分离、以及 compile-once / execute-many 的方向，都是对的。参考 `docs/architecture/flux-core.md`、`docs/architecture/renderer-runtime.md`、`docs/architecture/flux-runtime-module-boundaries.md`。
- 但如果目标不是“做一个 schema renderer”，而是“做一个能长期承载 Flow Designer、Report Designer、Word Editor、Code Editor 等复杂控件的平台”，目前还不能说已经足够稳定。最大问题不在核心 runtime，而在复杂控件层的模式还没有统一收敛。
- 四类复杂控件当前成熟度差异很大：`flow-designer` 最接近统一架构目标，`spreadsheet-core` 已经很扎实，`report-designer` 的设计方向对但集成未完成，`word-editor` 还是独立工作台，`code-editor` 则本质上不应该被强行拔高成“设计器平台”。

因此，我的总体意见是：

- 核心框架可以继续沿当前方向演进，不建议推翻。
- 复杂控件需要统一，但统一点应该落在“壳层与协议”上，而不是落在“底层文档模型和引擎”上。

## 二、核心框架是否已经足够合理

### 2.1 已经比较合理的部分

当前核心层最合理的地方有四个。

第一，编译层和运行时边界清楚。

- `flux-core` 明确承担核心契约和无副作用工具，`flux-runtime` 承担 schema 编译、action、scope、form/page runtime，`flux-react` 承担 React 接入和 hooks，这个分层是健康的。参考 `docs/architecture/flux-core.md`、`docs/architecture/flux-runtime-module-boundaries.md`、`docs/architecture/renderer-runtime.md`。
- 这意味着复杂控件不需要重新发明表单引擎、表达式引擎、动作分发、dialog host，这一点在 `flow-designer` 和 `report-designer` 设计文档里已经反复强调。参考 `docs/architecture/flow-designer/design.md`、`docs/architecture/report-designer/design.md`。

第二，渲染器契约是明确的。

- `RendererComponentProps` 把 `schema`、`props`、`meta`、`regions`、`events`、`helpers` 分开，避免了传统低代码框架里“所有语义都塞进一个 props 对象”的膨胀问题。参考 `docs/architecture/renderer-runtime.md`。
- `RenderRegionHandle`、`helpers.render(...)`、`useScopeSelector()`、`useActionDispatcher()` 等边界已经足够稳定，适合作为复杂控件的上层基础。

第三，运行时职责拆分是对的。

- 数据读取用 `ScopeRef`，命名空间动作用 `ActionScope`，组件实例能力调用用 `ComponentHandleRegistry`，这是当前仓库里最有价值的设计之一。参考 `docs/architecture/flux-core.md`、`docs/architecture/renderer-runtime.md`。
- 这一点直接支撑了 `designer:*`、`report-designer:*`、`spreadsheet:*` 这些 namespaced action 的接入方式。

第四，复杂组件设计原则本身也已经比较成熟。

- `docs/references/complex-component-design-process.md` 已经明确提出“先 JSON Schema，后实现”“复用现有 runtime”“只在必要处引入专用引擎”“Config 与 Document 分离”。这些原则本身是对的，且和当前核心架构一致。

### 2.2 还不能说“足够稳定”的部分

虽然骨架合理，但目前还存在三个会影响平台稳定性的结构性问题。

第一，复杂控件层还没有统一的共享壳层协议。

- 现在 `flow-designer`、`spreadsheet`、`report-designer`、`word-editor` 都各自实现了自己的页面壳层、状态暴露方式、保存逻辑、busy 状态和面板布局，没有收敛到一个共享的 host-shell 模式。
- 这会导致同类问题反复出现，例如左右面板固定宽度、保存态不统一、拖拽缺少键盘等价路径、异步动作缺少 busy/cancel 语义。参考 `docs/analysis/word-sql-code-report-designer-ui-interaction-review.md`。

第二，文档与实现存在明显漂移。

- `flow-designer` 当前公开基线已经收敛为只支持 `@xyflow/react`；如果代码里仍保留 `canvas-bridge` 命名或单一 `xyflow` kind，应视为实现边界，而不是多画布实现承诺。
- `code-editor` 文档声明了一些更完整的 schema 和能力，但当前实现里有些字段并未真正接线，例如 `resolveVariables()` / `resolveFunctions()` / `resolveTables()` 遇到 source ref 直接返回空数组，`onChange` 事件字段也没有通过 Flux 事件系统回调。参考 `packages/flux-code-editor/src/types.ts`、`packages/flux-code-editor/src/code-editor-renderer.tsx`、`docs/architecture/code-editor.md`。
- `report-designer` 的设计文档描述的是“spreadsheet + report semantics”的完整组合，但当前 `packages/report-designer-renderers/src/page-renderer.tsx` 还只是 report designer shell，本身并没有真正创建并组合 spreadsheet bridge/canvas。

第三，复杂控件的成熟度不一致，导致“平台已稳定”的错觉。

- `flow-designer` 已经是一个比较完整的模式样板。
- `report-designer` 还是“方向正确但集成未完成”。
- `word-editor` 仍然是一个自成体系的 React 工作台。
- `code-editor` 则是一个成熟度不错的字段级控件，而不是平台级设计器。

这说明当前框架不是“不合理”，而是“内核和复杂控件层成熟度不对齐”。

## 三、按复杂控件逐项评估

### 3.1 Flow Designer

`flow-designer` 是当前最接近“统一复杂控件架构模板”的实现。

已经落地的强项：

- 有真实的 domain core，而不是纯 UI demo。`packages/flow-designer-core/src/core.ts` 已经覆盖 graph document、selection、clipboard、undo/redo、dirty tracking、viewport、transaction 等核心能力。
- 有明确的 schema host shell。`packages/flow-designer-renderers/src/designer-page.tsx` 会创建 core、订阅 snapshot、注册 `designer` namespace、构造 host scope，并把 toolbar / inspector / dialogs region 绑定到同一个 action-scope 边界。
- 有明确的 host scope 注入。`packages/flow-designer-renderers/src/designer-context.ts` 里的 `buildDesignerScopeData()` / `useDesignerHostScope()` 已经把 `doc`、`selection`、`activeNode`、`activeEdge`、`runtime` 等能力暴露给 schema 片段。
- 有实际的 canvas bridge 和命令适配边界，而不是让 canvas 直接写 store。参考 `packages/flow-designer-renderers/src/designer-command-adapter.ts`、`packages/flow-designer-renderers/src/canvas-bridge.tsx`。

主要问题：

- 文档和代码仍需持续对齐，尤其是 runtime snapshot 落地状态、port/role 级约束能力，以及少量仍保留旧命名的实现边界。
- 当前最可复用的 host-shell / action-scope / bridge 模式还没有被抽成共享抽象，仍然是 flow-designer 自己内部的一套实现。

结论：

- `flow-designer` 不是问题最大的模块，反而是最值得作为统一抽象起点的模块。
- 如果后续要抽“复杂控件公共壳层”，最应该先从这里提炼。

### 3.2 Spreadsheet / Report Designer

这里必须拆成两层看。

先看 `spreadsheet`：

- `packages/spreadsheet-core/src/core.ts` 已经是一个相当扎实的文档编辑 runtime，覆盖 active sheet、selection、clipboard、find/replace、sheet 操作、undo/redo、dirty、transaction 等。
- `packages/spreadsheet-renderers/src/page-renderer.tsx` 和 `packages/spreadsheet-renderers/src/bridge.ts` 也已经具备了 namespaced action 和 host snapshot 的基本模式。

再看 `report-designer`：

- `packages/report-designer-core/src/core.ts` 的方向是对的。它没有把报表语义直接塞进 spreadsheet cell 结构，而是单独维护语义层、field source、inspector provider、preview/codec adapter，这个抽象方向是合理的。
- `packages/report-designer-renderers/src/bridge.ts` 甚至已经定义了 `ReportDesignerHostSnapshot extends SpreadsheetHostSnapshot`，这说明设计上已经在朝“spreadsheet 之上的语义层”演进。

但当前真正的问题也很明显：

- `packages/report-designer-renderers/src/page-renderer.tsx` 目前并没有实际组合 spreadsheet page/core/bridge/canvas，它更多是一个 schema shell，body 不存在时只能回退到 placeholder/fallback。
- 默认 toolbar 已经开始暴露 `report-designer:undo`、`report-designer:redo`、`report-designer:save`、`report-designer:stopPreview` 等动作，但 `packages/report-designer-core/src/commands.ts` 当前支持的命令集并不包含这些动作。这说明 report designer 壳层、toolbar 和 core 命令面还没有真正对齐。

结论：

- `report-designer` 的方向是对的，但它还不能算“稳定的完整产品架构”。
- 它当前更像“正确的二层抽象设计 + 尚未完成的组合实现”。

### 3.3 Code Editor

`code-editor` 的评价要和其他三个复杂控件分开。

它的强项：

- 它本身已经很好地复用了现有 Flux renderer/form/scope/action 能力。`packages/flux-code-editor/src/code-editor-renderer.tsx` 直接使用 `useCurrentForm()`、`useRenderScope()` 和 `props.helpers.dispatch(...)`，这说明它天然就是普通 renderer 体系里的一个高级字段，而不是另起炉灶的工作台。
- 它的“复杂度”主要来自 CodeMirror 6 扩展，而不是来自页面壳层、文档模型、canvas 交互或 designer action。参考 `packages/flux-code-editor/src/use-code-mirror.ts`、`packages/flux-code-editor/src/extensions/`。

它的主要问题不是抽象层次不对，而是“声明面大于实现面”：

- `packages/flux-code-editor/src/types.ts` 里定义了较多 schema 能力，但 source-ref 类数据并未真正解析，`onChange` 事件字段也没有走 Flux event handler 回调。
- `docs/architecture/code-editor.md` 的设计深度明显超前于当前实现，容易给人造成“已经 fully implemented”的错觉。

结论：

- `code-editor` 不应该被强行并入和 flow/report/word 同级的“统一设计器抽象”。
- 它更适合继续作为“高级字段控件”演进，只共享少量工作台能力，例如 fullscreen shell、busy 状态规范、变量浏览器交互规范等。

### 3.4 Word Editor

`word-editor` 目前是一个可用的独立工作台，但不是统一架构里的一员。

优点：

- `packages/word-editor-core/` 和 `packages/word-editor-renderers/` 的拆分本身是合理的，说明已经有“core 与 React 渲染层分离”的意识。
- `CanvasEditorBridge` 把底层 `canvas-editor` 库隔离在 bridge 后面，这个方向是对的。参考 `packages/word-editor-core/src/canvas-editor-bridge.ts`。
- E2E 覆盖相对完整，说明作为 playground feature 已经开始被持续打磨。参考 `tests/e2e/word-editor*.spec.ts`，以及相关 bug 文档 `docs/bugs/24-26-*.md`。

但它当前与主框架的关系基本是并行，而不是集成：

- `packages/word-editor-renderers/src/WordEditorPage.tsx` 直接自己创建 bridge、editor store、dataset store，并手工编排三栏布局和保存行为，没有进入 `SchemaRenderer` + namespaced action + host scope 的统一路径。
- 持久化也还停留在 `localStorage`，且 `packages/word-editor-core/src/document-io.ts` 已经提供了 `saveDatasets()` / `loadDatasets()`，但 page 层并未真正接线。

再结合 `docs/analysis/word-sql-code-report-designer-ui-interaction-review.md` 可以看到，Word Editor 当前遇到的问题大多也不是文档模型问题，而是典型的工作台壳层问题：

- 左右面板固定宽度
- 主点击与次级动作混杂
- 保存范围不统一
- 数据安全边界不清楚

结论：

- `word-editor` 现在更像“功能可用的独立工作台原型”，还不适合被视为统一框架下的稳定复杂控件实现。
- 它最需要共享的不是 graph/spreadsheet/document 抽象，而是 workbench shell、session/save/dirty、resource panel 交互规范、bridge 协议。

## 四、是否需要统一抽象

需要，但不应该做“大一统抽象”。

### 4.1 应该统一的部分

我认为需要统一的是下面这些横切层能力。

#### 1. Workbench Shell

所有复杂控件都在重复遇到相同问题：

- 左右面板折叠/展开
- 拖拽调宽与 reset
- 窄屏下的 fallback
- 主工作区优先级
- 固定 header / toolbar / statusbar 与滚动区隔离

这些能力应该抽成共享的 `WorkbenchShell` 或等价抽象，而不是让 `flow-designer`、`report-designer`、`word-editor` 各自重复实现。参考 `packages/flow-designer-renderers/src/designer-page.tsx`、`packages/word-editor-renderers/src/WordEditorPage.tsx`、`docs/analysis/word-sql-code-report-designer-ui-interaction-review.md`。

#### 2. Host Bridge 协议

复杂控件最值得统一的协议是：

```ts
interface DomainBridge<Snapshot, Command, Result> {
  getSnapshot(): Snapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: Command): Promise<Result> | Result;
}
```

当前仓库已经分别有相似实践：

- `spreadsheet-renderers/src/bridge.ts`
- `report-designer-renderers/src/bridge.ts`
- `flow-designer-renderers` 里虽然没有独立同名接口，但 `designer-page` + `designer-command-adapter` + `designer-context` 实际上已经形成了同类模式

如果把这个模式正式化，复杂控件的 host-shell、statusbar、save/dirty、debugger 接入都会更容易统一。

#### 3. Host Scope / Action Namespace 接线模式

`flow-designer` 已经证明了一条比较成熟的路径：

1. 页面级 renderer 创建 domain core
2. 订阅 snapshot
3. 注册 namespaced action provider
4. 构造 host scope
5. 把 toolbar / inspector / dialogs region 绑定到同一 host scope 与 action-scope

这个模式应该沉淀为共享做法，至少作为文档级规范，最好进一步变成可复用 helper。

#### 4. Session / Dirty / Save / Leave Guard 协议

这是目前最缺、也最值得统一的一层。

复杂控件都需要：

- dirty 状态
- save / autosave
- last saved time
- leave guard
- 多个修改域的可见边界，例如 `document` / `metadata` / `datasets` / `preview config`

现在这些问题在 `report-designer`、`word-editor`、甚至 `code-editor` 的 SQL execute / preview 场景中都在重复出现。参考 `docs/analysis/word-sql-code-report-designer-ui-interaction-review.md`。

#### 5. 资源面板交互规范

字段面板、变量面板、节点 palette、dataset 列表，其实属于同一类“资源浏览器”问题。

应该统一的不是数据结构，而是交互约束：

- 主点击做选中或插入
- 编辑/删除/更多菜单作为次级动作
- drag-and-drop 不能是唯一主路径
- 必须补键盘与 click-to-insert 等价入口

#### 6. 异步主动作的 busy / cancel 语义

SQL 执行、designer preview、import/export 这类异步主动作都需要统一约束：

- 执行中按钮 disable 或切为 stop
- 明确结果反馈
- 防重入
- 可取消时明确提供 cancel 语义

这类能力不属于某个具体 domain，适合作为 shared workbench 规范。

### 4.2 不应该统一的部分

下面这些部分不建议统一，否则会引入过度抽象。

#### 1. 不统一底层 document model

- graph document
- spreadsheet workbook
- word template document
- code editor text buffer

这些对象的结构、历史语义、性能瓶颈完全不同，不值得强行抽象成同一套文档模型。

#### 2. 不统一底层引擎

- `@xyflow/react`
- spreadsheet grid/canvas
- `@hufe921/canvas-editor`
- CodeMirror 6

这些引擎只是 domain adapter，不应该被包装成同一个“万能 editor engine”。

#### 3. 不把 `code-editor` 强行升格为 designer-page

`code-editor` 当前的价值恰恰在于它已经很好地复用通用 renderer runtime，而不是另起一套工作台平台。强行统一只会增加 ceremony。

## 五、我对后续演进的意见

### 5.1 优先级最高的不是“继续加功能”，而是“收敛复杂控件平台协议”

如果继续按现在的方式分别推进 flow/report/word，很容易出现：

- 每个模块都能跑
- 每个模块也都有各自的壳层
- 但长期维护成本越来越高

所以接下来更高杠杆的工作不是加更多 designer feature，而是收敛共享协议。

### 5.2 推荐的收敛顺序

#### 第一步：把 Flow Designer 现有模式抽象成共享基线

优先提炼下面三样东西：

- host shell 接线模式
- host scope 数据暴露模式
- namespaced action provider 注册模式

`flow-designer` 目前是这方面最成熟的实现样板。

#### 第二步：先修复文档与实现漂移

我认为这不是“文档问题”，而是稳定性问题。

建议优先校正：

- `flow-designer` adapter / runtime snapshot 文档与真实代码
- `code-editor` schema 声明面与真实实现面
- `report-designer` 文档里的目标态与当前落地态边界

否则后续抽共享抽象时会建立在错误基线上。

#### 第三步：让 Report Designer 真正建立在 Spreadsheet 之上

当前 `report-designer` 的设计是对的，但 page 层组合还没有完成。

在真正抽共享复杂控件层之前，最好先把 `report-designer-page` 做成真实的“spreadsheet host + report semantic layer”组合，而不是继续停留在 shell + fallback。

#### 第四步：把 Word Editor 向共享 workbench 协议靠拢，但不要一次性硬迁到 schema-driven

对 `word-editor` 更现实的做法是两步走：

1. 先接入共享 `WorkbenchShell`、dirty/save/leave-guard、resource panel 规范
2. 再逐步考虑 toolbar / inspector / dialogs 是否需要转为 schema fragments

这样风险更低。

#### 第五步：保持 Code Editor 的轻量定位

`code-editor` 更适合继续做“字段控件 + 可选增强工作台”的路线。

它需要补齐的是：

- source-ref 真正解析
- schema/event 接线完整性
- fullscreen / busy / variable-browser 交互规范

而不是引入新的 designer-core。

## 六、最终判断

如果问题是：这个框架“目前设计是否合理”？

我的判断是：合理，而且核心方向是对的。

如果问题是：这个框架“是否已经足够稳定，可以认为复杂控件平台层也基本定型”？

我的判断是：还不够。

更准确的说法应该是：

- 通用 schema runtime 基线已经基本成立。
- 复杂控件平台基线还需要一次抽象收敛。

最值得做的统一抽象，不是统一 graph/spreadsheet/word/code 的内部模型，而是统一：

- workbench shell
- host bridge
- host scope + namespaced action 接线
- dirty/save/leave-guard/session 协议
- 资源面板与异步动作的交互规范

这套统一一旦补上，`flow-designer`、`report-designer`、`word-editor` 会明显更容易维护；`code-editor` 也能受益，但不需要被强行并入同一种 designer 平台。

## 参考

- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/flow-designer/design.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/code-editor.md`
- `docs/references/complex-component-design-process.md`
- `docs/analysis/word-sql-code-report-designer-ui-interaction-review.md`
- `packages/flow-designer-core/src/core.ts`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-context.ts`
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`
- `packages/spreadsheet-core/src/core.ts`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/spreadsheet-renderers/src/bridge.ts`
- `packages/report-designer-core/src/core.ts`
- `packages/report-designer-core/src/commands.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/bridge.ts`
- `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts`
- `packages/flux-code-editor/src/code-editor-renderer.tsx`
- `packages/flux-code-editor/src/types.ts`
- `packages/word-editor-renderers/src/WordEditorPage.tsx`
- `packages/word-editor-core/src/document-io.ts`
