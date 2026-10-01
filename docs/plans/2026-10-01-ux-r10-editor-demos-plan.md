# UX-R10 编辑器演示页治理（Word / Code / SCADA / Dashboard 杂项）

> Plan Status: draft
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（WD-1/2、CE-1、SC-1/2/3/4、DB-4、OP-2、G-3/G-4 各页落地）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R10（含 PD-5 归属）
> Related: `apps/playground/src/pages/word-editor-page.tsx`、`code-editor-page.tsx`、`scada-editor-demo.tsx`、`dashboard-demo.tsx`、各 owner 页

## Purpose

把剩余编辑器演示页从"空内容/调试残留/开发文案上墙/混排"治理为"每页打开即有代表性内容、无调试残留、开发态文案下墙、数字可读"，并完成 R1-R10 队列收尾。

## Current Baseline

- **WD-1**：word-editor-page.tsx（61 行薄壳）文档内容仅 "Hello World"；文本两侧孤立"└"角标（疑似空表格边框残留）——执行期探针定位。
- **WD-2**：右侧大纲空态同一句重复两遍（标题+副标题重复）。
- **CE-1**：code-editor-page.tsx（379 行）所有编辑器打开为空；SQL Editor 初始高度塌陷单行；无行号/主题展示——"CodeMirror 6 特性橱窗"页完全不展示特性。
- **SC-1**：scada-editor-demo.tsx（303 行）工具栏双排纯文本按钮三套风格并存。
- **SC-2**：图元库纯文字列表无缩略图。
- **SC-3**：画布演示内容稀疏；LIVE 蓝块疑似调试残留（grep 定位后删或产品化）。
- **SC-4 待复核**：图元库 CUA 拖拽无响应（HTML5 DnD vs 合成事件——审计 DB-3 同类工具链限制，真实浏览器拖拽归人工复核）。
- **DB-4**：dashboard-demo.tsx 页头大段开发说明（G-4）+ 通栏巨型返回按钮；KPI 数值无千分位。
- **OP-2**：运营大屏 KPI 无千分位；页头实现标签 chip（G-4）。
- **G-4 各页**：开发态说明文案直接作为页面内容（SCADA 顶部 ~300 字、Dashboard 同类、运营大屏实现标签）。
- **PD-5**（自 R5 归入）：Page Designer inspector 开发者向文案（Status Path 三行英文说明/原始 JSON 编辑面）治理。

## Goals

- Word：文档预置示例内容（多级标题+段落，触发大纲）；角标残缺消除；大纲空态去重。
- Code：每编辑器预置代表性示例代码（展示 CodeMirror 特性）；SQL 高度修复。
- SCADA：LIVE 调试块删除/产品化；G-4 开发说明下墙（收进折叠说明或删除）；工具栏分组容器化（图标化归 follow-up，先治理层级）；图元库缩略图（形状预览，可行性执行期核实）。
- Dashboard/运营大屏：G-4 文案下墙；巨型返回按钮收敛为常规头部；KPI 千分位。
- PD-5：Page Designer inspector 英文运行时说明文案治理（i18n 化或删除）。
- 每页 e2e/探针断言内容存在性与关键视觉态。

## Non-Goals

- SC-4 真实浏览器 DnD 复核（人工 QA 项，非自动化可达）。
- SCADA 图元库完整图标体系（缩略图为形状级预览）。
- G-3 全面中英统一（随各页触达的文案顺带治理，全局审计归收敛复审计）。

## Scope

### In Scope

- `apps/playground/src/pages/word-editor-page.tsx`、`code-editor-page.tsx`、`scada-editor-demo.tsx`、`dashboard-demo.tsx`、运营大屏页
- `apps/playground/src/pages/page-designer-demo` inspector 文案（PD-5）
- e2e/探针断言

### Out Of Scope

- SC-4 人工复核、SCADA 图标体系、G-3 全局审计

## Failure Paths

| 可测场景编号       | 触发              | 行为                                                  | 可重试 | 用户可见表现         |
| ------------------ | ----------------- | ----------------------------------------------------- | ------ | -------------------- |
| wd1-content        | 打开 word demo    | 文档含多级标题与段落（大纲面板出现条目）              | 否     | 打开即有内容         |
| ce1-samples        | 打开 code demo    | 每编辑器有示例代码（容器非空断言）；SQL 高度 ≥ 阈值   | 否     | 特性橱窗成立         |
| sc3-no-debug-block | 打开 scada-editor | LIVE 调试块不存在；G-4 开发说明段落不存在（文本断言） | 否     | 无调试残留           |
| db4-kpi-format     | 打开 dashboard    | KPI 数值含千分位（文本断言）；开发说明段落不存在      | 否     | 数字可读、无开发文案 |

## Test Strategy

档位选择：`必须自动化`

内容存在性/文本断言/高度/computed style 均可程序化（e2e 先红后绿）；视觉形态（缩略图/工具栏层级）以探针截图旁证 + DOM 断言为主。

## Execution Plan

### Phase 1 - Word + Code 内容充实

Status: planned
Targets: `word-editor-page.tsx`、`code-editor-page.tsx`

- Item Types: `Proof`, `Fix`

- [ ] wd1 用例先红 → Word 文档预置多级标题+段落示例；角标残缺定位修复；大纲空态去重
- [ ] ce1 用例先红 → 各编辑器预置示例代码；SQL 高度修复
- [ ] playground 套件全绿

Exit Criteria:

- [ ] wd1/ce1 用例先红后绿
- [ ] 套件全绿

### Phase 2 - SCADA + Dashboard/大屏治理

Status: planned
Targets: `scada-editor-demo.tsx`、`dashboard-demo.tsx`、运营大屏页

- Item Types: `Proof`, `Fix`

- [ ] SC-3：LIVE 块删除/产品化；G-4 开发说明下墙（sc3 用例先红）
- [ ] SC-1：工具栏分组容器化（层级治理；图标化归 follow-up）
- [ ] SC-2：图元库形状级缩略图（可行性核实后落地或登记改判）
- [ ] DB-4/OP-2：G-4 文案下墙 + 巨型返回按钮收敛 + KPI 千分位（db4 用例先红）
- [ ] playground 套件全绿

Exit Criteria:

- [ ] sc3/db4 用例先红后绿
- [ ] 套件全绿

### Phase 3 - PD-5 文案治理与收尾

Status: planned
Targets: Page Designer inspector 文案

- Item Types: `Fix`

- [ ] PD-5：inspector 英文运行时说明文案治理（i18n 化或精简）
- [ ] 套件全绿 + 每页探针截图旁证入档

Exit Criteria:

- [ ] PD-5 断言绿
- [ ] 套件全绿

## Draft Review Record

- Reviewer / Agent: 待独立子 agent review（共识后执行）
- Verdict: pending
- Rounds: 0
- Findings addressed: —

## Closure Gates

- [ ] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [ ] 新增失败路径测试存在且通过（先红后绿记录在 daily log）
- [ ] 浏览器/e2e 实测证据存档
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增红项）
- [ ] owner doc 同步裁定（各页为 demo 层，预期 No owner-doc update required，收口时写明）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Non-Blocking Follow-ups

- SC-4 真实浏览器 DnD 人工复核
- SCADA 图元库完整图标体系
- G-3 全局中英统一收敛复审计

## Closure

Status Note: —

Closure Audit Evidence:

- Auditor / Agent: —
- Evidence: —
