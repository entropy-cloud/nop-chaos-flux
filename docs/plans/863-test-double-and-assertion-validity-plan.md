# 863 测试替身与断言有效性（无测分支 / 死兜底 / 静默 stub 默认值 / 脏工作区风险 / 负载敏感测试）

> Plan Status: completed（closure audit round 1：1 Major（ledger anchor 红）→ 修复 → 按审计其余证据直接收口；见 Closure Audit Evidence）
> Last Reviewed: 2026-11-10
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

Status: completed
Targets: word-editor 两个 test-support、`flux-react/src/test-support/mock-props.ts`、`flux-renderers-ai/src/test-support.ts`、chained-gates 测试、exploratory spec

- Item Types: `Fix | Decision`

- [x] T2 删除 6 处死兜底；两个 store 替身 parity 断言
- [x] T3 默认 helpers 改为说明性抛错 stub；受影响测试显式传 helpers（预计少量——实测 0 个既有测试需要改）
- [x] T4 删除死分支 + 改写前脏检查 + 退出钩子还原 + 文件头恢复说明
- [x] T5 Decision：删除或改写，并同步 ledger（裁决：整文件删除，见执行中裁决）

Exit Criteria:

- [x] T2 parity 变异演示（真实 store 临时改名 → 红）在案；T3 删 helpers 演示（说明性错误）在案
- [x] word-editor-renderers / flux-react / flux-renderers-ai / content / mobile / map / graph 包测试全绿；`pnpm test:scripts` 全绿（逐包计数见 `docs/logs/2026/11-10.md`）

### Phase 2 - 真实实现覆盖、parity 与稳定性（T1、T6、T7、T8）

Status: completed
Targets: flux-code-editor、flux-renderers-layout、flow-designer-renderers、flux-renderers-mobile

- Item Types: `Proof | Fix`

- [x] T1 四个分支各一条真实 EditorView 测试
- [x] T6 layout fields parity 测试 + 变异演示（改一个 key → 红）
- [x] T7 canvas-bridge scope parity 断言 + 变异演示
- [x] T8 固定合成事件 `timeStamp`（速度归零 → settle 路径确定）并以 strip transform 到达目标偏移作为等待条件；`pnpm --filter @nop-chaos/flux-renderers-mobile test` 在并发负载下连续 3 次全绿（负载以并行跑另一包测试制造）

Exit Criteria:

- [x] 新测试绿；变异演示记录在案；四包测试全绿（flux-code-editor 121 / layout 173 / flow-designer-renderers 319 / mobile 385×3 次负载全绿）

## Draft Review Record

- Reviewer / Agent: 独立子代理（fresh session）
- Verdict: round 1 `fail`（4 Major）→ round 2 `pass-with-minors`（零 Blocker/Major；四个 Major 处置与全部 Baseline 事实独立复核成立；T3 实际触发面 0–2 个文件；T4 可在测试文件内实现；T8 机制读码确认）
- Rounds: 2
- Findings addressed: M1 T1 基线改为"分支无测"；M2 T2 改为删除死兜底 + store parity 断言（原"删 RowFlex 导出 → 红"演示无判别性，已放弃），补入漏列的 `word-editor-page-actions.test-support.tsx`，行号/枚举名勘正；M3 T3 方向反转为"缺失即响亮失败"，风险描述按实测重写；M4 T4 基线勘正（死分支 + 真实风险为改写已跟踪文件），修法限定在测试文件内（脏检查 + 退出钩子）。Minor：T5 改 Decision 并引用 plan 623 C3 / ledger:262；T6 列三个真实定义文件；T7 限定 parity 路线；Closure Gates 补 build 与两项模板必备项；新增 T8。round 2 Minor 吸收：mock-props 使用面 58→72、T7 行号 :58-70、T8 口径与机制写明

## Closure Gates

- [x] T1–T8 全部落地（或裁决在案）
- [x] 判别演示记录在案，零产品源改动（git status 核对：改动面全部为测试/测试基建/docs）
- [x] 不存在被静默降级的 in-scope 问题
- [x] owner doc 同步判定已执行（**判定：无需同步**——`renderer-markers-and-selectors.md` 管辖渲染器 marker/styling 契约，本次改动是 test-support harness 内部语义（strict helpers / parity / pinned timeStamp），约定落在各 harness 文件头注释与本 plan，未触及该文档管辖面）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（2026-11-10）
- [x] `pnpm build`（2026-11-10）
- [x] `pnpm lint`（2026-11-10）
- [x] `pnpm test`（2026-11-10）
- [x] `pnpm check` exit 0（2026-11-10）

## Deferred But Adjudicated

### T5 裁决：exploratory/interaction-tests.spec.ts 整文件删除

- Classification: `out-of-scope improvement`（相对 plan 623 的"保留跳过"原裁决，本 plan 权限内的改判删除）
- Why Not Blocking Closure: 整文件 `describe.skip`、4 处 `.catch(() => {})` 吞断言、无任何消费方；已有 plan 623 C3 跳过裁决与 ledger 登记在案。删除比改写真断言更诚实——这些 exploratory 断言从入仓起就未被 CI 或人工消费，改写等于凭空发明规格。
- Successor Required: `no`（ledger :266 条目已追加"已随 plan 863 删除"留档）

### T8 执行中扩大面：负载修复超出 plan 所列 2 文件

- Classification: `Fix`（同缺陷族 in-scope 延伸——T8 Goal 是"负载下稳定"，退出标准是 mobile 包 3 次负载全绿）
- Why Not Blocking Closure: plan 只列 wheel-picker-family + wheel-time-picker-form-write 两文件；负载实测中同机制缺陷在 wheel-time-picker.test.tsx、picker-view.test.tsx（dragFrom/中段抑制/多列）、swipe-cell.test.tsx（below-threshold）、pull-refresh-error.test.tsx（40ms 窗口竞态）轮流触发，不修则 Exit Criteria（3 次全绿）不可能达成。全部为测试侧 pinned-timeStamp/原子 waitFor 修复，零产品源改动。
- Successor Required: `no`

### T6 执行中发现：真实定义与 test 副本已实质漂移（parity 落地即红）

- Classification: `Fix`（已收敛）
- Why Not Blocking Closure: 真实 wizard 定义含 `actionFinishLabel/actionNextLabel/actionPrevLabel`，test 副本却保留真实侧已删除的 `valueOwnership/valueStatePath`——parity 测试落地即 2 红，副本已按真实定义同步。另发现：真实 `layout-renderer-definitions.ts` dropdown-button 的 fields 重复声明 `label`（value-or-region + prop 两个条目，疑似产品侧遗留），**不在本 plan 权限内修改产品源**，parity 断言按唯一 key 集合比较并在测试注释中留痕——该重复键是否为 live defect 交由后续 audit/plan 裁定。
- Successor Required: `yes`（dropdown-button 重复 `label` fields key 的产品侧裁定，归属后续 deep-audit/产品修复 plan）

### T6 parity 范围裁定：resizable 不入 parity

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `layoutRendererDefinitions` 实际含 6 个定义（含 resizable），test-support 从未重抄 resizable 的 fields——无副本即无漂移面，plan 所列"重抄的 8 个"范围成立；parity 测试显式以 `PARITY_TYPES` 白名单限定并在注释留痕。
- Successor Required: `no`

## Non-Blocking Follow-ups

- `content-renderer-definitions.test.tsx` 等约 25 处 `toBeTruthy()` 高密度断言未逐条复核（审计"待确认"）。

## Closure

Status Note: T1–T8 全落地（零产品源改动）；判别演示 5 组在案且已还原；closure audit round 1 仅 1 Major（T5 删除文件后 ledger 留档行反引号路径成未解析 anchor，lint 新红）→ 去反引号留档修复，其余全部核验通过，按审计意见直接收口。五命令 exit 0（863-closure-verify.log + 863-lint-rerun.log）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session）
- Evidence: 零产品源 diff 核验（packages/\*/src 排除 test/test-support 后为空）；T2/T3/T1/T6/T7 断言真实性核验（vi.importActual 真实工厂 / strict helpers 抛错 / 真实 EditorView / 运行时解析 scope.ts 成员清单）；T4 钩子与脏检查核验；focused 实跑 flux-react 618 / layout 173 / flow-designer 319 / test:scripts 210 全绿；Deferred 三条裁决诚实。M1 修复后 lint 复跑 exit 0。详见 docs/logs/2026/11-10.md。

Follow-up:

- dropdown-button fields 重复声明 label（T6 发现的疑似产品 live defect，successor 立项待办）
