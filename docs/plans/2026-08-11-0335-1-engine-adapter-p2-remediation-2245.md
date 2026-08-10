# 1 Engine/Adapter 族 P2 修复（autoSave connector-missing / plugin ctx 嵌套写隔离 / no-storage 首会话 / delete-during-load 幽灵 / branching 测试与契约）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Follow-up Backlog P2（2026-08-10-2245 双审计 engine/adapter 族）：FIND-12 / R1-F2 / R1-F3 / R1-F4 / FIND-22 / R2-F3
> Last Reviewed: 2026-08-11
> Source: `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（2026-08-10-2245 双审计 P2 填充节）、`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`（FIND-12/FIND-22）、`docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`（R1-F2/R1-F3/R1-F4/R2-F3）；live repo 核对 2026-08-11（HEAD `6085f697d`，行号以审计时点为准，执行时 live 复核）
> Related: `docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md`（renderer/UI 族 P2，独立 closure surface）、`docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md`（契约/文档族 P2，独立 closure surface）

## Purpose

修复 2026-08-10-2245 双审计遗留的 **engine/adapter 族 6 条 P2**（0 P0/P1）：① autoSave 不覆盖 connector-missing 轮——用户消息只进内存不进 storage，reload 后静默丢失（FIND-12）；② ⑪ plugin ctx 写隔离只到 element 层——`ctx.request.messages[i]` 的 `tool_calls`/`content`/`metadata` 嵌套值仍与 engine 历史共享引用，plugin `push` 可穿透写（R1-F2，open P1-1 已修族的嵌套深度残留成员）；③ `useConversation` 无 storage + `initialConversations` 时首会话 `activeEngine` 恒 null（R1-F3，K-⑥-3 只覆盖 storage bootstrap 面）；④ bootstrap `loadConversations` 期间 `deleteConversation` 的被删会话被 K-⑦ merge 复活为幽灵列表项（R1-F4，K-⑦ 只守卫 clearAll-during-load）；⑤ `branching.ts`「prev 无数字后缀」fallback 分支零测试覆盖（FIND-22）；⑥ `branch-01`→`branch-2` 前导零归一化无契约说明、`findPriorAssistantBranchId` 不校验格式（R2-F3）。

每条修复带 test-first 回归断言（RED→GREEN）+ 类别清扫；R1-F2 属 ⑪ 写隔离族漏覆盖的嵌套深度成员，评估 ⑪ 门禁是否需补测试成员（棘轮只增不减）。

## Current Baseline

（live repo 核对 2026-08-11；行号 = 审计时点 2026-08-10，0008-1/2/3 修复后部分漂移，执行时 live 复核）

- **FIND-12（autoSave connector-missing）**：`use-conversation-autosave.ts:38-44` autoSave 触发谓词 = `wasProcessing && isDone`（'completed' | 'aborted' | 'error'）；connector-missing 分支（`create-engine.ts:209-231`）从 idle 直接 mutate 到 `requestState:'error'`（`isProcessing` 从未为 true）→ 该轮推送的用户消息（`:222` `draft.messages.push(...incomingMessages)`）永不触发 autoSave → 会话 metadata 落盘但消息内容 reload 丢失。live 核对：`attachAutoSave` 订阅 `requestState` 通道（`use-conversation-autosave.ts:31-44`），`wasProcessing` 初值 = 订阅时 `engine.getState().requestState`（`:37`）。
- **R1-F2（⑪ 嵌套写隔离）**：⑪ 修复（open P1-1 族）只隔离了数组与 element 对象；`utils.ts:254-268` `projectWireMessage` 对 `tool_calls`/`content` 嵌套数组**按引用赋值**、`metadata` 仅浅拷贝（`{ ...message.metadata }` 嵌套值共享）→ plugin 对 `ctx.request.messages[i].tool_calls` 等 `push`/mutate 写穿 engine 历史 + wire payload。live 核对：`projectWireMessage` 循环 `WIRE_MESSAGE_KEYS`（含 `content`/`tool_calls`/`reasoning_content`）直接 `out[key] = value`；`types.ts:277-287` 注释「never write through」过度承诺。
- **R1-F3（no-storage 首会话）**：`use-conversation.ts:125-130` 无 storage 时 `activeId` 初始化为 `initialConversations?.[0]?.id`，但 `activeEngine` 恒 null（`:168`）；K-⑥-3 的按需建引擎只在 storage bootstrap 路径（`:329-338` `ensureEngineAndHydrateEvent`）→ host 绑定 `engine={activeEngine}` 得到「已有 active 会话却显示空态」。live 核对：`activeEngine` 初始 `useState<MessageEngine | null>(null)`；无 storage 时 mount 无任何 build-on-demand 路径。
- **R1-F4（delete-during-load 幽灵）**：K-⑦ merge（`use-conversation.ts:311-326`）只守卫 `listClearedRef`（clearAll-during-load）；load 窗口内 `deleteConversation`（`:501-552` 镜像过滤）删除的 id 仍在 `convs` 基内 → merge 后复活为幽灵列表项（若为唯一会话则升级为 active）。live 核对：merge 计算 `[...convs, ...conversationsRef.current.filter(...)]`，无 deleted-during-load 过滤面。
- **FIND-22（branching fallback 零覆盖）**：`branching.ts:32-35` fallback（`seq += 1; return \`branch-${seq}\``）在 `regenerate()` 跟随自定义非数字 branchId（`create-engine.ts:683-684`）时触发；`engine-branches.test.ts:24-127` 覆盖 mint/numeric-increment/explicit-pass-through/no-op/in-flight，删掉 fallback 测试仍绿。
- **R2-F3（前导零归一化无契约）**：`branching.ts:33` `parseInt(m[2], 10)` 使 host 传入 `branch-01` 前进为 `branch-2`（显示级格式漂移，数值语义正确）；`findPriorAssistantBranchId`（`:55-63`）不校验格式；A-16 文档未说明归一化约定。
- **门禁现状**：`check:ai-engine-invariants` exit 0 零命中；AI 包基线 **79 files / 678 tests 全绿**（0008-3 收口后，roadmap 2026-08-11 收口注记）。
- Bug note 编号：live 最高 **153**，新增编号 **154+**。
- 授权：全为 P2 backlog 既定修复，按 roadmap Rule 走 plan 生命周期；**不改变公共 API 签名**（R1-F3/R1-F4 为行为修正，R2-F3 为文档契约说明 + 行为测试，均无结构性重构）。

## Goals

- 6 条 P2 全部修复（test-first：每条先写 RED 回归测试 → 修复 → GREEN），强制类别清扫（修任一方法 grep 全部同类兄弟一并核对，清扫记录入档）。
- FIND-12：connector-missing 轮的用户消息进入持久化路径（autoSave 触发面扩展或等价修复），回归测试钉住「reload 后消息仍在」。
- R1-F2：`projectWireMessage` 嵌套写隔离收口（`tool_calls`/`content`/`reasoning_content`/`metadata` 嵌套值深隔离），回归测试钉住 plugin 穿透写不落 engine 历史；⑪ 门禁测试成员补强评估（如需要则落库，套件保持全绿）。
- R1-F3：无 storage + `initialConversations` 首会话 build-on-demand（与 K-⑥-3 storage 面同语义），回归测试钉住 `activeEngine` 非 null 且首会话消息可见。
- R1-F4：load 窗口内 delete 的会话不复活（merge 面补 deleted-during-load 过滤，镜像 `listClearedRef` 先例），回归测试钉住无幽灵列表项。
- FIND-22：branching fallback 分支补测试覆盖（引擎级：自定义非数字 branchId → 新 branch 落栈）。
- R2-F3：A-16 契约说明落 engine.md（前导零归一化 + 格式约定）+ 行为测试钉住 `branch-01` → `branch-2`。
- 收口：AI 包测试全绿零回归、`check:ai-engine-invariants` live 零命中、engine.md / invariant-catalog.md / gates.md（如门禁补强）/ bug notes / daily log 同步。

## Non-Goals

- 不处理 renderer/UI 族 P2（FIND-13/FIND-20 + R2-F1/R2-F2/R3-F1 + R1-F5）——已在 `docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md`。
- 不处理契约/文档族 P2（FIND-07/08/09/14/19/10/11/15/16/17/18）——已在 `docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md`。
- 不做结构性重构（不改公共 API 签名 / adapter 契约 / flux-runtime action-scope 语义）；不重写 autoSave 整体机制（仅补 connector-missing 触发面）；不裁决 P3/观察项。
- 不执行全量仓库验证（归 Closure Gates）。

## Scope

### In Scope

- `adapters/use-conversation-autosave.ts`（FIND-12 触发面）、`adapters/use-conversation.ts`（R1-F3 首会话 build-on-demand + R1-F4 merge 过滤面）。
- `engine/utils.ts`（R1-F2 `projectWireMessage` 嵌套隔离）、`engine/build-context.ts`（核对注释/契约，必要时同步）。
- `engine/branching.ts`（FIND-22/R2-F3 契约注释，行为不变）、`engine/__tests__/engine-branches.test.ts`（FIND-22/R2-F3 用例）。
- 测试：`adapters/__tests__/`（conversation-invariants*.test.ts 或 use-conversation-*.test.ts 新增/扩展）、`engine/__tests__/engine-invariants-p1.test.ts` 或 `plugins.test.ts`（R1-F2 ⑪ 写隔离成员）。
- 文档：`engine.md`（A-16 契约说明 + §Invariants 注记）、`invariant-catalog.md` / `gates.md`（如 R1-F2 门禁补强，棘轮单调）、bug notes 154+、daily log。

### Out Of Scope

- renderer 族 P2、契约/文档族 P2、P3/观察项、公共 API 重构、全量仓库验证。

## Failure Paths

| 场景                     | 触发                                                | 行为                                                                     | 可重试 | 用户可见表现                 |
| ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------ | ------ | ---------------------------- |
| connector-missing-loss   | connector 为 null 时发送消息 → reload               | 回归测试 RED；修复后用户消息进 storage，reload 后可见                    | 是     | 无静默丢消息                 |
| plugin-write-through     | plugin 对 `ctx.request.messages[i].tool_calls` push | 回归测试 RED；修复后 engine 历史与 wire payload 无穿透写                 | 是     | 无会话历史被 plugin 污染     |
| no-storage-first-session | 无 storage + initialConversations 首会话挂载        | 回归测试 RED；修复后 activeEngine 非 null、消息可见                      | 是     | 无「已激活会话却空态」       |
| delete-during-load       | load 窗口内 deleteConversation                      | 回归测试 RED；修复后无幽灵列表项/不复活为 active                         | 是     | 无已删会话复活               |
| branch-fallback          | regenerate 跟随自定义非数字 branchId                | 新增用例覆盖 fallback 分支（修复前 RED——测试不存在，补测试本身即 Proof） | 是     | 无（行为已正确，锁死防回归） |
| branch-format-drift      | host 传 `branch-01` 后 regenerate                   | 契约文档化 + 行为测试钉住归一化结果；A-16 说明前导零约定                 | 是     | 文档/契约 truthfulness       |

## Test Strategy

本档选择：必须自动化

engine/adapter 行为 + 不变式门禁即测试（roadmap Rule）；每条 P2 的 Proof（RED 回归测试）先于 Fix；FIND-22/R2-F3 为测试覆盖与契约文档化，测试先行锁定行为。R1-F2 若触发 ⑪ 门禁测试成员补强，附参数化成员（套件保持全绿，不落 `it.fails` 预期红——本轮为修复轮，修复后直接 `it` 全绿）。复杂并发 bug 按 guide 补 bug note（154+）。

## Execution Plan

### Phase 1 — autoSave connector-missing 修复（FIND-12）+ 类别清扫

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation-autosave.ts`、`src/adapters/__tests__/`、`src/adapters/__tests__/use-conversation-*.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（connector-missing 轮持久化）——connector 为 null（`create-engine.ts:209-231` 路径）发送用户消息 → 断言 autoSave 后 storage 保存了该用户消息（spy 断言 `saveMessages` 收到含该消息的快照）；修复前 RED
- [x] Proof: RED 回归测试（reload 侧）——同一场景 remount → 断言消息从 storage 恢复（不丢）；修复前 RED
- [x] Fix: autoSave 触发面扩展——connector-missing 轮（idle→error、消息已 push）纳入保存面。检测机制需显式化：`attachAutoSave` 只订阅 `requestState` 通道且 `prevState` 于订阅时播种（`use-conversation-autosave.ts:38`），需在订阅内维护 per-conversation 消息数水位线（如订阅回调对比 `engine.getMessages().length` 与上次终态快照）判定「error 前收到过用户消息」，或等价可判定机制；与 K-⑩-3 空残留剥离谓词组合，不持久化 vacuous 残留
- [x] Fix: 类别清扫——autoSave 全部"轮次终态"核对：completed / aborted / error（含 connector-missing / stream-error / tool-no-executor / plugin-throw 四失败分支）是否均有对应持久化或显式排除语义；清扫记录入档
- [x] Proof: 既有 autoSave 测试零回归（`conversation-invariants-i4.test.ts` K-⑩-3 持久化臂 + autoSave 相关用例保持绿）

Exit Criteria:

- [x] FIND-12 两条 RED 测试全部转 GREEN（connector-missing 轮消息持久化 + reload 恢复）
- [x] 既有 autoSave / K-⑩-3 持久化臂测试零回归
- [x] 类别清扫记录入档（autoSave 轮次终态核对结论）

### Phase 2 — plugin ctx 嵌套写隔离（R1-F2）+ ⑪ 门禁评估

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/utils.ts`、`src/engine/build-context.ts`、`src/engine/__tests__/engine-invariants-p1.test.ts`、`src/engine/__tests__/plugins.test.ts`

- Item Types: `Fix | Proof | Decision`

- [x] Proof: RED 回归测试（嵌套穿透写）——plugin 在 `onBeforeRequest`/`onTurnStart` 中对 `ctx.request.messages[i].tool_calls`（或 `content` 部件）`push`/mutate → 断言 engine `getMessages()` 历史与 request payload **无**该写入（深比较）；修复前 RED
- [x] Proof: RED 回归测试（metadata 嵌套值面）——plugin mutate `ctx.request.messages[i].metadata.x` 嵌套对象 → 断言不落 engine 历史；修复前 RED
- [x] Fix: `projectWireMessage` 嵌套隔离——`tool_calls`/`content`/`reasoning_content` 数组及元素深拷贝（结构化克隆或逐元素复制，`cloneMessages` 先例对齐），`metadata` 嵌套值同样隔离；wire payload 与 engine 历史彻底断引用
- [x] Decision: ⑪ 门禁测试成员评估——⑪ 写隔离族（open P1-1 修复面 + 本面嵌套深度）是否需新增参数化测试成员（若现有 ⑪ 成员已覆盖嵌套面则记录结论不入新成员；否则补成员，套件全绿）；结论入档 gates.md/catalog
- [x] Fix: `types.ts:277-287` 注释面修正（"never write through" 过度承诺 → 如实描述隔离深度）——如归属 Plan 3 文档面则与本 Phase 协调（见 Plan 3 相关注记）
- [x] Fix: 类别清扫——全部"engine → 外部 payload"投射面核对：`projectWireMessage`（本面）/ `sanitizeDanglingToolCalls` / buildContext 其余组装面是否同样存在引用泄漏；清扫记录入档

Exit Criteria:

- [x] R1-F2 两条 RED 测试全部转 GREEN（tool_calls/content 穿透写 + metadata 嵌套值面）
- [x] ⑪ 门禁评估结论入档（补成员则 `check:ai-engine-invariants` 仍 exit 0 零命中）
- [x] 类别清扫记录入档（engine → payload 投射面核对结论）

### Phase 3 — no-storage 首会话 build-on-demand（R1-F3）+ 类别清扫

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（no-storage 首会话）——无 storage + `initialConversations`（含首会话）挂载 → 断言 `activeConversationId` 指向首会话且 `activeEngine` 非 null（`UseConversationReturn` 面）；修复前 RED
- [x] Proof: RED 回归测试（消息可见面）——同场景断言首会话可发消息/读消息（engine 已建且绑定）；修复前 RED
- [x] Fix: 无 storage 路径 build-on-demand——mount 时若 `initialConversations` 非空且无 activeEngine，为 `initialConversations[0]` 建 engine 并 setActiveEngine（与 K-⑥-3 `ensureEngineAndHydrateEvent` 同语义，无 storage 则跳过 hydrate）
- [x] Fix: 类别清扫——adapter 全部"activeId 指向但 engine 缺失"面核对：storage bootstrap（K-⑥-3 已修）/ no-storage 首会话（本面）/ switchConversation 已建面 / delete 后 next 面；清扫记录入档
- [x] Proof: 既有 K-⑥-3 storage bootstrap 测试零回归（`conversation-invariants-cycle2.test.ts` ⑥ 成员保持绿）

Exit Criteria:

- [x] R1-F3 两条 RED 测试全部转 GREEN（activeEngine 非 null + 消息可见）
- [x] 既有 K-⑥-3 storage 面测试零回归
- [x] 类别清扫记录入档（activeId→engine 缺失面核对结论）

### Phase 4 — delete-during-load 幽灵修复（R1-F4）+ 类别清扫

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/conversation-invariants*.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（delete-during-load 幽灵）——load 窗口内 `deleteConversation(A)` → bootstrap resolve → 断言 A 不在列表（无幽灵项）；修复前 RED
- [x] Proof: RED 回归测试（唯一会话臂）——load 窗口内 delete 唯一会话 A → resolve 后断言 A 不复活为 active；修复前 RED
- [x] Fix: merge 面补 deleted-during-load 过滤——load 窗口内记录的已删 id 集合（镜像 `listClearedRef` 先例，如 `deletedDuringLoadRef`），merge 时从 `convs` 基中过滤；与 K-⑦ clearAll 守卫语义并列
- [x] Fix: 类别清扫——bootstrap merge 全部"并发列表变更"面核对：create-during-load（K-⑦ 已合并保留）/ clearAll-during-load（listClearedRef）/ delete-during-load（本面）/ rename-during-load（核对，若属同类漏网则一并修）；清扫记录入档
- [x] Proof: 既有 K-⑦ 相关测试零回归（`conversation-invariants-cycle2.test.ts` ⑦ 成员 + clearAll-during-load 用例保持绿）

Exit Criteria:

- [x] R1-F4 两条 RED 测试全部转 GREEN（无幽灵项 + 不复活为 active）
- [x] 既有 K-⑦ clearAll-during-load 测试零回归
- [x] 类别清扫记录入档（bootstrap merge 并发变更面核对结论）

### Phase 5 — branching 测试覆盖与契约说明（FIND-22 / R2-F3）+ 收口

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/__tests__/engine-branches.test.ts`、`src/engine/branching.ts`、`docs/components/flux-renderers-ai/engine.md`、`docs/bugs/`、`docs/logs/2026/08-11.md`

- Item Types: `Fix | Proof | Follow-up`

- [x] Proof: FIND-22 用例——自定义非数字 branchId（`branch-abc`）→ `regenerate()` → 断言 fallback 分支 mint 新 `branch-<n>`（先补测试锁定行为；若断言与 live 不符则记录实际行为并裁定，按 live 修正测试而非改行为）
- [x] Proof: R2-F3 用例——host 传 `branch-01` → regenerate → 断言前进为 `branch-2`（锁死 parseInt 归一化行为）
- [x] Proof: R2-F3 用例——`findPriorAssistantBranchId` 非数字格式 branchId（`branch-abc`）行为断言（锁定现状，验证不校验格式的语义；契约文档说明此面）
- [x] Fix: `branching.ts` 注释/A-16 契约说明——engine.md §A-16（或 engine.md 对应节）写明：branch id 尾部数字解析规则（`parseInt` 归一化：`branch-01` → `branch-2`）、无数字后缀时的 fallback mint 语义、`findPriorAssistantBranchId` 不校验格式的约定
- [x] Fix: bug notes 154+（FIND-12 + R1-F2/R1-F3/R1-F4 族，按 guide：触发/根因/修复/类别清扫范围/回归测试；FIND-22/R2-F3 契约说明可并入或单开，按 guide 裁定）
- [x] Proof: AI 包 focused 测试复跑（本 plan 涉及测试文件：conversation-invariants*.test.ts / engine-invariants-p1.test.ts / engine-branches.test.ts / use-conversation-*.test.ts）+ `check:ai-engine-invariants` live 复跑 exit 0
- [x] Fix: daily log `docs/logs/2026/08-11.md` 记录本 plan 收口（plan 级 closure 义务，非 Follow-up）

Exit Criteria:

- [x] FIND-22 / R2-F3 用例全部落地且行为断言与 live 一致
- [x] engine.md A-16 契约说明同步到位（前导零归一化 + fallback + 不校验格式约定）
- [x] bug notes 154+ 与 daily log 收口记录落档；`check:ai-engine-invariants` exit 0

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session `ses_012cd8ec4ffe9OdH37zKIHSUaa`）
- Verdict: `pass-with-minors`（达成共识：零 Blocker / 零 Major）
- Rounds: 1
- Findings addressed:
  - Minor-1（Phase 5 Proof 与 Closure Gates 全量验证重复，Rule 18 口径）→ 已改为 AI 包 focused 复跑
  - Minor-2（FIND-12 触发机制未显式化——`attachAutoSave` 仅订阅 requestState 通道，需消息数水位线判定「error 前收到过用户消息」）→ 已补检测机制设计
  - Minor-3（daily log 项误标 `Follow-up`，实为 plan 级 closure 义务）→ 已改 `Fix`

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 6 条 P2（FIND-12 / R1-F2 / R1-F3 / R1-F4 / FIND-22 / R2-F3）全部修复落地（test-first RED→GREEN 证据在案；FIND-22/R2-F3 为测试覆盖 + 契约文档化）
- [x] R1-F2 ⑪ 门禁评估结论入档（补成员或记录不补理由），`check:ai-engine-invariants` live 零命中
- [x] 类别清扫记录入档（autoSave 轮次终态 / engine→payload 投射面 / activeId→engine 缺失面 / bootstrap merge 并发变更面）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（engine.md / invariant-catalog.md / gates.md / bug notes / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### renderer/UI 族 + 契约/文档族 P2 全量（17 条）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分属不同结果面（renderer 交互 / 契约文档 truthfulness），已分别路由 `docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md` 与 `docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md`，不阻塞本 plan 的 6 条 engine/adapter P2 收口
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md`、`docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md`（同一起草轮三 plan 并行路由）

### FIND-21（ai-bubble-hitl.test.tsx 模块级 `let captured`）

- Classification: `watch-only residual`（已修复核销）
- Why Not Blocking Closure: 已在 plan `docs/plans/2026-08-11-0008-1-renderer-contract-wiring-onapproval-and-projection-remediation.md` Phase 1 重写该文件时顺带修复（afterEach 重置按 `ai-chat-projection.test.tsx:83-88` 正确模式），本 plan 不重复处理
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-2245 双审计 P2 填充节，本 plan 收口时同步回写路由收口注记）。
- P3/观察项（R1-F5 完整实例隔离方案、host 输入归一化统一入口等）保持在源审计记录中，不派生工作项。

## Closure

Status Note: 6 条 engine/adapter 族 P2 全部修复落地（FIND-12 autoSave 触发面扩展 + R1-F2 ⑪ 嵌套写隔离 + R1-F3 no-storage 首会话 build-on-demand + R1-F4 delete-during-load merge 过滤 + FIND-22/R2-F3 branching 契约文档化与行为测试）；test-first RED→GREEN ×12 在案；⑪ 门禁补嵌套成员 3（gates.md/catalog 入档）；类别清扫 4 族入档（autoSave 轮次终态 / engine→payload 投射面 / activeId→engine 缺失面 / bootstrap merge 并发变更面）；bug notes 154-158 落档；AI 包 80 files/690 tests 全绿 + `check:ai-engine-invariants` exit 0 零命中 + 全仓 typecheck/build/lint 37/37 + `pnpm test` 66/66 tasks 全绿 + `pnpm check` 零新增命中（既有登记红不变）；roadmap 6 条 work item ✅ done + 收口注记；daily log 收口记录。renderer/UI 族 + 契约/文档族 17 条 P2 分别由 plan `2026-08-11-0335-2`/`0335-3` 独立 closure surface 跟踪（Deferred But Adjudicated，out-of-scope improvement，successor 已命名）。执行中顺带治理：`use-conversation.ts` 增行触发 `check:oversized-code-files` 硬门禁 → 抽取 `use-conversation-bootstrap.ts`（`hydrateConversationsFromStorage` 纯函数 helper）回落 699 行（<700），check 零新增命中。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session `ses_012a906afffeowqwtEmlz5mwiv`）
- Evidence: verdict `issues`（1 条文本 truthfulness：daily log / roadmap 注记在审计前过早断言「Closure Gates 全 [x] / Plan Status → completed」→ 按 D3.2 披露先例修订为待审计口径后通过）；G1-G10 代码/测试/文档/清扫全 PASS——5 Phase 状态与 checklist 一致、closure-audit 门禁未被执行 session 自勾、live 源码抽查 6 修复面全在、focused 测试独立复跑 80 files/690 全绿 + `check:ai-engine-invariants` exit 0 + `check:oversized-code-files` exit 0、deferred 诚实性 PASS、owner docs 同步 PASS、零 src 构建产物；审计通过后本执行 session 完成最终化（plan 状态翻 completed + 门禁勾选 + Closure 节回填）。

Follow-up:

- 无剩余 plan-owned work（6 条 P2 全部闭环；renderer/UI 族 + 契约/文档族 P2 由 `docs/plans/2026-08-11-0335-2-renderer-ui-p2-remediation-2245.md` 与 `docs/plans/2026-08-11-0335-3-ai-contract-doc-truthfulness-remediation-2245.md` 独立跟踪）。
