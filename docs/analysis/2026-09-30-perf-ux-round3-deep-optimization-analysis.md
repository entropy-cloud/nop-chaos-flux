# 2026-09-30 性能与 UI/UX 深度优化分析报告（第三轮）

> Status: final
> Last Reviewed: 2026-09-30
> Source: 五路独立探索 agent 代码审计（① flux-runtime/action-core/compiler/core/formula/react 核心管线、② designer 族（flow/report/spreadsheet/word/print）、③ renderer 族两轮优化后残余、④ playground 应用壳 + @nop-chaos/ui + flux-i18n、⑤ 遗留 deferred 与门禁现状核对）+ 执行者对 7 个 HIGH finding 的逐条抽查复核
> Related: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（第一轮，7 plans completed）、`docs/analysis/2026-09-29-perf-ux-round2-deep-optimization-analysis.md`（第二轮，7 plans completed）、`docs/architecture/performance-design-requirements.md`

## 目的

前两轮批次（14 plans 全部 completed）已收口表达式编译缓存、表格/选择器热点、bundle、表单 a11y、scheduling/AI 流式、form 热路径、核心管线残余、大数据窗口化与 pre-existing e2e。本报告对**前两轮仍未深查或新暴露的面**做第三轮深度分析：核心运行时的 owned-store/验证/弹层路径、designer 族（flow/report/spreadsheet/word/print 编辑器交互性能）、renderer 族两轮修复后的漏网组件、以及 playground 应用壳与 `@nop-chaos/ui` 基础组件的 UX。所有 finding 均经实现代码核验（HIGH 项另经执行者抽查复核，全部成立），与既有门禁基线区分。

## 方法与输入

1. **静态门禁核对**：`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm check` 全部 exit 0（2026-09-30 于 HEAD 160c22133 复测）；`find-styling-suspects` 221 hits 与登记基线零漂移；`check:oversized-code-files` 2 errors 均为已登记豁免 locale 文件，210 warnings 为 700 行以下预警长尾，无新增未登记红项。
2. **性能审计三路**：① flux-runtime / flux-action-core / flux-compiler / flux-core / flux-formula / flux-react 核心管线；② designer 族包；③ renderer 族残余。
3. **UX 审计两路**：④ playground 应用壳 + ui 包 + i18n；③ 内含 renderer 族 UX 残余。
4. **现状核对一路**：⑤ round-2 deferred 项 live 状态、e2e watch-only 清单、bundle 产物、测试基础设施计数。
5. **执行者抽查**：owned store `getOwnedState()` 新字面量、flow `setViewport` 每帧 `pushHistory`、editor-core `update()` 每次跑 `runCommit`、富文本 `onUpdate` 每击键 DOMPurify、Component Lab `CATEGORY_ORDER` 缺 scheduling、`use-route.ts` `location.replace`、barcode 模块顶层冻结 `t()`——七个 HIGH 证据全部复核成立。

**React Compiler 上下文**：与前两轮一致，compiler 仅在 playground 构建启用；本轮 finding 聚焦 (a) 编译器不可达的运行时/非 React 代码，(b) 输入真实变化导致的无界重算，(c) 非运行时热路径但用户可感知的交互帧成本（拖拽/滚动/击键）。

---

## 一、性能 Findings（按用户可见影响排序）

### 核心管线（flux-runtime / flux-react / flux-compiler / flux-core）

### R3-P1 [MEDIUM-HIGH] owned form store 每次 `getState()` 返回新对象，击穿全部字段 selector 快照快路径

- `flux-runtime/src/form-store-owned.ts:231-247`——`getOwnedState()` 每次构造新字面量；`useSyncExternalStoreWithSelector` 的 memoizedSelector 靠快照身份短路，owned store 下快照每次必变 → 每次 render × 每次通知 × 每字段重跑 `selectCurrentFormFieldState`/`selectCurrentFormErrors`。FieldFrame 每字段挂 2 个此类 hook（`field-frame.tsx:107,113`）。
- 量化：200 字段页面 × 每秒数次批量通知 × 4 次 selector 链 = 每秒数千次分配。
- **修复方向**：按 `(values, fieldStates, submitting, submitAttempted)` 输入身份缓存组合后 state 对象。

### R3-P2 [MEDIUM-HIGH] 每次 openDialog / openDrawer 全量重编译弹层 body schema 验证计划

- `flux-runtime/src/action-adapter.ts:85-118`（`resolveSurfaceValidationPlan` compile 在 :93），调用点 :255（openDialog）、:320（openDrawer）。渲染侧已有 `normalizedInputCompileCache`（render-nodes.tsx:149），但验证计划每开必重跑全树编译；wrapper 每次新建，未来 WeakMap 也会 miss。
- 量化：200 节点行编辑弹窗逐行打开 = 每行一次全树编译。
- **修复方向**：adapter 内按 body schema 身份 memoize `{plan, error}`。

### R3-P3 [MEDIUM-HIGH] `validateForm` 的 `captureSideEffectErrors` O(验证字段数 × 全量 fieldStates)

- `flux-runtime/src/form-runtime-owner.ts:343-356`（`Object.entries(currentFieldStates)` 在 :346），每个被验证路径结束都调用（:404,:422,:437,:443,:450）。提交时 N 个路径逐一验证，每验一个重扫全部 F 个 fieldStates。
- 量化：1000 字段表单一次 submit ≈ 10⁶ 次迭代 + 2×10⁶ pair 分配。
- **修复方向**：fieldStates 引用未变则跳过重扫；只迭代 keys 并对 validatedPaths 命中提前 continue。

### R3-P4 [MEDIUM] 含 async 规则的字段：每条 sync 规则克隆整个 fieldStates 记录并触发一次 batchUpdate

- `flux-runtime/src/form-runtime-validation.ts:126-136`（`{...fieldStates}` 全记录克隆）、循环内提交 :376-384；下游 batchUpdate 每次 O(F) summary 重算 + diffAndNotify（form-store.ts:89-105）。
- 量化：500 字段表单中 6 规则字段每次键入 = 6 × O(500) 克隆 + 6 次 store 替换。
- **修复方向**：循环内只更新 errors 草稿，validate run 结束一次性 commit。

### R3-P5 [MEDium] `SchemaRenderer` 根编译 useMemo 依赖含 `props.env`，宿主内联 env 即整页重编译

- `flux-react/src/schema-renderer.tsx:55-87`（deps :80-87 含 `props.env`）。compile options 只消费 `env.importLoader`/`env.resolveImportUrl`；组件已有 `envRef`（:132-133）与 `setEnv` effect（:252-258）。宿主内联 `env={{...}}` 时每次宿主 render 全树重编译（根编译还开 `diagnostics.enabled`，附赠全树 shape 分析）。
- **修复方向**：deps 去掉 `props.env`，编译选项经 `envRef.current` 读取。

### R3-P6 [LOW-MEDIUM] `selectCurrentFormFieldPresentation` 每次调用两遍错误扫描 + 多次小对象分配

- `flux-react/src/form-state.ts:165-175`（两次 `selectCurrentFormErrors`）、:89（`query ?? { path }` 每次分配）、:67（filter 常只为取 `[0]`）。每字段每 render 调用一次（field-presentation.tsx:69）。
- **修复方向**：一次取 errors 数组，两查询共享、命中即短路。

### R3-P7 [LOW-MEDIUM] `compileRuntimeValueTree` object exec 死代码 O(K²) key 检查

- `flux-compiler/src/schema-compiler/runtime-value-compilation.ts:245-247`——`currentKeys.some((key) => !keys.includes(key))` 中 `currentKeys === keys` 恒成立，第二子句永假但每 props 对象求值做 K² 扫描。flux-formula 同型代码已用 Set 修复（evaluate.ts:193-198）。
- **修复方向**：对齐 Set 版或删除死子句。

### R3-P8 [LOW-MEDIUM] 每次 hidden 翻转全量克隆 fieldStates + batchUpdate；`clearValueWhenHidden` 级联整棵子树验证

- `flux-runtime/src/form-runtime-field-ops.ts:298-336`（全记录克隆 :305）、:416；触发点 `flux-react/src/node-renderer-resolved.tsx:414-424`（每字段一个 effect）。
- 量化：500 字段表单切 tab 隐藏 100 字段 ≈ 100 次 O(F) 克隆+通知。
- **修复方向**：owner 层微任务批合并同帧 hidden 翻转为一次 commit。

### R3-P9 [LOW] 子树验证目标收集全量双扫描 + BFS `queue.shift()`

- `flux-runtime/src/form-runtime-subtree.ts:22-42`（双全量扫描 + startsWith）、:117-136（shift 出队最坏 O(n²)）。
- **修复方向**：按 model generation memoize 前缀索引；BFS 改头索引出队。

### R3-P10 [LOW] `hasCompiledValidationNodes` 每次 `Object.keys(nodes).length`

- `flux-core/src/validation-model.ts:253-258`；只需"是否非空"却分配整个 key 数组（F=1000 → 千元素数组/次）。
- **修复方向**：`for...in` 首键即返回。

### designer 族（flow / print / spreadsheet / word / report）

### R3-P11 [HIGH] flow designer 平移/缩放每帧全文档深 clone + undo 入栈 + 全节点重建

- `flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:337-342`（onMove 连续触发）→ `designer-canvas.tsx:405-411`（每帧 dispatch setViewport）→ `flow-designer-core/src/core/shell-controls.ts:139-150`：`setDocument({...currentDoc, viewport})` + **每帧 `pushHistory()`** → `history.ts:48-58` 每帧 `cloneDocument`（structuredClone 全部 nodes/edges）；新 snapshot 使 viewport 选择器失配 → `xyflow-utils.ts:50-93` 每帧 O(N) 重建全部节点对象。
- 同根 UX 缺陷（R3-U4）：undo 栈上限 50 条被平移帧冲掉真实编辑记录；`docRevision` 递增使 `isDirty()` 误报——只平移未编辑也触发保存提示。
- **修复方向**：viewport 只写 shellState（emit viewportChanged），`onMoveEnd` 一次性落盘；viewport 不入 undo、不计 dirty。

### R3-P12 [HIGH] print designer 拖拽/缩放每 pointermove 走完整 commit 周期

- `flux-print-renderers/src/print-designer-canvas.tsx:118-150` → `editor/use-print-editor.ts:138-143`（policy='auto'）→ `editor-core/src/editor-core.ts:159-180`：事务中每帧仍执行 `adapter.diff`（:165）+ `notify` + `runCommit()`（:176-178，含 validate + JSON.stringify 整模板 + structuredClone）+ 二次 notify；`buildSnapshot` 的 `dirty: isDirty()` 再加一次 O(N) diff。每帧 3 diff + 1 serialize + 1 clone + 2 次全画布重渲染。
- **修复方向**：事务开启时跳过 diff 与 runCommit（延迟到 endTransaction）；dirty 用标记位。

### R3-P13 [HIGH] print inspector 每击键 = 一次完整 commit + 一条 undo 记录

- `flux-print-renderers/src/print-inspector.tsx:247,314` 等所有 onChange 直调 `updateElement` → `editor-core.ts:166-170` 每字符一条 undo entry + runCommit（validate/serialize/structuredClone）。与已修复的 flow inspector 同病，此文件未修。
- **修复方向**：inspector 文本字段本地 draft + coalesce 提交（对齐 flow designer-inspector 模式）。

### R3-P14 [HIGH] print 画布拖拽每次 pointermove 做 O(n²) 元素扫描，无 rAF 批处理

- `flux-print-renderers/src/print-designer-canvas.tsx:74-76`——`buildSnapOptions` 内 `elements.filter` 谓词里嵌 `elements.find`，单次 O(n²)；拖拽期间每个 pointermove（60-120Hz）都执行（:130）。
- **修复方向**：pointerdown 时预计算 `dragElement.region` 与 snap 候选缓存；moveFrame rAF 合帧。

### R3-P15 [MEDIUM] spreadsheet 滚动每帧 store 往返 + 可见单元格未 memo

- `spreadsheet-renderers/src/spreadsheet-grid.tsx:197-210`（每 scroll 事件 dispatch setViewport）→ page-renderer viewport 引用每 scroll 必新 → 整页重渲染；`SpreadsheetGridCell` 未 memo（table-shell.tsx:100），`buildSpreadsheetGridViewport` 渲染体内裸调（:242-255）。
- **修复方向**：scroll rAF 合并 + 本地 viewport state；cell 包 `React.memo`；viewport 构建进 useMemo。

### R3-P16 [MEDIUM] spreadsheet 单元格编辑草稿存全局 store，每击键整网格重渲染

- `table-shell.tsx:262-268` 受控 value ← `use-editing.ts:94-99` → `spreadsheet-core/src/core.ts:127-134` 每字符 `store.setState` → 全订阅者通知。
- **修复方向**：编辑草稿下沉为 CellEditor 本地 state，save 时才进 store。

### R3-P17 [MEDIUM] flow 边 hover 一次重建全部边对象

- `flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:125-135`——hoveredEdgeId 变化时全部 edges map 新对象，浅比较全失效，进/出各 O(E) 重建。另 `onNodeHover`/`onEdgeHover`（designer-xyflow-canvas.tsx:76-77,364-387）从未被上游传入，死通道。
- **修复方向**：仅目标边注入新对象（或 CSS class 切换）；删除/接通死通道。

### R3-P18 [MEDIUM] flow 拖拽对齐辅助线每帧 O(N) 扫描 + 无条件 setState

- `use-alignment-guides.ts:119-142`——每帧 `getNodes()` 全量 filter+map + `setGuides({...})` 新对象（值未变也触发重渲染）。
- **修复方向**：guides 值相同跳过 setState；兄弟矩形按视口/距离预剪枝。

### R3-P19 [MEDIUM] workbench 面板 resize 每 pointermove dispatch 全局 store

- `flux-react/src/workbench/workbench-shell.tsx:191-195,220-225` → flow `designer-page-body.tsx:509,525` 每帧 dispatch setPanelWidths → DesignerPageBody + WorkbenchShell + 画布子树全量重渲染。
- **修复方向**：resize 过程本地 state/rAF，pointerup 一次性 dispatch。

### R3-P20 [MEDIUM] word editor 每次 selection 变化无条件分配新对象 + 无 shallowEqual 订阅

- `word-editor-core/src/editor-store.ts:114-118` `setSelection` 恒新对象；`canvas-editor-bridge.ts:104` 直连画布 `rangeStyleChange`；`use-word-editor-state.ts:125-130` 以 Object.is 订阅 → 光标每移动 toolbar 全量重渲染（`editorRuntime` 已有 shallowEqual 先例 :139-153）。
- **修复方向**：setSelection 前浅比较；selection 订阅补 shallowEqual。

### R3-P21 [LOW] report `syncSpreadsheetDocument` 每次表格变更 structuredClone 整个 workbook

- `report-designer-core/src/core.ts:459-475`——调用方已不可变，深拷贝纯浪费。
- **修复方向**：直接引用 nextDocument。

### R3-P22 [LOW-MEDIUM] print preview 每次 render 全量 layout + HTML 序列化，无 useMemo

- `flux-print-renderers/src/print-preview.tsx:28-29`——`layoutPrintTemplate` + `renderPrintTemplateToHtml` 直接在 render 体执行，Dialog 打开期间任何 state 变化重跑分页排版。
- **修复方向**：useMemo 依赖 template/testData。

### renderer 族残余

### R3-P23 [HIGH] 富文本编辑器每次按键跑一次全文档 DOMPurify

- `flux-renderers-form-advanced/src/editor-renderer.tsx:145-156`——TipTap `onUpdate`（每事务/每键）内 `sanitizeEditorHtml(activeEditor.getHTML())` 对全文序列化+清洗。长文档每击键 O(文档大小)。
- **修复方向**：update 路径提交原始 HTML（ProseMirror allowlist 已兜底），DOMPurify 移到 onBlur/commit 边界或 trailing debounce。

### R3-P24 [MEDIUM] 签名板每次 pointermove 全量重绘所有笔画

- `flux-renderers-form/src/renderers/signature-renderer.tsx:167-177`——仅 push 一点却调 `redraw()`（:58-92，clearRect + 重绘全部历史笔画），一次签名 O(点数²)。
- **修复方向**：move 中只增量画最新线段；全量 redraw 留给 undo/clear/resize。

### R3-P25 [MEDIUM] key-value 行组件未 memo，任一行击键全表重渲

- `flux-renderers-form-advanced/src/key-value.tsx:43`（`KeyValueRow` 未包 React.memo），渲染点 :572-595。同包 `ComboItem`/`ArrayItem`/`InputTableRow` 均已有 memo，此处漏网。
- **修复方向**：对齐兄弟组件模式（memo + 稳定回调）。

### R3-P26 [MEDIUM-LOW] condition-builder 每项调用 `computeUsedFields`，组内 O(n²)

- `condition-builder/condition-group.tsx:240-242,:296`——`children.map` 内每项递归走全组。
- **修复方向**：组级 useMemo 一次算 `excludeId → usedFields` 映射。

### R3-P27 [MEDIUM-LOW] 饼图 sr-only 数据摘要无上限

- `flux-renderers-data/src/chart-renderer.tsx:249-251`——pie 分支无 slice（cartesian/heatmap 均有 `slice(0, 20)`）；:597-605 每行一个 sr-only `<li>`，大数据 DOM 翻倍。
- **修复方向**：同款 `slice(0, 20)` + 总数注明。

### R3-P28 [MEDIUM-LOW] heatmap 网格 SVG cell 无上限

- `chart-heatmap.tsx:106-122`——每 cell 一个 `<rect>`（内嵌 `<title>`），100×100 = 1 万节点。
- **修复方向**：cells 设上限（超限降采样），`<title>` 改事件委托单 tooltip。

### R3-P29 [LOW] stat-tile 每 render 构造 `Intl.NumberFormat`

- `stat-tile-renderer.tsx:56-61`（调用点 :186）。成片 tile 高频更新时开销可观。
- **修复方向**：按 `language|decimals|thousands` 模块级 Map 缓存。

### R3-P30 [LOW] crud 轮询数据源解析失败 250ms 无限重试

- `use-crud-polling.ts:140`——无上限/退避，每轮还跑 `getDebugSnapshot()` 全量扫描（:125）。配置错误页面永久空转。
- **修复方向**：重试上限或指数退避。

---

## 二、UI/UX Findings

### R3-U1 [HIGH] Component Lab 导航丢失整个 scheduling 分类（3 个条目侧栏不可见）

- `apps/playground/src/component-lab/component-lab-page.tsx:11-19` `CATEGORY_ORDER` 缺 `'scheduling'`（`'domain'` 同缺），`:60` filter 静默丢弃 `category: 'scheduling'` 的 Kanban/Calendar/Barcode Input 三个 lab 条目（`scheduling-renderer-routes.ts:23,35,47`）；lab 页面实际存在（renderer-lab-registry.ts:268-271）只能手敲 URL 到达。`CATEGORY_LABELS`（:29-30）已含 scheduling/domain label，证明本意要渲染。
- **修复**：CATEGORY_ORDER 补齐两分类。机械修复。

### R3-U2 [HIGH] 所有应用内导航 `history.replace`，浏览器后退直接退出应用

- `apps/playground/src/use-route.ts:11`——`applyRoute` 用 `window.location.replace` 写 hash，全部路由跳转（App.tsx:250-470）都销毁历史记录。
- **修复**：改 `window.location.hash = bare`（push 语义），仅初始重定向保留 replace。机械修复。

### R3-U3 [HIGH] barcode 扫描覆盖层 i18n 文案在模块顶层冻结

- `flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx:16-19`——`statusMessages` 模块作用域求值，运行时切语言后 :317 展示的仍是加载时语言。
- **修复**：移入组件内调用。机械修复。

### R3-U4 [HIGH] flow 平移/缩放污染 undo 历史并误标 dirty

- 与 R3-P11 同根（shell-controls.ts:146 pushHistory + docRevision 递增），合并收口。

### R3-U5 [MEDIUM] playground 全应用无 ErrorBoundary，懒加载 chunk 失败即白屏

- `apps/playground/src/App.tsx:477` 仅 Suspense；全仓 grep 无 ErrorBoundary，`#/` 下约 45 个 lazy 路由。发版后旧 hash 命中失效 chunk → 白屏无提示。
- **修复**：Suspense 外包 error boundary（含 retry/reload）。

### R3-U6 [MEDIUM] Toaster 主题硬编码 light，暗色模式对 toast 不生效

- `packages/ui/src/components/ui/sonner.tsx:31`——`theme={props.theme ?? 'light'}` 无订阅；App.tsx:483 未传 theme。
- **修复**：Toaster 内读取 `data-mode` 映射 sonner theme。

### R3-U7 [MEDIUM] 侧栏当前项高亮缺 aria-current

- `component-lab-page.tsx:130-136`、`complex-pages-showcase.tsx:78-83`——仅视觉样式。ui 库自身 pagination/breadcrumb 有正确先例。
- **修复**：激活项加 `aria-current="true"`。机械修复。

### R3-U8 [MEDIUM] Component Lab 侧栏 133 个渲染器无搜索/过滤

- `component-lab-page.tsx:183-193` 线性渲染全量折叠列表（默认全展开 :99）。仓内已有先例（flow-list-page.tsx:66-72）。
- **修复**：侧栏头部加过滤 Input。

### R3-U9 [MEDIUM] 两个 showcase 壳零响应式，窄屏主区被压到 ~135px

- `component-lab-page.tsx:161-164`、`complex-pages-showcase.tsx:128-131`——固定 `w-[240px]` 侧栏，无断点类。
- **修复**：<768px 侧栏改抽屉（ui 库 SidebarProvider/useIsMobile 现成）。

### R3-U10 [MEDIUM] Flow Designer 工具栏视图切换仅视觉 data-active，无 ARIA 状态

- `apps/playground/src/flow-designer/flow-designer-toolbar.tsx:70-86`——普通 Button 无 aria-pressed/role=tab。
- **修复**：加 `aria-pressed`。机械修复。

### R3-U11 [MEDIUM] print 校验只报数量，不显示诊断明细

- `print-designer.tsx:88-90,149-160`——validate 仅 setErrorCount；诊断列表只在预览弹窗可见且数据源不同。
- **修复**：校验结果以列表展示并支持点击定位。

### R3-U12 [MEDIUM] flow palette 拖放无落点预览

- `designer-xyflow-canvas.tsx:394-407`——dragover 仅设 dropEffect，无 ghost/预览节点。
- **修复**：dragover 期间渲染半透明预览节点。

### R3-U13 [MEDIUM] report 字段面板插入按钮禁用无原因提示

- `report-designer-renderers/src/report-field-panel.tsx:111-113`——disabled 无 title/aria-describedby。
- **修复**：disabled 附原因说明。机械修复。

### R3-U14 [MEDIUM] 签名板对键盘用户完全不可操作（WCAG 2.1.1）

- `signature-renderer.tsx:256-263`——canvas 仅 pointer 事件，无 tabIndex/键盘替代/降级提示。
- **修复**：键盘可聚焦 + 说明文本，或必填场景文本输入替代通道。

### R3-U15 [MEDIUM] key-value 校验消息与 aria-label 硬编码英文碎片

- `key-value.tsx:544,554`——插值 `Entry ${n} key` 未本地化（已有 `flux.form.keyEntry` 可复用）；`:246` aria-label 拼接硬编码 "entry"；:213/:229 语序假设英文。
- **修复**：新增/复用带 `{index}` 占位的完整本地化键。

### R3-U16 [LOW-MEDIUM] input-table 操作列表头 aria-label 硬编码英文

- `input-table-renderer.tsx:361`——`aria-label="row actions"`。
- **修复**：换 t() 键。机械修复。

### R3-U17 [LOW-MEDIUM] tree 搜索框无 accessible name

- `tree-renderer.tsx:617-628`——仅 placeholder。icon-picker 同场景已有 aria-label 先例。
- **修复**：补 `aria-label={t('flux.common.search')}`。机械修复。

### R3-U18 [LOW-MEDIUM] print 画布元素无法经键盘选中

- `print-designer-canvas.tsx:252-305`——元素仅 onPointerDown，无 tabIndex/role；容器级键盘已有但选区无法移到元素。
- **修复**：元素 tabIndex + roving selection 或 Enter 选中。

### R3-U19 [LOW] flow designer 默认无 undo/redo/save 可见入口

- `flow-designer-core/src/core/config.ts:14` 无默认 toolbar items；`designer-toolbar.tsx:162-164` items 空 return null。快捷键只在 inspector 空态文案列出。
- **修复**：normalizeConfig 提供默认工具栏项。

### R3-U20 [LOW] flow designer 缺 selectAll/duplicate 快捷键

- `config.ts:15-22`——core 已有 `selectAllNodes`（core.ts:612）与 `duplicateNode` 命令，无默认键位。
- **修复**：补 Ctrl+A/Ctrl+D 默认键位。

### R3-U21 [LOW] WorkbenchShell resize 手柄 aria-label 未国际化

- `workbench-shell.tsx:322,376`——硬编码英文。
- **修复**：经 i18n 注入。机械修复。

### R3-U22 [LOW] word editor 状态栏字数统计永不更新

- `word-editor-renderers/src/editor-canvas.tsx:140-147`——仅 mount 取一次。
- **修复**：autosave 回调里同步刷新。机械修复。

### R3-U23 [LOW] Spinner aria-label 硬编码英文

- `packages/ui/src/components/ui/spinner.tsx:8-9`——`aria-label="Loading"` 字面量，`flux.common.loading` 两 locale 均存在。
- **修复**：走 t()。机械修复。

### R3-U24 [LOW] DataViewer 每 render 同步 stringify 全量 YAML

- `packages/ui/src/components/ui/json-viewer.tsx:38-44`——IIFE 每 render 执行，即使停在 JSON tab。
- **修复**：仅 yaml tab 计算。机械修复。

### R3-U25 [LOW] ui Drawer 静默丢弃函数式 style prop

- `packages/ui/src/components/ui/drawer.tsx:162`——`typeof style === 'function' ? undefined : style`。
- **修复**：函数式透传 Popup 或类型层禁用。

### R3-U26 [LOW] HomePage 导航卡片 button 内渲染 h2/p（内容模型违规）

- `apps/playground/src/pages/home-page.tsx:22-40`——button 只允许 phrasing content，标题语义被拍平。
- **修复**：改 a/div 结构或降级 span。机械修复。

### R3-U27 [LOW] ui Button 缺 loading 态

- `packages/ui/src/components/ui/button.tsx:14-55`——无 loading prop，库内已有 Spinner 未集成。
- **修复**：增加 `loading` prop（Spinner + disabled + aria-busy）。

### R3-U28 [LOW] 用户可见拼写瑕疵 "Username is already-taken"

- `apps/playground/src/pages/flux-basic-page.tsx:169`——多余连字符。
- **修复**：一行修复。

### R3-U29 [LOW] carousel 激活指示点仅颜色区分（WCAG 1.4.1）

- `content/src/carousel.tsx:302-327`——有 aria-current 但无形状/尺寸差异。
- **修复**：激活态加环/放大。机械修复。

### R3-U30 [LOW] query-filter 折叠按钮 aria-expanded 无 aria-controls

- `flux-renderers-data/src/query-filter.tsx:49-59`——裸 Button 需手动补 id/aria-controls。
- **修复**：机械修复。

### R3-U31 [LOW] sparkline/stat-tile `role="img"` + `aria-hidden="true"` 互相矛盾

- `sparkline-renderer.tsx:85-88`、`stat-tile-renderer.tsx:218-221`——aria-hidden 生效后 role 是死代码。
- **修复**：装饰性图去 role。机械修复。

### R3-U32 [LOW] 未知 domainId 渲染 onNavigate 被阉割的 HomePage

- `apps/playground/src/App.tsx:466-467`——点击任何卡片都是 no-op。
- **修复**：加 not-found 态（schema-page.tsx:27-35 先例）。

### 明示不计为 finding

- i18n 键集：zh-CN 与 en-US 各 1716 键全量点路径 diff 完全一致（含多行 value 解析后），有契约测试在位。
- ui 包 5 处 Context Provider value 均 useMemo；浮层（Dialog/Drawer/Popover 等）基于 Base UI 的焦点圈定/Escape/滚动锁定完整；表单控件 focus-visible/aria-invalid 一致；主题机制与暗色 token 层级正确。
- designer 族已 clean 面：flow 拖拽提交粒度（dragging=false 才提交）、选择回写风暴防护、auto layout 并发防护、JSON 面板 role="alert"；spreadsheet 命令层结构共享、行列虚拟化、拖选 rAF、resize rAF；report 双向同步防乒乓；word 自动保存 debounce+AbortController；print 粘贴隔离与方向键微移。

---

## 三、已核查为"已优化良好"、本轮不动的内容

- **flux-action-core 整体 clean**：compiledProgramCache WeakMap、abort/timer 全路径清理、dispose 遍历 pendingDebounces。
- **flux-formula 整体 clean**：LRU + epoch 编译缓存在位、模块级常量 regex、object key 检查已是 Set 版。
- **flux-compiler 除 P7 外 clean**：validation-collection 队列索引推进、pattern 预编译使 `new RegExp` 回退不可达。
- **flux-core 除 P10 外 clean**：parsePath LRU、validation 字段 memo、shallowEqual 双路径。
- **flux-react/render-nodes 等**：P14 编译缓存 + fragment scope 缓存在位；node-renderer 依赖命中订阅 + selector 等值门控；use-keyboard-bindings optionsRef 模式。
- **basic/content/layout/mobile/scheduling/ai 各族**：command-palette、cards 契约、wizard 三层状态、notice-bar/countdown/infinite-scroll、kanban/calendar/gantt 前轮修复无回归、ai-message-list 虚拟化阈值——均复查无新缺口。

---

## 四、遗留 Deferred 项现状核对（2026-09-30）

| 项                                           | live 现状                                                                                  | 本轮处置                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| 表达式 interpreter 闭包提升                  | 未做（evaluator.ts:126,:130,:192-207 与 deferred 记录逐字对应）                            | 维持 profiling-first deferred（无 profile 证据）    |
| P13 structural wildcard 收窄                 | 未做（node-runtime.ts:64-65,:71-72,:137-172,:202 wildcard 仍在）                           | 维持 deferred（需 flux-formula 编译期静态依赖收集） |
| bundle 入口 renderer 注册延后                | 未做（App.tsx:211-224 13 个 registerXxx 静态注册；index chunk 4997KB 与 09-28 审计值持平） | 维持 deferred（playground-only，收益递减）          |
| normalizeInputCompileCache 键加固            | 无变化（flux-react/render-nodes.tsx:149-159 WeakMap+key 函数在位）                         | 维持 watch-only                                     |
| e2e watch-only：gantt-perf×2 + kanban-perf×1 | spec 在位，50Hz 主屏阈值不可达（需 60Hz 环境）                                             | 维持 watch-only（环境限制，非代码缺陷）             |
| e2e watch-only：scada edge ×2                | 登记几何性/渲染时序，Successor Required: no                                                | 维持 watch-only（out-of-scope）                     |
| stripe-replica-visual ×2 时序 flake          | 并行负载下 mock endpoint 时序，retry 恢复全绿                                              | 维持 watch-only                                     |
| `pnpm check` / styling-suspects              | exit 0 / 221 = 基线零漂移                                                                  | 无新红项                                            |

---

## 五、结论与后续工作项

按结果面合并为 **5 个 owner plans**（Rule 22/25：同一结果面、同一验证路径的 findings 合并，plan 内分 Phase）：

| Plan                                          | 结果面                                                                                | 覆盖 findings                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1 核心管线热路径批量                          | flux-runtime 表单运行时 + flux-react selector + flux-compiler/SchemaRenderer 编译入口 | R3-P1、P2、P3、P4、P5、P6、P7、P8、P9、P10                                       |
| 2 flow designer 与 workbench 交互性能与 UX    | flow-designer-core/renderers + flux-react workbench + playground flow 工具栏          | R3-P11（含 U4 同根）、P17、P18、P19、U10、U12、U19、U20、U21                     |
| 3 print/spreadsheet/word/report designer 批量 | flux-print-renderers + spreadsheet-_ + word-editor-_ + report-designer-\*             | R3-P12、P13、P14、P15、P16、P20、P21、P22、U11、U13、U18、U22                    |
| 4 renderer 族残余性能与 UX 批量               | form/form-advanced/data/content/scheduling 各族漏网组件                               | R3-P23、P24、P25、P26、P27、P28、P29、P30、U3、U14、U15、U16、U17、U29、U30、U31 |
| 5 playground 应用壳与 ui 组件 UX              | apps/playground + @nop-chaos/ui                                                       | R3-U1、U2、U5、U6、U7、U8、U9、U23、U24、U25、U26、U27、U28、U32                 |

维持 deferred（不进本轮 queue）：表达式 interpreter 闭包提升（profiling-first）、P13 structural 依赖收窄、bundle 入口（playground-only）、normalizeInputCompileCache 键加固（watch-only）、e2e watch-only 三组（50Hz 环境限制 / scada out-of-scope / stripe 时序 flake）。
