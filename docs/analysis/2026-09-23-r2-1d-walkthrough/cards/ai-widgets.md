# [card] page:ai-widgets

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-widgets` ｜ **载体**: 域页面（AI Widgets Showcase：welcome/prompts/feedback/suggestions/voice/citations/token-usage 全件展示 + 真实 chat 上下文）
- **矩阵裁剪**: simplified（matrixReason：组件画廊 demo，无 Dialog/Sheet/拖拽 → H 以 3 个点击型 Popover 抽查（sources/suggestions/citation）、A6/A8 n/a；briefing 指定“逐组件元素态抽样”未裁剪（prompt hover、feedback 点击态、citation hover、voice 点击、token 环）；attachments/expand-popover 两件未入本页 schema（属 ai-attachments/ai-citations 独立页），标 n/a；glass 统一裁剪；窄视口 800px 一档）
- 本页实际裁掉的状态：glass 皮肤、375 移动档、语音真实识别链路（headless 环境限制）

## 1. 截图清单

| 状态                       | light                                                                                  | dark                                 |
| -------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------ |
| 默认 1280×800              | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-widgets/ai-widgets-default-1280-light.png` | `…/ai-widgets-default-1280-dark.png` |
| 默认 800×900               | `…/ai-widgets-default-800-light.png`                                                   | `…/ai-widgets-default-800-dark.png`  |
| prompt chip hover          | `…/ai-widgets-prompt-hover-light.png`                                                  | —（hover 族 light 已坐实）           |
| prompt 点击 → 草稿注入     | `…/ai-widgets-prompt-clicked-light.png`                                                | —                                    |
| feedback 赞 点击态 + toast | `…/ai-widgets-feedback-like-light.png`                                                 | —                                    |
| feedback 来源 popover 打开 | `…/ai-widgets-sources-popover-light.png`                                               | —（dark 亮底已知族）                 |
| citation [1] hover         | `…/ai-widgets-citation-hover-light.png`（不开，见 A1-01）                              | —                                    |
| voice 点击                 | `…/ai-widgets-voice-toast-light.png`                                                   | —                                    |
| 发送后流式中               | `…/ai-widgets-streaming-mid-light.png`                                                 | —                                    |
| 完成/长流 markdown         | `…/ai-widgets-completed-light.png`                                                     | `…/ai-widgets-completed-dark.png`    |
| chip Tab focus             | `…/ai-widgets-focus-visible-chip-clip.png`                                             | —                                    |

## 2. A–H 维度勾选表

- A 交互：A1 **fail(R2-1d-A1-01)**（citation hover 承诺无实现）A2 pass（chip focus 环 clip 证据）A3 **fail(R2-1d-A3-01)**（citation 触发钮 8.7×24）A4 pass（发送 disabled）A5 pass（流式有光标+停止；空列表有 welcome+prompts 引导）A6 n/a A7 n/a A8 n/a A9 pass（prompt→草稿注入断言、赞→toast+按钮态、发送→流式→回显）
- B 颜色：B1 warn(R2-1d-B1-01 systemic) B2 pass B3 pass（赞选中 primary 蓝=激活语义，无默认蓝裸奔问题——primary 即品牌激活色）B4 pass B5 pass（dark 全量复检，仅弹层亮底已知族）B6 pass
- C 布局：C1 **fail(R2-1d-C1-01)**（发送钮底部溢出视口 12px 被裁）C2 warn(R2-1d-C2-01 shell 浮件；800 宽下主题浮件还压住输入框右段) C3 pass C4 pass（800 宽压缩正常）C5 pass C6 pass（token 环 28×28 完整）
- D 间隔：D1 pass D2 pass D3 pass D4 pass D5 pass D6 n/a D7 pass（flex-wrap 行间负 gap 为脚本误报）D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 pass E6 warn(R2-1d-E6-01 feedback 操作条无主体消息)
- F 一致性：F1 pass（与 ai-p4 的图标差异为 demo 数据，观察不立案）F2–F4 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a（无 Dialog/Sheet/Drawer；3 个 Popover 打开态基本完整：点外/Esc 关、内容型宽度 w-72 阶梯外合规；dark 亮底已知族命中确认）

## 3. 发现条目

### [R2-1d-C1-01] chat 容器高度魔数与实际头部不符，发送按钮被视口下缘裁切

- **页面/路由**: `#/ai-widgets`（schema `ai-chat` className `h-[calc(100vh-57px)]`）
- **主题/视口/状态**: light+dark / 1280×800 与 800×900 / 默认态即可复现
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-widgets/ai-widgets-default-1280-light.png`（右下 “发送” 仅剩上半）
- **目视描述**: 发送按钮一半在视口外；输入区贴视口底且被裁。
- **程序化证据**: 探针: rect 测量 + computed 高度链；输出: headerH=53、chatTop=69（页头 53 + page-body 上边距 16）、chatH=743（=100vh−57）、senderBottom=**812 > 800**（submitClipped=true）。魔数 57 未含 page-body 的 16px。
- **对照基准**: 检查提示词 C1（无意外溢出/控件被裁）；WCAG 2.4.11 精神（主操作不得被边缘裁切）。
- **严重程度**: P1（主操作按钮默认视口下不可完整点达，首屏高频路径）
- **用户影响**: 发送按钮必须滚动/盲点下半区；窄视口更甚。
- **修复方向**: `apps/playground/src/pages/ai-widgets-demo.tsx` SCHEMA：`h-[calc(100vh-57px)]` → `h-[calc(100vh-69px)]`，或改 flex 布局（外层 `main` min-h-0 + `flex-1`）消除魔数；同型魔数建议 grep 全 playground demo schema。
- **归族**: local → R2-4 批（本页 demo schema 专属）
- **复核状态**: 未复核

### [R2-1d-A3-01] citation 触发按钮仅 8.7px 宽（<24px 下限）

- **页面/路由**: `#/ai-widgets`（ai-citations [1]/[2] 标记；`#/ai-citations` 页同组件）
- **主题/视口/状态**: light+dark / 全视口 / 默认态
- **截图**: `…/ai-widgets-default-1280-light.png`（[1] [2] 上标）
- **目视描述**: 正文行内 [1]/[2] 为超小上标按钮，点击热区极窄。
- **程序化证据**: 探针: `[data-slot="ai-citation-trigger"]` rect；输出: **8.7×24px**（w=8.7），aria-label=“引用 1”。TARGET_SNIPPET 双视口命中。
- **对照基准**: WCAG 2.5.8 可点击目标最小 24×24 CSS px（按钮为独立交互目标，不属 inline 文本豁免）。
- **严重程度**: P3（点击仍可行，误触率高；触屏影响更大）
- **用户影响**: 触屏用户难命中引用来源卡入口。
- **修复方向**: `packages/flux-renderers-ai/src/renderers/ai-citations.tsx` 触发钮在 `px-0` 基础上加 `min-w-6`（24px）+负 margin 视觉补偿（`-mx-1`），保视觉紧凑、扩热区。
- **归族**: systemic → R2-3 批（ai-citations 渲染器跨页共用：ai-widgets/ai-citations/任何带引用的消息流）
- **复核状态**: 未复核

### [R2-1d-A1-01] citation 交互承诺 hover，实现为 click-only popover

- **页面/路由**: `#/ai-widgets`（页面明示文案 “Citations — hover a [N] marker for its source card”）
- **主题/视口/状态**: light / 1280×800 / 悬停 [1]
- **截图**: `…/ai-widgets-citation-hover-light.png`（悬停 500ms 后无 popover）
- **目视描述**: 按页面指引悬停 [1]，来源卡不出现；仅 focus 环亮起。点击才打开 Popover。
- **程序化证据**: 探针: hover 500ms 后 `[data-radix-popper-content-wrapper]` 存在性；输出: `open:false`（悬停无浮层）；源码 `ai-citations.tsx` 用 `Popover/PopoverTrigger`（click 型）。
- **对照基准**: 检查提示词 A1（可供性/承诺的 hover 态存在且可感知）、F4（文案与行为一致）。
- **严重程度**: P3
- **用户影响**: 照页面提示操作的用户得不到反馈，误以为功能损坏。
- **修复方向**: 二选一：`ai-citations.tsx` 换 HoverCard（对齐设计注释 “hoverable sup source cards”），或改 demo/文档文案为 “click a [N] marker”（`ai-widgets-demo.tsx` 页内提示行）。
- **归族**: local → R2-4 批（demo 文案与渲染器实现口径二选一对齐）
- **复核状态**: 未复核

### [R2-1d-E6-01] feedback 操作条孤立渲染：对应消息内容不可见

- **页面/路由**: `#/ai-widgets`（afterMessages 区 ai-feedback）
- **主题/视口/状态**: light+dark / 1280×800 / 首屏默认态
- **截图**: `…/ai-widgets-default-1280-light.png`（“复制 重试 赞 踩 来源” 悬于空列表与 suggestions 之间）
- **目视描述**: 首屏出现一排反馈按钮，但其绑定的 `${feedbackMsg}`（“AI Widgets Showcase — feedback actions…”）从未在页面上渲染，按钮无评价对象。
- **程序化证据**: 探针: 页面全文检索 feedbackMsg.content 片段；输出: 0 命中（消息体未渲染），feedback 绑定 id `m_fb_widgets` 的 toast 可触发（A9 正常）。
- **对照基准**: 检查提示词 E6（三态任务引导，非“组件壳堆叠”）。
- **严重程度**: P3
- **用户影响**: 首屏组件语义断裂：赞/踩没有对象；来源弹层弹出后更觉突兀。
- **修复方向**: `ai-widgets-demo.tsx`：feedback 移入一条真实 assistant 气泡的动作区（ai-bubble 的 assistant-actions 槽），或 afterMessages 补一条只读消息文本承载 feedbackMsg.content。
- **归族**: local → R2-4 批（本页 demo 编排问题）
- **复核状态**: 未复核

### [R2-1d-B1-01] / [R2-1d-C2-01]（跨页族，本页命中）

- dark 主按钮白字 3.26:1（发送钮）与 shell 浮件重叠（debugger “流 0” 压 Back；800 宽下主题切换浮件压输入框右段）——全文见 `cards/ai-linkage.md`；本页为两族命中页且 C2 在 800 宽下新增“浮件压输入框”证据。

## 4. 误报排除记录

- 流式中间帧右缘出现的白色圆角条残影（`streaming-mid-light.png`）：下一帧消失，判定为 scroll-to-bottom FAB 淡入中间帧 [visual-only] 瞬态，不复现不立案。
- 发送后 mock 长回复流式期间消息列表自动跟随滚动、顶部气泡被列表上缘裁切：聊天自动跟随惯例，不报。
- markdown 回复内的行内 link 命中高度 16px（TARGET_SNIPPET）：正文行内链接属 WCAG 2.5.8 inline 豁免，不报。
- token-usage 行内 span 负 gap / SVG 同心圆负 gap：环上文字叠印设计，目视正常。

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；C1-01→R2-4、A3-01→R2-3、A1-01→R2-4、E6-01→R2-4 归族后 → `digested`。
