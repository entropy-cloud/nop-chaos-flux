# 2 Cycle 2 / I4 — 修复执行（实例 + 类别清扫 + 门禁补强）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Cycle 2 / I4. 修复执行（实例 + 类别清扫 + 测试）
> Last Reviewed: 2026-08-10
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 2 / I4 + Phase Details I4 + Loop Rule）、`docs/audits/ai-invariants/cycle2-findings.md`（13 条 K finding + 注册红）、`docs/audits/ai-invariants/cycle2-adjudication.md`（I3 裁决输入，依赖前置——**未收口则本 plan 不得开工**）
> Related: `docs/plans/2026-08-10-0925-1-cycle2-i3-adjudication.md`（前置依赖：13 条 K 的 P0/P1 裁决 + 门禁补强要求契约 + 注册红清零契约）、`docs/plans/2026-08-10-0925-3-cycle2-i5-verification.md`（后继依赖）

## Purpose

修复 Cycle 2 / I2 发现、I3 裁决为 P0/P1 的 **13 条 K finding**（engine 6 条：K-⑩×5 + K-⑨×1；adapter 7 条：K-⑥×3 + K-⑦×1 + K-K4/②×2 + K-K3/④×1），**清零 4 个注册红**（⑥×3 + ⑧×1），**强制类别清扫**（修任一实例必 grep 全部同类兄弟方法一并核对），并按 I3 裁决表要求**补强不变式门禁 ⑥⑦⑨⑩②④**（`it.fails` 翻转 + 参数化测试 + 扫描器规则 + committed 回归）防同族复发；同步 invariant-catalog / gates.md / engine.md。收口状态：13 条 K 全部修复（test-first 先红后绿）、注册红清零（`check:ai-engine-invariants` 零命中）、门禁扩展落地、AI 包测试全绿。

## Current Baseline

（live repo 核对，2026-08-10；依赖 I3 先收口）

- I3 裁决表（`docs/audits/ai-invariants/cycle2-adjudication.md`）为前置；未收口则本 plan 不得开工。预期裁决：13 条 K = P0/P1 → 本 plan（storage 幽灵面 K-K4/②-1、K-K3/④-1 与 K-⑩-4 数据丢失形态预期 P0，其余 P1）；N = 零；watch-only 8 条维持。
- **13 条 K finding 的 live 位置与机制**（findings §3.1 已核对）：
  - **K-⑩-1** — `create-engine.ts:432-483` chunk 循环 `:456-458` `!firstChunkReceived → loading=false` + `:469` commitAssistant 提交空 placeholder + `:471-482` aborted 终态 → 下一请求历史携带 `{role:'assistant', content:''}`（`buildContext` `:511` 只排除 `loading===true` 尾消息）。
  - **K-⑩-2** — `create-engine.ts:407-410` `await plugin.onBeforeRequest` 在 runOnce try 之外（`:401-405` placeholder 已 push）→ rejection 冒泡 runTurn catch，placeholder 永不 commit → `loading:true` 幽灵。
  - **K-⑩-3** — `create-engine.ts:484-486` runOnce catch commit 空残留 × `use-conversation.ts:190` autoSave `isDone` 含 'error' + `:202-209` saveMessages 落盘 → 残留跨会话存活。
  - **K-⑩-4** — `create-engine.ts:593-596` regenerate 截断旧 turn × `:484-486` catch 空残留 commit → 原回答销毁 + 空残留（数据丢失形态）。
  - **K-⑩-5** — `create-engine.ts:456-458` + `:325-335` connector 零 chunk「completed」轮 → 空 assistant 残留。
  - **K-⑥-1** — `use-conversation.ts:427-475` clearAll 不写 `conversationsRef` × `:280-313` createConversation 同步 prepend 镜像 × `:382-388` deleteConversation fixup 读镜像 → 同 tick clearAll+create+delete 幽灵 activeId fixup。
  - **K-⑥-2** — `use-conversation.ts:316` switch `conversations.some` 闭包 exists 检查 × `:370-404` delete 同 tick 不 bump `switchVersionRef` → switch 提升已删除目标。
  - **K-⑥-3** — `use-conversation.ts:242-246` bootstrap `setActiveId(current ?? convs[0].id)` 不 build/promote 引擎 → active 无引擎（存储消息首次手动 switch 前不可见）。
  - **K-⑦-1** — `use-conversation.ts:242-246` bootstrap `setConversations(convs)` 整体覆盖 × clearAll（`:444`）→ 迟到 resolve 复活已清列表。
  - **K-K4/②-1** — `use-conversation.ts:370-404` deleteConversation 不同步写 `conversationsRef` × `:406-425` renameConversation 读镜像 + saveConversation → 同 tick delete+rename storage 幽灵重存。
  - **K-K4/②-2** — `use-conversation.ts:422-424` rename saveConversation fire-and-forget × `:427-475` clearAll 不同步写 `conversationsRef` → 同 tick rename+clearAll storage 元数据幽灵。
  - **K-K3/④-1** — `use-conversation.ts:309-311` create saveConversation fire-and-forget（不入排空链）vs `:452-455` clearAll drain 只排 `pendingSavesRef` saveMessages 链 → 同 tick create+clearAll storage 幽灵会话。
  - **K-⑨-1** — `create-engine.ts:362-364` finally `await plugin.onTurnEnd` 无守卫 → aborted 轮 onTurnEnd rejection reject host-facing promise（`void engine.sendMessage()` = unhandled rejection）。
- **注册红（gates.md，I4 必清零）**：⑥×3（`use-conversation.ts:280` createConversation / `:370` deleteConversation / `:427` clearAll 不 bump `switchVersionRef`）+ ⑧×1（`create-engine.ts:228` connector-missing 早退遗留 `pendingBranchId`）。
- **门禁基建现状（Cycle 2 / I1 落地）**：`conversation-invariants-cycle2.test.ts`（第二批门禁 ⑥⑦ 两族：⑥×5 `it.fails` + ⑦×2 `it.fails` = 7 处）+ `engine-invariants.test.ts`（⑧泄漏 1 + ⑨×3 + ⑩×1 = 5 处 `it.fails`）——**共 12 个 `it.fails` 预期失败**（⑥×5 + ⑦×2 + ⑧×1 + ⑨×3 + ⑩×1），I4 修复后逐条翻转 `it`；静态扫描器 `scanDisplacementVersionBumps`（⑥）+ `scanBranchStampReset`（⑧）注册红 4 命中；committed 回归 `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`（9 用例）。
- 既有回归（保留不动，新测试在其上增量）：`engine-concurrency.test.ts`、`use-conversation-{switch,delete-during-abort,clear-all,storage,create}.test.ts`、`engine.test.ts` 等；AI 包基线 **67 files / 544 passed + 12 expected fail**。
- 类别清扫先例：Cycle 1 I4 清扫总表（A 终态写入守卫 / B generator 消费 / C storage 调用点 / D 列表闭包读取四族，bug notes 121-124）。
- Bug note 编号：live 最高 **124**，新增编号 **125+**，按 `docs/bugs/00-bug-fix-note-writing-guide.md` 写（触发/诊断/根因/修复/测试保护）。
- 授权：engine/adapter P0/P1 修复预授权自动（mission description）；**不改变公共 API 契约**（`MessageEngine`/`UseConversationReturn` 签名不变）→ 不触发「结构性重构人工确认」门。

## Goals

- 13 条 K finding 修复全部落地：test-first（每条先写 RED 回归测试 → 修复 → GREEN），类别清扫强制（每族修复时 grep 全部同类兄弟方法一并核对/修改，清扫记录入档）。
- 注册红清零：⑥×3（create/delete/clearAll bump `switchVersionRef`）+ ⑧×1（connector-missing 早退清 `pendingBranchId`）→ `check:ai-engine-invariants` live 零命中。
- 门禁补强（按 I3 契约）：
  - ⑩ → 扩展至 aborted 轮 / hook 拒绝幽灵 / autoSave 持久化臂 / regenerate 臂 / 零 chunk 成功轮成员（参数化测试翻转）；
  - ⑥ → 扩展至同 tick 组合成员（幽灵 fixup / 提升已删目标）+ bootstrap build-on-demand 成员（参数化测试翻转 + 扫描器 bump 规则保持）；
  - ⑦ → 扩展至 clearAll 成员（bootstrap 在途 × clearAll 复活）；
  - ② → 扩展至 delete/clearAll 镜像**写面**（`conversationsRef` 同步维护）；
  - ④ → 扩展至 create 元数据写（saveConversation 入排空链）；
  - ⑨ → 扩展至 abort 变体（onTurnEnd rejection 不 reject host-facing promise）。
- `it.fails` 12 处全部翻转 `it`（⑥×5 + ⑦×2 + ⑧×1 + ⑨×3 + ⑩×1）+ 新增成员参数化用例，套件保持全绿。
- 门禁登记处同步：`invariant-catalog.md`（§10 Cycle 2 / I4 扩展契约）、`gates.md`（清单更新 + 注册红清零）、`engine.md` §Invariants（Failure Path 已知违背面更新为已修复）。
- Bug note 125+ 补齐（13 条 K finding 按族合并，按 guide：触发/根因/修复/类别清扫范围/回归测试）。
- 收口：AI 包测试全绿零回归、`check:ai-engine-invariants`（扩展后）live 零命中、类别清扫记录入档、watch-only W-E/W-⑨-b 附带评估结论回写。

## Non-Goals

- 不裁决优先级（I3 已裁决）；不执行全量仓库验证（I5）。
- 不处理 watch-only 8 条（W-E/W-⑨-b 为「附带评估」——随 K-⑩-1/K-⑥-3 修复面核对后回写结论，不作独立修复承诺）。
- 不改公共 API / adapter 契约签名（结构性重构需人工确认，本 plan 不触发）。
- 不做 Cycle 3+ 候选族（tool-execution / streaming backpressure 保持登记，findings §5 未触发）。

## Scope

### In Scope

- 13 条 K finding 修复（`create-engine.ts` + `use-conversation.ts`）+ 各自 RED→GREEN 回归测试 + 类别清扫。
- 注册红清零（⑥×3 bump + ⑧×1 戳清除）+ 门禁 ⑥⑦⑨⑩②④ 扩展（invariants 测试文件 + 扫描器规则（如适用）+ committed 回归用例追加）。
- 登记处同步（catalog §10 / gates.md / engine.md）+ bug notes 125+ + W-E/W-⑨-b 附带评估回写 + daily log。

### Out Of Scope

- 全量仓库验证（I5）、Cycle 3 派生（I6-Cycle2 判定）、watch-only 修复。

## Failure Paths

| 场景            | 触发                                              | 行为                                                    | 可重试 | 用户可见表现              |
| --------------- | ------------------------------------------------- | ------------------------------------------------------- | ------ | ------------------------- |
| gate-flip-red   | `it.fails` 翻转后新用例断言失败                   | 断言红（先红后绿证据，预期）                            | 是     | AI 包测试红，证明门禁能抓 |
| scanner-hit     | 修复后代码仍违背静态可检不变式（⑥⑧）              | `check:ai-engine-invariants` exit 1，输出违规 `文件:行` | 是     | `pnpm check` 红           |
| regression-red  | 修复破坏了既有行为                                | 既有套件红                                              | 是     | AI 包测试红               |
| sweep-miss      | 类别清扫遗漏兄弟实例（closure audit 抽查发现）    | closure-audit 拒绝，plan 退回执行补扫                   | 是     | 无（内部流程门）          |
| unexpected-pass | 修复前任一 `it.fails` 反转为 pass（代码提前修复） | 记录异常（修复未落地但翻转），按归属路由 I3 复核        | 是     | 测试红                    |

## Test Strategy

本档选择：必须自动化

不变式门禁本身即测试（roadmap Rule）；13 条 K 每项 Proof（RED）先于 Fix（test-first），门禁扩展附 PROOF 用例（注入违背 → 红）。复杂并发 bug 按 guide 补 bug note（125+）。

## Execution Plan

### Phase 1 — K-⑩ 失败轮产物清理（engine，5 条）

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/engine/__tests__/engine-invariants.test.ts`、`src/adapters/use-conversation.ts`（K-⑩-3 autoSave 臂）、`src/adapters/__tests__/conversation-invariants.test.ts`（autoSave 臂门禁成员，见下）

- Item Types: `Fix | Proof | Decision`

- [x] Proof: RED 回归测试（K-⑩-1 abort-before-first-chunk 场景）——`abort()` 于首 chunk 前 → 轮次 aborted 后，断言下一 `sendMessage` 的请求历史**不含**空 assistant（`requests[n].messages` 尾部无 `{content:'', loading:false}`）；修复前 RED
- [x] Proof: RED 回归测试（K-⑩-2 onBeforeRequest rejection 场景）——plugin `onBeforeRequest` reject → 断言消息列表**无** `loading:true` 幽灵 placeholder（残留被清理或显式标记失败）；修复前 RED
- [x] Proof: RED 回归测试（K-⑩-3 autoSave 持久化臂场景，mock storage）——失败轮空残留 → 断言 `savedMessages[A]` **不含**空 assistant（autoSave 快照排除失败轮残留）；修复前 RED
- [x] Proof: RED 回归测试（K-⑩-4 regenerate×connector-throw 场景）——regenerate 后 connector-throw → 断言（a）旧回答销毁后**有**替代产物或轮次失败不产生空残留（messages 尾部无 `content:''` 空 assistant）；（b）host 可见错误状态；修复前 RED
- [x] Proof: RED 回归测试（K-⑩-5 零 chunk completed 轮场景）——connector 零 chunk 正常 settle → 断言下一请求历史**不含**空 assistant（空响应轮不产空残留）；修复前 RED
- [x] Fix: K-⑩ 族——统一「失败/中止/退化轮产物清理」策略（Design 裁定：**空产物（`content:''` + 无 finishReason）的 assistant 消息不得进入请求历史与 autoSave 快照**——在 commitAssistant/终态 mutate 层拦截或 buildContext 排除谓词扩展为「尾部空 assistant（非 loading 且 content 为空）」；同时确保失败轮清空/不提交自己的 placeholder）；按 probe 场景逐条验证
- [x] Fix: K-⑩-2——`onBeforeRequest` 纳入 try/finally 清理面（或 rejection 时移除/标记 placeholder），不产生 loading 幽灵
- [x] Fix: K-⑩-3——autoSave 快照与 buildContext 同源排除失败轮残留（`use-conversation.ts:202-209` saveMessages 侧或 engine.getMessages 侧收敛）
- [x] Fix: K-⑩-4——regenerate 失败路径不得残留空 assistant（与 ⑩-1 清理策略同源）
- [x] Fix: K-⑩-5——退化成功轮（零 chunk）同样走清理策略
- [x] Fix: 门禁 ⑩ 扩展——`engine-invariants.test.ts` 参数化表新增 5 成员（abort-before-first-chunk / onBeforeRequest 幽灵 / autoSave 持久化臂（conversation-invariants 侧）/ regenerate 臂 / 零 chunk 成功轮）；既有 ⑩ `it.fails` 1 处翻转 `it`（如清理策略改变排除谓词，同步更新测试形态）；扫描器不扩展（行为面，沿用不静态化裁定）
- [x] Decision: 记录「空产物不得进入历史与持久化」统一谓词裁定（供 Phase 5 写入 engine.md Failure Path）
- [x] Fix: 类别清扫——engine 全部「产物提交/排除」路径核对（commitAssistant 调用点 / buildContext 排除谓词 / getMessages 快照 / autoSave 臂），清扫记录入档

Exit Criteria:

- [x] K-⑩ 5 条 RED 测试全部转 GREEN（probe A/B/P3/P4/P6 场景断言全绿——K-⑩-2 对应 probe B）
- [x] 门禁 ⑩ 扩展覆盖 5 新成员 + 既有 ⑩ it.fails 翻转，live 零命中
- [x] 类别清扫记录入档（engine 全部产物提交/排除路径核对结论）

### Phase 2 — K-⑥ active 位移完整性（adapter，3 条）+ 注册红 ⑥×3 清零

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/conversation-invariants-cycle2.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（K-⑥-1 同 tick clearAll+create+delete 场景）——同 tick 三连后断言 `activeConversationId` **不是**已清会话幽灵（列表为空时 activeId 必为 null / 或 fixup 读到的镜像为最新）；修复前 RED
- [x] Proof: RED 回归测试（K-⑥-2 同 tick delete+switch 场景）——delete 后 switch 已删目标 → 断言**不**提升已删会话（activeId 不在列表时为 null 或保持 delete 后 fixup 结果）；修复前 RED
- [x] Proof: RED 回归测试（K-⑥-3 bootstrap 选中 active 场景，mock storage）——storage 首挂载 → 断言 `activeEngine` **非 null** 且默认会话的**存储消息渲染可见**（bootstrap 选中 active 即 build-on-demand 建引擎 + 加载存储消息，无需手动 switch 即可见）；修复前 RED
- [x] Fix: K-⑥ 族——① create/delete/clearAll 全部 bump `switchVersionRef`（**注册红 ⑥×3 清零**）；② **deleteConversation 与 clearAll 全部同步写 `conversationsRef`**（镜像写面补齐——clearAll 置 `conversationsRef.current = []`、delete 过滤同步，fixup 读最新镜像，K-⑥-1 幽灵根因；与 Phase 3 K-K4/② 共享写面契约，Phase 2 先行落地、Phase 3 以门禁断言固化）；③ **switchConversation 入口 exists 检查（:316 `conversations.some`）改读 `conversationsRef.current` 并保留「目标仍存在」校验（K-⑥-2，守卫须早于 `setActiveId(id)` 生效——仅提升路径校验不足以阻止入口处 activeId 复活 + 新引擎入 cache）**；④ bootstrap `setActiveId` 后为选中 active build-on-demand 建引擎**并加载其存储消息**（K-⑥-3，镜像 `switchConversation` 的 `loadMessages` + version guard 语义——只建引擎不加载则存储消息仍不可见）
- [x] Fix: 门禁 ⑥ 扩展——`conversation-invariants-cycle2.test.ts` 参数化表新增同 tick 组合成员（clearAll+create+delete 幽灵 / delete+switch 提升已删目标）+ bootstrap build-on-demand 成员；⑥×5 `it.fails` 全部翻转 `it`；扫描器 `scanDisplacementVersionBumps` 保持（bump 后 live 零命中）
- [x] Fix: 类别清扫——全部位移方法（create/delete/clearAll/switch）的 version bump + 镜像写面 + build-on-demand 语义核对（findings §3.1 镜像写面注记：delete/clearAll 缺镜像写——与 Phase 3 K-K4/② 共享写面契约），清扫记录入档

Exit Criteria:

- [x] K-⑥ 3 条 RED 测试全部转 GREEN；注册红 ⑥×3 清零（`check:ai-engine-invariants` ⑥ 规则零命中）
- [x] 门禁 ⑥ 扩展覆盖新成员 + ⑥×5 it.fails 翻转，live 零命中
- [x] 类别清扫记录入档（adapter 位移方法版本/镜像语义核对结论）

### Phase 3 — K-⑦ + K-K4/② + K-K3/④（adapter storage 时序与镜像写面，4 条）

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/conversation-invariants-cycle2.test.ts`、`src/adapters/__tests__/conversation-invariants.test.ts`、`scripts/audit/find-ai-engine-invariant-violations.mjs`（② 扫描器规则扩展评估）

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（K-⑦-1 bootstrap×clearAll 场景，mock storage 可控 resolve 顺序）——`loadConversations` 在途时 `clearAll()` → 迟到 resolve 后断言 `conversations.length === 0`（已清列表不复活）；修复前 RED
- [x] Proof: RED 回归测试（K-K4/②-1 delete+rename 场景，**双序**）——同 tick `deleteConversation(X)` + `renameConversation(X,'T2')`（delete-first 与 rename-first 两序）→ 断言 storage **无** X 幽灵重存（`storage[X]` 不存在）；修复前 RED
- [x] Proof: RED 回归测试（K-K4/②-2 rename+clearAll 场景，**双序**）——同 tick `renameConversation('A','T2')` + `clearAll()`（rename-first 与 clearAll-first 两序；rename-first 为 findings P1 复现形态——gated saveConversation 晚于 storage.clearAll resolve 落盘）→ 断言 storage **无** `{A: title:'T2'}` 元数据幽灵；修复前 RED
- [x] Proof: RED 回归测试（K-K3/④-1 create+clearAll 场景）——同 tick `createConversation(X)` + `clearAll()` → 断言 storage **无** X 幽灵会话（X 元数据不入排空链 → 修复后排空链覆盖元数据写）；修复前 RED
- [x] Fix: K-⑦-1——bootstrap post-await `setConversations` 改 functional merge 且带「列表已被 clearAll 清空」守卫（与 Cycle 2 / I1 ⑦ 契约一致：不得覆盖加载期间状态；clearAll 成员：若 clearAll 已发生则不恢复列表）
- [x] Fix: K-K4/②-1 + K-K4/②-2——delete/clearAll 同步写 `conversationsRef`（镜像写面补齐，Phase 2 fix ② 已先行；K4/§7.4 写面从 create/rename 扩展至全部列表变更方法）；rename 的 `saveConversation` 不得重存已删会话——**settlement-time 再校验 + 排空链覆盖双管齐下**：rename 写入时校验镜像目标仍存在（防 rename-first × clearAll/delete 后目标已消失仍落盘），且 rename 的 `saveConversation` 链入 `pendingSavesRef` 排空链（防 gated 写入晚于 storage.clearAll resolve 的「rename-first」顺序幽灵——rename 先触发、clearAll 排空必须覆盖该在途写；K-K4/②-1 的 rename-first × delete 同型）
- [x] Fix: K-K3/④-1——create 的 `saveConversation` 元数据写链入 `pendingSavesRef` 排空链（或等价的时序守卫：clearAll/delete 排空覆盖元数据写），与 K3/§7.3 排空链契约对齐（create 元数据写从「不入链」改为「入链」）；**rename 的 `saveConversation` 同样入链**（与 K-K4/②-2 共享排空契约，避免只修 create 漏 rename 的兄弟盲区）
- [x] Fix: 门禁 ⑦/②/④ 扩展——⑦：`conversation-invariants-cycle2.test.ts` clearAll 成员新增 + ⑦×2 `it.fails` 翻转；②：`conversation-invariants.test.ts` 镜像写面成员新增（delete/clearAll 同步镜像断言）+ 扫描器 `scanAdapterSyncClosureReads` 写面规则评估（镜像写缺失静态可检性——**评估落地：新增 `scanMirrorWriteSurface` 规则**）；④：`conversation-invariants.test.ts` 排空成员新增——**create 与 rename 两个元数据写臂**（同 tick create+clearAll / rename+clearAll 均无幽灵）；committed 回归 fixture 追加
- [x] Fix: 类别清扫——adapter 全部列表变更方法（create/rename/delete/clearAll）镜像写面 + 全部 storage 写调用点（saveConversation×2 / saveMessages / delete / clearAll）排空语义核对（与 Phase 1/2 清扫记录互核），清扫记录入档

Exit Criteria:

- [x] K-⑦-1 / K-K4/②-1 / K-K4/②-2 / K-K3/④-1 四条 RED 测试全部转 GREEN（storage 终态断言全绿，K-K4/②-1 与 K-K4/②-2 双序覆盖）
- [x] 门禁 ⑦/②/④ 扩展覆盖新成员（含 create 与 rename 两个元数据排空臂）+ ⑦×2 it.fails 翻转，live 零命中
- [x] 类别清扫记录入档（adapter 镜像写面 + storage 排空全部调用点核对结论）

### Phase 4 — K-⑨-1 plugin 错误隔离 abort 变体 + 注册红 ⑧ 清零（engine）

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/engine/__tests__/engine-invariants.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（K-⑨-1 abort 变体场景）——aborted 轮 + plugin `onTurnEnd` reject → 断言 host-facing `sendMessage` promise **不 reject**（终态正确落 'aborted'，onTurnEnd rejection 被隔离：落 `lastError` 或静默记录，不遮蔽 aborted 终态、不产生 unhandled rejection）；修复前 RED
- [x] Fix: K-⑨-1——finally 内 `await plugin.onTurnEnd` 加 abort 变体守卫（aborted 轮 onTurnEnd rejection 不 reject host-facing promise；错误经隔离路径记录）；对齐 ⑨ 契约「onTurnEnd rejection 不得遮蔽原错误」
- [x] Fix: 注册红 ⑧ 清零——connector-missing 早退路径（`create-engine.ts:210-229`）在 return 前清 `pendingBranchId`（戳不得泄漏到下一 turn）
- [x] Fix: 门禁 ⑨ 扩展——`engine-invariants.test.ts` abort 变体成员新增；⑨×3 `it.fails` 全部翻转 `it`；⑧ `it.fails` 1 处翻转 `it`（connector-missing 早退清戳后）
- [x] Fix: 类别清扫——engine 全部 plugin hook 调用点（onTurnStart/onBeforeRequest/onError/onAfterRequest/onTurnEnd）错误隔离语义核对（abort 变体 + 非 abort 变体全覆盖），清扫记录入档

Exit Criteria:

- [x] K-⑨-1 RED 测试转 GREEN；注册红 ⑧ 清零（`check:ai-engine-invariants` ⑧ 规则零命中）
- [x] 门禁 ⑨ 扩展覆盖 abort 变体 + ⑨×3/⑧×1 it.fails 翻转，live 零命中
- [x] 类别清扫记录入档（engine plugin hook 错误隔离全部调用点核对结论）

### Phase 5 — 类别清扫复核 + 注册红清零终验 + 登记处同步 + bug notes

Status: completed
Targets: `docs/audits/ai-invariants/invariant-catalog.md`、`docs/audits/ai-invariants/gates.md`、`docs/components/flux-renderers-ai/engine.md`、`docs/bugs/`、`docs/logs/2026/08-10.md`、`docs/audits/ai-invariants/cycle2-findings.md`（W-E/W-⑨-b 行更新）

- Item Types: `Fix | Proof | Follow-up`

- [x] Proof: 类别清扫终审——跨 engine + adapter grep 全部修复族兄弟实例（失败轮产物清理 / version bump+镜像写面 / bootstrap 合并 / storage 排空 / plugin 错误隔离），与 Phase 1-4 清扫记录逐条核对，形成清扫总表（文件:行 + 结论）入档
- [x] Proof: `it.fails` 全量翻转核验——12 处（⑥×5 + ⑦×2 + ⑧×1 + ⑨×3 + ⑩×1）全部 `it` 且全绿；新增成员用例全绿；`pnpm --filter @nop-chaos/flux-renderers-ai test` 全量零回归（基线 67 files / 544 + 新增用例，以 live 为准记录）
- [x] Proof: `pnpm check:ai-engine-invariants`（扩展后）live 零命中——注册红 ⑥×3 + ⑧×1 清零确认
- [x] Fix: `invariant-catalog.md` §10（Cycle 2 / I4 扩展契约：⑩ 空产物清理谓词 / ⑥ 同 tick + bootstrap 成员 / ⑦ clearAll 成员 / ② 镜像写面 / ④ 元数据排空 / ⑨ abort 变体）——**显式 supersede §7.3 类别清扫结论**（「saveConversation（create/rename）不入排空链」被 K-K3/④-1 修复推翻，改为「create/rename 元数据写均入排空链」）**与 §7.4 写面范围**（从 create/rename 扩展至全部列表变更方法）+ `gates.md` 门禁清单更新（⑥-⑩ 行棘轮状态 → 全绿/翻转 + 注册红节清零）+ `engine.md` §Invariants 同步（已知违背面 Failure Path → 已修复态 + K-⑩-1 空产物清理设计裁定）
- [x] Fix: bug notes 125+（13 条 K finding 按族合并：⑩ 族 / ⑥ 族 / ⑦ / K-K4/② / K-K3/④ / ⑨，按 `docs/bugs/00-bug-fix-note-writing-guide.md`：触发 / 诊断 / 根因 / 修复 / 类别清扫范围 / 回归测试）
- [x] Proof: W-E / W-⑨-b 附带评估——K-⑩-1 修复后 W-E（onAfterRequest 空回调）是否自然收敛、K-⑥-3 修复后 W-⑨-b（bootstrap-active 会话 autoSave）是否自然覆盖；结论回写 `cycle2-findings.md` §3.3 对应行（维持或移除，如实记录）
- [x] Proof: `pnpm test:scripts`（committed 回归追加用例全绿）+ `pnpm check:docs-garbled`（新增/修改 docs 候选核对）
- [x] Follow-up: daily log 记录本 plan 收口（13 条 K 修复 + 注册红清零 + 门禁扩展 + 清扫总表摘要 + W-E/W-⑨-b 评估结论）

Exit Criteria:

- [x] 清扫总表入档（含全部兄弟实例核对结论，closure audit 抽查依据）
- [x] `it.fails` 12 处全量翻转全绿 + 注册红 ⑥×3/⑧×1 清零（`check:ai-engine-invariants` exit 0）
- [x] catalog §10 / gates.md / engine.md 与 live 门禁状态一致；bug notes 125+ 落档；AI 包测试全绿零回归；W-E/W-⑨-b 评估结论回写

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: Round 1 `ses_016b47660ffee4vtnqRro6vV9Q`（fresh session）→ `fail`（3 Major）；Round 2 `ses_016aa3c03ffeemj9j4vr7lKDZB`（fresh session）→ `pass-with-minors`，零 Blocker / 零 Major，共识达成
- Verdict: `pass-with-minors`（Round 2）
- Rounds: 2
- Findings addressed:
  - [Major M1] clearAll 镜像写面缺位 → clearAll 同步写 `conversationsRef` 移入 Phase 2 fix ②（K-⑥-1 幽灵 fixup 依赖），Phase 3 收窄为门禁断言固化
  - [Major M2] rename-first 顺序未覆盖 → rename 的 `saveConversation` 链入 `pendingSavesRef` 排空链（双序覆盖），④ 门禁扩展至 create 与 rename 两个元数据写臂
  - [Major M3] bootstrap 只建引擎不加载消息 → K-⑥-3 fix 明确「建引擎 + loadMessages + version guard」，proof 断言存储消息可见
  - [Minor m1] 测试文件构成表述 → conversation-invariants-cycle2.test.ts 为 ⑥⑦ 两族 7 处 it.fails（非 8 处）
  - [Minor m2/m3] probe 清单缺 probe B → Phase 1 Exit Criteria 与 Closure Gates 补齐
  - [Minor m4] K-⑥-2 校验读闭包 → 改读 `conversationsRef.current`（Round 2 再收窄：守卫须早于 `setActiveId`，改入口 exists 检查）
  - [Minor m5] Phase 1 Targets 缺 adapter 文件 → 补 `use-conversation.ts` + `conversation-invariants.test.ts`
  - [Minor m7] §7.3 类别清扫结论将被推翻 → Phase 5 显式 supersede §7.3（元数据写入排空链）与 §7.4（写面扩展）

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 13 条 K finding 全部修复落地，各自 RED→GREEN 回归测试在案（probe A/B/P3/P4/P6/C/C2/P7/F/D/P1/P2/P5 场景）
- [x] 注册红清零：⑥×3（create/delete/clearAll bump）+ ⑧×1（connector-missing 清戳）→ `check:ai-engine-invariants` exit 0 零命中
- [x] 门禁 ⑥⑦⑨⑩②④ 扩展全部落地（参数化测试 + 扫描器规则（如适用）+ committed 回归追加），12 处 `it.fails` 全量翻转且全绿
- [x] 类别清扫强制满足：清扫总表入档（修任一实例必核对全部兄弟；closure audit 抽查）
- [x] 不存在被静默降级到 deferred 的 in-scope live defect（13 条 K 全部修复；watch-only 8 条路由明确且不在本 plan scope；W-E/W-⑨-b 评估结论如实记录）
- [x] 登记处同步完成：`invariant-catalog.md` §10 / `gates.md` / `engine.md` §Invariants / bug notes 125+ / `cycle2-findings.md` W-E/W-⑨-b 行
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### watch-only 8 条（W-E / W-⑨-a/b/c + W1-W4，维持登记不重开）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 低严重度/窄窗口/复触发条件已逐条登记（findings §3.3 + §4）；W-E 与 W-⑨-b 在本 plan Phase 5 做「附带评估」后如实回写（自然收敛则移除，否则维持登记）——属评估动作非修复承诺
- Successor Required: `no`

## Non-Blocking Follow-ups

- 修复后如发现新兄弟实例（类别清扫证据），回读 I3 裁决表确认路由一致（对齐 Cycle 1 先例）。
- K-⑩ 空产物清理设计裁定在 engine.md 显式记录（重构防回退）——已落（engine.md §Invariants「空产物清理设计裁定」节）。

## 类别清扫总表（Sweep Record，closure audit 抽查依据）

> 2026-08-10 live 逐条核对；五类修复模式跨 engine + adapter 的全部兄弟实例，与 Phase 1-4 清扫记录逐条勾对。行号为总表成表时的 live 位置。
> 注（check:oversized-code-files 门禁）：I4 新增测试使 `engine-invariants.test.ts`（789 行）/ `conversation-invariants.test.ts`（775 行）超 700 行上限——按 cycle2 先例拆分：⑩ 门禁块 → 新文件 `engine-invariants-i4.test.ts`；⑩ autoSave 臂 + ②/④ 元数据排空/镜像写面块 → 新文件 `conversation-invariants-i4.test.ts`（两原文件回到 ≤700，`check:oversized-code-files` 仅既有 2 exempt locale；gates.md / catalog §10 / engine.md 运行命令 / bug notes 125/128/129 引用同步更新）。

### A. 失败轮产物清理（engine 产物提交/排除面，全部调用点）

| live 位置                     | 面                                | 结论                                                                                |
| ----------------------------- | --------------------------------- | ----------------------------------------------------------------------------------- |
| `create-engine.ts:453`        | onBeforeRequest rejection         | `commitOrDropResidue`（drop 空 placeholder）+ rethrow → runTurn catch 落态（K-⑩-2） |
| `create-engine.ts:474-486`    | `commitOrDropResidue` 定义        | 空产物（`isVacuousAssistantResidue` :476）→ splice drop；非空 → 普通 commit         |
| `create-engine.ts:513`        | chunk 循环 per-chunk commit       | 保持普通 commit（流式中途 drop 破坏流）——记录                                       |
| `create-engine.ts:534`        | post-stream 终态提交              | `commitOrDropResidue`（K-⑩-1 aborted / K-⑩-5 零 chunk 成功轮）                      |
| `create-engine.ts:551`        | runOnce catch 终态提交            | `commitOrDropResidue`（K-⑩-3 持久化臂 / K-⑩-4 regenerate 臂）                       |
| `create-engine.ts:578-582`    | buildContext 尾部排除谓词         | 扩展为 `loading \|\| vacuous`（纵深防御）                                           |
| `use-conversation.ts:197-207` | attachAutoSave 快照               | 尾部剥除 vacuous（覆盖 `abort()` 同步翻 state 早于 engine 清理的窗口，K-⑩-3）       |
| `ai-component-handle.ts:71`   | `component:getMessages` host 快照 | 主机显式读取面，不在「请求历史/持久化」契约内——记录（不改）                         |

### B. version bump + 镜像写面（adapter 全部位移方法）

| live 位置                     | 方法               | 结论                                                                                |
| ----------------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| `use-conversation.ts:385-388` | createConversation | 镜像同步 prepend + `++switchVersionRef` + `switchTargetRef = null`                  |
| `use-conversation.ts:494-497` | deleteConversation | 镜像同步 filter + `++switchVersionRef` + target 重置（K-⑥-1/2 根因面）              |
| `use-conversation.ts:600-602` | clearAll           | 镜像同步 `[]` + `++switchVersionRef` + target 重置                                  |
| `use-conversation.ts:428-435` | switchConversation | 入口 exists 读镜像（K-⑥-2）+ id-aware bump/target（同 id 重 switch 不丢 hydration） |
| `use-conversation.ts:317-325` | bootstrap merge    | 镜像同步写 merged（Phase 3，K-⑦ 合并面）                                            |

### C. bootstrap 合并 + build-on-demand（adapter）

| live 位置                     | 面                           | 结论                                                                            |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| `use-conversation.ts:303-312` | bootstrap post-await         | 合并（`[...loaded, ...created]`）+ `listClearedRef` 守卫（K-⑦-1）               |
| `use-conversation.ts:594`     | clearAll 置 `listClearedRef` | 守卫标记（K-⑦-1）                                                               |
| `use-conversation.ts:260-291` | `ensureEngineAndHydrate`     | bootstrap/delete-fixup build-on-demand + loadMessages + id-aware guard（K-⑥-3） |

### D. storage 排空（adapter 全部写调用点）

| live 位置                     | 调用点                        | 结论                                                                   |
| ----------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `use-conversation.ts:225-232` | attachAutoSave `saveMessages` | 既有 K3 入链 ✓（不变）                                                 |
| `use-conversation.ts:408-418` | create `saveConversation`     | **I4：入 `pendingSavesRef` 链 + settlement 镜像再校验（K-K3/④-1）**    |
| `use-conversation.ts:559-573` | rename `saveConversation`     | **I4：入链 + settlement 再校验（K-K4/②-1/2；与 create 共享排空契约）** |
| `use-conversation.ts:527-531` | delete drain                  | 排空覆盖元数据链（await allSettled → storage delete）                  |
| `use-conversation.ts:608-630` | clearAll drain + storage 清   | 排空覆盖元数据链（drain → clearAll/per-id fan-out）                    |

### E. plugin 错误隔离（engine 全部 hook 调用点）

| live 位置                  | hook                         | 结论                                                                             |
| -------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `create-engine.ts:248-255` | onTurnStart                  | 移入 try（rejection → catch 落态，不卡 processing；⑨ 注册成员翻转）              |
| `create-engine.ts:449-453` | onBeforeRequest              | 清理面 wrapper（drop + rethrow，K-⑩-2 幽灵）                                     |
| `create-engine.ts:230`     | onError（connector-missing） | `callPluginError` 隔离（抛错不跳过状态写入）                                     |
| `create-engine.ts:307`     | onError（tool-no-executor）  | 同上                                                                             |
| `create-engine.ts:345`     | onError（runTurn catch）     | 同上                                                                             |
| `create-engine.ts:555`     | onError（runOnce catch）     | 同上                                                                             |
| `create-engine.ts:510-513` | onCompletionChunk            | try 内 ✓（记录）                                                                 |
| `create-engine.ts:531-534` | onAfterRequest               | try 内 ✓（记录）——W-E 不收敛结论依据（hook 面未重排）                            |
| `create-engine.ts:367-387` | onTurnEnd                    | finally 隔离（不 reject host promise；abort 变体 K-⑨-1 + 非 abort 遮蔽原错误面） |

## Closure

Status Note: 已收口（2026-08-10）。13 条 K finding 全部修复落地（test-first 先红后绿在案）、注册红清零（`check:ai-engine-invariants` live 零命中）、门禁 ⑥⑦⑨⑩②④ 补强（12 处 `it.fails` 全量翻转 + 参数化成员扩展 + `scanMirrorWriteSurface` 新规则 + committed 回归追加）、类别清扫总表入档（A-E 五族）、登记处同步（catalog §10 + gates.md + engine.md + bug notes 125-130 + cycle2-findings W-E/W-⑨-b 评估）、full-green 验证（AI 包 69 files / 572/572 全绿零 expected fail；typecheck/build/lint 37/37；test:scripts 40/41 唯一失败为既有 CSS stale literal；pnpm check 仅既有登记 red 零新增）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent `ses_01664036affeTCJhM9FDtO59oV`（general，fresh session）
- Evidence: verdict **PASS_WITH_MINORS**（零 Blocker / 零 Major）——checklist 7 项全 PASS（plan 一致性 / 代码修复落地 spot-check / RED→GREEN 翻转证据 / 门禁复跑全绿 / 类别清扫 / 登记处同步 / 无静默降级）；2 Minor 非阻塞（gates.md committed 回归计数 13→11 文案算术、daily log Phase 2「⑤」→「⑥」单字笔误）均已就地修复；审计复跑：AI 包 572/572、`check:ai-engine-invariants` exit 0、typecheck/build/lint 37/37、test:scripts 40/41（唯一失败 HEAD stash 实证 pre-existing）、pnpm check 仅既有登记 red。

Follow-up:

- 无 confirmed live defect；non-blocking follow-up：修复后如发现新兄弟实例（类别清扫证据）回读 I3 裁决表确认路由一致（对齐 Cycle 1 先例，plan Non-Blocking Follow-ups 已记录）。
