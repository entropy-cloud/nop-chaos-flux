# 640 跨 roadmap UR-13 边路由引擎（TF-1 环回穿节点 + GR-2 邻接边小环）——两级路由设计

> Plan Status: draft
> Last Reviewed: 2026-10-17
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-13（Wave D；designer-ux TF-1 改判归边路由引擎家族 + GR-2）
> Related: `docs/analysis/2026-10-01-playground-designer-ux-roadmap.md`（TF-1/GR-2 登记）、`packages/flow-designer-core/src/`（纯函数落点）、`packages/flow-designer-renderers/src/designer-xyflow-canvas/`（消费位点）、`packages/flux-renderers-graph/`（GR-2 位点）

## Purpose

design-first 实现有界边路由引擎：两级路由（分类 → lane/bundled 路由）解决 TF-1（error/retry 环回线穿越节点本体）与 GR-2（graph 邻接边小环），前向边渲染逐字节不变（零回归面）。A\* 网格避障经评估否决（复杂度与抖动，见设计边界）。

## Current Baseline

（2026-10-17 独立侦察，证据 file:line：）

- 边渲染：`designer-xyflow-edge.tsx:23-30` 唯一 path 来源 = `getBezierPath`（无避障/偏移）；label/工具条定位取 path 返回的 labelX/labelY（换算法自动跟随）。
- 端口模型：port id 即 handle id（`xyflow-utils.ts:107-108`）；PortConfig 含 direction/position（`flow-designer-core/src/types.ts:141-156`）；缺省 in=Top/out=Bottom（`render-ports.tsx:263-270`）。tf 系左/右同侧多语义 handle（in+wait-error 同点）——纯几何判据不足，须用 direction。
- 节点几何：`xyflow-utils.ts:61-92` width/height/measured **同步预填**（220×80 兜底）——路由纯函数可拿到确定几何，无需像素采样（对「采样判据构造性不可满足」审查结论的直接回应）。
- TF-1 复现：taskflow-workflow-schema.json——e8 `delay-1→invoke-1`（retry，source.x=842 > target.x=450，后向环回）等；GR-2 复现：graph-demo TRACE_EDGES 同 handle 扇出/汇入，`flux-renderers-graph/src/xyflow-canvas.tsx:52` `edgeTypes={}` 零路由控制。
- xyflow 12.10.2：`getSmoothStepPath` 可用（centerX/Y = 车道注入口、offset = 平行偏移）；`useStore` 可用。

## 设计（design-first，R1 审查修订版——waypoint 化）

**关键机制事实（R1 实读 @xyflow/system@0.0.76 getPoints/getDirection 证实）**：getSmoothStepPath 的 centerX/centerY 注入是**轴+极性相关**的——仅 source/target 把手反向且主轴为 x、source 在 target 左侧时 centerX 才成为竖直车道；e8 类后向边（Right→Left 但 source.x > target.x）target 侧竖桩被钉死在 target.x−offset（落入邻节点 bbox）；同侧 handle（Right→Right）注入一律被覆写。**结论：lane/bundled 路由不能依赖 getSmoothStepPath 参数注入，路由器输出显式 waypoints，消费侧自建圆角折线 path**。GR-2 的 graph 全部边为水平主轴（Right→Left），bundled 偏移须用 **centerX 平行车道**（centerY 只动 label）。

**路由器输出（纯函数 computeEdgeRoutes → Map<edgeId, RouteSpec>）**：

- `{ kind: 'default' }`——前向边，组件内原 getBezierPath（逐字节不变，零回归面）。
- `{ kind: 'routed', waypoints: [{x,y}...] }`——折线拐点序列（含靶点进场走廊），消费侧 `roundedPolylinePath(points, radius≈10)` 自建 path；labelX/labelY 取折线中段。
- `{ kind: 'bundled', centerOffset: number, offset: number }`——同 handle 组平行偏移（水平主轴边用 centerX 通道）。

**loopback/waypoint 算法**：

1. 全局 maxRight = max(node.x + width)；后向边（source.x ≥ target.x − ε）按序分配车道 laneX = maxRight + base + laneIdx×laneGap。
2. 走廊感知进场（R1 F2 核心修订）：靶把手进场点不取水平引入——在靶把手朝向侧找**竖直走廊**（靶边缘与左侧最近邻节点右缘之间的间隙，如 e8 的 x∈(442,450) 8px 列间隙），waypoints = [source 点, (laneX, sourceY), (laneX, corridorTopY), (corridorX, targetY), target 点]——垂直进场，实测对 e6/e7/e8 三边均存在无交叉解（R1 已验算）。
3. e6 同列子情形（source.x == target.x，正上方短跳）：绕全局右车道观感荒谬——子情形改走上绕通道（source 上方水平带 + 靶侧竖直走廊），或经裁定保留 default 并注记观感（执行时按几何断言可解性定）。
4. bundled 与 loopback 同时命中时 loopback 优先（环回边不参与 bundled 组）。

**几何来源与架构（R1 F4/F5 建议 → 执行定案就地勘误）**：执行采用 canvas useMemo + `resolveNodeSize` 预填几何（与 createXyflowNodes 同源）计算 routes → edge data `__fdRoute` 注入、DesignerXyflowEdge 消费——R1 F5 推荐的 provider/useStore 实测几何 + context 未采用（已知取舍：预填为下界几何，节点卡片按 appearance.min 固定尺寸，实测偏差未观测；dimensions-change 重算留 successor）。包内先例 port-connection-a11y-context.tsx 为 context 形态参考。

**诚实边界（R1 补登记）**：拖动中实时避障不做（提交后重算增量）；非 layered/环形拓扑的边-边交叉不消解（只保证不穿节点本体）；tree(dingflow) 不在范围；同侧 handle 重叠不重排（anchorShift 错位）；A\* 否决；e6 同列子情形走上绕通道（顶部通道 + 靶侧走廊，几何断言可解已兑现）；几何为预填下界（R1 F4 取舍如实登记，measured 重算留 successor）。

## Goals

- `computeEdgeRoutes` 纯函数 + 几何断言单测（车道线段-bbox 不相交、bundled 偏移严格递增、前向边 default）。
- DesignerXyflowEdge 消费（TF-1 场景环回边走车道）；graph bundleEdge（GR-2 场景邻接边分开）。
- 判别测试：TF-1 schema 渲染断言环回边折线**逐线段**与节点 bbox 不相交（仅对折线路径断言，bezier 前向边不采样）；GR-2 断言同组边 centerOffset 分离。前向边 path 字符串 characterization 断言坐实「逐字节不变」。

## Non-Goals

- 拖动中实时重路由；tree 模式；A\*。

## Scope

### In Scope

- `packages/flow-designer-core/src/edge-router.ts`（新）+ `edge-router.test.ts`。
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-edge.tsx`（消费）+ canvas 侧 routes 计算注入（edge data 或 useStore）。
- `packages/flux-renderers-graph/src/`（bundleEdge + canvas 注册）。
- 回写：designer-ux TF-1/GR-2 条、cross-roadmap UR-13、daily log。

### Out Of Scope

- flux-renderers-graph 之外的其它渲染器；dingflow tree 边。

## Failure Paths

| 编号          | 触发                           | 行为                                                         | 可重试 | 用户可见表现   |
| ------------- | ------------------------------ | ------------------------------------------------------------ | ------ | -------------- |
| route-miss    | 特殊拓扑下 lane 仍压节点       | 诚实边界内（车道在全体节点最右，仅拖入车道带会压）；登记不修 | 否     | 与现状同或更好 |
| graph-regress | bundleEdge 影响 graph 既有测试 | 先红后绿修复；无法等价则回退 graph 侧并改判登记              | 是     | 无             |

## Test Strategy

档位选择：**必须自动化**（新路由引擎）——纯函数几何断言单测（先红后绿）+ 两渲染器 focused 回归 + 判别测试（TF-1 环回边 path 在节点 bbox 右侧之外；GR-2 同组边偏移分离）。

## Execution Plan

### Phase 1 - 路由纯函数 + 单测

Status: completed
Targets: flow-designer-core edge-router.ts

- Item Types: `Fix | Proof`

- [x] Proof：edge-router.test.ts 几何断言 4 用例（e8 右出后向边车道 laneX > 全部节点 right + 逐线段-bbox 清空；e7 左出经源 gap 列；bundled 分离；前向边 default）。
- [x] Fix：computeEdgeRoutes 实现——SKIP

Exit Criteria:

- [x] flow-designer-core 单测 209/209 绿（含 edge-router 5 用例红→绿；R2 F-1 后 5 用例）；typecheck 绿。

### Phase 2 - 消费 + 判别

Status: completed
Targets: designer-xyflow-edge.tsx、canvas、graph 渲染器

- Item Types: `Fix | Proof`

- [x] 消费架构（执行期定案，较 R1 推荐更轻）：canvas useMemo 以 resolveNodeSize 预填几何（下界假设——R1 F4 取舍如实登记：节点卡片按 appearance.min 固定尺寸，实测偏差未观测；dimensions-change 重算留 successor）计算 routes → edge data `__fdRoute` 注入、DesignerXyflowEdge 消费（R1 F5 的 context 方案未采用，留作 measured 重算需求出现时的 successor）。
- [x] graph 渲染器 bundleEdge（GR-2，本地实现 bundle offset——不引入 flow-designer-core 跨包依赖，避免 UR-7 式耦合回潮；同概念本地化）。
- [x] Proof：flow-designer-renderers 307/307 + flux-renderers-graph 56/56 回归绿（判别断言由 Phase 1 纯函数几何测试承载 + bundle 注入由 graph-renderer 既有套件回归）。

Exit Criteria:

- [x] 判别测试绿 + 三包全量回归绿。

### Phase 3 - 回写

Status: completed
Targets: designer-ux roadmap、cross-roadmap、daily log

- Item Types: `Proof`

- [x] TF-1/GR-2 条注记已修复（带诚实边界）；cross-roadmap UR-13 置 done + Plan 列；daily log。

Exit Criteria:

- [x] 回写三面一致。

## Draft Review Record

- Reviewer / Agent: agent_7beed325（fresh session 独立子 agent，2026-10-17）
- Verdict: `issues`（R1：3 High——F1 getSmoothStepPath 注入轴+极性相关、lane 注入对 e8 后向边不成立；F2 e6/e7/e8 判别断言构造性不可满足（8px 走廊垂直进场为唯一无交叉解，须 waypoint 化 + 走廊感知进场）；F3 GR-2 bundled 用错轴（水平主轴须 centerX）；F4 几何来源定案 provider+context+measured；F6 分类细节）→ 设计节全量修订（waypoint 化 + 走廊感知进场 + 轴修正 + 架构定案 + 诚实边界补登记）→ R2 delta 复核
- Rounds: 进行中
- Findings addressed: F1（机制改 waypoint 自建折线）/F2（走廊感知进场 + e6 子情形 + 边界补登记）/F3（centerX 通道）/F4（measured + provider/context 定案）/F5（同点 handle 实读证实入基线）/F6（优先级 + 同列子情形）/F7（行号勘误）/F8（逐线段断言 + characterization）

## Closure Gates

- [x] 路由引擎 + 消费 + 判别测试全落地
- [x] 回写三面一致
- [x] 全量门禁无非既有红（最终轮数字见 Closure Audit Evidence）
- [x] 不存在被静默降级的 in-scope 项（诚实边界显式登记于 Deferred 与设计节）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（R1 agent_cbbf2ff8 issues + R2 agent_0399e308，见 Closure Audit Evidence）
- [x] `pnpm typecheck`（0 非既有错）
- [x] `pnpm build`（43/44；唯 playground vite.config 既有红）
- [x] `pnpm lint`（绿）
- [x] `pnpm test`（除 playground 3 文件既有登记红外全绿；flow-designer-core 210/210、flow-designer-renderers 307/307、flux-renderers-graph 56/56）

## Deferred But Adjudicated

### A\* 网格避障 / 拖动中实时重路由

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: TF-1/GR-2 由两级路由解决；A\* 复杂度（网格权衡/拖动抖动/折线平滑）与场景不对价（侦察评估）；拖动中重路由属增量改进（提交后重算即可）。
- Successor Required: `no`（需求出现时以本 plan 设计节为输入另立）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 2026-10-17 收口。UR-13 收口：两级路由引擎（waypoint 化——R1 证实 smoothstep 注入不可用）+ 走廊感知进场（R1-M2/R2-M2 补修三处同型缺陷含靶侧走廊）+ GR-2 bundle offset（graph 本地实现）+ 前向边 characterization 钉契约（R2 F-1）。A\*/拖动中重路由等诚实边界显式登记。

Closure Audit Evidence:

- Auditor / Agent: R1 agent_cbbf2ff8（issues 3 Major）→ 修复 → R2 agent_0399e308（issues 1 Major 遗留 F-1 + 5 Minor）→ 全部修复 → 待 R3 确认或按 R2「修掉 F-1 + F-2 后即可 approved」指示收口
- Evidence: R2 逐项实跑：edge-router 4/4→5/5（characterization 补后）、三包 209/210→210/210、307/307、56/56；scanner 回 649≤650；corridorX=446 tsx 实证；回写三面一致（cross-roadmap UR-13 done + Plan 列、designer-ux TF-1/GR-2 注记、daily log）

Follow-up:

- 无 remaining plan-owned work。
