# Round 03 — Convention, size & code-quality

> 执行批次: 2026-07-23-2141-open-audit-ai · 视角: 死代码清道夫 + 未来破坏者 + 新人开发者
> 本轮为低优先级观察，不重复 Round 01/02。基线: `react19-best-practices-review.md`、`AGENTS.md` 强制项。

---

## F3.1 [P3/确定] 大量手写 `useMemo`/`useCallback`，与 React Compiler 基线及同包 docstring 自相矛盾

- **位置（共 25 处，非测试）**:
  - `src/adapters/use-conversation.ts`（10 处）：`:62 connectorRef=useMemo`、`:83 buildEngine`、`:101 attachAutoSave`、`:138 buildEngineFor`、`:189 createConversation`、`:210 switchConversation`、`:250 deleteConversation`、`:273 renameConversation`、`:285 clearAll`、`:298 controller=useMemo`。
  - `src/renderers/ai-attachments.tsx`（9 处）：`:58,:66,:104,:114,:122,:133,:142,:146,:169`。
  - `src/renderers/ai-chat.tsx`（3 处）：`:116 actionProvider`、`:132 componentHandle`、`:163 hostScopeData`。
  - `src/adapters/use-auto-scroll.ts`（3 处）：`:35,:42,:49`。
  - `src/rich-text/tiptap-sender.tsx`（3 处）：`:78,:79,:80`。
- **是什么**: `AGENTS.md` 明确“Do not add `useCallback` or `useMemo` by default”，`react19-best-practices-review.md` 把手写 memo 列为冗余（React Compiler 已自动稳定化），且同包 `use-message.ts:58-60` 的 docstring 自己就写了“no useMemo/useCallback by default”。但 `use-conversation.ts`/`ai-attachments.tsx` 仍几乎每个函数都包 `useCallback`。
- **后果**: 风格漂移 + 认知负担（维护者会误以为这些是“Compiler 处理不了的特殊点”）。不影响正确性。
- **判定**: 按 react19 doc，这不是高优先级重构任务；但作为“新人会困惑的灯下黑”值得记录。`useMemo(()=>({current:connector}),[connector])`（`use-conversation.ts:62`）用 useMemo 伪造 ref 尤其反直觉，可直接改 `useRef`+effect 或直接引用。
- **去重**: reopened-decisions 无对应裁定。

---

## F3.2 [P3/确定] `create-engine.ts` 606 行，超 500 行拆分阈值

- **位置**: `src/engine/create-engine.ts`（606 行）；`src/rich-text/tiptap-sender.tsx`（500 行，恰好阈值）。
- **是什么**: `AGENTS.md` “Files over 500 lines should be evaluated for extraction.” `create-engine.ts` 把回合编排（`runTurn`/`runOnce`）、tool-loop（`executeToolCalls`）、branch（`regenerate`/`advanceBranchId`）、delta apply（`applyChunk`）、abort/clear 全塞在一个闭包工厂里。
- **建议**: `executeToolCalls`+tool 归一化（`:401-463,601-606`）可抽 `engine/tool-loop.ts`；branch 逻辑（`:537-587`）可抽 `engine/branches.ts`。降低单文件认知负荷，也便于单独测试 F1.1 的串行化修复。
- **判定**: 工程卫生，非行为问题。

---

## F3.3 [P2/确定] `AI_COMPONENT_METHODS` docstring 与实现数量不符（文档漂移）

- **位置**: `src/adapters/ai-component-handle.ts:9-17`（docstring “5 logical methods”）vs 实际数组 6 项（`sendMessage, abort, clear, getMessages, setMessages, regenerate`）。
- **是什么**: 注释写“dispatches to the engine's 5 logical methods”，但数组与 switch 共 6 个方法。
- **后果**: 轻微文档误导；典型的“代码改了注释没跟上”。
- **建议**: 改 5→6。

---

## F3.4 [观察/不单列] raw `<button>` widget —— 本包非离群，是全仓既有漂移

- **位置**: 本包 `ai-conversations.tsx:82`、`ai-suggestions.tsx:23/112`、`ai-prompts.tsx:49`、`ai-citations.tsx:124/184`、`ai-bubble/renderers/reasoning.tsx:47`、`rich-text/tiptap-sender.tsx:467` 等用原生 `<button>`。
- **是什么**: `AGENTS.md` “MANDATORY: NEVER use raw HTML elements when `@nop-chaos/ui` provides a component”（ui 导出 `Button`）。
- **关键澄清**: 经核对兄弟包，原生 `<button>` 在 `flux-renderers-content`（carousel/steps/diff-\*）、`flux-renderers-form`、`flux-renderers-form-advanced`（transfer/icon-picker）、`flux-renderers-data` 中**普遍存在**。因此本包**不是离群**，而是延续全仓既有的（与 AGENTS.md 字面冲突的）实践。
- **判定**: 不作为本任务单点修复项上报；如实记录为“全仓潜在漂移，本包延续之”。值得作为一个独立的全仓收敛任务（加 lint 规则或批量替换），但超出 mission `ai` 范围。`ai-sender`/`ai-voice-input`/`ai-bubble` 的分支选择器已正确使用 ui `Button`，方向是对的。

---

## F3.5 [观察/很可能] sanitize→rehype-raw markdown 管线是 mutation-XSS 脆弱点（已测基本载荷）

- **位置**: `src/renderers/ai-bubble/renderers/markdown.tsx:35-47`（`sanitizeHtml(source)` → `<ReactMarkdown rehypePlugins={[rehypeRaw]}>{safe}</ReactMarkdown>`）。
- **是什么**: 先 DOMPurify 净化、再用 `rehype-raw` 把净化后 HTML 重新解析进 markdown 树。“先净化后重新解析”是已知的 mutation-XSS 风险模式（markdown 解析可能重组出新的可执行结构）。
- **现状**: `renderers/__tests__/renderers.test.tsx:61-71` 已有 XSS gate（`<script>`、`<img onerror>` 均被剥离，断言 `querySelector('script')`/`[onerror]` 为 null）。基本载荷有覆盖。
- **判定**: 非确认漏洞，仅作“安全边界需持续盯防”记录。建议未来补充 mutation-XSS 组合用例（嵌套/属性分裂/markdown 与 HTML 混排）。

---

## 本轮小结

5 条低优先级观察。F3.1（25 处手写 memo）与 F3.2（606 行）是最值得在常规清理中处理的工程卫生项；F3.3/F3.5 是文档/安全卫生；F3.4 明确不归本任务，避免误报为“AI 包独有违规”。
