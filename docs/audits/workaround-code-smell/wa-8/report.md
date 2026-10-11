# WA-8 调度/仪表盘/透视渲染器 临时方案与坏味道审计报告

> 批次: WA-8（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: plan 568（`docs/plans/` WA-8 批次计划）
> 审计日期: 2026-10-12
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-8 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话）

## 快照基准注记

HEAD = `815d026dd`（flux-bundle 动态 chunk 落盘 commit，与 plan 568 基线记载逐字一致）。**三模块零在途**：`git diff HEAD --name-only` 对三包 src 返回 0 文件——live = HEAD，双口径无漂移项。

**双口径行数逐文件分解**（实测 `wc -l`，113 文件逐一对照 inventory `path:loc` 后缀）：

| 口径           | 全集行数 | 说明                                                                     |
| -------------- | -------- | ------------------------------------------------------------------------ |
| inventory 口径 | 17,293   | WA-0 枚举器值（scheduling 13,436 + dashboard 2,629 + pivot 1,228）       |
| live wc        | 17,293   | = inventory **逐文件零差**（113/113 逐字吻合，无 wa-7 那类在途漂移文件） |
| HEAD wc        | 17,293   | = live（零在途）                                                         |

plan 568 基线引 ≥500 行 3 件为 gantt.tsx 680 / calendar.tsx 643 / kanban-board.tsx 572，live wc = 679 / 642 / 571（3 件一致 −1，拟制时口径约定差，同 wa-7 注记形态；以 live wc = inventory 为准）。pivot-option.ts 448 = inventory = live（临界走读件）。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id                   | 文件数 | 非测试行数                                             | 取证完成 | 备注                                                                                                                                                                                                                                                             |
| ------------------------- | ------ | ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| flux-renderers-scheduling | 90     | 13436（inventory）/ 13436（live wc）/ 13436（HEAD wc） | ✅       | 90/90 **全文读取**（零抽样；含 ≥500 行 3 件：gantt.tsx 679、calendar.tsx 642、kanban-board.tsx 571 全读；gantt-store 467、calendar-month-view 456、dashboard-editor-renderer 493 等核心实现逐行走读）；门禁 6 项实跑；探针 17 候选区人工复核；git 考古 12 commit |
| flux-renderers-dashboard  | 16     | 2629 / 2629 / 2629                                     | ✅       | 16/16 全文读取（editor 三件套 canvas 349/inspector 315/renderer 493 全读；test-support.tsx 含模块顶层副作用专项核验）；含 ≥500 行 1 件 dashboard-editor-renderer.tsx 493（临界，全读）                                                                           |
| flux-renderers-pivot      | 7      | 1228 / 1228 / 1228                                     | ✅       | 7/7 全文读取；pivot-option.ts 448 临界件逐行走读（配置归一面全量取证）                                                                                                                                                                                           |

全集 **113/113**；12 行滑窗 token 归一化探针（跨文件对合并区间，≥10 行块阈值）原始窗口对 4,721 → 合并后候选区 17 组 → 生产代码坐实 **5 组**（WA-scheduling-002/008/009 + WA-scheduling-004 附带 kanban undo/redo 镜像 + WA-dashboard-001 附带 fragment 双份）→ 声明表格化/监听对称镜像等 12 组排除（见误报排除清单）；git 考古 12 commit；症状性 message 抽检 30 = **0**。

### 门禁交叉实跑读数（prompt §5 第 5 步留痕）

| 门禁                                   | 读数                                                                         | 处置                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-async-failure-paths`      | **20 行命中**（scheduling 13 + pivot 4 + dashboard 3，与 plan 基线逐字吻合） | 20 处逐个定性、未批量放行亦未批量立案：**全 20 处均有结构化失败路径或显式注释豁免**（dashboard 3：editor-renderer:69 JSON.parse→空文档、editor-canvas:125 setPointerCapture 能力探测、editor-inspector:293 invalid JSON→inline alert[G3-视角4-03 修复面]；pivot 4：pivot-events:49 / pivot-renderer:126,186 均 console.error 观测、pivot-option:400 token 探测注释在案；scheduling 13 见取证执行记录第 3 步）——0 升级立案，1 处（kanban-export:66）因宿主模块为死层归 WA-scheduling-001 |
| `check:audit-performance-suspects`     | **0**                                                                        | 实跑确认                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `check:audit-runtime-raw-schema-reads` | **0**                                                                        | 实跑确认                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `check:audit-hardcoded-type-dispatch`  | **0**                                                                        | 实跑确认                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `check:audit-reactive-render-reads`    | **0**                                                                        | 实跑确认                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `check:audit-renderer-browser-io`      | **0**                                                                        | 实跑确认（prepare-wasm INV-1 fetcher 注入、calendar html2canvas 走 DOM 库非 fetch、pivot VTable 容器挂载均不触门禁红线）                                                                                                                                                                                                                                                                                                                                                                |

### 取证执行记录（prompt §5 八步逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` = **1 命中**（gantt/undo-stack.ts:193 FIXME——undo 双轨统一待办，按 I 类溯源 `2055e4d8c` 2026-07-23，出口查无 plan/bug 登记 → WA-scheduling-004）；`临时|先这样|暂时|绕过|workaround|hotfix` = **0 命中**。与 inventory literalEn 1/literalZh 0 基线逐字吻合。
2. **模式候选 42 处逐个定性**（grep 复现与 inventory 计数逐字吻合：typeBypass 19 = scheduling 15 + dashboard 2 + pivot 2；setTimeout 8 全在 scheduling；domRaid 14 全在 scheduling；silentCatch/keyRemount/pixelNudge/testEnvBranch 全零实跑复核）：**1 处升级 P1 立案**（calendar 三视图键盘漫游器三份，见 WA-scheduling-001——由 domRaid 命中位人工同构复核升级为 H 类）、**7 处立案沉淀**（kanban regions as any ×4 → WA-scheduling-003；torch 轮询 → WA-scheduling-007；calendar.tsx data shim watch 注记；kanban-export:65 cast 归 WA-scheduling-002；dashboard 双 fragment cast 归 WA-dashboard-001）、**余 34 处误报排除**（§误报排除清单：动态边界/能力探测/声明表格化/诊断锚判例）。
3. **门禁交叉**：上表 6 项实跑；async 20 命中去重 20 处逐个定性。scheduling 13 处明细：barcode-input:151（非法 RegExp→`invalidPattern` i18n 用户可见错误）、barcode-scanner-overlay:139（init catch→phase error + onScanError 回调双通道）、use-barcode-camera:93（console.warn + i18n error state）、use-barcode-detect:110（setError i18n 三分支）、use-barcode-torch:53/79/87（能力探测注释/console.error/注释声明）、barcode-detector-utils:64（"未检出条码"为域语义空数组非故障）、:115/:120（native 构造能力方差重试，注释在案）、prepare-wasm-utils:30（重试链 lastErr 汇聚后 throw）、use-kanban-filter-card:38（filterError banner 结构化面）、kanban-export:66（console.warn→caller throw，宿主死层归 WA-scheduling-001）。
4. **重复块识别**：12 行滑窗 token 归一化探针（首版 10 行窗受类型声明词表均匀性干扰产出 14,328 伪影，二版加熵过滤+可执行行占比过滤+规范方向合并后 17 候选区；探针存 `_tmp/wa8/dup-probe.mjs`、`_tmp/wa8/dup-merge2.mjs`）。人工同构复核：坐实 5 组（WA-scheduling-002 三视图 walker、WA-scheduling-008 date 原语、WA-scheduling-009 gantt 键盘 case 镜像、kanban-undo undo/redo switch 镜像[归 WA-scheduling-004 附带证据]、dashboard fragment 构建[归 WA-dashboard-001 附带证据]）；排除 12 组（类型/definitions 声明表互 dup[wa-7 #22 表格化判例]、use-gantt-link-draw 监听挂卸对称块[cleanup 本义]、worktime add/subtractWorkDays 镜像、confirm-dialog↔drag-type-selector overlay 壳[已共享 CalendarOverlay 底座]、calendar-event-block template/default 属性块、pivot propContracts row/column 对称、use-calendar-ownership 双 useScopeSelector[25 行同构，watch 微注记]、scheduling-renderer-definitions 内部 1,162 窗[声明表]、types 四文件互 dup[声明表]）。
5. **范围结构走读**：**113/113 全文读取**（17.3k 行全员全文档，无抽样档）。≥500 行 3 件全读（gantt 679 / calendar 642 / kanban-board 571），pivot-option 448 临界全读。dashboard-editor-renderer 493 全读。分档落字：核心实现（组件/hook/store/utils）逐行精读约 70 件；纯类型/纯声明/纯 schema 定义件（schemas.ts ×3、\*.types.ts ×4、definitions ×4、index ×3、manifest）信号扫描 + 全文过读。
6. **已收敛模式三档复核**：①`createLazyLibLoader`（`c21e2dea9` 收敛）——barcode zxing 装载点 `barcode-detector-utils.ts:25` live 在案 ✅、pivot 组件级 `createLazyRendererComponent`（pivot-renderer-definitions.ts:6）在案 ✅；**反向缺口**：html2canvas 双位点（calendar 静态 import / kanban 手写动态 import+cast）均未接入收敛原语 → 归 WA-scheduling-002。②cq-3 Phase 6（scheduling-event-ctx 四合一）——四组件事件 ctx 均走 `shared/scheduling-event-ctx.ts` 单源 ✅ 零复发。③WA-content-009 模块顶层 `t()` 教训——正面复核：barcode-scanner-overlay `statusMessages()`（:16-23 注释显式声明 R3-U3 收敛）✅；反向命中 1 处：dashboard test-support.tsx:13 模块顶层 `initFluxI18n` → WA-dashboard-002。④isDevRuntime 家族——本批 +2 扩员（pivot-warn.ts:1、use-kanban-column-aggregate.ts:7），跨引用 WA-data-003 不重复立案。
7. **git 考古**：12 commit 溯源（详见逐条）。锚点核验——`c21e2dea9`（懒加载收敛）双侧位点 live 验证通过；`4e4fde426`（IS-gantt-003 连线删除钮 hover 振荡修复）载体 gantt-links.tsx 的 X 钮/命中面结构即 WA-scheduling-005 所在文件，该缺陷已由 IS 批修讫，本条为其 hit-area 转发机制的形态登记非行为缺陷；`b73f24ab7`（plan 488 V12f）三视图 walker 同 commit 三落（"mirrors the month view" 注释即同步修自证）。**症状性 message 专项**：抽检三包最近 30 个 commit，全部带 plan 引用/根因链/full-green 标记（plan 488/489/511/513/514/535/538/545/546/548/552-557、cq-2..6、ux-r2/r8/r9、V11b/V12f、IS-2/3/5 等），**症状性 message 0**。
8. **误报排除复核**：22 项全记录（§误报排除清单）；与 wa-7 判例互通引用（test-support 复制族归 WA-mobile-001/CX-15、isDevRuntime 归 WA-data-003、CX-10/CX-11 家族、wa-6 WA-data-009 失败观测族）。

## 逐条发现（Findings）

> 每条按 prompt §6 单条模板；全量登记归主会话写入 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-<pkg短名>-<seq>`），本节与台账一一对应，零静默。

### [类别H] calendar 三视图 roving-focus 键盘漫游器三份手写、单元格选择器已漂移（WA-scheduling-001）

> ID 编排说明：立案清单以包为组按严重度排序编号，本条与下方各条 ID 见「批内修复候选清单」总表。

- **位置**: `packages/flux-renderers-scheduling/src/calendar/components/calendar-month-view.tsx:133-180` ↔ `calendar-week-view.tsx:88-129` ↔ `calendar-day-view.tsx:72-102`——三份 `handle*CellKeyDown/`handleDateCellKeyDown`` 同构（`closest('[role="grid"]')`→`querySelectorAll`取格集 →`indexOf`→ 方向键 stride 换算 →`cells[nextIdx].focus()`），骨架逐字同形 ~15 行 ×3，仅 stride 与选择器差
- **严重度**: **P1**（≥3 份同根因，P1 起评；降档考量显式记录后驳回：stride 语义（月视图按周跨行、周视图按天、日视图按小时）确为视图真实差，但**可参数化**——共享原语收 `(colStride, rowStride, selector)` 三参即可，骨架部分零真实分叉）
- **信号类别**: H（复制粘贴式增长）+ E 邻（roving focus 走 querySelector）
- **按住的根因**: calendar 无共享「CSS Grid 单元格 roving focus」原语；三视图各自手写漫游器。漂移已兑现：单元格选择器三样——month `[data-slot="calendar-cell"]:not([data-empty])`、week `[role="gridcell"][data-slot="calendar-cell"]`、day `[role="gridcell"]`（day 视图小时格不带 data-slot 校验、month 排除空格、week 双条件）——三套过滤语义未经裁定，属无意分叉
- **考古**: 三份同 commit 出生 `b73f24ab7`（plan 488 V12f batch-4，week 侧注释自证"mirrors the month view"——同步修成本已在出生时兑现一次）；日视图随后独立演化
- **违约基准**: W3（3 份同步修点）、W1（机制级根因=缺共享原语，未修）
- **为什么是临时方案**: 症状消失（三视图键盘导航各自可用）✅；根因仍在（新增第四视图/加 Home/End/RTL 支持需第四份拷贝）✅；出口缺失（无收敛登记）✅——三要素成立
- **风险**: ①选择器三套语义分叉已在制造维护税（day 视图对非 cell gridcell 同样 focus）；②a11y 语义修 bug 需三处同步；③与 kanban-column 已验证的**声明式 roving**（`rovingCardId` state + tabIndex 派生，kanban-column.tsx:180-220，注释 1-11）同包并存——同一包内两种 roving 形态，演进方向分裂
- **重构方向**: 提取包内 `useGridCellRovingFocus({ selector, colStride, rowStride })`（或 pure `moveGridFocus(e, opts)`）供三视图调用；kanban 声明式形态不动（不强并，登记为两形态裁定注释）。回归 = calendar 键盘导航现有用例 + 新增「三视图方向键落格」参数化钉测试（先红后绿）
- **ROI 裁定**: 批内修（提取纯函数 + 三调用点改写，行为保持）
- **误报排除复核**: 非动态边界（选择器均为自有 data-slot 契约标记）；非 orchestrator 复杂度；与 CX-11 焦点族的关系——本条主维度是三份复制（提取面），focus 落点机制随提取自然共享，不占 CX-11

### [类别H] kanban-export 生产未接线死层 + html2canvas 装载策略三分（WA-scheduling-002）

- **位置**: `packages/flux-renderers-scheduling/src/kanban/utils/kanban-export.ts:1-70`（boardDataToJson/boardDataFromJson/exportBoardToPng/downloadBlob/tryLoadHtml2canvas 全模块）——**生产零消费**（全仓唯一 importer 是自测 kanban-export.test.ts；index.ts 不导出、toolbar 无入口、KanbanHandle 无 saveSnapshot/loadSnapshot 方法）；关联面 `calendar/hooks/use-calendar-export.ts:1`（`import html2canvas from 'html2canvas'` **静态 import** 进主 chunk）↔ kanban 手写动态 `import('html2canvas')` + `(mod.default || mod) as unknown as Html2CanvasFn`（:64-65）↔ 已收敛原语 `createLazyLibLoader`（barcode 在用）
- **严重度**: **P2**（双份大块活跃 + 出口过期形态：设计出口在案但接线缺失 3 个月）
- **信号类别**: H（同一基础设施多处手写——html2canvas 装载三种策略）+ I 邻（实现先于接线的滞留层）
- **按住的根因**: `docs/components/kanban/design-export-snapshot.md`（Status: final，2026-07-20）声明了 component:saveSnapshot/loadSnapshot 句柄 + 工具栏入口 + 失败 toast 面；工具层按规格建成（含 4096 尺寸守卫、in-flight WeakMap、abort 通道），**接线层（句柄注册 + UI 入口 + toast）从未落地**；design.md:446 将「看板导出/快照」列为 P3 deferred。同库 calendar 侧 2026-07-22 独立实现 chose 静态 import——两批互不知情
- **考古**: kanban-export 出生 `25090a6ef`（2026-07-20 kanban advanced features，plan-2026-07-20-2100）；calendar export 出生于 plan 485 波次
- **违约基准**: W2（设计出口在案但过期 ~3 个月未推进）、W3（html2canvas 装载 3 份策略 + JSON 下载 `downloadBlob` 与 calendar 导出下载路径双写）
- **为什么是临时方案**: 症状消失（工具层单测全绿制造"已具备"错觉）✅；根因仍在（用户没有任何 kanban 导出入口）✅；出口缺失（设计 final 但无 plan 承接接线）✅
- **风险**: ①死层继续存活会误导后续批以为 kanban 已有导出能力；②calendar 静态 import 把 html2canvas（~200KB）钉进 scheduling 主 chunk，与 c21e2dea9 懒加载收敛方向相悖；③两处 options 漂移风险（scale/useCORS 各写一份）
- **重构方向**: 二选一显式裁定（不得静默滞留）：a) 按 design-export-snapshot 接线（KanbanHandle 补 saveSnapshot/loadSnapshot + toolbar 导出按钮 + 失败 toast），工具层原地启用；b) 若 P3 继续延期，工具层移出 src/ 或文件头显式登记 "design-reserve, unwired" 状态。**无论 a/b**：calendar `use-calendar-export` 的静态 import 迁 `createLazyLibLoader`（对齐 barcode/pivot 收敛面），删除 kanban 手写 tryLoadHtml2canvas。回归 = kanban-export 现有单测直通 + calendar 导出失败面（G4-R2-视角5-02 banner）用例直通
- **ROI 裁定**: 排期进 plan（接线属产品决策）；装载收敛部分可批内修（低成本）
- **误报排除复核**: 非纯死代码化石（设计文档 final 在案、单测鲜活）——按「出口过期/滞留层」定性而非 WA-content-006 式化石

### [类别D] kanban regions 通道 `as any` 四连（WA-scheduling-003）

- **位置**: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx:528-531`——`columnHeaderRegion/columnHeaderToolbarRegion/cardTemplateRegion/columnFooterRegion` 四处逐字 `regions.X as any`
- **严重度**: P3
- **信号类别**: D（type-system bypass 的家族化形态）
- **按住的根因**: `KanbanColumnProps`/`KanbanColumnHeaderProps` 为 region prop 声明了本地窄结构类型（`{ render: () => ReactNode } | null`，kanban-column.tsx:17-20）而非 `RenderRegionHandle`——类型系统在报警的是「窄化声明与真实句柄签名不匹配」，断言把证据销毁
- **考古**: `bc227d2a6`（2026-07-22 kanban P1 defect remediation）波次模板落地
- **违约基准**: W3（4 份同点位）
- **修复方向**: KanbanColumn/Header 的 region prop 直接采用 `RenderRegionHandle`（flux-react 已导出），四处 `as any` 本体删除；回归 = kanban 现有套件直通，零行为变更
- **ROI 裁定**: 批内修（一行级 ×4）
- **误报排除复核**: 非 wa-4/5/6 单点动态边界判例——region 句柄有具名类型可指，属可收窄而不收窄的家族化 seam（同族 wa-7 WA-layout-002 六连）

### [类别E] 拖拽视觉态 DOM 突袭双位：calendar drop-target 高亮 + kanban data-dragging/data-drop-target 直写（WA-scheduling-004）

- **位置**: `calendar/calendar.tsx:374-398`（dragSwap.dragState effect：querySelector 定位目标格 + setAttribute data-drop-target/data-drop-valid + classList drag-ok/drag-conflict，prevTargetRef 手工清理）+ `kanban/hooks/use-kanban-board-effects.ts:164-181`（querySelectorAll('[data-dnd-column]/[data-dnd-card]') 全量扫 + setAttribute data-drop-target/data-dragging/aria-grabbed）
- **严重度**: P3
- **信号类别**: E（querySelector + 直接改属性，绕开数据流）
- **按住的根因**: 拖拽视觉态所有权只部分走 props——kanban 已把 `dropTargetCardIndex/dropClosestEdge` 声明式下传（kanban-board.tsx:535-536，落点指示条完全声明式 G4-视角9-02），但 column 元素自身的 `data-drop-target` 与卡片 `data-dragging/aria-grabbed` 仍 DOM 直写；calendar 侧 drop 高亮整链 DOM 直写（对照同文件 dragCreatePreview 走 props 的 plan 546 seed-5 先例——同文件内两代形态并存）
- **考古**: calendar 侧 `d6879840d` 波次；kanban 侧 plan 485/488 交互波次
- **违约基准**: W3（同模式 2 位点 + 同文件新旧形态并存）、W1 弱
- **修复方向**: 视觉态全声明化——cell/column 组件接收 drag 上下文 prop（或 context）派生 `data-drop-target/data-dragging`；JSX 数据属性本体不动（保留 CSS 挂点）。回归 = calendar/kanban 拖拽现有 e2e 直通
- **ROI 裁定**: 挂账观察（行为正确、清理对称[prevTargetRef/全量 removeAttribute]、瞬态视觉态；升级触发条件=下一次触碰任一位点时顺带声明化）
- **误报排除复核**: 非宿主集成边界（自有子树自有标记）；非性能逃生舱（无注释声明）；与 IS-2/IS-3 交互态批的缺陷面（拖拽假反等行为缺陷）零交叠——IS 批修行为、本条指形态

### [类别I] undo 命令族双轨 FIXME 无出口 + kanban undo/redo switch 镜像（WA-scheduling-005）

- **位置**: `gantt/undo-stack.ts:193-196`（FIXME：Gantt class-based 与 Kanban typed-delta 双轨"could be unified in a future refactor"）；附带证据 `kanban/utils/kanban-undo-stack.ts:57-92 ↔ 105-138`——undo/redo 双 switch 6 case ×2 镜像块（探针坐实 ~21 行 ×2），新增命令类型需触 4 点（类型联合 + undo switch + redo switch + push 位点）
- **严重度**: P3
- **信号类别**: I（转正临时层/无出口待办）
- **按住的根因**: 双侧文件头注释已完整陈述权衡（command 颗粒度差异 + O(n) clone 代价）——属"说明性注释"合格形态；**但 FIXME 本体（统一重构）无 bug/plan/owner**，`design-undo-redo.md` 无统一裁定段
- **考古**: `2055e4d8c`（2026-07-23 plan-2026-07-23-0800 scheduling UI consistency and arch cleanup）
- **违约基准**: W2（出口缺失）、W3 弱（双轨 + switch 内镜像）
- **为什么是临时方案**: 不满足三要素中的"症状消失+根因仍在"完整链（双轨是有意识的已文档化设计分歧）——按「无出口待办」低档立案，防 FIXME 化石化
- **风险**: 第三命令类型（如 cardUpdate/cellEdit）加入时 switch 镜像漏改一处 → undo/redo 不对称；FIXME 5 个月后无人认领即成化石
- **重构方向**: 最小修 = FIXME 挂 plan 编号或改写为裁定注释（"双轨为裁定形态，统一无排期"）；进阶 = kanban undo/redo switch 表驱动（command descriptor map）。回归 = 两栈现有 undo 用例直通
- **ROI 裁定**: 批内修（注释/表驱动二选一，均低成本）
- **误报排除复核**: 双轨本体不立案（双侧文档完整、语义各自自洽）；立案维度仅"无出口待办 + 镜像维护点"

### [类别E] gantt-links 宽命中面手工合成 PointerEvent 转发拖拽启动（WA-scheduling-006）

- **位置**: `gantt/gantt-links.tsx:81-91`——透明 10px 宽命中 polyline 的 onPointerDown：停用自身 pointer-events → `document.elementFromPoint` → 找到 `[data-task-id]` 后 `new PointerEvent('pointerdown', …)` + `barEl.dispatchEvent(clone)`
- **严重度**: P3
- **信号类别**: E（手动 dispatchEvent 模拟用户操作驱动内部逻辑）
- **按住的根因**: SVG 命中面（加宽的 link polyline，供易点）叠在 bar 之上，拦截了 bar 的拖拽启动事件；根因=命中层与交互层的 layering 所有权未显式化，用 DOM 合成事件"归还"事件
- **考古**: `7d7b21d9c`（Strict Mode race fix 波次）；同文件 X 删除钮 hover 振荡已由 `4e4fde426`（IS-gantt-003）修讫——本条为同文件 hit-area 机制的形态登记
- **违约基准**: W1 弱（可指认：命中面覆盖 bar 的事件路径）、W2（无登记）
- **风险**: 合成事件 `isTrusted=false`、绕过 pointer capture 语义——任何监听侧引入 isTrusted 校验/捕获改造（如 GanttBars 改 setPointerCapture）即静默断链；可读性差（事件"幽灵转发"）
- **重构方向**: 直接函数调用替代 DOM 合成——把 GanttBars 的 pointerdown 命中判定（mode 计算 :65-72）提取为 `beginBarPointerSession(e, taskId, barEl)` 供 bars 与 links 两处调用。回归 = gantt 连线拖拽现有 e2e（37 件）直通
- **ROI 裁定**: 挂账观察（随下次触碰 gantt-links 顺带；先补「连线上按下可拖动 bar」钉测试）
- **误报排除复核**: 非测试专用桥（生产交互路径）；非 capture-phase a11y 仲裁判例（wa-7 #18）——那是事件语义需要，本条是 layering 绕行

### [类别C] use-barcode-torch 流就绪 250ms 自重试轮询（WA-scheduling-007）

- **位置**: `barcode-input/hooks/use-barcode-torch.ts:31-65`——effect 链：流未就绪时 `setTimeout(check, 250)` 周期重查直至 `getStream()` 非空（无次数上限，cleanup 对称取消）
- **严重度**: P3
- **信号类别**: C（轮询等待另一系统就绪）
- **按住的根因**: `useBarcodeCamera` 的 `start()` 是 async 命令但**无显式"流就绪"信号**（promise 未暴露、无 onReady 回调），torch 可用性检查只能探测 `getStream()` 返回值。注释 1-6 完整记录了旧缺陷链（effect deps 依赖稳定 ref → 永不重跑 → isAvailable 恒 false → torch 按钮永不出现）——轮询是修复形态而非掩盖
- **考古**: `6255378c2`（2026-08-07 plan component-audit scheduling P1 remediation）
- **违约基准**: W2（无出口登记）、C 判据边缘（等的是可显式表达为 promise 的就绪信号）
- **风险**: 相机永不就绪的宿主环境轮询至 unmount（低频空转）；环境变化（慢设备）下 250ms 步进无界等待
- **重构方向**: `useBarcodeCamera.start()` 返回/暴露 readiness promise（或 onReady 回调），torch effect 订阅之，轮询本体删除。回归 = torch 可用性现有用例 + 「流延迟就绪后 isAvailable 翻真」钉测试
- **ROI 裁定**: 挂账观察（当前形态有根因注释、清理对称、行为正确；升级触发=下次触碰 barcode 相机族时随车）
- **误报排除复核**: §2C 豁免条款比对——非动画时序、非协议退避；但属于"显式就绪信号缺失"的有注释自愈形态，按 C 类边缘低档立案不按掩盖处理

### [类别H] 包内 date 原语三处手写且 diffInDays 语义已漂移（WA-scheduling-008）

- **位置**: `gantt/utils/date.ts`（addDays:9-13 / diffInDays:3-7 / getWeekStart / 格式化 token 表）↔ `calendar/utils/calendar-date-utils.ts`（addDays:83-87 **逐字同**、diffInDays:103-107、toISODateString:109-111）↔ `gantt/utils/worktime.ts:25-27`（toDateKey 与 toISODateString 同构）
- **严重度**: P3
- **信号类别**: H（复制粘贴式增长）
- **按住的根因**: scheduling 包无共享 date-primitives 模块；gantt/calendar 两族各自携一份。**漂移已兑现**：`diffInDays` gantt 版 `Math.round`、calendar 版 `Math.floor`（对含时间分量的输入两版结果不同）；`addDays`/ISO 格式化逐字双份
- **考古**: 两族随各自组件波次独立生长（f16b62796 gantt 渲染层 / calendar 组件波次）
- **违约基准**: W3（2-3 份）、W1（round/floor 分叉无裁定注释——调用点全部传 UTC 零点故暂无行为差，属"靠调用纪律按住"）
- **修复方向**: 提取 `scheduling/shared/date-primitives.ts`（addDays/diffInDays[裁定取整语义并注释]/toISODateString/parseISODate 单份）；回归 = gantt/calendar 现有 date 用例直通
- **ROI 裁定**: 挂账观察（小而稳定；取整语义需一次显式拍板，宜与下一次 date 相关修复合车）
- **误报排除复核**: 非概念级重复（同名同签名逐字/近逐字代码块）；工作日历 worktime.ts 的 addWorkDays 等域方法不并入（真实语义差）

### [类别H] gantt 键盘编辑 case 镜像四连 + ArrowLeft/Right 镜像（WA-scheduling-009）

- **位置**: `gantt/gantt.tsx:237-288`——handleBarKeyAction 的 move-up/move-down/resize-left/resize-right 四 case 共享同一 8-10 行形状（UTC 日期 ±1 → payload → dispatchTaskEdit → store.updateTask → undoStack.push，探针区 195-219）；`hooks/use-gantt-keyboard.ts:73-93` ArrowLeft/ArrowRight 镜像（仅 isOpen 取反差）
- **严重度**: P3
- **信号类别**: H
- **按住的根因**: 无 `shiftTaskDates(task, days)` / `resizeTaskEnd(task, days)` 微原语，四 case 各自展开；方向 case 无 `collapseOrExpand(open: boolean)` 参数化
- **考古**: 2-19/22-07 裁定波次批量写入（payload/undo 通道是后补的同步修——四 case 同批逐个补齐即同步修成本兑现）
- **违约基准**: W3（4+2 份）
- **修复方向**: 提取两个包内纯函数 + case 体收敛为一行调用；回归 = gantt 键盘操作现有用例直通
- **ROI 裁定**: 批内修（行为保持提取）
- **误报排除复核**: switch case 内的差异（resize 有边界校验分支）为真实语义差，提取时以参数保留

### [类别H] dashboard-renderer 未接入 layout-math 共享面，三块逻辑双份（WA-dashboard-001）

- **位置**: ①`dashboard-renderer.tsx:26-41` `resolveLayoutProps` 手写默认解析（cols 12/rowHeight 40/gap 8）↔ `layout-math.ts:31-41` `resolveCols/resolveRowHeight/resolveGapPx` + `DEFAULT_COLS/DEFAULT_ROW_HEIGHT/DEFAULT_GAP`——**editor 侧（dashboard-editor-renderer.tsx:113-115）已接共享面，renderer 侧未接**，12/40/8 双源；②`dashboard-renderer.tsx:57-65 + 108-116`（buildPanelFragment + 未注册面板 warn+skip 守卫）↔ `dashboard-editor-renderer.tsx:286-299` **近逐字双份**（含两处 `as unknown as BaseSchema` seam）；③面板合法性规则双写：`layout-math.ts:237-288` sanitizePanels（warn+skip+clamp）↔ `dashboard-domain-adapter.ts:124-155` adapter.validate（problems 收集）——输出形态差属真实，规则清单（id 非空/唯一/type 非空/geometry 数值）逐条双写
- **严重度**: P2（双份同根因 + 包处活跃开发期 + 共享面**已存在**而半数位点未接——「收敛面止步层」形态，同 wa-5/wa-7 "cq 收敛止步层"家族）
- **信号类别**: H
- **按住的根因**: layout-math 作为坐标/校验单一来源的设计声明（文件头注释「编辑/运行同构零转换」）只覆盖了编辑态消费；运行态 renderer 早于或平行于 layout-math 提取写成，回接从未发生
- **考古**: renderer 出生 `a2ac7f5d7`（2026-08-09 editor-core 波次）；layout-math 随 plan 482（`8c5ca8ffd` V11b）成型——renderer 的 resolveLayoutProps 与 fragment 构建在其后仍保持手写
- **违约基准**: W3（每块 2 份）、W2（无回接登记）
- **为什么是临时方案**: 症状消失（运行态默认值/装配与编辑态当前一致）✅；根因仍在（改 DEFAULT_COLS 一处不生效于运行态——漂移只是时间问题）✅；出口缺失 ✅
- **风险**: ①默认值漂移（编辑器与运行态对同一 schema 解析出不同网格）；②fragment 装配规则修 bug 需两处同步（pathSuffix 差异是唯一真实差，可参数化）
- **重构方向**: renderer 改调 `resolveCols/resolveRowHeight/resolveGapPx` + 导出 layout-math 的 `buildPanelFragment(panel, { pathSuffix })` 单份；回归 = dashboard renderer/editor 现有套件直通
- **ROI 裁定**: 批内修（纯回接 + 行为保持提取，零公共导出语义变更）
- **误报排除复核**: ③校验规则双写仅作 watch 微注记不入修复面（两输出形态真实不同，强并会制造错误耦合）

### [类别G邻] dashboard test-support 模块顶层 initFluxI18n 副作用 + 生产契约定义表三抄（WA-dashboard-002）

- **位置**: `test-support.tsx:13`（模块求值期 `initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' })`，且位于两段 import 语句之间）+ `:70-90 / :151-171`（dashboard-editor 定义 fields 表 12 项逐字抄自 `editor/dashboard-editor-definitions.ts:129-141` ×2 份）
- **严重度**: P3
- **信号类别**: G 邻（模块顶层求值副作用破坏测试隔离——WA-content-009 同族模式）+ H 邻（契约表抄写）
- **按住的根因**: 无（测试支撑文件求值路径上的副作用调用 + 复制维持）。现风险限位：全仓仅本包 8 个测试文件 import、index.ts 零导出——未跨包泄漏；但该模式一旦被第二个包的测试复用即复现 WA-content-009 形态（先 import 者钉死语言）
- **考古**: `a2ac7f5d7`（2026-08-09 dashboard-editor 出生即有）
- **违约基准**: W4（求值期副作用零观测）+ W3（定义表 3 份同步修点——生产定义加字段则两份测试定义静默失真）
- **重构方向**: initFluxI18n 移入 `createDashboardSchemaRenderer()` 工厂体内（显式初始化）；定义表以 `dashboardEditorRendererDefinition` 为基做 `{ ...base }` 派生（spy 包装仅换 component 字段）。回归 = dashboard 套件直通；判别断言（非 en 初始化下 stub 文案不被冻结）随 WA-content-009 判例可选补
- **ROI 裁定**: 批内修（低成本）；定义表收敛部分与 CX-15（渲染器包测试支撑收敛，wa-7 WA-mobile-001 拟制）同车
- **误报排除复核**: 非时间注入等标准可测性设计（§2G）——initFluxI18n 是全局单例状态写入而非注入点；不重复立案 WA-content-009（该条为 wa-7 批内修复引入的独立回归，已 closure）

### [类别W4邻] dashboard-editor sessionChange effect 无 deps 每渲染派发（WA-dashboard-003，观察项）

- **位置**: `editor/dashboard-editor-renderer.tsx:229-242`——`useEffect(() => { … dispatchEventRef.current('dashboard-editor:sessionChange', …) })` **无 deps 数组**：组件任意 render（含父级重渲染）都派发一次 onSessionChange，与注释宣称的"值驱动派发（session 为逐 notify 新对象）"不符
- **严重度**: P3（watch-only：宿主未声明 onSessionChange 时零效应；宿主 handler 一旦写 scope 即渲染环风险）
- **信号类别**: W4 邻（触发可观测性/频次契约与注释不符）
- **按住的根因**: 意图是逐 session-notify 派发，实现是逐 render 派发——差一个 `[session]` deps
- **考古**: plan 554/555 P3.2 波次
- **违约基准**: W4 弱
- **修复方向**: deps 补 `[core, session]`（core 守卫已有）；判别测试 = 父级无关重渲染不派发、session 变更恰派发一次（先红）
- **ROI 裁定**: 批内修（一行）或 watch（Phase 2 裁量）；**不允许静默**
- **误报排除复核**: 非临时方案存量——本批新观察面（模式一 diff 级嗅觉），按 P3 单点缺陷登记（同 wa-7 WA-content-005 形态）

### [类别D/H] pivot schema 词汇表三处手抄（WA-pivot-001）

- **位置**: `schemas.ts:11/13/65`（TS 联合类型 PivotAggregationType/PivotCellType/PivotCornerTitleOnDimension）↔ `pivot-renderer-definitions.ts:10-12`（validator 用 `VALID_AGGREGATION_TYPES/VALID_CELL_TYPES/VALID_CORNER_VALUES` 字符串数组）↔ `pivot-option.ts:26-33`（运行时归一 `VALID_AGGREGATION_TYPES` 第二份）+ pivot-option 内联字面判断两处（cellType `:153`、cornerTitleOnDimension `:300` 不引共享常量）
- **严重度**: P3（当前三处逐字一致零漂移；加一个聚合类型需触 3 文件 5 点）
- **信号类别**: D/H（词表家族化手写）
- **按住的根因**: TS 联合与运行时列表天然双轨，但运行时侧又拆成 validator/option 两份 + 内联判断——共享常量未提取
- **考古**: `346e27700`（pivot 5 Phase 落地）同批写入
- **违约基准**: W3（3 份）
- **风险**: 漂移后果不对称——validator 放行 + option 归一降级（prod 构建 devWarn 摘除后**静默**降 NONE/ASC），schema 作者拿不到任何信号
- **修复方向**: `pivot-vocabulary.ts` 单份导出（`as const` 数组 + `typeof` 派生联合类型），schemas/definitions/option 三处改引；回归 = pivot 现有套件直通
- **ROI 裁定**: 批内修（低成本）
- **误报排除复核**: 非声明表格化（可执行校验词表，wa-7 #22 判例不适用）；TS 联合 ↔ 运行时列表的双轨本体是 TypeScript 惯例不立案，立案维度是运行时侧的复制

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID           | 位置                                  | 出生时间（git 考古）                            | 风险                                                   | 处置                     |
| ----------------- | ------------------------------------- | ----------------------------------------------- | ------------------------------------------------------ | ------------------------ |
| WA-scheduling-002 | kanban-export 死层 + html2canvas 三分 | `25090a6ef`（2026-07-20）；calendar 侧 plan 485 | 设计 final 出口过期 ~3 个月；主 chunk 白担 html2canvas | 批内修装载 + 接线进 plan |
| WA-scheduling-001 | calendar 三视图漫游器 ×3              | `b73f24ab7`（plan 488）                         | 选择器三套语义已分叉                                   | 批内修                   |
| WA-scheduling-005 | undo 双轨 FIXME                       | `2055e4d8c`（2026-07-23）                       | 无出口待办 3 个月                                      | 批内修（挂编号或裁定化） |
| WA-dashboard-001  | renderer 未接 layout-math             | `a2ac7f5d7` → `8c5ca8ffd`                       | 默认值双源漂移在途                                     | 批内修                   |
| 其余 P3 各条      | 见条目                                | 见条目                                          | 低                                                     | watch/批内小修           |

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数 | 位置                                                                   | 冗余行数 | 漂移证据                                                       | 裁定（三问句）                    |
| --- | ---- | ---------------------------------------------------------------------- | -------- | -------------------------------------------------------------- | --------------------------------- |
| 1   | 3    | calendar 三视图 roving-focus 漫游器（WA-scheduling-001）               | ~45      | 选择器三套语义分叉（month 排空格/week 双条件/day 裸 gridcell） | 同根因✅ 已漂移✅ 提取干净✅ → P1 |
| 2   | 2+2  | dashboard renderer↔editor fragment 构建 + 默认解析（WA-dashboard-001） | ~30      | 无（逐字），默认值 12/40/8 双源                                | 同根因✅ 活跃✅ → P2              |
| 3   | 2    | kanban-undo undo/redo switch 镜像（WA-scheduling-005 附带）            | ~21      | 无（逐字镜像）                                                 | 同根因✅ 表驱动可消 → P3          |
| 4   | 3    | date 原语 addDays/diffInDays/toISODateString（WA-scheduling-008）      | ~30      | diffInDays round↔floor 语义分叉                                | 同根因✅ 已漂移✅ → P3（稳定）    |
| 5   | 4+2  | gantt 键盘 case 镜像（WA-scheduling-009）                              | ~40      | 无（同批模板）                                                 | 同根因✅ → P3                     |
| 6   | 3    | pivot 词汇表（WA-pivot-001）                                           | ~12      | 无（逐字）                                                     | 同根因✅ → P3                     |
| 7   | 4    | kanban regions as any（WA-scheduling-003）                             | ~4       | 无                                                             | seam 家族化 → P3                  |

### 3. Top 重构建议（默认 3 项）

1. **calendar 键盘漫游器收敛（WA-scheduling-001）**：根因修复点 = 提取 `useGridCellRovingFocus`/`moveGridFocus(e, {selector, colStride, rowStride})` 单份；预期删除本体 = 三份 querySelectorAll 漫游器 ~45 行与三套分叉选择器（选择器语义随提取一次裁定）；回归 = 三视图方向键落格参数化钉测试（先红）+ calendar 现有套件直通；影响面 = calendar 包内三文件，零公共导出变更。
2. **html2canvas 装载收敛 + kanban-export 显式处置（WA-scheduling-002）**：根因修复点 = calendar 静态 import 迁 `createLazyLibLoader`、kanban 手写 loader 删除；kanban-export 层按 design-export-snapshot 接线或显式登记 design-reserve（二选一，不得静默滞留）；预期删除本体 = tryLoadHtml2canvas 手写 promise 管理与 `mod.default || mod` cast；回归 = kanban-export 单测直通 + calendar 导出失败 banner 用例直通；影响面 = scheduling 包内 + 主 chunk 体积（减法）。
3. **dashboard 运行态回接 layout-math（WA-dashboard-001）**：根因修复点 = resolveLayoutProps 改调共享 resolver + buildPanelFragment 提取进 layout-math（pathSuffix 参数化）；预期删除本体 = 12/40/8 双源与 fragment 双份（含 2 处 `as unknown as` seam 之一）；回归 = dashboard 双套件直通；影响面 = dashboard 包内零公共导出语义变更。

### 4. 误报排除清单（22 项）

| #   | 疑似点                                                                                   | 位置                                                                                                  | 排除理由                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `(ZXingFormat as any)[zxingName]`                                                        | barcode-detector-utils.ts:33                                                                          | D：第三方枚举反查（@zxing BarcodeFormat 无索引签名），动态边界一次性收窄；注释在案                                                                                    |
| 2   | `as unknown as ZxingReaderLike`                                                          | barcode-detector-utils.ts:41                                                                          | D：带注释显式结构契约（:13-17 声明替代裸 any 的收窄形态）——正确用法                                                                                                   |
| 3   | `(window as any).BarcodeDetector`                                                        | barcode-detector-utils.ts:106                                                                         | D：宿主环境能力探测（§2D 动态边界豁免）                                                                                                                               |
| 4   | `advanced: [{ torch: true }] as any`                                                     | use-barcode-torch.ts:76                                                                               | D：MediaTrackConstraints.torch 未入 TS DOM lib；失败路径 console.error + state 双观测                                                                                 |
| 5   | `(resolved as any).data` ×2                                                              | calendar/calendar.tsx:78/80                                                                           | I 邻：deprecated `data` 字段 compat shim，**带 console.warn 观测**（:80-82）；watch 微注记：删除时限未登记，建议随下次触碰按 deprecated-feature-cleanup 补台账        |
| 6   | `(task as any)[column.name]`                                                             | gantt/gantt-grid.tsx:84                                                                               | D：schema 动态列读（columns 由 schema 声明，具名列前五型化后 default 兜底）                                                                                           |
| 7   | `createGanttStore as unknown as new`                                                     | gantt/gantt-store.ts:467                                                                              | I：@deprecated 注册别名，TSDoc 完整陈述机制与删除意向；watch 微注记：design 文档未见构造器弃用记录，docs record 待补                                                  |
| 8   | `(cfg as any).collapsed`                                                                 | use-kanban-board-state.ts:100                                                                         | D：`columnsConfig` schema 面本身 `Record<string, any>`（any 上 as any 为 no-op）；真实修法是 schema 字段型收紧（KanbanColumnConfig.collapsed 已存在）——watch 微注记   |
| 9   | `(window as unknown as Record<string,unknown>)['__flux_pivot_*']` ×2                     | pivot-renderer.tsx:65/72                                                                              | E 邻：scada `__flux_scada_<cid>` 先例的诊断锚（:59-60 注释引用先例 + id 化变体裁定）                                                                                  |
| 10  | setTimeout ×4 采样轮询                                                                   | use-barcode-detect.ts:71/78/84/123                                                                    | C：条码检测的帧采样循环本体（interval schema 可配 300ms 默认），非等待外部就绪；AbortController + clearTimeout 清理对称                                               |
| 11  | setTimeout 退避重试                                                                      | prepare-wasm-utils.ts:35                                                                              | C：§2C 明示豁免（MAX_RETRIES=3 + 线性退避具名常量，INV-1 fail-closed 注释完整）                                                                                       |
| 12  | setTimeout(500) 长按                                                                     | use-calendar-drag-create.ts:182                                                                       | C：长按手势阈值（longPressMs 具名可配）——手势时序本体；1-8/G4-R3-视角10-02 裁定注释在案                                                                               |
| 13  | setTimeout(65000) 看门狗                                                                 | use-calendar-export.ts:29                                                                             | C 邻：60s AbortSignal + 5s 余量的挂死看门狗（防 html2canvas 永不 resolve 卡死 exportingRef）；watch 微注记：无数值推导注释，随下次触碰补一行                          |
| 14  | querySelector 焦点/滚动族                                                                | kanban-board.tsx:344/352（scrollTo\*）、kanban-column.tsx:218（roving focus 落点）、month-view:137 等 | E：命令式滚动合法面（wa-7 #9 判例）+ roving 落点（声明式 tabIndex 已管归属，querySelector 仅执行 focus()）；month/week/day walker 的复制维度归 WA-scheduling-001      |
| 15  | updateRowAria DOM 直写                                                                   | use-gantt-keyboard.ts:30-40                                                                           | CX-11 族扩围登记（+1 定义位）：自有子树 [data-task-id] 寻址；grid 行已声明式携带 aria-selected/tabindex，DOM set 是冗余镜像、focus() 是唯一真实需求——跨引用不独立立案 |
| 16  | drop-target/dragging 属性直写                                                            | calendar.tsx:379-397、use-kanban-board-effects.ts:167-178                                             | 立案沉淀：WA-scheduling-004                                                                                                                                           |
| 17  | elementFromPoint 命中族                                                                  | calendar.tsx:264-273（getCellFromPoint）、gantt-links.tsx:83、use-gantt-link-draw.ts:77               | E：React 数据流外的指针命中几何（拖拽会话本体）；gantt-links 的合成事件维度归 WA-scheduling-006                                                                       |
| 18  | `dispatchEventRef`                                                                       | dashboard-editor-renderer.tsx:132-149                                                                 | 命名撞车（schema 事件派发助手，非 DOM dispatchEvent）；门禁/扫描误报。watch 微注记：建议更名 dispatchSchemaEvent 消歧                                                 |
| 19  | scheduling-renderer-definitions 内部/跨包 test-support 高窗对                            | scheduling-renderer-definitions.ts ↔ dashboard test-support/editor-definitions                        | 声明注册表格化形态（wa-6 #20/#24、wa-7 #22 判例）；fields 表复制维度归 WA-dashboard-002/CX-15                                                                         |
| 20  | types 四文件互 dup（calendar.types↔gantt.types↔kanban.types↔barcode-input.types 高窗对） | scheduling 各 \*.types.ts                                                                             | 类型声明表（字段行归一化后同形）；无可执行语义，§3 表格化排除                                                                                                         |
| 21  | isDevRuntime 本地副本 ×2                                                                 | pivot-warn.ts:1、use-kanban-column-aggregate.ts:7                                                     | 跨引用 wa-6 WA-data-003 家族（watch-only）：本批 +2 扩员证据，不另立；共享 dev-runtime 收敛随该 watch 项                                                              |
| 22  | board-meta/`useEffect(() => setActiveText(debouncedValue))` 镜像                         | use-kanban-filter.ts:20-22                                                                            | React 19 惯例偏差（渲染期派生即可）；AGENTS.md 惯例 watch 微注记，非临时方案                                                                                          |

（另三条微注记不入表：①gantt.types.ts 七个 @deprecated schema 字段（scales/startDate/endDate/childrenField/initiallyExpanded/progressBarHeight/calendar）——生产消费 0、`flux-guide/design-patterns/gantt.md:188` 已记录弃用映射 ✅ 注册成立；watch 微注记：运行时对误用零告警，calendar `data` 字段的 console.warn 是更优形态；②calendar.types.ts:87 `CalendarResource.text` @deprecated——消费面 `resource.title || resource.text` 回退链 ~8 处，注册成立，同上 watch；③KanbanSchema `data/configMap/columnsConfig?: any` 声明面 any——与 #8 同根，schema 字段型收紧随车。）

### 5. 范围整体判断

**不是系统性临时方案文化——这是全仓库登记文化最强的一批，问题形态是「新建包的复制沉积 + 少量未接线层」，而非「按住问题的特判/兜底」。** 正面证据五件：①裁定注释密度全库最高（[G4-视角*]/[2-xx]/[22-xx]/[1-x]/plan 编号贯穿 scheduling 全部核心文件，仅 barcode-input 族即 10+ 处显式裁决注释）；②症状性 commit message **0**（抽检 30 条全带 plan 引用与根因链）；③**async 门禁 20 命中零静默**——本批所有 catch 均有用户可见错误面/i18n 文案/console.error 结构化观测（对照 wa-7 的 syntax-highlight 恒抛静默，本批无一件同类形态），失败观测面是三包一致性的强项；④懒加载收敛（c21e2dea9）live 双位点验证通过，cq-3 事件 ctx 单源零复发；⑤IS-2/3/5（plan 545/546/548）刚对三包交互态做过行为级修复批，本批与其零交叠零翻案。问题集中在两处：**scheduling 的"波次平行生长"沉积**（calendar 三视图 walker、date 原语、undo 双轨——同包三族组件各自带一份骨架，b73f24ab7 式"同 commit 三落"是典型信号）与**dashboard 新包的"共享面止步层"**（layout-math 已建而 renderer 半接入）。全批唯一 P1 是复制沉积型而非行为缺陷型。整体判断：零星个案级，无需 roadmap 层面对策；建议下一波 scheduling 特性（如第四视图/新命令类型）落地前先落本批的三个提取项，把"每次新特性各抄一份骨架"的斜率压平。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID                            | 严重度 | 建议去向                                 | 修复要点                                                                                                                                                                                                                      | 约束                                                                   |
| ---------------------------------- | ------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| WA-scheduling-001                  | P1     | 批内修                                   | 提取 `moveGridFocus(e, {selector, colStride, rowStride})`（或 hook 形态）单份；month/week/day 三调用点改写；三套选择器语义一次裁定并注释                                                                                      | 三视图键盘钉测试先红后绿；kanban 声明式 roving 不强并（裁定注释）      |
| WA-scheduling-002                  | P2     | 装载收敛批内修 + 接线显式裁决            | calendar html2canvas 迁 `createLazyLibLoader`、删 kanban 手写 loader；kanban-export 按 design-export-snapshot 接线（KanbanHandle 补 saveSnapshot/loadSnapshot + toolbar 入口）**或**文件头登记 design-reserve——二选一不得静默 | 接线若超批内预算 → successor-required 显式登记；kanban-export 单测直通 |
| WA-dashboard-001                   | P2     | 批内修                                   | resolveLayoutProps 改调 resolveCols/resolveRowHeight/resolveGapPx；buildPanelFragment 提取（pathSuffix 参数化）双位点改调用                                                                                                   | 零公共导出语义变更；dashboard 双套件直通                               |
| WA-scheduling-003                  | P3     | 批内修                                   | kanban-column/header region prop 改 `RenderRegionHandle`，删 4 处 `as any`                                                                                                                                                    | typecheck + kanban 套件直通                                            |
| WA-scheduling-004                  | P3     | 挂账观察                                 | 拖拽视觉态声明化（随下次触碰任一位点顺带）                                                                                                                                                                                    | 行为保持；calendar/kanban 拖拽 e2e 直通                                |
| WA-scheduling-005                  | P3     | 批内修（最小面）                         | FIXME 挂 plan 编号或改写为裁定注释；进阶 kanban undo/redo switch 表驱动（可选）                                                                                                                                               | design-undo-redo.md 无需改动                                           |
| WA-scheduling-006                  | P3     | 挂账观察                                 | gantt-links 宽命中面手工合成 PointerEvent 转发拖拽启动（isTrusted/捕获语义断裂风险）                                                                                                                                          | 随 gantt 族下次触碰评估                                                |
| WA-scheduling-007                  | P3     | 挂账观察                                 | useBarcodeCamera 暴露 readiness promise → 删轮询（随 barcode 族下次触碰）                                                                                                                                                     | torch 可用性钉测试先行                                                 |
| WA-scheduling-008                  | P3     | 挂账观察                                 | date-primitives 提取（diffInDays 取整语义需显式拍板）                                                                                                                                                                         | 与下次 date 修复合车                                                   |
| WA-scheduling-009                  | P3     | 批内修                                   | gantt 键盘 case 收敛 shiftTaskDates/resizeTaskEnd 微原语 + ArrowLeft/Right 参数化合并                                                                                                                                         | 行为保持提取；gantt 家族套件直通                                       |
| WA-dashboard-002                   | P3     | 批内修                                   | initFluxI18n 移入工厂体；定义表改 `{...base}` 派生                                                                                                                                                                            | dashboard 套件直通；表复制维度归 CX-15                                 |
| WA-dashboard-003                   | P3     | 批内修或 watch（Phase 2 裁量，不得静默） | sessionChange effect 补 `[core, session]` deps + 判别测试（父级重渲染不派发）                                                                                                                                                 | 先红后绿                                                               |
| WA-pivot-001                       | P3     | 批内修                                   | `pivot-vocabulary.ts` 单份词表 + 三处改引                                                                                                                                                                                     | typecheck + pivot 套件直通                                             |
| WA-layout 侧跨引用（不在本批立案） | —      | CX-11 扩围登记                           | use-gantt-keyboard updateRowAria（+1 位点）                                                                                                                                                                                   | 归 CX plan                                                             |

## 批内修复记录（Phase 2 执行回写）

> 本节由 Phase 2 执行会话回写（本报告为 review-only 取证产出；修复落地后按 wa-6/wa-7 先例补录"落地/验证"两列表格，并在台账 findings 行翻转状态）。

| 发现 ID           | 落地                                                                                                                                                                                                                                                                                                                                                                              | 验证                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WA-scheduling-001 | 提取 `calendar/grid-roving-focus.ts`（`moveGridFocus(e, {selector, colStride, rowStride, onMove})` 单份）；month/week/day 三视图 handler 改写为视图特定薄壳（weekend 守卫/Enter 语义/focusedCell 同步保留视图侧）；三套选择器语义一次裁定（grid anatomy 真实差）落共享模块注释；kanban 声明式 roving 不强并（month `indexOf(-1)` 边缘行为差异不可达：空占位格不可聚焦，注释在案） | 特征化钉测试 `calendar-roving-focus.test.tsx` 8 用例先钉现行为 8/8 → 提取后 8/8 同绿 + 既有 week/day 键盘套件 + month keyboard-create 套件同绿（14/14）；calendar 家族全绿 |
| WA-scheduling-002 | 装载收敛批内修：新建 `shared/html2canvas-loader.ts`（`createLazyLibLoader` 单份），calendar `use-calendar-export` 静态 import 迁 lazy（主 chunk 摘除 ~200KB）、kanban 手写 `tryLoadHtml2canvas`+`Html2CanvasFn` 删除（soft-null 分支一并删除：abort 路径不可达、load 失败改为错误直传更可观测）；`kanban-export.ts` 文件头显式登记 DESIGN-RESERVE, UNWIRED 状态                   | kanban-export + calendar export-handle/banner 套件 23/23 同绿；接线归 successor-required（台账行显式登记）                                                                 |
| WA-scheduling-003 | `KanbanColumnProps`/`KanbanColumnHeaderProps`/`KanbanCardProps` 四 prop 窄类型改 `RenderRegionHandle`（flux-core 共享类型）；board 四处 `as any` 本体删除；渲染边界单次 `as React.ReactNode` cast 收敛（calendar event-template 同款惯例）                                                                                                                                        | scheduling typecheck 绿 + kanban 套件直通；`grep 'as any' kanban-board`=0                                                                                                  |
| WA-scheduling-005 | `gantt/undo-stack.ts:193` FIXME 改写为裁定注释（WA-scheduling-005 锚，双轨=deliberate design，出现第三命令消费者才考虑统一）——无出口待办本体消除                                                                                                                                                                                                                                  | `grep FIXME` scheduling 非测试 src = 0                                                                                                                                     |
| WA-scheduling-009 | `handleBarKeyAction` 四 case 提取 `shiftTaskDatesUtc`/`resizeTaskEndUtc` 微原语（move-up/down 合并为双标签 case、resize 边界校验保留调用点）；`use-gantt-keyboard` ArrowLeft/Right 镜像合并为单参数化块（isOpen 极性参数化）                                                                                                                                                      | gantt 家族 29 文件 356/356 全绿（含键盘操作既有用例）                                                                                                                      |
| WA-dashboard-001  | `layout-math.ts` 导出 `buildDashboardPanelFragment`（`as unknown as BaseSchema` seam 单份化）；`resolveLayoutProps` 改调 `resolveCols/resolveRowHeight/resolveGapPx`（12/40/8 双源消除）；editor renderer fragment 装配改共享单份                                                                                                                                                 | dashboard 93/93 全绿（renderer+editor 双套件）+ typecheck 绿                                                                                                               |
| WA-dashboard-002  | `test-support.tsx` 模块顶层 `initFluxI18n` 移入 `createDashboardSchemaRenderer` 工厂体（WA-content-009 同族模式消除）；三份定义表改 `{...production}` 派生（editor×2+dashboard，字段新增不再静默失真）                                                                                                                                                                            | dashboard 93/93 全绿；表复制维度归 CX-15                                                                                                                                   |
| WA-dashboard-003  | sessionChange effect 补 `[core, session]` deps（逐 render 派发→逐 session 派发）                                                                                                                                                                                                                                                                                                  | 判别性测试（rerender 变更 statusPath 强制编辑器重渲染断言派发数不变）——修复在位绿；deps 临时回退红态恰现 `expected 2 to be 1` → 恢复后 23/23                               |
| WA-pivot-001      | 新建 `pivot-vocabulary.ts`（三词表 `as const` + `typeof` 派生联合）；schemas 联合改 re-export、definitions validator 列表与 option 归一列表改引、pivot-option 两处内联字面判断改 `includes`                                                                                                                                                                                       | pivot 66/66 全绿 + typecheck 绿                                                                                                                                            |

---

### 批内修复补充记录（Phase 2 执行回写·门禁）

- 三包 filter 四门禁：scheduling **1084/1084**（113 文件；lint 0 error）、dashboard **93/93**（lint 0 error 0 warning）、pivot **66/66** 全绿；build 三包 OK。
- 跨包哨兵（WA-7 教训条款）：flux-renderers-ai **850/850**（修复未触生产模块求值面，哨兵复跑确认）。
- 执行期尾修：gantt `oldEndDt` 未用变量、dashboard-renderer 未用 `BaseSchema` 导入、react-compiler 拒绝 eslint-disable 注释（去注释保 deps）——三处当场收敛。
- 三包 `index.ts` 零公共导出变更（`git diff --exit-code`）。
