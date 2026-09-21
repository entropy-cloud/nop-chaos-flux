# 视觉质量证据卡目录（docs/audits/visual-quality/）

> 驱动方：`docs/backlog/visual-quality-roadmap.md`（mission `missions/visual-quality.json`）
> 模板定稿：`docs/analysis/visual-quality/V0-visual-regression-infra.md` §1-A4（plan 470）
> 用途：视觉质量路线图各 work item 的 findings/证据/裁决台账。一个域一张卡（域 = roadmap work item 粒度），每个 work item 开工时先在其研究报告（`docs/analysis/visual-quality/`）中逐项核实 findings，再回写卡片的裁决列；closure audit 通过后卡片转 `closed`。
> 与 component-audit 卡（`docs/audits/per-component/`）的关系：那是按 renderer type 的 18 维全量审计卡；本目录是按域的视觉质量专项卡，只登记显示效果/视觉/交互 findings。

## 卡片模板（v1，随 V0 定稿）

```md
# 视觉质量证据卡：<域名>（<roadmap work item>）

> 状态: seeded | verified | fixing | fixed-pending-closure | closed
> 来源: <普查报告章节 / 研究报告路径>
> Owner plan: <plan 路径或 —>
> Owner docs: <design.md 等>

## Findings 清单

- [V<x>-F<seq>] <一句话缺陷描述>（`文件:行`）
  - 证据: <live 核实记录或普查报告章节>
  - 裁决: <pending | fix-in-plan | adjudicated-watch-only | deferred: <理由> | fixed: <plan/commit>>
  - 状态: open | fixing | fixed | adjudicated | deferred

## 视觉证据

<程序化断言落点（spec/helper 引用）+ 诊断截图 artifacts 路径（如有）>

## Closure

<本域 work item closure audit 结论 + 日期（fresh session）>
```

状态流转：`seeded`（V0 转录，裁决 pending）→ `verified`（本域研究报告独立核实通过）→ `fixing` → `fixed-pending-closure` → `closed`（closure audit 通过，与路线图 `done` 同步）。

## 卡片索引

| #   | 卡                                                 | Work Item                 | 普查报告章节  | 状态   |
| --- | -------------------------------------------------- | ------------------------- | ------------- | ------ |
| 1   | [ai.md](ai.md)                                     | V2 AI 会话组件            | §1            | seeded |
| 2   | [threejs.md](threejs.md)                           | V3 3D 渲染                | §2            | seeded |
| 3   | [industrial-scada.md](industrial-scada.md)         | V4 SCADA/工业             | §3            | seeded |
| 4   | [flow-designer.md](flow-designer.md)               | V5 Flow Designer          | §4            | seeded |
| 5   | [spreadsheet.md](spreadsheet.md)                   | V6 Spreadsheet            | §5            | seeded |
| 6   | [report-designer.md](report-designer.md)           | V7 Report Designer        | §5            | seeded |
| 7   | [print.md](print.md)                               | V8a Print 设计器          | §6            | seeded |
| 8   | [word.md](word.md)                                 | V8b Word 编辑器           | §6            | seeded |
| 9   | [debugger-code-editor.md](debugger-code-editor.md) | V9 Debugger/代码编辑器    | §6            | seeded |
| 10  | [rich-text-markdown.md](rich-text-markdown.md)     | V10 富文本/Markdown       | §6            | seeded |
| 11  | [scheduling.md](scheduling.md)                     | V11a Scheduling 族        | §7.5          | seeded |
| 12  | [dashboard-map-graph.md](dashboard-map-graph.md)   | V11b Dashboard/Map/Graph  | §7.5          | seeded |
| 13  | [cross-cutting-theme.md](cross-cutting-theme.md)   | V1 主题与暗色地基         | §7.1          | seeded |
| 14  | [consistency-debt.md](consistency-debt.md)         | V12a/V12b/V12c 一致性债务 | §7.2–7.4 + §8 | seeded |

V12 三个 work item 闭环单位独立、证据同源，共用 #14 一张卡，卡内 findings 标注归属 work item。

## 豁免基线快照（V12 对照起点，对照协议 v1）

> 协议 v1 修订（2026-09-21，plan `docs/plans/483-visual-quality-v12a-consistency-governance-plan.md` Phase 1）：引入快照版本化与「结构性重基线」条款，取代下方 v0 口径的对照协议；其余章节不受本修订影响。

- 快照版本化：`exemption-baseline-v0.json`（plan 470 Phase 1 生成，入库文本资产）**保留为历史对照点**，不再承载现行红线；现行基线为 **v1**：`exemption-baseline-v1.json`（plan 483 Phase 5 一次性落定，唯一新建快照资产）。
- 生成：`node scripts/audit/find-ui-consistency-gaps.mjs --json > docs/audits/visual-quality/exemption-baseline-v1.json`（输出含排序确定性保证：byFile 按 file+rule、byRule 按键名，可作字节级 diff；`totals.files` 为唯一 (rule,file) 对数，非文件数）
- v0 数字（历史对照点）：**413 instances / 121 (rule,file) pairs / 32 exemption entries**（2026-09-19；与门禁人读输出同口径，(rule,file) 对为豁免作用域粒度，与 D2 历史 399/116/30 序列可比）
- **结构性重基线条款（一次性，仅 V12a）**：四包前缀豁免收紧为文件级属协议事件，允许 `totals.entries` 32 → 至多 117（四包 (file,rule) 对展开上界 89，实收以 A2/A3 落地后余量为准、终值见下）；`totals.instances` 一次性出清——A2 `hsl(var(…))` 假阳性出清按执行前重算清单（研究测算 ~105）、A3 结构化 16 例裁定为永久结构化通道 + UI 直出 31 例统一。v0→v1 的每条变动须归因到 plan 483 的 Phase 2/3/4 记录，一次性入账。
- **V12 对照协议 v1 红线（自 v1 快照落定起对 v1 生效）**：V12a/b/c closure 时复跑 `--json` 与 v1 快照 diff——①`totals.entries` 相对 v1 不得增加；②`totals.instances` 相对 v1 重基线值单调不增，每次变动须可归因到 V12 各批次修复/adjudication 记录；③`newHits` 持续为 0。
- v1 数字（plan 483 Phase 5 回填，2026-09-21）：**225 instances / 68 (rule,file) pairs / 69 exemption entries**（`exemption-baseline-v1.json` 与 live 复跑字节级一致；`newHits=0`）。

## 视觉断言工具链

- 计算样式/令牌/诊断截图：`tests/e2e/helpers/visual-assert.ts`
- 画布像素探测（2d/webgl）：`tests/e2e/helpers/canvas-pixel-probe.ts`
- 工具链自证：`tests/e2e/visual-assert-helpers.spec.ts`
- 各域 e2e 视觉断言缺口清单：`docs/analysis/visual-quality/V0-visual-regression-infra.md` §2
- 政策：快照仅诊断、判据一律程序化；基线永不入库（AGENTS.md 2026-08-28）。
