# M4 数据展示响应式（crud + chart；cards/list 延后）

> Plan Status: completed
> Mission: mobile
> Work Item: M4 数据展示响应式
> Last Reviewed: 2026-06-23
> Source: `docs/components/mobile-roadmap.md`（M4 工作项）、`docs/architecture/mobile-responsive-baseline.md`、M0.1 plan 的 `Deferred But Adjudicated`
> Related: `docs/plans/2026-06-23-0410-1-m3-container-and-layout-responsive-plan.md`（前置 N=1）、`docs/plans/2026-06-22-2057-1-m01-mobile-infrastructure-plan.md`

## Purpose

把 mobile-roadmap 的 **M4 数据展示响应式**中**可执行部分**收口到 `done`：

- **M4a crud**：小屏 toolbar 简化、查询区折叠、分页简化。
- **M4c chart**：小屏尺寸自适应、图例位置移动端适配。

**M4b cards/list 延后**——`cards`/`list` renderer 尚未落地（主 roadmap W1c/W2a `todo`，`flux-renderers-content` 包不存在），无可适配对象；同时收口 M0.1 plan 路由到 M4b 的「业务 renderer 批量 border→hairline 迁移」deferred 项（对象不存在，转 successor）。

本 plan 为 N=2，排在 N=1（M3）之后执行；M4 不依赖 M3，可独立收口。

## Current Baseline

> 截至 2026-06-23 的 live repo 核查结论：

- **crud**（`packages/flux-renderers-data/src/crud-renderer.tsx`）：
  - 已有 `responsive` 字段**透传给内嵌 table**（L337-338），但 **crud 自身无移动端行为**（无 `useIsMobile`）。
  - toolbar：`crud-renderer.tsx:261-265` 经 `normalizeToolbarBlocks` 聚合 headerBlocks/footerBlocks，并在 `paginationMode==='infinite'` 时过滤 `pagination`/`switch-per-page` block（`normalizeToolbarBlocks` 本身定义在 `crud-renderer-toolbar.tsx:13-41`，仅规范化 layout 数组并丢弃 `bulkActions`，不做聚合/infinite 过滤）；**无小屏 toolbar 简化**。
  - 查询区 `crud-query-region.tsx` 已有 `filterTogglable`/`defaultCollapsed`（E1d 落地，L43/70-86），**无小屏默认折叠**。
  - 分页有 `paginationMode`（含 `'infinite'`）、`use-infinite-scroll.ts`（E1d 落地）；**无小屏分页简化**（如隐藏 page-size 切换、简化页码）。
  - table 内嵌已由 M1b 提供「小屏 expand 卡片堆叠」（`responsive.mode:'expand'` + `nop-hairline`/`nop-safe-bottom`）。
- **chart**（`packages/flux-renderers-data/src/chart-renderer.tsx`）：
  - 宽度 `width: '100%'`、高度固定缺省 `400px`（L110/174）；用 recharts + `ChartContainer`（L408）。**无 `ResizeObserver`/容器宽度自适应逻辑、无小屏图例位置切换**。视觉配置（area/legend/stacked/grid/colors）已由 E3 chart plan 落地。
- **cards / list renderer**：**未落地**（主 roadmap W1c `list` / W2a `cards` 均 `todo`；`flux-renderers-content` 包不存在）。
- **路由到 M4b 的 deferred 项**：M0.1 plan L185-190「业务 renderer 批量 border→hairline 迁移归 M4b」——对象（list/cards/cell 分隔线）均不存在，无可迁移项，转 successor。
- **M4a crud 依赖**：M0（done）、改进 roadmap E1d（done）——**依赖已满足**。
- **M4c chart 依赖**：M0（done）——**依赖已满足**。
- baseline §3（触摸目标）、§4.3（CardStack）、§7（Tailwind 响应式类为主力）均为可用约定。

## Goals

- M4a crud 具备小屏响应式：toolbar 小屏简化（隐藏低频 block / 纵列堆叠）、查询区小屏默认折叠、分页小屏简化（隐藏 page-size 切换、简化页码），缺省回退无桌面回归。
- M4c chart 具备小屏自适应：高度/图例位置随视口调整，避免小屏挤压。
- `crud/design.md`、`chart/design.md` 各增「响应式行为」小节并引用 M0 baseline。
- M0.1 → M4b 的 hairline 迁移 deferred 项转 successor 并在源 plan 注记。

## Non-Goals

- **不新建 cards / list renderer**——属主 roadmap W1c/W2a；M4b 显式延后。
- **不重建 crud/chart 的桌面端契约**——仅在既有 schema 上增移动端分支，桌面行为不变。
- 不做 M3 容器/布局（归 N=1 plan）、不做 M5 移动端原生组件（已 done）。
- 不为 crud 引入新的数据请求短路径（请求下沉原则；复用 E1d 已落地的 data-source/infinite 机制）。

## Scope

### In Scope

- `crud-renderer-toolbar.tsx` / `crud-query-region.tsx` / `crud-renderer.tsx` 小屏 toolbar 简化 + 查询区默认折叠 + 分页简化（消费 `useIsMobile()`）。
- `chart-renderer.tsx` 小屏高度/图例位置自适应（ResizeObserver 或 Tailwind 响应式，视裁定）。
- `crud/design.md`、`chart/design.md` 响应式小节。
- playground 演示页（`apps/playground/src/pages/m4-data-display-demo.tsx`，路由 `/m4-data`）+ e2e。
- M0.1 hairline 迁移 deferred 转 successor 注记。

### Out Of Scope

- cards / list renderer 创建（W1c/W2a）。
- M4b cards/list 响应式（无对象）。
- table 响应式（M1b 已收口 expand 卡片堆叠）。
- 全局 `.is-mobile` 类切换、mobileUI 标志位（baseline §7 禁止）。

## Failure Paths

| 场景                        | 触发                    | 行为                                                | 可重试 | 用户可见表现                             |
| --------------------------- | ----------------------- | --------------------------------------------------- | ------ | ---------------------------------------- |
| chart ResizeObserver 不支持 | 浏览器无 ResizeObserver | 回退到固定高度缺省（400px），不抛错                 | 否     | 小屏图表高度不随视口收缩（降级，无报错） |
| crud toolbar 小屏           | 视口 < 768px            | 低频 block（page-size 切换）隐藏，主操作 + 分页保留 | 否     | toolbar 简化、纵列堆叠                   |
| chart 图例小屏              | 视口 < 768px 且图例项多 | 图例改底部横排/折叠，避免挤压绘图区                 | 否     | 图例不遮挡数据                           |

## Test Strategy

档位：**建议有测**

理由：数据展示响应式属一般功能改进。crud 的 mobile 分支（toolbar 简化/查询折叠/分页）与 chart 的尺寸/图例分支配 focused 单测（mock `useIsMobile`）；视口行为配 e2e（`setViewportSize`，程序化断言，不靠截图）。

## Execution Plan

### Phase 1 - M4a crud 小屏响应式

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`、`crud-renderer-toolbar.tsx`、`crud-query-region.tsx`、`crud-schema.ts`、`packages/flux-renderers-data/src/__tests__/`、`docs/components/crud/design.md`

- Item Types: `Fix | Decision | Proof`

- [x] **Decision**：toolbar 简化与分页简化边界裁定——小屏默认隐藏哪些 block（如 `switch-per-page`、`bulk-actions` 折叠进菜单），分页小屏是否保留页码 jumper。裁定写入 design.md，缺省（桌面）行为不变。
- [x] **Fix**：`crud-renderer-toolbar.tsx` 消费 `useIsMobile()`，小屏隐藏/折叠裁定 block，toolbar 容器小屏纵列堆叠。
- [x] **Fix**：`crud-query-region.tsx` 小屏默认折叠查询区（`defaultCollapsed` 在 mobile 强制 true，桌面维持 schema 配置）。
- [x] **Fix**：`crud-renderer.tsx` 分页小屏简化（page-size 切换隐藏、页码简化），复用既有 `paginationMode`/`headerBlocks` 过滤机制，不新增数据请求路径。
- [x] **Proof**：focused 单测覆盖 toolbar 简化分支、查询区小屏默认折叠、分页简化（`crud-responsive.test.tsx`，mock `useIsMobile`）。

Exit Criteria:

> Phase 完成后逐条勾选；只写本 Phase 真正交付的 repo-observable 结果 + 保证 Phase 2 可继续的局部检查。

- [x] crud 在小屏下 toolbar 简化、查询区默认折叠、分页简化；桌面无回归（`responsive` 透传 + table expand 卡片堆叠不受影响）。
- [x] `crud-responsive.test.tsx` 对三个分支均有断言并通过（局部 `pnpm --filter @nop-chaos/flux-renderers-data test`）。
- [x] `crud/design.md` 响应式小节已更新为最终设计状态。

### Phase 2 - M4c chart 小屏自适应 + 收口

Status: completed
Targets: `packages/flux-renderers-data/src/chart-renderer.tsx`、`packages/flux-renderers-data/src/__tests__/`、`docs/components/chart/design.md`、`apps/playground/src/pages/m4-data-display-demo.tsx`、`tests/e2e/m4-data.spec.ts`、M0.1 源 plan Deferred 段

- Item Types: `Fix | Decision | Proof | Follow-up`

- [x] **Decision**：chart 小屏自适应裁定——高度随视口（ResizeObserver 或容器查询，优先 Tailwind/容器宽度）；图例小屏改底部横排/折叠（复用 E3 已落地的 legend 配置）。不支持 ResizeObserver 时回退固定高度（见 Failure Paths）。
- [x] **Fix**：`chart-renderer.tsx` 实现小屏高度/图例位置自适应，缺省（桌面）行为不变。
- [x] **Proof**：focused 单测覆盖 chart 小屏高度/图例分支 + ResizeObserver 缺席回退（`chart-responsive.test.tsx`）。
- [x] **Fix**：playground 演示页 `m4-data-display-demo.tsx`（路由 `/m4-data`），含 crud 小屏简化 + chart 自适应双示例。
- [x] **Proof**：e2e `tests/e2e/m4-data.spec.ts` 用 `setViewportSize` 切移动视口，程序化断言 crud toolbar 简化 / 查询折叠 / chart 高度变化，不靠截图。
- [x] **Follow-up**：M0.1 plan「业务 renderer border→hairline 迁移归 M4b」deferred 段注记「cards/list 未落地，转主 roadmap W1c/W2a successor」。

Exit Criteria:

- [x] chart 在小屏下高度/图例位置自适应，桌面无回归；无 ResizeObserver 时回退固定高度无报错。
- [x] `/m4-data` 路由可访问，含 crud + chart 双示例。
- [x] `m4-data.spec.ts` 对 crud 小屏简化与 chart 自适应均有视口切换后的程序化断言。
- [x] M0.1 hairline 迁移 deferred 已注记 successor 路径。
- [x] `chart/design.md` 响应式小节已更新为最终设计状态。

## Draft Review Record

> 起草后、执行前的独立审查证据（详见 guide `Plan Review Rule`）。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立 fresh-session review subagent `ses_10f07afa9ffe5VEWAZp8w0PGjp`（round 1）→ `ses_10f02f797ffexkApM2wPF2wsOY`（round 2）
- Verdict: `pass-with-minors`（round 2，零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed:
  - R1 Major（Current Baseline crud toolbar 引用错配：把 `crud-renderer.tsx:261-265` 的 headerBlocks/footerBlocks 聚合 + infinite 过滤误归给 `crud-renderer-toolbar.tsx`，并误述 `normalizeToolbarBlocks` 做聚合/过滤）→ 已修：现正确归因——聚合 + infinite 过滤内联于 `crud-renderer.tsx:261-265`，`normalizeToolbarBlocks`（`crud-renderer-toolbar.tsx:13-41`）仅规范化 layout 数组并丢弃 `bulkActions`。R2 确认 resolved。
  - R1 Minor（deferred「list/cards 分隔线」缺 `cell`）→ 已修：Deferred heading/body 与 Current Baseline L31 统一为「list/cards/cell 分隔线」（cell renderer 亦未落地，successor 逻辑不变）。R2 确认一致。
  - 全部 baseline 引用经 live repo 核对为 TRUE（crud responsive 透传 + 无 mobile 行为、crud-query-region 无小屏折叠、chart 无 ResizeObserver/固定高度、cards/list + flux-renderers-content 缺失、M0.1 hairline→M4b 路由真实、E1d done / W1c/W2a todo / M-status 基线正确、M1b table expand 卡片已落地）。

## Closure Gates

> 关闭条件：本 section + 每个 Phase Exit Criteria 全 `[x]` 后才可标 `completed`。全量 `pnpm typecheck/build/lint/test` 归此处（guide Rule 18）。

- [x] M4a crud 小屏响应式（toolbar 简化/查询折叠/分页简化）已落地且无桌面回归。
- [x] M4c chart 小屏自适应（高度/图例）已落地且无桌面回归。
- [x] `crud/design.md`、`chart/design.md` 响应式小节已同步到 live baseline。
- [x] M0.1 hairline 迁移 deferred 已转 successor 并在源 plan 注记。
- [x] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift（M4b 延后有明确 successor，见下）。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### M4b cards/list 响应式

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `cards`/`list` renderer 尚未落地（主 roadmap W1c `list` / W2a `cards` 均 `todo`，`flux-renderers-content` 包不存在）。M4b「cards/list 小屏单列、触摸滚动」无对象可适配——cards/list 组件本身是 M4b 的外部前置，不是本 plan 结果面内的 defect。crud（M4a）与 chart（M4c）可独立收口。
- Successor Required: yes
- Successor Path: 主 roadmap W1c（list）/ W2a（cards）renderer 落地后，其响应式行为随对应 design.md 响应式小节或独立 follow-up 收口。

### 业务 renderer border→hairline 迁移（list/cards/cell 分隔线）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: M0.1 plan L185-190 路由到 M4b。对象（list/cards/cell 分隔线）均未落地，无可迁移项；迁移工作随 cards/list/cell 一同转 W1c/W2a successor。
- Successor Required: yes
- Successor Path: 主 roadmap W1c / W2a（同上）

## Non-Blocking Follow-ups

- crud 小屏「bulk actions 折叠进下拉菜单」的交互细节（仅当业务出现高频多选场景时细化）。
- chart 小屏 X 轴标签旋转/抽稀策略属增强，归后续评估。

## Closure

Status Note: M4a（crud）与 M4c（chart）两 Phase 已全部落地。M4a：`crud-renderer.tsx` 消费 `useIsMobile()` 经既有 headerBlocks 过滤机制隐藏 `switch-per-page`、`crud-renderer-toolbar.tsx` 小屏纵列堆叠、`crud-query-region.tsx` 小屏默认折叠；M4c：`chart-renderer.tsx` 用 `ResizeObserver` 测容器宽度，窄屏 height clamp 300 + 图例 `flex-wrap`，`ResizeObserver` 缺席回退固定高度（无报错）。两份 design.md 响应式小节已同步；playground `/m4-data` + e2e `m4-data.spec.ts`（移动/桌面双视口程序化断言）已交付；M0.1 hairline 迁移 deferred 已注记 W1c/W2a successor。全量 `pnpm typecheck/build/lint/test` 全绿（51/51 包）。附带根因修复：`packages/ui/src/hooks/use-mobile.ts` 改懒初始化（`React.useState<boolean>(readIsMobile)` 传函数引用避免每次 render 重算），消除消费者多余重渲染（桌面无 mobile 闪烁、移动端无首帧桌面假象）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session closure-audit subagent（2026-06-23；不复用执行 session 上下文）。逐 Phase 复核 live repo + 五点一致性 + deferred 诚实性，结论 `approved`。
- Evidence:
  - **Phase 1 (M4a crud) — live code 核对**：`packages/flux-renderers-data/src/crud-renderer.tsx:13,58` 导入并调用 `useIsMobile()`；`:269-283` `resolveToolbarBlocks` 在 `isMobile` 时过滤 `switch-per-page`（与既有 `infinite` 过滤叠加），`:421` 根 `data-responsive="narrow"`；`crud-renderer-toolbar.tsx:70,177-191` `CrudToolbarBlocks` 消费 `useIsMobile()` 切 `flex-col items-stretch` + `data-responsive`；`crud-query-region.tsx:14,44-47` 接收 `isMobile` 并强制 `mobileDefaultCollapsed`。无 hollow body、无吞异常、无未连线组件。
  - **Phase 2 (M4c chart) — live code 核对**：`packages/flux-renderers-data/src/chart-renderer.tsx:99-118` `ResizeObserver` effect（`typeof ResizeObserver === 'undefined'` 早返回 = 回退路径）；`:195-200` `MOBILE_BREAKPOINT=768`/`MOBILE_HEIGHT_CEILING=300` + `Math.min(height, 300)`；`:206` `legendClassName = isNarrow ? 'flex-wrap gap-x-3 gap-y-1'`；`:392-393` `data-responsive`/`data-responsive-supported` marker。`containerWidth → isNarrow → effectiveHeight + legendClassName + marker` 全链路 wired。
  - **Focused proof 实跑**：`pnpm --filter @nop-chaos/flux-renderers-data test -- --run crud-responsive chart-responsive` → 54 文件 / 482 用例全绿（含 `crud-responsive.test.tsx` 8 case 覆盖 toolbar 简化/查询折叠/infinite 回归三分支；`chart-responsive.test.tsx` 5 case 覆盖宽屏无回归/窄屏 clamp+flex-wrap/小 authored height 不放大/ResizeObserver 缺席回退/字符串 height 透传）。
  - **仓库级验证（本审计 session 复跑）**：`pnpm typecheck` 51/51、`pnpm lint` 27/27、`pnpm test` 51/51 全绿（turbo cache 一致）。`pnpm build` 经 typecheck task 链确认 green。
  - **Artifacts 存在性核对**：`apps/playground/src/pages/m4-data-display-demo.tsx`（含 crud+chart 双示例 + `m4-crud-root`/`m4-chart-root` testid）；`apps/playground/src/route-model.ts:514` + `App.tsx:31,175` 注册 `m4-data` 路由；`tests/e2e/m4-data.spec.ts` 双视口 `test.use({viewport})` + 程序化断言（无截图）；`docs/components/crud/design.md` §14、`docs/components/chart/design.md` §13 响应式小节齐备；`docs/plans/2026-06-22-2057-1-m01-mobile-infrastructure-plan.md:185-191` Deferred 段含 `Closure Note (2026-06-23)` 注记 successor；`docs/logs/2026/06-23.md` 含 M4 收口条目。
  - **Anti-hollow**：crud 三处 `useIsMobile()` 消费点与 chart ResizeObserver 链路均经单测验断言；无 `return null` 占位、无空函数体、无注册但不可达组件。
  - **Deferred 诚实性**：两项 deferred（M4b cards/list、border→hairline 迁移）均 `out-of-scope improvement` + 明确 successor（W1c/W2a），对象（cards/list/cell renderer）未落地属外部前置，非本 plan 结果面 defect。
  - **Five-point 一致性**：Plan Status `completed` ↔ 两 Phase `Status: completed` + 全 `[x]` ↔ Closure Gates 全 `[x]` ↔ Closure Evidence 真实 ↔ `docs/logs/2026/06-23.md` 收口记录——彼此一致。
  - **e2e 实跑 residual**：`pnpm test:e2e`（浏览器环境）未在本审计 session 实跑；Phase 2 Exit Criteria 要求的是「spec 含程序化断言」（已核对 live 文件成立），e2e CI 实跑属独立 CI 通道，不阻塞 closure。

Follow-up:

- M4b cards/list 响应式 + hairline 迁移归主 roadmap W1c/W2a successor（见 Deferred But Adjudicated）。
- e2e `m4-data.spec.ts` CI 实跑确认归独立 CI 通道（spec 已含程序化断言，本审计已核对）。
