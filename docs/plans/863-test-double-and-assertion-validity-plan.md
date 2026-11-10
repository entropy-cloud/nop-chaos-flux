# 863 测试替身与断言有效性（无测分支 / 死兜底 / 静默 stub 默认值 / 脏工作区风险 / 负载敏感测试）

> Plan Status: active（draft review round 2 pass-with-minors，见 Draft Review Record）
> Last Reviewed: 2026-11-06
> Source: `docs/analysis/2026-11-06-full-repo-deep-audit.md` §4（T1–T7）+ plan 859 全量验证实测（T8）
> Related: plan 858（同类：伪断言清除）、plan 860 Deferred（FormStub 棘轮失效，归 R3.x/MV，本 plan 不接）

## Purpose

让 T 组测试"能因真实实现变化而失败"：给无测分支补真实实现测试、删除误导性的死兜底、把共享 stub 默认值改成"缺失即响亮失败"、消除测试改写已跟踪文件的脏工作区风险、修复负载下不稳定的测试。不改产品代码。

## Current Baseline（draft review round 1 后按 live repo 勘正）

- T1 `packages/flux-code-editor/src/use-code-mirror.test.tsx`：全文件 149 行、仅 1 个用例（:121 "uses the latest onChange callback without recreating the editor"），对 `@codemirror/*` 全套 mock。**mount/unmount、compartment 重配置、readOnly 切换分支没有任何测试**（mock 也没测）。真实 EditorView 在 happy-dom 下可用：`use-code-mirror-controlled.test.tsx` 先例 + 包级 `vitest.config.ts` `environment: 'happy-dom'`（无需文件级 pragma）。
- T2 word-editor test-support 两个文件各有三处 `actual.X ?? {...}` 兜底：`__tests__/word-editor-page-host-scope.test-support.tsx:151,157,165` 与 `__tests__/word-editor-page-actions.test-support.tsx:197,203,211`（`RowFlex`/`TitleLevel`/`ListType`）。这些兜底在该测试链上是**死代码**——消费这些枚举的模块（ribbon-toolbar、outline-panel、use-word-editor-shortcuts 等）也都被 mock 掉了；它们只制造"导出丢失也能兜住"的错误印象。另：`createEditorStore`/`createDatasetStore` 替身为自造 API，与真实 store 无 parity 约束。
- T3 `packages/flux-react/src/test-support/mock-props.ts`：`:29` `stubRendererHelpers.evaluate` 为恒等函数；`:74` 默认 helpers 为 `{}`。`packages/flux-renderers-ai/src/test-support.ts:29` 默认 `stubRendererHelpers`——两 harness 不一致。实测 content/mobile/map/graph 的非测试源码零处调用 `helpers.evaluate`，使用 `createMockRendererProps` 的 72 个测试文件（ai 18 / content 25 / mobile 23 / map 3 / graph 2 / flux-react 1）中只有 2 个显式传 `helpers`（image-fetcher、map-renderer）。风险本质：缺 helpers 时以 `TypeError: undefined is not a function` 失败（不清晰），而 ai 侧默认恒等 evaluate 会让表达式分支静默通过。
- T4 `scripts/__tests__/chained-gates-red-path.test.ts`：门禁脚本硬编码扫描根（文件头 :8-14），测试必须向真实工作区写违规夹具并改写已跟踪文件（`flux-renderers-basic/src/index.tsx`、industrial `config-types.ts`、`flux-core/src/commit-state.ts`、`docs/testing/coverage-thresholds.md`），在 `afterAll` 还原。被吞的 `git reset … .catch(() => {})`（:51）位于死分支（`stagedGit` 从未 push）。真实风险：进程中断时 `afterAll` 不执行，工作区留脏；并行会话同时运行时互相干扰。
- T5 `tests/e2e/exploratory/interaction-tests.spec.ts`：:26/:51 `.waitFor().catch(() => {})`、:36 `expect().catch(() => {})`、:71 `.click().catch()`；整文件 `describe.skip`，已有 plan 623 C3 跳过裁决（文件头）与 `docs/testing/e2e-baseline-ledger.md:262` 登记。
- T6 `packages/flux-renderers-layout/src/test-support.tsx:127-302` 重抄 8 个渲染器 fields 合同；真实定义分布在 `layout-renderer-definitions.ts`（5 个）、`wizard-renderer-definition.ts`、`process-display-definitions.ts`（steps/timeline）。无 parity 机制。
- T7 `packages/flow-designer-renderers/src/__tests__/canvas-bridge-test-support.tsx:58-70` mock runtime 自造 scope 形状；真实 `createScopeRef`（`flux-runtime/src/scope.ts:432`）不在 flux-runtime 公共入口，只能走 parity 断言路线。
- T8（plan 859 全量验证实测）：`packages/flux-renderers-mobile/src/wheel-picker-family.test.tsx`（"confirm dispatches the wheel landing and closes"）与 `wheel-time-picker-form-write.test.tsx` 在 `pnpm test` 全量负载下失败（`expected ['red','s'] to deeply equal ['green','s']`），单独运行两文件（8 个用例）连续 3 次全绿——负载敏感的时序断言。机制（round 2 复审读码）：`data-active` 在 touchMove 中途即更新，满足测试的 waitFor；而 confirm 读取的 draft 只在 settle→onSettle→onDraftChange 后提交；惯性目标由合成事件时间戳导出的速度决定，负载下跨毫秒 → 惯性漂移 → 点击 confirm 时 draft 仍为初值。

## Goals

- T1：mount/unmount、compartment 重配置、readOnly 切换各补一条真实 EditorView 测试；mock 测试文件头注明只覆盖 onChange 引用更新。
- T2：删除两个 test-support 文件共 6 处死兜底；为两个 store 替身加 parity 断言（替身方法集 ⊆ 真实 store 方法集），真实 API 改名/删除时红。
- T3：`mock-props.ts` 与 ai `test-support.ts` 默认 helpers 统一为"访问即抛出说明性错误"的 stub（提示测试显式传入 helpers）；恒等 `stubRendererHelpers` 只在测试显式选用时生效，文件头注明其恒等语义。
- T4：删除死分支 `stagedGit`；测试开始前检查将被改写的已跟踪文件无未提交改动，有则直接失败（保护并行会话）；注册进程退出/信号钩子执行还原；文件头写明中断后的手工恢复命令。
- T5（Decision）：裁决删除该文件或改写为真断言，并同步 e2e ledger 登记。
- T6：parity 测试——test-support 中 8 个定义的 fields keys 与三个真实定义文件一致。
- T7：parity 断言——mock scope 暴露的成员 ⊆ 真实 ScopeRef 契约（`flux-core` `ScopeRef` 类型的运行时成员清单）。
- T8：定位时序依赖，改为等待确定性条件（而非时间），全量负载下稳定。

## Non-Goals

- 不改任何产品源文件（T4 不给门禁脚本加 `--root` 参数）。
- 不处理 FormStub（plan 860 Deferred 已归 R3.x/MV）。
- 不追求覆盖率指标。

## Scope

### In Scope

- 上列 T1–T8 涉及的测试/测试基建文件，及新增 parity/真实实现测试
- `docs/testing/e2e-baseline-ledger.md`（仅 T5 裁决需要时）

### Out Of Scope

- 产品代码；门禁脚本本体；e2e 其余 skip（审计确认均有理由）

## Test Strategy

档位选择：`建议有测`——本 plan 本身就是测试改造。判别性要求（When Drafting 13）：T2/T6/T7 的 parity 断言须演示"制造漂移 → 测试红"（例如在真实 store 上临时改一个方法名 / 改一个 fields key），演示记入当日 log、不留变异；T3 须演示"删去显式 helpers → 测试以说明性错误失败"。

## Execution Plan

### Phase 1 - 死兜底、默认值与脏工作区（T2、T3、T4、T5）

Status: planned
Targets: word-editor 两个 test-support、`flux-react/src/test-support/mock-props.ts`、`flux-renderers-ai/src/test-support.ts`、chained-gates 测试、exploratory spec

- Item Types: `Fix | Decision`

- [ ] T2 删除 6 处死兜底；两个 store 替身 parity 断言
- [ ] T3 默认 helpers 改为说明性抛错 stub；受影响测试显式传 helpers（预计少量）
- [ ] T4 删除死分支 + 改写前脏检查 + 退出钩子还原 + 文件头恢复说明
- [ ] T5 Decision：删除或改写，并同步 ledger

Exit Criteria:

- [ ] T2 parity 变异演示（真实 store 临时改名 → 红）在案；T3 删 helpers 演示（说明性错误）在案
- [ ] word-editor-renderers / flux-react / flux-renderers-ai / content / mobile / map / graph 包测试全绿；`pnpm test:scripts` 全绿

### Phase 2 - 真实实现覆盖、parity 与稳定性（T1、T6、T7、T8）

Status: planned
Targets: flux-code-editor、flux-renderers-layout、flow-designer-renderers、flux-renderers-mobile

- Item Types: `Proof | Fix`

- [ ] T1 四个分支各一条真实 EditorView 测试
- [ ] T6 layout fields parity 测试 + 变异演示（改一个 key → 红）
- [ ] T7 canvas-bridge scope parity 断言 + 变异演示
- [ ] T8 固定合成事件 `timeStamp`（速度归零 → settle 路径确定）并以 strip transform 到达目标偏移作为等待条件；`pnpm --filter @nop-chaos/flux-renderers-mobile test` 在并发负载下连续 3 次全绿（负载以并行跑另一包测试制造）

Exit Criteria:

- [ ] 新测试绿；变异演示记录在案；四包测试全绿

## Draft Review Record

- Reviewer / Agent: 独立子代理（fresh session）
- Verdict: round 1 `fail`（4 Major）→ round 2 `pass-with-minors`（零 Blocker/Major；四个 Major 处置与全部 Baseline 事实独立复核成立；T3 实际触发面 0–2 个文件；T4 可在测试文件内实现；T8 机制读码确认）
- Rounds: 2
- Findings addressed: M1 T1 基线改为"分支无测"；M2 T2 改为删除死兜底 + store parity 断言（原"删 RowFlex 导出 → 红"演示无判别性，已放弃），补入漏列的 `word-editor-page-actions.test-support.tsx`，行号/枚举名勘正；M3 T3 方向反转为"缺失即响亮失败"，风险描述按实测重写；M4 T4 基线勘正（死分支 + 真实风险为改写已跟踪文件），修法限定在测试文件内（脏检查 + 退出钩子）。Minor：T5 改 Decision 并引用 plan 623 C3 / ledger:262；T6 列三个真实定义文件；T7 限定 parity 路线；Closure Gates 补 build 与两项模板必备项；新增 T8。round 2 Minor 吸收：mock-props 使用面 58→72、T7 行号 :58-70、T8 口径与机制写明

## Closure Gates

- [ ] T1–T8 全部落地（或裁决在案）
- [ ] 判别演示记录在案，零产品源改动
- [ ] 不存在被静默降级的 in-scope 问题
- [ ] owner doc 同步判定已执行（测试基建约定若改变，同步 `docs/architecture/renderer-markers-and-selectors.md` 测试放置节或注明无需）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check` exit 0

## Deferred But Adjudicated

（无——执行中若有改判当场落节）

## Non-Blocking Follow-ups

- `content-renderer-definitions.test.tsx` 等约 25 处 `toBeTruthy()` 高密度断言未逐条复核（审计"待确认"）。

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<收口时填写>>
