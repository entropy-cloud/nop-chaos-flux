# V6 研究报告：Spreadsheet 视觉令牌化

> 核查日期: 2026-09-20
> 基线: master @ 0f926abbe（V4 已收口）+ V5（plan 475）工作区在途（flow-designer 域，与本域零交集）
> 输入: 普查报告 §5、路线图 V6、`docs/components/spreadsheet-page/design.md`、`docs/architecture/report-designer/spreadsheet-canvas-css.md`、证据卡 spreadsheet.md
> 状态: 已独立核实通过（pass，4 项轻微勘误已回写）

## 0. 勘误与域定位

- **包名勘误**：实际包为 `packages/spreadsheet-renderers` 与 `packages/spreadsheet-core`（普查以域泛称指代 spreadsheet 域，`flux-renderers-spreadsheet` 字样不存在于普查原文；勘误实质 = 以实际包名为准）。
- 证据卡所称 `canvas-styles.css`（894 行）**29 处浅色 hex 计数准确**，`#1a1a1a/#ffffff/#0f9d58/#1a73e8` 等值与行号逐一命中。
- 消费点 4 处：`spreadsheet-renderers/src/renderers.tsx:1`、**`report-designer-renderers/src/report-spreadsheet-canvas.tsx:2`（report 画布共用点）**、playground `spreadsheet-demo.tsx:2`、`report-designer-demo.tsx:2`。共用隔离机制 = 双 scope 选择器（`.nop-spreadsheet-page [...]` 与 `[data-slot='report-designer-spreadsheet-canvas'] [...]`，design.md §10 :123-125 明文禁止裸 data-slot 泄漏）。

## 1. Findings 逐项核实

### F1 29 处浅色 hex（成立，分布已清点）

分类：画布结构 8（`#ffffff` 背景 :30、`#f6f7fa` 工具栏 :353、`#cecece` 分隔线 :372、`#d4d4d4` 网格线 :522-523、`#999999` 冻结线 :708/:717、`#1a1a1a` 文字 :29）、选中态 12（`#0f9d58` 填充柄 :80/active outline :606/选区边 :698/拖放框 :678、`#1a73e8` 编辑框 :620/表头 active :688/:693、`#dbeafe/:205`、`#1d4ed8` :206、`#d3e3fd` :687/:692、`#e0e7ff` :403）、语义色 9（绑定 `#f0f8ff/#94a3b8/#1d4ed8` :632-646、评论 `#f97316` :662、冻结 `#e8f4fd/#2196f3` :667-668、合并 `#fff8e1/#ffc107` :672-673、拖放 `#e3f2fd` :677）。

### F2 dark 零支持（成立，且发现 3 个未定义令牌缺陷）

- 两包 src `data-mode/.dark/prefers-color-scheme` **零命中**；canvas 内部 29 hex + 约 20 处 rgb()/rgba() 全部 light-only。
- 已令牌化的仅是外壳 chrome（tab bar/find-replace/rename，:469-511/:723-894 消费 `--nop-*`），由宿主 playground `styles.css:95-166`（light）+`:195-220`（`[data-mode='dark']` dark 变体）定义。
- **新缺陷**：3 个被消费令牌全仓无定义——`--nop-background`（:44-45）、`--nop-ring`（:821）、`--nop-destructive`（:862-867），var() 无 fallback → 声明静默失效（画布渐变背景/聚焦环/关闭钮悬停色实际不生效）。
- `canvas-styles.test.ts:10-17` 明确禁止包内写 fallback 值（契约：默认值由宿主发布）。

### F3 值类型视觉（成立：一条完整空白带，数据通道已在）

- 渲染路径一行直出：`table-shell.tsx:174` `String(cell.value)`——无 numberFormat 应用、无 type 分派、无日期格式化、无数值检测。
- 对齐：仅显式 `CellStyle.textAlign`（cell-style-map.ts:23-26），默认 left，无数字右对齐推断；截断已有（nowrap+ellipsis :531-533）。
- `numberFormat` 是 storage-only（cell-operations.ts:152/:169 只写字段；测试只断言往返）。`type?: string`（types.ts:104）与 `numberFormat?: string`（:111）字段已在 core——**渲染端是纯增量，零 schema 变更**。

### F4 视觉回归断言现状（成立：1 个专属 spec，零色彩断言，零 dark）

- `tests/e2e/spreadsheet-demo.spec.ts`（10 test：渲染/编辑/加粗/状态栏/公式/冻结/删除/键盘/查找/undo）；冻结 ss-6 只断 sticky 位置，无 `data-cell-frozen` 视觉断言；填充柄零断言；选中态仅属性存在性（ss-8）；light/dark 双态零。
- 可复用资产：`theme-switcher.spec.ts:40-54` light↔dark 计算样式翻转先例 + V0 helper（getComputedStyleValue/expectCssVarResolves）。

### F5 owner docs 契约核对

- `spreadsheet-canvas-css.md` §3.2（:100-104）自认「ss-cell 提供完整 Excel 默认样式作为基线」——**硬编码 Excel-light 基线是设计决策**，dark 化须在该文档修订契约；§2.3 示例 CSS 的 hex 已与 live 漂移（#1a73e8/#e8f0fe vs #0f9d58/#e8f4fd）；§8 测试策略只覆盖映射正确性。
- `design.md` §8（:68-71）toolbar active 视觉须同步 aria-pressed；§12（:134-137）自认 canvas/外壳样式混用风险。

## 2. 残余候选（逐项初裁）

| #   | 候选                                                                               | 证据                                                       | 初裁                                                          |
| --- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| R1  | 3 个未定义令牌消费（--nop-background/--nop-ring/--nop-destructive）                | §F2                                                        | **并入主交付**（定义或移除）                                  |
| R2  | 死类 `frozen-row`（冻结行无视觉表达）                                              | table-shell.tsx:438                                        | **并入主交付**（补规则或删类）                                |
| R3  | 死类 `ss-grid-shell`                                                               | spreadsheet-grid.tsx:296                                   | 同上                                                          |
| R4  | 29 hex 之外约 15 处 light-only rgb()/rgba()（表头渐变/hover/编辑输入/状态色/阴影） | css:127-130/:169/:184/:316/:337-345/:398-399/:47/:61-63 等 | **并入主交付**（同属 dark 击穿面，拆开不闭环）                |
| R5  | 选中底色固定蓝色通道 rgba(41,98,255,…) 不随主题                                    | css:612/:628/:683                                          | 并入主交付                                                    |
| R6  | 状态色「调试感」（合并琥珀/冻结亮蓝/拖放绿框）视觉语言                             | css:667-678                                                | watch-only（视觉语言重设计超令牌化边界，登记）                |
| R7  | fill-handle z-index 5 < frozen-separator 6（冻结末端填充柄可能被遮）               | css:74-83/:141/:703-719                                    | 并入 Phase 3 断言覆盖（实测后修或裁）                         |
| R8  | 滚动条原生样式 dark 不一致                                                         | css:25/:39 vs :744-746                                     | watch-only                                                    |
| R9  | 无斑马纹/条件格式渲染通道                                                          | 全 css/渲染路径                                            | adjudicated：显式空白非缺陷，能力型缺失归 spreadsheet roadmap |
| R10 | report 画布共用约束（双 scope）                                                    | §0                                                         | 硬约束并入主交付（dark 变体须双 scope 同时覆盖）              |

## 3. 裁决

| #   | 项                         | 裁决    | 要点                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | 29 hex 令牌收敛 + dark     | **Fix** | ~24 处映射既有 theme-tokens（hsl() 包裹：#1a73e8→--primary、#0f9d58→--success、#2196f3→--info、#ffc107→--warning、#d4d4d4→--border 族、#f6f7fa→--muted 等）；**新增 3-4 个 `--ss-*` 私有令牌**（`--ss-gridline`、`--ss-active-outline`、`--ss-header-active-bg`、`--ss-bound-bg`）定义于双 scope 并出 `[data-mode='dark']` 变体。**保真裁决点**：①#0f9d58（Google-green）映射 --success（emerald）有色相偏移——接受偏移（语义一致优先，品牌保真登记 watch-only）；②#d3e3fd 选中底与 --primary-bg（96% 亮度）近似——直接映射，不保真 |
| A2  | rgb()/rgba() 残余（R4/R5） | **Fix** | 与 hex 同 PR 收敛（同一 dark 击穿面）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| A3  | R1/R2/R3 缺陷三件套        | **Fix** | 未定义令牌定义或移除、死类补规则或删除（先红后绿）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| A4  | 值类型视觉最小实现         | **Fix** | 渲染端分派：数值（typeof number 或 numberFormat 存在）→ `ss-type-number` 右对齐 + numberFormat 基础应用（千分位/百分比/小数位）；日期 → `ss-type-date` + toLocaleDateString；文本维持。零 schema 变更                                                                                                                                                                                                                                                                                                                             |
| A5  | 视觉回归断言               | **Fix** | 扩展 spreadsheet-demo.spec（或新 spec）：冻结/填充柄/active outline/editing/selected 背景 light/dark 双态计算样式断言（复用 V0 helper + theme-switcher 先例）；合并/绑定/拖放态双态可辨识；**report-designer-demo 页纳入断言路由**（共用约束的另一半）；canvas-styles.test.ts 增「禁止裸 hex」守卫（沿其现有 no-fallback 断言模式）                                                                                                                                                                                               |

## 4. 边界

- 不做：条件格式/斑马纹（R9）、状态色视觉语言重设计（R6）、styleId 机制（css 文档 §5.1 未引入裁决维持）、spreadsheet-core 数据结构变更。
- 硬约束：双 scope 泄漏纪律（design.md §10）；`canvas-styles.test.ts` 禁 fallback 契约（宿主发布默认值的现行架构维持，`--ss-*` 定义同样放宿主或双 scope 内——落点在 plan 定）；report 画布共用为 dark 覆盖约束。
- e2e 红线：spreadsheet-demo 10 test + report-designer-demo 相关 test 零回归。
- Owner docs：spreadsheet-canvas-css.md（§2.3 示例漂移修正 + Excel-light 基线契约改述 + dark 契约新增）、design.md §12 混用风险注记、证据卡 spreadsheet.md 回写、roadmap/daily log。

## 5. 验证方式

1. 单测：canvas-styles「禁止裸 hex」守卫（先红后绿——改前红）；cell-style-map 值类型对齐分派单测。
2. e2e：双态计算样式断言（V0 helper）；spreadsheet-demo + report-designer-demo 零回归。
3. `pnpm check`：spreadsheet-renderers 在 `flux-renderers-*` 扫描集外（同 flow，核实员须复核——若在集内则新增硬编码色会被门禁拦截，令牌化方向天然合规）。

## 6. 独立核实记录

- Reviewer / Agent: 独立核实审查员（fresh sub-agent session，2026-09-21，只读 live 验证）
- Verdict: **pass**（可进入 plan draft；4 项轻微勘误：①F1 分类计数 8/12/9 已修正；②R5 第三引用 :683 移出归 R4 集，已修正；③§0 出处措辞改为「普查以域泛称指代」，已修正；④行号微漂——playground dark 块起点实为 :185/:189、cell-operations 实路径含 core/ 段、rgb()/rgba() 全量约 39 处——plan 阶段须做全量清单，不以「约 15/约 20」为交付口径）
- 已处理: 全部 Findings（F1-F5）、残余候选（R2/R3/R5/R7/R4 抽查）、A1 可行性（theme-tokens 语义变量齐备、hsl() 包裹与 --fd-\* 同构先例）、门禁定位（spreadsheet-renderers 在 RENDERER_PACKAGE_SCOPE 扫描集外）均经 live 证据确认
