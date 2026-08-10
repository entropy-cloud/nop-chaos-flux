# 147 onApproval 编译注册缺失致 HITL 审批结构性不可达（假绿测试掩盖）

## Problem

- schema 层 HITL 审批结构性不可达：`AiChatSchema.onApproval` / `AiBubbleSchema.onApproval` 有完整 doc-comment threading 承诺，但 `RendererDefinition.fields` 未注册 `{ key: 'onApproval', kind: 'event' }`。
- `classifyField`（`flux-compiler/src/schema-compiler/fields.ts:44-50`）把未声明 `on*` 键归为 `kind:'prop'`，`props.events` 只从 `eventPlans` 构建 → `props.events.onApproval` 恒 `undefined`。
- 行为面：ai-chat 气泡路径无条件 dispatch `eventsRef.current.onApproval?.()` → 静默 no-op（按钮可点无反应）；独立 ai-bubble 路径 gate `props.events?.onApproval` → `undefined` → `hitl-no-handler` 守卫 → 按钮 disabled。
- P2-4 回归测试用 `{ ...props.events, onApproval: spy }` 注入绕过编译器，且测试 schema 本身不含 `onApproval` → 假绿。

## Diagnostic Method

- 难点：行为「按钮可点但无反应 / 按钮 disabled」与编译管线分离，spy 注入让测试永远绿。
- 排查路径：先核对 schema 类型声明与渲染器消费（都存在）→ 再核对 `RendererDefinition.fields`（缺失）→ 顺 `classifyField` 分类规则确认落到 `kind:'prop'` → 用真实编译管线（schema 声明 `onApproval` + ActionScope provider 捕获 dispatch）重写测试，修复前 RED 证实。
- 决定性证据：修复前重写测试运行——ai-chat 路径 `capturedApprovals` 恒空（静默 no-op），独立 bubble 路径 `approve.disabled === true`（hitl-no-handler）。

## Root Cause

- 契约三面（schema 声明 / doc 承诺 / 渲染器消费）齐备，唯独 `RendererDefinition.fields` 注册面缺失——`onApproval` 不在 `COMMON_EVENT_FIELDS` 词表（onChange/onBlur/onFocus/onKeyDown/onKeyUp/onInput），显式注册是唯一入口。
- `contract-honesty` 门禁只查「已声明未消费」，不查「已消费未声明」→ 反向漂移无门禁兜底。

## Fix

- `ai-renderer-definitions.ts`：ai-chat fields 与 ai-bubble fields 各追加 `{ key: 'onApproval', kind: 'event' }`（对齐 ai-tool-call `:201`）。
- `ai-bubble-hitl.test.tsx` 全量重写：schema 声明 `onApproval: { action: 'capture:approval' }`，经真实 `RendererDefinition.fields` → schema-compiler → `eventPlans` → `props.events.onApproval` → runtime dispatch → 注册的 ActionScope provider 捕获；移除 spy 注入；模块级捕获变量按正确模式加 afterEach 重置（FIND-21 同面顺带修复）。

## Tests

- `packages/flux-renderers-ai/src/renderers/__tests__/ai-bubble-hitl.test.tsx` — 真实编译管线断言：ai-chat 气泡路径 dispatch approve/reject 载荷；独立 ai-bubble 路径按钮 enabled + dispatch。修复前 RED / 修复后 GREEN。

## Affected Files

- `packages/flux-renderers-ai/src/ai-renderer-definitions.ts`
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-bubble-hitl.test.tsx`

## Notes For Future Refactors

- 新增 renderer 事件字段时，`fields` 注册 / schema 类型 / doc / 消费四面必须同批落地；缺注册面时 `props.events.*` 恒 undefined 且无编译错误。
- 事件回归测试禁止注入 `props.events`；必须经真实编译管线（schema 声明 + ActionScope/action 捕获）。
- 反向门禁（consumed events ⊆ registered fields）评估结论：`contract-honesty` 机制可扩展但需新消费点提取启发式，按 plan 0008-1 裁定暂不落门禁，候选 backlog。
