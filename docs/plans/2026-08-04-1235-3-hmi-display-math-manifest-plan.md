# 3 Display/Interaction Math And Manifest Gate — `flux-renderers-industrial`

> Plan Status: active
> Last Reviewed: 2026-08-04
> Source: `docs/audits/2026-08-03-1506-multi-audit-industrial-hmi.md` (P1-1, P1-6, P1-7, P1-9)
> Related: `docs/components/roadmap-industrial-hmi.md`; `docs/plans/2026-08-04-1235-1-hmi-diff-path-convergence-plan.md`; `docs/plans/2026-08-04-1235-2-hmi-lifecycle-wiring-plan.md`

## Purpose

收口 `flux-renderers-industrial` 三个真实浏览器内显示/交互数学缺陷 + 一个硬门：`check:workspace-manifest-deps` 硬门失败（P1-1）、初始视口 fill/center 中心化公式错误（P1-6）、InteractionOverlay 在 sky 层用世界坐标渲染导致平移/缩放后错位（P1-7）、程序化 zoom 锚点传内容坐标导致 pan+zoom 后场景跳位（P1-9，且被 mock 掩蔽）。P1-9 是本包"单测全绿但真实浏览器不可用"的典型代表，需同时修 mock 建模。

## Current Baseline

- 机械门失败：`check:workspace-manifest-deps` FAIL——`renderer-test-support.tsx:14-15` 引 `@nop-chaos/flux-formula`/`@nop-chaos/flux-runtime`、`scada-points-bridge.test.tsx:5` 引 `@nop-chaos/flux-formula`，均未在 `package.json` devDependencies 声明（P1-1，live 复现）。
- 视口公式错误：`use-scada-config-sync.ts:53-54,62-63` `applyInitialViewport` fill/center 分支实现为 `x: size.width/2 - (bounds.x + bounds.width/2)*scale`（即 `sw/2 - cx·s`）；引擎约定 `screen = (world - vx)·s`（viewport.ts:36-48），居中要求 `vx = cx - sw/(2s)`——两式仅当 `cx = sw/(2s)` 时重合。live 生命周期测试（scada-canvas-lifecycle.test.tsx:220-253）用 `validConfig()`（bounds {x:10,y:20,w:290,h:50}，cx=155，fill scale=12）远非巧合点，掩蔽来自弱断言（`expect(viewport.x).not.toBe(0)` 一类），而非公式巧合（P1-6，数学可验证）。
- Overlay 错位：`interaction-overlay.ts:86-88` 把覆盖物 Group 挂 `app.sky`（恒等变换层），`highlight` 直接用图元世界坐标画 rect（`:104-112`）；viewport 变换只作用于 `tree`（leafer-ui@2.2.9 `zoomLayer` 属 tree 链）——pan/zoom 后树内图元按 `(world - vx)·s` 移动，sky 覆盖物原地不动（P1-7，live 确认）。
- zoom 锚点空间错：`scada-engine.ts:340-355` `applyViewportState` 用 `viewportToWorld(cur, {x:0,y:0})`（内容坐标）作 `scaleOfWorld` 锚点，leafer 期望外层（screen）空间点；`_zoomLayer` 恒等于 tree，`scaleOfWorld` 固定传入点于 screen 空间 → 任何带平移的缩放变化使内容漂移 `(vx·(1-k), vy·(1-k))`；同一 bug 类也出现在 `handlePluginZoom` 兜底（`scada-engine.ts:417-418`，同样传内容坐标锚点）；`leafer-ui-mock.ts:189-194` 的 `MockZoomLayer.scaleOfWorld` 只乘 scaleX/scaleY 不更新 x/y → 462 单测不可见（P1-9，bundle 逐行核对）。
- 既有修复未回退：gate-3 M-1/M-2/M-3（event.x/y、IPickResult 解包、-(Δx)·scale）与 gate-4 m-A/m-B/m-C 均保持。
- 机械门：typecheck/lint/build/test PASS（462/462）；`check:performance-suspects` 2 处 JSON.stringify 冷路径不报告。

## Goals

- `check:workspace-manifest-deps` 对 `flux-renderers-industrial` 通过（3 个未声明 workspace 导入补齐到 devDependencies）。
- `viewport.fit:'fill'` 与 `viewport.center` 初始取景公式正确（`vx = cx - sw/(2s)` 语义；fill 分支保留 max-scale 语义，不降级为 contain），普通几何（非巧合几何）也居中。
- InteractionOverlay 覆盖物与树内图元同变换面：pan/zoom 后 hover/press/selected 高亮仍与图元对齐（screen 坐标绘制，宽度/高度随 scale，stroke 保持屏幕像素）。
- 程序化 `zoomAt`/`fit`/`center`/`setViewport` 缩放变化后内容锚点不漂移（含 `handlePluginZoom` 兜底）；`leafer-ui-mock` 建模 `scaleOfWorld` 的 x/y 锚定副作用，矩阵级 e2e 断言可验证。

## Non-Goals

- 不处理 diff 路径收敛（plan `{1}`）与生命周期 wiring（plan `{2}`）。
- 不改 leafer 真实 API 语义（按 2.2.9 bundle 已核行为实现适配）。
- 不新增 schema 字段；`viewport` props 与 `config.viewport` 的优先级裁定归 plan `{2}` Phase 3。
- 不处理 perf/测试有效性 P2（pan-fps 恒真断言、scene-tree-only 断言通道等）→ backlog。

## Scope

### In Scope

- `packages/flux-renderers-industrial/package.json`（devDependencies 补齐）。
- `src/renderer/hooks/use-scada-config-sync.ts`（`applyInitialViewport` fill/center 公式）。
- `src/engine/interaction-overlay.ts` + `src/engine/scada-engine.ts`（覆盖物 screen 坐标绘制 + viewport 变更重定位；`applyViewportState` 与 `handlePluginZoom` 锚点空间修正）。
- `src/test-support/leafer-ui-mock.ts`（zoomLayer 锚定副作用建模）。
- 回归测试：非巧合几何视口断言、非恒等视口 overlay 断言、矩阵级 zoom 锚点 e2e 断言、manifest 门复跑。

### Out Of Scope

- `component:fit/center` 的 `not-visible` 失败路径（P2）→ backlog。
- 其余 P2（覆盖物 DOM slot、perf 断言通道等）→ backlog。

## Failure Paths

| 可测场景编号  | 触发                                                                 | 行为（含状态码/错误码）                                                                                         | 可重试 | 用户可见表现            |
| ------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------ | ----------------------- |
| manifest-gate | 任意 `pnpm check` 运行                                               | 包内 0 个 undeclared workspace import；gate PASS                                                                | 是     | CI 健康门不再因本包失败 |
| viewport-fill | `viewport.fit:'fill'` 非巧合几何                                     | 内容包围盒中心映射到视口中心（`vx = cx - sw/(2s)`；sw=800,s=1,cx=50 → x=-350）                                  | 是     | 首帧取景正确            |
| overlay-align | 平移/缩放后 hover 图元                                               | 覆盖物与图元外框对齐（screen 坐标）；宽/高随 scale；stroke 保持屏幕像素                                         | 是     | hover 高亮不飘浮        |
| zoom-anchor   | pan 后程序化 zoomAt/fit/setViewport 缩放（含 handlePluginZoom 兜底） | 锚点世界点在其 screen 位置保持固定（zoomAt 语义：锚点处世界点对应 screen 坐标不变），无 (vx(1-k), vy(1-k)) 漂移 | 是     | 缩放不跳位              |

## Test Strategy

本档选择：**必须自动化**（P1-9 是 mock↔真实漂移掩蔽的浏览器缺陷，修复必须带矩阵级可验证断言；P1-6 数学公式缺陷；P1-1 是仓库硬门）。Proof 项在 Fix 项之前（TDD 序）。

## Execution Plan

### Phase 1 - Manifest 门修复（P1-1）

Status: planned
Targets: `packages/flux-renderers-industrial/package.json`

- Item Types: `Fix | Proof`
- [ ] `Proof` — 复跑 `pnpm check:workspace-manifest-deps` 记录当前本包 3 条 undeclared 命中（基线失败态）。
- [ ] `Fix` — 在 devDependencies 补 `"@nop-chaos/flux-formula": "workspace:*"`、`"@nop-chaos/flux-runtime": "workspace:*"`（`renderer-test-support.tsx` 需要两者，`scada-points-bridge.test.tsx` 需要前者；`scada-canvas-smoke.test.tsx:3` 也消费 flux-formula，但因其位于 `src/` 根未被 gate 扫描到——补依赖后一并覆盖）。
- [ ] `Proof` — 重跑 `pnpm check:workspace-manifest-deps`：本包 0 undeclared（残留 5 条为 form/scheduling 既有问题，不属本包）。

Exit Criteria:

- [ ] `check:workspace-manifest-deps` 输出中本包 0 命中；`pnpm install --lockfile-only` 无冲突（或等价验证 lockfile 一致）。

### Phase 2 - 初始视口公式修正（P1-6）

Status: planned
Targets: `src/renderer/hooks/use-scada-config-sync.ts`, `src/renderer/scada-canvas-lifecycle.test.tsx`

- Item Types: `Fix | Proof`
- [ ] `Proof` — 先写失败用例（非巧合几何，如 bounds 中心 cx=155、fill scale=12、sw=800）：断言 fill 分支 `x = cx - sw/(2s)`（当前实现 `sw/2 - cx·s` 失败）；center 分支同样按 `vx = cx - sw/(2s)`（当前 scale 不变）断言；contain 分支行为不回退。
- [ ] `Fix` — `applyInitialViewport` fill 分支改为 `x: bounds.x + bounds.width/2 - size.width/(2*scale)`（`y` 同理：`bounds.y + bounds.height/2 - size.height/(2*scale)`）；center 分支同公式（与 `engine.center`（viewport.ts:70-78）语义一致，可委托 `engine.center(bounds)` 消除双实现漂移）。**注意**：不得用 `engine.fit(bounds, 0)` 替代 fill 分支——`fit` 是 min-scale（contain 语义，viewport.ts:60），fill 是 max-scale（use-scada-config-sync.ts:51），委托会改变填充语义。
- [ ] `Proof` — 既有生命周期视口测试不回退（`not.toBe(0)` 类弱断言升级为新公式精确断言）。

Exit Criteria:

- [ ] fill/center 新公式测试通过（非巧合几何精确断言）；contain 与既有用例不回退。

### Phase 3 - Overlay 变换面对齐（P1-7）

Status: planned
Targets: `src/engine/interaction-overlay.ts`, `src/engine/scada-engine.ts`, `src/engine/scada-engine.test.ts`, `src/renderer/scada-hover-overlay.test.tsx`, `tests/e2e/scada-*.spec.ts`

- Item Types: `Fix | Proof`
- [ ] `Proof` — 先写失败用例（非恒等视口，如 viewport {x:100,y:0,scale:2}）：断言覆盖物几何 = 图元 screen 坐标（`getViewportPoint` 手算：`(world - vx)·s`）；当前实现直接用 world 坐标失败。
- [ ] `Fix` — 覆盖物以 **screen 坐标**绘制（sky 层恒等变换下即屏幕像素）：`highlight` 中 x/y 经 `engine.getViewportPoint(worldPoint)`（scada-engine.ts:293 已存在）换算，width/height 乘当前 scale（`engine.getViewport().scale`），rotation 不变，**strokeWidth 保持 preset 屏幕像素、不除 scale**（screen 坐标绘制方案下除 scale 会产生 2/scale px 的几乎不可见描边）。
- [ ] `Fix` — pan/zoom 后活动覆盖物重定位：`interaction-overlay.ts` 提供 `refresh()`（按最新 viewport 重算全部活动覆盖物），在**两个** viewport 变更钩子都调用——`applyViewportState` 后（命令路径：zoomAt/fit/center/setViewport）与插件 zoom/move sync 路径（wheel/pinch 缩放与拖拽平移只走插件路径，漏接即 overlay-align 失败路径不闭合）。

Exit Criteria:

- [ ] 非恒等视口 overlay 对齐测试通过（精确 screen 坐标断言 + 刷新后重定位断言）；既有 identity-viewport 行为不回退。

### Phase 4 - zoomLayer 锚点空间修正 + mock 建模（P1-9）

Status: planned
Targets: `src/engine/scada-engine.ts`（`applyViewportState`/`handlePluginZoom`/`syncViewportFromZoomLayer`）、`src/test-support/leafer-ui-mock.ts`、`src/engine/scada-engine.test.ts`、`tests/e2e/scada-*.spec.ts`

- Item Types: `Fix | Proof`
- [ ] `Proof` — 先写失败用例（mock 更新后）：pan 后 zoomAt → 断言最终视口/矩阵 x,y 无漂移（旧 mock 下此断言不过——当前 mock 不建模 x/y 锚定副作用，先修 mock 再修引擎的 TDD 序中，本用例在新 mock + 旧引擎下失败）。
- [ ] `Fix` — `leafer-ui-mock.ts` `MockZoomLayer.scaleOfWorld` 补 x/y 锚定副作用（按真实 `zoomOfLocal` 语义：固定传入点于外层 screen 空间，scale 后按锚点反推 x/y），使 `syncViewportFromZoomLayer` 分支可被单测验证。
- [ ] `Fix` — `applyViewportState`：缩放锚点传 **screen 空间**点（如 `{x:0,y:0}`，由 leafer `toInnerPoint` 换算为正确内容点），或显式先 move 再 scale 的一致序列；`handlePluginZoom` 兜底（scada-engine.ts:417-418）同修正——两处共用同一 bug 类，不得只修一处。
- [ ] `Proof` — 单测：矩阵级断言（非恒等视口 + 程序化缩放后，锚点世界点对应 screen 坐标不变）；e2e 一条程序化矩阵级断言（经测试句柄读视口/矩阵，非场景树属性）。wheel/pinch 路径（viewport 插件传 screen 坐标）回归确认不受影响。

Exit Criteria:

- [ ] 矩阵级断言通过（mock 更新 + 引擎两处修正后），e2e 全绿；gate-3 既有 zoomLayer 相关测试不回退。
- [ ] 包内全量测试 `pnpm --filter @nop-chaos/flux-renderers-industrial test` 通过（Phase 1-4 focused 验证收口）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session 子 agent ×2（R1 `ses_034ebdeafffeW8KkaIYXenr1Jd`、R2 确认轮 `ses_034dccd4dffeoZsgan8AXiFg0m`）
- Verdict: `pass`（R2 确认轮；R1 `fail` 2 Major + 3 Minor，均已修正）
- Rounds: 2
- Findings addressed: R1-M1 Phase 2 具体公式错误（丢 cx 项；示例值应为 x=-350）+ engine.fit 委托会降级 fill→contain → 修正为 `x = bounds.x + bounds.width/2 - size.width/(2*scale)`，显式禁止 fit 委托、仅 center 委托合法；R1-M2 Phase 3 stroke 补偿与 screen 坐标绘制矛盾 → 统一为 screen 坐标绘制（宽/高乘 scale、stroke 保持屏幕像素不除 scale）+ `refresh()` 双钩子（applyViewportState 命令路径 + 插件 zoom/move sync 路径，Exit Criteria 同步）；R1-m1 baseline 生命周期测试几何表述修正（validConfig() bounds {x:10,y:20,w:290,h:50}，掩蔽来自弱断言非公式巧合）；R1-m2 handlePluginZoom（:417-418）同 bug 类并入 Phase 4 修复范围；R1-m3 Proof 前置（TDD 序）。R2 确认轮 4 Minor 全部采纳（engine.center 引用改 viewport.ts:70-78、zoom-anchor failure path 措辞、smoke test flux-formula 消费注记、refresh 双钩子落在 Exit Criteria）。

## Closure Gates

- [ ] 所有 in-scope confirmed live defects 已修复：P1-1（manifest 门）、P1-6（视口公式）、P1-7（overlay 变换面）、P1-9（zoom 锚点空间，含 handlePluginZoom 兜底）——按 Phase 1-4 行为语义在 live repo 验证
- [ ] `leafer-ui-mock` 与 leafer-ui@2.2.9 真实 `scaleOfWorld` 锚定语义一致（无 mock↔真实漂移回归，gate-3 教训）
- [ ] 4 组回归验证（manifest gate / 非巧合视口 / 非恒等视口 overlay / 矩阵级 zoom 锚点）全绿入库
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步：`design-renderer.md`/`design-engine.md` 若因实现修正产生契约文字变化已更新；否则 No owner-doc update required；`docs/logs/` 收口记录
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

- 无。本 Plan 内所有 P1 均为 in-scope `Fix` 项。

## Non-Blocking Follow-ups

- 关联 P2（`MockZoomLayer` 之外的 mock↔真实漂移候选面：Text 布局/Image 生命周期/Group 相对坐标、perf e2e 恒真断言等）→ roadmap-industrial-hmi.md `## Follow-up Backlog`。

## Closure

Status Note: 待执行。

Closure Audit Evidence:

- Auditor / Agent: （待独立子 agent 填写）
- Evidence: （待填）

Follow-up:

- 待关闭时填写；no remaining plan-owned work 或指向 `{1}`/`{2}` 的衔接。
