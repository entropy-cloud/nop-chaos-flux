# AI Widgets 示例与 tiny-robot（OpenTiny）对比分析

> 日期：2026-08-23
> 触发：用户在 `http://localhost:5173/#/ai-widgets` 反馈"和 ~/ai 下 tinybot 的示例相比差距很大；美观程度不够；对话内容显示效果差；点击各种按钮只有 toast，对话界面没有任何其他效果；也不清楚能显示什么内容（LaTeX? Markdown?）"
> 范围：
> 　1. `apps/playground/src/pages/ai-widgets-demo.tsx`（`# ai-widgets`）功能 / 视觉 / 交互清单
> 　2. 对照 OpenTiny tiny-robot（Vue 3 AI 组件库）能力清单
> 　3. 对照 `# ai-chat`（`apps/playground/src/pages/ai-chat-demo.tsx`，本仓库最小聊天示例）
> 　4. 对话渲染管线（markdown / LaTeX / 代码 / 头像 / 流式光标）
> 　5. 所有交互元素的实际副作用
> 验证方式：sub-agent 全量源码 + Tailwind v4 配置 + styles.css 检查 + Playwright 既有 e2e 用例核对

---

## 0. TL;DR

| 维度                  | `# /ai-widgets` 现状                                                                                                                                           | tiny-robot（OpenTiny）参考                                                          | 严重度 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ |
| **聊天消息渲染**      | 只显示 `Echo: <user> Hello from the mock AI connector! Streaming works.` ——纯文本 + 空格，无任何富媒体                                                         | 富 markdown、代码高亮、表格、KaTeX 公式、图片/视频、Reasoning 折叠、Tool 卡片、附件 | P0     |
| **Markdown 视觉样式** | `prose prose-sm dark:prose-invert` 类名挂在元素上，但 `@tailwindcss/typography` **未安装** → 实际无任何 prose 样式生效，标题/列表/引用/表格/链接全是浏览器默认 | 完整 OpenTiny typography                                                            | P0     |
| **LaTeX / 数学公式**  | `markdown-buffer.ts` 仅为防闪烁缓冲了 `$$` / `\(` 边界 —— **不渲染**，只是把不完整的公式截断                                                                   | 渲染公式（依赖 markdown-it-katex）                                                  | P0     |
| **代码块高亮**        | 工具调用卡片仅 JSON 高亮（`highlightJson` 4 个 token）；气泡 fenced code 无任何语法高亮（只渲染默认背景色）                                                    | Shiki / Prism 高亮                                                                  | P1     |
| **气泡头像**          | `<div data-slot="ai-bubble-avatar" />` —— **空 div**，无图片无图标无样式                                                                                       | 可注入头像组件（`Bubble` 支持 `avatar` prop，背景圆/方可控）                        | P1     |
| **所有交互按钮**      | `ai-prompts` / `ai-feedback` / `ai-suggestions` / `ai-voice-input` 的所有点击 **唯一副作用**：`showToast` —— 见 `mock-ai-env.ts:88-94`                         | 推荐点直接填入 Sender / 自动发送 / 反馈进入 store / 建议触发命令                    | P0     |
| **示例对话内容**      | mock connector 只回 `Echo: <user> Hello from the mock AI connector! Streaming works.` 8 个词，纯文本，没有任何 markdown 标记                                   | 示例对话富文本：代码块、表格、列表、Reasoning、Tool 卡片混排                        | P1     |
| **流式光标**          | 已实现 `[data-slot="ai-bubble-cursor"]` 闪烁 `▍`（`styles.css:5-10`），技术正确但**示例中看不见**（mock 流速 15ms/词，光标只存在 120ms）                       | 通常配合真实流式 LLM 演示                                                           | P2     |
| **Welcome / 欢迎页**  | `ai-welcome` 极简：图标 + 标题 + 描述（42 行，纯 flex 布局，无插画/背景）                                                                                      | Welcome 支持 footer slot + 主题插画                                                 | P2     |
| **Token 用量环**      | `ai-token-usage` 有 SVG ring + 进度条，技术实现完整，但因样例固定 320/180/500/0.0012 显得"假"                                                                  | Token 用量通常配合真实运行数据                                                      | P2     |
| **整体视觉精致度**    | 默认主题色 + 系统字体 + Tailwind 默认间距；无品牌色 / 无插画 / 无 glassmorphism / 无动画过渡                                                                   | OpenTiny Design 完整设计语言、动画、配色、品牌插画                                  | P2     |

---

## 1. `#/ai-widgets` 实际渲染内容（基于源码 + e2e 用例）

### 1.1 页面骨架（`ai-widgets-demo.tsx:165-185`）

```tsx
<div className="nop-theme-root min-h-screen flex flex-col">
  <Toaster />
  <header>← Back + "AI Widgets Showcase"</header>
  <main><SchemaRenderer schema={SCHEMA} ... /></main>
</div>
```

只有一个 `Toaster`（sonner）和一个返回按钮，整个对话面板在 `SchemaRenderer` 内。

### 1.2 SCHEMA 实际结构（`ai-widgets-demo.tsx:24-119`）

```
ai-chat (full-screen, h-[calc(100vh-57px)] max-w-3xl mx-auto, submitType='enter')
├── header
│   ├── text: "AI Assistant"
│   └── ai-token-usage (固定 320/180/500/0.0012 数据)
├── beforeMessages
│   ├── ai-welcome (icon='bot', title='Welcome to AI Widgets', description)
│   └── ai-prompts (4 项卡片：What is the weather? / Help me debug / Summarize the docs / Show me a chart)
│       onSelect → showToast (level:info, message: 'Prompt selected: ${item.label}')
├── messages (default ai-message-list)
└── afterMessages
    ├── ai-feedback (5 actions: copy / refresh / like / dislike / sources)
    │   onAction → showToast (level:info, message: 'feedback: ${action} on ${message.id}')
    ├── ai-suggestions (5 项：Summarize / Translate / Explain / Refine / Expand)
    │   onSelect → showToast (level:info, message: 'Suggestion tapped: ${item.text}')
    └── ai-voice-input + text 'Try voice input'
        onResult → showToast (success, 'Voice transcript: ${transcript}')
        onError  → showToast (warning, 'Voice error: ${reason}')
```

### 1.3 mock connector 真正回的内容（`mock-ai-env.ts:25` + `:50-59`）

```ts
const CANNED_REPLY_WORDS = [
  'Hello',
  'from',
  'the',
  'mock',
  'AI',
  'connector!',
  'Streaming',
  'works.',
];
// 每个 word 一个 chunk，间隔 15ms
// 组合：'Echo: <userText>' + 上面 8 个词
```

→ **示例对话永远只能是 `Echo: <你的输入> Hello from the mock AI connector! Streaming works.`** 这 8 个英文单词 + 你的 echo，没有任何 markdown、列表、代码块、表格、标题、链接、图片、公式。

### 1.4 所有按钮的真实副作用清单

| 元素                      | 渲染位置                      | 点击 / 输入后真实发生什么                                                                | 视觉反馈                 |
| ------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- | ------------------------ |
| `ai-prompts-item` × 4     | `ai-widgets-demo.tsx:65-68`   | `action: 'showToast'` 派发 → `mock-ai-env.notify` → `toast.info('Prompt selected: ...')` | 屏幕右下角弹 toast       |
| `ai-feedback` 5 个按钮    | `ai-widgets-demo.tsx:81-84`   | `copy` 真的写剪贴板 + `showToast`；其他 4 个 `showToast`                                 | copy 按钮文字翻 "Copied" |
| `ai-suggestions-item` × 5 | `ai-widgets-demo.tsx:90-93`   | `action: 'showToast'` → `toast.info('Suggestion tapped: ...')`                           | 屏幕右下角弹 toast       |
| `ai-voice-input`          | `ai-widgets-demo.tsx:103-110` | Web Speech API 启动 + 转写后 `showToast`；未授权时 `showToast(Warning)`                  | toast                    |
| `ai-sender` 输入 + 提交   | `ai-sender.tsx` 内部          | 真实调用 `ctx.sendMessage(text)` → mock connector 流式回 8 个词                          | 流式出现文本 + 闪烁光标  |
| 顶部 `← Back` 按钮        | `ai-widgets-demo.tsx:169-171` | `onBack()` 切换回 home-page                                                              | 路由返回                 |

→ **所有可见交互元素都是「按一下 → 一个右下角 toast」，对话界面本身没有任何其他动画/反馈/状态变化**。这是 2026-08-17 `docs/analysis/2026-08-17-ai-dead-buttons-analysis.md` 修复后的结果（之前是 zero-side-effect 连 toast 都没有，现在至少 toast 可见），但用户的诉求显然不只是"看 toast"。

---

## 2. 对话渲染管线（markdown / 代码 / 公式 / 头像）

### 2.1 渲染链（`packages/flux-renderers-ai/src/renderers/ai-bubble/`）

```
AiBubbleView (index.tsx)
  → resolveContentSlices → 选 renderer
  → 默认按 default-renderers.ts:28-89 优先级匹配
  → MarkdownContentRenderer (markdown.tsx)
     ├── safeMarkdownSlice (markdown-buffer.ts) — 仅 UTF-16/fence/`$$`/`\(` 边界截断
     ├── sanitizeHtml (DOMPurify)
     └── <ReactMarkdown remarkPlugins=[gfm] rehypePlugins=[raw]>
         + 自定义 code/pre override
         ├── inline code → 直接 <code>
         └── fenced code → CodeBlock
             ├── 顶层 <code className="language-xxx"> 包裹
             ├── 绝对定位的 <Button> 复制按钮（无语法高亮）
             └── 原样渲染 children（无 shiki/prism）
```

### 2.2 P0 视觉问题：`prose` 类无样式

```tsx
// packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:38-50
<div data-slot="ai-bubble-markdown" className={cn('prose prose-sm max-w-none break-words dark:prose-invert')}>
  <ReactMarkdown ...>{safe}</ReactMarkdown>
</div>
```

**问题**：

- `@tailwindcss/typography` **未在任何 `package.json` 中声明**（grep 全仓库 0 命中）
- `apps/playground/src/styles.css` 也只 `@import 'tailwindcss'`，没有 typography 插件
- Tailwind v4 把 `prose` 当成普通工具类 → 完全不生效

→ **用户看到的 markdown 内容是浏览器默认 `<h1>`、`<ul>`、`<a>` 样式**：超大字号标题、左对齐无序列表带默认蓝下划线、无引用块、无表格边框、无 inline code 灰底色、代码块没有深色背景、列表没有 padding-left → 视觉上像 "调试输出" 而不是 "AI 回答"。

### 2.3 P0 视觉问题：气泡**无头像**

```tsx
// packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:134
{
  showAvatar ? <div data-slot="ai-bubble-avatar" aria-hidden="true" /> : null;
}
```

- 默认 `showAvatar={false}`（`ai-bubble.tsx:67`），所以 `ai-widgets` 实际**根本没传** `showAvatar`
- 即便设为 `true`，这个 `div` **完全是空的** —— 没有 `<img>`、没有 lucide 图标、没有任何 fallback
- `packages/flux-renderers-ai/src/styles.css` 中**没有任何 `.nop-ai-bubble-avatar` 或 `[data-slot="ai-bubble-avatar"]` 样式**

→ 即便测试用例里设了 `showAvatar: true`，渲染出来也是一个 0px × 0px 的空 div（无 padding、无 width/height、无 border-radius），肉眼根本看不到任何头像。这跟 tiny-robot 支持的「注入头像组件（`avatar` prop，可圆形/方形，可换 src）」差距巨大。

### 2.4 P0 缺失：LaTeX / 数学公式**完全不渲染**

| 期望                              | 实际                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `$E = mc^2$` 渲染为行内公式       | **显示为字面字符串 `$E = mc^2$`**（markdown 原文，没有 katex/mathjax 插件）                                             |
| `$$\int_0^1 ...$$` 渲染为块级公式 | 同上 —— 显示原文                                                                                                        |
| 流式过程中不完整的 `$$E = mc`     | `safeMarkdownSlice` 截断为 `$$E = mc` 不显示直到 `$$` 闭合（`markdown-buffer.ts:51-53, 95-...`）—— 防闪烁正确，但不渲染 |

证据：

- `packages/flux-renderers-ai/package.json` 没有任何 `katex` / `mathjax` / `rehype-katex` / `remark-math` 依赖
- 全仓库 grep `katex|mathjax|rehype-math|remark-math` **0 命中**
- `markdown.tsx:42-48` 的 `ReactMarkdown` 只挂了 `[remarkGfm]` 和 `[rehypeRaw]`，没有 math 插件

→ 用户在对话里**完全无法看到数学公式**。这跟 `docs/components/flux-renderers-ai/improvement-analysis.md §3.2` 标注的 P1 改进项一致。

### 2.5 P1 缺失：代码块**无语法高亮**

| 文件                                                                         | 代码块渲染行为                                                                                                        |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ai-bubble/renderers/markdown.tsx:67-92`                                     | fenced code 包一层 `CodeBlock` → 内部只渲染 `<code>` 原内容 + 复制按钮。**没有任何 `lowlight` / `shiki` / `prismjs`** |
| `packages/flux-renderers-content/src/diff-view/adapters/syntax-highlight.ts` | diff-view 用 `lowlight` 但**未在 ai-bubble 接入**                                                                     |
| `ai-tool-call.tsx:401-419`                                                   | 只有 `highlightJson()` 自写 token 正则 → 4 个 token 类名（key/str/num/bool），只在工具调用 JSON 时生效                |

→ 用户看到 ` ```python\nprint("hi")\n``` ` 就是黑底白字（或浏览器默认），没有关键字/字符串颜色。这跟 AI Elements、Agent Elements、VLLNT UI、tiny-robot 都有 shiki/Prism 相比是 P1 级别的差距。

### 2.6 P2：流式光标技术正确但示例看不见

```css
/* packages/flux-renderers-ai/src/styles.css:5-10 */
[data-slot='ai-bubble-cursor'] {
  display: inline-block;
  animation: flux-ai-cursor-blink 1s steps(2, start) infinite;
}
```

技术实现 OK，但因为 mock connector **15ms/词**且示例只 8 个词，整个流式过程不到 200ms，闪烁光标用户根本来不及看。

### 2.7 其他次要但影响视觉精致度的项

- **气泡背景**：默认无背景色，markdown 文本直接铺在 panel 上；tiny-robot 有 `shape: 'corner'|'rounded'|'none'` + 浅色背景
- **欢迎图标**：`ai-welcome.tsx:25` 只把 `icon` 字符串当文本渲染（`'bot'` 直接显示为字母 b o t），不是 lucide 图标
- **suggestion pills emoji**：`SUGGESTION_ITEMS` 用 `✏️ 🌐 💡 ✨ ➕` 字符，跨平台字体差异大
- **整体色调**：依赖 `--nop-app-bg`（暖米黄渐变），与典型 AI chat 产品（深色玻璃拟态 / 纯白极简）差很多

---

## 3. 与 tiny-robot（OpenTiny）能力对比

tiny-robot 是 OpenTiny 团队开源的 Vue 3 AI 组件库（MIT），其消息引擎（`MessageEngine`）即为本仓库 `flux-renderers-ai` 的设计蓝本（参见 `docs/analysis/ai-survey/2026-07-21-tiny-robot-deep-analysis.md`）。

| 能力                       | tiny-robot                                                                                                                                                                                                                          | flux-renderers-ai `#/ai-widgets`                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 核心组件数                 | 14 个组件（Container / Bubble / Sender / History / Prompts / Welcome / Feedback / Attachments / DragOverlay / History / McpServerPicker / SuggestionPills / SuggestionPopover / Layout / LayoutAsideToggle / LayoutProxyScrollbar） | 14 个 schema 渲染器，但**全部以 schema 形式而非 Vue 组件库形式暴露**                                                         |
| Bubble 头像                | ✅ `avatar` prop 可注入组件，圆/方/自定义                                                                                                                                                                                           | ❌ 空 div，无样式                                                                                                            |
| Bubble Markdown 渲染       | ✅ `markdown-it` + DOMPurify                                                                                                                                                                                                        | ✅ `react-markdown` + remark-gfm + rehype-raw + DOMPurify                                                                    |
| Bubble Markdown typography | ✅ OpenTiny Design 自带完整样式                                                                                                                                                                                                     | ❌ `prose` 类未挂 typography 插件 → **裸浏览器默认样式**                                                                     |
| 代码块高亮                 | ✅（通过 markdown-it 自带选项 + Prism）                                                                                                                                                                                             | ❌ 无任何高亮                                                                                                                |
| LaTeX / 数学公式           | ✅ markdown-it-katex（社区扩展可挂）                                                                                                                                                                                                | ❌ 不渲染                                                                                                                    |
| Reasoning 折叠面板         | ✅ `Reasoning.vue` 折叠 / 默认 open / 持续时间计时                                                                                                                                                                                  | ⚠️ 已有 `ReasoningContentRenderer`（`ai-bubble/renderers/reasoning.tsx`），但 `#/ai-widgets` mock 不输出 `reasoning_content` |
| 工具调用卡片（专用）       | ✅ Tool.vue + 状态色（running/success/failed）                                                                                                                                                                                      | ⚠️ 单一 `ai-tool-call.tsx` 通用卡，无工具类型区分（`improvement-analysis.md §3.3` P2 改进项）                                |
| 工具结果回显（role=tool）  | ✅ BubbleProvider 注入 store.toolCallResults                                                                                                                                                                                        | ✅ engine 支持但 `#/ai-widgets` 未演示                                                                                       |
| 附件（图片/卡片/自动切换） | ✅ Attachments + DragOverlay + vDropzone                                                                                                                                                                                            | ✅ `ai-attachments` 渲染器 + Dropzone binding；演示在 `ai-attachments-demo.tsx` 不在 widgets                                 |
| 历史会话侧边栏             | ⚠️ Conversations 组件是空壳，**真正实现是 History.vue**                                                                                                                                                                             | ✅ `ai-conversations`（schema 渲染） + `useConversation` hook                                                                |
| 会话管理 hook              | ✅ `useConversation`（kit/src/vue）                                                                                                                                                                                                 | ✅ `useConversation`（React adapter 699 行）                                                                                 |
| 自动滚动                   | ✅ `autoScroll`                                                                                                                                                                                                                     | ✅ `ai-message-list` 内置                                                                                                    |
| 流式响应处理               | ✅ OpenAI 风格 SSE / 通用 Provider                                                                                                                                                                                                  | ✅ `env.stream` 抽象 + `createStreamBasedAiConnector` 工厂                                                                   |
| Token 用量环               | ⚠️ Context 组件（依宿主）                                                                                                                                                                                                           | ✅ `ai-token-usage` SVG ring                                                                                                 |
| 持久化                     | ✅ Flexible storage（LocalStorage / IndexedDB / 自定义）                                                                                                                                                                            | ✅ `useConversationAutosave` + `storage/storage` 抽象                                                                        |
| ThemeProvider              | ✅ 多主题 + 暗色                                                                                                                                                                                                                    | ✅ CSS variables + theme-tokens 包                                                                                           |
| Tiptap 富文本输入          | ✅ Sender 内置（Tiptap 3）                                                                                                                                                                                                          | ✅ `flux-renderers-ai/rich-text` 子路径（opt-in）                                                                            |
| 建议弹层 / Pill 溢出收纳   | ✅ SuggestionPopover + SuggestionPills (expand/scroll/popover)                                                                                                                                                                      | ⚠️ SuggestionPills 有 `expand/scroll/popover` 三种 overflow，但 `#/ai-widgets` 只展示 expand                                 |
| Layout 浮动容器 + Dock     | ✅ Container + Layout（浮动 / 拖拽 / 缩放）                                                                                                                                                                                         | ⚠️ 概念未移植（flux 定位是 renderer 层而非 widget）                                                                          |
| MCP / Skills 插件市场 UI   | ✅ McpServerPicker + AddForm                                                                                                                                                                                                        | ❌ 未实现（flux 主张由 host 通过 `xui:imports` 注入）                                                                        |

**结论**：核心架构 / 引擎 / 数据模型 **flux-renderers-ai 都已对齐**；**差距主要集中在视觉层**：

1. 气泡 markdown 没有 typography 样式（最显眼）
2. 头像空壳
3. 无 LaTeX / 无代码高亮
4. 示例对话内容贫瘠（无 markdown / 无代码 / 无公式）

---

## 4. 与 `#/ai-chat`（最小聊天示例）对比

| 维度           | `#/ai-chat`                              | `#/ai-widgets`                                      |
| -------------- | ---------------------------------------- | --------------------------------------------------- |
| 文件           | `ai-chat-demo.tsx` (55 行)               | `ai-widgets-demo.tsx` (186 行)                      |
| schema         | 外部 JSON `ai-chat-example.json` (31 行) | inline `SCHEMA` 对象 (96 行)                        |
| 顶部装饰       | 文字 "P0 skeleton — streaming echo demo" | `ai-welcome` + `ai-prompts` + `ai-token-usage`      |
| 底部装饰       | 无                                       | `ai-feedback` + `ai-suggestions` + `ai-voice-input` |
| 实际能做的     | 发消息看流式文本                         | 发消息 + 点 4 类按钮各看一个 toast                  |
| 给用户的"震撼" | 几乎没有（极简 P0 骨架）                 | 表面功能多但实际仍是"echo + toast"                  |

→ 两个示例**核心都是同一个 mock connector，回的都是同样的 8 词**，所以对话体验完全相同。`# ai-widgets` 多出来的所有装饰（welcome / prompts / suggestions / feedback / voice / token）**全部只是排版差异，没有任何内容产出差异**。

---

## 5. 用户原始问题逐条回应

> "示例页面功能和 ~ /ai 下 tinybot 的示例相比差距很大"

✅ 部分对。**核心引擎 / 数据模型对齐**（参见 §3 表格）。**视觉层差距大**：markdown typography、代码高亮、LaTeX、头像、动画——5 项视觉差距是用户立刻能感知到的"差距"。架构层面通过 `improvement-analysis.md` 已识别为 P1/P2 改进项。

> "现在 ai-widgets 的美观程度也不行"

✅ 对。3 个具体原因：

1. `prose` 失效导致 markdown 排版回退到浏览器默认（§2.2）
2. `ai-welcome` 没有插画 / 配色 / 玻璃感（极简 42 行实现）
3. `ai-suggestions` 用 emoji 字符代替 lucide 图标，跨平台字体差异大

> "对话内容的显示效果也不行"

✅ 对。3 个具体原因：

1. mock connector 只回 8 个英文单词 + echo，无任何 markdown 标记（§1.3）
2. 没有 LaTeX / 数学公式渲染（§2.4）
3. 代码块无语法高亮（§2.5）
4. 头像空壳（§2.3）

> "点击界面上各种按钮看起来都是只有一个 toast 信息，在对话界面上没有任何其他效果吗？"

✅ 对。**完全正确**：

- `ai-prompts` 4 个按钮 → `showToast`（§1.4 表格）
- `ai-feedback` 5 个按钮（copy 真的写剪贴板但其他 4 个）→ `showToast`
- `ai-suggestions` 5 个按钮 → `showToast`
- `ai-voice-input` → `showToast`（成功 / 失败）
- 对话界面本身**没有任何状态变化**（消息列表不增加、不滚动、不变色、不动画）

→ 这是 2026-08-17 dead-buttons 分析后的"半修复"：之前 0 副作用，现在至少 toast 可见；用户期待的"填充 sender / 自动发送 / 真实反馈 / 触发新对话"等真实副作用并未实现。

> "对话中能显示什么？latex？markdown？具体显示的形式和内容也对比一下"

回答：

| 内容类型                | 当前 `#/ai-widgets` 支持？       | 显示形式                                                                        | 来源                                                                  |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **纯文本**              | ✅                               | 直接渲染                                                                        | 默认 ReactMarkdown 文本节点                                           |
| **Markdown**            | ⚠️ 半支持                        | 渲染为 HTML，但**无 typography 样式**（浏览器默认）                             | `react-markdown` + `remark-gfm`（`ai-bubble/renderers/markdown.tsx`） |
| **GFM 表格**            | ✅ 语法解析 ✅ 无样式            | 渲染为 `<table>`，但无边框无斑马纹                                              | remark-gfm                                                            |
| **任务列表** `- [x]`    | ✅ 解析                          | 渲染为 checkbox                                                                 | remark-gfm                                                            |
| **删除线** `~~x~~`      | ✅                               | `<del>`                                                                         | remark-gfm                                                            |
| **内联代码** `` `x` ``  | ✅                               | `<code>` 默认浏览器字体                                                         | react-markdown                                                        |
| **代码块** ` ```x ``` ` | ⚠️ 语法解析 ✅ 无高亮            | 渲染为 `<pre><code>`，浏览器默认字体 + 黑色背景（取决于浏览器）+ 右上角复制按钮 | markdown.tsx:67-148                                                   |
| **链接** `[x](u)`       | ✅                               | 蓝色下划线（浏览器默认）                                                        | react-markdown                                                        |
| **图片** `![alt](u)`    | ✅                               | `<img>`                                                                         | react-markdown                                                        |
| **LaTeX / 数学公式**    | ❌ **不渲染**                    | 显示为字面字符串 `$E=mc^2$`                                                     | ——                                                                    |
| **Mermaid 图表**        | ❌                               | 显示为代码块原文                                                                | ——                                                                    |
| **HTML 内联**           | ⚠️ 解析后 sanitized              | DOMPurify 后保留安全子集                                                        | rehype-raw + `sanitizeHtml`                                           |
| **附件**（图片/文件）   | ✅（但 widgets 不演示）          | 图片网格 / 卡片                                                                 | `ai-attachments` (在 `ai-attachments-demo.tsx`)                       |
| **Tool 调用卡片**       | ✅（widgets 不演示）             | JSON 折叠 + 状态色                                                              | `ai-tool-call.tsx`（带 `highlightJson` 4 token 着色）                 |
| **Reasoning 折叠**      | ✅（widgets 不演示）             | 可折叠详情                                                                      | `ai-bubble/renderers/reasoning.tsx`                                   |
| **引用** `[1]`          | ✅（widgets 不演示）             | 弹层 / 行内                                                                     | `ai-citations` (在 `ai-citations-demo.tsx`)                           |
| **角色头像**            | ❌                               | 0×0 空 div                                                                      | `ai-bubble.tsx:134`                                                   |
| **流式光标**            | ✅（技术正确，但示例太快看不见） | 闪烁 `▍`                                                                        | `styles.css:5-10`                                                     |
| **时间戳**              | ✅（需 `showTimestamp: true`）   | 灰色小字                                                                        | `ai-bubble/renderers/timestamp.tsx`                                   |

---

## 6. 根因总结

1. **示例对话内容贫瘠**（P0）
   `mock-ai-env.ts:25` 硬编码 `CANNED_REPLY_WORDS` 8 词 → 用户无论问什么，回答永远一样 → 没有"丰富内容"可显示 → "显示效果差"
   → 短期：换成更丰富的 markdown fixture（标题/列表/表格/代码块/链接/数学公式），立刻能展示 typography / 高亮 / LaTeX 能力
   → 长期：接入 LLM proxy

2. **`prose` 失效**（P0）
   `ai-bubble/renderers/markdown.tsx:40` 用了 `prose prose-sm dark:prose-invert` 但 `@tailwindcss/typography` 未安装 → 用户看到的 markdown 是"裸 HTML" → "美观程度不行 / 显示效果差"
   → 短期：要么安装 `@tailwindcss/typography` + 在 `tailwind.config.ts` 注册（受 AGENTS.md v4 monorepo 规则约束），要么把这套类名替换成包内自定义 CSS
   → 推荐：自定义 CSS（不引入 35KB typography 插件的代价）

3. **所有按钮只有 toast**（P0）
   ai-widgets-demo.tsx schema 所有 `onSelect / onAction / onResult / onError` 都接到 `showToast` → 用户感觉"没有实际效果"
   → 短期：在 schema 里让 `ai-prompts.onSelect` 真正触发 `component:sendMessage`（已有 `ai-component-handle-demo.tsx` 范式）；让 `ai-suggestions.onSelect` 真正填充到 sender（需新增 `component:setSenderDraft` 能力或利用现有）；让 `ai-feedback.onAction('refresh')` 真正触发重新生成
   → 长期：组件能力完善（plan 471 / 472 系列）

4. **头像空壳**（P1）
   `ai-bubble/index.tsx:134` 渲染空 div，styles.css 无对应规则 → 即便测试设 `showAvatar: true` 也看不到
   → 短期：把空 div 换成 lucide 图标（`Bot` / `User`），并在 styles.css 加 `[data-slot="ai-bubble-avatar"] { width:32px; height:32px; border-radius:9999px; background: var(--muted); }`

5. **LaTeX / 代码高亮未实现**（P1）
   包内无 katex / shiki / prism 依赖 → 公式显示为原文 / 代码块无高亮
   → 短期：接入 `remark-math` + `rehype-katex`（+ CSS 主题）+ `lowlight`（已存在于 content 包），并扩展 markdown-buffer 的 unclosed-math 边界处理

6. **示例示例示例**——`# ai-widgets` 命名暗示 "widgets showcase" 但实际只演示了 4-5 个 widget，且对话内容毫无展示价值 → 用户感知差
   → 短期：把 mock 改成富 markdown fixture（已在 1 中提到）；在示例中演示 Reasoning 折叠、Tool 卡片、引用这些 widget 当前都不在 `# ai-widgets` 内

---

## 7. 优先级建议（修复顺序）

| 序号 | 修复                                                                    | 预期效果                                                     | 工作量 |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| 1    | 富 markdown fixture（标题/列表/表格/代码/公式/链接）替换 mock connector | 用户立刻能感受到 markdown 渲染能力；自然带动后续样式优化显形 | 0.5d   |
| 2    | 自定义 markdown typography CSS（取代 prose 类）                         | 标题/列表/引用/表格/链接/code 全部有样式，告别浏览器默认     | 0.5d   |
| 3    | 气泡头像 lucide 图标 + 圆形背景                                         | 视觉精致度立刻提升，对话"像 AI 产品"                         | 0.5d   |
| 4    | ai-prompts / ai-suggestions 真实副作用（填 sender / 自动发送）          | 按钮不再只是 toast，而是真正驱动对话                         | 1d     |
| 5    | 接入 remark-math + rehype-katex                                         | 支持 LaTeX 行内/块级公式                                     | 1d     |
| 6    | 接入 lowlight 做代码块高亮                                              | fenced code 有语法着色                                       | 1d     |
| 7    | 示例扩展：把 Reasoning / Tool / Citations widget 也纳入 ai-widgets      | 让 `# ai-widgets` 真正成为 "all widgets showcase"            | 1-2d   |

---

## 8. 引用与佐证

- `apps/playground/src/pages/ai-widgets-demo.tsx:1-186` —— 整页实现
- `apps/playground/src/pages/ai-chat-demo.tsx:1-55` —— 对照最小聊天示例
- `apps/playground/src/ai/mock-ai-env.ts:25, 50-59, 88-94` —— mock connector 与 toast 路由
- `apps/playground/src/ai/ai-chat-example.json:1-31` —— P0 schema
- `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:121-181` —— 气泡主组件（含空 div 头像 line 134）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:38-50` —— prose 类名（line 40）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts:1-100` —— 流式缓冲（仅防闪烁，不渲染公式）
- `packages/flux-renderers-ai/src/styles.css:5-22` —— 流式光标
- `packages/flux-renderers-ai/package.json` —— 无 katex / mathjax / shiki / prism / lowlight
- `packages/flux-renderers-ai/src/renderers/ai-welcome.tsx:24-28` —— 图标当文本渲染
- `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx:57-78` —— fire() 真实副作用（仅 copy 写剪贴板）
- `packages/flux-renderers-ai/src/renderers/ai-prompts.tsx:84-87` —— onClick 仅发 payload
- `packages/flux-renderers-ai/src/renderers/ai-suggestions.tsx:48-56` —— Pill 按钮 onClick
- `tests/e2e/ai-widgets-demo.spec.ts:1-135` —— e2e 覆盖清单
- `tests/e2e/ai-chat.spec.ts` —— 已有 P0 chat e2e
- `docs/analysis/2026-08-17-ai-dead-buttons-analysis.md` —— 历史 dead-click 审计（toast 是那次修复的结果）
- `docs/analysis/ai-survey/2026-07-21-tiny-robot-deep-analysis.md` —— tiny-robot 深度分析（引擎对照来源）
- `docs/components/flux-renderers-ai/improvement-analysis.md §3.2 §3.3 §4` —— 已识别的 P1/P2 改进项
- `docs/components/flux-renderers-ai/design.md §10.4 §18.2` —— 设计文档
- `apps/playground/src/styles.css:1-19` —— 确认无 `@tailwindcss/typography` 引入
- 全仓库 grep `katex|mathjax|rehype-math|remark-math` 命中 0（除 markdown-buffer.ts 注释）
