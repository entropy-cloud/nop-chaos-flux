# Round 3 — host 可写 metadata 的渲染崩溃路径与收尾扫描

> 执行批次：`2026-08-10-2245-open-audit-ai-invariant-loop`（mission `ai-invariant-loop` 开放式对抗审查）
> 视角：异常路径侦探 + 恶意输入者（host 注入面）
> 状态：静态验证完成；不重复 Round 1/2 与既有审计

## 发现 R3-F1（P2）— `TimestampContentRenderer` 对 host 可写的非法 `metadata.createdAt` 无防护：`dateTime={date.toISOString()}` 在 Invalid Date 上抛 RangeError，整个 bubble 渲染崩溃（ai-chat 无 Error Boundary 兜底）

- **在哪里**：`packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/timestamp.tsx:17-30`（`typeof createdAt !== 'number'` 只挡类型，不挡 `NaN`/超范围数值；`dateTime={date.toISOString()}` 在 JSX 中先于 try/catch 执行）。
- **是什么**：`metadata.createdAt` 是 host 可写的扩展面（`ChatMessageMetadata[key: string]: unknown`；host 经 `send()`/`setMessages()`/`initialMessages` 注入任意 metadata）。`new Date(NaN)` / `new Date(9e20)` → Invalid Date → `date.toISOString()` 抛 `RangeError: Invalid time value`。`formatTimestamp` 的 try/catch 只包住了 `toLocaleTimeString`，而抛错发生在 JSX 属性求值——早于任何防护。由于 `ai-chat` 内没有 Error Boundary，该 throw 会带崩整棵聊天树。同一「host 注入面崩溃」家族（F6 cloneMessages → P2 已修、R3-F1 未修）的剩余成员。
- **为什么值得关心**：包内大量防御（cloneMessages try/catch、normalize 函数）表明「host 可写 metadata 不可信」是既定契约；`createdAt` 是唯一一个**先过 typeof 关卡再在渲染中抛错**的字段——防了类型漏了值域。触发概率低（需 host 写 NaN/超范围数），但后果是硬崩溃且无降级。
- **修复方向**：`Number.isFinite(createdAt)` 守卫（或 try/catch 包住 `toISOString`），与 `ai-token-usage` 的 `normalizeUsage`（`Number.isFinite` 检查）对齐。
- **信心水平**：确定（`Date.prototype.toISOString` 对 Invalid Date 抛 RangeError 为语言规格行为；代码路径无任何守卫）

## 本轮排除（收尾扫描）

- `image.tsx` 的 `key={img.image_url.url}`——同 URL 重复 part 的 key 冲突仅造成列表复用，无行为缺陷，不报。
- `SuggestionPopup`/`TemplateBar` 的 label 重复 key——host 数据质量责任，不报。
- `TextContentRenderer` 对非 string content 返回空——由 ROLE 优先级兜底语义决定，非缺陷。
- `ai-chat` 的 `onConversationChange` mount 静默（prev 初始化）——设计意图，不报。
- 全包再扫一遍手写 memo/useCallback——13 处均有注释性正当理由（AI-31/Provider 边界/exhaustive-deps/test evidence），per react19-best-practices-review 不构成报告项（round-03-1826 已列）。

**本轮无新的 P0/P1；新发现 1 条 P2（R3-F1）。至此三轮均无新的高价值问题，停止本轮执行。**
