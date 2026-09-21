# 488 视觉质量 V12f：一致性 P2 候选池按族消化——批四（族3+族4+族7+单点收尾）Plan

> Plan Status: completed
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V12b-consistency-p2-digestion.md`（§4 族3/族4/族7 台账 + §5「单点/跨族 87 权威枚举回读 r3 台账」）、`docs/backlog/visual-quality-roadmap.md` V12f 行
> Related: `docs/plans/485/486/487`（批次协议先例）

## Purpose

P2 池最终清扫批：族3（溢出/几何，4）+ 族4（触摸/触达，1）+ 族7（键盘等价路径，5）+ 单点/跨族残余。单点面按包分四个执行波（ui 基件 / renderers / playground schema / 收尾对账），逐条 landed 或显式 adjudicated。本批收口后 P2 池清零（V12e 残差已归本批），V12c 接力 P3 池。

## Current Baseline

- 台账：P2 池残差以本 plan **附录 A 清单为权威枚举（99 条，程序化生成 = 169 候选 − 三批池内已消化 62（含其中 9 条即 sweep FIXED_SINCE 对应）− SUPERSEDED 1 − 既有口径重合 7；sweep 的 9 条 FIXED_SINCE 落于 62 之内，不重复扣减）**，按波次 P1（named 10）/ P2（ui 基件 12）/ P3（renderers 59）/ P4（playground schema 18）分波；历史口径「91」作废。门禁 219/64/69，newHits=0。
- 顺带已吸收项不再重复（V12b: gantt/calendar-header 图标化、ai-conversations、sidebar-layout；V12d: gantt-header bg-muted、calendar-header accent；V12e: toolbox status、table data-state 生产端）。
- 键盘/几何类涉及交互模型（icon-picker roving tabindex、calendar 格键盘、条件组 Add-Group 上限）——行为项先红（Phase 1 全部 10 条含 row-click 键盘/calendar 格/Add-Group/input-tree 残余各配先红断言）；视觉/属性类以属性/计算样式断言钉住（批协议②/③）。

## Goals

- named 10 条：族3 溢出/几何修复（steps relative、timeline 连接线宽度、表头双层 sticky、tabs 桌面滚动契约）；族4 calendar 月视图 Enter/Space 短路长按定时器；族7 三处键盘路径补齐（行点击勾选、icon-picker roving、calendar 格 onKeyDown）+ condition-group Add-Group 上限 + input-tree 清除路径。
- 单点面：ui 基件（focus-visible/overlay 双令牌统一/Action 关闭语义/combobox aria/menubar 指示器/pagination disabled 消费等）、renderers 单点（tree multiple、三套分页 UI 收敛、selectAllChecked 树模式、quick-edit onSaveError、列设置菜单不关、selection 上限提示、virtual 拖拽 rowIndex、combine-cells 非虚拟、dashboard addPanel 防重叠/setMode 清选择/NumberInput clamp/面板 aria-label/sparkline 可达、map role/error 语义/pin hover、ai attachments 非图片清理、markdown copy 遮挡、tiptap-sender 锁定、master-detail 新增门控、sundial 残余静态计数等）——逐条 landed 或显式 adjudicated（允许 demo 数据面边界类转 V12c 台账登记）。
- 红线：instances 单调不增（219 基线）、newHits=0、新增豁免 0；消化计数入 daily log（以附录 A 99 条清单为准 → 0 或显式转 V12c 台账）。

## Non-Goals

- P3 池 87 条（V12c）；ui 组件 API 重设计；sundial 页面 IA 级重构（V12e ⑦ 残差中超出「行/计数绑定」的深度重构面维持 adjudicated）。

## Scope

### In Scope

- 报告 §4 族3×4、族4×1、族7×5。
- 单点/跨族残余：以 r3 台账为权威枚举、经 V12b 批复核 STILL_OPEN 的全部单点条目（live 已消化的登记 FIXED_SINCE 归因）。

### Out Of Scope

- 新 ui 原语大改；豁免登记；perf 面。

## Failure Paths

| 可测场景编号        | 触发                   | 行为       | 可重试 | 用户可见表现 |
| ------------------- | ---------------------- | ---------- | ------ | ------------ |
| keyboard-regression | 键盘路径回退           | 组件测试红 | 是     | 无           |
| schema-invalid      | sundial/演示 JSON 改坏 | 启动校验红 | 是     | 无           |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**——族3/4/7 与单点行为项先红；纯视觉小修以属性/计算样式断言钉住。

## Execution Plan

### Phase 1 - named 10（族3+族4+族7）

Status: completed
Targets: `packages/flux-renderers-layout/src/{steps-renderer,timeline-renderer}.tsx`、`packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`、`packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`、`packages/flux-renderers-basic/src/tabs.tsx`、`packages/flux-renderers-scheduling/src/calendar/*`、`packages/flux-renderers-form-advanced/src/{icon-picker.tsx,condition-builder/condition-group.tsx,tree-controls.tsx,tree-options.ts}`

- Item Types: `Fix | Proof`

- [x] Proof（先红）：①icon-picker 方向键 roving 断言；②calendar 月视图 Enter/Space 不劫持长按定时器断言；③steps 连接线几何断言
- [x] Fix（族3）：steps li relative + 连接线包含块（G1-R2-视角8-01）；timeline 横向连接线宽度源（G1-R4-视角8-01）；表头组/叶 sticky 层级（G3-R4-视角8-02）；tabs 桌面水平 overflow 契约（G1-R6-视角8-01）
- [x] Fix（族4）：calendar month-view Enter/Space 直接完成拖拽创建、不经 500ms 长按定时器（G4-R3-视角10-02，armed-session 修复）
- [x] Fix（族7）：行点击勾选键盘路径 toggleOnRowClick（G3-R2-视角3-01）；icon-picker roving tabindex + 方向键（G2-R7-视角9-01）；calendar week/day 格 onKeyDown（G4-R3-视角9-01）；condition-group Add-Group maxItemsPerGroup 门（G2-R7-视角4-01——atMaxItems 现仅门分隔符）；input-tree 残余缺口 = schema `clearable` 暴露/默认接线（clear 按钮与 multiple 取消选择已存在，见 tree-controls.tsx:426/tree-options.ts toggleTreeSelection）（G7-R2-视角4-01）

Exit Criteria:

- [x] named 10 逐条落地（每条独立先红→绿记录：steps 几何/timeline 宽度/sticky 层级/tabs 桌面溢出/calendar 键盘创建短路/行键盘 toggle/icon-picker roving/格 onKeyDown/Add-Group 门/input-tree clearable）；八包 focused 全绿

### Phase 2 - 单点波一：ui 基件

Status: completed
Targets: `packages/ui/src/components/ui/{input-group,card,drawer,alert-dialog,dialog,menubar,combobox,command,scroll-area,separator,slider,toggle-group,button-group,pagination,input,tabs}.tsx`

附录 A 波次 P2 = 12 条：G6-视角3-01（input-group Addon focus-visible）、G6-视角3-02（可点 card ring）、G6-视角3-03（drawer 把手键盘语义）、G6-视角4-01（input h-9 vs h-8 高度统一）、G6-视角6-01（alert-dialog Action Close 原语）、G6-视角7-02（overlay 双令牌统一 bg-surface-overlay）、G6-视角9-01（sidebar-label 已由 485 吸收则登记 FIXED_SINCE）、G6-视角10-01（menubar 指示器对齐）、G6-R2-视角3-01（dialog 拖拽头 focus-visible）、G6-R2-视角3-02（menubar Trigger focus-visible）、G6-R2-视角9-01（combobox aria-label ×3）、G6-R4-视角3-01（command-input 选择器修复）；G6-R5-视角6-01（scroll-area/separator/slider/toggle-group/button-group data-horizontal 族）随本波以 Fix bullet 显式落地。

- Item Types: `Fix | Proof`

- [x] Proof：4 项深做（input-group Addon、alert-dialog Action、combobox aria、overlay 统一）计算样式/属性断言先行
- [x] Fix：input-group Addon focus-visible + command-input 选择器修复；可点击 card focus-visible ring；drawer 把手键盘可达；alert-dialog Action 走 Close 原语；overlay 双令牌统一；menubar 指示器 + Trigger focus-visible；combobox aria-label ×3；pagination disabled 样式消费；input 高度统一；scroll-area/separator/slider/toggle-group/button-group data-horizontal 族替换为显式双向规则
- [x] Proof：每项以计算样式/属性断言钉住（抽 4 项深做，其余属性断言）

Exit Criteria:

- [x] ui 单点 12 条逐条 landed + sidebar-label 一条 FIXED_SINCE(485) 登记；ui 193/193 绿

### Phase 3 - 单点波二：renderers

Status: completed
Targets: `packages/flux-renderers-data/src/`（P3 数据族：tree multiple、分页三套收敛、selectAllChecked 树计数、quick-edit onSaveError、列设置菜单、selection 上限提示、virtual 拖拽 rowIndex、combine-cells 非虚拟）、`packages/flux-renderers-scheduling/src/`（gantt zoom 锚/fit、calendar 拖拽创建周/日视图、confirm 资源名、activity-log、notice-bar、calendar 键盘拖拽原点、barcode camera 错误通道）、`packages/flux-renderers-dashboard/src/`（addPanel 防重叠、setMode 清选择、NumberInput clamp、面板 aria-label、sparkline 可达）、`packages/flux-renderers-ai/src/`（markdown copy 遮挡、tiptap-sender 锁定）、`packages/flux-renderers-map/src/`（viewport role、error destructive、pin/cluster hover）、`packages/flux-renderers-basic/src/`（alert close data-slot）、`packages/flux-renderers-form/src/`（input-time ✕ 图标化、input-number padding/区间重叠、checkbox-group max/min 反馈）、`packages/flux-renderers-form-advanced/src/`（array-editor Add PlusIcon/maxItems 反馈）、`packages/flux-renderers-industrial/src/`（inspector Label htmlFor、toolbox ButtonGroup 布局、palette 固定坐标）、`packages/flux-renderers-content/src/`（carousel 触点、diff-header 图标、text 展开钮尺寸）、`packages/flux-renderers-pivot/src/`（canvas role/aria-label）、`packages/flux-renderers-mobile/src/styles.css`（.nop-mobile 死样式清扫）

- Item Types: `Fix | Decision`

- [x] Fix：按附录 A P3 波 59 条逐条落地（每条以台账 ID 引用，live 复核后先红/属性钉住）；分页三套 UI 收敛如超批改规模（>3 文件结构性重排）则以 Decision 显式转 V12c 台账并登记
- [x] Decision：demo 数据面/结构性重排类逐条显式落卡（不允许静默 deferred）

Exit Criteria:

- [x] renderers 单点两波 46 条逐条 landed/explicitly adjudicated（P3a 26 条 + P3b 20 条；含 3 条 FIXED_SINCE 登记、分页结构性合并 Decision→V12c、kanban activity-log 两死类型 adjudicated）；四包 + 波 B 八包 focused 全绿

### Phase 4 - 单点波三：playground schema

Status: completed
Targets: `apps/playground/src/complex-pages/page-schemas/*.json`、`apps/playground/src/complex-pages/shared/*`

- Item Types: `Fix | Decision`

- [x] Fix：附录 A P4 波 18 条逐条（G7 系：tray 图标、搜索消费、静态计数收尾、省-市联动、settings supabase 键、眼睛开关、删除确认、date-range clearable、formSaved 一次性旗标、master-detail 新增门控、V12e ⑦ 残差的行/计数绑定收尾等——以清单为准）
- [x] Decision：纯演示语义类显式 adjudicated 登记（V12c 台账承接）

Exit Criteria:

- [x] schema 单点 15 条逐条 landed/verify-only/explicitly adjudicated（organize 区无 DB 谓词、supabase 同步统计卡、t10 行覆盖缺口转 V12c 台账）；JSON 全过；playground 385/385

### Phase 5 - 对账 + docs + 门禁

Status: completed
Targets: `docs/components/*/design.md`、`docs/audits/visual-quality/consistency-debt.md`、`docs/backlog/visual-quality-roadmap.md`、`docs/logs/`（当日）

- Item Types: `Fix | Proof`

- [x] 对账：消化计数入 daily log（91 → 0 或 V12c 台账承接清单）；design docs 契约补记
- [x] 门禁：`check:audit-ui-consistency-gaps` exit 0 且 totals 单调不增（219 基线）；`check:i18n-keys` 绿
- [x] docs：consistency-debt V12f-D4、roadmap V12f 行注记 + P2 池清零声明、daily log

Exit Criteria:

- [x] 受影响包 focused test 全绿；全仓链归 Closure Gates（CHAIN EXIT 0，见下）
- [x] 对账三方一致（附录 A 清单 ↔ 各波执行报告 ↔ daily log）；P2 池清零：99 = landed 87 + FIXED_SINCE 登记 4 + Decision→V12c 8（分页合并、kanban 死类型×2、organize 区、supabase 统计卡、t10 覆盖、V12e-⑦ IA 深面）

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent fresh session ×2（2026-09-21 首轮 + 二轮）
- Verdict: 首轮 `revised`（1 Major：单点面覆盖缺口/缺清单 + 4 Minor）→ 吸收后二轮 `pass`
- Rounds: 2
- Findings addressed: M-1 单点面覆盖缺口——已附附录 A 权威清单（99 条，P1=10/P2=12/P3=59/P4=18，6 行抽查回读 r3 台账全中）并把缺失包补入 Phase 2/3 Targets（form/form-advanced/industrial/content/pivot/mobile + ui input/scroll-area 族 Fix bullet）；m-1 condition-group 路径修正；m-2 mobile 样式落点移 flux-renderers-mobile、Phase 1 交叉 listing 收敛；m-3 先红锚点口径对齐批协议（行为项先红、视觉/属性类钉住）；m-4 input-tree Fix 改述为残余缺口（schema clearable 暴露）。二轮非阻塞观察：附录 A 证据列 ~120 字节截断——执行时以台账按 ID 回读全文。

## Appendix A：残差清单（99 条，权威枚举）

> 程序化生成：169 候选 − 485/486/487 池内已消化 − FIXED_SINCE − SUPERSEDED。每条 live 复核后 landed 或显式 adjudicated；本清单即 Phase 5 对账的核对对象。

| ID              | 族   | 波  | 落点证据（复核时点）                                                                                          |
| --------------- | ---- | --- | ------------------------------------------------------------------------------------------------------------- |
| G1-视角8-06     | —    | P3  | packages/flux-renderers-content/src/carousel.tsx:305-317                                                      |
| G1-视角1-07     | —    | P3  | packages/flux-renderers-content/src/diff-view/components/diff-header.tsx:44-67                                |
| G1-视角4-10     | —    | P3  | packages/flux-renderers-basic/src/text.tsx:158-174                                                            |
| G2-视角1-01     | —    | P3  | packages/flux-renderers-form/src/renderers/input-time-renderer.tsx:216-228                                    |
| G2-视角3-01     | —    | P3  | packages/flux-renderers-form-advanced/src/transfer-renderer.tsx:369-378                                       |
| G2-视角4-01     | —    | P3  | packages/flux-renderers-form/src/renderers/input-number-renderer.tsx:239-243,262-300                          |
| G2-视角4-02     | —    | P3  | packages/flux-renderers-form/src/renderers/checkbox-group-renderer.tsx:79-103,158-195                         |
| G2-视角10-01    | —    | P3  | packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:546-550                             |
| G3-视角3-03     | —    | P3  | packages/flux-renderers-data/src/pagination-renderer.tsx:238-249, 312-324                                     |
| G3-视角4-01     | —    | P3  | packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:256-281                                  |
| G3-视角9-03     | —    | P3  | packages/flux-renderers-data/src/tree-renderer.tsx:549-572                                                    |
| G3-视角10-01    | —    | P3  | packages/flux-renderers-data/src/table-renderer/table-pagination-bar.tsx:78-148、packages/f                   |
| G4-视角9-01     | —    | P3  | packages/flux-renderers-scheduling/src/kanban/kanban-card.tsx:62-73,105-121；packages/flux-                   |
| G4-视角9-02     | —    | P3  | packages/flux-renderers-scheduling/src/kanban/kanban-column.tsx:243-309                                       |
| G4-视角11-01    | —    | P3  | packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:265-274                    |
| G5-视角4-01     | —    | P3  | packages/flux-renderers-industrial/src/editor/inspector/inspector-field.tsx:38-66                             |
| G5-视角9-01     | —    | P3  | packages/flux-renderers-map/src/map-renderer.tsx:365-367                                                      |
| G6-视角3-01     | —    | P2  | packages/ui/src/components/ui/input-group.tsx:43-69                                                           |
| G6-视角3-02     | —    | P2  | packages/ui/src/components/ui/card.tsx:12-36                                                                  |
| G6-视角3-03     | —    | P2  | packages/ui/src/components/ui/drawer.tsx:183-195                                                              |
| G6-视角4-01     | —    | P2  | packages/ui/src/components/ui/input.tsx:17                                                                    |
| G6-视角6-01     | —    | P2  | packages/ui/src/components/ui/alert-dialog.tsx:136-155                                                        |
| G6-视角7-02     | —    | P2  | packages/ui/src/components/ui/dialog.tsx:98                                                                   |
| G6-视角10-01    | —    | P2  | packages/ui/src/components/ui/menubar.tsx:114、120                                                            |
| G7-视角1-02     | 族9  | P4  | sundial-workbench.json:199-204,232-237；sundial-detail.json:425-430；sundial-todo-dialog.jso                  |
| G7-视角3-06     | —    | P4  | sundial-workbench.json:1100-1121,1543-1578；sundial-detail.json:720-731                                       |
| G7-视角10-07    | —    | P4  | sundial-detail.json:601-627,766-791,905-937；sundial-workbench.json:2173-2201                                 |
| G7-视角10-08    | 族8  | P4  | standard-crud.json:328-344；master-detail.json:211-227                                                        |
| G7-视角4-10     | —    | P4  | sundial-settings.json:940-990（URL/key 输入），:992-1011（保存按钮）                                          |
| G7-视角6-11     | —    | P4  | sundial-settings.json:964-983                                                                                 |
| G7-视角11-12    | —    | P4  | sundial-settings.json:1017-1109（状态卡，无 mode 绑定），:580-933（模式切换），:1459-1466（数据分区静态文案） |
| G7-视角11-14    | —    | P4  | sundial-detail.json:797-803                                                                                   |
| G1-R2-视角2-01  | —    | P3  | packages/flux-renderers-basic/src/button.tsx:189-193,245-263                                                  |
| G1-R2-视角3-01  | 族1  | P3  | packages/flux-renderers-layout/src/collapse-renderer.tsx:206-233                                              |
| G1-R2-视角5-01  | 族5  | P3  | packages/flux-renderers-content/src/audio.tsx:47-49；video.tsx:57-59；image.tsx:203-209；qrco                 |
| G1-R2-视角8-01  | 族3  | P1  | packages/flux-renderers-layout/src/steps-renderer.tsx:230-251；packages/flux-renderers-layo                   |
| G1-R2-视角8-02  | —    | P3  | packages/flux-renderers-content/src/diff-view/components/diff-file-list.tsx:86；diff-view/d                   |
| G2-R2-视角4-01  | —    | P3  | packages/flux-renderers-form/src/renderers/select-mobile-renderer.tsx:30-84                                   |
| G2-R2-视角4-02  | 族1  | P3  | packages/flux-renderers-form-advanced/src/array-editor.tsx:564-596；packages/flux-renderers                   |
| G3-R2-视角3-01  | 族7  | P1  | packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:113-114,175-2                    |
| G3-R2-视角4-01  | 族1  | P3  | packages/flux-renderers-data/src/table-renderer/use-table-selection.ts:138-143,259-261；pac                   |
| G3-R2-视角4-02  | —    | P3  | packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:45-117,122-129                              |
| G3-R2-视角6-01  | —    | P3  | packages/flux-renderers-data/src/table-renderer.tsx:443-485（Base UI 默认值核实: @base-ui/react@              |
| G3-R2-视角9-01  | —    | P3  | packages/flux-renderers-pivot/src/pivot-renderer.tsx:254-257                                                  |
| G4-R2-视角9-01  | —    | P3  | packages/flux-renderers-mobile/src/notice-bar.tsx:235-241,284-301                                             |
| G4-R2-视角10-01 | 族7  | P3  | packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-drag.ts:192-210,222-224                    |
| G5-R2-视角5-02  | 族9  | P3  | packages/flux-renderers-map/src/map-renderer.tsx:174-180,379-388（样式 packages/flux-renderer                 |
| G6-R2-视角3-01  | —    | P2  | packages/ui/src/components/ui/dialog.tsx:265-291（类串 269-277，聚焦属性 278-281）                            |
| G6-R2-视角3-02  | —    | P2  | packages/ui/src/components/ui/menubar.tsx:46-56                                                               |
| G6-R2-视角9-01  | —    | P2  | packages/ui/src/components/ui/combobox.tsx:31-42（ComboboxClear）、combobox.tsx:56-70（Combobo                |
| G7-R2-视角4-01  | —    | P1  | apps/playground/src/complex-pages/page-schemas/tree-crud.json:36-53；packages/flux-renderer                   |
| G7-R2-视角11-03 | 族6  | P4  | apps/playground/src/complex-pages/page-schemas/master-detail.json:232-259；apps/playground/                   |
| G7-R2-视角11-04 | —    | P4  | apps/playground/src/complex-pages/page-schemas/sundial-detail.json:645-648,1254-1266                          |
| G7-R2-视角11-05 | —    | P4  | apps/playground/src/complex-pages/page-schemas/sundial-detail.json:418-451                                    |
| G7-R2-视角11-06 | 族6  | P4  | apps/playground/src/complex-pages/page-schemas/sundial-settings.json:842-846,878-884,993-1                    |
| G7-R2-视角11-07 | —    | P4  | apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:84-110                                  |
| G1-R3-视角8-01  | —    | P3  | packages/flux-renderers-basic/src/tabs.tsx:30-31,280-318,431-452                                              |
| G3-R3-视角4-02  | —    | P3  | packages/flux-renderers-data/src/table-renderer.tsx:592,598；packages/flux-renderers-data/s                   |
| G3-R3-视角5-01  | 族5  | P3  | packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:125-130；packa                   |
| G3-R3-视角11-01 | —    | P3  | packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:165-178；package                   |
| G4-R3-视角10-01 | 族3  | P3  | packages/flux-renderers-scheduling/src/gantt/gantt-store.ts:354-369；packages/flux-renderer                   |
| G4-R3-视角11-01 | 族9  | P3  | packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx:37-44,58；packages/flux-i18n/                   |
| G4-R3-视角10-02 | 族7  | P1  | packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:113-124                    |
| G4-R3-视角9-01  | 族7  | P1  | packages/flux-renderers-scheduling/src/calendar/components/calendar-week-view.tsx:127-135；                   |
| G4-R3-视角11-02 | —    | P3  | packages/flux-renderers-scheduling/src/calendar/calendar.tsx:473-504                                          |
| G5-R3-视角5-01  | —    | P3  | packages/flux-renderers-ai/src/renderers/ai-attachments.tsx:187-204,250-260,386-390                           |
| G5-R3-视角8-01  | —    | P3  | packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:158-214（7 组 Button                  |
| G7-R3-视角4-01  | —    | P4  | apps/playground/src/complex-pages/page-schemas/advanced-query.json:56-61                                      |
| G7-R3-视角11-01 | —    | P4  | apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:145,358,442,526,610（                   |
| G1-R4-视角8-01  | 族3  | P1  | packages/flux-renderers-layout/src/timeline-renderer.tsx:301-307（父级 li 布局 :283-289）                     |
| G1-R4-视角6-01  | 族3  | P3  | packages/flux-renderers-basic/src/page.tsx:260-266                                                            |
| G1-R4-视角8-02  | —    | P3  | packages/flux-renderers-layout/src/steps-renderer.tsx:262-310                                                 |
| G2-R4-视角5-02  | —    | P3  | packages/flux-renderers-form-advanced/src/upload-field.tsx:350-368（余量切片）、:209-211（committe            |
| G3-R4-视角8-02  | —    | P1  | packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:512-530                                  |
| G3-R4-视角4-01  | —    | P3  | packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:416-447；packages/flux-                   |
| G4-R4-视角11-01 | 族9  | P3  | packages/flux-renderers-scheduling/src/calendar/calendar.tsx:274-286,394-402；packages/flux                   |
| G4-R4-视角11-02 | 族9  | P3  | packages/flux-renderers-scheduling/src/kanban/components/kanban-activity-log.tsx:31-53,84-                    |
| G4-R4-视角11-03 | —    | P3  | packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:180-191,183,287-297,352-379                    |
| G5-R4-视角5-01  | 族10 | P3  | packages/flux-renderers-ai/src/adapters/use-conversation.ts:439,447-473                                       |
| G5-R4-视角11-01 | —    | P3  | packages/flux-renderers-industrial/src/editor/palette/editor-palette.tsx:38-49                                |
| G6-R4-视角3-01  | —    | P2  | packages/ui/src/components/ui/command.tsx:57-70                                                               |
| G7-R4-视角6-01  | —    | P4  | apps/playground/src/complex-pages/page-schemas/sundial-workbench.json:2084-2170（openDialog                   |
| G7-R4-视角3-01  | 族6  | P4  | apps/playground/src/complex-pages/page-schemas/complex-form.json:25-30,140-145；combo-edito                   |
| G1-R5-视角8-01  | 族3  | P3  | packages/flux-renderers-content/src/markdown.tsx:107-119（渲染容器）、:116（remarkGfm 启用）                  |
| G2-R5-视角4-01  | —    | P3  | packages/flux-renderers-form/src/renderers/form.tsx:328-344（消费方）；packages/flux-renderers-f              |
| G2-R5-视角4-02  | —    | P3  | packages/flux-renderers-form/src/renderers/fieldset.tsx:33-37,83-92；组合面 packages/flux-rend                |
| G3-R5-视角4-01  | —    | P3  | packages/flux-renderers-dashboard/src/editor/editor-inspector.tsx:131-155（NumberInput）、:70                 |
| G3-R5-视角3-01  | —    | P3  | packages/flux-renderers-dashboard/src/editor/dashboard-editor-renderer.tsx:239-255（Delete                    |
| G4-R5-视角3-01  | 族2  | P3  | packages/flux-renderers-mobile/src/styles.css:35-79（变体规则全部以 .nop-mobile 为前缀）；packages/flux       |
| G5-R5-视角3-01  | —    | P3  | packages/flux-renderers-map/src/map-layer-manager.ts:194-205（buildPinStyle）、:165-192（build                |
| G5-R5-视角3-02  | —    | P3  | packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx:215,308-312,411-413；packages/fl                   |
| G5-R5-视角8-01  | —    | P3  | packages/flux-renderers-ai/src/renderers/ai-bubble/renderers/markdown.tsx:261-276                             |
| G6-R5-视角6-01  | 族2  | P2  | packages/ui/src/components/ui/scroll-area.tsx:31-39（主受害面）；同根因：separator.tsx:10-13、slider.t        |
| G7-R5-视角4-01  | 族6  | P4  | apps/playground/src/complex-pages/page-schemas/complex-form.json:90-106                                       |
| G1-R6-视角8-01  | 族3  | P1  | packages/flux-renderers-basic/src/tabs.tsx:320-329（mobile-only 溢出分支）、:258-268（mobile-only             |
| G1-R6-视角8-02  | —    | P3  | packages/flux-renderers-content/src/alert-renderer.tsx:104-116                                                |
| G3-R6-视角8-01  | —    | P3  | packages/flux-renderers-data/src/table-renderer/combine-cells.ts:41-53（计划仅在 virtual 时降级）、:          |
| G2-R7-视角9-01  | 族7  | P1  | packages/flux-renderers-form-advanced/src/icon-picker.tsx:39,213-244,246-258                                  |
| G2-R7-视角4-01  | 族1  | P1  | packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:161-168,18                    |

## Closure Gates

- [x] Phase 1–5 Exit Criteria 全勾
- [x] named 10 + 单点残余逐条 landed / adjudicated，无静默 deferred
- [x] 行为项先红后绿有记录
- [x] v1 红线：instances 单调不增（219 基线）、newHits=0、新增豁免 0
- [x] 受影响 owner docs 已同步
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

（无 —— 执行中确需延期的逐条落入本节并带 Why Not Blocking）

## Non-Blocking Follow-ups

- （无预设）

## Closure

Status Note: 五 Phase 全部落地（99 条：landed 87 + FIXED_SINCE 4 + Decision→V12c 8）并经独立 closure audit `approved`（16/16 抽样、6 deep；FIXED_SINCE 6 抽查全真实；8 项 Decision→V12c 计数与 consistency-debt V12f-D4 对账一致；门禁 219/64/69 newHits=0 独立复跑；ui 193/193、data 1154/1154、scheduling exit 0 独立复跑）。P2 池清零；三处非阻塞文字瑕疵（公式歧义、91 旧口径残留、附录行号漂移）已修/留档。全仓链 CHAIN EXIT 0。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（2026-09-21 closure audit）
- Evidence: verdict `approved`——逐波对照表见审计输出；daily log `docs/logs/2026/09-21.md` §plan 488；consistency-debt V12f-D4。

Follow-up:

- no remaining plan-owned work（8 项 Decision→V12c 台账由 V12c 承接；calendar 事件块键盘冒泡候选 follow-up 已登记）
