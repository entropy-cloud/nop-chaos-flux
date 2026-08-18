# AI 控件示例「点击无效果」分析报告

> 日期：2026-08-17
> 范围：用户在体验 AI 控件 demo 时反馈「很多按钮点击后没有效果」——本报告对所有 AI 控件 demo（13 个路由 + Component Lab 中 C8.2 路由）的可点击元素做反向审计，确认哪些按钮是**真正 dead click**（handler 未挂 / 挂但无副作用）、哪些是**假 dead click**（handler 已挂，但视觉反馈不明显被误判）
> 验证方式：sub-agent 全量代码 audit + headless Chromium 程序化 click + DOM 前后快照对比
> 结论：13 个控件 demo 中存在 **22+ 个 dead-click 实例**（其中 13 个 P2 严重），分布在 4 个控件（`ai-prompts` / `ai-suggestions` / `ai-citations` / `ai-voice-input`），其余控件可点击元素均工作正常

---

## 1. 验证结果（程序化 click 前后 DOM 对比）

截图保留于 `/tmp/screenshots/ai-dead-buttons/`（4 张）

| 页面           | 点击元素                                    | 点击前                      | 点击后                         | 结论                                                                                    |
| -------------- | ------------------------------------------- | --------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `ai-widgets`   | `ai-prompts-item` "What is the weather?"    | input='', msgs=0, prompts=4 | input='', msgs=0, toasts=0     | **DEAD CLICK**                                                                          |
| `ai-widgets`   | `ai-suggestions-item` "Summarize"           | —                           | input='', msgs=0, toasts=0     | **DEAD CLICK**                                                                          |
| `ai-citations` | `ai-citation-trigger` `[1]`                 | trigger=0, popover=0        | popover=1, open=0, hasURL=true | **半通**：popover 弹出，但弹内 URL 是 `https://example.com/design` 假地址，点了直接 404 |
| `ai-p4`        | `ai-suggestions-item` (5 个 + 2 个 popover) | items=7, toasts=0           | toasts=0, bubbles=0            | **DEAD CLICK**                                                                          |

---

## 2. 死按钮清单（按文件归类）

### 2.1 `ai-prompts` 推荐提示卡 — 4 个 P2 dead click

**点击元素**：`[data-slot="ai-prompts-item"]`，例如 "What is the weather?" / "Help me debug" / "Summarize the docs" / "Show me a chart"

**渲染器位置**：`packages/flux-renderers-ai/src/renderers/ai-prompts.tsx:84-87`

```tsx
onClick={() => {
  const payload = { type: 'ai:prompt-select', item, index };
  void props.events.onSelect?.(payload, dispatchCtx(payload, props.node.scope as ScopeRef | undefined));
}}
```

**期望副作用**：填充 sender 输入框 / 自动发送消息 / dispatch host action —— 由 host 决定

**Demo 接线**：

- `apps/playground/src/pages/ai-widgets-demo.tsx:60-65`（inline schema）
- `apps/playground/src/ai/ai-p4-example.json`（P4 widgets）

**两处都缺 `onSelect`**：

```json
{ "type": "ai-prompts", "items": "${promptItems}", "layout": "wrap", "size": "sm" }
// 缺 onSelect
```

**DEAD 成因**：`props.events.onSelect` 为 `undefined` → 可选链 `onSelect?.()` no-op → 按钮 click 没有任何副作用，连 toast 都不发

**预期 host 接线示例**（CX-10 惯例）：

```json
{
  "type": "ai-prompts",
  "items": "${promptItems}",
  "onSelect": {
    "action": "setSenderDraft",
    "args": { "text": "${item.label}" } // 或 ${item.description} / ${item.badge}
  }
}
```

---

### 2.2 `ai-suggestions` 建议药丸 — 5 + 2 = 7 个 P2 dead click

**点击元素**：`[data-slot="ai-suggestions-item"]` — Summarize / Translate / Explain / Refine / Expand（expand 模式），外加 popover 模式的 hidden 2 项

**渲染器位置**：`packages/flux-renderers-ai/src/renderers/ai-suggestions.tsx:50`（pill）+ `:153`（popover overflow item）

```tsx
onClick={() => onSelect?.(item, index)}
```

**两处 demo 无 `onSelect`**：

- `apps/playground/src/pages/ai-widgets-demo.tsx:73-77`（inline schema）
- `apps/playground/src/ai/ai-p4-example.json:79-84`

**DEAD 成因**：同 2.1，可选链 no-op

---

### 2.3 `ai-citations` 引用标记 — 2 个 P2 dead click（含假 URL 副作用）

**点击元素**：`[data-slot="ai-citation-trigger"]`（消息体内 `[1]` / `[2]` 上标）

**渲染器位置**：`packages/flux-renderers-ai/src/renderers/ai-citations.tsx:166-180`（PopoverTrigger 包裹 Button）

**两处副作用**：

1. 弹 Popover 显示 source title/snippet/URL（**实测能弹**）
2. click URL 时调用 `onSourceClick?.(source, source.index)`（**未挂**，且 URL 是 `https://example.com/*` 假地址）

**Demo 接线**：`apps/playground/src/ai/ai-citations-example.json:22-29` 和 `:36-40` 均**无 `onSourceClick`**

**DEAD 成因**：

- Popover 弹出是 base-ui 自带行为 → 看上去「有效果」
- 但 popover 内的 URL 链接是 `<a target="_blank" href="https://example.com/design">` → 用户点击 → 浏览器打开新标签 → 404
- 加上 `onSourceClick` 未挂 → 后端没有 telemetry / scroll / modal 等任何 hook

**对比 baseline**：`docs/analysis/2026-08-10-2245/round-01.md` 未涵盖此面（focus 在 engine 内部）

---

### 2.4 `ai-voice-input` 麦克风按钮 — 1 个 P2 dead click（取决于环境）

**点击元素**：`[data-slot="ai-voice-input"]` 麦克风按钮

**渲染器位置**：`packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx:271`

**两处 demo 无 `onResult` / `onError`**：

- `apps/playground/src/pages/ai-widgets-demo.tsx:83`
- `apps/playground/src/ai/ai-p4-example.json:30-33`

**实际行为**：

- **Headless / 不支持 Web Speech API** → 按钮渲染时即 `disabled`（`ai-voice-input.tsx:92` `useState(() => !getSpeechRecognitionCtor())`），仅 show 一个 hover tooltip "voice unsupported"
- **真实浏览器 + 麦克风权限** → `getSpeechRecognitionCtor()` 返回 `SpeechRecognition` 实例 → 录音启动 → fire `onResult` payload `{ type: 'ai:voice-result', transcript }` → **listener 不存在 → 文本被丢弃**

**DEAD 成因**：host 必须 wire `onResult` 把转写文本填回 sender；demo 都没接

---

### 2.5 `ai-feedback` 复制/点赞/点踩/刷新 — 5 个未挂但 demo 中未渲染

**现状**：`ai-feedback` 渲染器在 13 个 demo 中**完全没被 mount**（grep `apps/playground/src/pages/ai-*-demo.tsx` 0 命中）；仅在 `apps/playground/src/component-lab/renderers/data-c8-2-host.ts:223` 出现，且**已正确 wire** `onAction: probe:feedback`

**按钮列表**（实际行为）：copy / refresh / like / dislike / sources

- copy → `navigator.clipboard.writeText` + 1500ms "Copied" 标签 → **自洽**
- refresh / sources → 仅 fire `onAction` → **必须 host 接**
- like / dislike → 内部 `voted` state 本地回显 → **自洽**

**为什么列在这里**：用户感受到的「按钮无效果」也包括「demo 页里看不到这些按钮」——`ai-widgets-demo` 期待展示 flux-renderers-ai 全家桶，但 `ai-feedback` 是漏网之鱼

---

### 2.6 `ai-welcome` 欢迎面板 — 0 click（设计上不是按钮）

**位置**：`packages/flux-renderers-ai/src/renderers/ai-welcome.tsx:25-28` — icon 是 `<span>`，无 `onClick`

**Schema**：`AiWelcomeSchema` 仅含 `title` / `description` / `icon` / `align` / `footer`（`schemas.ts:237-244`），无任何 event 字段

**顾虑**：用户可能误把 icon/标题/描述当成可点击，期望整 panel 是一个 action（"Click welcome to start"）。建议在 `ai-welcome` 增加可选 `onTitleClick` / `onIconClick` —— **但属产品决策，不视为 bug**

---

## 3. 工作正常的可点击元素（sanity baseline）

为防止「哪些按钮其实工作」被掩盖，列已验证 work 的元素：

| 元素                               | 渲染器位置                             | Demo                           | 验证                                                                  |
| ---------------------------------- | -------------------------------------- | ------------------------------ | --------------------------------------------------------------------- |
| Sender 发送 / 停止                 | `ai-sender.tsx:114-127`                | 所有 `ai-chat` demo            | ✓ `ctx.sendMessage` / `ctx.abortRequest`                              |
| Conversation 新建/选择/删除/重命名 | `ai-conversations.tsx`                 | `ai-conversations-demo`        | ✓ schema `onCreate` / `onItemClick` / `onItemDelete` / `onItemRename` |
| Branch picker ← →                  | `ai-bubble/index.tsx:217-244`          | `ai-linkage-demo`              | ✓ `AiChatProvider.onBranchChange` 链接 host `branchStore`             |
| Regenerate 按钮                    | host Button                            | `ai-linkage-demo.tsx:117`      | ✓ `engine.regenerate()`                                               |
| Tool-call 展开 caret               | `ai-tool-call.tsx:150-162`             | `ai-tools-demo`                | ✓ 内部 `setInternalOpen`                                              |
| Tool-call Approve/Reject           | `ai-tool-call.tsx:221-251`             | `ai-hitl-demo`                 | ✓ 直挂 `onApproval`                                                   |
| Attachment 选择 / 上传 / 删除      | `ai-attachments.tsx`                   | `ai-attachments-demo`          | ✓ `inputRef` / `onUpload`                                             |
| Code-block Copy                    | `ai-bubble/renderers/markdown.tsx:134` | 任意含 fenced code 的 ai-chat  | ✓ clipboard + 1500ms 标签                                             |
| User message pencil edit           | `ai-bubble/user-edit.tsx:113`          | 所有 ai-chat（用户消息存在时） | ✓ `e.setMessageEditing`                                               |
| Error retry                        | `ai-bubble/renderers/error.tsx:32,95`  | 错误态                         | ✓ `ctx.sendMessage(lastUserText)`                                     |
| Reasoning panel 折叠               | `ai-bubble/renderers/reasoning.tsx:58` | 含 reasoning content           | ✓ `useState` toggle                                                   |
| Citations Popover 打开             | `ai-citations.tsx:166-180`             | `ai-citations-demo`            | ✓ base-ui Popover default                                             |

---

## 4. 横向根因分析

### 4.1 模式 A：schema event 字段未挂（最高频）

| 字段                                  | 受影响元素                               | demo 漏接位置                                            |
| ------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `ai-prompts.onSelect`                 | 4 prompt cards                           | `ai-widgets-demo.tsx:60-65`                              |
| `ai-suggestions.onSelect`             | 5 suggestion pills + 2 popover items     | `ai-widgets-demo.tsx:73-77` / `ai-p4-example.json:79-84` |
| `ai-citations.onSourceClick`          | 2 inline citation markers + 2 list items | `ai-citations-example.json:22-29, 36-40`                 |
| `ai-voice-input.onResult` / `onError` | 1 mic button                             | `ai-widgets-demo.tsx:83` / `ai-p4-example.json:30-33`    |

**共性**：schema event 字段定义存在（`schemas.ts` + `ai-renderer-definitions.ts` 中都有 `{ key: 'onSelect', kind: 'event' }`），渲染器已 `events?.onSelect?.()` 解构调用，但 demo 编写时漏写 `onSelect` action 块。

**为什么单元测试没发现**：

- `packages/flux-renderers-ai/src/renderers/__tests__/` 内的渲染器测试用 `mockProps()` 直接构造 props，**不**走 schema→registry 链路；所以「未挂 onSelect」直接被 `onSelect?: ...` optional 吞掉
- 仅 `data-cid-contract.test.tsx` 等少数测试覆盖 schema 字段，但只验 cid 透传，不验 wiring

**修复方向**（任选）：

- **A. 修复 demo JSON**（推荐）：把 `ai-widgets-demo.tsx` / `ai-p4-example.json` / `ai-citations-example.json` 补上 `onSelect` / `onSourceClick` / `onResult` 等接线，驱动 `setSenderDraft` / `toast` / `setValue` 等可见动作
- **B. 渲染器增加 default 行为**：在不写 `onSelect` 时，渲染器默认 `setValue`-class fallback（直接把 item.label 填回 sender）；但这违背 renderer 通用化原则，不是好方案
- **C. Vitest E2E 视觉断言**：给 4 个 demo 加 click → DOM 改动断言，让 wiring 缺失立刻红

### 4.2 模式 B：`ai-voice-input` 浏览器 API 依赖 + demo 未挂 fallback

**代码**：`ai-voice-input.tsx:92` `useState(() => !getSpeechRecognitionCtor())` —— 启动瞬间硬判定

**坑**：

- headless / file:// / 不支持 Web Speech 的浏览器：按钮渲染即为 `disabled`，但**只在 hover 时**显示 tooltip "voice unsupported"（`ai-voice-input.tsx:295-304`）
- 真实浏览器：必须由 host wire `onResult` 把 transcript 填回 sender（demo 都没接）

**修复方向**：

- 当 `unsupported: true` 时，把 tooltip 改为**默认可见**的状态徽章（如 "[语音不可用]"），而非 hover-only —— 提升发现性
- 即使 runtime 支持，demo 也要 wire `onResult` → `setSenderDraft`，否则 transcript 直接被丢

### 4.3 模式 C：`ai-feedback` 在 demo 页面完全缺位

`apps/playground/src/pages/ai-widgets-demo.tsx` 标题为 "AI Widgets Showcase"，意图覆盖 **flux-renderers-ai 全家桶**，但 `ai-feedback` 五个按钮（copy/refresh/like/dislike/sources）完全没有 mount。

**修复**：在 `ai-widgets-demo.tsx` 的 `beforeMessages` 区块加一个 `ai-feedback` 实例（message 用硬编码 `assistant` 文本），并在 schema 中 wire `onAction: showToast` —— 这样 widget 自身 + host 联动都被覆盖

### 4.4 模式 D（设计限制）：`ai-chat` 不传播 `ai-sender` 的 schema events

**代码**：`packages/flux-renderers-ai/src/renderers/ai-chat.tsx:546-555` 直接 `AiSenderView` 内嵌，未传 `onSubmit` / `onCancel` / `onChange`

**当前**：sender 通过 `ctx.sendMessage` / `ctx.abortRequest` 直接工作，schema event 不可触达

**风险**：如果 host 想"在外层 schema 里拦截 sender 提交事件"（比如统一加 telemetry），无法做到 —— 必须脱离 `ai-chat` 单独 mount `ai-sender`

**修复方向**：让 `ai-chat` schema 透传 `onSubmit` / `onCancel` / `onChange` 到内嵌 sender；或在文档明示「ai-chat 模式下 sender event 不可用」，改在 host Button 写替代

---

## 5. 修复清单（按 P1 → P3 排序）

| 优先级 | 项                                                              | 文件                                                     | 修复                                                                                                                            |
| ------ | --------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **P1** | 4.1 ai-prompts 4 个 dead click                                  | `ai-widgets-demo.tsx:60-65`                              | 补 `onSelect: { action: 'setSenderDraft', args: { text: '${item.label}' } }`                                                    |
| **P1** | 4.1 ai-prompts 4 个 dead click（P4 page）                       | `ai-p4-example.json` (同步)                              | 同上                                                                                                                            |
| **P1** | 4.1 ai-suggestions 5+2 个 dead click                            | `ai-widgets-demo.tsx:73-77` + `ai-p4-example.json:79-84` | 补 `onSelect: { action: 'setSenderDraft', args: { text: '${item.text}' } }`                                                     |
| **P1** | 4.1 ai-citations 4 个 dead click（fake URL + 无 onSourceClick） | `ai-citations-example.json`                              | 补 `onSourceClick: { action: 'showToast', args: { description: 'Source: ${source.title}' } }` + 改 URL 用真实 `https://...`     |
| **P2** | 4.2 ai-voice-input 麦克风 dead / tooltip 仅 hover               | `ai-widgets-demo.tsx:83` + `ai-p4-example.json:30-33`    | 补 `onResult: { action: 'setSenderDraft', args: { text: '${transcript}' } }` + 让 tooltip 默认可见（接 `aria-label` 到 button） |
| **P2** | 4.3 ai-feedback 在 demo 缺位                                    | `ai-widgets-demo.tsx`                                    | 在 `beforeMessages` 加 `ai-feedback` 实例 + wire `onAction: showToast`                                                          |
| **P3** | 4.4 ai-chat 不传播 sender event                                 | `ai-chat.tsx:546-555`                                    | 透传 `onSubmit` / `onCancel` / `onChange` 到内嵌 AiSenderView                                                                   |
| **P3** | 4.6 ai-welcome 无 click handler                                 | `ai-welcome.tsx`                                         | 视产品决策：补 `onTitleClick` / `onIconClick` 或保持纯展示并在文档明示                                                          |

---

## 6. 兼容性 / 已知同源问题

- **R1-F5（同 docs/analysis/2026-08-10-2245/round-01.md）**：`ai` ActionScope namespace 无实例隔离 —— 警告仍存在于 demo 跨路由切换时，但不阻塞渲染
- **§3.1 button 文字不可见**（`docs/analysis/2026-08-17-ai-control-display-analysis.md` 同批）：HITL Approve 按钮 `bg-success` 颜色未解析 —— 已列为 P1 hotfix
- **没有相关 audit** 覆盖过 demo 死按钮面 —— 本报告是首份专项 audit

---

## 7. 后续

- 把 4 个 P1 dead-click 修复合并入下一轮 demo 收口计划（与 §3.1 hotfix 同行）
- 给 `ai-prompts` / `ai-suggestions` / `ai-citations` / `ai-voice-input` 加 component-lab 视觉回归测试（点 → 断言 DOM 变化）
- 文档 `docs/references/quick-reference.md` 加表格列每个 widget 的 schema event 字段，方便 host 接线时一眼看清
- Component Lab C8.2 路由的 `data-c8-2-host.ts` 已正确 wire 所有 event，可作为示范
