> Audit Status: closed（原 open → 2026-08-11 mission-driver 起草轮 planned：P1 R1-F1 已路由 `docs/plans/2026-08-11-0008-2-engine-loop-termination-and-error-carrier-remediation.md`；8 条 P2 已移入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog「2026-08-10-2245 双审计 P2 填充」节 → **2026-08-11 plan `2026-08-11-0008-2` 收口翻 closed**（R1-F1 按事实修正后收口：marker 载体归位末条 assistant + renderer 终止 note 消费 + 无害性守卫钉住「正常 loop-max 路径无 dangling」；本 audit 原文的「dangling 清理第四面」主张经独立 review + live 复核重述为 marker 错位 + 零消费，见该 plan Purpose 事实修正段 + bug note 149；其余 8 条 P2 全部入 roadmap Follow-up Backlog））
> Audit Type: open-ended
> Mission: ai-invariant-loop

# Open-Ended Adversarial Audit — Mission `ai-invariant-loop` (`packages/flux-renderers-ai`)

**Date:** 2026-08-10 · **Executor:** opencode（per `docs/skills/open-ended-adversarial-review-prompt.md`）
**Scope:** `packages/flux-renderers-ai/` — engine, adapters, renderers, rich-text subpath, schemas, definitions, tests, docs — read completely; cross-checked against `AGENTS.md`, `docs/index.md`, `docs/skills/react19-best-practices-review.md`, invariant gates ①-⑪ (`docs/audits/ai-invariants/`), and prior audit batches.
**去重基线:** `docs/analysis/2026-08-09-1826-open-audit-ai-invariant-loop/round-01..03`（F1-F9，已修核销）、`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`（FIND-01..22，本轮独立复核其结论但全部不重报）、07-23/07-24 两批 AI 审计（F1.1-F3.2 / P1-1..P1-5，已修核销）。本轮所有条目均为**新实例或已登记家族的新成员**。
**验证方式:** 全量读代码（~90 文件含全部 renderers/engine/adapters/rich-text）+ 针对性 grep 全仓 + babel-react-compiler 实际编译产物反查（排除 React Compiler 流式冻结猜想）+ 既有测试交叉证实（`engine-tool-loop.test.ts`、`use-conversation-switch.test.ts` 等）；运行态 probe 未新增（所有条目静态可证）。
**视角:** 契约考古学家 + 异常路径侦探 + 10x 规模运维者 + 死代码清道夫 + 恶意输入者（host 注入面）。

## Priority Summary

| Priority | Count | Drives remediation plan? |
| -------- | ----- | ------------------------ |
| **P0**   | 0     | —                        |
| **P1**   | **1** | **Yes**                  |
| **P2**   | **8** | No（follow-up backlog）  |

**Outcome:** audit has issues → remediation plan must cover the 1 P1; the 8 P2s triage to the `ai-invariant-loop-roadmap.md` follow-up backlog.

---

# P1 Findings (material — must fix)

## [R1-F1][P1] tool-loop-max 终止是 invariant ⑩「dangling tool_calls 清理」的第四处漏网表面：末轮 assistant 的 tool_calls 无配对 tool 响应，永久留在 live 历史 + 渲染成无限旋转的 running 卡片

_Justification: the ⑩ family explicitly covers three cleanup surfaces (runOnce abort branch / tool-no-executor / abort-mid-executor — all call `cleanDanglingAssistantAt`); the `maxToolRounds` break creates the exact same dangling shape on a fourth surface and cleans nothing — the committed assistant keeps `tool_calls` with no paired `role:'tool'` message, `requestState` completes, and the UI renders a forever-spinning `running` tool card with no stop entry. Same-family missed member, user-visible, and the `toolLoopMaxReached` marker the engine writes has zero renderer consumers._

- **Where:** `packages/flux-renderers-ai/src/engine/create-engine.ts:267-282` (loop-top `rounds >= maxToolRounds` break — marker write only, no `cleanDanglingAssistantAt`), `:344-355` (unconditional `completed`); contrast the three ⑩ surfaces `:315`, `:334`, `:561-576`; `src/renderers/ai-bubble/renderers/tools.tsx:64-71` (`resolveToolState` fallback `{status:'running'}`); `src/renderers/ai-tool-call.tsx:54,337-349` (running → infinite `Loader2` spin); `src/engine/utils.ts:173-215` (dangling predicates); `engine-tool-loop.test.ts:194-213` (test asserts marker + round count only — no dangling-cleanup assertion, no render-surface test).
- **What:** when `maxToolRounds` (default 8) is hit, the last executed round's assistant was committed with `finishReason:'tool_calls'` + non-empty `tool_calls`; the loop-top check breaks before `executeToolCalls` and before any cleanup. Consequences: (1) engine live history + `getMessages()` exit hold a dangling-tool_calls assistant; (2) `requestState='completed'` — no error, no stop button (loading=false); (3) the tool card renders `status:'running'` indefinitely (spinner forever, no affordance to resolve); (4) `metadata.toolLoopMaxReached` is written but zero renderers read it (grep: only tests). The request-payload face (buildContext `sanitizeDanglingToolCalls`) and autoSave face hide the residue from the wire/storage — exactly why nothing 400s and the defect stayed invisible.
- **Why it matters:** 8+ consecutive tool rounds is a real agentic-task shape (long multi-tool workflows). Users see a permanently-spinning card instead of a "loop limit reached" state; hosts reading `component:getMessages` get the corrupted shape. This is the mission's own founding lesson (same family, missed sibling surface) applied to cleanup faces — the ⑩ gate's three-surface enumeration is incomplete, and no test pins the fourth.
- **Fix:** call `cleanDanglingAssistantAt(adapter, outcome.assistantIndex)` at the loop-max break (or strip tool_calls there); optionally consume `toolLoopMaxReached` in the renderer (render a termination note + `cancelled` status). Add engine regression (loop-max tail cleaned) + render regression (no infinite running card).
- **Confidence:** 确定 (code-path trace + grep proof; behavior partially pinned by the existing test's own data)

---

# P2 Findings (non-blocking — follow-up backlog)

Each P2 was statically verified against live code.

## [R2-F1][P2] `ai-citations` 显式 `sources: []` 不覆盖 `metadata.sources` — P2-7「显式空数组 = 显式意图」修复的 sibling 成员漏网

_Justification: schema docs promise "Explicit sources (overrides metadata.sources / data-sources)"; `resolveSources` requires `length > 0`, so an explicit empty array silently falls through to metadata — hosts cannot disable citation rendering per-message. ai-feedback's P2-7 fixed the identical empty-array contract; citations is the same-family sibling._

- **File:** `src/renderers/ai-citations.tsx:465-486` (`resolveSources`), `src/schemas.ts:344` (override promise)
- **Confidence:** 确定

## [R1-F2][P2] ⑪ plugin ctx 写隔离只到 element 层：`ctx.request.messages[i]` 的 `tool_calls`/`content`/`metadata` 嵌套值仍与 engine 历史共享引用

_Justification: the ⑪ fix (open P1-1 family) isolates the array and element objects, but `projectWireMessage` assigns nested arrays (`tool_calls`, `content` parts) and metadata nested values by reference — a plugin `push` on them writes through into engine history AND the wire payload. Doc comment (types.ts:277-287) over-promises ("never write through"). Residual member at the nested depth of the registered open P1-1._

- **File:** `src/engine/build-context.ts:55`, `src/engine/utils.ts:254-268` (`projectWireMessage` direct-reference assignment)
- **Confidence:** 确定 (pure reference analysis)

## [R1-F3][P2] `useConversation` 无 storage + `initialConversations`：首会话 `activeConversationId` 已指向它但 `activeEngine` 恒 null — K-⑥-3 的「默认会话按需建引擎」只覆盖了 storage bootstrap 面

_Justification: with no storage, `initialConversations` seeds `activeId` but no engine is ever built for it — `activeEngine` stays null until an explicit `switchConversation`; a host binding `engine={activeEngine}` gets the "select conversation" empty state with a conversation already active. K-⑥-3 fixed exactly this gap on the storage face (mount-bootstrap default build); the no-storage face is the missed member._

- **File:** `src/adapters/use-conversation.ts:125-130` (activeId init), `:168` (activeEngine null), `:329-338` (K-⑥-3 storage-only)
- **Confidence:** 确定

## [R1-F4][P2] bootstrap `loadConversations` 期间 `deleteConversation` 的被删会话被 K-⑦ merge 复活为幽灵列表项

_Justification: the K-⑦ bootstrap merge guards only `clearAll`-during-load (`listClearedRef`); a delete during the load window leaves the deleted id in the loaded `convs` base, resurrecting it as a ghost list entry (and, if it was the only conversation, promoting it to active). Same ghost-resurrection family as K-⑦ probe-2/clearAll, delete direction unguarded._

- **File:** `src/adapters/use-conversation.ts:311-326` (merge), `:501-552` (delete mirror filter)
- **Confidence:** 确定 (state-trace)

## [R1-F5][P2] `ai` ActionScope namespace 无实例隔离：同页两个 ai-chat 时后挂载者顶替前挂载者的 provider，先卸载者整 namespace 注销

_Justification: `useNamespaceRegistration(actionScope, 'ai', ...)` is namespace-keyed; `action-scope.ts` replaces (and cleans up) an existing provider on re-register and deletes the whole namespace on unregister. Two ai-chats on one page silently route `ai:*` actions to the last-mounted chat, then lose the namespace entirely when it unmounts. ComponentHandle path is cid-isolated; the namespace path is not — no guard, no doc note._

- **File:** `src/renderers/ai-chat.tsx:200-206`, `packages/flux-runtime/src/action-scope.ts:53-68`
- **Confidence:** 很可能

## [R2-F2][P2] markdown CodeBlock 复制在无 `navigator.clipboard` 环境报假「已复制」— 已登记 P3 家族（ai-feedback）的第二个实例

_Justification: the 2026-08-09 multi-audit registered the ai-feedback copy false-success at P3; `markdown.tsx`'s CodeBlock copy is the same root cause (handles rejection, lies on API absence) in a second file. Non-https (intranet/sandboxed) deployments — common for low-code hosts — hit the "Copied without copying" path._

- **File:** `src/renderers/ai-bubble/renderers/markdown.tsx:119-130,166-177`
- **Confidence:** 确定

## [R2-F3][P2] `branching.ts` 前导零 branch id（`branch-01` → `branch-2`）归一化无契约说明，`findPriorAssistantBranchId` 不校验格式

_Justification: host-passed `branch-01` advances to `branch-2` (parseInt normalization) — display-level format drift in a host-owned, persistence-keyed id contract; behavior stays numerically correct, but the format convention is unspecified in A-16 docs._

- **File:** `src/engine/branching.ts:32-35`, `:55-63`
- **Confidence:** 很可能

## [R3-F1][P2] `TimestampContentRenderer` 对 host 可写非法 `metadata.createdAt` 无防护：`dateTime={date.toISOString()}` 在 Invalid Date 上抛 RangeError，整个 bubble（及无 Error Boundary 的聊天树）崩溃

_Justification: `metadata.createdAt` is a host-writable extension surface (`[key: string]: unknown`); the `typeof === 'number'` guard passes `NaN`/out-of-range values, then `toISOString()` in the JSX attribute throws before `formatTimestamp`'s try/catch. Same host-injection crash family as F6 (cloneMessages, fixed); this member is unguarded, and `ai-chat` has no error boundary to contain the throw._

- **File:** `src/renderers/ai-bubble/renderers/timestamp.tsx:17-30`
- **Confidence:** 确定 (spec behavior: `toISOString` throws RangeError on Invalid Date)

---

# 总评（free-form）

`flux-renderers-ai` 处于一个罕见的健康状态：invariant 门禁 ①-⑪ 全部生效、前一晚 22 条的修复波次（multi-audit FIND-01..22）被逐条核销、测试 659+ 全绿、本轮机械门禁零命中。但恰恰是这个健康状态暴露了系统当前最值得关注的方向：

1. **⑩-family 的清理面枚举仍未闭环（R1-F1）。** 该家族的修复每次都是「发现新面 → 补面」的反应式循环（三面 → 现在第四面），门禁 ⑩ 的检测面（空产物谓词）与清理面（dangling 谓词）是两套枚举，后者没有门禁锚定。mission 自己的创立教训（same family, missed sibling）正在 cleanup-surface 维度上重演——值得把「dangling 清理面」纳入下一轮门禁枚举（与 engine.md §Invariants 的失败路径表对齐），而不是再靠审计发现第五面。
2. **host 注入面仍然是包内最脆的契约层（R1-F2, R3-F1, R2-F1）。** 引擎和渲染器对 host 写入的 metadata/schema 值做了大量零散防御（cloneMessages try/catch、normalize\* 函数、Number.isFinite 检查），但防御是按文件个别生长的，没有统一策略（`ai-token-usage` 检查了 isFinite，`timestamp` 没有；`ai-feedback` 修了空数组，`ai-citations` 没修）。一个「host 输入归一化入口」或至少一份「哪些 host 可写字段必须防御」的清单，比继续逐点打补丁更划算。
3. **实例级隔离只在 ComponentHandle 存在，namespace 与 scope 层面没有（R1-F5）。** 单页多 ai-chat 会静默路由错乱。chat 类产品（分屏助手、多会话侧栏）多实例是常态，这是下一个合理需求到来时（未来破坏者视角）会逼出 hack 的地方。

# 本次审查的盲区自评

- **运行态盲区：** 本轮全部发现为静态可证；未做运行时 probe 验证 R1-F5（双 ai-chat 页面的实际 namespace 路由）与 R1-F3（initialConversations 首会话实际渲染空态）。这两个若下一轮验证，宜用 playground 级集成测试而非单元 probe。
- **测试环境与生产环境差异：** 测试跑在无 React Compiler 的 vitest（`vitest.shared` 不走 babel），本轮用编译产物反查排除了一个 Compiler 交互猜想，但其余 renderer 的 Compiler 行为（如 `AiBubbleView`/`chatContextValue` 的 memo 交互）没有逐文件反查——若有下一轮，建议把「Compiler 编译产物检查」扩展为常驻核查。
- **未深挖方向：** playground 集成面（`apps/playground/src/ai/` 的 host 接线与包导出契约的实际消费）、rich-text subpath 的 bundle 成本、以及 `docs/components/flux-renderers-ai/` 三份文档中未被 FIND-10..18 覆盖的零散行锚漂移（本轮只做了定向抽查，未全文比对）。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
