# dom-structure: gantt

> Package: flux-renderers-scheduling | Source: src/gantt/gantt.tsx:576-583（无帧通道）+ hooks/use-gantt-keyboard.ts:139-142 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-535-dom-structure-scheduling-plan.md

## 结构图（根 → 首个内容）

- 可见根 `<div class="nop-gantt" data-slot="gantt" data-renderer="gantt" data-testid data-cid>`；画布语义由既有键盘 a11y 层命令式落（use-gantt-keyboard.ts:139-142：role="grid" + tabindex=0 + aria-label=t('scheduling.gantt.chartLabel')——表格语义比 application 更精确，行/列 roving 由 :35-37 承担）
- 分支根（loading/empty/custom region :500-556）同 data-slot+testid/cid（empty+custom 分支缺 nop-gantt class，登记）
- `data-slot="gantt-layout"`（W8 补章，原重复 nop-gantt 根标记已去除）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass（fix landed） | layout 容器层补 slot、去重复根标记 |
| D4 区域 slot | pass | loading/empty/toolbar/列 region/taskBar/editor |
| D5 无自带 frame | pass | |
| D6 canvas a11y | pass | 既有命令式 grid 语义层（role+tabindex+label）满足 D6；W8 裁定保留 grid 语义，不强行改 application |

## Actions

- [x] gantt-layout.tsx:100 重复 `nop-gantt` → `data-slot="gantt-layout"`

## Proof

- `src/dom-structure-contract.test.tsx`（gantt: role=grid + label 非空 + 三件套 + 单 .nop-gantt + gantt-layout slot）
