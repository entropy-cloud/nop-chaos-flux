# 551 page-designer / print-designer shell 处置——豁免档 props 契约成文（P2.3）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P2.3；`docs/architecture/editor-designer-standard.md` §5.2/§6 裁决②
> Related: plan 544（P0.1 裁决②：两家族成文为正式豁免档，附带义务 = props 契约文档档成文）

## Purpose

执行 P0.1 裁决②的附带义务：把 page-designer 与 print-designer 的对外 props 契约（豁免档的替代契约面）在各自文档中成文，使豁免登记表的两行从"承诺成文"变为"已成文可核对"。纯文档计划，零代码变更。

## Current Baseline

- 裁决②已定版（editor-designer-standard.md §6）：page-designer/print-designer 不迁 WorkbenchShell/manifest/scope 投影，豁免层与替代契约已登记 §5.2，但登记表"替代契约"列只写"props 契约文档档"承诺，尚无实际成文内容。
- page-designer 对外面（live）：`PageDesignerProps { env?, templates?, dataSourceNames?, onBack? }`（`page-designer-page.tsx`）；导出产物 = 组件内 `exportedJson` memo（JSON source 面板消费）；补充导出 `useDesignerSession`/`PageDesignerCanvas`/`PalettePanel`/`InspectorPanel` 等（`index.ts`）。
- print-designer 对外面（live）：`PrintDesignerProps { template, onTemplateChange?(template, serialized), className? }`（`print-designer.tsx`，受控入口；onTemplateChange = commit 后回调，即 editor-core.md 所述 `onCommitted` 通道）。
- 既有家族文档：`docs/components/page-designer/design-architecture.md`、`docs/components/print/design.md`（均存在，无 props 契约专节）。

## Goals

- **对外出口面边界裁定（Decision）**：登记的豁免替代契约 = **两个壳组件的 props**（`PageDesignerProps` / `PrintDesignerProps`）+ page-designer 的 `exportedJson` 导出产物（§5.2 登记原文"组件 props（exportedJson 等）"即此范围）；组合面次级导出（page：`useDesignerSession`/`PageDesignerCanvas`/`PalettePanel`/`InspectorPanel`/`CanvasOverlay` 等；print：`createPrintEditorController`/`PrintEditorController` 命令面/`PrintDesignerCanvas` 等子组件 props）**显式划出登记契约**——它们是豁免壳层留给宿主自建组合的内部面，在文档节内列明"组合面导出（豁免内部面，不入登记契约）"小节，边界成文不留暗债。
- `docs/components/page-designer/design-architecture.md` 增「对外 props 契约（豁免档）」节：PageDesignerProps 四 prop 语义 + exportedJson 导出面 + 组合面导出小节 + 豁免声明（引用 editor-designer-standard.md §5.2/裁决②）。
- `docs/components/print/design.md` 增同名节：PrintDesignerProps 三 prop 语义（受控 template + `onTemplateChange(template, serialized)` = commit/受控回写通道，即 editor-core `onCommitted` 经 `policy:'auto'` 每次变更触发——注意与裁决③的 `save` 事件词汇区分，P3.2 落地时不得混淆）+ 组合面导出小节 + 豁免声明。
- `editor-designer-standard.md` §5.2 两行的"替代契约"列补文档路径，并修正 page 行"组件 props（exportedJson 等）"措辞（exportedJson 是导出产物非 prop）。
- roadmap §6 P2.3 状态回写两段：draft review 通过后 `todo` → `planned`；closure audit 通过后 `planned` → `done`。
- daily log 收口记录。

## Non-Goals

- 不改任何代码/props 类型；不迁 shell/manifest（裁决②终态）。
- 不重写两份设计文档既有内容（只追加节）。

## Scope

### In Scope

- `docs/components/page-designer/design-architecture.md`、`docs/components/print/design.md`、`docs/architecture/editor-designer-standard.md` §5.2、roadmap §6 P2.3 状态、daily log。

### Out Of Scope

- 一切 `packages/` 变更；roadmap 其他项。

## Failure Paths

不适用（纯文档）。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`不适用：纯文档计划，无行为变更`。验证 = 文档内容与 live props 类型逐项核对（closure audit 执行）。

## Execution Plan

### Phase 1 - props 契约成文（Fix）

Status: completed
Targets: 两份家族文档 + standard §5.2

- Item Types: `Fix`

- [x] page-designer 文档增 props 契约节（与 live `PageDesignerProps` 四 prop/exportedJson memo 逐项一致 + 组合面小节 + 豁免声明 + "无编程式宿主保存通道"明示）
- [x] print 文档增 props 契约节（与 live `PrintDesignerProps` 三 prop 逐项一致 + onTemplateChange=commit/受控回写通道措辞含裁决③区分注记 + 组合面小节 + 豁免声明）
- [x] standard §5.2 两行替代契约列补文档路径 + page 行 exportedJson 措辞修正（导出产物非 prop）

Exit Criteria:

- [ ] 三处文档落地且与 live 类型一致（audit 逐 prop 核对）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_0c1fb01f-dcc8-4629-a1ed-9c05dd7d1489）
- Verdict: pass（round 1 fail → 修订）
- Rounds: 2（round 2 为修订核对）
- Findings addressed: Major 对外出口面边界显式裁定（登记契约 = 壳组件 props + exportedJson 产物；组合面次级导出划出并在文档列明）；Minor① onTemplateChange 改"commit/受控回写通道"措辞 + 与裁决③ save 词汇区分注记；Minor② roadmap planned 中间态回写补入；Minor③ daily log 收口项补入；Minor④ §5.2 exportedJson 措辞修正。

## Closure Gates

> 纯文档计划：`pnpm test`/`lint`/`typecheck`/`build` 条目按 plan guide 删除。

- [x] props 契约文档成文且与 live 类型逐项一致（含组合面边界裁定成文）
- [x] standard §5.2 承诺→已成文闭环
- [x] 豁免档完整（裁决②附带义务清偿；出口面边界无暗债）
- [x] daily log 收口记录
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] roadmap §6 P2.3 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 裁决②附带义务清偿：出口面边界显式裁定（壳 props + exportedJson 产物为登记契约；组合面导出划为豁免内部面）+ 两家族文档 props 契约节落地（与 live 类型逐项一致）+ §5.2 承诺闭环；独立 closure audit approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_c1e4eb22-b52e-443a-a01b-64043b3eca53）
- Evidence: VERDICT: approved——page 四 prop/exportedJson memo 与 live 逐字段核对（含缺省值与消费点 471/490）、print 三 prop 及 commit 通道端到端核实（print-designer.tsx:25-27 → use-print-editor.ts:74-83 policy auto）、组合面导出清单与两包 index.ts 逐符号核对无错分类、边界裁定成文无暗债、roadmap/daily log/纯文档门禁删除全部符合。

Follow-up:

- no remaining plan-owned work.
