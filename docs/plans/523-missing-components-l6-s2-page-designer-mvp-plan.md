# 523 Missing Components L6 S2 — 标准页面设计器 MVP（page-designer-core + renderers + playground 入口）

> Plan Status: draft
> Last Reviewed: 2026-09-26
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

Status: planned
Targets: `packages/page-designer-core/`（新包全链）+ focused 矩阵

- Item Types: `Fix`、`Proof`
- [ ] 包骨架（package.json/tsconfig/根 references/vite alias）+ `DesignerSession` 组装 + 命令六件 + 粒度表（S1 §7.2 契约）
- [ ] xui:sid `injectSessionIds`/`stripSessionIds` + INV-A~F 断言 + 固定种子变异 fuzz 矩阵
- [ ] `classifyNode`（rendererClass + sourcePackage 兜底）+ `buildInspectorSchema`（editorType/shape 双层映射 + region/event 分流）
- [ ] focused 单测全绿（含 inspector editableProps 全覆盖断言——QA.6 载体）

Exit Criteria:

- [ ] core 零 React 依赖（import 扫描过）；focused 矩阵全绿

### Phase 2 - page-designer-renderers + playground 入口

Status: planned
Targets: `packages/page-designer-renderers/`（新包）+ `apps/playground` 入口链

- Item Types: `Fix`、`Proof`
- [ ] palette/canvas 覆盖层（Bridge + DropHint）/inspector 面板/JSON 源码视图（按 S1 §5/§8/§9 契约）
- [ ] playground `#/page-designer` 路由 + home 卡（designer 分组）+ 自持 registry + lazy import
- [ ] focused 单测（组件级）+ e2e（插入→编辑属性→导出 round-trip 程序化断言）

Exit Criteria:

- [ ] e2e 五件套叙事绿；playground 主 bundle 零增量（lazy chunk）

### Phase 3 - 收口 + QA.6

Status: planned
Targets: 全仓 + QA.6 审计

- Item Types: `Proof`
- [ ] `pnpm typecheck` / `build` / `lint` / `test` 全绿；`pnpm check` 零新增红（新增 import 边界扫描项随本 plan 落地）；e2e 全量零新增红
- [ ] 登记：quick-reference/flux-guide 入口节 + roadmap §13 L6 行回写 + dev log
- [ ] QA.6 集成审计（独立 fresh 子 agent：round-trip fuzz 复核 + inspector 覆盖断言 + 边界双防线 + 与六域边界不越界）

Exit Criteria:

- [ ] QA.6 pass；roadmap/dev log 落盘

## Draft Review Record

- Reviewer / Agent: <<待填>>
- Verdict: <<待填>>
- Rounds: <<待填>>
- Findings addressed: <<待填>>

## Closure Gates

- [ ] Phase 1-3 Exit Criteria 全勾
- [ ] S2 范围锁定守住（无 S3/S4 功能渗入；六域不透明叶子机制生效）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck` / `build` / `lint` / `test` / `check` 全绿零新增红
- [ ] `pnpm test:e2e`（零新增红口径）
- [ ] QA.6 集成审计 pass

## Deferred But Adjudicated

### S3 数据与动作 / S4 模板画廊与协作预留

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: roadmap 分阶段设计；预埋三契约位已锁定（S1 §11.2）
- Successor Required: `yes`
- Successor Path: L6 S3/S4 plan（S2 落地后）

## Non-Blocking Follow-ups

- （收口时填写，或明确写无）

## Closure

Status Note: <<收口时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<待填>>
- Evidence: <<待填>>

Follow-up:

- <<收口时填写，或明确写 no remaining plan-owned work>>
