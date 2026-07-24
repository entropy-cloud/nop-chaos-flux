# AI 组件交互品质审计（§4）

> 日期：2026-07-24
> 审计对象：`packages/flux-renderers-ai/src/renderers/`（`ai-chat`、`ai-message-list`、`ai-sender`、`ai-conversations`、`ai-voice-input`、`ai-suggestions`、`ai-attachments`）及 `styles.css`、`ai-bubble/*`
> 审计 skill：`docs/skills/complex-component-display-operability-audit-prompt.md` §4.1–4.10
> 方法：纯源码静态核查（file:line 证据）
> 参考实现：tiny-robot（见 `docs/analysis/ai-survey/2026-07-21-tiny-robot-deep-analysis.md`）

---

## 0. 跨组件 CSS / 动画总览（决定大部分结论）

整个 `flux-renderers-ai` 包**仅有一个 CSS 文件** `styles.css`（123 行）。

- `@keyframes` 仅 **2 个**：`flux-ai-cursor-blink`（流式光标，`styles.css:3-21`）、`flux-ai-voice-wave`（语音波形，`styles.css:23-62`）。
- `transition:` 声明：**0 个**（grep 全包零命中）。
- `requestAnimationFrame`：仅 1 处（`ai-sender.tsx:64` 提交后回焦）。
- `debounce`/`throttle`：0 处。
- `prefers-reduced-motion`：2 处，仅包裹上述两个 keyframes。

**结论**：AI 包几乎没有过渡动画基础设施。所有"动画"靠 2 个 keyframes + shadcn `<Spinner>`。这与 tiny-robot 的设计有本质差距——tiny-robot 的 Bubble 有 `groupStrategy`、`divider`、状态过渡等（见参考分析 §2.7），Flux AI 目前是"数据层正确，视觉层静态"。

---

## §4.1 输入激活与触发阈值（按子组件）

### ai-chat

#### [P2] schema 声明 `autofocus` 但渲染器从不消费

- 类别：交互品质(§4.1)
- 位置：`schemas.ts:24`（`autofocus?: boolean`）vs grep `autofocus` 在 `ai-chat.tsx` 零消费
- 证据：`AiChatRenderer` 把 placeholder/submitType 透传给 `AiSenderView`（`ai-chat.tsx:294-302`），但没传 autofocus，sender 输入框也无 `autoFocus`。
- 应为之值：schema 声明的属性应被消费，否则删除声明。
- 修复方向：sender 输入框按 `resolved.autofocus` 设 `autoFocus`。

#### [P2] 对话切换是硬 DOM 替换，无淡入淡出

- 类别：交互品质(§4.1/§4.10）
- 位置：`ai-chat.tsx:244-261`（engineNullSwitch 渲染 empty 态）
- 证据：empty DOM 直接卸载、message list 直接挂载，无 `transition` 规则。
- 用户可见症状：切换对话时内容瞬间闪跳。
- 修复方向：加 fade 过渡或 skeleton 桥接。

### ai-sender

#### [P1] 无 IME 组合输入保护，CJK 用户回车确认候选词会误发送

- 类别：交互品质(§4.1)
- 位置：`ai-sender.tsx:32-38`
- 证据：
  ```ts
  function shouldSubmit(event, mode) {
    if (event.key !== 'Enter') return false;
    if (mode === 'enter') return !event.shiftKey;
    ...
  }
  ```
  grep `isComposing` 全包零命中。
- 应为之值：`event.isComposing === true` 或 `event.keyCode === 229` 时忽略 Enter（行业惯例，所有主流 IME 输入框均做此保护）。
- 用户可见症状：中文/日文用户在输入法候选词窗按回车选词，消息被提前发送。
- 修复方向：`shouldSubmit` 内 `if (event.nativeEvent.isComposing) return false;`。

#### [P3] 发送按钮无内置 spinner（仅 disabled + 独立 Stop 按钮）

- 类别：交互品质(§4.6)
- 位置：`ai-sender.tsx:90-103`
- 修复方向：可选，loading 时按钮内放 `<Spinner size="xs">`。

## §4.3 消息入站/插入动画

### ai-message-list

#### [P2] 新消息插入无动画，瞬间出现

- 类别：交互品质(§4.3)
- 位置：`ai-message-list.tsx:108-117`（`messages.map(...)` 同步渲染）
- 证据：grep `@keyframes|transition:|animation:` 针对 `[data-slot='ai-message-list']`/`[data-slot='ai-bubble']` 无命中。
- 应为之值：新消息应有淡入/上滑入场（参考主流聊天 UI）。
- 用户可见症状：流式/新消息"砰"地出现，无过渡。
- 修复方向：给 bubble 加 `@keyframes ai-bubble-enter`。

#### [P2] auto-scroll 未做 rAF 批处理，流式逐字触发

- 类别：交互品质(§4.3/§4.5）
- 位置：`adapters/use-auto-scroll.ts:30-58`、触发源 `ai-message-list.tsx:17-49`
- 证据：trigger 串含最后一条消息内容长度，流式每 chunk 都改 trigger → effect 每次同步 `el.scrollTop = el.scrollHeight`，无 rAF 合并。
- 应为之值：用 rAF coalesce 滚动写入。
- 用户可见症状：快速流式时滚动可能抖动。
- 修复方向：effect 内用 rAF 包裹 scrollTop 赋值。

#### [P2] 无"未读/新消息在下"分隔标记

- 类别：交互品质(§4.6）
- 位置：grep `unread|seen|new-divider` 全包零命中
- 修复方向：可选功能，按需引入。

## §4.5 长对话/滚动性能

### ai-message-list

- 虚拟化：已具备。`VIRTUAL_SCROLL_THRESHOLD = 200`，超阈值用 `@tanstack/react-virtual`（`ai-message-list.tsx:41-49,79-106`，overscan 6）。
- aria-live：`role="log" aria-live="polite" aria-busy`（`ai-message-list.tsx:51-64,67-78`）——良好。

## §4.6 视觉反馈即时性

### ai-sender

- 发送/禁用态即时性：**良好**。loading 来自 engine 订阅（`useAiChatContext`），同步切换 Send↔Stop 按钮 + textarea disabled（`ai-sender.tsx:90-103,152`）。
- 字数计数器超限变红：`ai-sender.tsx:128-138,163-173`（`overLimit ? 'text-destructive'`）。

### ai-voice-input

#### [P2] 波形是装饰性 CSS 固定动画，非真实音量

- 类别：交互品质(§4.6）
- 位置：`ai-voice-input.tsx:200-212`（5 个 `<span>`）+ `styles.css:23-62`（`flux-ai-voice-wave` 900ms 固定 scaleY 脉动）
- 证据：grep `AnalyserNode|MediaRecorder|getUserMedia` 全包零命中。
- 应为之值：录音时用 Web Audio `AnalyserNode` 驱动真实音量条。
- 用户可见症状：波形与实际说话音量无关，纯装饰。
- 修复方向：接 AnalyserNode（参考浏览器原生录音 UI）。

### ai-suggestions

#### [P2] 建议项无 loading/selected/disabled 态

- 类别：交互品质(§4.6）
- 位置：`ai-suggestions.tsx:22-37`（仅 `onClick`）
- 证据：grep `selected|loading|disabled` 在该文件仅命中外层 `data-empty`。
- 修复方向：加 per-item loading 态（点击后宿主处理期间显示 spinner）。

### ai-attachments

#### [P1] 上传 `status: 'uploading'|'error'` 类型已声明但永不渲染，无进度条/spinner/错误态

- 类别：交互品质(§4.6）
- 位置：`ai-attachments.tsx:16-25`（类型）vs `:98-106`（`addFiles` 硬编码 `status: 'success'`）
- 证据：
  ```ts
  accepted.push({ ..., status: 'success', file });
  ```
  `handleUpload`（`:165-175`）只 fire `onUpload` 事件 + `ctx.sendMessage(parts)`，组件内无实际上传逻辑、无进度 UI、无 `AttachmentItemView` 消费 status。
- 应为之值：上传中显示进度条/spinner，失败显示错误态+重试（skill §4.6）。
- 用户可见症状：点上传后无任何进行中反馈，成功/失败全靠宿主外部提示。
- 修复方向：`addFiles` 接受上传 promise，渲染 status 对应 UI。

#### [P2] `data-dragging` 属性已发但无对应 CSS 规则

- 类别：交互品质(§4.6）
- 位置：`ai-attachments.tsx:191`（`data-dragging={dragging ? '' : undefined}`）vs grep `styles.css` 无 `[data-dragging]`
- 修复方向：CSS 加拖入高亮。

## §4.10 对话/视图切换过渡

### ai-conversations

#### [P3] 选中态切换无 transition（仅 class 交换）

- 类别：交互品质(§4.10）
- 位置：`ai-conversations.tsx:55-64`（`data-active` + `cn(...)`）
- 修复方向：可选，加 `transition-colors`。

## 其他发现

### ai-conversations

- 列表无展开/折叠机制（始终扁平 `<ul>`，`ai-conversations.tsx:50-122`）。如设计预期是可折叠侧栏则为缺失，否则正常。
- 重命名输入是全包唯一 `autoFocus`（`:69-72`，带 eslint-disable）。

### ai-voice-input

- 录音启停：click 切换，无 press-to-talk 长按阈值（`ai-voice-input.tsx:164-183`）。
- 状态即时性：**良好**。`data-state`/`aria-pressed` 同步，stop 时立即 `setStatus('idle')` 不等 `onend`。
- 麦克风清理：**正确**。unmount 时 null handlers + abort recognition（`:83-97`）。

### ai-suggestions

- 点击/悬停反馈仅靠 shadcn Button 继承样式，无 per-item 交互。

---

## 反模式命中统计

| 反模式          | 命中数 | 说明                                        |
| --------------- | ------ | ------------------------------------------- |
| F1 固化缺陷断言 | 0      | 未核查测试（§3 范围）                       |
| F2 边界 mock    | 0      | 同上                                        |
| F3 接线漏接     | 2      | `autofocus` 声明未消费；`status` 类型未渲染 |

## 四项总评

| 维度         | 评         | 说明                                                                                               |
| ------------ | ---------- | -------------------------------------------------------------------------------------------------- |
| 交互品质(§4) | **有风险** | IME 误发(P1)影响 CJK 用户核心操作；附件上传无反馈(P1)使上传交互不可知。其余多为 P2 动画/反馈缺失。 |

无 P0（聊天收发核心链路功能成立）。2 个 P1 需优先修复。
