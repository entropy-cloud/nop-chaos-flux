# 1 Engine/Adapter 族 P2 修复（branch 戳残留 / unmount 顺序 / bootstrap 依赖 / connector 同步 / 死契约 / 注释漂移）（ai-invariant-loop）

> Plan Status: completed
> Mission: ai-invariant-loop
> Work Item: Follow-up Backlog P2（engine/adapter 族）：multi P2-1 / P2-2 / P2-7 + open P2-1 / P2-2 / P2-6
> Last Reviewed: 2026-08-10
> Source: `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（2026-08-09-1826 双审计 P2 填充节）、`docs/audits/2026-08-09-1826-multi-audit-ai-invariant-loop.md`（P2-1/P2-2/P2-7）、`docs/audits/2026-08-09-1826-open-audit-ai-invariant-loop.md`（P2-1/P2-2/P2-6）；live repo 核对 2026-08-10（HEAD 晚于 `de36e8e9`，行号以审计时点为准，执行时 live 复核）
> Related: `docs/plans/2026-08-10-1301-1-engine-adapter-p1-remediation.md`（P1 收口，本 plan 为其 P2 后续）、`docs/plans/2026-08-10-1606-2-renderer-ui-p2-remediation.md`（renderer 族 P2，独立 closure surface）、`docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`（契约/文档族 P2，独立 closure surface）

## Purpose

修复 2026-08-09 双审计遗留的 **engine/adapter 族 6 条 P2**（0 P0/P1）：① `pendingBranchId` 戳在 abort / onTurnStart 抛错路径残留、被下一次无关 turn 消费（multi P2-1，⑧ 门禁盲区）；② unmount 清理顺序与 clearAll 的 detach-before-abort 不变式相反，卸载期间入队 aborted 快照 save 且无人可排空（multi P2-2）；③ useConversation 挂载 bootstrap effect 依赖不稳定 `storage` 引用、逐 render 重跑 loadConversations（multi P2-7）；④ useConversation 自建 engine 永不 sync 变更的 `connector`（open P2-1，2151 hot-swap 族新成员）；⑤ `createEngineOptions` 类型允许 `engine` 但 `buildEngine` 静默丢弃（open P2-2，类型契约静默 no-op）；⑥ O-2 注释声称 engine 从不 in-place mutate 嵌套对象、streaming 期间不成立（open P2-6，注释漂移）。

其中 ① 属 ⑧ 不变式（branch 戳重置）门禁漏覆盖（break/throw 路径）→ 按 Loop Rule 补门禁（静态扫描器扩面 + 运行时参数化成员，棘轮只增不减）。每条修复带 test-first 回归断言（RED→GREEN）+ 类别清扫。

## Current Baseline

（live repo 核对 2026-08-10；行号 = 审计时点 2026-08-09，P1 修复后可能漂移）

- **multi P2-1（branch 戳残留）**：静态扫描器 `scanBranchStampReset` 只匹配 `return;` 路径（`scripts/audit/find-ai-engine-invariant-violations.mjs`，live `:375` 区域）；`create-engine.ts` abort `while` break 路径（live `:261`）与 onTurnStart 抛错路径残留 stamp，下一次无关 sendMessage 消费 → 普通消息被误标 branchId（metadata 级 defect：branch 误分组 + regenerate 序列偏移，无数据丢失）。live 核对：`pendingBranchId` 声明于 `create-engine.ts:101`，重置面 `:219/:449`，派生面 `:683`，消费面 `:444`（`branching.ts` 仅提供 `findPriorAssistantBranchId`，消费契约在 engine 侧）。
- **multi P2-2（unmount 顺序）**：`use-conversation.ts:357-369` unmount 先 abort engines（同步 notify、autoSave listener 仍挂载）后 unsubscribe；`pendingSavesRef` 卸载时既不 drain 也不 clear → aborted 快照 save 逃逸到跨 mount drain 之外（快速 remount + 新 turn 时 cross-mount ghost）。对照 clearAll `:579-590` 的 detach-before-abort 顺序（K3 不变式）。live 核对：`detachEngine`（`:210`）、unmount 区域（`:314-318` 注释）、clearAll drain（`:554-559`）。
- **multi P2-7（bootstrap 依赖不稳定）**：`use-conversation.ts:297-348` bootstrap effect 直接把 `storage` 放进 deps（对比 `connector` 走 `connectorRef` 镜像）；host 内联构造 storage 时逐 render 重跑 `loadConversations()`（每次重跑 abort 上一 controller）。live 核对：`storage` 解构于 `:83`，`loadConversations` 调用于 `:265`；`ensureEngineAndHydrateEvent` 用 `useEffectEvent`（`:254`）已解决 helper 身份问题，但 effect deps 仍含 `storage`。
- **open P2-1（connector 永不 sync）**：`use-message.ts:97-102` 对自建 engine hot-swap `setConnector`；`use-conversation.ts:168-183` 建 engine 时捕获 `connectorRef.current`，全文件 `setConnector` 零调用（live grep 证实）→ host 换 connector 后旧会话 engine 永持旧 connector（stale credentials/model），新会话用新的。m4 "绝不触碰外部 engine 的 connector" 规则不适用（这些是自建 engine）。live 核对：`connectorRef` 镜像 `:84-87`，`buildEngine` 面 `:171`。
- **open P2-2（createEngineOptions 静默丢弃）**：`Omit<UseMessageOptions, 'connector'>`（`:18`）允许 `engine?: MessageEngine | null`，但 `buildEngine`（`:168-183`）只转发 8 字段 → host 传 `createEngineOptions: { engine: myEngine }` 零警告得到自建 engine。
- **open P2-6（O-2 注释漂移）**：`create-engine.ts:139-141` 注释声称 engine 从不 in-place mutate 嵌套对象；`applyChunk` 在 `commitAssistant` 之间原地 mutate 在途 assistant，首次 commit 后 `assistant` 重绑定到 state 元素（`:463`）→ 嵌套 `tool_calls` 数组在 live state 对象上原地合并。行为已验证良性（per-chunk commit 粒度保持 render 一致），仅注释误导。
- **门禁现状**：`check:ai-engine-invariants` exit 0 零命中；⑧ 为静态门禁（scanBranchStampReset），覆盖面 = `return;` 早退路径。AI 包基线 **70 files / 612 tests 全绿**（1301-1/2 收口后）。
- 既有测试锚点：`engine-invariants.test.ts`（⑧ 静态规则 + 运行时成员）、`conversation-invariants*.test.ts`、`use-conversation-clear-all.test.ts`、`engine-branching.test.ts`（如有，执行时核对）。
- Bug note 编号：live 最高 **136**，新增编号 **137+**。
- 授权：engine/adapter P0/P1 预授权自动；本 plan 全为 P2，属既定 backlog 内修复，按 roadmap Rule 走 plan 生命周期。**不改变公共 API 签名**（open P2-2 的 Omit 收窄属类型契约收紧 = 消除静默 no-op 的行为修正，不属结构性重构）。

## Goals

- 6 条 P2 全部修复（test-first：每条先写 RED 回归测试 → 修复 → GREEN），强制类别清扫（修任一方法 grep 全部同类兄弟一并核对，类别清扫记录入档）。
- ⑧ 门禁补强（multi P2-1）：静态扫描器 `scanBranchStampReset` 覆盖面扩到 break/throw 早退路径（+ committed 回归 fixtures）+ 运行时参数化成员（`it.fails` 落库 → 修复后翻转 `it`）；棘轮只增不减。
- adapter 面三个行为修正收口：unmount detach-before-abort（K3 同序）、bootstrap effect deps 稳定化（storage ref 镜像）、connector 变更 fan-out `setConnector` 到 engineCache 全量自建 engine。
- open P2-2 类型契约收口（Omit 排除 `engine`）+ open P2-6 注释重写为真实语义。
- 收口：AI 包测试全绿零回归、`check:ai-engine-invariants`（补强后）live 零命中、engine.md / invariant-catalog.md / gates.md / bug notes 同步、daily log 收口记录。

## Non-Goals

- 不处理 renderer/UI 族 P2（multi P2-3/4/6/8/9/17/18 + open P2-7/8）——已在 `docs/plans/2026-08-10-1606-2-renderer-ui-p2-remediation.md`。
- 不处理契约/文档族 P2（multi P2-5/10/11/12/13/15/16 + open P2-3/4/5）——已在 `docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`。
- 不处理 P2-14（已由 1301-2 Phase 3 顺带覆盖，维持 watch-only）。
- 不做结构性重构（不改公共 API 签名 / adapter 契约）；不重写 streaming 背压；不裁决 P3/观察项。
- 不执行全量仓库验证（归 Closure Gates）。

## Scope

### In Scope

- `engine/create-engine.ts`（multi P2-1 残留面 + open P2-6 注释）、`scripts/audit/find-ai-engine-invariant-violations.mjs` + `scripts/__tests__/`（⑧ 静态规则扩面 + committed 回归）。
- `engine/__tests__/engine-invariants*.test.ts`（⑧ 运行时参数化新成员）、`adapters/use-conversation.ts`（multi P2-2/P2-7 + open P2-1/P2-2）、`adapters/__tests__/conversation-invariants*.test.ts` 与相关 adapter 测试文件（新增/扩展用例）。
- 文档：`engine.md`、`invariant-catalog.md`、`gates.md`、bug notes 137+、daily log。

### Out Of Scope

- renderer 族 P2、契约/文档族 P2、P2-14、P3/观察项、公共 API 重构、全量仓库验证。

## Failure Paths

| 场景                  | 触发                                                             | 行为                                                                         | 可重试 | 用户可见表现                           |
| --------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ | -------------------------------------- |
| branch-stamp-leak     | abort 于 chunk 循环或 onTurnStart 抛错后，下一次无关 sendMessage | 回归测试 RED；修复后 stamp 在 break/throw 路径重置、无关轮次无 branchId 误标 | 是     | 无 branch 误分组 / regenerate 序列正常 |
| unmount-order         | 会话组件卸载期间 engine abort 触发 autoSave                      | 回归测试 RED；修复后 detach-before-abort + pendingSavesRef 卸载清空          | 是     | 快速 remount 无 cross-mount ghost      |
| bootstrap-rerun       | host 每 render 内联构造 storage                                  | 回归测试 RED；修复后 effect deps 稳定，loadConversations 单次                | 是     | 无逐 render 重复加载/abort             |
| connector-stale       | host 运行时替换 connector                                        | 回归测试 RED；修复后 engineCache 全量自建 engine fan-out setConnector        | 是     | 旧会话不再持 stale 凭据/模型           |
| engine-option-dropped | host 传 createEngineOptions.engine                               | 类型收窄后编译期报错（消除静默丢弃）                                         | 否     | 契约面：无静默 no-op                   |
| comment-drift         | 维护者按 O-2 注释假设引擎不原地 mutate                           | 注释重写为真实 streaming 语义                                                | 是     | 文档/注释 truthfulness                 |

## Test Strategy

本档选择：必须自动化

engine/adapter 行为 + 不变式门禁即测试（roadmap Rule）；每条 P2 的 Proof（RED 回归测试）先于 Fix；⑧ 门禁补强附 PROOF 用例（注入 break/throw 违背 → 红）与 committed 回归 fixtures。复杂并发 bug 按 guide 补 bug note（137+）。

## Execution Plan

### Phase 1 — branch 戳残留修复（multi P2-1）+ 不变式 ⑧ 门禁补强

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`scripts/audit/find-ai-engine-invariant-violations.mjs`、`scripts/__tests__/`、`src/engine/__tests__/engine-invariants*.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（abort break 路径）——sendMessage 中途 abort（`create-engine.ts:262` while break）→ 下一次无关 sendMessage → 断言其消息/请求元数据**不含** branchId（`branchId` 为 undefined）；修复前 RED
- [x] Proof: RED 回归测试（onTurnStart 抛错路径）——plugin `onTurnStart` reject（live 调用点 `create-engine.ts:253-255`，catch 于 `:351` 区域 settle）→ 后续 sendMessage → 断言无 branchId 误标；修复前 RED
- [x] Proof: RED 回归测试（regenerate 序列臂）——abort 后 regenerate 不消费陈旧 stamp（消费契约面 `create-engine.ts:444`）；修复前 RED
- [x] Fix: 残留面修复——abort break 路径与 onTurnStart 抛错路径统一重置 `pendingBranchId`（与既有 `:219/:449` 同语义）；类别清扫：engine 全部 `pendingBranchId` 写面/消费面核对（声明 `:101` / 重置 `:219/:449` / 消费 `:444` / 派生 `:683`），无其他漏重置路径
- [x] Fix: ⑧ 静态扫描器扩面——`scanBranchStampReset` 覆盖面从 `return;` 扩到 break/throw 早退路径（对齐 audit 建议；规则形态：loop-head 之前的 `break` 必须在 loop 头 clear 或 break 前置 clear；含 pre-`runOnce` plugin `await` 的 try 区域其 catch 内必须 clear `pendingBranchId`）；`scripts/__tests__/` 补 committed 回归 fixtures（注入 break/throw 路径违背 fixture → 红；clean → exit 0）
- [x] Fix: ⑧ 运行时参数化成员——`engine-invariants*.test.ts` 新增 branch-stamp 重置成员（abort/throw 两路径穷举），`it.fails` 落库 → 修复后翻转 `it`；套件保持全绿
- [x] Fix: 类别清扫——`pendingBranchId` 全生命周期（派生→消费→重置）路径核对记录入档

Exit Criteria:

- [x] multi P2-1 三条 RED 测试全部转 GREEN
- [x] ⑧ 补强后 `check:ai-engine-invariants` exit 0 零命中（静态规则扩面 + 运行时成员全绿；`test:scripts` 回归 fixtures 全绿）
- [x] 类别清扫记录入档（pendingBranchId 全生命周期核对结论）

### Phase 2 — unmount 清理顺序修复（multi P2-2）+ 类别清扫

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/conversation-invariants*.test.ts`、`src/adapters/__tests__/use-conversation-*.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（卸载期 aborted 快照）——engine 有在途轮次 → 组件卸载（unmount 清理跑 abort，autoSave listener 仍挂载）→ 断言 `pendingSavesRef` 卸载后为空、storage 无 aborted 快照落盘；修复前 RED
- [x] Proof: RED 回归测试（快速 remount 臂）——卸载后立即 remount + 新 turn → 断言无上一会话 ghost 快照入 storage；修复前 RED
- [x] Fix: unmount 清理顺序改为 detach-before-abort（与 clearAll `:554-559` K3 语义对齐：先 unsubscribe/detach 再 abort），`pendingSavesRef` 在卸载路径 drain-or-clear
- [x] Fix: 类别清扫——adapter 全部 teardown 面核对：unmount（本面已修）/ evict（`:444`）/ delete（`:461`）/ clearAll（`:554-559`）四路径 detach-before-abort 顺序与 pendingSavesRef 语义一致；清扫记录入档
- [x] Fix: 回归测试扩展——既有 clearAll 排空链测试零回归确认

Exit Criteria:

- [x] multi P2-2 两条 RED 测试全部转 GREEN
- [x] 既有 clearAll / detach-before-abort 相关测试零回归（`conversation-invariants.test.ts` K3 timing-guard 成员（save-after-delete/clearAll）+ `conversation-invariants-i4.test.ts` fan-out 成员保持绿）
- [x] 类别清扫记录入档（teardown 四路径核对结论）

### Phase 3 — adapter 面行为修正（multi P2-7 bootstrap 依赖 + open P2-1 connector sync + open P2-2 类型收窄）

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-conversation.ts`、`src/adapters/__tests__/`、`src/adapters/__tests__/use-conversation-*.test.ts`

- Item Types: `Fix | Proof`

- [x] Proof: RED 回归测试（P2-7 bootstrap 重跑）——render 循环每次传新 `storage` 对象引用（等价内联构造）→ 断言 `loadConversations` 仅调用一次（spy 计数）；修复前 RED
- [x] Proof: RED 回归测试（open P2-1 connector sync）——useConversation 建立后 host 替换 connector → 断言 engineCache 内全部自建 engine 的 connector 已更新（`engine.getState()` 侧或 spy）；修复前 RED
- [x] Fix: multi P2-7——bootstrap effect deps 改经 `storageRef` 镜像（对齐 `connectorRef` 先例）；`storage` 本体变更时同步 ref（`connector` 同步 effect `:84-87` 同构）；loadConversations 仍单次
- [x] Fix: open P2-1——connector 变更时 fan-out `engine.setConnector(connector)` 到 engineCache 全量自建 engine（`use-message.ts:97-102` 同语义）；m4 规则面核对：只 fan-out 自建 engine、绝不触碰 host 传入的 external engine（若 cache 混合外部 engine，按来源过滤）；buildEngine 后续新建 engine 用最新 `connectorRef.current`（既有行为保留）
- [x] Fix: open P2-2——`createEngineOptions` 的 Omit 收窄为 `'connector' | 'engine'`（消除类型契约静默丢弃）；`buildEngine` 转发面核对无其他被静默丢弃字段
- [x] Fix: 类别清扫——adapter 全部"host 输入同步面"核对：`connector`（本面已修）/ `storage`（本面已修）/ `createEngineOptions`（收窄）/ `systemPrompt` 等其余选项是否走 ref 镜像或有意 build-time 捕获；清扫记录入档
- [x] Proof: 类型契约验证——open P2-2 收窄后，传递 `createEngineOptions: { engine: ... }` 的 host 代码在 typecheck 期报错（`pnpm --filter @nop-chaos/flux-renderers-ai typecheck` + 负向用例断言）

Exit Criteria:

- [x] multi P2-7 / open P2-1 / open P2-2 相关 RED 测试全部转 GREEN（loadConversations 单次 / connector fan-out / 类型收窄负向编译断言）
- [x] AI 包类型检查通过（收窄未破坏既有 host 用法；playground `openai-connector.ts` 等调用面核对）
- [x] 类别清扫记录入档（host 输入同步面核对结论）

### Phase 4 — O-2 注释修正（open P2-6）+ 登记处同步 + 收口

Status: completed
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`docs/components/flux-renderers-ai/engine.md`、`docs/audits/ai-invariants/invariant-catalog.md`、`docs/audits/ai-invariants/gates.md`、`docs/bugs/`、`docs/logs/2026/08-10.md`

- Item Types: `Fix | Follow-up`

- [x] Fix: `create-engine.ts` O-2 注释重写——如实描述 streaming 期间 `applyChunk` 原地 mutate 在途 assistant + commit 后重绑定行为（per-chunk commit 粒度下 render 一致性成立），移除"从不原地 mutate"的误导声明；相邻 snapshot-identity 防御注释核对一致
- [x] Fix: `engine.md` §Invariants 补 ⑧ 扩面注记（break/throw 路径覆盖 + 新运行时成员）与 adapter 面行为注记（unmount 顺序 / connector fan-out / createEngineOptions 类型）；§8.6 UseConversationOptions 相关正文如涉及同步核对（接口清单腐化本体属 Plan 3，本 plan 只同步行为注记）
- [x] Fix: `invariant-catalog.md` ⑧ 条目更新（覆盖路径扩展）+ `gates.md` 门禁清单更新（⑧ 扩面，棘轮单调）——**与 sibling 3（P2-16 行号校准）同文件不同节**：本 plan 改 ⑧ 覆盖路径语义节、sibling 3 改锚点行号节；收口时 merge-aware 顺序执行并记录于 daily log，避免编辑冲突
- [x] Fix: bug notes 137+（multi P2-1 + multi P2-2 + open P2-1/P2-2 族，按 guide：触发/根因/修复/类别清扫范围/回归测试；open P2-6 注释修正可不单开 note 或合并入 P2-1 族，按 guide 裁定）
- [x] Proof: AI 包全量测试 + `check:ai-engine-invariants` live 复跑 exit 0 + `pnpm typecheck/lint`（AI 包）
- [x] Follow-up: daily log `docs/logs/2026/08-10.md` 记录本 plan 收口

Exit Criteria:

- [x] O-2 注释已重写为真实语义（live 核对一致，无残留误导声明）
- [x] engine.md / invariant-catalog.md / gates.md / bug notes 全部同步到位
- [x] AI 包测试全绿零回归；`check:ai-engine-invariants` exit 0 零命中
- [x] daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session `ses_0153afcbeffew9m8UFC7Rlhf1A`）
- Verdict: `pass-with-minors`（达成共识：零 Blocker / 零 Major；6 Minor 全部为引用精度或协调注记）
- Rounds: 1
- Findings addressed:
  - Minor-1（Phase 2 Exit 的 K3 成员文件归属：`conversation-invariants-i4` → `conversation-invariants.test.ts` K3 timing-guard 成员）→ 已修
  - Minor-2（onTurnStart 抛错调用点行号：审计 `:427-432` → live `:253-255`/catch `:351`）→ 已修
  - Minor-3（baseline 过期引文 `:649-672` 消费与同段 live 列表冲突）→ 已修（消费面改 `:444`）
  - Minor-4（regenerate 臂落点：`branching.ts/:649-672` → `create-engine.ts:444` 消费契约面）→ 已修
  - Minor-5（⑧ 扫描器 throw 路径规则形态未钉定）→ 已修（补 break/throw 规则形态一句 + fixtures 契约）
  - Minor-6（catalog/gates 与 sibling 3 同文件编辑协调）→ 已修（Phase 4 加 merge-aware 顺序注记）

## Closure Gates

- [x] 6 条 P2（multi P2-1/P2-2/P2-7 + open P2-1/P2-2/P2-6）全部修复落地（test-first RED→GREEN 证据在案）
- [x] ⑧ 门禁扩面（break/throw 路径 + 运行时成员）live 零命中，棘轮登记到位
- [x] adapter 面行为达成（unmount detach-before-abort / bootstrap 单次 / connector fan-out / 类型收窄）
- [x] 类别清扫记录入档（pendingBranchId 生命周期 / teardown 四路径 / host 输入同步面）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs 已同步（engine.md / invariant-catalog.md / gates.md / bug notes / daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### renderer 族 / 契约文档族 P2 全量（19 条）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 分属不同结果面（renderer 交互 / 契约文档 truthfulness），已分别路由 `docs/plans/2026-08-10-1606-2-renderer-ui-p2-remediation.md` 与 `docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`，不阻塞本 plan 的 6 条 engine/adapter P2 收口
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-10-1606-2-renderer-ui-p2-remediation.md`、`docs/plans/2026-08-10-1606-3-ai-contract-doc-truthfulness-remediation.md`（同一起草轮三 plan 并行路由）

### multi P2-14（投影克隆 abort 窗口幽灵）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 已由 plan `2026-08-10-1301-2` Phase 3（投影重建触发条件扩展）顺带覆盖，zero-chunk abort 测试实证投影终态零 vacuous placeholder；维持 watch-only 登记（roadmap Follow-up Backlog）
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-1606 起草轮路由注记，本 plan 收口时同步回写）。
- P3/观察项（tiptap 聚焦丢弃、ChatToolCallUIState.result 孤儿字段等）保持在源审计记录中，不派生工作项。

## Closure

Status Note: 6 条 engine/adapter 族 P2 全部修复落地且每条带回归测试实证——multi P2-1（abort break + onTurnStart 抛错两残留面清戳，⑧ 门禁扩面：扫描器 return/break/catch 三规则 + 运行时成员 +3 + fixtures 13→17）；multi P2-2（unmount detach-before-abort + pendingSavesRef 卸载清空，K3 同序）；multi P2-7（bootstrap storageRef 镜像，loadConversations 单次）；open P2-1（connector fan-out engineCache 全量自建 engine）；open P2-2（createEngineOptions Omit 收窄 `'connector' | 'engine'`，负向编译断言守卫）；open P2-6（O-2 注释重写真实 streaming 语义）。类别清扫三面（pendingBranchId 生命周期 / teardown 四路径 / host 输入同步面）入档；docs（engine.md / invariant-catalog.md / gates.md / bugs 137-139 / daily log / roadmap）同步一致。独立审计复跑全绿（AI 包 71 files/620 tests、check:ai-engine-invariants 零命中、test:scripts 8/47、AI 包 typecheck 含负向断言、pnpm check 零新增红）→ 本 plan 可关闭。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit 子 agent（fresh session，task `ses_01ab47a6fffe9kQ2pE4w9cZ1uV4`），verdict **pass-with-minors**（G1-G8 全 PASS；2 minor 均非阻塞）
- Evidence: 三件套输入（plan + diff summary + 验证输出）→ 独立复核：G1 一致性（Phase 全 completed、checklist/Exit Criteria 全勾、Plan Status 由本审计置 `completed`）；G2 代码抽查（create-engine.ts:264 break 清戳 / :360 catch 清戳 / :219 connector-missing；扫描器三规则 `scripts/audit/find-ai-engine-invariant-violations.mjs:387-538`；use-conversation.ts:99-102 storageRef + :177-181 connector fan-out + :363-382 unmount detach-before-abort + :24 Omit 收窄）；G3 fresh 复跑（本审计实跑：AI 包 71 files / 620 tests 全绿、`pnpm check:ai-engine-invariants` exit 0 零命中、`pnpm test:scripts` 8 files / 47 tests、`pnpm --filter @nop-chaos/flux-renderers-ai typecheck` exit 0、`pnpm check` 仅登记红——industrial 6 hits 包 git diff 零变更 + oversized 2 exempt locale）；G4 零静默降级（6 条 P2 各带 fix + 回归测试，open P2-6 注释面 live 核对）；G5 docs 同步一致；G6 类型契约（Omit 排除 engine + `@ts-expect-error` 负向断言在案且 typecheck 绿）；G7 棘轮（扫描器 diff 仅新增 Rule 2/3，Rule 1 未动）；G8 记录入档。minor-1：bug 137 Tests/Affected Files 节将 +3 成员文件写作 `engine-invariants.test.ts`，实际为新增文件 `engine-invariants-p2.test.ts`（且 bug 137「suite 615」与终态 620 不符），docs-only 精度问题；minor-2：Closure Gate 第 7 项在执行 session 侧已预勾 `[x]`（其文本要求独立审计勾选），本审计 verdict 正式授权后维持勾选，无行为影响。

Follow-up:

- no remaining plan-owned work（6 条 P2 全落地，无 confirmed live defect 遗留）
- non-blocking：bug note 137 文件引用/套件数精度校正（docs-only）
