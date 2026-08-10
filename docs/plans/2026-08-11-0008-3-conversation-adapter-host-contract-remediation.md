# 3 Conversation Adapter / 宿主契约收口：clearAll×create 竞态 + 命令失败保真 + native adapter 渲染循环（ai-invariant-loop）

> Plan Status: active
> Mission: ai-invariant-loop
> Last Reviewed: 2026-08-11
> Source: `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`（FIND-02 [P1]、FIND-04 [P1]、FIND-05 [P1]）；live repo 核对 2026-08-11（行号以审计时点为准，执行时 live 复核）
> Source Audits: `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`
> Related: `docs/plans/2026-08-11-0008-1-renderer-contract-wiring-onapproval-and-projection-remediation.md`（renderer 契约接线面 P0/P1）、`docs/plans/2026-08-11-0008-2-engine-loop-termination-and-error-carrier-remediation.md`（engine 循环/清理面 P1）；三者共享 2026-08-10-2245 双审计路由面，closure surface 各自独立

## Purpose

修复本轮 multi-audit 的 **adapter/宿主契约面 3 条 P1**：① **FIND-02** —— `clearAll` 延迟原子清空与「clearAll 之后新建会话」的 saveConversation 反向竞态：新会话存储记录被 `storage.clearAll()` 抹掉（真实数据丢失窗口）；② **FIND-04** —— `ai:send` / `component:sendMessage` 对失败轮与忙时静默丢弃统一返回 `{ok:true}`，命令边界失败保真度缺口（含 double-send 谎报成功）；③ **FIND-05** —— native-adapter 默认构造绑定 `useMessage`/`ai-chat` engine prop → `useSyncExternalStore` getSnapshot 每次新引用 → 无限渲染循环，宿主按 engine.md §8.5 文档化路径接入即页面崩溃。

收口状态：三条 P1 全部修复（test-first 先红后绿）、AI 包测试全绿、engine.md §8.5 宿主契约同步、bug notes 同步。

## Current Baseline

（live repo 核对，2026-08-11；HEAD `ab2a1622`；行号 = 审计时点）

- **FIND-02（clearAll×create 反向竞态，P1）**：`src/adapters/use-conversation.ts:639-642` clearAll 快照 drain 后 `pendingSavesRef.current.clear()`，`:649-661` `drain.then(() => storage.clearAll())` 原子清空落在 drain 之后；`createConversation` 在该窗口注册：`:399` 同步镜像写 `conversationsRef.current` → `:422-432` 创建 save 链的 mirror-check 通过（`pendingSavesRef` 已清 → prevPending undefined）→ 新会话 save 落在 drain 之后 → `storage.clearAll()` 抹掉新记录 → remount 后记录丢失（"ghost-free-creation in reverse"）。既有守卫（K3/④ 计时）只覆盖「旧写必须在 delete/clear 前 drain」方向；反向方向（clear 后新写）零覆盖。测试覆盖只有 create+clearAll（create 在前）与无 `clearAll` 实现的 storage 的 clearAll+create；原子 clear + clearAll-first 组合零覆盖。
- **FIND-04（命令边界 ok:true 保真缺口，P1）**：`src/adapters/ai-action-provider.ts:90-91` `await engine.sendMessage(text); return ok();` 无条件成功；`src/adapters/ai-component-handle.ts:67-72,108-110` 同（dead catch）；`src/engine/create-engine.ts:206-208` busy 路径静默 drop（`isProcessing` 时 `return`，消息未发仍 ok:true）；engine `sendMessage` 文档化 void-settle 契约（四失败分支全部 settle 进 `requestState`/`lastError`，`:356-377,:583-603`）。provider 已能为 null-engine 窗口返回 `ok:false`（`:74-79,87-89`）——能区分"engine 未就绪"却无法区分"请求失败"。`action-provider.test.tsx:36-51` 只断言成功路径与参数校验，无失败轮 `ActionResult` 断言。仓库既有惯例（flow-designer `toActionResult`、word-editor provider）将命令失败映射为 `{ok:false}`。
- **FIND-05（native adapter 无限渲染循环，P1）**：`src/adapters/use-engine-view.ts:42-47` 裸 `useSyncExternalStore(engine.subscribe, engine.getState, engine.getState)`；`src/engine/state-adapter.ts:30-33` native adapter `getState()` 每次构建新对象；`src/engine/create-engine.ts:63` 默认 `options.adapter ?? createNativeMessageAdapter()`；`src/renderers/ai-chat.tsx:29-37` duck-type 守卫只查 `subscribe/getState/sendMessage` 存在。宿主按 `docs/components/flux-renderers-ai/engine.md:185-188,257`（§8.5 外部 engine + §8.2 native = "production default"，无 adapter 前置条件说明）用 `createMessageEngine({connector})` 默认构造接入 → "Maximum update depth exceeded" 页面崩溃。仓内消费方全部显式传 `createReactMessageAdapter`；`react-adapter-identity.test.ts:78-91` 已证明 base adapter 违反快照稳定性（`expect(a).not.toBe(b)`）；现有防护只是 `use-engine-view.ts:30-35` 代码注释与 `ai-chat-external-engine.test.tsx:44` 测试注释，无运行时守卫、无文档。
- **门禁现状**：`check:ai-engine-invariants` exit 0 零命中；AI 包基线 **76 files / 659 tests 全绿**（2026-08-10 1606-3 收口后）。
- **Bug note 编号**：live 最高 **146**，新增编号 **147+**（三 plan 共享编号区，按提交顺序分配）。
- **授权**：属 `implement` 默认授权；修复不改变公共 API 签名（FIND-05 若选 Option (b) 文档化前置条件则为纯文档 + 守卫）；`sendMessage` 的 void-settle engine 契约保持不变（只改映射层）→ 不触发结构性重构人工确认门。

## Goals

- FIND-02：原子 clear 改为针对 clearAll 时点的会话快照（per-id fan-out over snapshot 而非 `storage.clearAll()`，或 list-mirror-union drain 包含 post-clearAll 写）；clearAll-first + create 顺序回归测试（原子 clear storage）。
- FIND-04：`ai:send` / `component:sendMessage` 在 `await` 后快照 `engine.getState().requestState`，'error' 返回 `fail(lastError)`，busy drop 返回 `{ok:false, error: 'engine busy'}`（或等价）；失败轮 + busy-drop 回归测试。
- FIND-05：在 `useEngineView`/`ai-chat` 加不稳定 getSnapshot 检测守卫（比较前两次调用，`console.warn` 一次并指向 `createReactMessageAdapter`），或按 engine.md §8.5 文档化 adapter 前置条件 + 宿主向回归测试（native engine 绑定必须产生可诊断错误而非无限循环）；两条路径至少一条落地，文档面同步。
- 类别清扫：adapter 层全部命令边界（send/abort/clear/create/delete/rename/switch）的 ActionResult 保真核对 + storage 变更时序窗口核对 + 全部 getSnapshot 面核对。
- 收口：AI 包测试全绿零回归；`check:ai-engine-invariants` 零命中；engine.md 同步；bug notes 147+。

## Non-Goals

- 不处理 renderer 契约接线面 P0/P1（FIND-01 / FIND-06，已入 `docs/plans/2026-08-11-0008-1`）。
- 不处理 engine 循环/清理面 P1（R1-F1 / FIND-03，已入 `docs/plans/2026-08-11-0008-2`）。
- 不处理 P2（已入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog）。
- 不改变 engine `sendMessage` 的 void-settle 契约本身（文档化设计）；不改变公共 API 签名；不改样式体系。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`（FIND-02 原子 clear 面）。
- `packages/flux-renderers-ai/src/adapters/ai-action-provider.ts` + `src/adapters/ai-component-handle.ts`（FIND-04 命令边界保真）。
- `packages/flux-renderers-ai/src/adapters/use-engine-view.ts` + `src/renderers/ai-chat.tsx`（FIND-05 守卫面）。
- 回归测试：`src/adapters/__tests__/use-conversation-clear-all.test.ts`、`src/renderers/__tests__/action-provider.test.tsx`、`src/renderers/__tests__/component-handle.test.tsx`、`src/renderers/__tests__/ai-chat-external-engine.test.tsx` / `src/adapters/__tests__/react-adapter-identity.test.ts`。
- 文档：`docs/components/flux-renderers-ai/engine.md`（§8.2 native adapter 快照稳定性前置条件 / §8.5 外部 engine 接入说明）、bug notes、daily log。

### Out Of Scope

- 其余 P0/P1、全部 P2、公共 API 重构、engine 契约变更、样式体系改动。

## Failure Paths

| 场景               | 触发                                                         | 行为                                                  | 可重试 | 用户可见表现                 |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------------------- | ------ | ---------------------------- |
| clear-then-create  | 宿主 `clearAll(); createConversation(...)` 于原子 clear 窗口 | 回归测试 RED；修复后新会话记录在 remount 后存活       | 是     | 新会话不再神秘丢失           |
| send-failure-turn  | 发送后失败轮（connector 错误等）经 `ai:send` 命令            | 回归测试 RED；修复后 `ActionResult {ok:false, error}` | 是     | 宿主 onError 路由生效        |
| send-busy-drop     | `isProcessing` 期间二次 `ai:send`                            | 回归测试 RED；修复后 `{ok:false, error: engine busy}` | 是     | 不再谎报第二次发送成功       |
| native-engine-loop | 宿主按 §8.5 用默认 native adapter 构造外部 engine 并绑定     | 回归测试 RED；修复后可诊断错误/警告而非无限渲染循环   | 是     | 页面不冻结，控制台有明确指引 |

## Test Strategy

本档选择：必须自动化

三条均为已确认 live defect / host 面契约缺口，Proof（RED 回归）先于 Fix；FIND-02 用原子 clearAll mock storage 构造 clearAll-first + create 时序；FIND-04 用失败轮 / busy 状态真实 engine；FIND-05 用 native adapter engine 绑定断言可诊断失败（failing-first）。复杂交互 bug 按 guide 补 bug note（147+）。

## Execution Plan

### Phase 1 — clearAll×create 反向竞态修复（FIND-02 [P1]）

Status: planned
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/use-conversation-clear-all.test.ts`

- Item Types: `Fix | Proof | Decision`

- [ ] Proof: RED 回归测试——mock storage 实现原子 `clearAll`；`clearAll(); createConversation(...)` 顺序：断言新会话 save 在 clear 之后落地且 remount（storage 重读）后记录存活；修复前 RED（记录被抹掉）
- [ ] Decision: 裁定原子 clear 策略——候选：(a) 快照 per-id fan-out（clearAll 时点 `ids` 快照逐 id `deleteConversation`，不用 `storage.clearAll()`）；(b) list-mirror-union drain（drain 合并 clearAll 后注册的新写，原子 clear 前先完成新写）；默认倾向 (a)（per-id 删除天然只作用于 clearAll 时点存在的会话，窗口语义明确，FP-3 错误上报路径复用）；若宿主提供 `clearAll` 的语义是"全删"，(a) 在其上逐 id 删除同样收敛；裁定理由入档
- [ ] Fix: 按裁定实现——原子 clear 目标改为 clearAll 时点会话快照（per-id fan-out over snapshot 或等价的 list-mirror-union），新会话写不再被清空抹除；`reportStorageError` 语义保持（FP-3）
- [ ] Proof: 类别清扫——use-conversation 全部时序窗口核对：clearAll / deleteConversation / createConversation / switchConversation / renameConversation 的 drain-save 窗口逐对核对（旧写 drain 方向既有守卫 + 反向新写不被误清方向本面），结论入档
- [ ] Fix: 测试扩展——既有 create+clearAll（create 在前）与无 `clearAll` 实现的 storage 用例保持零回归；补原子 clear + clearAll-first 组合

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。

- [ ] FIND-02 RED 测试转 GREEN（clearAll-first + create 记录存活断言）
- [ ] 既有 clear-all 测试族零回归（含无 clearAll 实现 storage 的 fallback 路径）
- [ ] 类别清扫记录入档（时序窗口逐对核对结论）

### Phase 2 — 命令边界失败保真（FIND-04 [P1]）

Status: planned
Targets: `packages/flux-renderers-ai/src/adapters/ai-action-provider.ts`、`src/adapters/ai-component-handle.ts`、`src/renderers/__tests__/action-provider.test.tsx`、`src/renderers/__tests__/component-handle.test.tsx`

- Item Types: `Fix | Proof`

- [ ] Proof: RED 回归测试（失败轮）——真实 engine（connector 抛错）经 `ai:send` / `component:sendMessage`：断言 `ActionResult.ok === false` 且 `error` 携带 `lastError` 信息；修复前 RED（`ok:true`）
- [ ] Proof: RED 回归测试（busy drop）——`isProcessing` 期间二次发送：断言 `{ok:false, error: engine busy}` 语义；修复前 RED（静默 ok:true）
- [ ] Fix: `ai-action-provider.ts` `send` 分支——`await engine.sendMessage(text)` 后快照 `engine.getState().requestState`，'error' → `fail(lastError)`；busy drop（发送前 `isProcessing` 且消息未发出）→ `fail('engine busy')` 或等价（实现与 engine 状态读取解耦，不改 engine void-settle 契约）
- [ ] Fix: `ai-component-handle.ts` 同步——`:67-72,108-110` dead catch 修正为与 provider 同语义的失败保真
- [ ] Proof: 类别清扫——adapter 层全部命令（send/abort/clear/createConversation/deleteConversation/renameConversation/switchConversation）ActionResult 保真核对：哪些命令有同步失败判定、哪些 await 后需读状态，逐条核对结论入档；`AI_NAMESPACE_ACTIONS` 清单对照
- [ ] Fix: 测试扩展——成功路径既有断言保持；新增失败轮 + busy-drop 双断言（provider + component-handle 双面）

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则同 Phase 1。

- [ ] FIND-04 两条 RED 测试转 GREEN（失败轮 + busy-drop 双断言，provider + handle 双面）
- [ ] 既有 action-provider 成功路径测试零回归
- [ ] 类别清扫记录入档（命令边界 ActionResult 核对结论）

### Phase 3 — native adapter 渲染循环守卫（FIND-05 [P1]）

Status: planned
Targets: `packages/flux-renderers-ai/src/adapters/use-engine-view.ts`、`src/renderers/ai-chat.tsx`、`src/adapters/__tests__/react-adapter-identity.test.ts`、`docs/components/flux-renderers-ai/engine.md`

- Item Types: `Fix | Proof | Decision`

- [ ] Proof: RED 回归测试——native adapter 构造的 engine 绑定 `useEngineView`/ai-chat：断言产生可诊断结果（console.warn 调用 / 错误抛出示警），而非无限渲染循环；修复前 RED（或既有环境直接断言崩溃路径被守卫拦截）
- [ ] Proof: 类别清扫——全部 `useSyncExternalStore` 绑定面（`use-engine-view` / `useMessage` / `ai-chat` 外部 engine 面）getSnapshot 稳定性核对（哪个面可被不稳定 getSnapshot 击中、哪个面已有缓存 adapter），结论入档
- [ ] Decision: 裁定守卫方案——候选：(a) `useEngineView` 运行时不稳定 getSnapshot 检测（比较前两次 getState 返回值引用，不等则 `console.warn` 一次 + 指向 `createReactMessageAdapter`，检测带引用计数/去抖避免误报）；(b) 仅文档化 adapter 前置条件（engine.md §8.2/§8.5）；默认倾向 (a)+(b) 组合（守卫为宿主提供可诊断错误，文档为正确用法提供指引）；裁定理由入档
- [ ] Fix: 按裁定实现——`useEngineView`（或 ai-chat 绑定面）不稳定 getSnapshot 守卫（仅 warn + 提示，不改渲染行为本身）；`ai-chat` duck-type 守卫可扩展检查快照稳定性或文档注记
- [ ] Fix: `engine.md` §8.2 补 native adapter 快照稳定性限制说明（非 React 宿主直绑）+ §8.5 外部 engine 接入补 adapter 前置条件（`createReactMessageAdapter` 必选 + 默认 native 仅限非 React 消费）；`use-engine-view.ts:30-35` 注释同步
- [ ] Fix: 测试扩展——宿主向回归：native engine 绑定 → 可诊断输出（warn/错误）断言；React adapter 绑定 → 零警告零循环断言

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则同 Phase 1。

- [ ] FIND-05 RED 测试转 GREEN（native 绑定产生可诊断结果，React adapter 零误报）
- [ ] engine.md §8.2/§8.5 同步到位（live 核对一致）
- [ ] 既有外部 engine 测试（`ai-chat-external-engine.test.tsx`）零回归
- [ ] getSnapshot 面类别清扫记录入档（全部 useSyncExternalStore 绑定面核对结论）

### Phase 4 — 登记处同步 + 收口

Status: planned
Targets: `docs/components/flux-renderers-ai/engine.md`、`docs/bugs/`、`docs/logs/2026/08-11.md`

- Item Types: `Fix | Proof | Follow-up`

- [ ] Fix: bug notes 147+（FIND-02 / FIND-04 / FIND-05，按 guide）
- [ ] Proof: AI 包全量测试 + `pnpm typecheck/lint`（AI 包）零回归；`check:ai-engine-invariants` 零命中
- [ ] Follow-up: daily log `docs/logs/2026/08-11.md` 记录本 plan 收口

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则同 Phase 1。

- [ ] bug notes 同步到位；engine.md 无漂移（live 核对一致）
- [ ] AI 包测试全绿零回归 + `check:ai-engine-invariants` 零命中
- [ ] daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session；Round 1 `ses_0138d38b6ffePeJo2NjkhhbGZT` fail 1 Major M1；Round 2 `ses_013877068ffegReExvcMEtsGmB` **pass**）
- Verdict: `pass`（达成共识：零 Blocker / 零 Major，Round 2）
- Rounds: 2
- Findings addressed: M1 测试文件路径错（`src/adapters/__tests__/action-provider.test.tsx` 不存在 → 已修为 `src/renderers/__tests__/action-provider.test.tsx` + `component-handle.test.tsx`，live 核对三 Targets 均存在）；Minor-1 类别清扫项 Fix → Proof 已改；Minor-2 Phase 4 Proof 收缩为 AI 包局部验证（Rule 18 合规）；Minor-3 Failure Paths 行为列措辞已修正；Round 2 Minor（getSnapshot 面类别清扫项缺 Phase 3 归属）已补入 Phase 3 并同步 Exit Criteria

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] FIND-02（clearAll×create 反向竞态）已修复落地（RED→GREEN 证据在案）
- [ ] FIND-04（命令边界失败保真）已修复落地（失败轮 + busy-drop 断言在案）
- [ ] FIND-05（native adapter 渲染循环守卫）已修复落地（可诊断结果断言 + engine.md 同步）
- [ ] 类别清扫记录入档（时序窗口 / 命令边界 / getSnapshot 面核对）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步（engine.md / bug notes / daily log）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### P2 全量（24 条，两审计）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 全部为 P2（非阻断 polish / 文档腐化 / 残余清理），已按 mission-driver 规则入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（带源审计路径），不阻塞本 plan 的 3 条 P1 收口
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-2245 填充节）。
- host 面契约复核（FIND-05/FIND-08/FIND-09 独立发现同波次，multi-audit cross-cutting pattern 5）：FIND-08（ConversationStorageErrorEvent 未导出）与 FIND-09（@tiptap/core 依赖清单）为 P2 已入 backlog，本 plan 修复 FIND-05 时如顺面可行可先行标注（不进 closure 承诺）。

## Closure

Status Note: 待完成时填写。

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent（fresh session）执行
- Evidence: 待定

Follow-up:

- 待定。
