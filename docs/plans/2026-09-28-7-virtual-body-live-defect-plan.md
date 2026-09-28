# 2026-09-28-7 VirtualBody 虚拟行未渲染 live 缺陷修复

> Plan Status: completed
> Last Reviewed: 2026-09-28
> Source: Plan `2026-09-28-2-data-display-renderer-performance-plan.md` Phase 1（压测 harness 虚拟化模式）执行中暴露的 confirmed live defect；证据链见 Current Baseline
> Related: `packages/flux-renderers-data/src/table-renderer/table-virtual-body.tsx`、`packages/flux-renderers-data/src/table-renderer.tsx`、`packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`、`tests/e2e/table-virtual-body.spec.ts`、`docs/architecture/performance-design-requirements.md`

## Purpose

修复表格虚拟化路径（VirtualBody）在真实浏览器（React Compiler 生效）下渲染 0 行的 live 缺陷：`pagination: { enabled: false }` + `virtualThreshold` 触发时页面表体不输出任何数据行。该路径在压测 harness 落地前从未被端到端激活过，本次由 harness 首次曝光。

## Current Baseline

- **触发配置**（performance-table 页 `virtualized` 模式，2026-09-28 引入）：`virtualThreshold: 50` + `scrollHeight`/`autoFillHeight` + `pagination: { enabled: false }`，`source = perfRows`（1000 行）。
- **live 表现（fresh Chromium + dev server，多轮复现）**：`<table>`/`[data-slot="table-container"]` 延迟出现或缺失；最终出现时 `tbody` 仅含空态行（`data-slot="table-empty-row"`，即 `flattenedItems.length === 0`）；无 vite error overlay；`window.__dbg` 式渲染期插桩被 React Compiler 丢弃（`console.error` 无输出、页面无报错）。
- **happy-dom（未编译）对照**：同一 schema 下 `flattenedItems` 有 1000 项、无空态行——说明数据管线（processTableData → treeFlattenedData → paginateTableData → buildFlattenedItems）在未编译环境正常，缺陷仅在编译产物或真实布局环境暴露。
- **virtual gate**：`table-renderer.tsx:514-516` `virtualEnabled = !paginationEnabled && typeof virtualThreshold === 'number' && source.length > virtualThreshold`；注意 `paginationEnabled = schemaProps.pagination?.enabled !== false`（use-table-pagination.ts:40）——**未显式关闭分页时虚拟路径不会被激活**，这正是该路径从未被端到端覆盖的原因。
- **已排除**：行级 scope cache 快照标识改动（Plan 2 Phase 2；live bisect 还原后缺陷依旧）；hook 顺序（useTableRowScopeCache 位置；bisect 还原后依旧）；`processTableData` 排序/筛选改动（vitest 全绿）。
- **未排除的主嫌疑**（按概率）：(1) VirtualBody 为 compiler-skip 组件（`react-hooks/incompatible-library` 豁免），其父 TableRenderer 为编译组件，编译转换下 `scrollRef`（ref callback 赋值）与 VirtualBody 的 `getScrollElement` 间可能失去可观测时序；(2) `useVirtualizer` 的 scroll element 观测在 container `overflow-auto` + maxHeight/height 样式组合下未触发 re-observe；(3) 快照/版本通知在编译组件内的 useSyncExternalStore 订阅时序。
- 相邻事实：`performance-table-page.test.tsx` 已含 blocked 用例（`it.skip`，指向本 plan）记录期望行为。

## Goals

- 真实浏览器下 virtualized 模式输出窗口化数据行（>0 行 `<tr>`，滚动驱动窗口变化）。
- happy-dom 定向测试（以元素/探针可断言的最小行为）与 live 探针（`_tmp/perf-baseline-probe.mjs` 模式）双重转绿。
- 分页开启路径（既有行为）与关闭路径（虚拟）无回归。

## Non-Goals

- 不重写 TanStack Virtual 集成（优先最小修复：时序/观测/订阅接线）。
- 不改 `pagination.enabled` 默认值语义。
- 不扩大 virtualThreshold 的使用面（列表/树不在本 plan）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer/table-virtual-body.tsx`、`table-renderer.tsx`、`use-table-row-scope-cache.ts`
- `apps/playground/src/pages/performance-table*`（blocked 用例转绿）
- 上述包 colocated 单测

### Out Of Scope

- 非表格渲染器的虚拟化
- 分页/树/选择语义

## Failure Paths

| 可测场景编号           | 触发                                            | 行为                             | 可重试 | 用户可见表现         |
| ---------------------- | ----------------------------------------------- | -------------------------------- | ------ | -------------------- |
| virtual-body-zero-rows | pagination 关闭 + virtualThreshold + 超阈值数据 | 表体输出 ≥1 窗口行；滚动更新窗口 | 是     | 大数据表可见且可滚动 |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：必须自动化。happy-dom 受布局能力限制：断言面落实为"flattenedItems 非空（无空态行）+ container/scrollRef 接线存在（maxHeight/overflow）"（stub 尺寸注入经实现评估不必要——TanStack 在零布局下不产虚拟行，行数断言由编译态 e2e 承担）；live 行为以常驻 e2e `tests/e2e/table-virtual-body.spec.ts`（取代 \_tmp 探针）作为门禁，纳入 closure 证据。

## Execution Plan

### Phase 1 - 失败测试 + 根因定位（Proof 先行）

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/`、`table-virtual-body.tsx`

- Item Types: `Proof`

- [x] Proof: happy-dom 定向测试：performance-table-page.test.tsx 虚拟化用例组——原 it.skip blocked 用例解除并按 plan Test Strategy 重写断言面（flattenedItems 非空 = 无空态行 + scroll 容器接线 maxHeight/overflow），7/7 绿；行数>0 断言在 happy-dom 不可达成（无布局测量），编译态行数回归由新 e2e tests/e2e/table-virtual-body.spec.ts 承担（2/2 Chromium 绿，含深滚动窗口更新断言）
- [x] Proof: 根因定位（完成，证据链）：**缺陷 1（零行）= React Compiler × use-table-row-scope-cache.ts 交互**——live 确定性复现（可见窗口即可复现，非 rAF 饥饿类伪缺陷）；逐级 exclude 二分：排除整个 data 包→修复；仅排除 table-renderer.tsx→仍红；仅排除 use-table-row-scope-cache.ts→修复 ⇒ 根因锁定该 hook 的编译产物。机制：该 hook 拥有模块级可变缓存 + 版本计数器 + useSyncExternalStore 订阅 + 布局效应期填充（首次渲染时缓存必然为空、布局效应填充后 bump 版本驱动重渲染），编译变换破坏 bump→重渲染→flattenedItems 重算链（VirtualBody 的 buildFlattenedItems 对无 scope 行 skip → 缓存空 = 空态行）。**修复**：该文件头部 `'use no memo'` 指令（React Compiler 官方 opt-out；注意必须在文件指令序言最前——置于 import 后不生效，实验证实）。修复后全编译器构建下：首载虚拟化 9 行、Table Only↔Virtualized 往返正常、深滚动窗口随动（user_374-385 + spacer 30825px）。**排查中证伪的分支**：(a) "滚动窗口冻结"——为探针期望错误（本 harness 行高实测 ~194px 而非估值 44px，短滚动下 row 0 在 overscan 窗口内属正确行为；深滚动验证窗口随动正常）；(b) scrollRef 指向错误（fiber 实测 scrollRef.current = 外层可滚动容器，正确）；(c) 模式切换卸载竞态（首载即复现，非切换专属）

Exit Criteria:

- [x] 失败测试就位且记录红证据。注意：happy-dom 下 flattenedItems 本就非空（见 Current Baseline），定向测试可能修复前即为绿——此时红证据以 live 探针（fresh Chromium 0 行）+ 根因实验记录为准，happy-dom 测试充当常驻回归护栏（performance-table-page.test.tsx 7/7，断言面按 Test Strategy 落实为空态行缺省 + scroll 容器接线）
- [x] 根因结论（含实验证据）写入 plan，至少排除/确认上述三项（(a) scrollRef 赋值时序——fiber 实测指向正确容器，证伪；(b) compiler-skip 边界——实锤，单文件 exclude 二分修复；(c) 订阅时序——证伪；另证伪"滚动冻结"分支（行高 ~194px 探针期望错误），全程记录于 Phase 1 Fix 行）

### Phase 2 - 修复 + 转绿

Status: completed
Targets: `table-virtual-body.tsx`、`table-renderer.tsx`、`use-table-row-scope-cache.ts`（Phase 2 修复落在 Phase 1 确认的根因位点，targets 覆盖三个嫌疑点对应的文件）

- Item Types: `Fix`

- [x] Fix: 按根因实施最小修复——`use-table-row-scope-cache.ts` 文件级 `'use no memo'`（比三个候选更小且直击根因：问题在 hook 自身编译产物，不在 scrollRef/观测/消费接线）
- [x] blocked 用例转绿（重写为 happy-dom 断言面，7/7）；live 验证行数 > 0 且深滚动窗口变化（e2e 固化 2/2：tests/e2e/table-virtual-body.spec.ts，含滚动后 user_374+ + topSpacer > 10000px 断言）；`_tmp/perf-ux-audit-20260928/perf-baseline-probe.mjs` 由该 e2e spec 取代
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿；分页开启路径回归绿（playground performance-table-page 7/7 含 Table Only 模式）

Exit Criteria:

- [x] blocked 用例转绿 + live 探针证据（数字记录：首载 9 行、Table Only 53 行、往返后 9 行、深滚动 topSpacer 30825px/首行 user_374）
- [x] `pnpm --filter @nop-chaos/flux-renderers-data test` 全绿
- [x] flux-playground 相关用例全绿（performance-table-page 7/7）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，2026-09-28）
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed: 4 Minors 全部吸收——(1) Related 中 `table-renderer.tsx` 路径更正为 `src/table-renderer.tsx`（原误写为 `src/table-renderer/table-renderer.tsx`）；(2) Phase 2 Targets 补入 `use-table-row-scope-cache.ts`（嫌疑点 (c) 的修复位点）；(3) Phase 1 Exit Criterion 明确"happy-dom 修复前可能即绿，红证据以 live 探针 + 根因实验记录为准"；(4) 探针路径更正为 `_tmp/perf-ux-audit-20260928/perf-baseline-probe.mjs`，并新增 closure 时升级为 `tests/e2e/` 常驻回归 spec 的要求。Reviewer 附加确认：`table-renderer.tsx:561-564` 存在历史注释 `[G3-R4-视角5-01]` 记录同位点曾发生"scrollRef null → 0 行"同类事故，强化嫌疑点 (1)。

## Closure Gates

- [x] confirmed live defect（VirtualBody 零行）已修复且失败测试转绿（e2e 2/2 两轮稳定 + happy-dom 7/7）
- [x] 行为/契约结果已达成：虚拟窗口化（首载 9 行）、滚动更新（深滚动 user_374 + spacer 断言）、分页路径无回归（Table Only 53 行 + playground 7/7）均有 proof
- [x] 必要 focused verification 已完成（Phase 1-2 Exit Criteria 全勾）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（排查中证伪的滚动冻结分支记录于 Phase 1，非缺陷）
- [x] 受影响的 owner docs 已同步（见下方 owner-doc update：performance-design-requirements.md 增补组合契约与编译豁免登记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（r1 rejected→修复 Blocker/Major 后 r2 复审通过，见 Closure Audit Evidence）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（无）

## Non-Blocking Follow-ups

- performance-table 压测 harness 的量化数字（修复前后交互延迟对比）在修复落地后补记 daily log。

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）
- Evidence: r1 rejected（1 Blocker：e2e helper 定位器命中 aria-hidden 顶部 spacer；1 Major：复选框纪律）→ 全部修复（定位器改 `tbody tr:not([aria-hidden="true"])`、复选框对齐、Test Strategy 措辞对齐、ScopeRef 导入修正）；r2 **approved-with-minors**（auditor 自跑：e2e 2 passed 首轮无 flake、data 169 文件/1183、playground 37 文件/393、performance-table-page 7/7、oversized gate exit 0、repo typecheck 42/42；2 Minor：本 Closure Evidence 回填与提交文件面圈定——均已在本提交落实）。

Follow-up:

- 见 Non-Blocking Follow-ups（压测延迟对比数字已于下节补记 daily log）
