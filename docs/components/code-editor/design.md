# Code Editor 组件设计

## 1. 组件定位

- `code-editor` 是基于 CodeMirror 6 的字段级代码编辑组件。
- 它服务于表达式编辑、SQL 编辑、JSON/JS/TS/HTML/CSS 文本编辑等字段场景。
- 它不是平台级设计器宿主，不拥有 host scope、session、leave-guard 或 workbench shell。

## 2. 与 AMIS 或既有产品的能力对照

- 相比 AMIS 旧 editor/input-formula 组合，Flux 的 `code-editor` 目标是把语言模式、补全、lint、变量源、SQL schema、snippet、预览等能力统一到一个组件协议中。
- 当前仓库已落地：
  - `CodeEditorSchema` 类型
  - `useCodeMirror` hook
  - `code-editor` renderer 注册
  - expression / sql / json / javascript / typescript / html / css / plaintext 模式
  - 变量/函数/表结构的内联值、scope 引用，以及 authoring 层匿名 `SourceSchema` 输入
  - change/focus/blur 事件接入 Flux 事件系统
  - SQL format / snippets / variable panel / execution preview

### Flux 决策表

> 语言模式契约见 §4（12 语言：expression/sql/json/javascript/typescript/html/css/plaintext/python/yaml/xml/markdown）。

| 能力                                                                                                       | 决定                                | 理由                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8 语言（expression/sql/json/javascript/typescript/html/css/plaintext）                                     | **实现**                            | 当前基线（见 §4 语言模式列表）                                                                                                                                                                                                                                                                                                                |
| 4 新增语言（python/yaml/xml/markdown，E2h）                                                                | **实现**                            | E2h 增量：原生 `@codemirror/lang-{python,markdown,yaml,xml}` 全部 npm 可用，无降级                                                                                                                                                                                                                                                            |
| 3 模式（expression/template/code）                                                                         | **实现**                            | 当前基线                                                                                                                                                                                                                                                                                                                                      |
| `width`/`height`/`lineNumbers`/`folding`/`autoHeight`/`allowFullscreen`/`editorTheme`/`options`/`readOnly` | **实现**                            | 当前基线                                                                                                                                                                                                                                                                                                                                      |
| `onChange`/`onFocus`/`onBlur`                                                                              | **实现**                            | 当前基线；接入 Flux 事件系统                                                                                                                                                                                                                                                                                                                  |
| SQL 模式全功能（tables/dialects/completion/format/snippets/variable panel/执行预览）                       | **实现**                            | 当前基线                                                                                                                                                                                                                                                                                                                                      |
| 全屏切换                                                                                                   | **实现**                            | 当前基线                                                                                                                                                                                                                                                                                                                                      |
| diff 编辑器模式（并排 `diffValue`）                                                                        | **实现**                            | E2h：基于 `@codemirror/merge` `MergeView`；`diffValue` 有值（含空串）时切换并排双窗格（左=原文 readOnly，右=`value` 可编辑）；DOM marker `data-diff`                                                                                                                                                                                          |
| 只读代码高亮显示（colorize）                                                                               | **计划实现（E2h）→ deferred to E3** | 当前 text 是纯 String()；colorize 是独立只读渲染范式（不需 EditorView），架构与 editor 主体不同；deferred to E3 optimization candidate                                                                                                                                                                                                        |
| 语言预设扩展（按需加 python/yaml/xml/markdown 等高频）                                                     | **实现**                            | E2h：12 语言契约（8 既有 + 4 新增）                                                                                                                                                                                                                                                                                                           |
| `editorDidMount` 句柄（原始 editor 句柄）                                                                  | **实现**                            | E2h：`onEditorMount` 事件（payload `{ editorId }`，fire-and-forget）+ `component:getEditorView` 句柄（同步返回 EditorView，命令式访问）                                                                                                                                                                                                       |
| `doAction` clear/reset/focus                                                                               | **实现**                            | E2h：`component:clear`/`reset`/`focus` 三个 capability contracts（对齐 form `component:submit` 命名风格；X1 统一时回头对齐）。**X1 naming audit 裁定**：保持现状（已是 Flux 标准 vocabulary，`clear`/`reset`/`focus` 与 `docs/references/component-handle-vocabulary.md` 完全一致，无需 non-breaking rename）。收口 E2h watch-only residual。 |
| per-language renderer 类型（`{lang}-editor`）                                                              | **暂不实现**                        | 强制单 type + `language` prop，不注册平级 renderer type                                                                                                                                                                                                                                                                                       |
| minimap                                                                                                    | **暂不实现**                        | 字段级编辑器低频                                                                                                                                                                                                                                                                                                                              |
| amis `size` 预设                                                                                           | **暂不实现**                        | 已有 width/height 精确控制                                                                                                                                                                                                                                                                                                                    |
| amis `mobileUI`（响应式）                                                                                  | **不采纳**                          | 走响应式（见 mobile-roadmap），不引入双实现标志位                                                                                                                                                                                                                                                                                             |

## 3. Flux 中的 renderer/type 定义

- `type: 'code-editor'`
- `sourcePackage: '@nop-chaos/flux-code-editor'`
- `wrap: true`
- validation contributor: `kind: 'field'`、`valueKind: 'scalar'`
- 不新增 `sql-editor`、`expression-editor` 等平级 renderer type；语言差异统一由 `language` 驱动。

## 4. schema 设计

```ts
interface CodeEditorSchema extends BaseSchema {
  type: 'code-editor';
  language: EditorLanguage;
  mode?: EditorMode;
  value?: string;
  diffValue?: string;
  placeholder?: string;
  width?: number | string;
  height?: number | string;
  lineNumbers?: boolean;
  folding?: boolean;
  autoHeight?: boolean;
  allowFullscreen?: boolean;
  expressionConfig?: ExpressionEditorConfig;
  sqlConfig?: SQLEditorConfig;
  editorTheme?: 'light' | 'dark';
  options?: Record<string, unknown>;
  onChange?: ActionSchema;
  onFocus?: ActionSchema;
  onBlur?: ActionSchema;
  onEditorMount?: ActionSchema | ActionSchema[];
}
```

语言模式：

- `expression`
- `sql`
- `json`
- `javascript`
- `typescript`
- `html`
- `css`
- `plaintext`
- `python`（E2h 新增，`@codemirror/lang-python@^6.2.1`）
- `yaml`（E2h 新增，`@codemirror/lang-yaml@^6.1.3`）
- `xml`（E2h 新增，`@codemirror/lang-xml@^6.1.0`）
- `markdown`（E2h 新增，`@codemirror/lang-markdown@^6.5.0`）

E2h 新增字段：

- `diffValue?: string`：原文文本。当 `typeof diffValue === 'string'`（含空串）时，渲染器切换到 CodeMirror 6 `MergeView`（并排双窗格 diff），左侧为 `diffValue`（原文，readOnly），右侧为 `value`（当前编辑值，可编辑）。省略（`undefined`）时渲染标准单 editor。
- `onEditorMount?: ActionSchema | ActionSchema[]`：editor mount 完成后触发的动作（fire-and-forget）。payload：`{ editorId: string }`。EditorView 不可序列化，因此事件仅通知 mount 完成；如需命令式访问 EditorView 实例，使用 `component:getEditorView` 句柄。

## 5. 字段分类

- `label`: `value-or-region`
- `language`、`mode`、`value`、`diffValue`、`placeholder`、`width`、`height`: `value`
- `lineNumbers`、`folding`、`autoHeight`、`allowFullscreen`、`editorTheme`、`options`: `value`
- `expressionConfig`、`sqlConfig`: `value`
- `onChange`、`onFocus`、`onBlur`、`onEditorMount`: `event`

## 6. regions 与 slot 约定

- `code-editor` 不开放自由 regions。
- 变量面板、SQL 结果预览、snippet 面板等属于组件内部 feature surface，不是外部 schema regions。
- 如果后续需要更复杂外壳，应通过外部容器/field chrome 组合，而不是把字段级编辑器升级成宿主页面。

## 7. 运行期状态归属

- 编辑值归 form runtime 或当前 owner scope。
- 编辑器实例状态、光标、选择、自动补全弹层、只读切换等属于组件内部运行时状态。
- SQL 执行结果预览属于组件内 feature state，不提升为新的 page/host 级协议。

## 8. 事件、动作与组件句柄能力

- `onChange`、`onFocus`、`onBlur`、`onEditorMount` 通过 Flux 事件系统接线。
- `RendererDefinition` 当前也发布同名 `eventContracts`，并为 `language`、`mode`、`expressionConfig`、`sqlConfig`、`diffValue`、fullscreen/theme/layout props 提供 `propContracts`，所以 authoring discovery 面与 live renderer contract 保持一致。
- `onChange` 在 form context 中应走 `currentForm.setValue(name, newValue)`，无 form 时走 `scope.update(name, newValue)`。
- `onEditorMount`（E2h）：editor mount 完成后触发（fire-and-forget），payload `{ editorId: string }`。事件只通知 mount 完成；EditorView 不可序列化，命令式访问走 `component:getEditorView` 句柄。
- E2h 组件句柄（`componentCapabilityContracts`，对齐 form `component:submit` 命名风格）：
  - `component:clear`：清空 editor 内容（dispatch `{ from: 0, to: doc.length, insert: '' }`），触发 onChange。
  - `component:reset`：恢复 editor 到 initialValue（mount 时捕获的 value）。
  - `component:focus`：`editorView.focus()`。
  - `component:getEditorView`：同步返回 EditorView 实例（不透明句柄，result shape `unknown`——不可序列化）。
- 组件可以长期提供局部 imperative capability，但不应演化成 namespaced host action owner。
- X1 doAction 命令族统一后，`component:clear/reset/focus` 命名可能统一调整（non-breaking rename，归 `Deferred But Adjudicated`）。

## 9. 数据源、表达式、导入能力接入点

- expression 模式支持变量源、函数源的内联配置、`scope` 引用，authoring 层也允许在这些深层配置位置直接写匿名 `SourceSchema`。
- SQL 模式支持表结构、变量面板、执行预览等配置；其中动态表结构/变量同样允许在 authoring 层直接写匿名 `SourceSchema`，而不是 code-editor 私有 `loadAction` 包层。
- 这些 nested source 由框架在 renderer 之前统一解析并回填到原始 props 路径。`code-editor` renderer 最终只接收 resolved arrays / plain config，不感知 source lifecycle、loading transport 或私有中转字段。
- `code-editor` 不拥有平台级导入/bridge/session 协议。

## 10. 样式与 DOM marker 约定

- 根节点保留稳定 marker，例如 `nop-code-editor`。
- 编辑器容器遵循 field-level renderer 的样式契约，不引入工作台级 layout 假设。
- 全屏能力仍属于组件 feature，不意味着它是平台宿主。
- fullscreen close button 与 variable-panel copy/insert actions 属于组件内 chrome；当前 live baseline要求这些 action labels 接入现有 `flux.codeEditor` locale 命名空间，而不是继续硬编码英文。
- CodeMirror 的真实 focus target 是内部 `.cm-content`，因此字段级可访问性语义不能只停留在外层 wrapper。当前 live baseline要求 `useCodeMirror` 通过 `EditorView.contentAttributes` 把 `aria-describedby`、`aria-errormessage`、`aria-invalid` 等状态桥接到 `.cm-content`，这样字段错误与屏幕阅读器读出的编辑面保持一致。
- 当前 live baseline下，code-editor 默认 chrome token 不再写死浅色 rgba/hex 调色板；toolbar/header/variable-panel/result 等包级视觉默认从共享 semantic tokens（`--background`、`--foreground`、`--muted*`、`--accent`、`--border`、`--ring`）派生，所以 host 主题变量会在默认路径上直接生效，而 `editorTheme` 只负责编辑器内核/显式暗色覆盖路径。

## 11. 实现拆分建议

```text
packages/flux-code-editor/src/
  index.ts
  types.ts
  use-code-mirror.ts
  code-editor-renderer.tsx
  code-editor-renderer/
    shared.ts
    toolbar-button.tsx
    snippet-panel.tsx
    sql-editor-assembly.tsx
    sql-editor-toolbar.tsx
    sql-editor-body.tsx
    use-code-editor-binding.ts
    use-sql-editor-state.ts
  source-resolvers.ts
  variable-panel.tsx
  sql-result-panel.tsx
  extensions/
    base.ts
    sql/
      index.ts
      completion.ts
      format.ts
    expression/
      completion.ts
      decoration.ts
      linter.ts
      template-mode.ts
```

- language extension、completion source、lint、SQL format/snippet/preview feature 应分离维护。
- React 壳层只负责 renderer integration 和 hook bridge，不要把 CM6 feature logic 重新堆进 renderer 文件。
- `extensions/` 目录只承载 CodeMirror 语言扩展、completion、lint、decoration、template mode 这类编辑器内核能力。
- SQL execution、toolbar action、snippet dropdown、variable panel、result preview 等 renderer/UI feature 不属于 `extensions/`；它们应留在 `code-editor-renderer/` 或其他明确的 feature 目录中。
- `code-editor-renderer.tsx` 只保留通用 renderer 壳、props 解析和语言特化装配；不要在该文件中长期堆积 SQL/Expression 细节分支。
- 语言特化通过 `language` 分发到 `sql`、`expression` 等专属模块，不通过新增 renderer type 达成。

## 11.1 目录边界约束

- `code-editor-renderer.tsx`: 统一入口，负责 field renderer 接线、通用布局壳、以及按 `language` 选择特化装配。通过 `useSQLEditorSlots` hook 将 SQL 特定渲染委托给 `sql-editor-assembly.tsx`，不在入口文件中直接处理 SQL toolbar/variable/result-panel 分支。
- `code-editor-renderer/`: 放 renderer 侧 hook、toolbar/body 组装、SQL result preview、SQL variable panel 联动等 React/UI feature。SQL-only 子组件使用 `sql-editor-*` 前缀明确标识职责。
- `code-editor-renderer/sql-editor-assembly.tsx`: SQL 语言特化渲染入口，聚合 `useSQLEditorState`、`useResolvedSQLVariables`、`SQLEditorToolbar`、`SQLEditorBody` 等 SQL 专属模块。
- `code-editor-renderer/sql-editor-toolbar.tsx`: SQL 专属工具栏（format/snippet/variable toggle/execute/fullscreen），不再伪装为通用 toolbar。
- `code-editor-renderer/sql-editor-body.tsx`: SQL 专属编辑器主体（CodeMirror 容器 + variable panel 侧栏），不再伪装为通用 body。
- `code-editor-renderer/snippet-panel.tsx`: SQL snippet 下拉面板 React UI 组件，从 `extensions/` 迁出以确保 `extensions/` 只包含 CodeMirror 逻辑。
- `extensions/sql/`、`extensions/expression/`: 放语言级 CodeMirror 扩展与补全/lint/decoration 逻辑。`extensions/sql/index.ts` 只导出 CodeMirror 能力（completion source、format），不导出 React UI 组件。
- `source-resolvers.ts`: 放 schema 已解析后的 plain config 读取与 scope 引用解析；不承担 UI 组装职责。
- 如果某个模块主要产出 React 节点、按钮交互、面板显示状态，它就不应放入 `extensions/`。

## 11.2 禁止事项

- 不为 SQL 再引入独立 `sql-editor` 组件协议、schema type、renderer 注册项。
- 不把 SQL toolbar、snippet 面板、执行预览等 UI feature 伪装成 CodeMirror extension 塞进 `extensions/`。
- 不在 `code-editor-renderer.tsx` 中继续扩大跨语言条件分支，导致 renderer 壳层同时承担通用逻辑和所有语言细节。

## 12. 当前实现基线

当前已落地：

- `CodeEditorSchema` 类型定义
- `useCodeMirror` hook + `useMergeView` hook（E2h 新增，diff 模式）
- `useCodeEditorHandle` hook（E2h 新增，组件句柄 clear/reset/focus/getEditorView）
- `code-editor-renderer.tsx` 接入 `language`、`mode`、`placeholder`、`lineNumbers`、`folding`、`autoHeight`、`editorTheme`
- 12 语言支持（E2h 增量）：expression/sql/json/javascript/typescript/html/css/plaintext（8 既有）+ python/yaml/xml/markdown（4 新增，全部原生 npm 包，无降级）
- diff 编辑器模式（E2h 新增）：`diffValue` 有值时切换到 `@codemirror/merge` `MergeView`（左=原文 readOnly，右=`value` 可编辑），DOM marker `data-diff`
- `onEditorMount` 事件（E2h 新增）：editor mount 完成后触发，payload `{ editorId }`
- `component:clear`/`reset`/`focus`/`getEditorView` 句柄（E2h 新增）
- 4 个 resolver hooks：变量、函数、表结构、SQL 变量；它们只消费 inline values 或 `scope` 引用。nested anonymous `SourceSchema` 的解析由 `flux-react` 在 renderer 前统一完成，而不是由 code-editor renderer/hook 自己处理 remote/source transport
- change/focus/blur 事件与 Flux 表单/事件系统对齐
- SQL 增强：format、snippets、variablePanel、execution preview

当前仍属于未来可选扩展：

- custom lint rules
- CM6 compartment 热替换
- friendly-name decorations 的完整实现
- 更多 builtin function-set 过滤策略
- colorize 只读代码高亮（deferred to E3）
- diff 模式的 `readOnlyOriginal` 配置（左侧原文是否可编辑）
- `editorId` 可配置（当前自动生成）

## 13. 风险、取舍与后续阶段

- 最大风险是把字段级编辑器误建模成平台级设计器或复杂宿主，导致 owner 边界失控。
- 第二风险是让 SQL/表达式增强不断推高文档承诺，超过当前 live implementation。
- 文档必须持续区分“已落地基线”和“未来扩展能力”。

## 14. 相关文档

- `docs/architecture/renderer-runtime.md` - 通用 renderer/runtime contract
- `docs/architecture/field-metadata-slot-modeling.md` - 字段包装与元数据规则
- `docs/architecture/complex-control-host-protocol.md` - 用于说明 code-editor 不属于平台宿主协议层
- `docs/references/flux-json-conventions.md` - JSON 命名与表达式约定
