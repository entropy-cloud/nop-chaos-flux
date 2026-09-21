# 477 视觉质量 V7：Report Designer 视觉与结构 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V7-report-designer.md`（独立核实 revised → 勘误回写后 pass）、`docs/backlog/visual-quality-roadmap.md` V7、`docs/architecture/report-designer/design.md`
> Related: `docs/plans/476-visual-quality-v6-spreadsheet-tokenization-plan.md`（report 画布复用 spreadsheet host 的既有断言路由）

## Purpose

把路线图 V7 收口：画布解 30×10 硬编码（模板/文档驱动维度派生）、report 域未定义令牌 dark 击穿修复（F6）、fallback 死代码删除 + 契约注记、codec 方向裁决落卡（hucre 采纳为 codec 层依赖、集成出独立 plan）、e2e 断言扩展（画布维度/绑定视觉）。

## Current Baseline

- **F1 画布 30×10 硬编码**：`report-spreadsheet-canvas.tsx:26-27` `ROWS=30/COLS=10`，消费点 :50-54/:253-254；spreadsheet-grid `clampCell`（spreadsheet-grid.tsx:61-64）使键盘/点击均不可达界外——上下文菜单插行可把内容推进不可见区（双重视觉截断）。模板驱动派生函数 `resolveGridDimensions` 已在 spreadsheet-renderers `default-page-body.tsx:13-41`（`Math.max(DEFAULT, last+1, 1)`）但为模块私有（无 export）。测试 `report-spreadsheet-canvas.test.tsx` 捕获 SpreadsheetGrid props 但零 rows/cols 断言；demo 第二份硬编码 `report-designer-demo.tsx:77-78`。附带 R4：`use-spreadsheet-interactions.ts:46-47` rows/cols 声明未消费。
- **F2 codec 通路完备、缺生产 adapter**：接口 `adapters.ts:59-70`、注册表 `:103-110`、core 注册（set 在 :500）、命令链 `codec-commands.ts:15-69`（`noCodecConfigured` :21）、host method `host-action-provider.ts:20-21`、i18n 齐备；占位工厂 `createUnsupportedTemplateCodecAdapter`（adapters.ts:157-167）仅测试消费；全部 live 表面 import/export 必失败于 `noCodecConfigured`。hucre 全仓零依赖；方向裁决依据 `docs/analysis/2026-09-12-hucre-vs-report-designer-comparison.md` §2.2（"仓库内只有占位实现"）。
- **F3 带区/分组头语义零命中**：band/分组 grep 四包 src 零命中；文档模型无 band 概念（types.ts:34-41）；grid 仅 cell 级 metadata 通道（table-shell.tsx:166）。显式 deferred。
- **F4 fallback 壳死代码**：`fallbacks.tsx` 三个 renderFallback\* 全仓 0 importer（不在 barrel、无测试）；实际降级 = invalid 就地替换空模板 + 完整工作台（page-renderer.tsx:96-102/:644-682），符合 design.md「不能退化成诊断空壳」契约；孤儿 i18n 键 coreTitle（zh-CN.ts:759）/noMetadata（noFieldSources 为活引用须保留）。
- **F6 未定义令牌 dark 击穿**：`report-field-panel.css:49/:50/:74` 消费 `--nop-border-hover/--nop-surface-hover/--nop-surface-muted` 全仓零定义（全文件 var() 消费 8 处），light 字面 fallback 恒生效——dark 下 field panel hover 底/类型徽章底恒浅色。该包无守卫测试、不在 `find-ui-consistency-gaps.mjs:290` RENDERER_PACKAGE_SCOPE 扫描集（R10：扫描集扩展为独立提案，不入本 plan）。
- **F5 e2e**：report-designer-demo.spec 9 test 零画布维度/绑定底色断言；plan 476 已补 report 画布 dark 翻转路由（spreadsheet-visual-tokens.spec.ts:121+）。host-demo spec 5 test 无计算样式断言。

## Goals

- 画布维度模板驱动：`resolveGridDimensions` export 并被 report-spreadsheet-canvas 消费（ROWS/COLS 常量退役），内容超出时网格自适应扩展；canvas 维度单测 + e2e 断言。
- F6：3 个未定义令牌迁移到已定义 `--nop-*`/包内定义（dark 可辨）+ report-field-panel 守卫单测（禁 dangling --nop-\* 消费）。
- F4：删 `fallbacks.tsx` + 孤儿 i18n 键（保留 noFieldSources）+ design.md 契约注记（降级行为 = 空模板替换）。
- codec 方向裁决落卡（A4：采纳 hucre 为 codec 层依赖；集成 = 独立 plan）。
- F3 带区语义显式 deferred 落卡。
- e2e 扩展：画布维度自适应断言 + 绑定底色/角标断言。

## Non-Goals

- hucre 集成本体（独立 plan）；带区/分组语义实现（F3 deferred）；分页/打印布局（R6）；`find-ui-consistency-gaps.mjs` 扫描集扩展（R10 独立提案）；report-designer-core 数据结构变更。

## Scope

### In Scope

- `packages/spreadsheet-renderers/src/default-page-body.tsx`（export resolveGridDimensions）、`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`（消费 + 常量退役 + R4 清理）、`report-field-panel.css` + 新守卫测试、`fallbacks.tsx` 删除 + i18n 键清理 + design.md 注记、`report-designer-demo.tsx`（第二份硬编码同步）、单测（canvas 维度 + 守卫）、e2e 扩展（report-designer-demo.spec）、owner docs（design.md :195 条款措辞修订覆盖 report 画布、codec-design.md 裁决注记、证据卡、roadmap、daily log）。

### Out Of Scope

- hucre 集成、band 模型、spreadsheet-core 行为变更、playground demo 深度重构（仅同步硬编码消除）。

## Failure Paths

| 场景            | 触发                | 行为                                                                                                              | 可重试 | 用户可见表现                       |
| --------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------- |
| dims-regression | 模板无 cells        | 维度回落 DEFAULT(100/26)，非 30×10                                                                                | 是     | 大网格（与 spreadsheet host 一致） |
| token-missing   | --nop-\* 宿主未发布 | field panel hover 退化为显式值（迁移目标令牌带字面 fallback 于包内定义块）                                        | 否     | 无静默失效                         |
| orphan-key-left | fallbacks.tsx 删除  | grep zh-CN.ts 与 en-US.ts 双 locale 零 coreTitle/noMetadata 命中（i18n check 对未消费键仅 warning，不能作为判据） | 否     | 无                                 |

## Test Strategy

档位选择：**必须自动化**——画布维度是用户可感知行为变更（先红后绿单测）；F6 是样式契约缺陷修复（守卫单测）；e2e 断言补齐为 V0 工具链消费。

## Execution Plan

### Phase 1 - 画布解硬编码

Status: completed
Targets: `default-page-body.tsx`、`report-spreadsheet-canvas.tsx`、`report-designer-demo.tsx`、单测

- Item Types: `Proof | Fix`

- [x] Proof：report-spreadsheet-canvas.test 单测先红——SpreadsheetGrid 收到的 rows/cols 应随模板 cells 派生（写 cell 到 row 31+ → rows > 30），现状恒 30×10
- [x] Fix：`resolveGridDimensions` export + report-spreadsheet-canvas 消费（ROWS/COLS 常量退役）；demo 硬编码同步。**显式基线变更**：空模板默认维度 30×10 → DEFAULT 100×26（与 spreadsheet host 及 design.md:195 派生契约一致），先红单测断言的即此基线
- [x] Fix：维度单测转绿 + 零回归
- [x] Decision：R4（use-spreadsheet-interactions rows/cols 死参数）按研究维持 watch-only——4 个调用点清单超出视觉修复域，登记 follow-up

Exit Criteria:

- [x] 单测先红后绿有记录（2 用例：派生扩展 + DEFAULT 基线回落）；spreadsheet-renderers（167/167）/report-designer-renderers（206/206）既有测试零回归
- [x] report-spreadsheet-canvas.tsx 无 ROWS/COLS 常量残留（grep 证）

### Phase 2 - F6 令牌缺陷 + 守卫

Status: completed
Targets: `report-field-panel.css`、新守卫测试

- Item Types: `Proof | Fix`

- [x] Proof：守卫单测先红——禁 `var(--nop-border-hover|--nop-surface-hover|--nop-surface-muted)` dangling 消费（现状 3 处命中）
- [x] Fix：3 处消费迁移到包内 `--rp-*` 定义块（`:root` + dark 变体，--ss-_ 同构；主路径——现有 --nop-_ 无 hover 语义令牌，强迁会抹掉 hover 供觉）

Exit Criteria:

- [x] 守卫先红后绿（2 断言）；dark 翻转由 --rp-\* dark 块 + spreadsheet-visual-tokens 绑定底色断言覆盖

### Phase 3 - F4 死代码 + 裁决落卡 + e2e + docs

Status: completed
Targets: `fallbacks.tsx`、i18n、design.md、codec-design.md、e2e、证据卡、roadmap、daily log

- Item Types: `Fix | Decision | Proof`

- [x] Fix：删 `fallbacks.tsx` + 孤儿键 coreTitle/noMetadata（noFieldSources 保留）+ design.md 降级行为注记
- [x] Decision：codec 方向裁决落卡（hucre 采纳、集成独立 plan）+ F3 带区 deferred 落卡（codec-design.md 尾节 + 证据卡）
- [x] Proof：e2e 扩展——report-designer-demo.spec 增画布维度断言（滚动到底行头 = 100，证明 30 行硬顶退役）+ 绑定底色计算样式断言（V0 helper）+ `--ss-bound-*` dark 翻转断言并入 spreadsheet-visual-tokens report 路由（研究 A5(b)；demo 无预置绑定，用例内先拖拽建绑定）
- [x] Fix：owner docs——design.md :195 条款措辞修订（覆盖 report 画布）、codec-design.md 裁决注记、证据卡、roadmap、daily log
- [x] Fix：全仓验证链核对（typecheck/build/lint/test/check——归 Closure Gates）

Exit Criteria:

- [x] e2e 新断言绿（report-designer-demo 10/10、visual-tokens 4/4）；fallbacks.tsx 删除后全仓零引用（grep 证）；孤儿键清理完成（i18n 29/29 绿）
- [x] 裁决落卡无 pending；owner docs 与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立 plan review 审查员（fresh sub-agent session，2026-09-21，一轮，25+ 引用零漂移）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 6 Minor，全部吸收）
- Rounds: 1
- Findings addressed: M-1——Failure Paths orphan-key 判据改为双 locale grep（i18n check 对未消费键仅 warning）；M-2——A5(b) --ss-bound-_ dark 断言并入 Phase 3 Proof、A5(c) 显式裁决入 follow-ups；M-3——Phase 1 显式化空模板基线变更 30×10→100×26；M-4——Phase 2 主路径钉死包内 --rp-_ 定义块（弃"最近 --nop-\*"分支）；M-5——R4 退回 watch-only（调用点清单超视觉域，登记 follow-up）；M-6——codec-design.md 义务显式标注为 plan 级新增（Rule 14）。

## Closure Gates

- [x] 全部 in-scope 交付落地（Phase 1–3 Exit Criteria 全勾）
- [x] in-scope contract drift 已收敛：30×10 硬编码、F6 三未定义令牌、fallback 死代码、孤儿 i18n 键
- [x] F3/codec 显式裁决落卡（非静默 deferred）
- [x] 行为/契约结果已达成：维度自适应在单测与 e2e 成立
- [x] 必要 focused verification 已完成（维度单测先红后绿 + 守卫单测先红后绿 + e2e 扩展）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响 owner docs 已同步：design.md、codec-design.md、证据卡、roadmap、daily log
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新 hit）

## Deferred But Adjudicated

### 带区/分组头语义（F3）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 文档模型无 band 概念、无 producer、grid 仅 cell 级 metadata——能力型缺失需模型层设计，归 report-designer 域功能 roadmap
- Successor Required: `no`（证据卡承载）

### hucre codec 集成（A4 执行面）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 方向裁决已落卡（hucre 采纳为 codec 层依赖），集成属功能交付非视觉修复，出独立 plan
- Successor Required: `yes`
- Successor Path: report-designer codec 集成 plan（登记 backlog 候选）

## Non-Blocking Follow-ups

- R10 扫描集扩展提案（report-designer-renderers 纳入门禁）: 独立事项。
- host spec fallback 数据槽断言（研究 A5(c)）：host-demo 5 test 现无计算样式断言，随 codec 集成 plan 一并考虑（显式裁决：不入本 plan）。
- R4 死参数清理：4 个调用点（含 playground spreadsheet-demo.tsx:68），非视觉域，登记。
- codec-design.md 裁决注记为本 plan 显式新增义务（研究原文判定无需改），Rule 14 允许——记录裁决理由供后续集成 plan 引用。

## Closure

Status Note: 2026-09-21 closure audit 通过（详见 Closure Audit Evidence）。三 Phase 交付（维度派生/令牌守卫/死代码+裁决落卡+e2e）经独立审计员复核成立。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure auditor（fresh sub-agent session，2026-09-21，只读）
- Evidence: 见本轮 closure audit 报告（verdict 见 daily log `docs/logs/2026/09-21.md` V7 节）——重点复验维度派生测试真实性、--rp-\* 守卫拦截力、fallbacks.tsx 零引用、孤儿键双 locale 清理、e2e 断言面。

Follow-up:

- hucre codec 集成（successor plan 候选，登记 backlog）
- R10 门禁扫描集扩展提案、R4 死参数清理、host-demo 断言（均 non-blocking，已登记）
