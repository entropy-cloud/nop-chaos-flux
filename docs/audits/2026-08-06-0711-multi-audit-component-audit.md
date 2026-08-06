> Audit Status: planned
> Audit Type: multi-dimensional
> Mission: component-audit

# 2026-08-06-0711 多维审计报告（component-audit）

## 0. 审核范围与执行方式

- **任务**: 对 mission `component-audit` 执行多维深审；聚焦 `./`（code、config、tests、public contracts/exports/API surface），并对照架构文档核查已文档化契约漂移。
- **审核日期**: 2026-08-06
- **执行方法**: 按 `docs/skills/deep-audit-prompts.md` 共享前缀 + 维度正文装配 prompt，`subagent_type="explore"` 派发。**初审 12 个维度**（02/04/05/06/09/10/11/12/13/18/20/22；上轮 2026-08-05 已覆盖 01/03/14/15/16/17/19/23，不重复），共 12 个初审子 agent + 1 个 R2 追加深挖子 agent + 3 个独立复核子 agent（P1 逐条复核 / 高风险 P2 逐条复核 / 低风险批量复核）。
- **工具基线**（主 agent 预跑，供各维度消费）:
  - `pnpm check:audit-suspects`: 429 命中 / 10 桶（reactive-render-read 15、broad-scope-selector 2、void-promise-no-catch、then-chain-no-catch、catch-without-structured-failure-path、fieldframe-bypass、json-stringify-change-detection、bare-data-slot-selector、test-global-patch、test-module-top-let）
  - `pnpm check:audit-async-failure-paths`: 200 命中 / 3 桶
  - `pnpm check:audit-runtime-raw-schema-reads`: **零命中**（compile-once 硬门禁通过）
  - `pnpm check:audit-missing-renderer-markers`: **零命中**
  - `pnpm check:oversized-code-files`: 14 个 >700 行文件（与 08-06 登记清单逐名吻合，零新增）；0529-1 拆分（coverage-manifest-entries.ts、wizard-renderer.tsx）确认已落地
  - `pnpm check:workspace-manifest-deps`: **exit 0**（5 ERROR 已清零）
  - `pnpm check:audit-styling-suspects`: 142 命中（spreadsheet canvas 127 + ai 15，均属自绘面）

### 严重程度映射说明（mission 三档 ↔ 深审手册四档）

| mission 档位 | 判定                                                               | 本文档使用                |
| ------------ | ------------------------------------------------------------------ | ------------------------- |
| `[P0]`       | blocking：契约破坏/错误行为/数据丢失/安全/变更行为的失败或缺失测试 | 本批**无 P0**             |
| `[P1]`       | material：真实缺陷或契约漂移，不阻塞但 MUST fix                    | 深审手册 P1（3 条）       |
| `[P2]`       | trivial / 非阻塞 polish：真实但可排期，入 follow-up backlog        | 深审手册 P2 + P3（42 条） |

---

## 1. 深挖统计

- 维度总数：12（初审）+ 1 个 R2 追加深挖（维度 22，产出 2 条新发现）
- 深挖轮次：维度 22 = 2 轮（R1 10 条 + R2 2 条）；其余 11 个维度 = 1 轮（R1 后进入复核；零发现维度 06 直接复核确认）
- 深挖总发现数：**45**（R1 43 + R2 2）

## 2. 复核统计

- 深挖发现总数：45
- 独立复核覆盖：**45/45 全覆盖**
  - P1 逐条复核：3/3（22-01、22-02、22-03 全部成立）
  - 高风险 P2 逐条复核：4/4（18-01、09-01/09-02、10-01、12-01 全部成立）
  - 低风险批量复核：38/38（维度 20 十条 + 维度 05 三条逐条；其余按文件/模式核对）
- 保留：45；降级：0；驳回：0
- 复核修正（不影响结论）：20-03「不响应 prefers-reduced-motion」修正为「CSS 动画有全局 base.css 兜底（`ui/src/styles/base.css:31-39` 将 animation-duration 压至 0.01ms），但 3 秒轮播内容切换无兜底」；05-03 数量修正 9 处→10 处；22-01「每击派发两次」修正为「仅在 idx < len-2 边界档成立，跨级跳变与重复事件在边界档 100% 复现」。

---

## 3. `[P1]` 发现清单（material，MUST fix，3 条）

### [P1] 22-01 gantt 缩放按钮双触发：单次点击跨两级缩放 + onZoomChange 双派发

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:19-39` + `gantt.tsx:264-280,417` + `gantt-store.ts:325`
- **严重程度**: P1（错误行为 + schema 事件副作用翻倍，独立复核确认）
- **证据片段**:
  ```tsx
  // gantt-header.tsx:24-26
  store.setZoom(next.key);
  onZoomChange?.(next.key);
  onZoomIn?.(); // ← 之后 gantt.tsx:417 的 doZoomIn() 基于已改的 store.currentZoom 再缩放一次
  ```
- **现状**: `GanttHeader.handleZoomIn` 自己执行 `store.setZoom`（同步更新 `currentZoom`）+ `onZoomChange` 后又调 `onZoomIn` → `gantt.tsx:417` 的 `onZoomIn={() => { doZoomIn(); ... }}` 基于已被修改的值再执行一次 `setZoom` + `onZoomChange`。默认三级 [day, week, month] 下，从 day 点「+」一次点击实际执行 day→week→month 两级缩放、两次 onZoomChange 派发。
- **风险**: 缩放跨级跳变（行为错误）；宿主 `onZoomChange` action 双执行（副作用翻倍）；现有测试 `gantt.test.tsx:294-319` 从默认 week 点击恰好落在单步路径上，测不出双触发。
- **建议**: 收敛为单一驱动——header 只调 `onZoomIn/onZoomOut`（删内部 setZoom/onZoomChange），或 `doZoomIn` 基于目标档计算；补「day 档点 + 只进 week + onZoomChange 恰派发一次」的集成测试（先红后绿）。
- **误报排除**: 非已修复项——git 最近 8 commit 无此修改；独立复核逐行确认双触发链路成立。
- **复核状态**: 子项复核通过（保持 P1）

### [P1] 22-02 gantt 容器级键盘处理未排除输入目标：行内编辑时 Backspace/Delete 误删任务

- **文件**: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts:45-121,126` + `gantt-grid.tsx:152-161` + `gantt.tsx:232-236`
- **严重程度**: P1（编辑流程中直接数据破坏，独立复核确认）
- **证据片段**:
  ```ts
  // use-gantt-keyboard.ts:94-107 —— 无 isEditable/输入目标守卫
  case 'Delete':
  case 'Backspace': {
    const id = getSelectedId();
    if (!id) break;
    e.preventDefault();
    if (onDeleteTask) { onDeleteTask(id); } else { store.deleteTask(id); }
  // gantt-grid.tsx:157-160 —— 行内编辑 Input onKeyDown 不 stopPropagation
  onKeyDown={(e) => { if (e.key === 'Enter') handleCellCommit(...); if (e.key === 'Escape') setEditingCell(null); }}
  ```
- **现状**: keydown 监听挂在 gantt 根容器（`el.addEventListener('keydown', ...)`），Delete/Backspace 分支无 `e.target`/isEditable 守卫；行内编辑 Input 的 keydown 冒泡到容器，编辑态下任务已被选中 → 按 Backspace 删字符即删除整行任务（含子任务）且 `preventDefault` 同时阻断输入框正常删字。同包 kanban 有标准 `isEditable` 守卫（`use-kanban-board-effects.ts:55-56`）而 gantt 缺失。附带同根因：Enter 提交单元格后冒泡还会打开 GanttEditor 弹窗。
- **风险**: 用户编辑任务文本时按退格键即**数据丢失**（DeleteTaskCommand 立即 execute）；测试盲区——`use-gantt-keyboard.test.ts:81-113` 直接对容器 dispatch，从不模拟「事件源自 input 冒泡」。
- **建议**: `useGanttKeyboard` 入口加 `if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;`；补回归测试：行内编辑中按 Backspace → 任务未删除且输入框字符被删。
- **误报排除**: 非已裁定模式——kanban 有守卫而 gantt 没有，属跨组件不一致的遗漏，后果为数据丢失。
- **复核状态**: 子项复核通过（保持 P1）

### [P1] 22-03 kanban 默认 local 模式下 `data` prop 运行时变化永不重灌：异步数据源首屏后永远空面板

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:38,46,80,83-85,412-436`（对照 `gantt.tsx:79-101` re-seed effect）
- **严重程度**: P1（默认配置下核心数据路径失效，独立复核确认）
- **证据片段**:
  ```tsx
  // kanban-board.tsx:80,83-85
  const [localBoardData, setLocalBoardData] = useState<BoardData>(rawData ?? fallbackBoard);
  const boardData =
    kanbanOwnership === 'controlled'
      ? (rawData ?? fallbackBoard)
      : kanbanOwnership === 'scope' && scopeBoardData
        ? scopeBoardData
        : localBoardData;
  ```
- **现状**: `localBoardData` 仅 `useState` 初始化一次；全文件唯一 `setLocalBoardData` 在 `setBoardData`（:124，用户交互变更）；**无任何 effect 在 `resolved.data` 引用变化时重灌**。默认 ownership `'local'`。异步场景（data-source/`${expr}` 先 loading 后数据到达）：首渲染 data=undefined → localBoardData 冻结为 fallbackBoard（空 root）→ loading 守卫只决定骨架渲染不重灌 → 数据到达后 `columns.length === 0` → 永久空态。
- **风险**: 低代码最常规的异步数据场景下看板永久「暂无数据」；宿主刷新 data 引用无效。已排查无补偿机制（注册无 key 重挂载；gantt 的 re-seed effect 恰证明框架不会自动重挂载）。测试无覆盖（kanban-renderer.test.tsx:102-112 只测空态/loading）。
- **建议**: 仿 gantt 增加 `useEffect` 在 `rawData` 引用变化时 `setLocalBoardData(rawData)`（用 ref 快照区分首灌/后续同步，注意与用户本地编辑冲突策略）；补「loading:true 渲染 → rerender loading:false+data → 断言列渲染」测试。
- **误报排除**: 非已裁定项——reopened-design-decisions 无 kanban data 重灌裁定；「传 data 即 controlled」是另一已修复问题；本缺陷是 local 分支自身接线缺口。
- **复核状态**: 子项复核通过（保持 P1）

---

## 4. `[P2]` 发现清单（trivial / 非阻塞 polish，42 条，入 follow-up backlog）

### 维度 02：模块职责与文件边界

#### [P2] 02-01 crud-renderer-state.ts 职责混合：名为「state」的文件承载 312 行异步 load 编排

- **文件**: `packages/flux-renderers-data/src/crud-renderer-state.ts:490-801`（useCrudLoadAction 块，对照 :19-480 类型+归一化）
- **严重程度**: P2（注册在案 >700 治理债 + 内容与文件名不符 + 明确提取缝）
- **证据片段**:
  ```ts
  export function useCrudLoadAction(args: { enabled: boolean; loadReaction: ReactionHandle | undefined; ... }): CrudLoadActionResult {
    const proxyHandle = loadReaction as ReactionHandle & {
      __setBindingsProvider?(fn: (() => Record<string, unknown>) | undefined): void; ...
  ```
- **现状**: 802 行（08-06 登记后仍 +8 增长）；前半纯类型+归一化（约 460 行），后半 4 个行为 hooks，其中 useCrudLoadAction 独占约 310 行异步 load 编排（reaction proxy 注入、AbortController、reload nonce、错误上报）。
- **风险**: 文件名误导归属判断；是 14 个治理债中唯一「内容与文件名不符 + 零耦合提取缝」的文件。
- **建议**: 提取 `crud-renderer-load.ts`（useCrudLoadAction + CrudLoadActionResult 约 320 行），双方均落回 <500 行。
- **误报排除**: 非「大文件无边界漂移」——>700 硬规则 + 职责混合 + 机械安全提取缝三者齐备；useCrudLoadAction 与文件前半零共享内部符号。
- **复核状态**: 维度复核通过

#### [P2] 02-02 table-renderer.tsx 二次膨胀：拆分后 6 天重新吸入 responsive 列实现，737 行压线超限

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:63-148`（RESPONSIVE_BREAKPOINTS / splitResponsiveColumns / useIsBelowResponsiveBreakpoint 约 85 行）
- **严重程度**: P2（二次膨胀，校准模式 1 的 keep 条件）
- **证据片段**:
  ```ts
  const RESPONSIVE_BREAKPOINTS = { xs: 480, sm: 640, md: 768, lg: 1024 } as const;
  function splitResponsiveColumns(columns: TableColumnSchema[]) { ... }
  function useIsBelowResponsiveBreakpoint(breakpoint: number) { ... }
  ```
- **现状**: 2026-04-19 拆分为 table-renderer/ 34 子模块后，2026-04-25（f16a5b83）把 responsive 实现直接写入主文件而非子模块；后续 07-29/08-02/08-04 特性继续落主文件；737 行超 >700 门禁 37 行。
- **风险**: orchestrator 文件持续作为新列布局实现落点，行数继续逼近门禁；同类逻辑（useTableVisibleColumns/useColumnResize）已在子模块有既定提取模式。
- **建议**: 提取 `table-renderer/responsive.ts`（约 85 行），主文件降至 ~650 行。
- **误报排除**: 「第一轮提取后停止」教训针对为行数继续拆；此处是拆分后**反向吸入**实现细节，属该原则边界外。
- **复核状态**: 维度复核通过

#### [P2] 02-03 flux-runtime-module-boundaries.md 所有权映射不完整：≥12 个 live 模块无所有权条目

- **文件**: `docs/architecture/flux-runtime-module-boundaries.md:48-360`（对照 `packages/flux-runtime/src/form-store-owned.ts`（345 行）、`form-runtime-owner-validation-utils.ts`、`refresh-nearest.ts`、`surface-hooks.ts`、`request-in-flight-registry.ts`、`form-store-diagnostics-bridge.ts`、`flux-compiler/src/schema-compiler/` 下 7 个子模块）
- **严重程度**: P2（文档-代码漂移：live 模块缺 doc 条目）
- **现状**: 反向核对（doc 列出但 live 缺失）为零；正向漂移（live 存在但 doc 无条目）≥12 个模块，全部创建于 doc 最近更新（08-06，0529-2）之前。
- **风险**: owner doc 是放置指南；缺失条目使后续 agent 无法得知 form-store-owned.ts 等已是稳定运行时边界，可能把新行为放回 index.ts 或重复实现。
- **建议**: 补齐所有权映射（form-store-owned → Scope and state plumbing 段；form-runtime-owner-validation-utils → Validation runtime flow 段；refresh-nearest/surface-hooks/request-in-flight-registry 按实际归属；flux-compiler schema-compiler 段补 7 个子模块）。
- **误报排除**: 06-26 审计「文档-代码偏离 0」是当时快照，上述模块全部其后创建；0529-2 只修了 unstable-only 示例清单，未触碰所有权映射区。
- **复核状态**: 维度复核通过

#### [P2] 02-04 diff-view/utils 子目录过度拆分：23/39 行的小文件独占二级目录

- **文件**: `packages/flux-renderers-content/src/diff-view/utils/diff-stats.ts`（23 行）、`diff-template.ts`（39 行）
- **严重程度**: P2（过度拆分）
- **现状**: utils/ 二级目录只承载 2 个合计 62 行小工具，与同目录其他文件无互引。
- **风险**: 目录层级导航成本高于内容价值；小工具难以被发现。
- **建议**: 合并为 `diff-view/utils.ts` 或并入 adapters/。
- **误报排除**: 已排除同轮候选——ai `storage/types.ts`（27 行）有契约测试显式断言「只含接口」是刻意边界；gantt/components/baseline-bars.tsx 属正常家族目录。
- **复核状态**: 维度复核通过

### 维度 04：状态所有权

#### [P2] 04-01 TableRenderer `stableColumns` props-to-state 同步链：schema 列定义与渲染列集双事实，production 静默回退

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:166-183`
- **严重程度**: P2（全渲染器包唯一 props→state 镜像 + 静默发散）
- **证据片段**:
  ```tsx
  const [stableColumns, setStableColumns] = useState<TableColumnSchema[]>(() =>
    isValidColumnArray(rawColumns) ? rawColumns : EMPTY_TABLE_COLUMNS);
  useEffect(() => {
    if (rawColumns === prevRawRef.current) return;
    prevRawRef.current = rawColumns;
    if (isValidColumnArray(rawColumns)) { startTransition(() => setStableColumns(rawColumns)); }
    else if (isDevRuntime()) { console.warn(...); }
  }, [rawColumns]);
  ```
- **现状**: `stableColumns` 是 `rawColumns`（schema 解析结果）的本地镜像，经 useEffect + prevRawRef 同步；无效列数组时保留上一次有效列且仅 dev warn。排序/过滤/可见列全部锚定在该镜像。
- **风险**: 动态 columns 表达式持续返回无效值时 production 永久渲染与 schema 不一致的列集且无信号；同步链比 render 期派生多一次渲染周期。
- **建议**: last-good 存 ref 并在 render 期直接派生；或表达式连续无效走 `reportRuntimeHostIssue` 结构化错误面。
- **误报排除**: 非 calibration 8 纯 UI 状态（列定义是 schema 业务数据）；不属已裁定的 table axis hooks 三态（ownership 三选一单源 vs 此处双镜像）。
- **复核状态**: 维度复核通过

### 维度 05：响应式订阅精度

#### [P2] 05-01 KanbanBoard 两处 useScopeSelector 无 paths/enabled 门控

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:58-78`
- **严重程度**: P2（工具确认的 broad-scope-selector 命中；全量订阅 + 非 scope 模式死订阅）
- **订阅位置**: :58 `scopeBoardData`、:69 `scopeCollapsedValue`
- **订阅范围**: 渲染作用域全部写入（`createScopeSubscribe(scope, undefined)` 不过滤，hook-subscriptions.ts:214-232）；本地/受控（默认）模式下 selector 恒返回 `undefined`（:60/:71 guard），订阅完全无用。
- **实际需要**: scope 模式只需 `paths: [kanbanStatePath]/[collapsedStatePath]`；非 scope 模式应 `enabled: false`。
- **重渲染频率**: equalityFn 兜底不产生多余重渲染，但每次 scope 写入都重跑 selector + 整棵 BoardData 顶层键比较，按「写入次数 × 看板数 × 2」累积。
- **建议**: 补 `paths` + `enabled: kanbanOwnership === 'scope'`（先例：field-handlers.tsx:58-62、page.tsx:42-46）。
- **误报排除**: 非设计限制——同 hook 的 paths/enabled 选项被仓库内其他组件正确使用。
- **复核状态**: 批量复核通过（保持 P2；复核指出与 05-02/05-03 机制相同，若统一口径亦可降 P3，不改变成立）

#### [P2] 05-02 useCalendarOwnership 两处 useScopeSelector 无 paths/enabled（同族）

- **文件**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-ownership.ts:21-35`
- **严重程度**: P2（与 05-01 同机制；view/date 为小值故单次成本低）
- **现状**: :21 `scopeViewRaw`、:29 `scopeDateRaw` 无 paths 无 enabled；非 scope 模式恒返回 undefined（:22/:30 guard）。
- **建议**: 补 `paths` + `enabled: isScopeView/isScopeDate`。
- **误报排除**: 工具未命中（未传 equalityFn 未匹配启发式）但 live code 与 05-01 结构相同，人工确认。
- **复核状态**: 批量复核通过（P3→按 mission 档映射为 P2）

#### [P2] 05-03 table/list/crud 控制 hooks 族 10 处死订阅（非 scope 模式未 enabled 门控）

- **文件**: `use-table-pagination.ts:49-56`、`use-table-selection.ts:41-56`、`use-table-sort.ts:119-139`（两处）、`use-table-filter.ts:39-65`、`use-table-visible-columns.ts:44-55`（两处）、`use-column-resize.ts:156-171`、`list-pagination.ts:93-111`、`crud-renderer-ownership.ts:75-100`
- **严重程度**: P2（系统性死订阅；复核修正数量 9→10 处）
- **现状**: scope 模式下已正确传 `paths: [statePath]`；但默认 local/controlled 模式下 `paths=undefined` → 退化为全量订阅，selector 因所有权守卫恒返回 undefined/常量 → 永不重渲染的「死订阅」。复核确认：`enabled` 选项存在且被 combo/array-editor/input-table 等正确使用。
- **风险**: 每次 scope 写入对每张表格约 10 个死 listener 各执行一次 getSnapshot + selector + equality；典型 CRUD 多表格页按「写入次数 × 表格数 × 10」累积。
- **建议**: 各 hook 补 `enabled: <ownership> === 'scope'`（保留 paths）。
- **误报排除**: 结构性原因成立（hook API 提供 enabled 且先例充分）；非工具可捕获（启发式只查 paths 存在性）。
- **复核状态**: 批量复核通过（P3→按 mission 档映射为 P2）

### 维度 09：渲染器契约合规性

#### [P2] 09-01 渲染器 render 期 createScope 无配对 disposeScope（4 处跨 3 包，确定性资源泄漏）

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:97-121`；`packages/flux-renderers-basic/src/loop.tsx:82-94,105-117`；`recurse.tsx:88`；`packages/flux-renderers-form-advanced/src/variant-field/variant-field-matching.ts:45-56`（经 variant-field-controller.ts:48-62 render 期调用）
- **严重程度**: P2（独立复核确认：契约原文 + 泄漏机制 + 同包配对先例三方闭合）
- **证据片段**:
  ```tsx
  // use-table-selection.ts:106-111（useMemo 内每行一个 scope）
  const rowScope = helpers.createScope({ ...row.record, $slot: {...} });
  const result = helpers.evaluate(`\${${checkableWhen}}`, rowScope);   // 无 disposeScope
  // runtime-factory.ts:369-371 —— 每个 createChildScope 注册进 ownedScopeDisposers Map
  ownedScopeDisposers.set(scopeId, () => { (scope as ...).dispose?.(); });
  ```
- **现状**: 契约条款 `renderer-runtime.md:246-253`（"renderers that retain child scopes across renders must dispose those scopes explicitly"）；这些「一次性查询语义」的求值在 render 路径逐项 createScope 且永不 dispose；同包 upload-field/list-renderer/crud/row-scope-cache 均有正确配对先例。
- **风险**: 每次表格数据/分页/筛选变化、loop 重渲染、variant 匹配重算都向 runtime 注册表累积 N 个 scope + store + disposer 闭包直到 runtime 销毁；长驻页面高频刷新时内存持续增长；render 期创建 runtime-owned 资源也违反 commit-safe rule。
- **建议**: 求值后配对 `helpers.disposeScope`（try/finally 或 memo 清理期），或按 `renderer-runtime.md:257-271` 改用 evaluationBindings 一次性通道。
- **误报排除**: 非 calibration 8（这是 runtime 资源生命周期而非 UI 状态）；配对义务是 owner doc 明确契约且同包先例证明团队已理解执行。
- **复核状态**: 子项复核通过（保持 P2）

#### [P2] 09-02 交互/事件路径 createScope 无配对 disposeScope（6 处）

- **文件**: `use-table-lazy-children.ts:60`、`condition-builder.tsx:106`、`tree-control-controllers.ts:48`、`picker-renderer.tsx:196`、`table-event-context.ts:17`、`use-select-remote-search.ts:54`
- **严重程度**: P2（与 09-01 同契约同机制，用户交互驱动、频率低）
- **现状**: 每次展开树行/公式求值/tree source 加载/autofill/远程搜索 dispatch 创建一个 scope 永不清理。
- **风险**: 长驻页面长期交互后累积；若未来把引用挂到缓存，泄漏面扩大。
- **建议**: 并入 09-01 同一修复计划（配对 disposeScope 或 evaluationBindings 一次性通道）。
- **误报排除**: 非已裁定接受项——reopened 条目 4 只覆盖 object-field/table-quick-edit/designer-page 的 draft 缓存。
- **复核状态**: 子项复核通过（保持 P2）

#### [P2] 09-03 carousel/tabs 事件 payload 的 type 字段无命名空间（'change'），与同包新组件契约不一致

- **文件**: `packages/flux-renderers-content/src/carousel.tsx:70`；`packages/flux-renderers-basic/src/tabs.tsx:105-115`
- **严重程度**: P2（事件契约面不一致；上轮 17-2 同类问题已被裁定为真实缺陷并路由 G1）
- **证据片段**:
  ```tsx
  // carousel.tsx:70 —— 裸 'change'，与原生 DOM change 事件 type 同值
  const payload = { type: 'change', activeIndex: next, item };
  ```
- **现状**: 同包 cards（'cards:item-click'）、alert（'alert:close'）及 layout 包 wizard/steps/timeline/button-group 全部命名空间化；carousel/tabs 是仅有的裸 'change'。`renderer-runtime.md:697-700` 要求 meaningful namespaced type。
- **风险**: 调试器/监控无法从 type 区分事件来源；跨层契约对新组件失效。
- **建议**: 改 `'carousel:change'`/`'tabs:change'`，同步源文锁断言与 design.md；可并入 graph 17-2 的 G1 plan 链。
- **误报排除**: mobile 家族裸 type 已被审计卡与源文测试锁定为基线，不拉入本发现（避免校准 10 过度扩张）；carousel 与 cards/alert 同包对比成立。
- **复核状态**: 维度复核通过
- **修复状态**: fixed（2026-08-06，plan `docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md` Phase 5：`carousel.tsx` → `'carousel:change'`、`tabs.tsx createTabsChangePayload` → `'tabs:change'`；源文锁断言（carousel.test.tsx 正则）与三份 design.md 同步；tabs 两处派发补 `scope` 键）。

### 维度 10：样式系统合规性

#### [P2] 10-01 包 CSS 引用 playground 专属类名 `.report-designer-demo` 作为样式锚定（7 处）

- **文件**: `packages/spreadsheet-renderers/src/canvas-styles.css:349,363,371,381,391,400,409`（对照 `apps/playground/src/pages/report-designer-demo.tsx:440`、`apps/playground/src/styles.css:181`）
- **严重程度**: P2（独立复核确认：包-宿主耦合 + 双向泄漏面）
- **证据片段**:
  ```css
  [data-slot='spreadsheet-default-toolbar'] [data-slot='spreadsheet-toolbar'],
  .report-designer-demo [data-slot='spreadsheet-toolbar'] { display: flex; ... }
  ```
- **现状**: 7 处 `.report-designer-demo [data-slot='spreadsheet-toolbar*']` 选择器与正统锚定并列；`.report-designer-demo` 是 playground 演示页专用类名，包外零产出；包 CSS 经 `renderers.tsx:1` 全局注入宿主。
- **风险**: 宿主页面若碰巧使用同名类且内部有 spreadsheet-toolbar 元素会被意外套样式（跨包泄漏）；playground 改名/删除该类后 7 处选择器静默失效；违背 theme-compatibility.md 包自包含原则。
- **建议**: 移除 demo 类变体，工具栏样式锚定用包内 `[data-slot='spreadsheet-toolbar']` 自身；playground 差异样式下沉到 playground styles.css。
- **误报排除**: 非 calibration 8（widget 自样式）——问题不是自样式本身而是锚定到包外宿主类名。
- **复核状态**: 子项复核通过（保持 P2）

#### [P2] 10-02 spreadsheet-toolbar 携带无样式定义的 BEM 死类名 `rd-toolbar` / `rd-toolbar--single-row` 系列（约 15 处）

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx:11`；`toolbar-status.tsx:9,10,14`；`toolbar-groups.tsx:31-267`（约 15 处）
- **严重程度**: P2（BEM 修饰符死类名 + 测试基准误导）
- **证据片段**:
  ```tsx
  <div className="rd-toolbar rd-toolbar--single-row" data-slot="spreadsheet-toolbar">
  ```
- **现状**: `rd-*` 系列类名全仓无任何 CSS 定义（样式全走 data-slot 选择器）；e2e（report-designer-demo.spec.ts:25,168,186）以 `.rd-toolbar` 为定位基准；`rd-` 前缀是 report-designer 迁移残留。
- **风险**: 违背 renderer-markers-and-selectors.md「BEM-style 内部区域类 → data-slot」稳定协议；死类名误导后续开发与测试。
- **建议**: 删除全部 `rd-*` 类名仅留 data-slot，同步更新 e2e 定位。
- **误报排除**: 非普通命名不优雅——已违反协议文本 + 死类 + 测试基准误导组合；v1 基线不接受迁移残留留在主路径。
- **复核状态**: 维度复核通过

#### [P2] 10-03 diff-view 文件列表组件绕过包内 token 体系，内联硬编码语义色（10 处）

- **文件**: `packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx:108,112,121,157-158,180,192-193,201-202`
- **严重程度**: P2（主题独立性：同一 widget 两套颜色体系）
- **证据片段**:
  ```tsx
  color: entry.status === 'added' ? '#16a34a' : entry.status === 'deleted' ? '#dc2626' : '#ca8a04',
  background: entry.status === 'added' ? '#dcfce7' : entry.status === 'deleted' ? '#fef2f2' : '#fefce8',
  ```
- **现状**: 同目录 diff-view.css（609 行）文件头声明「All color values use variables; no hardcoded oklch」并以 `--nop-diff-*` token 全量主题化；diff-file-list.tsx 10 处绕过（裸 hex + 非家族 token `--nop-bg-active`）。
- **风险**: 新增/删除/修改状态色在 dark mode 或宿主主题下不跟随 token；文件头契约注释与实现矛盾。
- **建议**: 状态色映射到 `--nop-diff-*` 家族 token，组件内用 `var(--nop-diff-*, fallback)`。
- **误报排除**: calibration 8 允许 widget 自样式，但 theme-compatibility.md 对 package-owned 视觉颜色须读 CSS 变量是独立条款，且同文件已有 token 体系被绕过。
- **复核状态**: 维度复核通过

### 维度 11：UI 组件使用合规性

#### [P2] 11-01 ai-attachments 拖放区外层 div role="button" 未接线点击激活，且键盘处理器劫持内部 Button 激活路径

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:199-224,235-244`
- **严重程度**: P2（role=button 语义破损：键盘/鼠标激活分叉 + 交互元素嵌套）
- **证据片段**:
  ```tsx
  <div ... role="button" tabIndex={0} aria-label={t('flux.ai.attachFiles')}
       onKeyDown={handleKeyDown} onDrop={handleDrop} ...>
  ```
- **现状**: 外层 div 无 onClick（点击空区域无响应）但 Enter/Space 打开文件选择器；内部嵌套真实 Button；`onKeyDown` 冒泡阶段拦截内部 Button 的键盘激活改走 `inputRef.click()` 路径。违反 WAI-ARIA "interactive content must not be nested inside button"。
- **风险**: 同一 role=button 表面两种输入行为不一致；读屏器重复宣告。
- **建议**: 移除容器 role="button"/tabIndex/onKeyDown（拖放表面不应伪装成按钮），或补 onClick 并对齐键盘行为（handler 内判断 `event.target === event.currentTarget`）。
- **误报排除**: 非 calibration 3 例外（file input/grid 不适用）；属于 adjudication 条目 1 允许的「键盘激活 bug / ARIA 缺失」新证据类。
- **复核状态**: 维度复核通过

#### [P2] 11-02 diff-view 文件搜索框是全渲染器包唯一原生文本 input，与同文件 ui 组件混合

- **文件**: `packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx:86-94`
- **严重程度**: P2（一致性漂移；全仓唯一原生文本 input）
- **证据片段**:
  ```tsx
  <input type="text" aria-label={t('flux.diff.searchFiles')} placeholder={t('flux.diff.searchFiles')}
         value={searchText} onChange={(e) => setSearchText(e.target.value)}
         style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--nop-border)', ... }} />
  ```
- **现状**: 同文件 tabs 用 ui Button；全仓库其他搜索/文本输入均用 ui Input/Combobox；该 input 无 data-slot、无 focus-visible 自绘样式，用 `--nop-border` 手动模拟主题。
- **风险**: 同文件混合模式误导后续维护者扩散原生写法；不继承 border-input/ring-ring 主题 token。
- **建议**: 替换为 `<Input className="h-8 w-full text-xs" />` 删除手写内联样式。
- **误报排除**: 非高性能宿主表面（普通表单控件）；ui Input 存在等价抽象且同文件已有 ui 先例。
- **复核状态**: 维度复核通过

### 维度 12：表单字段与 Slot 建模

#### [P2] 12-01 variant-field 的 label 只支持值形式，region 形式（schema fragment）静默丢失

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx:222`（对照 variant-field.tsx:72-75 hint/description 正确通道）
- **严重程度**: P2（独立复核确认：编译器提取行为 + 渲染通道分叉 + detail-view 正确先例三方闭合）
- **证据片段**:
  ```tsx
  // variant-field-view.tsx:222 —— label 仅读 props 通道
  label={schemaProps.label as React.ReactNode}
  // variant-field.tsx:72-75 —— hint/description 走 region 优先通道
  const resolvedHintContent = resolveRendererSlotContent(props, 'hint');
  // node-compiler-helpers.ts:270 —— fragment 被替换为 region key，props.label 通道被掏空
  item[fieldKey] = regionKey;
  ```
- **现状**: `formLabelFieldRule`（field-reading.tsx:10-14）声明 label 为 value-or-region；编译器对 `label: { type: 'text' }` fragment 提取到 `regions.label` 并用 region key 替换 `props.label`；FieldFrame 拿到占位串或 undefined → label 静默不渲染。同渲染器 hint/description 用 `resolveRendererSlotContent` 正确；detail-view.tsx:52 用 `resolveFieldLabelContent` 正确处理。
- **风险**: schema 作者按 field-metadata-slot-modeling.md Pattern 3 使用 fragment label 时字段 label 不显示且无诊断；测试 12 个用例仅覆盖字符串 label。
- **建议**: variant-field 用 `resolveFieldLabelContent(props)` 或 `resolveRendererSlotContent(props, 'label')`；补 region label 测试用例。
- **误报排除**: 不命中校准 9（variant-field 已是手动 FieldFrame owner，本发现是已选路径内的通道遗漏，非强迫迁移）。
- **复核状态**: 子项复核通过（保持 P2；复核建议作为快速赢优先修复）

#### [P2] 12-02 fieldframe-bypass allowlist 登记路径过期（variant-field.tsx → 拆分后 variant-field-view.tsx）

- **文件**: `scripts/audit/rules.mjs:16-18`（allowlist 登记 `variant-field.tsx`）；实际 FieldFrame 使用位于 `variant-field-view.tsx:12,220,242`
- **严重程度**: P2（工具维护漂移；每轮审计产生 3 条可消除候选命中）
- **现状**: allowlist 登记路径未同步文件拆分；`check:audit-fieldframe-bypasses` 持续输出 3 处命中（非 gate 失败，informational）。
- **风险**: 每轮 deep-audit 都需人工复核这条本可消除的候选；未来误清理会破坏已登记 owner 意图。
- **建议**: allowlist 更新为 `variant-field-view.tsx`（或双登记）。
- **误报排除**: 非未登记的直接 FieldFrame 使用——owner 登记存在且语义合规，纯登记路径过期。
- **复核状态**: 维度复核通过

#### [P2] 12-03 field-frame.md 接口文档未列出 FieldFrame 的 `renderer` prop

- **文件**: `packages/flux-react/src/field-frame.tsx:45-47,227`；`docs/architecture/field-frame.md:97-116`
- **严重程度**: P2（owner 文档公开面缺项）
- **现状**: 实现含 `renderer?: string`（渲染为 `data-renderer`），NodeFrameWrapper 实际传入；field-frame.md 接口未列出。
- **风险**: 文档接口缺项误导后续扩展者。
- **建议**: field-frame.md 补 `renderer?: string`（data-renderer debugger 锚点）。
- **误报排除**: field-frame.md 是 active owner 文档且描述同一组件，真实接口缺项。
- **复核状态**: 维度复核通过

### 维度 13：类型安全与动态边界

#### [P2] 13-01 tree mode 空槽位键盘路径 KeyboardEvent 伪装为 MouseEvent，菜单定位坐标 NaN

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:197-203,224-229`
- **严重程度**: P2（类型欺骗 + 可复现运行时后果：NaN 坐标定位）
- **证据片段**:
  ```tsx
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSlotAffordanceClick(e as unknown as React.MouseEvent);  // KeyboardEvent 无 clientX/Y
    }
  }}
  ```
- **现状**: `handleSlotAffordanceClick` 内部读 `e.clientX/clientY`，KeyboardEvent 无此属性恒 undefined → `setPopover({ screenX: undefined })` → `DOMRect.fromRect({ x: undefined })` → NaN → 固定定位菜单出现在 0,0 或视口外。该文件无键盘路径测试。
- **风险**: tree mode 键盘用户（Enter/Space）打开「添加节点」菜单定位错误，与鼠标路径行为不一致。
- **建议**: 拆 `onActivate(source)` 或传显式坐标（元素中心点/getBoundingClientRect）。
- **误报排除**: 2026-05-04 曾裁定同一模式（wrapped-field-action）为 P2 危险——本处是 flow-designer 包内新位置，未被历史审计覆盖；非 schema/Host 动态边界。
- **复核状态**: 维度复核通过

#### [P2] 13-02 公开导出组件 KanbanCard / KanbanColumn 的 `helpers` prop 用 any，内部已有精确类型未使用

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx:18`、`kanban-column.tsx:40`
- **严重程度**: P2（类型擦除致 API 文档缺失；内部已有 `RendererHelpers` 精确类型）
- **证据片段**:
  ```tsx
  helpers?: any;   // 实际传入值为 flux-core 精确导出的 RendererHelpers（render-core.ts:73）
  ```
- **现状**: 两组件经 kanban/index.ts 公开导出，`helpers` 参数类型擦除且无 JSDoc；`helpers?.render(...) as React.ReactNode` 断言可被精确类型消除。
- **风险**: 消费方无法从类型了解可用 API。
- **建议**: 替换为 `Pick<RendererHelpers, 'render'>` 或完整 `RendererHelpers`，删除冗余断言。
- **误报排除**: 非 schema 开放配置/Host 注入——helpers 是渲染引擎注入的标准运行时句柄，内部已有精确类型却未使用。
- **复核状态**: 维度复核通过

### 维度 18：跨包模式一致性

#### [P2] 18-01 flux-bundle 跨包 src 相对导入 + useSyncExternalStoreWithSelector 双实现（全仓唯一门禁盲区）

- **文件**: `packages/flux-bundle/src/use-sync-external-store-shim.ts:5`、`packages/flux-bundle/vite.config.ts:10-11,28`、`packages/flux-react/src/use-sync-external-store-with-selector.ts`、`packages/flux-react/package.json:30`；对照 5 个包（flow-designer-renderers/spreadsheet-renderers/report-designer-renderers/word-editor-renderers/nop-debugger）直接 import npm shim
- **严重程度**: P2（独立复核确认：全仓唯一跨包相对导入 + 双实现重复维护 + 门禁不可见）
- **证据片段**:
  ```ts
  // flux-bundle/src/use-sync-external-store-shim.ts:5
  export { useSyncExternalStoreWithSelector } from '../../flux-react/src/use-sync-external-store-with-selector';
  // scripts/check-workspace-manifest-deps.mjs:10 —— workspaceImportPattern 只匹配 @nop-chaos/ bare specifier
  ```
- **现状**: flux-react 维护 101 行私有 fork（不从 index/unstable 导出）；flux-bundle 经 vite alias 用相对路径直取该私有模块打进 bundle；`check-workspace-manifest-deps` 对相对导入完全不可见；flux-react 声明了从未使用的 `use-sync-external-store` 依赖。上轮维度 01「无内部路径导入」结论的反例。
- **风险**: flux-react 重构/移动该私有模块 → flux-bundle 构建以晦涩错误无声破裂且无 manifest 层耦合可见；双实现各自演化可静默漂移。
- **建议**: 二选一——flux-react 统一改从 `'use-sync-external-store/shim/with-selector'` 导入删除 fork；或把 fork 提升为 flux-react 公共导出、flux-bundle stub 改为 bare specifier、移除未用依赖。
- **误报排除**: 非 calibration 10 放行的内部实现不同——同一 hook 双实现重复维护 + 全仓唯一跨包 src 树相对导入（边界绕过），与已声明基线直接相悖。
- **复核状态**: 子项复核通过（保持 P2）

#### [P2] 18-02 flux-bundle 发布元数据 description 与真实默认注册面不一致（3 族 vs 6 族）

- **文件**: `packages/flux-bundle/package.json:62`（"Default Flux renderer stack (basic + form + data)"）vs `src/index.tsx:36-44`（实际注册 basic/form/form-advanced/data/content/layout 6 族）
- **严重程度**: P2（发布面元数据误导）
- **现状**: description 只列 3 族且未注明 mobile/scheduling/ai/graph 按需注册；README 仅 3 行无补充。
- **风险**: host 按 description 判断默认栈会漏掉三族；IDE/npm view 可见面失真。
- **建议**: 更新 description 与实际注册一致并注明按需注册约定。
- **误报排除**: 非包间差异——同一包内元数据与代码自相矛盾。
- **复核状态**: 维度复核通过

### 维度 20：可访问性 (WCAG)

#### [P2] 20-01 表格列宽调整手柄仅支持指针操作，且以静态 separator 角色暴露交互控件

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:287-297,302-312`（对照 use-column-resize.ts 全文无键盘入口、use-row-drag-sort.ts:205-248 键盘先例）
- **严重程度**: P2（2.1.1 Keyboard (A) / 4.1.2 Name, Role, Value (A)；复核确认）
- **证据片段**:
  ```tsx
  <span data-slot="table-column-resize-handle" aria-label={t('flux.table.resizeColumn')}
        role="separator" aria-orientation="vertical" onPointerDown={resizeStart} ... />
  ```
- **现状**: 列宽调整是公开功能（resizable schema 属性）但只能鼠标/触摸完成；role="separator" 非交互角色，AT 完全不知道可拖拽；`use-column-resize.ts` 仅挂 window pointermove/pointerup。
- **风险**: 键盘用户（含运动障碍）无法调整列宽；读屏把交互控件播报为静态分隔线。
- **建议**: 加 tabIndex + ArrowLeft/ArrowRight 步进（沿用 use-row-drag-sort.ts:205-248 先例），或改真实 button + aria-valuenow。
- **误报排除**: 非 shadcn 偏好类报告——2.1.1 Level A 硬性失败 + 仓库内已有同类键盘实现先例（H6 注释明确引用 WCAG 2.1.1）。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 20-02 CRUD 无限滚动状态文本无 aria-live 通知区域

- **文件**: `packages/flux-renderers-data/src/crud-infinite-scroll-area.tsx:25-36`（对照 mobile `infinite-scroll.tsx:232-268` 正确先例）
- **严重程度**: P2（4.1.3 Status Messages (AA)；复核确认）
- **证据片段**:
  ```tsx
  <div data-slot="crud-infinite-status">
    {loadDataOnce ? t('flux.crud.loadedAll', ...) : atLastPage ? ... : infiniteState.error ? ... : ...}
  ```
- **现状**: 加载更多/已加载完毕/加载失败状态文本动态替换但无 `role="status"`/`aria-live`；同仓 mobile infinite-scroll 已正确实现。
- **风险**: 读屏用户不知道列表正在加载/已失败，只能看到静默列表增长/停滞。
- **建议**: 加 `role="status"` + `aria-live="polite"`（错误态可加 aria-atomic）。
- **误报排除**: 动态状态变更无 live region 是 4.1.3 直接失败；同仓两处正确先例（infinite-scroll、table-loading-overlay）。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 20-03 notice-bar 跑马灯/轮播文本无限运动，无暂停机制（内容轮换不响应 reduced-motion）

- **文件**: `packages/flux-renderers-mobile/src/notice-bar.tsx:139-156,225-243`（对照 `flux-renderers-content/src/carousel.tsx:87-168` 完整先例）
- **严重程度**: P2（2.2.2 Pause, Stop, Hide (A)；复核确认并修正表述）
- **证据片段**:
  ```tsx
  style={shouldScroll ? { animationName: 'nop-notice-bar-marquee', animationDuration: `${animationDuration}s`,
    animationIterationCount: loop ? 'infinite' : '1', ... } : undefined}
  ```
- **现状**: scrollable+loop（默认）无限滚动；多文本模式每 3 秒自动切换；无 mouseenter/focusin 暂停、无 prefers-reduced-motion 检查。复核修正：CSS 动画在 reduced-motion 下有全局兜底（`ui/src/styles/base.css:31-39` 压 animation-duration 至 0.01ms + iteration-count 1），但 3 秒轮播内容切换（setTimeout）不受影响。
- **风险**: 前庭障碍/运动敏感用户无法暂停持续 5 秒以上的自动运动内容；2.2.2 Level A。
- **建议**: 参照 carousel.tsx：hover/focus 暂停 tick 与动画（animation-play-state）+ prefers-reduced-motion 停用轮播。
- **误报排除**: 非装饰性实现细节——自动开始持续运动且无暂停机制直接命中 2.2.2；同仓 carousel 正确实现可对照。
- **复核状态**: 批量复核通过（保持 P2，表述修正已记录）

#### [P2] 20-04 steps 组件 finish/error 状态指示按钮无 accessible name

- **文件**: `packages/flux-renderers-layout/src/steps-renderer.tsx:262-282`
- **严重程度**: P2（4.1.2 Name, Role, Value (A)；复核确认 lucide aria-hidden 行为）
- **证据片段**:
  ```tsx
  <Button variant="ghost" data-slot="steps-indicator" data-status={status} aria-current={isCurrent ? 'step' : undefined} onClick={...}>
    {status === 'finish' ? <CheckIcon className="size-4" /> : status === 'error' ? <XIcon className="size-4" /> : index + 1}
  </Button>
  ```
- **现状**: finish/error 步骤按钮内容仅 lucide 图标；lucide-react 无 a11y prop 时自动 `aria-hidden="true"`（依赖源码确认 Icon.mjs:36）；Button 无其他命名来源 → 可聚焦按钮 accessible name 为空；步骤标题在兄弟 span 未关联。
- **风险**: 读屏用户 Tab 到无名按钮不知对应哪一步；状态语义（勾选/错误）丢失。
- **建议**: 加 `aria-label`（如 `${t('flux.steps.step')} ${index+1}: ${item.title}`）或 aria-labelledby 关联标题。
- **误报排除**: 空 accessible name 可聚焦控件是 4.1.2 硬性失败；lucide 行为在依赖源码核实非推测；同仓库 wizard 导航按钮因含标题文本而正确，属 steps 独有遗漏。
- **复核状态**: 批量复核通过（保持 P2）

#### [P2] 20-05 transfer 组件把含 Checkbox 的列表误标为 role="listbox"

- **文件**: `packages/flux-renderers-form-advanced/src/transfer-renderer.tsx:418-441`
- **严重程度**: P2（4.1.2/1.3.1；listbox 必需子角色 option 全缺失）
- **证据片段**:
  ```tsx
  <ul className="flex flex-col" role="listbox" aria-multiselectable={props.multiple ? 'true' : undefined}>
    {props.options.map((option) => (<li key={...}><Label><Checkbox .../></Label></li>))}
  ```
- **现状**: role="listbox" 要求子节点 role="option"，实际 li 无 option 角色、交互元素是 Checkbox；`aria-multiselectable` 落在无 option 子节点的容器上。
- **风险**: 读屏播报「列表框，可多选」但无 option 节点，listbox 方向键导航语义不存在。
- **建议**: 移除 role="listbox"/aria-multiselectable（Checkbox 已表达勾选语义），或完整实现 listbox 模式。
- **误报排除**: ARIA 角色与内容结构不匹配是确定性结构问题。
- **复核状态**: 批量复核通过

#### [P2] 20-06 ai-attachments 图片模式移除按钮在键盘聚焦时不可见

- **文件**: `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:299-309`（对照卡片模式 :313-341 无此问题、condition-item.tsx:182 先例）
- **严重程度**: P2（2.4.7 Focus Visible (AA)）
- **证据片段**:
  ```tsx
  <Button type="button" variant="ghost" size="sm"
    className="absolute right-0 top-0 h-5 w-5 p-0 opacity-0 group-hover:opacity-100" ...>
  ```
- **现状**: 图片附件移除按钮非 hover 态 opacity-0 且无 `focus:opacity-100`；按钮仍在 Tab 序中，键盘聚焦时含 focus ring 整体透明。
- **风险**: 键盘用户聚焦到不可见元素，无法确认焦点位置。
- **建议**: 补 `focus-visible:opacity-100`。
- **误报排除**: 与 11-01 的 role=button 键盘劫持是不同问题（本条目仅聚焦可见性），不重复展开。
- **复核状态**: 批量复核通过

#### [P2] 20-07 markdown 编辑器工具栏 role="toolbar" 未实现 roving tabindex/方向键导航

- **文件**: `packages/flux-renderers-form/src/renderers/markdown-editor-renderer.tsx:227-254`
- **严重程度**: P2（APG Toolbar 组合控件模式偏差）
- **现状**: role="toolbar" 下 15 个 Button 全部为独立 tab stop，无 roving tabindex、无 ArrowLeft/Right；jsx-a11y 的 no-redundant-roles 等规则不覆盖 toolbar 模式。
- **风险**: 读屏「工具栏」语义与实现不匹配；方向键浏览工具组合缺失（功能本身可键盘操作，无 2.1.1 失败）。
- **建议**: 实现 roving tabindex + 方向键，或去掉 role="toolbar" 退化为普通按钮组。
- **误报排除**: 组合控件角色与实现不匹配的结构性问题，非风格判断。
- **复核状态**: 批量复核通过

#### [P2] 20-08 list-renderer 在 role="listitem" 上使用 aria-selected

- **文件**: `packages/flux-renderers-data/src/list-renderer.tsx:124-145`
- **严重程度**: P2（4.1.2；ARIA 1.2 不支持 listitem 角色的 aria-selected）
- **证据片段**:
  ```tsx
  <div data-slot="list-item" role="listitem" aria-selected={selectionMode !== 'none' ? selected : undefined} ...>
  ```
- **现状**: aria-selected 仅支持 option/row/gridcell/tab/treeitem 等角色；listitem 上该属性被 AT 忽略，选中态仅靠视觉（bg-primary/10）传达。
- **风险**: 列表选中状态对读屏完全不可见。
- **建议**: 可选中时用 role="listbox"+option（配 roving tabindex 或 aria-activedescendant），或改用 aria-current/删除无效属性。
- **误报排除**: 属性用在错误角色上是确定性 ARIA 规范问题；选中态是产品功能（selectionMode）。
- **复核状态**: 批量复核通过

#### [P2] 20-09 wizard 步骤切换后无焦点移动也无步骤变更通知

- **文件**: `packages/flux-renderers-layout/src/wizard-renderer.tsx:235-267,561-579`
- **严重程度**: P2（APG wizard 最佳实践缺失；复核确认无硬性 SC 失败，锚点弱）
- **现状**: goToStep 仅 setInteraction/setFurthestReached/onChange dispatch；步骤体无焦点目标、无 aria-live 播报；aria-current="step" 更新不被多数读屏宣布。
- **风险**: 读屏用户点「下一步」后听不到任何反馈，需手动 Tab 进新步骤表单。
- **建议**: 步骤切换后焦点移入新步骤体首个可聚焦元素，body 提供 role="status"/aria-live 短播报。
- **误报排除**: 焦点未丢失（未跳 body），但本维度任务明确要求抽查步骤切换焦点合理性，当前实现确无任何焦点/通知处理。
- **复核状态**: 批量复核通过

#### [P2] 20-10 crud 工具栏分页 PaginationPrevious 缺少 aria-disabled（与同文件 Next 不对称）

- **文件**: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx:128-151`（对照 :145-149 Next 有 aria-disabled、table-pagination-bar.tsx:83,141）
- **严重程度**: P2（4.1.2；可达性树禁用状态失真）
- **证据片段**:
  ```tsx
  <PaginationPrevious
    onClick={() => onPageChange(Math.max(1, pagination.currentPage - 1))}
    className={pagination.currentPage <= 1 ? 'pointer-events-none opacity-50' : undefined}
  />
  ```
- **现状**: 首页时 Previous 仍可聚焦可激活（pointer-events-none 只挡鼠标），无 aria-disabled；同文件 Next 与 table-pagination-bar 均正确设置。
- **风险**: 读屏以为 Previous 可点击，操作静默无效。
- **建议**: 与 Next 对称补 aria-disabled，onClick 边界直接 return。
- **误报排除**: 同组件族内两种处理并存，构成可定位遗漏而非设计差异。
- **复核状态**: 批量复核通过

### 维度 22：集成接线与可操作性（P2 部分）

#### [P2] 22-04 kanban controlled 模式 `onColumnAdd` 恒派发，违反文件自身契约注释

- **文件**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:367-380`（对照 :50-53 契约声明、:292-294/:338-340/:351-353 守卫先例）
- **严重程度**: P2（事件/ownership：controlled 模式静默丢弃写操作却派发「已添加」事件）
- **证据片段**:
  ```tsx
  // :50-53 契约声明：controlled 模式 mutation 被丢弃，mutation 事件不得声称未发生的变化
  // :375-377 —— onColumnAdd 无 isControlled 守卫
  handleSetBoardData(newBoard, 'addColumn', {...});
  const colAddPayload = { columnId, index: rootChildren.length };
  void events.onColumnAdd?.(colAddPayload, eventCtx(colAddPayload));
  ```
- **现状**: 同文件 onCardAdd/onCardRemove/onColumnReorder 都带 `if (!isControlled)` 守卫，onColumnAdd 漏网。
- **风险**: controlled 模式点「+添加列」→ 对话框关闭、列未添加、宿主收到 onColumnAdd 声称已添加 → 宿主与 UI 状态不一致。
- **建议**: onColumnAdd 补 `if (!isControlled)` 守卫；考虑 controlled 模式只读反馈。
- **误报排除**: 直接违反本文件自述契约，非设计决定；不在豁免名单内。
- **复核状态**: 维度复核通过

#### [P2] 22-05 calendar `print`/`exportPNG` reaction ready() 后全包无任何派发点：声明即死的动作契约

- **文件**: `packages/flux-renderers-scheduling/src/calendar/calendar.tsx:175-181` + `scheduling-renderer-definitions.ts:160-161`
- **严重程度**: P2（句柄/reaction 接线：ready 但永不 dispatch）
- **证据片段**:
  ```tsx
  useEffect(() => {
    for (const key of ['print', 'exportPNG', 'importICal', 'exportToICal']) {
      props.reactions[key]?.ready();
    }
  }, [props.reactions]);
  ```
- **现状**: 四个 reaction 挂载即 ready()，但 calendar 包内无任何 `reactions.*.dispatch()` 调用（grep 全包仅 gantt.tsx:417-419 有派发）；组件句柄 component:exportToPNG 只执行 exportRef 不派发声明的 exportPNG action；print/exportPNG 未标注 @reserved（importICal/exportToICal 标注了）。
- **风险**: schema 作者声明 print/exportPNG action 永不触发；注释声称「actions fire」与实际不符。
- **建议**: 句柄 invoke 路径补 `props.reactions.exportPNG?.dispatch()`/`print?.dispatch()`；或按 importICal 同样标注 @reserved 并澄清。
- **误报排除**: 上轮 19-2（8e35766d）修复的是 exportToPNG 错误传播（handle 返回 ok/error），本发现是 reaction 派发通道缺失，不同链路；calendar.test.tsx:282-293 只断言 ready() 被调。
- **复核状态**: 维度复核通过

#### [P2] 22-06 graph `layout` schema prop 仅挂载时生效，运行时 prop 变化不再同步 store

- **文件**: `packages/flux-renderers-graph/src/graph-renderer.tsx:80,98`（对照 :133-147 只同步 minZoom/maxZoom/nodes、:609-611 按钮直改路径）
- **严重程度**: P2（schema→store 接线：单向初始化缺口）
- **证据片段**:
  ```tsx
  const layout = isGraphLayout(resolved.layout) ? resolved.layout : 'flow';
  const [store] = useState(() => createGraphStore({ layoutMode: layout }));
  ```
- **现状**: createGraphStore 在 useState 一次性创建；layout prop 变化无 effect 调 setLayoutMode（同文件 effect 只同步 minZoom/maxZoom/nodes）。
- **风险**: 宿主通过表达式/数据源把 layout 从 flow 切成 hierarchy 时图形布局不变——schema 驱动切换静默失效（按钮切换正常）。
- **建议**: 增加 layout 同步 effect（值不等才 setLayoutMode）+ 测试。
- **误报排除**: graph 是 G1 新包；store 的 layoutMode 是受控状态，prop 与 store 单向初始化缺口无文档裁定；gantt 有 prop→store 同步先例。
- **复核状态**: 维度复核通过

#### [P2] 22-07 gantt 数据变更路径（编辑器保存 / 行内编辑 / 键盘删除）无任何事件外抛

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt-editor.tsx:33-53`、`gantt-grid.tsx:67-70`、`use-gantt-keyboard.ts:94-107`（对照 gantt.types.ts:179-191 事件契约）
- **严重程度**: P2（事件闭环缺口：编辑型变更对宿主完全静默）
- **证据片段**:
  ```tsx
  // gantt-editor.tsx:51-52 —— 保存只写 store
  commitTask(editingTaskId, partial);
  closeEditor();
  // gantt-grid.tsx:67-70 —— 行内提交只写 store
  const handleCellCommit = (taskId, column, value) => {
    store.updateTask(taskId, { [column]: value });
    setEditingCell(null);
  };
  ```
- **现状**: 编辑器保存、行内单元格提交、键盘 Delete 都直接 store 写入，不派发 schema 事件；gantt.types.ts 未声明 onTaskEdit/onTaskChange；拖拽/键盘移位有 onTaskDragEnd。
- **风险**: 依赖 onTaskDragEnd 做数据同步的集成会漏掉全部编辑型变更。
- **建议**: 新增 onTaskEdit 事件并在三处派发，或 design doc 显式声明「编辑变更不对外派发」契约。
- **误报排除**: gantt 事件契约是当前 live 契约，缺失编辑事件是真实闭环缺口；无历史裁定豁免。
- **复核状态**: 维度复核通过

#### [P2] 22-08 kanban `columnsOrderOwnership`/`columnsOrderStatePath` 设计文档契约零代码消费

- **文件**: `docs/components/kanban/design.md:130-131,229,265` vs `packages/flux-renderers-scheduling/src/kanban/kanban.types.ts:43-78`、`scheduling-renderer-definitions.ts:64-105`
- **严重程度**: P2（文档契约与 live 代码双向漂移）
- **现状**: design.md 声明列排序 ownership 三态 + statePath（scope-owned），但全仓 grep `columnsOrder` 零命中——TS 类型、definitions、board 组件均无此字段；列顺序只能随 boardData（kanbanStatePath）整体走 scope。
- **风险**: 集成者按设计文档声明该字段被静默忽略，列排序既不进 scope 也不回推。
- **建议**: 二选一——在 board 层实现该三态，或从 design.md 删除/标注 @reserved。
- **误报排除**: reopened 裁定文档无此条；属文档契约与 live 代码双向漂移的真实误导成本。
- **复核状态**: 维度复核通过

#### [P2] 22-09 graph 事件派发 ctx 缺 `evaluationBindings`/`event`，action args 模板 payload 键不可解析

- **文件**: `packages/flux-renderers-graph/src/graph-renderer.tsx:152-159`
- **严重程度**: P2（CX-10 / bug-83 约定一致性）
- **证据片段**:
  ```ts
  void handler(fullPayload, { scope: props.node.scope }); // ← 缺 event/evaluationBindings 约定字段
  ```
- **现状**: scheduling 全家与 timeline 均「payload 兼作 bindings」使 `${nodeId}` 可解析；graph 只传 scope。
- **风险**: graph 的 onNodeClick/onSelectionChange action args 写 `${nodeId}` 解析为 undefined（只能写 `${event.nodeId}`），与其余组件行为不一致。
- **建议**: 补 `event: fullPayload, evaluationBindings: fullPayload`。
- **误报排除**: 事件本身有派发（非历史接线问题），本发现是 payload 约定一致性问题，项目内有多处先例与文档基线。
- **复核状态**: 维度复核通过
- **修复状态**: fixed（2026-08-06，plan `docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md` Phase 4：`graph-renderer.tsx:158` 补 `event: fullPayload, evaluationBindings: fullPayload`；onNodeClick/onSelectionChange 契约测试实证 `${nodeId}`；`check:audit-event-dispatch-ctx` 门禁动态索引形态覆盖）。

#### [P2] 22-10 gantt `zoomLevels`/`cellWidth`/`taskBarHeight` prop 运行时变化不生效

- **文件**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:34-51,62,79-101`
- **严重程度**: P2（schema→store 接线：配置字段仅挂载生效）
- **现状**: createInitialStore 一次性读取配置；re-seed effect 只覆盖 tasks/links/resources/assignments；运行时 zoomLevels/cellWidth/taskBarHeight 变化被忽略。
- **风险**: 宿主动态调整缩放配置/单元宽度（如按设备下发 cellWidth）gantt 不响应。
- **建议**: re-seed effect 补配置字段同步，或文档标注「配置字段仅挂载生效」。
- **误报排除**: 挂载期接线是通的（非 22-1 家族漏传）；仅剩运行时同步缺口，低优先真实问题。
- **复核状态**: 维度复核通过

#### [P2] 22-11（R2 深挖）wizard 全部 schema 事件派发 ctx 缺 evaluationBindings/event，action args 模板 payload 键不可解析

- **文件**: `packages/flux-renderers-layout/src/wizard-renderer.tsx:259-266（onChange）、:321-329/:354-362/:395-404（onStepError）、:336-343（onStepCommit）、:374-381（onComplete）`
- **严重程度**: P2（与 22-09 同型；同文件内两套标准并存）
- **证据片段**:
  ```tsx
  // :259-266 —— 仅 scope，无 event/evaluationBindings
  void props.events.onChange?.(
    { type: 'wizard:change', currentStepKey: targetKey, currentStepIndex: targetIndex },
    { scope: props.node.scope },
  );
  // 对照组：steps/timeline/button-group/collapse 均为 { event, evaluationBindings, scope } 全量 ctx
  ```
- **现状**: 同族 steps/timeline/button-group 全部带全量 ctx；wizard 自身 beforeEnter/beforeLeave 守卫派发都带 evaluationBindings（:199-223）；6 个派发点缺。机制确认：`getEvaluationScope`（action-core.ts:206-208）只合并 evaluationBindings + scope，args 模板只读 evaluationBindings。
- **风险**: wizard 事件 action 里 `${currentStepKey}`/`${currentStepIndex}` 模板解析为 undefined；wizard 审计卡 dim 7 未检查 ctx 注入、e2e 不解析 args 模板——未被任何既有审计覆盖。
- **建议**: 6 个派发点补 `{ event, evaluationBindings, scope }`；补契约测试（先红后绿）。
- **误报排除**: 非「Seed only」类文档化设计；同文件 beforeEnter/beforeLeave 带 bindings 证明是遗漏而非设计差异。
- **复核状态**: 未复核（R2 深挖新增，建议并入 22-09 修复计划后由修复测试锁定）
- **修复状态**: fixed（2026-08-06，plan `docs/plans/2026-08-06-2306-1-event-dispatch-ctx-full-scan.md` Phase 4：`wizard-renderer.tsx` 6 点补 `{ event, evaluationBindings, scope }`；契约测试实证 `${currentStepKey}` 解析（onChange/onStepCommit/onComplete/onStepError 四类事件）；wizard design.md 事件契约节同步；`check:audit-event-dispatch-ctx` 门禁覆盖）。

#### [P2] 22-12（R2 深挖）kanban 设计文档声明的 7 个 `component:*` 句柄零代码注册，运行时全部不可达

- **文件**: `docs/components/kanban/design.md:286-292`（契约声明）vs `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`（全文件 `rg "componentRegistry|ComponentHandle|register\("` 零命中）vs `scheduling-renderer-definitions.ts:57-106`（kanban 条目无 componentCapabilityContracts）；playground example.json:40,74 还在使用 `component:addCard`
- **严重程度**: P2（与 22-08 同型：文档承诺 + 代码缺失的 phantom 态；同族 gantt/calendar 均已注册）
- **证据片段**:
  ```
  design.md:286-292：component:scrollToCard(cardId) / component:scrollToColumn(columnId) /
  component:addCard(...) / component:removeCard(...) / component:moveCard(...) /
  component:collapseColumn(...) / component:getData()
  ```
- **现状**: gantt.tsx:303-345 与 calendar.tsx:194-252 均经 useCurrentComponentRegistry 注册（带 componentCapabilityContracts）；kanban 是 scheduling 家族唯一零句柄组件。C9 审计卡 dim 17 将 component:addCard phantom 记为文档漂移留痕，closure 决策「No owner-doc update required」——代码侧缺口从未路由。
- **风险**: schema 中 `component:addCard` 等 action 运行时 capability 解析失败；playground example.json 用法实际不可运行。
- **建议**: 按 gantt/calendar 模式注册 ComponentHandle（至少 addCard/removeCard/moveCard/collapseColumn/getData），或显式将 design.md §8 降级为「未来能力」并同步 example.json。
- **误报排除**: 非 22-08 重复（22-08 针对 columnsOrder\* 字段）；C9 卡仅以文档漂移留痕未做代码侧处理，本轮 R1 未收录。
- **复核状态**: 未复核（R2 深挖新增，建议与 22-08 合并裁决）

---

## 5. 零发现结论

### 维度 06（异步模式与取消安全）—— 零新发现

初审 agent 对 `pnpm check:audit-async-failure-paths` 全部 200 条 suspect 过筛 + owner 路径逐项复核后零发现，并已复核确认以下重点候选放行理由：

- `lazy-renderer-component.tsx:34`（then-chain-no-catch）：React lazy() 契约——reject 在 render 阶段重抛被 error boundary 捕获，响亮失败非吞掉。
- 19-1/19-2 修复残余（tree-session.ts、calendar.tsx）：已修复（commit d6e4b5a6/8e35766d），live 确认无新残余。
- `dynamic-renderer.tsx:179`（void run()）：P5 F4 修复形态（per-invocation controller + abort 复查 + 结构化错误态 + 回归测试锁定）。
- `use-dict-options.ts:29`（void loadDict）：.catch 设用户可见 errorMessage + genRef 代际守卫丢弃过期响应。
- `pull-refresh.tsx:146`：.catch → 状态回 normal（用户可见恢复）；isMountedRef 仅卸载后闪烁保护（不承载取消语义）。
- `wizard-renderer.tsx:450`（void goToStep）：内部 try/catch 不会 reject；双击竞态为 C5.1 已裁定 P3 keep。
- `upload-field.tsx:440`（void handleFiles）：performUpload 全量 try/catch/finally + 每文件 AbortController + unmount 批量 abort。
- DataSource/ApiDataSource：轮询 stop() 清 pollTimer + abort 全部 activeControllers；requestSequence 处理 out-of-order；refreshDedup 三模式。
- form init/load（form.tsx:400-452,469-519）：P5 F5 修复形态（inFlightInitKeyRef + initActionAbortRef 身份守卫 + cleanup 清标记）。
- 提交并发保护在方法入口：`form-runtime-submit-flow.ts:249`（'Submit already in progress'）live 验证通过。
- P5 双取消层、布尔标记仅 UI 保护、结构化上报（reportRuntimeHostIssue/reportStorageError/reportRecoveryLoadError）全部落地。

### 其他零发现面（各维度 R1 已核查）

- **维度 04**：复杂表单字段（array-field/combo/input-table/transfer/upload/picker/tree-controls）、Surface/Dialog/Drawer（reopened #2 已收口无新残余）、设计器（designer-page-inner/tree-session/report-designer/spreadsheet/word-editor）均无新双状态或同步链。
- **维度 05**：useSyncExternalStore 全景、表单字段 per-path 订阅（P7 合规，form-store.ts:275-323 真 per-path）、NodeRenderer 父子重渲染、useEffect 大对象依赖均零发现。
- **维度 09**：RendererComponentProps 模式、compile-once（工具零命中）、store 直访、ad-hoc context、BEM（零命中）、data-testid/cid、regions.render key、事件 void 模式全部合规。
- **维度 10**：142 个裸 [data-slot] 命中全部落在两个自绘面（spreadsheet canvas hybrid 策略、ai 家族 AI-29 裁定模式）；marker class/classAliases/间距约定/主题独立性/Tailwind @source（含 graph 包）全部合规。
- **维度 11**：原生 button/role=button 宿主表面、input[type=file/hidden]、spreadsheet/gantt/table 虚拟化表面均属明文例外；导入模式与 radix 容器化正确。
- **维度 12**：field metadata 规则类型、value-or-region 编译决策（node-compiler.ts:185-221）、event 字段、deep region extraction、render props 合成、FieldFrame 集成全部合规（variant-field allowlist 命中为登记路径过期而非契约违规）。
- **维度 13**：多重断言链零处；@ts-ignore/ts-expect-error 零处（eslint ban-ts-comment 门禁）；flux-runtime 生产代码零 any。
- **维度 18**：10 个 renderer 包注册模式统一；4 个 domain core 包均无 react 依赖；事件 void 模式 91 处一致；reportRuntimeHostIssue 统一上报入口；store 创建模式一致；i18n 无裸中文。
- **维度 20**：表单字段基础 ARIA、验证焦点管理、自定义交互组件键盘操作、模态焦点陷阱、语义化 HTML、已裁定条目复核全部通过。

---

## 6. 跨维度模式

1. **事件 ctx 注入缺口家族（维度 22，3 条：22-09/22-11 + 已修复先例）**：graph 与 wizard 的事件派发 ctx 缺 `event`/`evaluationBindings`，导致 action args 模板键解析为 undefined。CX-10/bug-83 约定已覆盖 scheduling 全家与 timeline，但新包（graph G1、layout wizard）未对齐——跨包契约执行不一致，建议统一纳入一次「事件 ctx 全量扫描」修复计划。
2. **「文档承诺 + 代码缺失」phantom 契约家族（维度 22，2 条：22-08/22-12）**：kanban design.md 声明的 columnsOrder* 字段与 7 个 component:* 句柄零代码消费。同族 C9 卡仅留痕未路由。建议一次裁决：实现 or 降级文档，二选一。
3. **createScope/disposeScope 配对纪律（维度 09，2 条 10 处）**：一次性求值路径普遍不配对 dispose，与同包正确先例（upload/list/crud/row-scope-cache）并存。建议并入一个统一修复计划 + 在 renderer-runtime.md 强化「一次性求值优先 evaluationBindings」指引。
4. **useScopeSelector 门控不全家族（维度 05，3 条 12 处）**：paths/enabled 选项存在但 scheduling 与 table/list/crud 控制 hooks 未使用（死订阅/全量订阅）。低成本批量修复。
5. **订阅精度 → 接线失效的因果链（22-03 + 05-01）**：kanban 同时存在「data prop 不重灌」（P1）与「scope 订阅无 paths」（P2），修复 22-03 时建议一并收紧 05-01。

## 7. 高频问题文件

| 文件                                                                            | 出现维度       | 发现数                               |
| ------------------------------------------------------------------------------- | -------------- | ------------------------------------ |
| `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`                | 05、22         | 3（05-01、22-03、22-04、22-12 相关） |
| `packages/flux-renderers-scheduling/src/gantt/*`（header/grid/keyboard/editor） | 22             | 5（22-01/02/07/10）                  |
| `packages/flux-renderers-scheduling/src/calendar/*`                             | 05、22         | 2（05-02、22-05）                    |
| `packages/flux-renderers-graph/src/graph-renderer.tsx`                          | 22             | 2（22-06、22-09）                    |
| `packages/flux-renderers-layout/src/wizard-renderer.tsx`                        | 20、22         | 2（20-09、22-11）                    |
| `packages/flux-renderers-data/src/table-renderer/*`                             | 04、05、09、20 | 5（04-01、05-03、09-01/02、20-01）   |
| `packages/spreadsheet-renderers/src/*`                                          | 10             | 2（10-01、10-02）                    |
| `packages/flux-renderers-ai/src/renderers/ai-attachments.tsx`                   | 11、20         | 2（11-01、20-06）                    |

## 8. 已自动化的检查项（不需人工跟进）

- compile-once 硬门禁（`check:audit-runtime-raw-schema-reads` 零命中）
- renderer marker 门禁（`check:audit-missing-renderer-markers` 零命中）
- manifest 依赖门禁（`check:workspace-manifest-deps` exit 0）
- oversized 门禁（14 文件全为已登记治理债，零新增）
- eslint ban-ts-comment / no-eval / no-new-func / jsx-a11y 基础规则（均通过）

## 9. 建议新增的自动化检查

1. **跨包相对路径导入门禁**（18-01 暴露盲区）：`check-workspace-manifest-deps` 增加 `from '...(\.\./)+(<pkg>/src)/...'` 相对路径模式，使 flux-bundle 类边界绕过可见。
2. **reaction ready 无 dispatch 检查**（22-05）：启发式扫描 `reactions[key]?.ready()` 存在但同组件内无 `reactions.*.dispatch` 调用。
3. **事件 ctx 完整性检查**（22-09/22-11）：扫描 `props.events.xxx?.(payload, {` 后缺少 `evaluationBindings`/`event` 键的派发点。

## 10. 误报排除清单（复核中判定不报告）

- 裸 `[data-slot]` 选择器 142 命中（spreadsheet/ai 自绘面，owner 文档支撑）
- graph-renderer 15 处 `store.getState()`（全部在事件/capability 回调内）
- render-nodes.tsx:352 `readOwn()`（useLayoutEffect 内，commit-safe）
- condition-builder.tsx:203 投影缓存查询（H30 设计）
- wrapped-field-action（adjudication 1 范围：无新键盘/ARIA/disabled 证据；已迁移真实 Button）
- use-table-row-scope-cache 每渲染 new Map 快照（测试锚定的有意设计 + Compiler 记忆化）
- table-body-row-rendering.tsx:550 手写 React.memo（H10 注释说明 Compiler 测试环境限制）
- mobile 家族裸事件 type（审计卡锁定基线）
- calendar `(resolved as any).data` 兼容分支（C-DRIFT-01 已裁定）
- diff-view reaction ready 无 dispatch（P1-4 已裁定 dependsOn 反应式契约，有 e2e 实证）
- calendar 5 个 @reserved 事件（显式文档化预留）

---

## 11. 汇总

| 优先级 | 数量 | 驱动              | 说明                                                                      |
| ------ | ---- | ----------------- | ------------------------------------------------------------------------- |
| `[P0]` | 0    | —                 | 无 blocking 级发现                                                        |
| `[P1]` | 3    | 修复计划          | 22-01 gantt 缩放双触发、22-02 gantt 键盘误删任务、22-03 kanban 异步空面板 |
| `[P2]` | 42   | follow-up backlog | 含 3 条 P1 候选复核修正；无 P2-only 审计                                  |

**总评**: 上轮（08-05）审计的 P0/P1 修复已全部落地（manifest 门禁清零、dead 组件删除、tree-session/calendar 修复、文档漂移修正），本轮未发现新的 CI 红线或安全类问题。核心风险集中在 scheduling 家族交互组件（gantt 键盘/缩放、kanban 数据重灌）——3 条 P1 均为用户首触即现的功能性缺陷且全部无测试覆盖，建议优先修复并补齐回归测试（先红后绿）。跨包契约一致性问题（事件 ctx、phantom 文档契约、跨包相对导入）建议以家族为单位一次性收敛。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
