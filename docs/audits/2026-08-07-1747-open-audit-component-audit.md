> Audit Status: planned（原 open，2026-08-07-1747 mission-driver 起草轮处理：12 条 P1 全部路由——gantt 22-13/1-7、kanban 1-4/1-5/1-11、calendar 1-8、barcode 1-6 入 `docs/plans/2026-08-07-1747-1-scheduling-p1-remediation.md`；form/data 1-1/1-2/1-3/1-12 入 `docs/plans/2026-08-07-1747-2-form-data-p1-remediation.md`；content/runtime 1-9/1-10 入 `docs/plans/2026-08-07-1747-3-content-runtime-p1-remediation.md`；20 条 P2 已移入 `docs/backlog/component-audit-roadmap.md` Follow-up Backlog「2026-08-07-1747 两轮审计 P2」节）
> Audit Type: open-ended
> Mission: component-audit

# 2026-08-07-1747 Open-Ended Adversarial Audit（component-audit）

## 0. 执行方式与去重

- **执行方法**: 按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行，4 个探索子 agent 分域扫描（form / data / scheduling+ai+content / runtime+compiler+action-core），主 agent 对全部 P1 候选与关键 P2 **逐条代码直读复核**（本批无未验证条目）。
- **去重基线**: 已读 `docs/audits/2026-08-07-1747-multi-audit-component-audit.md`（本日并行多维审计，1 P1 + 19 P2）、`docs/analysis/2026-08-06-0711-open-audit-component-audit/`（round-01..03）、`docs/analysis/2026-08-05-*`。**不重复报告**：22-13（gantt 句柄 reaction 不派发）、22-14（gantt design.md 弃用字段）、23-1/23-4（kanban 假绿测试）、03-01..03-03（fork/死依赖/扫描器盲区）、16-1..16-5（文档行号）、dialog/upload ctx 家族（08-06 round-02 已登记）。diff-view 属 22-13 **家族新实例**（不同组件、不同根因落地点），按去重规则第 6 条单独记录。
- **视角**: 异常路径侦探（StrictMode 双挂载 / pointercancel / 定时器残留）+ 组合爆炸测试者（loadAction×infinite、remote×append、filter×roving）+ 契约考古学家（eventContracts ↔ 派发 ctx）+ 死代码清道夫（schema 字段无消费者 / 恒等函数管道）。

## 1. `[P1]` 发现清单（12 条）

### [P1] 1-1 form-load-action.ts 三缺陷：StrictMode 下 autoLoad 静默丢弃；失败永不重试；refresh 与 autoLoad 竞态覆写新数据

- **文件**: `packages/flux-renderers-form/src/renderers/form-load-action.ts:40-90`（1053-1 拆分新模块，消费方 form.tsx:302）
- **是什么**:
  1. **StrictMode autoLoad 丢弃**（:45-52 + :84-89）：`loadActionKeyRef.current = activationKey` 在请求启动**前**置位，cleanup 只 abort 不重置 key。React 19 StrictMode 挂载双跑（setup→cleanup→setup）：首次 setup 启动请求并置 key → cleanup abort → 二次 setup 命中 `loadActionKeyRef.current === activationKey` 守卫直接 return——**aborted 请求永不重启，autoLoad 表单静默不加载**。对照 `form-init-action.ts:77-89` 专门在 cleanup 清除 in-flight 标记（注释明确记载该教训），load 钩子未遵循。
  2. **失败永不重试**（:52 置 key、:68-77 catch 不重置）：临时网络失败后 `loadActionKeyRef` 永久持留，该 activation 的 autoLoad 永久禁用；initAction 在 catch 清 in-flight（:64-66）可重试——两个生命周期钩子失败语义不一致。
  3. **refresh 竞态**（:98-106）：refresh handler 不 bump `loadRequestIdRef`、不带 signal；autoLoad 慢响应在 refresh 之后 resolve 时 `:61` 的 stale 守卫放行（id 未变），旧数据覆写新数据。
- **为什么值得关心**: playground 以 `<React.StrictMode>` 包裹（main.tsx:12），autoLoad+loadAction 是表单主数据路径，dev 下静默无数据、无错误、无测试覆盖（form-loadaction.test.tsx 无 StrictMode 渲染）；竞态在 dialog-edit 流程（刷新后旧响应覆写）真实可触。三缺陷同根：loadActionKeyRef 生命周期管理缺失。
- **信心水平**: 确定（代码逐行验证；init/load 两钩子对比明确）。
- **发现来源视角**: 异常路径侦探。

### [P1] 1-2 CRUD `loadAction` + `pagination.mode:'infinite'`：rows 逐页替换不累计、竞速到末页、无加载/错误反馈

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:289-307`（handleLoadMore）、`crud-renderer-load.ts:240`（setRows 替换）、`use-infinite-scroll.ts:121-124`（非 thenable 无 loading/无并发守卫）、`crud-renderer-schema-builders.ts:62-65`（pageSize 增长契约）
- **是什么**: `handleLoadMore` 在 loadAction 模式下仅 bump `paginationStatePath.currentPage` 并返回 `undefined`（:301-307 注释「owner hook drives fetching」）；load effect（deps 含 pagination）re-run → dispatch loadReaction → `onSettle` `setRows(normalized.rows)` **整页替换**，无任何 append/accumulate 路径（全文件 grep 无 concat）。sentinel 在短页下持续可见 → observer 持续触发 → 竞速翻页至 `atLastPage`，**最终只显示末页 rows**，中间请求全部被 effect cleanup abort。且 `handleLoadMore` 返回非 thenable → `useInfiniteScroll` 的 loading/error 状态与 G5 并发守卫全部不生效。设计文档承诺「累计合并 rows 通过 pageSize 增长表达」（design.md:41/:356），实现路径缺失。
- **为什么值得关心**: 服务端分页 + 无限滚动的常见组合（design.md:420 列为已实现 E1d），实际静默退化为「跳到末页」且无任何反馈；crud-lifecycle.test.tsx:419-593 仅覆盖 source 路径，该组合零测试。
- **信心水平**: 确定（代码路径完整追踪）。
- **发现来源视角**: 组合爆炸测试者。

### [P1] 1-3 list `onItemClick` 派发缺 `event`/`evaluationBindings` ctx：payload 成员 `key` 在 action args 不可解析；且事件 ctx 门禁扫描器对 `owner.events` receiver 形态有盲区

- **文件**: `packages/flux-renderers-data/src/list-renderer.tsx:101-104,118-121`；对照 eventContracts `data-renderer-definitions.ts:498-510`（payload 含 `key`）；扫描器 `scripts/audit/find-event-dispatch-without-ctx.mjs:60`（DISPATCH_RECEIVER 仅匹配 `props.events.X` / `eventHandlers.X`）
- **是什么**: onItemClick 派发 `{ type, item, index, key }, { scope: itemScope }`——ctx 仅 scope，缺 event/evaluationBindings。runtime args 求值只合并 evaluationBindings+scope（action-core.ts:206-208），itemScope 内容为 `{ item, index }`（:75），**payload 成员 `key` 无任何通道**——schema 作者写 `args: { key: '${key}' }` 得 undefined。同文件 onPageChange/onSelectionChange/onLoadMore 均带完整 ctx（:281-285/:364-375），唯独 onItemClick 漏。且该派发形态 receiver 是 `owner.events.onItemClick`（owner 为 props 解构别名），扫描器正则不匹配——**门禁对别名 receiver 全盲**，`check:audit-event-dispatch-ctx` 零命中是假绿。
- **为什么值得关心**: 文档化 payload 成员（`key`）契约静默失效；扫描器盲区意味着同类别名派发（未来组件复制此模式）永不报红。list.md 审计卡 dim 7 只对账了 scope 未对账 key 解析。
- **信心水平**: 确定（代码 + 正则双验证）。
- **发现来源视角**: 契约考古学家。

### [P1] 1-4 kanban `component:moveCard` 目标列不存在：卡片孤儿化且返回 `{ok:true}`

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:393-407`（handleCardMoveViaHandle 只校验 card 存在）、`kanban-helpers.ts:15-22`（moveCard 先从旧列摘除，`if (!targetColumn) return result` 不落位）
- **是什么**: handle 调用 `moveCard(cardId, toColumnId, toIndex)` 且 `toColumnId` 不存在时：卡片已从旧列 children 摘除（:17-20），目标列不存在直接返回——卡片从所有列 children 消失（孤儿），但 handle 返回 `true` → `{ok:true}`。调用方无法区分成功与「卡片消失」。
- **为什么值得关心**: `component:moveCard` 是已登记 capability 契约（22-12 修复过路径），静默丢卡片是数据可见性丢失；kanban-handle.test.tsx:142-234 只覆盖存在列路径。
- **信心水平**: 确定（helper 与 handle 两段直读）。
- **发现来源视角**: 异常路径侦探。

### [P1] 1-5 kanban 撤销删除恢复的卡片丢失 `meta`（tags/members/color）

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:380-388`（removeCard 只存 `{...card.data}`）、`kanban-undo-stack.ts:73-77`（undo 走 addCard）、`kanban-helpers.ts:46-60`（addCard 重建 `meta: {}`）
- **是什么**: 删除时 undo 栈只捕获 `cardData`（data 字段），undo 通过 `addCard` 重建卡片 → `meta` 一律初始化为 `{}`；卡片 color/tags/members（kanban-card.tsx:39-41 消费）在撤销恢复后全部丢失。data 字段保留（标题/内容在），meta 丢失——**文档化 undo 路径中的数据丢失**。
- **为什么值得关心**: undo 是 design.md §8 登记能力；撤销后卡片视觉/标签元数据静默消失，用户无法察觉恢复不完整。
- **信心水平**: 确定（三段代码直读）。
- **发现来源视角**: 生命周期追踪者。

### [P1] 1-6 barcode torch 可用性检查只在挂载时执行一次，生产流程 torch 按钮永不出现

- **文件**: `packages/flux-renderers-scheduling/src/barcode-input/hooks/use-barcode-torch.ts:44-59`
- **是什么**: effect deps `[getStreamRef]`（稳定 ref 对象，永不变化）→ 仅挂载时执行一次；挂载瞬间 `getStream()` 读取 `videoRef.current?.srcObject`——相机流由 `start()` 异步建立（overlay 挂载后数百 ms 才可用），此刻 `stream` 为 null → `if (!stream) return;` 直接退出且 `checkedRef` 未置位 → **effect 永不重跑** → `isAvailable` 恒 false → torch 按钮（overlay.tsx:281 条件渲染）生产环境永不出现。测试 harness 在挂载时即提供 stream，因此 `use-barcode-torch` 单测全绿。
- **为什么值得关心**: 已实现的 torch 功能在生产流程完全不可达（静默死功能）；测试因「挂载即有流」的假设假绿。修复方向：deps 依赖流可用性（或轮询重查）。
- **信心水平**: 确定（effect 生命周期 + 流时序直读）。
- **发现来源视角**: 时序攻击者。

### [P1] 1-7 gantt 键盘导航/滚动同步监听在 loading/empty 首挂载时永久丢失

- **文件**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts:130-139`（deps `[containerRef]`）、`use-gantt-scroll.ts:31-51`（deps `[gridRef, timelineRef]`）、`gantt.tsx:421-443`（loading/empty 路径不挂 containerRef/gridRef）
- **是什么**: 两 effect 依赖稳定 ref 对象，`containerRef.current` 为 null 时 early-return。若组件**首挂载处于 loading 或 empty 态**（schema `loading` slot 或任务异步到达，gantt.tsx:421/435 提前 return 不渲染带 ref 的容器），keydown 监听、tabindex/role/aria-label 设置、grid↔timeline 滚动同步全部不挂载，**此后 refs 再非空也不会重跑**（deps 不变）——键盘导航与滚动同步对组件整个生命周期静默死亡。测试全部挂载即有数据，该路径零覆盖。
- **为什么值得关心**: a11y 契约（设计 §12.9 键盘导航）与 onScroll 事件契约（§8.1）在异步数据流下失效；任务 re-seed 效果存在（08-06 曾修 re-seed）说明异步到数据是真实流程。
- **信心水平**: 确定（机制）——影响需 loading/empty 首挂载（很可能）。
- **发现来源视角**: 时序攻击者。

### [P1] 1-8 calendar 快速点击遗留长按定时器：下一次无关 pointerup 弹出班次类型选择器

- **文件**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag-create.ts:60-117`（监听仅 active 时挂载）、`:148-175`（startCellDrag 置 500ms 定时器）
- **是什么**: `pointermove/pointerup` 监听**只在 500ms 定时器触发（active=true）后**挂载（:98-106）。普通快速点击（<500ms 松手）→ pointerup 时无监听 → 事件丢失 → 定时器 500ms 后照常触发 `activeRef=true` + 置 startInfoRef → 窗口监听挂上 → **下一次任意无关 pointerup**（点任意位置）触发 `handlePointerUp` → `setShowTypeSelector(true)` 弹出类型选择器。`cancelCreate` 存在但未被任何 UI 事件接线（calendar.tsx:476/519-520 仅 startCellDrag/selectType/dismissTypeSelector）。
- **为什么值得关心**: 快速点击是日历最常见交互；「随手一点弹选择器」是明显用户体验缺陷，且无清理路径。
- **信心水平**: 确定（机制）——用户可见误行为（很可能）。
- **发现来源视角**: 时序攻击者。

### [P1] 1-9 diff-view 4 个 reaction 字段只 ready() 不 dispatch()——22-13 家族新实例

- **文件**: `packages/flux-renderers-content/src/diff-view/diff-view-renderer.tsx:291-295`（仅 `reactions[key]?.ready()`）、`:240-277`（handle invoke 只做视觉行为）、`:315-320`（UI toggle 不派发）；定义 `content-renderer-definitions.ts:557-560`（4 字段全 `kind: 'reaction'`）
- **是什么**: `toggleViewType/setViewType/expandAll/collapseAll` 注册为 reaction，但全组件 grep 零 `reactions.*.dispatch()` 调用——schema 声明的 action 在 UI 切换与 handle invoke 两条路径下均不执行。与 multi-audit 22-13（gantt 同型）根因相同但为**独立组件实例**；calendar 22-05 已建立「触发即派发」家族标准，diff-view 未对齐。
- **为什么值得关心**: schema 作者声明 `toggleViewType: { action }` 后 action 全路径不可达（静默死契约）；无测试覆盖（diff-view 测试未断言 reaction 派发）。
- **信心水平**: 确定（grep 实证零 dispatch）。
- **发现来源视角**: 契约考古学家。

### [P1] 1-10 async-data 每次 run/poll 创建 child scope 永不 dispose：ownedScopeDisposers 无界增长

- **文件**: `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:248-255`（requestScope）、`data-source-runtime-utils.ts:93-101`（mappingScope）；对照 `runtime-factory.ts:353-372`（createChildScope 注册随机 id disposer）
- **是什么**: 每次 data-source run/poll 周期 `runtime.createChildScope` 创建 requestScope/mappingScope 并注册进 `ownedScopeDisposers` Map（随机后缀 id）；async-data/ 目录 grep 零 `disposeScope` 调用，controller dispose（source-registry.ts:285-308）只 abort+停控制器不回收 child scope。5s 间隔轮询约 **720 条/小时** 无界增长（Map + scope store + snapshot 链），runtime 生命周期内永不释放。无测试覆盖（data-source-poll-timer-dispose-race.test.ts 只测定时器）。
- **为什么值得关心**: 长生命周期宿主 + 轮询源的核心内存泄漏路径；scope 泄漏还会连带保留其 zustand store 与依赖链。
- **信心水平**: 确定（代码路径 + grep 实证）。
- **发现来源视角**: 10x 规模运维者。

### [P1] 1-11 kanban 过滤态下 roving 键盘导航索引错位：ArrowDown/Up 焦点永不移动

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx:155-192`（rovingIndex 基于 displayCards 显示索引）、`kanban-card.tsx:67`（`data-card-index` 取 `cardIndexMap` 真实 board 索引）
- **是什么**: 过滤器激活时 `displayCards` 是过滤后子集，`handleCardKeyDown` 计算显示索引，但 DOM 上 `data-card-index` 是真实 board 索引（cardIndexMap.get(card.id)）；focus effect（:189）`querySelector('[data-card-index="N"]')` 按显示索引查询 → 不匹配 → `cardEl?.focus()` 落空，**ArrowDown/ArrowUp 焦点不移动**。
- **为什么值得关心**: 过滤是 kanban 核心交互（tag filter），过滤态键盘导航完全失效；a11y 契约（design §12.9 键盘导航）在过滤组合下破坏。kanban-keyboard 测试未覆盖 filter×roving 组合。
- **信心水平**: 确定（机制；仅过滤态触发）。
- **发现来源视角**: 组合爆炸测试者。

### [P1] 1-12 remote search 选中值回显为原始 id（标签丢失）

- **文件**: `packages/flux-renderers-form/src/renderers/input-choice-utils.ts:180-223`（resolveChoiceComboboxValue/TriggerText 的 allOptions）、`input-choice-renderers.tsx:114`（allOptions 仅含 rawOptions/groups，**remoteOptions 永不合并**）
- **是什么**: 远端搜索选中后表单值存 primitive；重渲染时 `allOptions` 不包含 remoteOptions，查找失败走 `label: String(value)` 回退——**trigger/chip 显示原始 id 而非选项标签**（如 "remote" 显示为 raw value）。select-remote-search.test.tsx 只断言选项列表与 dispatch，未断言选中后回显文本。
- **为什么值得关心**: remote search 是 select 主能力；选中后标签丢失是最直接的可见错误行为；append 模式同样受影响（`[...rawOptions, ...remoteOptions]` 只影响可见列表，不回写 allOptions）。
- **信心水平**: 确定（代码路径直读）。
- **发现来源视角**: 跨边界信使。

## 2. `[P2]` 发现清单（选录，非穷尽）

### 配置/死代码类

- **[P2] 2-1 `crud.polling.stopWhen` 声明但零消费者**：`crud-schema.ts:36` + `data-renderer-definitions.ts:333` 注册 prop，全仓生产代码 grep 零读取（data-source 自己的 stopWhen 是另一类型 :source-registry.ts:155）。design.md:352 说「interval/stopWhen 由上游 data-source 配置」——CRUD 侧字段既未透传也未实现，schema 作者配置后静默无效。信心：确定。
- **[P2] 2-2 `$crud.refreshing` 硬编码 false**：`crud-renderer.tsx:206` 恒 `refreshing: false`，`crud-schema.ts:238` 声明该字段——footer/statistics 消费 `$crud.refreshing` 永为 false；design.md:352 宣称「$crud.refreshing 已由既有 status summary 暴露」。刷新中态无法表达。信心：确定。
- **[P2] 2-3 `finishAction` 恒等函数死管道**：`flux-action-core/src/action-dispatcher/action-runners.ts:46-53` 原样返回 result；15+ 调用点（built-in/component/named/namespace/parallel runner）构建 `ActionMonitorPayload` + `dispatchMode`（action-execution.ts:263）全部被丢弃——死计算 + 误导性 seam（action-scope-and-imports.md:617,1397 暗示 monitor 细节流）。信心：确定。
- **[P2] 2-4 死导出**：`flux-compiler/src/schema-compiler/shape-validation-rules.ts:6` re-export `validateStructuralPathField` 无消费者（唯一消费者 shape-validation-rules-source.ts:4 直接 import 子模块）；`kanban/utils/kanban-undo-stack.ts:63` `BatchUpdateTaskCommand` 生产零实例化；`use-calendar-drag-create.ts:33,224-229` `availableTypes`/`dragCreateState` 返回值生产零消费；`crud-renderer-state.ts:19` `InternalTableHandle`、`crud-schema.ts:273` `createDefaultCrudStatusSummary` 无外部消费者。信心：确定。
- **[P2] 2-5 `form.tsx:50` `importsReady = true` 硬编码死守卫**：两新 hook 均以 `!importsReady` 门控，值恒 true → early-return 不可达、参数误导。若 preparedImports 曾意图门控 init/load，该守卫静默失效。信心：确定。

### 行为/健壮性类

- **[P2] 2-6 input-choice append 模式远端空结果展示全部未过滤 raw options**：`input-choice-utils.ts:142-150`——`remoteOptions === []`（空结果或搜索错误）时 `[...rawOptions, ...[]]` 在用户输入 query 时展示**全量未过滤**列表，与 replace 模式（空列表 + ComboboxEmpty）及本地过滤分支（:148 过滤）不一致。信心：确定（代码路径）。
- **[P2] 2-7 事件 ctx 扫描器别名盲区**：`find-event-dispatch-without-ctx.mjs:60` 正则只匹配 `props.events.X`/`eventHandlers.X`，`owner.events.X`（list-renderer:101 实际形态）漏检——即 1-3 能假绿的原因；建议补别名 receiver 形态。信心：确定。
- **[P2] 2-8 CRUD 自定义 state path 双 fetch**：`crud-renderer-load.ts:173-180` ignore 列表只覆盖 ownerStatePath 等；`paginationStatePath: 'infinite.pagination'` 这类自定义路径（crud-lifecycle.test.tsx:475 同款）每次变更同时触发 reactive force() dispatch + imperative load effect dispatch（:294）——两请求/变更；server-correction 注释自认「at most 1 extra fetch」但自定义路径是**每次**。信心：很可能。
- **[P2] 2-9 CRUD infinite 失败重试跳页**：`crud-infinite-scroll-area.tsx:53-56` `onRetry={handleLoadMore}`——page N 失败后重试 bump 到 N+1 而非重试 N，client 模式 source 切片跳过 10-15 行。信心：很可能。
- **[P2] 2-10 CRUD polling 挂载序竞态**：`use-crud-polling.ts:106-134` handle 解析一次失败仅 console.warn 不重试；schema 顺序 `[crud, data-source]`（data-source 在 crud 之后注册）时轮询永久静默禁用；现有测试全部 data-source 在前。信心：很可能。
- **[P2] 2-11 pagination currentPage 无渲染期 clamp**：`pagination-renderer.tsx:45-48` 文档承诺「out-of-range currentPage 必须 clamp」，但 :128-133 仅 useState 初始化 clamp；total 收缩后（服务端刷新）渲染期 currentPage > totalPages 显示越界页（:139 total 跟随 prop 而 currentPage 不重 clamp）。信心：确定（代码）。
- **[P2] 2-12 surface scope dispose 缺口 + GC 测试假保障**：`runtime-factory.ts:598-625` createSurfaceScope 直用 createScopeRef 绕过 createChildScope → 不进 ownedScopeDisposers；surface-runtime.ts:121 disposeOwnedScope 默认 fallback `disposeScopeTree`（runtime-owned-factories.ts:280）只清 source/reaction 注册不调 scope.dispose()；`surface-teardown-gc.test.ts:25-29` 注入 mock disposeScope 绕过生产链——「L1 regression gate」对真实路径零判别力。信心：确定（机制），影响很可能。
- **[P2] 2-13 barcode 连续同值扫描静默丢弃**：`use-barcode-detect.ts:102-105` `decoded.barcode === lastResultRef.current` 抑制 setResult；overlay consume-once key 为 `barcode|format`——连续扫两个相同条码只入队一个，queue 的 duplicate 状态逻辑（barcode-queue-utils.ts:18-37）对连续同值不可达。批量模式数据丢失。信心：确定。
- **[P2] 2-14 4 个 drag hook 无 pointercancel 处理**：`use-gantt-drag/use-gantt-link-draw/use-calendar-drag/use-calendar-drag-create` 只监听 pointermove/pointerup——浏览器 pointercancel（触摸滚动中断、OS 手势）后 ghost 元素残留 + 窗口监听悬挂 + 后续 pointerup 误提交 drop（gantt 还留 `gantt-drop-indicator` 与 0.3 opacity）。信心：很可能。
- **[P2] 2-15 calendar 键盘 down 未知 resourceId 移入 resource[0]**：`calendar.tsx:320-325` findIndex → -1 时落位首个资源，无守卫。信心：确定。
- **[P2] 2-16 `onErrorError` 重包装丢失 caught-failure 抑制标记**：`action-execution.ts:579-591` `{...result, onErrorError}` 未保留 `preserveCaughtFailureMarker`（:402/:455 retry 路径在用）——外层 onError 分支失败时 `caughtFailureResults` WeakSet 抑制失效，可能重复 toast。信心：很可能（需嵌套链）。

### i18n/文档类

- **[P2] 2-17 barcode 硬编码英文相机错误**：`use-barcode-camera.ts:96-99` `'Camera permission denied'`/`'No camera found'`/`'Camera error: …'` 原文渲染（overlay.tsx:257 仅 fallback 走 t()）；overlay.tsx:350 `dup` 字面量；`use-kanban-board-effects.ts:146` `Dragging card: ${…}` aria-live 播报不走 t()（同族播报均走 t()）。信心：确定。
- **[P2] 2-18 carousel/qrcode 硬编码文案**：`carousel.tsx:270` `` `Slide ${index+1}` `` placeholder、`qrcode.tsx:109` `` `QR code for ${valueStr}` `` aria-label 不走 t()。信心：确定。
- **[P2] 2-19 gantt 键盘日期编辑派发 onTaskDragEnd 而非 onTaskEdit**：`gantt.tsx:213,226,237,248`（ArrowLeft/Right 移动/缩放）——design.md §8.1 语义切分（onTaskDragEnd=拖拽、onTaskEdit=编辑型：编辑器/行内/键盘删除）；键盘日期改期是编辑型变更却走 drag-end 通道，host 以 onTaskEdit 持久化会静默漏改。信心：很可能（契约漂移 vs 文档，但存在「键盘即拖拽等价物」的合理解读，故 P2）。
- **[P2] 2-20 copy 提示 setTimeout 无卸载清理**：`ai-feedback.tsx:51` / `ai-bubble/renderers/markdown.tsx:111` 1500ms `setCopied(false)` 卸载后 setState（React 19 下良性但属泄漏模式）。信心：确定。

## 3. 跨模式观察

1. **「挂载时序单点假设」家族（1-1/1-6/1-7/1-8，4 条）**：四个组件都假设「首挂载即就绪」——StrictMode 双跑、相机流异步、loading/empty 首渲染、长按定时器——全部在异步/重挂载路径下静默死亡且测试全绿（测试都绕过时序假设）。模式根因：**effect deps 依赖稳定 ref 而不依赖「就绪信号」**。
2. **「组合未测试」家族（1-2/1-11/2-8/2-10）**：loadAction×infinite、filter×roving、自定义 path×loadAction、crud×data-source 节点序——单特性测试全绿、组合零覆盖；与 checklist v2 维度 12「组合宿主场景每卡必检」执行缺口直接相关。
3. **「schema 声明即契约」家族（1-3/1-9/2-1/2-2）**：声明（eventContracts/reaction 字段/stopWhen/$crud.refreshing）与实现消费面不一致——契约面 > 实现面，schema 作者按文档写配置即踩静默无效。
4. **「scan 器假绿」家族（1-3/1-6/2-7/2-12）**：三个门禁/测试以「测试环境态」替代「真实生产态」——别名 receiver 正则盲区、挂载即有流、mock disposeScope 绕过生产链。

## 4. 已核验通过项（不构成发现）

- 1053-1 拆分保真：form/input-choice/tree-control 新模块逐字节比对 81702c1e~1 无逻辑变化（**本批 1-1/2-5 是既有缺陷的载体转移而非拆分引入**）。
- use-infinite-scroll observer/timer 清理、并发守卫（thenable 路径）正确。
- crud-renderer-load abort 路径（onSettle cancelled 守卫、AbortError 归一）正确。
- kanban WIP 列级 canDrop 与卡片级 canDrop 不一致（2 处：:130-133 vs :164-167）——语义歧义未定，记录不报告。
- audio/video/image/qrcode `onLoadError?.()` 空参派发——属 checklist 显式豁免类别（空参派发），不报告。
- html.tsx/markdown.tsx/diff-view/ai-tool-call 的 dangerouslySetInnerHTML 均先 sanitize/escape，无 XSS 面。
- chart onClick/onHover `{}` ctx 为 allowlist 已裁决项（normalizeActionEvent 处理原生事件），不重复报告。

## 5. 总评

当前项目最值得关注的三个方向：

1. **挂载时序单点假设**（1-1/1-6/1-7/1-8）：四组件在 StrictMode/异步流下静默死功能，全部是「首挂载即就绪」假设 + 测试环境绕过真实时序。这是本批对用户影响面最大的家族——dev 环境表单不加载、生产 torch 不可达、gantt 键盘死亡，且全部无报错。建议优先修复并建立「挂载态→就绪态」转换的测试纪律。
2. **组合面零测试**（1-2/1-11/2-8/2-10）：组件级审计 18 维对单组件有效，但跨特性组合（loadAction×infinite、filter×roving）是 defect 高发区，与 checklist v2 维度 12 每卡必检 1 个真实宿主场景的纪律存在执行缺口——host 场景通常用「happy path 数据」，未覆盖「组合 + 异步 + 特殊状态」。
3. **契约面 > 实现面**（1-3/1-9/2-1/2-2）：事件/action/reaction 声明与派发实现不对称在本批出现 4 处，且扫描器盲区使门禁假绿。建议把「声明字段存在性 ↔ 派发/消费点存在性」做成双向一致性检查（同 check-workspace-manifest-deps 的声明-引用双向思路）。

## 6. 盲区自评

- **未覆盖**：flux-renderers-basic 与 flux-renderers-mobile 包逐组件深读（本批由子 agent 抽查，未逐组件）；playground 页面与 e2e 组合场景（tests/e2e/component-lab/）未重跑；性能热点（O(n²) 大列表）仅粗扫；scheduling 的 dnd 集成与 calendar 周/月视图切换未验证；CSS/Tailwind 类名生成链（bugs/14 家族）未复检。
- **下一轮切入建议**：① 按 1-1 家族建立 StrictMode 双挂载回归测试矩阵（form/select/audio/video/image 等所有含 async effect 的组件）；② e2e 层补 loadAction×infinite 与 filter×roving 组合场景（programmatic DOM 断言）；③ 事件 ctx 扫描器补 `owner.events`/`props.regions` 等别名 receiver 形态后全仓重跑；④ 对 `docs/analysis/2026-08-05-p2-p3-findings-consolidated-analysis.md` 的 P2/P3 台账与 live 代码对账（本批未消费该台账）。

## 7. 汇总

| 优先级 | 数量 | 驱动                     |
| ------ | ---- | ------------------------ |
| `[P0]` | 0    | —                        |
| `[P1]` | 12   | 修复计划（1-1 家族优先） |
| `[P2]` | 20   | follow-up backlog        |

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
