# 1 Round-2 Surface 契约残项批次收口（audit-followups-2026-08-09-1114 待后续批次）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: audit-followups-2026-08-09-1114 待后续批次（surface 契约残项收口）
> Last Reviewed: 2026-08-09
> Source: `docs/backlog/audit-followups-2026-08-09-1114.md`（open-audit [P2-02] + multi-audit [P3-06]/[P3-07]/[P3-08]/[P3-10]，来源审计文件 `docs/audits/2026-08-09-1114-open-audit-component-audit-round2.md` / `docs/audits/2026-08-09-1114-multi-audit-component-audit-round2.md`）+ plan `docs/plans/2026-08-09-1140-2-close-on-submit-contract-closure.md` Non-Blocking Follow-ups（P3-06/07/08/10 登记「随修复批次」）+ `docs/audits/round2-index.md` §CX-n（人工路由项，见 Deferred But Adjudicated）
> Related: `docs/plans/2026-08-09-1140-2-close-on-submit-contract-closure.md`（completed，closeOnSubmit 核心语义收口）、`docs/plans/2026-08-09-1140-1-table-column-width-strategy-rework.md`（completed）、`docs/architecture/surface-lifecycle-callbacks.md`、`docs/references/quick-reference.md`

## Purpose

把 2026-08-09 11:14 两轮审计（component-audit-round2 深审轮）登记为「待后续批次」的 5 条 surface 契约残项全部收口到 landed：closeOnSubmit 编译期诊断（fieldRules）补齐、action-adapter closeOnSubmit/isolate 透传恒等 cast 清理与 `=== true` 归一化、状态发布 owner-scope 解析三处统一与 renderer 回退链收敛、quick-reference 参考文档同步。全部为小范围契约一致性 Fix + focused Proof，无对外新功能面。

## Current Baseline

（全部经 live 核对，2026-08-09；工作区 clean，1140-1/1140-2/C1a 均已提交）

- **closeOnSubmit 核心语义已收口**（plan `2026-08-09-1140-2` completed）：`triggerHook` 单点关闭、hook 失败不改变关闭决策、`docs/architecture/surface-lifecycle-callbacks.md` 双路径契约文档化、`surface-close-on-submit.test.ts` 11 用例钉住；`flux-guide/`（01-quickstart + page-dialog-drawer）已含 closeOnSubmit 用法。
- **编译期诊断缺口（P3-06）**：`packages/flux-core/src/constants.ts:124-145` `BUILT_IN_ACTION_DEFINITIONS.openDialog/openDrawer.fieldRules` 有 `body/actions/data/isolate/onClose/onSubmitSuccess/onSubmitError`，**缺 `closeOnSubmit`**；而 `types/actions.ts:89-90`（`OpenDialogActionSchema`）与 `types/runtime.ts:281-285`（`OwnedSurfaceStateBase`，`SurfaceEntry` 继承）均已声明 `closeOnSubmit?: boolean`。`constants.test.ts:117-131` 有「每 registry 条目必有 fieldRules」与 openDialog 字段断言块，但无 closeOnSubmit 断言。
- **恒等 cast + 归一化不一致（P3-07/P3-08）**：`packages/flux-runtime/src/action-adapter.ts:234,249,298,314` 四处 `(invocation.args as Record<string, unknown>)?.x` 恒等 cast（`invocation.args` 已具类型，cast 纯冗余；234/298 为 `isolate`、249/314 为 `closeOnSubmit`）；入口归一化 `=== true`（`:249,314`）与消费点 truthy 判断（`surface-runtime.ts:268,288` `if (... && entry.closeOnSubmit)`）不一致。`entry.closeOnSubmit` 类型为 `boolean | undefined`，adapter 是唯一生产者，当前运行时等价——属契约措辞分叉（审计结论：入口 `=== true` 或 JSDoc 声明「仅 `true` 生效」）。
- **owner-scope 解析分叉（P2-02，潜伏）**：`surface-runtime.ts` 状态发布三处解析不一致——`publishSurfaceStatus:46` 与 `clearSurfaceStatus:64` 用 `entry.ownerScope ?? entry.scope.parent ?? entry.scope`，`publishClosedSummary:81` 用 `inputValue.scope.parent ?? inputValue.scope`（无 ownerScope 段，`publishClosed` 输入 `types/runtime.ts:364-369` 亦无 ownerScope 字段）。`packages/flux-renderers-basic/src/use-surface-renderer.ts` 三个 `publishClosed` 调用点回退链不统一：`:340,358` 用 `declarativeScope ?? node.scope`，`:380`（cleanup 路径）用 `current.declarativeScope ?? current.ownerScope`（`cleanupRef.ownerScope` = `node.scope`，:143/157——同名不同值来源）。声明式 surface 的 `entry.ownerScope` 恒为 undefined（`openSurface` 不传 ownerScope），故当前调用面无实际差异——契约分叉仅潜伏，但三处解析链形态不一致是已确认的契约漂移。
- **参考文档缺口（P3-10）**：`docs/references/quick-reference.md:647-648` action 表 `openDialog`/`openDrawer` 行 Key args 仅 `title, body`，未反映 `closeOnSubmit`。
- 基线：DV full-green（2026-08-09 实测，10,703/0 + e2e 1086/43/3 全 watch-only 50Hz）+ `pnpm check` exit 0。

## Goals

- `BUILT_IN_ACTION_DEFINITIONS.openDialog/openDrawer.fieldRules` 补 `closeOnSubmit: { kind: 'value', valueType: 'boolean' }`，编译期诊断与实际 schema 契约一致（constants.test 断言钉住）。
- `action-adapter.ts` 四处恒等 `as Record<string, unknown>` cast 清除；`closeOnSubmit` 归一化方向裁定并统一（入口 `=== true` 与消费点一致 + JSDoc 声明）。
- `surface-runtime.ts` 状态发布三处 owner-scope 解析统一为同一形态（`ownerScope ?? scope.parent ?? scope`）；`publishClosed` 输入支持 ownerScope（向后兼容可选字段）；`use-surface-renderer.ts` 三个调用点回退链收敛为一致形态。
- `quick-reference.md` action 表 openDialog/openDrawer 行反映 `closeOnSubmit?`。
- 每条 Fix 配 focused 测试；既有 surface 测试套件零回归。

## Non-Goals

- 不改 closeOnSubmit 核心语义（已在 1140-2 收口并文档化）：本 plan 只做诊断/归一化/解析一致性，不重裁 hook 失败语义、不引入新的关闭路径。
- 不处理 CX-13+ 插入建议（ss-3 P3-2 / ss-6 P3-2 / ss-10 P3-4 pushUndo 机制级 + ss-3 P3-4 onLog 宿主接线）——roadmap Rule 要求人工确认后插入，AI 不自行增删（见 Deferred But Adjudicated）。
- 不处理 3 条 watch-only e2e（gantt-perf ×2 / kanban-perf ×1，50Hz 环境归因，DV 终态清单）。
- 不引入 `table-layout: fixed` 或任何表格宽度策略改动（1140-1 已裁决）。

## Scope

### In Scope

- `packages/flux-core/src/constants.ts` + `constants.test.ts`（P3-06）
- `packages/flux-runtime/src/action-adapter.ts` + `surface-runtime.ts` + `packages/flux-core/src/types/runtime.ts`（P3-07/P3-08/P2-02）
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`（P2-02 调用点回退链）
- `packages/flux-runtime/src/__tests__/surface-close-on-submit.test.ts` 及相关 surface 测试扩展（Proof）
- `docs/references/quick-reference.md`（P3-10）
- `docs/backlog/audit-followups-2026-08-09-1114.md` 回写终态

### Out Of Scope

- closeOnSubmit 语义再裁定、新增关闭路径、declarative surface 支持 closeOnSubmit（设计文档已声明 action-style only）
- CX-13+ 机制级共性修复（pushUndo no-op 守卫 / onLog 宿主接线）——待人工路由
- 其它 audit 扫描器/工具治理事项

## Failure Paths

| 场景                       | 触发                                                      | 行为                                                                                        | 可重试 | 用户可见表现                                           |
| -------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| fp-schema-true-string      | schema `closeOnSubmit: "true"`（字符串）                  | adapter 入口 `=== true` 归一为 false，surface 不自动关闭（fail-closed，仅布尔 `true` 生效） | 是     | 提交后 dialog 保持打开（与文档「仅 `true` 生效」一致） |
| fp-publish-closed-owner    | `publishClosed` 传入 ownerScope                           | 解析为 `ownerScope ?? scope.parent ?? scope`，发布到 owner scope（与 open/clear 同链）      | 是     | statusPath 状态落在与打开时一致的 owner scope          |
| fp-publish-closed-fallback | `publishClosed` 不传 ownerScope（现有调用）               | 回退 `scope.parent ?? scope`，行为与现状完全一致（零回归）                                  | 是     | 无可见变化                                             |
| fp-fieldrules-regression   | 存量 openDialog schema（无 closeOnSubmit 字段）经 compile | fieldRules 新增字段不产生新警告/错误（allowlist 语义核对）                                  | 是     | 无可见变化                                             |

## Test Strategy

本档选择：**建议有测**

理由：本批全部为契约一致性/诊断/文档小项，非鉴权、非对外破坏性 API 变更（`publishClosed` 输入仅加可选字段，向后兼容）。每条 Fix 配 focused 单测钉住行为（Phase 内 Proof），既有 `surface-close-on-submit.test.ts` / surface 生命周期测试零回归；全量验证归 Closure Gates。

## Execution Plan

### Phase 1 - closeOnSubmit 编译期诊断与参考文档（P3-06 + P3-10）

Status: completed
Targets: `packages/flux-core/src/constants.ts`、`packages/flux-core/src/constants.test.ts`、`docs/references/quick-reference.md`

- Item Types: `Fix | Proof`

- [x] Fix：`constants.ts:124-145` `openDialog`/`openDrawer` `fieldRules` 各补 `closeOnSubmit: { kind: 'value', valueType: 'boolean' }`（与 `types/actions.ts:89-90` 声明对齐；`validateSchemaDefinitionConstraints` 会按 `spec.valueType` 校验，达编译期诊断目的）。
- [x] Proof：`constants.test.ts:124-131` openDialog 断言块补 `closeOnSubmit` fieldRule 断言，并新增 openDrawer 断言块（同形态）；运行 `pnpm --filter @nop-chaos/flux-core test -- --grep constants` 全绿。
- [x] Proof：compile 回归——字段类型正确（`true` 布尔）或缺失 closeOnSubmit 的 openDialog schema 编译零新警告（fieldRules 为 allowlist 语义核对；flux-compiler 相关既有测试绿）；注意 `"true"` 字符串会经 `invalid-action-shape` 被编译期拒绝（fail-closed，与 fp-schema-true-string 一致）。
- [x] Fix：`docs/references/quick-reference.md:647-648` action 表 `openDialog`/`openDrawer` 行 Key args 补 `closeOnSubmit?`（指引 `docs/architecture/surface-lifecycle-callbacks.md` §「closeOnSubmit × hook 失败交互（契约）」）。

Exit Criteria:

- [x] live diff 可见 `fieldRules.closeOnSubmit` ×2 落地且 constants.test 新增断言绿（focused test 通过）。
- [x] `quick-reference.md` 两行已反映 `closeOnSubmit?`；无 compile 新警告回归。

### Phase 2 - action-adapter 恒等 cast 清理与 `=== true` 归一化（P3-07 + P3-08）

Status: completed
Targets: `packages/flux-runtime/src/action-adapter.ts`、`packages/flux-runtime/src/surface-runtime.ts`、`packages/flux-runtime/src/__tests__/surface-close-on-submit.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Decision：归一化方向裁定——保持 adapter 入口 `=== true` 为唯一布尔归一化点，消费点 `entry.closeOnSubmit` 改 `=== true` 并加 JSDoc「仅布尔 `true` 生效」；理由：adapter 是唯一生产者，入口归一化已 fail-closed 拒绝 `"true"` 等非布尔值（fp-schema-true-string）。
- [x] Fix：`action-adapter.ts:234,249,298,314` 四处 `(invocation.args as Record<string, unknown>)?.x` 恒等 cast 移除（保留 `=== true` 归一化与 `!!` 转布尔语义），直接读类型化 args。
- [x] Fix：`surface-runtime.ts:268,288` 消费点 `entry.closeOnSubmit` 改 `=== true`，`OwnedSurfaceStateBase.closeOnSubmit` JSDoc（`types/runtime.ts:281-285`）声明仅布尔 `true` 生效。
- [x] Proof：`surface-close-on-submit.test.ts` 扩展——closeOnSubmit 归一化输入矩阵（`true` / `"true"` / `undefined`）断言：仅 `true` 触发自动关闭、`"true"` fail-closed 保持打开；注意该矩阵测试须**直接构造 invocation**（绕过 compile，沿用既有测试 :308 同款做法），因 Phase 1 后编译期会拒绝 `"true"`；既有 11 用例零回归。

Exit Criteria:

- [x] 四处 cast 移除 + 消费点 `=== true` 落地（live diff 可见）；`=== true` 决策记录写回本 plan Phase 2 与 backlog 行。
- [x] 归一化输入矩阵断言全绿（`pnpm --filter @nop-chaos/flux-runtime test -- --grep "close-on-submit"`），既有用例零回归。

### Phase 3 - 状态发布 owner-scope 解析统一与回退链收敛（P2-02）

Status: completed
Targets: `packages/flux-runtime/src/surface-runtime.ts`、`packages/flux-core/src/types/runtime.ts`、`packages/flux-renderers-basic/src/use-surface-renderer.ts`、`packages/flux-runtime/src/__tests__/surface-*.test.ts`

- Item Types: `Fix | Decision | Proof`

- [x] Decision：`publishClosed` 输入扩展——`types/runtime.ts:364-369` 加可选 `ownerScope?: ScopeRef`（向后兼容，现有调用点零改型）；解析统一为 `ownerScope ?? scope.parent ?? scope`（与 `publishSurfaceStatus`/`clearSurfaceStatus` 同形态）。
- [x] Fix：`surface-runtime.ts` 三处解析收敛——`publishClosedSummary` 消费新 `ownerScope` 输入；三处提取/复用同一解析形态（不改变声明式路径现状行为：`entry.ownerScope`/新输入均 undefined 时回退链与现状一致）。
- [x] Fix：`use-surface-renderer.ts` 三个 `publishClosed` 调用点（:340/:358/:380）回退链统一为一致形态（`declarativeScope ?? node.scope`；cleanup ref 的 `ownerScope` 字段更名/对齐为 `nodeScope` 避免语义混淆，:143/:157/:380）。
- [x] Proof：focused 测试——`publishClosed` 带 ownerScope 发布到 owner scope、不带时回退 `scope.parent ?? scope`（fp-publish-closed-owner/fallback 两行钉住）；声明式 dialog 关闭 statusPath 发布行为现状回归断言（既有 surface 生命周期测试绿）。
- [x] Fix：`docs/architecture/surface-lifecycle-callbacks.md` **新增状态发布/statusPath 节**（该文档当前无此节，标题清单已核对）并写明 owner-scope 解析规则（`ownerScope ?? scope.parent ?? scope`）——按 Phase 实际结果定稿：语义变更如实写，仅形态统一则注明解析链形态。

Exit Criteria:

- [x] 三处解析同形态 + `publishClosed` 可选 ownerScope 落地（live diff + typecheck 通过）；use-surface-renderer 三调用点回退链一致。
- [x] P2-02 两条 focused 断言绿 + 既有 surface 测试零回归（`pnpm --filter @nop-chaos/flux-runtime test` 与 `pnpm --filter @nop-chaos/flux-renderers-basic test` 局部跑绿）。
- [x] `surface-lifecycle-callbacks.md` 新增状态发布节与 live 解析一致（Phase 实际结果为准）。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写（见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`）。

- Reviewer / Agent: 独立 fresh session（task `ses_01ab75ac4ffemYlEdJ8WtIRcHi`，2026-08-09，输入 = 本 plan + live repo 核对）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major（四项维度全 pass：可想象性——P2-02 输入携带 ownerScope 为唯一可行方案（调用点 entry 已移除，store 查找不可行）、声明式路径行为保持零回归论证成立、P3-08 方向行为等价成立；格式完整性、内容稳健性、引用准确性 18 项引用全部 live 核对通过）。6 条 Minor 全部处理：①「6 条 watch-only」改 3 条（DV 终态 gantt-perf ×2 + kanban-perf ×1）；② `SurfaceEntry.closeOnSubmit` 措辞改 `OwnedSurfaceStateBase`（:281-285，继承关系注明）；③ `surface-lifecycle-callbacks.md` 无状态发布节——改「新增状态发布/statusPath 节」并注明标题清单已核对；④ quick-reference 指引锚点改 §「closeOnSubmit × hook 失败交互（契约）」（:305）；⑤ constants.test 无 openDrawer 断言块——改「openDialog 块补断言 + 新增 openDrawer 块」；⑥ Phase 2 `"true"` 矩阵测试须直接构造 invocation 绕过 compile（Phase 1 后编译期拒绝 `"true"`，沿用既有 :308 做法），Phase 1 Proof 注明编译期 `invalid-action-shape` fail-closed。达成共识后翻转 active。

## Closure Gates

- [x] 全部 5 条 backlog 项（P2-02 / P3-06 / P3-07 / P3-08 / P3-10）landed，`docs/backlog/audit-followups-2026-08-09-1114.md` 对应行回写终态。
- [x] 无 in-scope confirmed live defect / contract drift 被静默降级到 deferred 或 follow-up。
- [x] 契约结果达成：fieldRules 诊断一致、`=== true` 归一化一致、owner-scope 解析三处一致、quick-reference 反映 closeOnSubmit。
- [x] focused verification 完成（Phase 1-3 Proof 全绿，既有 surface 测试零回归）。
- [x] 受影响 owner docs 已同步：`quick-reference.md`（scope 内交付）、`surface-lifecycle-callbacks.md`（Phase 3 结果为准）、backlog 回写；无其它 owner-doc 漂移。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（exit 0，零新增命中）

## Deferred But Adjudicated

### CX-13+ 插入建议（pushUndo no-op 守卫 + onLog 宿主接线）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 已由 `round2-dr-adjudication.md` §2 裁决 keep（P3 语义维持：no-op 命令仅产生 1 条空 undo 条目 + dirty 瞬态误标，无数据损坏、无用户可见功能损失；默认宿主非用户可见）；roadmap Rule 明文「新 work item 由人工确认后插入；AI 不自行增删改优先级」——本批不承接，待人工路由。
- Successor Required: `yes`（人工确认后插入 round2 roadmap 或 successor mission）

### 3 条 watch-only e2e（gantt-perf ×2 / kanban-perf ×1，50Hz 归因）

- Classification: `watch-only residual`
- Why Not Blocking Closure: DV 终态清单（2026-08-09 实测），主屏 50.00Hz rAF 上限致 60Hz 阈值不可达，需 60Hz 环境最终确认；与 surface 契约无交集。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无新增。本 plan 承接的 5 条为 backlog 全部「待后续批次」条目；收口后 `audit-followups-2026-08-09-1114.md` 达零悬挂。

## Closure

Status Note: 2026-08-09 执行完成并收口。Phase 1-3 全部 completed：P3-06 fieldRules `closeOnSubmit` ×2 补齐（constants.test + flux-compiler compile 回归：`"true"` 编译期 `invalid-action-shape` fail-closed）；P3-07 四处恒等 cast 移除；P3-08 Decision（adapter 入口 `=== true` 为唯一归一化点）+ 消费点 `=== true` + JSDoc + 归一化矩阵测试（true/`"true"`/undefined）；P2-02 `publishClosed` 可选 ownerScope 输入 + 三处解析统一 `ownerScope ?? scope.parent ?? scope`（`resolveStatusOwnerScope` 复用）+ use-surface-renderer 三调用点回退链统一 + focused 测试 4 用例；P3-10 quick-reference 两行补 `closeOnSubmit?`。全量验证：typecheck/build/lint 32/32 + test 59/59 + `pnpm check` exit 0。closure-audit 独立 fresh session pass（task `ses_01a68658effeMnp4YZgFsGd2oL`）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh session（task `ses_01a68658effeMnp4YZgFsGd2oL`，2026-08-09，输入 = 本 plan + diff summary + verification output）
- Evidence: Verdict `pass`——① plan 文本一致性：3 Phase completed + Phase 1-3 全 checklist [x]，仅 Closure Gates 未勾（含 audit gate，执行 session 未自审）；② live 核对：constants.ts ×2、action-adapter 四 cast 移除（余留 `as Record<string, unknown>` 仅 :226/:290 合法非恒等 + 既有 :135/:232/:296）、surface-runtime `=== true` ×2 + `resolveStatusOwnerScope` 3×、types/runtime ownerScope 可选 + JSDoc、use-surface-renderer nodeScope ×3 统一；③ focused 测试实测：close-on-submit + status-publish 16 passed、constants closeOnSubmit 1 passed、compile closeOnSubmit 1 passed、drawer-and-dispose 5 passed 零回归、`pnpm check` exit 0；④ deferred 诚实：CX-13+（out-of-scope improvement，人工路由）+ 3 watch-only e2e（watch-only residual），无 in-scope 静默降级；⑤ doc 同步：quick-reference 两行 + 脚注、surface-lifecycle-callbacks 状态发布节与 live 解析一致、backlog 5 行终态「已收口」。

Follow-up:

- 无 remaining plan-owned work（5 条 backlog 条目全部 landed，`audit-followups-2026-08-09-1114.md` 达零悬挂；CX-13+ 待人工路由，3 条 watch-only e2e 维持 DV 终态清单）。
