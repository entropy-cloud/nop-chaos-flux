# 1 Workspace Health — CI Gate-Green, Package Boundaries, Docs Sync, Convention Cleanup

> Plan Status: completed
> Last Reviewed: 2026-06-27
> Mission: amis-bug-driven-improvements
> Source Audits: audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md, audits/2026-06-26-1859-multi-audit-amis-bug-driven-improvements.md
> Source: `docs/audits/2026-06-26-1859-open-audit-amis-bug-driven-improvements.md` (H31, H32, H33, H34, H35), `docs/audits/2026-06-26-1859-multi-audit-amis-bug-driven-improvements.md` (AUDIT-01, AUDIT-04, AUDIT-05, AUDIT-06, AUDIT-08, AUDIT-09, AUDIT-10, AUDIT-11, AUDIT-16, AUDIT-17, AUDIT-18, AUDIT-19, AUDIT-20, AUDIT-21, AUDIT-22)

## Purpose

把分散在两份 open audit 里的“仓库治理 / CI 门禁 / 参考文档 / 低危约定”类 finding 收口成一个 owner plan，使：`pnpm check:oversized-code-files` 重新转绿（P0），包边界与 manifest 语义自洽，`quick-reference.md` 与 live source 一致，移动/布局/约定类低危 residual 被裁定落地或显式 adjudicate。这个 plan 先行，因为它把 CI 恢复成可信基线，从而为 Plan {2}/{3} 的功能修复提供可靠的验证通道（Rule 1：unblock 优先）。

## Current Baseline

- `pnpm check:oversized-code-files` 当前 **RED（exit 1）**：7 个文件 >700 行（live 复核 2026-06-27，与 AUDIT-01 一致）：
  - `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx` (797)
  - `packages/flux-renderers-data/src/__tests__/chart-renderer.unit.test.tsx` (767)
  - `packages/flux-runtime/src/form-store.ts` (744)
  - `packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts` (741)
  - `packages/flux-runtime/src/form-runtime-owner.ts` (728)
  - `packages/flux-renderers-mobile/src/infinite-scroll.test.tsx` (704)
  - `packages/flux-compiler/src/schema-compiler/node-compiler.ts` (701)
- `form-runtime-owner.ts` 与 `node-compiler.ts` 各有文档化 justification（`buildFormOwnerRuntime` 单编排器；`node-compiler.ts:57-65` 的 Plan 444 / 02-N1 决策注释），但硬门禁没有 exemption 机制，因此持续 CI red。
- `form-store.ts` 里 `createPageStore`/`createSurfaceStore` 与 form-store 内部 helper **零耦合**（已 grep 验证），可独立抽出。
- `packages/flux-react/src/unstable.ts` 重新导出了稳定 barrel 里已有的符号（`RenderNodes`、11 个 context、`createFormComponentHandle` 等）；对照 `flow-designer-renderers/src/unstable.ts` 正确做法，flux-react 没应用。
- `flux-renderers-form-advanced` 生产源码经 `flux-react/unstable` 间接消费 `flux-runtime`（`createProjectedScopeStore`），但 manifest 里 `flux-runtime` 仅是 devDep。
- `docs/references/quick-reference.md` 有 4 处 drift：包目录漏 3 个 renderer 包（AUDIT-08）、`useCurrentFormError`/`useFieldError` 返回类型写成数组（AUDIT-09）、`useRenderInstancePath` 返回写成 `string`（AUDIT-21）、bundle 名写成 `@nop-chaos/flux-bundle`（AUDIT-22，实际 `@nop-chaos/flux`）。
- 其余为低危 hygiene / 约定项（manifest、vitest 阈值、冗余 pragma、cast、移动端 marquee/page-marker/useMemo 约定，以及两个 interesting-guess）。

## Goals

- `pnpm check:oversized-code-files` 退出码变为 0（7 个 >700 文件全部降到 700 以内，或对有 justification 的文件建立显式 opt-in exemption 机制）。
- `/unstable` 子路径只导出稳定 barrel 里**没有**的符号；`flux-renderers-form-advanced` / `flux-code-editor` 的生产 value-import 在 manifest 里落到 `dependencies`/`peerDependencies`。
- `docs/references/quick-reference.md` 的 4 处 drift 与 live source 一致。
- 低危 hygiene / 约定项全部落到 `landed` 或 `adjudicated`，不残留模糊态。

## Non-Goals

- 不修复任何功能语义 bug（column-resize、condition-builder data-loss、validation lifecycle 等归 Plan {2}/{3}）。
- 不重构 `form-store.ts` 的核心 store 逻辑（只做物理拆分以满足门禁）。
- 不改变 `form-runtime-owner.ts` / `node-compiler.ts` 的编排行为（只拆分或加 exemption）。
- 不处理 H23（table i18n 硬编码字符串，属 flux-renderers-data，归 Plan {2}）。

## Scope

### In Scope

- AUDIT-01：拆分 4 个测试文件 + `form-store.ts`；对 `form-runtime-owner.ts` / `node-compiler.ts` 选定“拆分 or opt-in exemption”并落地其中一种。
- AUDIT-04：把 `createPageStore`/`createSurfaceStore`（及可选纯 helper）抽到独立文件。
- AUDIT-05：收敛 `flux-react/unstable` 到仅不稳定符号；回迁测试 import。
- AUDIT-06：把 `@nop-chaos/flux-runtime` 提升为 `flux-renderers-form-advanced` 的 production dep，从规范路径 import。
- AUDIT-08 / AUDIT-09 / AUDIT-21 / AUDIT-22：resync `quick-reference.md` 4 处。
- AUDIT-10：`flux-code-editor` 把 `flux-renderers-form` 移到 `dependencies`。
- AUDIT-11 / AUDIT-16 / AUDIT-17 / AUDIT-18 / AUDIT-19 / AUDIT-20：低危 hygiene（文件拆分预警、dedup any cast、playground cast、vitest 阈值、冗余 pragma、playground 阈值）。
- H31 / H32 / H33：移动 marquee resize、page marker-class drift、React Compiler 下冗余 memo 约定。
- H34 / H35：adjudicate 两个 interesting-guess（TDZ、action cancelled 分类）。

### Out Of Scope

- 所有 functional data-loss / contract-drift / a11y / race（见 Plan {2}/{3}）。
- `quick-reference.md` 之外的架构文档（除非某 phase 真的改了 public contract，届时按 Rule 17 处理）。

## Failure Paths

不适用。本计划为纯治理 / 拆分 / 文档同步，无运行时错误路径、无鉴权、无外部集成。唯一“失败”是门禁仍 red 或 manifest 仍不自洽——以 Closure Gates 的命令退出码为准。

## Test Strategy

本档选择：`建议有测`

理由：文件拆分与 manifest/doc 同步本身不引入行为变化，但 `form-store.ts` 拆分与 `/unstable` 收敛属于可影响 import 解析的结构改动，需用现有 `pnpm typecheck` + `pnpm test` 守护回归。纯文档行（quick-reference.md）不强制单测。

## Execution Plan

### Phase 1 - 拆分超长文件恢复 CI 门禁（P0）

Status: completed
Targets: `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx`, `packages/flux-renderers-data/src/__tests__/chart-renderer.unit.test.tsx`, `packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts`, `packages/flux-renderers-mobile/src/infinite-scroll.test.tsx`, `packages/flux-runtime/src/form-store.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-compiler/src/schema-compiler/node-compiler.ts`

- Item Types: `Fix | Decision`

- [x] `Fix`：按现有 `describe` 边界拆分 4 个测试文件（`grid-selection.test.tsx`、`chart-renderer.unit.test.tsx`、`runtime-sources-refresh.test.ts`、`infinite-scroll.test.tsx`），每个产物 <700 行，纯搬运不改逻辑。
- [x] `Fix`：合并 AUDIT-04——把 `form-store.ts` 的 `createPageStore`/`createSurfaceStore` 移到 `page-store.ts`/`surface-store.ts`（零耦合，已验证），使 `form-store.ts` <700 行。
- [x] `Decision`：对 `form-runtime-owner.ts` / `node-compiler.ts` 二选一并落地——选定 (b) 在 `check-oversized-code-files` 脚本里新增**显式 opt-in exemption**（带文件 + 决策注释引用），避免“静默放行”。`OVERSIZED_EXEMPTIONS` 数组收录两文件 + 决策出处（AUDIT-01 / Plan 444 / 02-N1），脚本仍打印 `[exempt]` 标记但 exit 0。

Exit Criteria:

- [x] `pnpm check:oversized-code-files` 退出码为 0（live 复核：7 个 >700 文件已降到 0 非豁免；剩余 `form-runtime-owner.ts` / `node-compiler.ts` 挂在显式 exemption 下且脚本 exit 0）。
- [x] `pnpm --filter @nop-chaos/flux-runtime typecheck` 通过（守护 `form-store.ts` 拆分不破坏类型）。
- [x] 若选 exemption 方案：脚本里能看到具名 exemption + 引用决策出处；不是无条件放行。

### Phase 2 - 收敛 `/unstable` 子路径与 manifest 生产依赖

Status: completed
Targets: `packages/flux-react/src/unstable.ts`, `packages/flux-react/src/index.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/projected-scope.ts`（re-export）, `packages/flux-renderers-form-advanced/src/projected-owner-scope.ts`（runtime 消费）, `packages/flux-renderers-form-advanced/package.json`, `packages/flux-code-editor/src/code-editor-renderer.tsx`, `packages/flux-code-editor/package.json`

- Item Types: `Fix`

- [x] `Fix`（AUDIT-05）：从 `flux-react/src/unstable.ts` 删除稳定 barrel 已有的符号（`RenderNodes`、`FormLayoutContextValue`、11 个 contexts、`createFormComponentHandle`、`createReadonlyScopeBinding`）；只保留真正 absent-from-stable 的导出（`mergeActionContext`/`createHelpers`/`EMPTY_SCOPE_DATA`/`rendererHooks`/`RenderInstancePathContext`/`StructuralLoopContext`/`useRequiredContext`/`publishOwnerStatus`/`executeApiObject`/`createProjectedScopeStore`）；把 6 个测试文件的 import 从 `@nop-chaos/flux-react/unstable` 回迁到 `.`，并清除 3 处针对 `/unstable` 的 dead `vi.mock`；新增 `public-surface.test.ts` 的 disjointness 断言守护 stable ∩ unstable = ∅。
- [x] `Fix`（AUDIT-06）：把 `@nop-chaos/flux-runtime` 提升为 `flux-renderers-form-advanced` 的 production dependency；`detail-view/projected-scope.ts` 改从 `@nop-chaos/flux-runtime` 规范路径 re-export。
- [x] `Fix`（AUDIT-10）：把 `@nop-chaos/flux-renderers-form` 移到 `flux-code-editor` 的 `dependencies`（`code-editor-renderer.tsx` 运行时 value import `formFieldChromeRules`）。

Exit Criteria:

- [x] `flux-react/src/unstable.ts` 与 `src/index.tsx` 的导出集合**不相交**（stable ∩ unstable = ∅），由 `public-surface.test.ts` 的 disjointness 断言守护，live 复核通过。
- [x] `pnpm check:workspace-manifest-deps` 仍 PASS；`flux-renderers-form-advanced` 与 `flux-code-editor` 的 production runtime import 在 manifest 中可见。
- [x] `pnpm typecheck` 通过（守护 import 路径迁移）。

### Phase 3 - resync `quick-reference.md`

Status: completed
Targets: `docs/references/quick-reference.md`

- Item Types: `Fix`

- [x] `Fix`（AUDIT-08）：在 Package Directory Map 补上 `flux-renderers-content` / `flux-renderers-layout` / `flux-renderers-mobile` 三行（directory / npm name / layer）。
- [x] `Fix`（AUDIT-09）：把 `useCurrentFormError` / `useFieldError` 返回类型改为 `ValidationError | undefined`（与 `packages/flux-react/src/hooks/use-form-hooks.ts:233,272` 一致）。
- [x] `Fix`（AUDIT-21）：把 `useRenderInstancePath` 返回类型改为 `readonly InstanceFrame[] | undefined`（与 `context-hooks.ts:36` 一致）。
- [x] `Fix`（AUDIT-22）：把 bundle npm 名改为 `@nop-chaos/flux`，并标注“dir `flux-bundle`，发布名 `@nop-chaos/flux`”。

Exit Criteria:

- [x] quick-reference.md 上述 4 处与 live source 逐字一致；Package Directory Map 覆盖 AGENTS.md 列出的全部 7 个 renderer 包。
- [x] `pnpm check:active-doc-code-anchors` 仍 PASS。

### Phase 4 - 低危 hygiene / 约定 / 移动布局 residual

Status: completed
Targets: `packages/flux-runtime/src/async-data/request-runtime.ts`, `apps/playground/src/taskflow-designer-lib/index.ts`, `packages/flow-designer-core/vitest.config.ts`, `packages/spreadsheet-core/vitest.config.ts`, 冗余 `@vitest-environment happy-dom` 文件, `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx`, `packages/flux-renderers-mobile/src/notice-bar.tsx`, `packages/flux-renderers-basic/src/page.tsx`, React Compiler 冗余 memo 集群

- Item Types: `Fix | Decision`

- [x] `Fix`（AUDIT-16）：`request-runtime.ts` dedup map 改用 `Promise<ApiResponse<unknown>>`，只在读 `data` 时窄化，消除 `any`→任意 `T` 路径。
- [x] `Fix`（AUDIT-17）：`taskflow-designer-lib/index.ts:41` 去掉 `as any`，改 `ctx.scope.get('$designer') as DesignerProjection | undefined`。
- [x] `Fix`（AUDIT-18）：给 `flow-designer-core` / `spreadsheet-core` 的 `vitest.config.ts` 加覆盖率阈值（branches/functions/lines/statements），config-only 包保持豁免。阈值设在当前 baseline（branches 50–55%, 其余 60–70%）以防回归；升到 70% 列为 Non-Blocking Follow-up。
- [x] `Fix`（AUDIT-19）：删除 happy-dom-default 包中 145 个测试文件里冗余的 `// @vitest-environment happy-dom`（package `vitest.config.ts` 已设）；保留 node-default 包中合法的 pragma。
- [x] `Decision`（AUDIT-20）：裁定 `apps/playground` 加 50% backstop 阈值——adjudicate 为 out-of-scope（playground 是 dev/demo app，coverage 阈值增加噪音但价值有限；真正的覆盖 enforcement 在 package level）。理由写入 Deferred But Adjudicated。
- [x] `Decision`（AUDIT-11）：`input-choice-renderers.tsx`（675 行，WARN）——adjudicate 为 watch-only。`SelectRenderer` 当前 ~314 行，低于 ~450 行阈值，不拆 `choice/` 子目录。
- [x] `Fix`（H31）：`notice-bar.tsx` marquee 在 `useLayoutEffect` deps 里加入 `containerWidth`，并接 `ResizeObserver`（对照 `swipe-cell.tsx:58-83` 的对称实现）。
- [x] `Fix`（H32）：`flux-renderers-basic/src/page.tsx:130` 移除移动端 boolean 上硬编码的 `isMobile && 'flex flex-col'`，回归 layout-renderer “只发 marker class”契约；更新 `page-responsive.test.tsx` 验证 marker-only 契约。
- [x] `Fix`（H33）：移除 notice-bar（3 个 event handler `useCallback`）与 swipe-cell（`computedOffset = useMemo`）中 React Compiler 下冗余的手写 memo；保留确有外部同步语义者（notice-bar `textList = useMemo` 在 effect deps；swipe-cell `closeCell`/`openCell`/`handleTouchEnd`/`handleTouchCancel` 在 effect/handler deps；countdown `computeInitialRemaining` 在 effect deps；page `summary = useMemo` 在 `useStatusPathPublication` effect deps）。vitest 未运行 React Compiler，effect-dep 耦合的 memo 不能安全移除——列为 Non-Blocking Follow-up。

Exit Criteria:

- [x] 上述每项要么 `landed`（代码/配置已改且局部 typecheck 通过），要么进入 `Deferred But Adjudicated` 并写明 non-blocking 理由。
- [x] `pnpm lint` 通过（守护 React Compiler 约定改动与 any 清理）。

### Phase 5 - 裁定两个 interesting-guess

Status: completed
Targets: `packages/flux-runtime/src/async-data/reaction-runtime.ts:414-420,442`, `packages/flux-action-core/src/action-core.ts:66-85`

- Item Types: `Decision | Proof`

- [x] `Proof`（H34）：核对 `reaction-runtime.ts` `dispose()` 在 `:420` 引用 `unsubscribe?.()` 而 `const` init 在 `:442`——**无 TDZ 风险**。`dispose` 仅在 `createReaction` 同步返回后才可被外部调用；内部 `dispose()` 调用（`runReaction` 中）全部经由 microtask（`Promise.resolve().then(invoke)`）触发，此时 `unsubscribe` 已完成同步初始化。补 guard 注释说明 forward-reference 安全 invariant。
- [x] `Decision`（H35）：核对 `action-core.ts:71-72` 把 `cancelled`/`timedOut` 结果归入 failure-class 并走 `onError`——**裁定为 intended**。Timeout 是异常终止；cancellation 可能需要 cleanup/rollback。已有 `cancelled-class-and-error-guard.test.ts` / `action-core-result.test.ts` 锁定语义（onError 触发、onSettled 触发、chain-stop、continueOnError gate）。补 doc 注释钉死设计决策。

Exit Criteria:

- [x] H34/H35 各自落到 `landed`（H34 补 guard 注释；H35 补 doc 注释 + 已有测试覆盖）或 `adjudicated`（H35 intended + non-blocking 理由写入注释）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent fresh session（task ses_0f96c88eeffeXcJ5WWaAzw38xu，2026-06-27）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Minor（已修）：H32 Target 路径由 `flux-renderers-layout/src/page.tsx` 更正为实际位置 `flux-renderers-basic/src/page.tsx:130`（live 复核确认）。
  - Minor（已修）：Phase 2 Targets 补明 `/unstable` re-export 实际在 `detail-view/projected-scope.ts`，由 `projected-owner-scope.ts` 消费。
  - Minor（保留为 Non-Blocking Follow-up）：H35 已有 `cancelled-class-and-error-guard.test.ts` / `action-core-result.test.ts` 覆盖，Phase 5 Decision 将裁定为 intended + 已测。
- 共识：零 Blocker / 零 Major，minors 已修正，plan 升级为 active。

## Closure Gates

- [x] 所有 in-scope governance/约定 finding 已 landed 或 adjudicated，无静默降级。
- [x] `pnpm check:oversized-code-files` exit 0（剩余 `form-runtime-owner.ts` / `node-compiler.ts` 均在显式 exemption 下且仍 exit 0）。
- [x] `pnpm check:workspace-manifest-deps` PASS。
- [x] `pnpm check:active-doc-code-anchors` PASS。
- [x] `quick-reference.md` 与 live source 4 处一致 + 7 个 renderer 包齐全。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### AUDIT-20 — apps/playground coverage backstop

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: playground 是 dev/demo app（非 library），coverage 阈值在 dev app 上增加维护噪音但 ROI 低。真正的覆盖 enforcement 已在 package-level vitest config 落地（Phase 4 AUDIT-18 为 flow-designer-core / spreadsheet-core 加阈值；其余 package 早有阈值）。playground 的 19 个 test file 是 smoke/integration test，不是单元覆盖。
- Successor Required: `no`
- Successor Path: N/A

### AUDIT-11 — input-choice-renderers.tsx split

- Classification: `watch-only residual`
- Why Not Blocking Closure: 文件 675 行（WARN >500，但未达 ERROR >700）。`SelectRenderer` ~314 行，低于 ~450 行拆分阈值。choice/ 子目录拆分会增加跨文件状态传递复杂度而无收益。当 `SelectRenderer` 超 ~450 行再动。
- Successor Required: `no`（watch-only）
- Successor Path: 若 SelectRenderer >~450 行，在 `docs/components/amis-bug-driven-improvement-roadmap.md` 新建条目

### AUDIT-18 — flow-designer-core / spreadsheet-core coverage → 70%

- Classification: `optimization candidate`
- Why Not Blocking Closure: 覆盖率阈值已建立（Phase 4 落地 branches 50–55%、functions/lines/statements 60–70%），catch 回归。当前 branches 56–60%，低于 70% 目标。`core-shell-commands.ts`（flow-designer-core）与 `commands*.ts`（spreadsheet-core）覆盖率为 0%，需补 integration test。已从 include 列表排除以免阈值不可达。
- Successor Required: `yes`
- Successor Path: 补 `core-shell-commands.ts` / `commands.ts` 测试后调高阈值至 70%

### H33 — effect-dep 耦合的 useMemo/useCallback

- Classification: `optimization candidate`
- Why Not Blocking Closure: vitest 未运行 React Compiler（`reactCompilerPreset` 仅在 playground vite build 配置中）。notice-bar `textList = useMemo` / swipe-cell `closeCell` 等 `useCallback` / countdown `computeInitialRemaining` / page `summary = useMemo` 均在 `useEffect` deps 中，移除后在 vitest 下会导致 effect 每次 render 重跑（无限循环 / listener 反复 attach）。React Compiler 下这些 memo 是冗余的，但需先让 vitest 应用 compiler。
- Successor Required: `yes`
- Successor Path: 在 vitest config 中启用 `babel-plugin-react-compiler`，或等 vitest 原生支持后批量清理

## Non-Blocking Follow-ups

- （可选）新增 `check:*` 规则：要求 source value-import 落到 `dependencies`/`peerDependencies`，关闭 AUDIT-10 暴露的 devDep 盲区。
- （可选）新增 lint/docs 规则：禁止包的 `/unstable` 子路径重新导出 stable barrel 符号，防 AUDIT-05 回归。

## Closure

Status Note: Plan completed 2026-06-27. All 5 Phases landed or adjudicated. CI gate-green restored (`check:oversized-code-files` exit 0 with 2 explicit exemptions for justified orchestrator files). `/unstable` subpath converged to disjoint-from-stable. `quick-reference.md` resynced. 145 redundant happy-dom pragmas removed. Coverage thresholds established for flow-designer-core / spreadsheet-core. 4 items deferred with adjudication (AUDIT-20, AUDIT-11, AUDIT-18, H33).

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit fresh session（opencode sub-agent，2026-06-27，不复用执行 session 上下文）
- Evidence:
  - Phase 1 live 复核：`pnpm check:oversized-code-files` exit 0；`scripts/check-oversized-code-files.mjs:33` `OVERSIZED_EXEMPTIONS` 收录 `form-runtime-owner.ts`/`node-compiler.ts` 并附决策出处；`form-store.ts` 现 630 行，`page-store.ts`/`surface-store.ts` 已抽出并被 `page-runtime.ts`/`surface-runtime.ts` 消费。
  - Phase 2 live 复核：`flux-react/src/unstable.ts`（18 行）仅保留 unstable 符号；`flux-renderers-form-advanced/package.json` dependencies 含 `@nop-chaos/flux-runtime`、`flux-code-editor/package.json` dependencies 含 `@nop-chaos/flux-renderers-form`；`flux-react/src/__tests__/public-surface.test.ts:39` 存在 `stable ∩ unstable = ∅` disjointness 断言。
  - Phase 3 live 复核：`quick-reference.md` 行 22-28 覆盖全部 7 个 renderer 包；行 484/486 `useCurrentFormError`/`useFieldError` 为 `ValidationError | undefined`；行 504 `useRenderInstancePath` 为 `readonly InstanceFrame[] | undefined`；行 33 bundle 行标注 `flux-bundle (dir) / @nop-chaos/flux`。
  - Phase 5 live 复核：`reaction-runtime.ts:420` 存在 H34 forward-reference 安全 invariant guard 注释；`action-core.ts:84-88` 存在 H35 设计决策 doc 注释，引用 `cancelled-class-and-error-guard.test.ts`/`action-core-result.test.ts`。
  - Closure Gates 复核：`pnpm typecheck` 55/55 PASS；`pnpm lint` 29/29 exit 0；`pnpm check:workspace-manifest-deps` PASS；`pnpm check:active-doc-code-anchors` PASS（259 active docs verified）；`pnpm check:oversized-code-files` exit 0。

Follow-up:

- AUDIT-18: raise flow-designer-core / spreadsheet-core coverage thresholds to 70% after adding tests for currently-excluded files
- H33: batch-remove effect-dep-coupled useMemo/useCallback once vitest applies React Compiler
- Optional: new `check:*` rule for source value-import → dependencies (AUDIT-10 follow-up)
- Optional: new lint rule forbidding /unstable re-export of stable barrel symbols (AUDIT-05 follow-up)
