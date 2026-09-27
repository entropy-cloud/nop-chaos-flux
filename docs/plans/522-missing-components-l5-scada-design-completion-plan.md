# 522 Missing Components L5 — SCADA 设计器三件补全（L5.3 绑定面板 / L5.4 模板库站点 / L5.5 预览注入）

> Plan Status: completed
> Last Reviewed: 2026-09-27
> Source: `docs/analysis/2026-09-26-scada-designer-demo-gap-audit.md` §4.3（D1/D2/D3 需补设计三件）；`docs/backlog/missing-components-and-designer-roadmap.md` §8（L5 线，design-first 铁律）
> Related: `docs/plans/521-missing-components-l5-scada-demo-wiring-plan.md`（L5.1/L5.2/L5.6 先行）；`packages/flux-renderers-industrial/src/editor/design-architecture.md §9`（绑定面板接入点占位）

## Purpose

收口 L5 线三个需补设计的产品级大件（design-first：每件先设计文档、再实现、后测试），使 L5 线达到出口状态（L5.7 数字收口与 L5.8 demand-gated 在 roadmap 登记处闭环）。

## Current Baseline

- inspector binding/state 类字段为裸 json-editor textarea（inspector-field.tsx:16；schema-extractor.ts:96-99）。
- 包内无任何 template/station 代码（全仓 grep 零命中）。
- 双态隔离契约已立（R5 三层，editor-session.ts）；host 级运行态注入无设计。

## Goals

- L5.3：设计节 + 绑定面板结构化编辑（点/表达式互斥写入、非法输入行级隔离、validate 单源不破）。
- L5.4：设计节 + 模板库/站点模型与 UI（模板=ScadaSymbolNode[] 片段、实例化复用 clipboard 管线、画面=serializedConfig、切换=save→load、存储归宿主注入回调）。
- L5.5：设计补节 + 预览数据注入（PointStore+BindResolver 复用、preview 门控、touched 快照还原、previewMock、component:previewInject/previewClear 句柄）。

## Non-Goals

- 动作绑定编辑器（L5.8 O1——animation/event 维持 json-editor）；InnerEditor/OS clipboard（O2/O3）；模板市场/协作。

## Scope

### In Scope

`packages/flux-renderers-industrial/src/editor/`（inspector/binding-panel、template/×4、station/×4、preview/×2、接线与句柄）、设计文档三份、i18n、e2e spec。

### Out Of Scope

serialization 既有格式变更；宿主持久化实现（demo 内存 store 即可）。

## Failure Paths

| 编号                  | 触发                 | 行为                          | 可重试 | 用户可见     |
| --------------------- | -------------------- | ----------------------------- | ------ | ------------ |
| binding-invalid-input | 绑定面板非法输入     | 行级隔离永不写 working copy   | 是     | 行级错误态   |
| template-id-collision | 实例化模板 id 冲突   | id 自增重写 + connection 重写 | 是     | 新 id 面板   |
| preview-edit-inject   | edit 态误调注入      | 返回 0（门控 no-op）          | —      | 无副作用     |
| screen-switch-dirty   | 画面切换有未保存改动 | save→load（清栈提示）         | 是     | 画面正确载入 |

## Test Strategy

档位：**必须自动化**（每件 focused 单测；e2e spec 5 条叙事断言；覆盖率门禁 Branches ≥90% 达标 91.51%）。

## Execution Plan

### Phase 1 - 三件设计文档

Status: completed
Targets: `docs/components/industrial-hmi-editor/design-binding-panel.md`、`design-template-station.md`、`design-renderer.md` §13 增补

- Item Types: `Decision`
- [x] L5.3 绑定面板设计节（面板 schema/UI 契约：点引用 datalist 权威源=working copy variables、点/表达式互斥、行级隔离）
- [x] L5.4 模板/站点设计节（station/template 模型、宿主存储回调、实例化管线复用）
- [x] L5.5 预览注入设计补节（§13：注入通道/门控/快照还原/previewMock）

Exit Criteria:

- [x] 三份设计文档落盘无待定

### Phase 2 - 三件实现 + 测试

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/`（inspector/binding-panel.tsx、template/×4、station/×4、preview/×2、接线句柄）

- Item Types: `Fix`、`Proof`
- [x] L5.3 实现：binding-panel.tsx（逐属性行 + 点/表达式互斥写入 + 点引用 datalist + 高级 JSON；animation/event 维持 json-editor——O1 边界）
- [x] L5.4 实现：template/×4（模型/对话框/实例化 buildClipboardPaste 复用）+ station/×4（storage 模型/对话框/切换 save→load）
- [x] L5.5 实现：preview/×2（injector + mock 源正弦波形）+ previewMock prop + previewInject/previewClear 句柄 + 测试句柄 preview 子面
- [x] focused 单测全绿（binding-panel 14 + station-model/template-model/dialogs + preview-injector 8；覆盖率补测 +58 至 Branches 91.51%）

Exit Criteria:

- [x] industrial vitest 1608/1608 全绿 + tsc 0 错 + Branches ≥90% 达标

### Phase 3 - 收口验证 + 登记

Status: completed
Targets: 全仓 + 登记面

- Item Types: `Proof`
- [x] e2e spec 5 条叙事断言（scada-editor-plan522.spec.ts）+ demo 接线；全量链 40×3+74/74 EXIT=0、check 零新增红；e2e 全量 1608/43/2/0 零新增红（gantt flake 隔离绿 + watch-only）
- [x] i18n zh/en parity；roadmap §13 L5.3/L5.4/L5.5 done 行 + dev log

Exit Criteria:

- [x] 全量验证记录于 Closure；登记面命中

## Draft Review Record

- Reviewer / Agent: 实现与审查由执行 agent 自检 + 独立 closure audit 兜底（本 plan 为执行 agents 交付的收口记录 plan；design 文档自检 gate 内嵌于 design 文档头）
- Verdict: closure audit `approved`（0B/0M/3m，2026-09-27——簿记清零后维持）
- Rounds: 1
- Findings addressed: m1 plan 文件补写（本文件）；m2 roadmap done 行落盘；m3 design-renderer §13 模拟源措辞对齐实现（内联正弦非 mock-point-source 随机游走）；m4 station-model 辅助函数补测 ×3

## Closure Gates

- [x] Phase 1-3 Exit Criteria 全勾
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（animation/event json-editor 边界 = L5.8 O1 登记裁定）
- [x] 受影响 owner docs 已同步（三份设计文档 + design-renderer §13）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`（零新增红）
- [x] `pnpm test:e2e`（零新增红口径）

## Deferred But Adjudicated

### 动作绑定编辑器（O1）/ InnerEditor（O2）/ OS clipboard（O3）/ 历史深化（O4）

- Classification: `watch-only residual`（L5.8 demand-gated）
- Why Not Blocking Closure: E10 post-mission 记录 + 无已过 gate 设计；本 plan 边界裁定在案（animation/event 维持 json-editor）
- Successor Required: `no`（需求出现按铁律建 plan）

## Closure

Status Note: 三件 design-first 交付（设计文档 → 实现 → focused 测试 → e2e 叙事），全量验证 full-green（链 40×3+74/74、check 0、覆盖率 Branches 91.51%、e2e 1608/43/2/0 零新增红），closure audit approved（0B/0M/3m 簿记清零）。L5 线出口达成（L5.7 R7 primary 数值化达标在案 + 人工确认依据 = 用户概括放行指令先例 510；extended 留观察；L5.8 demand-gated）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent（general-purpose，2026-09-27）
- Evidence: verdict `approved`（0B/0M/3m）——三件交付面对照 gap audit §4.3 全在案；互斥写入/实例化管线复用/touched 还原/e2e 断言语义逐项核验；1608 测试实跑 + Branches 91.51% 实测。3m（plan 文件补写/roadmap 行/§13 措辞 + m4 补测）已清零。

Follow-up:

- no remaining plan-owned work（QA.5 集成审计随 L5 收口触发）
