# 2026-09-29 性能与 UI/UX 深度优化分析报告（第二轮）

> Status: final
> Last Reviewed: 2026-09-29
> Source: 四路独立探索 agent 代码审计（表单/基础/编译链性能、scheduling/AI/mobile/content 性能、UX-a11y 未覆盖面、遗留 Deferred + e2e + check/bundle 现状核对）+ 关键 finding 执行者抽查复核
> Related: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（第一轮，7/7 plans completed）、`docs/architecture/performance-design-requirements.md`

## 目的

第一轮批次（2026-09-28，7 plans）已收口表达式编译缓存、表格/选择器热点、bundle、表单 a11y、视觉一致性、作用域级联与 VirtualBody 缺陷。本报告对**第一轮未深查的面**做第二轮深度分析：scheduling / AI / mobile / content / form 热路径 / 核心管线残余、UX-a11y 未覆盖组件族、以及第一轮显式 Deferred 项与 9 个 pre-existing e2e 失败的现状。所有 finding 均经实现代码核验（HIGH 项另经执行者抽查复核），与既有门禁基线区分。

## 方法与输入

1. **静态门禁核对**：`pnpm check` exit 0（2026-09-29 于 HEAD 92be6e58d 复测，16 子检查全过）；`find-styling-suspects` 221 hits 与登记基线零漂移。
2. **性能审计三路**：① flux-renderers-form / basic / flux-action-core / flux-compiler / flux-core / flux-react 残余热路径；② scheduling / ai / mobile / content / layout / data 遗留项 / designer 包。
3. **UX-a11y 审计一路**：basic / content / mobile / ai / form 残余 / ui 包 / i18n。
4. **现状核对一路**：Deferred 项 live 状态、9 个 pre-existing e2e 失败归属、bundle 产物、审计脚本计数。
5. **执行者抽查**：kanban 无 memo（grep 证实）、smartScaling 仅导出未调用、tabs 关闭控件 aria-hidden span、parseDate 每 call tokenize+new RegExp——四个 HIGH 证据全部复核成立。

**React Compiler 上下文**：playground 构建全局启用 compiler（`apps/playground/vite.config.ts:15`），仅 6 文件 `'use no memo'` 豁免。本轮 finding 已剔除"编译器可自动 memo 的内联分配"类误报，聚焦 (a) 编译器不可达的运行时/非 React 代码，(b) 输入真实变化导致的无界重算，(c) 豁免文件。

---

## 一、性能 Findings（按用户可见影响排序）

### R2-P1 [HIGH] AI 流式 markdown：每 chunk 全量重解析 + sanitize + 高亮（总成本 O(n²)）

- `flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:42-67`——每次渲染对**全部累计内容**跑 `preprocessMathDelimiters(safeMarkdownSlice(raw))` → DOMPurify `sanitizeHtml` → ReactMarkdown（remarkGfm+remarkMath+rehypeRaw+rehypeKatex）完整 mdast/hast 重建；`:249` 每个围栏代码块每轮重跑 lowlight 高亮。
- `markdown-buffer.ts:36-60,111-136`——`safeMarkdownSlice` 无状态重算：5 遍独立 `matchAll` 全文扫描 + `computeCodeRegionMask`（每 chunk 分配 `Uint8Array(text.length)` + 全文 split 行扫描）。
- 驱动：`use-engine-view.ts:132-144` 内容 tick 使 bubble 每 chunk 重渲染。50KB 回答 ×200 chunk ≈ 200 次全量管线（且长度递增）。
- **修复方向**：bubble 解析按 ~60-100ms 节流（rAF/timer 门控）；和/或按最后稳定块边界切分冻结前缀只解析增量。chunk 合并是最低成本的 10-50× 赢面。

### R2-P2 [HIGH] Calendar month view：冲突检测 O(资源×42 天×事件) 内联组件体；展开时二次全量定位；拖拽每 mousemove 全树重渲染

- `calendar-month-view.tsx:71-84`——`conflictMap` IIFE 三重循环，每次 `detectConflicts`（`calendar-layout-utils.ts:170-217`）对**整个 events 数组** filter + 每 event 每 cell `isoStr.split('T')`（`:219-233`）。50 资源 × 42 cell × 5000 事件 ≈ 10.5M 次迭代/渲染。
- `:105-107`——任一 cell 展开时每 render 跑第二遍全量 `positionEventsInMonth`（与 `:69` 的第一遍并存）。
- `use-calendar-drag.ts:106-133`——pointermove 每次无条件两次 `setDragState` → 整棵 Calendar 树重渲染（ghost 读 `dragState.currentX/currentY`），month view 的内联重算每帧付费。
- **修复方向**：events 变化时一次性按 (resourceId, date) 预分组（复用 `splitMultiDayEvents`/`groupEventsByResourceDate`），冲突检测按桶进行；drag ghost 改 ref 直改 DOM / 独立子组件，不重渲染网格。

### R2-P3 [HIGH] Kanban：drop-state 板级 state 变化 + 列/卡零 memo + inline handlers → 每拖拽 tick 全板重过滤重渲染

- `use-kanban-dnd.ts:134-143`——每卡 onDrag 悬停翻转即 `setDropState`（板级，`kanban-board.tsx:640-641` 消费）→ KanbanBoard 重渲染。
- `kanban-column.tsx` 无 `React.memo`（grep 证实 0 命中），每 render 重建 `cardIndexMap`（:97）+ 三段 filter 链（:102-123）；`kanban-card.tsx:126` `export const KanbanCard = KanbanCardInner` 未 memo。板级 `collectAllTags`（:231→`kanban-helpers.ts:189-204` O(总卡数)）与 `wipOverLimitColumns`（:237-242）每 render 重算。
- `:638` 等处 `filterCardFn`/inline handlers 每 render 新标识，即使 memo 也会被击穿——需 latest-ref/useCallback 稳定化（`data/src/list-renderer.tsx:500-504` handleSelect latest-ref 为仓内范本）。
- **修复方向**：`React.memo(KanbanColumn/Card)` + 回调稳定化 → 每 tick 成本收敛到单个悬停列。

### R2-P4 [HIGH] `hasSourcePropsInValue` 每次 props 重解析对整个 props 值图 DFS（分配 churn）

- `flux-react/src/use-node-source-props.ts:37-62`——声明键快速路径已被循环图契约测试回退（`:27-32` 注释固化），安全网 DFS 全 props 图展开：`stack.push(...current)` 整数组 spread + 每对象 `Object.values()` 分配。
- 1000 行 loop/table source 每次数据变更 ≥1000 次数组分配 + visited-Set 插入；大数据页多个数据绑定节点乘性放大。
- **修复方向**：保持 DFS 语义（安全网不裁剪），改索引循环替代 spread、for-in 替代 Object.values、纯原始值容器（原始值数组/记录）提前分类跳过——常数因子削减，无语义风险。

### R2-P5 [MEDIUM-HIGH] 日期族：format 每 call 重 tokenize + `parseDate` 每 call `new RegExp`；`'now'/'today'` 相对日期每次新标识击穿下游 memo

- `flux-renderers-form/src/renderers/date/date-utils.ts:168-181`——`parseDate` 每次 `tokenizeFormat(format)`（:168，O(format 长度) 逐字符扫描）+ `new RegExp(regex).exec`（:181）；`formatDate` 同样每 call 重 tokenize（:115）。
- `:331-339`——`resolveRelativeDate('now'/'today')` 每 call 返回新 ISO 字符串/Date → `minDate: 'now'` 场景下 min/max 标识每 render 刷新，击穿 React Compiler 对 `minDate→toCalendarDate→buildDisabledMatchers` 链的 memo（`date-range-renderer.tsx:160`、`date-field-control.tsx:121`），react-day-picker 每轮重算 disabled 匹配器。
- 多日期字段表单每次值变更重复编译 2+ 正则；'now' 边界字段每 render 付费。
- **修复方向**：模块级 `Map<format, {segments, regex}>` 缓存（parsePath 同款模式，format 集合小而封闭）；相对日期解析标识稳定化（按原始 schema 字符串 memo 或秒级量化）。

### R2-P6 [MEDIUM-HIGH] Kanban 每次板变更 `structuredClone` 整板

- `kanban-helpers.ts:3-5`——`cloneBoard = structuredClone(board)`，被 moveCard/moveColumn/addCard/removeCard/changeCard/addColumn/removeColumn 全部使用；`kanban-board.tsx:411` 另有一处。移动一张卡即序列化/反序列化全部卡的 data/meta。
- **修复方向**：结构共享——仅复制 `root.children`、源/目标列 `children` 数组与被移动卡条目（flat id→item map 使然，3 次数组拷贝 + 1 条目改写）；`structuredClone` 仅保留给 undo 快照（如需不可变历史）。

### R2-P7 [MEDIUM-HIGH] Gantt timescale/cellgrid 全量渲染 scale cells，无窗口化；`smartScaling`（为此而建）是死代码

- `gantt-timescale.tsx:14-37`、`gantt-cellgrid.tsx:20-46`——全 padded range 每 step 一个 DOM 节点；day 缩放下 3 年项目 ≈ 1100 header cells + 1100 周末 div，随每次 `layoutRevision`/`treeRevision` 重渲染（cellgrid 还随每次展开/折叠）。
- `scale.ts:130-162` `smartScaling(scrollLeft, containerWidth, cells)` 计算可见窗口，但全仓仅 `gantt/index.ts:37` 导出、零调用（grep 证实）。bars 已窗口化（`getVisibleTaskWindow`）、grid 已虚拟化——header 是唯一未窗口化的面。
- **修复方向**：把 `smartScaling` 接入 timescale/cellgrid（slice cells + offsetX 偏移），或 `useVirtualizer` 横向模式（`scrollContainerRef` 已穿入 GanttBars）。

### R2-P8 [MEDIUM] Gantt CPM 关键路径每 render 重算

- `gantt.tsx:470`——组件体 `new Set(store.getCriticalPath())`；`getCriticalPath`（`gantt-store.ts:302-305`）跑完整 Kahn 拓扑 + 正/逆遍（`cpm.ts:16-125`，6 组 Map/Array 分配）。根 Gantt 随每次 `layoutRevision` **与每次 `selectedTaskId`** 重渲染（`:164,464`）→ 每次条选中点击付全图 CPM。
- **修复方向**：store 内按 `(taskRevision, linkRevision)` 缓存，或并入 `computeComputedPropertiesInternal` 暴露 memoized 结果。

### R2-P9 [MEDIUM] Gantt 单任务编辑触发 3 次顺序全 Map setState + 全量重算

- `gantt-store.ts:215-231`——`updateTask`（拖拽提交/内联编辑/键盘移动每键）→ `computeComputedPropertiesInternal`（:74-93）三次独立 `setState({tasks})`（levels/branch/source-target 各一次，每次 clone 整 Map + 每 task spread×2，`gantt-tree-utils.ts:86-95`）；`computeCoordinates` 再 clone 全部可见 tasks（:102-115）、`computeLinkPolylinesInternal` clone 整 links Map（:117-123）。
- **修复方向**：三遍合并为一次 setState（写入字段不相交）；日期未变任务跳过重布局。

### R2-P10 [MEDIUM] `useDictOptions` 无跨实例去重/缓存；AbortController 从未接线

- `flux-renderers-form/src/renderers/use-dict-options.ts:23-51`——每实例挂载即独立 `loadDict`；N 个同 `dict` 组件 → N 次相同加载，in-flight 与已决结果均无共享；cleanup 的 `controller.abort()` 因 `signal` 未传入 `loadDict` 而无效（P5 合规缺口）。
- **修复方向**：模块级 `Map<dictName, Promise>` 共享（in-flight + resolved）；signal 穿透 `env.loadDict` 契约（需核对 host 实现）。

### R2-P11 [MEDIUM] `getCompiledValidationField` 每 call 新分配字段与 policy 对象（每字段每 render/keystroke 3+ 次）

- `flux-core/src/validation-model.ts:77-87` 每次 new `{path, controlType, label, rules, behavior, hiddenFieldPolicy}` + `resolveHiddenFieldPolicy` 内层再分配。每击键路径调用点：`field-presentation.tsx:53`、`form-state.ts:176,:200`（selector 每字段每次运行两次）、`field-validation.ts:21`、`form-runtime-validation.ts:508`。100 字段表单击键 → 订阅字段各自重跑 selector 多次分配。编译后验证模型按代次不可变，天然适合 memo。
- **修复方向**：`WeakMap<CompiledFormValidationModel, Map<path, field>>` memo（无身份比较消费者，风险低）。

### R2-P12 [MEDIUM] Transfer：O(S×N) label 解析 + O(S²) move-all + 未虚拟化 panes

- `flux-renderers-form-advanced/src/transfer-renderer.tsx:519-546` 选项全量挂载（`max-h-64 overflow-y-auto` :503，10k 选项 = 10k Checkbox 组件）；`:50-61` `buildSelectedEntries` 每选中值一次 `options.find`（1000 选中 × 10k 选项 = 10M 比较/次变更）；`:230-236` `moveToSelected` 每次追加 `next.includes` → 全移 O(S²)。
- **修复方向**：memo 化 `Map<value, NormalizedOption>` 索引；Set 化 next；panes 虚拟化（kanban/calendar 的 per-pane virtualizer hook 为现成模板）。虚拟化部分与 list 窗口化同批收口（见 Plan 6）。

### R2-P13 [MEDIUM] Mobile pull-refresh / swipe-cell：每 touchmove setState → body region 每帧重渲染

- `mobile/src/hooks/use-touch.ts:70-86` 每 touchmove setState；`pull-refresh.tsx:58,:103-232` 与 `swipe-cell.tsx:56,:93-115` 由之派生 translate 并在 render 体调用 `props.regions.body?.render()`（:221 / :251）→ 手势每帧重建整个 slotted body（通常为页面列表），而手势只改一个 transform。
- **修复方向**：手势期 ref 直改 `el.style.transform`、touch end 才经 state 提交（gantt `use-gantt-drag.ts:83-98` ghost 即此模式）；或抽 transformed track 子组件自持触摸态。

### R2-P14 [MEDIUM] Flow designer：inspector 每击键全树 projection+layout + JSON round-trip ×2

- `designer-inspector.tsx:95-97,:350-352,:366-368` 每 keystroke 派发 `updateNodeData` → `tree-session-impl.ts:183-224` 每命令跑 `projectAndLayoutTree` 全树布局，空事务栈即 `pushHistory`；`transactions.ts:27-28` 每事务 `cloneDocument` + `JSON.parse(JSON.stringify(treeDocument))`（history.ts:5 同）。每击键 = O(tree) 布局 + O(tree) JSON stringify+parse ×2。`:310-311` `relayoutTree` 另做两次全文档 stringify 仅作相等判断。
- **修复方向**：inspector 提交 debounce / 按 blur 合并事务；JSON round-trip 换 `structuredClone`（core/clone.ts 已有）；relayout 相等判断改 revision 比较。

### R2-P15 [LOW-MEDIUM] CRUD `useCrudHandle` 每状态变更重注册句柄（6 索引 map 重建）

- `crud-renderer.tsx:234,:460,:464,:499,:507` inline closures 进入 `crud-renderer-state.ts:376` 的注册 effect deps → 每次 selection toggle/query 变更全 6 索引 teardown/re-register（`component-handle-registry.ts:19-28,:171-208`）。
- **修复方向**：handler useCallback / latest-ref 稳定化。

### R2-P16 [LOW-MEDIUM] DynamicRenderer（'use no memo'）每父 render 重走 dynamic 子树 element 构造

- `flux-renderers-basic/src/dynamic-renderer.tsx:256-260,:277,:288`——编译豁免文件中 `helpers.render(visibleState.schema, …)` 内联执行；任何 props/meta 依赖命中即 O(subtree) element 重建（下游 memoized children 可 bail，构造成本照付）。
- **修复方向**：仿 `node-renderer-resolved.tsx:247,:277` 对 render 结果按 `[schema, helpers]` useMemo。

### R2-P17 [LOW] Tabs 每 render 重实例化全部 title/body region

- `tabs.tsx:293-299,:398-435`——每 item 每 render `props.regions[key].render(...)`；多 closable/draggable tab 管理界面为 O(tabs × region 子树) churn。下游 memo bailout 兜底，重 region 才可见。
- **修复方向**：title elements 按 (item, index) memo（loop itemData 复用先例）。

### R2-P18 [LOW] Calendar 次级热点

- `calendar-layout-utils.ts:78-89` 排序 comparator 内 2× `parseISODate`（O(n log n) 次解析/桶）；`calendar-month-view.tsx:69+:346` `splitMultiDayEvents` 每 render 两遍；`:259` 每 cell 每 render 新建 Intl.DateTimeFormat（`toLocaleDateString`），`:35-44` weekday labels 同病。
- **修复方向**：split block 预计算 epoch 后排序；groups 预计算传入；Intl 实例按 locale 提升。

### R2-P19 [LOW] form-store 值 diff 每变更路径层级分配（诚实降级）

- `form-store.ts:347,:355` 每 `setValue`/`batchUpdate` 沿写路径每层 `new Set([...keys, ...keys])` + path concat。`Object.is` 短路（:331）保证只走变更分支，成本为 O(写路径各级兄弟键) 而非全树；纯击键路径分配 churn。
- **修复方向**：setValue/batchUpdate 已知写路径，直接合成变更路径（pathPrefixes 已存在），深度 diff 仅留给整对象 setValues。

### R2-P20 [LOW] 杂项序列化/分配热点（ contained 批量）

- spreadsheet `command-handlers/selection-handlers.ts:13`——选择命令每指针移动 `JSON.stringify` 相等比较（P1 规范禁止的交互 tick 深序列化，未登记）。
- `flux-print-renderers/src/editor/print-domain-adapter.ts:44,:54`——元素/页面相等比较用 `JSON.stringify` 每 editor update。
- `table-data.ts:188`——`serializeInstancePath` 每行 scope id 创建 stringify 整 instancePath（O(rows)/render，可 join）。
- gantt `gantt-tree-utils.ts:62`/`cpm.ts:67`——BFS 用 `Array.shift`（O(queue)，宽树 O(n²) 退化，仅超大规模可见）。
- kanban `kanban-board.tsx:450-480`——surface ref effect 无 deps 每 render 重建 8 闭包（加剧 R2-P3）。
- AI `ai-message-list.tsx:72-80,:120`——array content 每 chunk O(content) join 签名（string content O(1)）；`ai-conversations.tsx:88-172` 会话侧栏未窗口化（量级通常数十，LOW）。

---

## 二、UI/UX Findings

### R2-U1 [HIGH] Tabs 关闭控件键盘不可操作、对读屏不可见

- `flux-renderers-basic/src/tabs.tsx:353-368`——per-tab 关闭钮为 `<span aria-hidden onClick>`：无 role/tabIndex/onKeyDown（键盘用户永远无法关闭 closable tab），aria-hidden 使 AT 树完全不可见，title 还是 tab 标题而非"关闭"。同文件 "+" 添加按钮（:372-392）是正确范本（role="button" + tabIndex + aria-label + onKeyDown）。
- **修复**：改真 Button（icon-xs ghost + `t('flux.tabs.closeTab')`）或补齐 role/tabIndex/键盘 + 正确 label。机械修复。

### R2-U2 [HIGH] diff-view 仅亮色 OKLCH token，无任何暗色覆盖——暗色主题下不可读

- `flux-renderers-content/src/diff-view/diff-view.css:7-70`——全部 `--nop-diff-*` 仅定义于 `.nop-diff-view` 亮色字面量；全仓 grep 无 `.dark`/`[data-mode='dark']`/prefers-color-scheme 覆盖（ai 包 styles.css:121-133 与 theme-tokens styles.css:142/:202 为正确先例）。且 `--nop-diff-muted-text` ≈3.1:1、`--nop-diff-gutter-text` 用于 12-13px 文本低于 4.5:1。
- **修复**：补 dark 块重声明 token 集；顺带提升两个文本 token 对比度。

### R2-U3 [HIGH] diff-view 全部可交互行无可见焦点指示

- `diff-line.tsx:58-76` per-line `role="button" tabIndex={0}`；`diff-file-list.tsx:166-185` FileListItem 同构 inline style——均无 focus 样式（css 中唯一 outline 规则是 hover 时 `outline: none`，:244-246）。每个 diff 行/文件行可 Tab 聚焦但零可见焦点（WCAG 2.4.7）。FileListItem 亦无 `aria-current` 标记当前文件。
- **修复**：css 补 `:focus-visible` outline；FileListItem 加 aria-current。机械修复。

### R2-U4 [MEDIUM-HIGH] ui Button success/warning/info 实心变体 `text-white` 暗色对比不足（DS 级）

- `packages/ui/src/components/ui/button.tsx:32-36`——`bg-success text-white` 等三变体；暗色 `--success: 160 70% 50%`（theme-tokens styles.css:202）上白字 ≈2:1，远低于 4.5:1。`ai-tool-call.tsx:243` 同模式硬编码。badge 的 tinted 方案（bg-success/15 text-success）是正确先例。
- **修复**：引入 `--success-foreground`/`--warning-foreground`/`--info-foreground` token（或暗色调深 accent），ai-tool-call 一并收敛。

### R2-U5 [MEDIUM] Upload 逐文件 uploading/error 态无 live 公告

- `form-advanced/src/upload-field.tsx:612-656`——列表项 Spinner+"Uploading"（:624-645）与 per-item error span（:646-653）均无 live 语义；顶层 missingAction/rejectionNotice 已正确 role="alert"（:553-572），唯独 SR 用户最需要的逐文件完成/失败静默。
- **修复**：ul 加 aria-live="polite" 或 error span 加 role="alert"。机械修复。

### R2-U6 [MEDIUM] Video/Audio 无 captions/tracks 机制——作者无法满足 WCAG 1.2.2

- `content/src/schemas.ts:314-350`（Audio/VideoSchema 无 tracks 字段）；`video.tsx:81-91`、`audio.tsx:74-81` 裸 video/audio 无 track 子元素。
- **修复**：schema 增 `tracks?: Array<{kind;src;srcLang;label;default}>` 并渲染 `<track>` 子元素；可选 transcript region。

### R2-U7 [MEDIUM] Image preview dialog 无可访问名称

- `content/src/image.tsx:239-250`——DialogContent 内仅 img，无 DialogTitle/aria-label → SR 听到裸"dialog"。
- **修复**：sr-only DialogTitle（alt 或 `t('flux.common.preview')`）。机械修复。

### R2-U8 [MEDIUM] AI copy 成功仅视觉反馈（图标互换，无 live 公告/label 变化）

- `ai/src/renderers/ai-bubble/assistant-actions.tsx:49-51`——copied 时图标 Copy→Check（均 aria-hidden），aria-label 不变。代码块复制路径已有 `flux.common.copied` 可复用。
- **修复**：copied 态切换 aria-label + sr-only polite span 公告。机械修复。

### R2-U9 [MEDIUM] Diff 文件列表状态过滤 tabs 仅视觉传达激活态

- `diff-file-list.tsx:104-123`——data-active + inline 样式，无 aria-pressed/aria-current（四个对 SR 完全相同的按钮）。
- **修复**：ui/Button 上加 aria-pressed。机械修复。

### R2-U10 [LOW] i18n 文案错置：`flux.tabs.newTab` = "New View"/"新视图"

- `flux-i18n/src/locales/en-US.ts:477-478`、`zh-CN.ts:477`；消费点 `tabs.tsx:377,:382`（添加按钮 aria-label 与新 tab 默认标题）。应为"New Tab"/"新标签页"。
- **修复**：locale 一行修复（可选拆 action label 与默认标题两键）。

### R2-U11 [LOW] ai-tool-call 展开开关未关联 args region

- `ai-tool-call.tsx:150-173`——有 aria-expanded 无 aria-controls，`<pre data-slot="ai-tool-call-args">` 无 id。
- **修复**：补 id + aria-controls。机械修复。

### R2-U12 [LOW] ai-sender 超限状态对 AT 不可见

- `ai-sender.tsx:76,:183-201`——超限时提交静默禁用、计数器变 text-destructive（仅颜色），Textarea 无 aria-invalid，计数无 aria-live。
- **修复**：超限态 aria-invalid/aria-describedby + 计数 aria-live="polite"。机械修复。

### R2-U13 [LOW] Carousel 激活指示点无 aria-current

- `content/src/carousel.tsx:303-325`——指示按钮 aria-label 良好，激活态仅 bg-primary 视觉。
- **修复**：一行 aria-current。机械修复。

### R2-U14 [LOW] ai-token-usage 10px + alpha muted 对比风险

- `ai-token-usage.tsx:112,:114`——`text-[10px] text-muted-foreground/80` 与 `/70`：小字号 + alpha 折减 muted token，双主题对比存疑。
- **修复**：去 alpha、字号提到 text-xs。机械修复。

### 明示不计为 finding

- swipe-cell 无键盘开启/开启态公告为**已记录的产品决策**（`swipe-cell.tsx:212-217` 责任转移声明）——维持，不倒账。
- 基础/content/mobile/ai/layout 各族产品代码 **0 处** raw gray-*/slate-*/hex 字面类、0 处 t() 外硬编码英文（复查证实第一轮 token 化收口干净）。

---

## 三、已核查为"已优化良好"、本轮不动的内容

- **性能面**：action dispatch 链、flux-compiler 节点编译、getIn/setIn/parsePath、scope 依赖匹配、dialog/surface 生命周期、echarts option 管线——复查已 clean（compile-once、WeakMap 缓存、路径过滤订阅）。gantt 拖拽 move 路径（ghost+refs，仅 drop 时 updateTask）、countdown（时钟派生 tick）、notice-bar（CSS marquee + 自调度 timer）、infinite-scroll（sentinel 委派宿主）、diff-view 计算（150ms debounce + useMemo）、AI 引擎 state adapter（快照缓存 + 原位元素提交 + structuredClone 门控到 turn 边界）。
- **UX 面**：steps/wizard/collapse/timeline/pagination/carousel 自动播放三停/notice/countdown/pull-refresh live region/condition-builder/rating/slider/verification-code/input-suggest combobox/HITL 焦点陷阱/消息列表 role=log/QR/img 语义/tooltip-popover-dropdown（Base UI 原语）——本轮零新缺口。

---

## 四、遗留 Deferred 项现状核对（2026-09-29）

| 项 | 现状 | 本轮处置 |
| --- | --- | --- |
| list-renderer infinite 窗口化 | 未做（`list-renderer.tsx` 无窗口化；ai-message-list `@tanstack/react-virtual` 阈值门控为最佳模板） | **本轮收口**（Plan 6） |
| transfer 虚拟化 | 未做 | **本轮收口**（Plan 6，随同 O(S×N)/O(S²) 索引化） |
| 表达式 interpreter 闭包提升 | 未做（`evaluator.ts:130,:196-207` 每 exec/每箭头函数新闭包） | 维持 profiling-first deferred（无 profile 证据） |
| P13 structural wildcard 收窄 | 未做（`node-runtime.ts:64,:71,:171` wildcard 仍在；触发面契约测试在位） | 维持 deferred（需 flux-formula 编译期静态依赖收集，越出本轮 Non-Goals） |
| U11 hint 常显 / normalizeInput 键加固 / bundle 入口 renderer 注册延后 | 未动 | 维持原裁定（产品决策 / watch-only / playground-only 收益递减） |
| 9 个 pre-existing e2e 失败 | 全部 spec 文件在位；**无任何 plan 认领**（09-28-5/6 显式移交） | **本轮认领收口**（Plan 7） |

## 五、结论与后续工作项

按结果面合并为 **7 个 owner plans**（含 2 个第一轮 Deferred 的 successor 收口）：

| Plan | 结果面 | 覆盖 findings |
| --- | --- | --- |
| 1 scheduling 渲染器性能优化 | calendar/kanban/gantt | R2-P2、P3、P6、P7、P8、P9、P18、P20（gantt shift / kanban surface） |
| 2 AI 渲染器流式性能与可访问性 | flux-renderers-ai | R2-P1、P20（AI 签名 join）；R2-U8、U11、U12、U14 |
| 3 表单族热路径优化 | flux-renderers-form + flux-core 验证模型 | R2-P5、P10、P11、P19 |
| 4 核心管线与外围包剩余热点批量 | flux-react/basic/data/mobile/flow-designer/spreadsheet/print | R2-P4、P13、P14、P15、P16、P17、P20（其余） |
| 5 视觉一致性与可访问性二批 | basic/content/ui/form-advanced upload/i18n | R2-U1、U2、U3、U4、U5、U6、U7、U9、U10、U13 |
| 6 大数据集窗口化（list/transfer successor） | data list + form-advanced transfer | R2-P12 全部 + 第一轮 Deferred 两项 |
| 7 pre-existing e2e 失败修复与裁定 | tests/e2e 9 spec + 产品缺陷 | 第一轮 Plan 5 移交清单 |

维持 deferred（不进本轮 queue）：表达式 interpreter 闭包提升（profiling-first）、P13 structural 依赖收窄（需编译期静态依赖收集新能力）、U11 hint 常显（产品决策）、swipe-cell 键盘策略（已记录产品决策）、bundle 入口进一步压缩（playground-only，收益递减）、normalizeInputCompileCache 键加固（watch-only）。
