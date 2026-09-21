# V12b 研究报告：一致性 P2 候选池按族消化（169 条全面复核与批次裁定）

> Last Updated: 2026-09-21
> Source: `docs/backlog/visual-quality-roadmap.md` V12b 行；`docs/analysis/ui-review/r2-audit/r3-p2-adjudication.md`（169 候选台账）；`docs/analysis/ui-review/R2-consistency-audit.md` §4（族定义）；`docs/audits/visual-quality/exemption-baseline-v1.json`（对照基线）
> 复核方法：三路并行 fresh-session 扫描（56/57/56 条），逐条对照 live repo 分类（STILL_OPEN / FIXED_SINCE / SUPERSEDED），每条附当前 file:line 证据

## 0. 结论速览

- 169 条候选（2026-08-29 裁决台账）：**仍开放 159 / 已被 plans 470–483 消化 9 / 因死代码清理失效 1**。
- 开放项按根因族：族9（i18n/语义色硬编码+枚举直出）×14、族5（失败/错误静默）×12、族8（确认/取消语义与顺序分裂）×8、族10（空态/加载态标准分裂）×11、族6（写后界面不同步）×7、族7（键盘等价路径缺失）×5、族1（disabled/readOnly 门禁穿透）×5、族2（状态已发射样式零消费）×5、族3（长内容溢出/几何断裂）×4、族4（hover-only/触摸不可达）×1、单点/跨族 87。
- 开放项按包面：playground 复刻/演示 schema（G7 系）约 34、ui 基件（G6 系）约 13、data/table 约 14、form/form-advanced 约 16、basic/content 约 12、scheduling 约 12、dashboard 约 8、ai 约 10、industrial 约 4、其余跨域。
- 批次裁定：**V12b 首批 = 族9 + 族5（共 26 条）**——「可见性/诊断」类，模式固定（令牌化、i18n 通道、dev 诊断），门禁可部分守护，性价比最高；后续批次 V12d（族10+族8）/ V12e（族1+族2+族6）/ V12f（族3+族4+族7+单点收尾）滚动，见 §3。
- 目标值：以 `exemption-baseline-v1.json`（225 instances / 68 files / 69 entries）为红线基线；每批次收口时 instances 单调不增且逐批归因；族9/族5 消化后由门禁负断言钉住不回潮。

## 1. 复核方法

1. 从 `r3-p2-adjudication.md` 172 行台账提取 169 条 `候选`（排除 3 条 `随批清扫修`）为结构化清单（ID/族/落点首证据）。
2. 三路并行 fresh-session 扫描 agent（互不共享上下文），每条：先回读 `summary.md` §MEDIUM 对应行还原发现描述，再对 live repo 按描述机制（非仅行号）核实，输出四分类之一 + 当前 file:line 证据。
3. 交叉校验：三份输出合计 169 条、无遗漏无重复；分类计数与族计数经独立汇总核对。

## 2. 已消化与失效项（9 + 1）

| 条目            | 分类        | 消化归属                                                                                                                                                                  |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G3-视角8-01     | FIXED_SINCE | plan 482（dashboard 运行态 useCanvasWidth 实测宽）                                                                                                                        |
| G4-视角7-01     | FIXED_SINCE | plan 481（scheduling 令牌化：被引点位调色板类清零；注：export 工具两处 #ffffff 为图片导出画布底色机制，不在该发现机制内——use-calendar-export.ts:43、kanban-export.ts:38） |
| G5-视角11-01    | FIXED_SINCE | plan 472（ai-bubble 容器视觉层：shape/placement 消费）                                                                                                                    |
| G4-R2-视角3-01  | FIXED_SINCE | plan 481（calendar 拖拽 CSS 断链补齐）                                                                                                                                    |
| G4-R2-视角3-02  | FIXED_SINCE | plan 481（gantt 任务条选中 outline）                                                                                                                                      |
| G5-R2-视角7-01  | FIXED_SINCE | plan 482（graph warning/success 字面 HSL 令牌化）                                                                                                                         |
| G4-R3-视角7-01  | FIXED_SINCE | plan 481（calendar 事件色双轨消解）                                                                                                                                       |
| G4-R4-视角10-01 | FIXED_SINCE | plan 481（kanban WIP 超限 canDrop 拦截）                                                                                                                                  |
| G7-R4-视角11-01 | FIXED_SINCE | sundial 复刻页数据绑定 pass（settings 列表计数绑定）                                                                                                                      |
| G2-视角9-01     | SUPERSEDED  | picker-option-list.tsx 随 plan-2026-09-02-2028 v3 死代码清理删除                                                                                                          |

## 3. 仍开放 159 条的批次裁定

### 3.1 批次机制（对 roadmap「按组件族分批 + 类别清扫」的具体化）

1. **批次单位 = 根因族**（R2 §共性族定义），同族跨包一次清扫——同根因实例的修复模式、测试形态、回归守卫完全同型，按包切批会重复同一模式 N 次。
2. 每批协议：①逐条先核实（本报告 §4 台账为起点，行号漂移以机制定位）；②live defect 先红后绿；③纯视觉/文案类以计算样式或属性断言钉住；④能进门禁的（硬编码色/i18n 键/raw-error）同步补门禁负断言或收紧豁免；⑤批内零静默 deferred——修不了的逐条落 `Deferred But Adjudicated` 带 Why Not Blocking。
3. 滚动规则：一个批次 = 一个 owner plan；本批（V12b）收口后，后续批次按 roadmap V12b 行预授权文本（「其余批次按 Rule 3 字母拆分滚动收口」）落 V12d/V12e/V12f 新行，行文本引用本报告 §3.3。
4. 与 V12c 的关系：V12c（87 条 P3 逐条裁定）在 P2 批次全部收口后执行（roadmap 依赖 V12b→V12c）；其中与 P2 批次同根因同落点的 P3 条目随批顺带消化并在台账登记。

### 3.2 批次划分与首批评定

| 批次             | 覆盖                            | 条数             | 选用理由                                                                                                                              |
| ---------------- | ------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **V12b（本批）** | **族9 + 族5**                   | **14 + 12 = 26** | 模式最固定（令牌化/i18n 通道/dev 诊断 + env.notify）；`check:audit-ui-consistency-gaps` 可部分守护；与 plan 483 A3 的统一通道先例同构 |
| V12d             | 族10 + 族8                      | 11 + 8 = 19      | Spinner/空态标准化与按钮序 [secondary, primary] 语义，均为跨包同型清扫，需要 ui 包级 Spinner/Empty 用例先行                           |
| V12e             | 族1 + 族2 + 族6                 | 5 + 5 + 7 = 17   | 门禁穿透与死状态/写后同步——行为类，需逐条行为断言                                                                                     |
| V12f             | 族3 + 族4 + 族7 + 单点/跨族收尾 | 4 + 1 + 5 + 87\* | 几何/触达/键盘类；\*单点/跨族 87 条按 §4 台账在 V12b–V12e 各批中「同包顺带」消化大半，残余独立收尾批                                  |

### 3.3 目标值

- 红线：`exemption-baseline-v1.json`（225/68/69）instances 单调不增、entries 不增、newHits 持续 0。
- V12b（族9+族5）收口目标：族9 14 条中令牌/i18n 类 ≥12 条落地（2 条为 schema 演示数据类，允许裁决转入 V12f schema 批）；族5 12 条全部「有用户可见反馈」或显式 adjudicated；新增豁免 0。
- 批次间指标：每批收口时报「本批消化 N / 顺带消化 M / 转后续批 K」，159 的残余单调下降至 0。

## 4. 仍开放项台账（159 条）

> 格式：`ID | 族 | 当前证据摘要（file:line 为复核时点）`。台账按族分组，组内按台账序。

### 族9（i18n/语义色硬编码 + 枚举直出）×14

1. G1-视角7-08 | diff-three-column-view.tsx:97 写死 bg-gray-50 覆盖 var(--nop-diff-nav-bg)
2. G1-视角7-09 | content/styles.css:21-31 progress 三变体 oklch 字面量未走语义令牌
3. G2-视角9-02 | combo-renderer.tsx:613-622 校验文案英文模板串
4. G2-视角9-03 | array-editor.tsx:82,102-103,150,166 'Item N'/'Move up/down' 硬编码英文
5. G3-视角7-01 | stat-tile-renderer.tsx:149-150 emerald/red 调色板类（有 dark: 变体但未走令牌）
6. G3-视角9-01 | dashboard editor 面板 Id/Type/Title/Source/Props 等未走 i18n（editor-inspector/editor-palette/editor-canvas/dashboard-editor-renderer）
7. G4-视角1-01 | gantt-header −/+ 字符、calendar-header ‹/›、gantt-links ×、gantt-grid '>' 多点位未图标化
8. G4-视角3-01 | gantt-grid.tsx:157 展开指示符恒 '>' 不随 isOpen（aria 联动字符不变）
9. G5-视角1-01 | ai-conversations.tsx:152,163 '✎'/'×' 文本字符
10. G5-视角1-04 | industrial toolbox-panel ⌅L/⌅R/↔/↕/⤒ 生僻字形
11. G6-视角9-01 | sidebar-layout.tsx:151,154 aria-label 硬编码 "Toggle Sidebar"（:138 同文件已用 t()）
12. G7-R3-视角4-02 | advanced-query.json deptId 裸列名 / tree-crud.json "部门ID" / mock-backend d1 数据未映射
13. G2-R3-视角4-01 | editor-toolbar-config.ts:94-103 link.run window.prompt + unsafe scheme 静默（cross 族5）
14. G7-R2-视角10-01 | sundial 移到垃圾箱 destructive vs 垃圾桶 ghost 术语分裂（cross 族8）

### 族5（失败/错误静默）×12

1. G1-视角5-05 | dynamic-renderer.tsx:226-238 错误态无样式纯文本；markdown.tsx:94 同
2. G2-视角5-02 | upload-field.tsx:333-340 rejectFile 仅派发事件零渲染反馈；maxFiles 截断静默
3. G3-视角5-03 | list-renderer.tsx:545 加载失败无 retry（CRUD 侧有先例）
4. G3-视角4-03 | editor-inspector.tsx:192-198 非法 JSON 空 catch 零反馈
5. G4-R2-视角4-01 | barcode-input.tsx:181-184 校验错误被 fixed z-50 overlay 遮蔽
6. G4-R2-视角5-01 | pull-refresh.tsx:168-173 .catch 静默复位 normal
7. G4-R2-视角5-02 | use-calendar-export.ts:60-78 exportError 零 UI 消费；:231-235 注释失实
8. G5-R2-视角3-01 | ai-message-list.tsx:69 无 aborted 视觉态
9. G5-R2-视角5-01 | ai-attachments.tsx:104-135 超限文件静默 continue 丢弃（i18n 键已在）
10. G2-R2-视角5-01 | upload-field.tsx:369-371 单选重选不 abort 在途；:285-286 陈旧完成仍提交
11. G2-R4-视角5-01 | editor-renderer.tsx:182-184 外部同步聚焦期丢弃无 pending 队列
12. G5-R4-视角10-01 | ai-bubble/renderers/error.tsx:33 retry 追加重复用户消息

### 族10（空态/加载态标准分裂）×11

1. G1-视角5-04 | image.tsx:190 + markdown.tsx:78 loading 纯文本无 Spinner
2. G1-视角10-11 | wizard-renderer.tsx:596 committing 无 Spinner
3. G2-视角5-01 | upload-field.tsx:572 pending 行纯文本
4. G2-视角5-03 | form-load-action.ts 全文无 loading/busy 暴露
5. G3-视角5-02 | crud-infinite-scroll-area.tsx:32-40 加载态纯文本；list-renderer.tsx:545 同
6. G3-视角5-04 | chart-renderer.tsx:572 chart-empty 裸 div 无样式
7. G3-视角5-05 | dashboard-renderer.tsx:82-95 空布局无默认空态
8. G4-视角5-01 | gantt.tsx:517-525 无 empty region 渲染全空 div（kanban 有样式化空态对照）
9. G5-视角5-01 | scada-canvas.tsx:333 loading 兜底空 div
10. G1-R4-视角5-01 | json-view/markdown/html 空+无 slot 空容器无 muted 兜底
11. G3-视角5-07（chunk2 §未列，属 P3 邻接，占位不计）—— 实际第 11 条为 G4-视角5-02 countdown 缺配置静默空元素（P3 邻接，归族10 计数）

### 族8（确认/取消语义与顺序分裂）×8

1. G2-视角6-02 | picker-dropdown.tsx:59 取消钮 ghost sm
2. G3-视角2-02 | use-row-quick-edit-draft.tsx:277-292 Save 前 Cancel 后（违 [secondary, primary]）
3. G4-视角6-01 | kanban-column-adder.tsx:51-68 确认前取消后
4. G5-视角2-01 | user-edit.tsx:103 取消复用 t('flux.ai.stop')
5. G5-R2-视角6-01 | ai-tool-call.tsx:222-248 approve 左/reject 右（反转）
6. G2-R2-视角6-01 | tree-controls.tsx:398-416 popover 选中不关；sheet 无确认钮
7. G2-视角6-01 | select-mobile-renderer.tsx:192 showCloseButton=false 无确认/完成钮
8. G7-视角10-09 | sundial 确定/确认三形态分裂（cross 族9 术语）

### 族6（写后界面不同步）×7

1. G7-视角11-03 | sundial-workbench 添加仅 closeSurface 无持久化
2. G7-视角11-04 | activeSection 仅导航高亮，主内容走 activeView
3. G7-视角11-05 | task-detail 对话框静态标题与所选任务不符
4. G7-视角11-13 | sundial-detail 清除写 demo-date 而徽标显示 pickedDateLabel；toast 恒发
5. G7-R2-视角11-02 | form-wizard step2 deptId 被 confirm/onComplete 静默丢弃
6. G7-R4-视角11-02 | sundial 删除后仅 toast，列表/视图不更新
7. G7-R5-视角11-02 | 删除/垃圾桶写库后 kanban/completed/trash 静态计数不更新

### 族1（disabled/readOnly 门禁穿透）×5

1. G5-视角3-01 | ai-sender.tsx:194 流式期间 textarea 整体 disabled（半量门控）
2. G5-R4-视角3-01 | ai-chat.tsx:609 仅 AiSenderView 门控；user-edit 无门控
3. G2-R3-视角3-02 | editor-renderer.tsx:176-178 readOnly 同步键漏 interactive
4. G1-R3-视角3-01 | wizard prev disabled 不含 committing；step-nav 同
5. G7-R5-视角11-06 | sundial-settings selfhost 行可点击但标「即将推出」无 disabled

### 族2（状态已发射、样式零消费）×5

1. G1-R2-视角3-02 | button.tsx:238-239 发 data-active/aria-pressed，ui button cva 无消费
2. G5-R3-视角3-02 | ai-feedback.tsx:165-175 发 data-state=selected，零 CSS 消费
3. G5-R2-视角3-02 | toolbox-panel 状态 span 类无 CSS 规则、无 role=status
4. G5-R2-视角3-03 | scada-editor-canvas 发 data-mode=preview，无消费者、mutator 无 mode 门控
5. G6-R6-视角3-01 | table-row-class-name data-[state=selected] 令牌无生产者（普通选择路径不发）

### 族3（长内容/溢出/几何断裂）×4

1. G1-R2-视角8-01 | steps-renderer li 缺 relative，连接线逃逸包含块
2. G1-R4-视角8-01 | timeline-renderer 横向连接线 h-px 无宽度源
3. G3-R4-视角8-02 | 表头组/叶共享 top:0 层叠塌陷
4. G1-R6-视角8-01 | tabs 滚动契约仅 mobile 分支；ui TabsList 无 overflow

### 族4（hover-only/触摸不可达）×1

1. G4-R3-视角10-02 | calendar month-view Enter/Space 劫持 500ms 长按定时器（armed-session bug）

### 族7（键盘等价路径缺失）×5

1. G3-R2-视角3-01 | 行点击勾选缺 toggleOnRowClick 键盘路径
2. G2-R7-视角9-01 | icon-picker 网格无 roving tabindex/方向键
3. G4-R3-视角9-01 | calendar week/day 格 tabIndex=0 无 onKeyDown
4. G2-R7-视角4-01 | condition-group Add-Group 无 maxItemsPerGroup 门（cross 族1）
5. G7-R2-视角4-01 | input-tree 无 clearable/取消选择路径

### 单点/跨族（87 条，摘要）

- **ui 基件**：input-group tabIndex0 无 focus-visible；card 可点击无 ring；drawer 把手纯指针；input h-9 vs select/button h-8 高度分裂；alert-dialog Action 不关闭非 Close 原语；dialog overlay 双令牌 70%/40% 并存；menubar 勾选指示位置分裂 + Trigger 无 focus-visible；combobox 三 icon-only 无 aria-label；command-input focus-visible 选择器永不匹配；pagination 无 disabled 样式消费；sidebar-layout label（上收族9）
- **form/form-advanced**：input-time ✕ 字符；input-number padding 叠写/区间重叠；checkbox-group max/min 静默 return；transfer data-indeterminate 裸布尔恒真（行为缺陷）；array-editor Add 无 PlusIcon、maxItems 静默；picker-option-list 已删余留面；form-load-action（上收族10）
- **data/table**：table-header-row 关键词搜索嵌 DropdownMenuContent；tree multiple 零多选逻辑；三套分页 UI 并存；selectAllChecked 树模式计数错位；quick-edit 行 onSaveError 未接线；table-column-settings 移动菜单逐次关闭；selection 上限静默灰行；virtual 拖拽 rowIndex 用虚拟序号；combine-cells 非虚拟展开行 rowSpan 错位
- **scheduling**：gantt zoom 锚 \_scrollLeft 无生产者；zoomToFit 中位假实现；calendar 拖拽创建仅 month；confirm-dialog 资源裸 ID；activity-log 列名恒等映射 + 五类动作零生产；notice-bar role=button 嵌真 Button；calendar 键盘拖拽原点 0,0
- **dashboard**：addPanel 固定 0,0 无防重叠；setMode 不清选择 + preview 残留 header/Delete；NumberInput 无 clamp；面板 aria-label 暴露内部 id；sparkline aria-hidden 全体
- **ai**：ai-sender 流式禁用（上收族1）；attachments 非图片静默、发后不清列表；use-conversation 切换引擎无 loading；markdown copy 钮遮首行；tiptap-sender 锁定态可插模板；toolbox 面板（industrial 邻接）
- **map/industrial**：map-viewport 无 role；map-error 中性灰非 destructive；map layer pin/cluster hover 死；inspector Label 无 htmlFor；scada loading/空态（上收族10）
- **playground schema（G7 系）约 22 条**：tray 图标回退 Circle；搜索输入零消费；静态计数/静态状态卡；确定/确认分裂；城市未随省清空；settings supabase 键不入 includeScope；眼睛图标纯展示；task-delete 无确认；advanced-query date-range 不可清空；complex-form 一次性 formSaved 旗标；master-detail 新增恒可用 orderId 空；workbench activeSection/详情静态（上收族6）等
- **steps/alert/mobile**：steps 指示钮外无点击面；alert 自绘 close 破坏 pr-18 预留；mobile styles 全系 .nop-mobile 类零生产者

## 5. 勘误与对照说明

- 台账 169 条 = 172 行 − 3 条随批清扫修；本报告 §2 的 9 条 FIXED_SINCE 即「已被 plans 470–483 顺带消化」的实绩，复核时均带行级证据。
- **族归属重聚类勘误（独立核实 Minor-1）**：本报告按修复模式对约 10 条做了跨族重聚类，与 r3 台账族列不一致处逐条对账——G4-R2-视角4-01（台账族4→本报告族5）、G4-R3-视角10-02（族7→族4）、G2-R7-视角4-01（族1→族7）、G7-R2-视角10-01（族8→族9）、G5-视角1-01/-04 与 G2-R3-视角4-01 与 G1-R3-视角3-01（台账"—"→族9/族1）、G7-R5-视角11-06（族6→族1）。连带计数差：台账族9 开放应为 15（17−2 已修）而本报告记 14（1 条归入单点面）、族1 应为 6 而本报告记 5（同因）；批次总量 159 与批内清单不受影响——V12b 起各批以 §4 台账逐条枚举为准，不依赖族计数。
- **单点/跨族 87 条的权威枚举**仍是 `docs/analysis/ui-review/r2-audit/r3-p2-adjudication.md` 全表；本报告 §4「单点/跨族」节为摘要非全清单，V12f 批起草时须回读台账逐条核对。
- 基线对照：roadmap V12b 原文「对照 V0 快照（413）下降」；V12a 后红线已收紧为 v1 快照（225/68 files/69 entries）单调不增——本报告取更严者，与 roadmap 兼容。
- 族10 计数以开放 11 条为准（chunk 汇总 9+2）；G3-视角5-07 属 P3 邻接面不计入 P2 台账。
- 单点/跨族 87 条中约 35 条已能映射到 ui 基件/schema 演示数据/复刻页三个「顺带面」，随 V12b–V12e 各批同包顺带消化，不单独立批；残余按 §3.2 V12f 收尾。
- 行号为复核时点（2026-09-21 收口会话），执行时以机制定位为准。
