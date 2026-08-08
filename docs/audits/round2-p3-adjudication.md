# 第二轮 P3 逐条裁决表（round2-p3-adjudication）

> 生成：2026-08-08，来源 plan `docs/plans/2026-08-08-0715-3-round2-d2-p3-adjudication-residual.md` Phase 1
> 方法：消费 `docs/audits/round2-p3-inventory.md`（D0 产物，149 P3 + 08-06/08-07 审计 P3 5 条 + Follow-ups 归集）+ 卡内原文状态交叉核对（`docs/audits/per-component/*.md`）+ live repo 证据复核
> 用途：D2 P3 裁决基准。每条目含裁决（`fixed` / `keep` / `dismissed`）+ 一句理由 + 证据（plan 引用或 `文件:行`）。零悬挂。
> 先例：`docs/audits/cr-inventory-adjudication.md`（第一轮 CR 裁决表，零悬挂先例）。
> 联动：P3 低成本当场修复 6 条（本 plan 落地，test-first + focused 测试）；卡内状态回写见各卡 `[P3-x]` 行。

## 裁决口径

- **四档处理**（plan Phase 1 定义）：(a) 低成本（约 15 分钟内）当场修复——test-first + focused 测试；(b) 卡内既有 `fixed`（带 plan 引用）直接镜像为 fixed；(c) 记录留痕（keep，卡内既有裁决保持）；(d) 驳回 + 理由（dismissed，n/a / 非缺陷 / 契约一致 / 历史文档不回写等）。
- **D1 交接收口**：D1（plan `2026-08-08-0715-2`）2026-08-08 执行完毕，P2/P3 **零登记项**（closing evidence 在案：四模式族回扫零命中）——本表 D1 登记 P3 行数 = 0，零悬挂口径已覆盖。

## 计数汇总（live 2026-08-08）

| 分类      | 条数    | 说明                                                                 |
| --------- | ------- | -------------------------------------------------------------------- |
| fixed     | 26      | 卡内既有 fixed 20 条（镜像，附原 plan 引用）+ 本 plan 落地 6 条      |
| keep      | 99      | 记录留痕（低影响 / 既有裁决保持 / 归 CR 已覆盖）                     |
| dismissed | 24      | 驳回 + 理由（n/a / 非缺陷 / 契约一致 / 历史文档不回写 / 作者契约外） |
| **合计**  | **149** | 与库存表 149 条逐条对齐（live `rg -c -- "\[P3-"` = 149 复核一致）    |

> 另有 08-06/08-07 审计 P3 5 条（全部 fixed，§2）+ D1 登记 0 条（§3）。

## 1. 逐条裁决表（149 条，74 卡）

### 1.1 fixed（26 条）

| 卡文件            | 编号     | 内容摘要                                                      | 裁决  | 证据                                                                                                                                                                                                                                   |
| ----------------- | -------- | ------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| barcode-input     | P3-1     | 文档漂移（离线队列/降级 tooltip 等）                          | fixed | CR plan-2026-08-06-0329-1 Phase 4 dim 17（design.md §12.1/§12.2 标注未实现）                                                                                                                                                           |
| array-field       | P3-1     | 根 div 嵌套 data-slot="field-control"                         | fixed | plan-2026-08-05-1359-1 Phase 3（FieldFrame 唯一 owner）                                                                                                                                                                                |
| combo             | P3-1     | 同上                                                          | fixed | 同上                                                                                                                                                                                                                                   |
| condition-builder | P3-1     | `fields` 消费键补注册                                         | fixed | 随 P1-3 一并注册（卡内留痕）                                                                                                                                                                                                           |
| icon-picker       | P3-1     | 根 data-slot 重复                                             | fixed | plan-2026-08-05-1359-1 Phase 3                                                                                                                                                                                                         |
| icon-picker       | P3-2     | 搜索 input 无 aria-label                                      | fixed | plan-2026-08-05-1359-1 Phase 2（t('flux.form.searchIcon')）                                                                                                                                                                            |
| icon-picker       | P3-3     | 缺省 placeholder 硬编码中文                                   | fixed | plan-2026-08-05-1359-1 Phase 1 I1（t('flux.form.selectIcon')）                                                                                                                                                                         |
| input-number      | P3-1     | 嵌套 data-slot="field-control"                                | fixed | plan-2026-08-05-1359-1 Phase 3                                                                                                                                                                                                         |
| input-table       | P3-1     | 同上                                                          | fixed | 同上                                                                                                                                                                                                                                   |
| gantt             | P3-1     | 硬编码英文 aria/aria-live                                     | fixed | i18n key `scheduling.gantt.*` en-US/zh-CN + t() 提取                                                                                                                                                                                   |
| gantt             | P3-2     | 文档 phantom（§8.1/§8.3/§9.0/§12.7/undoLimit + example.json） | fixed | CR plan-2026-08-06-0329-1 Phase 4 dim 17 同步                                                                                                                                                                                          |
| key-value         | P3-1     | 根 data-slot 重复                                             | fixed | plan-2026-08-05-1359-1 Phase 3                                                                                                                                                                                                         |
| markdown-editor   | P3-1     | 预览实时更新无 aria-live                                      | fixed | plan-2026-08-05-1359-1 Phase 2（aria-live="polite"）                                                                                                                                                                                   |
| object-field      | P3-1     | 根 data-slot 重复                                             | fixed | plan-2026-08-05-1359-1 Phase 3                                                                                                                                                                                                         |
| variant-field     | P3-1     | reportVariantFieldFailure 默认文案硬编码英文                  | fixed | plan-2026-08-05-1359-1 Phase 1 I7（t('flux.form.variantUpdateFailed')）                                                                                                                                                                |
| variant-field     | P3-2     | transform\*Action 显式 ignored                                | fixed | CR plan-2026-08-06-0329-1 Phase 4（design.md §5 文档化）                                                                                                                                                                               |
| picker            | P3-1     | 弹层搜索 input 无 aria-label                                  | fixed | plan-2026-08-05-1359-1 Phase 2（t('flux.picker.search')）                                                                                                                                                                              |
| picker            | P3-2     | `searchable` 定义字段未标 valueType                           | fixed | CR plan-2026-08-06-0329-1 Phase 3（补 valueType:'boolean'）                                                                                                                                                                            |
| transfer          | P3-1     | TransferPane aria-multiselectable 恒真                        | fixed | plan-2026-08-05-1359-1 Phase 2（multiple 穿透条件发布）                                                                                                                                                                                |
| tree              | P3-2     | aria-label fallback 'Tree' 硬编码                             | fixed | plan-2026-08-05-1359-1 Phase 1 I8（t('flux.data.tree')）                                                                                                                                                                               |
| **wizard**        | **P3-1** | `mode === 'vertical' ? 'mt-4' : 'mt-4'` 恒等三元              | fixed | **plan-2026-08-08-0715-3 当场修复**：`className="mt-4"`（wizard-renderer.tsx:609）；focused 测试 wizard-c5-1-contract.test.tsx +1（双 orientation 断言）                                                                               |
| **kanban**        | **P3-4** | kanban-board.tsx:6 注释 "snapshot-based" 与实现不符           | fixed | **plan-2026-08-08-0715-3 当场修复**：注释同步 command-based（kanban-board.tsx:6-8）                                                                                                                                                    |
| **gantt**         | **P3-5** | `store.destroy()` 未在卸载时调用                              | fixed | **plan-2026-08-08-0715-3 当场修复**：onMount effect cleanup 追加 store.destroy()（gantt.tsx:162-166）；focused 测试 gantt-store.test.ts +1（destroy 重置状态）                                                                         |
| **diff-view**     | **P3-3** | three-column flash setTimeout 未清理                          | fixed | **plan-2026-08-08-0715-3 当场修复**：effect cleanup clearTimeout（diff-three-column-view.tsx:83-90）；focused 测试 diff-view-renderer.test.tsx +1（假时钟 unmount 清零 + 500ms 移除）                                                  |
| **form**          | **P3-1** | loadAction 失败消息复用 "Form initAction failed"              | fixed | **plan-2026-08-08-0715-3 当场修复**：reportFormInitActionError 增 message 参数，loadAction 路径报 "Form loadAction failed"（form-lifecycle-helpers.ts:92-107 + form-load-action.ts:76）；focused 测试 form-loadaction.test.tsx +1 断言 |
| **input-time**    | **P3-1** | displayFormat 仅驱动秒分辨率                                  | fixed | design.md §4「displayFormat 语义（2026-08-03 C2.4 收敛）」说明已在案，本 plan 复核闭环（input-time.md 状态回写）                                                                                                                       |

### 1.2 keep（99 条，记录留痕）

| 卡文件            | 编号 | 内容摘要                                                            | 裁决 | 理由                                                                                                       |
| ----------------- | ---- | ------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| ai-bubble         | P3-1 | renderers.md §13 onAction 遗留文案                                  | keep | 文案遗留不影响契约（schema 无此字段）；CR 已归集                                                           |
| collapse          | P3-1 | scope 写用 startTransition 包同步 store 更新                        | keep | 与 steps 同型无害（C2.x 同裁定）                                                                           |
| ai-prompts        | P3-1 | 重复 label+badge 项 key 碰撞                                        | keep | 静态推荐列表场景罕见；N-6 家族保序设计注释承认                                                             |
| calendar          | P3-1 | 每 render O(R×D×E) 重算 + O(n²) 列打包                              | keep | 性能记录；无契约缺口                                                                                       |
| calendar          | P3-2 | 死 CSS `.nop-batch-scheduler-*`/`.nop-timezone-*`                   | keep | 死样式记录；移除留待样式治理轮次                                                                           |
| calendar          | P3-3 | useImperativeHandle 每 render 重注册                                | keep | React19 既有设计裁定（C3.x 同）                                                                            |
| calendar          | P3-4 | 测试假绿（未触发即断言/toBeTruthy 化）                              | keep | 记录：closure 前加固 1-2 处关键断言属测试加固项；既有断言仍覆盖关键行为                                    |
| barcode-input     | P3-2 | 模块级 t() + useSyncExternalStore 订阅 churn                        | keep | i18n 前缀已归一（CX-7）；订阅 churn 无行为缺口                                                             |
| crud              | P3-1 | `$crud` 绑定不进入 loadAction args 求值                             | keep | 文档显式边界（design §7.2 仅承诺 query/pagination/sort/filters/selection）；author 用 statusPath/显式 args |
| crud              | P3-2 | `polling.stopWhen` 由上游 data-source 消费                          | keep | 文档显式（design E1d）；CrudPollingConfig 仅透传面                                                         |
| crud              | P3-3 | CrudQueryRegionProps 残留类型导出                                   | keep | 无消费者但尺寸小、语义自文档化，随 P2-2 保留                                                               |
| button-group      | P3-2 | selectedSet 每渲染重建                                              | keep | n 为按钮数，规模小                                                                                         |
| array-field       | P3-2 | scalar item 移除时 child contract 未单独 await                      | keep | b32-array-submit-and-validate 覆盖提交时序；无行为缺口                                                     |
| array-editor      | P3-1 | useCallback 簇 react19 工具命中                                     | keep | 既有设计裁定（C3.x 同）                                                                                    |
| array-editor      | P3-2 | `labelBase` aria-label 无 i18n key                                  | keep | 语义性标签走 schema itemLabel 定制路径；登记 CR 评估                                                       |
| array-editor      | P3-3 | E3 non-goals 复验（copyable/deleteConfirmDialog/addable-removable） | keep | 复验裁定成立：次要 UX，form runtime 层统一更优；登记 backlog 归 CR                                         |
| fieldset          | P3-1 | 无 propContracts                                                    | keep | 与 container/page 同模式，editor 元数据缺失记录                                                            |
| alert             | P3-1 | close 按钮 absolute 定位可能与 actions 区重叠                       | keep | ui primitive 规则面向单数 slot，renderer 用复数 slot；视觉重叠低风险                                       |
| alert             | P3-2 | 无 title/body 空 alert 仅渲染 icon                                  | keep | 空态行为可接受                                                                                             |
| checkbox-group    | P3-1 | aria-errormessage 未接                                              | keep | FieldFrame 层已处理校验文案，低影响；归 CR                                                                 |
| button            | P3-1 | href 模式 disabled 无 aria-disabled                                 | keep | 仅记录                                                                                                     |
| card              | P3-1 | 冗余 useCallback                                                    | keep | P3 卡内记录，不处理                                                                                        |
| checkbox          | P3-1 | required 对 unchecked=false 不报错                                  | keep | 平台级 isEmptyValue 语义（false 非空）；归 CR                                                              |
| input-datetime    | P3-1 | onFocus/onBlur 挂 PopoverContent                                    | keep | 共享 date-field-control；submit 校验不受影响；归 CR                                                        |
| chart             | P3-2 | `component:resize` 语义为测量容器宽度                               | keep | 实现为实际测量动作，设计已更新对齐                                                                         |
| condition-builder | P3-2 | ConditionCustomOperator.values 类型未消费                           | keep | 设计 §7.2 明示「尚未消费…后续可扩展」文档诚实                                                              |
| condition-builder | P3-3 | `title` 为 BaseSchema 通用字段重声明                                | keep | universal 键，与其它渲染器一致                                                                             |
| condition-builder | P3-5 | picker 模式 conditionCount 仅计顶层 children                        | keep | 计数口径选择，无契约承诺；归 CR 评估                                                                       |
| condition-builder | P3-6 | React19 候选（useCallback 簇）                                      | keep | H30 投影缓存既有设计（projected-stability.test.tsx 锚定）                                                  |
| editor            | P3-1 | focus:outline-none 无可见焦点环                                     | keep | Tiptap contenteditable 有 caret 反馈；归 CR 视觉评估                                                       |
| icon-picker       | P3-4 | useCallback 簇                                                      | keep | 既有设计裁定（C3.x 同）                                                                                    |
| icon-picker       | P3-5 | 07-13 Deferred 复验（iconTemplate/component:open）                  | keep | 复验裁定成立：out-of-scope improvement + optimization candidate；登记 backlog 归 CR                        |
| date-range        | P3-1 | `data-range-kind` sr-only 断言钩子                                  | keep | 可留作 e2e 断言契约                                                                                        |
| date-range        | P3-2 | 外部越界存储值只读展示不 clamp                                      | keep | design D9 仅约束写路径                                                                                     |
| grid              | P3-2 | grid-item 不透传 data-testid                                        | keep | items 为布局容器，testid 语义在 body 内                                                                    |
| carousel          | P3-1 | api 未初始化时 handles 返回 ok 无副作用                             | keep | 行为可接受                                                                                                 |
| carousel          | P3-2 | onSelect 初始调用一次                                               | keep | lastIndexRef 初始与首屏一致，无 onChange 误报                                                              |
| data-source       | P3-1 | compiledSource 缺失时 effect 内 throw                               | keep | dev 期诊断错误（编译管线前置保证）                                                                         |
| diff-view         | P3-1 | 文件搜索 input 无 label                                             | keep | placeholder 仅；a11y 增强候选                                                                              |
| diff-view         | P3-2 | `data-diff-gutter="mid"` 不在 design §10 词汇表                     | keep | 记录                                                                                                       |
| diff-view         | P3-4 | 注册项无 componentCapabilityContracts                               | keep | 族内惯例；校验属设计器增强面                                                                               |
| icon              | P3-1 | invalid-size dev console.warn                                       | keep | DEV 门控，仅记录                                                                                           |
| detail-view       | P3-1 | name 仅作 scopePath fallback                                        | keep | container 级语义边界（design 已立契）；归 CR 文档化建议                                                    |
| input-year        | P3-1 | 逐键即时提交                                                        | keep | 同 input-month immediate-commit 语义                                                                       |
| input-quarter     | P3-1 | year 输入逐键即时提交                                               | keep | 同 input-month                                                                                             |
| form              | P3-2 | evaluationBindings.prevResult: undefined 冗余                       | keep | 分支绑定覆盖，行为正确                                                                                     |
| form              | P3-3 | `static` fields valueType boolean vs schema union                   | keep | editor 分类 nit                                                                                            |
| input-number      | P3-2 | `validate` 未注册进 fields                                          | keep | 定义契约差异，CR 集中裁决                                                                                  |
| image             | P3-1 | fetchAsDataUri catch 静默吞错                                       | keep | 失败可见（error 态），无诊断噪音                                                                           |
| gantt             | P3-3 | `gantt-drop-indicator` 无 nop- 前缀                                 | keep | widget 内部视觉类（非 marker 契约）；改名需连带测试断言核对，记录留痕                                      |
| gantt             | P3-4 | 死代码组件（filter-bar/export-handles/scheduler-config）            | keep | 记录；移除留待清理轮次                                                                                     |
| input-date        | P3-1 | onFocus/onBlur 挂 PopoverContent                                    | keep | submit 校验不受影响；移动有 popover 关闭回归风险；归 CR                                                    |
| input-date        | P3-2 | valueFormat 非法 token 无 schema 校验                               | keep | schema 级校验属保护区域机制面；记录增强建议；归 CR                                                         |
| json-view         | P3-1 | 树无 role="tree"                                                    | keep | react-json-view-lite 库限制，展示型数据视图可接受                                                          |
| json-view         | P3-2 | navigator.clipboard 直调                                            | keep | INV-1 清单外、best-effort、capability-checked                                                              |
| input-text        | P3-1 | design.md §10 suggest 触发无新增 DOM 漂移                           | keep | 记录（PopoverTrigger span 实际存在）                                                                       |
| input-text        | P3-2 | attemptedFetch 不随输入重置                                         | keep | 空态提前 ≤300ms 瞬态，继续输入即重试；归 CR                                                                |
| input-text        | P3-3 | refreshSource rejection 静默                                        | keep | `.catch(() => undefined)` 非 unhandled；重输即重试；归 CR                                                  |
| input-file        | P3-1 | 单选模式旧上传不取消                                                | keep | last-wins 值语义正确；取消 in-flight 为优化候选；归 CR                                                     |
| input-file        | P3-2 | existing 列表 key=url+name+size                                     | keep | 同文件重复上传仅 dev key 告警，DOM 正确；归 CR                                                             |
| input-file        | P3-3 | t('flux.form.cancel', {defaultValue}) 兜底冗余                      | keep | 记录                                                                                                       |
| input-tree        | P3-1 | 根无 data-testid 透传                                               | keep | FieldFrame 已在 frame 输出（实证冲突已回退）；tree-select 既有透传归 CR 统一裁决                           |
| input-tree        | P3-2 | clear handle 写 undefined vs ''                                     | keep | 两组件各自契约内部一致；归 CR                                                                              |
| input-tree        | P3-3 | valuePathMap 基于 baseOptions                                       | keep | enableNodePath + 懒加载回退 String(v) 文档化限制；归 CR                                                    |
| input-tree        | P3-4 | aria-checked 仅 indeterminate 输出                                  | keep | 同 tree-select                                                                                             |
| select            | P3-1 | loadingWithRemote 期间 clearable 可用                               | keep | 低风险（清空不触发请求）；归 CR                                                                            |
| select            | P3-2 | check:audit-missing-renderer-markers 假阴性                         | keep | C1.3/C2.2 已证，升级归 CG                                                                                  |
| radio-group       | P3-1 | selectedValue 类型断言泛化                                          | keep | cosmetic，随修复处理                                                                                       |
| input-month       | P3-1 | year 输入逐键即时提交                                               | keep | immediate-commit 语义，最终值正确                                                                          |
| input-image       | P3-1 | crop 字段零实现                                                     | keep | design §11 显式保留扩展点；归 CR 评估 feature plan                                                         |
| markdown-editor   | P3-2 | rows 固定 8 无 schema prop                                          | keep | textarea 族增强项（schema prop 非承诺）；归 CR                                                             |
| markdown-editor   | P3-3 | design.md 无 example.json                                           | keep | 低优先记录                                                                                                 |
| markdown-editor   | P3-4 | 大文档每键全量 parse                                                | keep | live preview 固有取舍；useDeferredValue 为优化候选；归 CR                                                  |
| loop              | P3-1 | loop 无自有 DOM 壳层                                                | keep | design §1 设计内语义（instancePath/repeated 定位）                                                         |
| kanban            | P3-1 | collectAllTags/wipOverLimitColumns 每 render O(n)                   | keep | 性能记录                                                                                                   |
| kanban            | P3-2 | legacy aria-grabbed、drop indicator 无 ARIA                         | keep | 记录；a11y 增强候选                                                                                        |
| kanban            | P3-3 | kanban-export.ts 未接线死代码                                       | keep | 记录；CR 评估接线或删除                                                                                    |
| key-value         | P3-2 | useCallback 簇                                                      | keep | 既有设计裁定（C3.x 同）                                                                                    |
| recurse           | P3-1 | 无 loop 上下文静默渲染 null                                         | keep | design §2/§6 明确契约（作者误用场景），与全族静默语义一致                                                  |
| recurse           | P3-2 | 注册项无 defaultSchema                                              | keep | 由第一轮 Phase 2 共性修复补齐（fixed，见 reaction 卡共性裁决）                                             |
| object-field      | P3-2 | transformIn/transformOut 失败仅 console.warn                        | keep | 设计上由宿主动作触发重试；归 CR                                                                            |
| text              | P3-1 | copy-to-clipboard dev console.warn                                  | keep | DEV 门控，仅记录                                                                                           |
| pagination        | P3-1 | design.md §8 推荐句柄未实现                                         | keep | 文档显式「推荐」措辞，非契约承诺                                                                           |
| table             | P3-1 | expandedRowKeys 仅作 local 种子                                     | keep | design §7 裁定 (b) 显式 local-only                                                                         |
| table             | P3-2 | pagination.mode:'infinite' 声明 table 不消费                        | keep | crud 宿主面消费（resolvePaginationMode）；非 table 行为；归 CR                                             |
| table             | P3-3 | showSizeChanger 声明 table 不消费                                   | keep | crud 传值；非 table 行为；归 CR                                                                            |
| table             | P3-4 | columnSettings.draggable 未落地                                     | keep | design.md:64 显式「仍未落地」                                                                              |
| tag-list          | P3-1 | `_fieldState` 未消费订阅                                            | keep | 维持响应性的有意订阅（非死代码）；归 CR 集中裁定                                                           |
| tag-list          | P3-2 | component:addItem/removeItem 未提供                                 | keep | design §8 自述「后续可考虑」，out-of-scope improvement 归 CR                                               |
| wizard            | P3-2 | 步进切换无焦点管理                                                  | keep | nav 有 aria-current + disabled 门控；AT 可感知（CR D2 复核通过）                                           |
| wizard            | P3-3 | 同 tick 双击 Next commit 竞态                                       | keep | committing 守卫非原子但按钮 disabled 下一帧生效，风险窗口极小                                              |
| scope-debug       | P3-1 | 缺省 title 'Scope Debug' 英文硬编码 fallback                        | keep | i18n 基线内调试工具语义，仅记录不改                                                                        |
| transfer          | P3-2 | 统计全角括号（x/y）                                                 | keep | 与 design §8 一致，展示样式                                                                                |
| tree-select       | P3-1 | input-tree 根无 testid（tree-select 有）                            | keep | FieldFrame 已输出 testid；tree-select 既有透传为同型潜在重复，归 CR 统一裁决                               |
| tree-select       | P3-2 | clearable 写 '' vs undefined                                        | keep | 两组件内部一致，一致性归 CR                                                                                |
| tree-select       | P3-3 | valuePathMap 基于 baseOptions                                       | keep | 懒加载回退 String(v) 文档化限制；归 CR                                                                     |
| tree-select       | P3-4 | aria-checked 仅 indeterminate 输出                                  | keep | checked 态靠 aria-selected + aria-multiselectable                                                          |
| tree              | P3-1 | aria-selected={isTabbable}                                          | keep | 表达 roving-tabindex 活动节点；改进归 CR/a11y 专项                                                         |
| separator         | P3-1 | decorative + label 并存忽略 decorative                              | keep | label 强制水平已记录设计注；行为可接受                                                                     |

### 1.3 dismissed（24 条，驳回 + 理由）

| 卡文件            | 编号 | 内容摘要                                    | 裁决      | 理由                                                                                    |
| ----------------- | ---- | ------------------------------------------- | --------- | --------------------------------------------------------------------------------------- |
| collapse          | P3-2 | collapsible=false 仅阻止关闭已开面板        | dismissed | 行为与定义「Whether each panel can re-collapse itself」一致，非缺陷                     |
| button-group      | P3-1 | 空 items 无显式空态区                       | dismissed | 按钮组空即空容器，n/a 可接受                                                            |
| dropdown-button   | P3-1 | 空 items 菜单打开无显式空态区               | dismissed | 菜单空即空，n/a 可接受                                                                  |
| grid              | P3-1 | 空 items 渲染裸根节点                       | dismissed | design §6 无空态承诺，与 container/flex 空 body 行为一致                                |
| detail-field      | P3-1 | frameRootTag 'div'                          | dismissed | 与 FieldFrame 默认 rootTag 契约一致，n-a 记录（无发现）                                 |
| countdown         | P3-1 | aria-live="off" 裁决未文档化                | dismissed | 行为裁决已立，卡内记录即闭环（owner-doc 微项）                                          |
| progress          | P3-1 | 计划维度 5 措辞 "data-value"                | dismissed | 实际 DOM 契约为 data-progressing/data-complete + aria-valuenow，以实际契约为准          |
| wizard            | P3-4 | flux-vs-amis-analysis G3 行过时             | dismissed | 历史分析文档不回写（guide rule 21）                                                     |
| wizard            | P3-5 | steps 重复 key 冲突                         | dismissed | 作者契约外（toStepKeyString 已归一化兜底）                                              |
| input-time        | P3-2 | 原生 time input placeholder 不渲染          | dismissed | 浏览器契约，非实现缺陷                                                                  |
| qrcode            | P3-1 | 空值三态路径合并                            | dismissed | 强转 + valueStr.length 守卫语义等价，非缺陷                                             |
| status            | P3-1 | 空值渲染 data-state="miss"                  | dismissed | 两兄弟组件空态语义不对称但既有测试冻结（status.test.tsx:218-233 + w3c e2e），非契约漂移 |
| table             | P3-5 | handleSelectRow useCallback 依赖破坏行 memo | dismissed | B7 perf backlog 既有裁定（T29 附注），非本轮新证据                                      |
| table             | P3-6 | 字面含点列名经 getIn 解析                   | dismissed | T2 边界既有裁定（B7 P2 backlog）                                                        |
| condition-builder | P3-4 | dnd-kit sensor 无条件实例化                 | dismissed | b61 既有裁定 watch-only residual（drag handle disabled 时不渲染，功能不可拖）           |
| editor            | P3-2 | 工具栏 aria-pressed `true : undefined`      | dismissed | aria-pressed 为 boolean 语义，undefined 视为 false 可接受                               |
| image             | P3-2 | IO fallback setAttribute                    | dismissed | 仅旧浏览器生效，单次 setAttribute 后 disconnect，与 React 受控冲突风险极低              |
| input-image       | P3-2 | img src 协议不校验                          | dismissed | javascript: 在 img 不执行；协议校验归属 uploadAction 宿主面                             |
| mapping           | P3-1 | 'use no memo' + 手动 useMemo 并存           | dismissed | 既有设计模式，非缺陷                                                                    |
| markdown          | P3-1 | `data-src-loaded` 语义                      | dismissed | 无害标记，非缺陷                                                                        |
| chart             | P3-1 | sr-only 'References: ' 前缀硬编码           | dismissed | 读屏摘要内部格式，非用户可见文案                                                        |
| audio             | P3-1 | 失败/空态回退文本无 aria-live               | dismissed | 媒体错误为被动场景，非阻断（与 video 同裁定）                                           |
| video             | P3-1 | 失败/空态回退文本无 aria-live               | dismissed | 同上                                                                                    |
| statistics        | P3-1 | 复用 flux.pagination.total i18n key         | dismissed | 共享「Total N」摘要文案语义，复用合理                                                   |

## 2. 08-06 / 08-07 审计 P3 裁决（5 条，全部 fixed）

| 条目      | 来源                        | 原档位     | 内容                                      | 裁决  | 证据                                                                  |
| --------- | --------------------------- | ---------- | ----------------------------------------- | ----- | --------------------------------------------------------------------- |
| 05-02     | 2026-08-06-0711 multi-audit | P3→P2      | use-calendar-ownership.ts 两处死订阅      | fixed | plan `2026-08-07-0421-2` Phase 1（enabled 门控 + paths 收窄，6 用例） |
| 05-03     | 2026-08-06-0711 multi-audit | P3→P2      | table/list/crud 控制 hooks 族 10 处死订阅 | fixed | plan `2026-08-07-0421-2` Phase 2（10 处 enabled，8 用例）             |
| 14-4      | 2026-08-07-1747 multi-audit | P2→降级 P3 | 模块顶层 scopeCounter 泄漏                | fixed | plan `2026-08-08-0150-3`（局部作用域，49→47 命中）                    |
| 14-5+23-3 | 2026-08-07-1747 multi-audit | P2→降级 P3 | Space 用例永真断言                        | fixed | plan `2026-08-08-0150-3`（精确中心值 + fail-closed 用例）             |
| 23-4      | 2026-08-07-1747 multi-audit | P3         | kanban-handle 两句柄零行为覆盖            | fixed | plan `2026-08-07-2228-2` Phase 3（4 条 invoke 用例）                  |

## 3. D1 登记 P3 行

- **0 条**：D1（plan `2026-08-08-0715-2`）已 completed，四模式族回扫 P2/P3 零登记项（closing evidence：事件 ctx 门禁零命中 + reaction 13 声明全接线 + scope 全配对 + i18n 零硬编码）。本表零悬挂口径覆盖 D1 行（无行待补裁）。

## 4. 零悬挂声明

- 149 P3（§1）逐条有裁决（fixed 26 / keep 99 / dismissed 24，合计 149）+ 审计 P3 5 条（§2 全部 fixed）+ D1 登记 0 条（§3）——计数 = 库存 149 + 审计 5 + D1 0 = 154 条全部落终态。
- 裁决与卡内状态一致性：26 条 fixed 中 20 条为卡内既有 fixed 镜像（plan 引用在案）、6 条为本 plan 落地（卡内状态已回写 `[P3-x]` 行）；keep/dismissed 与卡内 keep/记录/卡内记录标注一一对应（驳回项理由逐条写明）。
- 当场修复 5 条代码条目全部带 focused 测试并验证绿（layout 110 / content 292 / scheduling 918 / form 772 包级全绿 + 4 包 typecheck 绿）。

## 5. @reserved 契约核对结论（Phase 2，7 处 / 3 文件）

> 核对方法：`rg "@reserved" packages/*/src` 全量登记 + 逐处 live 消费核对（事件/reaction 派发点、`component:*` 句柄注册、schema 消费）+ design.md 标注对照（crud design.md §5/:167 + §Polling 启停状态发布 :350-352；calendar design.md §12.3/§12.5/§12.6/§12.7 均为「设计要点（future design）」）。ghost contract 专项：**全部 7 处核对完成，无新增消费者**。

| #   | 位置                                        | 标注对象                                                | 消费核对（live 2026-08-08）                                                                                                                                        | 裁决                                                                                                                                                                                                                                          |
| --- | ------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `flux-renderers-data/src/crud-schema.ts:37` | CrudPollingConfig 注释（stopWhen 移除留痕）             | `enabled`/`sourceId` 有消费者（`use-crud-polling.ts:79,101-105` 经 `crud-renderer.tsx:303-304`）；`stopWhen` 零消费者（2-1 裁决已移除字段，上游 data-source 配置） | **激活（注释更正）**：@reserved 语义归 `stopWhen` 移除留痕，接口本体 live——注释措辞已修正（"not consumed by the CRUD runtime" → 明确 stopWhen 移除 + enabled/sourceId 消费）；design.md 已对齐（§5 :167 + §Polling 启停状态发布），无文档变更 |
| 2   | `scheduling-renderer-definitions.ts:197`    | calendar `onBatchSchedule` event（§12.5 批量排班）      | 全仓零派发/零消费（types 声明 + 定义注册仅）                                                                                                                       | **维持 @reserved**（future design §12.5，零消费者）                                                                                                                                                                                           |
| 3   | `scheduling-renderer-definitions.ts:199`    | calendar `onImport` event（§12.6 iCal 导入）            | 全仓零派发/零消费                                                                                                                                                  | **维持 @reserved**（future design §12.6）                                                                                                                                                                                                     |
| 4   | `scheduling-renderer-definitions.ts:202`    | calendar `onTimezoneChange` event（§12.7 时区）         | 全仓零派发/零消费                                                                                                                                                  | **维持 @reserved**（future design §12.7）                                                                                                                                                                                                     |
| 5   | `scheduling-renderer-definitions.ts:204`    | calendar `onGroupToggle` event（§12.3 资源分组）        | 全仓零派发/零消费                                                                                                                                                  | **维持 @reserved**（future design §12.3）                                                                                                                                                                                                     |
| 6   | `scheduling-renderer-definitions.ts:224`    | calendar `importICal`/`exportToICal` reactions（§12.6） | 仅 ready() 激活（calendar.tsx:180），ComponentHandle 无对应 method（hasMethod/listMethods 仅 exportToPNG/exportToPrint），零 invoke 派发                           | **维持 @reserved**（仅 ready，与 D1 回扫裁决一致）                                                                                                                                                                                            |
| 7   | `calendar/calendar.tsx:178`                 | importICal/exportToICal「仅 ready」注释                 | 同上（ComponentHandle :198-256 无 import/export iCal 分支）                                                                                                        | **维持 @reserved**                                                                                                                                                                                                                            |

- **ghost contract 专项结论**：7 处全部有逐处裁决（1 激活-注释更正 / 6 维持），证据 `文件:行` 在案；零新增消费者，无契约废弃需撤销标注；design.md 标注与 live 一致（crud §Polling 启停状态发布、calendar §12.x 设计要点均为 future-design 表述）；`pnpm check` 无新增命中（注释级变更）。

## 6. 6 条 watch-only e2e 复核结论（Phase 3，2026-08-08 实测）

> 方法：隔离复跑（`npx playwright test <spec>:<line> --reporter=list`），dev server 带 `__FLUX_STRICT_VALIDATION__=true __FLUX_FAIL_ON_SCHEMA_DIAGNOSTICS__=true PLAYWRIGHT=true`（与 CI webServer 同参）。

| #   | 条目                                                              | 隔离复跑结果（2026-08-08）                                                                                            | 归因                                                                                                                                                                                                     | 路由                                                                                            |
| --- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | c3-5-host-surfaces.spec.ts:27（Tiptap editor edit + submit echo） | **6/6 全绿**                                                                                                          | 时序敏感（全量并行下触发）；与 w3d-editor 同根因候选（TipTap click+type 竞态家族）                                                                                                                       | 维持 watch-only；根因纳入 DR editor 面复核（与 #3 合并）                                        |
| 2   | c3-5-host-surfaces.spec.ts:81（Tiptap link button）               | **6/6 全绿**                                                                                                          | 同上                                                                                                                                                                                                     | 同上                                                                                            |
| 3   | w3d-editor.spec.ts:28（applying bold）                            | **3/15 绿（12/15 失败）**——首次 1-3 个 keystroke 丢失（"hel"、"hello edi"、"ell" 等变体），点击后立即键入的字符被丢弃 | **间歇性真缺陷候选**：TipTap click+type focus 竞态（点击聚焦与键入窗口竞争）；CV（2026-08-06）以来 editor 代码零变更（word-editor-renderers 仅 package.json 死依赖移除），"隔离复跑全绿"归因**不再成立** | **判真缺陷 → 归 DR**（editor 面跨面集中修复，plan Deferred 节 Successor Path 指定；非静默延期） |
| 4   | gantt-perf.spec.ts（idle/scroll/drag）                            | idle avg=50.0 ✓ / scroll avg=49.5 ✗（>50 不可达）/ drag avg=50.0 ✗（>50 不可达）                                      | 主屏实测 **50.00Hz**（system_profiler "UI Looks like: 1920 x 1080 @ 50.00Hz"），rAF 硬上限 50fps，阈值物理不可达                                                                                         | 维持 watch-only + 标注「需 60Hz 环境最终确认」                                                  |
| 5   | kanban-perf.spec.ts（idle/20×300 idle/drag）                      | idle avg=50.1 ✓ / 20×300 idle avg=49.7 ✓ / drag avg=50.0 ✗（>60 不可达）                                              | 同上（50Hz rAF 上限）                                                                                                                                                                                    | 维持 watch-only + 标注「需 60Hz 环境最终确认」                                                  |
| 6   | ai-attachments.spec.ts（2 tests）                                 | **8/8 全绿（4 轮全文件复跑）**                                                                                        | 已解瞬时 flake（不占 6 席）——本轮复核确认不再现                                                                                                                                                          | 终态：closed（flake 不再现）                                                                    |

## 7. Non-Blocking Follow-ups 归集收口（Phase 4，终态核验 2026-08-08）

| 条目                                                                             | 出处                                             | 终态                             | 复核结论                                                                                                                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2228-1 ERP 设计文档 watch-only（`polling.stopWhen` + `$surface.hasOpenSurface`） | plan `2026-08-07-2228-1` Non-Blocking Follow-ups | **collected（维持 watch-only）** | live 复核 4 处引用仍在（`schema-gap-from-erp-integration-design.md` :355/:359/:453/:481）；`$surface.hasOpenSurface` 全仓零消费者（SurfaceRuntime 未发布）；无新消费者证据 |
| 2228-3 工具治理 01-02（manifest-deps 未跟踪扫描）                                | 同上                                             | **collected**                    | plan `2026-08-08-0150-1` Phase 1 落定（getTrackedFiles 双源合并，先红后绿；roadmap Follow-up Backlog 行 `[x]`）                                                            |
| 2228-3 工具治理 03-01（fork JSDoc/单测）                                         | 同上                                             | **collected**                    | plan `2026-08-08-0150-2` 落定（7 条直接单测 + JSDoc）                                                                                                                      |
| 2228-3 工具治理 03-02（graph 死依赖）                                            | 同上                                             | **collected**                    | plan `2026-08-08-0150-2` 落定（依赖删除 + 反向检查裁决实施）                                                                                                               |
| 2228-3 工具治理 03-03（raw-schema-reads 块注释盲区）                             | 同上                                             | **collected**                    | plan `2026-08-08-0150-1` Phase 2 落定（getCodeTextForLine + as-cast 形态）                                                                                                 |
| 2228-3 工具治理 14-1（browser-io 夹具目录）                                      | 同上                                             | **collected**                    | plan `2026-08-08-0150-1` Phase 3 落定（FLUX_AUDIT_SCAN_ROOT + 临时目录树，连带修复 6d2497ea 正则回归）                                                                     |
| 2228-3 工具治理 14-2（document-io-test-utils 显式 install）                      | 同上                                             | **collected**                    | plan `2026-08-08-0150-3` 落定（installDocumentIoTestHooks() + 合成用例）                                                                                                   |
| 2228-3 工具治理 14-4 / 14-5+23-3（P3 测试加固）                                  | 同上                                             | **collected**                    | plan `2026-08-08-0150-3` 落定（scopeCounter 局部化 + Space 精确断言）                                                                                                      |
| 0150-1 `find-event-dispatch-without-ctx.test.ts:14-33` stagedDirs 同型治理       | plan `2026-08-08-0150-1` Non-Blocking Follow-ups | **collected（路由登记）**        | 模块顶层 `stagedDirs` 可变数组仍在（:14-32）；D1 已 completed 未承接 → **路由裁定：工具治理轮次**（DR 或后续工具治理 plan 承接），不阻塞本 plan                            |

- **归集收口声明**：全部 Follow-up 条目落终态（closed / 维持 watch-only / 路由明确），无遗留悬挂。daily log `docs/logs/2026/08-08.md` 记录复核结论与复跑计数。
