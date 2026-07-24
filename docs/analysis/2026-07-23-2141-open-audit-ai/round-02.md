# Round 02 — Lifecycle, resource & cleanup

> 执行批次: 2026-07-23-2141-open-audit-ai · 视角: 生命周期追踪者 + 异常路径侦探
> 本轮延续 Round 01，不重复已记录发现；切换到“创建的资源是否都有对应销毁路径”视角。

---

## F2.1 [P1/确定] `ai-voice-input` 无法真正停止识别 + 卸载不清理（麦克风泄漏 + 隐私）

- **位置**: `src/renderers/ai-voice-input.tsx:86-147`（`handleStart`/`handleClick`），`recognition` 仅存于 `handleStart` 闭包局部（`:93`），无 ref 持有。
- **是什么**:
  1. 点击麦克风启动：`handleStart` 里 `const recognition = new Ctor()`，`recognition.start()`。但 `recognition` 引用**没有存进任何 ref**，只活在本次调用的闭包里。
  2. “再次点击停止”路径 `handleClick`（`:141-145`）：当 `status==='listening'` 时只执行 `setStatus('idle')`，注释写 “Stop is handled by recognition.onend”，但 `setStatus('idle')` **不会触发 `recognition.stop()`**。即 UI 显示已停止，而 `SpeechRecognition` 实例仍在运行、麦克风仍开、`onresult`/`onerror`/`onend` 仍会回调。
  3. 组件卸载：没有任何 effect 在 cleanup 里调用 `recognition.stop()`/`abort()`。卸载时若仍在 listening，麦克风保持开启，且回调会 `setStatus`（已卸载组件）并 `props.events.onResult`（stale props）。
- **后果**:
  - **隐私**：用户以为关了录音，麦克风实际持续采集，直到浏览器自身静音超时或报错。
  - **资源泄漏**：`SpeechRecognition` 实例与闭包无法被回收（回调持有 recognition，recognition 持有闭包）。
  - **stale 回调**：卸载后仍触发 host `onResult`/`onError`，可能写入已不存在的 scope。
- **根因**: 把“UI 状态”当成“资源状态”；缺少 `recognitionRef` + unmount cleanup。
- **建议**: 用 `useRef<SpeechRecognitionLike|null>` 持有 recognition；`handleClick` 的停止分支调用 `recognitionRef.current?.stop()`；新增 `useEffect(()=>()=>{ recognitionRef.current?.abort() },[])` 做卸载兜底。
- **信心**: 确定（代码路径已逐行确认；无 ref、无 cleanup effect、停止分支不调 stop）。
- **关联**: 与 Round 01 F1.1 不同——F1.1 是引擎回合串行，此处是浏览器音频资源生命周期。

---

## F2.2 [P2/很可能] `useConversation`/`useMessage` 卸载时未 abort 在途流（孤儿流）

- **位置**: `src/adapters/use-conversation.ts:181-187`（卸载只清 auto-save 订阅，不 abort）；`src/adapters/use-message.ts`（无卸载 cleanup effect）。
- **是什么**:
  - `useConversation` 的 unmount effect（`:181-187`）只遍历 `autoSaveUnsubsRef` 取消订阅，**不调用任何 `engine.abort()`**。`clearAll`（`:285`）会 abort，但卸载不会触发 `clearAll`。
  - `useMessage` 自建 engine（`use-message.ts:63-75`）也没有卸载 abort。
- **后果**: 组件树卸载（路由切换 / 条件渲染）时，正在流式的 engine 仍在后台跑：connector 持有的 `env.stream` 连接不释放，chunk 继续累积进一个无人订阅的 state，`onCompletionChunk`/`onAfterRequest` 等插件钩子继续执行（若插件闭包捕获了已卸载的 React 资源则危险）。多会话场景（`useConversation`）下被 evict 之外的、恰好卸载时在途的会话尤其明显。
- **为什么值得关心**: `useConversation` 设计文档明确“switch-while-stream 时让背景会话继续跑”（`:237-245`），这是有意为之；但**卸载**与**切换**是两回事——卸载应终止。当前两者用同一套“不清算”逻辑，混淆了“后台保活”与“整体销毁”。
- **根因**: engine 是闭包持有、订阅是唯一被跟踪的资源；abort 没纳入 unmount 清理。
- **建议**: 在 `useConversation`/`useMessage` 的 unmount effect 里对**自建**（非外部注入）engine 调用 `engine.abort()`；外部注入 engine 的生命周期归 owner，不在此清理（与现有 `externalEngine` 不碰 connector 的策略一致）。
- **信心**: 很可能（`useConversation` 的 evict 逻辑已证明作者关注在途引擎，但卸载分支确实遗漏）。
- **去重**: 与 reopened-decisions #2（surface 双态）无关——那是 `use-surface-renderer` 的 localOpen；这里是 AI engine 的 abort 生命周期。

---

## F2.3 [P3/确定] `ai-connector-factory` 的生成器未在内部检查 `signal.aborted`

- **位置**: `src/adapters/ai-connector-factory.ts:59-67`（`generate()`）。
- **是什么**: `generate()` 的 `for await (const raw of chunks)` 循环里没有检查 `request.signal.aborted`，完全依赖 `env.stream` 的 `chunks` 迭代器在 abort 时自行终止。
- **后果**: 若某个 host 的 `env.stream` 实现没有把 abort 传播到 chunk 迭代器（abort 只中断底层 fetch，但已缓冲的 chunk 仍被 yield），则 `engine.abort()` 后该 connector 仍会继续喂 chunk，与 F1.1/F2.2 叠加放大“停不下来”问题。
- **为什么值得关心**: 这是引擎 abort 能否真正生效的“最后一公里”。当前契约把责任 100% 压给 `env.stream`，但 `env.stream` 是 host 实现的，质量不可控；包内加一道 `if (request.signal.aborted) break` 是廉价且确定性的兜底。
- **建议**: `for await` 内加 `if (request.signal.aborted) return;`。
- **信心**: 很可能（属于防御性缺失，非必然 bug；取决于 host env.stream 实现）。

---

## 本轮小结

3 条生命周期发现，最高价值是 F2.1（麦克风无法停止 + 隐私）。F2.1 是本轮独立确认的、与 Round 01 引擎层不重叠的真实缺陷。F2.2/F2.3 与 F1.1 共同构成“AI 流停不下来”的主题簇，但各自根因不同（卸载未 abort / 连接器不查 signal / 引擎不串行）。
