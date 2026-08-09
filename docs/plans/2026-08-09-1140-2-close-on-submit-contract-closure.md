# {2} closeOnSubmit 契约收口（owner 文档漂移 + 失败语义分叉 + 测试加固）

> Plan Status: completed
> Last Reviewed: 2026-08-09
> Source: `docs/audits/2026-08-09-1114-multi-audit-component-audit-round2.md`（[P1-01] owner 架构文档与 closeOnSubmit 契约矛盾 + 零提及 + Mandatory Updates 违约；[P2-02] hook 失败语义分叉；[P2-03] 顺序契约断言缺失；[P2-04] 失败路径假绿窗口）
> Related: `docs/logs/2026/08-09.md`（未提交 WIP = closeOnSubmit 功能）、`docs/plans/2026-08-09-1140-1-table-column-width-strategy-rework.md`

## Purpose

收口 closeOnSubmit（openDialog/openDrawer 提交成功自动关闭）跨包契约：①owner 架构文档 `docs/architecture/surface-lifecycle-callbacks.md` 与 live 实现直接矛盾（3 处无条件断言失效 + 全文零提及 closeOnSubmit + AGENTS.md Mandatory Updates 未履行）；②closeOnSubmit × hook 失败语义分叉未文档化、零测试；③「hook 先跑后关闭」顺序契约只有注释声称、断言检测不出反转；④渲染器失败路径测试用固定 50ms 延时断言「保持打开」，存在系统性假绿窗口。目标：契约文档重写为双路径模型、失败语义收口并钉住契约、顺序与失败路径测试加固。

## Current Baseline

（全部经 live 核对，2026-08-09 未提交工作区）

- **实现已落地**：`packages/flux-runtime/src/surface-runtime.ts:259-286` `triggerHook`——submit:success 的 onSubmitSuccess nodes dispatch 完成后（含无 nodes 的 skipped 路径 `:265-269`），若 `entry.closeOnSubmit` 则 `close(entry.id)`（`:278-280`）；submit:error 不关闭。`action-adapter.ts:249,314` openDialog/openDrawer 把 `args.closeOnSubmit === true` 传入 options。`form.tsx` 三条提交路径（Enter/表单内按钮/footer 按钮）汇合到 `triggerHook('submit:success')`。
- **测试基线**：`surface-close-on-submit.test.ts`（5 例）+ `dialog-close-on-submit.test.tsx`（5 例）新增；`pnpm --filter @nop-chaos/flux-runtime test` = 1411 passed、`pnpm --filter @nop-chaos/flux-renderers-form test` = 777 passed（与 daily log 一致）。
- **P1-01 文档漂移（已 live 复核）**：`docs/architecture/surface-lifecycle-callbacks.md`——`:287`「submit hooks 不自动关闭 surface」在 `closeOnSubmit: true`（nop-entropy 生成器默认输出主路径）下为假；`:313/:320-324` 仍把 `submitForm.then: closeSurface` 推荐为唯一规范关闭写法（已被 closeOnSubmit 取代，且该写法对 Enter 提交不生效）；`:356`「onClose 不会在 submit 成功后自动触发」在 closeOnSubmit 自动关闭路径（fire onCloseNodes）下不成立；字段表/schema 块 `:44-58` 缺 closeOnSubmit 行；全文零 `closeOnSubmit` 命中。`flux-guide/design-patterns/page-dialog-drawer.md:226` 显式把读者路由到该文档 → 读者得到与代码相反、与 guide §6.2 矛盾的结论。daily log 2026-08-09 Doc-sync 清单只覆盖 flux-guide 5 文件，未更新任何 `docs/architecture/`，违反 AGENTS.md Mandatory Updates。
- **P2-02 失败语义分叉（已 live 复核）**：`surface-runtime.ts:272-285`——`dispatchInOwner` 对 hook action 失败（如 refreshNearest notFound:error）返回 `{ok:false}` 不抛错 → surface 照常关闭（分支 B）；只有抛错（owner runtime teardown 等）进 catch → 不关闭（分支 C）。两种失败表征产生相反关闭结果；未在任何文档表达；`form.tsx:214-226` 返回值被丢弃。
- **P2-03 顺序断言缺失（已 live 复核）**：`surface-close-on-submit.test.ts:53-56` 两条事后断言（notifySpy 被调用 + entries 归零）无法检测「先 close 再 dispatch」的反转；而「先刷新后关闭」是 daily log 与 flux-guide §6.2 显式文档化的顺序契约（close → disposeOwnedScope 销毁 surface scope）。
- **P2-04 假绿窗口（已 live 复核）**：`dialog-close-on-submit.test.tsx:202-205` 唯一同步点是 `env.fetcher` 被调用（不等 resolve），随后盲等 50ms 断言「OK 仍在」——只能检测 50ms 内关闭的缺陷，无法区分「永不关闭」与「稍后关闭」。

## Goals

- `surface-lifecycle-callbacks.md` 重写为双路径关闭模型（推荐路径 `closeOnSubmit: true` / 显式编排路径 `submitForm.then: closeSurface`），`:287/:313/:320-324/:356` 全部与 live 行为一致，字段表补 closeOnSubmit 行，Hook Error Semantics 节覆盖 closeOnSubmit × hook 失败交互。
- closeOnSubmit × hook 失败语义收口：二选一（与 AMIS 对齐的「close 只绑定 submit 成功」或保留「hook 失败不关闭」），实现 + unit 测试 + 文档契约锚点三者一致。
- 「hook 先跑后关闭」顺序契约被可检测断言钉住（`invocationCallOrder` 或等价证明）。
- 渲染器失败路径测试改为同步到失败链终态信号再断言打开（消除 50ms 盲等假绿窗口）。
- daily log 补记架构文档同步条目（Mandatory Updates 履约）。

## Non-Goals

- **不改 closeOnSubmit 的核心成功语义**（submit:success 后自动关闭、submit:error 不关闭）——已由生成器侧与 guide 文档化；hook 抛错分支的关闭行为属 Phase 1 裁决范围（选项 (a) 下会改变该分支，属失败语义收口而非核心成功语义）。
- 不新增 AMIS 之外的新能力（如 confirm-on-close、closable 细化等）。
- 不处理 table 列宽修复（plan `2026-08-09-1140-1`）。
- 不处理 P3-07（`as Record` 恒等转换）、P3-10（quick-reference 表）等记录在案项——随修复批次或 backlog 处理，不在本 plan Fix 面。
- 不重写 `flux-guide` 已同步内容（仅核对一致性，不改语义）。

## Scope

### In Scope

- `docs/architecture/surface-lifecycle-callbacks.md` 重写（Fix，P1-01）。
- closeOnSubmit × hook 失败语义裁决 + 实现 + 测试 + 文档（Fix/Decision/Proof，P2-02）。
- 顺序契约断言加固（Fix/Proof，P2-03）。
- 失败路径测试终态同步（Fix/Proof，P2-04）。
- daily log 架构文档同步条目（Fix）。

### Out Of Scope

- table 列宽策略（plan `2026-08-09-1140-1`）。
- open-audit [P2-02] `publishClosedSummary` owner-scope 解析（backlog）。
- P3-05..10 记录在案项（除与 P2-02 同源修复的相邻清理外，见 Phase 1 item 说明）。

## Failure Paths

> 不适用：本 plan 无外部 IO/鉴权/错误码契约；唯一契约面（hook 失败关闭行为）在 Phase 1 Decision 中显式裁决并测试钉住。

## Test Strategy

本档选择：`必须自动化`

- closeOnSubmit 是公开 runtime API 契约（`SurfaceRuntime.open` options + `BUILT_IN_ACTION_DEFINITIONS`）与表单提交核心回归路径；失败语义分叉与顺序契约是审计确认的零测试约束点——对应 Proof 项须在 Fix 之前先行（test-first）。
- P2-04 是测试正确性问题：改写测试同步点即为修复本身（先改测试红 → 证伪原断言 → 新断言绿）。

## Execution Plan

### Phase 1 - 失败语义裁决 + 契约测试钉住（Decision + Proof + Fix）

Status: completed
Targets: `packages/flux-runtime/src/surface-runtime.ts`、`packages/flux-runtime/src/__tests__/surface-close-on-submit.test.ts`

- Item Types: `Decision | Proof | Fix`

- [x] **Proof（测试先钉住当前分叉）**：新增 unit 用例——hook action 返回 `{ok:false}` → 关闭；hook 抛错 → 不关闭（当前行为实证）；用例在裁决落地前为 red/green 基准记录。（2026-08-09 落地：`surface-close-on-submit.test.ts` +2 用例，裁决前全绿基线 1413 passed。）
- [x] **Decision（失败语义收口）**：二选一——(a) 与 AMIS 对齐（推荐）：close 只绑定 submit 成功，catch 分支也关闭，删除分叉；(b) 保留「hook 失败不关闭」：`{ok:false}` 时跳过 close 且 form.tsx 消费结果做 warn/notify。**裁决 = (a) AMIS 对齐**。理由：①AMIS 语义——`closeOnSubmit` 只绑定 form 提交成功，owner 侧 hook（刷新/导航/上报）是提交成功后的副作用，hook 失败不代表提交失败；②与 guide §6.2「提交失败不关闭」一致性——submit:error（真正提交失败）仍不关闭，hook 失败不属于提交失败；③可预测性——`{ok:false}` 与抛错两种失败表征统一为同一关闭行为，删除分叉；④用户可重试性（反方论据，不阻断）——刷新失败后 dialog 关闭看似不可重试，但提交本身已成功，重试入口在外层数据区，且 hook 失败经 form.tsx `console.warn` 可诊断；保留 dialog 会与 AMIS 语义冲突并诱导重复提交。
- [x] **Fix（按裁决落地）**：`surface-runtime.ts:272-285` 与 `form.tsx` 消费侧按裁决实现（(a) 删除分叉）；P2-02 关联的 `form.tsx:177-186` try/catch 死代码与 `{ok:false}` 静默丢弃（P3-05 相邻项）一并处理。（2026-08-09 落地：`triggerHook` 重构为单点关闭决策——hook dispatch try/catch 捕获后统一走 close 判断；`form.tsx` 消费 `hookResult.ok`、失败 `console.warn`、删除死 catch；JSDoc 同步。）
- [x] **Proof（契约测试）**：按裁决 (a) 断言——hook 抛错 → 关闭；hook `{ok:false}` → 关闭；无 closeOnSubmit 时两种 hook 失败 → 保持打开；`submit:error` → 不关闭（既有）；closeOnSubmit 相关用例 10+ 全绿。（2026-08-09 落地：`surface-close-on-submit.test.ts` 11 用例全绿，含提交成功 × 抛错/{ok:false} × 有无 closeOnSubmit × submit:error 全象限。）

Exit Criteria:

- [x] 裁决记录存在（Plan 文本或 daily log 引用）；`surface-runtime.ts` 与 `form.tsx` 消费侧与裁决一致（live 可核验）。
- [x] 失败语义 unit 断言绿（抛错/`{ok:false}` 两分支各按裁决成立）；`pnpm --filter @nop-chaos/flux-runtime test` 全绿（closeOnSubmit 相关 10+ 用例在内）。（1417 passed / 0 failed）

### Phase 2 - owner 契约文档重写（Fix，P1-01）

Status: completed
Targets: `docs/architecture/surface-lifecycle-callbacks.md`、`docs/logs/2026/08-09.md`

- Item Types: `Fix`

- [x] **Fix（双路径模型重写）**：`:287` 修订为「默认不自动关闭；`closeOnSubmit: true` 时 submit:success 自动关闭（先跑 onSubmitSuccess 再关闭；submit:error 不关闭；hook 失败分支的关闭行为按 Phase 1 裁决口径）」；`:313/:320-324` 修订为双路径推荐（closeOnSubmit 为主，`submitForm.then: closeSurface` 标注「仅按钮点击生效、Enter 失效」）；`:356` 修订说明 onClose 是否触发取决于关闭路径；字段表 `:44-58` 补 closeOnSubmit 行（类型/默认值/行为）。（2026-08-09 落地：§Triggering Order 重写为双路径关闭模型 + 标准 CRUD 示例迁移到推荐路径，`rg closeOnSubmit` 命中 10+ 处。）
- [x] **Fix（Hook Error Semantics 节）**：新增/修订 closeOnSubmit × hook 失败交互契约节，与 Phase 1 裁决一致。（2026-08-09 落地：新增「closeOnSubmit × hook 失败交互（契约）」小节，含两种失败表征统一关闭、submit:error 恒不关闭、诊断路径与实现锚点。）
- [x] **Fix（daily log）**：`docs/logs/2026/08-09.md` Doc-sync 清单补记架构文档同步条目（Mandatory Updates 履约）。（2026-08-09 落地：顶部新增本 plan 收口条目。）

Exit Criteria:

- [x] `surface-lifecycle-callbacks.md` 全文无与 live 实现矛盾的断言（`:287/:313/:320-324/:356` 逐条修订后与 `surface-runtime.ts:259-286` 一致）；`rg "closeOnSubmit" docs/architecture/surface-lifecycle-callbacks.md` 有命中（字段表 + 双路径节）。
- [x] daily log 08-09 条目已补架构文档同步记录。

### Phase 3 - 顺序断言 + 失败路径测试加固（Fix + Proof）

Status: completed
Targets: `packages/flux-runtime/src/__tests__/surface-close-on-submit.test.ts`、`packages/flux-renderers-form/src/__tests__/dialog-close-on-submit.test.tsx`

- Item Types: `Fix | Proof`

- [x] **Fix（P2-03 顺序断言）**：对 `surfaceRuntime.store.remove`（或 close 路径可观测点）spy，断言 `notifySpy.mock.invocationCallOrder[0] < removeSpy.mock.invocationCallOrder[0]`（或等价「hook 执行瞬间 entries 仍为 1」断言）；注释声称与断言一致。（2026-08-09 落地：首例加 `removeSpy` + `invocationCallOrder` 断言 + 注释；临时改为先 close 再 dispatch 时该断言变红验证通过后还原；顺带收口 P3-09 `notifySpy` restore。）
- [x] **Fix（P2-04 终态同步）**：`dialog-close-on-submit.test.tsx:202-205` 改为同步到失败链终态信号（`env.notify` 收到 error toast 或 `submitting` 回到 false）后再断言「OK 仍在」；删除 50ms 盲等（或改为有界 waitFor 并注明理由）。（2026-08-09 落地：测试 schema 加 `onSubmitError: showToast`，以 submit:error hook 的 error toast 为失败链终态信号——ajax 默认 toast 在 renderer 流程中被 onActionError 诊断通道抑制，`submitting` 无 DOM 可观测面；50ms 盲等已删除。）
- [x] **Proof（回归）**：runtime + form 包 closeOnSubmit 相关测试全绿；`dialog-close-on-submit.test.tsx` 与 `surface-close-on-submit.test.ts` 10+ 用例绿。（2026-08-09 落地：runtime 1417 / form 777，closeOnSubmit 相关 runtime 11 例 + renderer 5 例全绿。）

Exit Criteria:

- [x] 顺序反转可被检测（将实现临时改为先 close 再 dispatch 时该断言变红——以 test comment 或手动验证记录为准）；50ms 盲等已删除/替换为终态同步（live diff 可核验）。
- [x] `pnpm --filter @nop-chaos/flux-runtime test`、`pnpm --filter @nop-chaos/flux-renderers-form test` 全绿。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: task `ses_01b5f72d3ffeb2IKahWzr2ZvzL`（独立 fresh session plan review，2026-08-09）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；Minor 已全部处理——①两处错误 Phase 指针（「Phase 2」→「Phase 1」，Scope 与 Failure Paths）；②Deferred 标题「P3-05..10」→「P3-06..10」（P3-05 在 scope 内）；③Phase 2 item 1 措辞去选项 (b) 预设（按裁决口径中性表述）；④Non-Goal 1 补「hook 抛错分支属 Phase 1 裁决范围」消除与选项 (a) 的张力；⑤Exit Criteria 测试命令改为整包全绿（避免 --grep 语义误导）；⑥标题 `{2}` 保留任务编号规范。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 所有 in-scope confirmed contract drift 已收敛（surface-lifecycle-callbacks.md 与 live 实现一致）
- [x] closeOnSubmit × hook 失败语义已裁决并测试钉住（无未文档化分叉）
- [x] 顺序契约可被断言检测；失败路径测试无假绿窗口
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs（surface-lifecycle-callbacks.md、daily log）已同步到 live baseline
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### P3-06..10 记录在案项（fieldRules 遗漏 closeOnSubmit、as Record 转换、=== true vs truthy 归一化、notifySpy restore、quick-reference 表）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 均为 P3 级记录在案项（multi-audit 结论），不影响 closeOnSubmit 契约成立；除与 P2-02 同源修复相邻的 `form.tsx` 消费侧（Phase 1 已含）外，其余随修复批次处理（`docs/backlog/audit-followups-2026-08-09-1114.md` 登记，来源审计文件路径可追溯）。
- Successor Required: `no`（backlog 登记即为交接物）

## Non-Blocking Follow-ups

- P3-06 `BUILT_IN_ACTION_DEFINITIONS.fieldRules` 补 `closeOnSubmit: { kind: 'value', valueType: 'boolean' }`（编译期诊断，随修复批次）。
- P3-08 schema 入口 `=== true` vs 消费点 truthy 归一化（当前行为等价，种子项）。
- P3-09 `notifySpy` restore（测试卫生，随修复批次）。
- P3-10 quick-reference action 表补 `closeOnSubmit?`（建议级）。

## Closure

Status Note: 完成——Phase 1-3 全部落地（失败语义裁决 (a) AMIS 对齐 + 契约测试 11 用例钉住；owner 架构文档双路径重写；顺序断言 + 失败路径终态同步），全量验证 typecheck/build/lint 32/32、test 59/59 tasks = 10,754 passed / 0 failed、`pnpm check` exit 0（oversized 2 豁免维持基线）；closure-audit 由独立 fresh session 执行 pass；closeOnSubmit 核心成功语义未改（Non-Goal 遵守）。

Closure Audit Evidence:

- Auditor / Agent: task `ses_01acb9f30ffeonIkanBP6fYV4b`（独立 fresh session closure audit，2026-08-09）
- Verdict: `pass`（零 Blocker/Major）
- Evidence: 六项核对全 PASS——A 计划文本一致性（三 Phase 全 `[x]` + Status completed；Plan Status 审计前保持 active 正确）；B live 代码语义（surface-runtime.ts:261-292 单点关闭决策、双失败分支统一关闭、submit:error 恒不关闭；form.tsx:162-185 消费 result.ok + warn）；C 测试（11 用例 + invocationCallOrder 顺序断言 + spy restore；50ms 盲等已删除）；D 文档一致性（rg closeOnSubmit 13 命中、双路径模型、Hook Error Semantics 契约节、daily log 条目）；E deferred 诚实性（P3-05/P3-09 已收口、P3-06/07/08/10 真 out-of-scope）；F 计数可复现（runtime 1417 / form 777 精确复现）。Minor×2：diff summary 措辞（无实害）、backlog P3-09 行注记（审计后已补「已随 plan 顺手收口」）。

Follow-up:

- 无 plan-owned 剩余工作（P3-06/07/08/10 记录在案随修复批次，见 `docs/backlog/audit-followups-2026-08-09-1114.md`；open-audit P2-02 `publishClosedSummary` 归 backlog 待后续批次，均非本 plan 承接）
