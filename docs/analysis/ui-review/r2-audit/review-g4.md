# R2 全量 UI 一致性审查 — G4 组独立复核报告（review-g4）

- 复核日期: 2026-08-29 · 复核基线: `git rev-parse HEAD` = `0f183874a25f942c234b9806b1546c6f37ee5a85`（`0f183874a`，与派发口径一致）
- 复核者: 独立复核子 agent（G4 组，fresh session，未复用发现 agent 结论）
- 复核对象: R1–R5 全部 G4 条目 39 条（R1 14 / R2 10 / R3 8 / R4 5 / R5 2）
- 输入: `dispatch-shared-prefix.md`、`dedup-baseline.md`（§1–§4）、round-01/02/03/04 的 `[G4-` 段全文、`round-05-g4.md` 全文（含防复核弃报留档）
- 方法: 逐条先经 Grep/Read 定位证据 文件:行号、独立阅读 live code 自行判断，再与发现结论比对输出判定；HIGH 条目逐项复核过程叙述（§4）。

## ① 复核概要

| 判定 | 数量   | 说明                                              |
| ---- | ------ | ------------------------------------------------- |
| 保留 | **39** | 严重度全部维持原判（HIGH 1 / MEDIUM 27 / LOW 11） |
| 降级 | 0      | —                                                 |
| 驳回 | 0      | —                                                 |

**计数勘误（不影响复核结论）**: 派发口径为"HIGH 1 / MEDIUM 28 / LOW 10"，按五个落盘文件逐条清点实为 **HIGH 1 / MEDIUM 27 / LOW 11 = 39 条**（R1 M8/L6、R2 M7/L3、R3 M6/L2、R4 H1/M4/L0、R5 M2/L0，各轮自汇总表一致）。派发统计差 1 条 MEDIUM/LOW 归类，条目总数与覆盖不受影响。

**派发描述勘误**: 派发指令将唯一 HIGH 描述为"barcode 扫码校验错误提示被浮层遮挡"——该描述实为 R2 的 MEDIUM 条目 [G4-R2-视角4-01]；G4 唯一 HIGH 是 [G4-R4-视角3-01]（barcode-input 扫码/清除/scanNow 通道未接 `meta.disabled` 门禁）。两条均已独立复核（见 §2/§4），判定互不影响。

**总体结论**: 39 条全部通过证据-结论逻辑链检查。所有 load-bearing 证据（行号、代码片段、grep 全仓断言）经 live code 独立复验全部成立；未发现误读、证据不支撑、误报 §3 / 缺口 §2 / 维度 09-12 或全量 WCAG 越界条目。严重度判级与 skill 判级标准及既有跨组先例（G2 disabled 族 HIGH、G5 P2-5 族 MEDIUM、G5-R2-视角3-04 LOW 等）一致。G4 组审查质量高，建议按原清单进入汇总阶段。

## ② 逐条复核清单表（39 行全覆盖）

判定列：保留（严重度不变）。

| #   | 条目                                                                 | 原级     | 判定 | 复核要点（live code 独立核验结论）                                                                                                                                                                                                                                                                                                                                             |
| --- | -------------------------------------------------------------------- | -------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| 1   | [G4-视角1-01] scheduling 文本字符替代图标、同包图标化不一致          | MEDIUM   | 保留 | gantt-header.tsx:56-57 `−/+` 无 aria-label；calendar-header.tsx:54/71 `‹›`；gantt-links.tsx:119 `&times;`；barcode-input.tsx:308 文本 `×`（同排 :320 用 ScanLine）；zh-CN.ts:1099-1100 `'+ 添加列'/'+ 添加卡片'`；对照 kanban-column-header.tsx:137 已用 Chevron。同语义不同图标=视角 1 明列 MEDIUM。                                                                          |
| 2   | [G4-视角3-01] gantt 树形展开指示符恒为文本 `>`                       | MEDIUM   | 保留 | gantt-grid.tsx:157 恒 `{'>'}`，仅 aria-expanded 变化；按钮 16×16（w-4 h-4）。同包 kanban-column-header.tsx:137 为正确基线，跨组件不一致成立。                                                                                                                                                                                                                                  |
| 3   | [G4-视角4-01] kanban 搜索框无清除按钮                                | LOW      | 保留 | kanban-toolbar.tsx:27-35 无 clear；同屏 kanban-tag-filter.tsx:57 有 `clearFilter` 按钮，不对称属实。影响轻微（覆盖输入即可绕过），LOW 恰当。                                                                                                                                                                                                                                   |
| 4   | [G4-视角5-01] gantt 默认空态空白 div                                 | MEDIUM   | 保留 | gantt.tsx:481-483 空 div（无 regions.empty 时）；对照 kanban-board.tsx:546-550（noData 文案）、calendar.tsx:428-435（图标+文案）。三组件三种空态标准成立。                                                                                                                                                                                                                     |
| 5   | [G4-视角5-02] countdown 缺配置渲染不可见空元素                       | LOW      | 保留 | countdown.tsx:208-222 `!hasTimeConfig` 分支渲染空 `<span>`。配置错误边缘路径，LOW 恰当。                                                                                                                                                                                                                                                                                       |
| 6   | [G4-视角5-03] kanban 溢出计数 `+N` 无提示手段                        | LOW      | 保留 | kanban-card-tags.tsx:57-59/80-82 裸 `+N` 无 title/Tooltip；可见成员头像确有 `title={member.name}`（:70）。属误报 #5 明文例外（信息丢失且无 Tooltip），立案正当。                                                                                                                                                                                                               |
| 7   | [G4-视角6-01] kanban 新增列确认在左/取消在右                         | MEDIUM   | 保留 | kanban-column-adder.tsx:51-68 确认（蓝）左、取消右；styling-system.md:594 明文 `actions MUST be [secondary, primary]`；gantt-editor 为正确基线。误点后果有限（列名重输/有 Undo 兜底），维持 MEDIUM 不升 HIGH。                                                                                                                                                                 |
| 8   | [G4-视角7-01] scheduling 包硬编码语义色 + 裸 hex                     | MEDIUM   | 保留 | 逐点复验：kanban-column.tsx:209 `border-red-400`、kanban-card.tsx:114 `hover:text-red-500`、gantt-grid.tsx:131-132 `bg-blue-50*`、use-gantt-drag.ts:38 `#3b82f6`、use-gantt-link-draw.ts:49/:129 `#3b82f6`、baseline-bars.tsx:56/:65 `#ef4444/#f59e0b`。与包 CSS 令牌基线并存属实；仅报令牌化、未越界 G-I 暗色缺口，边界处理正确。                                             |
| 9   | [G4-视角8-01] gantt 连线手柄 8~20px hover-only                       | LOW      | 保留 | gantt-bars.tsx:151/:156/:202/:207 `w-2 h-2 opacity-0 group-hover:opacity-100`；gantt-links.tsx:95-121 删除钮 20px `{isHovered && ...}` 条件渲染。低于误报 #4 icon-xs 24px 基准，LOW 判级理由（桌面优先+删除有兜底）成立。                                                                                                                                                      |
| 10  | [G4-视角8-02] kanban 卡片删除钮 20px hover-only                      | LOW      | 保留 | kanban-card.tsx:107-118 `h-5 w-5`（20px）+ `opacity-0 group-hover:opacity-100 group-focus-within:opacity-100`。键盘 Delete 键可用（:54-58），LOW 恰当。                                                                                                                                                                                                                        |
| 11  | [G4-视角9-01] kanban 卡片/列头 role=button 嵌套真实 button           | MEDIUM   | 保留 | kanban-card.tsx:62-73 `role:'button'` + :108-117 真实删除 Button。误报 #6 允许的是模式本身，本条报**嵌套**，区分正确；属视角 9"UX 可见部分"（读屏播报/可达性），未越界维度 20。                                                                                                                                                                                                |
| 12  | [G4-视角9-02] kanban role=list 子项缺 listitem                       | MEDIUM   | 保留 | kanban-column.tsx:243（role="none" 包装 + role="button" 卡片）与 :279（卡片直接挂 list）两路径均证实。                                                                                                                                                                                                                                                                         |
| 13  | [G4-视角10-01] Loading 三种实现并存                                  | LOW      | 保留 | kanban-board.tsx:532-538 手写 `animate-pulse` 灰块（`bg-gray-100` 硬编码 + `.nop-kanban-skeleton` 双源）；gantt.tsx:467-472 / calendar.tsx:415-420 用 ui Skeleton；barcode-scanner-overlay.tsx:257 手写 border-spinner；mobile 包 pull-refresh/infinite-scroll 用 ui Spinner（rg 证实）。                                                                                      |
| 14  | [G4-视角11-01] calendar "+N more" 假可供性                           | MEDIUM   | 保留 | calendar-month-view.tsx:265-274 `cursor-pointer hover:underline` 且无 onClick/role/aria。视角 11 明列"看起来可点击实际无功能"；完整修复（popover）已按 R1 C2 先例分离，边界正确。                                                                                                                                                                                              |
| 15  | [G4-R2-视角1-01] 里程碑 handle 缺 `group` 永不可见                   | LOW      | 保留 | gantt-bars.tsx:127 里程碑根无 `group`，:173 任务条有；:151/:156 handle 依赖 `group-hover:opacity-100`。与 R1 视角8-01（尺寸/hover-only 设计）根因确不同，实现 bug 定性成立。                                                                                                                                                                                                   |
| 16  | [G4-R2-视角3-01] calendar 拖拽落点零视觉反馈                         | MEDIUM   | 保留 | calendar.tsx:362-386 写 `data-drop-target/drag-ok/drag-conflict`；rg 证实 calendar.css 零规则、kanban.css:144 有同名实现。同包对照证明"只写状态未接视觉"成立。                                                                                                                                                                                                                 |
| 17  | [G4-R2-视角3-02] gantt bar 选中态无视觉指示                          | MEDIUM   | 保留 | gantt-bars.tsx:172-176 根类串不读 selectedTaskId、无 aria-selected/data-selected；gantt-grid.tsx:128-132 行有 `bg-blue-50` + `aria-selected`。半个映射手零反馈成立。                                                                                                                                                                                                           |
| 18  | [G4-R2-视角3-03] scheduling roving 元素零 focus 指示                 | LOW      | 保留 | rg `focus` 于 kanban/gantt/calendar/barcode/styles 共 5 个包 CSS 零命中；kanban-card.tsx:103、calendar-month-view.tsx:236-240 无 focus 类；gantt-bars.tsx:127/:173 有 `focus:ring-2` 双轨属实。键盘层缺陷，LOW 恰当。                                                                                                                                                          |
| 19  | [G4-R2-视角4-01] 扫码校验错误被全屏浮层遮蔽                          | MEDIUM   | 保留 | barcode-input.tsx:176-180 校验失败仅 setState 不关浮层；:326-328 错误渲染页面流；overlay `createPortal(document.body)` + `fixed inset-0 z-50`（barcode-scanner-overlay.tsx:246/:380）确证遮蔽；非批量 `dedupe: !batchMode`（:88）确证重扫同码不再派发。有关闭浮层恢复通道，维持 MEDIUM 不升 HIGH。                                                                             |
| 20  | [G4-R2-视角5-01] pull-refresh 失败静默回弹                           | MEDIUM   | 保留 | pull-refresh.tsx:146-170 `.catch → statusRef='normal'` 无任何用户可见反馈；对照 infinite-scroll.tsx:7/:241/:253 有 error 态+重试。双标成立，MEDIUM 恰当。                                                                                                                                                                                                                      |
| 21  | [G4-R2-视角5-02] calendar exportError 从未渲染、无 busy              | MEDIUM   | 保留 | use-calendar-export.ts:7-8/:12/:58/:70 状态完备；全仓 rg（非 test）`exportError                                                                                                                                                                                                                                                                                                | clearExportError` 仅命中 calendar.tsx:231 注释；导出期无 Spinner/禁用。声明了错误面却无消费方，成立。 |
| 22  | [G4-R2-视角8-01] gantt bar 6px 缩放热区无 affordance                 | LOW      | 保留 | gantt-bars.tsx:63-69 `edgeThreshold=6`；:173 全程 `cursor-pointer`，无 `cursor-ew-resize`、无手柄图形。与 R1 视角8-01（连线手柄）不同交互面，分立正确。                                                                                                                                                                                                                        |
| 23  | [G4-R2-视角9-01] notice-bar role=button 嵌套关闭钮                   | MEDIUM   | 保留 | notice-bar.tsx:235-237 `hasClick → role:'button'`；:284-301 内嵌真实 ui Button（关闭）。R1 视角9-01 的跨包兄弟实例，按"修一处必须查全类"保留，判级一致（MEDIUM）。                                                                                                                                                                                                             |
| 24  | [G4-R2-视角10-01] calendar 键盘拖拽 ghost (0,0) + Enter 回发原日期   | MEDIUM   | 保留 | use-calendar-drag.ts:200-209 键盘起点坐标 0；calendar.tsx:506-518 `dragState.active` 即渲染 fixed ghost；:195-198 `pendingTargetRef` 初始化为原日期/资源且 `moveKeyboardDrag`（:212-216）不更新；`confirmDrop`（:86-103）按其再派发。双缺陷链完整闭合。                                                                                                                        |
| 25  | [G4-R3-视角10-01] gantt 缩放锚定断链                                 | MEDIUM   | 保留 | gantt-store.ts:354-369 setZoom 锚定分支如述；`_scrollLeft` 初始 0（:49），生产代码无写入方（rg 证实仅 use-gantt-scroll 回调签名与 gantt.tsx:216-218 事件派发；gantt.tsx:323/:333 只写 DOM scrollLeft）；:367 计算结果也未应用回 DOM。"缩放后视口跳变"推理链成立。                                                                                                              |
| 26  | [G4-R3-视角11-01] gantt "适应/Fit" 无适配计算                        | MEDIUM   | 保留 | gantt-header.tsx:37-44 `zooms[Math.floor(zooms.length/2)]`；zh-CN.ts:1125 `zoomFit: '适应'` / en-US.ts:1126 `'Fit'`。文案-行为不符成立。                                                                                                                                                                                                                                       |
| 27  | [G4-R3-视角3-01] gantt 缩放越界静默无效                              | LOW      | 保留 | gantt-header.tsx:19-35 越界静默跳过，:56-57 按钮无 disabled。与 [G5-R2-视角3-04]（LOW）判级一致。                                                                                                                                                                                                                                                                              |
| 28  | [G4-R3-视角10-02] 键盘创建死路 + 武装会话劫持                        | MEDIUM   | 保留 | month-view.tsx:113-124 Enter/Space 合成 pointer 调 `startCellDrag`；use-calendar-drag-create.ts:174-191 长按定时器、:130-145 `showTypeSelector` 仅在 `handlePointerUp` 打开——键盘永无 pointerup，会话武装（pressing 监听挂窗 + activeRef/startInfoRef 置位），下一次任意点击误弹选择器并可用陈旧日期创建。双重缺陷逐步复验成立；考虑主指针路径可用，维持 MEDIUM。              |
| 29  | [G4-R3-视角9-01] 周/日视图约百个惰性 tab stop                        | MEDIUM   | 保留 | calendar-week-view.tsx:127-135 / calendar-day-view.tsx:107-115 `tabIndex={0}` 无 onKeyDown/无 aria-selected；对照月视图 roving 全套（month-view:219-221/:92-112/:89/:113-124 逐一证实）。行为层缺陷与 R2-3-03 视觉层分立正确。                                                                                                                                                 |
| 30  | [G4-R3-视角7-01] 固定白前景 × 可变背景配对缺陷                       | MEDIUM   | 保留 | calendar-event-block.tsx:118-119 `backgroundColor: color`（三源可变）+ `color: 'var(--color-primary-foreground)'`；theme-tokens styles.css:52/151/211/271/331 五套调色板 `--primary-foreground: 0 0% 100%`（全白）；calendar.tsx:47-50 默认班次色 `#4ade80/#f87171/#60a5fa/#fbbf24` fallback 生效。浅底白字可读性问题在默认配置必然可见。与 R1 视角7-01 根因（令牌化）确不同。 |
| 31  | [G4-R3-视角5-01] 相机失败无重试 + 原始 message 直出                  | LOW      | 保留 | barcode-scanner-overlay.tsx:130 `err?.message ?? t('flux.cameraUnavailable')`（message 优先）；:186-189 `restartCamera` 仅 torch 链消费；:262-267 error 相位无按钮。与 R2-4-01（遮蔽）根因确不同；边缘路径+关闭重开兜底，LOW 恰当。                                                                                                                                            |
| 32  | [G4-R3-视角11-02] 周/日视图无创建入口                                | MEDIUM   | 保留 | calendar.tsx:480 仅月视图传 `onCellDragStart={dragCreate.startCellDrag}`；:487-495/:497-503 周/日仅 `onDragStart`。`getCellFromPoint`（:263-272）对 `data-slot="calendar-cell"` 通用，纯接线缺失定性成立。                                                                                                                                                                     |
| 33  | [G4-R4-视角3-01] barcode 扫码/清除/scanNow 通道未接 disabled 门禁    | **HIGH** | 保留 | 逐项复核见 §4。                                                                                                                                                                                                                                                                                                                                                                |
| 34  | [G4-R4-视角10-01] kanban WIP strict 卡片级落点绕过                   | MEDIUM   | 保留 | use-kanban-dnd.ts:130-133 卡片级 `canDrop` 无条件放行；:164-167 列级唯一强制点；:94-99 onDrop 无条件落位；:180-202 键盘通道同样不查 wipSet。pdnd drop-target 栈语义（内层 target 命中卡片即放行）推理成立；文档契约 flux-guide/design-patterns/kanban.md:110 "超限禁入"证实承诺存在。维持 MEDIUM（WIP 为软约束、有事后徽标可见）。                                             |
| 35  | [G4-R4-视角11-01] calendar 确认框直出原始 resource ID                | MEDIUM   | 保留 | use-calendar-confirm-dialog.ts:24 `targetResource: payload.toResource`（原值）；calendar-confirm-dialog.tsx:34-38 直接插值；calendar.tsx:394-402 无资源时兜底 id=`_default`。title/text 在 displayResources 现成可得而未解析，成立。                                                                                                                                           |
| 36  | [G4-R4-视角11-02] kanban 活动日志恒等映射列 ID                       | MEDIUM   | 保留 | kanban-activity-log.tsx:84-88 `columnNames[id]=id`；:33-34 兜底回原 id；kanban-board.tsx:654-658 只传 `actions`；:421 新列 id=`col-${Date.now()}`；对照 :291 卡片侧已回退 title。成立。                                                                                                                                                                                        |
| 37  | [G4-R4-视角11-03] 活动日志仅记录 cardMove                            | MEDIUM   | 保留 | kanban-board.tsx `recordAction` 唯一调用点 :287（onCardMove）；:352-364/:366-379/:419-436 三条 mutation 通道均无记录；类型联合六类（activity-log.tsx:8）与五条死文案（zh-CN.ts:1112-1116）证实承诺-行为落差。                                                                                                                                                                  |
| 38  | [G4-R5-视角3-01] notice-bar 变体色板死 CSS（.nop-mobile 无生产方）   | MEDIUM   | 保留 | styles.css:35-79 全部变体规则/变量/暗色覆盖挂 `.nop-mobile` 前缀；全仓 rg `nop-mobile` 唯一命中 styles.css 自身；notice-bar.tsx:243-246 根类串无该类且无祖先来源；flux-guide/mobile/notice-bar.md:29/:54 variant 为一等 schema 能力。证据链（选择器前缀 × 类生产方 × 文档契约 × 测试仅断属性存在）完整闭合。                                                                   |
| 39  | [G4-R5-视角3-02] gantt/kanban/calendar 三 board 零消费 meta.disabled | MEDIUM   | 保留 | 包级 rg 证实 `meta.disabled` 消费方仅 barcode-input.tsx:231/:290；gantt.tsx:495、kanban-board.tsx:561、calendar.tsx:448-455 根容器只读 className/testid/cid（三文件全文通读无 disabled 读取）；scheduling-boundary-narrowing.test.ts:109-114 证实框架确向 GanttSchema 解析下发 `disabled`。与 G5 P2-5 族（两条 MEDIUM）判级一致，维持 MEDIUM。                                 |

## ③ 去重记录

复核独立重查了 39 条的相互关系及与 dedup-baseline 的边界，**无需合并/驳回的重复**：

- 同根因新实例对（全部核验"引根存在 + 修复面互不覆盖"，维持分立）：R1-9-01 ↔ R2-9-01（kanban ↔ notice-bar 嵌套，跨包）；R1-7-01 ↔ R3-7-01（令牌化 ↔ 固定前景配对，机制与修复不同）；R4-11-01 ↔ R4-11-02（确认态未解析 title ↔ 恒等映射，组件/链路/修复点不同）；R4-3-01 ↔ R5-3-02（barcode 侧通道 ↔ 三 board 0% 消费，核查面互不覆盖）；R2-3-03 ↔ R3-9-01（focus 样式视觉层 ↔ 键盘模型行为层）；R2-10-01 ↔ R3-10-02（移动会话 use-calendar-drag ↔ 创建会话 use-calendar-drag-create）；R3-11-01 ↔ R4-11-03（Fit 按钮 ↔ 五类记录缺失）；R3-3-01 ↔ [G5-R2-视角3-04]（跨包，graph 修复不覆盖 gantt）；R3-5-01 ↔ [G5-R2-视角5-02]（跨包，map 修复不覆盖 barcode）。
- 误报对照边界使用正确：R1-8-01/8-02（20px < icon-xs 24px 基准 + hover-only，非 #4 认可场景）；R1-5-03（正确援引 #5 例外条款）；R1-9-01/R2-9-01（#6 允许模式本身、不豁免嵌套）。
- 缺口 §2 边界正确：无一条以已登记缺口（G-A~G-M）充当发现；R1-11-01 的完整修复（popover/多视图联动）已按 C2 候选分离，仅"假可供性"本体立案。
- 维度 09-12 / 全量 WCAG：未发现越界条目（视角 9 各条均限 UX 可见语义/导航影响；R3-7-01 主影响为默认配置下所有 sighted 用户的可读性，非 WCAG 合规审计，见 §5）。
- 防复核弃报留档（round-05-g4"防复核"节 9 项 + R4 疑点 9 项）：抽查与本组 39 条无矛盾——弃报项（依赖线绘制无目标高亮、link aria 内部 id、重复创建无去重、swipe-cell 先开后禁用窄窗、月视图资源名截断、过滤空列文案、gantt-editor 数据校验、moveConfirm ISO 日期、Delete 级联删无确认）经 live code 复读维持弃报原判，未发现与已立条目冲突的表述。

## ④ 高风险逐项复核详情

### [G4-R4-视角3-01] barcode-input 扫码/清除/scanNow 通道未接 `meta.disabled` 门禁 — 判定：保留 HIGH

**复核过程**（独立重走证据链，未预读发现结论定案）：

1. **门禁矩阵逐条重查**（`packages/flux-renderers-scheduling/src/barcode-input/barcode-input.tsx` 全文 351 行通读）：
   - 输入框本体：`:290` `disabled={meta.disabled}` —— 唯一正确消费点；
   - `handleClear :66-73`：守卫 `if (resolved.readOnly) return;`，随后 `form.setValue(name, '')` —— 无 disabled 检查；
   - `handleFocus :80-95`（scanOnFocus 自动开扫通道）：同上，仅查 readOnly；
   - `handleScanClick :105-127`：仅查 readOnly，通过后 `setOverlayOpen(true)` 打开相机浮层；
   - `handleScanResult :173-187`：仅查 readOnly，校验通过后 `form.setValue(name, val)` 并派发 onScan；
   - `useInputComponentHandle.scanNow :241-263`：程序式通道同样仅查 readOnly；
   - 渲染条件：`showScanButton :61 = scanButton && (cameraAvailable !== false)`、`showClearButton :275 = clearable && !readOnly && inputValue.length > 0` —— 均无 disabled 分支，禁用字段上两按钮照常渲染且外观与可用态相同。
2. **反方向核验（是否存在其他机制兜底）**：InputGroupButton 未透传输入框 disabled（两按钮是 InputGroupAddon 内的兄弟节点，非 input 子元素，原生 disabled 联动不适用）；`isInteractive: () => !meta.disabled`（:231）仅作用于组件句柄的交互性元数据，不阻断上述 UI/JS 通道。rg 全包证实 `meta.disabled` 在 scheduling 包内仅 :231/:290 两处。结论：**无兜底，绕过成立**。
3. **后果链**：disabled 字段呈灰显锁定外观，扫码可改值、清除可清空，写入经 `form.setValue` 进入表单状态随提交持久化——静默数据变更 + 权限边界在 UI 层被无声击穿，符合 skill HIGH 定义（功能缺陷/数据风险）。
4. **判级一致性**：与 G2 族 [G2-R2-视角3-01]（input-time steppers，HIGH）、[G2-R3-视角3-01]（period 快捷按钮，HIGH）同根因同判级，跨组一致；引根存在且 G2 两轮核查面均未覆盖 scheduling 包，"新实例"申报成立。
5. **修复建议检验**：`const locked = meta.disabled === true || resolved.readOnly;` 统一收敛五条通道 + 两处渲染条件，代码级、可执行，并附回归测试方向——满足质量门槛第④条。

**结论**: 证据、根因、判级、建议四项全部复核通过，维持 HIGH。

### 其余 MEDIUM/LOW 判级抽查说明（升级/降级候选逐一排除）

- [G4-R2-视角4-01]（校验错误被遮蔽）：派发描述误标为 HIGH 的本条，经复核维持 MEDIUM——存在"关闭浮层后可见"的恢复通道，不构成不可逆操作障碍。
- [G4-R3-视角10-02]（键盘创建死路）：候选升级项，因主指针路径可用、误建排班需用户在浮层中再次确认完成，维持 MEDIUM。
- [G4-R4-视角10-01]（WIP 绕过）：候选升级项，WIP 为流程软约束且有事后徽标可见（kanban-board.tsx:598-621 wipWarning 链在位），维持 MEDIUM。
- [G4-视角6-01]（确认/取消顺序）：候选升级项（高频路径），误点后果为重输列名或产生可 Undo 的空列，维持 MEDIUM。
- [G4-R5-视角3-02]（三 board 零 disabled）：候选升级项，与同族 G5 两条（MEDIUM）判级一致性优先，维持 MEDIUM。

## ⑤ scope-conflict 裁定

39 条**均未自带** `[scope-conflict]` 标记。复核对两处边界邻近条目按"主要影响"裁定归属：

1. **[G4-R3-视角7-01]**（白前景 × 可变背景，对比度 1.7~2.9:1）：虽以对比度数值表述，但根因是"固定前景与可变背景的配对缺陷"这一设计层问题，主要影响 = 默认配置下所有 sighted 用户在排班主路径上的可读性，非 WCAG 合规审计对象；**归属 UX（G4）成立**，无需改标。
2. **视角 9 四条**（R1-9-01、R1-9-02、R2-9-01、R3-9-01）：均落在"ARIA 语义/role 的 UX 可见部分"（读屏播报混乱、列表导航能力缺失、Tab 序淹没），未进入全量 WCAG（维度 20）口径；**归属成立**。

## ⑥ 降级/驳回模式复盘

本轮**无降级、无驳回**。为避免"放水"质疑，特别记录复核中主动排查过但未构成降级/驳回的四类风险点：

1. **误报对照挤压**：R1-8-01/8-02（<24px + hover-only）曾重点核对误报 #4（icon-xs/icon-sm 认可尺寸）——两条的 20px 均低于认可的 icon-xs 24px 下限且叠加 hover-only 不可见性，不落入 #4 豁免，维持立案。
2. **同根因合并风险**：9 组同族条目逐一核验"引根存在 + 修复面互不覆盖"，全部满足新实例标准，无应并未并。
3. **严重度漂移**：对 5 条升级候选与 1 条降级候选（R1-4-01 搜索清除，曾核是否应为"建议"而非发现——因其与同屏 tag-filter 清除能力构成同 surface 双标，属跨组件不一致而非纯建议，维持 LOW 立案）逐一按判级标准复核，原判全部成立。
4. **静态口径风险**：三条标注"基于框架语义推理"的条目（R3-10-01 视口跳变、R4-10-01 卡片级绕过、R5-3-01 规则不可达）经源码逐段独立重推：前两条的代码路径断链（`_scrollLeft` 无生产写入方 / 卡片级 canDrop 无条件放行）与第三条的全仓 grep 事实（`nop-mobile` 零生产方）均为静态可判定结论，推理链闭合，无需运行时验证即可维持。

---

**复核结论**: G4 组 39 条（HIGH 1 / MEDIUM 27 / LOW 11）**全部保留，严重度无变化**；无 scope-conflict 改判；防复核弃报留档与已立条目无矛盾。清单可直接进入 R2 汇总阶段。
