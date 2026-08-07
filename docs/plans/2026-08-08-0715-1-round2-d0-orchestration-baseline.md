# D0 编排基线（第二轮：输入盘点 + host 面范围核对 + 门禁基线 + host 审计卡模板）

> Plan Status: completed
> Mission: component-audit-round2
> Work Item: D0
> Last Reviewed: 2026-08-08
> Source: `docs/backlog/component-audit-round2-roadmap.md`（D0 行 + Phase Details）、`docs/audits/component-audit-checklist.md` v2、`docs/audits/per-component/pc-index.md`、`docs/logs/2026/08-08.md`
> Related: `docs/plans/2026-08-08-0715-2-round2-d1-gate-drift-pattern-family-rescan.md`、`docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md`（依赖本 plan 完成才能开工）；`docs/plans/2026-08-02-2043-1-c0-orchestration-baseline.md`（第一轮 C0 先例）

## Purpose

把 component-audit-round2 mission 从"已批准的路线图"推进到"可开工的基线状态"：① 完成第二轮输入盘点（113 卡 149 条 P3 全量提取 + 08-06/08-07 两轮审计 P3 登记 + 各 plan Non-Blocking Follow-ups 归集）落 `docs/audits/round2-p3-inventory.md`；② 完成 4 个 host 大面（8 包）范围核对（src 结构、导出面、宿主 e2e 场景清单、host 架构 owner docs 契约基准）并建 `docs/audits/host-surface/` 目录；③ 全量门禁基线重跑（28 项 `check:*` 含 14 项 `check:audit-*` + `pnpm test:scripts` 门禁回归套件）并记录为 D1 的零新增判定基准；④ 将 host 审计卡模板（18 维降维 + designer 特有维度）写入 checklist v2、核对保护区域地图。D0 完成后 D1/D2/DB/DL/D3.x 才能以同一基线开工。

## Current Baseline

（全部为 live repo 核对事实，2026-08-08）

- **第二轮 roadmap 与 mission**：`docs/backlog/component-audit-round2-roadmap.md` 已发布（2026-08-08），13 个 work items 全部 `todo`；`missions/component-audit-round2.json` 已就位。`docs/plans/` 中除本批 0715-_ 三份兄弟 draft plan（本 plan + `2026-08-08-0715-2-_`+`2026-08-08-0715-3-_`）外，无其他 round-2 plan（最新独立批次为 `2026-08-08-0150-_` 三 plan，均已 completed）。
- **CV full-green 基线**（2026-08-06 实测，project-context freshness: fresh）：typecheck/build/lint 32/32；test 59/59（10,397 passed / 0 failed）；e2e 1054 passed / 43 skipped / **6 failed 全为 watch-only 归因清单**（c3-5 Tiptap ×2、w3d-editor、gantt-perf/kanban-perf 本机 50Hz 阈值、ai-attachments 已解 flake 记录）；component-lab 334/1/2；smoke 111/111；host-surfaces 42/42。
- **`pnpm check` 基线**：exit 0——root `package.json` 实测 **28 项 `check:*`**（含 **14 项 `check:audit-*`**）；oversized-code-files 仅 2 条既有 locale 豁免；workspace-manifest-deps（含反向规则）零命中；audit 三门禁（event-dispatch-ctx / renderer-browser-io / raw-schema-reads）零命中 + 7 条原生 DOM 转发 allowlist。
- **第一轮产物**：113 卡全 closed，P0×4 / P1×128 / P2×225 / P3×149（pc-index 2026-08-06 汇总）；live grep `- [P3-` 于 `docs/audits/per-component/` 实测 **149 条**，与 pc-index 一致。CX-1..CX-12 共性重构全部 done。
- **08-06/08-07 两轮 post-closure audit**：85 条 P2（08-06 批 46 + 08-07 批 39）已由 2228-1/2/3 与 0150-1/2/3 修复收口；其中 08-06 multi-audit 42 条 P2+P3、08-07 multi-audit 19 条 P2+P3（含降级 P3：14-4、14-5+23-3，均已由 0150-3 修复）。**Follow-up Backlog 三批（08-06/08-07/08-08）全部 `[x]` 收口**。
- **待归集 Follow-ups（live 核对）**：`2228-3` Non-Blocking Follow-ups 的工具治理条目（01-02/03-01/03-02/03-03/14-1/14-2/14-4/14-5+23-3）——其中 01-02/03-03/14-1 已由 0150-1 修复、03-01/03-02 已由 0150-2 修复、14-2/14-4/14-5+23-3 已由 0150-3 修复，**实际已全部落定，D0 需核验终态**；`2228-1` 的 ERP 设计文档 watch-only 项（`docs/components/schema-gap-from-erp-integration-design.md` :355/:359/:453/:481 的 `polling.stopWhen` 建议，依赖 SurfaceRuntime `$surface.hasOpenSurface`）；`0150-1` 的 `scripts/__tests__/find-event-dispatch-without-ctx.test.ts:14-33` `stagedDirs` 同型治理条目（env scan-root 方案可迁移，归工具治理轮次）。
- **4 host 大面 = 8 包（live 核对存在）**：flow-designer-core/renderers、spreadsheet-core/renderers、report-designer-core/renderers、word-editor-core/renderers。宿主 e2e 现状：flow-designer 9 个 spec（`tests/e2e/flow-designer-*.spec.ts` + `node-title-subtitle-gap` + `designer-summary-renderers`）+ `taskflow-designer-ui.spec.ts`（构建于 flow-designer-renderers 上的宿主场景，断言 `.react-flow__node` ×7，需 Decision 判定是否归 D3.1 面清单）、report-designer 1 个 spec（`report-designer-demo.spec.ts`）、word-editor 4 个 spec（`word-editor*.spec.ts` ×4）；**spreadsheet 无独立 e2e spec（live 核对 0 命中）**——需核对是否有归属其他 spec 的宿主场景（如 `designer-summary-renderers.spec.ts` / `exploratory/`）或确认为 coverage gap 记入核对清单。
- **host 契约基准文档**：`docs/architecture/flow-designer/`（design/api/config-schema/canvas-adapters/collaboration/tree-mode/runtime-snapshot/dingflow-visual-spec）、`docs/architecture/report-designer/`（design/api/contracts/codec-design/config-schema/inspector-design/nop-report-profile/spreadsheet-canvas-css）、`docs/architecture/word-editor/design.md`——D0 列为每面审计的契约基准清单。**spreadsheet 无独立架构 owner doc**（live 核对 `docs/architecture/` 无 spreadsheet 目录；最近似契约基准为 `docs/architecture/report-designer/spreadsheet-canvas-css.md`）——该 gap 在 Phase 2 核对中显式记录。
- **`docs/audits/host-surface/` 目录不存在**；`component-audit-checklist.md` v2 尚无 host 审计卡模板节（当前仅 18 维组件级模板 §4）。
- **门禁回归套件**：`scripts/__tests__/` 现有 7 文件（check-active-doc-code-anchors / check-package-css-exports / check-workspace-manifest-deps / find-event-dispatch-without-ctx / find-renderer-browser-io / find-runtime-raw-schema-reads + fixtures）。
- **`@reserved` 现状（D2 输入，D0 登记）**：live grep 实测 7 处 / 3 文件（`flux-renderers-data/src/crud-schema.ts`、`flux-renderers-scheduling/src/scheduling-renderer-definitions.ts`、`flux-renderers-scheduling/src/calendar/calendar.tsx`）。
- **保护区域地图**：4 host 面包不在 Protected Areas 表（`docs/context/ai-autonomy-policy.md` 全表 6 行：`packages/flux-core/src/` plan-first、Schema/contract validation plan-first、`packages/ui/src/index.ts` ask-first、Renderer 定义 fields plan-first、样式契约 plan-first、Auth/security boundaries ask-first——host 包均不涉及）；`packages/ui/src/index.ts` 公共导出 `ask-first`；结构性重构（公共 API/包边界）执行前需人工确认。
- **已知断言**：host 面组件为"面（surface feature）"非注册 renderer type，无 per-component 卡先例；第一轮 C0 的清单核对范围（9 renderer 包 113 组件）与第二轮 D0 的 host 面范围不重叠。

## Goals

- `docs/audits/round2-p3-inventory.md` 完成且**零悬挂**：149 条 P3 全量提取（live grep 与 pc-index 核对）+ 08-06/08-07 审计 P3 登记 + 各 plan Non-Blocking Follow-ups 归集终态核验，全部带出处（卡文件:行 或 plan 引用）。
- 4 host 面范围核对完成：8 包 src 结构、导出面、宿主 e2e 场景清单（含 spreadsheet e2e 缺口判定）、host 架构 owner docs 契约基准清单，落 `docs/audits/host-surface/`（目录建立）。
- 全量门禁基线重跑完成并记录（28 项 `check:*` + `pnpm test:scripts` 输出），作为 D1 的零新增判定基准。
- host 审计卡模板写入 `component-audit-checklist.md` v2（18 维降维 + designer 特有维度：host 契约/事务/undo/拖拽/键盘/剪贴板/e2e 可操作性/MA4.3 测试覆盖缺口回归）。
- 保护区域地图核对完成并记录（4 host 面包授权边界 + `ask-first` 项）。

## Non-Goals

- 不执行 D1 的门禁漂移回扫与四模式族回扫（含任何修复）——门禁重跑暴露的新命中**只登记归因，不修复**（新命中裁决属 D1 Phase 1）。
- 不做 P3 逐条裁决（D2）、不补写 bug notes（DB）、不写 lessons（DL）。
- 不进行任何 host 大面审计（D3.1–D3.4，依赖本 plan 的 host 模板）。
- 不修改 18 维组件级 checklist 语义（仅新增 host 模板节，不动既有维度编号与语义）。

## Scope

### In Scope

- `docs/audits/round2-p3-inventory.md`：P3 全量提取（live grep `- [P3-` 与 pc-index 149 核对）+ 08-06/08-07 审计 P3 登记 + Non-Blocking Follow-ups 归集（2228-1 ERP watch-only / 2228-3 工具治理条目终态核验 / 0150-1 stagedDirs 治理路由）。
- 4 host 面范围核对：8 包 src 结构、导出面、宿主 e2e 场景清单、host owner docs 契约基准清单；`docs/audits/host-surface/` 目录建立。
- 全量门禁基线重跑：28 项 `check:*`（14 项 `check:audit-*`）+ `pnpm test:scripts`；结果记录于 daily log（D1 零新增判定基准）。
- host 审计卡模板（18 维降维 + designer 特有维度）写入 checklist v2。
- 保护区域地图核对与记录。

### Out Of Scope

- 任何代码修复（D0 为纯编排/盘点轮；新命中登记后归 D1/D3.x 裁决）。
- P3 裁决本身（D2）、bug note 补写（DB）、lessons 沉淀（DL）。
- host 大面审计（D3.x）。
- 结构性重构（公共 API、包边界）——需人工确认。

## Failure Paths

不适用（本 plan 无外部集成/鉴权/错误处理 API 契约；主要风险是门禁基线重跑暴露新红项，已在 Phase 3 以"登记归因、不修复、归 D1 裁决"覆盖——与第一轮 C0 红项归因处理同型）。

## Test Strategy

本档选择：**不适用：纯编排/盘点/文档计划，无产品代码变更**。`pnpm check` 与 `pnpm test:scripts` 重跑是本 plan 的 Proof 交付物（基线记录），不是新代码的验证动作；不新增任何测试用例。

## Execution Plan

### Phase 1 - 输入盘点：round2-p3-inventory.md

Status: completed
Targets: `docs/audits/per-component/*.md`（113 卡）、`docs/audits/per-component/pc-index.md`、`docs/audits/2026-08-06-0711-multi-audit-component-audit.md`、`docs/audits/2026-08-07-1747-multi-audit-component-audit.md`、`docs/plans/2026-08-07-2228-{1,3}-*.md`、`docs/plans/2026-08-08-0150-{1,2,3}-*.md`、新建 `docs/audits/round2-p3-inventory.md`

- Item Types: `Proof | Decision | Follow-up`

- [x] 全量提取：`rg -n -- "\[P3-" docs/audits/per-component/*.md` 提取全部 P3 条目（实测 149 条），与 pc-index 的 149 汇总核对一致；每条记录：卡文件、`P3-<seq>` 编号、内容摘要、状态（keep/fixed/backlog 等，以卡内标注为准）。
- [x] 08-06/08-07 审计 P3 登记：从 `2026-08-06-0711-multi-audit-component-audit.md`（42 条 P2+P3）与 `2026-08-07-1747-multi-audit-component-audit.md`（19 条 P2+P3，含降级 P3 的 14-4、14-5+23-3）中登记 P3 条目及其修复状态（已由 0150-1/2/3 修复的标注 plan 引用）。
- [x] Follow-ups 归集（Decision）：逐项核验终态——2228-3 工具治理条目（01-02/03-01/03-02/03-03/14-1/14-2/14-4/14-5+23-3 是否全部由 0150-1/2/3 落定）；2228-1 ERP 设计文档 watch-only（`docs/components/schema-gap-from-erp-integration-design.md` :355/:359/:453/:481 `polling.stopWhen`，依赖 SurfaceRuntime `$surface.hasOpenSurface`）；0150-1 `find-event-dispatch-without-ctx.test.ts:14-33` `stagedDirs` 治理路由；每项落 `collected` + 出处 + 复核结论。
- [x] 盘点表零悬挂声明：每条 P3 / 审计 P3 / Follow-up 均有状态与出处，无遗漏条目（对照 pc-index 与卡文件 grep 双重核对）。

Exit Criteria:

- [x] `docs/audits/round2-p3-inventory.md` 存在：149 P3 + 08-06/08-07 审计 P3 + Follow-ups 归集全部带出处，`rg -c -- "\[P3-" docs/audits/per-component/*.md` 与库存表计数一致（149），零悬挂声明写明核对方式。
- [x] 归集终态核验：2228-3 条目全部有"由 plan X 落定"的复核引用；2228-1 ERP watch-only 维持 watch-only 并记录复核结论（无新消费者证据）；0150-1 stagedDirs 条目记录路由（工具治理轮次或 D1/DR 承接）。

### Phase 2 - 4 host 面范围核对

Status: completed
Targets: `packages/{flow-designer-core,flow-designer-renderers,spreadsheet-core,spreadsheet-renderers,report-designer-core,report-designer-renderers,word-editor-core,word-editor-renderers}/src`、`tests/e2e/`、`docs/architecture/flow-designer/`、`docs/architecture/report-designer/`、新建 `docs/audits/host-surface/`

- Item Types: `Proof | Decision`

- [x] 8 包核对：每包 src 结构（目录/主要模块）、公共导出面（`src/index.ts`）、与既有 owner docs（flow-designer 9 文件 / report-designer 9 文件 / word-editor `design.md` / **spreadsheet 无独立 owner doc——登记为 gap，基准取 `report-designer/spreadsheet-canvas-css.md`**）的对应关系，落核对清单。
- [x] 宿主 e2e 场景清单：`tests/e2e/` 下 flow-designer（9 spec + `node-title-subtitle-gap` + `designer-summary-renderers` + `taskflow-designer-ui.spec.ts`——Decision 判定其宿主归属）、report-designer（`report-designer-demo`）、word-editor（4 spec）、spreadsheet（**0 命中，判定为 coverage gap 或确认归属其他 spec 的宿主场景**）——Decision 记录判定。
- [x] host 面（surface feature）清单初稿：按 roadmap D3.x 各面列举（flow-designer：canvas/节点/边/槽位/面板/树视图/命令/事务/undo/拖拽/键盘/剪贴板/缩放平移/JSON.parse 失败路径；spreadsheet：表格渲染/单元格编辑/工具栏/状态栏/公式/冻结/选择/键盘导航/搜索/undo；report-designer：画布/字段拖拽/inspector/预览/保存/undo/模板；word-editor：文档渲染/工具栏/选区/数据集/恢复/导出/导入），供 D3.x plan 引用。
- [x] `docs/audits/host-surface/` 目录建立（含面清单初稿或 README 指针）。

Exit Criteria:

- [x] `docs/audits/host-surface/` 存在；8 包核对清单完整（每包：src 结构 + 导出面 + owner docs 引用）；宿主 e2e 清单含 spreadsheet 缺口判定（Decision 留痕）；host 面清单初稿覆盖 roadmap D3.x 全部列举面。

### Phase 3 - 全量门禁基线重跑

Status: completed
Targets: root `package.json` 28 项 `check:*` 脚本、`pnpm test:scripts`、`docs/logs/2026/08-08.md`

- Item Types: `Proof | Decision`

- [x] 逐项重跑 28 项 `check:*`（含 14 项 `check:audit-*`，清单以 live `package.json` 为准），记录每项输出（exit 0 / 命中数）。
- [x] 重跑 `pnpm test:scripts`（`vitest.scripts.config.ts`，7 文件门禁回归套件），记录通过数。
- [x] 新命中归因（Decision）：出现非既有红集的命中 → 判定"门禁自身回归 vs CV 后代码漂移"，**只登记不修复**，登记于 daily log 并标注归 D1 Phase 1 裁决（含 browser-io 6d2497ea 漏扫教训专项：任何疑似扫描器回归先查扫描范围正则）。
- [x] 基线记录回写 daily log：D1 的零新增判定基准 = 本 Phase 实测输出。

Exit Criteria:

- [x] daily log 记录 28 项 `check:*` 逐项结果 + `pnpm test:scripts` 通过数；任何新命中均有归因与 D1 归属标注；D1 零新增判定基准明确。
- [x] 既有红集核对：oversized 仅 2 条 locale 豁免、workspace-manifest-deps 零命中、audit 三门禁零命中 + 7 条 allowlist——与 project-context 声明一致（不一致则修正记录）。

### Phase 4 - host 审计卡模板 + 保护区域地图

Status: completed
Targets: `docs/audits/component-audit-checklist.md`（v2）、`docs/context/ai-autonomy-policy.md`、`docs/logs/2026/08-08.md`

- Item Types: `Decision | Proof`

- [x] host 审计卡模板节写入 checklist v2：18 维降维应用（每维 host 面语义化）+ designer 特有维度（host 契约：`RendererEnv`/`hostContract`/manifest 注册；事务与 undo 语义；拖拽/键盘交互完整性；剪贴板；e2e 可操作性；M 轮 MA4.3 测试覆盖缺口回归）；模板含"每面 ≥1 真实浏览器宿主场景（bug 73 模式专项，programmatic DOM 断言）"条款。
- [x] 保护区域地图核对（Decision）：4 host 面包不在 Protected Areas 表 → 默认 `implement`；`packages/ui/src/index.ts` 公共导出 `ask-first`；结构性重构（公共 API/包边界）人工确认；Renderer 定义 fields / 样式契约 `plan-first`——记录于 checklist 或 daily log。
- [x] daily log 收口：D0 交付物清单（inventory 表、host 核对清单、门禁基线、host 模板位置、保护区域核对结论）。

Exit Criteria:

- [x] checklist v2 含 host 审计卡模板节（18 维降维 + designer 特有维度 + 真实浏览器宿主场景条款），历史 18 维组件级模板未被改写。
- [x] 保护区域地图核对结论已记录；daily log 含 D0 收口证据。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，task `ses_02177c1d0ffecdnHInGdTYtPZt`）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major；5 条 Minor（F1 round-2 plan 存在性表述、F2 taskflow-designer-ui.spec.ts 归属、F3 Phase 1 Targets 补 0150-2、F4 Protected Areas 全表 6 行、F5 spreadsheet 无独立 owner doc gap）全部修正。

## Closure Gates

> **纯文档/编排计划**：不涉及产品代码变更，`pnpm test`/`lint`/`typecheck`/`build` 四项从本表中移除（00-plan-authoring-and-execution-guide.md 纯文档计划条款）；`pnpm check` 与 `pnpm test:scripts` 为 in-scope Proof 交付物，保留。

- [x] `docs/audits/round2-p3-inventory.md` 零悬挂（149 P3 + 审计 P3 + Follow-ups 归集全部带出处与终态复核）
- [x] `docs/audits/host-surface/` 目录建立，8 包范围核对 + 宿主 e2e 清单（含 spreadsheet 缺口判定）+ host 面清单初稿完成
- [x] 全量门禁基线重跑记录完成（28 项 `check:*` + `test:scripts`），新命中已归因并归 D1 裁决，D1 零新增判定基准明确
- [x] host 审计卡模板节写入 checklist v2（18 维降维 + designer 特有维度 + 宿主场景条款）
- [x] 保护区域地图核对结论已记录（4 host 包 `implement` 默认 + `ask-first` 项）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 缺陷（D0 无代码缺陷 scope；新命中显式归 D1）
- [x] 受影响的 owner docs 已同步（`component-audit-checklist.md` v2 host 模板节、`docs/logs/2026/08-08.md`）或明确写明 No owner-doc update required
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm check`（D0 交付物基线，exit 0 或与既有红集一致）
- [x] `pnpm test:scripts`（D0 交付物基线，门禁回归套件全绿）

## Deferred But Adjudicated

### 新命中修复（D1 归属）

- Classification: `watch-only residual`
- Why Not Blocking Closure: D0 为编排轮，门禁重跑暴露的新命中（若有）在 Phase 3 登记归因并显式归属 D1 Phase 1 裁决（"先修门禁还是先修代码按门禁语义裁决"），属明确 successor 归属，非静默延期。
- Successor Required: `yes`
- Successor Path: `docs/plans/2026-08-08-0715-2-round2-d1-gate-drift-pattern-family-rescan.md`

### 0150-1 `find-event-dispatch-without-ctx.test.ts` stagedDirs 治理

- Classification: `optimization candidate`
- Why Not Blocking Closure: 同型治理（`stagedDirs` 模块顶层可变数组 + 夹具写入模式）不影响门禁成立（0150-1 已留痕"本次不扩大范围"）；env scan-root 方案落地后可迁移，归工具治理轮次。
- Successor Required: `no`
- Successor Path: 工具治理轮次或 D1 顺手承接

## Non-Blocking Follow-ups

- 2228-1 ERP 设计文档 `polling.stopWhen` watch-only 项：维持 watch-only（依赖未发布的 SurfaceRuntime `$surface.hasOpenSurface`），D0 归集时复核无新消费者证据即可。
- spreadsheet 宿主 e2e 缺口：D0 判定为 coverage gap 时，由 D3.2 spreadsheet 大面审计 plan 承接补场景（不在 D0 修复）。

## Closure

Status Note: 2026-08-08 执行完毕。4 Phase 全 completed；纯编排/盘点轮零产品代码变更（`pnpm test`/`lint`/`typecheck`/`build` 按纯文档计划条款移出门禁）。交付物：`docs/audits/round2-p3-inventory.md`（149 P3 + 审计 P3 + Follow-ups 归集零悬挂）、`docs/audits/host-surface/`（README 8 包核对 + e2e 清单 + surface-inventory 面清单初稿）、门禁基线（28 项 `check:*` 27/28 exit 0 + `check:duplicates:detail` exit 1 归因归 D1 + `pnpm test:scripts` 6 files/15 tests 全绿 + 聚合 `pnpm check` exit 0）、checklist v2 §6 host 模板节（18 维降维 + H1-H7 designer 特有维度 + 宿主场景条款）+ §6.4 保护区域地图；roadmap D0 行 `todo`→`done`；daily log `docs/logs/2026/08-08.md` D0 节收口。D1 零新增判定基准 = Phase 3 实测输出。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，closure-audit 专用派发）
- Evidence: 独立复核 live repo（只读，未改动文件）verdict 先 `issues`（3 项纯收口流程项，内容全 pass）——①Phase 完整性 24/24 `[x]` + 4 Phase Status 全 completed（plan:81-84,88-89,98-101,105,114-117,121-122,131-133,137-138）；②交付物全落位：inventory §1 表 149 行 = `rg -c` 149（74 卡）、host-surface README 8 包表 + e2e 清单 + spreadsheet 缺口 Decision、surface-inventory fd/ss/rd/we 全列举、checklist §6.1-6.4 存在且 §2 18 维原文未改写（git diff 纯 §6 追加）、daily log D0 节含 28 项门禁 + test:scripts 6/15；③Closure Gates 待勾（本收口完成）；④roadmap D0 行 `done`（roadmap:24）；⑤deferred 分类诚实（watch-only residual / optimization candidate 各带 successor 路由，duplicates:detail 归因归 D1 非静默延期）；⑥文本一致性待收口（本 Closure 节填写后成立）。内容零 Blocker 零 Major，收口程序项已全部补齐——本 plan 可关闭。

Follow-up:

- no remaining plan-owned work（D0 纯编排轮；Non-Blocking Follow-ups 见上节：2228-1 ERP watch-only 维持、spreadsheet e2e 缺口由 D3.2 承接、duplicates:detail 归 D1 Phase 1 裁决、0150-1 stagedDirs 归工具治理轮次）。
