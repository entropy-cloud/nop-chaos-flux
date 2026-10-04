# 550 SCADA editor shell → WorkbenchShell（P2.2）

> Plan Status: completed
> Last Reviewed: 2026-10-04
> Source: `docs/backlog/editor-designer-standardization-roadmap.md` §6 P2.2；`docs/architecture/designer-workbench-shell.md`；`docs/architecture/editor-designer-standard.md` §2.2
> Related: plan 549（P2.1 shell 迁移先例与 M1 chrome 裁定）；P1.1（同包 flux-renderers-industrial，已收口串行）

## Purpose

把 `flux-renderers-industrial/src/editor/scada-editor-canvas.tsx` 的手拼 flex 骨架（toolbox 顶 / palette | canvas | inspector 三栏 / statusBar 底）收敛到 `WorkbenchShell` 槽位组合；leafer 画布保持 canvas 槽内容；`/editor` 子路径 bundle 隔离保持（WorkbenchShell 经既有 `@nop-chaos/flux-react` 依赖，无新 bundle 边）。

## Current Baseline

- 手拼骨架：`scada-editor-canvas.tsx:298-481` `div.nop-scada-editor-layout`（flex column）> toolbox 面板 + `div.nop-scada-editor-body`（palette | canvas div `.nop-scada-editor-layout-canvas`（containerRef + handlers + overlays）| inspector）+ statusBar 面板。
- 骨架 CSS：`editor/styles.css:108-141`（`.nop-scada-editor-layout` flex column / `.nop-scada-editor-body` flex row / `> .nop-scada-editor-toolbox`、`> .nop-scada-editor-status-bar` 直接子选择器）。
- 测试 pin 面：`.nop-scada-editor-layout-canvas`（canvas div 元素级，保持）、`.nop-scada-editor-status-bar` marker（元素级，保持）、`.nop-scada-editor-toolbox-status` CSS 规则存在性（styles.css 锁定测试）；`.nop-scada-editor-body` 无测试引用（仅组件+CSS）。
- WorkbenchShell 现有槽位：header/leftPanel/canvas/rightPanel/dialogs——**无底栏槽**；SCADA statusBar 是持久 chrome（非 transient dialog），映射 dialogs 槽属语义滥用。
- industrial 已依赖 `@nop-chaos/flux-react`（P1.1 后亦依赖 editor-core；bundle 隔离不变）。

## Goals

- `WorkbenchShell` 增加法可选 `footer?: ReactNode` 槽（渲染 `div[data-slot="workbench-footer"]` 为末行全宽 grid 行；不传不渲染——现有消费者零影响；向后兼容新增）。
- SCADA 编辑器迁移：root `div.nop-scada-editor-layout` 保留（testid/rootStyle）+ `WorkbenchShell density="flush"`：header 槽 = toolbox；leftPanel 槽 = palette（条件渲染保持）；canvas 槽 = canvas div（handlers/overlays 逐字节保持）；rightPanel 槽 = inspector；footer 槽 = statusBar。
- CSS 同步：删除两条直接子选择器规则（shell grid 接管尺寸）；`.nop-scada-editor-layout` 的 flex-column 声明移除（shell grid 接管）；其余规则（palette/inspector/toolbox/status/canvas containment）不动。
- 家族 marker 与元素级 class 全部保持（测试 pin 面零改动）；shell chrome（卡片/gap/行模型）按 P2.1 M1 同裁定接受为新视觉基线。
- owner doc 同步：`editor-designer-standard.md` §2.2 槽位清单补 footer；`designer-workbench-shell.md` Shared Baseline 补 footer 行 + SCADA family mapping 节。

## Non-Goals

- 不改 runtime/session/undo（P1.1 已收口）、palette/inspector/toolbox 面板内部实现、事件面。
- 不引入面板 collapsed rail/resize（家族 config 无此诉求）。
- 不改 `/editor` 子路径导出结构与 leafer 依赖隔离。

## Scope

### In Scope

- `packages/flux-react/src/workbench/workbench-shell.tsx`（footer 槽加法）+ workbench 测试。
- `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`、`editor/styles.css`（迁移）。
- `docs/architecture/editor-designer-standard.md`、`docs/architecture/designer-workbench-shell.md`。

### Out Of Scope

- runtime/session/undo、面板内部实现、事件面、`/editor` 导出结构、collapsed rail/resize。

## Failure Paths

| 触发                                         | 行为                                                                                          | 可重试 | 用户可见表现 |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ | ------------ |
| 面板/画布测试 pin 漂移                       | 既有测试红 → 修迁移而非改测试期望（元素级 marker 保持纪律）                                   | 是     | 无           |
| shell grid 下 canvas ResizeObserver 尺寸失真 | canvas div 保留 flex:1 min-w/h-0 + 外层 flex 包装（canvas 槽内），ResizeObserver 观察对象不变 | 是     | 无           |
| footer 槽未传                                | 不渲染（与 dialogs 同规则）                                                                   | —      | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（industrial editor 66 测试文件即行为不变证明；WorkbenchShell footer 槽加 flux-react 层测试；canvas 包装以 DOM 结构断言验证——jsdom 无布局，结构断言即 M1 验证手段）。

## Execution Plan

### Phase 1 - WorkbenchShell footer 槽（Proof + Fix，failing-first）

Status: completed
Targets: `packages/flux-react/src/workbench/workbench-shell.tsx`、workbench 测试

- Item Types: `Proof`、`Fix`

- [x] （Proof）失败用例：2 用例先红（footer DOM 序 + 不传不渲染）
- [x] （Fix）`WorkbenchShellProps` 增 `footer?: ReactNode`（body 后 dialogs 前；条件行模板落地）
- [x] flux-react workbench 测试绿（17/17 含 2 新用例）

Exit Criteria:

- [x] flux-react 测试全绿（新用例 + 既有零回归）；局部 typecheck 绿

### Phase 2 - SCADA 编辑器迁移（Fix）

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`、`editor/styles.css`

- Item Types: `Fix`

- [x] JSX 迁移（五槽位映射；handlers/overlays 逐字节保持；region override 表达式原样搬移）
- [x] **canvas 槽 flex 包装（M1 载重项）**：canvas 槽内容 = `<div className="flex h-full min-h-0 w-full">` 包裹原 canvas div（`.nop-scada-editor-layout-canvas` 的 flex:1 在 PANEL_CARD block 容器内需 flex 父级，否则 jsdom 无布局时绿但生产 canvas 塌缩为 0 尺寸）；ResizeObserver 观察对象（containerRef）不变
- [x] **隐藏槽位传 `undefined` 而非 `null`**（shell 门是 `!== undefined`，传 null 会渲染空卡片 + 三列 grid——loading/error 态持久可见变化）：showLayoutBody 为 false 时四个条件槽（header/leftPanel/rightPanel/footer）全部 undefined；canvas 槽恒渲染（承载 loading/error overlay）
- [x] 新增 DOM 结构断言（scada-editor-canvas-shell.test.tsx 2 用例：ready 态 canvas 卡片→flex 包装→canvas div 链 + 五槽 + statusBar marker；error 态四条件槽缺省——undefined-not-null 契约回归锁定）：`[data-slot="workbench-canvas"]` 与 `.nop-scada-editor-layout-canvas` 之间存在 flex 包装元素；loading/error 态无 `[data-slot="workbench-left-panel"]` 等空卡片
- [x] CSS 同步（删 flex-column 骨架声明、两条直接子规则、随之死亡的 .nop-scada-editor-body 全规则；canvas containment/面板内部样式不动）
- [x] industrial 全量测试绿（136 文件 1622/1622，含 2 新结构断言）

Exit Criteria:

- [x] `scada-editor-canvas.tsx` 无手拼 flex 骨架；元素级 marker 保持；canvas 槽 flex 包装存在（结构断言锁定）
- [x] industrial 全量测试零回归（1620 既有 + 2 新增）

### Phase 3 - owner doc + 全量验证（Follow-up + Proof）

Status: completed
Targets: `docs/architecture/editor-designer-standard.md`、`docs/architecture/designer-workbench-shell.md`

- Item Types: `Follow-up`、`Proof`

- [x] editor-designer-standard.md §2.2 槽位清单补 footer；designer-workbench-shell.md Shared Baseline 补 footer 行 + SCADA family mapping 节（五槽映射/undefined-not-null/region 优先级/marker 保持/chrome 基线）
- [ ] 全仓验证在 Closure Gates 执行

Exit Criteria:

- [x] owner doc 与 live 一致

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_eb3194bd-f84a-46a4-9f6b-894e0697f1eb）
- Verdict: pass（round 1 fail → 修订）
- Rounds: 2（round 2 为修订核对）
- Findings addressed: M1 canvas flex 包装升格为 Phase 2 载重项 + exit criterion + DOM 结构断言（jsdom 无布局的验证手段）；m1 隐藏槽位 undefined-not-null 契约显式化；m2 footer 条件行模板 + Proof 用例扩展；m3 补 Scope 节；m4 测试文件数 66 修正。

## Closure Gates

- [x] WorkbenchShell footer 槽落地（向后兼容）且 SCADA 五槽迁移完成
- [x] 行为不变：industrial 全量测试零回归（1622/1622）+ flux-react 零回归
- [x] `/editor` 子路径 bundle 隔离保持（WorkbenchShell 经既有 flux-react 依赖）
- [x] owner doc 三处同步（standard §2.2 / shell Shared Baseline / SCADA family mapping）
- [x] 必要 focused verification 已完成（flux-react 17/17 + industrial 1622/1622）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（78 tasks 全绿）
- [x] `pnpm check`（exit 0）
- [x] roadmap §6 P2.2 回写 `done`（closure audit 通过后）

## Deferred But Adjudicated

（无。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: WorkbenchShell footer 槽（向后兼容）+ SCADA 五槽迁移（canvas flex 包装 M1 载重项 + undefined-not-null 契约含回归测试）+ CSS 骨架收敛 + 三处 owner doc 同步全部落地；独立 closure audit 两轮 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_8cc50725-e8fb-498d-990e-5b461cde1eb6）
- Evidence: Round 1 VERDICT: issues（1 Major：plan 声称的 loading/error 断言不存在）→ 补 error 态测试（invalid config → 四条件槽 toBeNull + canvas 卡片在）+ 3 Minor 修正 → Round 2 VERDICT: approved——canvas div 145 行逐字节比对 HEAD、region override 原样搬移、undefined-not-null 契约测试语义核实（null 回归会被 toBeNull 捕获）、136 文件 1622/1622 独立复跑、footer 条件行模板零影响既有消费者、styles.css 删除枚举核对。

Follow-up:

- no remaining plan-owned work.
