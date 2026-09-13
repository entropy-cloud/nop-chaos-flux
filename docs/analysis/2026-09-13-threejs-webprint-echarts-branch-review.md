# threejs / webprint / echarts-integration 三分支实现状况审查报告

> 日期：2026-09-13
> 审查人：AI（ui-review 任务，代码审查 + playground 实机 UI 验证）
> 审查对象：`feat-threejs-integration`、`add-web-print`、`feat-echarts-integration` 三个分支及其在 master 中的落点
> 验证方式：源码静态审查（sub-agent 双路）+ 系统 Chrome headless 实机探针（截图 + `getComputedStyle`/DOM 程序化断言，探针脚本 `_tmp/ui-review/`，属临时产物）

## 0. 总体结论（TL;DR）

| 分支                       | 实现状态                                                                              | 核心结论                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add-web-print`            | **代码全部在 master**（经 merge 2066eb614），分支仅余 1 个已被 master 覆盖的冗余提交  | 功能完整、154 个单测通过；但**设计器画布的视觉层缺失**（选中框/手柄/标尺无任何 CSS，实机确认不可见）、纸张预设下拉是空操作、横向打印三处几何不一致                                                                      |
| `feat-echarts-integration` | **分支零代码**，仅 docs + mission（2 个提交）；master 已有 recharts 版 `chart` 渲染器 | 分支处于规划阶段；mission M1（基础设施）目标日期 2026-09-13 已到期、全部任务 pending；master 现有 chart 渲染器存在 **legend 标签空白**（实机确认）、首次异步加载显示"无数据"、heatmap 无坐标轴标签无 tooltip 等 P1 问题 |
| `feat-threejs-integration` | **全仓零代码**，仅 roadmap/design 文档                                                | I0–I4 全部 `todo`，无任何可审查的实现；分支相对 master 仅有 roadmap 重写（docs）                                                                                                                                        |

三方共同风险：**两个"集成"分支的代码主体实际已经进入 master**，分支本身只剩文档/冗余增量；后续应把分支定位收敛为"规划文档载体"或直接合并文档后删除分支，避免"分支存在但代码在 master"的认知漂移。

---

## 1. 分支与 master 的真实拓扑

```
master ──┬─ e0fcebbf3 (master HEAD parent)
         ├─ 包含 add-web-print 全部功能提交（fa3c2b623 flux-print-core/renderers、21817b134 demo 路由等，经 2066eb614 merge 进入）
         ├─ 包含 5c94ebd40 docs(threejs)
         └─ ...
add-web-print            : 1 个未合提交 56a57f6ad（i18n keys + 路由断言）——master 已以其他方式包含等价内容（locale 键已在、路由断言以未提交 diff 形式在工作区）
feat-echarts-integration : 2 个未合提交（docs/analysis 491 行 + roadmap + mission）——零代码
feat-threejs-integration : 1 个未合提交（roadmap 重写）——零代码
```

结论：三个分支没有任何一个需要"合并代码"；`add-web-print` 的增量是冗余的，echarts/threejs 的增量是纯文档。

## 2. add-web-print（web 打印）

### 2.1 实现完整度 vs roadmap

P0–P4 全部落地（research/design、双包基础设施、设计器、渲染/打印/PDF、playground 演示 + e2e），P5 审计整改完成。单元测试 154 个全部通过（flux-print-core 82 + flux-print-renderers 72）。

### 2.2 UI 设计美观/完整性 —— 实机验证的问题

| #   | 严重度 | 问题                                                                                                                                                                                                                                                                                                                                        | 证据                                                                                                                                                                                                                                                                                                       |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W-1 | **P1** | **设计器画布视觉层整体缺失**：`nop-print-canvas-ruler-*`、`nop-print-element-selected`、`nop-print-element-handle`、`nop-print-element-rotate-handle`、`nop-print-region-*` 在仓库任何位置都没有 CSS 定义（包内无 .css、playground styles.css 无、ui 包无）。全仓只有 flow-designer-renderers 附带 `designer-theme.css`，print 包没有对应物 | 实机：选中元素后 `outline: none 3px rgb(33,53,71)`（outline-style 为 none → 不可见）；8 个 resize 手柄 + 旋转手柄 `background: rgba(0,0,0,0)`、无边框 → 完全透明；标尺容器 `position: static`、`overflow: visible`，刻度 span `display: inline`、16px 字号 → 52 个刻度数字以文本流形式堆叠渲染（截图确认） |
| W-2 | **P1** | 纸张预设下拉是**功能空操作**：`print-inspector.tsx:127` 仅写入 `paperName` 标签，从不应用 `PAPER_SIZE_PRESETS` 的宽高；选择 A5 后页面仍是 210×297                                                                                                                                                                                           | 代码路径确认 + 现有测试只断言 select 存在（`print-inspector.test.tsx:152`）                                                                                                                                                                                                                                |
| W-3 | **P1** | **横向打印（direction: horizontal）三处几何互相矛盾**：`render-html.ts:150-154` 只对 `@page` 交换宽高而 `.fmt-page`（:129-131）用原始纵向尺寸；`export-pdf.ts:56-60` 用原始尺寸 + 按 `widthMm > heightMm` 推导方向 → 打印输出与 PDF 输出不一致、页面内容与 @page 不符。零测试覆盖                                                           | 代码确认                                                                                                                                                                                                                                                                                                   |
| W-4 | P2     | `print-designer-canvas.tsx:206-208`：style 对象中 `backgroundImage` 声明在 `background` 简写之前，一旦模板设置 `page.background` 网格即被简写重置清掉（当前 demo 未触发，属潜伏缺陷）                                                                                                                                                       | 代码确认                                                                                                                                                                                                                                                                                                   |
| W-5 | P2     | `print-preview.tsx:61` 诊断警告色 `text-amber-600` 无 `dark:` 变体（对照 ui/badge.tsx:20 的 `text-amber-700 dark:text-amber-400` 惯例）                                                                                                                                                                                                     | 代码确认                                                                                                                                                                                                                                                                                                   |
| W-6 | P2     | 调色板使用原生 `<button>`（AGENTS.md 强制 UI 组件规则的例外情形——需 Button 化）；空态未用 `Empty` 组件；预览 iframe 固定 420px 高度                                                                                                                                                                                                         | 代码确认                                                                                                                                                                                                                                                                                                   |
| W-7 | P2     | 吸附辅助线已计算但从不渲染（`canvas-math.ts:84-89` 注释明言"供画布绘制辅助线"，`print-designer-canvas.tsx:130` 丢弃返回值）；design.md §8 的 Alt 临时禁用吸附未实现（Alt 只用于旋转自由模式）                                                                                                                                               | 代码确认                                                                                                                                                                                                                                                                                                   |

### 2.3 代码质量（摘要）

P0 无。P1 见上表。P2 级：验证计数仅按钮点击时更新（design.md §10 的元素级标红未实现）、`printDate` 每页重绑定取不同 `new Date()`、旋转元素按未旋转 AABB 排版、PDF 导出用 JPEG（文本页有压缩伪影）、设计态 ImageRenderer 忽略 `fit`、类型逃逸（`as never` 等 4 处）、`resetPrintElementIdSeq` 测试专用导出泄漏进生产 barrel、iframe 打印清理无超时兜底、诊断信息全部硬编码中文（88 个 `flux.print.*` 键本身在两个 locale 中齐备）。

## 3. feat-echarts-integration（echarts 集成）

### 3.1 分支本体

仅 2 个 docs 提交（analysis 491 行 rev3 + roadmap 120 行 + mission 208 行 + 4 个文档锚点更新）。E1.1–E5.2 全部 `todo`。**mission M1（基础设施）目标日期 2026-09-13（今日）已到期，T1.1–T1.5 全部 pending/unassigned。** 文档路径问题：analysis 文件放在仓库根 `analysis/` 而非 `docs/analysis/`；`docs/index.md:109` 标注 "rev 2" 实为 rev 3。

### 3.2 master 现有 chart 渲染器（recharts）—— 实机验证的问题

| #   | 严重度 | 问题                                                                                                                                                                                                                                                                                                                                                                     | 证据                                                                                                                       |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| E-1 | **P1** | **legend 标签空白**：`chart-renderer.tsx:132-136` 的 `chartConfig` 以 series `name` 为键，而 `ui/chart.tsx:311` 的 `ChartLegendContent` 以 `nameKey ?? item.dataKey ?? 'value'`（= `dataRegionKey`）查找且 `:331` 渲染 `{itemConfig?.label}` **无回退** → 只要 `dataRegionKey !== name`（仓库自己的规范写法，`m4-data-display-demo.tsx:106-109`），legend 只剩色点无文字 | 实机：chart-lab 页 6 个 legend 全部 `text: ""`；m4-data 演示同样。单测全部 mock 了 recharts + ui/chart，恰好测不到这条缝隙 |
| E-2 | **P1** | 首次异步加载显示"无数据"而非 loading：`chart-renderer.tsx:567` 先判 `isEmpty` 再判 `loading`，source 为空 + loading:true 的首次加载渲染空态                                                                                                                                                                                                                              | 代码路径确认                                                                                                               |
| E-3 | **P1** | heatmap 无坐标轴标签、无 tooltip、无色阶图例：`chart-heatmap.tsx:86-115` 的 xLabels/yLabels 只输出为 `data-*` 测试属性，SVG 中只有 `<rect>`，用户看到的是无标注的方格阵，与其他图表类型的 UX 基线不符                                                                                                                                                                    | 代码确认                                                                                                                   |
| E-4 | P2     | `yAxisId` 未做上界收敛（`chart-sanitize.ts:54-57` 只验 ≥0，`yAxisId:5` + 2 轴会指向不存在的轴）；`xAxis` prop 无消毒（`:111` 盲转型，字符串输入会静默丢 X 轴）                                                                                                                                                                                                           | 代码确认                                                                                                                   |
| E-5 | P2     | 硬编码英文：`chart-renderer.tsx:138` `'Value'` 回退、`:264` `References: `、`chart-heatmap.tsx:96` `${name} heatmap`（其余全部正确走 i18n）                                                                                                                                                                                                                              | 代码确认                                                                                                                   |
| E-6 | P2     | ResizeObserver 回调无节流（连续拖拽容器宽度时每帧全量重渲染）；`chart-renderer.tsx` 621 行超 500 行阈值（design.md §11 自己规定了拆分方案）；`.nop-chart` marker 在渲染器根与 ChartContainer 双重出现（e2e 被迫 `.first()`）；scatter 的 X 轴映射语义错误（`dataKey={xKey}` 但数据已映射为 `{x,y}` 对象）；pie 静默忽略第 2+ 个 series                                   | 代码确认                                                                                                                   |

主题/响应式/空态/无障碍整体良好（CSS 变量驱动配色、RO 容器宽度优先、sr-only 数据表、focus ring）。

## 4. feat-threejs-integration（threejs 集成）

- 全仓（master + 分支）无任何 threejs 代码（无 `three` 依赖、无 `THREE.` 引用、无 `three-canvas` 渲染器）。
- 已有产物：`docs/components/threejs-integration/design.md`（v4 设计）、`docs/analysis/threejs-integration-analysis.md`（调研）、roadmap（I0–I4 全 todo）。分支未合提交为 roadmap 按 authoring guide 的重写。
- **无 UI 可审查。** 主要风险是排期：按 mission 节奏 I1.1（设计共识审查）未开始，I2 核心引擎在其后。
- 建议：分支上的 roadmap 重写值得合入 master（纯文档），避免双份 roadmap 漂移。

## 5. 修复记录（本次执行）

| 问题     | 修复                                                                                                                                                                              | 落点                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| W-1      | 新增 `print-designer.css`：标尺（定位+刻度绝对定位+刻度线）、选中框、8 向手柄、旋转手柄、页眉/页脚/正文区域虚线参考线、纸张投影/光标；包 `sideEffects`/`exports`/`build` 脚本接线 | flux-print-renderers                               |
| W-2      | 预设下拉真实应用预设宽高（按当前 direction 换算），`as never` 移除                                                                                                                | print-inspector.tsx                                |
| W-3      | 统一为"`paper.width/height` 即字面页面尺寸，direction 只作元数据"：`@page` 不再交换宽高；direction 切换时 inspector 交换当前宽高 → 三处几何一致                                   | render-html.ts + print-inspector.tsx               |
| W-4      | style 对象属性重排，`background` 简写置于 `backgroundImage` 之前                                                                                                                  | print-designer-canvas.tsx                          |
| W-5      | `text-amber-600` → 补 `dark:text-amber-400`                                                                                                                                       | print-preview.tsx                                  |
| W-6      | 调色板项 Button 化                                                                                                                                                                | print-palette.tsx                                  |
| E-1      | `chartConfig` 以 `dataRegionKey ?? name` 为主键（保留 name 别名）；`ChartLegendContent` 增加 `itemConfig?.label ?? item.value ?? item.dataKey` 回退链                             | chart-renderer.tsx + ui/chart.tsx                  |
| E-2      | loading 判断提前于 isEmpty                                                                                                                                                        | chart-renderer.tsx                                 |
| E-3      | heatmap 增加坐标轴文字标签（左/下留白槽）、每格 `<title>` 原生 tooltip、aria 标签 i18n 化                                                                                         | chart-heatmap.tsx + chart-renderer.tsx             |
| E-5      | `'Value'`/`References: `/heatmap aria 改走 `flux.chart.*` i18n 键（两 locale 新增）                                                                                               | chart-renderer.tsx + chart-heatmap.tsx + flux-i18n |
| 路由断言 | print-designer ROUTE_ASSERTIONS（工作区已有未提交版本，随本次一并提交）                                                                                                           | playground-entry-pages.spec.ts                     |

**遗留（登记不改，按严重度排序）**：W-3 的布局引擎对旋转元素的 AABB 处理、autoGrow 尾片高度、`printDate` 跨页一致性、PDF JPEG→PNG、吸附辅助线渲染 + Alt 禁用吸附、验证实时化/元素级标红、`chart-renderer.tsx` 拆分（621 行）、E-4/E-6 各项、echarts mission M1 排期重排、threejs roadmap 合入。详见上文各表。

## 6. 分支处置建议

1. `add-web-print`：master 已含全部功能；分支可弃（冗余提交无需合并）。
2. `feat-echarts-integration`：把 2 个 docs 提交合入 master（analysis 文件应移到 `docs/analysis/`），分支转为按 mission 推进的开发分支或删除。
3. `feat-threejs-integration`：合入 roadmap 重写（纯文档），实现开始前分支仅作规划载体。
