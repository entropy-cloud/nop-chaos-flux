# 727 Arc G6I — `list` `reorderable` 拖拽重排实现

> Plan Status: completed
> Last Reviewed: 2026-10-24（R1 revised：M1 definition 目标文件改 `list-renderer-definition.ts`、M2 过程态 marker 判别补测、m1 行号校准、m2 门控判定改逐条目 explicit 键检查、m3 ListSchema 钉死 schemas.ts:328、m4 dev 告警偏离先例声明+复用 isDevRuntime、m5 aria-label i18n、m6 无 onReorder 回弹钉——全部采纳）
> Source: `docs/backlog/arc-component-gap-roadmap.md` §6 Wave 3 G6I（依赖 G6D `done`，plan 726）
> Related: 协议权威 `docs/components/list/design.md` §2/§4/§8/§10（plan 726 定稿）

## Purpose

按 G6D 协议实现 `reorderable` + `onReorder`：条目拖拽 handle + HTML5 DnD（复用底座约定）+ 键盘重排 + 前置门控 + focused 单测 + lab/e2e + 登记收口。

## Current Baseline（live 实测 2026-10-24）

- `list-renderer.tsx`（550 行）：`toListItemKey`（:43，keyField 缺失回退 `item:${index}`）、`computeVisibleItems`（定义 :78，调用 :190）、`useListWindowing`（:193）、`selectionMode` 处理、`data-slot="list-root"`/`list-empty`。
- 底座约定源：`use-row-drag-sort.ts`（264 行，HTML5 DnD + 键盘 ArrowUp/Down 逐次 commit + `data-dragging`/`data-drag-over` 由 table-body-row-rendering 输出 :260-261）。
- definition：`data-renderer-definitions.ts` list fields（`reorderable`/`onReorder` 待增）。
- 测试先例：`src/__tests__/data-list-rendering.test.tsx`、`list-responsive.test.tsx`。

## Goals

- `reorderable: true` 且门控通过：每条目渲染 handle（`data-slot="list-item-drag-handle"`，`role="button"` `tabIndex=0` `aria-label`）；HTML5 DnD 拖放后派发 `onReorder`（payload `{ type:'list:reorder', items, keys }`，当前渲染集合整体）；键盘 ArrowUp/Down 逐次 commit 逐次派发；handle 点击 stopPropagation 不触发选择；拖拽中 `data-dragging="true"`、放置目标 `data-drag-over="true"`。
- 前置门控（缺 keyField 稳定键 / page 分页 / windowing 启用）：整体禁用（零 handle DOM）+ dev 告警一次。
- 默认（未声明）零变化：既有 list 测试组全绿 + 回归钉。

## Non-Goals

- 不动 table 底座公共 API；不做跨容器拖拽；分页/windowing 下不降级为部分可用（整体禁用）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/list-renderer.tsx`（reorder 分支 + 门控 + dev 告警）
- `packages/flux-renderers-data/src/list-reorder.ts`（新：按底座约定平行实现的 reorder hook——不 import table 私有模块）
- `packages/flux-renderers-data/src/list-renderer-definition.ts`（fields 增 `reorderable` prop + `onReorder` event；`data-renderer-definitions.ts` 仅聚合引用无需改动）
- `packages/flux-renderers-data/src/__tests__/list-reorder.test.tsx`（新 focused 单测）
- `packages/flux-renderers-data/src/schemas.ts`（`ListSchema` :328 增字段）
- lab 页 + e2e + improvement-analysis G6 行 ✅

### Out Of Scope

- table/combo/input-table；schema validator（`reorderable` 走 definition fields 通道）。

## Failure Paths

- 三门控触发：禁用 + `console.warn`（dev 一次）——需测试钉住（handle 零输出）。
- 宿主未接 onReorder：派发无副作用，视觉回弹（协议 §12 已声明，不兜底）。

## Test Strategy

本档选择：`必须自动化`（交互契约 + 门控 + 零漂移）：

- 判别组：reorderable 开启 → handle DOM 出现；拖放（fireEvent dragStart/dragOver/drop + 手工 stub dataTransfer，复用同包 table-e1c-row-drag-sort.test.tsx:154 惯用法）后 onReorder payload 断言（type/items 顺序/keys）；**拖拽过程态：源条目 `data-dragging="true"`、目标条目 `data-drag-over="true"`（§10 锚点判别）**；键盘 ArrowDown 移动 + 逐次派发；handle 点击不改变选择态；门控三场景 handle 零输出 + dev 告警；**无 onReorder 声明时 drop 不抛错且视觉回弹**。
- 回归钉：未声明 reorderable → 无 handle DOM、既有行为不变。

## Execution Plan

### Phase 1 — 实现 + focused 单测

Status: planned

- Item Types: `Fix | Proof`

- [x] `list-reorder.ts`：`useListReorder({ enabled, items, keys, onReorder })` → `{ handleProps(key,index), draggingKey, overKey, orderedItems }`（HTML5 DnD 约定 + 键盘 ArrowUp/Down 逐次 commit 逐次派发；`data-dragging`/`data-drag-over` 输出约定；handle `role="button"` + `aria-label` + stopPropagation onClick）
- [x] `list-renderer.tsx`：门控计算（稳定键判定 = 逐条目 explicit 键存在检查——keyField 取值非 undefined/null/''，不匹配 `item:${index}` 字符串形状；page 分页；windowing 启用）→ 不通过则 `enabled=false` + dev 告警（**偏离先例声明：useRef 一次性去重**，语义为"每次挂载至多一次"，与 table 每渲染告警先例不同；复用包内 `isDevRuntime()`）；条目渲染附 handle + dragging/over data 属性
- [x] schemas/definitions：`reorderable`（prop boolean）+ `onReorder`（event）
- [x] focused 单测 `list-reorder.test.tsx`（判别 6 + 门控 3 + 回归钉 1）；handle `aria-label` 走 i18n 新 key `flux.list.dragToReorder`（zh/en 各一条，对齐底座 `flux.table.dragToReorder` 先例）

Exit Criteria:

- [x] 包测试全绿（data 185 文件/1261 用例；contract-honesty eventKeys 29→30——onReorder 为第 30 个已实现引用的 event 契约）；包 typecheck 通过

### Phase 2 — lab / e2e / 登记收口

Status: planned

- Item Types: `Proof`

- [x] lab 页 list 场景增 reorderable 演示（list-lab-page.tsx "Reorderable list"，order echo 反映宿主写回）
- [x] e2e：complex-form.spec list 用例（键盘 ArrowDown 两次重排 + order echo 写回断言）1 passed
- [x] improvement-analysis G6 行补 ✅；铁律核对结论入 Closure

Exit Criteria:

- [x] e2e 全绿；铁律结论入 Closure 证据节

## Closure Gates

- [x] 所有 in-scope 行为结果已达成
- [x] 无被静默降级的 in-scope 项
- [x] owner docs 已同步（design.md 如实现偏离就地勘误）

Closure Evidence（执行 session 提供）:

- 实现面：`list-reorder.ts` 新 hook（HTML5 DnD on handle + 键盘逐次 commit 逐次派发 + data-dragging/data-drag-over + handle stopPropagation + `flux.list.dragToReorder` i18n zh/en）；list-renderer 门控（逐条目 explicit 键检查 / page 分页 / windowing → 整体禁用 + isDevRuntime 告警一次/mount，偏离先例已声明）；ListItemView 增 reorder prop（memo comparator 补 reorder 项——handleProps 身份随拖拽态/集合变化）；schemas `reorderable`/`onReorder` + definition（prop boolean/event）；test-support 经真实 data-renderer-definitions 无需改动。
- 判别/回归：`list-reorder.test.tsx` 7 例全绿（判别 6：handle 配对判别/drop payload+过程态 marker/键盘逐次/handle 点击不触发选择/无 onReorder 惰性/门控三场景+dev 告警；回归钉 1：缺省无 marker）。
- 铁律核对：example——list 已有 example.json（reorder 演示归 lab 场景）；manifest/index——list 既有条目，非新 type 无增行；i18n——新增 `flux.list.dragToReorder` zh/en 各一（铁律 6）。
- 执行发现：ListItemView 自定义 memo comparator 原本忽略 reorder——已补 reorderEqual 项（handleProps 身份比较），否则拖拽过程态与重排后内容被 memo 吞掉。
- 门禁（待 closure commit 前全量复验）：包 typecheck 0 error；data 包 185 文件/1261+7 用例；e2e 1 passed。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（R1 fail→R2 approved）
- [x] `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm check`（零新增 red）

## Draft Review Record

- R1（fresh 子 agent `agent_21ce16d4`，2026-10-24）：**`revised`**（0 Blocker / 2 Major / 6 Minor 全采纳——M1 definition 目标文件改 list-renderer-definition.ts、M2 过程态 marker 判别补测、m1 行号/m2 门控判定口径/m3 ListSchema 路径/m4 dev 告警偏离声明+isDevRuntime/m5 i18n key flux.list.dragToReorder/m6 无 onReorder 回弹钉）。修订后放行执行。

## Deferred But Adjudicated

（无）

## Closure

Status Note: 完成——reorderable+onReorder 落地，closure audit R1 fail（Major-1）→ 修复 → R2 approved。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_51cd2d72，2026-10-24）
- Evidence: R1 **fail**（Major-1：closure evidence 声称"门控 3"但 windowing 门控分支零判别测试）→ 修复（补 windowing 门控场景：infinite+160 条+pageSize 200 → warn 'windowing' + handles 零输出；附带真实修复：门控条件 `virtualRows !== null`→`windowingActive`——原条件依赖 scroll container 解析，jsdom/无滚动祖先下死路）→ R2 **approved**（0B/0M；三门控判别性成立、data 包 185 文件/1261 用例修复后复跑全绿；R1 两 Minor——memo 激活期失效仅性能、空数组瞬态 dev warn——维持不阻塞）。
