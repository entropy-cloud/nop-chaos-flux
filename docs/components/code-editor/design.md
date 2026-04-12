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
  - source-ref 变量/函数/表结构解析
  - change/focus/blur 事件接入 Flux 事件系统
  - SQL format / snippets / variable panel / execution preview

## 3. Flux 中的 renderer/type 定义

- `type: 'code-editor'`
- `sourcePackage: '@nop-chaos/flux-code-editor'`
- `wrap: true`
- validation contributor: `kind: 'field'`、`valueKind: 'scalar'`

## 4. schema 设计

```ts
interface CodeEditorSchema extends BaseSchema {
  type: 'code-editor';
  language: EditorLanguage;
  mode?: EditorMode;
  value?: string;
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

## 5. 字段分类

- `label`: `value-or-region`
- `language`、`mode`、`value`、`placeholder`、`width`、`height`: `value`
- `lineNumbers`、`folding`、`autoHeight`、`allowFullscreen`、`editorTheme`、`options`: `value`
- `expressionConfig`、`sqlConfig`: `value`
- `onChange`、`onFocus`、`onBlur`: `event`

## 6. regions 与 slot 约定

- `code-editor` 不开放自由 regions。
- 变量面板、SQL 结果预览、snippet 面板等属于组件内部 feature surface，不是外部 schema regions。
- 如果后续需要更复杂外壳，应通过外部容器/field chrome 组合，而不是把字段级编辑器升级成宿主页面。

## 7. 运行期状态归属

- 编辑值归 form runtime 或当前 owner scope。
- 编辑器实例状态、光标、选择、自动补全弹层、只读切换等属于组件内部运行时状态。
- SQL 执行结果预览属于组件内 feature state，不提升为新的 page/host 级协议。

## 8. 事件、动作与组件句柄能力

- `onChange`、`onFocus`、`onBlur` 通过 Flux 事件系统接线。
- `onChange` 在 form context 中应走 `currentForm.setValue(name, newValue)`，无 form 时走 `scope.update(name, newValue)`。
- 组件可以长期提供局部 imperative capability，但不应演化成 namespaced host action owner。

## 9. 数据源、表达式、导入能力接入点

- expression 模式支持变量源、函数源的内联配置或 `scope/api` source-ref。
- SQL 模式支持表结构、变量面板、执行预览等配置。
- `code-editor` 只消费这些配置，不拥有平台级导入/bridge/session 协议。

## 10. 样式与 DOM marker 约定

- 根节点保留稳定 marker，例如 `nop-code-editor`。
- 编辑器容器遵循 field-level renderer 的样式契约，不引入工作台级 layout 假设。
- 全屏能力仍属于组件 feature，不意味着它是平台宿主。

## 11. 实现拆分建议

```text
packages/flux-code-editor/src/
  index.ts
  types.ts
  use-code-mirror.ts
  code-editor-renderer.tsx
  source-resolvers.ts
  variable-panel.tsx
  sql-result-panel.tsx
  extensions/
```

- language extension、completion source、lint、SQL format/snippet/preview feature 应分离维护。
- React 壳层只负责 renderer integration 和 hook bridge，不要把 CM6 feature logic 重新堆进 renderer 文件。

## 12. 当前实现基线

当前已落地：

- `CodeEditorSchema` 类型定义
- `useCodeMirror` hook
- `code-editor-renderer.tsx` 接入 `language`、`mode`、`placeholder`、`lineNumbers`、`folding`、`autoHeight`、`editorTheme`
- 4 个 source resolver hooks：变量、函数、表结构、SQL 变量
- change/focus/blur 事件与 Flux 表单/事件系统对齐
- SQL 增强：format、snippets、variablePanel、execution preview

当前仍属于未来可选扩展：

- custom lint rules
- CM6 compartment 热替换
- friendly-name decorations 的完整实现
- 更多 builtin function-set 过滤策略

## 13. 风险、取舍与后续阶段

- 最大风险是把字段级编辑器误建模成平台级设计器或复杂宿主，导致 owner 边界失控。
- 第二风险是让 SQL/表达式增强不断推高文档承诺，超过当前 live implementation。
- 文档必须持续区分“已落地基线”和“未来扩展能力”。

## 14. 相关文档

- `docs/architecture/renderer-runtime.md` - 通用 renderer/runtime contract
- `docs/architecture/field-metadata-slot-modeling.md` - 字段包装与元数据规则
- `docs/architecture/complex-control-host-protocol.md` - 用于说明 code-editor 不属于平台宿主协议层
- `docs/references/flux-json-conventions.md` - JSON 命名与表达式约定
