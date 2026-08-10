# 160 Host-Environment 防御族：clipboard 假成功 + ActionScope namespace 静默顶替（R2-F2 / R1-F5）

## Problem

- markdown CodeBlock 复制在无 `navigator.clipboard` 环境报假「已复制」（R2-F2，`docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`）：非 https / 沙箱环境 `navigator.clipboard` 缺失时 `clipboardAdapter.writeText` 返回 `undefined` → `Promise.resolve(undefined)` 成功 → `setCopied(true)`。ai-feedback 的 `copyMessageText` 同根因（P3 家族成员，本次顺带收敛）。
- `ai` ActionScope namespace 无实例隔离（R1-F5，同审计）：`flux-runtime/src/action-scope.ts` `registerNamespace` 同 namespace 重复注册时 `cleanupProvider(existing)` 顶替，unregister 删整个 namespace——同页双 ai-chat 的 `ai:*` 动作路由到后挂载者，先卸载者注销后 namespace 消失，全程静默。

## Diagnostic Method

- R2-F2：`clipboardAdapter.writeText`（`markdown.tsx:166-177`）缺失面 `return undefined`——与已处理的 reject 面（permission/no-focus）不对称。测试直接操纵 `navigator.clipboard`（`Object.defineProperty` 置 `undefined` / `{}`）走生产 adapter 路径，断言按钮保持「Copy」不翻「Copied」。
- R1-F5：读 `action-scope.ts:53-68` 确认顶替语义；检测点必须在注册**之前**（layout effect 按声明序执行，故在 `useNamespaceRegistration` 前声明 `useLayoutEffect` 检查 `listNamespaces()` 是否已含 `ai`）——被动 effect 会看到本实例已注册的自身 provider，无法区分冲突。

## Root Cause

- R2-F2：API 缺失面被当作成功（`undefined` 返回值经 `Promise.resolve` 变 fulfilled）——缺失 ≠ 写入成功。
- R1-F5：namespace-keyed 注册模型本身无实例维度（结构性限制，见 Decision）。

## Fix

- R2-F2：`clipboardAdapter.writeText` 缺失面改 `Promise.reject(new Error('navigator.clipboard is not available'))`，`handleCopy` 的既有 `.catch` 保持按钮原态；ai-feedback `copyMessageText` 同步收敛（P3 成员顺带修复）。
- R1-F5：ai-chat 注册前检测——actionScope 已有 `ai` provider（`listNamespaces()` 含 `ai`）时 `console.warn` 一次（指向 design.md §14.2 多实例注记 + engine.md/renderers.md 注记节），不改变注册/注销语义。**Decision（2026-08-11）**：完整实例隔离方案（按实例 namespace / 前缀隔离 / action-scope 多 provider）涉及 `flux-runtime/src/action-scope.ts` 公共语义变更（结构性重构需人工确认），裁定**超出 P2 范围，入非阻塞 follow-up**；当前守卫 + 文档化已消除「静默路由错乱」的信息缺失，单页多 ai-chat 仍可用 ComponentHandle 路径（cid-isolated）。

## Tests

- `packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/markdown-and-data-part.test.tsx` — R2-F2 ×2 RED→GREEN（无 clipboard / 无 writeText → 不翻「Copied」）；既有「正常写成功翻 Copied」「reject 不翻」用例零回归。
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-feedback.test.tsx` — 同家族 ×2（copy 在 API 缺失面不翻「Copied」）。
- `packages/flux-renderers-ai/src/renderers/__tests__/namespace-integration.test.tsx` — R1-F5 RED→GREEN（同页双 ai-chat → 后挂载者触发 `[ai-chat]` warn）+ 单实例零 warn 回归。

## Affected Files

- `packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx`（clipboardAdapter）
- `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx`（copyMessageText）
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`（namespace 冲突检测）
- `docs/components/flux-renderers-ai/design.md` §14.2 / `engine.md` / `renderers.md`（多实例注记）

## Notes For Future Refactors

- clipboard 写入面统一「缺失 = reject」语义：API 缺失 / writeText 缺失 / 写入拒绝三态全部走 `.catch`，按钮只在 resolve 后翻「Copied」。
- `registerNamespace` 的顶替语义是 flux-runtime 公共行为，改动前必须有公共 API 变更决策；AI 包侧只做检测 + warn + 文档，不做运行时隔离。
- 检测冲突的 effect 必须在注册 effect 之前声明（layout effect 声明序 = 执行序），且依赖只含 `actionScope` 以保证一次性。
