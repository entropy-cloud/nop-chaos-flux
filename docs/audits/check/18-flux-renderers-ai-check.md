# 18 flux-renderers-ai 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-ai/src/` 排除 `*.test.*` 与 `__tests__/` 后 67 个实现文件约 11016 行。**精读覆盖率约 95%**（按行）：engine/ 全部 12 文件、adapters/ 全部 12 文件、renderers/ 全部 24 文件、rich-text/ 全部 9 文件、storage/types.ts、index.ts、ai-renderer-definitions.ts、schemas.ts 全文；未精读仅 `ai-test-support.tsx` / `test-support.ts`（测试脚手架，非实现面）。除源码外核对了 `docs/architecture/renderer-env.md`（stream 契约）、`docs/references/quick-reference.md`、flux-i18n zh-CN/en-US locale、`apps/playground` 的 vite 配置与 ai-chat demo schema，以及 **playground 编译产物 `apps/playground/dist/assets/index-10q-LPXE.js`**（React Compiler 输出，F-01 的决定性证据）。
- 结论概览：**P0 x1 / P1 x1 / P2 x5 / P3 x8**。总体评价：该包的引擎层（abort 治理、turn 串行化、controller 身份守卫、dangling tool_calls 清理、wire 投影隔离）与会话管理层（K3 存储排空链、版本守卫、镜像同步）经过多轮已知审计加固，**静态正确性在同代代码里属于上乘**；XSS 三条路径（markdown=DOMPurify、tool-call=全 token 转义、citations=受控文本节点）全部设防；i18n key 双语齐全；D3 泄漏面（定时器/SpeechRecognition/objectURL/订阅/引擎 abort）清理完整。**核心问题集中在流式渲染的 React 数据流设计**：UI 更新完全依赖"父组件级联重渲染"这一条通道，没有组件直接订阅引擎或按 chunk 变化的 props —— 在 React Compiler 构建里这条通道被元素 memoization 切断（P0 F-01，流式渐进显示整体失效），在无 Compiler 的 dist 构建里这条通道则退化为每 chunk 全子树重渲染风暴（P1 F-02）。

## P0 缺陷

### F-01 React Compiler 构建下流式渐进渲染整体失效：token 不逐帧上屏，气泡停在 loading 占位符直到 turn 结束一次性跳到全文

- 位置：
  - `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:482-485`（context value useMemo，流式期间 deps 全稳定）
  - `packages/flux-renderers-ai/src/renderers/ai-chat.tsx:544`（`<AiMessageListView>` 仅两个流式期间不变的 prop）
  - `packages/flux-renderers-ai/src/adapters/react-adapter.ts:48-56`（snapshot 持有活数组引用）
  - `packages/flux-renderers-ai/src/engine/create-engine.ts:490-498`（`commitAssistant` 原地替换数组元素，数组引用不变）
  - 证据产物：`apps/playground/dist/assets/index-10q-LPXE.js` 中 AiChatRenderer 的编译输出
- 关键源码摘录（create-engine.ts:490-498，每 chunk 的提交路径）：
  ```ts
  function commitAssistant(): void {
    if (assistantIndex < 0) return;
    adapter.mutate('messages', (draft) => {
      if (assistantIndex < draft.messages.length) {
        draft.messages[assistantIndex] = { ...assistant };
        assistant = draft.messages[assistantIndex];
      }
    });
  }
  ```
  编译产物摘录（minified，React Compiler memo cache；`ke`=emptyNode、`Re`=showTimestamp、`Ejt`=AiMessageListView）：
  ```js
  let Re = n.showTimestamp === !0,
    ze;
  t[90] !== ke || t[91] !== Re
    ? ((ze = (0, B.jsx)(Ejt, { emptyNode: ke, showTimestamp: Re })),
      (t[90] = ke),
      (t[91] = Re),
      (t[92] = ze))
    : (ze = t[92]);
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：任一 chunk 到达（playground mock 以 15ms/ chunk 逐 token 推送）。
  2. 路径：`applyChunk` 原地改 assistant → `commitAssistant` 以 `draft.messages[i] = {...assistant}` 替换**元素**但**数组引用不变** → `ReactMessageAdapter.notify` 重建 snapshot 外壳（新对象）但 `messages` 字段仍是同一数组 → `useSyncExternalStore` 因外壳对象变化触发 `AiChatRenderer` 重渲染 → 编译后的组件所有 memo cache 命中：`emptyNode`（无 emptyState region 时恒为 undefined，demo schema `apps/playground/src/ai/ai-chat-example.json` 即无）、`showTimestamp`（恒 true）、context value deps（`messages` 同引用、`requestState='processing'`、`isProcessing=true`、`processingState='completing'` 全稳定）→ 返回的 Provider/section/list 元素与上一次 render **Object.is 相同**。
  3. 错误结果：React 对相同元素引用 bail out 整个子树 → **DOM 在整个流式期间零更新**。用户可见序列为：用户气泡 → loading 占位符（spinner）冻结 → turn 结束时 `requestState`/`isProcessing` 变化（此时 context value 才变）→ 一次性跳到完整回复。流式光标 `▍`（`markdown.tsx:49`）、tool-call 参数渐进、reasoning 面板渐进、tool 卡 running 状态同理全部冻结到边界才刷新。
- 为什么现有测试没有抓到：单测（`packages/flux-renderers-ai/vitest.config.ts` → `vitest.shared`）**不启用 React Compiler**，普通 React 父子级联使渐进渲染正常；e2e（`tests/e2e/ai-chat.spec.ts:22-23`）只断言最终 `toContainText('Hello'/'mock')`，无法区分"渐进上屏"与"结束时一次性上屏"。而 playground 的 vite 配置（`apps/playground/vite.config.ts`：`babel({ presets: [reactCompilerPreset({ target: '19' })] })` + workspace alias 指向 src）对包源码全局启用 Compiler。dist 构建（package build 仅 `tsc`，无 Compiler）不受影响。
- 影响：所有 Compiler 启用构建（playground 及任何以源码别名 + Compiler 方式消费本包的 host）中，本包的核心卖点——流式输出——在视觉上失效；`data-streaming` 状态、A-11 流式光标、tool-call HITL 的 pending 渐进出现均只在 turn 边界可见。AI-31 注释（"stabilize the context value so consumers do not re-render on each parent render"）表明作者主动追求了 context 稳定性，但未意识到 per-chunk 更新通道因此只剩"父级级联"这一条，而 Compiler 恰好会切断它。
- 修复方向（任一即可，建议组合 1+2）：
  1. 让 per-chunk 有一个引用变化能到达 React：`ReactMessageAdapter.notify` 对 `'messages'` kind 的 mutate 以浅拷贝数组替换 `state.messages`（元素替换成本 O(n) 但仅在 commit 时，可与 AI-23 的 O(1) 索引提交并存——只在 notify 边界换数组引用），使 `messages` dep 每 chunk 变化 → context value 变化 → 消费者重渲染。
  2. `AiMessageListView` 不再纯靠 context，改为直接 `useEngineView`/`engine.subscribe` 订阅（组件自身成为 useSyncExternalStore 订阅者，Compiler 无法冻结 store 通知）。
  3. 兜底：给 `<AiMessageListView>` 传入一个随 chunk 变化的 prop（如 last-message 内容指纹），并注明这是 Compiler 兼容性要求。
  4. 补自动化：按 AGENTS.md "streaming back-pressure must automate" 精神，e2e 增加中途断言（发送后轮询断言 bubble 文本长度递增 ≥2 次再到达终态）。

## P1 隐患

### F-02 无 Compiler 的 dist 构建下，每 chunk 触发 ai-chat 全子树重渲染风暴：全部历史气泡的 markdown 每 chunk 全量重 parse

- 位置：`packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:63-182`（`AiBubbleView` 无 `React.memo`）；`packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:27-51`（每渲染全量 sanitize + re-parse）；`packages/flux-renderers-ai/src/engine/create-engine.ts:545`（每 chunk `commitAssistant` → 全量 listener 通知）
- 摘录（markdown.tsx:28-36，每次组件渲染都对全文重算三遍）：
  ```ts
  const raw = extractContentText(content);
  const source = safeMarkdownSlice(raw);
  if (source.length === 0) return null;
  const streaming = message?.loading === true;
  const safe = sanitizeHtml(source);
  ```
- 问题：包内所有渲染组件（AiBubbleView / 各 content renderer / AiMessageListView）都没有 `React.memo`，更新完全依赖父级级联 + React Compiler 的自动 memo。dist 消费方（`package.json` build 仅为 `tsc`，无 Compiler）走普通 React：每 chunk `AiChatRenderer` 重渲染 → region `.render()` 重建（header/before/after/footer 全部重新求值）→ 消息列表重渲染 → **每一条历史气泡**（不只流式中的那条）重渲染 → 每条历史消息的 `MarkdownContentRenderer` 重新执行 `safeMarkdownSlice`（O(len) 正则）+ `sanitizeHtml`（DOMPurify O(len)）+ react-markdown 全量 parse（O(len)）。50 条消息 × 30 chunk/s ≈ 1500 次全量 markdown parse/秒，长对话下输入延迟与 CPU 占用显著劣化。
- 影响：dist（npm 发布产物）消费方的长对话流式性能；与 AGENTS.md 流式背压关注面直接对应——本包没有任何 chunk 合并/节流（无 rAF/时间窗批处理），每 chunk 一次同步 notify + 一次完整 React 渲染。
- 修复方向：为 `AiBubbleView` 加 `React.memo`（message 引用对流式外消息天然稳定）；`MarkdownContentRenderer` 对非流式消息缓存 parse 结果（如按 `message.id + content.length` 的 WeakMap）；region 节点仅在 hostScope/regions handle 变化时重建（Compiler 构建已如此，手动实现同语义）。

## P2 风险

### F-03 流式消息的 markdown 渲染为 O(n²)：每 chunk 对累计全文做正则扫描 + DOMPurify + remark 全量重解析

- 位置：`packages/flux-renderers-ai/src/renderers/ai-bubble/markdown-buffer.ts:34-58`（`safeMarkdownSlice` 每次 `matchAll` 全文）；`markdown.tsx:27-51`
- 摘录（markdown-buffer.ts:80-92）：
  ```ts
  function findUnclosedFenceCutoffForKind(text: string, ch: '`' | '~'): number | undefined {
    const fenceRe = new RegExp(`(^|\\n)(${ch}{3,})`, 'g');
    const matches = [...text.matchAll(fenceRe)];
  ```
- 问题：无状态重算设计（注释自述 "~1KB, dependency-free"）每次渲染对**全量累计文本**跑 3 个 `matchAll` 正则 + 每次 `new RegExp`，再叠加 DOMPurify 与 remark parse。流式一条 n 字符、m 个 chunk 的回复总成本 O(n·m)；数万字符的长代码 dump 流式时每 chunk 成本线性上升，最终帧的 parse 可感知卡顿（与 F-02/F-01 修复后需要重新评估：一旦渐进渲染恢复，此成本会被真实触发）。
- 后果：特定条件（长回复 + 高频 chunk + 中低端设备）下流式掉帧。
- 修复方向：增量式 fence/math 状态跟踪（只扫描自上一 chunk 起新增的尾部）；或按 content 长度做 parse 结果 memo。

### F-04 ai-attachments 上传为 fire-and-forget：`onUpload` 事件不被 await，直接以本地 `blob:` URL 发送多模态消息

- 位置：`packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:187-204`
- 摘录：
  ```ts
  const uploadPayload = { type: 'ai:attachments-upload', attachments };
  void props.events.onUpload?.(uploadPayload, dispatchCtx(...));
  const parts = buildImageContentParts(attachments);
  if (parts.length > 0 && ctx) {
    await ctx.sendMessage(parts);
  }
  ```
- 问题：注释声称 "The `onUpload` event lets the host persist the upload first"，但事件派发是 `void`（fire-and-forget），`sendMessage` 立即以 `URL.createObjectURL` 产生的 `blob:` URL（`ai-attachments.tsx:113`）构造 `image_url` parts 发给模型。真实 OpenAI 兼容后端不解析 `blob:` URL（仅接受公网 URL / data: base64），host 也无法在发送前完成持久化替换——事件返回值（ActionResult）被丢弃。
- 后果：特定条件（非 mock 环境）下带图消息必然被后端拒绝或忽略图片；host 的 onUpload 处理器形同虚设。
- 修复方向：onUpload 支持异步回填（等待事件 action 完成并允许其改写 attachments 的 URL），或文档化"仅 blob: URL、host 须自带 connector 侧转换"的当前契约。

### F-05 connector 工厂仅认 HTTP 200 为成功（suspect）

- 位置：`packages/flux-renderers-ai/src/adapters/ai-connector-factory.ts:54-57`
- 摘录：
  ```ts
  if (response.status !== 200 && !(response.status === 0 && response.ok)) {
    const detail = response.msg ? ` ${response.msg}` : '';
    throw new Error(`AI stream request failed: HTTP ${response.status}${detail}`);
  }
  ```
- 问题：`renderer-env.md` §3.2 规定 stream 的连接级元信息"与 fetcher envelope 一致"；fetcher 侧通常 2xx 即成功。这里 204/206/其它 2xx（某些网关对空 body 用 204）会被误判为失败并终止 turn（requestState='error'）。opaque response（status 0 + ok）已处理，非 200 的 2xx 未处理。
- 后果：特定条件（经代理/网关返回非 200 的 2xx）下流式 turn 误报失败。
- 修复方向：改为 `!(status >= 200 && status < 300) && !(status === 0 && ok)`。

### F-06 `getMessages()` 快照嵌套引用与引擎共享，流式期间嵌套值被原地变更（代码内自认 open P2-6）

- 位置：`packages/flux-renderers-ai/src/engine/create-engine.ts:147-159`（注释明示 "open P2-6"）；`packages/flux-renderers-ai/src/engine/utils.ts:283-290`（`applyChunk` 原地合并）
- 摘录（getMessages 注释）：
  ```ts
  // ... but nested objects (metadata / tool_calls / state) still share refs — and DURING
  // streaming the engine DOES mutate them in place: `applyChunk` →
  // `combineDeltaData` merges the in-flight assistant in place ...
  ```
- 问题：跨 turn 持有 `getMessages()` 返回元素嵌套引用（`metadata` / `tool_calls` / `state` / `content` 数组 parts）的调用方，在流式期间会看到这些嵌套对象被引擎原地修改——对 `component:getMessages` 的外部消费者是隐蔽的共享可变状态（autoSave 在 turn 边界调用，时序上安全；`useConversation` 的 K3 排空链同样边界安全，故降为 P2）。
- 后果：特定条件（host 在流式进行中持有并比较嵌套引用，例如做 dirty-check 或持久化 diff）读到混合状态。
- 修复方向：`getMessages` 对嵌套一层做浅隔离，或文档化"仅在 turn 边界调用"为硬契约。

### F-07 同页多实例 `ai-chat` 的 `ai:*` ActionScope 命名空间相互覆盖（代码内已自报，仅 warn 不隔离）

- 位置：`packages/flux-renderers-ai/src/renderers/ai-chat.tsx:214-226`（R1-F5 自报注释 + warn）；`packages/flux-react/src/workbench/hooks.ts:106-118`（registerNamespace 替换语义）
- 摘录（ai-chat.tsx:217-223）：
  ```ts
  console.warn(
    '[ai-chat] ActionScope namespace "ai" is already registered by another instance; ' +
      '`ai:*` actions now route to the LATER-mounted ai-chat (design.md §14.2). ' +
  ```
- 问题：两个 ai-chat 同页时，schema 里的 `ai:send` 等命令全部路由到后挂载实例；先卸载的实例会把整个命名空间注销。组件路径（ComponentHandle，cid 隔离）不受影响，但 schema 作者最容易用的是 `ai:*`。
- 后果：特定条件（同页多 chat）下命令串台/失效。
- 修复方向：按 instance 限定命名空间（如 `ai@componentId`），或运行时支持 per-scope 命名空间优先级（结构性变更，已在代码注释中登记为 out-of-scope——本报告仅确认该风险仍开放）。

## P3 提示

### F-08 user-edit 取消按钮复用 `flux.ai.stop`（"停止"）作为文案

- 位置：`packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx:93-95`；locale `packages/flux-i18n/src/locales/zh-CN.ts:67`（`stop: '停止'`，同文件多处已有 `cancel: '取消'`）
- 摘录：`<Button size="sm" variant="ghost" data-slot="ai-bubble-edit-cancel" onClick={cancelEdit}>{t('flux.ai.stop')}</Button>`
- 问题：编辑模式的"取消"显示为"停止"，语义错位（ai 命名空间内无 cancel key）。修复：新增 `flux.ai.cancel` 并使用。

### F-09 独立 `ai-sender`（无 ai-chat 上下文且未接 onSubmit）提交后草稿被清空、消息静默丢失

- 位置：`packages/flux-renderers-ai/src/renderers/ai-sender.tsx:68-90`
- 摘录：`if (props.onSubmit) props.onSubmit(text); else void ctx?.sendMessage(text); if (clearOnSubmit) setDraft('');`
- 问题：`ctx` 为 null 且无 onSubmit 时 `ctx?.sendMessage` 是 no-op，`clearOnSubmit` 默认 true 仍清空草稿。修复：无发送通道时不清空（或渲染禁用态）。

### F-10 `deletedDuringLoadRef` 无界增长

- 位置：`packages/flux-renderers-ai/src/adapters/use-conversation.ts:172`（声明）、`use-conversation-bootstrap.ts:73`（唯一清理点）
- 问题：仅在 mount bootstrap 合并后 clear；长会话中每次 deleteConversation 都 add 一个 id，Set 永不收缩（内存量级极小，规范性问题）。修复：bootstrap 完成后即可停用或在 delete 时判断 bootstrap 是否已结束。

### F-11 storage 实例热替换不 fan-out 到已缓存引擎（connector 有 fan-out，storage 没有）；多标签页存储冲突无任何监听

- 位置：`packages/flux-renderers-ai/src/adapters/use-conversation.ts:186-190`（connector fan-out）；`use-conversation.ts:238-247`（`attachAutoSave` 捕获构建时 storage）
- 问题：host 中途更换 storage 实现时，旧引擎的 autoSave 仍写旧 storage；双标签页同时编辑同一会话为 last-write-wins，无 `storage` 事件协调。属设计上交 host 的边界（storage 契约注释明确 package 不带实现），提示 host 文档应写明。

### F-12 列表 key 使用内容/URL：重复值撞 key

- 位置：`packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/image.tsx:19`（`key={img.image_url.url}`）；`ai-prompts.tsx:72`（label 撞 key，注释已自知）
- 问题：同一 URL 出现在两个 image part、或两个相同 label 的 prompt 卡时 React key 冲突（warning + 潜在状态错位）。修复：附 index 组合（ai-suggestions 已用 `${text}#${index}` 先例）。

### F-13 `pickRenderer` 每渲染每 slice 重新 filter + sort

- 位置：`packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:97-98, 269-283`
- 问题：`renderers.filter` 两次 + `[...renderers].sort()` 在每个 bubble × 每个 slice × 每次渲染执行；默认 registry 恒定，可在模块级预排序一次。量小（≤8 项），规范性优化。

### F-14 voice-input `onerror` 把非权限类错误（network / audio-capture 等）统一折叠为 `no-result`

- 位置：`packages/flux-renderers-ai/src/renderers/ai-voice-input.tsx:196-206`
- 摘录：`} else if (reason === 'no-speech') { fireError('no-result'); } else { fireError('no-result'); }`
- 问题：错误 reason 语义被压扁，host 无法区分"没听到"与"网络/硬件故障"。修复：扩展 `VoiceErrorReason` 或在 payload 里透传原始 reason。

### F-15 `send()` / `setMessages()` 不校验调用方提供 id 的唯一性

- 位置：`packages/flux-renderers-ai/src/engine/create-engine.ts:207-213, 161-173`
- 问题：引擎自身 `generateMessageId`（utils.ts:112-121，模块级单调序列 + 时间戳）保证会话内唯一，但 `send(...messages)` 的 `m.id ?? ...` 与 `setMessages` 直通调用方 id；重复 id 会破坏 React key 与 `setMessageEditing` 的 findIndex 语义（后者只命中第一个）。提示：在 `setMessages` 入口做一次重复 id 检查并在 debug 模式 warn。

## 检查过程记录

1. **前置阅读**：`docs/references/quick-reference.md`（契约速查）、`docs/architecture/renderer-env.md` §3.1-3.3（fetcher/stream/openSocket 契约、capability check 要求、StreamChunkParseError 模型）、`docs/architecture/renderer-runtime.md`（扩展性红线）。
2. **精读链路**（顺序）：engine 全量（types → state-adapter → native/react-adapter → snapshot-cache-detection → utils → create-engine → build-context → tool-execution → branching → regenerate → 3 plugins）→ adapters 全量（use-message → use-engine-view → use-conversation → autosave → bootstrap → connector-factory → action-provider → component-handle → auto-scroll → chat-context → conversation-controller）→ 渲染核心（ai-chat → ai-message-list → ai-bubble 全家 → markdown-buffer → markdown → user-edit → error/tools/reasoning/image/data-part/loading/text/timestamp）→ 其余 widget（sender/conversations/tool-call/citations/attachments/voice/token-usage/feedback/suggestions/prompts/welcome）→ rich-text 全部 → schemas/index/definitions/storage。
3. **重点缺陷面核对结果**：
   - abort 治理：`ctx.signal` 全链传递（engine → connector factory → `ApiRequestContext`）、每 chunk 迭代前 abort 检查（create-engine.ts:534）、`generator.return()` 强制收尾（:643-648）、connector 工厂自带 abort 守卫（ai-connector-factory.ts:63）、工具执行前后双 abort 检查（tool-execution.ts:42,83）、卸载 abort（use-message.ts:110-118 / use-conversation.ts:354-378）——**通过**。
   - 流式状态机：runTurn 入口 isProcessing 串行守卫（AI-01）、全部终态写入带 controller 身份守卫（:358, :377, :577, :601）、abort→send 竞态不串台——**通过**（重试旧流串台面由串行守卫根治）。
   - 背压：**无批处理**（每 chunk 一次同步 notify + 渲染），构成本报告 F-01/F-02/F-03。
   - 会话存储：saveConversation/deleteConversation 失败全部经 `reportStorageError`（host 回调 + console.warn，非静默）；K3 排空链防 ghost 复活；本包不携带 localStorage 实现（容量/多标签页为 host 责任，见 F-11 提示）。
   - markdown 流式渲染：`safeMarkdownSlice` 处理未闭合 fence/`$$`/孤立代理对；XSS 先 DOMPurify 后 rehype-raw——**通过**（性能见 F-03）。
   - token/消息 id：引擎生成侧唯一性充分；调用方侧见 F-15。
4. **grep 扫描**（排除 `*.test.*`/`__tests__`）：`as any` / `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` —— 0 命中；`catch {}` 13 处全部带注释与降级路径（逐一核阅）；`dangerouslySetInnerHTML` 仅 1 处（ai-tool-call.tsx:171，`highlightJson` 全 token `escapeHtml`，tokenizer 覆盖全串，无未转义子串落盘）；`JSON.parse` 1 处（tryPretty，已 catch）；`localStorage` 0 处（设计正确）；`addEventListener`/`setInterval` 0 处；`setTimeout` 仅两处 copied-reset 计时器且卸载清理（markdown.tsx:105-112 / ai-feedback.tsx:48-55）；硬编码中文仅存在于注释（D7 无违规，UI 全走 `t()`）。
5. **D7 i18n**：包内使用 `flux.ai.*` key 54 个，与 zh-CN / en-US locale 逐一比对——**无缺失 key**（python 集合比对 missing=[]，并抽查 5 个稀有 key 双语在位）。唯一语义问题是 F-08。
6. **D8 结构**：>500 行文件 5 个（use-conversation.ts 699 / create-engine.ts 697 / ai-chat.tsx 560 / ai-citations.tsx 523 / ai-tool-call.tsx 513），门禁口径 `scripts/check-oversized-code-files.mjs` 为 WARN>500 / ERROR>700（豁免名单仅 4 个与本包无关文件）——全部在 WARN 区间，**无未登记 ERROR，合规**；但 699/697 两个文件距 700 硬线仅 1-3 行余量，后续任何注释增量都会触线（提示：下一轮改动前先拆分）。
7. **F-01 取证过程**：发现 `chatContextValue` deps 在流式期间全稳定 → 检查 `ReactMessageAdapter.buildSnapshot` 返回活数组 → 确认 `commitAssistant` 不换数组引用 → 推导"Compiler 元素 memo → 子树 bail out"假说 → 在 `apps/playground/dist/assets/index-10q-LPXE.js` 找到 AiChatRenderer 编译体，确认 `t[90]!==ke||t[91]!==Re ? jsx(AiMessageListView,...) : t[92]` 的 memo cache 与 region 节点的同型缓存 → 确认 vitest 无 Compiler 插件、e2e 仅断言终态 → 定级 P0。**未做动态运行验证**（本审计为只读），建议以第 4 条修复方向中的 e2g 中途轮询断言做最终确认。
8. **反误报说明**：`ai-message-list` 独立注册但在无 ai-chat 上下文时恒空——经查 design.md §5.1 属有意设计（仅作为 ai-chat 子树内的组合件），不计 finding；`useEngineView` 的 `getSnapshot` 每渲染重建函数——useSyncExternalStore 不依赖其身份，无影响；`structuredClone` 对 Error（metadata.toolError）可克隆且有 try/catch 降级；`abort()` 无身份守卫但窗口内为同步段，不可达。
