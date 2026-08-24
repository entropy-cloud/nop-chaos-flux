# flux-renderers-ai 产品标准（`# /ai-widgets` showcase 目标态）

> Status: active（`ai-widgets-product` roadmap D0 产物）
> Last Reviewed: 2026-08-24
> Source: `docs/backlog/ai-widgets-product-roadmap.md` D0；`docs/analysis/2026-08-23-ai-widgets-vs-tiny-robot-comparison.md` §6–§7（证据基线，本文引用不重写）
> Mission: ai-widgets-product
> 消费方: D1（§4 fixture 标准）、D2（§2 typography 决策与节奏表）、D3（§3 avatar / icon 规格）、D4（§3.3 pill icon 映射）、D5（§6 showcase 口径）、DV（§7 断言清单）

## 0. 文档分工

| 文档                                       | 职责                                                                                               |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `design.md` / `renderers.md` / `engine.md` | 引擎与 renderer 架构不变式、公共契约（不变）                                                       |
| `product-spec.md`（本文）                  | **仅** `ai-widgets-product` roadmap（D0–DG）范围内 `# /ai-widgets` showcase 的目标态产品标准与裁定 |
| 各 phase plan                              | 实现细节（fixture 文本最终稿、CSS 具体规则行、组件代码）                                           |

本文只裁定「目标态是什么、为什么」；「怎么落地」归 D1–D6 各 plan。范围外事项一律以 `design.md` 为准。

## 1. UX 诊断结论（现状问题 → G1–G12 映射）

### 1.1 诊断方法

- 审查口径：`docs/skills/ux-design-pattern-audit-prompt.md`（用户可见的视觉与交互质量，非代码架构契约）。
- playground 实跑：2026-08-24 headless Chromium 对真实 playground dev server 跑 `tests/e2e/ai-widgets-demo.spec.ts`，10/10 pass——确认页面骨架与全部交互元素存在、发送消息后 mock 回复路径 live 可用；同时印证 G12（10 个测试全部为 DOM 结构断言，无一处计算样式 / 截图断言）。
- 源码走读：下表每条 gap 均于 2026-08-24 逐 file:line 复核（行号 live 核实）。
- 证据基线：`docs/analysis/2026-08-23-ai-widgets-vs-tiny-robot-comparison.md`（§0 TL;DR / §1.4 副作用清单 / §2 渲染管线 / §6 根因）。本文不重写该分析，仅做「现状问题 → gap 编号 → 闭合 phase」映射。

### 1.2 映射表

| Gap | 用户可见现状（诊断视角）                                                                                                                                             | 源码定位（2026-08-24 live 核实）                                                                                                                                                                                                 | 证据                                                                                                                    | 严重度   | 闭合 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ---- |
| G1  | 回复永远是 `Echo: <输入> Hello from the mock AI connector! Streaming works.`，无任何 markdown 标记——旗舰 demo 无内容产出差异，「显示效果差」的直接根源               | `apps/playground/src/ai/mock-ai-env.ts:25`（`CANNED_REPLY_WORDS` 8 词）；live 实跑 `ai-widgets-demo.spec.ts:98-114` 断言路径印证                                                                                                 | 分析 §1.3 / §6.1                                                                                                        | P0       | D1   |
| G2  | `prose prose-sm dark:prose-invert` 类挂着但全仓无 typography 插件 → markdown 回退浏览器裸默认（超大标题 / 蓝下划线链接 / 无表格边框），像「调试输出」而非「AI 回答」 | `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:40`；`@tailwindcss/typography` 全仓 package.json 0 命中（2026-08-24 grep 复核）；`packages/flux-renderers-ai/src/styles.css` 126 行无 typography 规则 | 分析 §2.2 / §6.2                                                                                                        | P0       | D2   |
| G3  | 气泡头像为空 div（0×0、无样式），即便设 `showAvatar: true` 也肉眼不可见——与「像 AI 产品」的直接差距                                                                  | `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:134`；`styles.css` 无 `[data-slot="ai-bubble-avatar"]` 规则                                                                                                        | 分析 §2.3 / §6.4                                                                                                        | P1       | D3   |
| G4  | 所有可见交互按钮（prompts ×4 / feedback ×5 / suggestions ×5 / voice）唯一副作用是右下角 toast，对话界面零状态变化——「能点」但不能「理解」                            | `apps/playground/src/pages/ai-widgets-demo.tsx:65-110`（全部 `onSelect/onAction/onResult/onError` → `showToast`）；`mock-ai-env.ts:88-94`（notify 路由）                                                                         | 分析 §1.4 / §6.3                                                                                                        | P0       | D4   |
| G5  | `$E=mc^2$` 显示字面字符串，完全不渲染公式（流式缓冲只截断不渲染）                                                                                                    | `packages/flux-renderers-ai/package.json` 无 `katex/remark-math/rehype-katex`（2026-08-24 grep 复核 0 命中）；`markdown.tsx:42-48` 插件链仅 gfm+raw                                                                              | 分析 §2.4 / §6.5；**supersession**：2026-08-23 human gate 已裁定 D6 内置（`design.md` §10.4），本文不再讨论「是否内置」 | P1       | D6   |
| G6  | fenced code 无语法高亮（黑底白字或浏览器默认），与 AI chat 产品惯例（shiki/Prism 级着色）差距明显                                                                    | `markdown.tsx:67-92`（CodeBlock 仅复制按钮）；lowlight 已在 content 包存在未接入                                                                                                                                                 | 分析 §2.5 / §6.5                                                                                                        | P1       | D6   |
| G7  | `# /ai-widgets` 命名承诺「all widgets showcase」，实际仅 6 个装饰 widget，Reasoning / Tool-call / Citations 未纳入                                                   | `ai-widgets-demo.tsx:24-119`（schema 全量核对）                                                                                                                                                                                  | 分析 §6.6                                                                                                               | P1       | D5   |
| G8  | welcome `icon: 'bot'` 字面渲染为字母 `b o t`，不是图标                                                                                                               | `packages/flux-renderers-ai/src/renderers/ai-welcome.tsx:24-27`（`{resolved.icon}` 字符串直出）                                                                                                                                  | 分析 §2.7                                                                                                               | P2       | D3   |
| G9  | suggestion pill 用 emoji 字符（✏️🌐💡✨➕），跨平台字体差异大、非 lucide 图标                                                                                        | `ai-widgets-demo.tsx:128-134`（`SUGGESTION_ITEMS`）                                                                                                                                                                              | 分析 §2.7                                                                                                               | P2       | D4   |
| G10 | 流式光标技术正确（1s 闪烁）但 15ms/词 × 8 词全程约 120ms，节奏不可感知                                                                                               | `mock-ai-env.ts:43`（`delayMs = 15` 默认）；`styles.css:5-10`（cursor 规则）                                                                                                                                                     | 分析 §2.6                                                                                                               | P2       | D1   |
| G11 | owner-doc gap：live 代码挂 prose 类，但 `design.md` / `renderers.md` 均未文档化 typography 决策（实测非 drift，是文档缺段）                                          | `design.md` §10.4 实写流式 Markdown / LaTeX，不写 prose                                                                                                                                                                          | 分析 §0；roadmap 当前基线 G11 注记                                                                                      | doc gap  | DG   |
| G12 | e2e 仅 10 个 DOM 结构断言，未验证任何视觉产物（typography / avatar / 副作用）                                                                                        | `tests/e2e/ai-widgets-demo.spec.ts`（135 行全量核对，无 `getComputedStyle` / 无截图断言）                                                                                                                                        | 分析 §0；2026-08-24 实跑印证                                                                                            | test gap | DV   |

### 1.3 诊断总评（audit 视角归位）

- **视角 11（产品完成度与主路径清晰度）**：G1 / G4 / G7——界面「看起来完整实际发虚」：装饰 widget 齐全但主路径（发消息 → 得到有价值的富回答 → 按钮驱动对话）无内容产出差异。
- **视角 1 / 7 / 版式层次（图标语义 / 设计令牌 / 排版）**：G2 / G3 / G8 / G9——视觉层欠产品化：裸默认排版、空壳头像、字符串图标、emoji 图标。
- **能力缺口**：G5 / G6——公式与高亮（行业 AI chat 产品基线能力，supersession 已裁定内置）。
- **节奏**：G10——流式演示价值未被看见。
- **治理缺口**：G11（owner-doc）/ G12（验证方式）。
- 行业参照系：shadcn/ui typography 习惯（本仓库 UI 基座）、tiny-robot（OpenTiny）完整设计语言、AI chat 产品惯例（头像 / 图标 / 公式 / 高亮）。**不做像素级克隆**——本文是产品标准，不是 tiny-robot 复刻规格。

## 2. Typography CSS 设计决策（D2 契约）

### 2.1 方案裁定：scoped 自定义 CSS

- ai-bubble markdown 排版走**包内自定义 CSS**，selector 统一以 `[data-slot="ai-bubble-markdown"]` 为前缀，落在 `packages/flux-renderers-ai/src/styles.css`，新增 ≤ 150 行（D2 红线）。
- `markdown.tsx:40` 移除 `prose prose-sm dark:prose-invert`；保留 `max-w-none break-words`（横向溢出防护工具类，与死插件类无关）。
- scope 边界：仅 ai-bubble markdown 公共路径。`rich-text/tiptap-sender.tsx:219` 的 `prose max-w-none` 属 opt-in 子路径独立 scope（A6 P6 lineage 跟踪），本 roadmap 不动。

### 2.2 拒绝 `@tailwindcss/typography` 的体积依据

- 实测（bundlephobia，`@tailwindcss/typography@0.5.16`）：tarball ~25–30 KB / unpacked ~78 KB / gzip ~17 KB。
- 违反包体积纪律：渲染器包不引入仅为一组排版规则服务的大体积插件；本方案 11 元素 + 3 附加项 ≤ 150 行 CSS 即可完整覆盖（§2.4）。
- 全仓 0 引入（2026-08-24 grep 复核）——引入反而是新依赖面。

### 2.3 dark 双触发规则

- **两条触发路径都必须覆盖**：`@media (prefers-color-scheme: dark)` 与 `[data-mode='dark']`。
- **单轴（`data-mode`）理由**：主题系统双轴为 `:root[data-theme='classic'][data-mode='dark']`（`docs/architecture/theme-compatibility.md:165`），ai-bubble 不感知 theme variant，`[data-mode]` 单轴覆盖足够。
- **双轨实现口径**（对齐 `packages/flux-renderers-mobile/src/styles.css:49-59` 先例与 D2 plan Decision）：主题 variables（`:root` + `[data-theme][data-mode]` 解析）优先；同时提供包级自定义属性 + 字面暗色 fallback——standalone host 无 attribute 时，media query 路径仍能生效暗色。
- 验收口径：暗色下 markdown 元素均有样式、无浏览器裸默认残留（D2 dev 双法抽查：devtools `prefers-color-scheme: dark` 模拟 + 手动改根 `data-mode`）。

### 2.4 排版节奏表（元素 → 规则要点 → token 映射）

基准语境：气泡正文 `text-sm`（0.875rem / 14px），行距 1.7。token 表达式为亮色优先值；「dark fallback」为 standalone host 字面回退值（取 theme-tokens classic dark 轴：`--muted 217 33% 18%`、`--muted-foreground 215 25% 75%`、`--border 217 33% 18%`、`--background 222 84% 5%`、`--foreground 210 40% 98%`、`--primary 217 89% 63%`；见 `packages/theme-tokens/src/styles.css:170-216`）。

| 元素              | 规则要点                                                                                                        | token 映射（light → dark fallback）                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 容器              | base 0.875rem / line-height 1.7；不设背景                                                                       | color `hsl(var(--foreground))` → `hsl(210 40% 98%)`                                                                                                          |
| h1                | 1.5rem / 600；margin 1.25em 0 0.5em；首个子元素无 margin-top                                                    | 色 `hsl(var(--foreground))` → `hsl(210 40% 98%)`                                                                                                             |
| h2                | 1.25rem / 600；间距同 h1                                                                                        | 同 h1                                                                                                                                                        |
| h3                | 1.125rem / 600                                                                                                  | 同 h1                                                                                                                                                        |
| h4                | 1rem / 600                                                                                                      | 同 h1                                                                                                                                                        |
| h5                | 0.875rem / 600                                                                                                  | 色 `hsl(var(--muted-foreground))` → `hsl(215 25% 75%)`                                                                                                       |
| h6                | 0.875rem / 600                                                                                                  | 同 h5                                                                                                                                                        |
| p                 | margin 0.5em 0                                                                                                  | —                                                                                                                                                            |
| ul / ol           | margin 0.5em 0；padding-left 1.5em                                                                              | `::marker` 色 `hsl(var(--muted-foreground))` → `hsl(215 25% 75%)`                                                                                            |
| li                | margin 0.25em 0；嵌套列表同规则                                                                                 | —                                                                                                                                                            |
| 任务列表 checkbox | GFM 渲染 `<input type="checkbox" disabled>`；margin-right 0.5em，与 marker 位对齐                               | `accent-color: hsl(var(--primary))` → `hsl(217 89% 63%)`                                                                                                     |
| blockquote        | margin 0.75em 0；padding 0.25em 0.9em；左边框 3px                                                               | border-left `hsl(var(--border))` → `hsl(217 33% 27%)`；bg `hsl(var(--muted))` → `hsl(217 33% 18%)`；文字 `hsl(var(--muted-foreground))` → `hsl(215 25% 75%)` |
| 围栏代码块（pre） | padding 0.75rem 1rem；radius `var(--radius-sm, 8px)`；mono 0.8125rem；overflow-x auto                           | bg `hsl(var(--muted))` → `hsl(222 47% 11%)`；border 1px `hsl(var(--border))` → `hsl(217 33% 23%)`                                                            |
| 行内代码          | padding 0.1em 0.4em；radius 4px；font-size 0.85em；mono                                                         | bg `hsl(var(--muted))` → `hsl(217 33% 26%)`；文字 `hsl(var(--foreground))` → `hsl(210 40% 98%)`                                                              |
| a                 | underline；underline-offset 2px；hover 加粗下划线（thickness 2px）                                              | 色 `hsl(var(--primary))` → `hsl(217 89% 63%)`                                                                                                                |
| table             | border-collapse: collapse；margin 0.75em 0；th/td padding 0.375rem 0.75rem；text-align left；th font-weight 600 | th/td 边框 `hsl(var(--border))` → `hsl(217 33% 27%)`；th bg `hsl(var(--muted))` → `hsl(217 33% 18%)`                                                         |
| hr                | margin 1.25em 0；height 1px；无边框                                                                             | bg `hsl(var(--border))` → `hsl(217 33% 27%)`                                                                                                                 |
| img（附加）       | max-width 100%                                                                                                  | radius `var(--radius-sm, 8px)`                                                                                                                               |
| strong（附加）    | font-weight 600                                                                                                 | 色 `hsl(var(--foreground))` → `hsl(210 40% 98%)`                                                                                                             |
| em（附加）        | font-style italic                                                                                               | —                                                                                                                                                            |

元素集口径：上表 11 个核心元素（容器行不计）即 §4.1 裁定的 fixture 覆盖矩阵元素；`img / strong / em` 为附加项（D2 须样式化，fixture 可使用，不计入 11 元素矩阵）。KaTeX 容器（`.katex` / `.katex-display`）与 lowlight token（`.tok-*`）配色归 D6，不在本表。

## 3. Avatar / Icon 规格（D3 / D4 契约）

### 3.1 气泡 avatar（G3）

| 项          | 规格                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 尺寸        | 32×32 px（`getBoundingClientRect()` 可程序化断言）                                                                                         |
| 形状        | 圆形 `border-radius: 9999px`                                                                                                               |
| 图标        | lucide 按 role 分发：assistant → `Bot`，user → `User`                                                                                      |
| 背景        | `hsl(var(--secondary-surface))`，dark fallback `hsl(217 30% 20%)`（classic dark 轴，`theme-tokens/src/styles.css:178`）                    |
| 边框        | 1px solid `hsl(var(--border))`，dark fallback `hsl(217 33% 27%)`                                                                           |
| 图标色      | `hsl(var(--muted-foreground))`（dark fallback `hsl(215 25% 75%)`）                                                                         |
| marker      | `[data-slot="ai-bubble-avatar"]` + `data-role`（沿用现状 marker，样式落在 `styles.css`）                                                   |
| 可访问性    | 装饰性 `aria-hidden="true"`（沿用现状）；avatar 非交互元素，32px 为视觉规格非触摸目标                                                      |
| host 扩展位 | `AiBubbleViewProps` 增 `avatar?: ReactNode`（向后兼容，缺省走 lucide 默认）；`schemas.ts` `AiBubbleSchema` 增 `avatar` 字段（roadmap §D3） |

lucide `Bot` / `User` 为既有 peer dep（`lucide-react` 已声明于包 `package.json`），不增依赖。

### 3.2 Welcome icon（G8）

- 渲染口径：`icon` 字符串命中预设映射 → 渲染对应 lucide 组件（`<svg>`）；未命中 → 字面字符串 fallback（现状行为，向后兼容，不破坏既有 e2e 的 `ai-welcome-icon` 可见断言）。
- lucide 预设映射表（裁定 6 项常用预设）：

| icon 值     | lucide 组件     | 语义                                |
| ----------- | --------------- | ----------------------------------- |
| `bot`       | `Bot`           | AI 助手（当前 widgets demo 使用值） |
| `user`      | `User`          | 用户                                |
| `sparkles`  | `Sparkles`      | 智能亮点                            |
| `chat`      | `MessageCircle` | 对话                                |
| `lightbulb` | `Lightbulb`     | 建议 / 灵感                         |
| `search`    | `Search`        | 检索 / 探索                         |

- 尺寸规格：24×24 px（lucide 默认 size，视觉密度对齐现状 `text-2xl` = 1.5rem）。
- marker 一致：`data-slot="ai-welcome-icon"` 保持；色 `hsl(var(--muted-foreground))`（dark fallback `hsl(215 25% 75%)`），对齐现状次要色语义。
- host 注入：`AiWelcomeSchema` 增 `iconLucide` 字段（host 注入 lucide component 引用，优先级高于 `icon` 字符串；roadmap §D3）。

### 3.3 Suggestion pill icon（G9，D4 消费）

`ai-suggestions` 的 `icon` 字符串按同一「字符串 → lucide」分发模式处理，预设映射（对齐 `ai-widgets-demo.tsx:128-134` 现有 5 项语义）：

| 现 emoji 值 | 替换 lucide | 语义      |
| ----------- | ----------- | --------- |
| `✏️`        | `Pencil`    | Summarize |
| `🌐`        | `Languages` | Translate |
| `💡`        | `Lightbulb` | Explain   |
| `✨`        | `Sparkles`  | Refine    |
| `➕`        | `Plus`      | Expand    |

未命中映射的字符串降级为字符回退（向后兼容）。分发逻辑在 `ai-suggestions.tsx` 渲染器内（字符串 → 组件映射），与 §3.2 welcome 同模式。

## 4. Fixture 内容标准（D1 契约）

### 4.1 11 种 markdown 元素清单（裁定）

「恰好 11 种」裁定如下（D1 fixture 覆盖矩阵的计数单位；D2 typography 元素集与之对齐，见 §2.4）：

| #   | 元素       | markdown 语法            | e2e 断言锚点（代表选择器）                             |
| --- | ---------- | ------------------------ | ------------------------------------------------------ |
| 1   | 标题       | `#` – `######`           | `[data-slot="ai-bubble-markdown"] h2`（或 h1–h6 任一） |
| 2   | 段落       | 空行分隔                 | `[data-slot="ai-bubble-markdown"] p`                   |
| 3   | 无序列表   | `- item`                 | `… ul > li`                                            |
| 4   | 有序列表   | `1. item`                | `… ol > li`                                            |
| 5   | 任务列表   | `- [x]` / `- [ ]`（GFM） | `… li input[type="checkbox"]`                          |
| 6   | 引用块     | `> quote`                | `… blockquote`                                         |
| 7   | 围栏代码块 | ` ```lang `              | `[data-slot="ai-bubble-pre"]`                          |
| 8   | 行内代码   | `` `code` ``             | `… code:not([class*="language-"])`                     |
| 9   | 链接       | `[text](url)`            | `… a`                                                  |
| 10  | 表格       | GFM pipe table           | `… table`                                              |
| 11  | 分隔线     | `---`                    | `… hr`                                                 |

附加项口径：`img` / `strong` / `em` 为附加项——D2 须样式化（§2.4 已列）、fixture 可使用，但**不计入** 11 元素覆盖矩阵。LaTeX 公式源文本（`$...$` / `$$...$$`）不是 markdown 元素：formula preset 携带源定界符，D1 断言定界符文本存在，D6 后渲染为 `span.katex`。

### 4.2 6 个 preset 内容大纲

分发口径（D1 plan 已定，此处为契约引用）：关键词大小写不敏感、包含匹配；未命中回 default；`fixtures` option 默认 `false`（既有 13 处调用点行为按构造不变）。

| preset    | 关键词         | 语义场景                                                               | 覆盖元素（编号对齐 §4.1）                     | 代表断言锚点                            |
| --------- | -------------- | ---------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------- |
| default   | （未命中回退） | 通用助手问候 + 能力总览：「Hello」开头的自我介绍，展示 markdown 基本面 | 1（h2+h3）、2、3、8、9、11（+strong/em 附加） | `h2` + `ul > li`；bubble 文本含 `Hello` |
| weather   | `weather`      | 7 日天气预报：数据表格 + 出行建议                                      | 1、2、3、4、8、9、10                          | `table`                                 |
| code      | `code`         | 排障帮助：问题定位 + 修复代码 + 步骤                                   | 1、2、4、7、8                                 | `[data-slot="ai-bubble-pre"]`           |
| formula   | `formula`      | 数学/物理公式讲解：块级 + 行内公式 + 名言引用                          | 1、2、3、6（+ `$…$` / `$$…$$` 源定界符）      | `blockquote` + 文本含 `$$`              |
| reasoning | `reasoning`    | 分步思维链：思考摘录 + 验证清单                                        | 1、2、3、5、6（+strong 附加）                 | `li input[type="checkbox"]`             |
| citation  | `citation`     | 带参考来源的总结：要点 + 编号引用列表                                  | 1、2、4、6、8、9、11                          | `ol > li a`                             |

**覆盖矩阵核验（每元素在 6 preset 全集上 ≥ 1）**：

| 元素         | weather | code | formula | reasoning | citation | default |
| ------------ | ------- | ---- | ------- | --------- | -------- | ------- |
| 1 标题       | ✓       | ✓    | ✓       | ✓         | ✓        | ✓       |
| 2 段落       | ✓       | ✓    | ✓       | ✓         | ✓        | ✓       |
| 3 无序列表   | ✓       |      | ✓       | ✓         |          | ✓       |
| 4 有序列表   | ✓       | ✓    |         |           | ✓        |         |
| 5 任务列表   |         |      |         | ✓         |          |         |
| 6 引用块     |         |      | ✓       | ✓         | ✓        |         |
| 7 围栏代码块 |         | ✓    |         |           |          |         |
| 8 行内代码   | ✓       | ✓    |         |           | ✓        | ✓       |
| 9 链接       | ✓       |      |         |           | ✓        | ✓       |
| 10 表格      | ✓       |      |         |           |          |         |
| 11 分隔线    |         |      |         |           | ✓        | ✓       |

约束：

- **default preset 正文第一个词必须是 `Hello`**（兼容 `tests/e2e/ai-widgets-demo.spec.ts:111` 既有断言 `toContainText('Hello')`；发送 `'widgets test'` 不含任何关键词 → 走 default）。
- 关键词避让：6 个关键词不得出现在其余 preset 或 default 的正文首句中，避免 `Echo:` 回显文本误触发（D1 plan 裁定：若碰撞修 fixture 内容不改断言）。
- fixture 最终文本稿归 D1 落地；本表是内容契约（场景 + 覆盖 + 锚点），不是逐字稿。

### 4.3 `formula` 命名裁定（非 `math`）

- **裁定**：公式 preset 触发关键词用 `formula`，不用 `math`。
- 理由：(a) 语义对齐——该 preset 展示的是 D6 KaTeX 渲染产物（数学**公式**排版），非通用 math 话题；(b) 碰撞面——`math` 更常出现在自然语句（如 "do the math"），误触发概率高于 `formula`。
- 变更追溯：roadmap 早期草稿用 `math`，已在 `ai-widgets-product-roadmap.md` D1 注记改名。

## 5. 流式节奏基线（G10）

| 场景                            | delayMs                                                                    | 依据                                                                                                                      |
| ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `# /ai-widgets`（widgets demo） | **200**（`ai-widgets-demo.tsx` 显式传 `{ delayMs: 200, fixtures: true }`） | 光标闪烁周期 1s（`styles.css:5-10`）；15ms/词 × 8 词全程约 120ms 不可感知；200ms/词让流式过程持续数秒、光标与节奏肉眼可见 |
| 其余全部 demo（12 处调用点）    | **15**（默认值不变）                                                       | 既有 13 个 e2e 的流式节奏断言依赖现状；全局默认改动波及全部 demo（roadmap 硬规则：不破坏既有 e2e）                        |

实现口径：`createMockAiEnv(options?: { delayMs?: number; fixtures?: boolean })`，默认 `{ delayMs: 15, fixtures: false }` 与现状逐 chunk 等价（D1 契约）。

## 6. Showcase 完整性口径（D5 契约）

### 6.1 首屏可见 widget 计数口径

- **首屏定义**：initial load 后、无任何用户输入时 viewport 内（Playwright `toBeVisible()` 判定）。
- **计数单位**（两种合格形态，每个 widget type 至多计 1 次）：
  1. live widget renderer 实例：可见的 `ai-*` 渲染器 root `data-slot` marker（`[data-slot^="ai-"]`，取 distinct slot 值）；
  2. 专属 showcase 缩略卡：指向该 widget 完整 demo 路由的 static link 卡（卡内须标注 widget 名，如 Tool Call / Citations）。
- **排除项**（对话管线常驻件，非 showcase 条目）：`ai-chat`（demo 外壳）、`ai-message-list`、`ai-sender`、`ai-bubble`（含其 content renderer）。排除理由：它们在每个 ai-chat demo 中恒存在，不构成 showcase 差异；现状按本口径计数 = 6（welcome / prompts / token-usage / feedback / suggestions / voice-input），与 G7「仅演示 6 个 widget」一致。

### 6.2 目标态清单（≥ 8）

| #   | widget         | 形态                          | 展示位置                                |
| --- | -------------- | ----------------------------- | --------------------------------------- |
| 1   | ai-welcome     | live                          | beforeMessages                          |
| 2   | ai-prompts     | live                          | beforeMessages                          |
| 3   | ai-token-usage | live                          | header                                  |
| 4   | ai-feedback    | live                          | afterMessages                           |
| 5   | ai-suggestions | live                          | afterMessages                           |
| 6   | ai-voice-input | live                          | afterMessages                           |
| 7   | ai-tool-call   | 缩略卡（→ `# /ai-tools`）     | beforeMessages，welcome 与 prompts 之间 |
| 8   | ai-citations   | 缩略卡（→ `# /ai-citations`） | beforeMessages，welcome 与 prompts 之间 |

- **reasoning 例外口径**：Reasoning 是 `ai-bubble` 的 content renderer 之一，无独立路由、无缩略卡（roadmap §D5 明确）；经 fixture `reasoning` preset 触发 `reasoning_content` 字段在对话区展示（D5 结构化扩展）。
- **触发后口径**（对话区，D5 完成判定）：fixture 触发后对话区含 tool-call 卡片 + citations marker + reasoning 折叠面板。
- 缩略卡为 playground-local static link（非 `App.tsx` 顶层 nav 项，不污染全局导航）。
- 程序化判定：Playwright locator 计数（distinct 可见 slot + 卡数 ≥ 8），不做肉眼判定。

## 7. DV 断言清单（DV 契约）

全部程序化（`getComputedStyle` / `getBoundingClientRect` / DOM 结构断言），**不做肉眼截图判定**；`_tmp/ai-widgets-product-snapshot.png` 仅留档对照。`ai-widgets-demo.spec.ts` 从 10 个测试增至 ≥ 16 个（各面 ≥ 1 个增量）。

| 面                 | 断言方式                      | 具体断言                                                                                                                                                                                       | 前置  |
| ------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| typography         | `getComputedStyle`            | fixture 富回复内 `h2` 计算 `fontSize` = 20px（1.25rem，非浏览器默认 1.5em×容器）；`blockquote` 计算 `backgroundColor` 非透明（muted 生效）；`a` 计算 `color` 非 browser 默认蓝（primary 生效） | D1+D2 |
| typography（dark） | `getComputedStyle`            | `prefers-color-scheme: dark` 模拟下 fenced code `backgroundColor` 为暗色 fallback 值                                                                                                           | D2    |
| avatar             | `getBoundingClientRect` + DOM | assistant bubble avatar rect 宽高均 = 32；计算 `borderRadius` = 9999px；内含 lucide `<svg>`                                                                                                    | D3    |
| welcome icon       | DOM                           | `[data-slot="ai-welcome-icon"]` 内含 `<svg>` 且 textContent 不再是字面 `bot` 字母                                                                                                              | D3    |
| 副作用（prompts）  | DOM 状态                      | 点击 prompt 卡 → `[data-slot="ai-sender-input"] textarea` value 变为 prompt label；重复点击不重复追加                                                                                          | D4    |
| 副作用（refresh）  | DOM 计数                      | 点击 refresh → 重新流式 + 计数不变 + branchId 更新（truncate-rerun，D4 裁定；`ai:regenerate` 真实触发）                                                                                        | D4    |
| 副作用（feedback） | DOM 状态                      | like 点击后按钮出现激活态（aria-pressed / 状态类）；message metadata 写入 feedback                                                                                                             | D4    |
| pill icon          | DOM                           | suggestion pill 内含 lucide `<svg>` 而非 emoji 字符                                                                                                                                            | D4    |
| fixture × 6        | DOM                           | 每关键词发送 → 对话区出现 §4.2 代表锚点（weather→table、code→pre、formula→blockquote+`$$`、reasoning→checkbox、citation→`ol li a`）；无关键词 → default 含 `Hello` + `h2`/`ul` 富元素          | D1    |
| showcase           | locator 计数                  | §6.1 口径首屏计数 ≥ 8；触发后对话区含 tool-call 卡 + citations marker + reasoning 折叠                                                                                                         | D5    |
| 公式渲染           | DOM                           | `formula` 触发后 `span.katex` 存在（块级 + 行内）                                                                                                                                              | D6    |
| 代码高亮           | DOM                           | `code` 触发后 `[data-slot="ai-bubble-code"]` 内含 `.tok-*` token span                                                                                                                          | D6    |
| 流式边界           | 行为                          | 流式中 `$\frac{1}{` 未闭合时无 broken math 渲染；fence 未闭合时无 broken fence 渲染                                                                                                            | D6    |
| 节奏               | 行为                          | widgets demo 流式全程时长 ≥ 数秒量级（200ms/词生效的间接证据，不断言精确时长）                                                                                                                 | D1    |

DV 归属说明：D2 的「计算样式测试」在单元层以 CSS 源文本断言落实（jsdom 不加载包级 stylesheet；repo 先例 `packages/ui/src/mobile-styles.test.ts`）；上表 `getComputedStyle` 断言全部归 DV e2e 层。

## 8. 输入依赖一致性核对（收口证据）

逐项核对「下游 plan / roadmap 所需输入 ↔ 本文章节」：

| 消费方                               | 所需输入（引用处）                                                                | spec 章节        | 核对 |
| ------------------------------------ | --------------------------------------------------------------------------------- | ---------------- | ---- |
| D1 plan（Goals / Phase 1 / Phase 2） | 6 preset 大纲 + 11 元素覆盖矩阵 + default 开头词 `Hello` + 关键词（含 `formula`） | §4.1、§4.2、§4.3 | ✓    |
| D1 plan（Phase 3）                   | 流式节奏基线（widgets 200 / 默认 15 / option 口径）                               | §5               | ✓    |
| D2 plan（Goals / Phase 2）           | 排版节奏表（元素 → 规则要点 → CSS variable 映射）+ 元素集裁定 + dark 双触发规则   | §2.3、§2.4、§4.1 | ✓    |
| D2 plan（Test Strategy）             | DV 断言清单中 typography `getComputedStyle` 归属                                  | §7               | ✓    |
| roadmap §D3（avatar）                | 32×32 圆形 / lucide 按 role / 背景与 1px border token 取值 / host 扩展位          | §3.1             | ✓    |
| roadmap §D3（welcome icon）          | lucide 预设映射表 + 字符串回退向后兼容口径 / `iconLucide`                         | §3.2             | ✓    |
| roadmap §D4（G9 pill icon）          | 字符串 → lucide 映射 + 缺失降级                                                   | §3.3             | ✓    |
| roadmap §D5                          | 首屏可见 widget ≥ 8 计数口径与清单                                                | §6               | ✓    |
| roadmap §DV                          | typography / avatar / icon / 副作用 / fixture / 高亮程序化断言基线                | §7               | ✓    |

无悬空引用：D1 / D2 plan 与 roadmap §D3–§D5 / §DV 所需的全部 D0 输入均可在本文找到对应章节。
