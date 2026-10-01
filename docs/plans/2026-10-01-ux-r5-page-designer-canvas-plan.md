# UX-R5 Page Designer 画布可视化与拖放语义

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（PD-1~PD-7）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R5
> Related: `docs/plans/523-missing-components-l6-s2-page-designer-mvp-plan.md`（历史证据）、page-designer 包 owner doc

## Purpose

把 Page Designer 画布从"空容器不可见、落点与视觉不符、预览形同虚设"修复为"拖入即可见、落点可预期、选中可辨识、预览即用户视角"，并治理大纲树对比度与组件库拖拽把手观感。

## Current Baseline

- **PD-1 空容器不可见**：真渲染画布（`packages/page-designer-renderers/src/canvas-bridge.tsx`，SchemaRenderer 承载真渲染 + `canvas-overlay.tsx` 交互覆盖层）对空 form/fieldset 渲染 0 内容——form 为 ~24px 细条、fieldset 零高度。`resolveRect` 直接丢弃 0×0 rect（canvas-bridge.tsx:139-141），page 级空态提示仅在整页为空时触发（page-designer-page.tsx:102-106,431-440）；`.nop-form`/`.nop-fieldset` 无最小高度。审计截图 `_tmp/ux-audit-2026-10-01/page-designer-*.png`。
- **PD-2 落点语义不符**：**drop 指示器管线已存在且已被测试覆盖**（`canvas-overlay.tsx:122-162` `data-drop-hint="inside|before|after|invalid"`，宿主接线 page-designer-page.tsx:425-426，全链路测试 `interactions.test.tsx:89-98` + 渲染测试 `canvas-overlay.test.tsx:78-102`）。真实缺口在落点计算与指示器可见性：
  - (a) drop 目标解析基于真实 DOM rect 且排除 0×0（`canvas-bridge.tsx:139-141`、`canvas-layout.ts:130-142`）——空/近零高容器的视觉区域不可命中，穿透到 `buildRootDropHint`（canvas-layout.ts:189-200）→ 落到 page 层级末尾（复现审计的 `page.body[1]`）；
  - (b) 零尺寸容器无法渲染指示器（`canvas-overlay.tsx:36` 跳过 0×0 box）；
  - (c) 根回退指示器描的是整个 page 根（`packages/flux-renderers-basic/src/page.tsx:253-256`），视觉上等同"没有目标提示"。
  - 向 form 视觉区域中心拖放 fieldset 实际落 `page.body[1]`（page 子级、form 兄弟）即由此而来。
- **PD-3 大纲树选中态**：`structure-tree.tsx:87-91` 选中行 `bg-[var(--nop-accent-muted)]` + `text-[var(--nop-accent)]`；playground classic 主题实测 `#9a5b2a` 底 / `#bf6f2f` 字（`apps/playground/src/styles.css:156-158`）→ 对比度 ≈1.4:1，远低于 WCAG AA。
- **PD-4 预览形同虚设**：预览态左组件库/大纲树、右属性面板（含复制/删除/新增动作）全部保留（page-designer-page.tsx:369-404,443-478 无条件渲染 aside），画布仅边框橙→灰。
- **PD-6**：Label Align 下拉空值占位显示"(清空)"——文案源在 `packages/flux-i18n/src/locales/zh-CN.ts:889`（`selectEmptyOption: '（清空）'`；en-US.ts:894 `(clear)`），`flux.pageDesigner` 命名空间，消费方 `inspector-panel.tsx:132` 与 `actions-editor.tsx:305` 两处。
- **PD-7**：组件库条目拖拽把手渲染为 accent-muted 底色块、"容器"徽标 10px 文字截断（`palette-panel.tsx:57`）。
- 现有测试：page-designer-renderers 19 files/141 tests 全绿、page-designer-core 11 files/140 tests 全绿（review 独立复跑确认）。

## Goals

- 空容器（form/fieldset/layout 类）在画布上有可辨识占位（最小高度 + 虚线边框 + 类型标签提示），点击可选、可作 drop 目标。
- 落点与视觉一致：空/退化容器的视觉区域可命中该容器（不再穿透到 page 根回退）；指示器在空容器与根回退场景可辨识（根回退不再整页描边）。
- 大纲树选中态对比度达 WCAG AA。
- 预览模式隐藏左面板与右检查器（保留返回/退出预览入口），画布呈现运行态占满。
- 组件库把手徽标可读；"(清空)"占位改中性文案。
- 既有单测全绿 + 新行为有测试钉住。

## Non-Goals

- 不改 page-designer-core 文档模型与命令语义（tree-patch/commands 保持）。
- 不做组件库搜索/模板画廊等新功能。
- 不改 propContracts inspector 的信息架构；PD-5（inspector 开发者向文案治理）延后，归属登记见 roadmap R10 行补注。

## Scope

### In Scope

- `packages/page-designer-renderers/src/canvas-bridge.tsx`、`canvas-overlay.tsx`、`canvas-layout.ts`（占位/落点解析/指示器可见性/预览）
- `packages/page-designer-renderers/src/page-designer-page.tsx`（预览态布局）
- `packages/page-designer-renderers/src/structure-tree.tsx`、`palette-panel.tsx`（对比度/把手徽标）
- `packages/flux-i18n/src/locales/zh-CN.ts`、`en-US.ts`（`selectEmptyOption` 中性文案，注意 `actions-editor.tsx:305` 第二消费方同步核对）
- 相关单测 + 演示页 e2e 断言
- owner doc / 审计报告 PD 行补注 + roadmap PD-5 归属补注

### Out Of Scope

- core 文档模型、undo/redo、JSON 导入导出
- inspector 属性组织重构（PD-5 → R10）

## Failure Paths

| 可测场景编号               | 触发                             | 行为                                                               | 可重试 | 用户可见表现   |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------ | ------ | -------------- |
| pd-empty-container-visible | 拖入/选中空容器                  | 画布出现占位框（可点击/可 drop）                                   | 否     | 空容器不再隐形 |
| pd-drop-empty-container    | 向空 form 视觉区域 dragover+drop | hint=inside 该 form，drop 落入 form 子级（树路径断言），不再根回退 | 否     | 落点可预期     |
| pd-root-fallback-cue       | 画布空白区 dragover              | 根回退指示可辨识（非整页描边）                                     | 否     | 落点语义清楚   |
| pd-preview-mode            | 点击预览                         | 编辑面板隐藏，画布运行态渲染                                       | 否     | 预览即用户视角 |

## Test Strategy

档位选择：`必须自动化`

画布占位/指示器/预览布局为可断言 DOM 行为（data-slot + 快照断言），组件级测试先红后绿；落点语义用交互测试（mock 拖拽事件断言目标容器树路径）。

## Execution Plan

### Phase 1 - 空容器占位与选中可视化

Status: completed
Targets: `canvas-overlay.tsx`、`canvas-bridge.tsx`、`structure-tree.tsx`、`palette-panel.tsx`

- Item Types: `Proof`, `Fix`

- [x] 占位渲染用例先红：空容器在画布出现占位框（`empty-container-projection.test.tsx` 2 例先红——`data-pd-empty` + 类型标签 + 44px 最小高度投影；overlay 占位框 `canvas-overlay.test.tsx` 占位盒合成断言）
- [x] 实现 overlay 对空容器/零尺寸容器的占位注入（不干扰真渲染，pointer 命中经真实 DOM 盒转发选中）
- [x] 大纲树选中态对比度修复达 WCAG AA（accent 14% 混底色 + text-strong 前景 + 3px accent 左边条）+ 组件库把手徽标可读化（palette-panel.tsx shrink-0 描边徽章）
- [x] 包测试全绿（renderers 147）

Exit Criteria:

- [x] 占位/对比度用例先红后绿
- [x] 包测试全绿

### Phase 2 - 落点命中与指示器可辨识

Status: completed
Targets: `canvas-bridge.tsx`、`canvas-layout.ts`、`canvas-overlay.tsx`

- Item Types: `Proof`, `Fix`

- [x] 落点语义先红证据与集成钉：先红部分由 Phase 1 投影用例承担（空容器无投影时视觉区域=零、不可命中）；集成钉 `interactions.test.tsx` "dragover on an empty container targets the container; drop lands inside it"——overlay inside 指示盒几何=容器盒（left/top 断言，不依赖画布根 data-drop-active）+ drop 后源码 JSON 树路径断言 input-text 位于 container 子级
- [x] 修正落点解析：空容器经投影获得真实 DOM 盒（44px 最小高度）→ `computeDropHintAt` 命中该容器；overlay 占位框对 0 尺寸锚点合成最小可视盒（`readPlaceholderBoxes`）
- [x] 根回退指示可辨识化：`DesignerDropHint.viaRootFallback` + 覆盖层「松开将插入页面末尾」底线+标签（`data-drop-hint="root-fallback"`），不再整页描边；`canvas-overlay.test.tsx` 断言 root-fallback 存在且 inside 整页盒不渲染
- [x] 交互测试（mock drag 事件断言落点树路径）；既有 interactions.test.tsx（15）/ canvas-overlay.test.tsx（9）保持绿
- [x] 包测试全绿

Exit Criteria:

- [x] 落点/指示器用例先红后绿（空容器命中 + 根回退可辨识）
- [x] 包测试全绿

### Phase 3 - 预览模式与文案治理

Status: completed
Targets: `page-designer-page.tsx`、`flux-i18n` locales

- Item Types: `Proof`, `Fix`

- [x] 预览态隐藏左面板与右检查器（保留 header 模式开关/返回入口），画布占满；用例先红后绿（`page-designer-page.test.tsx` preview hides panels：隐藏↔恢复往返）
- [x] `selectEmptyOption` 文案中性化（zh-CN "（清空）"→"未设置"；en-US "(clear)"→"Not set"），inspector-panel 与 actions-editor 两个消费方共用同一 key 自动生效；把手徽标治理见 Phase 1
- [x] e2e：拖入 container → 占位可见（`data-pd-empty` + overlay 占位框）→ 向容器拖入 text（落点=容器子级、JSON 树路径断言）→ 预览 → 面板隐藏（`tests/e2e/page-designer-mvp.spec.ts` ux-r5 用例，4+1 全过）
- [x] owner doc / 审计报告 PD 行补注（design-architecture.md §5.2.1 契约；审计报告 PD-1/2/3/4/6/7 + 根因 §5.5 改判）；roadmap R10 行已补注 PD-5 归属

Exit Criteria:

- [x] 预览用例先红后绿；e2e 全过
- [x] 审计报告 PD-1/2/3/4/6/7 行与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: `pass`（round 1 `fail`：1 Blocker——PD-2 基线"无 drop 指示器"与 live 相反，指示器管线已存在且已有测试，真实缺口是空容器落点计算与退化场景指示器可见性 → 按处方修订；round 2 `pass`：6/6 findings 确认 addressed，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R5-B1（PD-2 基线重写：已有管线引证 + 三条真实缺口 a/b/c；Phase 2 重构为落点语义先红 + 指示器可辨识；Goal 2 措辞收敛）；R5-M2（Phase 2/3 Item Types 补 Proof）；R5-M3（flux-i18n locales 入 Scope/Phase 3 targets + actions-editor 第二消费方）；R5-M4（Related 引用改为实际历史 plan 文件）；R5-M5（Goal 4 去掉"或只读横幅"分支）；R5-M6（roadmap R10 补注 PD-5 归属，防孤儿）。Round 2 residual：Phase 2 断言不可只依赖画布根 `data-drop-active`（它只编码 hint.kind，根回退下也读 "inside"）——判定性断言用 drop 树路径 + overlay 指示盒几何（`data-page-designer-box` 位置/尺寸）。

## Closure Gates

- [x] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log）
- [x] 浏览器/e2e 实测证据存档（page-designer-mvp e2e 4+1 全过，Playwright 真实 HTML5 DnD + 程序化断言）
- [x] `pnpm typecheck`（42 tasks 全绿）
- [x] `pnpm build`（42 tasks 全绿）
- [x] `pnpm lint`（42 tasks 全绿；React Compiler 渲染期写 ref 命中已改 effect 依赖）
- [x] `pnpm test`（78 tasks 全绿：renderers 147 / core 140 / i18n 30 等）
- [x] `pnpm check`（exit 0，零新增红项；首轮 knip 3 个未使用导出常量已按零基线原则取消导出）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- PD-5 inspector 属性文案开发者向问题（归属 R10/G-3，roadmap 已补注）
- 组件库分类中文名（input-text 等内部名直出）
- pd-root-fallback-cue 桥接层端到端交互测试（现由 canvas-layout + canvas-overlay 两半分段覆盖，closure audit Minor 2 登记）

## Closure

Status Note: 2026-10-01 completed。R1-R5 修复轮第 5 项收口；执行期确认 review 改判（drop 指示器管线已在案）并落地空容器投影/根回退提示/预览面板隐藏/对比度治理。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose），2026-10-01
- Evidence: VERDICT: approved（0 Blocker；1 Major=daily log R5 记录缺失——本条日志即补齐后闭环；2 Minor/Note 不阻塞：root-fallback 桥接层端到端测试登记 follow-up、提交动作属 closure 后置步骤）。审计独立复跑：page-designer-renderers 20 files/147 tests、flux-i18n 2 files/30 tests 全绿；逐项核对投影 stamping/clearing、overlay 占位盒与 root-fallback 互斥渲染、preview 面板条件渲染、i18n 双语键、e2e 叙事、PD 行补注与 §5.2.1 契约。
