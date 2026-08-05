# G1 graph 图查看器（只读交互式图 renderer + flux-renderers-graph 包骨架）

> Plan Status: completed
> Last Reviewed: 2026-08-05
> Source: `docs/components/roadmap.md` G1（`proposed`）；`docs/components/graph/design.md` + `example.json`（契约已立约，targetContract）；`docs/analysis/complex-controls/research-graph.md`（选型）
> Related: `docs/components/examples.manifest.json`（graph 条目 `targetContract`，closure 翻 `runtime`）；`docs/components/timeline/design.md`（同需求来源 ArbiterOS，独立 plan `2026-08-04-2030-2`）
> Mission: components
> Work Item: G1

## Purpose

把 roadmap G1（graph 图查看器）从"design.md 已立约（targetContract）、代码 0%"推进到"renderer 实现 + 新包 `@nop-chaos/flux-renderers-graph` bootstrap + 注册 + playground + e2e + 单测 + roadmap G1 标 done"。需求来源 ArbiterOS 治理界面的 Langfuse trace 图——Flux 当前组件库唯一无法组合覆盖的界面能力。

按 plan guide §22/§26 与 `package-splitting-strategy.md`：graph 引入 `@xyflow/react` + `dagre` 两个重型依赖，须独立新包隔离（不污染 `flux-renderers-data`），参照 `flow-designer-renderers` 独立包 + `flux-renderers-scheduling` 包级依赖隔离先例。bootstrap 与首波（且唯一）组件合并为一个 owner plan，避免出现只有骨架零组件的微小 plan。

## Current Baseline

> 截至 2026-08-04 的 live repo 核查结论（read-only）：

- **NEW 包不存在**：`packages/flux-renderers-graph/` 目录不存在；`vite.workspace-alias.ts` 无 `@nop-chaos/flux-renderers-graph` 别名；根 `tsconfig.json` project references（L12-20）无此包。
- **画布依赖已有仓库先例**：`packages/flow-designer-renderers/package.json:36` 已依赖 `@xyflow/react ^12.10.2`，画布适配层模式已验证（`packages/flow-designer-renderers/src/designer-xyflow-canvas/`、`canvas-adapters.md`、`canvas-bridge.tsx`）。graph 复用同版本，**不引入新版本/新画布引擎**，仅新增 `dagre`（轻量 ~50KB）。
- **新包 deps 形状模板**：参照 `flow-designer-renderers/package.json`——deps 含 `flux-core`/`flux-i18n`/`flux-react`/`@nop-chaos/ui`/`@xyflow/react`/`use-sync-external-store` + 新增 `dagre`；peerDeps `lucide-react`/`react`；scripts build/typecheck/test/lint 对齐。
- **契约已立约（两轮独立审查通过）**：`docs/components/graph/design.md`（13 节 + INV-1..5 审计 + Checklist A-G）齐备；schema（GraphNode/GraphEdge/GraphSchema）、字段分类、7 句柄 + 失败路径表、单选模型裁定、畸形数据硬契约、marker/data-slot 约定均已定义。`example.json` 字段经核验全部对应真实 Schema。
- **畸形数据先例**：`flux-renderers-data` chart 的 DD1（渲染永不抛错、畸形数据过滤）是 graph §6 硬契约的参照（边引用缺失节点 → 跳过 + dev 告警）。
- **retained 状态**：`docs/components/examples.manifest.json` graph 条目标 `targetContract`（design 立约，未实现）；`amis-baseline-matrix.md` 无 graph（AMIS 无等价物，属 Flux 原生新增）。
- **UI primitive**：`@nop-chaos/ui` 无专门 graph primitive——按 layout/data 包 marker 模式自建（design §10：根节点 `nop-graph`，内部 `data-slot="graph-*"`，语义色经 Tailwind token）。
- **renderer definition 模式**：参照 `flux-renderers-data`/`flux-renderers-scheduling` 的 `RendererDefinition`（type/displayName/category/sourcePackage/component/propContracts/fields region 声明）+ `registerXxxRenderers(registry)` 注册助手模式（从 `src/index.ts` 导出）。
- **前置依赖**：仅依赖 L0（已 done）。无表单/移动端依赖。

## Goals

- 首次落地 `@nop-chaos/flux-renderers-graph` 包骨架，满足 monorepo 集成约束（编译通过、alias 解析、root project ref、可被 playground import）。
- `graph` renderer 实现，严格遵循 `RendererComponentProps` 契约（读 `props.props`/`meta`/`regions`/`events`/`helpers`，renderer 零请求字段——nodes/edges 经 data-source/scope 注入）。
- 画布复用 `@xyflow/react` 12.10.2（只读：禁用节点拖拽/连接手柄/多选/框选），分层布局用 dagre（flow|hierarchy，LR|TB），本地纯函数。
- 单选模型 + 7 个 component 句柄（zoomIn/zoomOut/fitView/resetView/setLayout/focusNode/search）+ 完整失败路径契约。
- 畸形数据硬契约（边引用缺失节点跳过 + dev 告警；空数据 empty slot；渲染永不抛错）。
- `RendererDefinition` + `registerGraphRenderers` + `src/index.ts` 导出；playground 演示页 + e2e（程序化断言）+ focused 单测。
- `examples.manifest.json` graph `targetContract→runtime`；roadmap G1 `proposed→done`。

## Non-Goals

- 不实现编辑语义（节点拖拽/边重连/增删改/undo/redo）——归属 `flow-designer`（design §2 边界裁定，graph 只读）。
- 不实现 `edge` region 自定义边渲染（首版边仅 label + animated 样式）。
- 不实现力导向布局（`force`）/ 图分析算法（最短路径/社区检测）——P3 deferred / 不采纳（design §2）。
- 不内置远程布局服务 / 组件级 `api` / `initFetch`（请求下沉 data-source）。
- 不实现多选 / 框选（单选模型裁定，design §4.2/§8.1）。
- 不实现完整虚拟化（`onlyRenderVisibleElements` 元素级裁剪属计划实现，非完整虚拟化；>5k 节点虚拟化增强归后续）。
- 不实现播放引擎（属 timeline v2 范畴，独立 plan）。

## Scope

### In Scope

- `packages/flux-renderers-graph/` 包骨架（package.json/tsconfig.json/tsconfig.build.json/vitest.config.ts/src/index.ts/src/styles.css）。
- `vite.workspace-alias.ts` 增 `@nop-chaos/flux-renderers-graph` 与 `/styles.css` 两条别名（对齐 scheduling 包写法）；根 `tsconfig.json` project references 增本包。
- `graph` renderer 全链路：`schemas.ts`（GraphNode/GraphEdge/GraphSchema）、`graph-definitions.ts`（RendererDefinition + propContracts/fields）、`graph-renderer.tsx`（根组装）、`graph-layout.ts`（dagre 纯 helper）、`graph-search.ts`（子串匹配 + 循环索引纯 helper）、`graph-store.ts`（视口/布局/搜索/选中 local state）、`xyflow-canvas.tsx`（@xyflow/react 适配层，参照 designer-xyflow-canvas）、`graph-node.tsx`（node region 编译 + label 回退 + level 语义类）。
- 单选模型实现（禁用 React Flow 默认多选/框选/节点拖拽/连接手柄）。
- 7 句柄 + 失败路径（design §8.2）：未挂载 ref null、不可见视口、focusNode node-not-found 回退 fitView、setLayout 非法值忽略、search 空串清空/无匹配不高亮、search 句柄与 searchable:false 共存。
- 畸形数据硬契约（design §6）：边引用缺失节点跳过 + dev 告警；nodes 非空 edges 空→孤立节点；均空→empty slot。
- `registerGraphRenderers` + `src/index.ts` 导出；playground 演示页（flow/hierarchy 双布局 + 搜索 + 单选联动 + 畸形数据）+ e2e（程序化断言）+ focused 单测（layout/search 纯 helper + 畸形数据过滤 + 单选）。
- `examples.manifest.json` graph `targetContract→runtime`；roadmap G1 `proposed→done`。

### Out Of Scope

- 编辑语义 / flow-designer 能力。
- `edge` region / 力导向 / 图分析算法 / 远程布局。
- 多选 / 框选 / 完整虚拟化。
- 播放引擎（timeline v2 plan）。

## Failure Paths

| 场景                      | 触发                                 | 行为                                                      | 可重试 | 用户可见表现           |
| ------------------------- | ------------------------------------ | --------------------------------------------------------- | ------ | ---------------------- |
| graph-empty               | nodes 与 edges 均为空                | 渲染 empty slot（缺省 `t('flux.common.noData')`），不抛错 | 否     | 空态提示               |
| graph-edge-dangling       | 边引用不存在的节点                   | 跳过该边 + dev 模式告警，不抛错                           | 否     | 该边不渲染，其余正常   |
| graph-focusNode-not-found | `component:focusNode` nodeId 不存在  | 回退 fitView 全图，不抛异常                               | 否     | 视口自适应全图         |
| graph-setLayout-invalid   | `component:setLayout` 非法 layout 值 | 忽略并保持当前布局（schema 校验前置拦截）                 | 否     | 布局不变               |
| graph-search-no-match     | `component:search` keyword 无匹配    | 保持搜索激活态，无节点高亮                                | 否     | 无高亮，搜索框保持激活 |
| graph-handle-not-mounted  | 任一句柄在组件未挂载时调用           | ref 为 null，宿主须判空；句柄本身不抛错                   | 否     | 无副作用               |

## Test Strategy

档位选择：**建议有测**

理由：graph 是引入新依赖的展示+交互组件（非鉴权/对外 API）。dagre 布局投影、子串搜索 + 循环索引、畸形数据过滤、单选模型是回归风险点，配 focused 单测（纯 helper 不依赖 React，单测友好）；关键交互（搜索定位、单选联动、句柄 focusNode/setLayout、空态/畸形数据降级）配 e2e（程序化断言，非截图）。按 AGENTS.md 每个新组件必须有 playground 示例 + e2e。

## Execution Plan

### Phase 1 - flux-renderers-graph 包骨架

Status: completed
Targets: `packages/flux-renderers-graph/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts,src/index.ts,src/styles.css}`；`vite.workspace-alias.ts`；根 `tsconfig.json`

- Item Types: `Fix`

- [x] **Fix**：新建 `packages/flux-renderers-graph/`，以 `packages/flow-designer-renderers/package.json` 为形状模板：`package.json`（name `@nop-chaos/flux-renderers-graph`；deps 含 `flux-core`/`flux-i18n`/`flux-react`/`@nop-chaos/ui`/`@xyflow/react ^12.10.2`/`use-sync-external-store`/`dagre`；peerDeps `lucide-react`/`react`；scripts build/typecheck/test/lint 对齐）。
- [x] **Fix**：`tsconfig.json`（extends `../../tsconfig.base.json`，`noEmit:true`，include src + `../../types/**/*.d.ts`）+ `tsconfig.build.json`（对齐 data/scheduling 包 build 配置）+ `vitest.config.ts`（对齐 scheduling 包 `--passWithNoTests`）。
- [x] **Fix**：`src/index.ts`（导出空 `graphRendererDefinitions: RendererDefinition[]` + `registerGraphRenderers(registry)` 占位，对齐 `registerSchedulingRenderers` 模式）+ `src/styles.css`（空，预留 marker 样式）。
- [x] **Fix**：`vite.workspace-alias.ts` 增 `@nop-chaos/flux-renderers-graph` 与 `@nop-chaos/flux-renderers-graph/styles.css` 两条别名（对齐 scheduling 包 L97-101 写法）。
- [x] **Fix**：根 `tsconfig.json` project references 增 `{ "path": "./packages/flux-renderers-graph" }`（接在 scheduling 之后）。

Exit Criteria:

- [x] `pnpm install` 成功识别新 workspace 包（无依赖解析错误，dagre 装入）。
- [x] `pnpm --filter @nop-chaos/flux-renderers-graph typecheck` 通过（空骨架可编译）。
- [x] playground `import { registerGraphRenderers } from '@nop-chaos/flux-renderers-graph'` 别名可解析（局部验证）。

### Phase 2 - 数据层与画布桥接（Decision + Fix + Proof）

Status: completed
Targets: `packages/flux-renderers-graph/src/{schemas.ts,graph-layout.ts,graph-search.ts,graph-store.ts,xyflow-canvas.tsx}`

- Item Types: `Decision | Fix | Proof`

- [x] **Decision**：共享helper边界裁定——graph 的 layout/search 是否抽到 flux-core 共享层？裁定：**首版保持在 graph 包内**（仅 graph 一处消费；若未来 steps/timeline 复用图布局再提升）。画布桥接是否直接复用 flow-designer 的 `canvas-bridge.tsx`？裁定：**不直接复用**（flow-designer 桥接含编辑态连接，graph 只读须裁剪），参照其模式新写只读 `xyflow-canvas.tsx`。裁定写入 design §11 + log。
- [x] **Fix**：`schemas.ts`——GraphNode/GraphEdge/GraphSchema 类型（design §4.1/§4.2，含 label/levelMap/single-select 注释）。
- [x] **Fix**：`graph-layout.ts`——dagre 分层投影纯函数（nodes/edges + layout/orientation → 坐标）；flow 模式直通 xyflow 内置，hierarchy 用 dagre。
- [x] **Fix**：`graph-search.ts`——子串匹配 + 循环索引纯函数（keyword + nodes → 匹配列表 + 当前索引）。
- [x] **Fix**：`graph-store.ts`——包内 store（视口/布局模式/搜索词+索引/选中节点，Zustand vanilla，参照 flow-designer-core 拆分模式，INV-4 全 local）。
- [x] **Fix**：`xyflow-canvas.tsx`——@xyflow/react 只读适配层：禁用节点拖拽/连接手柄/多选/框选（`nodesDraggable:false`/`nodesConnectable:false`/`panOnDrag`/`selectionOnDrag:false`），受控 viewport。
- [x] **Proof**：focused 单测——graph-layout（hierarchy LR/TB 投影坐标正确、空数据不抛错）、graph-search（匹配/循环索引/无匹配）、畸形数据过滤（边引用缺失节点跳过、孤立节点、均空）。

Exit Criteria:

- [x] layout/search 纯 helper focused 单测通过（含畸形数据过滤分支）。
- [x] xyflow-canvas 只读配置正确（多选/框选/连接/拖拽均禁用）。

### Phase 3 - 渲染、交互与句柄（Fix + Proof）

Status: completed
Targets: `packages/flux-renderers-graph/src/{graph-definitions.ts,graph-renderer.tsx,graph-node.tsx}`

- Item Types: `Fix | Proof`

- [x] **Fix**：`graph-node.tsx`——node region 编译（`props.regions.node.render()`，绑定 node/nodeId/index）+ label 回退（region > labelField > id）+ level 语义类（levelMap → data-level）。
- [x] **Fix**：`graph-renderer.tsx`——根组装：读 nodes/edges/layout/orientation/levelMap/fitView/zoomable/pannable/selectable/searchable/showControls；调 layout 投影；接 xyflow-canvas；内置控制条（zoom±/fitView/layout 切换）+ 搜索框（searchable 时）；empty slot（均空）；marker `nop-graph` + data-slot/data-level/data-selected/data-matching/data-state。
- [x] **Fix**：单选模型——onSelectionChange/onNodeClick 承载单节点（取消选中均 null）；禁用 React Flow 默认多选。
- [x] **Fix**：7 句柄实现（zoomIn/zoomOut/fitView/resetView/setLayout/focusNode/search）+ 失败路径（design §8.2 全表：node-not-found 回退 fitView、setLayout 非法忽略、search 空串清空/无匹配、not-mounted ref null）。
- [x] **Fix**：`graph-definitions.ts`——RendererDefinition（type/displayName/category:`data`/sourcePackage/component）+ propContracts（nodes/edges/layout/orientation/label/labelField/typeField/levelField/levelMap/fitView/zoomable/pannable/selectable/searchable/showControls/minZoom/maxZoom）+ fields（node region/empty value-or-region）+ eventContracts（onNodeClick/onNodeDoubleClick/onSelectionChange）。
- [x] **Proof**：focused 单测——node region 编译 + label 回退、levelMap 映射、单选 payload（选中/取消选中均 null）、句柄失败路径（focusNode not-found 回退、setLayout 非法忽略、search 空串/无匹配）。

Exit Criteria:

- [x] graph renderer 落地，输出 marker，单选模型 + 7 句柄 + 失败路径 focused 单测通过。
- [x] 畸形数据（dangling edge/孤立节点/均空）渲染不抛错。

### Phase 4 - 注册 + playground + e2e + 状态同步（Proof + Fix）

Status: completed
Targets: `src/index.ts`（注册助手填充）；playground route-model + example；`tests/e2e/`；`examples.manifest.json`；`docs/components/roadmap.md`

- Item Types: `Proof | Fix`

- [x] **Fix**：`registerGraphRenderers(registry)` 填充 + `graphRendererDefinitions` 导出；playground 注册本包。
- [x] **Proof**：playground 演示页——flow/hierarchy 双布局 + 搜索 + 单选联动（onSelectionChange 落 scope 驱动分析面板）+ 畸形数据示例（dangling edge）。
- [x] **Proof**：e2e（程序化断言）——渲染节点数、搜索定位高亮、单选点击→payload、focusNode 句柄 not-found 回退 fitView、setLayout 切换、空态/畸形数据降级。
- [x] **Fix**：`examples.manifest.json` graph `targetContract→runtime`。
- [x] **Fix**：`docs/components/roadmap.md` G1 状态机流转——按 roadmap Phase Status 区规则分两步：本 plan 激活（draft review 通过）即代表 G1 提案确认，执行时先把 `proposed` 改 `planned`；`done` 标记必须等本 plan closure audit 通过后才可改（`planned→done`，不得提前）。同步 Phase Status 区 G1 行与 Component Coverage 表（移出 Proposed 区、登记 sourcePackage `@nop-chaos/flux-renderers-graph`）。

Exit Criteria:

- [x] playground 演示页可运行，e2e 程序化断言全绿。
- [x] manifest graph 标 `runtime`；roadmap G1 标 `planned`（`done` 在 closure audit 通过后由独立审计翻转）。

## Draft Review Record

> 起草后、执行前的独立审查证据。

- Reviewer / Agent: 2026-08-05 mission-driver plan review（fresh review session，通读全文 + live repo 核对）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major：Closure Gates 缺全量仓库验证四件套（`pnpm typecheck`/`build`/`lint`/`test`）与独立 closure-audit 勾选项——已补（guide Minimum Rule 18 + 模板）。
  - Major：roadmap G1 状态机流转违规（`proposed→done` 一步到位且置于 closure 前）——已改为两步：激活时 `proposed→planned`、closure audit 通过后 `planned→done`（roadmap.md Phase Status 区规则）。
  - Minor（遗留，不阻塞）：slice 级 `Status: pending` 与模板词表 `planned` 不一致（本批两 plan 共用，slice 状态仅人类阅读用）；无 `Deferred But Adjudicated`/`Non-Blocking Follow-ups` 章节（deferred 项已在 Non-Goals/Out Of Scope 中带理由裁定）。

## Closure Gates

> 关闭条件：本 section 及每个 Phase Exit Criteria 全部 `[x]` 后，经独立子 agent closure-audit，方可将 Plan Status 改 `completed`。

- [x] `flux-renderers-graph` 包骨架落地并集成 monorepo（alias/root ref/install/typecheck 通过）
- [x] graph renderer 落地：只读画布（禁用编辑/多选/框选）+ dagre 布局 + 单选模型 + 7 句柄 + 失败路径 + 畸形数据硬契约
- [x] 行为/契约结果已达成（focused 单测 + e2e 程序化断言全绿）
- [x] renderer 零请求字段（nodes/edges 经 data-source/scope），符合请求下沉约束
- [x] `examples.manifest.json` graph `targetContract→runtime`；roadmap G1 `planned→done`（closure audit 通过后才可改，不得提前）
- [x] design.md 实现状态同步（§3/§12 deferral 翻转、Checklist G 包结构勾选）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: G1 graph 图查看器完整落地（包骨架/数据层/画布桥接/渲染交互句柄/注册+playground+e2e+状态同步 4 个 Phase 全部完成），全量验证 `pnpm typecheck` 32/32、`pnpm build` 32/32、`pnpm lint` 32/32、`pnpm test` 59/59 task、e2e graph-demo 8/8、graph 包 42 条单测全绿；`examples.manifest.json` graph 已标 `runtime`；roadmap G1 `planned→done`（本 closure 通过后翻转）；design.md 实现状态同步（§3/§4.3/§11/§12/Checklist G）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（3 轮 fresh-session 审计链）
  - 首轮 `ses_0300735f6ffekxS3YUIyEUXBK9`：verdict `issues`——Major-1（悬垂边 dev 告警契约缺失：design §6/plan Failure Paths 承诺「跳过 + dev 告警」，renderer 未告警）+ Minor-2（design §10 `data-slot="graph-edge"` 未发布）+ Minor-3（e2e 未直接覆盖 searchable:false 句柄共存）。
  - 修复：`computeGraphLayout` 返回 `skippedEdges`，renderer 数据变化时 `console.warn` 一次（focused 单测断言）；design.md §10 边 marker 按首版范围裁掉；补 `searchable:false` + 句柄共存单测。
  - 复审 `ses_030029e93ffekTC9mjIpng7Bj0`：Major-1 修复验证通过；指出日志「searchable:false 由单测覆盖」声称不实（当时无该单测）。
  - 终审 `ses_02ff7df1effeXnWmcg46OSg7gf`：新增单测与日志修正均验证通过，verdict `approved`。
- Evidence: 全量验证输出见 `docs/logs/2026/08-05.md`；单测 42 条；e2e `tests/e2e/graph-demo.spec.ts` 8/8。

Follow-up:

- no remaining plan-owned work。deferred 项（edge region / 力导向 / 图分析算法 / 多选框选 / 完整虚拟化 / 播放引擎）均已在 Non-Goals / Out Of Scope 带理由裁定，非 in-scope defect。
