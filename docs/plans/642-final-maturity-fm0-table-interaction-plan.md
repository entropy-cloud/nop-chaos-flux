# 642 最终成熟度审计 FM-0：表格交互缺陷首批修复（列宽拖拽对标 AMIS + 固定列状态透传 + 全选核验 + 同族清扫）

> Plan Status: completed
> Last Reviewed: 2026-10-18
> Source: `docs/backlog/final-maturity-audit-roadmap.md` FM-0（P0，用户点名的两项 live 缺陷 + 表内同族清扫 + 台账建立）；`missions/final-maturity-audit.json` T0.1
> Related: `docs/plans/641-cross-roadmap-ur14-15-16-wave-d-bounded-plan.md`（completed，container 免包装先例——本计划沿用其判别测试先红后绿 + closure audit 独立收口纪律）

## Purpose

把 FM-0 收口到"成熟产品交互可用"状态：①CRUD 表格列宽拖拽对标 AMIS 机制重构（命中区/确定性布局/反馈/节流）；②固定列行级状态样式透传（选中/hover/斑马纹）；③表头全选 checkbox 固定列场景视觉核验与修复；④表内同族清扫（同包全部 sticky 消费者与 pointer 拖拽交互）；⑤判别性测试先红后绿；⑥建立 `docs/audits/final-maturity-audit/` 台账结构（FM-1/FM-2/FM-5 后续发现统一落此）。AMIS 源码（`~/sources/amis`）仅作机制对标参照，实现为本仓自有代码。

## Current Baseline（2026-10-18 live 核对）

- **命中区**：resize handle 为 `absolute right-0 top-0 h-full w-1`（4px 宽、贴列缘内侧、无负偏移、无 z-index；`use-column-resize.ts` `createColumnResizeHandleProps`）。AMIS：7px 宽、`right:-4px`（3px 列内 + 4px 越出列缘）、`z-index:15`、`opacity:.5`、hover/`is-resizing` 高亮（`~/sources/amis/packages/amis-ui/scss/components/_table.scss` `&-content-colDragLine`）。
- **确定性布局**：`.nop-table` 仅 `w-full`（`packages/ui/src/components/ui/table.tsx`），auto 布局下列宽是建议值。已实测先例（`tests/e2e/table-column-width-layout.spec.ts` 头注）：**Chromium auto 表格布局忽略单元格 `max-width`**——拖拽收缩时内容最小宽度反噬，宽度不跟随 = 用户感知"拖不动"。`min-width` 同理可被 nowrap 内容最小宽度超越。AMIS 对策 = `is-layout-fixed`（`table-layout:fixed`）+ ColGroup 以 `width || realWidth` 钉住全部列。本仓已有全部列实测基建：`column-width-measure.ts` `measureColumnWidthsFromTable`（按 `[data-column-width-key]` 逐列 getBoundingClientRect，`useTableColumnWidths` 已喂给 sticky 偏移/colgroup）。
- **拖拽锚定与节流**：`startResize` 已按 `measuredColumnWidth`（th getBoundingClientRect）锚定实测宽（保留强化，勿重复造）；`onPointerMove` 每像素 `setDraggingWidths` 触发整表重渲染，无 rAF 节流。
- **收缩钳制**：`resolveColumnMinWidth`（默认 40px，schema minWidth 可调）+ maxWidth 钳制已存在（保留）。
- **固定列状态样式**：行级状态打在 tr 上（`table-row-class-name.ts`：`hover:bg-[var(--table-hover-bg)]`、`data-[state=selected]:bg-[var(--table-selected-bg)]`；interactive variant 用 `--table-hover-bg-gradient`/`--table-selected-bg-strong`），斑马纹 `tbody tr[data-striped]:not(:hover)`；而 sticky 单元格静态不透明 `.nop-table [data-fixed]{background:var(--table-fixed-bg,...)}`（`packages/ui/src/styles/table.css`）盖掉行级状态。`fixed-columns.ts` `createStickyStyle` 注释声称"背景透明继承……AMIS `.is-sticky { background: inherit }` 等价语义"——live CSS 未实现该语义，属注释漂移（须就地勘误）。`data-fixed` 在 th/td 两侧均有落点（table-header-row.tsx:171、table-body-row-rendering.tsx ×6、table-summary-row.tsx:119）。
- **全选公式**：`table-renderer.tsx:327` `headerSelectAllChecked`（page/all 双模式已修过 G3 缺陷）；表头全选 Checkbox 渲染于 sticky selection th（table-header-row.tsx:422-466）。**checked 视觉在固定列场景的实况未做现场复核**——FM-0 交付③用 browser-use 现场定位后再修。
- **token 面已核**：`--table-hover-bg`/`--table-selected-bg`/`--table-selected-bg-strong` 均为 `color-mix(..., transparent)` **半透明**色（theme-tokens styles.css:97-104）；`--table-hover-bg-gradient` 是 `linear-gradient(...)`（styles.css:98，尾端 transparent）；`--table-fixed-bg` 为**宿主自定义 token**（theme-tokens 未注册），回退链 `--table-header-bg → --table-striped-bg`（table.css:15-16），playground 下解析为表头底色。半透明性决定：行级状态透传到 sticky 单元格**不能直接赋 background-color**（会重新引入渗底缺陷），必须走"不透明底 + 状态色叠加层"复合策略（见 Phase 3）。
- **在册契约冲突（draft review R1 发现，M1）**：`tests/e2e/component-lab/c1a-visual-amis-parity.spec.ts:64-105`「fixed-column hover pass-through」钉死 ux-r12e 契约——hover 只落行底色、固定列底色保持不变（`fixedBg === fixedBgBefore` 断言）。本计划 Phase 3 语义**反转该契约**（hover/选中态必须落固定列），该 e2e 判别断言须同批改写并在台账记录契约反转决策。
- **e2e 宿主**：`#/table-column-width` fixture 页（`apps/playground/src/pages/table-column-width-demo.tsx`，多表格 testid 宿主）+ `tests/e2e/table-column-width-layout.spec.ts` 既有像素级断言基建；`#/lab/table` 有 column-drag-table 等 fixture。固定列演示页实况：`approval-tasks.json:101` 与 `standard-crud.json:223` 均为 `fixed: "right"`，**现无 fixed-left + rowSelection + 可调宽三合一宿主**——Phase 1 fixture 增补（fixed-left 面在 browser-use 实操中最常见， AMIS 场景对齐）。
- **同族清单（表内 pointer 拖拽 + sticky 消费者，flux-renderers-data 包内）**：列宽 resize handle、行拖拽排序（`use-row-drag-sort.ts`，拖起反馈/命中区待核）、affix header sticky 行（z-index 3）、sticky-edge 阴影列（`nop-table-sticky-edge-*`）。设计器/gantt/kanban 拖拽属 FM-1b，不在本计划。
- **验证基线**：master @ 4d575cccd；flux-renderers-data 1235/1235、flux-renderers-basic 673/673、flux-react 620/620（本会话实测）；playground vite.config typecheck 既有红等登记红照旧。

## Goals

- 列宽拖拽在真实浏览器中"拖哪指哪"：7px 越出命中区（含 z-index 压过 sticky 邻列）、hover/拖拽中高亮、拖拽全程宽度实时跟随指针（含向内容宽以下收缩）、pointermove 渲染 rAF 节流、minWidth/maxWidth 钳制保留。
- 确定性布局裁决落地：拖拽会话与**用户已提交**列宽存在期间，表格切换 `table-layout: fixed` 并以 colgroup 钉住全部列（提交宽 ∪ 实测宽回退）；**从未提交过拖拽/键盘调宽的表格（含声明了 schema width 的表格）保持 auto 布局零回归**。
- 固定列行级状态透传：hover/选中/斑马纹背景在 sticky 单元格生效，采用"不透明 fixed 底 + 状态色叠加层（background-image）"复合策略保证不渗底；default 与 interactive 双 variant 语义对齐；ux-r12e「固定列不随行态变色」契约按 FM-0 语义反转（c1a e2e 同批改写 + 台账记录）；`fixed-columns.ts` 注释勘误。
- 表头全选 checkbox 固定列场景：browser-use 现场取证 → 定位 → 修复（若证实无缺陷则台账记 verified + 证据）。
- 表内同族清扫：行拖拽排序与 sticky 消费者的命中区/反馈/状态逐个核对，发现三态归族落台账。
- 判别性测试先红后绿（旧实现必挂的具体测试点名）；FM-1/FM-5 依赖的 `docs/audits/final-maturity-audit/` 台账结构建立。

## Non-Goals

- 设计器（flow/report/page/print/taskflow）、gantt/kanban/calendar 的拖拽交互（FM-1b 走查口径）。
- 表格虚拟滚动/autoFill 高度机制的重构（仅保证本计划改动不破坏其既有行为，相关既有 e2e 全量回归）。
- AMIS 代码移植（许可证与风格独立，仅对标机制）；列宽拖拽的 sheet 复制/导出等未涉及能力。
- 分页/筛选/排序行为变更（FM-1a 走查范围）。

## Scope

### In Scope

- `packages/flux-renderers-data/src/table-renderer/use-column-resize.ts`（handle props、rAF 节流、拖拽会话 pinning 状态、resizingKey）
- `packages/flux-renderers-data/src/table-renderer.tsx` + `use-table-column-layout.ts`（data-layout-fixed/data-col-resizing 标记、colgroup 全列钉宽）
- `packages/ui/src/styles/table.css`（fixed 布局溢出规则 + 行级状态透传规则）
- `packages/flux-renderers-data/src/table-renderer/fixed-columns.ts`（注释勘误）+ 行渲染处 `data-row-variant` 标记（如 variant 分支需要）
- playground fixture（`table-column-width-demo.tsx` 增补固定列+选择+可调宽宿主表格，或 `#/lab/table` 增补）
- `tests/e2e/table-column-width-layout.spec.ts` 增补或新建 `tests/e2e/table-interaction-maturity.spec.ts`
- 单测：flux-renderers-data（hook/renderer 级）+ `packages/ui` 侧样式契约测试（如既有 table.css 契约测试挂点）
- `docs/audits/final-maturity-audit/`（新建台账：README + ledger.md，沿用 interaction-state 台账模式）
- owner docs：`docs/components/table/design.md`、`docs/architecture/renderer-markers-and-selectors.md`（新标记登记）、`docs/architecture/styling-system.md`（如涉及）

### Out Of Scope

- `packages/ui/src/components/ui/table.tsx` 组件 API 变更（`packages/ui/src/index.ts` 导出面不动）；gantt/kanban/设计器；分页排序筛选行为。

## Failure Paths

| 编号              | 触发                                                    | 行为                                                                                                                                                  | 可重试 | 用户可见表现                             |
| ----------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------- |
| jsdom-no-layout   | 单测/jsdom 环境无布局能力（getBoundingClientRect 全 0） | 拖拽会话 pinning 回退声明宽/已提交宽（`measureColumnWidthsFromTable` missingKeys 路径已有先例），`data-layout-fixed` 仍按「用户已提交列宽」存在性切换 | 是     | 无（仅自动化环境）                       |
| fixed-overflow    | fixed 布局下内容超出钉住列宽                            | 单元格 `overflow:hidden` 裁切（nowrap 保留）；不引入 ellipsis 以免全局视觉变更——发现不可接受时归族台账另裁                                            | 是     | 超长内容被裁切（对比 auto 布局换列挤压） |
| virtual-interplay | 虚拟滚动/autoFill 表格开启列宽拖拽                      | 执行期以既有 table-virtual-body e2e + 手动探针验证；若冲突则 fixed 切换对 virtual 场景收窄（台账记录裁决）                                            | 是     | 无或按裁决                               |
| select-all-ok     | browser-use 现场核验证实全选 checkbox 视觉无缺陷        | 不修代码，台账记 verified + 程序化证据（aria-state + computed style 读数）                                                                            | —      | 无                                       |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**（用户点名的 P0 交互缺陷 + 渲染器行为契约变更）——Proof 先行：e2e 判别红（真实浏览器几何/computed style，旧实现必挂）+ 单元判别红（handle 几何/CSS 契约/pinning 状态）在 Fix 之前落地并记录红态输出；Fix 后全绿；既有 data 包 1235 套件 + 相关 e2e（table-\*、crud-demo、complex-pages-ux-r12）全量回归。

## Execution Plan

### Phase 1 - Proof：判别测试先红（e2e + 单元）

Status: completed
Targets: `tests/e2e/table-interaction-maturity.spec.ts`（新建）或并入 table-column-width-layout.spec.ts、`packages/flux-renderers-data/src/__tests__/`、fixture 页增补

- Item Types: `Proof`

- [x] Proof-e2e-1（列宽拖拽·内容压力收缩判别）：`#/table-column-width` 宿主增补固定列+rowSelection+columnResize+长文本列的 fixture 表格（testid `width-fixed-resize`）；e2e 用 `page.mouse` down/move/up 序列（handle 已设 touchAction:none）拖拽该长文本列 handle 向左收缩至 min 以下预期值，拖拽中读数用 `expect.poll` 轮询（rAF 合帧下避免单次读数与帧对齐竞态），断言拖拽中与松手后该列 getBoundingClientRect().width 跟随（差值 ≤ 2px 容差）——旧实现（auto 布局内容反噬 + 4px 命中区难命中）必挂。同一用例断言 handle boundingBox 宽 ≥7px 且计算 z-index ≥ 10（旧 4px/无 z-index 必挂）。
- [x] Proof-e2e-2（固定列状态透传判别·含不渗底判别力）：同 fixture 表格 rowSelection checkbox 全选后，断言 sticky 固定数据列 td 的状态视觉发生变化的**且保持不透明**——断言形式：选中 vs 未选中该 td 的状态层读数有差（background-image 出现选中色叠加层）且 background-color 保持 `--table-fixed-bg` 回退解析的不透明值（alpha=1）——直接把半透明状态 token 赋 background-color 的渗底实现必挂（其 background-color alpha < 1）。hover 态、斑马纹态同型断言（`:hover` 用 page.hover 触发后读数）。
- [x] Proof-e2e-3（表头全选 checkbox 视觉取证）：同页断言表头全选 checkbox 点击后 `aria-checked=true` 且其可见勾选视觉存在（checkbox 元素 computed background/data-state 读数）；同时以 browser-use 现场走查同页面（截图存 `_tmp/fm0-probe/`，仅诊断用）记录实况——若证实缺陷，登记 finding 并入 Phase 3 修；若证实无缺陷，Failure Path select-all-ok 记台账。
- [x] Proof-unit-1（handle 几何契约）：`use-column-resize` 单测断言 handle className 含 `w-[7px]`/`-right-1`（或等价 7px+越出）/`z-[15]` 形态、`data-resizing` 接线存在——旧 `w-1`/`right-0`/无 z 必挂。
- [x] Proof-unit-2（fixed 布局契约）：table-renderer 级单测（jsdom）断言：拖拽会话中 table 根带 `data-col-resizing` 且 colgroup 出现全列钉宽；**用户已提交列宽**存在时根带 `data-layout-fixed`；声明宽但从未提交调宽的表格**不**带 `data-layout-fixed`（保持 auto，负断言为回归守卫，判别红由前两条承担）——旧实现必挂。jsdom 无布局按 Failure Path jsdom-no-layout 走声明宽回退分支断言。
- [x] Proof-unit-3（状态透传 CSS 契约）：table.css 契约测试（仿 default-spacing-contract.test.ts 字符串断言模式，落点 packages/ui 或 data 包既有样式契约测试处）断言状态叠加层三规则存在且**优先级序固化**：selected > hover > striped（selected 规则源序/特异性最终胜出，与液态列 Tailwind 工具类语义序对齐）——旧 css 必挂。
- [x] 运行记录红态输出（e2e + 单元逐条），写入 daily log。

Exit Criteria:

- [x] 全部判别测试在旧实现下红（红态实测：单元 5/5 红[data] + 4/5 红[ui，基线规则项按预期绿]；e2e 4 项红因正确：handle 4px/拖拽 792.125 内容反噬/无会话 attr/固定列无 overlay；全选取证项为绿态证据非红项——Base UI checkbox 契约 data-checked），fixture 页/测试文件落位（table-column-width-demo.tsx Table 3）。

### Phase 2 - Fix ①：列宽拖拽对标 AMIS 机制重构

Status: completed
Targets: `use-column-resize.ts`、`table-renderer.tsx`、`use-table-column-layout.ts`、`table.css`、`table-column-width-demo.tsx`

- Item Types: `Fix | Proof`

- [x] Fix：handle 几何重构——`w-[7px] -right-1 top-0 h-full z-[15] cursor-col-resize`（3px 列内 + 4px 越出，对标 AMIS colDragLine），保留 keyboard/aria/touchAction 契约。
- [x] Fix：拖拽反馈——`useColumnResize` 暴露 `resizingKey: string | null`；handle 挂 `data-resizing`，CSS 高亮（hover 弱高亮 + data-resizing 强高亮，对标 is-resizing）。
- [x] Fix：确定性布局（本计划核心裁决，对标 AMIS is-layout-fixed + width||realWidth）——(a) 拖拽会话：pointerdown 时经 `measureColumnWidthsFromTable` 快照全列实测宽（jsdom 回退声明宽/跟踪宽），会话期间 table 根挂 `data-col-resizing`（CSS `table-layout:fixed`）且 colgroup 钉住全列（拖拽列=实时宽，其余=快照宽）；(b) 持久期：**用户已提交**列宽存在时（本会话经拖拽/键盘调宽提交过——localWidths 写入/scope 写入/onWidthsChange 调用，`hasCommittedResize` 布尔标记，**显式排除 initialWidths 的声明宽预填**）table 根挂 `data-layout-fixed`（CSS `table-layout:fixed` + 单元格 `overflow:hidden`），colgroup 对未提交列以实测宽（`useTableColumnWidths` 既有 digest 重测）钉住；(c) 从未提交过调宽的表格（含声明宽表格）保持 auto 布局（零回归面，与 Proof-unit-2 负断言一致）。
- [x] Fix：`setDraggingWidths` pointermove 更新以 rAF 合帧（每帧至多一次 setState；拖拽会话 pinning 数据走同一 state 更新避免双渲染）。
- [x] Proof：Phase 1 的 Proof-e2e-1/Proof-unit-1/Proof-unit-2 转绿；flux-renderers-data 全量 1240/1240 绿（原 1235 + 新增 5 契约测试；既有 6 处 mid-drag 断言按 rAF 契约补帧刷新）；回归绿：table-column-width-layout 2/2（closure R2 勘误：原记 8/8 系与 complex-pages-ux-r12 的 8 passed 串写；冷启动 flaky 重试后绿）、table-virtual-body 2/2、crud-demo、table-density、complex-pages-ux-r12（8 passed，1 flaky 既有冷启动重试模式）；c1a-visual-amis-parity 披露：整 spec 被页面级 console.error 门禁拒绿（RM metamodel prop-contract 诊断，dialog 用例同挂，干净 HEAD 归因无关本 diff——FM-005 台账）

Exit Criteria:

- [x] 判别红全转绿；宽度跟随/命中区/反馈在真实浏览器可程序化验证；既有套件无回归（data 1240/1240 + 回归 e2e 清单绿）。

### Phase 3 - Fix ②③：固定列状态透传 + 全选核验收口

Status: completed
Targets: `packages/ui/src/styles/table.css`、`fixed-columns.ts`、`table-body-row-rendering.tsx`（如需 data-row-variant）、browser-use 探针

- Item Types: `Fix | Proof`

- [x] Fix：table.css 行级状态透传——**复合策略**（状态 token 半透明，直接赋 background-color 会重新引入渗底缺陷）：sticky 单元格 background-color 保持不透明基线（`var(--table-fixed-bg, ...)` 回退链），状态色以 `background-image: linear-gradient(var(--table-selected-bg), var(--table-selected-bg))` 叠加层落位；hover/selected/striped 三态同构；interactive variant 的渐变 token 直接作 background-image 叠加（渐变尾端 transparent 透出不透明基线 = 语义正确，规避 `background:` shorthand 重置 background-color 的陷阱）。**优先级裁决**：selected > hover > striped（规则源序 + 特异性固化，与液态列 Tailwind 工具类语义序对齐）。
- [x] Fix：`fixed-columns.ts` `createStickyStyle` 注释就地勘误——如实描述"默认不透明（--table-fixed-bg 回退链）+ 行级状态由 table.css 状态叠加层规则覆盖"的实现语义，删除未实现的 `background:inherit` 声称。
- [x] Fix：ux-r12e 契约反转落地——c1a spec「fixed-column hover pass-through」改写为「fixed-cell state overlay」（fixed 列 background-color 不变 + hover 出现叠加层断言），台账 FM-002/FM-005 记录契约反转；owner doc 记录取代关系（`docs/components/table/design.md` 固定列背景契约节，就地勘误 background:inherit 漂移）。实施注记：复合策略下原测试字面断言（background-color 恒定）本就成立，改写补钉了叠加层新语义
- [x] Fix/Proof：现场取证结论 = 无缺陷（Failure Path select-all-ok 落台账 FM-003）：真实浏览器 e2e 全选取证绿 + 实机探针 el.click → aria-checked=true；用户报告的"全选后固定列无选中样式"实况 = FM-002（行级状态透传缺失），已修复
- [x] Proof：Phase 1 Proof-e2e-2 转绿；c1a 改写测试体绿（spec 级门禁阻塞属 FM-005 外来红，见披露）；`docs/components/table/design.md` 固定列背景契约节与 live 一致（已同步）。实施注记：`data-row-variant` 标记最终未采用——interactive variant 全仓零生产消费者，default variant 规则即完备（裁决落 Deferred）。
- [x] Fix（closure audit R1 Major-1，agent_c14f9a39）：striped 叠加层特异性反超——`:not(:hover)` 计入特异性使 striped (0,4,2) > selected (0,3,2)，斑马纹行选中后固定列仍显条纹色（恰为用户原始场景半残留），且 Proof-e2e-2 选中的 row0 恒 striped（`isEven` 打标）致判别结构性失明（条件分支永不可达）。修法：striped 规则补 `:not([data-state='selected'])` 显式排除 + css 契约断言钉守 + e2e 改为「选中一行斑马纹 + 一行普通行，断言两者固定列叠加层一致且异于基线」（旧实现必挂）。红→绿实测通过

Exit Criteria:

- [x] 选中/斑马纹叠加层在固定列 computed style 可验证生效——含 striped+selected 组合（R1 Major-1 修复后 e2e 判别绿）；hover 叠加层由 c1a 改写测试钉守；注释勘误落位；全选核验结论 = 无缺陷（FM-003 verified）。

### Phase 4 - ④：表内同族清扫

Status: completed
Targets: flux-renderers-data 包内 sticky 消费者与 pointer 拖拽交互（`use-row-drag-sort.ts`、affix header、sticky-edge）

- Item Types: `Proof | Fix | Follow-up`

- [x] Proof：程序化盘点完成——①行拖拽排序：handle 命中区 w-10（40px 宽裕）+ role=button/tabIndex/ArrowUp/Down 键盘链在案；但 `data-dragging`/`data-drag-over` 标记无任何 CSS 消费（零拖拽反馈）→ 立案 FM-004（P1）当批修复；②affix header z3 > fixed z2/1 > handle z15 层级自洽；③sticky-edge `::after` 阴影由 c1a spec 钉守（spec 级门禁阻塞见 FM-005 披露）。台账登记 FM-004/005/006/007
- [x] Fix（P1 FM-004）：`table.css` 补 `tr[data-dragging]{opacity:.5}` + `tr[data-drag-over]{inset box-shadow 落点指示}`；判别断言先红后绿（css 契约测试 "row drag-sort feedback"）。

Exit Criteria:

- [x] 同族清单逐项有结论（FM-004 已修 / FM-005 披露归 RM 工作流 / FM-006、FM-007 watch-only），台账落位。

### Phase 5 - ⑥ 台账 + 回写收口

Status: planned
Targets: `docs/audits/final-maturity-audit/`、roadmap、mission、owner docs、daily log

- Item Types: `Proof | Follow-up`

- [x] Proof：`docs/audits/final-maturity-audit/README.md` + `ledger.md` 已建立（interaction-state 台账模式：ID + 三态 + 状态机 + 对账口径）；本批 7 条登记完毕（FM-001–FM-007），批次覆盖记录 uncovered=0
- [x] 回写：roadmap FM-0 行 Status `done` + Plan 列 642 + `Last Updated`；mission M0/T0.1 `done`；daily log 收口记录（含全量门禁数字）——随本收口提交落盘。
- [x] owner docs：`docs/components/table/design.md` 两节已同步（列宽拖拽行 + 固定列背景契约勘误节）。实施注记：`renderer-markers-and-selectors.md` 无需改动——该文档是标记约定规则文档而非注册表（table 数据属性注册落 table design.md，`data-*` 状态标记本就符合其 "Express renderer state with data-\*" 规则）；styling-system.md 无涉（未引入新样式契约层）

Exit Criteria:

- [x] 台账结构可被 FM-1/FM-2/FM-5 直接写入（README + ledger + 对账口径）；owner docs/日志多面一致（roadmap/mission 状态翻转待 closure audit 通过后随收口提交落盘）。

## Draft Review Record

- Reviewer / Agent: agent_8965d76b（fresh session 独立子 agent，两轮）
- Verdict: `pass-with-minors`（R1 fail 0B/4M/3m → 全量修订 → R2 pass-with-minors 0B/0M）
- Rounds: 2
- Findings addressed: R1-M1 c1a-visual-amis-parity 契约冲突未点名 → Baseline 增「在册契约冲突」条目 + Phase 3 独立 Fix（断言改写/台账反转/owner doc 取代记录）+ 回归清单补入；R1-M2 半透明状态 token 渗底风险未裁决 → Phase 3 改复合策略（不透明基线 + background-image 叠加，规避 shorthand 重置）+ Proof-e2e-2 断言改双判别（状态差 + 不透明）；R1-M3 「跟踪宽」语义自相矛盾 → 采纳方案 (a)（hasCommittedResize 用户已提交口径，排除 initialWidths，Goals/Proof-unit-2 负断言/Failure Path 全文对齐）；R1-M4 bisheng-build fixed 声称不实 → 改 approval-tasks/standard-crud 实引 + 「现无三合一宿主」明示（R2 重新 live 核验成立）；R1 三 Minor（token 回退链措辞/expect.poll/优先级序）全部落位；R2-m1 Failure Path 旧术语残留 → 已改「用户已提交列宽」。

## Closure Gates

- [x] Proof 判别测试先红（e2e + 单元红态输出在案）
- [x] 列宽拖拽机制对标落地（命中区/反馈/确定性布局/节流/钳制）且判别绿
- [x] 固定列行级状态透传生效且判别绿；注释勘误落位
- [x] 表头全选固定列核验有结论（verified 无缺陷证据，FM-003）
- [x] 同族清扫逐项结论落台账；P0/P1 项已修（FM-004）
- [x] `docs/audits/final-maturity-audit/` 台账建立且本批发现登记完毕
- [x] owner docs 与 live 一致；roadmap/mission 回写完成（closure audit 通过后随收口提交落盘）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（三项 Deferred 均为 watch-only/外来红/优化候选，各有 Why Not Blocking）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`（42/44，唯一红 = playground vite.config 既有登记红）
- [x] `pnpm build`（唯一红 = playground vite.config 既有登记红）
- [x] `pnpm lint`（44/44 绿）
- [x] `pnpm test`（82/82 任务全绿，exit 0——基线中 playground 3 文件既有登记红本轮已全绿，归因并发 plan 621 会话修复其 xlang 相关测试）
- [x] `pnpm check`（exit 0，newHits=0；oversized 2 项与 docs-garbled 21 候选均为登记存量，与本批无关）

## Deferred But Adjudicated

### interactive variant 固定列叠加层规则

- Classification: `watch-only residual`
- Why Not Blocking: `TableRowVariant 'interactive'`（hover 渐变/强选中 token）全仓零生产消费者（仅 `packages/ui/src/components/ui/table.test.tsx` 自测）；default variant 叠加层规则已完备，规则补齐属纯增量，落地消费方时随批补（台账 FM-006）。
- Successor Required: `no`
- Successor Path: 消费方引入时在 `table.css` 追加 `tr[data-row-variant='interactive']` 分支（台账跟踪）。

### c1a-visual-amis-parity spec 整 spec console 门禁红

- Classification: `watch-only residual`（外来红，非本 plan 范围）
- Why Not Blocking: 页面级 console.error（`#/lab/crud`、`#/lab/dialog` 的 RM metamodel prop-contract 诊断）与 plan 642 diff 无关（同 spec 的 dialog 用例同挂——对话框零表格；干净 HEAD worktree 归因尝试 + 发射器溯源：RM renderer-metamodel 工作流收紧 prop contract 所致，属并发会话领地）。本 plan 改写的测试体断言已绿（FM-005 台账披露）。
- Successor Required: `yes`
- Successor Path: RM（renderer-metamodel）工作流收口时清理 lab schema 未声明 props 或登记白名单，恢复 c1a spec 全绿（姊妹队列坐标：`scripts/baselines/renderer-metamodel-residue-whitelist.json`）。

### fixed 布局裁切视觉策略（ellipsis 等）

- Classification: `optimization candidate`
- Why Not Blocking: `data-layout-fixed` 模式 overflow:hidden 裁切是确定性布局的既定契约面（Failure Path fixed-overflow 预裁），当前观感可接受；视觉增强属优化候选（台账 FM-007）。
- Successor Required: `no`
- Successor Path: 台账跟踪

## Non-Blocking Follow-ups

- fixed 布局下超长内容裁切 vs ellipsis 的视觉策略（若 Phase 2 裁切观感不可接受，归族台账另立裁决）。
- gantt/kanban/设计器拖拽族（FM-1b 口径）；列宽拖拽 sheet 级能力扩展（无登记，不在队列）。

## Closure

Status Note: FM-0 五项交付全部落地并经独立两轮收口审计（R1 `issues` 1 Major/3 Minor → Major-1 striped 叠加层特异性反超以修码处置 + 判别升级，Minors 勘误 → R2 `approved`）。两项用户点名缺陷修复（FM-001 列宽拖拽 7px 越出命中区 + 确定性布局 + rAF 节流；FM-002 固定列状态叠加层含 striped+selected 组合）；全选核验结论无缺陷（FM-003）；同族清扫 P1 修复（FM-004 行拖拽反馈）；台账 `docs/audits/final-maturity-audit/` 建立（7 条，uncovered=0）。门禁：typecheck 42/44（唯一 playground vite.config 既有红）/ build 唯一同一既有红 / lint 44/44 / test 82/82 全绿 / check exit 0 newHits=0；e2e 判别 5/5 + 定点回归绿。

Closure Audit Evidence:

- Auditor / Agent: agent_c14f9a39（fresh session，R1 + R2 同审计员两轮）
- Evidence: R1（2026-10-18）verdict `issues`——A1–A9/B/C/D 全 PASS（handle 几何/确定性布局/叠加层/勘误/c1a 改写/台账/owner doc/判别测试真实性；独立复跑 e2e 5/5 + data 1240/1240 + ui 358/358；FM-005 外来红经 dialog 用例独立实证归因成立），发现 Major-1（striped 叠加层 `:not(:hover)` 计入特异性反超 selected 0,4,2>0,3,2，斑马纹行选中后固定列仍显条纹色——用户原始场景半残留；e2e 判别因 row0 恒 striped 结构性失明）+ Minor-2（回归计数 8/8 不实，实为 2/2）+ Minor-3（ledger 指针）+ Minor-4（冷启动 flake 观察）→ Major-1 修码处置（striped 规则补 `:not([data-state='selected'])` + 契约钉守 + e2e 升级「斑马纹+普通双行选中叠加层一致」判别，红→绿）+ Minors 勘误。R2（同日）verdict `approved`——五项处置全 PASS（组合语义推导核对正确、新判别旧实现必挂且真实浏览器通过），两条新观察随手处理（e2e idle striped 断言语义漂移一行修正；liquid 侧 striped/selected 语义分裂登记台账 watch-only），sonner 偶发失败判负载型不立案。详见 `docs/logs/2026/10-18.md`。

Follow-up:

- liquid 侧 striped/selected 语义分裂统一裁决（R2 观察，台账 FM-002 watch-only）。
- fixed 布局裁切视觉策略（台账 FM-007 optimization candidate）；gantt/kanban/设计器拖拽族归 FM-1b；c1a spec console 门禁恢复归 RM 工作流（台账 FM-005）。
