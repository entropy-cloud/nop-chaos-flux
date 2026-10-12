# WA-13b 设计器渲染层审计批二（report-designer-renderers + spreadsheet-renderers + word-editor-renderers）临时方案与坏味道审计报告

> 批次: WA-13b（roadmap `docs/backlog/workaround-code-smell-audit-roadmap.md` Phase Status 对应行）
> 审计方法: `docs/skills/workaround-code-smell-audit-prompt.md`（九类信号 A–I + W1–W6 + §5 取证协议）
> 执行 plan: plan 574（`docs/plans/574-workaround-audit-wa13b-designer-renderers-2-plan.md`，draft review R1 revised 共识稿）
> 审计日期: 2026-10-11
> 对象清单来源: `docs/audits/workaround-code-smell/inventory/modules.json`（批次 = WA-13b 行，不手抄）
> 取证模式: **review-only**（本报告由独立取证 agent 产出；批内修复归 Phase 2 执行会话，台账登记归主会话——本报告不改任何源码/测试/台账）

## 快照基准注记

plan 574 基线记载五门禁基线 = WA-13a 收口 commit；本报告取证实跑时 HEAD = `30d54f4cc`（WA-13a 收口 commit 本体），**基线与实跑同锚**。三包**零在途**：`git status -s` 对三包全目录 = 0 文件，live = HEAD。

**三口径行数逐文件分解**（97 文件逐一 `wc -l` 对照 inventory `path:loc` 后缀）：

| 口径           | 全集行数 | 说明                                                                  |
| -------------- | -------- | --------------------------------------------------------------------- |
| inventory 口径 | 15,707   | WA-0 枚举器值（report 3,687 + spreadsheet 7,204 + word-editor 4,816） |
| live wc        | 15,707   | = inventory **逐文件零差**（97/97 逐字吻合，零在途漂移文件）          |
| HEAD wc        | 15,707   | = live（零在途）                                                      |

**基线候选 11 处全部复现**（grep 实跑与 inventory baseline 逐字吻合）：literalEn **0** + literalZh **0**（literalZh 探针**含测试文件**实跑 1 命中 = `spreadsheet-renderers/src/canvas-styles.test.ts:42` 说明性注释——描述 plan 476 已修 bug 的历史守卫语义，非待办/绕过标记，豁免；inventory 生成器排除测试面故记 0，非矛盾）+ typeBypass **5**（report 1 + spreadsheet 1 + word-editor 3，逐处落字见误报排除清单 #1/#2）+ setTimeout **5**（report 1 + spreadsheet 0 + word-editor 4，与 plan 574 draft review M1 修正后的拆分 1/0/4 逐字吻合）+ domRaid **1**（spreadsheet-grid.tsx:175）。keyRemount/pixelNudge/testEnvBranch/silentCatch 四探针全零实跑复核。

oversized 门禁口径：三包 ≥500 行非测试源 **3 件**全部 WARN 档——report page-renderer.tsx 682、report-designer-manifest.ts 528、spreadsheet spreadsheet-grid/table-shell.tsx 543（inventory 口径）。注：plan 574 基线记载 3 件行数统一 +1（683/529/544），系 plan 拟制时统计口径偏差（wa-13a 同款注记），以 inventory/`wc -l` 为准——3 件集合本身两口径一致，全部纳入结构走读全读。

## 覆盖声明（Coverage Declaration）

> 本节是台账 modules 行 `pending → audited` 翻转与 `pnpm workaround:reconcile` 结构校验的依据。

| 模块 id                   | 文件数 | 非测试行数                                             | 取证完成 | 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | ------ | ------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| report-designer-renderers | 20     | 3,687（inventory）/ 3,687（live wc）/ 3,687（HEAD wc） | ✅       | 20/20 **全文覆盖读取**（零抽样档）：≥500 行 2 件全读（page-renderer 682 逐行精读[含 plan 444/02-N3 抽取评估注释核对 + 双通道 scope 装解读] + report-designer-manifest 528 全文核对[契约形状声明件]）+ bridge/helpers/host-action-provider/host-data/index/inspector-shell/page-renderer-snapshots/renderers/report-designer-inspector/toolbar-defaults/toolbar-helpers/toolbar/field-insert/field-panel/field-panel-renderer/report-spreadsheet-canvas/schemas/types 全读；typeBypass 1 + setTimeout 1 逐个定性；async 5 行逐条定性；perf 1 定性（死代码本体）；git 考古 8 commit（b583fdf79/eb99fc99f/49523aeb7/dd72a80b3/da067c238/25b60edc2/9fac35dfd/667d5d7c3）                                  |
| spreadsheet-renderers     | 47     | 7,204（inventory）/ 7,204（live wc）/ 7,204（HEAD wc） | ✅       | 47/47 **全文覆盖读取**：≥500 行 1 件全读（table-shell 543 逐行精读）+ spreadsheet-grid 478/grid 子目录 7 件（constants/viewport/inline-controls/overlay-controls/context-menu/use-context-menu-actions/types）+ interactions 15 件全读 + use-spreadsheet-interactions 417 + default-page-body 252/page-renderer 274/renderers/bridge/fire/host-action-provider/index/page-model/sheet-tab-bar/cell-style-map/manifest-shapes/manifest/contracts-core 379/contracts-formatting 418/toolbar 6 件/types 全读；typeBypass 1 + domRaid 1 逐个定性 + 走读新增 dispatchEvent/elementFromPoint 位点定性；async 4 行逐条定性；git 考古 6 commit（4252b36db/723ebea3e/e72409737/adf9f8816/f084fe1d2/44e455aa8） |
| word-editor-renderers     | 30     | 4,816（inventory）/ 4,816（live wc）/ 4,816（HEAD wc） | ✅       | 30/30 **全文覆盖读取**：word-editor-page 388/hooks 4 件（state 313/save 121/actions 153/shortcuts 107）全读 + editor-canvas 187/toolbar 10 件（ribbon/font 251/insert 191/page 197/paragraph/search-replace 117/shared/template/zone）/panels 4 件（outline 259/dataset 243/field-list/template-snippets）/dialogs 4 件（chart 294/dataset 278/code 194/expr-insert 179）/preview/renderers/manifest 215/action-provider 208/types/index/template-tag-helpers 全读；typeBypass 3 + setTimeout 4 逐个定性；async 8 行逐条定性；git 考古 6 commit（9e3559231/09447cf00/6550cf705/590e94da0/40db36fc1/44e455aa8）                                                                                        |

全集 **97/97**。重复块探针双版（存 `_tmp/wa13b-dup-probe.mjs` 逐字版：12 行窗 + 熵 ≥3.2 + 全可执行行过滤，97 非测试文件 6,657 窗 → **39 组**；`_tmp/wa13b-dup-probe-normid.mjs` 标识符归一版：熵 ≥2.6 + 均匀表剔除，5,533 窗 → **430 组**）。逐字 39 组人工同构复核：**2 组坐实**（host-data designer-bag ×8 窗[WA-reportr-005]、StyleToolType 双声明[WA-sheetr-004]）+ **1 组跨包孪生**（report page-renderer-snapshots ↔ spreadsheet page-renderer 快照切片族[WA-reportr-008]），其余 36 组为契约声明形状平行（manifest/contracts 形状字面）、props 管道镜像（父子组件接口/解构/透传）、handler 标识符清单三写、Dialog footer 脚手架 ×3——声明式契约与框架惯用非同根因复制。归一 430 组按文件对聚类复核：**最大簇全部为同文件自重叠假阳性**（contracts-formatting↔自身 106、contracts-core↔自身 82、toolbar-groups↔自身 54、context-menu↔自身 30、font-controls↔自身 30、use-style-commands↔自身 37——switch 分派臂与 ToolbarButton/ContextMenuItem 声明脚手架的滑窗自交）；真实跨区命中与逐字版坐实组一致 + dataset-panel↔field-list（WA-wordr-002）——与走读捕获全并集，零漏检。

### 门禁交叉实跑读数（prompt §5 第 5 步留痕）

| 门禁                                   | 读数                                                                              | 处置                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check:audit-async-failure-paths`      | **17 行命中**（report 5 + spreadsheet 4 + word 8，与 plan 基线逐 file:line 吻合） | 17 行逐个定性、未批量放行亦未批量立案：**13 处豁免**（结构化失败路径/注释声明 best-effort/平台语义降级，明细见下表）+ **0 行独立立案**（word font:43、zone:51 两行并入 WA-wordr-004 的 catch 族立案；spreadsheet use-selection:92/:124 的观测断链问题归 WA-sheetr-001 通道级立案）。                                        |
| `check:audit-performance-suspects`     | **1 行命中**（report helpers.ts:38，与基线吻合）                                  | **立案归并**：`formatMetadataValue` JSON.stringify 为**零消费死代码本体**（全仓无调用点）——归 WA-reportr-002 删除即消，非「stringify 做重对象变更检测」红形态。                                                                                                                                                             |
| `check:audit-runtime-raw-schema-reads` | **0**                                                                             | 实跑确认（三包 schema 面均走 defineSchema 类型承接 / renderer fields 注册 / host projection 契约面）                                                                                                                                                                                                                        |
| `check:audit-hardcoded-type-dispatch`  | **0**                                                                             | 实跑确认（spreadsheet context actions 走命令联合类型 dispatch 直通、word action-provider 走 createHostMethodValidator 契约闸、report toolbar 走 toCommand 白名单映射——均非 type 字面量分派红形态）                                                                                                                          |
| `check:audit-reactive-render-reads`    | **0**                                                                             | 实跑确认（三包 store 消费全部经 useSyncExternalStore(WithSelector)/useSnapshotSelector/useBridgeSnapshot 订阅；report page-renderer:468 的 `spreadsheetCore.getSnapshot()` 渲染期直读有同组件 useSyncExternalStoreWithSelector 订阅驱动重渲染兜底 + ReportDesignerHostScopeSync 反应式 replace 双通道——见 watch 微注记 #1） |
| `check:audit-renderer-browser-io`      | **0**                                                                             | 实跑确认（三包零 fetch/localStorage/sessionStorage 直连命中；word-editor localStorage 读写全部经 word-editor-core persistSavedDocument/loadRecoveredState 宿主封装）                                                                                                                                                        |

### async 门禁 17 行逐条定性（prompt §5 第 3 步留痕）

| 位点                                        | 外层机制                                                           | 判定                                                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| report report-field-panel.tsx:40            | `setDragImage` catch → ghost.remove + 降级默认截图                 | 豁免——注释自证（「宿主可能存在 setDragImage 但抛 Not implemented（happy-dom 等）——降级默认截图」）；HTML5 DnD 平台语义 + 视觉性降级（wa-13a 误报 #7 判例族）               |
| report report-field-panel.tsx:111           | 拖拽载荷 `JSON.parse` catch → undefined                            | 豁免——同源自产载荷（writeReportFieldDragPayload 同 MIME 写入），无效载荷 → 不插入语义（wa-13a canvas-bridge dataTransfer 判例同族）                                        |
| report report-designer-toolbar.tsx:55       | `handleButtonClick` catch → reportRuntimeHostIssue（:56-71）       | 豁免——结构化路由闭环（同函数 :39-54 result-not-ok 分支同通道）                                                                                                             |
| report report-designer-toolbar.tsx:148/:174 | `void handleButtonClick(item)` 两处按钮外呼                        | 豁免——失败观测在被调函数内闭环（try/catch + host issue），void 为事件处理器惯用                                                                                            |
| spreadsheet use-selection.ts:92/:124        | catch → `addLog(formatFailureMessage(...))`（AbortError 分流在案） | 结构豁免 + **通道立案**——catch 形态有观测意图与 Abort 分流，但 addLog → `onLog?.()` 两消费方均不传 → 默认装配零反馈（归 **WA-sheetr-001** 通道级立案，不在此两行重复立案） |
| spreadsheet fire.ts:2                       | `void fn()` 转发器本体                                             | 豁免 + watch——安全依赖「core dispatch 不 reject」in-band 协议（core-dispatch.ts:19-25 try/catch 包裹实读核验），前置条件无声明 → **WA-sheetr-009**                         |
| spreadsheet default-page-body.tsx:146       | `void handleEditSave()` 外呼                                       | 豁免——use-editing handleEditSave 内部 editSaveState 状态机（saving/cancelled/failed）+ SpreadsheetEditStatus role=alert 上屏（inline-controls.tsx:62-77）                  |
| word word-editor-page.tsx:101               | `persistSavedDocument` catch 空体                                  | 豁免 + watch——注释自证 best-effort（「non-critical if localStorage is unavailable」）；触发时不可观测（watch 微注记 #2）                                                   |
| word toolbar/zone-controls.tsx:51           | `executeSetZone` catch 空体（注释自证 canvas 拒绝语义）            | **并入 WA-wordr-004**——静默 + 先 store 后 canvas 顺序耦合（失败后高亮态失真无回滚）                                                                                        |
| word toolbar/insert-controls.tsx:63         | image 插入 catch → notifyInsertFailure → env.notify                | 豁免——结构化（唯消息裸英文归 WA-wordr-009）                                                                                                                                |
| word toolbar/font-controls.tsx:43           | `runCommand` 静默 catch（注释自证无编辑区拒绝语义）                | **并入 WA-wordr-004**——15 个样式按钮全走静默包装，触发不可观测                                                                                                             |
| word panels/outline-panel.tsx:86/:146       | getValue/executeLocationCatalog catch → console.error + 空态回退   | 豁免——有观测（console.error）+ UI 空态降级                                                                                                                                 |
| word hooks/use-word-editor-save.ts:85       | save invoke catch → abort 分流 + env.notify                        | 豁免——AbortError 三重判别（:88-94）+ 通知面完备                                                                                                                            |
| word editor-canvas.tsx:56                   | 自动保存快照 catch 空体                                            | 豁免 + watch——注释自证 best-effort（「keep editing interactive」）；同 :66-68 word count 刷新 best-effort（watch 微注记 #2）                                               |

## 取证执行记录（prompt §5 八步逐条）

1. **字面扫描**：`TODO|FIXME|HACK|WORKAROUND|XXX` 非测试 = **0 命中**（含测试面亦零）；`临时|先这样|暂时|绕过|workaround|hotfix` 非测试 = **0 命中**，含测试面 1 命中（canvas-styles.test.ts:42 历史行为说明注释，豁免）——与 inventory literalEn 0 + literalZh 0 基线吻合（wa-10 之后连续第三个非测试面双零批组）。
2. **模式候选 11 处逐个定性**（grep 复现与 inventory 计数逐字吻合）：typeBypass 5 = **5 处全豁免**（三包 defineSchema 动态边界 ×3 + word action-provider validator 契约验证后窄化断言 ×2——双重验证纵深，cq-2 validator 家族判例）；走读另捕获 **2 处基线外 D 类**（`snapshot as ReturnType<...>` 切片冒充满血快照 ×2，grep 对裸 `as X` 形态盲区）→ WA-reportr-006。setTimeout 5 = **5 处全豁免**（ghost 清理[平台 API 语义] / editor-canvas 500ms debounce[cq-2 Phase 3 注释纪律正面样板] / outline 500ms coalesce / search 300ms 输入防抖 / save 2000ms 瞬态消息计时器——零时序贿赂）。domRaid 1 = **豁免**（自持表格单元格命令式焦点，wa-7 #9 判例族）；走读新增：dispatchEvent 合成重放 ×1 → WA-sheetr-006、elementFromPoint 拖拽追踪 ×2 → 豁免（自持 DOM dataset 命中链）。
3. **门禁交叉**：上表 6 项实跑；async 17 行逐条定性（13 豁免 + 3 行并入 2 条立案 + fire.ts 转独立 watch 立案）；perf 1 死代码本体归并立案。
4. **重复块识别**：双探针 + 人工同构复核坐实 **7 组**（跨包孪生 2 → WA-reportr-003/008[其一涉三包]、同包复制 4 → WA-reportr-004/005、WA-sheetr-003/004、WA-wordr-002[归一探针捕获]、同包死代码面 1 → WA-wordr-003[doc-preview 自重叠窗为旁证]），其余 460+ 组为声明式契约平行/props 管道/自重叠假阳性（判据见覆盖声明）。
5. **范围结构走读**：**97/97 全文覆盖**（15,707 行，无抽样档）。≥500 行 3 件全读（page-renderer 682 与 table-shell 543 逐行精读 + report-designer-manifest 契约声明件全文核对）。分档落字：核心实现（report page-renderer/双 field-panel/host-data/toolbar 族/canvas；spreadsheet interactions 15 hook 全族/grid 全族/toolbar 族/manifest 契约族；word hooks 全族/toolbar 全族/dialogs 全族/panels/manifest/action-provider）逐行精读约 60 件；schemas/types/manifest-shapes/contracts/index/constants/viewport 声明与工具件全文过读 + 信号扫描。
6. **已收敛模式三档复核**：①cq-5（`4ee46b668` test-placement）——三包 inventory 无 test-support 面（生成器排除 `__tests__/`），contract-honesty 骨架不涉本批清单，**记不适用**；②cq-6（`2c94d9d7f`）——route table 形态 ✅ 三包 manifest 全部 manifestVersions Map + resolveXxxManifest 单源 live 在案；debug residue 面本批**非零复发 1 处**（`window.__NOP_WORD_EDITOR_PROBE__`，word-editor → WA-wordr-001，本批唯一复发点）；③WorkbenchShell 家族外壳（`232f54f4d`）零复发 ✅——三包 page renderer 全部消费 WorkbenchShell（report:644/spreadsheet:233[word 版注释自证 P2.1 收敛]/word-editor:341），零手拼三栏壳复发；④`@xyflow`/重库静态依赖——三包唯重库为 word chart-dialog 静态 import recharts：装载链 word-editor-page 经 createLazyRendererComponent 懒加载（renderers.tsx:16-20），与 wa-13a xyflow「renderer 级懒加载隔离」同款裁定设计内；watch 微注记 #6（renderers.tsx 顶部静态 import 与懒包裹并存的 dual-import 形态三包同型，与 wa-13a flow 判例一致不另立案）；⑤`dataPath` 双词汇 / strip errors / ajax 双份——三包 grep 全零，**记不适用**（renderer-browser-io 门禁 0 佐证无 ajax 面）。
7. **git 考古**：20 commit 溯源（详见逐条发现）。锚点核验——`b583fdf79`（IS-4/plan 547 收口：report-field-insert.ts「700 行门禁内抽离」出生 commit 实证，cellAddress 私有复制即此诞生；SS-1 bridge hasSelection kind 判别属 spreadsheet-core/demo 侧不涉本批文件）、`232f54f4d`（P2.1 WorkbenchShell——spreadsheet page-renderer:231-232 注释逐字在案）、`738984e7a`（ux-r9 RD-1/2/3——demo 侧样本报表/RD-2 面板/RD-3 fx 徽标，本批 grid 内 fx span 消费面核对一致）、`25b60edc2`（plan 528——report-field-panel ghost/检索/可调宽注释逐字在案）、`f5f2312a8`（plan 558——word-editor 预览条 overflow 修复落点 doc-preview-page/word-editor-page 邻域核对）、`2c94d9d7f`（cq-6——debug residue 复发点即 WA-wordr-001）。**症状性 message 专项**：抽检三包 2026-06-01 以来 commit 30 条（全集 38 条），30/30 带 plan 引用/根因链/full-green 标记/审计锚——**症状性 message 0**。
8. **误报排除复核**：24 项全记录（§误报排除清单）；与 wa-7（命令式焦点）/wa-8（宿主集成边界）/wa-10（eager renderers、防抖 coalesce）/wa-13a（defineSchema 判例、拖拽 ghost #7、同源自产载荷 #15、测试通道豁免 #21、CX-16 菜单壳交界）判例互通。

## 逐条发现（Findings）

> 每条按 12 字段模板（id/位置/信号类别/症状/根因/考古/严重度+判据/修复方向/去向/验证方式/现状/跨批关联）；全量登记归主会话写入 `docs/audits/workaround-code-smell/ledger.md`（ID `WA-reportr-001`/`WA-sheetr-001`/`WA-wordr-001` 起各自顺延，三位零填充），本节与台账一一对应，零静默。
> ID 编排说明：立案 **27 条 = P1 ×1 + P2 ×3 + P3 ×23；零 P0**（WA-reportr-003 按「≥3 份同根因 + 已漂移」P1 坐实，降档考量显式记录于该条）。

### WA-reportr-001 [H] cellAddress 私有复制：canonical 单源已在依赖包，抽离时手写第二实现

- **位置**: `packages/report-designer-renderers/src/report-field-insert.ts:63-66`（私有 `cellAddress` 递归版）↔ `packages/spreadsheet-core/src/types.ts:291-299`（canonical `cellAddress` while 版，公共导出）
- **信号类别**: H（同一基础设施多处手写——canonical 就在本包已依赖的 spreadsheet-core 且同包姊妹件已消费）
- **症状/根因**: 同包两态并存——report-spreadsheet-canvas.tsx:6 `import { cellAddress } from '@nop-chaos/spreadsheet-core'` 消费单源，report-field-insert.ts 手写递归实现（语义逐例核对等价：bijective base-26，col=0→'A'、col=26→'AA' 两实现一致）
- **考古**: report-field-insert.ts 出生 `b583fdf79`（2026-10-08，plan 547/IS-4），commit message 明载「700 行门禁内抽离」——抽离压力下新模块自带私有实现而非 import（import 本不增行）
- **严重度**: P3（判据：2 份 ×4 行同根因微复制、零漂移、收敛干净=改 import 一行）
- **修复方向**: 删私有实现，改 `import { cellAddress } from '@nop-chaos/spreadsheet-core'`（既有公共导出，本包 index.ts 零变更）
- **去向**: fixed（批内修）
- **验证方式**: report/spreadsheet filter 四门禁全绿；report-field-insert 相关单测直通；`grep -c "function cellAddress" packages/report-designer-renderers/src` = 0
- **现状**: live（本报告 HEAD 快照）
- **跨批关联**: plan 547/IS-4（出生锚）；spreadsheet-core 本体不涉（WA-12 范围外无修改）

### WA-reportr-002 [I 邻] helpers.ts 三函数死导出：零消费 5.5 个月 + perf 门禁命中本体即死代码

- **位置**: `packages/report-designer-renderers/src/helpers.ts:3-5`（joinClassNames）、`:16-32`（formatSelectionLabel）、`:34-39`（formatMetadataValue）——四导出仅 getFieldCount 存活（3 个消费方）
- **信号类别**: I 邻（死代码/化石特征：无 barrel 导出、无包内消费、无跨包消费、无测试引用）
- **症状/根因**: 全仓 grep（packages/+apps/，含测试）三函数零调用点；helpers.ts 未进 index.ts barrel——「预置工具函数」出生即半数落空，inspector 重构后又失去最后消费者
- **考古**: 出生 `eb99fc99f`（2026-03-25 report+spreadsheet 包首提交）；formatSelectionLabel 最后消费者移除于 `49523aeb7`（2026-04-30 inspector schema 化重构）——死龄 ~5.5 个月无出口；**perf 门禁 helpers.ts:38 命中（formatMetadataValue 的 JSON.stringify）即此死代码本体**
- **严重度**: P3（判据：记录性死代码 + 门禁噪声源；无行为危害）
- **修复方向**: 删除三函数（~30 行）保留 getFieldCount；perf 门禁命中随之消失
- **去向**: fixed（批内修）
- **验证方式**: report filter 四门禁全绿；`pnpm check:audit-performance-suspects` report 包读数 0；`grep -rn "formatSelectionLabel\|formatMetadataValue\|joinClassNames" packages/report-designer-renderers/src` 仅剩 dist/ 构建产物
- **现状**: live
- **跨批关联**: 无（wa-13a flowr-010 同为「收口波范围缺口」家族，但本案无用户可见面、纯内部）

### WA-reportr-003 [H] setDragImage 拖拽 ghost 三包三份：同日三波显式互抄 + 健壮性漂移已兑现

- **位置**: `packages/report-designer-renderers/src/report-field-panel.tsx:10-47`（setFieldDragGhost）↔ `packages/page-designer-renderers/src/palette-panel.tsx:22-57`（setPaletteDragGhost）↔ `packages/flux-renderers-industrial/src/editor/palette/palette-drag-ghost.ts:9-33`（setScadaPaletteDragGhost）
- **信号类别**: H（复制粘贴式增长——同波姊妹件三包不共享骨架，wa-13a WA-pager-001 跨包版×1.5）
- **症状/根因**: 「离屏 fixed ghost + setDragImage + 微任务清理」机制三份手写（各 ~30 行，样式 token 各域各异属设计内差异）；**已漂移**：report 版独有 `try { setDragImage } catch { ghost.remove(); return }` Not-implemented 降级（happy-dom 实测防御 + 注释在案），page/industrial 两份无此防御
- **考古**: 三份同日三波出生——`dd72a80b3`（plan 527 page 版先行）、`da067c238`（plan 531 industrial 版，commit 自述「527 setPaletteDragGhost 同款移植」）、`25b60edc2`（plan 528 report 版，头注释自述「对齐 page-designer 模式」）——**注释自证复制链**；漂移=report 侧后来单独补防御而未回填前两份
- **严重度**: **P1**（判据：§3「≥3 份且同根因 → P1 起评（已漂移则升 P0/P1）」；降档考量显式记录——单份 ~30 行总量小、浏览器真实环境三份行为等价、漂移位点仅测试环境健壮性差异——但漂移即「维护成本已兑现」的形式本体（第 4 份 copy 或 page 侧遇 happy-dom 同款抛错即再踩），维持 P1）
- **修复方向**: 提取共享 `setDragGhost(event, { label, testId, style })` 至 `@nop-chaos/ui`（三包已依赖 ui；纯 DOM 工具与 ui 现有原语互补）或 designer 共享层；三包改调用 + report 版防御语义上提为共享行为
- **去向**: successor-required=**CX-17**（共性裁定建议：跨包共享面新增，归属决策人工确认——沿 CX-16 先例）
- **验证方式**: CX 批内：三包 drag ghost 相关 e2e/单测直通（report-field-drag-ghost / page-designer-drag-ghost / scada-editor-drag-ghost testid 逐一保留）；三包 setDragImage 缺失环境降级路径断言
- **现状**: live
- **跨批关联**: plan 527/531/528（出生锚）；page-designer/flux-renderers-industrial 两份不在本批对象清单——本批立案位点为 report 份，收敛执行归 CX-17 批

### WA-reportr-004 [H] 字段面板双实现：schema renderer 与默认面板的 item-list 孪生（demo 抽取产物）

- **位置**: `packages/report-designer-renderers/src/field-panel-renderer.tsx:152-195`（ReportFieldPanelRenderer 的 source→group→field 渲染链）↔ `packages/report-designer-renderers/src/report-field-panel.tsx:176-237`（ReportFieldPanel 同链）
- **信号类别**: H（同包平行双实现——同一领域 UI 两套手写）
- **症状**: li 数据属性组（data-field-id/data-field-source-id/data-slot 名）/拖拽写入（writeReportFieldDragPayload）/插入按钮（aria-label `t('flux.reportDesigner.insertFieldToSelection')` + disabled 判定）近逐字 ~25 行 ×2；**已漂移**：plain 版有检索过滤 + drag ghost，renderer 版有键盘插入 + reportRuntimeHostIssue 错误路由——特性各偏一侧
- **根因**: 字段条目渲染（拖拽载荷 + 插入按钮 + 标签结构）无共享 home；plain 版系 `9fac35dfd`（2026-03-30）从 demo 抽取为「可复用组件」时诞生的第二实现
- **考古**: renderer 版出生 `eb99fc99f`（2026-03-25 包首提交）；plain 版 `9fac35dfd`——demo 组件化时复制而非抽共享条目件
- **严重度**: P3（判据：2 份 ×25 行同根因、活跃文件、漂移为特性分野非 bug；提取为纯机械重构）
- **修复方向**: 提取共享 `ReportFieldListItem`（props 注入拖拽/插入/禁用回调）或最小修=两文件互指注释声明特性分野；推荐前者（同包依赖方向零变更）
- **去向**: fixed（批内修）
- **验证方式**: report filter 四门禁全绿；field-panel/field-panel-renderer 相关单测 + report-designer e2e 直通
- **现状**: live
- **跨批关联**: plan 528 Phase 2（plain 版检索/ghost 登记锚）；page-renderer.tsx:587-609 消费 plain 版的 onFieldInsert 回调链保持不变

### WA-reportr-005 [H] host-data designer-bag 同文件复制 ~19 行：测试自证「same defensive copy strategy」的同步税

- **位置**: `packages/report-designer-renderers/src/host-data.ts:193-210`（createHostData.designer）↔ `:235-252`（buildReportDesignerScopeData.designer）
- **信号类别**: H（同文件行为块复制）
- **症状**: designer 子对象 16 字段组装逐字两份（含 fieldCount/fieldSourceCount 双计数）；测试 host-data.test.ts:304 专门断言「createHostData uses same defensive copy strategy as buildReportDesignerScopeData」——**测试在钉双份一致性，即同步修改税的制度化自证**
- **根因**: designer 投影袋无本地工厂；两导出函数各写一遍
- **考古**: host-data.ts 出生 `eb99fc99f`（2026-03-25）即双份形态
- **严重度**: P3（判据：2 份 ×19 行、同文件、逐字探针 8 窗命中；W3——字段增删需双处同步[测试已实际承担该职责]）
- **修复方向**: 提取私有 `buildDesignerBag(snapshot, fieldCount)` 单源，两函数消费；测试保持直通即验证等价
- **去向**: fixed（批内修）
- **验证方式**: report filter 四门禁全绿；host-data.test.ts 全套直通
- **现状**: live
- **跨批关联**: 附带注记——createHostData 生产面零消费（仅自测试 + index.ts 公共导出），若未来裁决公共导出收缩可另行评估（本批不动 index.ts）

### WA-reportr-006 [D] 切片冒充满血快照的断言 ×2：参数类型声明与实参结构不符，断言销毁证据

- **位置**: `packages/report-designer-renderers/src/page-renderer.tsx:243`（ReportDesignerHostScopeSync 内 `props.snapshot as ReturnType<ReportDesignerCore['getSnapshot']>`）+ `:467`（useHostScope 调用同款断言）
- **信号类别**: D（类型系统绕行——非 grep 形态的裸 `as` 窄化，基线外走读捕获）
- **症状/根因**: 实参是 `selectReportPageSnapshot` 的 12 字段切片（ReportPageSnapshotSlice），形参声明 `ReportDesignerRuntimeSnapshot` 满血快照——类型不符客观存在，断言压制；逐字段核对当前 buildReportDesignerScopeData 访问面恰好被切片覆盖（document/selectionTarget/inspector/fieldDrag/preview/activeMeta/fieldSources/canUndo/canRedo/dirty），**未来在 builder 内新增任一切外字段访问即静默 undefined**（编译器已被断言缴械）
- **考古**: 切片与断言随 page-renderer-snapshots.ts 抽取波落位（plan 444/02-N3 注释在案）；非近期回归
- **严重度**: P3（判据：潜伏型 D——无现行行为缺陷，但断言在销毁真实类型报警，W1 弱）
- **修复方向**: buildReportDesignerScopeData 形参收窄为结构类型（`Pick<ReportDesignerRuntimeSnapshot, ...12 键>` 或独立 interface），两处断言删除；本包文件零公共面变更
- **去向**: fixed（批内修）
- **验证方式**: report filter 四门禁全绿；`grep -c "as ReturnType<ReportDesignerCore\['getSnapshot'\]>" page-renderer.tsx` = 0
- **现状**: live
- **跨批关联**: 无（report-designer-core 类型面只消费不修改）

### WA-reportr-007 [A 邻] 'fieldCount' 跨文件字面契约：defaults 定义 id ↔ renderer 字符串特判本地化

- **位置**: `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:38`（`{ id: 'fieldCount', type: 'badge', ... }`）↔ `packages/report-designer-renderers/src/report-designer-toolbar.tsx:110`（`item.id === 'fieldCount' && /^\d+$/.test(text)` 触发计数本地化）
- **信号类别**: A 邻（特判字面量领域可解释[W6 弱满足]但常量定义在另一文件的字符串字面里——跨文件隐式契约，wa-13a WA-flowr-009 'CC' 同族）
- **症状/根因**: 默认工具条 badge 的本地化靠 renderer 侧对裸字符串 'fieldCount' 特判；宿主经 itemsOverride 换 id（或 defaults 改名）→ 本地化静默失效（显示裸数字）
- **考古**: 两侧随 `eb99fc99f` 同波落位（出生即耦合）；无单源化波次触及
- **严重度**: P3（判据：局部症状特判 + 隐式契约；W3/W6）
- **修复方向**: 共享常量（如 `TOOLBAR_FIELD_COUNT_ID` 于 defaults 导出，toolbar.tsx 引用）；随案注记：宿主自定义 badge 不享本地化为设计内（defaults 驱动面）
- **去向**: fixed（批内修——常量提取行为保持）
- **验证方式**: report filter 四门禁全绿；report-designer-renderers 单测直通；`grep -rn "'fieldCount'" src/ | grep -v test` 单源落字
- **现状**: live
- **跨批关联**: wa-13a WA-flowr-009 同族判例引用

### WA-reportr-008 [H] report↔spreadsheet 快照切片族跨包孪生 ~40 行：嵌入组合消费面的手抄镜像

- **位置**: `packages/report-designer-renderers/src/page-renderer-snapshots.ts:55-95`（ReportSpreadsheetSnapshotSlice + selectReportSpreadsheetSnapshot + equalReportSpreadsheetSnapshot）↔ `packages/spreadsheet-renderers/src/page-renderer.tsx:35-75`（SpreadsheetPageSnapshotSlice + selectSpreadsheetPageSnapshot + equalSpreadsheetPageSnapshot）
- **信号类别**: H（跨包复制——report 嵌入 spreadsheet 的消费面未获单源而手抄；逐字探针命中 equal 函数 12 行全窗）
- **症状/根因**: 8 字段切片 + selector + 逐字段等值函数近逐字两份（字段集/等值链完全一致）；spreadsheet 侧三函数**未从 index.ts 导出**（实测 barrel 无此三符号）→ report 无法合法 import，抄写为唯一路径；家族天然 home = spreadsheet-core（SpreadsheetRuntimeSnapshot 类型已在其侧）
- **考古**: report 份随 page-renderer-snapshots.ts 抽取波落位（plan 444 邻域）；spreadsheet 份随其 page-renderer 出生——双份平行演化无交互
- **严重度**: P2（判据：2 份、~40 行大块、同根因、两侧均在活跃修改期[spreadsheet 维度/slice 家族 723ebea3e 后持续触碰]；跨包提取涉公共导出/core 归属决策故不入批内修）
- **修复方向**: spreadsheet-core 增 `selectSpreadsheetPageSnapshot`/`equalSpreadsheetPageSnapshot`/slice 类型导出（SpreadsheetRuntimeSnapshot 同文件家族），两包消费——**spreadsheet-core 属 WA-12 范围，登记转发评估**（替代路径：spreadsheet-renderers index.ts 导出现有三符号——涉公共导出面，同样留人工）
- **去向**: successor-required（转发 WA-12 评估 home；本批不修）
- **验证方式**: WA-12 评估后：report/spreadsheet filter 四门禁 + `git diff --exit-code` 两包 index.ts；等值语义由现有单测直通保证
- **现状**: live
- **跨批关联**: WA-12（spreadsheet-core 并行批）；plan 444（抽取锚）

### WA-sheetr-001 [B] interactions 失败观测通道默认断链：addLog → onLog?.() 而两消费方均不接

- **位置**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:9`（`addLog = (msg) => { onLog?.(msg); }`）+ 全族 30+ 观测点（use-sheet-commands reportCommandResult:24-44、use-selection:92-97/:124-128、use-clipboard:45-49、use-fill-handle、use-resize endResize:134-138、use-find-replace、use-comments、use-spreadsheet-interactions handleCommandError:223-230）↔ 消费方 `default-page-body.tsx:51-56` 与 `report-spreadsheet-renderers report-spreadsheet-canvas.tsx:52-57` 均不传 onLog
- **信号类别**: B（防御式掩盖的镜像形态——失败路径存在且结构完整，但观测末端默认悬空：W4「守卫触发时谁能知道」= 无人）
- **症状/根因**: 默认装配（spreadsheet-page 宿主 + report 嵌入画布）下，全部命令失败（result.ok===false → reportCommandResult → addLog）、选择失败、剪贴板失败、resize 失败、find/replace 失败均零反馈零日志——失败观测在结构上接了线、在装配上断了路
- **考古**: addLog 随 `4252b36db`（2026-04-25）家族成形（demo 日志语义）；`723ebea3e`（2026-05-14 default-page-body 出生）起生产消费面即未接 onLog——demo 通道转生产未补宿主通知面
- **严重度**: P2（判据：低成本可修单点缺陷[接线]——demo 内存 store 失败率低故非 P1，但宿主 async 存储形态下全族失败静默）
- **修复方向**: default-page-body 与 report-spreadsheet-canvas 两装配点接 `useRendererEnv().notify`（warning）或 reportRuntimeHostIssue（report 侧现成先例：同文件 handleFieldDropOnCell 已走 reportRuntimeHostIssue 闭环）；保持 onLog 参数语义不变
- **去向**: fixed（批内修）
- **验证方式**: spreadsheet/report filter 四门禁全绿；新增单测：mock rejecting/ok:false dispatch → 断言 notify 调用（先红后绿）
- **现状**: live
- **跨批关联**: report 侧消费装配（report-spreadsheet-canvas）为本批 report 包文件——两包同车修

### WA-sheetr-002 [A/行为缺陷] 100×26 魔法常量残留 ×4 位：维度派生机制建立时未回改交互侧

- **位置**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts:67-68`（`totalRows = 100; totalCols = 26`）+ `use-fill-handle.ts:83`（`range.endCol + 1 < 26`）+ `:104`（`probeRow < 100`）↔ `default-page-body.tsx:10-11/:36-37`（DEFAULT_ROWS/COLS 仅作 resolveGridDimensions 下限，维度随内容增长）
- **信号类别**: A（无法用领域语义解释的魔法常量）+ 潜在行为缺陷
- **症状**: 网格渲染侧已随内容派生维度（plan 477 V7：`74a1ec2ed` 家族，>100 行文档渲染 150 行），交互侧四处仍钳制 100×26——①`getSelectedRange` 行/列/全表选择范围 endRow=99/endCol=25：150 行文档上列操作/填充/清除/合并**静默欠覆盖**（100-149 行不可达）；②`commitEditingCell` :109 边界外编辑 `clearEditing()` 静默丢弃；③fill-handle 双击续填探测 100 行止步
- **考古**: 硬编码先行 `4252b36db`（2026-04-25 selection 家族出生）/`e72409737`（fill-handle）；维度派生 `723ebea3e`（2026-05-14 default-page-body 出生）**未回改交互 hook**——两机制脱节 5 个月
- **严重度**: P2（判据：低成本可修单点缺陷族——useSelection/useFillHandle 签名接 rows/cols 或经 snapshot 推导；>100 行文档在 demo 面少见故非 P1）
- **修复方向**: useSpreadsheetInteractions 已持 rows/cols（config:46-47）→ 透传 useSelection/useFillHandle；default-page-body 与 report-canvas 装配点已传派生值，零调用面变更
- **去向**: fixed（批内修）
- **验证方式**: spreadsheet/report filter 四门禁全绿；新增单测：rows=150 装配 → selectColumn 范围 endRow=149 + fill 探测越界（先红后绿）
- **现状**: live
- **跨批关联**: plan 477 V7（维度派生登记锚——本条为其交互侧收尾）

### WA-sheetr-003 [H] 错误格式化 helper 五变体：isAbortLike/formatFailureMessage 家族手写扩散

- **位置**: `isAbortLike` + `formatFailureMessage` 三份逐字（use-selection.ts:18-27 ↔ use-spreadsheet-interactions.ts:23-32 ↔ use-resize.ts:12-21）+ `formatFailureMessage` 语义反转变体（use-sheet-commands.ts:12-14——参数位互换、无 prefix 拼接语义）+ `getResultMessage`（use-editing.ts:12-14）
- **信号类别**: H（同一基础设施多处手写——五份两族）
- **根因**: interactions 家族无共享错误工具模块；各 hook 自带迷你副本
- **考古**: 随各 hook 出生波次逐步沉积（4252b36db/e72409737/723ebea3e 波）
- **严重度**: P3（判据：5 份 ×10 行同根因微复制；W3——abort 判别语义变更需五处同步）
- **修复方向**: `spreadsheet-interactions/error-format.ts` 单源（isAbortLike/formatFailureMessage 导出），五处改 import（包内依赖零变更）
- **去向**: fixed（批内修）
- **验证方式**: spreadsheet filter 四门禁全绿；interactions 套件直通
- **现状**: live
- **跨批关联**: 无

### WA-sheetr-004 [H] StyleToolType 13 成员联合双声明：词汇无单源（编译器在接线点兜底）

- **位置**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-style-commands.ts:5-18` ↔ `packages/spreadsheet-renderers/src/spreadsheet-toolbar/types.ts:1-14`
- **信号类别**: H（同包逐字双声明——逐字探针 3 窗命中）
- **症状/根因**: 同一工具词汇两处手写；漂移由编译器在 default-page-body 装配点（onStyleTool 桥接）被动拦截——类型保护存在但词汇治理缺位（改一漏一会以编译错误形式惩罚，而非从源头不可能）
- **考古**: 双份随 toolbar 抽取波（f084fe1d2 邻域）落位
- **严重度**: P3（判据：2 份 ×13 行同根因；零行为缺陷）
- **修复方向**: toolbar/types.ts 改 `export type { StyleToolType } from '../spreadsheet-interactions/use-style-commands.js'` 再导出；index.ts/spreadsheet-toolbar.tsx 两处既有 re-export 面零变更
- **去向**: fixed（批内修）
- **验证方式**: spreadsheet filter 四门禁全绿；`grep -rn "export type StyleToolType" src/` = 1
- **现状**: live
- **跨批关联**: 无

### WA-sheetr-005 [I 邻] resize 对话框裸英文 aria-label：同 dialog 标题已 t() 的双标位点

- **位置**: `packages/spreadsheet-renderers/src/spreadsheet-grid/overlay-controls.tsx:106`（`aria-label={resizeDialog?.axis === 'row' ? 'Row height' : 'Column width'}`）——同对话框 :100 标题已走 `t('flux.spreadsheet.rowHeight'/'columnWidth')`
- **信号类别**: I 邻（演进残留——读屏用户可见面英文分裂，literalEn 探针对 t() 缺失形态盲区，wa-13a WA-flowr-010 同族）
- **考古**: 随 `f084fe1d2`（2026-05-18 grid controls 重构）出生
- **严重度**: P3（判据：用户可见面不一致，修复两键）
- **修复方向**: 两分支改 `t('flux.spreadsheet.rowHeight'/'columnWidth')` 复用既有键（键已存在，零新增键）
- **去向**: fixed（批内修）
- **验证方式**: spreadsheet filter 四门禁全绿；`grep -n "'Row height'" overlay-controls.tsx` = 0
- **现状**: live
- **跨批关联**: wa-13a WA-flowr-010 同族判例

### WA-sheetr-006 [E] 键盘上下文菜单合成事件重放：dispatchEvent 模拟用户手势驱动受控弹层

- **位置**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:126-143`（effect 等待选择就绪后 `pending.element.dispatchEvent(new MouseEvent('contextmenu', ...))`）+ `spreadsheet-grid/table-shell.tsx:402-409/:475-482`（ContextMenu/Shift+F10 键盘请求登记 element）
- **信号类别**: E（手动 dispatchEvent 模拟用户操作驱动内部逻辑——「原生事件发生过但菜单条件未就绪，事后再补发一次」）
- **症状/根因**: ui ContextMenu 原语为非受控 API（contextmenu 事件驱动），键盘 a11y 流程只能以事件重放绕行；等待对象是「选择命令落 store」——已用 effect + 就绪判别表达（非时序贿赂），但驱动通道是事件伪造
- **考古**: `adf9f8816`（2026-05-19 table-shell 抽取波）落位
- **严重度**: P3（判据：E 类坐实但自持 DOM + a11y 特性 + 等待机制显式；无数据风险）
- **修复方向**: 若 ui ContextMenu 支持受控 open（或补 controlled 通道）→ 改命令式打开删重放；不支持则保留 + 注释声明 ui 原语约束
- **去向**: watch-only（ui 原语能力核实归 Phase 2；本行即登记，不允许静默）
- **验证方式**: 若修：键盘 ContextMenu e2e（table-shell 键盘流程）直通；现态：键盘上下文菜单行为用例保持
- **现状**: live
- **跨批关联**: CX-16 交界核对——本包菜单面走 ui ContextMenu portal 原语，**非** wa-13a fixed 坐标菜单壳家族，CX-16 记不适用（见误报 #8）

### WA-sheetr-007 [I 邻] comment 输入链残迹：props 全链在位而输入 UI 从未渲染，「添加评论」空转

- **位置**: `packages/spreadsheet-renderers/src/spreadsheet-toolbar/types.ts:60-66`（showCommentInput/commentText/onCommentTextChange/hasComment props 契约）+ `default-page-body.tsx:188-194`（接线含显式 no-op `onCommentTextChange={() => undefined}`）+ `use-comments.ts:15-30`（handleAddComment 消费的是 cell 既有 comment 文本——use-spreadsheet-shell 派生值，非用户输入）
- **信号类别**: I 邻（转正残迹：功能链五件套在位、输入面缺失、回调显式 no-op）
- **症状**: 工具条「评论」按钮切换 showCommentInput 态但无任何组件渲染输入框；「添加评论」在目标格无评论时早退（commentText 空）、有评论时复写同值——功能级 no-op
- **考古**: comment 家族随 interactions 族出生（4252b36db 波）；无删除波触及（toolbar props 为公共导出类型成清理阻力）
- **严重度**: P3（判据：死路径 + 显式 no-op 接线；无行为危害但持续误导读者）
- **修复方向**: SpreadsheetToolbarProps 为 index.ts 公共导出——收缩涉公共面；候选：①props 收缩（公共导出变更，需人工确认）②最小修=no-op 接线处注释声明残迹 + watch。推荐②随登记
- **去向**: watch-only（公共面决策留人工；本行即登记）
- **验证方式**: 若修：spreadsheet e2e comment 家族用例处置同步落字
- **现状**: live
- **跨批关联**: 无

### WA-sheetr-008 [I 邻] handleCellValueSave 死 API：定义+接口+返回三处在位、零消费且不查结果

- **位置**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:123-138`（定义）+ `use-spreadsheet-interactions.ts:139/:180/:415`（接口声明/解构/返回）
- **信号类别**: I 邻（死 API 面）
- **症状**: 全仓零调用方；本体 `await bridge.dispatch(...)` 结果不查（连 ok:false 都不观测）——即使未来被接线也是无失败路径形态
- **考古**: 随 use-editing 出生波次；编辑提交实际走 handleEditSave/handleCellValueSync 两活体通道
- **严重度**: P3（判据：死代码；SpreadsheetInteractionsReturn 为 index.ts 公共导出类型——删除涉公共面）
- **修复方向**: 同 WA-sheetr-007 处置逻辑：公共面收缩留人工，watch 登记
- **去向**: watch-only
- **验证方式**: 若修：`grep -rn "handleCellValueSave" src/` = 0
- **现状**: live
- **跨批关联**: 与 WA-sheetr-007 同为「公共导出类型内的死面」家族——Phase 2 可并案提请人工裁决

### WA-sheetr-009 [B 邻] fire() 转发器：安全性依赖「core dispatch 不 reject」的未声明前置条件

- **位置**: `packages/spreadsheet-renderers/src/fire.ts:1-3`（`export function fire(fn) { void fn(); }`）+ default-page-body 30 个调用点
- **信号类别**: B 邻（把「无失败路径」制度化为具名 API）
- **症状/根因**: 当前安全成立——实读核验 core-dispatch.ts:19-25 全命令 try/catch 包裹、错误一律 in-band（`{ok:false, error}`）、dispatch 不 reject；但该前置条件无 JSDoc/类型表达，任何会 reject 的函数传入 fire 即静默 unhandled rejection
- **考古**: fire.ts 随 default-page-body 出生（723ebea3e）
- **严重度**: P3（判据：契约未声明的潜在静默面；现行为零缺陷）
- **修复方向**: fire() 补 JSDoc（「仅限 in-band 错误协议函数[bridge.dispatch 族]；会 reject 的函数须自带 catch」）——注释级修复
- **去向**: fixed（批内修，注释级）
- **验证方式**: spreadsheet filter 四门禁全绿
- **现状**: live
- **跨批关联**: async 门禁 fire.ts:2 行的定性出口

### WA-wordr-001 [G/I 邻] `__NOP_WORD_EDITOR_PROBE__` 全局测试通道无豁免登记：cq-6 debug-residue 面本批唯一复发点

- **位置**: `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:31-49`（declare global）+ `:252-270`（挂载/卸载 effect）
- **信号类别**: G 邻 + I 邻（测试专用 window 通道 + 化石特征[无出口注记]）
- **症状**: `window.__NOP_WORD_EDITOR_PROBE__` 生产代码挂载全局状态探针；全仓消费方仅本包测试 `__tests__/word-editor-page-host-scope-projections.test.tsx:401/:407`；**无** b8ef4a555/§2.6 式就地豁免声明（wa-13a 误报 #21 判例对照：flow 同型通道带显式豁免注释逐字在案，本件无任何注记）
- **考古**: 出生 `9e3559231`（2026-05-08 use-word-editor-state hook 创建波）；cq-6（`2c94d9d7f`，2026-10-01）debug residue 清扫未触 word-editor——收口波范围缺口
- **严重度**: P3（判据：G 类登记缺口 + W2 出口缺失；生命周期干净[unmount 删除]非泄漏）
- **修复方向**: 二选一：①测试改走 host scope 投影断言（测试已消费 useHostScope 数据面）后删除通道；②保留 + 就地补 §2.6 豁免注记（对齐 b8ef4a555 纪律）。推荐①（注记是登记不是解决）
- **去向**: fixed（批内修）
- **验证方式**: word filter 四门禁全绿；host-scope-projections 测试直通；`grep -rn "window\.__" packages/word-editor-renderers/src` = 0（路线①）
- **现状**: live
- **跨批关联**: cq-6（`2c94d9d7f`）收口范围缺口注记；b8ef4a555 §2.6 纪律参照

### WA-wordr-002 [H] getTypeLabel/getTypeColor 双份漂移：dataset-panel ↔ field-list 类型徽标工具孪生

- **位置**: `packages/word-editor-renderers/src/panels/dataset-panel.tsx:66-84` ↔ `packages/word-editor-renderers/src/panels/field-list.tsx:29-47`
- **信号类别**: H（同包双份 + 已漂移）
- **症状**: 4 键 label map 逐字两份；color map 已漂移（field-list 版每值多 `border-*` 类——徽标描边仅字段列表生效，数据集面板无描边：视觉不一致即漂移的可见面）
- **考古**: 双份随 `09447cf00`（2026-03-31 word-editor UI 首波）同落
- **严重度**: P3（判据：2 份 ×19 行、同根因、漂移已兑现[视觉双标]）
- **修复方向**: 提取 `panels/dataset-visuals.ts`（getTypeLabel/getTypeColor 单源），两面板改 import；描边语义拍板归 Phase 2（单源后取哪派需一行决策）
- **去向**: fixed（批内修）
- **验证方式**: word filter 四门禁全绿；panels 相关单测直通
- **现状**: live
- **跨批关联**: plan 558 视觉修正波邻域（非其范围）

### WA-wordr-003 [I 邻] TemplateSnippets / DocPreviewPage 死组件：零生产消费 5-6 个月 + 伴生测试空转

- **位置**: `packages/word-editor-renderers/src/panels/template-snippets.tsx`（79 行）+ `packages/word-editor-renderers/src/preview/doc-preview-page.tsx`（120 行）——index.ts 均**不**导出，包内零消费（全仓 grep 仅各自 `__tests__/` 引用）
- **信号类别**: I 邻（死代码 + 注释化石邻[doc-preview 自重叠归一探针 6 窗旁证]）
- **考古**: TemplateSnippets 出生 `09447cf00`（2026-03-31），最后消费者移除 `6550cf705`（2026-05-03「tighten public surface」）；DocPreviewPage 出生 `590e94da0`（2026-04-04「read-only preview」），消费者移除 `40db36fc1`（2026-04-17 host-owner 整合）——两者均无出口登记、无 plan 锚
- **严重度**: P3（判据：~200 行死代码 + 两套测试空转维护；无行为危害）
- **修复方向**: 删除两组件 + 伴生测试（template-snippets.test.tsx / doc-preview-page.test.tsx）；若「文档预览页」属规划特性则先登记出口再定——考古未见 plan 锚，默认删除
- **去向**: fixed（批内修）
- **验证方式**: word filter 四门禁全绿；`grep -rn "TemplateSnippets\|DocPreviewPage" packages/ apps/ --include="*.tsx" --include="*.ts"` 非测试 = 0（仅 dist/ 批前构建产物残影——gitignored，下次 build 自清，reportr-002 同款豁免注记）
- **现状**: live
- **跨批关联**: 无

### WA-wordr-004 [B] canvas command 调用面 catch 三态不一致 + 顺序耦合：逐点打补丁形态

- **位置**: `packages/word-editor-renderers/src/toolbar/font-controls.tsx:40-46`（runCommand 静默包装，15 个样式按钮全走）+ `toolbar/zone-controls.tsx:49-54`（静默 + **先 `editorStore.setActiveZone` 后 `executeSetZone`**——canvas 拒绝时高亮态已翻转无回滚）+ `toolbar/insert-controls.tsx:63`（image 插入 notify 结构化）vs `insert-controls.tsx:78-85`（hyperlink 裸调用）+ `toolbar/search-replace.tsx:42-51`（导航/替换裸调用）+ `toolbar/page-controls.tsx:60-62/:100`（裸调用）
- **信号类别**: B（静默兜底不一致 + W4：守卫触发不可观测）+ 顺序耦合
- **症状/根因**: canvas-editor 同步命令可因「无编辑区/无页面面」拒绝（三处注释自证同一拒绝族）；调用面catch策略三态并存（静默包装/notify/裸）——每次在某点观察到失败就就地补一个 catch，无统一调用协议；zone 侧 store-first 顺序使静默失败伴生 UI 态失真
- **考古**: runCommand 随 `ea01a33b0`（plan 478 V8b font Combobox 波）成形；zone catch 随 zone UI 波——逐症状补丁链
- **严重度**: P3（判据：W4 静默守卫族 + 单包内可统一；失败均为「命令未生效」无数据损坏故非 P1/P2）
- **修复方向**: 包内 `invokeCanvasCommand(fn: () => void, opts?: { onError? })` 单源（默认 env.notify warning + debug 上下文），全 toolbar 族收敛；zone-controls 改 canvas-first-then-store 或失败回滚 setActiveZone
- **去向**: fixed（批内修）
- **验证方式**: word filter 四门禁全绿；新增单测：mock command 抛错 → notify 调用断言（先红后绿）；zone 切换失败回滚断言
- **现状**: live
- **跨批关联**: async 门禁 font:43/zone:51 两行定性出口；word-editor-core bridge 面不修改（WA-12 界外只读核验）

### WA-wordr-005 [A 邻] 插入对话框假预览三连：mockData/手绘条码/假 QR 占位转正无出口

- **位置**: `packages/word-editor-renderers/src/dialogs/chart-dialog.tsx:36-42/:89-156`（预览恒渲染 Jan–May mockData，不反映 datasetId/categoryField/valueField 输入）+ `dialogs/code-dialog.tsx:20-23/:130-177`（QR_CODE_PATTERN 49 格假 QR + 33 段手绘 div 条码，不反映 valueField 输入）
- **信号类别**: A 邻（占位实现转正——「预览」区展示与用户输入无关的假数据）
- **症状/根因**: 三个插入对话框的「预览」均为装饰性假渲染；根因 = canvas-editor 无无头预览渲染 API，占位实现出生后无出口登记（W2 弱）
- **考古**: 随 `09447cf00`（2026-03-31 dialogs 首波）出生；`b2fd42fbd`（2026-08-08 D3.4 word-editor surface audit 关停 7 面）未触预览真伪
- **严重度**: P3（判据：误导性展示无数据风险；真预览管线涉 core 能力，非本批可修）
- **修复方向**: 最小修 = 预览区标题改「示例样式预览」（i18n 键 + 注释声明管线缺口）消解误导；真预览 = watch（依赖 canvas-editor 无头渲染能力，登记待 core 侧能力）
- **去向**: fixed（批内修，标注级）+ watch 微注记（真预览管线）
- **验证方式**: word filter 四门禁全绿；dialogs 套件直通
- **现状**: live
- **跨批关联**: word-editor-core 能力缺口 → 如 core 侧评估预览 API，登记转发 WA-12 参考（非立案转发）

### WA-wordr-006 [A 邻] search 结果计数假值：`resultCount = searchText ? 1 : 0` 恒显 "1"

- **位置**: `packages/word-editor-renderers/src/toolbar/search-replace.tsx:18`（假计数推导）+ `:89`（上屏）
- **信号类别**: A 邻（症状占位——无匹配数 API 就硬编码一个「1」）
- **症状/根因**: 搜索框旁恒显「1」与实际匹配数无关；根因 = bridge 搜索命令无计数返回，占位转正
- **考古**: 出生 `44e455aa8`（2026-04-03「simplify bridge, outline panel, and dialog state」）；`b2fd42fbd`（D3.4 surface audit）未触
- **严重度**: P3（判据：误导性显示；无数据风险）
- **修复方向**: 移除假计数显示（最小）或接 bridge 真值（涉 core 能力——随 WA-wordr-005 watch 项同族）
- **去向**: fixed（批内修，删除假计数）
- **验证方式**: word filter 四门禁全绿；search-replace 套件直通；`grep -n "resultCount" search-replace.tsx` = 0
- **现状**: live
- **跨批关联**: 与 WA-wordr-005 同族（假数据占位）

### WA-wordr-007 [E 邻] outline 标题 id Math.random 兜底：渲染期随机身份瓦解折叠态与 key 稳定性

- **位置**: `packages/word-editor-renderers/src/panels/outline-panel.tsx:37`（`id: element.titleId || element.id || Math.random().toString()`）
- **信号类别**: E 邻（随机值作身份——keyRemount 探针对「值域 Math.random」形态盲区，走读捕获）
- **症状/根因**: 缺 titleId/id 的标题每次 `readOutline`（内容修订触发）生成新随机 id → expandedState 折叠键失效（用户折叠态静默复位）+ React key 不稳定（子树重挂载）
- **考古**: 随 `09447cf00` 波落位；outline 双命中门禁位点（:86/:146）为同文件近邻
- **严重度**: P3（判据：兜底路径才触发的 UX 缺陷；兜底本身证明上游 id 契约缺口）
- **修复方向**: 兜底改稳定派生（遍历序索引路径或 `value+level` 内容键）；随案注记上游应保证 titleId 完整性（word-editor-core 契约，只读核验）
- **去向**: fixed（批内修）
- **验证方式**: word filter 四门禁全绿；outline 折叠态保持单测（先红后绿）
- **现状**: live
- **跨批关联**: word-editor-core titleId 契约面（WA-12 只读参考）

### WA-wordr-008 [E 邻] key 重挂载复位弹层态 ×2：以 remount 替代显式 reset

- **位置**: `packages/word-editor-renderers/src/word-editor-page.tsx:361`（DatasetDialog `key={\`${editingDatasetId ?? 'new'}:${datasetDialogOpen ? 'open' : 'closed'}\`}`）+ `toolbar/ribbon-toolbar.tsx:68`（SearchReplace `key={showSearch ? 'search-open' : 'search-closed'}`）
- **信号类别**: E 邻（key 强制重挂载以「解决」状态残留——E 类定义形态的温和变体）
- **症状/根因**: 两弹层内部态经 useState 初始化器种子（dataset-dialog:41-47 / search-replace:15-16），开闭/换目标靠 remount 复位；功能正确但把生命周期语义编码进 key，新人改动 key 即回归
- **考古**: 随各自组件出生波（09447cf00 族）；plan 552/553（ribbon/config 契约波）未重构此形态
- **严重度**: P3（判据：E 类温和形态——行为正确、自限、非随机 key）
- **修复方向**: 显式 reset（open 下降沿清 state 的 effect 或 controlled initialValues）为可选重构；不强制
- **去向**: watch-only
- **验证方式**: 若修：dataset dialog / search-replace 套件直通
- **现状**: live
- **跨批关联**: 无

### WA-wordr-009 [I 邻] 裸英文用户面错误串 ×2：FileReader 失败消息未 t() 直达 notify

- **位置**: `packages/word-editor-renderers/src/toolbar/insert-controls.tsx:68`（`new Error('Image read failed')`）+ `:71`（`new Error('Image read aborted')`）——经 notifyInsertFailure → env.notify('warning', ...) 用户面
- **信号类别**: I 邻（用户可见面双语分裂；同函数 :44-49 骨架已 t() 兜底）
- **考古**: 随 image 插入波落位；`b9b74eb11` DR i18n 家族收口（2026-08-09）未触 word-editor 此两点
- **严重度**: P3（判据：wa-13a WA-flowr-010 同族——裸英文错误面上屏）
- **修复方向**: 两串改 `t('flux.wordEditor.imageReadFailed'/'imageReadAborted')` 新键（沿用 DR 键位命名法）
- **去向**: fixed（批内修）
- **验证方式**: word filter 四门禁全绿 + i18n keys 门禁；`grep -n "Image read" insert-controls.tsx` = 0
- **现状**: live
- **跨批关联**: b9b74eb11 i18n 收口（范围缺口注记）

### WA-wordr-010 [C 邻] page-controls rAF 延迟无注释 ×2：同族第三命令同步调用的不一致等待

- **位置**: `packages/word-editor-renderers/src/toolbar/page-controls.tsx:80-82`（handlePaperSize：store 先写 + `requestAnimationFrame` 后 `executePaperSize`）+ `:93-95`（handleOrientation 同款）vs `:100`（handleApplyMargins：`executeSetPaperMargin` **同步**调用）
- **信号类别**: C 邻（无注释的一帧延迟；等待对象不可考）
- **症状/根因**: 三条「写 store + 发 canvas 命令」命令中两条 rAF 延迟一条同步——等待对象（若为 React commit/DOM 稳定）无注释表达；canvas 不订阅 store（bridge 命令式），延迟必要性存疑
- **考古**: 随 page-controls 出生波落位；无独立修正 commit 可考
- **严重度**: P3（判据：C 类轻度形态——一次性 UI 命令、自限；非热路径贿赂）
- **修复方向**: 实验移除 rAF 直接同步调用（canvas 命令不依赖 React 树）——若行为等价即删；有隐匿依赖则补注释声明等待对象
- **去向**: watch-only（行为等价性验证归 Phase 2 顺手项；不强制）
- **验证方式**: 若修：paper size/orientation/margins e2e 直通
- **现状**: live
- **跨批关联**: 无

## 汇总

### 1. 转正清单（W2 违约项，按风险排序）

| 发现 ID          | 位置                                   | 出生时间（git 考古）                              | 风险                                           | 处置              |
| ---------------- | -------------------------------------- | ------------------------------------------------- | ---------------------------------------------- | ----------------- |
| WA-sheetr-001    | interactions 失败通道默认断链          | 723ebea3e（2026-05-14 生产消费面出生即未接）      | 全族命令/剪贴板/选择失败默认零反馈             | 批内修            |
| WA-sheetr-002    | 100×26 魔法常量 ×4 位                  | 4252b36db（2026-04-25）；723ebea3e 未回改         | >100 行文档列操作/填充静默欠覆盖；编辑兜底丢弃 | 批内修            |
| WA-wordr-001     | `__NOP_WORD_EDITOR_PROBE__` 无登记通道 | 9e3559231（2026-05-08）                           | cq-6 收口范围缺口；无出口注记的测试通道        | 批内修（①/②）     |
| WA-reportr-002   | helpers 死导出 ×3                      | eb99fc99f→49523aeb7 失最后消费者（2026-04-30）    | 死代码 + perf 门禁噪声源                       | 批内修            |
| WA-wordr-003     | TemplateSnippets/DocPreviewPage 死组件 | 09447cf00/590e94da0；6550cf705/40db36fc1 失消费者 | ~200 行死代码 + 两套测试空转；无出口           | 批内修（删除）    |
| WA-reportr-003   | drag ghost 三包三份                    | dd72a80b3/da067c238/25b60edc2（同日三波）         | 第 4 份 copy 或防御回填再踩；漂移已兑现        | CX-17             |
| WA-wordr-005/006 | 假预览/假计数占位                      | 09447cf00 / 44e455aa8                             | 占位转正无出口（W2 弱）                        | 批内修（标注/删） |

**「按住未修问题且无出口」的经典转正件为零**——头部风险全部是接线缺口（001）、机制脱节残留（002）、收口范围缺口（001/002/003 word）、死代码面与占位展示；literalEn/literalZh 非测试面双零 + 症状性 message 0（30 条抽检）佐证。word 侧占位展示家族（005/006）是本批唯一「拿假数据按住真缺口」的形态，且根因（canvas-editor 预览/计数能力缺口）已显式指认。

### 2. 重复代码热区（按总冗余行数排序）

| 组  | 份数      | 各份位置                                                                                              | 冗余行数 | 漂移证据                                   | 裁定（三问句）                         |
| --- | --------- | ----------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ | -------------------------------------- |
| 1   | 3（跨包） | drag ghost：report-field-panel ↔ page palette-panel ↔ industrial palette-drag-ghost（WA-reportr-003） | ~90      | report 版独有 Not-implemented 防御         | 同根因✅ 提取需跨包归属 → CX-17        |
| 2   | 2（跨包） | 快照切片族：report page-renderer-snapshots ↔ spreadsheet page-renderer（WA-reportr-008）              | ~40      | 零漂移（逐字）                             | 同根因✅ home=spreadsheet-core → WA-12 |
| 3   | 2         | field-panel item-list 双实现（WA-reportr-004）                                                        | ~25      | 特性分野（query/ghost vs keyboard insert） | 同根因✅ → 批内修                      |
| 4   | 5         | isAbortLike/formatFailureMessage 家族（WA-sheetr-003）                                                | ~50      | use-sheet-commands 版语义反转（参数位）    | 同根因✅ → 批内修                      |
| 5   | 2         | getTypeLabel/getTypeColor（WA-wordr-002）                                                             | ~19      | **color map 漂移**（border 类单侧）        | 同根因✅ → 批内修                      |
| 6   | 2         | StyleToolType 13 成员联合（WA-sheetr-004）                                                            | ~13      | 零漂移（编译器接线点兜底）                 | 同根因✅ → 批内修                      |
| 7   | 2         | host-data designer-bag（WA-reportr-005）                                                              | ~19      | 零漂移（测试钉一致性=同步税自证）          | 同根因✅ → 批内修                      |

（归一探针 430 组中其余大簇均为声明式契约平行/JSX 脚手架自重叠/props 管道镜像——裁定见误报排除 #12-#14。）

### 3. Top 重构建议（默认 3 项）

1. **spreadsheet 交互观测与维度双接线（WA-sheetr-001 + 002 同车）**：根因修复点 = 两装配点接 env.notify/reportRuntimeHostIssue + useSelection/useFillHandle 接派生维度；预期删除本体 = 30+ 处静默失败的「结构性悬空」与 4 处魔法钳制；回归 = 新增 rejecting-dispatch 单测 + rows=150 范围/填充单测（先红后绿）+ spreadsheet/report e2e 直通；影响面 = 4 文件 + 装配点 2 处，零公共导出变更。
2. **word canvas 调用协议与登记缺口双清（WA-wordr-004 + 001 + 009 + 006 + 005 同车）**：根因修复点 = invokeCanvasCommand 单源 + zone 顺序回滚 + 探针通道处置（删或 §2.6 注记）+ 裸英文 t() 化 + 假计数删除 + 预览诚实标注；预期删除本体 = 三态 catch 补丁链 + 无登记全局通道 + 2 处英文串 + 1 处假计数；回归 = command 抛错 notify 断言（先红后绿）+ host-scope 投影测试直通；影响面 = toolbar 6 文件 + hooks 1 文件 + 3-4 个新 i18n 键。
3. **report 包内收敛四连（WA-reportr-001 + 005 + 006 + 007 同车）**：根因修复点 = cellAddress 改 import + designer-bag 提取 + 参数类型收窄删断言 + fieldCount 常量单源；预期删除本体 = 1 份手写实现 + 19 行复制 + 2 处谎报断言 + 1 处字符串耦合；回归 = host-data/field-insert/toolbar 套件直通；影响面 = 4 文件包内私有重构，index.ts 零变更。

### 4. 误报排除清单（24 项）

| #   | 疑似点                                           | 位置                                                                                                                                                               | 排除理由                                                                                                                                                                                                        |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | typeBypass——defineSchema 三包同型                | report types.ts:37 / spreadsheet types.ts:24 / word types.ts:48                                                                                                    | schema 动态边界一次性收窄（D 类判例；wa-13a #1 同型）；`defineXxxSchema` 为三设计器包统一惯例                                                                                                                   |
| 2   | typeBypass——validator 后窄化断言                 | word-editor-action-provider.ts:167/:180                                                                                                                            | `createHostMethodValidator` 契约验证在先 + 域验证（validateDocChart/Code）在后的双重纵深；cq-2 validator 家族正型                                                                                               |
| 3   | setTimeout——report drag ghost 清理               | report-field-panel.tsx:44                                                                                                                                          | setDragImage 平台 API 语义（ghost 须存活至 dragstart 同步任务后）；wa-13a 误报 #7 判例；plan 528 登记锚                                                                                                         |
| 4   | setTimeout——editor-canvas 500ms 自动保存防抖     | editor-canvas.tsx:50                                                                                                                                               | **cq-2 注释纪律正面样板**——:41-44 显式注记「为何不用 useDebouncedCallback」（bridge mount 生命周期绑定 + 共享 AbortController）；wa-10 #8 coalesce 判例                                                         |
| 5   | setTimeout——outline 500ms 刷新节流               | outline-panel.tsx:130                                                                                                                                              | 内容变更 → 大纲重读的 coalesce；revision 计数模式显式（:106 void 注记）                                                                                                                                         |
| 6   | setTimeout——search 300ms 输入防抖                | search-replace.tsx:30                                                                                                                                              | 打字停顿防抖（等待对象=用户输入停止，非外部系统）；取消链完整                                                                                                                                                   |
| 7   | setTimeout——save 2000ms 消息计时器               | use-word-editor-save.ts:71                                                                                                                                         | 瞬态 UI 消息自动消退计时器；mountedRef 守卫 + cleanup 在案                                                                                                                                                      |
| 8   | domRaid——grid 单元格 querySelector+focus         | spreadsheet-grid.tsx:175-179                                                                                                                                       | 自持表格 DOM 键盘导航焦点投递（rAF 等待虚拟化挂载）——wa-7 #9 命令式焦点判例族                                                                                                                                   |
| 9   | elementFromPoint 拖拽追踪 ×2                     | spreadsheet-grid.tsx:309 / use-fill-handle.ts:139                                                                                                                  | 自持 DOM 的 dataset 命中链（td[data-row][data-col]）拖拽 over 追踪——E 类「自持 DOM 受控访问」豁免                                                                                                               |
| 10  | 渲染期 bridge.getValue 读大纲（revision 模式）   | outline-panel.tsx:104-107                                                                                                                                          | 非订阅源（canvas-editor 命令式 API）的显式 revision 重读模式；catch → console.error 有观测；设计注记非掩盖                                                                                                      |
| 11  | async report 5 行                                | field-panel:40/:111、toolbar:55/:148/:174                                                                                                                          | 见 async 定性表——平台降级注释/同源载荷/结构化路由闭环                                                                                                                                                           |
| 12  | 契约形状跨包平行                                 | report-designer-manifest selectionTarget/spreadsheetSelection 形状 ↔ spreadsheet-manifest-shapes cellRef/range/selection 形状                                      | report 嵌入 spreadsheet 的**契约投影镜像**——宿主面形状与宿主内形状语义角色不同（投影 vs 方法契约），平行设计非同根因复制（§3 问句 1 否）；WA-reportr-008 只收敛运行时 slice/selector 函数族，不动形状声明       |
| 13  | 声明式契约/注册脚手架自重叠                      | contracts-core↔formatting、toolbar-groups、font-controls、context-menu、use-style-commands switch、renderer definitions（report↔spreadsheet renderers.tsx 归一簇） | 归一探针最大簇全部为 switch 分派臂/ToolbarButton/ContextMenuItem/propContracts 声明脚手架的滑窗自交；同文件内平行声明非逻辑复制                                                                                 |
| 14  | props 管道镜像                                   | overlay-controls↔context-menu 接口、table-shell↔grid 解构/透传、use-sheet-commands↔use-spreadsheet-interactions 标识符清单三写                                     | 父子组件 props 契约镜像与 handler 清单——逐字但为框架接线形态；提取反而制造间接层                                                                                                                                |
| 15  | selectionShape / selectionResultShape 同文件双份 | spreadsheet-manifest-shapes.ts:85-97/:187-199                                                                                                                      | args 形状与 result 形状语义角色分离（选择命令入参 vs 返回投影）——当前字面重合属巧合，合并将耦合两契约的独立演化；排除                                                                                           |
| 16  | useEagerRenderersInTests（report/word ×2）       | report renderers.tsx:41-42 / word renderers.tsx:13-14                                                                                                              | wa-13a 误报 #11 判例（懒加载 renderer 标准可测性设计）+ watch #9 既有登记（三包同型微复制，spreadsheet 包无此形态=纯懒加载）；不重复立案                                                                        |
| 17  | 'Hello World' 种子内容                           | editor-canvas.tsx:95                                                                                                                                               | 空文档种子**内容**（用户可编辑文本）非 UI chrome 文案；不上 i18n 面属内容语义——watch 微注记 #7（若产品化需本地化种子）                                                                                          |
| 18  | initialCharts/initialCodes 零消费 schema 字段    | word types.ts:30-37                                                                                                                                                | **@reserved DR-15 adjudication（2026-08-08）注释逐字在案**——「removal is a public renderer-fields change and requires human confirmation」——W2 满足（带编号、有裁决、有出口）的登记保留项，I 类误报排除判例正型 |
| 19  | dataset-dialog key 重挂载                        | word-editor-page.tsx:361                                                                                                                                           | 已立案（WA-wordr-008 watch）——不在此重复；E 类温和形态非 key={Math.random()} 红形态                                                                                                                             |
| 20  | sheet-tab-bar 'this sheet' 兜底                  | sheet-tab-bar.tsx:199                                                                                                                                              | 不可达兜底（handleCloseClick 恒先置 pendingSheetName）——防御冗余非双标                                                                                                                                          |
| 21  | dataset-panel duration-160 非标 utility          | dataset-panel.tsx:128                                                                                                                                              | 惰性类（无对应工具则 transition-duration 走默认）——无行为影响；下次触碰顺手纠正，不立案                                                                                                                         |
| 22  | cell-style-map 陈旧双 JSDoc                      | cell-style-map.ts:200-203                                                                                                                                          | 同函数两段连续注释（前段格式清单被后段 plan 476 版取代）——注释化石微形态；watch 微注记 #4（顺手删前段），不单独立案                                                                                             |
| 23  | word action-provider 自有 toActionError          | word-editor-action-provider.ts:44-58                                                                                                                               | cq-2 Phase 2b 注释自证（「Deliberately NOT flux-core's toHostActionError」+ 语义差异说明）——cq-2「变体显式注记」纪律正型                                                                                        |
| 24  | CX-16 交界——spreadsheet-grid-context-menu        | spreadsheet-grid/spreadsheet-grid-context-menu.tsx                                                                                                                 | 本包菜单面走 ui ContextMenu portal 原语（ContextMenuContent/Item），**非** wa-13a CX-16 fixed 坐标菜单壳家族——CX-16 条款核对记不适用                                                                            |

### 5. 范围整体判断

**不是系统性临时方案文化——问题形态是「demo 通道转生产未补宿主面 + 机制建立时的未回改残留 + 占位展示无出口 + 公共导出面阻力下的死代码沉积」，而非「按住问题的特判/兜底」。** 正面证据七件：①literalEn/literalZh 非测试面**双零**（wa-10 后第三个双零批组，测试面仅 1 处历史说明注释）；②typeBypass 5 处全豁免 + setTimeout 5 处全豁免（零时序贿赂，editor-canvas 反而是 cq-2 注释纪律的正面样板）；③async 门禁 17 行中 13 行结构化豁免，word save/outline 面观测完备；④WorkbenchShell（232f54f4d）与 manifest route-table（cq-6 形态）两收敛面 live 零复发；⑤症状性 commit message 0（38 条全集抽 30 条全带 plan 锚与根因链）；⑥spreadsheet-grid 虚拟化滚动（localScroll rAF + viewport sync 守卫）与 report 双核快照同步（三 ref 协议）是本批质量最高的两处，注释与边界守卫完备；⑦零 P0、唯一 P1 是跨包复制热区（无行为缺陷）。问题集中四处：**「观测通道接了结构断了装配」**（sheetr-001——最接近真「静默掩盖」的一条）、**「渲染侧修了交互侧没跟」**（sheetr-002）、**「假数据占位转正」**（wordr-005/006——本批唯一症状特判族，根因已指认为 core 能力缺口）、**「公共导出面阻力下的沉积」**（wordr-001/003、sheetr-007/008——死代码/死 API 因 index.ts 面收缩需人工而滞留）。整体判断：零星个案级，无需 roadmap 层面对策；27 条立案预期批内修 20 条（含 2 条注释级）、watch 5 条、CX-17 一项、WA-12 转发一项；公共导出面（三包 index.ts）在全部批内修路径下零变更（sheetr-007/008 的公共面收缩候选以 watch 显式留人工）。

## 转发 WA-12（designer-core 侧发现登记）

**一项转发 + 一项参考**：①**WA-reportr-008**（report↔spreadsheet 快照切片族孪生）的自然 home 是 spreadsheet-core（SpreadsheetRuntimeSnapshot 同文件家族）——slice/selector/equal 三符号的 core 侧导出评估归 WA-12 批；本批不动 core，未评估前两份维持现状。②word-editor-core 侧两项**只读参考**（非立案转发）：标题 titleId 契约完整性（WA-wordr-007 兜底的根因在 core 侧 id 契约缺口）与无头预览/搜索计数能力缺口（WA-wordr-005/006 占位的根因）。word-editor-core 其余消费面（CanvasEditorBridge/command 族/persist）经本批只读核验未见需立案信号；spreadsheet-core dispatch in-band 协议（core-dispatch.ts try/catch 包裹）实读核验为 fire() 安全性的成立基础，协议本体健康。

## watch 微注记（不入立案，本行即登记，不允许静默）

1. **report 双通道 scope 装读**：page-renderer.tsx:468 `spreadsheetCore.getSnapshot()` 渲染期直读（useHostScope 入参）与 ReportDesignerHostScopeSync 反应式 replace 并存——双写通道收敛由订阅驱动的重渲染兜底，现读数恒新；下次触碰 page-renderer 时可评估统一走 useReportDesignerHostScope/host-data 单源。
2. **best-effort 静默面三处**（word-editor-page.tsx:101 persist / editor-canvas.tsx:56 快照 / :66 word count）：注释声明在案但触发不可诊断——建议接 debug 计数或 console.debug（对齐 editor-canvas:160 现有先例）。
3. **CX-17 触发条件已满足**：drag ghost 三包三份（WA-reportr-003）——插入 roadmap 时引用本报告考古链（dd72a80b3→da067c238→25b60edc2 + report 防御漂移位点）。
4. **cell-style-map 陈旧双注释**（:200-203）：前段格式清单被 plan 476 后段取代——下次触碰顺手删前段。
5. **sheetr-007/008 公共面收缩候选**：SpreadsheetToolbarProps comment 链与 handleCellValueSave 均为 index.ts 导出类型内死面——两案并案提请人工裁决（收缩 or 注记保留）。
6. **renderers.tsx dual-import 形态**（三包同型）：顶部静态 import + 懒包裹并存——与 wa-13a flow 判例同款维持设计内裁定；若 bundle 面需要真隔离需复核 dual-import 剥离（属结构决策非本批缺陷）。
7. **'Hello World' 种子内容本地化**（editor-canvas.tsx:95）：产品化多语言宿主时需评估种子文案 i18n。
8. **outline-panel render 期读 + revision 模式**（:104-107）：可读性注记候选（getValue 为命令式源的显式重读协议）。

## 批内修复候选清单（供 Phase 2 执行会话）

| 发现 ID        | 严重度 | 建议去向                              | 修复要点                                                      | 约束/验收判据                                              |
| -------------- | ------ | ------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| WA-reportr-001 | P3     | 批内修                                | 删私有 cellAddress，import spreadsheet-core 单源              | 四门禁直通；`grep -c "function cellAddress"` report 包 = 0 |
| WA-reportr-002 | P3     | 批内修                                | 删 helpers 三死函数（留 getFieldCount）                       | 四门禁直通；perf 门禁 report 读数 0                        |
| WA-reportr-004 | P3     | 批内修                                | 提取共享 item-row 组件（或最小互指注释，Phase 2 择一）        | field-panel 两套件 + report-designer e2e 直通              |
| WA-reportr-005 | P3     | 批内修                                | 提取 buildDesignerBag 私有单源                                | host-data.test.ts 直通（same-strategy 断言保持）           |
| WA-reportr-006 | P3     | 批内修                                | builder 形参收窄为结构类型，删两处断言                        | 四门禁直通；`as ReturnType<ReportDesignerCore` = 0         |
| WA-reportr-007 | P3     | 批内修                                | TOOLBAR_FIELD_COUNT_ID 常量单源                               | 四门禁直通；`grep "'fieldCount'" src` 非测试单源           |
| WA-sheetr-001  | P2     | 批内修                                | 两装配点接 env.notify/reportRuntimeHostIssue                  | 新增 rejecting-dispatch 单测先红后绿；零公共导出变更       |
| WA-sheetr-002  | P2     | 批内修                                | useSelection/useFillHandle 接 rows/cols                       | rows=150 范围/填充单测先红后绿；e2e 直通                   |
| WA-sheetr-003  | P3     | 批内修                                | error-format.ts 单源，五处改 import                           | interactions 套件直通                                      |
| WA-sheetr-004  | P3     | 批内修                                | toolbar/types 再导出单源 StyleToolType                        | 四门禁直通；`export type StyleToolType` = 1                |
| WA-sheetr-005  | P3     | 批内修                                | aria-label 两分支 t()（复用既有键）                           | 四门禁直通；裸串 grep = 0                                  |
| WA-sheetr-009  | P3     | 批内修                                | fire() JSDoc 声明 in-band 前置条件                            | 四门禁直通                                                 |
| WA-wordr-001   | P3     | 批内修                                | 测试改 host scope 断言删通道（推荐）或补 §2.6 豁免注记        | host-scope-projections 直通；`window.__` grep = 0（路线①） |
| WA-wordr-002   | P3     | 批内修                                | panels/dataset-visuals.ts 单源（描边派拍板一行）              | 四门禁直通                                                 |
| WA-wordr-003   | P3     | 批内修                                | 删两死组件 + 伴生测试                                         | 四门禁直通；非测试 grep = 0                                |
| WA-wordr-004   | P3     | 批内修                                | invokeCanvasCommand 单源 + zone 失败回滚                      | command 抛错 notify 单测先红后绿                           |
| WA-wordr-005   | P3     | 批内修                                | 预览区诚实标注（示例样式）+ 注释声明管线缺口                  | dialogs 套件直通；真预览归 watch                           |
| WA-wordr-006   | P3     | 批内修                                | 删假计数显示                                                  | search-replace 套件直通                                    |
| WA-wordr-007   | P3     | 批内修                                | 稳定 id 派生替代 Math.random 兜底                             | 折叠态保持单测先红后绿                                     |
| WA-wordr-009   | P3     | 批内修                                | 两错误串 t() 化（新键 2 个）                                  | i18n keys 门禁 + 四门禁直通                                |
| WA-sheetr-006  | P3     | watch-only                            | ui ContextMenu 受控 open 能力核实后改命令式（或注释声明约束） | 本行即登记；若修：键盘菜单 e2e 直通                        |
| WA-sheetr-007  | P3     | watch-only                            | 公共 props 面收缩候选（与 008 并案提请人工）                  | 本行即登记                                                 |
| WA-sheetr-008  | P3     | watch-only                            | 同上                                                          | 本行即登记                                                 |
| WA-wordr-008   | P3     | watch-only                            | 显式 reset 替代 key remount（可选重构）                       | 本行即登记；若修：两弹层套件直通                           |
| WA-wordr-010   | P3     | watch-only                            | rAF 等价性实验（删或注释声明）                                | 本行即登记；若修：paper 命令 e2e 直通                      |
| WA-reportr-003 | P1     | successor-required=CX-17              | 共享 setDragGhost home（ui 或 designer 共享层），三包消费     | 跨包归属人工确认；三包 ghost testid 与降级路径断言保留     |
| WA-reportr-008 | P2     | successor-required（转发 WA-12 评估） | spreadsheet-core slice/selector/equal 导出评估，两包消费      | WA-12 范围决策；两包 index.ts 面随评估结论                 |

**批内修合计 20 项**（reportr 6 + sheetr 6 + wordr 8），watch-only 5 项，CX-17 一项，WA-12 转发一项；三包 `index.ts` 公共导出面**零变更**（sheetr-007/008 公共面收缩候选以 watch 显式留人工；Phase 2 以 `git diff --exit-code` 三出口文件为验收判据之一）。
