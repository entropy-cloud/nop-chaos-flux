# 489 视觉质量 V12c：P3 池 87 条逐条裁决与收口 Plan

> Plan Status: completed
> Last Reviewed: 2026-09-22
> Source: `docs/analysis/ui-review/r2-audit/summary.md` §可暂缓项（LOW 87 条，本 plan Appendix A 与其 ID-for-ID 对齐）+ `docs/backlog/visual-quality-roadmap.md` V12c 行；V12c-D5 附录（`docs/audits/visual-quality/consistency-debt.md`）为本 plan Phase 2 产出（前瞻引用）
> Related: `docs/plans/488-visual-quality-v12f-p2-family-digestion-final-plan.md`（批次协议先例）、`docs/logs/2026/09-22.md`（P2 池残项承接依据）

## Purpose

P3 池（LOW/可暂缓级，非缺陷类 polish）87 条逐条裁定收口：**修复批**（18 条机械项，与其他条目同根因、模式已验证）+ **watch-only 裁决批**（其余 62 条，逐条带理由落台账）。P3 原始定级即为「可暂缓」（LOW，非 confirmed defect），watch-only 属 Anti-Slacking 允许分类。另承接 **P2 池残项批**（4 FIX + 1 WATCH，plan 488 对账口径外的孤儿项，见 09-22 日志）。本批收口后 roadmap 全部 work item 关闭。

## Current Baseline

- 双路复核：87 = 80 STILL_OPEN + 7 FIXED_SINCE（V12b-V12f 顺带吸收：G2-视角4-03 高度统一、G3-视角9-02 面板可读名、G3-视角11-02 heatmap title、G4-视角5-02 countdown 兜底、G6-视角9-02 CommandDialog i18n、G7-视角1-16 术语统一、G5-R3-视角11-01 scroll-to-bottom）。
- P2 池残项承接（plan 488 收口口径外，09-22 日志登记）：G1-R3-视角8-01（tabs swipe 劫持嵌套横向滚动）、G1-R4-视角8-02（steps 指示钮外无点击面）、`flux.form.removeItem` 单花括号占位符永不插值、barcode overlay 手写 spinner——4 条 FIX；sundial todo-dialog 取消首击位移吞没——1 条 WATCH。
- 红线：219/64/69，newHits=0；本批不增、新增豁免 0。

## Goals

- 修复批（P3 FIX 18 条，模式同构）：①字形→图标（scope-debug 标题 i18n、graph-renderer ×、ai-bubble ‹›、ai-voice mic→lucide、ai-conversations 新建 PlusIcon）；②硬编码色→令牌（select-combobox yellow mark、chart #ef4444、scada-canvas #dc2626、badge emerald/amber）；③focus-visible 三连（column-resize、row-drag-handle、editor canvas/panel）；④ui 对齐三件（sheet close 位置、native-select xs 高度、command data-selected bg-accent）+ 家族补齐（array-editor/key-value 行钮尺寸、kanban 搜索清除、树表懒加载 spinner→ui Spinner）。
- P2 承接修复批（4 条）：tabs swipe 嵌套横向滚动豁免；steps 行级点击面；removeItem 占位符双花括号化；barcode overlay 手写环→ui Spinner。
- watch-only 裁决批：P3 其余 62 条 + P2 承接 1 条（sundial 取消首击位移），逐条落台账（理由：polish 级 / 相邻改进已缓解 / 成本收益不成立 / 需 IA 级重构超 P3 范围），每条一行 Why Not Blocking。
- 红线：instances 单调不增、newHits=0、新增豁免 0；台账与 backlog 卡回写。

## Non-Goals

- watch-only 条目的本期修复；ui 组件 API 重设计；sundial IA 级重构。

## Scope

### In Scope

- P3 修复批 18 条 + watch-only 裁决 62 条；P2 承接批 4 FIX + 1 WATCH（裁决回写：consistency-debt V12c-D5 附录台账（新建）+ r3-p2-adjudication.md P3 区块与承接行回写）。

### Out Of Scope

- 修复批之外的新增范围；perf 面；ui API 变更。

## Failure Paths

| 可测场景编号     | 触发       | 行为               | 可重试 | 用户可见表现 |
| ---------------- | ---------- | ------------------ | ------ | ------------ |
| i18n-key-missing | 新键未登记 | check:i18n-keys 红 | 是     | 无           |

## Test Strategy

档位选择（三选一）：`建议有测`

本档选择：**建议有测**——修复批以属性断言钉住；watch-only 裁决为文档面（无需测试）。

## Execution Plan

### Phase 1 - 修复批（P3 FIX 18 条 + P2 承接 FIX 4 条）

Status: completed
Targets: `packages/flux-renderers-{basic,ai,content,data,industrial,scheduling,graph}/src/`、`packages/flux-renderers-dashboard/src/editor/`、`packages/ui/src/components/ui/{badge,sheet,command,native-select}.tsx`、`packages/flux-renderers-form/src/renderers/select-combobox-lists.tsx`、`packages/flux-renderers-basic/src/{scope-debug.tsx,tabs.tsx}`、`packages/flux-renderers-layout/src/steps-renderer.tsx`、`packages/flux-renderers-scheduling/src/barcode-input/barcode-scanner-overlay.tsx`、`packages/flux-i18n/src/locales/*.ts`

- Item Types: `Fix | Proof`

- [x] Fix（字形/图标 5）：scope-debug 默认标题+fallback 文案 i18n；graph-renderer 清除 ×→XIcon；ai-bubble ‹›→ChevronLeft/Right；ai-voice-input 手绘 SVG→MicIcon；ai-conversations 新建→PlusIcon
- [x] Fix（硬编码色 4）：select-combobox mark→token 类；chart marker #ef4444→destructive 令牌；scada-canvas #dc2626→var(--nop-danger) 链；badge emerald/amber→success/warning 令牌
- [x] Fix（focus-visible 3）：column-resize 把手、row drag handle、editor canvas/panel 补 focus-visible ring
- [x] Fix（ui 对齐 3 + Spinner 1 + 家族 2）：sheet close 位置对齐 dialog/drawer；native-select xs h-6→h-7；command data-selected→bg-accent；table-body-row 手写环→ui Spinner；array-editor/key-value 行钮尺寸对齐 combo 家族（G2-视角8-01）；kanban 搜索清除钮（G4-视角4-01）
- [x] Fix（P2 承接 4）：tabs swipe 指针守卫排除嵌套横向可滚动后代（G1-R3-视角8-01，tabs.tsx:441-463 区域）；steps 标题/描述接通行级选择点击面（G1-R4-视角8-02，steps-renderer.tsx:275-277 区域）；`flux.form.removeItem` 占位符单→双花括号（zh/en locales :287 附近 + upload-field.tsx:596 调用侧核对）；barcode overlay 手写环→ui Spinner（barcode-scanner-overlay.tsx:265）

Exit Criteria:

- [x] 22 条逐条落地（18 P3 + 4 承接）；属性/计算样式断言钉住；受影响包 focused test 绿；`check:i18n-keys` 绿

### Phase 2 - watch-only 裁决批（P3 WATCH 62 条 + P2 承接 WATCH 1 条）

Status: completed
Targets: `docs/audits/visual-quality/consistency-debt.md`（新建 V12c-D5 附录，含 P2 承接小节）、`docs/analysis/ui-review/r2-audit/r3-p2-adjudication.md`（新增 87 行 P3 区块 + 承接行 113/135 回写）

- Item Types: `Decision`

- [x] Decision：P3 其余 62 条逐条 watch-only 裁决落台账（四类理由：polish 级收益有限 / 相邻计划已部分缓解 / 需交互模型或 IA 级改动超 P3 范围 / 触达面极小），零静默 deferred
- [x] Decision：P2 承接 WATCH 1 条（sundial todo-dialog 取消首击位移吞没）落 V12c-D5 承接小节（理由：root fix 需校验展示策略/对话框初始焦点策略裁决，form-validation 保护区域，roadmap Cross-Cutting 5）
- [x] Fix：r3-p2-adjudication.md 新增 87 行 P3 区块回写裁决与去向；承接 2 条（行 113 G1-R3-视角8-01、行 135 G1-R4-视角8-02）行级回写去向本 plan；consistency-debt V12c-D5 附录同步新建

Exit Criteria:

- [x] 两份台账逐条裁决完成（0 零去向）；本 plan 与台账一致

### Phase 3 - 对账 + docs + 门禁

Status: completed
Targets: `docs/backlog/visual-quality-roadmap.md`、`docs/logs/`（当日）

- Item Types: `Fix | Proof`

- [x] 对账：87 = FIXED_SINCE 7 + 修复批 18 + watch-only 62（P3）+ 承接 4 FIX + 1 WATCH（P2 残项）；roadmap V12c 行注记 + `done`（audit 后）；daily log
- [x] 门禁：`check:audit-ui-consistency-gaps` totals 单调不增（219→216/64，本批下降）、newHits=0；`check:i18n-keys` 绿

Exit Criteria:

- [x] 受影响包 focused test 全绿；全仓链归 Closure Gates
- [x] 对账三方一致

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent（fresh session）填写。

**Round 1（2026-09-21，起草会话随附）**

- Reviewer / Agent: 独立子 agent fresh session（ZCode plan-review auditor，read-only 审计）
- Verdict: `revised`（3 Major / 5 Minor）→ 起草者吸收
- Findings addressed: M-1 87 条权威枚举不可追溯——附 Appendix A（87 行：ID/描述/裁决，7 FIXED + 18 FIX + 62 WATCH）；M-2 Phase 2 回写锚点「ui-review-roadmap P3 区」不存在——改 consistency-debt V12c-D5 附录（新建）；M-3 修复批计数不自洽（17/18/20）。Minor：Targets 补 graph/dashboard、scope-debug 落点订正、G1-视角9-12 过时注记、roadmap V12c 行随升 active 同步、spinner.tsx 留 watch-only、WATCH 行带显式 classification + 理由。吸收未当时翻转 active（会话中断于状态翻转前）。

**Round 2（2026-09-22，接续执行会话的独立 fresh-session 复审）**

- Reviewer / Agent: 独立子 agent fresh session（plan-review auditor，对照 plan guide 四项检查 + live repo 抽样：18/18 FIX 行、4/4 WATCH 行、3/7 FIXED_SINCE 全数回读验证）
- Verdict: `revised`（0 Blocker / 5 Major / 4 Minor）→ 全部吸收后本会话三审定为 pass（吸收核对 5/5 Major 已闭合 + 文本一致性核对过）
- Findings addressed: F-1 r3-p2-adjudication.md 无 P3 行（0/87 命中，87 条实际在 summary.md §可暂缓项）——Phase 2 锚点改「r3 台账新增 87 行 P3 区块 + V12c-D5 附录新建」，consistency-debt 旧指针同步订正；F-2 修复批四处计数冲突且集合不闭合——统一为 18 P3 FIX（补 G2-视角8-01、G4-视角4-01 checkbox；barcode spinner 无 P3 行转承接批；幻影「kanban/calendar 交互面」第 4 项删除）；F-3 focus-visible 假勾选（live 证实三处均无 ring，执行先行于 review）——回退 `[ ]`；F-4 Source 引用不存在/临时产物——改 durable 引用 + V12c-D5 前瞻引用；F-5 P2 池残项 4 FIX + 1 WATCH 无归属——以承接批并入本 plan（Phase 1 承接 4 条 + Phase 2 承接 1 条 + r3 行 113/135 回写）。Minor：Phase 2 标题 62→含承接 1、「另 3 条部分改善」删除、Deferred 节按 ID 范围显式化、roadmap planned 翻转与 active 同步认账。
- 三审（同会话独立复核，文本一致性 + 吸收核对）：Phase 1 checkbox 枚举 = 5+4+3+4(含家族 2)+4(承接) = 22 = 18 P3 + 4 承接，与 Appendix A 18 FIX 行 + 承接清单闭合；Phase 2/3/Closure Gates/Deferred 计数与锚点一致；Guide 格式字段齐全。达 pass 条件，升 `active`。

## Appendix A：P3 池 87 条权威裁决表

> 生成：双路 fresh-session live 复核（80 STILL_OPEN / 7 FIXED_SINCE）+ 本 plan 批次裁定。执行时以台账 ID 按机制定位；FIX 行 Phase 1 落地，WATCH 行按表内理由 watch-only residual（Phase 2 落台账）。

| ID              | 描述（截断）                                                                                           | 裁决                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1-视角9-12     | （部分已过时：仅默认标题+fallback 两串仍硬编码） scope-debug 默认标题与折叠提示为硬编码英文，未走 i18n | FIX（本批修复）                                                                                                                                    |
| G1-视角10-13    | 复制失败反馈不一致：json-view 静默失败，text 走 toast.error                                            | WATCH（watch-only residual；理由：text 面已有 toast;polish 级）                                                                                    |
| G1-视角8-14     | page 侧栏拖拽把手无键盘操作路径（role="separator" 不可聚焦）[scope-conflict]                           | WATCH（watch-only residual；理由：滑块键盘语义超 P3 范围）                                                                                         |
| G1-视角10-15    | `info` 语义级颜色跨组件不一致：timeline 用 `bg-info` 彩色点，alert/badge/st                            | WATCH（watch-only residual；理由：语义色统一需跨组件契约裁决）                                                                                     |
| G2-视角4-03     | select 渲染器三种形态触发控件高度不一致（h-9 / h-8 / h-9）                                             | FIXED_SINCE（485-488 顺带吸收）                                                                                                                    |
| G2-视角4-04     | picker 触发器 placeholder 无弱化样式，清除按钮空值时也常驻（禁用态）                                   | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G2-视角5-04     | radio-group / checkbox-group 选项源为空时渲染空白，与 select 的空态提示不一致                          | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G2-视角7-01     | select 搜索命中高亮使用硬编码 bg-yellow-200/dark:bg-yellow-800，未走设计令牌                           | FIX（本批修复）                                                                                                                                    |
| G2-视角8-01     | array-editor / key-value 行操作按钮 size="sm" 放图标，与 combo/input                                   | FIX（本批修复）                                                                                                                                    |
| G2-视角10-02    | array-field 的移除操作用纯文本按钮，偏离复合家族"行级删除 = ghost + Trash2Icon"约                      | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G3-视角3-01     | 表格列宽拖拽手柄可键盘聚焦但无 focus-visible ring                                                      | FIX（本批修复）                                                                                                                                    |
| G3-视角3-02     | 行拖拽排序手柄可键盘聚焦但无 focus-visible ring                                                        | FIX（本批修复）                                                                                                                                    |
| G3-视角3-04     | dashboard 编辑画布面板与画布体 tabIndex=0 无 focus-visible ring                                        | FIX（本批修复）                                                                                                                                    |
| G3-视角2-01     | dashboard 编辑器头部 Save 主操作用 outline 变体，视觉权重低于模式切换按钮                              | WATCH（watch-only residual；理由：变体权重为交互设计裁决面）                                                                                       |
| G3-视角4-02     | 表头列搜索输入无清除按钮                                                                               | WATCH（watch-only residual；理由：独立 clear-filters 已存在）                                                                                      |
| G3-视角5-06     | 表格空态在虚拟化与非虚拟化路径下布局不一致                                                             | WATCH（watch-only residual；理由：结构面统一）                                                                                                     |
| G3-视角5-07     | dashboard-editor 会话未就绪占位为孤立省略号                                                            | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G3-视角7-02     | 图表标记点默认色硬编码十六进制 '#ef4444'                                                               | FIX（本批修复）                                                                                                                                    |
| G3-视角9-02     | 面板移除按钮 aria-label 暴露内部 panel id，可读名无意义                                                | FIXED_SINCE（485-488 顺带吸收）                                                                                                                    |
| G3-视角9-04     | 独立 sparkline 组件整体 aria-hidden，趋势信息对读屏完全不可达                                          | WATCH（watch-only residual；理由：可达性 polish）                                                                                                  |
| G3-视角11-01    | dashboard 面板引用未注册类型时渲染空卡片壳，无任何提示                                                 | WATCH（watch-only residual；理由：防御性兜底面在案）                                                                                               |
| G3-视角11-02    | heatmap 单元格无数值提示手段                                                                           | FIXED_SINCE（485-488 顺带吸收）                                                                                                                    |
| G4-视角4-01     | kanban 搜索输入无清除按钮，与同屏标签筛选器的"清除"能力不对称                                          | FIX（本批修复）                                                                                                                                    |
| G4-视角5-02     | countdown 缺少 time/targetTime 配置时静默渲染不可见空元素                                              | FIXED_SINCE（485-488 顺带吸收）                                                                                                                    |
| G4-视角5-03     | kanban 卡片标签/成员溢出计数 "+N" 无任何提示手段，隐藏信息不可恢复                                     | WATCH（watch-only residual；理由：可达性 polish）                                                                                                  |
| G4-视角8-01     | gantt 连线创建/删除命中区 8~20px 且 hover-only，触摸与触控板场景不可发现                               | WATCH（watch-only residual；理由：resize affordance 超 P3 范围）                                                                                   |
| G4-视角8-02     | kanban 卡片删除按钮 20px 且 hover-only，触摸设备上不可见不可达                                         | WATCH（watch-only residual；理由：触达面扩展超 P3 范围）                                                                                           |
| G4-视角10-01    | Loading 骨架三种实现并存：手写 animate-pulse div、ui Skeleton、手写 borde                              | WATCH（watch-only residual；理由：已收敛大半）                                                                                                     |
| G5-视角1-02     | graph 搜索清除按钮使用文本字符 × 而非 XIcon                                                            | FIX（本批修复）                                                                                                                                    |
| G5-视角1-03     | 分支切换器 prev/next 使用文本字符 ‹/› 而非 Chevron 图标                                                | FIX（本批修复）                                                                                                                                    |
| G5-视角1-05     | ai-voice-input 使用手绘内联 SVG 麦克风而非 lucide MicIcon                                              | FIX（本批修复）                                                                                                                                    |
| G5-视角4-02     | ai-sender 字数计数悬浮在 textarea 内容区右下，长文本与计数重叠                                         | WATCH（watch-only residual；理由：padding 补偿）                                                                                                   |
| G5-视角4-03     | 属性面板 number 输入清空即写 0，图元坐标跳零                                                           | WATCH（watch-only residual；理由：draft 解耦已落地）                                                                                               |
| G5-视角5-02     | ai-conversations 空列表无任何提示内容                                                                  | WATCH（watch-only residual；理由：空会话提示）                                                                                                     |
| G5-视角6-01     | 工具箱导入弹窗取消按钮 variant=ghost，偏离项目 Dialog 按钮约定（outline）                              | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G5-视角7-01     | scada-canvas 运行时错误文案硬编码 #dc2626，同包 editor 同语义用 --nop-dange                            | FIX（本批修复）                                                                                                                                    |
| G5-视角9-02     | graph 节点键盘不可达（tabIndex/role 均未下发），画布 wrapper 亦无 role="appl                           | WATCH（watch-only residual；理由：节点非交互面（nodesDraggable/Connectable/Selectable 均关），search-Enter 循环提供部分键盘替代——review-g5.md:37） |
| G6-视角4-02     | NativeSelect 与 SelectTrigger 的 xs 档高度不一致（24px vs 28px）                                       | FIX（本批修复）                                                                                                                                    |
| G6-视角7-01     | Badge success/warning 变体硬编码 emerald/amber 调色板，未使用既有 --succ                               | FIX（本批修复）                                                                                                                                    |
| G6-视角8-01     | 三个浮层内建关闭按钮留白不一致（Sheet 12px，Dialog/Drawer 8px）                                        | FIX（本批修复）                                                                                                                                    |
| G6-视角9-02     | CommandDialog 默认 title/description 硬编码英文，未走 t()                                              | FIXED_SINCE（485-488 顺带吸收）                                                                                                                    |
| G6-视角9-03     | Spinner aria-label="Loading" 硬编码英文                                                                | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G6-视角9-04     | ChartContainer 图表面无 role/aria-label 锚点                                                           | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G6-视角9-05     | 可拖拽 DialogHeader 对 SR 语义暴露为 role="toolbar"                                                    | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G6-视角11-01    | Item size="sm" 与 default 变体类串完全相同，尺寸变体发虚                                               | WATCH（watch-only residual；理由：Item 尺寸家族）                                                                                                  |
| G7-视角3-15     | sundial 全部自定义可点击行无设计系统 focus-visible ring，仅剩浏览器默认描边                            | WATCH（watch-only residual；理由：部分缓解）                                                                                                       |
| G7-视角1-16     | 同页术语混用：「垃圾箱」与「垃圾桶」交替出现                                                           | FIXED_SINCE（485-488 顺带吸收）                                                                                                                    |
| G7-视角4-17     | tree-crud 过滤状态回显原始 ID（"当前过滤：d1"）而非树节点标签                                          | WATCH（watch-only residual；理由：schema 回显）                                                                                                    |
| G7-视角1-18     | 子任务区头「chevron-down」为静态装饰，无折叠能力却暗示可折叠                                           | WATCH（watch-only residual；理由：折叠交互）                                                                                                       |
| G7-视角11-19    | 导航/视图切换高频弹 toast，反馈噪音                                                                    | WATCH（watch-only residual；理由：复刻页设计面）                                                                                                   |
| G2-R2-视角5-02  | 上传失败条目永久滞留列表：无移除钮、无重试，且"清空"按钮仅在存在成功项时渲染，失败行无法消失           | WATCH（watch-only residual；理由：485 反馈已加）                                                                                                   |
| G2-R2-视角8-01  | 步进类控件点击目标低于 24px 豁免基线：input-time StepperButton 实际 20×20px、                          | WATCH（watch-only residual；理由：步进钮家族）                                                                                                     |
| G2-R2-视角10-01 | 同组两套富文本格式工具栏按钮样式规范不一致：markdown-editor 用 outline/size-8，edi                     | WATCH（watch-only residual；理由：描边差异）                                                                                                       |
| G3-R2-视角4-03  | Inspector 数字输入清空即写 0，面板坐标/尺寸瞬间跳零                                                    | WATCH（watch-only residual；理由：min 兜底已落地）                                                                                                 |
| G3-R2-视角8-01  | dashboard 编辑器面板删除按钮 hover-only 且 display:none，触摸设备不可见不可达                          | WATCH（watch-only residual；理由：面板设计约定）                                                                                                   |
| G3-R2-视角10-01 | 表格单元格 copyable 复制失败零反馈（成功/失败双通道只剩一个）                                          | WATCH（watch-only residual；理由：失败反馈）                                                                                                       |
| G3-R2-视角10-02 | 树表懒加载 spinner 为包内唯一手写实现，偏离本包统一的 ui Spinner 基线                                  | FIX（本批修复）                                                                                                                                    |
| G4-R2-视角1-01  | 里程碑连线的两个 link handle 因缺少 `group` 祖先类永久不可见（与 R1 视角8-01 根因不同                  | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G4-R2-视角3-03  | scheduling 自定义 roving-focus 元素零设计系统 focus 指示，且与 gantt 的 fo                             | WATCH（watch-only residual；理由：批外沿）                                                                                                         |
| G4-R2-视角8-01  | gantt 任务条边缘 6px 拖拽缩放热区无任何可见 affordance 与光标提示                                      | WATCH（watch-only residual；理由：超 P3 范围）                                                                                                     |
| G5-R2-视角3-04  | graph 缩放按钮到达 min/max 边界后仍可点击，静默无效果且无禁用态                                        | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G5-R2-视角5-03  | ai-message-list 空消息且未配 emptyState region 时渲染空白面板，无默认提示                              | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G5-R2-视角8-01  | 附件缩略图移除按钮 20px 且 hover 才可见（触摸设备不可发现），卡片态移除按钮同为 20px                   | WATCH（watch-only residual；理由：超 P3 范围）                                                                                                     |
| G5-R2-视角9-01  | graph 布局切换按钮以原始枚举值 "flow"/"hierarchy" 作为可见文案，未走 i18n 且与同簇图                   | WATCH（watch-only residual；理由：布局键 i18n）                                                                                                    |
| G5-R2-视角9-02  | 编辑器错误兜底直接渲染原始 error.message，未走运行态画布已有的错误码 i18n 管线                         | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G5-R2-视角10-01 | ai-feedback 复制失败静默吞掉，与同仓"复制失败必须有反馈"基线不一致                                     | WATCH（watch-only residual；理由：polish 级）                                                                                                      |
| G5-R2-视角10-02 | ai-conversations 新建会话按钮（outline）缺 PlusIcon，偏离本仓"新增 = ghost                             | FIX（本批修复）                                                                                                                                    |
| G6-R2-视角9-02  | Dialog 拖拽说明 sr-only 段落从未被 aria-describedby 引用（同 id 重复渲染两份）                         | WATCH（watch-only residual；理由：双 sr-only 渲染）                                                                                                |
| G6-R2-视角10-01 | 列表高亮体系分裂：CommandItem 选中态用 bg-muted/text-foreground，Select/                               | FIX（本批修复）                                                                                                                                    |
| G7-R2-视角5-01  | master-detail 未选择订单时右侧三个数据面以「暂无日志/暂无收货地址/暂无数据」呈现，空态语义与「请选择   | WATCH（watch-only residual；理由：复刻页数据门控）                                                                                                 |
| G3-R3-视角4-03  | 列设置可把所有列逐个隐藏且无最小可见保护：表格坍缩为只剩控制列的空壳，无任何"列已全部隐藏"提示         | WATCH（watch-only residual；理由：全列隐藏保护）                                                                                                   |
| G3-R3-视角8-02  | dashboard 编辑器画布根节点 `touch-none` + `overflow-auto` 并用：触摸设备完                             | WATCH（watch-only residual；理由：触摸契约面）                                                                                                     |
| G4-R3-视角3-01  | gantt 缩放按钮到达最小/最大档位后仍呈可用态，点击静默无效（graph 缩放边界缺陷的同型兄弟实例）          | WATCH（watch-only residual；理由：批外沿）                                                                                                         |
| G4-R3-视角5-01  | barcode 扫描浮层相机初始化失败（error 相位）无重试入口，且直出原始异常英文 message（map 错             | WATCH（watch-only residual；理由：重试入口为扩展）                                                                                                 |
| G5-R3-视角11-01 | 流式生成期间用户上滑回看后无"回到底部"入口，hook 已导出 `scrollToBottom` 但消息列表从未消费            | FIXED_SINCE（485-488 顺带吸收）                                                                                                                    |
| G7-R3-视角11-02 | form-wizard 确认步「角色」回显原始枚举值 admin/user/guest 而非字典标签                                 | WATCH（watch-only residual；理由：字典标签）                                                                                                       |
| G7-R3-视角11-03 | tree-crud 启用 selection 但全页无任何批量动作消费选择集                                                | WATCH（watch-only residual；理由：选择集消费超 P3 范围）                                                                                           |
| G7-R3-视角11-04 | dashboard「今日订单」KPI 恒为 0（mock createTime 2024-07 与运行时"今天"不匹                            | WATCH（watch-only residual；理由：mock 时间基线）                                                                                                  |
| G7-R3-视角7-01  | sundial-workbench 已完成看板「昨天」徽标复用红色 error 语义                                            | WATCH（watch-only residual；理由：徽标语义色）                                                                                                     |
| G7-R3-视角6-01  | workbench 任务详情日期选择器初始选中值（今天）与行内徽标回退值（8/18）不一致                           | WATCH（watch-only residual；理由：日期回退一致性）                                                                                                 |
| G1-R4-视角5-02  | status / mapping 值未命中映射表时渲染空 span：已有值对用户不可见，无原始值回退（countdo                | WATCH（watch-only residual；理由：原始值回退）                                                                                                     |
| G5-R4-视角3-02  | 编辑会话跨流式锁定：流开始后编辑态"重发"按钮呈可用态但点击被 JS 静默吞掉（铅笔有禁用、提交键没有）     | WATCH（watch-only residual；理由：isProcessing 静默守卫已在）                                                                                      |
| G5-R4-视角3-03  | scada 编辑器 `destroyed` 终态零视觉处理：画布区空白但工具箱/图元库/属性面板全套保活，mutat             | WATCH（watch-only residual；理由：destroyed 态隐藏）                                                                                               |
| G7-R4-视角10-01 | 「选择列表」选项集跨页不一致：todo-dialog 页含"购物"共 4 项，workbench/detail 页均                     | WATCH（watch-only residual；理由：选项集一致）                                                                                                     |
| G7-R4-视角2-01  | workbench 页面唯一主操作「添加待办」渲染为 ghost 透明文本钮：与 todo-dialog 页同入口的                 | WATCH（watch-only residual；理由：入口权重）                                                                                                       |
| G3-R5-视角3-02  | 编辑画布面板的移动/缩放仅指针可操作：role=button 面板无方向键移动、resize 手柄无键盘通道，键盘用       | WATCH（watch-only residual；理由：方向键已落）                                                                                                     |
| G5-R5-视角10-01 | region 图层运行时切换 geojson 数据集后视口不重适配：初始装配会 fitView，切换后停留在旧数据集           | WATCH（watch-only residual；理由：geojson 切换重适配）                                                                                             |

## Closure Gates

- [x] Phase 1–3 Exit Criteria 全勾
- [x] 87 条 P3 + 5 条 P2 承接逐条 landed / FIXED_SINCE 登记 / watch-only 裁决，无静默 deferred
- [x] v1 红线：instances 单调不增（219→216）、newHits=0、新增豁免 0
- [x] owner docs 已同步（consistency-debt V12c-D5 新建、r3-p2-adjudication.md P3 区块 + 承接行回写、roadmap V12c、daily log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`（74/74 tasks）
- [x] `pnpm check`（exit 0）

## Deferred But Adjudicated

（本 plan 的 Phase 2 即裁决面本身：Appendix A 62 条 WATCH 行 + P2 承接 1 条（sundial todo-dialog 取消首击位移吞没）全部以 `watch-only residual` + 显式理由落 V12c-D5 台账；无额外 deferred）

## Non-Blocking Follow-ups

- watch-only 条目若未来升级为缺陷，走新增 audit 立项。

## Closure

Status Note: 三 Phase 全部落地（P3 87 = FIXED_SINCE 7 + 修复批 18 + watch-only 62；P2 承接 5 = 4 FIX + 1 WATCH）并经独立 closure audit `approved`（0 Blocker / 0 Major / 2 Minor 已随收口提交吸收：e2e spec papercut 指针订正、G5-视角9-02 WATCH 理由串订正）。13/18 Phase 1 项 live 抽查全实、6 条 WATCH 裁决诚实性核过、r3 台账 P3 区块 87 行程序化对账 18/7/62、门禁独立复跑 216/62/69 newHits=0（较 219/64 基线单调下降）、ui 202 / data 1159 / layout 136 独立复跑绿。roadmap V12c → `done`，全路线图 work item 关闭。全仓链 CHAIN EXIT 0（typecheck/build/lint/test 74/74/check）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（closure auditor，2026-09-22，read-only；对照 plan guide Closure Audit Rule 8 项核查全过）
- Evidence: 本 plan 与 live 差异树抽查（13 Phase 1 项 file:line 全实）；门禁独立复跑 216/62/69 + newHits=0 + i18n 绿；三包 focused 独立复跑（202/1159/136）；r3 P3 区块 87 行程序化 tallies；V12c-D5 诚实性核验（sundial papercut watch-only 分类成立）；findings 摘要见 `docs/logs/2026/09-22.md` V12c 节。

Follow-up:

- no remaining plan-owned work（watch-only 62 条 + sundial papercut 已带理由落 V12c-D5 台账；未来升级为缺陷走新增 audit 立项）
