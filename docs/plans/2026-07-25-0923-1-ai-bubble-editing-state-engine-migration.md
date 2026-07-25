# 01 ai-bubble 消息编辑态迁移到引擎（survive A-8 虚拟回收）

> Plan Status: completed
> Last Reviewed: 2026-07-25
> Source: Deferred successor from `docs/plans/2026-07-25-0117-2-ai-p2-doc-and-test-hardening-2151.md`（2151 批 P2-4，`out-of-scope improvement`，`Successor Required: yes`）；再次记录于 `docs/plans/2026-07-25-0842-1-ai-p2-remediation-0707.md` Deferred But Adjudicated；`docs/components/flux-renderers-ai/design.md` §11.5 line 543
> Related: `docs/components/roadmap-ai.md`（A0–A6 全 done；本 plan 收口最后一个 AI 包专属的 `Successor Required: yes` deferred 项——全仓 raw `<button>` 收敛为跨包项，另计）
> Mission: ai
> Work Item: (plan-level deferred successor，非 roadmap A0–A6 工作项)

## Purpose

把用户消息编辑态（editing flag + draft text）从组件级 `useState` 迁移到 `MessageEngine`，使 `ai-message-list` 的 A-8 虚拟滚动（>200 消息）回收编辑行后，编辑态与草稿不再丢失。收口 flux-renderers-ai 计划队列中最后一个 AI 包专属的 `Successor Required: yes` deferred 项（全仓 raw `<button>` 收敛为跨包项，不在本 plan 范围）。

## Current Baseline

> 以下全部经 live repo 核对（2026-07-25）。

- **引擎无 editing-state setter**：`MessageEngine` 接口（`packages/flux-renderers-ai/src/engine/types.ts:276-312`）有 `getState`/`subscribe`/`sendMessage`/`send`/`abort`/`clear`/`setConnector`/`registerPlugin`/`getMessages`/`setMessages`/`regenerate`，**无** editing-state 读写方法。`MessageEngineState`（`types.ts:104-116`）也无 editing 字段。
- **编辑态当前是组件 useState**：
  - `packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx:36-37`：`const [editing, setEditing] = useState(false);` + `const [draft, setDraft] = useState('');`
  - `packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx:86`：`const [isEditing, setIsEditing] = useState(false);`（控制编辑时隐藏 content slices）
- **`ChatMessageUIState` 已有 index signature**：`types.ts:55-59` 定义 `thinking?`/`toolCall?` + `[key: string]: unknown`。故 `message.state.editing` 类型上已允许，但无 typed 字段，也无引擎写入路径。
- **插件写 `message.state.*` 的既有模式**：`tool-plugin`/`length-plugin`/`thinking-plugin` 经 `adapter.mutate('messages', recipe)`（`state-adapter.ts:47-50`）写入 `message.state.toolCall[id]`/`.length`/`.thinking`。编辑态是 renderer-driven（非 plugin-driven），故需一个公共引擎方法而非插件。
- **design.md §11.5 已如实记录现状**：`design.md:543` 记录「消息编辑态（`message.state.editing`，P2 增强项）」ownership 为 **local（当前实现）**，持有方为组件 useState，引擎无 editing-state setter，后果是 A-8 虚拟回收丢编辑态，「迁移到引擎属未来增强，见 plan `2026-07-25-0117-2` Deferred」。
- **A6 Tiptap sender 也可能持有编辑草稿**：本 plan 只迁移 `ai-bubble` 的用户消息编辑态（pencil → textarea → resubmit），不涉及 sender 输入框 draft（那是另一个独立的 local state，design.md §11.5 line 537 标为 `local` / 不投影）。

## Goals

- 引擎持有消息编辑态：`message.state.editing`（typed），并暴露公共 setter `setMessageEditing(messageId, editing)`。
- `ai-bubble`（`index.tsx`）与 `user-edit.tsx` 从引擎快照读写编辑态，移除组件级 `useState`（editing flag + draft text）。
- A-8 虚拟回收后，被回收行的编辑态 + 草稿在重新挂载时从引擎恢复（focused proof 覆盖）。
- design.md §11.5 更新为迁移后的最终所有权（engine-held）。

## Non-Goals

- 不改编辑 UX（pencil toggle / textarea / resubmit-truncate-and-regenerate 流程不变）。
- 不迁移 sender 输入框 draft text（`design.md:537`，独立的 local state）。
- 不把编辑态投影到 flux scope（保持 `不投影`，仅 engine-held + renderer 订阅）。
- 不重构 A-8 虚拟滚动本身（只让编辑态 survive 它）。
- 不引入「多消息同时编辑」语义（同一时刻至多一条消息处于 editing，与当前 UX 一致）。

## Scope

### In Scope

- `engine/types.ts`：`ChatMessageUIState` 增 typed `editing?` 字段；`MessageEngine` 增 `setMessageEditing()` 方法签名。
- `engine/create-engine.ts`：实现 `setMessageEditing()`（经 `adapter.mutate('messages', recipe)` 写 `message.state.editing`，找不到 messageId 时 no-op）。
- `renderers/ai-bubble/user-edit.tsx`：editing flag + draft 改为读写 `message.state.editing`（经 engine setter / engine 快照）。
- `renderers/ai-bubble/index.tsx`：`isEditing` 改为从 `message.state.editing` 派生（移除 `useState`）。
- `design.md` §11.5 line 543：更新为 engine-held 所有权 + 移除「虚拟回收丢编辑态」后果。
- focused proof：编辑态经 engine setter 写入 + 快照恢复 + 虚拟回收场景模拟。

### Out Of Scope

- sender draft 迁移、scope 投影、多消息并发编辑、A-8 虚拟滚动重构（见 Non-Goals）。
- Tiptap 富文本编辑器的内部 draft（`tiptap-sender.tsx`，独立 local state）。

## Failure Paths

> 涉及 engine 状态写入与 renderer 生命周期，填写关键可测场景。

| 场景编号             | 触发                               | 行为                                                      | 可重试 | 用户可见表现                      |
| -------------------- | ---------------------------------- | --------------------------------------------------------- | ------ | --------------------------------- |
| edit-unknown-message | `setMessageEditing('nonexistent')` | no-op（找不到 message，不抛错、不写 state）               | 否     | 无（调用方应保证 messageId 有效） |
| edit-during-stream   | isProcessing 时尝试进入编辑        | pencil 按钮 `disabled`（既有守卫）；setter 仍可写入       | 否     | 编辑按钮禁用                      |
| edit-recycle-restore | 虚拟滚动回收编辑行后重新挂载       | 从 `message.state.editing` 恢复 editing flag + draft text | —      | 编辑器 + 草稿保留，不闪回只读态   |
| edit-resubmit-clear  | resubmit 成功（truncate + resend） | 清除该 message 的 `state.editing`（消息已被截断移除）     | —      | 编辑器关闭，正常进入新一轮流式    |

## Test Strategy

档位选择：建议有测

> 引擎方法 + renderer 状态迁移，属非关键路径但跨 engine/renderer 边界。focused 单测覆盖 engine setter 行为 + renderer wiring；不要求 e2e（虚拟回收需 >200 消息，单测以「卸载-重挂载模拟回收」替代）。

## Execution Plan

### Phase 1 - 引擎 editing-state setter + typed 字段

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/types.ts`、`packages/flux-renderers-ai/src/engine/create-engine.ts`

- Item Types: `Fix | Proof`

- [x] [Fix] `engine/types.ts`：`ChatMessageUIState` 增 typed 字段 `editing?: { active: boolean; draft?: string }`（保留既有 index signature）。
- [x] [Fix] `engine/types.ts`：`MessageEngine` 接口增 `setMessageEditing(messageId: string, editing: { active: boolean; draft?: string } | null): void`，附 JSDoc 说明「renderer-driven 消息编辑态；经 adapter mutate 写 `message.state.editing`；messageId 不存在时 no-op；不投影到 scope」。
- [x] [Fix] `engine/create-engine.ts`：实现 `setMessageEditing()`——经 `adapter.mutate('messages', draft => { const m = draft.messages.find(x => x.id === messageId); if (m) m.state = { ...m.state, editing }; })`（shallow-copy state 防 shared-reference 写穿，与 `getMessages()` 隔离契约一致 `types.ts:287-293`）。
- [x] [Proof] 新增 `engine/__tests__/engine-editing-state.test.ts`：FP-A `setMessageEditing` 写入后 `getState().messages[i].state.editing` 反映新值；FP-B messageId 不存在时 no-op（messages 长度与既有 state 不变）；FP-C resubmit 清除路径模拟（`setMessages(slice)` 后 editing 消失因 message 被移除）。

Exit Criteria:

- [x] `setMessageEditing` 在 `MessageEngine` 接口与 `create-engine` 实现中存在且行为正确（FP-A/B/C 绿）。
- [x] `ChatMessageUIState.editing` 为 typed 字段（非仅 index signature）。
- [x] 局部 `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 通过。

### Phase 2 - Renderer 迁移：useState → engine editing state

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/user-edit.tsx`、`packages/flux-renderers-ai/src/renderers/ai-bubble/index.tsx`

- Item Types: `Fix | Proof`

- [x] [Fix] `user-edit.tsx`：移除 `const [editing, setEditing] = useState(false)` 与 `const [draft, setDraft] = useState('')`；editing 改为从 `message.state?.editing?.active ?? false` 读取；draft 改为从 `message.state?.editing?.draft ?? ''` 读取。`startEdit`/`cancelEdit`/draft onChange 改为调 `engine.setMessageEditing(message.id, { active, draft })`。
- [x] [Fix] `user-edit.tsx`：resubmit 成功路径（`setMessages(slice)` 前）显式调 `engine.setMessageEditing(message.id, null)` 清除编辑态（防御 Failure Path `edit-resubmit-clear`，虽然 message 被截断移除，但显式清除更安全）。
- [x] [Fix] `index.tsx:86`：移除 `const [isEditing, setIsEditing] = useState(false)`；`isEditing` 改为从 `message.state?.editing?.active === true` 派生（`data-editing` 属性逻辑不变，只是数据源换成 message.state）。
- [x] [Fix] `index.tsx`：`UserMessageActions` 的 `onEditingChange` 回调移除——数据源已统一到 engine（`isEditing` 从 `message.state.editing.active` 派生），不再需要跨组件 useState 同步。若 `UserMessageActionsProps.onEditingChange?` 有外部消费者则保留 prop 但内部不再驱动 bubble state（本 plan 核对：`onEditingChange` 仅被 `index.tsx` 内部消费，可直接移除）。
- [x] [Proof] 扩展 `renderers/__tests__/` 下既有 ai-bubble / user-edit 测试（若无则新增 `ai-bubble-editing-engine-state.test.tsx`）：FP-D 进入编辑 → engine `message.state.editing.active === true` + draft 写入；FP-E 取消编辑 → `active === false`；FP-F 模拟虚拟回收：卸载 `AiBubbleView` 再以同一 `message`（带 `state.editing`）重挂载 → 编辑器仍显示 + draft 保留（不断言闪回只读）。

Exit Criteria:

- [x] `user-edit.tsx` 与 `index.tsx` 中 `useState` 编辑态相关调用全部移除（`rg useState` 在这两个文件内对 editing/draft 0 hit）。
- [x] editing flag + draft 经 `engine.setMessageEditing` 写入、经 `message.state.editing` 读取。
- [x] FP-D/E/F 绿（断言具体行为结果，非「无错误」）。
- [x] 核心用户可见收益成立：进入编辑后「滚动出虚拟窗口再滚回」恢复编辑器 + 草稿（FP-F 的 unmount/remount 模拟即此场景的代表化验证）。
- [x] 局部 typecheck + `pnpm --filter @nop-chaos/flux-renderers-ai test` 通过。

### Phase 3 - Owner-doc 同步

Status: completed
Targets: `docs/components/flux-renderers-ai/design.md` §11.5

- Item Types: `Follow-up`

- [x] [Follow-up] `design.md:543`：「消息编辑态」行 ownership 由 **local（当前实现）** 改为 **域内部**（engine-held）；持有方改为 `MessageEngine.setMessageEditing()` 写入 `message.state.editing`；移除「引擎无 editing-state setter」「虚拟回收丢编辑态」后果描述；投影通道保持 `不投影`。

Exit Criteria:

- [x] `design.md` §11.5 编辑态行反映迁移后的 engine-held 所有权（无「当前实现」「未来增强」措辞残留，符合 Minimum Rule 14 只描述最终设计状态）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立 fresh-session 子 agent 填写。

- Reviewer / Agent: independent fresh-session general sub-agent（`ses_069209e35ffe8AG52E6m6NxJnz`，未复用起草者上下文）
- Verdict: `pass-with-minors`
- Rounds: 1（第 1 轮即达成共识，零 Blocker / 零 Major）
- Findings addressed:
  - Minor 1（「最后一个」措辞）：已限定为「最后一个 AI 包专属的 `Successor Required: yes` deferred 项」，全仓 raw `<button>` 收敛（跨包项）显式排除。
  - Minor 2（Phase 2 `onEditingChange` 软「或」）：已收紧为单一裁定——移除 `onEditingChange`（核对仅 `index.tsx` 内部消费）。
  - Minor 3（Work Item `A-polish` 合成 ID）：已改为「(plan-level deferred successor，非 roadmap A0–A6 工作项)」，避免误读为 roadmap 继承项。
  - Note（scroll-restore exit criterion）：Phase 2 Exit Criteria 已增「核心用户可见收益成立」条目，将 FP-F 的 unmount/remount 明确定位为虚拟回收场景的代表化验证。
- 引用核对：全部 file:line 经独立子 agent live repo 核对（types.ts:276-312 / 104-116 / 55-59、user-edit.tsx:36-37、index.tsx:86、state-adapter.ts:47-50、design.md:543、两份 deferred chain plan、roadmap A0–A6 全 done）均 VERIFIED。
- Re-triggerability：独立子 agent 确认 drafting 合法——roadmap 工作项队列空（A0–A6 done、follow-up backlog 全 `[x]`）、本项 `Successor Required: yes` 经两轮 closure 留下、roadmap Rule 明确「plan 由 AI 自动拟制和执行」、原始 deferral 是 scope-based 非 prerequisite-based。

## Closure Gates

> 行为/契约结果类计划。全量 `pnpm typecheck/build/lint/test` 在此跑一次（Minimum Rule 18）。

- [x] 引擎 `setMessageEditing` 公共方法存在且行为正确（FP-A/B/C）。
- [x] `ai-bubble`/`user-edit` 编辑态经 engine 读写，组件 `useState` 移除（FP-D/E/F）。
- [x] A-8 虚拟回收场景编辑态恢复有 focused proof（FP-F）。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift。
- [x] 受影响 owner doc（`design.md` §11.5）已同步到迁移后 baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划预期无新增 deferred 项。若执行中出现需裁定项，按 `Non-Degradable Items` 规则处理。

## Non-Blocking Follow-ups

- F3.1 残留 6 处手写 `useMemo`/`useCallback`（watch-only periodic re-review，来自 2151 批，非本 plan owned）。
- 全仓 raw `<button>` 收敛（独立全仓任务，非本 plan owned）。

## Closure

Status Note: 全部 3 个 Phase 完成。ai-bubble 用户消息编辑态（editing flag + draft text）已从组件级 `useState` 迁移到 `MessageEngine`——新增 `MessageEngine.setMessageEditing(messageId, editing)` 公共方法（经 `adapter.mutate('messages', ...)` 写 `message.state.editing`，shallow-copy message+state 防快照写穿，unknown messageId no-op）；`ai-bubble/index.tsx` 与 `user-edit.tsx` 移除全部编辑态 `useState`，改读 `message.state.editing` 快照、经 setter 写入；A-8 虚拟回收后重新挂载从引擎快照恢复编辑器 + 草稿（FP-F unmount/remount proof）。`design.md` §11.5 已同步为 engine-held（域内部）所有权。全量 `pnpm typecheck/build/lint/test` 绿。

Closure Audit Evidence:

- Auditor / Agent: independent fresh-session general sub-agent（`ses_0690ff5a0ffejvVKBDf2Zad4ck`，未复用执行 session 上下文，仅输入三件套：plan + diff summary + verification output）
- Verdict: `pass`（零 Blocker / 零 Major / 零 Minor）
- Evidence: 独立核对 `create-engine.ts:165-168` shallow-copy message+state 隔离成立（FP-A 先前快照不受后续写影响）；unknown-id no-op（`create-engine.ts:163`）由 FP-B 断言；`onEditingChange` 移除安全（全包零引用）；FP-F（`ai-bubble-editing-engine-state.test.tsx:182-211`）为迁移核心 proof（unmount→remount 恢复编辑器 + 草稿）；流式守卫保留（`user-edit.tsx:61` resubmit 早返回 + `:108` pencil disabled）；docs §11.5 line 543 已更新为域内部所有权。复核目标测试：59 files / 474 tests 绿。

Follow-up:

- 无 remaining plan-owned work。Non-Blocking Follow-ups（F3.1 残留 useMemo/useCallback、全仓 raw `<button>` 收敛）均非本 plan owned，保持既有 watch-only / 独立任务跟踪。
