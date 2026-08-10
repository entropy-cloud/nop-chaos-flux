# Round 2 — renderer 面空数组契约、剪贴板降级与注释/文档残留

> 执行批次：`2026-08-10-2245-open-audit-ai-invariant-loop`（mission `ai-invariant-loop` 开放式对抗审查）
> 视角：死代码清道夫 + 契约考古学家 + 新人开发者
> 状态：静态验证完成（grep 全仓确认）；不重复 Round 1 与既有审计
> 去重背景：`docs/analysis/2026-08-09-1826-open-audit-ai-invariant-loop/round-03`（F4-F9）与 `2026-08-10-2245-multi-audit` FIND-01..22 均已核销；本批均为新实例或已登记家族的新成员。

## 发现 R2-F1（P2）— `ai-citations` 显式 `sources: []` 不覆盖 `metadata.sources`：P2-7「显式空数组 = 显式意图」修复的 sibling 成员漏网

- **在哪里**：`packages/flux-renderers-ai/src/renderers/ai-citations.tsx:465-486`（`resolveSources`：`Array.isArray(explicitSources) && explicitSources.length > 0` 才采用显式值；空数组落到 `metadata.sources`/`data-sources` part）。
- **是什么**：schema 文档承诺「Explicit sources (overrides `metadata.sources` / `data-sources` part)」（schemas.ts:344）。但显式传 `sources: []` 时，空数组不满足 `length > 0`，解析落到 metadata——host 无法表达「这张卡即使 metadata 有 sources 也不要渲染引用」。与 ai-feedback 的 P2-7 修复（2026-08-10 multi-audit：`actions: []` 渲染空操作栏）是同一「显式空数组 = 显式意图」家族的 sibling：feedback 修了，citations 未修。
- **为什么值得关心**：host 在受控场景（如关闭某条消息的引用展示）写 `sources: []` 得到的是静默的「metadata 引用照常渲染」，与 schema 注释矛盾；定义器会暴露一个无效开关。
- **修复方向**：`resolveSources` 对「显式提供数组（含空）」直接返回 `normalizeSources(explicitSources)`，仅 `undefined` 时走 metadata 链。
- **信心水平**：确定（代码逐行可证）

## 发现 R2-F2（P2）— markdown CodeBlock 复制在无 `navigator.clipboard` 环境报假「已复制」：已登记 P3 家族（ai-feedback）的第二个实例

- **在哪里**：`packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:119-130,166-177`（`clipboardAdapter.writeText` 在无 clipboard API 时返回 `undefined` → `Promise.resolve(...).then(() => setCopied(true))`——什么都没复制却显示「已复制」）。
- **是什么**：`docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md` 的 P3 条目登记了 `ai-feedback.tsx` 的复制降级假成功（已确认同源）；`markdown.tsx` 的 CodeBlock 复制按钮是同一缺陷的第二实例（不同文件、同「clipboard-write-failed 只处理 reject、不处理 API 缺失」根因）。非 https 上下文（内网部署、iframe sandbox）clipboard 不可用时，用户点复制看到「已复制」而剪贴板为空。
- **为什么值得关心**：低代码宿主常以 http 内网部署，这是默认路径而非边缘；两处同因，修一处漏一处。
- **修复方向**：`clipboardAdapter.writeText` 无 API 时返回 rejected promise（或调用方区分「不可用」不置 copied）。
- **信心水平**：确定（路径逐行可证）

## 发现 R2-F3（P2）— `branching.ts` 的 `parseInt(m[2], 10) + 1` 对前导零 branch id（`branch-01` → `branch-2`）与 `findPriorAssistantBranchId` 的字符串前缀匹配不透明

- **在哪里**：`src/engine/branching.ts:32-35`（`/^(.*?)(\d+)$/` + `parseInt` 递增）与 `:55-63`（`findPriorAssistantBranchId` 仅要求 `typeof branchId === 'string'`）。
- **是什么**：host 若传入带前导零的显式 branch id（`branch-01`），引擎生成的下一 id 是 `branch-2`（parseInt 归一化）——分支 id 字符串格式漂移；`findPriorAssistantBranchId` 不校验格式，混合格式的 id 序列会让 branch 递增在数值语义上自洽但在字符串展示上不一致（`branch-01` → `branch-2` → `branch-3`）。行为正确性无损（递增语义保持），但作为 host 可见的 id 契约缺少归一化约定。
- **为什么值得关心**：A-16 分支契约把 branch 集合所有权交给 host，id 是跨 reload 持久化的键；格式约定不写清楚，host 端排序/去重易踩。
- **信心水平**：很可能（触发路径窄；展示层影响，非数据损坏）

## 本轮排除

- `ai-attachments` 上传后列表不清空——renderers.md §9 无此契约，host 可用受控 `value` 自行清空，不报。
- `ai-suggestions`/`ai-prompts` 的 `role="list"`/key 推导——既有注释已登记 N-6 家族并接受，不报。
- `ai-feedback` 复制假成功本身——已登记 P3（`docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`），本批只报 markdown 新实例（R2-F2）。
- `data-slot`/样式/`[data-slot='ai-message-list']` 布局——styling-system 契约内由 host schema 负责，不报。
