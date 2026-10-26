# 758 PH-5 ai 迁移（骨架 + ghost 写入族）：K3 排水链接入 `createWriteDrain`

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-5（B 组；依赖 PH-4 ✓）；mission `missions/platform-hardening-b.json`
> Related: plan `757`（原语与不变式清单）；种子 bug notes 123/128/129/132/151（K3 排水链族）；`docs/audits/ai-invariants/invariant-catalog.md` K3/④

## Purpose

把 `use-conversation` / `use-conversation-autosave` 手写的 `pendingSavesRef` 排水链接到 PH-4 的 `createWriteDrain` 原语，使 ghost 写入族的防回退从此有框架级载体。**行为不变迁移**：既有 ai 测试套件（含 clear-all / delete-during-abort / ghost 族）是判别性测试面。

## Current Baseline

全部为 2026-10-26 live（HEAD `b5d730382`）：

- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`（669 行）`pendingSavesRef: useRef(Map<string, Promise<unknown>>)`，6 个逻辑使用点（15 处表达式，含 `attachAutoSaveToEngine` 透传与 deps 类型）：
  - **写入点 ×3**（create `:381-391`、rename `:554-564`、autosave `use-conversation-autosave.ts:87-106`）：链上前一 promise（swallow 其错误）→ settle 时镜像重检（`conversationsRef` 不含该 id 则跳过）→ `reportStorageError` 单独 catch。
  - **delete `:520-523`**：await 该 key 链（allSettled）→ 删 key → 才 `storage.deleteConversation`。
  - **clearAll `:577-622`**：ids 全集 = engineCache ∪ pendingSaves keys ∪ 镜像；drain allSettled → **同步 clear()**（防"清除窗口新建会话被迟到原子清空"，FIND-02：per-id delete，禁用原子 `storage.clearAll()`）。
  - **unmount `:318-342`**：unsub → abort → `pendingSaves.clear()`（不留 stale 排水面）。
- 语义要点（迁移必须保持）：settle 时镜像重检在**调用侧**；链错误被吞并单独上报；delete/clearAll 的"先排空后删"；clearAll 同步丢链（窗口新建保护）；签名约束 `clearAll(): void` 同步。
- `createWriteDrain` 语义（plan 757）：enqueue 同 key 串行、enqueue 返回本次 run promise、barrier/evict/pendingKeys。
- 判别性测试在位：`src/adapters/__tests__/use-conversation-clear-all.test.ts`、`use-conversation-delete-during-abort.test.ts` 等 15 个 ghost/clear 相关用例；包测试全绿基线（HEAD 复跑 `pnpm --filter @nop-chaos/flux-renderers-ai test` exit 0）。
- `check:ai-engine-invariants` 的 ④ 规则（`find-ai-engine-invariant-violations.mjs:64-91` `scanStorageCalls`）按 `storage?.<method>(` + 其后 6 行内出现 `.catch(` 的**邻近窗口**豁免，**不按名识别** `pendingSavesRef`——迁移后 enqueue 写闭包是否仍让 `.catch` 落在窗口内，须实测裁定（见 Phase 1/2）。

## Goals

- `pendingSavesRef` 全部 6 个逻辑使用点（15 处表达式）改经 `createWriteDrain`；两文件不再手写 promise 链。
- 既有 ai 测试套件零失败（判别性测试面即 15 个 ghost/clear 用例 + 全套件）。
- ④ 扫描规则保持绿（或按裁定同步后绿）。

## Non-Goals

- 不迁移 `switchVersionRef`/`switchTargetRef`（见 Deferred：id-aware 语义比 LG 原语更具表达力）。
- 不迁移 create-engine stamp 重置（见 Deferred：出口与流式循环交错，归 PH-6 与扫描器重构同批）。
- 不改 storage 接口、不改 `clearAll(): void` 同步签名。

## Scope

### In Scope

- `use-conversation.ts`、`use-conversation-autosave.ts`（drain 迁移）
- `scripts/audit/find-ai-engine-invariant-violations.mjs`（仅当裁定需改规则时：识别面/fixture 同步）
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`（同上，fixture `:80,368,403` 引用 `pendingSavesRef` 字面量）
- roadmap PH-5 回写、`docs/audits/async-lifecycle/invariant-catalog.md` 族表加"已迁移"注记、daily log

### Out Of Scope

- `switchVersionRef`、create-engine、G/H 族

## Failure Paths

| 场景                | 触发                                  | 行为                                        | 可重试 | 用户可见     |
| ------------------- | ------------------------------------- | ------------------------------------------- | ------ | ------------ |
| delete-during-save  | 保存 in-flight 时 deleteConversation  | 保存先 settle（其镜像重检可跳过），删除后行 | 是     | 无 ghost     |
| clear-window-create | clearAll 后同 tick createConversation | 新建的 save 不被本 drain 等待，记录存活     | 是     | 新会话不被抹 |
| unmount-late-save   | unmount 时仍有保存 in-flight          | 链自然 settle，镜像重检跳过已删项           | 是     | 无           |

## Test Strategy

本档选择：**必须自动化**。判别性测试 = 既有 ghost/clear 族用例（点名：clear-all 全集枚举用例、delete-during-abort 用例、save-after-delete ghost 用例——旧手写链实现下同样通过，但**任何迁移回归**（顺序颠倒/丢链/漏枚举）必使其中至少一条红；另有 ④ 扫描器 fixture 更新的先红）。

## Execution Plan

### Phase 1 - Proof：基线与判别面固定

Status: completed
Targets: ai 包测试

- Item Types: `Proof`

- [x] 基线：`pnpm --filter @nop-chaos/flux-renderers-ai test` → **104 files / 853 tests 全绿**（R1 审阅者实测与本会话复跑一致）。
- [x] 判别性用例点名：①delete 排空顺序 = `use-conversation-delete-during-abort.test.ts`（FP-1）；②clearAll 全集枚举 = `use-conversation-clear-all.test.ts`（FP-2 全集 delete）；③clear 窗口新建保护 = 同文件（FIND-02）；④save-after-delete ghost = `use-conversation-storage.test.ts` ghost 族；⑤detach-before-abort = 同 storage 测试（P2-2 用例）。
- [x] ④ 裁定（回写，closure audit R1 勘正）：`scanStorageCalls`（`find-ai-engine-invariant-violations.mjs:64-91`）以正则 `storage\?\.(\w+)\s*\(` 匹配调用并要求其后 6 行内有 `.catch(`。迁移后三处调用：autosave `storage.saveMessages(` 被匹配且 `.catch` 相距 2 行在窗口内；delete/clearAll 的 `storage?.deleteConversation?.(id)` 是**可选调用形态 `?.(`**，与 HEAD 原写法相同，该正则从不匹配它（扫描器盲区，HEAD 即如此）→ 零漂移、规则零改动、scanner exit 0。**盲区登记**：`?.(` 可选调用不进 ④ 窗口检查，归 PH-6 扫描器重构候选（见 Non-Blocking Follow-ups）。

Exit Criteria:

- [x] 基线全绿证据 + 5 条判别用例清单在本节。

### Phase 2 - Fix：drain 迁移

Status: completed
Targets: `use-conversation.ts`、`use-conversation-autosave.ts`

- Item Types: `Fix`

- [x] `use-conversation.ts`：`const [saveDrain] = useState(() => createWriteDrain())`（import `@nop-chaos/flux-core`）；create/rename 写入点 → `void saveDrain.enqueue(id, () => { 镜像重检; return storage?.save… }).catch(report…)`；delete → `await saveDrain.enqueue(id, () => storage?.delete…)` 外层 try/catch 上报（天然先排空后删，key settle 后自动摘除）；clearAll ids 用 `saveDrain.pendingKeys()`、per-id `enqueue` delete（allSettled+clear 删除；**执行修订**：写闭包不用 async/await——await 关键字会触发布局级 ② 启发式把文件尾部 return 对象误判为 post-await，去掉后语义不变、扫描器绿）；unmount 保留 unsub→abort，drain 对象随 hook 丢弃，不加 evict 循环。
- [x] `use-conversation-autosave.ts`：deps 改 `saveDrain: WriteDrain`；写入点同 enqueue 形态。
- [x] ④ 处置按 Phase 1 裁定：零改动（证据见上）。
- [x] 全套件 853/853 零失败；`pendingSavesRef` 字面量清零（含注释）；包 typecheck 绿。

Exit Criteria:

- [x] 5 条判别用例全绿（含于 853）；包全套件零失败。
- [x] `grep -rc pendingSavesRef packages/flux-renderers-ai/src` = 0；`find-ai-engine-invariant-violations.mjs` exit 0。
- [x] `pnpm check` exit 0（见 Closure Gates）。

### Phase 3 - Docs 与回写

Status: completed
Targets: catalog、roadmap、daily log

- Item Types: `Fix`

- [x] `invariant-catalog.md` 族表 A 行加已迁移注记（plan 758）。
- [x] roadmap PH-5 `todo`→`planned`→`done`（closure 同 commit）；daily log（closure 同 commit）。

Exit Criteria:

- [x] 文档与 live 一致；`pnpm check` exit 0。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agents `agent_8ad666b1`（R1）、`agent_09c0cbc9`（R2），2026-10-26
- Verdict: R1 `fail`（1 Major / 2 Minor）→ R2 `pass-with-minors`（3 条一致性 Minor）
- Rounds: 2
- Findings addressed: Major——④ 扫描器机制描述失实（实为 `.catch` 邻近窗口而非按名识别）→ Baseline/Phase 1/2 重写为裁定式双分支；Minor——使用点计数 6 逻辑点/15 表达式、unmount drain 为 hook state 无批量 drop 不加 evict 循环、Scope/Goals 措辞改条件式。R1 独立验证了原语映射语义健全（含 FIND-02 窗口保护、delete 排空、unmount 等价）与测试面真实性（基线 104 文件 / 853 用例全绿）。

## Closure Gates

- [x] `pendingSavesRef` 在 ai 包内清零；drain 迁移完成
- [x] 判别性测试面全绿（5 条点名用例 + 包全套件 853/853，零漂移）
- [x] ④ 扫描器零改动且绿（裁定证据见 Phase 1；`?.(` 盲区登记 PH-6）
- [x] 无 in-scope 项被静默降级（switchVersionRef / stamp 迁移两项 Deferred 均有理由）
- [x] catalog / roadmap / log 已同步（closure 同 commit）
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——R1 `agent_49002571` `issues`（1 Major 2 Minor）→ 修复 → R2 `agent_0092adc4` `approved`，2026-10-26（见 §Closure）
- [x] `pnpm typecheck` 45/45
- [x] `pnpm build` 45/45
- [x] `pnpm lint` 45/45（修订：移除未用 `WriteDrain` 类型导入）
- [x] `pnpm test` 84/84（ai 853/853）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

### `switchVersionRef`/`switchTargetRef` → LifecycleGuard

- Classification: `watch-only residual`
- Why Not Blocking Closure: 现守卫是 **id-aware** epoch（同 id 快速重切不失效、位移置 null 全失效），比 `createLifecycleGuard` 的单调 epoch 更具表达力；强行替换会丢 K-⑥ 语义。若 PH-6 后该形态在 ≥2 处重现，再扩展原语（加 per-key guard）。
- Successor Required: `no`（PH-6 Loop Rule 观察项）

### create-engine stamp 重置 → runWithExitResets

- Classification: `watch-only residual`
- Why Not Blocking Closure: stamp 消费点与流式循环/工具轮交错（3 个出口在嵌套层），迁移需先做出口结构化，与 ⑧ 扫描规则的 AST 化同批才可验证；roadmap PH-6"abort 残留收口 + 门禁扩容"正是该批。
- Successor Required: `yes`
- Successor Path: roadmap PH-6（plan 待起草）

## Non-Blocking Follow-ups

- ④ 扫描器对 `storage?.<method>?.(` 可选调用形态的盲区（closure audit R1 发现，HEAD 即存在）→ PH-6 门禁扩容时纳入 AST 化重构。

## Closure

Status Note: K3 排水链（ghost 写入族核心）由手写 promise 链迁移到框架原语 `createWriteDrain`，6 个逻辑使用点 / 15 处表达式清零，853 用例零漂移；行为不变（delete 先排空、clearAll 全集 per-id、窗口新建保护、unmount 顺序）。stamp 重置与 id-aware switch epoch 显式 deferred（PH-6 / Loop Rule 观察）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agents `agent_49002571`（R1 `issues`）、`agent_0092adc4`（R2 `approved`），2026-10-26
- Evidence: R1 核验迁移语义 a–e、853/853、扫描器 exit 0、判别用例为顺序敏感断言；发现 Major——catalog 注记未真正落文件（替换串未匹配且未校验）→ 按行前缀重写；Minor——④ 绿的真实原因是正则不匹配 `?.(` 可选调用形态（HEAD 即如此，零漂移）→ 裁定文本勘正 + 盲区登记 PH-6；delete 闭包改为与 plan 一致的同步形态。R2 逐项复核 a–e 全部 PASS，853/853、scanner 0、lint 0、grep 0。

Follow-up:

- no remaining plan-owned work。PH-6：abort 残留 / plugin 隔离收口 + `check:ai-engine-invariants` 扩容（含 ④ `?.(` 盲区与 ⑧ AST 化、stamp → `runWithExitResets`）。
