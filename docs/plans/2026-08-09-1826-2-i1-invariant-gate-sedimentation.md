# 2 Cycle 1 / I1 — 不变式沉淀：第一批门禁（ai-invariant-loop）

> Plan Status: completed（2026-08-09 两 Phase 全 completed + 验证全绿）
> Mission: ai-invariant-loop
> Work Item: Cycle 1 / I1. 不变式沉淀（第一批门禁）
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/ai-invariant-loop-roadmap.md`（Work Item: Cycle 1 / I1 + Phase Details I1）、`docs/audits/ai-invariants/invariant-catalog.md`（I0 产出，本 plan 直接引用）
> Related: `docs/plans/2026-08-09-1826-1-i0-invariant-inventory-baseline.md`（前置依赖）

## Purpose

把 I0 不变式目录的首批 5 类不变式落为**可执行门禁**：参数化穷举测试（方法表驱动）+ **表完备性门禁**（测试表方法集 == 从 `MessageEngine`/`UseConversationReturn` 类型反查的公共变更方法集，新增方法不入表即红——治「反应式盲区」）+ `check:ai-engine-invariants` 静态门禁（入 `pnpm check`/CI）+ committed 回归测试；`engine.md` 补 §invariants 节。收口状态：engine/adapter 任何新增或重构的变更方法若违背首批不变式或未入测试表，CI 即红。

## Current Baseline

（live repo 核对，2026-08-09；依赖 I0 先落地 invariant-catalog.md）

- I0 交付物为依赖前置（尚未落地：`docs/audits/ai-invariants/invariant-catalog.md` 待 I0 产出、`docs/audits/ai-invariants/` 当前不存在）；若 I0 未收口，本 plan 不得开工。
- 执行前置：working tree 当前处于 industrial-hmi 分支合并中（`apps/playground/` 存在 UU 文件，与 AI 包无涉）——开工前确认本仓 git 合并状态已解决，避免 `pnpm check`/测试结果被污染。
- 既有反应式回归测试（per-bug、非穷举）：`engine/__tests__/engine-concurrency.test.ts`、`adapters/__tests__/use-conversation-{switch,delete-during-abort,clear-all,storage,create}.test.ts`、`renderers/__tests__/ai-silent-drop-guards.test.tsx`——保留不动，新门禁在其上增量。
- 门禁基建先例：`scripts/audit/` 扫描器框架（`shared.mjs`/`rules.mjs`）；`scripts/__tests__/` committed 回归（如 `find-event-dispatch-without-ctx.test.ts`）；`check:audit-event-dispatch-ctx` = renderer 包等价先例（一类模式落一个 check + committed 回归 + 基线零命中防回退）。
- 目标方法集（I0 枚举 + 边界裁定）：engine 公共 `sendMessage`(:290)/`send`(:291)/`abort`(:292)/`clear`(:294)/`setMessages`(:311)/`setMessageEditing`(:320)/`regenerate`(:334)（`types.ts:287-334`；`setMessageEditing` 按 I0 裁定纳入同步变更行）+ 内部管道 `runTurn`（`create-engine.ts:193`，不进表，由入口方法间接覆盖）；adapter `createConversation`/`switchConversation`/`deleteConversation`/`renameConversation`/`clearAll`；非变更白名单（I0 裁定）：`setConnector`/`registerPlugin`/`getMessages`/`getState`/`subscribe`。
- 不变式适用范围（roadmap I1 明示 + I0 裁定记录）：不变式① `isProcessing` 入口守卫适用异步变更族（`sendMessage`/`send`/`regenerate`）；`abort` 例外（守卫重置方——`create-engine.ts:509-519` 无入口守卫、负责复位 `isProcessing`，由不变式⑤覆盖）、`runTurn` 由入口方法间接覆盖——此两点偏离 roadmap ①名单，裁定记录于 I0 catalog；`clear`/`setMessages`（及 `setMessageEditing`）为同步变更方法，不适用①，但在目标集内供其他不变式（in-flight 守卫、状态一致性）覆盖。

## Goals

- `engine/__tests__/engine-invariants.test.ts` + `adapters/__tests__/conversation-invariants.test.ts`：方法表驱动的参数化穷举测试，覆盖首批 5 类不变式；含先红后绿证据。
- 表完备性门禁：**运行时机制**——测试内构造 `createMessageEngine()`（其对象字面量 `create-engine.ts:78-93` 的函数键可枚举）与 `useConversation`（`renderHook` 返回值），`Object.keys` + 函数类型过滤枚举全部公共成员，断言「每个成员 ∈ 测试表 ∪ I0 裁定的非变更白名单（`setConnector`/`registerPlugin`/`getMessages`/`getState`/`subscribe`）」（`send` 与 `sendMessage` 并列）；新增/重命名变更方法 → 出现在枚举中但不在表/白名单 → 运行时断言红（类型级断言在 esbuild 无 typecheck 的 vitest 下不成立，故用运行时枚举）。
- `scripts/audit/` 新增 engine 不变式静态扫描器 + `check:ai-engine-invariants` 入 `pnpm check` 链 + `scripts/__tests__/` committed 回归测试（违规样例必被抓 / 清洁样例零命中）。
- `docs/audits/ai-invariants/gates.md`（门禁清单，棘轮单调追加的登记处，roadmap Cross-Cutting 指定）+ `engine.md` 补 §invariants 节（引用 catalog + gates.md）。

## Non-Goals

- 不运行门禁做审计/对抗探查（I2）、不裁决（I3）、不修任何已确认缺陷（I4——本 plan 预期基线零命中，若扫描/测试意外命中 live 违背，按 I3 裁决流程移交，不在本 plan 内修）。
- 不做 Cycle 2+ 候选族（plugin 生命周期、tool-execution 并发、streaming backpressure、branching/fork）的门禁。
- 不改动既有 per-bug 回归测试的断言（仅增量新门禁文件）。

## Scope

### In Scope

- 两个参数化穷举不变式测试文件 + 表完备性门禁（运行时枚举机制，见 Goals）。
- `scripts/audit/` engine 不变式静态扫描器（覆盖静态可检测的不变式）+ `check:ai-engine-invariants` 接入 `check` 聚合链 + `scripts/__tests__/` committed 回归。
- `docs/audits/ai-invariants/gates.md`（门禁清单登记）+ `engine.md` §invariants 节。

### Out Of Scope

- 门禁结果审计（I2）、裁决表（I3）、缺陷修复（I4）。
- 纯行为不变式（①⑤）的 AST 级静态化（见 Deferred But Adjudicated）。

## Failure Paths

| 场景             | 触发                                  | 行为                                                    | 可重试 | 用户可见表现                                                     |
| ---------------- | ------------------------------------- | ------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| completeness-red | 新增/重命名公共变更方法但测试表未同步 | 不变式测试套件断言失败，exit 1                          | 是     | `pnpm --filter @nop-chaos/flux-renderers-ai test` 红，报缺表条目 |
| scanner-hit      | 代码引入静态可检测的不变式违背（②③④） | `check:ai-engine-invariants` exit 1，输出违规 `文件:行` | 是     | `pnpm check` 红                                                  |
| scanner-clean    | 无违背                                | exit 0                                                  | —      | `pnpm check` 绿                                                  |

## Test Strategy

本档选择：必须自动化

不变式门禁本身即测试（roadmap Rule 强制）。Proof 项先于 Fix 项执行：先写「注入违背 → 红」的失败用例证明门禁能抓，再恢复正确实现转绿。

## Execution Plan

### Phase 1 — 参数化穷举不变式测试（engine + adapter）

Status: completed

- Item Types: `Fix | Proof`

- [x] Proof: 先红后绿（test-first）——表完备性门禁 PROOF 测试（注入假方法 → 断言红）在两文件内各一条；engine ③ abort→send race 测试验证身份守卫不 clobber；adapter ④ storage 失败测试验证 reportStorageError 路由
- [x] Fix: `engine-invariants.test.ts`——方法表驱动参数化（表列：方法 × 不变式），覆盖异步族入口守卫①（`sendMessage`/`send`/`regenerate` 在 `isProcessing` 时的拒绝行为，对照 `create-engine.ts:199`）、runTurn/runOnce 的 catch/finally controller 身份守卫③（对照 `create-engine.ts:330-346 / 448-472`）、abort 路径清理⑤（对照 `create-engine.ts:509-517`）、同步变更方法（`clear`/`setMessages`）的 in-flight 守卫
- [x] Fix: `conversation-invariants.test.ts`——方法表驱动参数化，覆盖 await 后 `activeIdRef` 读取②（switchConversation eviction / deleteConversation post-await）、storage 变更经 `reportStorageError`④（create / rename / delete / clearAll per-id fan-out）、delete-during-abort 清理⑤
- [x] Fix: 表完备性门禁——两个测试文件内用运行时枚举断言「公共成员集 ⊆ 测试表 ∪ I0 裁定的非变更白名单」（`Object.keys(createMessageEngine())` + `renderHook(useConversation)` 函数字段）；人为新增假方法 → 断言红（proof 测试在两文件各一条）

Exit Criteria:

- [x] 两个不变式测试文件存在，`pnpm --filter @nop-chaos/flux-renderers-ai test` 全绿（66 files / 536 tests，含既有套件零回归）
- [x] 先红后绿证据 + 表完备性断言（含人为新增假方法 → 红）记录在案

### Phase 2 — 静态门禁 + CI 接入 + committed 回归 + owner-doc

Status: completed

Targets: `scripts/audit/find-ai-engine-invariant-violations.mjs`（新建）、`package.json`、`scripts/__tests__/`、`docs/components/flux-renderers-ai/engine.md`

- Item Types: `Fix | Proof`

- [x] Proof: 先红后绿 fixture——违规 fixture 必被扫描器抓到（红），清洁 fixture 零命中（绿），4 用例全绿（`scripts/__tests__/find-ai-engine-invariant-violations.test.ts`）
- [x] Fix: `scripts/audit/find-ai-engine-invariant-violations.mjs` 新增 engine 不变式扫描器（复用 `shared.mjs` 模式）：覆盖 ②await 后 bare activeId/conversations、③catch/finally 无身份守卫的 controller 写入、④storage 调用绕过 `.catch`；①⑤由 Phase 1 运行时测试覆盖
- [x] Fix: `package.json` 新增 `check:ai-engine-invariants`（对齐 `check:audit-event-dispatch-ctx` 写法）并接入 `check` 聚合链
- [x] Fix: `scripts/__tests__/find-ai-engine-invariant-violations.test.ts` committed 回归测试（4 用例：清洁 exit 0 + ④/③/② 违规各 exit 1 + `FLUX_AUDIT_SCAN_ROOT` env 临时夹具）
- [x] Proof: live 仓库全量扫描零命中（`node scripts/audit/find-ai-engine-invariant-violations.mjs` → "No invariant violations found"）
- [x] Fix: 新建 `docs/audits/ai-invariants/gates.md`——首批门禁清单（5 类不变式 × 覆盖方法 × 检测方式 × 运行命令）+ 棘轮说明
- [x] Fix: `engine.md` 补 §invariants 节（引用 `invariant-catalog.md` + `gates.md` + 门禁清单 + 运行命令 + 表完备性规则 + 棘轮说明）

Exit Criteria:

- [x] `pnpm check:ai-engine-invariants` exit 0；扫描器对 live 仓库零命中
- [x] `pnpm test:scripts` 新回归用例全绿（4/4）；`gates.md` 已建；`engine.md` §invariants 已落并引用 catalog 与 gates.md

> 意外命中处理：若 Phase 2 扫描/测试命中 live 违背，则 Phase 2 Exit 不满足，plan 转 `blocked`，按 Non-Goals 移交 I3 裁决后再继续。

## Draft Review Record

- Reviewer / Agent: Round 1 `ses_019ebacbbffe1XzAFZUPjkmUoN`；Round 2 `ses_019e4a05affeLQJ9V2fZaSnSyo`（均为 fresh session）
- Verdict: `pass`（Round 1 `revised` → 修正 → Round 2 `pass`，零 Blocker/零 Major）
- Rounds: 2
- Findings addressed:
  - [Major] 补齐 roadmap 强制的 `docs/audits/ai-invariants/gates.md` 交付（Phase 2 新增项 + Exit Criteria + Closure Gate）
  - [Major] 表完备性门禁机制改为运行时枚举（`Object.keys(createMessageEngine())` 对象字面量 + `renderHook(useConversation)` 函数字段 + 嵌套 `controller` 键 ⊆ 测试表 ∪ I0 白名单；类型级断言在 esbuild 无 typecheck 下不成立，已写入理由）
  - [Minor] I0 产出表述改为「依赖前置尚未落地」+ 不得开工硬门
  - [Minor] 不变式①适用名单偏离 roadmap（abort/runTurn 例外）已记录 + 指向 I0 catalog 裁定
  - [Minor] live 违背命中 → Phase 2 Exit 不满足 → plan 转 `blocked` → 移交 I3（已写入）
  - [Minor] `createConversation :278` 重新标注为同步镜像写；runOnce 区段标注修正；表完备性门禁补充嵌套 `controller` 断言（Round 2 Minor，已采纳）

## Closure Gates

- [x] 首批 5 类不变式均有可执行覆盖（参数化测试和/或静态扫描器），无遗漏
- [x] 表完备性门禁对新增方法红（运行时枚举机制 + proof 记录在案）
- [x] `check:ai-engine-invariants` 入 `pnpm check` 链且 live 扫描零命中；`scripts/__tests__/` committed 回归绿
- [x] `docs/audits/ai-invariants/gates.md` 门禁清单已建（棘轮登记处），与 live 门禁一致
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift
- [x] `engine.md` §invariants 已同步 live 门禁状态（引用 catalog + gates.md）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 纯行为不变式（①⑤）的 AST 级静态检测

- Classification: `optimization candidate`
- Why Not Blocking Closure: ①（isProcessing 入口守卫）与⑤（abort 清理）属于运行时行为，参数化测试已按方法表穷举覆盖，检测可靠性高于静态近似；静态扫描器覆盖静态可检测的 ②③④，门禁面已闭合。AST 级静态化收益低（误报率高）且成本高，不阻塞「新增方法即门禁红」的核心目标
- Successor Required: `no`

## Non-Blocking Follow-ups

- I2 对抗探查若发现新的静态可检测违背模式，按 Loop Rule 补入扫描器规则（新族 → Cycle 2 / I1 派生）

## Closure

Status Note: 全 2 Phase completed（2026-08-09）。Phase 1 产出 `engine-invariants.test.ts`（12 tests：①③⑤ 参数化穷举 + 表完备性门禁运行时枚举 + PROOF）+ `conversation-invariants.test.ts`（10 tests：②④⑤ 参数化穷举 + 表完备性门禁 + PROOF）= 22/22 全绿。Phase 2 产出 `find-ai-engine-invariant-violations.mjs`（②③④ 静态扫描器）+ `check:ai-engine-invariants` 入 `check` 聚合链 + committed 回归 4/4 + live 扫描零命中 + `gates.md` 门禁清单 + `engine.md` §invariants。全量 `pnpm --filter @nop-chaos/flux-renderers-ai test` 536/536 全绿零回归。独立 closure-audit PASS_WITH_MINOR（零 blocker/major；1 minor = 既有 CSS-export 测试 stale literal，非本 plan scope）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，cold context，task `ses_019c50670ffeVYwPu3hesmn0GD`，2026-08-09）
- Evidence: Verdict **PASS_WITH_MINOR**（零 Blocker/Major）。全部 Phase 1/2 交付物存在且正确：536 tests 全绿（含 22 不变式测试）、typecheck/lint clean、scanner live 零命中、scripts 回归 4/4、gates.md + engine.md §invariants 已落。F1（CSS-export stale literal 17→19）非本 plan scope。

Follow-up:

- 无 plan-owned 剩余工作；后续为 I2（门禁运行审计）
