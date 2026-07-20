# Diff View 组件设计

## 1. 组件定位

- `diff-view` 是只读文本差异对比展示 renderer，用于比较两个版本的内容。
- 它服务于合同版本对比（纯文本/条款）、EDI 报文差异对比（XML/JSON）、配置版本变更审查、审批单据变更快照展示。
- 不参与表单 value/validation 通道，只读展示组件。

## 2. 与 AMIS 或既有产品的能力对照

- AMIS 无原生 diff view 组件。`code-editor` 的 `diffValue` 模式基于 CodeMirror MergeView，面向代码编辑场景（并排双窗格，右侧可编辑），不适用于只读展示场景。
- 业界参考：
  - **git-diff-view**（MIT）：核心模型（`DiffFile`） + 多框架适配器架构。支持 split/unified 视图、语法高亮（lowlight/shiki 可插拔）、字符级 inline diff（fast-diff/relativeChanges）、预渲染 HTML 模板、hunk 展开/折叠。
  - **react-diff-view**（MIT）：parseDiff → Token Pipeline → 渲染的管线架构。使用 gitdiff-parser + refractor(Prism) + diff-match-patch。
- Flux `diff-view` 结合两者优点：采用 git-diff-view 的 `DiffFile` 模型作为 UI 无关的数据层，参考 react-diff-view 的令牌管道作为渲染策略。
- 当前未注册，需新增 renderer 到 `flux-renderers-content`。

## 3. Flux 中的 renderer/type 定义

- `type: 'diff-view'`
- `sourcePackage: '@nop-chaos/flux-renderers-content'`
- `wrap: true`
- 不属于 field renderer（不参与 form 的 value/validation 通道），属于 content 包只读展示组件。
- 不新增 `diff-view-split`、`diff-view-unified` 等平级 type；视图差异统一由 `viewType` 驱动。

## 4. schema 设计

```ts
interface DiffViewSchema extends BaseSchema {
  type: 'diff-view';
  oldContent?: string;
  newContent?: string;
  language?: string;
  viewType?: 'split' | 'unified';
  showLineNumbers?: boolean;
  /** Whether to show character-level inline diff highlighting. Default true. */
  showInlineDiff?: boolean;
  /** Number of consecutive unchanged lines before collapsing a hunk. 0 or negative disables collapse. Default 10. */
  defaultCollapsedLines?: number;
  wrapLines?: boolean;
  onMount?: ActionSchema;
  onUnmount?: ActionSchema;
  events?: {
    onLineClick?: ActionSchema;
    onHunkExpand?: ActionSchema;
  };
}
```

字段说明：

- `oldContent` — 旧版本内容字符串。与 `newContent` 配对作为输入，组件内部使用 diff 库计算差异。
- `newContent` — 新版本内容字符串。两者同时提供时触发 diff 计算；只提供一侧时或两者相等时显示无差异态。
- `language` — 语法高亮语言标识（可选）。枚举值同 `code-editor` 的 `EditorLanguage`：`json`、`xml`、`javascript`、`typescript`、`html`、`css`、`sql`、`yaml`、`markdown`、`plaintext`。不提供时不进行语法高亮，仅差异着色。
- `viewType` — 视图模式。`'split'`（并排分栏，默认）、`'unified'`（统一单栏）。
- `showLineNumbers` — 是否显示行号。默认 `true`。
- `showInlineDiff` — 是否显示字符级内联差异高亮。默认 `true`。
- `defaultCollapsedLines` — 长 hunk 折叠阈值。连续无变更行超过此值时折叠，默认 `10`。设为 `0` 或负数时不折叠。
- `wrapLines` — 是否自动换行。默认 `false`（水平滚动）。
- `onLineClick` — 行单击事件。payload `{ lineNumber, side: 'old' | 'middle' | 'new', type: 'add' | 'delete' | 'context' }`。
- `onHunkExpand` — hunk 展开/折叠事件。payload `{ hunkIndex, expanded }`。

## 5. 字段分类

- `oldContent`、`newContent`、`language`、`viewType`: `props`
- `showLineNumbers`、`defaultCollapsedLines`、`wrapLines`: `props`
- `id`、`className`、`disabled`、`visible`、`hidden`: `meta`（继承 BaseSchema 元数据通道）
- `onMount`、`onUnmount`: `meta`（继承 BaseSchema 生命周期动作）
- `onLineClick`、`onHunkExpand`: `event`（ActionSchema 事件入口）

## 6. regions 与 slot 约定

- `diff-view` 不开放自由 regions。
- 空态、无差异态、加载态属于组件内部展示 surfaces，不暴露为外部 slot。

## 7. 运行期状态归属

- `viewType` 切换（split ↔ unified）：`local`（组件内 toggle，不影响 schema；也可通过 `component:toggleViewType` 动作切换）。
- hunk 展开/折叠态：`local`（每个 hunk 独立记忆 `isHidden`）。
- diff 计算结果：`local`（内部模型层缓存，不暴露到运行时 scope）。

## 8. 事件、动作与组件句柄能力

- `onLineClick` — 行单击事件，接入 Flux 事件系统。payload 包含行号、所在侧、变更类型。
- `onHunkExpand` — hunk 展开或折叠的事件通知。
- `onMount` — 组件挂载完成后触发。
- `onUnmount` — 组件卸载前触发。
- 组件句柄（`componentCapabilityContracts`）：
- `component:toggleViewType` — 在当前 `viewType` 和另一模式间切换。失败路径：`not-mounted`、`not-visible`
- `component:setViewType` — 显式设置 `viewType`，args `{ viewType: 'split' | 'unified' }`。失败路径：`not-mounted`、`not-visible`、`invalid-viewType`
- `component:expandAll` — 展开所有折叠 hunk。失败路径：`not-mounted`、`not-visible`、`nothing-collapsed`
- `component:collapseAll` — 折叠所有 hunk（回到 `defaultCollapsedLines` 长折叠）。失败路径：`not-mounted`、`not-visible`、`nothing-expandable`

## 9. 数据源、表达式、导入能力接入点

- `loadAction?: ActionSchema` — schema 层数据加载主入口，走 runtime.dispatch() 而非独立 fetch。复杂数据场景通过 data-source 节点声明。
- `oldContent`、`newContent` 可来自任意表达式结果（`"${...}"`）或 source-enabled value。
- 响应式更新：绑定 scope 值变化时重新计算 diff 并刷新视图（非 mount 快照）。
- oldContent/newContent 变更时 150ms debounce 触发 diff 重计算和语法高亮重生成，避免高频 scope 更新导致连续重复 diff。
- `language` 也可来自表达式，用于运行时根据内容类型动态指定高亮语言。
- renderer 不持有 `src`/fetch 能力；远程内容由外层 source/loader 注入。

## 10. 样式与 DOM marker 约定

`className`、`classAliases` 继承自 BaseSchema，用于覆写根节点样式。`classAliases` 短名→Tailwind 串映射由宿主应用配置。

- 差异行 marker 约定：

| 行类型       | DOM marker                 |
| ------------ | -------------------------- |
| 删除行（旧） | `data-diff-type="delete"`  |
| 新增行（新） | `data-diff-type="add"`     |
| 上下文行     | `data-diff-type="context"` |
| hunk 头      | `data-diff-type="hunk"`    |
| 左侧 gutter  | `data-diff-gutter="old"`   |
| 右侧 gutter  | `data-diff-gutter="new"`   |

- inline diff（字符级变更）在 `<span>` 上使用 `data-diff-inline="add"` / `data-diff-inline="delete"` 标记。

- 根节点保留 `nop-diff-view` marker。视图状态通过 `data-view="split"` / `data-view="unified"` 标记，差异行类型通过 `data-diff-type` 标记（add/delete/context/hunk）。行内差异使用 `data-diff-inline="add"` / `data-diff-inline="delete"`。hunk header 使用 `data-slot="diff-hunk-header"`，gutter 使用 `data-slot="diff-gutter"`。hunk 展开/折叠使用 `data-expanded="true|false"`。
- Test anchor 优先顺序：getByRole > data-slot > .nop-\* > data-testid。
- viewType 切换使用 CSS Grid 栅格转换 + 150ms ease-out 过渡（split↔unified 时列宽从 1fr 1fr → 1fr）。hunk 展开/折叠使用 max-height + opacity 过渡 200ms ease-in-out，由 overflow: hidden 裁剪。
- diff 行 hover 时行背景变为 #f8fafc（add/delete 行保留原色底 + hover 叠加层），hunk header hover 显示指针 + 背景加深 5%。

## 11. 实现拆分建议

```
packages/flux-renderers-content/src/diff-view/
  index.ts                    # renderer 注册入口
  diff-view-renderer.tsx       # 主组件（type: diff-view）
  diff-view.types.ts           # DiffViewSchema 类型定义
  model/
    diff-file.ts               # DiffFile 核心模型（UI 无关，参考 git-diff-view DiffFile）
    diff-parse.ts              # GNU unified diff 解析器（输入→IRawDiff[]）
    diff-inline.ts             # 字符级 inline diff 计算（diff-match-patch 或 fast-diff）
  adapters/
    syntax-highlight.ts        # 语法高亮适配器接口 + 实现（lowlight > shiki 作为默认轻量方案）
  components/
    diff-split-view.tsx        # 分栏视图容器
    diff-unified-view.tsx      # 统一视图容器
    diff-hunk.tsx              # Hunk 容器（展开/折叠控制器）
    diff-line.tsx              # 差异行渲染（模板预渲染 HTML）
    diff-gutter.tsx            # 行号列
    diff-header.tsx            # 文件头部（文件名、统计信息）
    diff-virtual-list.tsx      # 虚拟滚动列表容器
  utils/
    diff-template.ts           # 预渲染 HTML 模板生成
    diff-stats.ts              # diff 统计计算（新增行数、删除行数）
```

**层级依赖**：`model/` 不依赖 React，可独立测试；`components/` 依赖 `model/` 的 `DiffFile` 实例。

**渲染策略**：

- 差异行使用预渲染 HTML 模板（参考 git-diff-view 的 `plainTemplate`/`syntaxTemplate`），通过 `dangerouslySetInnerHTML` 插入，避免 React JSX 处理大量行节点。
- 语法高亮作为可插拔适配器（`syntax-highlight.ts`），默认使用 `lowlight`（基于 refractor/Prism，轻量），需额外依赖时通过动态 import 延迟加载。
- inline diff 使用 `diff-match-patch` 计算字符级变更，在模板中生成带背景色的 `<span>`。
- DiffLine 组件使用 React.memo（比较 line content + type + inline diff tokens 引用），DiffHunk 使用 React.memo（按 hunk index + isHidden 状态）。整个 diff 行列表通过 useMemo 缓存 parse + inline diff 计算结果，仅 oldContent/newContent/language 三引用变化时重建。

## 12. 风险、取舍与后续阶段

- **大 diff 性能**（风险）：1000 行以上的大 diff，React 渲染和重排压力显著。后续阶段需引入虚拟滚动（virtual scrolling），仅渲染可视区域的 diff 行。
- 首版引入动态虚拟化策略（virtualizationThreshold=500 行），利用固定行高（24px）避免测量 + 二阶段渲染（dangerouslySetInnerHTML 模板在虚拟列表 rows 中仍可用）。低于阈值走全量 DOM 渲染。
- **语法高亮依赖体积**（取舍）：`lowlight` + 语言包约 50KB gzip，`shiki` 更大。首版采用 `lowlight` 为默认，语法高亮作为可选能力（`language` 非空时启用）；不期望用户为纯文本 diff 承担高亮库代价。
- **diff 库选择**（取舍）：`diff-match-patch` 算法准确（字符级差异精确到删除和插入），但实现较重（Google 维护的 Java 移植版）。`fast-diff` 更轻量但精度略低。首版使用 `diff-match-patch` 保证准确性，后续若发现性能瓶颈可替换为 `fast-diff`（接口层抽象隔离后可互换）。
- **模板注入 XSS**（风险）：`dangerouslySetInnerHTML` 使用预渲染模板时必须确保内容经 HTML 转义处理（`&` → `&amp;`、`<` → `&lt;`、`>` → `&gt;`），只在差异高亮 `<span>` 等安全位置插入受控 HTML 结构。
- **无编辑能力**（推延）：diff-view 定位只读，不支持双方编辑后实时重新 diff。编辑态 diff 应使用 `code-editor` 的 `diffValue` 模式。
- **widget/注解系统**（推延）：react-diff-view 的 `widgets` 系统（可附加自定义 React 节点到特定行）在当前阶段不实现。后续如有审批批注等需求可追加。

### §12.1 三栏对比视图设计要点（v3）

三栏对比（3-pane）用于合并冲突的可视化解决、三方版本比较等高级场景。

**布局结构**：

```
[ 旧版本 (old) ] [ 基版本 (middle) ] [ 新版本 (new) ]
```

- `old`：原始版本或合并基准的左侧版本
- `middle`：共同祖先基版本（3-way merge 的 base）
- `new`：目标版本或合并基准的右侧版本

**Schema 扩展**：

```typescript
interface DiffViewSchema extends BaseSchema {
  // ... 既有字段
  middleContent?: string; // 基版本内容（三栏视图时必需）
}
```

触发三栏模式的逻辑：当 `oldContent`、`middleContent`、`newContent` 三者均非空时，自动启用 3-pane 布局。否则保持双栏或单栏模式。

**3-way merge 冲突可视化**：

- 三栏中每对 diff 计算结果独立：old↔middle 和 middle↔new
- 冲突区域（两对 diff 交集不同）以红色背景高亮，并显示标准冲突标记：

```html
<div class="nop-diff-conflict-marker">
  <div class="nop-diff-conflict-left"><<<<<<<</div>
  <div class="nop-diff-conflict-middle">=======</div>
  <div class="nop-diff-conflict-right">>>>>>>></div>
</div>
```

- **差异导航**：左右区域提供"上一处差异" / "下一处差异"导航按钮（↑↓ 箭头）
- 导航按钮计算并跳转到所有差异位置（行号），滚动到对应行并闪烁高亮 500ms

**实现参考**：架构参考 `git-diff-view` + `react-diff-view`，冲突标记渲染参考 Git 的合并冲突格式标准。DiffLine 类型增加 `conflict-start` / `conflict-separator` / `conflict-end` 三种新行类型。

### §12.2 跨文件 diff 引用设计要点（v4）

当 diff 涉及多个文件时（如版本发布涉及多个配置变更、合同版本包），提供文件级导航和切换。

**布局结构**：

```
[文件列表侧栏] [当前文件 diff 主区域]
```

文件列表侧栏（~240px 宽）：

- 列出所有 DiffFile，每项显示：文件名 + 变更统计（+N / -M）
- 文件名支持搜索过滤（通过文件名字段 `input-filter`）
- 按变更类型分组：全部 / 新增 / 删除 / 修改
- 未读变更标记（蓝色圆点），点击后变灰

**Schema 扩展**：

```typescript
interface DiffViewSchema extends BaseSchema {
  // ... 既有字段
  files?: DiffFileMeta[]; // 多文件列表
  activeFileIndex?: number; // 当前查看的文件索引
}

interface DiffFileMeta {
  fileName: string; // 文件名（含路径）
  oldContent?: string;
  newContent?: string;
  language?: string;
  status: 'added' | 'modified' | 'deleted';
}
```

**文件切换**：点击文件列表项时，主区域切换到对应文件的 diff 视图。切换时 viewType（split/unified）、行号显示等配置保持不变。切换动画使用水平滑动过渡 200ms。

**参考**：GitHub PR files changed 模式的实现思路——文件列表作树形导航，diff 内容按文件分组渲染，每个文件独立计算差异。Flux 版本简化为平铺文件列表（不支持目录树展开/折叠），但预留 tree 模式扩展空间。

跨文件 diff 引用需在 roadmap-scheduling.md 中补充对应 work item（当前 S9 未包含此功能）。此处的设计供后续扩展参考。

`files` 字段与 `oldContent/newContent` 互斥——当提供 `files` 时忽略 `oldContent/newContent`，反之亦然。
