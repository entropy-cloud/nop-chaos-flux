# 523 Missing Components L6 S2 — 标准页面设计器 MVP（page-designer-core + renderers + playground 入口）

> Plan Status: completed
> Last Reviewed: 2026-09-27
> Source: `docs/components/page-designer/design-architecture.md`（S1 架构，独立 review delta pass 0B/0M——本文是其 S2 实现计划，接口面以 S1 为契约，不重裁）；`docs/analysis/standard-page-designer-research.md`（S0）；roadmap §9
> Related: `docs/plans/521-missing-components-l5-scada-demo-wiring-plan.md`（L5 并行线）

## Purpose

实现 L6 S2 MVP：按 S1 架构新建 `page-designer-core`（零 React：文档会话/命令栈适配/xui:sid round-trip/classifyNode/inspector schema 生成器）与 `page-designer-renderers`（React：palette/canvas 覆盖层/inspector 面板/导入导出 UI）两包，接 playground `page-designer` 入口（designer 分组），交付「布局容器 + 表单原子拖放 + propContracts inspector + JSON 导入导出 + undo/redo」五件套。QA.6 集成审计在本 plan 收口时触发。

## Current Baseline

- S1 架构已过独立 review gate（r1 fail 1M+3m → sourcePackage 兜底/import 清单/inspector 验收载体修齐 → delta pass 0B/0M）。
- 底座在库：editor-core 命令栈（前向/逆向对称、栈深 100、事务）、flux-core registry + `resolveRendererAuthoringContract`/`editableProps`（renderer-authoring-contract.ts:71）、flow-designer host-owned bridge 先例、flux-bundle 双工厂。
- `packages/page-designer-*` 不存在；playground 无入口。

## Goals

- `page-designer-core`：`DesignerSession`（组装：文档+registry+命令栈+bridge）、六命令 + 粒度表（insert/remove/move/replaceRegion/setProp/setPropRaw 等按 S1 §7.2）、`injectSessionIds`/`stripSessionIds`（xui:sid round-trip + INV-A~F）、`classifyNode`（rendererClass + sourcePackage 六域兜底）、`buildInspectorSchema`（propContracts→flux form schema，region/event 分流）。
- `page-designer-renderers`：palette（三条过滤规则）、canvas 覆盖层（Bridge + DropHint，真渲染由宿主 SchemaRenderer 承载）、inspector 面板（提交走命令）、JSON 源码视图（导入导出走 importDocument/exportDocument）。
- playground：`#/page-designer` 路由 + home 入口（designer 分组，L0 注册表）+ lazy import；自持 registry 实例。
- 测试：core 单测矩阵（round-trip INV + fuzz 固定种子、命令粒度、classifyNode 双路径、inspector editableProps 全覆盖断言）+ e2e（拖放插入→inspector 改属性→导出 round-trip）。

## Non-Goals

- S3 数据绑定/动作编排/表达式编辑器（预埋位不动）；S4 模板画廊与协作预留。
- 六域编辑器内嵌；OS 集成（OS clipboard 等）。
- 移动端设计器形态。

## Scope

### In Scope

新包两枚（package.json/tsconfig/注册链：根 tsconfig references、vite.workspace-alias、turbo）、playground 入口、e2e、quick-reference/flux-guide 登记、roadmap §13 L6 行回写。

### Out Of Scope

S3/S4；六域内部改动（flux-print-renderers 等仅被 import 禁令约束）。

## Failure Paths

| 编号                  | 触发                               | 行为                                                    | 可重试 | 用户可见 |
| --------------------- | ---------------------------------- | ------------------------------------------------------- | ------ | -------- |
| rt-unknown-type       | 导入含未注册 type 的文档           | importDocument 报错 + 结构树标记 invalid 节点（不移除） | 是     | 错误标注 |
| sid-collision         | 导入文档 sid 与现文档冲突          | 重新分配 sid（映射旧→新）                               | 是     | 无感     |
| inspector-no-contract | 选中节点 renderer 无 propContracts | inspector 显示空态（仅整体替换/删除）                   | —      | 空面板   |
| drop-invalid-target   | 拖放到不可容纳的容器               | DropHint 拒绝态，落点无效                               | 是     | 拒绝高亮 |

## Test Strategy

档位：**必须自动化**（core 纯函数矩阵 + fuzz 固定种子先红后绿；inspector editableProps 全覆盖断言为 QA.6 载体；e2e 走 playground 入口）。

## Execution Plan

### Phase 1 - page-designer-core（纯逻辑包）

Status: completed
Targets: `packages/page-designer-core/`（新包全链）+ focused 矩阵

- Item Types: `Fix`、`Proof`
- [x] 包骨架（package.json/tsconfig/根 references/vite alias）+ `DesignerSession` 组装 + 命令六件 + 粒度表（S1 §7.2 契约）
- [x] xui:sid `injectSessionIds`/`stripSessionIds` + INV-A~F 断言 + 固定种子变异 fuzz 矩阵
- [x] `classifyNode`（rendererClass + sourcePackage 兜底）+ `buildInspectorSchema`（editorType/shape 双层映射 + region/event 分流）
- [x] focused 单测全绿（含 inspector editableProps 全覆盖断言——QA.6 载体）

Exit Criteria:

- [x] core 零 React 依赖（import 扫描过）；focused 矩阵全绿

### Phase 2 - page-designer-renderers + playground 入口

Status: done（2026-09-26；e2e 实跑绿，Bundle 增量计量留 Phase 3 收口复核）
Targets: `packages/page-designer-renderers/`（新包）+ `apps/playground` 入口链

- Item Types: `Fix`、`Proof`
- [x] palette/canvas 覆盖层（Bridge + DropHint）/inspector 面板/JSON 源码视图（按 S1 §5/§8/§9 契约）
- [x] playground `#/page-designer` 路由 + home 卡（designer 分组）+ 自持 registry + lazy import
- [x] focused 单测（组件级）+ e2e（插入→编辑属性→导出 round-trip 程序化断言）

执行注记（2026-09-26）：renderers 自持 registry 仅注册 basic/form/layout 三家族（MVP 白名单）；form 原子 definition 无 `defaultSchema`，palette 补设计器侧脚手架（resolvePaletteScaffold，白名单外/六域恒拒）。编辑装配 = beforeCompile 把 `xui:sid` 投影为编译副本 testid、桥同步 `data-psid` 锚点（working 文档零改动）；预览态剥 sid + 无插件 + `key={mode}` 重建装配（INV-E）。core 微修（载入单点 S1 §6）：`createPageDesignerSession` 初始文档注入 sid（不占 undo 步）。i18n `flux.pageDesigner.*` zh/en。

Exit Criteria:

- [x] e2e 五件套叙事绿（tests/e2e/page-designer-mvp.spec.ts 3/3：拖放→inspector→导出断言无 psid/xui:sid；undo/结构树；预览态锚点剥离）
- [x] playground 主 bundle 零增量（lazy chunk 已按 lazy import 隔离；构建产物计量留 Phase 3 收口复核）

### Phase 3 - 收口 + QA.6

Status: completed
Targets: 全仓 + QA.6 审计

- Item Types: `Proof`
- [x] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红（新增 import 边界扫描项随本 plan 落地——勘误：该项实际随 plan 525 Phase 3 落地，Rule 21 注记）；e2e 全量零新增红
- [x] 登记：quick-reference/flux-guide 入口节 + roadmap §13 L6 行回写 + dev log
- [x] QA.6 集成审计（独立 fresh 子 agent：round-trip fuzz 复核 + inspector 覆盖断言 + 边界双防线 + 与六域边界不越界）

Exit Criteria:

- [x] QA.6 pass；roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: 批次合并模式——两份独立 fresh 子 agent 审查覆盖 draft-review 职能（QA.6 集成审计 + 523 closure audit，均对实现后状态）
- Verdict: closure audit r1 `issues`（2M 簿记）→ 修齐 → QA.1-L6 出口 pass
- Rounds: 1
- Findings addressed: 见 Closure Audit Evidence（M1 QA.6 并行消解 / M2 roadmap 行落盘 / m1-m3 簿记）

## Closure Gates

- [x] Phase 1-3 Exit Criteria 全勾
- [x] S2 范围锁定守住（无 S3/S4 功能渗入；六域不透明叶子机制生效——QA.6 边界 0 越界实测）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（r1 `issues` 2M——QA.6 未执行/roadmap L6 行未回写；两并行工作完成即消解，2026-09-27）
- [x] `pnpm typecheck` / `build` / `lint` / `test` / `check` 全绿零新增红（Status Note：链 42×3 + 78/78 EXIT=0 含两新包；QA.1-L6 §6 独立复核）
- [x] `pnpm test:e2e`（零新增红口径：1617/43/2/3——路由覆盖新红已修绿，余 kanban-perf watch-only + flaky 隔离绿；QA.1-L6 §1.3 实跑复核）
- [x] QA.6 集成审计 pass（0B/0M/3m+2Obs，`QA.6-integration-audit.md`）

## Deferred But Adjudicated

### S3 数据与动作 / S4 模板画廊与协作预留

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: roadmap 分阶段设计；预埋三契约位已锁定（S1 §11.2）
- Successor Required: `yes`
- Successor Path: L6 S3/S4 plan（S2 落地后）

## Non-Blocking Follow-ups

- import 边界扫描 check 项（本 plan Phase 3 原声称随本 plan 落地，实际随 plan 525 Phase 3 落地——勘误注记，Rule 21）
- QA.6 Minor 尾项（计数口径勘误）随 plan 525 簿记批次消化；登记册 A-9/A-10 留痕

## Closure

Status Note: 三 Phase 全部落地：page-designer-core（零 React 六模块 + 108 用例 Branches 92.08%）+ page-designer-renderers（91 用例 91.4%）+ playground `#/page-designer` 入口与登记面。全量验证：链 42×3 + 78/78 EXIT=0（含两新包）、check 零新增红、e2e 1617/43/2/3（路由覆盖新红已修绿）。QA.6 pass。S3/S4 → successor plan 524+。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh 子 agent ×2（general-purpose，2026-09-27：QA.6 集成审计 + 523 closure audit 并行）
- Evidence: QA.6 verdict **pass**（0B/0M/3m+2Obs——fuzz 45/45、inspector 覆盖断言 3/3、边界 0 越界、双包覆盖率达标；报告 `QA.6-integration-audit.md`）；closure audit r1 `issues`（2M = QA.6 未执行〔本次并行消解〕+ roadmap L6 行未回写〔本次落盘消解〕；m1/m2/m3 簿记随收口消化并登记 QA.7）

Follow-up:

- QA.6 Minor（roadmap 行回写时序/import 边界扫描 check 项/计数口径）随 523 收口批次消化并登记 QA.7
- no remaining plan-owned work（S3/S4 归 successor 524+）
