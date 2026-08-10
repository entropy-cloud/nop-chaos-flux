# Round 3 — schema/渲染器面死契约与健壮性

> 执行批次：`2026-08-09-1826-open-audit-ai-invariant-loop`（mission `ai-invariant-loop` 开放式对抗审查）
> 视角：死代码清道夫 + 新人开发者
> 状态：静态验证完成（grep 全仓确认）

## 发现 F4（P2）— `ai-chat`/`ai-sender` 的 `autofocus` 死契约字段（schema + registry + 无消费者）

- **在哪里**：`schemas.ts:23`（AiChatSchema.autofocus）、`schemas.ts:132`（AiSenderSchema.autofocus）、`ai-renderer-definitions.ts:55,122`（注册为 prop）；`ai-chat.tsx`/`ai-sender.tsx` 全文零读取（grep 证实）
- **是什么**：两个 schema 声明并注册 `autofocus`，但没有渲染器消费它——schema 作者按文档写 `autofocus: true` 得到的是静默 no-op；定义器（designer）会暴露一个无效开关。与 multi-audit P2-5（`disabled` 死契约）同族但不同字段，未被覆盖。
- **信心水平**：确定

## 发现 F5（P2）— `buildImageContentParts` 死导出 + 同逻辑内联重复

- **在哪里**：`ai-attachments.tsx:373-377`（导出但仅测试引用，`ai-attachments.test.tsx:191-198`）；`handleUpload`（`:190-196`）内联实现了相同的过滤+映射逻辑
- **是什么**：模块级导出函数只被测试消费；渲染器实际发送路径复制了它的逻辑——两份逻辑漂移风险（例如未来 `image_url.detail` 或 `file` part 扩展时只改一处）。
- **信心水平**：确定

## 发现 F6（P2）— `cloneMessages`/`cloneMessage` 的 structuredClone 无异常回退

- **在哪里**：`ai-chat.tsx:46-54`
- **是什么**：`structuredClone` 可用时直接调用；浅拷贝回退只在「无 structuredClone」时生效。`metadata`（`[key: string]: unknown`）与 `data-${string}` 内容块（`data: unknown`）是 host 可写的扩展面——若 host 放入函数/symbol/DOM 节点等不可克隆值，turn 边界克隆抛 `DataCloneError`，整个 ai-chat 渲染崩溃且无回退。
- **为什么值得关心**：低代码 host 注入面宽，一个不可克隆的 data part 就会把「每轮结束渲染」变成硬崩溃；加 `try { structuredClone } catch { 浅拷贝 }` 是一行修复。
- **信心水平**：很可能（依赖 host 注入不可克隆值；引擎自带内容均可克隆）

## 发现 F7（P2）— O-2 注释与实现矛盾：engine 在流式期间确实就地突变嵌套对象

- **在哪里**：`create-engine.ts:139-141`（注释声称「engine itself never mutates those nested objects in place」）
- **是什么**：`applyChunk`（runOnce `:507`）在两次 `commitAssistant` 之间就地突变当前 assistant 对象（含 `tool_calls` 数组合并 `mergeArrayInPlace`），而 `commitAssistant` 后 `assistant` 重新指向 state 中的同一对象（`:463`）——「绝不就地突变」不成立。当前无观察到的行为缺陷（提交粒度覆盖渲染读取），但注释误导后续维护者，且与 snapshot identity 契约的防御注释形成矛盾信号。
- **信心水平**：确定（行为无缺陷，仅注释漂移）

## 发现 F8（P2）— `ai-feedback` 无法表达「空 action 集」

- **在哪里**：`ai-feedback.tsx:107-111`（`normalizeActions`：空数组 → DEFAULT_ACTIONS）
- **是什么**：host 显式传 `actions: []` 想禁用全部操作时，得到默认的 copy/refresh 栏；「空 = 默认」约定使「无操作栏」不可达（只能不挂该渲染器）。
- **信心水平**：确定

## 发现 F9（P2）— `ai-citations` 年份误报：`[2026]` 渲染成空引用卡

- **在哪里**：`ai-citations.tsx:258`（CITATION_RE `\[(\d+...)\]`）、`:282-292`（过滤只丢弃 ≤0 的索引）
- **是什么**：正文里的年份 `[2026]`（如「Since [2026]」）命中引用格式 → 无对应 source 时渲染可点击的 sup + 空引用卡片（`citationNoSource`）。格式固有的歧义，低概率但用户可见。
- **信心水平**：确定（真实渲染行为；严重度低）

## 本轮排除

- `disabled` 死字段（= multi-audit P2-5，不重报）。
- ai-attachments 受控模式泄漏 / blob URL 破图（= multi-audit P3 列表，不重报）。
- tiptap popup 键盘死区（= multi-audit P2-3，不重报）。
- 手写 useMemo/useCallback 13 处——均有注释性正当理由（AI-31/Provider 边界/exhaustive-deps/test evidence），per react19-best-practices-review 不构成报告项。
- bubble matcher catch 已修（multi-audit 已确认）。
