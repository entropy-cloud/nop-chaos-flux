# 759 PH-6 ai 迁移收口 + 门禁扩容 + 闭环四机制落实

> Plan Status: completed
> Last Reviewed: 2026-10-26
> Source: `docs/backlog/platform-hardening-roadmap.md` PH-6（B 组收口；依赖 PH-5 ✓）；mission `missions/platform-hardening-b.json`
> Related: plan `757`（原语 + AL 规则 id 预留）、plan `758`（Deferred：stamp → `runWithExitResets`；④ `?.(` 盲区）；`docs/audits/ai-invariants/invariant-catalog.md`（⑧/⑨ 族）

## Purpose

完成 B 组闭环：把 PH-5 显式 deferred 的两项迁移落地（B 族 stamp 残余 → `runWithExitResets`；D 族已隔离的 plugin 钩子 → `invokeIsolated`），同步**扩容** `check:ai-engine-invariants`（⑧ 接受包装器形态、④ 补 `?.(` 盲区、新增 AL-07），并以证据落实四机制（门禁单调 / 表完备 / 类别清扫 / Loop Rule 裁决）。

## Current Baseline

全部为 2026-10-26 live（HEAD `a5992ce43`）：

- **stamp（B 族）**：`create-engine.ts` `pendingBranchId` 由 `regenerate` 置位（`:686`），正常在 `runOnce` 消费（`:462`）；三处手工清理守护非消费出口——connector-missing 早返回 `:232`、abort break `:277`、catch 路径 `:365`。规则 ⑧（`find-ai-engine-invariant-violations.mjs:387-538`，含 throw 路径子规则）按 `function runTurn(` 定位函数体，要求 `runOnce(` 之前的每个 `return;`/`break;`/throw 路径前缀含 `pendingBranchId =`；若 runTurn 体内无 `runOnce(` 则 **`continue` 静默跳过**——意味着"把 runTurn 改成包装器"若不同步升级规则，门禁会静默失效（单调性风险）。
- **plugin 钩子（D 族）**：6 个调用点契约不同——`onTurnStart` `:267`、`onBeforeRequest` `:480`、`onAfterRequest` `:562` **有意外抛**（回合以失败结算，⑨ 契约）；`onCompletionChunk` `:541` 同步直调；仅 `onError`（`callPluginError` `:417-424` per-plugin try/catch）与 `onTurnEnd`（`:399-408` try/catch 写 lastError）是**隔离**语义。`invokeIsolated` 只应用于后两者。
- **④ 盲区**：`scanStorageCalls` 正则 `storage\?\.(\w+)\s*\(` 不匹配可选调用 `storage?.deleteConversation?.(`（plan 758 closure audit 发现，HEAD 即如此）。
- 扫描器文件 **690 行**（700 硬门禁）；新规则须抽模块（先例 `scripts/audit/marker-rules.mjs`）。
- 扫描器测试 `scripts/__tests__/find-ai-engine-invariant-violations.test.ts` fixture 驱动（`FLUX_AUDIT_SCAN_ROOT` + `makeFixture`），现有 ⑧ 用例 6 条。
- ai 包测试基线 853/853。

## Goals

- `runTurn` = `runWithExitResets(() => runTurnBody(incoming), [clearPendingBranchStamp])` 包装器；三处手工清理删除；`runOnce` 消费保留。
- `callPluginError` 与 `onTurnEnd` 调用改经 `invokeIsolated`（onError 的 onError 回调 = no-op 吞并，保持"插件错误不改变回合结果"；onTurnEnd 的 onError 回调 = 原 lastError 写入逻辑）。
- 扫描器扩容（抽模块 `scripts/audit/ai-invariant-rules-al.mjs`）：
  - ⑧ 升级（三分支）：(a) `runTurn` 体内含 `runWithExitResets(` 且其 resets 数组文本含 `pendingBranchId`，或引用的函数名在文件内定义且函数体含 `pendingBranchId =` → 包装器形态通过；(b) 体内含 `runOnce(` → 沿用逐出口规则；(c) **既无 `runOnce(` 也无 `runWithExitResets(` → 红**（替代原 `continue` 静默跳过，封住重命名/重构漏洞——这是单调性的实质）。包装器存在但 resets 不含 stamp 清理 → 红（新 fixture）。
  - ④ 正则改 `storage\??\.(\w+)(?:\?\.)?\s*\(`（审阅者实测覆盖 `storage?.m?.(` / `storage?.m(` / `storage.m(` 四形态；原拟 `\??\s*\(` 不匹配 `?.(`）；红-first fixture：`storage?.x?.(…)` 无 `.catch` → 红。
  - AL-07（新）：`create-engine.ts` 内 `plugin.onError?.(` / `plugin.onTurnEnd?.(` 只能出现在 `invokeIsolated(` 调用参数内（同语句窗口 3 行，先剥 `//` 注释再匹配，避免注释内提法误红）；裸调用 → 红。
- 四机制证据：①单调——规则只增（⑧ 加接受形态不删旧检查、④ 收窄、AL-07 新增），fixture 数只增；②表完备——`docs/audits/ai-invariants/invariant-catalog.md` 加 AL-07 行与 ⑧' 行，`docs/audits/async-lifecycle/invariant-catalog.md` 的 AL-05/AL-07 "reserved" 改 "implemented (plan 759)"；③类别清扫——plugin 钩子 6 处逐一裁定（4 处外抛契约保留、2 处迁移）写入本 plan；④Loop Rule——PH-6 收口是否发现新失败类：裁决写入 roadmap B 组。

## Non-Goals

- 不改 4 个外抛契约钩子的语义。
- 不迁移 `switchVersionRef`（维持 plan 758 watch-only 裁定，本轮未见第二处同形态）。
- 不实现 AL-01/02/03/04/06/08（无对应迁移面可验证；保持 reserved，Loop Rule 复触发时再做）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/engine/create-engine.ts`
- `scripts/audit/find-ai-engine-invariant-violations.mjs`（④ 正则、⑧ 包装器接受、调用新模块）、`scripts/audit/ai-invariant-rules-al.mjs`（新：AL-07）
- `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`（+5 fixture 用例）
- 两份 invariant catalog、roadmap PH-6 + B 组 Loop Rule 裁决、daily log

### Out Of Scope

- use-conversation.ts；其它 AL 规则

## Failure Paths

| 场景                    | 触发                                             | 行为                                  | 可重试 | 用户可见                  |
| ----------------------- | ------------------------------------------------ | ------------------------------------- | ------ | ------------------------- |
| turn-exit-any           | runTurnBody 任一出口（return/break/throw/abort） | stamp 必清                            | 是     | 下一回合不带错误 branchId |
| plugin-onError-throws   | 插件 onError 抛                                  | 吞并，回合结果不变                    | 是     | 无                        |
| plugin-onTurnEnd-throws | 插件 onTurnEnd 抛                                | 写 lastError（身份守卫 + 不覆盖既有） | 是     | lastError                 |
| wrapper-without-reset   | 代码改成包装器但忘记 stamp reset                 | ⑧ 红                                  | 是     | `pnpm check` 红           |
| optional-call-storage   | `storage?.x?.(` 无 `.catch`                      | ④ 红                                  | 是     | 红                        |
| bare-isolated-hook      | onError/onTurnEnd 裸调                           | AL-07 红                              | 是     | 红                        |

## Test Strategy

本档选择：**必须自动化**。判别面：ai 853 用例（含 bug 137 stamp 泄漏回归、⑨ 隔离回归）+ 扫描器 fixture 先红后绿。

## Execution Plan

### Phase 1 - Proof：扫描器 fixture 先红

Status: completed
Targets: `scripts/__tests__/find-ai-engine-invariant-violations.test.ts`

- Item Types: `Proof`

- [x] +6 用例已落（⑧ 包装器无 reset / ⑧ 包装器 clean / ⑧ 既无 runOnce 也无包装器 / ④ `storage?.x?.(` 无 catch / AL-07 裸 / AL-07 clean）。
- [x] 先红证据：2026-10-26 实现前 `4 failed | 19 passed (23)`——四条违规 fixture 红（当前规则 continue 跳过 / 正则盲区 / 无 AL-07），两条 clean 绿。

Exit Criteria:

- [x] 先红证据在本节。

### Phase 2 - Fix：规则扩容 + 引擎迁移

Status: completed
Targets: `scripts/audit/find-ai-engine-invariant-violations.mjs`、`scripts/audit/ai-invariant-rules-al.mjs`（新）、`scripts/audit/ai-invariant-rules-stamp.mjs`（新）、`create-engine.ts`

- Item Types: `Fix`

- [x] `ai-invariant-rules-al.mjs`：`scanIsolatedPluginHooks`（AL-07，剥注释，前 2 行窗口）。**执行修订 A**：主文件加入 ⑧′ 分支后达 718 行 → 把整个 ⑧ 族（`scanBranchStampReset` + `classifyStampWrapper`）抽到 `ai-invariant-rules-stamp.mjs`（236 行），主文件回落 513 行。
- [x] ④：正则 `storage\??\.(\w+)(?:\?\.)?\s*\(`；**执行修订 B**：盲区修复后首次看见 live 两处 try/catch 内的 `?.(` 调用（switch 的 `loadMessages`、delete 的 `deleteConversation`）与两处注释内提法 → 规则增加 `//` 注释剥离 + 接受调用前 3 行内 `try {` 为合法失败路径（`.catch` 或 try 二者之一）。
- [x] ⑧′ 三分支落地；**执行修订 C**：classifier 函数正则补 TS 返回类型 `(): void {`。**执行修订 D**：既有全规则 clean fixture 的 `runTurn` 既无 runOnce 也无包装器（旧规则年代写就）→ 补 `runOnce` 消费行 + 前缀 stamp 清理使其合规（不弱化规则）。
- [x] `create-engine.ts`：`clearPendingBranchStamp()` + `runTurn` 包装器 + `runTurnBody`；三处手工清理删除（注释改为指向包装器）；`runOnce` 消费保留；`callPluginError` → `void invokeIsolated(() => plugin.onError?.(…), [], { onError: () => undefined })`；onTurnEnd → `await invokeIsolated(…, { onError: lastError 身份守卫写入 })`。
- [x] fixture 23/23；ai 853/853 零漂移；scanner live exit 0。

Exit Criteria:

- [x] 扫描器测试 23/23；ai 853/853；包 typecheck 绿。
- [x] 反向探针：wrapper resets 去掉 stamp reset → ⑧ 红（:222）；onError 改裸调 → AL-07 红（:428）；均还原（diff 仅迁移本体 +32/−25）。
- [x] 主文件 513 行 ≤ 700。

### Phase 3 - 四机制证据与回写

Status: completed
Targets: 两份 catalog、roadmap、daily log

- Item Types: `Decision` + `Fix`

- [x] ai-invariants catalog §12（⑧′ / ④ / AL-07 + 类别清扫 6 钩子裁定表）；async-lifecycle catalog 头部 AL-05（runTurn 面）/ AL-07 标 implemented，其余 reserved + 复触发条件。
- [x] 四机制证据：①单调——规则只增（⑧ 加接受形态并把静默跳过改红、④ 收窄、AL-07 新增），fixture 17→23；②表完备——两份 catalog 同步，async-lifecycle 的 catalog↔契约测试双向校验持续绿；③类别清扫——6 钩子逐项裁定落 §12；④Loop Rule——无新失败类 → B 组稳态暂停，三条复触发条件写入 roadmap §B 组。
- [x] roadmap PH-6 `todo`→`planned`→`done`（closure 同 commit）；daily log（closure 同 commit）。

Exit Criteria:

- [x] 文档与 live 一致；`pnpm check` exit 0（见 Closure Gates）。

## Draft Review Record

- Reviewer / Agent: fresh-session sub-agents `agent_a93fd459`（R1）、`agent_fc037c7c`（R2），2026-10-26
- Verdict: R1 `fail`（1 Blocker / 1 Major / 3 Minor）→ R2 `pass`（0/0/0）
- Rounds: 2
- Findings addressed: Blocker——拟定 ④ 正则 `\??\s*\(` 实测不匹配 `?.(` → 改 `(?:\?\.)?\s*\(`（审阅者实测四形态）；Major——⑧ 升级须在"既无 runOnce 也无包装器"时红（替代静默 continue）+ 第 6 条 fixture；Minor——⑧ 规则跨度 :387-538、AL-07 剥注释、fixture 预暂存说明。R1 独立确认 stamp 每出口清理语义安全（regenerate 同步调用 runTurn）、invokeIsolated 同步调用 fn 保持 onError 扇出顺序。

## Closure Gates

- [x] stamp 包装器 + 手工清理删除；onError/onTurnEnd 经 invokeIsolated（外抛钩子零改动）
- [x] ⑧/④/AL-07 规则扩容，fixture 先红（4/23）后绿（23/23），live exit 0
- [x] 四机制证据落文（ai-invariants §12 + async-lifecycle 头部 + roadmap §B 组）
- [x] 无 in-scope 项被静默降级（AL-01..06/08 reserved + 复触发条件）
- [x] 由独立子 agent（fresh session）执行的 closure audit 已完成并记录证据——`agent_ca1162d4`，2026-10-26，verdict `approved`（0 Blocker / 0 Major / 1 Minor，见 §Closure）
- [x] `pnpm typecheck` 45/45
- [x] `pnpm build` 45/45
- [x] `pnpm lint` 45/45
- [x] `pnpm test` 84/84（ai 853/853；test:scripts 4 pre-existing 红为 plan 754 披露项）
- [x] `pnpm check` exit 0（create-engine 压缩注释回落 698 行；knip 修 classifyStampWrapper 未用导出）

## Deferred But Adjudicated

### AL-01/02/03/04/06/08 扫描规则

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 对应原语在 ai 包内尚无迁移面（LG/LD 未迁移），规则无真实命中可验证先红；按 Loop Rule 在复触发时实现。
- Successor Required: `no`（Loop Rule 条件触发）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: B 组闭环收口——stamp 残余经 `runWithExitResets` 包装器框架化（⑧′ 接受形态 + 静默跳过改红，单调性封口），隔离钩子经 `invokeIsolated`（AL-07），④ 盲区修复；四机制证据落文，Loop Rule 裁决 B 组稳态暂停（三条复触发条件）。

Closure Audit Evidence:

- Auditor / Agent: fresh-session sub-agent `agent_ca1162d4`（2026-10-26）
- Evidence: verdict `approved`（0 Blocker / 0 Major / 1 Minor）。审计者独立实跑：ai 853/853、fixture 23/23、live scanner exit 0、oversized exit 0（create-engine 698 / 主文件 513）、flux-core 742/742、`pnpm check` exit 0；三条自做反向探针（resets 去 stamp / onTurnEnd 裸调 / fixture neither-token）全红并精确还原；逐行核验迁移语义（onError 扇出先于状态写入、onTurnEnd 身份守卫保留、外抛钩子零改动）；单调性判定：旧 ⑧ 执法逐字保留 + 静默 continue 变红，④ 只放宽检测且受注释剥离/3 行 try 窗口约束。1 Minor（resets 数组提取取首个括号对的鲁棒性注记）登记为观察项。

Follow-up:

- no remaining plan-owned work。B 组稳态暂停；复触发见 roadmap §B 组 Loop Rule 裁决。
