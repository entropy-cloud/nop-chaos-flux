# 1 扫描 P1 候选吸收收口（19-1/19-2/23-1/23-2 修复）

> Plan Status: completed
> Mission: component-audit
> Work Item: 扫描 P1 候选吸收（CR Phase 3 追加项补执行）
> Last Reviewed: 2026-08-06
> Source: `docs/backlog/component-audit-roadmap.md`（扫描发现路由登记区 19-1/19-2/23-1/23-2 四行）、`docs/plans/2026-08-06-0529-1-gate-truthfulness-and-finding-routing.md`（Phase 4 R2 + 路由裁决）、`docs/plans/2026-08-06-0329-1-cr-cross-family-centralized-remediation.md`（Phase 3 checklist 139-142 四行追加未执行）、`docs/analysis/2026-08-05-multi-audit-component-audit/{19,23}.md`
> Related: CR plan `2026-08-06-0329-1`（completed，但 4 条追加项未执行）、0529-1（路由裁决）、CV `2026-08-06-0329-2`（全量验证基线）

## Purpose

把 multi-audit 扫描 R2 确认属实、经 0529-1 Phase 4 显式追加进 CR plan（`2026-08-06-0329-1`）Phase 3 checklist 但**未被执行**的 4 条扫描 P1 候选（19-1 tree-session ack 看门狗、19-2 calendar exportToPNG 错误传播、23-1 xui-roles-plugin 死代码、23-2 gantt/components 死代码家族）补执行收口：每条 test-first 修复/裁决落地 + 回归测试 + roadmap 扫描发现路由登记区四行回写 fixed/裁决留痕，使「扫描 P1 候选吸收」真正闭环（CR plan 关闭时遗留的未勾选项由本 successor 承接，历史 plan 不回写）。

## Current Baseline

- **CR plan 关闭缺口**：`2026-08-06-0329-1` Phase 3 checklist `:139-142` 四行仍为 `[ ]`（19-1/19-2/23-1/23-2），但 plan 已标 `completed` 且 closure audit（task `ses_02ae79cffffeOaffBS4f6RwlLg`）通过——in-scope 未勾选项被带关，违反 plan guide Rule 19/20；按 Rule 21 历史 plan 不回写，本 successor plan 承接。
- **19-1 tree-session 无 ack 看门狗（live 属实）**：`packages/flow-designer-renderers/src/tree-session.ts:259-263`——success 分支 `inFlight = null; notify(); return;` 后**不移队首**（queue head 滞留），且全文件无 ack 超时/放弃上报路径；`dispatchNext` 共三处调用（失败分支 `:286`、ack-accepted 路径 `:397`（`applyAckOrEcho` 内 `queue.shift()` 后）、外部 `designer-tree-mode.tsx:104`），success-无-ack 且宿主永不 ack 时队列可被卡住；`tree-session.test.ts` 无 success-无-ack-后续入队用例。
- **19-2 calendar exportToPNG 错误传播（live 属实）**：`packages/flux-renderers-scheduling/src/calendar/calendar.tsx:224-226`——`case 'exportToPNG': void exportRef.current.exportToPNG(); return { ok: true };`（void 丢弃 + 谎报 ok）；`calendar/hooks/use-calendar-export.ts:66-74` catch 内 `setExportError(msg)` 后 `throw err` rethrow → handle 路径 unhandled rejection + 成功谎报。注：R2 登记路径 `calendar/use-calendar-export.ts` 已移入 `calendar/hooks/`（live 核对修正）。
- **23-1 xui-roles-plugin 死代码（live 属实）**：`packages/flux-runtime/src/plugins/xui-roles-plugin.ts` + `xui-roles-plugin.test.ts`（12 测试）——全仓仅自身源码+测试引用，无 barrel 导出、无 exports 深路径（`flux-runtime/src/index.ts` 未导出）；`runtime-factory.ts:101` `sortRendererPlugins(input.plugins)` 表明存在宿主插件注入点，plugin 本身是 AMIS `xui:roles` pruning 的能力实现。
- **23-2 gantt/components 死代码家族（live 属实）**：`packages/flux-renderers-scheduling/src/gantt/components/` 下 `export-handles.tsx`、`filter-bar.tsx`、`scheduler-config.tsx`、`resource-load-view.tsx`、`resource-load-grid.tsx`、`resource-load-timeline.tsx`、`resource-load.ts` 及其测试（export-handles.test/filter-bar.test/scheduler-config.test/resource-load.test）——零生产引用（grep 全包仅组件族内部互引）；**`baseline-bars.tsx` 为 live**（`gantt.tsx:18` 使用，不在死家族内）。gantt handle（`gantt.tsx:306-335`）仅注册 zoomIn/zoomOut/scrollToToday/scrollToTask；`docs/components/gantt/design.md` §8.3（`:294-308`）仅列 getTask/getLink/getState/scrollTo/setZoom 为「未实现（设计超前）」（不涉 exportPNG）；exportPNG/PDF/Excel 的设计面在独立文档 `docs/components/gantt/design-export.md`（`component:exportPng` 句柄 `:23`、实现文件标注 `gantt/components/export-handles.tsx` `:40`）——若裁「删除」，该文档即指向已删实现，需同步其状态标注。
- **验证基线（CV 实测 2026-08-06）**：typecheck/build/lint 32/32、test 59/59（10,397 passed/0 failed）、e2e 1054 passed/43 skipped/6 watch-only、`pnpm check` 仅 oversized 14 既有 pre-existing red。

## Goals

- 4 条扫描 P1 候选全部收口：19-1/19-2 修复落地（test-first + 回归测试），23-1/23-2 显式裁决（接线/导出或删除）并落地，零悬挂。
- roadmap 扫描发现路由登记区 19-1/19-2/23-1/23-2 四行回写为 fixed/裁决留痕（含 CR plan 未勾选项的 successor 承接说明）。
- 受影响包（flow-designer-renderers、flux-runtime、flux-renderers-scheduling）focused 测试全绿；workspace 全量验证保持 CV 基线（零新增失败）。

## Non-Goals

- **不回写 CR plan 文本**（历史 plan，Rule 21；承接关系记录于本 plan、roadmap 登记区与 daily log）。
- 不处理 roadmap 其他 deferred 项：watch-only e2e flake（CV 已复验归因，Successor Required: no）、推荐句柄未实现（显式路由未来 capability 面组件计划，非 component-audit 路线）、`pnpm check` pre-existing oversized 治理（独立治理 successor）。
- 不做新审计维度、不重开已 closed 审计卡。
- 不新增公共 API 结构性变更：23-1/23-2 裁决触及 flux-runtime 导出面或删除文件时按 mission 授权执行并留痕理由；若裁决「删除」，仅删死代码文件与对应测试，不动 live 文件（如 baseline-bars）。

## Scope

### In Scope

- 19-1：`tree-session.ts` ack 看门狗或 success 移队首（二选一裁决）+ success-无-ack-后续入队回归测试。
- 19-2：`calendar.tsx` exportToPNG handle 消费 promise（.catch 消费或 async 返回 `{ok:false,error}`）+ `use-calendar-export.ts` rethrow 语义收敛 + focused 测试。
- 23-1：`xui-roles-plugin.ts` 裁决——barrel 导出（补契约测试）或删除并归档测试。
- 23-2：`gantt/components` 死家族裁决——接线（gantt handle 增加 exportPng 等，对照 design-export.md 状态同步）或删除（含 design-export.md 引用一致性标注）；`resource-load.ts` 纯函数可保留但移除死 UI 消费者。
- roadmap 扫描发现路由登记区四行回写 + daily log 记录。

### Out Of Scope

- CR plan 其他已落地内容复验（已 closure）。
- flow-designer/graph 域的 5 项 successor 登记（0556-1 裁决表：14-4/15-1/15-2/17-2/19-3）。
- 其余 14 个既有超限文件治理、i18n 残留、dim 17 文档漂移（均已收口）。

## Failure Paths

| 场景编号               | 触发                       | 行为                                                        | 可重试 | 用户可见表现                                     |
| ---------------------- | -------------------------- | ----------------------------------------------------------- | ------ | ------------------------------------------------ |
| tree-session-ack-stuck | success 后无 ack、后续入队 | 看门狗上报 host issue 并放弃/移队首，队列不永久卡死         | 否     | host issue 事件；树文档写回不再重复派发          |
| calendar-export-fail   | html2canvas/toBlob 失败    | handle 返回 `{ok:false,error}` 或消费后 UI 呈现 exportError | 是     | 错误信息显示；无 unhandled rejection；不谎报成功 |
| xui-roles-delete-guard | 删除后发现外部消费方       | 删除前全仓 grep 实证 + barrel 面检查；发现消费方改走导出    | 否     | 无（编译期验证）                                 |
| gantt-family-delete    | 删除后发现 live 引用       | 删除前逐文件 grep 实证（含相对路径 import 检查）            | 否     | 无（typecheck 验证）                             |

## Test Strategy

本档选择：`必须自动化`

- 19-1/19-2 为 R2 确认的 live defect（flow-designer 写回协议、calendar 导出错误路径），且 19-1 属公共层协议逻辑（flux-action-core 消费者），按 roadmap「自动修复机制」§3 必须 test-first（先写失败测试断言正确行为，再实现）。
- 23-1/23-2 为死代码裁决：若裁「删除」，以「全仓 grep 零引用 + typecheck/build 绿」为自动化证明；若裁「导出/接线」，补契约测试。
- Proof 项先于 Fix 项（guide Rule 12）。

## Execution Plan

### Phase 1 - 19-1 tree-session ack 看门狗（flow-designer-renderers）

Status: completed
Targets: `packages/flow-designer-renderers/src/tree-session.ts:259-263`、`packages/flow-designer-renderers/src/tree-session.test.ts`

- Item Types: `Decision | Proof | Fix`

- [x] **Decision（修复方向）**：裁决 19-1 修复形态——a) success 分支与失败分支同构：`queue.shift()` 后 `void this.dispatchNext(generation)`（success 移队首，队列不滞留）；b) 补 inFlight ack 超时看门狗（超时后上报 host issue + 放弃/移队首）。以 a 为基础、b 为叠加（若 a 已消除卡死则不叠 watch-only residual）。**Decision 必须显式裁决 success-shift 与 ack 协议的两个副作用**：① `applyAckOrEcho`（`tree-session.ts:366`）ack-accepted 路径在 `queue.shift()` 时更新 `acceptedBaselineDigest`（`:394`），echo/conflict 快速路径（`:404` 起）消费该值——success-shift 若不同步更新 `acceptedBaselineDigest`，宿主后续 echo 会被判 `stale-ack`/走 fallback；② success 分支本质是「dispatch 完成即确认」语义，与「等待宿主 ack 确认」协议并存，需明确 success-shift 时 digest 采纳口径（对齐 ack 路径：`acceptedBaselineDigest = head.digest`）并记录裁决理由。
- [x] **Proof（test-first）**：`tree-session.test.ts` 新增 success-无-ack-后续入队用例：dispatch 返回 success 后，再 enqueue 新 tree change，断言新 change 被派发（旧 head 不重复派发）；以及 success 后队列 head 已出队、`dispatchNext` 可推进。另补 success-shift 后宿主 echo 不为 stale-ack 的断言（校验 Decision ① 的 digest 口径）。先红（当前 live：success 不移队首）后绿。
- [x] **Fix**：按 Phase 1 Decision 落地 `tree-session.ts`（success 分支移队首 + dispatchNext + digest 采纳；如裁 b 则补看门狗计时与上报路径）；保持 `applyHostInput`（`:311`）与 `applyAckOrEcho`（`:366`）既有 epoch/ack 协议语义与 `tree-session.test.ts:239-289` ack 用例不变。
- [x] flow-designer-renderers 包 `pnpm --filter @nop-chaos/flow-designer-renderers typecheck` + 相关测试全绿。

Exit Criteria:

- [x] success-无-ack-后续入队回归用例存在且先红后绿证据记录；`tree-session.ts` success 分支不再滞留队列 head（live 核对 `:259-263` 行为变化）。
- [x] flow-designer-renderers 包局部 typecheck + focused 测试通过。

### Phase 2 - 19-2 calendar exportToPNG 错误传播（scheduling）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:224-226`、`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:66-74`、相关测试

- Item Types: `Decision | Proof | Fix`

- [x] **Decision（错误面形态）**：裁决 exportToPNG handle 语义——a) handle 内 `.catch` 消费（错误已由 `setExportError` 呈现，返回 `{ok:true}` 但注释明确「错误已呈现」）；b) `capabilities.invoke` async 返回 `{ok:false, error}`（ComponentCapabilities.invoke 支持 Promise 返回，`component-handle-core.ts` 已允许）；对照其他 handle 先例（gantt scrollToTask 返回 `{ok:false,error}`）优先 b。
- [x] **Proof（test-first）**：calendar 相关测试（`calendar.test.tsx` 或 hooks 测试）新增：exportToPNG 失败（mock html2canvas reject）→ handle 返回 `{ok:false,error}` 或错误已呈现、无 unhandled rejection、不谎报 `{ok:true}`；AbortError 路径保持静默返回。先红后绿。
- [x] **Fix**：按 Phase 2 裁决落地 `calendar.tsx` exportToPNG/exportToPrint case + `use-calendar-export.ts` catch 语义收敛（rethrow 是否保留取决于 handle 消费方式；若 handle .catch 消费则消除 unhandled rejection）。
- [x] scheduling 包 `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` + 相关测试全绿。

Exit Criteria:

- [x] exportToPNG 失败路径测试先红后绿证据记录；live 核对 `calendar.tsx:224-226` 与 `use-calendar-export.ts` catch 不再产生 unhandled rejection + 成功谎报。
- [x] scheduling 包局部 typecheck + focused 测试通过。

### Phase 3 - 23-1 xui-roles-plugin 死代码裁决（flux-runtime）

Status: completed
Targets: `packages/flux-runtime/src/plugins/xui-roles-plugin.ts`、`xui-roles-plugin.test.ts`、`packages/flux-runtime/src/index.ts`

- Item Types: `Decision | Proof | Fix`

- [x] **Decision（保留/删除）**：全仓 grep 实证复核（自身+测试之外零引用）+ `runtime-factory.ts:101` 插件注入点核对——裁决 a) barrel 导出（`plugins/xui-roles-plugin.ts` 经 `src/index.ts` 或 `src/runtime-plugins.ts` 导出，补契约测试：插件名称 `flux:xui-roles` + prune 语义可从公共面消费）；b) 删除 + 归档测试（记录 AMIS parity 能力移除理由）。倾向：插件为 AMIS `xui:roles` 能力实现且有宿主注入点，优先 a（补契约测试）；若导出面触碰包公共 API，按 mission 授权留痕理由。
- [x] **Proof**：若裁 a，新增契约测试（从公共导出面 import + 行为断言）；若裁 b，记录删除前 grep 实证清单。
- [x] **Fix**：按裁决落地（导出 + 契约测试，或删除文件 + 归档测试至 `docs/archive/` 或记录）。
- [x] flux-runtime 包 `pnpm --filter @nop-chaos/flux-runtime typecheck` + 测试全绿；`pnpm check` 无新增命中。

Exit Criteria:

- [x] 23-1 裁决记录 + 落地证据（导出面测试绿 / 删除后全仓零引用）；live 核对 barrel 或归档路径存在。
- [x] flux-runtime 包局部 typecheck + 测试通过；`pnpm check` 零新增命中。

### Phase 4 - 23-2 gantt/components 死代码家族裁决（scheduling）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/components/{export-handles,filter-bar,scheduler-config,resource-load-view,resource-load-grid,resource-load-timeline,resource-load}.{ts,tsx}` 及测试、`gantt.tsx` handle

- Item Types: `Decision | Proof | Fix`

- [x] **Decision（接线/删除）**：逐文件 grep 实证（含相对路径 import，已确认 baseline-bars 为 live）——裁决 a) 接线：gantt handle 增加 exportPng 等（export 设计面在 `docs/components/gantt/design-export.md`，实现文件即 `gantt/components/export-handles.tsx`；接线需同步 design-export.md 状态，design.md §8.3 不涉 exportPNG）；b) 删除死家族（export-handles/filter-bar/scheduler-config/resource-load-\* + 测试），`resource-load.ts` 纯函数按 R2 口径「可保留但移除死 UI 消费者」或一并归档。倾向：design-export.md 为设计超前面、当前无宿主消费方 → 优先 b 删除（含测试归档），并同步 design-export.md 标注实现已移除/未实现；接线（a）仅在存在宿主消费需求时选。**两种路径都必须处理 design-export.md 的引用一致性**（删除 → 标注实现移除；接线 → 标注已实现）。
- [x] **Proof**：删除/接线前逐文件 grep 零生产引用证据记录（区分 baseline-bars live）；若接线，补 handle 契约测试。
- [x] **Fix**：按裁决落地（删除死家族文件 + 测试归档，或接线 + design-export.md 状态同步）。
- [x] scheduling 包 `pnpm --filter @nop-chaos/flux-renderers-scheduling typecheck` + 测试全绿；相关 e2e（c9-host-surfaces 等）零新增失败。

Exit Criteria:

- [x] 23-2 裁决记录 + 落地证据（删除后 gantt 包零死引用 / 接线后 handle 测试绿）；live 核对文件系统状态。
- [x] scheduling 包局部 typecheck + 测试通过；相关 e2e 零新增失败。

### Phase 5 - roadmap 登记区回写与收口记录

Status: completed
Targets: `docs/backlog/component-audit-roadmap.md`（扫描发现路由登记区）、`docs/logs/2026/08-06.md`

- Item Types: `Fix | Follow-up`

- [x] **Fix（roadmap 回写）**：扫描发现路由登记区 19-1/19-2/23-1/23-2 四行状态更新——标注「已由 successor plan `2026-08-06-2027-1` 修复/裁决（fixed / 删除）」+ CR plan 未勾选项承接说明；`rg "已追加 CR plan Phase 3 checklist"` 相关行核对。
- [x] **Follow-up（daily log）**：daily log 记录 4 条收口证据、CR plan 关闭缺口说明、Phase 1-4 裁决摘要。

Exit Criteria:

- [x] roadmap 四行状态与 live 一致（fixed/裁决留痕）；daily log 条目存在且记录裁决与证据。

## Draft Review Record

> 起草后、执行前由独立子 agent（fresh session）审查；共识达成后本 plan 升级 `active`。

- Reviewer / Agent: round 1 task `ses_028f13b86ffeq0JQJiy8mZA9WN`（verdict `revised`）+ round 2 task `ses_028ebfc98ffeaVFRQkOAwY0LfC`（verdict `pass-with-minors`，零 Blocker/零 Major）
- Verdict: `pass-with-minors`
- Rounds: 2
- Findings addressed: Round 1 Major 1（`applyHostPropUpdate` 幻影函数 → 改为 `applyHostInput` :311 / `applyAckOrEcho` :366 并补充 ack 协议侧效果裁决）；Major 2（exportPNG 未实现标注误引 design.md §8.3 → 改为 design-export.md :23/:40 并补删除路径引用一致性同步）；Minor 1（dispatchNext 两处 → 三处：:286/:397/designer-tree-mode.tsx:104）；Minor 2（success-shift × acceptedBaselineDigest :394/echo fast-path :404 副作用显式裁决）；Minor 3（接线路径 doc 同步目标改为 design-export.md）。Round 2 Minor（`src/plugins.ts` 不存在 → `src/runtime-plugins.ts`；Phase 2 Fix「Phase 1/2 裁决」→「Phase 2 裁决」）已一并处理。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全部 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 4 条扫描 P1 候选（19-1/19-2/23-1/23-2）全部修复或显式裁决落地，零悬挂
- [x] 各修复项 focused 回归测试存在且断言正确行为（非仅 not-throw）
- [x] roadmap 扫描发现路由登记区四行回写与 live 一致；CR plan 未勾选项承接说明已记录
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（guide Rule 16）
- [x] 受影响的 owner docs（roadmap、daily log）已同步到 live baseline；历史 CR plan 按 Rule 21 不回写
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（独立 fresh sub-agent task `ses_028c7a22affeeDAfTMpUs1t6FQ` verdict approved，零 Blocker/零 Major，证据见 Closure Audit Evidence；本项由 executor 于审计 pass 后 finalization 勾选）
- [x] `pnpm typecheck`（32/32）
- [x] `pnpm build`（32/32）
- [x] `pnpm lint`（32/32，scheduling 1 条预存在 warning）
- [x] `pnpm test`（59/59 task，10,388 passed / 0 failed）

## Deferred But Adjudicated

### tree-session inFlight ack 超时看门狗（若 Phase 1 裁决仅选 success 移队首）

- Classification: `watch-only residual`
- Why Not Blocking Closure: success 移队首已消除队列滞留与重复派发（R2 建议的两种修复形态二选一即可成立）；host ack 超时属宿主侧协议保障，且当前无成功-无-ack 卡死实证路径，不构成 supported baseline 缺陷。
- Successor Required: `no`

### 推荐句柄未实现（json-view/collapse/wizard/pagination `component:*`）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: CR plan 已裁决（design.md 明示「推荐支持」非承诺契约），显式路由未来 capability 面组件计划（非 component-audit 路线）。
- Successor Required: `yes`
- Successor Path: 未来 capability 面组件计划（非 component-audit 路线，CR plan Deferred 已登记）

## Non-Blocking Follow-ups

- 23-1/23-2 若裁「删除」：归档测试与 AMIS parity 能力移除理由记录于裁决表/daily log，供未来 capability 计划检索（非本 plan debt）。
- flow-designer/graph 域 5 项 successor（0556-1 裁决表 14-4/15-1/15-2/17-2/19-3）维持原路由，不因本 plan 变化。

## Closure

Status Note: 4 条扫描 P1 候选全部收口——19-1/19-2 live defect 修复落地（test-first 先红后绿 + 回归测试），23-1 裁决「导出」（AMIS `xui:roles` parity 能力 + 宿主注入点 + 自认 API 缺口，补公共面契约测试），23-2 裁决「删除」（设计超前面无消费方，测试归档 + 两 design 文档标注 + 16 条失效 i18n 键清理）；roadmap 登记区四行回写 fixed/裁决留痕（含 CR plan 带关未勾选项的 Rule 21 承接说明）；受影响包 focused 全绿（flow-designer-renderers 227 / scheduling 842 / flux-runtime 1399），全量门禁 typecheck/build/lint 32/32 + test 59/59（10,388 passed / 0 failed）+ `pnpm check` 仅 14 既有 pre-existing oversized 零新增；独立 fresh sub-agent closure-audit **approved**（零 Blocker/零 Major，2 Minor 非阻塞信息项）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent task `ses_028c7a22affeeDAfTMpUs1t6FQ`（2026-08-06，本 executor 之外的新会话）
- Evidence: verdict `approved`——逐 Phase live 核对落地（tree-session.ts:259-272 success-shift + digest 采纳 + 2 回归用例先红后绿；calendar.tsx:224-231 promise 消费 `{ok:false,error}` + !blob reject + handle/hook 4 新用例 + unhandledRejection 零断言；flux-runtime barrel 导出 + 3 契约用例；gantt 7 源文件 + 4 测试删除、baseline-bars 保留、归档目录 4 文件、design-export.md/design-filter-sort-group.md 标注、16 键零引用）；决策诚实性核对（watchdog 分类 watch-only residual 理由成立、无静默降级）；文本一致性（5 Phase completed + 全部 [x] + audit gate 待本审计授权）；三包测试复跑全绿 + anchors 308 docs 零失效。2 Minor 非阻塞：vitest.config.ts:16 历史注释提及 resource-load（历史记录非 live 引用）；Closure Gates 审计前为 `[ ]` 属诚实待审态。

Follow-up:

- no remaining plan-owned work（19-1/19-2/23-1/23-2 全部收口；watchdog 为 watch-only residual Successor Required: no；推荐句柄未实现维持 CR plan Deferred 路由）
- 非本 plan debt：flow-designer/graph 域 5 项 successor（0556-1 裁决表 14-4/15-1/15-2/17-2/19-3）维持原路由
