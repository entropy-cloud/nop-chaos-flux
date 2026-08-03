# C4.3 data 其余组件逐组件审计（tree/chart/list/pagination/statistics/data-source）

> Plan Status: active
> Mission: component-audit
> Work Item: C4.3
> Last Reviewed: 2026-08-04
> Source: `docs/backlog/component-audit-roadmap.md`（C4.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`CONTEXT.md`（CRUD 域设计语言——data-source 是 loadAction/CRUD Scope 的请求层基础）、`docs/logs/2026/08-03.md`
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C4.2（`2026-08-04-0043-1`）/ C5.1（`2026-08-04-0043-3`）并行独立（均只依赖 C0）。前置基础：C4.1（`2026-08-03-1616-3`，completed）已修复 table 侧 P1-4 childrenSource actionValue 分类；08-02 nested-schema 机制（completed）已分类 select/tree searchSource/childrenSource 等——tree 的 childrenSource/searchSource 复验基础

## Purpose

对 `flux-renderers-data` 其余 6 个组件（tree/chart/list/pagination/statistics/data-source）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），每族完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 6 张审计卡全部 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（pagination/statistics 数据流、tree 展开/选中态、list 分页/无限滚动）、6 嵌套 schema 分类（tree childrenSource/searchSource、data-source 请求层 08-02 机制复验）、7 事件与 action 契约（pagination:change 事件 payload 形状、chart 交互、tree 节点事件）、11 异步生命周期（data-source 远程加载、tree 懒加载、list 无限滚动 abort/竞态）、12 组合宿主场景（CRUD/data-source 组合、pagination 驱动 table/list、chart 数据流）、15 性能边界（tree 大节点渲染、list 无限滚动、chart 重渲染）。

## Current Baseline

- **组件与文件**：
  - `tree-renderer.tsx`（620 行）+ `tree-search.tsx`、`tree-node-helpers.ts`、`tree-focus-nav.ts`
  - `chart-renderer.tsx`（648 行）+ `chart-schemas.ts`
  - `list-renderer.tsx`（463 行）+ `list-pagination.ts`（200 行）、`use-infinite-scroll.ts`（209 行）、`crud-list-pagination.tsx`
  - `pagination-renderer.tsx`（325 行）
  - `statistics-renderer.tsx`（17 行）
  - `data-source-renderer.tsx`（86 行）
- **注册定义**：`data-renderer-definitions.ts`（data-source `:272`、chart `:345`、tree `:379`、list `:408`）、`w2a-data-composition-definitions.ts`（pagination `:13`、statistics `:108`）。
- **设计文档**：`docs/components/{tree,chart,list,pagination,data-source}/design.md` + `example.json` 存在；**statistics 无 `docs/components/statistics/` 目录**（维度 17 需核对 amis-baseline-matrix 或其他 owner 来源，缺失时记录并走发现裁决）。
- **playground**：`apps/playground/src/component-lab/renderers/{tree,chart,list,pagination,statistics,data-source}-lab-page.tsx` 均存在（data-source 另有 `data-source-lab-page.test.tsx`）。
- **既有单测**：`__tests__/` 下 ≥16 个本族测试文件（`data-tree-*.test.tsx` ×3、`tree-display-ux.test.tsx`、`chart-renderer*.test.tsx` ×2、`chart-responsive.test.tsx`、`data-chart-handles.test.tsx`、`data-list-rendering.test.tsx`、`list-pagination-infinite.test.tsx`、`list-responsive.test.tsx`、`list-cross-page-key.test.tsx`、`data-pagination-rendering.test.tsx`、`data-source.test.tsx`、`data-source-capabilities.test.tsx`、`data-crud-source-runtime.test.tsx` 等，含 crud/table 分页族共享测试）。
- **e2e**：`tests/e2e/tree-display-ux.spec.ts`、`w1c-list.spec.ts`、`w1c-list-pagination.spec.ts`、`w2a-data-composition.spec.ts`、`m4-data.spec.ts`、`component-lab/data-renderers.spec.ts`、`crud-demo.spec.ts`（CRUD 宿主）；本族无 `tests/e2e/component-lab/c4-3-host-surfaces.spec.ts`（需新增）。
- **基线**：以 C0 回写基线为准（unit 全绿 58/58；e2e pre-existing 项中本族无归属项——diff-perf 200ms 阈值属 content 包机器相关类别（CV 专项），ai/scheduling 项归 C8.1/C9）。

## Goals

- 6 张审计卡（`docs/audits/per-component/{tree,chart,list,pagination,statistics,data-source}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——data-source 远程加载驱动 list/table（CRUD 宿主组合）、tree 懒加载/搜索、pagination 驱动列表数据流、chart 数据流。
- roadmap C4.3 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C4.2 CRUD 本体（组合宿主场景仅以验证方式触及，不审 CRUD 自身）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。

## Scope

### In Scope

- 6 组件 × 18 维审计卡（维度重点：1 Schema 契约（各组件 schema 与注册 fields/validate 一致）、2 RendererComponentProps 合规、3 值所有权三态（pagination currentPage/pageSize/total 数据流、statistics total、tree 展开/选中/拖拽态 ownership、list 分页/无限滚动状态）、4 表单参与（list/tree 数据展示类组件非表单组件——仅核对 data-field 语义或明确 n-a）、5 DOM 与选择器契约（data-field/data-renderer/data-value/data-testid、tree 节点 DOM 契约、pagination 按钮契约）、6 嵌套 schema 分类（**tree childrenSource/searchSource、data-source 请求层 08-02 机制落地后复验**、无 deepFields 残留）、7 事件与 action 契约（pagination:change/page-size-change payload 形状、tree 节点点击/展开事件、chart 点击事件、normalizeActionEvent 语义）、8 a11y（tree 键盘导航/焦点管理、pagination 按钮键盘路径、aria 语义）、9 i18n（空态/加载/分页/操作文案 key）、10 四态覆盖（空/加载/错误/禁用——tree 空态/加载态、chart 空数据、list 加载/错误态）、11 异步生命周期（data-source 远程加载 abort/竞态/失败态/重试、tree 懒加载、list 无限滚动 abort/竞态）、12 组合宿主场景（data-source 驱动 CRUD/list 组合、pagination 驱动列表、chart 数据流、**bug 73 模式专项**）、13 样式契约（widget 自样式、布局仅 marker）、14 React 19、15 性能边界（tree 大节点渲染、list 无限滚动、chart 重渲染 key 稳定性）、16 测试质量（既有测试断言正确行为而非 not-throw、DOM 契约断言、错误路径）、17 文档对照（design.md ↔ 实现 props/行为——**statistics 缺 design.md 时核对 amis-baseline-matrix**）、18 注册/包边界/IO 安全红线（surface 双注册、data-source 远程加载走 env IO 边界 INV-1/INV-2））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（data-source 远程加载驱动列表、tree 懒加载/搜索、pagination 数据流、chart 数据流）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C4.2 CRUD 本体、C4.3 以外组件族。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- e2e pre-existing 剩余项（ai/scheduling/content 包，successor C8.1/C9/CV）。

## Failure Paths

| 可测场景编号    | 触发                                  | 行为（含错误码）                                          | 可重试 | 用户可见表现        |
| --------------- | ------------------------------------- | --------------------------------------------------------- | ------ | ------------------- |
| host-ds-list    | data-source 远程加载驱动 list（真机） | 数据经 env IO 边界加载、失败态展示 + 重试、竞态不覆盖新值 | 是     | 列表按远程数据渲染  |
| host-tree-lazy  | tree 懒加载/搜索                      | 懒加载子节点正确、搜索过滤正确、失败态可重试              | 是     | 树展开/搜索内容正确 |
| host-pagination | pagination 驱动列表（currentPage）    | 页码/页大小变更事件 payload 正确、列表数据流正确          | 是     | 列表随分页刷新      |
| host-chart      | chart 数据流/交互                     | 图表按数据渲染、点击事件 payload 正确、空数据态正确       | 是     | 图表/空态正确       |
| host-ds-fail    | data-source 远程加载失败              | 错误态 + 重试可用、旧数据保留（bug 73 模式专项）          | 是     | 错误提示 + 重试按钮 |

## Test Strategy

本档选择：**必须自动化** —— data-source 请求层是数据展示核心回归路径（env IO 边界 INV-1 契约 + 异步生命周期 + bug 73 真机失败模式），tree/list 懒加载与无限滚动是异步核心路径；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-data typecheck/build/lint/test` + 相关 e2e 回归（`tree-display-ux.spec.ts`、`w1c-list.spec.ts`、`w1c-list-pagination.spec.ts`、`w2a-data-composition.spec.ts`、`m4-data.spec.ts`、`component-lab/data-renderers.spec.ts`、`crud-demo.spec.ts`）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: planned
Targets: `packages/flux-renderers-data/src/{tree,chart,list,pagination,statistics,data-source}-renderer.tsx` 及子模块、`docs/audits/per-component/`

- Item Types: `Proof`

- [ ] 审计前核对注册定义：6 组件注册项（type/fields/validate）与各自 schema 一致（维度 1/18）；data-source/chart/tree/list 在 `data-renderer-definitions.ts`、pagination/statistics 在 `w2a-data-composition-definitions.ts`。
- [ ] 产出 6 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [ ] 维度重点核查：值所有权（维度 3：pagination/statistics 数据流、tree 展开/选中态 ownership、list 分页/无限滚动）；嵌套 schema 分类（维度 6：tree childrenSource/searchSource、data-source 请求层 08-02 机制复验）。
- [ ] 事件与 action 契约（维度 7：pagination:change/page-size-change payload 形状、tree 节点事件、chart 交互事件）与 a11y（维度 8：tree 键盘导航/焦点管理、pagination 按钮路径）。
- [ ] 异步生命周期（维度 11：data-source 远程加载 abort/竞态/失败态/重试、tree 懒加载、list 无限滚动）与性能边界（维度 15：tree 大节点、无限滚动、chart 重渲染）。
- [ ] 测试质量（维度 16）：既有 data-\* 测试断言正确行为而非 not-throw、DOM 契约断言、错误路径——假绿核查。
- [ ] 文档对照（维度 17）：各组件 design.md ↔ 实现 props/行为逐项核对；**statistics 缺 design.md 时核对 amis-baseline-matrix 或记录缺文档发现**。

Exit Criteria:

> 本 Phase 交付 6 张审计卡（含裁决），是后续修复的唯一事实来源。

- [ ] `docs/audits/per-component/{tree,chart,list,pagination,statistics,data-source}.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [ ] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，否则 `open`；08-02 机制复验结论已记录。

### Phase 2 - P0/P1 自动修复（test-first）

Status: planned
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [ ] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [ ] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [ ] 共性缺陷裁决（Decision）：公共层/跨包发现（data-source 请求层、tree 节点机制、无限滚动共享逻辑）影响 ≥2 组件/跨包 → 按 roadmap 自动修复机制 §7 处理（当前 plan 内优先修复并事后回写 CX-n，或插入 CX-n work item）；根因单点 `shared:` 标记归 CR。
- [ ] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [ ] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [ ] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [ ] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-data typecheck && build && lint && test` 绿（含新增回归测试）。

### Phase 3 - 组合宿主真实浏览器场景

Status: planned
Targets: `tests/e2e/component-lab/c4-3-host-surfaces.spec.ts`（新增）、playground lab 页

- Item Types: `Proof | Fix`

- [ ] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：候选——data-source 远程加载驱动列表（env IO 边界 + 失败重试，bug 73 模式专项）、tree 懒加载/搜索、pagination 驱动列表数据流、chart 数据流/交互；若使用新 lab 页路由，同步在 `playground-entry-pages.spec.ts` 的 ROUTE_ASSERTIONS 补该路由断言（先例：08-03 路由覆盖门禁）。
- [ ] bug 73 模式专项检查：data-source 远程加载真机失败态与重试（单测绿但真机失败类风险）。
- [ ] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [ ] 既有相关 e2e（`tree-display-ux.spec.ts`、`w1c-list*.spec.ts`、`w2a-data-composition.spec.ts`、`m4-data.spec.ts`、`component-lab/data-renderers.spec.ts`、`crud-demo.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [ ] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；相关既有 e2e 回归绿。
- [ ] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

### Phase 4 - 组件回归与审计卡 closure

Status: planned
Targets: 审计卡、`docs/logs/2026/08-04.md`、`docs/backlog/component-audit-roadmap.md`（C4.3 行）

- Item Types: `Proof`

- [ ] 全卡复查：6 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [ ] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-data test` + 相关 e2e spec 全绿；如本 plan 触及公共层（flux-react/field-frame/编译器/数据源请求层），追加受影响包验证并记录。
- [ ] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、08-02 机制复验结论、CX-n 插入（如有）与决策。
- [ ] 若插入了 CX-n：同步更新 roadmap Work Item Status 表（新行 + 依赖边/注释）并按 §7b（事后回写：父 plan closure 后标 done）/§7c（正常生命周期）走；结构性 CX-n 执行前标注待人工确认。
- [ ] roadmap C4.3 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [ ] 6 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [ ] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_03779767fffe9DMTE2v4pQO20P`）
- Verdict: `pass`（零 Blocker/Major）
- Rounds: 1
- Findings addressed: 全部文件/行引用经 live repo 核对通过（6 组件行数、data-renderer-definitions.ts data-source `:272`/chart `:345`/tree `:379`/list `:408`、w2a-data-composition-definitions.ts pagination `:13`/statistics `:108`、tree/chart/list/pagination/data-source design.md 存在、**statistics 无 docs/components/statistics/ 目录核对确认**、6 个 lab 页存在、e2e 文件清单、roadmap C4.3 `todo` 仅依赖 C0、无 6 组件既有审计卡）；Minor 已处理：既有单测计数措辞由「27 个」改为「≥16 个本族测试文件（含 crud/table 分页族共享测试）」以精确可验证。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [ ] 6 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [ ] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [ ] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查）
- [ ] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [ ] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（mission-driver CLOSURE_VERIFY fresh session 执行）
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 审计卡 P2 backlog（成本 >15 分钟的非阻断体验/文档/测试加固项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: checklist §3 明确 P2 可入审计卡 backlog 由 CR 自动处理；不阻塞本组件 supported baseline 成立。
- Successor Required: `yes`
- Successor Path: CR work item（跨族集中修复）

### 依赖未落地跨 plan 机制的发现（若有，「机制落地后复验」）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 依赖的机制未落地时无法在卡内闭合；按 checklist §3 自动修复纪律（「机制落地后复验」显式登记）由 CR 集中复验，卡内不悬挂。
- Successor Required: `yes`
- Successor Path: CR work item

### e2e pre-existing 其余项（ai/scheduling/content 包）

- Classification: `watch-only residual`
- Why Not Blocking Closure: C0 已逐项裁定为 mission 未触及包失败，successor 归属 C8.1/C9/CV；不在本组件 scope。
- Successor Required: `yes`
- Successor Path: C8.1/C9/CV work item

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- statistics 缺 design.md 的文档补全项（若审计确认）记录为 P2/P3 归 CR 或 CG。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。

## Closure

Status Note: 待执行（draft 状态，尚未执行）。

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent fresh session（mission-driver CLOSURE_VERIFY）
- Evidence: —

Follow-up:

- 待 closure-audit 后填写。
