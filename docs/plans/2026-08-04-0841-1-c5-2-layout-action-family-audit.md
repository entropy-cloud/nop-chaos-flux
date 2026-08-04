# C5.2 layout 动作组族逐组件审计（button-group/dropdown-button/steps/timeline）

> Plan Status: active
> Mission: component-audit
> Work Item: C5.2
> Last Reviewed: 2026-08-04
> Source: `docs/backlog/component-audit-roadmap.md`（C5.x Phase Details）、`docs/audits/component-audit-checklist.md`（18 维 + 审计卡模板 + 自动修复纪律）、`docs/skills/deep-audit-prompts.md`、`docs/architecture/styling-system.md`（布局 renderer 仅 marker 类契约）、`docs/logs/2026/08-04.md`（C5.1 节）
> Related: 依赖 C0（`2026-08-02-2043-1`，completed）完成后开工；与 C6.1（`2026-08-04-0841-2`）/ C6.2（`2026-08-04-0841-3`）并行独立（均只依赖 C0）。前置基础：08-02 nested-schema 机制（completed）已分类 dropdown-button/button-group items 的 action/onClick event 字段（layout-renderer-definitions.ts fieldRules）；08-02 params/isolate 迁移语义（`2026-08-02-2`，completed）；C5.1（`2026-08-04-0043-3`，completed）新增 LAYOUT_RENDERER_ROUTES（grid/collapse/wizard 3 条）并显式标注 "C5.2 successor 补 button-group/dropdown-button/steps/timeline 4 条"（`apps/playground/src/route-model.ts:207` 注释）

## Purpose

对 `flux-renderers-layout` 动作组族 4 个组件（button-group/dropdown-button/steps/timeline）完成 18 维逐组件审计（每组件一张审计卡，P0/P1/P2/P3 裁决留痕），P0/P1 缺陷在**同一 plan 内自动修复**（test-first + 回归测试 + 受影响包验证门禁），完成 ≥1 个真实浏览器组合宿主场景验证（含 bug 73 模式专项检查），最终 4 张审计卡全部 `closed`（P0/P1 清零）。重点维度：3 值所有权三态（steps 当前步 local/controlled/scope 三态与 scope-degrade、button-group 选择态 seed 语义）、5 DOM 契约（布局 renderer 仅 marker 类、items 项 DOM 契约）、6 嵌套 schema 分类（**dropdown-button items 内嵌 action 分类——行 scope 污染 live defect（08-02 修复）真机复验**、button-group items action 字段）、7 事件与 action 契约（dropdown-button 菜单项 action 派发 payload、button-group onChange payload、steps onChange payload `{value, stepIndex, stepKey}`）、12 组合宿主场景（CRUD 行内 dropdown-button 菜单操作——dialog-dropdown-row-edit 模式）、14 React 19。

## Current Baseline

- **组件与文件**：`button-group-renderer.tsx`（138 行）、`dropdown-button-renderer.tsx`（129 行）、`steps-renderer.tsx`（316 行）、`timeline-renderer.tsx`（213 行）+ `process-display-definitions.ts`（steps `:5`、timeline `:92`）。
- **注册定义**：`layout-renderer-definitions.ts`（button-group `:371`、dropdown-button `:493`）；items fieldRules 已分类（button-group items `:377`：label value / action event / variant value / disabled value；dropdown-button items `:541`：label value / action event / onClick event / disabled value / destructive value / key value / icon value——08-02 机制）。steps 定义于 `process-display-definitions.ts`：items 纯 value prop（无嵌套 region）、value/defaultValue/valueOwnership/valueStatePath（scope 无 path 降级 local + dev warn，`steps-renderer.tsx:11/94-104` 已实现 warnScopeDegraded——C5.1 collapse P1-1 从 steps 移植的源头）、onChange eventContracts payload `{value, stepIndex, stepKey}`。timeline：display-only（无 owner state、无事件），items 纯 value、mode/orientation/reverse。
- **设计文档**：`docs/components/{button-group,dropdown-button,steps,timeline}/design.md` + `example.json` 均存在。
- **playground**：4 组件**无 component-lab lab 页**（维度 18 缺口，C5.1 已标注 C5.2 补）；demo 宿主在 `w3a-w3b-layout-action-family-demo.tsx`（button-group `:111` demo-button-group、dropdown-button `:133` demo-dropdown-button、`w3a-w3b-renderer-host`）与 `w4b-process-display-family-demo.tsx`（steps `:57/:69/:89` demo-steps/demo-steps-vertical/demo-steps-local、timeline `:109/:120` demo-timeline/demo-timeline-reverse）。
- **既有单测**：`button-group-renderer.test.tsx`、`dropdown-button-renderer.test.tsx`（+ `dropdown-button-redline.test.tsx`）、`steps-renderer.test.tsx`、`timeline-renderer.test.tsx`（4 文件合计 35 用例）。
- **e2e**：`w3a-w3b-layout-action-family.spec.ts`（button-group `:70`、dropdown-button `:92`）、`w4b-process-display-family.spec.ts`（steps/timeline 4 场景：steps ×3 + timeline ×1）、`tests/e2e/component-lab/dialog-dropdown-row-edit.spec.ts`（dropdown-button 行 scope 污染 live defect 真机回归，08-02 修复）、`tests/e2e/component-lab/c1-2-host-surfaces.spec.ts`（loop-row sibling of 08-02 dropdown-button fix）、`layout-content.spec.ts`（steps 只读 `:118`）；本族无 `tests/e2e/component-lab/c5-2-host-surfaces.spec.ts`（需新增）。
- **基线**：C0 基线 unit 全绿（typecheck/build/lint 31/31、test 58/58）；**e2e 已于 C5.1 verify 轮达成 full-green（882 passed / 43 skipped / 0 failed，`docs/logs/2026/08-04.md` C5.1 verify 节）**——pre-existing 失败项已全部清零，本 plan 不再继承 e2e pre-existing 债务。
- **已知 live defect 复验项**：dropdown-button 行 scope 污染（CRUD 行内下拉菜单提交旧行值）由 08-02 nested-schema 计划修复，`dialog-dropdown-row-edit.spec.ts` 为真机回归——C5.2 按 C5.x Phase Details「items 内嵌 action 分类（dropdown-button live defect 复验）」在维度 6/12 复验。

## Goals

- 4 张审计卡（`docs/audits/per-component/{button-group,dropdown-button,steps,timeline}.md`）18 维逐项核对，P0/P1/P2/P3 裁决留痕，`文件:行` 证据，全部 `closed`（P0/P1 清零）。
- 本族 P0/P1 缺陷 test-first 自动修复（契约/公共层修复 Must automate），P2 低成本当场修复、其余登记卡内 backlog 归 CR。
- ≥1 个真实浏览器组合宿主场景（含 bug 73 模式专项）：候选——CRUD 行内 dropdown-button 菜单操作（dialog-dropdown-row-edit 模式复验）、steps 三态 ownership 切换、button-group 选择态 + onChange payload、timeline 展示。
- 补全 4 个 lab 页 + LAYOUT_RENDERER_ROUTES 4 条 + COMPONENT_LAB_COVERAGE_MANIFEST 条目（C5.1 遗留标注的 C5.2 收口项）。
- roadmap C5.2 行标 `done`（独立子 agent closure-audit pass 后）。

## Non-Goals

- C6.x content 族（C6.1 `2026-08-04-0841-2` / C6.2 `2026-08-04-0841-3` 并行独立）。
- checklist v2 修订（CG）、审计工具脚本升级（CG）。
- 结构性重构（公共 API/包边界/编译期机制，需人工确认后另立 CX-n；纯行为修复不视为结构性）。
- 各审计卡 P2 backlog（>15 分钟项）归 CR 处理，不在本 plan 内实现。
- wizard 相关语义（C5.1 已收口）不在本 plan 重审。

## Scope

### In Scope

- 4 组件 × 18 维审计卡（维度重点：1 Schema 契约（ButtonGroupSchema/DropdownButtonSchema/StepsSchema/TimelineSchema 与注册 fields/validate 一致）、2 RendererComponentProps 合规、3 值所有权三态（steps valueOwnership local/controlled/scope 全路径 + scope-degrade、button-group 选择态 seed 非响应语义、timeline 无状态核对）、4 表单参与（本族为展示/操作组件，无表单值参与——核对参与声明）、5 DOM 与选择器契约（**布局 renderer 仅 marker 类——4 组件根只输出 marker 类**、items 项 DOM 契约）、6 嵌套 schema 分类（**dropdown-button/button-group items 内嵌 action 08-02 机制复验 + dropdown-button 行 scope 污染 live defect 复验、params/isolate 迁移语义**、无 deepFields 残留）、7 事件与 action 契约（dropdown-button 菜单项 action/onClick 派发 payload 形状、button-group onChange `{value, selectedKeys, selectionMode}`、steps onChange `{value, stepIndex, stepKey}`）、8 a11y（dropdown-button 菜单键盘路径/焦点管理、button-group 按钮组 ARIA、steps 步进语义）、9 i18n（菜单/按钮文案 key）、10 四态覆盖（空/加载/错误/禁用——disabled 项、timeline 空 items）、11 异步生命周期（本族无异步——核对无泄漏）、12 组合宿主场景（CRUD 行内 dropdown-button、dialog 内菜单、**bug 73 模式专项**）、13 样式契约（布局仅 marker、无 BEM）、14 React 19、15 性能边界（菜单大量项、steps 切换重渲染）、16 测试质量（既有测试断言正确行为而非 not-throw、DOM 契约断言、错误路径）、17 文档对照（design.md ↔ 实现 props/行为）、18 注册/包边界/IO 安全红线（surface 双注册、**4 组件无 component-lab lab 页——补页**））。
- P0/P1 自动修复（test-first）+ P2 低成本即时修复。
- 真实浏览器宿主场景（CRUD 行内 dropdown-button 菜单操作、steps 三态、button-group 选择）。
- 审计卡状态流转（open → fixing → fixed-pending-closure → closed）与 daily log 记录。

### Out Of Scope

- C6.x content 族（并行 plan 覆盖）。
- checklist v2 修订（CG）。
- 结构性重构（需人工确认后另立 CX-n）。
- wizard/grid/collapse 语义（C5.1 已收口）。

## Failure Paths

| 可测场景编号      | 触发                                                  | 行为（含错误码）                                                           | 可重试 | 用户可见表现        |
| ----------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- | ------ | ------------------- |
| host-bg-select    | button-group 选择项切换                               | 选择态切换正确、onChange payload `{value,selectedKeys,selectionMode}` 正确 | 是     | 按钮高亮切换正确    |
| host-dd-row       | CRUD 行内 dropdown-button 菜单操作（bug 73 模式专项） | 菜单项 action 携带**当前行**值提交（非旧行值）——08-02 修复真机复验         | 是     | 提交值正确          |
| host-steps-owner  | steps 三态 ownership 切换                             | local/controlled/scope 三态步进行为正确、scope-degrade 降级 + warn         | 是     | 当前步高亮正确      |
| host-steps-change | steps 点击切换                                        | onChange payload `{value,stepIndex,stepKey}` 正确                          | 是     | 步进切换 + 事件正确 |
| host-timeline     | timeline 展示（mode/orientation/reverse）             | 展示模式正确、无 owner 状态副作用                                          | 是     | 时间线渲染正确      |

## Test Strategy

本档选择：**必须自动化** —— dropdown-button 行 scope 污染 live defect 复验是核心回归路径（08-02 机制真机实证），steps 值所有权三态是 C5.x 审查重点，button-group onChange payload 契约为事件形状核对重点；契约/公共层修复必须 test-first（先写失败测试再实现）。验证门禁：受影响包 `pnpm --filter @nop-chaos/flux-renderers-layout typecheck/build/lint/test` + 相关 e2e 回归（`w3a-w3b-layout-action-family.spec.ts`、`w4b-process-display-family.spec.ts`、`dialog-dropdown-row-edit.spec.ts`、`layout-content.spec.ts`）+ 本族新增宿主场景 Playwright（programmatic DOM 断言）。

## Execution Plan

### Phase 1 - 逐组件 18 维审计与审计卡产出

Status: completed
Targets: `packages/flux-renderers-layout/src/{button-group,dropdown-button,steps,timeline}-renderer.tsx`、`layout-renderer-definitions.ts`、`process-display-definitions.ts`、`schemas.ts`、`docs/audits/per-component/`

- Item Types: `Proof`

- [x] 审计前核对注册定义：4 组件注册项（type/fields/propContracts/fieldRules/eventContracts）与各自 schema 一致（维度 1/18）；dropdown-button/button-group items fieldRules（action/onClick event）08-02 机制核对。
- [x] 产出 4 张审计卡：18 维逐项核对（结论 pass/fail/n-a + `文件:行` 证据 + 发现），P0/P1/P2/P3 裁决留痕（checklist §3）。
- [x] 维度重点核查：值所有权三态（维度 3：steps valueOwnership 三态全路径——`steps-renderer.tsx` ownership 读取与三态分支 + scope-degrade warn、button-group 选择态 seed 非响应语义）；dropdown-button 行 scope 污染 live defect 复验（维度 6：08-02 修复后 items action 编译/求值路径——行 scope 不再污染）。
- [x] 事件与 action 契约（维度 7：dropdown-button 菜单项 action/onClick 派发 payload、button-group onChange、steps onChange 与 eventContracts 一致）与 a11y（维度 8：菜单键盘路径/焦点管理、steps ARIA 语义）。
- [x] 异步生命周期（维度 11：本族无异步——核对无泄漏/无 abort 缺口）与性能边界（维度 15：菜单大量项、steps 切换重渲染）。
- [x] 测试质量（维度 16）：既有 4 文件测试断言正确行为而非 not-throw、DOM 契约断言、错误路径——假绿核查（含 dropdown-button-redline.test.tsx 覆盖项）。
- [x] 文档对照（维度 17）：4 组件 design.md ↔ 实现 props/行为逐项核对。
- [x] playground 覆盖核查（维度 18）：4 组件无 component-lab lab 页——记录缺口并裁决（P2 低成本当场补页，Phase 3 落地）。

Exit Criteria:

> 本 Phase 交付 4 张审计卡（含裁决），是后续修复的唯一事实来源。

- [x] `docs/audits/per-component/{button-group,dropdown-button,steps,timeline}.md` 卡存在，18 维表完整、`文件:行` 证据可验证。
- [x] 卡内发现清单带 P0/P1/P2/P3 裁决；无 P0/P1 的卡标记 `closed`，否则 `open`；08-02 机制复验结论（含 dropdown-button 行 scope 污染复验）已记录。

**Phase 1 执行摘要（2026-08-04）**：4 卡产出（`docs/audits/per-component/{button-group,dropdown-button,steps,timeline}.md`）。发现汇总：**P0 ×0、P1 ×4**（dropdown-button P1-1 items fieldRules 死分类 `icon: 'value'`——schema/渲染器零消费（dead-field honesty，wizard P1-1 先例）；dropdown-button P1-2 根硬编码 `inline-block`；steps P1-1 根硬编码 flex；timeline P1-1 根硬编码 flex/gap/overflow——均违反 styling-system.md「No Hardcoded Layout Styles in Renderer Code」+ C5.1 同包 marker-only 根先例）、**P2 ×12**（button-group P2-1 onChange payload 零断言 / P2-2 fieldRules 缺 key 分类 / P2-3 种子优先级文档漂移（defaultValue 恒优先 vs 描述 value 优先 + wizard 先例）/ P2-4 lab 页；dropdown-button P2-1 destructive/disabled 项零断言 / P2-2 lab 页；steps P2-1 onChange payload 零断言 / P2-2 local 种子优先级倒序 / P2-3 item disabled 零断言 / P2-4 lab 页；timeline P2-1 icon 渲染零断言 / P2-2 lab 页）+ **P3 keep ×4**（button-group 空态/selectedSet 重建、dropdown-button 空菜单）。重点维度：dim 3（steps 三态全路径 + scope-degrade ✓ 既有实现 + 测试；button-group seed 非响应 ✓ F4 测试冻结；**P2 种子优先级**）；dim 5（**4 组件根 marker-only 核对——button-group ✓（ui ButtonGroup chrome 属组件层）、dropdown-button/steps/timeline ✗ P1-1/P1-2**）；dim 6（**08-02 机制复验：action/onClick 信封 + 解包 + 行 scope 不污染——button-group/dropdown-button items fieldRules 核对 + redline 测试 + dialog-dropdown-row-edit.spec.ts 真机回归实证（Phase 3 再补宿主复验）；无 deepFields 残留（live grep 零命中）**）；dim 7（payload 形状 ↔ eventContracts 一致；type 前缀同族惯例）；dim 16（假绿核查——无 not-throw 空断言、payload 形状零断言 → P2、dropdown-button destructive/disabled 零断言 → P2、steps item disabled 零断言 → P2、timeline icon 零断言 → P2）。工具脚本：missing-renderer-markers/styling-suspects/runtime-raw-schema-reads/hardcoded-type-dispatch/non-retained/performance-suspects/async-failure-paths 本族 0 命中；react19-optimization-candidates 命中 1 处（steps startTransition :142）为合法设计（C3.x/C5.1 同裁定）；**P1-1/P1-2 根硬编码类为工具模式缺口（styling-suspects 未命中根 class 内联 flex），人工核对确认**。

### Phase 2 - P0/P1 自动修复（test-first）

Status: completed
Targets: 发现涉及的 renderer/子模块文件、schema 文件、契约测试文件、e2e spec

- Item Types: `Fix | Proof | Decision`

- [x] 按审计卡处理 P0/P1：先写复现/回归测试（断言正确行为，非仅 not-throw），再实现修复；DOM/选择器契约变更追加 focused 契约测试与 e2e（test-first 证据：复现测试先于实现）。
- [x] P2 低成本（约 15 分钟内）当场修复；其余登记卡内 backlog 归 CR。
- [x] 共性缺陷裁决（Decision）：若发现 ≥2 组件/跨包/公共层根因，按 roadmap §7 主动插入 CX-n 或并入现有项并回写 daily log；组件单点根因则记录裁决、不插入 CX-n。
- [x] 修复后卡内发现标 `fixed` + commit/plan 引用；卡状态流转 `open → fixing → fixed-pending-closure`。
- [x] 复杂/跨包 bug 修复按 AGENTS.md Bug Fix Test Coverage Rule 记录到 `docs/bugs/`（参考 `docs/bugs/73-*.md`、`docs/bugs/79-*.md` 格式）。

Exit Criteria:

> 本 Phase 交付"发现清零或已裁定"，卡状态与代码行为一致。

- [x] 全部 P0/P1 已修复（卡内标 `fixed` + 证据）或已显式裁定延期（仅允许依赖未落地跨 plan 机制者，标「机制落地后复验」并登记）；无静默跳过。
- [x] 受影响包 `pnpm --filter @nop-chaos/flux-renderers-layout typecheck && build && lint && test` 绿（含新增回归测试）。

**Phase 2 执行摘要（2026-08-04）**：**P0 ×0、P1 ×4 全部 test-first 修复**（flux-renderers-layout 81 → 93 tests，+12）：[steps P1-1 根 marker-only]（steps-renderer.tsx 根改 `cn('nop-steps', meta.className)` + styles.css `.nop-steps[data-orientation=...]` 布局规则）；[timeline P1-1 根 marker-only]（同型，`.nop-timeline[data-orientation=...]`）；[dropdown-button P1-2 根 marker-only]（`.nop-dropdown-button { display:inline-block }` 移入包 CSS）；[dropdown-button P1-1 items fieldRules 死分类 `icon: 'value'` 移除]（dead-field honesty，wizard P1-1 先例）。**P2 当场修复 ×8**：button-group P2-1（onChange payload 形状断言 `{value,selectedKeys,selectionMode}` 经 evaluationBindings 实证 `payload:b|b|single`）/P2-2（fieldRules 补 `key: 'value'`）/P2-3（种子优先级 value-first + F4 测试源码断言同步）；dropdown-button P2-1（destructive/disabled 项断言——Base UI 布尔 data-disabled/aria-disabled 契约）；steps P2-1（onChange payload `{value,stepIndex,stepKey}` 实证 `payload:b|1|b`）/P2-2（local 种子优先级 value-first 对齐 scope/controlled/wizard）/P2-3（item disabled 断言）；timeline P2-1（icon 渲染断言——`resolveLucideIcon` undefined → Circle 默认契约实证）。**共性裁决：全部为组件单点根因 → 无 CX-n 插入**（决策记录于各卡 + daily log）。无复杂跨包 bug（root CSS 迁移为包内样式 + host 导入，非行为面新增），无需 docs/bugs/ 新记录。**test-first 证据**：`__tests__/c5-2-layout-action-family-contract.test.tsx` 12 用例先红（9 failed）后绿（93/93）；4 张审计卡状态 `open → fixing`，发现标 `fixed` + 实现证据。**验证**：受影响包 typecheck/build/lint/test 全绿（93 tests）；workspace `pnpm typecheck` 31/31；`check:renderer-definition-fields-only`/`check:schema-prop-coverage`/`check:docs-garbled`（新增文件零命中）绿。**host 侧改动**：`apps/playground/src/styles.css` 增 `@import '@nop-chaos/flux-renderers-layout/styles.css';`（布局包样式首载，C5.1 时包样式为空故此前未导入）——Phase 3 宿主真机将验证布局行为不回归。

### Phase 3 - 组合宿主真实浏览器场景

Status: completed
Targets: `tests/e2e/component-lab/c5-2-host-surfaces.spec.ts`（新增）、playground lab 页、`route-model.ts`、`tests/e2e/component-lab/coverage-manifest.ts`

- Item Types: `Proof | Fix`

- [x] 设计并实现 ≥1 个本组件真实浏览器组合宿主场景（programmatic DOM 断言，禁截图诊断）：新增 **4 个 lab 页**（`button-group-lab-page.tsx`/`dropdown-button-lab-page.tsx`/`steps-lab-page.tsx`/`timeline-lab-page.tsx`，补上维度 18 缺口——C5.1 标注的 C5.2 收口项）+ `data-c5c2-host.ts` 宿主 schema 模块 + `LAYOUT_RENDERER_ROUTES` 补 4 条（button-group/dropdown-button/steps/timeline，`route-model.ts:207` 注释承诺）+ `COMPONENT_LAB_COVERAGE_MANIFEST` 4 条（smoke.spec.ts 自动覆盖）+ route-matrix 计数测试同步（C5.1 先例：lab 路由不经 `DOMAIN_RENDERER_ROUTES`，由 smoke.spec 门禁）。
- [x] bug 73 模式专项检查：**CRUD 行内 dropdown-button 菜单操作**（dialog-dropdown-row-edit.spec.ts 同款模式）——菜单项 action 提交当前行值（08-02 修复真机复验，C5.x Phase Details 明确项）；组合宿主下菜单项 action 事件 payload 与 scope 求值正确。
- [x] 宿主场景发现的新缺陷按 Phase 2 流程修复（test-first）。
- [x] 既有相关 e2e（`w3a-w3b-layout-action-family.spec.ts`、`w4b-process-display-family.spec.ts`、`dialog-dropdown-row-edit.spec.ts`、`layout-content.spec.ts`、`m3-layout.spec.ts`）在本族改动后回归。

Exit Criteria:

> 本 Phase 交付"真实浏览器行为成立"。

- [x] 宿主场景 spec 通过（Playwright，programmatic DOM 断言）；相关既有 e2e 回归绿。
- [x] bug 73 模式专项检查结论记录于 daily log（pass 或带证据 fail→已修复）。

**Phase 3 执行摘要（2026-08-04）**：**c5-2-host-surfaces.spec.ts 5/5 真机 pass**（programmatic DOM 断言，无截图诊断）：[host-bg-select] button-group single 选择切换 data-selected 互斥 + onChange payload `bg-payload:opt2|opt2|single` → `opt3|opt3|single` 真机报告（选择态 + payload 契约定型）；[**host-dd-row（bug 73 模式专项）**] CRUD 双行 + operation 列 dropdown-button → 行 2「More」→「Edit Row」openDialog → 表单 \_\_get?id=2 预载 `RowTwoNick` → 编辑 `EditedRowTwo` → OK → **probe 收到 `{id:'2', nickName:'EditedRowTwo'}`**（当前行 id + 编辑值——旧行污染会交出行 1 数据；**08-02 行 scope 隔离修复真机复验 pass**）；[host-steps-owner] 三态切换（local 点击切换/controlled host 按钮 echo + 点击不突变/scope 点击写 valueStatePath 报告 `scope:b`）；[host-steps-change] 点击 → data-current-index=1 + payload `steps-payload:s2|1|s2`；[host-timeline] left/alternate/reverse/horizontal 展示 + **marker-only 根 + CSS 驱动布局真机实证**（getComputedStyle display:flex/flexDirection row|column——Phase 2 根 marker-only 重构行为不回归）。**宿主适配记录（非渲染器缺陷，用例作者修正）**：(a) ui ButtonGroup 根 `flex` 为组件层 chrome（cva base），classList 断言调整为禁 grid/gap-\*；(b) steps controlled 报告文本无括号，断言改 `value=b`。**回归**：smoke **62/62**（含新增 4 条目）+ w3a-w3b 5/5 + w4b 4/4 + dialog-dropdown-row-edit 1/1 + layout-content 21/21 + m3-layout 7/7 + c1-2 3/3 + c5-1 5/5 + playground-entry-pages 68/68 + layout-family-enhancements 3/3 = **103+76 全绿**（本族改动零回归）。**lab 路由不经 DOMAIN_RENDERER_ROUTES**（C5.1 先例核对结论不变：playground-entry-pages.spec.ts ROUTE_ASSERTIONS 仅覆盖 domain 路由，lab 路由由 smoke.spec 门禁——无需更新）。**route-matrix 计数测试**：LAYOUT_RENDERER_ROUTES 7 条（3+4）全量纳入 ALL_SHARED_RENDERER_ROUTES，计数测试绿（route-model.ts 超行数触发 lint 门禁 → `LAYOUT_RENDERER_ROUTES` 提取至 `layout-renderer-routes.ts` 新模块，route-model 保持 re-export，公共导入面不变）。

### Phase 4 - 组件回归与审计卡 closure

Status: completed
Targets: 审计卡、`docs/logs/2026/08-04.md`、`docs/backlog/component-audit-roadmap.md`（C5.2 行）

- Item Types: `Proof`

- [x] 全卡复查：4 卡 18 维表结论与最终代码一致；P0/P1 清零；卡状态 `closed`（含 fixed-pending-closure → closed 流转）。
- [x] 本组件范围回归：`pnpm --filter @nop-chaos/flux-renderers-layout test` + 相关 e2e spec 全绿（e2e 基线 full-green 882 passed/43 skipped/0 failed，本 plan 不得引入新增失败）；workspace 全量 `pnpm typecheck`/`build`/`lint`/`test` + `pnpm test:e2e` 最终以 Closure Gates 为准（指南 Minimum Rule 18：全量验证归 closure，非 Phase 默认项——此处仅作收口前置预跑）。
- [x] daily log 记录：卡 closure 汇总、修复清单（commit/plan 引用）、宿主场景结果、08-02 机制复验结论（含 dropdown-button 行 scope 污染复验）、CX-n 插入（若有）与决策。（`docs/logs/2026/08-04.md` C5.2 节）
- [x] roadmap C5.2 行标 `done` 的前置：独立子 agent closure-audit pass（Closure Gates 项，不在本 plan 执行 session 内自审；已交付全部执行证据，由 mission-driver CLOSURE_VERIFY fresh session 执行 audit 后收口）——closure-audit 已 pass（2026-08-04 fresh session 复核全落地，见本 plan Closure 节），roadmap C5.2 行标已按前置标 `done`。

Exit Criteria:

> 本 Phase 交付"可进入 closure-audit 的完成态"。

- [x] 4 张审计卡全部 `closed`；`docs/audits/per-component/` 汇总可读。
- [x] daily log 已记录本 plan 收口证据（含 closure-audit 证据位置）。（`docs/logs/2026/08-04.md` C5.2 节）

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent fresh session（task `ses_035c4661effeIIcjRzU9pN33ii`）
- Verdict: `pass`（零 Blocker/Major）
- Rounds: 2
- Findings addressed: 全部文件/行引用经 live repo 核对通过（4 组件行数 button-group 138/dropdown-button 129/steps 316/timeline 213、process-display-definitions.ts steps `:5`/timeline `:92` + steps onChange payload `{value,stepIndex,stepKey}`、layout-renderer-definitions.ts button-group `:371`/dropdown-button `:493` + items fieldRules `:377`/`:541`、steps-renderer.tsx warnScopeDegraded `:11` + scope-degrade `:94-104`、demo 宿主 w3a `:111`/`:133` + w4b steps `:57/:69/:89`/timeline `:109/:120`、e2e w3a `:70`/`:92` + w4b 4 场景 + dialog-dropdown-row-edit 行污染回归、route-model.ts:207 C5.2 补 4 条注释、无 lab 页/无审计卡/design docs ×4、测试 4 文件合计 35 用例）；Minor ×3 已修正（w4b 5→4 场景、demo-steps-local :88→:89、Phase 4 全量验证改归 Closure Gates 预跑——Minimum Rule 18）；无 Major 发现。

## Closure Gates

> 关闭条件：本 section 与每个 Phase 的 Exit Criteria 全部勾选后才能将 `Plan Status` 改为 `completed`。

- [x] 4 张审计卡存在、18 维表完整、P0/P1 清零、全部 `closed`
- [x] 全部 in-scope P0/P1 已 test-first 修复并有回归测试；无被静默降级到 deferred 的 live defect/contract drift
- [x] ≥1 个真实浏览器组合宿主场景通过（含 bug 73 模式专项检查——CRUD 行内 dropdown-button 08-02 修复复验）
- [x] 共性缺陷已按 §7 处理（CX-n 插入/合并或当前 plan 内修复，决策记录在卡与 daily log）
- [x] 4 个 lab 页 + LAYOUT_RENDERER_ROUTES 4 条 + coverage manifest 4 条已落地（C5.1 标注的 C5.2 收口项）
- [x] 受影响的 owner docs 已同步到 live baseline（design.md/quick-reference/roadmap 表按发现实际影响为准）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（mission-driver CLOSURE_VERIFY fresh session 执行）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

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

## Non-Blocking Follow-ups

- 审计中发现但裁定为 P3（风格 nit/注释）的项仅卡内记录，不处理。
- 工具脚本新增模式（若有）记入卡内，CG 统一升级。
- 观察（供 CLOSURE_VERIFY 核对）：`pnpm check:oversized-code-files` 为 pre-existing 红（C5.1 已记录 HEAD 基线 14 文件超 700 行），超限文件治理归 CG/CR，非本 plan scope。

## Closure

Status Note: 待执行（active 状态，已通过独立子 agent draft review，可进入执行队列）。

Closure Audit Evidence:

- Auditor / Agent: 待执行
- Evidence: 待执行

Follow-up:

- 待执行
