# 148 投影重建盲区：等长原地替换（A）与 idle→processing 会话交换（B）无信号

## Problem

- P1-6 投影重建触发谓词四信号（isProcessing 翻转 / requestState 终态 / 空闲数组引用变化 / 空闲 length 变化）仍漏两类「无信号」替换，`${messages}` 绑定区域（header/beforeMessages/afterMessages/footer/emptyState）长期显示陈旧数据：
  - 盲区 A：abort-mid-executor 后 `cleanDanglingAssistantAt` strip-keeps-text 原地**等长**元素替换（同引用、同 length）→ 投影保留 pre-strip ghost tool_calls 直到下一轮次（可能永不）。
  - 盲区 B：会话 A(idle)→B(processing) 后台流式交换（switch-while-stream）→ `!isProcessing` gate 短路空闲替换、`crossedBoundary` 需 processing→idle、`terminalCrossed` 在 processing 期恒 false → 投影全程显示上一会话。

## Diagnostic Method

- 难点：替换发生时无任何状态信号（引用/长度/状态机全不变），纯 render 面不可观测。
- 排查路径：审计先枚举 P1-6 四信号的粒度边界 → 对 engine 三条清理面（runOnce abort 分支 / tool-no-executor / abort-mid-executor return）逐一验证替换形态 → 确认 `cleanDanglingAssistantAt`（`tool-execution.ts:145-158`）与 `commitAssistant`（`create-engine.ts:483-491`）均为原地等长替换 → 用 gated toolExecutor 复现 abort-mid-executor、用 switch-while-stream 复现会话交换。
- 决定性证据：两条 RED 回归——修复前盲区 A `waitFor` 超时（投影 assistant 仍带 `tool_calls`）；盲区 B `waitFor` 超时（投影仍显示 A 的 seed 消息）。

## Root Cause

- 触发谓词全是粗粒度信号：数组引用与 length 对「元素内容级」替换（同 index 换新对象）不敏感；`!isProcessing` gate 把「engine 身份交换」与「流式 chunk」混在一起——原本用于避免 per-chunk 克隆，但一并屏蔽了合法身份交换。
- 主消息列表读 live context（render 时按 index 取元素，原地替换天然可见）不受影响；只有快照投影面需要额外信号。

## Fix

- `ai-chat.tsx` 投影谓词扩展：
  - 新增元素恒等指纹 `messageSetFingerprint`（last-message id + finishReason + tool_calls length，O(1)）——idle 守卫加第 5 信号，捕获等长原地元素替换（盲区 A）。
  - engine 身份交换分支（`snapSourceRef !== messages`）改为**无条件**（移除 `!isProcessing` gate）——streaming 期间数组引用稳定（仅元素/内容原地变更），不会误触发；合法身份交换（含 idle→processing）立即克隆（盲区 B）。
  - 收敛语义保持：`snapSourceRef`/`snapLength`/`snapFingerprint` 每 render 收敛到 live 身份，流式不克隆成本纪律不变。

## Tests

- `packages/flux-renderers-ai/src/renderers/__tests__/ai-chat-projection-find06.test.tsx` — FIND-06 盲区 A：gated toolExecutor + abort-mid-executor → 投影无 ghost tool_calls；盲区 B：swap 到 processing 中会话 B → 投影立即显示 B。既有 turn-boundary（P1#2 gated-streaming 等）在 `ai-chat-projection.test.tsx` 零回归（两文件共享 `ai-chat-projection-test-support.tsx`，2026-08-11 按 oversized 门禁拆分）。

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-chat-projection.test.tsx`

## Notes For Future Refactors

- 投影谓词五信号：翻转 / 终态 / 引用（无条件）/ 空闲 length / 空闲指纹——新增引擎级原地替换面时必须复核指纹是否覆盖（last-message 维度足够当前清理面，若出现中间位置元素替换需扩展指纹）。
- 不要把 engine 身份交换重新放回 idle gate：streaming 期间引用稳定是该分支无条件化的前提，任何「流式中换数组引用」的引擎改造都会触发克隆（语义正确但注意成本）。
