# 538 shell 能力接线修正——scada/dashboard WorkbenchShell collapsed 契约接线与符合性守卫

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-1b，种子清单 7）；`docs/architecture/designer-workbench-shell.md`（collapsed rail 契约 owner doc）；2026-10-07 用户反馈（设计器家族面板收起能力不一致）
> Related: `docs/plans/528-report-designer-shell-remediation-plan.md`（宽度接线"528 口径"先例）、`docs/plans/532-scada-menu-panel-plan.md`（scada resize 接线）、`docs/skills/interaction-state-audit-prompt.md`（F 类分类法）

## Purpose

把 WorkbenchShell 的 collapsed rail 契约补接到 scada-editor 与 dashboard-editor 两个家族宿主（当前只接 resize 一族），消除"同壳不同能力"的家族 parity 缺口；并把该契约固化为符合性守卫规则与 owner-doc 硬化条款，防复发。

## Current Baseline

- `packages/flux-react/src/workbench/workbench-shell.tsx:14-45` 契约内置两组面板能力：collapsed rail（`leftCollapsed`/`onLeftToggle`/`leftLabel`，右侧对称；收起渲染细 rail，testid `left-panel-collapsed`/`expand-left-panel`）与 resize（`leftResizable`/`leftWidth`/`onLeftWidthChange`）。两者相互独立，均需宿主显式传参。
- **scada-editor**（`packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`，WorkbenchShell 用法约 L422-435）：只传 `leftResizable/leftWidth/onLeftWidthChange/rightResizable/rightWidth/onRightWidthChange`，未传 collapsed 一族，也未传 `leftLabel/rightLabel`。
- **dashboard-editor**（`packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx`，WorkbenchShell 用法约 L437-452）：同样只接 resize 一族；且把 collapse 文案键 `flux.dashboard.editor.collapsePalette/collapseInspector` 挂在 shell 的 `leftLabel/rightLabel` 上——shell 的该 label 是**收起态 rail 的展开** aria-label（`workbench-shell.tsx:116/127` 默认 'Expand left panel'），语义反了，属半接线附带 a11y 缺陷。
- **已合规家族**：flow（`designer-page-body.tsx:506-529`，collapsed+resize 全套，家族命令 `togglePalette`/`toggleInspector`）、report（双路径）、word-editor 均全套；spreadsheet family mapping 声明无侧板，不适用；debugger-lab 非面板式布局，不适用。
- **面板头 affordance 现状**：`designer-workbench-shell.md` L62 要求展开面板头部有可见收起 affordance；flow 已实现（`designer-palette.tsx` testid `collapse-palette`、`designer-inspector.tsx` testid `collapse-inspector`）；scada 两个侧板（`editor/palette/editor-palette.tsx` 的 `EditorPalettePanel`——顶部无 header 容器，首行即 filter 行；`editor/inspector/inspector-panel.tsx` 的 `EditorInspectorPanel`——选中态/空选态双 return 分支）与 dashboard 两面板（`editor-palette.tsx`、`editor-inspector.tsx`）均无收起按钮。
- **i18n**：`flux.dashboard.editor.collapsePalette/collapseInspector` 双 locale 已存在（zh-CN L1943-1944、en-US L1944-1945）；`flux.dashboard.editor.expandPalette/expandInspector` 不存在；`industrial.scada.editor.collapsePalette/collapseInspector/expandPalette/expandInspector` 均不存在。词典位置 `packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`。
- **守卫**：`scripts/check-designer-conformance.mjs`（P5.1，plan 560）按 family 断言制（`assertCheck(family, label, ok)` + `dirContains` 内容探测，ROOT/FAMILIES 硬编码 live repo 路径、无参数化入口），当前无 collapsed 接线规则；`scripts/__tests__/check-designer-conformance.test.ts` 为 **live-conformed-baseline 冒烟测试**（execFileSync 实跑 live repo 断言成功文案），不是 fixtures 型测试。
- **e2e**：scada 家族（`tests/e2e/scada-editor-*.spec.ts`）与 `tests/e2e/dashboard-demo.spec.ts` 均无面板收起-展开用例。

## Goals

- scada-editor 与 dashboard-editor 的左右面板可收起/展开：面板头收起按钮 + 收起态 rail 点击展开，会话内状态保持（不持久化，沿 plan 532 宽度 useState 口径）。
- dashboard rail aria-label 语义修正（展开态语义键）。
- 守卫固化：`check-designer-conformance.mjs` 新增 collapsed 接线规则，scada/dashboard 修复后过门禁，未来家族回归即红。
- owner doc 硬化：`designer-workbench-shell.md` family mapping 写明"有侧板的家族必须接线 collapsed 契约"。
- 判别性测试：单测 + e2e 均为旧实现下必挂（无按钮/无 rail 即挂）。

## Non-Goals

- 折叠/宽度状态跨 reload 持久化（plan 528 Deferred 已裁决，归属家族 core，本计划不做）。
- flow/report/word/spreadsheet/print/page 家族的任何改动（已合规或不适用）。
- WorkbenchShell 本体改动（契约已完备，零 `packages/flux-react` 改动）。
- 抽屉式动画、面板记忆等体验增强。

## Scope

### In Scope

- `packages/flux-renderers-industrial`：canvas 接线 + 两个面板组件收起 affordance + i18n 键 + 判别单测。
- `packages/flux-renderers-dashboard`：renderer 接线 + 两个面板组件收起 affordance + expand 键复用/新增 + 判别单测。
- `packages/flux-i18n`：双 locale 新键（scada collapse/expand 四键、dashboard expand 两键）。
- `scripts/check-designer-conformance.mjs` + fixtures 测试：新增 collapsed 接线规则。
- `docs/architecture/designer-workbench-shell.md`：family mapping 硬化条款。
- e2e：scada 家族新增收起-展开 spec；dashboard-demo spec 补收起-展开用例。
- `docs/backlog/interaction-state-quality-roadmap.md`：IS-1b 状态回写。

### Out Of Scope

- IS-1/IS-2/IS-3 等本 roadmap 其他工作项的种子缺陷。
- 其余 75 个 domain 页面的序列审查（归 IS-4 起）。

## Failure Paths

不适用：纯面板交互接线，无错误处理/API 契约/鉴权/外部集成路径。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（renderer 交互契约 + 家族回归守卫）。Proof 先行：每个 Phase 先写"旧实现下必挂"的判别测试（点面板头收起按钮 → collapsed rail 出现；旧实现无按钮，测试必挂），再实施 Fix。

## Execution Plan

### Phase 1 - industrial scada 接线与面板 affordance

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`、`src/editor/palette/editor-palette.tsx`、`src/editor/inspector/inspector-panel.tsx`、`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`

- Item Types: `Proof | Fix`

- [x] Proof：新增判别单测（canvas 级 RTL，参照既有 `scada-editor-canvas-*.test.tsx` 引导口径）——渲染 scada 编辑器 → 点 testid `collapse-palette` → `left-panel-collapsed` rail 出现且 `left-panel-expanded` 消失 → 点 `expand-left-panel` → 面板恢复；`collapse-inspector`/`expand-right-panel` 右侧对称；左右状态独立。旧实现（无按钮）下必挂。落 `scada-editor-canvas-panel-collapse.test.tsx`（先红 2 failed → 实施后 3 passed，含 custom slot 零回归例）。
- [x] Fix：`scada-editor-canvas.tsx` 接线——会话态 `useState`（左右各一）+ 传 `leftCollapsed/onLeftToggle/leftLabel`（label 用 expand 语义键）与右侧对称。
- [x] Fix：`EditorPalettePanel`/`EditorInspectorPanel` 增加可选 `onCollapse?: () => void` 与 `collapseLabel?: string` props，渲染收起按钮（ghost icon Button，testid 复用 flow 先例 `collapse-palette`/`collapse-inspector`；不传 props 时零渲染，其他消费方零回归）。落点写实：`EditorPalettePanel` 顶部现无 header 容器（首行即 filter 行），需新增 header 行承载按钮（结构对齐 flow `designer-palette.tsx` header 口径）；`EditorInspectorPanel` 选中态与空选态双 return 分支均渲染按钮。
- [x] Fix：i18n 新键 `industrial.scada.editor.collapsePalette/collapseInspector/expandPalette/expandInspector` 双 locale（另补 `palette.title` 供新 header 行用）。
- [x] Fix：dashboard 反例对照不适用；补充"custom slot 路径（`palette?.render()`/`inspector?.render()` 覆盖 fallback 面板）不受影响"的断言（collapsed 状态在 shell 层，与 slot 内容无关）——以"不传 onCollapse 的面板零渲染按钮"直渲染用例覆盖零回归面。

Exit Criteria:

- [x] 判别单测先红后绿全绿（industrial 包 focused test）。
- [x] scada 编辑器左右面板收起/展开在单测中行为正确，rail testid 与 shell 契约一致。
- [x] 不传 `onCollapse` 的既有消费路径零变化（既有 scada 测试全绿——industrial 全包 vitest exit 0）。

### Phase 2 - dashboard 接线与面板 affordance

Status: completed
Targets: `packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx`、`src/editor/editor-palette.tsx`、`src/editor/editor-inspector.tsx`、`packages/flux-i18n/src/locales/{zh-CN,en-US}.ts`

- Item Types: `Proof | Fix`

- [x] Proof：新增判别单测（参照既有 `dashboard-editor-renderer.test.tsx` 引导口径）——点 `collapse-palette`/`collapse-inspector` → rail 出现 → `expand-left-panel`/`expand-right-panel` 展开；rail aria-label 为**展开**语义键。旧实现下必挂。落 `dashboard-editor-panel-collapse.test.tsx`（先红 2 failed → 实施后 2 passed；aria-label 断言双 locale 兼容集——测试环境 locale 为 en-US）。
- [x] Fix：`dashboard-editor-renderer.tsx` 接线 collapsed 一族（会话态 useState）；`leftLabel/rightLabel` 改挂 expand 语义键（修正现挂 collapse 键的语义反转）。
- [x] Fix：i18n 新键 `flux.dashboard.editor.expandPalette/expandInspector` 双 locale（collapse 键复用既有，转挂面板头按钮）。
- [x] Fix：`EditorPalette`/`EditorInspector` 增加可选 `onCollapse`/`collapseLabel` props + 面板头收起按钮（同 Phase 1 口径；inspector 空选态也保持可收起）。

Exit Criteria:

- [x] 判别单测先红后绿全绿（dashboard 包 focused test）。
- [x] rail aria-label 语义修正有断言覆盖（展开态读"展开"文案键，双 locale 集合断言）。
- [x] 既有 dashboard 测试全绿（dashboard 包 12 files / 92 tests passed）。

### Phase 3 - 守卫固化、owner doc 硬化与 e2e

Status: completed
Targets: `scripts/check-designer-conformance.mjs`、`scripts/__tests__/check-designer-conformance.test.ts`、`docs/architecture/designer-workbench-shell.md`、`tests/e2e/scada-editor-panel-collapse.spec.ts`（新建）、`tests/e2e/dashboard-demo.spec.ts`、`docs/backlog/interaction-state-quality-roadmap.md`

- Item Types: `Fix | Proof`

- [x] Fix：`check-designer-conformance.mjs` 参数化——新增可选 `--root <dir>`（缺省 live repo ROOT，FAMILIES 路径相对 root 解析）与可选 `--families <id>` 家族子集入口（fixtures 只构造目标家族，避免其余家族断言假红）；参数化同时门控断言 8（fixture root 无 `editor-designer-standard.md` 时跳过豁免表对账——live 恒存在不受影响，防 ENOENT 先于规则断言崩溃）；既有 live 冒烟行为零变化（无参调用逐字节等价——live repo 实跑 exit 0 输出不变）。
- [x] Proof（先行）：规则判别 fixtures——临时 fixture 目录构造"模拟未接线宿主"与"已接线宿主"两份 scada family 样本（样本携带其余断言的契约标记，使红绿差异只落在 collapsed 规则）：规则实现前 fixtures 测试必红（旧脚本无此规则、无法产生期望的 stderr 失败行）；实现后未接线样本红（stderr 含 `collapsed 契约接线（onLeftToggle/onRightToggle）`）且不误报其余断言、已接线样本绿、live repo 全绿。落 `scripts/__tests__/check-designer-conformance.test.ts`（3 passed）。
- [x] Fix：新增规则——有侧板家族（以 owner doc 硬化后 family mapping 为准：flow/report/word/scada/dashboard）其 renderers 目录必须含 `onLeftToggle` 与 `onRightToggle` 接线（`dirContains` 内容探测，沿既有断言制，仅对 renderers 目录存在的家族断言；spreadsheet/page/print 按 family mapping 不检查）。scada/dashboard（Phase 1/2 修复后）过门禁——live `node scripts/check-designer-conformance.mjs` exit 0。
- [x] Fix：`designer-workbench-shell.md` 硬化——①Family Mapping 节头部新增 binding 规则段（有侧板家族必须接线 collapsed 契约 + 面板头 affordance；resize-only 不合规；守卫断言 5 家族）；②新增 Dashboard Editor Family Mapping 小节（header/palette/canvas/inspector 四槽映射 + 固定宽 + collapsed/expand label 语义分工；原缺失）。
- [x] Proof：e2e `scada-editor-panel-collapse.spec.ts`（2 用例：双面板收起/展开 + 独立性）+ `dashboard-demo.spec.ts` 补 1 用例（双侧收起/展开往返）——7/7 passed（含既有 dashboard 4 用例零回归）。
- [x] Fix：roadmap IS-1b 状态回写（closure audit 通过后 `planned`→`done`）。

Exit Criteria:

- [x] 守卫规则判别 fixtures 先红后绿（未接线样本在新规则下必红）。
- [x] `pnpm check` 过（守卫规则零新增红；scada/dashboard 在新规则下绿；脚本无参调用行为不变）。
- [x] 目标 e2e（新 spec + dashboard spec）全绿（7/7）。
- [x] shell doc 硬化条款 + dashboard Family Mapping 小节落字且与 live 行为一致。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（general-purpose fresh session，agent_569d7fcd-0758-49ce-bcbf-31ab6801c2e2）
- Verdict: `pass-with-minors`
- Rounds: 2（R1 `fail`：1 Major + 5 Minor → 全部修订 → R2 scoped re-check `pass-with-minors` 零 Blocker/零 Major）
- Findings addressed: Major 1 条——Phase 3 守卫 Proof 在硬编码脚本下不可落地 + baseline 对既有测试定性失实（修法：`--root`/`--families` 参数化 + fixtures 判别 Proof 先行 + 定性更正为 live-conformed-baseline 冒烟测试）；Minor 5 条随共识修复（dashboard Family Mapping 小节缺失显式化 / Phase 3 项序 Proof 先行 / "四面板"→"两个侧板" / palette 无 header 与 inspector 双分支落点写实 / Failure Paths 补不适用）；R2 残留 2 Minor（fixture 下断言 8 门控与家族子集入口、L112 判别措辞）已随转 active 就地落字。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（scada/dashboard collapsed 接线 + dashboard aria-label 语义反转）
- [x] 所有 in-scope confirmed contract drifts 已收敛（家族 parity 与 shell doc 契约一致）
- [x] 行为/契约结果已达成（两家族面板可收起/展开，rail 与 affordance 契约一致）
- [x] 必要 focused verification 已完成（判别单测先红后绿 + 守卫 fixtures + 目标 e2e 7/7）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（designer-workbench-shell.md 硬化；roadmap IS-1b 已回写 `done`）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 任务）
- [x] `pnpm check`（exit 0，零新增未登记红）

## Deferred But Adjudicated

（无——执行中如推翻/改判条目，当场落本节。）

## Non-Blocking Follow-ups

- 面板折叠/宽度状态持久化（plan 528 Deferred 既有裁决，归家族 core，另行立项）。
- `check-designer-conformance.mjs` parseArgs 缺参守卫（`--root`/`--families` 缺值时显式报错替代 TypeError）——closure audit Trivial①，脚本健壮性优化项，非契约缺口。

## Closure

Status Note: 2026-10-07 收口。三 Phase 全 completed：scada/dashboard 两家族 WorkbenchShell collapsed 契约接线 + 四面板头收起 affordance + dashboard rail aria-label 语义反转修正 + i18n 六新键双 locale；守卫 `check-designer-conformance.mjs` 参数化（--root/--families）+ collapsed 接线规则 + fixtures 判别两腿；shell doc Family Mapping 硬化 + Dashboard Editor 小节补齐。全量验证 full-green（typecheck/build/lint 42/42、test 78/78 任务、check exit 0、目标 e2e 7/7）。IS-1b 已回写 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（general-purpose fresh session，agent_5a30a56d-9b13-4c61-b039-0dac5dbc52d5）
- Evidence: APPROVED 零 Blocker/零 Major/零 Minor。三 Phase Exit Criteria 逐条 live 实跑核验（conformance 实跑 exit 0、fixtures 3/3、industrial 150 files/1687 tests 全绿、dashboard 12 files/92 tests、目标 e2e 7/7）；先红后绿经 `git show HEAD:` 证实旧实现三面板无 collapse testid（判别机制成立）；shell doc/守卫/roadmap 三处 5 家族集合一致；Deferred（无）与正文一致。2 Trivial（parseArgs 缺参守卫、locale 措辞 nano-漂移）记 Non-Blocking Follow-ups / 备注，不阻塞。
