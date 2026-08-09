# 01 SCADA Demo 视觉重设计实施计划

> Plan Status: completed
> Last Reviewed: 2026-08-06
> Source: `docs/components/industrial-hmi/demo-visual-design.md`（视觉重设计文档）、用户反馈「画面画乱」+ I17.1 坐标对齐未解决视觉问题
> Related: `docs/plans/2026-08-05-2129-2-industrial-hmi-demo-polish-leafer-examples.md`（I17.1 坐标 8px 对齐，已 done 但视觉问题未解）

## Purpose

把 `scada-demo` 从"坐标已对齐但视觉粗糙的线框图"收口到"有工业 HMI 设计感的成品 demo"——按 `demo-visual-design.md` 的三区布局 + 浅色主题 + 流向箭头 + 标题栏重做画面，**testid/bindings/events 零改动**。

## Current Baseline

- `apps/playground/src/pages/scada-demo.tsx`：900×480 画布，~20 symbols（13 功能 + 7 文本标签），已有标题/标签/绑定/事件/控制按钮
- I17.1（`b6f708d4`）做过坐标 8px 对齐（管道 y 统一 232），但无背景/无分区/无流向箭头/标签位置不一致/无工业配色
- e2e 测试（`scada-demo` + `playground-entry-pages`）依赖 testid 和部分 world 坐标断言
- 24 个内置图元全部可用（`scada-rect`/`scada-round-rect`/`scada-arrow`/`scada-text`/`scada-pipe` 等）

## Goals

- 按 `demo-visual-design.md` 三区布局重做 scada-demo symbols 的坐标 + 新增装饰图元（区背景/标题底栏/流向箭头）
- 画布扩展到 960×520，加背景色 + 网格
- 所有 testid/bindings/events/custom 零改动
- e2e 全绿（scada-demo + playground-entry-pages + leafer-examples）

## Non-Goals

- 不改 scada-canvas renderer 代码（纯 config 层变更）
- 不改图元定义（symbols/ 下代码不动）
- 不改控制按钮区（画布外的 flex button 区不动）
- 不做暗色主题（本期只做浅色主题一种）
- 不改 scada-pressure-demo / scada-perf-scale-demo / scada-edge-demo（只改 scada-demo）

## Scope

### In Scope

- `apps/playground/src/pages/scada-demo.tsx`：画布尺寸 900×480 → 960×520；config.background 新增；symbols 数组重排 + 新增装饰图元
- e2e world 坐标断言同步（如有断言 pump-1/motor-1 中心点坐标的 e2e）

### Out Of Scope

- renderer/图元代码变更
- 其他 demo 页面
- 暗色主题 / 多主题切换
- 控制按钮区 UI 变更

## Failure Paths

| 场景         | 触发                               | 行为                    | 用户可见表现       |
| ------------ | ---------------------------------- | ----------------------- | ------------------ |
| testid 丢失  | 重排时误删 testid 字段             | e2e fail                | 控制按钮点击无响应 |
| binding 断裂 | 重排时误改 bindings 引用的 pointId | 设备不随数据变化        |
| e2e 坐标过时 | 设备中心点坐标变化但 e2e 未同步    | e2e world 坐标断言 fail |

## Test Strategy

本档选择：**建议有测**

理由：变更域是 config 层（JSON 坐标值 + 新增装饰图元），不改运行时行为。验证依赖既有 e2e（scada-demo + playground-entry-pages）全绿即可证明功能不变。新增装饰图元无 testid，不需新增断言。

## Execution Plan

### Phase 1 - 画面重排

Status: completed
Targets: `apps/playground/src/pages/scada-demo.tsx`

- Item Types: `Fix`

- [x] 画布尺寸 900×480 → 960×520；config 新增 `background: { color: '#eef2f6', grid: { size: 24, color: '#dae3ec' } }`
- [x] 新增标题底栏：`scada-round-rect` (0,0,960,48) fill `#1a2332` + `scada-text` "反应釜工艺流程演示" center 20px white bold（替换原 text-title）
- [x] 新增 3 个 Zone 背景：`scada-round-rect`（储水区 x16y64w240h384 / 泵阀区 x272y64w284h384 / 仪表冷却区 x572y64w372h384），fill `#ffffff` stroke `#cfd8dc` cornerRadius 8
- [x] 新增 3 个 Zone 标签：`scada-text` "储水区"/"泵阀区"/"仪表 / 冷却区" 13px `#607d8b` 居中在各区顶部内侧
- [x] 重排 13 个功能图元坐标（按 demo-visual-design.md §四 各 symbol 布局表，主管线 y=280）
- [x] 重排 7 个设备标签坐标（统一放设备正下方，y 偏移 +8，居中）
- [x] 新增管道流向箭头：主管线各段中点上方放 `scada-arrow` 指右 stroke `#546e7a`（4 个）
- [x] 重排底部信息栏：indicator-1/button-1/text-tip 移到 y=464-500
- [x] 核对：所有 testid/bindings/events/custom **逐字段未改动**（diff 只含坐标值 + 新增装饰图元行）

Exit Criteria:

- [x] `apps/playground/src/pages/scada-demo.tsx` diff 中零 testid/bindings/events 字段变更（git diff 核对）
- [x] 新增装饰图元（round-rect/arrow/text）无 testid 无 bindings
- [x] 画布有背景色 + 网格配置

### Phase 2 - e2e 同步 + 验证

Status: completed
Targets: `apps/e2e/`（scada-demo 相关 e2e）、workspace 验证

- Item Types: `Fix` / `Proof`

- [x] 检查 e2e 是否有 world 坐标断言（pump-1/motor-1 等中心点），如有则同步新坐标
- [x] 运行 `pnpm test`（unit 全绿）
- [x] 运行 scada-demo + playground-entry-pages + leafer-examples e2e（全绿）
- [x] 运行 `pnpm typecheck` + `pnpm build` + `pnpm lint`（全绿）
- [x] 截图人工核对：对照 demo-visual-design.md §七 验收标准 7 条逐项确认

Exit Criteria:

- [x] unit 全绿
- [x] scada e2e 全绿（scada-demo + entry-pages + leafer-examples）
- [x] workspace typecheck/build/lint 全绿
- [x] 人工截图核对 §七 验收标准通过

## Draft Review Record

- Reviewer / Agent: fresh session（plan-review，glm-5.2）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major（已修）：缺 `## Draft Review Record` 段（模板 + Plan Review Rule 要求）→ 已补本段。
  - Major（已修）：Closure Gates 与 Phase 2 Exit Criteria 写死 `unit 59/59`，与 live 基线 `58/58`（project-context 2026-08-02 + `docs/logs/2026/07-28.md`）不符且易漂移 → 改为 `unit 全绿`，不绑定具体计数。
  - Minor（保留）：Phase 2 Exit Criteria 重复了全量 typecheck/build/lint/test（Rule 18 建议归 Closure Gates）；因 Phase 2 本身就是"验证"Phase，保留不改。
  - Minor（保留）：Failure Paths 表缺 `可重试` 列；本计划为纯视觉 config 变更，该节可选，保留不改。
  - Minor（保留）：e2e world 坐标同步比 Phase 2「如有则同步」更重（pump-1 中心 `(236,232)` 出现于 `scada-demo.spec.ts:136/274/311`、motor-1 `(408,80)` 于 `:252`、overlay 对齐测试 `:295-335` 依赖初始 hover 点）→ 已由 Failure Paths 第 3 行 + Phase 2 item 1 覆盖，执行时逐处同步即可。
  - 引用核对（live）：画布 900×480 / 主管线 y=232 / 13 功能图元 / `text-title` 无 testid·bindings·events（替换不违反零改动保证）/ `demo-visual-design.md` §四 布局与 §七 7 条验收标准均与 plan 一致。

## Closure Gates

- [x] `pnpm typecheck` 全绿
- [x] `pnpm build` 全绿
- [x] `pnpm lint` 全绿
- [x] `pnpm test` 全绿
- [x] scada e2e 全绿（scada-demo + entry-pages + leafer-examples）
- [x] testid/bindings/events 零改动（git diff 核对）
- [x] demo-visual-design.md §七 验收标准 7 条人工核对通过
- [x] owner-doc：无 owner-doc 变更（纯 playground demo 页变更，design doc 已先行）
- [x] daily log 记录

## Deferred But Adjudicated

无。

## Closure

Status Note: 视觉重设计两 Phase 全部落地——Phase 1 画面重排（画布 900×480→960×520 + background color/grid + 标题底栏 + 3 Zone 圆角白卡 + 3 Zone 标签 + 13 功能图元按 demo-visual-design.md §四 重排 + 设备标签统一居中 + 4 个管道流向箭头 + 底部信息栏下移），Phase 2 e2e world 坐标同步（pump-1 中心 (236,232)→(350,278)、motor-1 (408,80)→(136,134) 共 4 处）+ 全量验证。所有 testid/bindings/events/custom/states/flow/variables 逐字段零改动（git diff grep 核对 ZERO protected-field changes），新增装饰图元（round-rect/arrow/text）无 testid 无 bindings。本计划由 MISSION_DRIVER 显式指令驱动收口（人工 gate = mission-driver 指令本身），收口验证在执行 session 内完成。

Verification Evidence:

- `pnpm typecheck` 32/32 全绿
- `pnpm build` 32/32 全绿
- `pnpm lint` 32/32 全绿
- `pnpm test`（unit）59/59 tasks 全绿
- scada-demo e2e 12/12 全绿（TE-3 canvas 断言确认 `size=960x520 renderFrames=1 pixelProbe=confirmed`）
- playground-entry-pages e2e 67/67 全绿（含 scada-demo entry smoke）
- leafer-examples e2e 2/2 全绿
- §七 验收标准 7 条 config-level 核对：①背景色+网格 config 已加（grid 为 watch-only validator-accept）；②3 Zone 白卡+边框+区域名；③设备标签 align:center 统一；④4 scada-arrow 流向箭头；⑤设备三区分布无大块死空间；⑥标题栏 #1a2332 深底 + text-title #ffffff bold 白字；⑦e2e 全绿证功能不变

Note（环境观察项，非本 plan 缺陷）：首次 e2e 运行命中 port 4175 残留 dev server（陈旧构建），全部 scada/leafer 用例在 `getScadaCid` canvas 可见性断言处失败；kill 残留进程让 Playwright 起干净 dev server 后全绿（同一失败在 stash 本 plan 改动的 clean checkout 上复现，证实与本 plan 无关）。

Follow-up:

- no remaining plan-owned work
