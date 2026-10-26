# 757 PH-4 异步取消/残余统一框架：生命周期原语 + 可执行不变式清单

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-4（B 组持续闭环第一项；mission `missions/platform-hardening-b.json`）；种子 = `docs/bugs/121–159` 40 份 note 的去重根因归纳（2026-10-26 独立子 agent 调研，见 §Current Baseline）；UR-8 结论 `docs/plans/635-cross-roadmap-ur8-async-safety-writeback-plan.md`
> Related: `docs/backlog/ai-invariant-loop-roadmap.md` + `docs/audits/ai-invariants/invariant-catalog.md`（引擎局部不变式 ①–⑧，本 plan 泛化而非重述）；PH-5/PH-6（迁移与门禁扩容，本 plan 不迁移任何调用点）

## Purpose

把 `flux-renderers-ai` 40 份 bug note 中反复手写的生命周期守卫，抽成**框架级、与 React/引擎无关**的少量原语，并给出**可执行形式**的不变式清单（每条不变式 ↔ 一个契约测试 + 预留的扫描规则 id），作为 PH-5/PH-6 迁移与门禁扩容的底座。本 plan 只建框架，不迁移任何现有调用点，不修任何 bug 实例。

## Current Baseline

全部为 2026-10-26 live（HEAD `34d97f466`）：

- **根因去重**（40 note，独立子 agent 逐份阅读）：A ghost 写入 8（123/126/127/128/129/132/151/157）；B 失败回合残余 4（125/131/137/154b）；C abort 传播 3（121/122/140；121 为成功路径身份守卫缺失，跨 A/C，原语同为 LG）；D plugin/ctx 隔离 3（130/133/155）；E 过期闭包捕获 3（124/139/141）；F dispose 顺序 1（138）；G 投影过期 3（136/148/156）；H 非生命周期类 15（134/135/142/143/144/145/146/147/149/150/152/153/154a/158/159，**显式排除**）。
- **结构性事实**：A/B/F 每个修复都重新手写同样三种形态——(1) 写入排水/排序（`pendingSavesRef` 链）、(2) epoch/身份令牌失效（`switchVersionRef`/`switchTargetRef`/`draft.abortController !== abortController`/`genRef`）、(3) 出口路径残余重置（stamp-clear on return/break/throw、`isVacuousAssistantResidue`、`sanitizeDanglingToolCalls`）——各自用不同名字散落在 `use-conversation.ts` 与 `create-engine.ts`。C 族另有 generator 强制 `.return()` 与 per-yield abort 检查；D 族是 per-hook try/catch + 白名单深拷贝。
- **既有原语**：`packages/flux-core/src/utils/abort-signals.ts`（`AbortSignalLike`、`composeAbortSignals`，flux-renderers-ai **零消费**）；`packages/flux-runtime/src/abort-signal-helpers.ts`（薄壳）；`flux-core` `cloneDeep`（`utils/object.ts`）。无共享 drain、无 epoch 守卫、无出口重置、无隔离调用包装。
- **已有门禁（不重述）**：`scripts/audit/find-ai-engine-invariant-violations.mjs` 对 4 个引擎文件实施 ②post-await 必 ref 读 / ③catch-finally 控制器写需身份守卫 / ④storage 调用需 `.catch` + clearAll 全集枚举 / ⑥位移方法必 bump `switchVersionRef` / ⑧return-break-throw stamp-clear；①⑤ 为运行时测试不变式。`ai-invariant-loop-roadmap.md` 定义 Cycle I0–I6 与四机制。
- **UR-8 结论（承接）**：UR-8 逐条核验了 10 条叶级 abort 安全修复（局部 `AbortController` + cleanup、`genRef` 代际守卫、`lastActionRef` 门、subscribe-before-eval），唯一代码动作是把 dispose 双 abort 幂等写进 `renderer-reaction-handle.ts:334-335` 注记。本 plan 把这些叶级惯用法抽为原语，**保留其语义**，不回改 UR-8 已核验的调用点（迁移归 PH-5/6 且仅限 ai 包）。
- owner doc：roadmap 指定 `docs/architecture/renderer-runtime.md`，live **121,864 字节**（已超 50KB 必拆线，PH-20 范围）——本 plan 不再向其追加大段内容。

## Goals

- `@nop-chaos/flux-core` 新增 5 个零依赖原语（`utils/lifecycle/`）并从包入口导出；`@nop-chaos/flux-runtime` 入口再导出（薄壳再导出风格同 `abort-signal-helpers`；注意该文件本身现**未**从 runtime 入口导出，本 plan 的入口导出是净新增）：
  1. `createLifecycleGuard()`：epoch 令牌——`token()` / `isCurrent(token)` / `invalidate()` / `guard(token, fn)`（过期令牌下 `fn` 不执行并返回 `undefined`）。覆盖 A/C/E 的身份守卫形态。
  2. `createWriteDrain()`：按 key 串行化写入——`enqueue(key, write)` / `barrier()`（等待全部 in-flight）/ `evict(key)` / `pendingKeys()`。覆盖 A 的排水形态与 clearAll 排序。
  3. `runWithExitResets(body, resets)`：无论 return/throw/abort，`resets` 在 `finally` 中恰好执行一次且按注册逆序。覆盖 B 的出口重置形态。
  4. `linkDisposal(options)`：`{ signal?, detach?, abort, generators? }` → `dispose()`：顺序严格为 detach → generator `.return()` → abort；幂等（二次 dispose 无副作用）；外部 `signal` abort 时自动触发。覆盖 C/F。
  5. `invokeIsolated(fn, { onError, cloneArgs? })`：同步/异步统一捕获，错误交 `onError` 不外抛；可选对参数 `cloneDeep` 后再传入。覆盖 D。
- **可执行不变式清单** `docs/audits/async-lifecycle/invariant-catalog.md`：每行 = 不变式陈述 / 覆盖族 / 对应原语 / 契约测试 id / 预留扫描规则 id（PH-6 实现）；并由 `packages/flux-core/src/utils/lifecycle/invariant-catalog.test.ts` **机械校验**（约定：Test ID 必须是 `it` 标题的首个 token，清单 md 顶部写明）：清单中每个测试 id 必须在契约测试文件中以同名 `it(...)` 存在，且契约测试文件中每个 `it` 必须出现在清单（双向完备，照搬 ai-invariant-loop 表完备性机制）。
- 新 owner doc `docs/architecture/async-lifecycle-primitives.md`（最终态设计：五原语语义、拒绝的替代方案、与 UR-8/ai-invariants 的关系）；`renderer-runtime.md` §Related 加一行指针；`quick-reference.md` 加原语速查。

## Non-Goals

- 不迁移 `use-conversation.ts` / `create-engine.ts` 任何现有守卫（PH-5/PH-6）。
- 不新增/修改 `find-ai-engine-invariant-violations.mjs` 规则（PH-6 扩容）；本 plan 只**预留规则 id**。
- 不处理 G 族（投影过期）与 H 族。
- 不改 `composeAbortSignals` 语义。

## Scope

### In Scope

- `packages/flux-core/src/utils/lifecycle/{lifecycle-guard,write-drain,exit-resets,link-disposal,invoke-isolated}.ts` + `index.ts`
- `packages/flux-core/src/utils/lifecycle/lifecycle-contracts.test.ts`（契约测试，每条不变式一个 `it`）+ `invariant-catalog.test.ts`（双向完备校验）
- `packages/flux-core/src/index.ts`、`packages/flux-runtime/src/index.ts` 导出（向后兼容加法，plan-first 已满足）
- `docs/audits/async-lifecycle/invariant-catalog.md`（新）
- `docs/architecture/async-lifecycle-primitives.md`（新）、`renderer-runtime.md` Related 行、`docs/references/quick-reference.md` 速查节
- roadmap PH-4 回写、daily log

### Out Of Scope

- ai 包任何代码；scanner 规则实现；G/H 族

## Failure Paths

| 场景                    | 触发                                | 行为                                                                                        | 可重试 | 用户可见               |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- | ------ | ---------------------- |
| stale-token             | `guard(token, fn)` 时 token 已失效  | `fn` 不执行，返回 `undefined`，无抛错                                                       | 是     | 无（静默丢弃过期续体） |
| drain-write-rejects     | `enqueue` 的 write 抛错             | 该 key 链继续（错误传给 enqueue 的返回 promise），`barrier()` 仍 settle                     | 是     | 调用方处理             |
| reset-throws            | `runWithExitResets` 某 reset 抛错   | 其余 reset 仍执行；首个错误在 body 结果之后重新抛出（body 成功）或附在 body 错误 `cause` 上 | 否     | 调用方可见             |
| dispose-twice           | `dispose()` 调用两次                | 第二次 no-op                                                                                | 是     | 无                     |
| generator-return-throws | abort 时 generator `.return()` 抛错 | 吞并，继续 abort（不阻断 dispose）                                                          | 否     | 无                     |
| isolated-error          | `invokeIsolated` 的 fn 抛/reject    | `onError(error)`，返回 `undefined`                                                          | 是     | 由 onError 决定        |

## Test Strategy

本档选择：**必须自动化**——公共 API 契约（flux-core/flux-runtime 导出面）+ 核心回归路径。契约测试（Proof）先于实现（Fix）。

## Execution Plan

### Phase 1 - Proof：契约测试与清单先红

Status: completed
Targets: `packages/flux-core/src/utils/lifecycle/lifecycle-contracts.test.ts`、`invariant-catalog.test.ts`、`docs/audits/async-lifecycle/invariant-catalog.md`

- Item Types: `Proof`

- [x] `invariant-catalog.md`：13 条不变式（LG-1/2、WD-1/2/3、ER-1/2/3、LD-1/2/3、II-1/2），每行含族 / 原语 / 预留扫描规则 id（AL-01…AL-08）；头部写明 Test ID 为 `it` 标题首 token 的约定。
- [x] `lifecycle-contracts.test.ts`：13 个 `it`，import `./index.js`。
- [x] `invariant-catalog.test.ts`：读 md 表 ID 列与契约源 `it('<ID> ` 集合，双向相等。**执行修订**：解析器不设族前缀白名单（任何 `XX-n` 行都计入），否则新增族的幻影行会被静默忽略——首轮反向探针 `ZZ-9` 未红即由此发现并修正。
- [x] 先红证据：2026-10-26 `Cannot find module './index.js'`（契约文件整体红）；完备性校验 1/1 绿（13 ↔ 13）。

Exit Criteria:

- [x] 13 条不变式在 md 与测试文件中一一对应；契约测试整体先红证据已记录。

### Phase 2 - Fix：原语实现与导出

Status: completed
Targets: `packages/flux-core/src/utils/lifecycle/*.ts`、`packages/flux-core/src/index.ts`、`packages/flux-runtime/src/index.ts`、`packages/flux-core/tsconfig.json`

- Item Types: `Fix`

- [x] 五原语实现（`lifecycle-guard` / `write-drain` / `exit-resets` / `link-disposal` / `invoke-isolated` + `index.ts`），零外部依赖；`invokeIsolated` 用同包 `cloneDeep`。
- [x] `flux-core/src/index.ts` 追加值 + 类型导出；`flux-runtime/src/index.ts` 从 `@nop-chaos/flux-core` 再导出（净新增入口导出）。
- [x] **执行修订**：`invariant-catalog.test.ts` 需 `node:fs/path/url`，flux-core `tsconfig.json` 原仅 include `src` → 追加 `../../types/**/*.d.ts`（仓库 29 个包的既有模式，shim 在 `types/node-fs.d.ts`）；shim 无 `path.resolve`，测试改用 `join`。
- [x] 契约测试 13/13 + 完备性 1/1 = 14/14 绿；flux-core / flux-runtime 局部 typecheck 绿。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-core test` 含新 14 用例全绿；两包 typecheck 绿。
- [x] 反向验证：md 追加幻影行 `ZZ-9` → 完备性校验红（`1 failed | 13 passed`）；还原后 14/14。

### Phase 3 - Docs：owner doc 与速查

Status: completed
Targets: `docs/architecture/async-lifecycle-primitives.md`、`docs/architecture/renderer-runtime.md`、`docs/references/quick-reference.md`、roadmap、daily log

- Item Types: `Fix`

- [x] 新建 `async-lifecycle-primitives.md`（6.8KB）：问题=五种手写形态表；五原语签名与语义；Invariants 节；Decisions + 三条 Rejected alternatives；与 UR-8 / ai-invariants ①–⑧ 的承接关系。
- [x] `renderer-runtime.md` §Related Documents 加指针行；`quick-reference.md` 新增 "Async lifecycle primitives" 节（5 个签名）。
- [x] roadmap PH-4 行 `todo`→`planned`（含 Owner Doc 列就地勘误为新 doc，原 `renderer-runtime.md` 保留指针）；`planned`→`done` 与 daily log 随 closure 同 commit。

Exit Criteria:

- [x] 三处文档与 live 导出面一致；`pnpm check` exit 0（见 Closure Gates）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agents `agent_2ac3c850`（R1）、`agent_3a4d4c48`（R2），2026-10-26
- Verdict: R1 `fail`（1 Major / 4 Minor）→ R2 `pass`（0/0/0）
- Rounds: 2
- Findings addressed: Major——不变式实际 13 条而 plan 四处写 12（完备性门禁会因此失真）→ 全部改 13 / 新用例 14；Minor——①`abort-signal-helpers` 同模式表述澄清为"薄壳风格、入口导出为净新增"；②note 121 标注跨 A/C；③roadmap 回写须就地勘误 Owner Doc 列；④`it` 标题首 token 约定写入清单头。R1 审阅者独立抽查 8 份 bug note 分类无误、层级与 protected area 判定成立。

## Closure Gates

- [ ] 五原语落地并从 flux-core / flux-runtime 入口导出（向后兼容加法）
- [x] 13 条不变式有契约测试且双向完备校验绿（反向验证红已做）
- [x] 不迁移任何 ai 包调用点（本 plan 改动集中 flux-core/flux-runtime；`packages/flux-renderers-ai` 仅另一会话的无关脏文件，closure commit 显式列文件排除）
- [ ] 无 in-scope 项被静默降级
- [ ] owner doc 三处同步；roadmap/log 回写
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_ed7100f5`，2026-10-26，verdict `approved`（0 Blocker / 0 Major / 1 Minor，见 §Closure）
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

### G 族（投影/派生状态过期，136/148/156）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 根因是 React 层 rebuild 触发谓词过粗，不属取消/残余生命周期；roadmap PH-4 范围为 cancellation/residue。
- Successor Required: `no`（如需，由 ai 包 owner 面按 Loop Rule 另立）

### 扫描规则 `AL-01…` 的实现

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: roadmap 明文归 PH-6"门禁扩容"；本 plan 预留 id 并以契约测试 + 表完备性校验先把不变式变为可执行。
- Successor Required: `yes`
- Successor Path: roadmap PH-6（plan 待起草）

## Non-Blocking Follow-ups

- PH-5 迁移时如发现原语签名不足，按 plan guide Rule 7 在本 doc 写 Supersession Note 而非并存两套。

## Closure

Status Note: 五个异步生命周期原语落地 flux-core（flux-runtime 再导出），13 条不变式以"清单 ↔ 契约测试"双向完备门禁成为可执行清单；种子 40 份 bug note 的根因去重（8+4+3+3+3+1+3+15）落档于 catalog 族表。未迁移任何调用点（PH-5/6）；扫描规则 AL-01…08 预留。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_ed7100f5`（2026-10-26）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 1 Minor）。审计者独立实跑：flux-core 测试 742 全绿（含 14 生命周期用例）；抽查 WD-1/LD-1/II-2 断言判别性成立；自写临时探针验证异 key 并发 / 当前 token 取值 / dispose 后外部 signal 不双触发，均符合清单表述并删除探针；两扫描器实跑确认 +6/+6 与登记注记一致；`check:owner-doc-semantics` 接受 renderer-runtime 新指针行；roadmap/mission JSON 校验通过。1 Minor（closure gate 措辞 vs 他会话脏文件）以显式列文件解决。

Follow-up:

- no remaining plan-owned work。PH-5（ghost 写入 / 残余清理两族迁移）与 PH-6（abort 残留 / plugin 隔离收口 + 门禁扩容）按 roadmap 依赖链推进。
