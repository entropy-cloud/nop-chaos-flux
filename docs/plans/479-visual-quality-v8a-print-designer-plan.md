# 479 视觉质量 V8a：Print 设计器视觉修复 Plan

> Plan Status: draft
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V8a-print-designer.md`（独立核实 revised → 勘误回写后 pass）、`docs/backlog/visual-quality-roadmap.md` V8a、`docs/components/print/design.md`、09-13 遗留登记（logs/2026/09-13.md + branch review §2.3/§5）
> Related: `docs/plans/476-visual-quality-v6-spreadsheet-tokenization-plan.md`（--ss-\* 先例）、`docs/plans/477-visual-quality-v7-report-designer-plan.md`（守卫单测先例）

## Purpose

把路线图 V8a 收口：09-13 遗留①–⑩ 逐项修复或显式裁决；吸附辅助线渲染（数据已算出仅差消费）+ Alt 禁用；多选修饰键最小面；诊断 i18n 接管（17 codes × 2 locale）；元素级标红实时化；dark 唯一击穿面（画布内联环境色）令牌化；e2e 视觉断言 + testid 化。

## Current Baseline

- **方向键微移已实现（勘误①证伪）**：print-designer.tsx:74-85（Arrow 四键，1mm/Shift 0.1mm）+ use-print-editor.ts:178-186 nudge() 支持多选移动——普查/证据卡误登记为缺口；真正缺的多选**创建**（shift/ctrl+click 修饰键，canvas.tsx:88/:104 两处 setSelection 单元素）。
- **吸附辅助线算了不画**：canvas-math.ts:83-89 SnapResult{frame,verticalLines,horizontalLines}（:124-137 computeSnap 两轴回传命中线，单测 canvas-math.test.ts:52-62 锁语义）；print-designer-canvas.tsx:130-131 只消费 snapped.frame；move 分支 :123-133 不读 altKey（altKey 唯一消费 :148 rotate）；design.md:191 契约承诺「阈值 3px，Alt 临时禁用」。
- **诊断 i18n**：core 17 个诊断 code message 全硬编码中文（validate.ts 12 + bind.ts 4 + layout.ts 1）；print-preview.tsx:64 `[code] message` 直出；renderers 92 键（zh/en 对称零漂移）全为 UI 标签零诊断键；survey 的 88 系当时误计（核实勘误①）。
- **诊断体验**：validate 仅按钮触发（errorCount 仅汇总展示，画布 ：252-305 零诊断消费、无元素级标红）。
- **dark 唯一击穿面**：print-designer-canvas.tsx:206-209 内联背景（网格 rgba(0,0,0,0.06) 双 linear-gradient + `?? '#ffffff'` 纸面兜底）；css #999 共 6 处（placeholder 契约，css:2-4 文档化维持）；纸面 #fff 墨水语义不令牌化。
- **其余遗留**（①-⑩ live 原样）：①rotate 分页几何按未旋转 frame；②autoGrow 尾片声明高度；③printDate 多次 new Date()；④PDF JPEG 0.92；⑦设计态 image fit 不消费（css 固定 contain）；⑧resetPrintElementIdSeq 未收敛（schemas.ts:26-28 + export \*）；⑨load-only setTimeout；⑩同诊断 i18n。
- **e2e**：print-designer.spec 恰 8 test，0 getComputedStyle/0 截图/0 画布交互断言；中文按钮字面量 :29/:43/:54/:60、srcdoc 中文 :34/:49。
- **多选移动命令层已备**：use-print-editor :114-115/:150-186 setSelection(ids)/nudge 多 id；undoDepth/redoDepth 已暴露而 renderers 零消费。

## Goals

- 吸附辅助线：canvas 消费两轴命中线（纸面 px 换算）渲染 1px 参考线 + Alt 禁用吸附 + pointerUp 清空。
- 多选创建：shift/ctrl+click 追加选择（命令层已备）。
- 诊断 i18n：`flux.print.diagnostic.<code>` 17×2 键 + 预览按 code 映射（未知 code 回退 message）；core PrintDiagnostic 契约不动。
- 元素级标红 + 验证实时化（useMemo 派生 + data 标记）。
- 杂项修复批：image fit 消费、barrel 收敛、iframe 超时兜底、PDF PNG（附包体实测）、printDate 一次 now、autoGrow 实测高度。
- dark：画布环境色 `--print-*` 令牌化 + dark 变体（纸面/墨水语义维持）。
- e2e：选中/手柄/辅助线/标尺计算样式断言（双态）+ testid 化。
- R10 旋转 AABB 显式裁决落卡（契约显式化，拒几何真修）。

## Non-Goals

- marquee 框选、标尺拖动参考线（deferred——guides 需模板外状态存储设计）；undo 栈面板/图层树（watch-only，工具型 UI）；rotate 分页几何真修（R10 裁决）；纸面色/墨水语义令牌化。

## Scope

### In Scope

- `packages/flux-print-renderers/src/print-designer-canvas.tsx`（辅助线渲染 + Alt + 修饰键多选 + data 标记 + 内联色令牌化）、`print-preview.tsx`（i18n 映射 + 超时兜底）、`print-designer.tsx`（验证实时化）、`export-pdf.ts`（PNG）、`layout.ts`/`bind.ts`（now 注入/autoGrow 实测）、`schemas.ts`/barrel（id 收敛）、`renderer-definitions.tsx`（fit 消费）、包内 css（snap-line/标红/dark 块）、`packages/flux-print-core`（无变更——PrintDiagnostic 契约维持）、flux-i18n（17×2 键）、单测、`tests/e2e/print-designer.spec.ts`（testid 化 + 断言）、owner docs（print/design.md 契约显式化 + 证据卡 + roadmap + daily log）。

### Out Of Scope

- flux-print-core 契约变更；marquee/guides/undo 面板/图层树；rotate 几何修复；iframe bg-white 纸面（语义白，维持）。

## Failure Paths

| 场景                    | 触发                        | 行为                                                     | 可重试 | 用户可见表现     |
| ----------------------- | --------------------------- | -------------------------------------------------------- | ------ | ---------------- |
| snap-line-coords        | 区域坐标 → 纸面 px 换算偏移 | 复用元素定位同法（canvas :264-265），单测锚定            | 否     | 辅助线对齐元素边 |
| diagnostic-unknown-code | 旧模板带未注册 code         | 预览回退 `message` 字面（core 契约 fallback）            | 是     | 原文案           |
| png-size-regression     | PDF 切 PNG 后包体膨胀       | 实测多页包体；超阈值回退 JPEG quality 提档（备选已裁决） | 是     | 文档体积         |
| zone-api-missing        | —                           | （不适用本 plan）                                        | —      | —                |

## Test Strategy

档位选择：**必须自动化**——辅助线/多选是用户可感知交互变更（单测先红后绿）；i18n 键对称有既有校验通道；e2e 双态断言消费 V0 工具链。

## Execution Plan

### Phase 1 - 吸附辅助线 + 多选修饰键

Status: planned
Targets: `print-designer-canvas.tsx`、`canvas-math.test.ts`/canvas 单测、包内 css

- Item Types: `Proof | Fix`

- [ ] Proof：canvas 单测先红——①拖拽命中吸附线时渲染 `nop-print-snap-line-v/h` 标记；②altKey 按下时不吸附；③shift/ctrl+click 第二元素后 setSelection 收到双 id
- [ ] Fix：消费 `snapped.verticalLines/horizontalLines`（区域坐标 + regionOrigin 换算纸面 px，复用 :264-265 定位同法）；marker div 1px `hsl(var(--primary))` + pointer-events:none；move 分支读 `event.altKey` 跳过吸附；pointerUp 清空线状态；canvas :88/:104 setSelection 加修饰键追加分支
- [ ] Fix：css 增 snap-line 规则；单测转绿 + 零回归

Exit Criteria:

- [ ] 单测先红后绿有记录（辅助线渲染/Alt 跳过/多选 id）；print-renderers 既有测试零回归
- [ ] e2e：辅助线可见性断言（拖拽触发）落 Phase 3 统一跑绿（本 Phase 落断言代码）

### Phase 2 - 诊断 i18n + 标红实时化

Status: planned
Targets: flux-i18n、`print-preview.tsx`、`print-designer.tsx`、canvas wrapper

- Item Types: `Proof | Fix`

- [ ] Proof：i18n 键对称校验（既有通道）先红——`flux.print.diagnostic.*` 17 codes 缺失；预览单测先红——code→t() 映射 + 未知 code 回退 message
- [ ] Fix：17 codes × 2 locale 键新增（zh/en 文案对齐 core message 语义）；print-preview.tsx:64 改按 code `t()` 渲染；画布 wrapper `data-print-diagnostic="error"` + css 标红；validate 结果 useMemo 实时派生（按钮计数保留为汇总）

Exit Criteria:

- [ ] 键对称与映射单测先红后绿；core 契约零变更（grep 证 PrintDiagnostic 不动）
- [ ] e2e：诊断文案随语言切换（落 Phase 3 统一跑绿）

### Phase 3 - 杂项批 + dark 令牌化 + e2e + docs

Status: planned
Targets: 杂项文件、canvas 内联色、e2e、owner docs、证据卡、roadmap、daily log

- Item Types: `Fix | Decision | Proof`

- [ ] Fix：杂项批——fit 消费（renderer-definitions）、barrel 收敛（resetPrintElementIdSeq）、iframe 超时兜底、PDF PNG（附多页包体实测数，超阈值走备选）、printDate 单次 now 注入、autoGrow 实测高度（无 measure 行为不变 + doc 登记）
- [ ] Fix：dark——canvas :206-209 内联环境色 → `--print-*`（网格线/纸面兜底）+ dark 变体（--ss-\* 先例）；纸面/墨水语义维持 css:2-4
- [ ] Decision：R10 旋转 AABB 裁决落卡（v1 契约显式化：rotate 不参与分页几何 + design.md 登记）
- [ ] Proof：e2e——print spec 定位全面 testid 化（消中文按钮/srcdoc 字面量）；增选中 outline/手柄边框/辅助线可见性/标尺定位 getComputedStyle 断言（light/dark 双态，V0 helper + theme-switcher 先例）
- [ ] Fix：owner docs——print/design.md（Alt/阈值契约显式化 + R10 契约 + dark 块说明）、证据卡 print.md 回写、roadmap、daily log；全仓验证链核对（归 Closure Gates）

Exit Criteria:

- [ ] 杂项批逐项落地（PNG 附实测数）；e2e 断言绿 + 既有 8 test 零回归（testid 化后）
- [ ] 裁决落卡无 pending；owner docs 与 live 一致

## Draft Review Record

- Reviewer / Agent: （独立子 agent fresh session 填写）
- Verdict:
- Rounds:
- Findings addressed:

## Closure Gates

- [ ] 全部 in-scope 交付落地（Phase 1–3 Exit Criteria 全勾）
- [ ] in-scope contract drift 已收敛：吸附辅助线缺渲染、诊断中文直出、dark 画布击穿、①-⑩ 中未裁决项
- [ ] R10/R12/R13/R14/marquee 显式裁决落卡（非静默 deferred）
- [ ] 行为/契约结果已达成：辅助线/多选/诊断 i18n/双态断言在单测与 e2e 成立
- [ ] 必要 focused verification 已完成（单测先红后绿 + e2e 双态）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs 已同步：print/design.md、证据卡、roadmap、daily log
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新 hit）

## Deferred But Adjudicated

### 标尺拖动参考线（R12）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: guides 为模板外持久状态（schema 无载体），存储设计超视觉修复边界，单独立项
- Successor Required: `no`（证据卡承载）

### marquee 框选（R11 残余）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 修饰键多选已覆盖最小多选创建面；marquee 属交互扩展
- Successor Required: `no`

### undo 栈面板 / 图层树（R13/R14）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 工具型 UI 非视觉质量域；undoDepth/redoDepth 已暴露，接入成本在交互设计
- Successor Required: `no`

### 旋转 AABB 分页几何真修（R10）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 坐标系全面修订工作量/收益比差；v1 无存量 rotate 模板；契约显式化 + doc 登记后无静默失效
- Successor Required: `no`（契约随 design.md 常驻）

## Non-Blocking Follow-ups

- PDF PNG 包体实测若触发备选（JPEG quality 提档），实测数登记 daily log。
- print-preview.tsx:48 iframe bg-white（纸面语义白）：维持，登记。
- e2e「零 snap 断言」口径：本 plan 补辅助线断言后消除。

## Closure

Status Note: （closure audit 通过后填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent fresh session 填写）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （closure 时填写，或写 no remaining plan-owned work）
