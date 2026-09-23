# [card] page:ai-chat

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/ai-chat` ｜ **载体**: 域页面（flux-renderers-ai P0 demo：ai-chat + ai-message-list + ai-bubble + ai-sender，mock 流式连接器）
- **矩阵裁剪**: simplified（matrixReason：控件 demo 页，无 Dialog/Sheet/Drawer → H 全列 n/a；无拖拽面 → A6/A8 n/a；异步只有 mock 流，loading 中间态以 data-state 轮询 + 截帧代替；glass 皮肤未跑）
- 本页实际裁掉的状态：glass 皮肤、选中态、弹层打开、拖拽、~375 移动档

## 1. 截图清单

| 状态                                  | light                                                                                      | dark                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| 默认 1280×800（空态）                 | `_tmp/visual-inspection-2026-09-23/r2-1d/ai-chat/default-light.png`                        | `default-dark.png`                    |
| 默认 ~800 宽                          | `default-narrow-light.png`                                                                 | `default-narrow-dark.png`             |
| 流式中（data-state=processing，截帧） | `external-send-mid-light.png`（见 component-handle 目录同构）／本页以探针轮询记录（见 §3） | `processing-dark.png`（流式光标可见） |
| 流式完成（data-state=completed）      | `completed-light.png`                                                                      | `completed-dark.png`                  |
| 气泡 hover（操作栏可见）              | `bubble-hover-light.png`                                                                   | —（light 已坐实）                     |
| 复制/重试点击后                       | `copy-feedback-light.png`                                                                  | —                                     |
| sender 几何取证帧                     | —                                                                                          | `sender-geom-dark.png`                |

## 2. A–H 维度勾选表

- A 交互：A1 pass（气泡 hover 出现 复制/重试 操作栏，28×28，opacity 1）A2 pass（textarea Tab 聚焦 ring 可见，box-shadow oklab 环）A3 pass（本页最小可点击目标 28px）A4 pass（空文案发送键 disabled=true + opacity .5，程序化核实）A5 pass（流式有光标+停止钮；**空态无提示 → 见 E6**）A6 n/a A7 n/a A8 n/a A9 pass（copy 点击 → Copy→Check 图标切换 1.5s；探针首测点击的是重试钮，无 toast 属预期）
- B 颜色：B1 pass B2 pass（focus ring 可辨）B3 pass（用户气泡 primary 浅底、error/destructive 未触发）B4 pass（computed 值均走令牌）B5 pass（dark 全量复拍无纯白块、正文可读）B6 pass
- C 布局：C1 pass（overflow 扫描 1280/dark/narrow 均空）C2 **fail(R2-1d-C2-01)**（playground debugger 悬浮球压 Back 按钮，详见发现）C3 pass（header/messages/sender 分区清晰）C4 pass（800px 下 max-w-3xl 居中不塌）C5 pass（消息区内部滚动，无双滚动条）C6 n/a
- D 间隔：D1 pass（气泡/输入区节奏 8pt 栅格）D2 pass D3 pass D4 pass D5 pass D6 n/a D7 **warn(R2-1d-D7-01)**（发送钮与 textarea 0px 贴死）D8 pass
- E 排布：E1 pass E2 pass E3 pass（气泡操作栏左置、发送右下）E4 pass E5 pass E6 **fail(R2-1d-E6-01)**（空消息区完全空白，无引导）
- F 一致性：F1 pass F2 n/a F3 pass F4 **fail(R2-1d-F4-01)**（页面 chrome 英文、AI 控件串全中文：发送/停止/复制 aria=复制/重试 aria）F5 n/a
- G 设计器：n/a（非画布页）
- H 弹层：n/a（全列）

## 3. 发现条目

### [R2-1d-C2-01] debugger 悬浮球压住演示页 Back 按钮（46% 面积重叠）

- **页面/路由**: `#/ai-chat`（7 页 ai-\* 全部复现，属 playground 壳层问题）
- **主题/视口/状态**: light+dark / 1280×800 / 页面加载即现
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-chat/default-light.png`（左上角白底 pill 压住 "← Back"）
- **目视描述**: 左上角 "← Back" 按钮被 ndbg debugger 悬浮球（bug 图标 + 计数 pill）叠压，标题区视觉脏。
- **程序化证据**:
  - 探针: `pill.getBoundingClientRect()` vs `back.getBoundingClientRect()` + `elementFromPoint(back 中心)`
  - 输出: pill 55×28 @(24,24)，Back 68×28 @(12,12)，**重叠面积占 Back 按钮 46%**；hit-test 显示 Back 仍在上层可点（压住区的点击会误触 Back 而非 debugger）。
- **对照基准**: 检查提示词 C2（浮层压内容/浮层压操作）；NN/g 可供性（控件互叠造成双义点击区）。
- **严重程度**: P2（视觉叠压明显 + 误触风险；debugger 计数>0 时更宽）
- **用户影响**: 所有演示页首屏左上角永久性视觉冲突；用户想点 debugger 时点到 Back 直接离开页面。
- **修复方向**: `packages/nop-debugger/src/panel.tsx` launcher 默认落位改为 `right-3 bottom-3` 一类不与 demo header 重叠的锚点，或默认折叠为 16px 图标（现 icon 16×16 仅 8% 重叠，pill 才是主因）。
- **归族**: systemic → R2-3 批（playground 壳层，波内 7/7 页复现）
- **复核状态**: 未复核

### [R2-1d-F4-01] AI 控件文案全中文，宿主页面英文——locale 未随宿主

- **页面/路由**: `#/ai-chat`（ai-\* 7 页全复现；ai-hitl 页显式 `initFluxI18n({lng:'en-US'})` 仍中文）
- **主题/视口/状态**: 全主题/全视口 / 默认进入即现
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-chat/completed-light.png`（发送/停止）、`_tmp/visual-inspection-2026-09-23/r2-1d/ai-hitl/approved-light.png`（批准/已批准 vs 英文 Reset）
- **目视描述**: 页头 "AI Chat — P0 Mock Streaming Loop" 英文，发送钮 "发送"、气泡 aria "复制/重试"、HITL "批准/拒绝/已批准"、错误 "AI 请求失败" 全中文，同一屏两种语言。
- **程序化证据**:
  - 探针: `querySelector('[data-slot="ai-sender-submit"]').textContent` / bubble 按钮 aria-label 抽取
  - 输出: submit=“发送”、copy aria=“复制”、retry aria=“重试”；`packages/flux-i18n/src/locales/en-US.ts` L72/75/112/113 **存在** `send:'Send'/approve:'Approve'` 等键 → 非资源缺失，是 `initFluxI18n` 单例二次初始化不生效（demo 页逐页 init 无效）。
- **对照基准**: 检查提示词 F4（同一概念不混用两种叫法/语言）；styling-system.md variant 词汇边界（文案属于渲染面契约的一部分）。
- **严重程度**: P2（跨页系统性语言混排，英文宿主不可读面大）
- **用户影响**: 英文用户面对发送/停止/批准等关键操作只能靠图标猜；aria-label 亦中文，读屏体验与宿主语言断裂。
- **修复方向**: playground App 层一次性 `initFluxI18n({lng:'en-US'})`（App.tsx 模块顶层），删除各 demo 页散落的 init 调用；或在 flux-i18n 增加显式 re-init/`changeLanguage` 通道供页面设置。
- **归族**: systemic → R2-3 批（i18n 治理，波内 7/7 页复现）
- **复核状态**: 未复核

### [R2-1d-D7-01] 发送/停止按钮与 textarea 0px 贴死，盖住聚焦环

- **页面/路由**: `#/ai-chat`（所有含 ai-sender 的页面：conversations/attachments/component-handle/coverage）
- **主题/视口/状态**: light+dark / 1280×800 / textarea 聚焦时
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-chat/sender-geom-dark.png`、`completed-light.png`（发送钮压在 textarea 蓝色聚焦环下缘）
- **目视描述**: “发送”胶囊按钮上缘与 textarea 下边框无任何间隙，聚焦环被按钮直接截断，视觉上像按钮“长”在输入框上。
- **程序化证据**:
  - 探针: `submitRect.top - textareaRect.bottom`
  - 输出: **gap = 0px**（textarea bottom=601，submit top=601，actions 行 28px 高）；shadcn focus ring 为外扩 box-shadow，恰好落在按钮占位区。
- **对照基准**: 检查提示词 D7（功能异组兄弟块 <4px 进复验；输入区与操作条为异组）；styling-system.md Context-Based Spacing（Footer items 8px）。
- **严重程度**: P3
- **用户影响**: 观感粗糙，聚焦输入时环被切；不阻碍任务。
- **修复方向**: `packages/flux-renderers-ai/src/renderers/ai-sender.tsx` 非 extension 路径给 `{actions}` 包一层 `mt-2`（或 chat 根 gap 已有 12px 的场景下给 actions `pt-1`），对齐 Footer items 8px 惯例。
- **归族**: local → R2-4 批（单组件根因，5 页受益）
- **复核状态**: 未复核

### [R2-1d-E6-01] 默认空态消息区完全空白，无任务引导

- **页面/路由**: `#/ai-chat`（schema 未配 emptyState 槽时的默认渲染路径）
- **主题/视口/状态**: light+dark / 1280×800 / 首屏
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/ai-chat/default-light.png`
- **目视描述**: header 与 sender 之间约 500px 高的区域纯空白，无 welcome/提示/建议。
- **程序化证据**:
  - 探针: `document.querySelector('[data-slot="ai-chat-empty"]')` 存在性 + ai-message-list.tsx L145 `{props.emptyNode ?? null}`
  - 输出: emptyNode 为 undefined 时该槽渲染 null → 空白；仅 engine-null-switch 分支有默认文案（ai-chat.tsx L557），普通空态无默认兜底。
- **对照基准**: 检查提示词 E6/A5（空态有意义提示非空白）。
- **严重程度**: P3
- **用户影响**: 首屏“组件壳堆叠”感；新用户不知能做什么（placeholder 文案是唯一线索）。
- **修复方向**: ai-message-list 空态兜底渲染一行 `t('flux.ai.noMessages')` 式 muted 提示，或 demo schema 挂 `ai-welcome`（coverage 页已证 emptyState 槽可用）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后由汇总 agent 统一回写 ledger（本波 agent 只写 cards/ 目录）。
