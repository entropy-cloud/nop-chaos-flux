# 532 flux-renderers-layout 渲染器 DOM 结构契约审计与整改

> Plan Status: active
> Last Reviewed: 2026-10-03
> Source: `docs/architecture/renderer-markers-and-selectors.md`（DOM 结构契约）、`docs/backlog/dom-structure-audit-roadmap.md`（W5）、`docs/audits/dom-structure-checklist.md`
> Related: `docs/plans/2026-10-03-527-dom-marker-shared-infra-plan.md`（前置）

## Purpose

把 flux-renderers-layout 全部 renderer type 的 DOM 结构收口到契约 6 维。已知必修项：resizable 的 renderer 自有外层（forced wrapper）承载 D1 锚点（`nop-resizable` 由 packages/ui 包装层携带，不得重复添加）；steps/timeline 记录"定义文件拆分、单次注册"结论；并冻结包级契约测试。

## Current Baseline

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

Status: planned
Targets: `docs/audits/dom-structure/*.md`（本包 9 张）

- Item Types: `Proof`

- [ ] 逐 type 落卡；resizable 外层按 D3 归因（forced wrapper 登记约束来源）
- [ ] steps/timeline 单次注册结论落卡

Exit Criteria:

- [ ] 全部 type 落卡且六维判定齐全

### Phase 2 - 整改

Status: planned
Targets: `resizable-renderer.tsx` 及卡面其余 fix 项

- Item Types: `Fix | Proof`

- [ ] resizable 外层 forced wrapper 承载 D1 锚点（`data-renderer`/`data-cid`；`nop-resizable` 保持由 ui 层携带；依赖 527 Phase 1）
- [ ] 逐项 test-first 落地

Exit Criteria:

- [ ] 每个 fix 项落地且有 focused 断言；既有包测试无回归（focused 范围）

### Phase 3 - 契约测试冻结

Status: planned
Targets: 包测试约定位置（该包为同目录多数派）

- Item Types: `Proof`

- [ ] 契约测试覆盖全部 type D1 三件套 + resizable forced wrapper 挂点断言（使用 527 helper）

Exit Criteria:

- [ ] 契约测试落位并通过
- [ ] roadmap W5 回写就绪

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子代理 R2（fresh session）
- Verdict: pass（Round 1 issues → 2 项 Major 修订；Round 2 指出 Purpose 残留旧论断与"外层无任何标记"不实两处文本，已修订：Purpose 重写、基线改为"外层已有 resizable-root slot/testid/cid、唯缺 data-renderer"）
- Rounds: 2
- Findings addressed: ①resizable 改判"ui 层已携带 nop-resizable、不重复添加"②steps/timeline 改为单次注册结论记录 ③Purpose 与外层标记表述对齐 live（resizable-renderer.tsx:65-70）

## Closure Gates

- [ ] 全部 type 审计卡六维收口
- [ ] resizable 整改/豁免落地且有 proof
- [ ] `dom-structure` 契约测试冻结
- [ ] 不存在被静默降级的 in-scope live defect
- [ ] owner docs 同步核对完成
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（暂无）

## Non-Blocking Follow-ups

（暂无）

## Closure

Status Note: 待收口

Closure Audit Evidence:

- Auditor / Agent: 待定
- Evidence: 待定

Follow-up:

- 见 Non-Blocking Follow-ups
