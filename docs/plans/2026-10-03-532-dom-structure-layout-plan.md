# 532 flux-renderers-layout 渲染器 DOM 结构契约审计与整改

> Plan Status: completed
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W5）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-layout 全部 renderer type 的 DOM 结构收口到契约 6 维。已知必修项：resizable 的 renderer 自有外层（forced wrapper）承载 D1 锚点（`nop-resizable` 由 packages/ui 包装层携带，不得重复添加）；steps/timeline 记录"定义文件拆分、单次注册"结论；并冻结包级契约测试。

## Current Baseline

> **执行记录（2026-10-03）**：盘点确认 9 定义全部无 wrap 键（均走无帧通道，ensure stamp 补 data-renderer）；resizable 外层已齐 data-slot="resizable-root"+testid+cid（:65-70），唯缺 data-renderer（stamp 补齐）；nop-resizable 确认在 ui/resizable.tsx:12 PanelGroup 上；steps/timeline 单次注册确认（test-support 内联定义为测试隔离注册表）；responsive 为 9 中唯一缺根 slot。

- 组件清单（type 注册于 `layout-renderer-definitions.ts`、`process-display-definitions.ts`、`resizable-renderer-definition.ts`；steps/timeline 为**定义文件拆分、单次注册**——`process-display-definitions.ts:6/:93` 各定义一次，`layout-renderer-definitions.ts:601-602` 按引用聚合进唯一注册数组）：wizard、grid、collapse、button-group、dropdown-button、responsive、steps、timeline、resizable → `resizable-renderer.tsx`——全部 composite 多区域。
- `nop-*` 根类 8/9 直接可见；resizable 的 `nop-resizable` **已由 packages/ui 包装层硬编码在 PanelGroup 上**（`packages/ui/src/components/ui/resizable.tsx:12`），不在 renderer 自有根上——不得在同子树重复添加。
- 已点名嫌疑：`resizable-renderer.tsx:63-73` 外层 div（注释称三方库会覆写 testid/id 故垫一层，属实：库在 spread 后显式覆写 Group/Panel/Separator 的 `data-testid`/`id`）→ `ResizablePanelGroup` → panel：根到内容 2-3 层；外层已有 `data-slot="resizable-root"` + `data-testid` + `data-cid`（:65-70），缺的只是 `data-renderer`（待 527）——forced wrapper，需按 D3 登记约束来源并承载 D1 锚点。
- `data-slot` 普遍（`resizable-root` 等）；`data-renderer` 依赖 527。

## Goals

- 全部 type 六维判定落卡
- resizable：外层 forced wrapper 登记（约束来源：三方库覆写 testid/id）并承载 D1 三件套锚点；`nop-resizable` 以 ui 包装层（PanelGroup）携带为准，不重复添加、不改 packages/ui
- steps/timeline 记录"定义文件拆分、单次注册"结论（无双注册问题）
- `dom-structure` 契约测试冻结

## Non-Goals

- 功能契约 18 维审计；布局行为/响应式断点语义变更
- ResizablePanelGroup 三方库交互行为变更；packages/ui 的 resizable 包装层改动
- steps/timeline 定义文件合并（仅记录结论）

## Scope

### In Scope

- `packages/flux-renderers-layout/src/` 全部 renderer type 的审计卡、整改、契约测试

### Out Of Scope

- react-resizable-panels 库内部结构
- steps/timeline 注册机制重构

## Test Strategy

档位选择：`建议有测`——resizable 标记与 forced wrapper 挂点为必测断言；其余以卡面 + 契约测试覆盖。

## Execution Plan

### Phase 1 - 逐组件审计卡

Status: completed
Targets: `docs/audits/dom-structure/*.md`（本包 9 张已落盘）

- Item Types: `Proof`

- [x] 逐 type 落卡（9 张，六维判定齐全）；resizable forced wrapper 约束来源登记（:63-64 注释 + ui :12）
- [x] steps/timeline 单次注册结论落卡（生产注册表唯一路径；test-support 内联定义为测试隔离）

Exit Criteria:

- [x] 全部 type 落卡且六维判定齐全（9/9）

### Phase 2 - 整改

Status: completed
Targets: `responsive-renderer.tsx`（根 slot 补齐）；resizable 经 stamp 通道自动补齐

- Item Types: `Fix | Proof`

- [x] resizable 外层 forced wrapper 承载 D1 锚点：data-renderer 由 ensure stamp 补齐（data-slot/testid/cid 已在位）；nop-resizable 保持由 ui 层携带（契约测试双向断言）
- [x] responsive 根补 `data-slot="responsive-root"`（9 中唯一缺根 slot）
- [x] 逐项 test-first 落地

Exit Criteria:

- [x] 每个 fix 项落地且有 focused 断言（契约测试 5 用例）
- [x] 既有包测试无回归（layout 145/145 = 140 + 5）

### Phase 3 - 契约测试冻结

Status: completed
Targets: `src/dom-structure-contract.test.tsx`（5 用例）

- Item Types: `Proof`

- [x] 契约测试冻结：steps/timeline（ol 根 + root slot）、wizard、responsive（fix）、resizable（forced wrapper skip-marker 口径 + ui 层 nop-resizable 双向断言）（使用 527 helper）

Exit Criteria:

- [x] 契约测试落位并通过（5/5）
- [x] roadmap W5 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R2（fresh session）
- Verdict: pass（Round 1 issues → 2 项 Major 修订；Round 2 指出 Purpose 残留旧论断与"外层无任何标记"不实两处文本，已修订：Purpose 重写、基线改为"外层已有 resizable-root slot/testid/cid、唯缺 data-renderer"）
- Rounds: 2
- Findings addressed: ①resizable 改判"ui 层已携带 nop-resizable、不重复添加"②steps/timeline 改为单次注册结论记录 ③Purpose 与外层标记表述对齐 live（resizable-renderer.tsx:65-70）

## Closure Gates

- [x] 全部 type 审计卡六维收口（9/9）
- [x] resizable 归因落地且有 proof（forced wrapper 承载锚点 + ui 层携带根标记，双向断言）
- [x] `dom-structure` 契约测试冻结（5 用例）
- [x] 不存在被静默降级的 in-scope live defect
- [x] owner docs 同步核对完成（无契约语义变更）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（exit 0）
- [x] `pnpm build`（exit 0）
- [x] `pnpm lint`（exit 0）
- [x] `pnpm test`（全量 exit 0；layout 145/145 = 140 + 5）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 2026-10-03 收口。9 卡落盘；resizable forced wrapper 归因（stamp 补 data-renderer、nop-resizable 留 ui 层、双向断言）；responsive 根 slot 补齐；steps/timeline 单次注册结论记录。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理（fresh session，agent_513fa9d1）
- Evidence: 代码与证明全部核实通过（9 卡/resizable 归因/契约 5 用例/145 复跑）；审计发现 3 处回填级问题（Phase 2 状态残留、日志缺段、roadmap 待翻）——均已在收口动作中完成，复审口径为文档回填后转 approved。

Follow-up:

- 见 Non-Blocking Follow-ups
