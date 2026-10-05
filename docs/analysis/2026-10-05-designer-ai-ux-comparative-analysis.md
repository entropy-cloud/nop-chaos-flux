# Designer 与 AI 交互控件 UI/UX 对标分析报告（~/ai 参考项目）

> Date: 2026-10-05
> Type: deep comparative analysis
> Scope: flow-designer / report-designer(+spreadsheet) / page-designer / word-editor / flux-renderers-ai
> Reference pool: `~/ai/` 下 284 个项目，筛选后深度调研 8 个画布类 + 7 个对话类
> Output: plans 526–529（逐面修正 owner plan）
> Status: final

## 1. 结论摘要

1. **画布内核选型无差距**。~/ai 下 8 个画布类设计器 8/8 使用 reactflow 系（@xyflow/react v12 为主流，Flowise 为 v11 存量，n8n 用 vue-flow 同源 API），本仓库 flow-designer 已用 @xyflow/react ^12.10.2，内核同源。差距不在内核，集中在**包装层细节**：选中态视觉、边/handle 交互反馈、palette 检索、拖拽反馈闭环。
2. **美观性差距的主因是"状态语义视觉缺失"**：业界用 `ring-2 ring-accent + shadow-lg` 表达选中、用红/绿光标表达连接合法性、用状态色 ring 表达校验错误、用动画表达执行流；本仓库 flow 节点选中态落在 xyflow 默认 0.5px 发丝线上（`--xy-node-boxshadow-selected` 未覆盖），基本不可感知。
3. **拖拽便捷性差距的主因是"反馈闭环不完整"**：业界拖拽链路 = 自定义 drag image（按下即有视觉反馈）→ 落点 ghost/插入线（拖动中有位置反馈）→ 吸附/对齐线（落下前有精度反馈）→ 防重叠推挤（落下后有秩序反馈）。本仓库 flow-designer 已有落点 ghost + 对齐吸附（仓库内最佳），但 page-designer 无任何 drag preview、无对齐辅助；report 字段拖放无自定义 preview。
4. **AI 对话控件差距集中在"输入区与操作栏的现代形态"**：自增高 textarea、发送/停止同位切换、hover 浮现操作栏、代码块语言标签头、工具卡内渲染执行结果、思考态三点动画——这六项是 claudecodeui/cline/deer-flow/OpenHands 的共同形态，本仓库 flux-renderers-ai 引擎层扎实（hold-back 缓冲、虚拟滚动、HITL 焦点陷阱均为亮点）但 UI 层停留在基础形态。
5. 修正路线：4 个 owner plan（526 flow / 527 page / 528 report / 529 ai-renderers），每 plan 对应一个独立结果面，执行顺序按"用户感知差距 × 改动风险"排序为 529 → 526 → 527 → 528 或并行；本报告完成后逐 plan 拟制-评审-执行-收口-提交。

## 2. 调研方法与对象

### 2.1 参考项目筛选

`~/ai/` 共 284 项。按"可视化流程/画布 designer"与"AI 对话交互"两条线筛选：

**画布类（8 个确认）**：AutoGPT（autogpt_platform/frontend，@xyflow/react 12.9）、Flowise（packages/ui，reactflow 11）、n8n（editor-ui，@vue-flow/core）、Archon（web，@xyflow/react 12）、deer-flow（frontend，@xyflow/react 12 + ai-elements 组件层）、kanwas（xyflow 白板）、rivet（frontend，xyflow 只读可视化）、dataflow/Paper2Any（reactflow 11）。
排除：CodeFlow-AI（Streamlit 对话助手）、codeflow（静态 SVG 生成）、OpenCreator（无画布依赖）、agent-platforms（kanban）、OpenHands canvas（iframe 扩展面板，非节点图）。

**对话类（7 个确认）**：cline（VSCode webview，React 18 + Tailwind 4 + react-virtuoso）、claudecodeui（React 18 + react-markdown 10 + Socket.IO 流）、continue（IDE GUI + TipTap 输入）、OpenHands（React 19 + framer-motion + i18next）、geekai（Vue3 + Element Plus）、agent-zero（vanilla JS）、deer-flow（Next.js 16 + Vercel AI SDK + streamdown/shiki）、happy（Expo RN，HITL 兜底范本）。
排除：conductor（Netflix 工作流引擎，无对话 UI）。

### 2.2 本仓库盘点范围

packages/{flow-designer-core,flow-designer-renderers,report-designer-core,report-designer-renderers,spreadsheet-core,spreadsheet-renderers,page-designer-core,page-designer-renderers,word-editor-core,word-editor-renderers,editor-core,flux-renderers-ai}，以 playground 路由（`#/flow-designer`、`#/report-designer`、`#/page-designer`、`#/spreadsheet`、`#/word-editor`、`#/ai-*`）与 tests/e2e/ 下对应 spec 为验收面。所有差距条目均经 live repo 核对（文件+行号证据见各节）。

## 3. 业界参考项目深度拆解

### 3.1 画布类共性标准（按采用度排序，8/8 或多数采用）

| #   | 业界标准做法                                                                              | 采用度       | 代表实现（证据路径）                                                            |
| --- | ----------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------- |
| S1  | reactflow 系内核 + 自定义 node/edge/handle 包装层                                         | 8/8          | AutoGPT `FlowEditor/nodes/CustomNode/CustomNode.tsx`                            |
| S2  | HTML5 dataTransfer 拖拽（mime `application/reactflow*`）+ `screenToFlowPosition` 落点换算 | 7/7          | AutoGPT `NewBlockMenu/Block.tsx`（含 setDragImage 自造预览）                    |
| S3  | 选中态公式：`ring-2 ring-accent + shadow-lg`；hover=边框/阴影微变                         | 5/8          | AutoGPT `NodeContainer.tsx`；kanwas `node-card-selected`                        |
| S4  | 边 hover 透明宽命中层（strokeWidth 15–20）+ 中点删除按钮                                  | 6/8          | AutoGPT `CustomEdge.tsx`；n8n `CanvasEdgeToolbar.vue`（+/删除双钮）             |
| S5  | 无效连接即时反馈：handle 红/绿着色 + not-allowed/crosshair 光标                           | 少数但强     | Flowise `views/canvas/index.css` `.react-flow__handle-connecting/-valid`        |
| S6  | 边语义化：条件/非主连接=虚线；执行流=动画（animated/流光/animateMotion）                  | 5/8          | n8n `5,6`；Archon `'6 4'`+紫色；deer-flow `<animateMotion>`                     |
| S7  | handle 视觉重定义：清空 xyflow 默认样式换小圆点/方块，连接后填充变色                      | 4/8          | AutoGPT `flow.css` + `NodeHandle.tsx`（CircleIcon 16px）                        |
| S8  | palette：搜索 + 分类折叠 + 计数/徽标；拖入后自动选中或连续添加                            | 7/7          | Flowise `AddNodes.jsx` 自写模糊评分；AutoGPT 落下重开菜单                       |
| S9  | deleteKeyCode 双键 `["Backspace","Delete"]`；Ctrl+Z/Ctrl+D/框选/右键菜单                  | 主流         | AutoGPT `useCopyPaste.ts`/`NodeRightClickMenu`                                  |
| S10 | 自定义 Controls 胶囊条：zoom/fitView（带 600–800ms 动画）/锁定                            | 主流         | AutoGPT `CustomControl.tsx`                                                     |
| S11 | Dots 背景 gap 20/size 1；子画布条纹 pattern                                               | 主流         | n8n `CanvasBackground.vue` striped                                              |
| S12 | 拖拽开始瞬间（dragging===true）推 undo 快照                                               | 2/8 最优粒度 | Archon `useBuilderUndo`（WorkflowBuilder.tsx:159）                              |
| S13 | 落下防重叠自动推开（R-tree/阈值推移）                                                     | 2/8          | AutoGPT `resolve-collision.ts`（Flatbush，margin 15）；kanwas `canvasLayout.ts` |
| S14 | 双击空白 QuickAdd：不依赖 palette 的第三建模入口                                          | 2/8          | Archon `QuickAddPicker`（300ms 双击检测）                                       |
| S15 | 执行状态上画布：边流光/珠子、节点状态 ring/徽章                                           | AI-flow 标配 | AutoGPT `JSBeads.tsx`；Paper2Any pulse-ring                                     |
| S16 | 节点内联表单 + 高级折叠 vs 面板配置两大流派                                               | 两派         | AutoGPT/Flowise 内联；Paper2Any/Archon 侧栏 Inspector                           |

### 3.2 对话类共性标准（7 项目归纳）

| #   | 业界标准做法                                                                                                       | 代表实现（证据路径）                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | 用户=右对齐真气泡（rounded-2xl bg-muted rounded-br-md，max-w-[85%]），AI=左平铺行                                  | claudecodeui `MessageComponent.tsx`；OpenHands `chat-message.tsx`；deer-flow `message.tsx`                                           |
| C2  | 操作按钮 hover 浮现（`opacity-0 group-hover:opacity-100`），非常驻                                                 | claudecodeui；选中后选择固化在 transcript（cline `OptionsButtons.tsx`）                                                              |
| C3  | 流式 markdown：settled/pending 块边界拆分 + memo，或 streamdown+shiki 专用库                                       | claudecodeui `StreamingMarkdown.tsx`（含选区保持注释+测试）；deer-flow                                                               |
| C4  | "正在做什么"状态行优于三点动画；停止=发送钮同位变身（AbortController）                                             | OpenHands `typing-indicator.tsx`；cline `ActionButtons.tsx` `getButtonConfig`                                                        |
| C5  | 自动滚动三定律：默认跟随/上滚即停/回底或新用户消息恢复                                                             | continue `useAutoScroll.ts`；deer-flow `use-stick-to-bottom`                                                                         |
| C6  | 工具调用折叠卡：单行摘要（图标+动词+目标）收起/参数+结果展开；状态三件套 spinner/check/x；diff 行级红绿 + +/− 徽章 | claudecodeui `ToolRenderer/ToolStatusBadge`；cline `CodeAccordian`（isLoading cursor-wait）；OpenHands `tool-visualizers/primitives` |
| C7  | 按工具语义分类分发专属渲染 + SimpleToolCallUI 兜底                                                                 | claudecodeui `ToolRenderer.tsx`；continue `ToolCallDiv`                                                                              |
| C8  | HITL：内联审批卡优先于模态；输入区上方 banner 承载 pending；批准后转状态展示；未知请求也要可取消 fallback          | happy `AgentQuestionBanner.tsx`；claudecodeui `Confirmation.tsx` slot 协议                                                           |
| C9  | 输入区：自增高 textarea（max-h 40vh 封顶）；@提及/斜杠菜单；附件/粘贴图；发送中排队                                | cline `ChatTextArea.tsx`；claudecodeui `PromptInput.tsx:99` + `QueuedMessageCard`                                                    |
| C10 | 代码块：语言标签 + 复制一体 header；语法高亮完整调色板（shiki/highlight.js 全 scope）                              | geekai markdown-it 注入 header；deer-flow shiki 3.15                                                                                 |
| C11 | 会话侧栏：hover 出 …菜单、行内重命名、运行中禁删；历史懒加载                                                       | claudecodeui `SidebarSessionItem/SessionOptions`                                                                                     |
| C12 | 语义色 token + 深浅主题 + motion-reduce 降级                                                                       | OpenHands `motion-reduce:animate-none`                                                                                               |

### 3.3 值得直接移植的实现清单（含源路径）

1. AutoGPT `flow.css` 式 handle 样式重置 + 圆点 handle 三态（connected→fill/disconnected→duotone/broken→红）。
2. AutoGPT `CustomEdge.tsx` 透明命中层 + EdgeLabelRenderer 中点删除钮。
3. Flowise `index.css` 连接合法性红/绿光标反馈（`.react-flow__handle-connecting{cursor:not-allowed;background:#db4e4e}` / `-valid{cursor:crosshair;background:#5dba62}`）。
4. AutoGPT `Block.tsx` setDragImage 自造 drag preview（动态 div→setDragImage→立即移除）。
5. Archon 拖拽开始即快照的 undo 粒度 + 右键菜单 viewport 钳制（`Math.min(e.clientX, innerWidth-160)` + capture 关闭）。
6. deer-flow `<circle><animateMotion>` 纯 SVG 边流光（零 JS 开销）。
7. claudecodeui `StreamingMarkdown` settled/pending 分块 memo（流式期间稳定块不重解析，保选区）。
8. cline `TypewriterText` 打完转 shimmer 而非光标；`CodeAccordian` 路径 leading-省略号 + isLoading cursor-wait。
9. OpenHands `typing-indicator` 动作级状态文案 + 绿点（motion-reduce 降级）。
10. claudecodeui `ToolStatusBadge` 四态 pill（running 蓝/success 绿/error 红/pending 橙）+ `deriveToolStatus()` 从结果与拒绝消息推断状态。

## 4. 本仓库现状与差距矩阵

### 4.1 flow-designer（基础最好，差距在状态视觉与边交互）

已达标（可作为统一化改造参照实现）：xyflow v12 内核、drop ghost（`designer-xyflow-canvas.tsx:523-537` `data-testid="designer-drop-preview"`）、九轴对齐吸附 6px 阈值（`use-alignment-guides.ts:6`）、minimap+导航（`use-minimap-navigation.ts`）、暗色令牌全套（`designer-theme.css:64-99`）、WorkbenchShell 可调宽面板、undo/redo/copy/paste/duplicate 快捷键（`use-designer-shortcuts.ts:49-99`）、框选 Partial 模式、hover 浮出 NodeToolbar（180ms）。

| 维度           | 业界标准              | 本仓库现状                                                                                    | 证据                                             | 等级                |
| -------------- | --------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------- |
| 节点选中态     | ring-2+shadow-lg      | 未覆盖 `--xy-node-boxshadow-selected`，落 xyflow 默认 0.5px 发丝线；仅 branch 聚焦有 3px 光环 | grep 全包 0 命中；`designer-xyflow-node.tsx:163` | **P0**              |
| 边 hover 删除  | 透明命中层+中点删除钮 | 有 hover 高亮+快捷操作浮卡（160ms），命中层/删除钮形态待核对补强                              | `designer-xyflow-edge.tsx:74`；`canvas:414-424`  | P1                  |
| 连接合法性反馈 | 红/绿 handle+光标     | 无（连接失败仅静默）                                                                          | grep 无 handle-connecting/-valid 样式            | **P0**              |
| palette 搜索   | 搜索+过滤             | 无搜索框，仅计数徽章+折叠；分组箭头用文本 ▼/▶                                                 | `designer-palette.tsx:68-180,112-114`            | **P0**              |
| 方向键微调     | nudge 1px/shift=步长  | 无方向键分支                                                                                  | `use-designer-shortcuts.ts:49-99`                | P1                  |
| 多选拖拽吸附   | 全员支持              | 显式禁用（注释"超出本计划面"）                                                                | `use-alignment-guides.ts:134-143`                | P1                  |
| 右键菜单       | 全员有                | 全包无 onContextMenu                                                                          | grep 0 命中                                      | P1                  |
| 防重叠推挤     | R-tree/阈值           | 无                                                                                            | grep 无 resolve-collision                        | P2（deferred 候选） |
| 双击 QuickAdd  | 2/8 采用              | 无                                                                                            | —                                                | P2（deferred 候选） |

### 4.2 page-designer（自研画布，拖拽反馈与视觉动效差距最大）

已达标：落点指示体系完整（inside 虚线+8% 底/before-after 4px 插入线/invalid 红虚线/空容器占位盒，`canvas-overlay.tsx:47-48,185-290`）、方向键结构导航、undo/redo、palette 搜索过滤（`palette-panel.tsx:66-84`）、Inspector 即时收口事务。

| 维度                  | 业界标准          | 本仓库现状                 | 证据                                                       | 等级                                                     |
| --------------------- | ----------------- | -------------------------- | ---------------------------------------------------------- | -------------------------------------------------------- |
| drag preview          | 自造 ghost        | 无（浏览器默认半透明截图） | `canvas-bridge.tsx` 无 preview 元素                        | **P0**                                                   |
| hover/选中过渡动效    | transition 微动效 | 样式瞬时切换无 transition  | `canvas-overlay.tsx:297,307` 纯 style                      | **P0**                                                   |
| 色彩令牌              | CSS 变量体系      | 硬编码 `#6366f1` 等 12+ 处 | `canvas-overlay.tsx:191,208,241`；`palette-panel.tsx`      | **P0**                                                   |
| 右键菜单              | 全员有            | 无                         | `page-designer-page.tsx` 无 contextmenu                    | P1                                                       |
| 元素级复制/粘贴快捷键 | Ctrl+C/V/D        | 无（duplicate 仅按钮）     | `page-designer-page.tsx:258-295`                           | P1                                                       |
| 图标                  | lucide 全覆盖     | 返回键文本 "←"、状态点 "●" | `page-designer-page.tsx:307`；`designer-node-card.tsx:109` | P1                                                       |
| 框选/多选             | 白板类标配        | 无（selection 恒单元素）   | `page-designer-page.tsx:421,427`                           | P2（flow 布局下业界低代码编辑器多为单选，deferred 候选） |
| 面板调宽              | 两派皆有          | 固定 w-64/w-80             | `page-designer-page.tsx:371,447`                           | P2（Figma 等标杆为固定宽，deferred 候选）                |
| 空状态                | 插画/引导         | 纯文字虚线框               | `page-designer-page.tsx:434-443`                           | P1                                                       |

### 4.3 report-designer / spreadsheet（表格内核成熟，外壳差距）

spreadsheet 本体交互全谱（框选/填充柄/行列 resize+精确对话框/右键菜单/键盘全谱/冻结/批注/查找替换）已是仓库最佳；差距在 report 设计器外壳：

| 维度             | 业界标准         | 本仓库现状                                             | 证据                                       | 等级   |
| ---------------- | ---------------- | ------------------------------------------------------ | ------------------------------------------ | ------ |
| 面板调宽         | 主流             | 左右栏均不可调宽（flow 已接 resizable 而 report 未传） | `page-renderer.tsx:645-674`                | **P0** |
| 字段面板搜索     | palette 搜索标配 | 无过滤                                                 | `report-field-panel.tsx`                   | **P0** |
| 字段拖放 preview | 自造 ghost       | 浏览器默认截图                                         | `report-field-panel.tsx:96-103` 仅 setData | P1     |
| 空态/加载态      | 骨架/插画        | 纯文字三分支                                           | `inspector-shell-renderer.tsx:51-66`       | P1     |

### 4.4 word-editor（外壳为辅，内核依赖 canvas-editor）

Ribbon/缩放/自动保存齐备；差距仅为左右栏不可调宽（`word-editor-page.tsx:337-348`）与空态。视觉主体在 @hufe921/canvas-editor 库内，本仓库可动空间小 → 列入 528 的 out-of-scope 或轻量跟随项，不单开 plan。

### 4.5 flux-renderers-ai（引擎强、UI 基础形态）

已达标（对照组亮点）：流式光标+reduced-motion（`styles.css:5-22`）、markdown hold-back 缓冲+80ms 节流（`markdown-buffer.ts`/`markdown.tsx:47-84`）、scroll-to-bottom 浮钮、代码块/整消息复制、HITL 完整焦点陷阱（`ai-tool-call.tsx:70-136`）、分支 prev/next、消息编辑重发、200+ 条虚拟滚动、IME 守卫、DOMPurify 消毒链。

| 维度                   | 业界标准      | 本仓库现状                                                              | 证据                                                                               | 等级                     |
| ---------------------- | ------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| textarea 自增高        | C9            | 固定 `rows={1}` 40px                                                    | `ai-sender.tsx:212,221-222`                                                        | **P0**                   |
| 发送/停止同位切换      | C4            | 文字 "Send" 无图标；Stop 是并列 outline 钮                              | `ai-sender.tsx:135-148`                                                            | **P0**                   |
| 操作栏 hover 浮现      | C2            | copy/retry 常驻每条气泡                                                 | `assistant-actions.tsx:60-77`；`styles.css:533-559`                                | **P0**                   |
| 代码块语言标签头       | C10           | 只有 copy 按钮，无语言标签                                              | `markdown.tsx:318-338`                                                             | **P0**                   |
| 思考态动画             | 三点脉冲/骨架 | 小 Spinner+文字                                                         | `loading.tsx`                                                                      | P1                       |
| 工具卡渲染 result      | C6            | 有 `state.result` 字段但从不渲染；tool 消息回落普通 markdown 无专属样式 | `ai-tool-call.tsx`（grep "result" 0 命中）；`default-renderers.ts` 无 tool matcher | **P0**                   |
| 用户气泡 copy          | C2            | 仅编辑铅笔                                                              | `user-edit.tsx`                                                                    | P1                       |
| 气泡阴影/角色差        | C1            | 无阴影，仅底色+对齐区分                                                 | `styles.css:486-509`                                                               | P1                       |
| 会话列表搜索/预览      | C11           | 无搜索、无最后消息预览                                                  | `ai-conversations.tsx:88-172`                                                      | P1                       |
| 高亮调色板             | C10 全 scope  | 仅 5 语义色                                                             | `markdown.tsx:178-210`                                                             | P2（deferred 候选）      |
| 受控 reasoning 可收起  | —             | 受控 open 时按钮 disabled                                               | `reasoning.tsx:62`                                                                 | P2（契约面，deferred）   |
| 头像/时间戳默认值      | C1 默认开     | 默认关（owner doc 记录的设计决策）                                      | `ai-bubble/index.tsx:104-105`                                                      | P2（产品决策，deferred） |
| 图片 lightbox          | —             | 纯 img 网格                                                             | `image.tsx:31-41`                                                                  | P2（deferred）           |
| 虚拟列表尾部 note 遮挡 | —             | note 排在虚拟窗口后可能被 spacer 遮挡                                   | `ai-message-list.tsx:177-212`                                                      | P1（正确性）             |

### 4.6 跨 designer 共性差距（合并到各 owner plan 内消化）

1. 无右键上下文菜单（flow/page；spreadsheet 已有 → 以 `@nop-chaos/ui` ContextMenu 既有用法为仓内参照）。
2. 图标混用（文本 ▼/▶/←/● → lucide 统一）。
3. 空态/加载态纯文字（→ 统一轻量样式：虚线框+图标+引导动作）。
4. 动效缺失（overlay/选中/hover 无 transition；spreadsheet 的 120–150ms transition 是仓内参照尺度）。

## 5. 修正路线图（plans 526–529）

按"同一结果面合并为一个 owner plan"（plan guide Rule 25/26）：

| Plan | 结果面                             | 核心交付                                                                                                                                                                       | 优先级 |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 526  | flow-designer 拖拽与状态视觉       | 选中态 ring/shadow 令牌、连接合法性红绿反馈、边命中层强化、palette 搜索+图标、方向键 nudge、多选拖拽吸附、节点/边右键菜单                                                      | P0/P1  |
| 527  | page-designer 拖拽反馈与视觉一致性 | drag ghost、overlay transition、色彩令牌化、右键菜单、copy/paste/duplicate 快捷键、lucide 图标、空态升级                                                                       | P0/P1  |
| 528  | report-designer 外壳体验           | 面板可调宽、字段面板搜索、拖放 ghost、空态/加载态升级；word-editor 面板调宽跟随                                                                                                | P0/P1  |
| 529  | flux-renderers-ai 对话控件现代化   | sender 自增高+图标钮同位停止、hover 操作栏、代码块语言标签头、思考态三点动画、工具卡 result 渲染+tool 角色样式、用户气泡 copy、气泡阴影、会话搜索/预览、虚拟列表 note 遮挡修复 | P0/P1  |

统一 deferred（各 plan 内裁定，非阻塞）：防重叠推挤、双击 QuickAdd、page 框选多选、高亮全调色板、受控 reasoning 回写、头像/时间戳默认值、图片 lightbox、边流光执行可视化（执行语义接入后）。

## 6. 验收基线

- 每个 plan：focused 单测/e2e（flow-designer-_ / page-designer-_ / report-designer-_ / ai-_ 既有 spec 家族扩展或新增 spec）+ Closure Gates 全量 `pnpm typecheck/build/lint/test`。
- 视觉验收：playground 路由 `#/flow-designer`、`#/page-designer`、`#/report-designer`、`#/spreadsheet`、`#/word-editor`、`#/ai-chat` 等 lab 路由人工/视觉核对；Pass/fail 判定一律程序化（locator/getComputedStyle）。
- 完成后 `pnpm check` 零新增命中（对照 registered 红名单）。
