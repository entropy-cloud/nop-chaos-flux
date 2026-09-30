# 2026-09-30 代码质量（坏味道/重复/概念一致性）深度优化分析报告（第一轮）

> Status: final
> Last Reviewed: 2026-09-30
> Source: 四路独立探索 agent 代码审计（① 跨包重复代码：jscpd 全量报告聚合 + 逐处 diff 确认；② 代码坏味道：客观统计 + 逐文件抽查；③ 概念一致性：变体词表 + 跨包对比；④ 测试质量与质量门禁盲区）+ 执行者对 agent 结论冲突点的实测裁决（见第五节）
> Related: `docs/analysis/2026-09-28-perf-ux-deep-optimization-analysis.md`（性能轴第一轮）、`2026-09-29-perf-ux-round2-*`、`2026-09-30-perf-ux-round3-*`（性能/UX 轴三轮 21 plans 已全部 completed）。本报告开辟**代码质量轴**（可维护性/重复/一致性），与性能轴互补、不重叠。

## 目的

性能/UX 轴三轮深挖后已无可感知残余；本报告对**代码质量轴**做首次系统挖掘：跨包重复代码、代码坏味道（死代码/巨型函数/类型不安全/调试残留）、概念一致性（同一概念多种命名与多种解法）、以及质量门禁盲区（工具就绪但无机制强制的轴）。所有 finding 均经实现代码核验；agent 结论相互矛盾或经复核不成立的项在第五节如实记录裁决过程。

## 方法与输入

1. **静态基线**（2026-09-30 实测，工作树 HEAD = round-3 closure 批）：`pnpm typecheck`/`build`/`lint`/`check` exit 0；`pnpm test` 78 task 全绿（turbo 并发下 playground 出现过一次偶发失败，单包复跑 406/406 全过，零缓存强制复跑确认全绿——记入 CQ-T14 watch-only）。
2. **客观扫描**：jscpd（597 clones / 2.99%，8592/287311 行重复）、knip（exit 1：79 unused files / 190 unused exports / 333 unused exported types / 3 unused deps / 9 unused devDeps）、`check:oversized-code-files`（2 errors 均为已登记 locale 豁免，214 warnings）、`check-workspace-manifest-deps`（exit 0）。
3. **定性四路**：重复代码（jscpd 597 clones 过滤 test/locale/css 噪音后 350 组文件对逐一聚合）、坏味道（cast/TODO/console/超长函数/死代码逐类 grep + 抽查）、概念一致性（props 命名/加载空态/防抖/store 访问/i18n/变体词表/包结构）、测试与门禁（skip/睡眠/弱断言计数 + 28 项 check 脚本逐个核对 gated 状态 + 已登记基线 live 复测）。

---

## 一、重复代码 Findings（CQ-D\*，按规模×置信度排序）

### CQ-D1 设计器族 host action-provider 粘合层逐包复制 【高】

`validateHostMethodPayload` 包装 + `toActionError/ok/fail` + `invoke(method)` try/catch → dispatch 模板，在 4 个设计器 renderers 包各写一份：`report-designer-renderers/src/host-action-provider.ts:26,55`、`spreadsheet-renderers/src/host-action-provider.ts:8,37`、`word-editor-renderers/src/word-editor-action-provider.ts:28,51`、`flow-designer-renderers/src/designer-action-provider.ts:15`（jscpd ~190L；整族文件 ~950L）。**非同构**（评审核勘误）：report(109L)/spreadsheet(90L) 为同构 dispatch 模板可全模板工厂化；word-editor(194L，6 方法 switch+save 编排+insertField 手工检查)与 flow(558L，40+ 方法直呼 core)只有包装层可共享。根因：flux-core 只导出原语，无"命令命名空间 + contract 表 → ActionNamespaceProvider"工厂。修复方向：flux-core 增 `createHostActionProvider()`（report/spreadsheet 全迁移）+ 公开 toActionError/ok/fail 原语（word/flow 吸收包装层）。

### CQ-D2 industrial 编辑器线 vs 运行时线双实现 + dashboard 第三份句柄 【高】

SCADA 符号树操作（find/add/remove/patch）三条拷贝：`flux-renderers-industrial/src/engine/config-adapter.ts:171`、`editor/renderer/editor-engine.ts:444`、`editor/undo-redo/compute-inverse.ts:35`；引擎 hooks 双线：`use-editor-engine.ts`(361L) ↔ `use-scada-engine.ts`(348L)、`use-editor-handles.ts`(244L) ↔ `use-scada-handles.ts`(160L)；跨包 `flux-renderers-dashboard/src/editor/use-dashboard-editor-handles.ts`(76L) 克隆 industrial handles。克隆 ~200L+，文件群 ~2000L。修复方向：包内下沉 `symbol-tree-ops.ts` + hooks 工厂；dashboard 侧经共享层复用。

### CQ-D3 flux-eval 绑定求值模块跨包复制（3d ↔ industrial）【高】

`flux-renderers-3d/src/binding/flux-eval.ts:19-103`(160L) ↔ `flux-renderers-industrial/src/binding/flux-eval.ts:19-105`(111L)，2 clones 85L；3d 版注释自述"语义对齐 industrial 同名模块"。根因：两包不允许横向依赖，flux-react 又未提供"快照 scope + probe 探依赖"公共层。修复方向：下沉 flux-react bindings 层，域差异以策略参数保留。

### CQ-D4 flux-core value-adapter 在 form-advanced detail-view 近重写 【高】

`flux-core/src/value-adapter.ts`(390L) ↔ `flux-renderers-form-advanced/src/detail-view/value-adaptation-helper.ts`(363L)，3 clones 81L；consumer 侧 detail-field/detail-view 另有 5 clones 89L 的编译/确认序列。~750L 双实现。修复方向：flux-core value-adapter 增可复用 compile/run 组合 API，form-advanced 降为薄调用。

### CQ-D5 form-advanced 数组字段 item 管理 combo ↔ input-table 双实现 【高】

`combo-renderer.tsx`(630L) ↔ `input-table-renderer.tsx`(485L)：9 clones 272L；`combo-renderer.tsx:89-236` ↔ `input-table-row.tsx:73-268`：7 clones 92L。同一"数组项生命周期"（addable/removable/reorderable 解析、itemEntries、行级 memo 比较、remove/move+validate 序列）按视觉容器写两遍。修复方向：包内抽容器无关的 array-item controller + chrome 组件。

### CQ-D6 flux-react dialog-host：DialogView 与 DrawerView 整段同文 【高】

`flux-react/src/dialog-host.tsx:198-400` ↔ `:401-587`，5 clones 167L（handleClose、surfaceContext memo、title/actions/header/footer region 解析逐行同文）。修复方向：抽 `useSurfaceView()`，两个 View 只留容器壳。

### CQ-D7 flux-renderers-data table-renderer 包内克隆群 【高】

行渲染 props 逐一钻透两份副本（`table-body-rows.tsx:93↔148`，2 clones 127L）+ filter apply/reset 双分支重复管线（`use-table-filter.ts:95↔148`，71L）+ 其余 5 文件零散克隆，同包 7 文件 ~470L。修复方向：`TableRowBridgeProps` 单一类型 + 展开透传；`commitFilters(mode)` 单函数。

### CQ-D8 spreadsheet-core 不可变 workbook 重建样板 16 连拷 【高】

`core/cell-operations.ts` 内 16 clones 195L（`cells={...}` → `sheets.map` → workbook 重建三段式）、`structure-operations.ts` 5 clones、`sheet-operations.ts` 4 clones，~300L。修复方向：core 内 `withSheet(doc, sheetId, fn)` 组合子。

### CQ-D9 RendererDefinition 注册字面量 13 包 106 处 【中高】

每渲染器手写 `{type, displayName, category, sourcePackage, component, schemaValidator, propContracts:{…}}`（content 20、basic 18、form 16、ai 14、data 13…共 106 条，20-60 行/条）。根因：flux-core 有类型无 builder。修复方向：`defineRenderer()`/`definePropContract()` 帮助函数 + 试点包迁移，全量迁移机械可批量化。

### CQ-D10 scheduling 族 eventCtx 四连拷 + loading/empty region 三连拷 【高】

`barcode-input.tsx:44`、`calendar.tsx:101`、`gantt.tsx:177`、`kanban-board.tsx:175` 的 CX-10/bug-83 事件上下文构造逐字相同；Skeleton/empty region 块 calendar/gantt/kanban 三处同文。~190L。修复方向：包内 `shared/` 加 `useSchedulingEventCtx()` + `SchedulingSurfaceRegions`。

### CQ-D11 设计器族 inspector 属性面板 6-7 套平行实现 【中】

industrial `inspector-field.tsx`(165L)+`inspector-panel.tsx`(158L)、page-designer `inspector-panel.tsx`(364L)、dashboard `editor-inspector.tsx`(283L)、flow `designer-inspector.tsx`(540L)、print `print-inspector.tsx`(465L)、report inspector(75L+)。均为"按 widget 类型 switch + Label/控件/错误包裹"，合计 ~2200L，结构性重复（非逐行克隆）。**本轮裁定**：收敛需要设计器族共享 field-model 架构决策（editor-core 定位升级），非机械去重，记为 out-of-scope improvement（见第五节）。

### CQ-D12 layout 包 steps ↔ timeline 索引/ownership 样板双写 【高】

`steps-renderer.tsx:20-124` ↔ `timeline-renderer.tsx:60-137`，5 clones 108L（clampIndex/resolveCurrentIndex/valueOwnership 解析）。修复方向：包内 `step-index.ts` 共享；ownership 解析下沉属 flux-react 长期方向。

### CQ-D13 undo/redo 栈骨架 5 处平行实现 【中】

editor-core `undo-command-stack.ts`(89L,泛型零依赖)、flow-designer-core `core/history.ts`(97L)、spreadsheet-core `internal-state.ts:55`、industrial `undo-stack.ts`(205L)、scheduling `kanban-undo-stack.ts`(156L，注释自述与 gantt 同模式)。存储策略（快照/整档 diff/命令）刻意不同，骨架 ~150L 重复。**本轮裁定**：优化候选，不强并（语义漂移风险 > 收益，各栈已有 tests；与 CQ-S12 FIXME 同域备忘）。

### CQ-D14 小工具函数多实现 【高】

`toJsonPointer` 8 处、**4 类语义**（评审核勘误：非同文）：A 组点路径→转义指针 3 处同文（data batch-bar-definition.ts:14、data-schema-validation.ts:121、form form-definition.ts:15）；B 组指针追加 2 处（data echarts/sparkline-schema-validation.ts:4，含死三元条件）；C 组 table-schema-validation.ts:159（不滤 $、全转义）；D 组 form hidden-field-policy-schema.ts:11（签名不同）；E 组 map-renderer-definitions.ts:10（无转义）。深拷贝三种风格（ai 手写递归、flow-designer-core structuredClone+JSON 回退、**6 处**裸 `JSON.parse(JSON.stringify)`：flow-designer-core×4、report-designer-core metadata.ts:11、spreadsheet-core internal-state.ts:26、page-designer-page.tsx:53 `cloneNode()`）。ID 生成 `Date.now()+Math.random().toString(36)` 变体 7 文件/9 调用点（form-advanced 的 condition-builder/id-utils.ts 是自增计数器**不属于此类**，真站点为 upload-field.tsx:426）。~200L。修复方向：flux-core 增 cloneDeep、toJsonPointer（A 组语义）+ appendToJsonPointer（B 组语义）、`utils/id.ts` genId；C/D/E 组语义不同逐点裁定。

### CQ-D15 report-designer-renderers 对 spreadsheet-renderers 的目录级衍生复制 【高】

`types.ts`、`*manifest*.ts`、`renderers.tsx`、canvas 文件对共 6 对（jscpd 8 clones 126L）。共享的 host-method 常量与 contract 形状应上移 `spreadsheet-core`（report 已依赖它），画布差异保留。

---

## 二、代码坏味道 Findings（CQ-S\*）

### CQ-S1 死代码堆积（knip exit 1，门禁缺失）【高】

knip 6.9.0 实测：79 unused files（root workspace 口径复测 68；含生产 src 死文件：`flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx`、`flux-compiler/src/schema-compiler/index.ts`（删除安全：公共入口走 `./schema-compiler.js`）、`flux-renderers-content/src/diff-view/components/diff-gutter.tsx`、`flux-code-editor/src/extensions/sql/index.ts`、`spreadsheet-renderers/src/spreadsheet-toolbar/cell-editor.tsx`、scheduling 4 个子域 barrel 等）、402 unused exports、581 unused exported types、3 unused deps（flux-renderers-mobile/pivot 的 `flux-react`、playground 的 `page-designer-core`——经 grep src 零导入验证）、16 unused devDeps、30 unlisted（分布：playground ~11、scripts/visual-quality 测试 ~18、data 1）。自 2026-07-27 登记以来无数值基线、不可对账（详见 CQ-T1）。清理需逐项验证（入口/动态引用误报排除），先门禁后清理。

### CQ-S2 巨型函数普遍超标 【高】

11 个非测试函数 ≥430 行，最长 ~637 行：`crud-renderer.tsx:56`(~637)、`kanban-board.tsx:47`(~637)、`table-renderer.tsx:67`(~634)、`create-engine.ts:68`(~633)、`gantt.tsx:51`(~628)、`use-conversation.ts:48`(~629，单 hook 9 个 effect)、`flow-designer-core/core.ts:88`(~613)、`runtime-factory.ts:88`(~610)、`wizard-renderer.tsx:55`(~593)、`upload-field.tsx:106`(~577)、`form-store.ts:195`(~493)。文件长度门禁只看文件不看函数，债已转移到函数粒度。

### CQ-S3 "贴线文件"现象 【中】

16 个非测试文件停在 645-699 行（`core.ts:700`、`create-engine.ts:700`、`table-renderer.tsx:700`、`table-header-row.tsx:698`、`runtime-factory.ts:697`…），全部恰好低于 700 ERROR 红线。700 阈值事实上成为软上限，内部函数继续膨胀。与 CQ-S2 同根：需函数级治理而非只调文件阈值。

### CQ-S4 gantt createInitialStore 类型擦除 + 10 处 `as any` 【高】

`flux-renderers-scheduling/src/gantt/gantt.tsx:51-66` 把已有完整类型的 `GanttSchema`（`gantt.types.ts:166-174` 声明 `tasks?: GanttTaskData[]` 等）擦除为 `Record<string, unknown>` + `as any[]` ×10，schema 形状错误静默通过编译直到运行时 `s.parse` 才炸。全仓单文件 `as any` 密度第一。

### CQ-S5 单组件 hook 密度失衡 【高】

`kanban-board.tsx` 47 个 hook 调用/637 行（5 effect）、`table-renderer.tsx` 32、`page-renderer.tsx` 30（6 effect）、`crud-renderer.tsx` 25、`use-conversation.ts` 21（9 effect）。React Compiler 追踪面积大、中间逻辑不可单测。与 CQ-S2 同根，按所有权拆自定义 hook。

### CQ-S6 table-header-row 深嵌套 JSX 热点 【高】

`flux-renderers-data/src/table-renderer/table-header-row.tsx` 最深 16 层缩进、201 行 ≥7 层嵌套；`renderLeafHeaderCell` ~244 行、`NestedTableHeaderRows` ~191 行。扁平树/嵌套树两套头渲染纠缠。

### CQ-S7 playground 路由双登记 【中】

`apps/playground/src/App.tsx` 外层 kind-switch 6 case（每支定制布局/props，不可查表化）+ 内层 domainId-switch 78 支（全文件 84 case，评审核正）+ 33 页面 import；`domain-route-entries.ts`(545L) 另维护 79 条同名路由元数据——**当前存在 1 条漂移**。新增页面需改两处+lazy import 处，无一致性校验。修复方向：DomainRouteEntry 增 component 字段，domainId-switch 退化为查表 + 双向对账测试；kind-switch 保留。

### CQ-S8 测试专用支撑文件混居生产 src 【中】

`flux-renderers-form-advanced/src/condition-builder/config-test-support.tsx`（`: any` ×21 + `as any` ×9，全仓 `: any` 第一名）仅被测试导入；同类 `flow-designer-renderers/src/canvas-bridge-test-support.tsx`、`report-designer-renderers/src/page-renderer.test-support.tsx`。进包体积与 public API 面。修复方向：迁 `__tests__/` 或独立 test-support 入口。

### CQ-S9 `as unknown as` 全仓 305 处（packages 169）【中】

top：`flux-renderers-ai/src/engine/utils.ts`(8，deepClone 泛型惯用，合理边界)、`flux-renderers-industrial/src/symbols/compound.ts`(7，typed props 与 `Record<string,unknown>` 双向互转，合并完全无类型保障)、`flux-compiler/src/source-compiler.ts`(6，evaluator 输出强转)。`@ts-ignore`/`@ts-expect-error` 全仓 **0**（优秀）。修复方向：compound.ts 单一中间表示 + 出口单点校验；source-compiler 返回类型参数化。

### CQ-S10 flux-formula evaluator 核心运算 `as any` 【中】

`packages/flux-formula/src/evaluator.ts:67-85` 五个比较/算术分支 `(left as any) OP (right as any)`，对象参与 `<` 比较返回无意义结果无诊断。修复方向：分支内 typeof 归一化，非法组合走 diagnostics 通道。

### CQ-S11 调试 console.log 混入生产 undo 路径 【高】

`flux-renderers-scheduling/src/gantt/undo-stack.ts:185`：`console.log('[redo-delete]', …)` 无级别无包装，全仓 packages 非测试 src 唯一 console.log，每次 redo 删除任务都输出。

### CQ-S12 唯一 FIXME：Gantt 与 Kanban 撤销栈双实现 【高（仍有效）】

`gantt/undo-stack.ts:194-197` 明说 "could be unified"。全仓非测试 src 唯一 TODO/FIXME/HACK/XXX——注释债总体极健康。与 CQ-D13 同域备忘。

### CQ-S13 诊断输出管道不统一 【中】

非测试 src console.\* 共 195 处（warn 为主），无 eslint no-console 规则；table-renderer 有规范化 `warn-once.ts` 去重包装而 pivot 用裸 `console.error` 且消息硬编码中文（`pivot-renderer.tsx:143/179/203`——ui-consistency 门禁只查用户可见文案，console 是盲区）。

### CQ-S14 form-store 闭包非空断言 4 连发 【低】

`flux-runtime/src/form-store.ts:299-308` `descendantListeners!.delete(listener)` 等——`let` 变量闭包捕获致 TS 无法收窄，当前逻辑正确但脆弱。修复：捕获后立即 const 化。

### CQ-S15 key-value 用 effect 镜像 memo 派生态 【低】

`flux-renderers-form-advanced/src/key-value.tsx:88-108` memo→effect→state→memo 闭环（靠恒等短路收敛，功能正确但多一跳提交）。修复：cache 并入单一 state 或 memo 内 ref 缓存。

### CQ-S16 导出别名重复 【高】

`flux-runtime/src/async-data/request-runtime.ts:496` `export const executeApiObject = executeApiSchema;` 等 4 组（knip Duplicate exports）。修复：主名保留、别名 `@deprecated` 一轮后删。

### CQ-S17 playground 未声明依赖疑云（与既有门禁矛盾，待对账）【低】

knip 报 unlisted dependencies，但 `check-workspace-manifest-deps` 门禁 exit 0 且明确校验"所有源码 workspace import 均已声明"。两工具解析口径不一，**以在链门禁为准**；接入 knip 基线门禁时逐条对账（见 CQ-T1）。

### CQ-S18 renderer-api 公共契约 any 【低】

`flux-core/src/types/renderer-api.ts:228-229` `functions?: Record<string, (...args: any[]) => any>`——公共注入点 any 顺着公式函数扩散。修复：`unknown` 化，与 CQ-S10 配套。

---

## 三、概念一致性 Findings（CQ-C\*）

### CQ-C1 i18n 键三套拼写并存 + 同概念重复键 【影响最大】

`t()` 键格式：`flux.` 前缀 792 处（主流，`flux-i18n/src/i18n.ts:16` `FLUX_NAMESPACE='flux'` 为官方形态）；包名裸前缀 276 处（`t('industrial.scada.canvasLabel')` 161 + `t('scheduling.calendar.*')` 115）；驼峰裸前缀 52 处（`t('conditionBuilder.*')`）。`check-i18n-keys.mjs:50` 对无前缀键自动补 `flux.`，门禁归一化使漂移不被拦截。**真问题（重复键）**：`flux.barcode.cameraUnavailable`（en-US.ts:1585/zh-CN.ts:1580）vs `flux.cameraUnavailable`（barcode-scanner-overlay.tsx:142 调用；词表 en:1395/zh:1390 顶层散键，同功能同义键两份条目；en-US.ts:1175 的 `flux.wordEditor.cameraUnavailable` 为第三份同名但属 word editor 域、合法保留）；`flux.table.noData`（en-US.ts:238，仅 1 处调用 table-renderer.tsx:109）vs `flux.common.noData`（en-US.ts:33，约 20 处调用，值同为 'No Data'）；另有一批顶层散键（alignBarcode/offlineQueueMessage/itemsScanned/batchConfirm，en-US.ts:1395-1400）应收进 `flux.barcode.*`。

### CQ-C2 Button variant 词表三层矛盾 + danger/destructive 双词并存 【高】

`docs/architecture/variant-vocabulary.md:38/:75` 称 `primary` 非法，但 ui cva（`button.tsx:22`，注释自称 "schema-facing main-action convention"）、basic schema（`schemas.ts:285`）、contract union（`basic-renderer-definitions.ts:244-258` 含 primary/info/success/warning/danger）、`styling-system.md:644-647` 均已接纳 primary；R2 审计（`ui-review/R2-consistency-audit.md:98`）记录过 "cva 补 primary" 修复——词表文档停在修复前。`destructive`(:29) 与 `danger`(:38) 在同一 cva 并存，token 层 `theme-tokens/src/styles.css:65-67` `--danger` 家族与 `--destructive` 并存且 `tailwind-preset/src/index.ts:49-53` 互为 fallback 别名。修复方向：一次决断——primary 合法化回写词表文档；danger/destructive 双轨制文档化（schema-facing vs shadcn-facing）并给映射表；token 双定义加注记。

### CQ-C3 useCallback/useMemo 默认加盐 【裁定：非缺陷，转约定文档】

密度 top：kanban-board 25 处、transfer/combo 16 处、array-field 15 处…与 AGENTS.md "React 19 默认不加" 字面冲突，但**批量删除被否决**：行级 React.memo 比较器（如 `keyValueRowPropsEqual`）刻意依赖回调身份稳定，盲删引入性能回归风险；既有 `check:audit-react19-optimization-candidates` advisory 扫描器已在盯。处置： conventions 文档补"何时允许"判据，不做存量清理。

### CQ-C4 空态三种解法 + 两种标记风格 【高】

ui `Empty`（transfer-renderer.tsx:545、tree-option-list.tsx:404）vs 自定义 div+`data-slot`（tree-renderer.tsx:634、list-renderer.tsx:381）vs 自定义 div+类名标记（diff-view-renderer.tsx:147 `nop-diff-empty-state`）vs 纯文本 fallback（echarts/crud/chart renderer）。AGENTS.md 列 Empty 为可用组件。修复方向：内容型空态统一 ui Empty；画布内轻量文本态统一 `data-slot="<type>-empty"` + `flux.common.noData`（与 CQ-C1 联动）。

### CQ-C5 防抖三处手写（共享原语已在 flux-core）【中高】

`scheduleDebounce`/`cancelPendingDebounce` 已导出（flux-action-core 在用），但 `kanban/hooks/use-kanban-filter.ts:41-56`、`diff-view-renderer.tsx:71-87`、`word-editor-renderers/src/editor-canvas.tsx:43-51` 各自手写。修复方向：flux-react 增 `useDebouncedValue()`，三处替换（reaction-runtime 的可中止语义豁免）。

### CQ-C6 RuntimeContext 表内旁路 【中】

`flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:41-60` 自定义 MissingRuntimeContext + 从 flux-react 命名空间抓 RuntimeContext + mock fallback，包内私有 `useFluxReactRuntime()`——与官方 `useRendererRuntime`（hooks.ts:74）平行的第二条读取路径（注释引 G3-R3 审计，为测试 harness 兼容）。修复方向：flux-react 增 `useRendererRuntimeOrNull()` 下沉"优雅降级"能力，删表内复制品。

### CQ-C7 行编辑写回命名 onSync vs onChange 【中】

form-advanced 复合控件用 `onSync`（key-value-row.tsx:22、array-editor.tsx:46），表单公共契约为 `onChange`（input-choice-renderers.tsx:613）。全部为包内部 props 非公共 schema 面。修复方向：form-advanced 包内统一 `onChange`（或 `onItemChange`）。

### CQ-C8 测试放置同包两制混用 【高（统计客观，影响 DX 级）】

全 `__tests__`：ai 65/0、data 152/2、form 96/2；全同目录：scheduling 57/0、industrial 48/0 等；**混用**：form-advanced 87+50、content 5+30、layout 3+17、mobile 4+8。AGENTS.md 两种都允许，基准应为"每包单选"。修复方向：4 个混用包收敛为单一惯例，不做全仓迁移（churn 无收益）。

### CQ-C9 form 包 CSS 交付双离群 【高】

`flux-renderers-form/src/index.tsx:1` `import './form-renderers.css'` + 导出键 `./form-renderers.css`；其余 13 个带样式渲染器包统一"根 styles.css + `./styles.css` 键"（06-23 日志 MA-05/06 确立的修正后模式）。修复方向：form 迁移为标准模式，playground @import 同步。

### CQ-C10 加载反馈无规约 + 裸 Loader2 ×2 【中】

Spinner overlay（table-loading-overlay.tsx:16-24）vs Skeleton（kanban/gantt/calendar）无"何时用哪个"规约；`ai-tool-call.tsx:346`、`ai-attachments.tsx:407` 裸 `Loader2 + animate-spin` 绕过 ui Spinner（丢 role="status"/aria-label）。修复方向：补一行规约；两处换 ui Spinner。

### CQ-C11 入口/导出组织漂移 【允许范围内，仅记录】

4 包 `index.tsx` vs 11 包 `index.ts`；导出组织三式并存。AGENTS.md 只要求单一入口，不判违规；新包趋 type-block+named。

### CQ-C12 内联裸 `<button>` 判据缺失 【低中】

12 文件用裸 `<button type="button" data-slot=…>`（org-select-panel、calendar-month-view 等）；`tabs.tsx:383-389` 已有"为何不用 Button"注释先例。修复方向：renderer-markers 文档补"文本级内联 affordance 用裸 button+data-slot，控件级用 ui Button"判据 + org-select-panel 补注释。

---

## 四、测试质量与门禁盲区（CQ-T\*）

### CQ-T1 knip 不在任何门禁链，无数值基线 【最高杠杆】

`audit:knip` 工具就绪、阈值配置在 knip.json、唯一登记是 `docs/audits/arm-index.md:182` 的"exit 1 same pattern"（无数值）——自 2026-07-27 起死代码增长不可感知。scripts fixtures（`scripts/__tests__/fixtures/**`）造成 knip 误报需入 ignore。修复方向：committed 基线快照（JSON）+ 数值 diff 门禁接入 `pnpm check`；CQ-S17 逐条对账；之后做经验证的死文件清理批。

### CQ-T2 check:duplicates 不在门禁链，且登记口径只有 ratio 【高】

带阈值的 `check:duplicates`（exit 0）与 raw dump `check:duplicates:detail`（固有 exit 1）都不在 check 链。08-08 登记基线 454 clones / 3.04%，live 597 / 2.99%——**ratio 持平掩盖 clones 数 +31%**。修复方向：`check:duplicates` 接入 check 链，输出增加 clones 数基线对比。

### CQ-T3 check:audit-suspects 假门禁 + advisory 扫描器无数值基线 【高】

`scripts/audit/shared.mjs:664` `runScanner` 永不因命中 exit 1——`check:audit-suspects`（在链内，live 716 命中 exit 0）给人已设防的错觉。对照先例：`find-ui-consistency-gaps.mjs` 有 EXEMPTIONS 硬门禁 + path-shape guard。修复方向：为在链的 styling-suspects(221)/audit-suspects(716)/test-global-leaks(108) 三个建 committed 数值基线门禁（新红即 fail），其余 advisory 扫描器保持趋势可见定位并记录理由。

### CQ-T4 docs-garbled 双链遗漏 【一行修复】

`check:docs-garbled` 脚本存在但 check 链与 lint 链都不含——全仓唯一双重遗漏的现成脚本。

### CQ-T5 无 no-console 门禁 【中】

eslint 无 no-console；非测试 src `console.log/debug` 30 处。修复方向：eslint 加 `no-console: ['error', {allow:['warn','error']}]` + 既有 30 处治理（CQ-S11 先行）或白名单基线。

### CQ-T6 RTL cleanup 散落 612 个文件 【中】

共享 setup 未开自动 cleanup（globals:false 下 RTL auto-cleanup 不生效），612 个 `.test.tsx` 手动 `cleanup()`；仅 word-editor-renderers 挂了 setup。修复方向：`createSharedVitestConfig` 对 happy-dom 档统一注入 cleanup+jest-dom setup；存量手动调用无害保留，新测试免记忆负担。

### CQ-T7 jsdom 残留登记过时 + scan 工具未接链 【中低】

05-14 登记"零 jsdom 残留"已过时：live 为 **6 处** pragma（`flux-renderers-content` 5 个带注释（DOMPurify 安全测试需要，刻意决策）+ `flux-renderers-data/src/__tests__/table-quick-edit-savebar-order.test.tsx:1`，content 与 data 两包 devDeps 各含 jsdom）——data 包 pragma/依赖属刻意决策或待迁移需裁定；`scan-jsdom-usage.mjs` 未接任何 pnpm script，漂移因此静默。修复方向：pragma 白名单小门禁 + 更新登记。

### CQ-T8 testid 双轨无约定 【低】

e2e `data-testid/getByTestId` 2308 处 vs 组件 `data-slot` 1569 处，无约定文档。修复方向：至少落一份约定（demo 页 vs 组件层分工）。

### CQ-T9 睡眠式等待 139 处（32 处 ≥100ms）【中】

`field-default-value-binding.test.tsx` 单文件 12 处 300-500ms 硬睡眠（:58,:94,:123,:130,:136）、`branch-fill-2.test.tsx` 同模式。慢机既 flaky 又拖慢全量。修复方向：≥100ms 处替换 `vi.waitFor`/`waitFor`，逐个裁定。

### CQ-T10 弱断言与活跃诊断 spec 【高（个别点）】

`page-designer-renderers/src/branch-fill-2.test.tsx:104` 连续 fireEvent 后唯一断言 `expect(true).toBe(true)`（真问题，补结果断言）；`tests/e2e/debug-canvas.spec.ts:21` 纯诊断（console.log + waitForTimeout(3000) + expect(true)）未 skip 活跃消耗每次全量 e2e ≥3s。`toBeDefined()` 410 处抽查均非空测试。

### CQ-T11 e2e 诊断 spec 命名四风格并存 【低】

`diag`/`debug`/`probe`/下划线前缀混用，无"正式 vs 诊断"区分约定。修复方向：诊断 spec 统一 skip+注记或移 `exploratory/`。

### CQ-T12 CI 托管方存疑（基础设施观察，需人类确认）【前提性】

origin 为 gitee.com，`.github/workflows/ci.yml`（GitHub Actions）不会被 Gitee 触发——全部质量门禁实际依赖本地按纪律手跑。**本报告不擅自改 CI 配置**；建议人类确认托管策略后镜像流水线（Gitee Go 或迁移）。此为 CQ-T1~T5 门禁落地价值的前提背景。

### CQ-T13 coverage 阈值缺 5 包 【低】

flux-print-core/print-renderers/tailwind-preset/theme-tokens/playground 无阈值。记录备忘。

### CQ-T14 playground 单测并发偶发 【watch-only】

本轮实测一次：turbo `--concurrency=2` 全量跑 playground 失败，单包复跑与零缓存强制复跑均全绿。记入 watch-only，不立案。

### 已登记基线 live 复测结论

styling-suspects 221 ✅ 零漂移；oversized 2 errors 均 locale 豁免 ✅；502 e2e 红台账抽查 4 项全吻合 ✅；watch-only perf 3 项断言原样（无 skip 注记，与登记口径一致）✅；**duplicates 454→597 ⚠️ 数量 +31% 未被登记口径捕捉**；**knip 无数值基线 ❌**；**jsdom "零残留" ❌ 已过时**。

---

## 五、执行者裁决记录（agent 结论冲突与不采纳项）

| 项                                | agent 结论                                 | 实测裁决                                                                                                                                          |
| --------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13 份相同 vitest.config.ts 可收敛 | 重复代码 agent 报"md5 相同可收敛到 shared" | **误报**。40/40 包全部已 `createSharedVitestConfig`，同 md5 恰因都是同构的一行委托配置；无可收敛空间                                              |
| playground 30 处 unlisted deps    | 坏味道 agent 引 knip 报 F17                | **以在链门禁为准**：`check-workspace-manifest-deps` exit 0 且语义明确覆盖此轴；knip 口径待 CQ-T1 接基线时逐条对账（CQ-S17 降级为待对账项）        |
| knip unused exports 数            | 两 agent 分别报 402 与 190+333(types)      | 统计口径差异（exports vs exported types 分列），基线接入时以快照工具输出为准                                                                      |
| 批量删除 useCallback/useMemo      | 一致性 agent 建议自顶向下删                | **否决**：行级 memo 比较器依赖回调身份，盲删是性能回归风险；转约定文档（CQ-C3）                                                                   |
| 全仓测试放置统一迁移              | 可选建议                                   | **收敛范围限定 4 个混用包**，全仓迁移 churn 无收益（CQ-C8）                                                                                       |
| D11 inspector 七实现立即合并      | 建议 editor-core 抽共享 field-model        | **defer（out-of-scope improvement）**：需要设计器族架构决策（editor-core 定位升级 + 各设计器注入模型），非机械去重；本轮不立项                    |
| D13/S12 undo 栈统一               | 建议 import editor-core UndoCommandStack   | **defer（optimization candidate）**：五处存储策略差异系刻意设计，强行统一语义漂移风险大于 ~150L 收益                                              |
| advisory 扫描器 12 个全部建基线   | 测试 agent 建议                            | **收敛为在链 3 个**（styling/audit-suspects/test-global-leaks）建数值基线；其余保持 advisory 趋势定位（全量基线维护成本 > 价值），理由记录于 plan |

## 六、优先级与 Plan 映射

执行顺序即下表顺序（门禁先行保护后续批次；core 下沉为跨包去重解锁；概念一致性与定向缺陷独立）：

| Plan                                          | 结果面                                             | 收纳 findings                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `2026-09-30-cq-1-quality-gates-plan`          | 质量门禁与测试基建收口（防回归机制）               | T1-T8（T12 仅记录）                                                                                                                         |
| `2026-09-30-cq-2-core-shared-primitives-plan` | flux-core/flux-react 共享原语下沉（公开 API 增量） | D14、D1（工厂）、D9（builder+试点）、C5、C6                                                                                                 |
| `2026-09-30-cq-3-intra-package-dedup-plan`    | 渲染器/核心包内重复消除                            | D5、D6、D7、D8、D10、D12                                                                                                                    |
| `2026-09-30-cq-4-cross-package-dedup-plan`    | 跨包重复与衍生实现收敛                             | D2、D3、D4、D15（D11/D13 defer 见第五节）                                                                                                   |
| `2026-09-30-cq-5-conceptual-consistency-plan` | 概念一致性收敛（schema/i18n/文档契约）             | C1、C2、C4、C7、C8、C9、C10、C12                                                                                                            |
| `2026-09-30-cq-6-targeted-defects-plan`       | 定向缺陷与卫生批                                   | S2/S3/S5/S6 优先拆分点、S4、S7、S8、S9(compound/source-compiler)、S10、S11、S13、S14、S15、S16、S18、T9、T10、T11、S1（经验证的死文件清理） |

## Test Strategy

档位：**必须自动化**（门禁项全部落 committed 基线 + 门禁脚本测试，仿既有 `scripts/__tests__/` 先红后绿模式）+ **建议有测**（重构项 focused 单测随 PR）。
