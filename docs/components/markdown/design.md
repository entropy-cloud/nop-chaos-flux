# Markdown 组件设计

## 1. 组件定位

- `markdown` 是 Markdown 内容渲染 renderer。
- 它是 `text` 与 `html` 之间的中间层，负责受控富文本展示。

## 2. 与 AMIS 或既有产品的能力对照

- 已 shipped：注册于 `flux-renderers-content`（`content-renderer-definitions.ts`），基于 `react-markdown` + `remark-gfm`；`allowHtml` 开启时先经 DOMPurify 清洗再由 `rehype-raw` 渲染存活标签。
- 样式契约现状（R2-2b 复核 DR-1，2026-09-24）：`.nop-markdown` 的元素样式矩阵物理寄居于 **form 包** `form-renderers.css`（出身是 markdown-editor preview），且矩阵**未覆盖 GFM table/td/th**（表格塌缩为文字堆，R2-2b-C1-45 P1）——与本文宣称的 remark-gfm 支持存在视觉层缺口；修复批落地前，GFM 表格/列表符号不保证有表格化呈现。跨包寄居的迁移评估归后续 plan。
- 支持静态 Markdown 与表达式拼接后的字符串输入；`allowHtml` 默认关闭（标签按字面转义）。

## 2a. code fence 语法高亮能力（G4D 裁决，实现归 G4I）

### 落点裁决（三选一，plan `718-arc-g4d-code-block-design.md`，出处 `arc-component-gap-roadmap` §5.1 G4）

| 候选                                                | 结论                   | 理由                                                                                                                                                                |
| --------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) 独立声明场景复用 `code-editor` `colorize: true` | **采纳（双落点之一）** | E3 已落地、`ColorizeView` 已导出；零新 type 零代码，仅在 code-editor/design.md 补展示指引（lazy 编辑器包络代价声明在案）                                            |
| (b) markdown code fence 高亮能力扩展                | **采纳（双落点之一）** | 内嵌场景缺口真实；能力扩展非新 type；底座复用 `ColorizeView`（新增 `flux-renderers-content → flux-code-editor` workspace 依赖，G4I 过 `pnpm check` 硬门禁并留论证） |
| (c) 独立只读 type `code-block`                      | 拒绝                   | matrix 增行 human gate；与 (a) 同底座同形态仅名字不同，无独立契约边界                                                                                               |

### `codeHighlight` 协议

- schema：`codeHighlight?: boolean`（markdown 渲染器级**整文档开关**，默认 false——行为零变化；per-fence 粒度不在首版契约）。
- 渲染：ReactMarkdown `code` 组件覆写，fence 块走高亮 pre（`data-code-highlight="true"`）；行内 code 不受影响。
- 语言映射：fence 标注 → CodeMirror 语言（别名归一表归 flux-renderers-content 内新模块）；未知语言回退纯文本 pre（`fence-unknown-language`）。
- **加载策略（硬条款）**：`ColorizeView` 顶层携带 CodeMirror + 全部语言包，markdown 属默认 bundle——G4I 须以 lazy（动态 import）接入；未声明 `codeHighlight` 时零增量加载。
- 溢出：沿用 `nop-markdown` 容器既有 overflow 契约。
- 行号/复制按钮：首版不做；复制语义走既有 copy action 链（button by-design）。
- 命名 pass：采纳 `codeHighlight`（肯定式布尔）；拒绝 `highlightCode`（动宾倒置）、`syntaxHighlight`（丢 code 域限定）、`fenceHighlight`（实现细节入名）。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'markdown'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `content`、`src`、`allowHtml`、`empty`。
- `src`（string | Expression）：远程 Markdown 源 URL。当 `content` 为空时，renderer 从 `src` 的 resolved URL fetch 内容；当 `content` 非空时忽略 `src`。fetch 过程中显示 loading 态，失败时显示 error 态。

## 5. 字段分类

- `content`: `value`，可允许 source-enabled value
- `src`: `value`，远程 Markdown 源 URL（表达式或字面量）
- `empty`: `value-or-region`

## 6. regions 与 slot 约定

- 通常不需要 body region。
- 空态可使用 `empty`。

## 7. 运行期状态归属

- 无复杂状态。

## 8. 事件、动作与组件句柄能力

- 默认无专用事件。

## 9. 数据源、表达式、导入能力接入点

- **内容契约（content-only）**：`content` 为 `kind:'prop'`，支持表达式与 source-enabled value（`${...}` 绑定经 propsProgram 解析）。
- **远程 `src` fetch（DD9）**：`src: string` 远程 Markdown 源 URL。`content` 为空时 renderer 经 **host `RendererEnv.fetcher`**（INV-1 env IO 边界——禁直调浏览器 `fetch`）以 `responseType:'text'` 请求并在成功后渲染；`content` 非空时忽略 `src`（互斥）。fetch 过程中显示 loading 态（`data-state="loading"`），失败（fetcher 抛错或非 ok envelope）显示 error 态（`data-state="error"` + `flux.common.loadFailed`）。请求带 AbortController：src 变化/卸载时 abort，无竞态残留（`markdown.tsx:28-60`）。
- **响应式（DD8）**：`content` 为 `kind:'prop'`，经 propsProgram **reactive 于 scope**——mutate 绑定 scope 值会重新解析并更新渲染的 markdown HTML（非 mount 快照）。回归锚见 `markdown-reactivity.test.tsx`。
- `content` 支持表达式和 source-enabled value（注入方式同上，非 renderer 自带 fetch）。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-markdown` marker。
- 需要与项目 Markdown 样式策略统一，避免 renderer 内置一套独立排版体系。

## 11. 实现拆分建议

- 解析、安全过滤和渲染样式拆开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是 `markdown` 与 `html` 边界不清，需要持续坚持"受控格式化文本"定位。
- 受控渲染安全门禁（sanitize 双策略）：
  - **(a) HTML 清洗**：`allowHtml` 默认 off（react-markdown 按字面转义标签）；开启时 markdown 源先经 DOMPurify allowlist 清洗（剥离 `<script>`/事件处理器/`javascript:` URI，保留常见展示标签），再由 `rehype-raw` 渲染存活安全标签（`sanitize.ts`、`markdown.tsx`）。已实现+已测（`sanitize.test.ts`、`markdown.test.tsx`）。**动态更新路径同门禁**：`content` 为 prop，每次解析渲染均过 sanitize（无二次注入面，宿主场景复验见 C6.1）。
  - **(b) 代码块逐字保留**：代码块内的字面内容（含 `'`、`"`、`<`、`>`）按构造逐字保留，不做 entity 转义（markdown 管线仅 `remarkGfm` + 条件 `rehypeRaw`，无转义插件）。回归锚见 `markdown.test.tsx`。
  - 两者是 distinct concerns：(a) 针对 `allowHtml` 开启时内嵌 HTML 的 XSS 防护；(b) 针对代码块内容不被二次转义。决策见 `docs/plans/2026-06-24-0040-2-w1a-content-family-sanitization-plan.md`，`docs/architecture/security-design-requirements.md` 为安全边界父文档。
- 远程 `src` fetch 已于 DD9 落地（经 `env.fetcher`，非 renderer 直调浏览器 IO）；无后续阶段项。
