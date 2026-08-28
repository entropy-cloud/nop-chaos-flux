# R2 全量 UI 一致性审查 — G3 组独立复核报告（review-g3）

> 复核角色: 独立复核子 agent（与发现 agent 非 session）· 复核日期: 2026-08-29 · HEAD `0f183874a25f942c234b9806b1546c6f37ee5a85`（与派发基线一致）
> 复核对象: G3 组 50 条（R1 26 / R2 9 / R3 7 / R4 4 / R5 3 / R6 1）
> 性质: 只读复核；本文件是本次任务唯一写入口。

---

## ① 复核概要

### 方法

1. **先读 live code、后对结论**：每条发现先按其 文件:行号 用 Read/Grep 打开 live code 独立判定，再与发现原文比对。未采信发现原文的任何未验证断言。
2. **依赖源码核实**：`@base-ui/react@1.3.0` 的 `RadioRoot.js`（:58/:78）、`MenuItem.js`（:25 closeOnClick 默认 true）、`MenuRoot.js`（:348 挂载 useTypeahead）、`floating-ui-react/hooks/useTypeahead.js`（:96-99 open 态对所有单字符键 `stopEvent`，无 target 检查）；TanStack Virtual `getScrollElement: null` 路径为静态推断。
3. **运行时独立探针**（Playwright + playground dev server，脚本留 `_tmp/r2-g3-review-probe{,4,5}.mjs`，探针不作为唯一证据、仅作加强）：
   - standard-crud 页：6 个列宽手柄几何测量 + 包含块逐级回溯（复核 [G3-R4-视角8-01]）。
   - inline-edit-table 页：表头 th 数 vs 表体 td 数、colgroup col 数、保存条按钮顺序（复核 [G3-视角5-01]/[G3-视角2-02]）。
   - dashboard-demo 页：preview 态 Delete 按钮 disabled 状态、点击后回 edit 态面板数（复核 [G3-R5-视角3-01]）；palette 两次新增面板落点（复核 [G3-R3-视角11-01]）。
   - 列宽手柄 `focus()` 后 computed style（复核 [G3-视角3-01]）。
4. **HIGH 5 条逐项复核**（详见 ④）；MEDIUM/LOW 按组件/模式批量判定；`[scope-conflict]` 3 条按主要影响裁定（详见 ⑤）。
5. **引根/去重核验**：7 个跨条目引根全部在 round-01/round-02 定位确认存在；组内无完全重复对。

### 计数口径说明（与派发头的差异）

派发任务书写 "HIGH 5 / MEDIUM 36 / LOW 9"。**round 文件原文的实际分布为 HIGH 5 / MEDIUM 29 / LOW 16**（R1 1/16/9、R2 0/5/4、R3 2/3/2、R4 2/2/0、R5 0/2/1、R6 0/1/0；合计 50 ✓）。本复核未找到任何记载 36/9 的合并/调级工件，按逐条独立判级口径执行并在此留档。

### 结论计数

| 判定     | 数量                   | 明细                                      |
| -------- | ---------------------- | ----------------------------------------- |
| **保留** | **47**                 | 含 5 条 HIGH 全部保留                     |
| **降级** | **3**（均 MEDIUM→LOW） | [G3-视角3-01] [G3-视角3-02] [G3-视角3-04] |
| **驳回** | **0**                  | —                                         |

复核后分布：**HIGH 5 / MEDIUM 26 / LOW 19**。
严重度变化的根因单一：三条 focus ring 发现的"无任何焦点指示"表述与事实不符——元素均未声明 `outline-none`，键盘聚焦时存在浏览器 UA 默认 outline（探针实测 computed `outline: auto 1px`），沿本项目已立先例 `[G7-视角3-15]`（存在默认指示 → LOW，见 round-04 自查节引用）。

---

## ② 逐条复核清单表（50 行全覆盖）

判定列：保留 / 降级（附新严重度）/ 驳回。行号为 live code 实测位置（与发现原文引用的偏差 ≤2 行，全部命中）。

| #   | 条目                                                           | 原严重度 | 判定 | 新严重度 | 一句话复核依据                                                                                                                                                                                                                                                     |
| --- | -------------------------------------------------------------- | -------- | ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | [G3-视角3-01] 列宽手柄无 focus-visible ring                    | MEDIUM   | 降级 | LOW      | className 确无 focus-visible 类，但无 `outline-none` 重置 → 键盘聚焦仍有 UA 默认 outline（探针实测）；沿 [G7-视角3-15]"存在默认指示→LOW"先例                                                                                                                       |
| 2   | [G3-视角3-02] 行拖拽手柄无 focus-visible ring                  | MEDIUM   | 降级 | LOW      | 同上：24×24 手柄 + `role="button" tabIndex=0` 属实（use-row-drag-sort.ts:243-245），无 outline-none → UA 默认指示存在                                                                                                                                              |
| 3   | [G3-视角3-03] 独立分页禁用态无视觉禁用                         | MEDIUM   | 保留 | MEDIUM   | pagination-renderer.tsx:239-249/313-324 仅 aria-disabled；ui pagination.tsx 无 aria-disabled 样式消费；同包 table-pagination-bar.tsx:84/143 与 crud-renderer-toolbar.tsx:133/146 均有 `pointer-events-none opacity-50`，跨实现不一致属实                           |
| 4   | [G3-视角3-04] 画布体/面板无 focus-visible ring                 | MEDIUM   | 降级 | LOW      | editor-canvas.tsx:197-232 属实，但同样未禁用 UA outline；选中面板另有 ring-2，存在默认指示 → 沿先例 LOW                                                                                                                                                            |
| 5   | [G3-视角2-01] Save 用 outline 变体                             | LOW      | 保留 | LOW      | dashboard-editor-renderer.tsx:256-261 outline vs :282 模式切换 default，属实                                                                                                                                                                                       |
| 6   | [G3-视角2-02] 行保存条按钮顺序                                 | MEDIUM   | 保留 | MEDIUM   | 探针实测保存条按钮序 = ["保存","取消"]；同文件 dialog footer 为 [关闭][保存]；styling-system.md:594 明文 `[secondary, primary]`                                                                                                                                    |
| 7   | [G3-视角4-01] 搜索 Input 嵌 DropdownMenuContent                | MEDIUM   | 保留 | MEDIUM   | table-header-row.tsx:256-281 属实；Base UI 1.3.0 useTypeahead 对 open 态全部单字符键 stopEvent 且无 target 检查（useTypeahead.js:96-99）→ 打字极可能被吞；模式偏离 AntD（Popover）/shadcn（Popover）属实。建议修复时补运行时断言；若实测打字完全不可用可再升 HIGH  |
| 8   | [G3-视角4-02] 列搜索无清除按钮                                 | LOW      | 保留 | LOW      | Input 无 type=search/无清除项，属实                                                                                                                                                                                                                                |
| 9   | [G3-视角5-01] `__row_save_bar__` 列无配对表头                  | HIGH     | 保留 | HIGH     | 探针实测：表头 6 th vs 表体 7 td（多 `table-row-save-bar-cell`）、colgroup 6 col、columnCount 无此项；孤儿无表头列常驻主路径。注：纯 quick-edit 场景"整表列错位"表述偏强（数据列按位仍对齐），精确表象=尾部孤儿列+固定右列时几何破坏/保存条被钉住列叠压，HIGH 维持 |
| 10  | [G3-视角5-02] 无限滚动 loading 纯文本                          | MEDIUM   | 保留 | MEDIUM   | crud-infinite-scroll-area.tsx:32-40、list-renderer.tsx:467-473 属实；同包 table-loading-overlay/chart 用 ui Spinner                                                                                                                                                |
| 11  | [G3-视角5-03] list 加载失败无重试                              | MEDIUM   | 保留 | MEDIUM   | list-renderer.tsx:405-413 仅文本；CRUD 侧 Retry 按钮在 crud-infinite-scroll-area.tsx:50-82，同项目行为分裂属实                                                                                                                                                     |
| 12  | [G3-视角5-04] chart/tree 空态无样式                            | MEDIUM   | 保留 | MEDIUM   | chart-renderer.tsx:567-568、tree-renderer.tsx:557-559 裸 div 属实；pivot-empty（pivot-renderer.tsx:233）/list-empty（:397）有 muted 居中基线                                                                                                                       |
| 13  | [G3-视角5-05] dashboard 空布局全空白                           | MEDIUM   | 保留 | MEDIUM   | dashboard-renderer.tsx:82-95 无 fallback 属实                                                                                                                                                                                                                      |
| 14  | [G3-视角5-06] 虚拟/非虚拟空态布局不一致                        | LOW      | 保留 | LOW      | table-body-rows.tsx:202-207 vs :392-406（200px 居中）属实                                                                                                                                                                                                          |
| 15  | [G3-视角5-07] 会话未就绪孤立省略号                             | LOW      | 保留 | LOW      | dashboard-editor-renderer.tsx:205-207 字面量 "…" 属实                                                                                                                                                                                                              |
| 16  | [G3-视角7-01] stat-tile 硬编码 emerald/red                     | MEDIUM   | 保留 | MEDIUM   | stat-tile-renderer.tsx:148-152 属实；同包 sparkline-renderer.tsx:18-22 用 `hsl(var(--success/--destructive))`；theme-tokens 已发布 `--success`（styles.css:122）                                                                                                   |
| 17  | [G3-视角7-02] 标记点默认色 '#ef4444'                           | LOW      | 保留 | LOW      | chart-renderer.tsx:323 字面量属实；同文件其余默认色走 `--chart-*`                                                                                                                                                                                                  |
| 18  | [G3-视角8-01] 运行态固定 1200px 坐标                           | MEDIUM   | 保留 | MEDIUM   | dashboard-renderer.tsx:80/120 属实；编辑态 editor-canvas.tsx:39-56 用 ResizeObserver 实测，两形态不同构                                                                                                                                                            |
| 19  | [G3-视角9-01] 编辑器多处英文硬编码                             | MEDIUM   | 保留 | MEDIUM   | editor-inspector.tsx:45-117、editor-palette.tsx:20-25、editor-canvas.tsx:200/222/241、dashboard-editor-renderer.tsx:339/346 字面量属实；同文件其余文案已走 `t()`，对比成立                                                                                         |
| 20  | [G3-视角9-02] aria-label 暴露 panel id                         | LOW      | 保留 | LOW      | editor-canvas.tsx:241 属实                                                                                                                                                                                                                                         |
| 21  | [G3-视角9-03] aria-multiselectable 无多选行为 [scope-conflict] | MEDIUM   | 保留 | MEDIUM   | tree-renderer.tsx:555/572 + `aria-selected={isTabbable}`（:277）属实；`multiple` 仅 schema 声明（schemas.ts:244）无选择集实现                                                                                                                                      |
| 22  | [G3-视角9-04] sparkline 整体 aria-hidden                       | LOW      | 保留 | LOW      | sparkline-renderer.tsx:86-87 `role="img"+aria-hidden` 并存属实；chart 有 sr-only 摘要基线（:588-596）                                                                                                                                                              |
| 23  | [G3-视角10-01] 同包三种分页 UI                                 | MEDIUM   | 保留 | MEDIUM   | TablePaginationBar（页码窗口+pageSize）/crud toolbar 分页块（prev/next+页码文本）/CrudListPagination（first/prev/next/last）三套能力与形态均不同，属实                                                                                                             |
| 24  | [G3-视角4-03] JSON Apply 静默失败                              | MEDIUM   | 保留 | MEDIUM   | editor-inspector.tsx:185-202 catch 空吞属实                                                                                                                                                                                                                        |
| 25  | [G3-视角11-01] 未注册类型渲染空卡片壳                          | LOW      | 保留 | LOW      | dashboard-renderer.tsx:97-105 console.warn+null，壳照常渲染属实                                                                                                                                                                                                    |
| 26  | [G3-视角11-02] heatmap 无数值提示                              | LOW      | 保留 | LOW      | chart-heatmap.tsx:99-113 仅 data-cell-value/透明度编码，无 title/tooltip 属实                                                                                                                                                                                      |
| 27  | [G3-R2-视角3-01] toggleOnRowClick 无键盘等价                   | MEDIUM   | 保留 | MEDIUM   | table-body-row-rendering.tsx:180-186 有 toggle 分支、:201-215 无，属实                                                                                                                                                                                             |
| 28  | [G3-R2-视角4-01] maxSelectionLength 全链路静默                 | MEDIUM   | 保留 | MEDIUM   | use-table-selection.ts:259-261 静默 return、:138-143 isAtMax、行 checkbox 置灰无 title（:171-173）、selectAllDisabled（table-renderer.tsx:606），无任何计数呈现，属实                                                                                              |
| 29  | [G3-R2-视角4-02] Inspector Label 未关联控件                    | MEDIUM   | 保留 | MEDIUM   | editor-inspector.tsx:122-129 无 htmlFor/id/aria-label，属实                                                                                                                                                                                                        |
| 30  | [G3-R2-视角4-03] 数字清空即写 0                                | LOW      | 保留 | LOW      | `Number('') === 0` 且 `Number.isFinite(0)` → onChange(0)，属实                                                                                                                                                                                                     |
| 31  | [G3-R2-视角6-01] 上移/下移点击即关菜单                         | MEDIUM   | 保留 | MEDIUM   | table-renderer.tsx:465-478 未传 closeOnClick；Base UI MenuItem 默认 true（node_modules :25）；ui dropdown-menu 包装未覆盖（grep 无 closeOnClick）；同菜单 CheckboxItem 不关，自相矛盾属实                                                                          |
| 32  | [G3-R2-视角8-01] 删除钮 hover-only + display:none              | LOW      | 保留 | LOW      | editor-canvas.tsx:235-253 `hidden group-hover:flex` + size-5 属实                                                                                                                                                                                                  |
| 33  | [G3-R2-视角9-01] pivot 画布无 role/aria-label                  | MEDIUM   | 保留 | MEDIUM   | pivot-renderer.tsx:254-257 属实；renderer-markers-and-selectors.md:81-84 成文契约 + attachPivotEvents（:161，click/sort/drill 交互注入）属实                                                                                                                       |
| 34  | [G3-R2-视角10-01] copyable 失败零反馈                          | LOW      | 保留 | LOW      | table-cell-chrome.tsx:83-91 失败分支空属实；text.tsx:75-77 toast 基线属实                                                                                                                                                                                          |
| 35  | [G3-R2-视角10-02] 树表懒加载手写 spinner                       | LOW      | 保留 | LOW      | table-body-row-rendering.tsx:372 手写圆环属实；grep 证实为 data/dashboard/pivot 三包唯一一处                                                                                                                                                                       |
| 36  | [G3-R3-视角4-01] 虚拟化 radio 完全失效                         | HIGH     | 保留 | HIGH     | VirtualBody 裸 `<TableBody>`（table-body-rows.tsx:391）无 RadioGroup 包裹（非虚拟分支 :288-299 有）；RadioRoot.js:58 `?? NOOP` / :78 `checked = groupContext ? … : value === ''` 逐字证实——点击/选中态双重失效成立                                                 |
| 37  | [G3-R3-视角8-01] draggable 列无配对表头                        | HIGH     | 保留 | HIGH     | drag 单元格在行首（table-body-row-rendering.tsx:235-248）→ 表头全部按位错一列；header/colgroup（table-renderer.tsx:332-345）/createFixedColumnLayout（fixed-columns.ts:61-88）均无 `__drag__`；columnCount 反而计入 draggable（:381）证明契约意图，HIGH 成立       |
| 38  | [G3-R3-视角4-02] 树表全选 checked 基准错位                     | MEDIUM   | 保留 | MEDIUM   | table-renderer.tsx:592 sourceLength=顶层 filteredData vs :598 selectedRowCount=扁平化选择集；checked 交叉校验（table-header-row.tsx:418）在树表展开后必假，反馈与事实相反属实                                                                                      |
| 39  | [G3-R3-视角5-01] 行保存失败零反馈                              | MEDIUM   | 保留 | MEDIUM   | 唯一 hook 调用点未传 onSaveError（table-body-row-rendering.tsx:125-130）；catch 仅 `onSaveError?.()`（use-row-quick-edit-draft.tsx:224-226）；同包 cell 级 env.notify 基线属实（table-quick-edit-cell.tsx:93-98；crud-renderer.tsx:477-484）                       |
| 40  | [G3-R3-视角11-01] 新增面板固定 (0,0) 无碰撞                    | MEDIUM   | 保留 | MEDIUM   | dashboard-editor-renderer.tsx:175 恒 `{x:0,y:0}` 属实；探针实测新面板 left/top=0px；findOverlappingPanels 仅 index.ts:20 导出、无交互消费                                                                                                                          |
| 41  | [G3-R3-视角4-03] 列可全部隐藏无守卫                            | LOW      | 保留 | LOW      | use-table-visible-columns.ts:98-132 无最小可见守卫，属实                                                                                                                                                                                                           |
| 42  | [G3-R3-视角8-02] touch-none 阻断画布滚动                       | LOW      | 保留 | LOW      | editor-canvas.tsx:191 `touch-none overflow-auto` 并用属实                                                                                                                                                                                                          |
| 43  | [G3-R4-视角8-01] resize 手柄逃逸包含块                         | HIGH     | 保留 | HIGH     | **独立运行时复现**（见 ④-A），与发现原文测量一致                                                                                                                                                                                                                   |
| 44  | [G3-R4-视角5-01] autoFillHeight×virtual ref 互斥               | HIGH     | 保留 | HIGH     | ref 回调 if/else 互斥逐字证实（table-renderer.tsx:550-558）；TanStack getScrollElement null → 空窗口、空态分支被 `flattenedItems.length > 0` 绕过（:392/407-416），零行渲染成立（静态推断闭合，见 ④-B）                                                            |
| 45  | [G3-R4-视角8-02] 嵌套表头共用 top:0 粘性                       | MEDIUM   | 保留 | MEDIUM   | table-header-row.tsx:512-530 每行同 stickyStyle(top:0,zIndex:3)+不透明背景 → 滚动后叶子行按文档序覆盖组行，CSS 行为确定                                                                                                                                            |
| 46  | [G3-R4-视角4-01] virtualRow.index 参与重排                     | MEDIUM   | 保留 | MEDIUM   | table-body-rows.tsx:438 下传虚拟索引；flattenedItems 含 expanded 条目（table-flattened-items.ts:62-63）；reorderArray/键盘 targetIndex 同索引空间（use-row-drag-sort.ts:194/211-217），属实                                                                        |
| 47  | [G3-R5-视角4-01] Inspector 写入绕过钳制层                      | MEDIUM   | 保留 | MEDIUM   | updatePanel 直写（editor-inspector.tsx:208-216）、adapter validate finite-only（dashboard-domain-adapter.ts:149-151）、运行态 sanitizePanels 钳制（layout-math.ts:245-248），链路完整成立                                                                          |
| 48  | [G3-R5-视角3-01] preview 态 Delete 可用                        | MEDIUM   | 保留 | MEDIUM   | 探针实测：preview 态 Delete `disabled=false`，点击后 working 文档确实删面板（回 edit 态 4→3）；setMode/update 均无 mode 门控（editor-core.ts:159-167/261-265），成立                                                                                               |
| 49  | [G3-R5-视角3-02] 面板移动/缩放无键盘通道 [scope-conflict]      | LOW      | 保留 | LOW      | handleKeyDown（editor-canvas.tsx:142-168）无方向键分支、resize 手柄纯 pointer（:273-282），属实                                                                                                                                                                    |
| 50  | [G3-R6-视角8-01] combineNum×展开行 rowSpan 跨行                | MEDIUM   | 保留 | MEDIUM   | combine-cells.ts:51-53 护栏仅认 virtual；rowSpan 按纯数据行序列计数（:63-95）；非虚拟展开行交错同 tbody（table-body-rows.tsx:226-284）→ rowSpan 物理跨详情行；design.md E1b 仅登记 combine×virtual 限制，属实                                                      |

---

## ③ 去重记录

### 引根存在性核验（全部通过）

| 条目              | 引根             | 引根位置         | 修复面互不覆盖                                                                         |
| ----------------- | ---------------- | ---------------- | -------------------------------------------------------------------------------------- |
| [G3-R3-视角8-01]  | [G3-视角5-01]    | round-01.md:1144 | ✓ 拖拽列（行首、几何/固定列偏移）vs 保存条列（行尾、header/colgroup 计数）             |
| [G3-R2-视角4-01]  | [G2-视角4-02]    | round-01.md:532  | ✓ checkbox-group vs 表格三通道                                                         |
| [G3-R2-视角4-02]  | [G5-视角4-01]    | round-01.md:2115 | ✓ scada vs dashboard Inspector                                                         |
| [G3-R2-视角4-03]  | [G5-视角4-03]    | round-01.md:2168 | ✓ scada vs dashboard NumberInput                                                       |
| [G3-R2-视角8-01]  | [G4-视角8-02]    | round-01.md:1787 | ✓ kanban vs dashboard 编辑画布                                                         |
| [G3-R2-视角9-01]  | [G5-视角9-01]    | round-01.md:2275 | ✓ map viewport vs pivot 画布                                                           |
| [G3-R2-视角10-01] | [G1-视角10-13]   | round-01.md:357  | ✓ json-view vs 表格单元格                                                              |
| [G3-R2-视角10-02] | [G4-视角10-01]   | round-01.md:1866 | ✓ scheduling vs data 包树表                                                            |
| [G3-R5-视角3-01]  | [G5-R2-视角3-03] | round-02.md:1091 | ✓ scada 编辑器 vs dashboard header 动作组                                              |
| [G3-R6-视角8-01]  | [G3-R4-视角4-01] | round-04.md:409  | ✓ 触发条件互斥（虚拟 vs 非虚拟）、修复点（索引换算 vs 合并退化）互不覆盖，引根论证成立 |

### 组内潜在重复排查（无合并项）

- [G3-视角5-02]（无限滚动无 Spinner）× [G3-R2-视角10-02]（手写 spinner）：同一 "Loading=Spinner" 基线，但缺陷模式不同（缺失 vs 实现偏离），修复点不同（补组件 vs 替换实现），维持分立。
- [G3-视角5-04]/[G3-视角5-05]/[G3-视角11-01]：同属"空态/缺失态无提示"族，三个组件三处修复点，维持分立。
- [G3-视角3-01]/[G3-R4-视角8-01]：同一手柄的焦点视觉 vs 包含块几何，根因与证据链独立（round-04 已自证，复核确认）。
- [G3-R2-视角4-03] × [G3-R5-视角4-01]：空串解析缺陷 vs 范围钳制缺失，R2 条目的修复（忽略空输入）不改变 -5/99 可写入，互不覆盖，确认。
- 50 条两两之间未发现完全重复；dedup-baseline §1（ma5-ux 已修复 6 条无复活）、§3（8 条误报模式均未踩）、§4（维度 09-12/20 未越界）复核合规。

---

## ④ 高风险逐项复核详情（5 条）

### A. [G3-R4-视角8-01] 列宽拖拽手柄逃逸包含块（HIGH → 保留 HIGH）

**复核过程**：① 静态复核——table-header-row.tsx:161 手柄 `absolute right-0 top-0 h-full`；其祖先链 `div.flex`（无定位）→ `TableHead`（:174-176，仅 fixed 列经 cellProps 带 sticky）→ tr/thead/table 无定位 → ui table.tsx:8 `div[data-slot="table-container"] relative` 为唯一定位祖先；table.css:5-11 `.nop-table thead th` 无 position 声明。CSS 包含块规则下结论确定。② 独立运行时探针（`_tmp/r2-g3-review-probe.mjs`，standard-crud 页 1400×900）：6 个手柄中 5 个 `right=1344`（=容器右缘）、`height=590`（=全表高），各列真实 th 右缘 433/592/843/957/1162 无一命中；逐级回溯包含块均为 `table-container`；唯一第 6 个手柄（fixed:'right' 操作列，th 自身 sticky 成为包含块）锚定正确——与发现原文的实测数据完全吻合。**结论**：默认开启的列宽拖拽对所有非固定列鼠标不可用，主路径功能缺陷，HIGH 维持。

### B. [G3-R4-视角5-01] autoFillHeight × virtualThreshold ref 路由互斥（HIGH → 保留 HIGH）

**复核过程**：① 静态复核——table-renderer.tsx:550-558 同一 ref 回调内 `if (element && autoFillActive) {…} else if (element && virtualEnabled) { scrollRef.current = element }`，二者并存时 scrollRef 恒为 null，逐字证实；两 prop 均为合法 schema 项（schemas.ts:150/159）且无互斥校验。② 下游行为推断——VirtualBody `getScrollElement: () => parentRef?.current ?? null`（table-body-rows.tsx:376）；TanStack Virtual 滚动元素为 null 时无测量/窗口为空 → `getVirtualItems() = []`、垫行守卫 `getTotalSize() > 0`/`items.length > 0` 均不渲染 → `<tbody>` 零行；空态分支被 `flattenedItems.length === 0` 前置条件绕过（:392 vs :407）。该条为静态推断闭合（未搭组合 schema 页做运行时复现），但 ref 路由是确定性行为，推断链无自由度。**结论**：合法配置组合导致整表数据不可见且无任何提示，HIGH 维持；修复建议（拆互斥路由 + 组合断言）可行。

### C. [G3-R3-视角4-01] 虚拟化 radio 行选择完全失效（HIGH → 保留 HIGH）

**复核过程**：① 静态复核——非虚拟分支 RadioGroup 受控包裹（table-body-rows.tsx:288-299）；VirtualBody 直接 `return <TableBody>`（:391）无任何 RadioGroup；RadioGroupItem 渲染于 DataRowView（table-body-row-rendering.tsx:301-306）。② 依赖源码逐字核验——`node_modules/.pnpm/@base-ui+react@1.3.0_*/…/radio/root/RadioRoot.js`:58 `const setCheckedValue = groupContext?.setCheckedValue ?? NOOP`、:78 `const checked = groupContext ? checkedValue === value : value === ''`——与发现引用完全一致：无 group 时 checked 恒 false（rowKey 非空串）、点击写入为 NOOP。**结论**：单选表格数据量超过 virtualThreshold 即选中功能整体失效，视觉与交互双重损坏，HIGH 维持。

### D. [G3-R3-视角8-01] draggable 列无配对表头（HIGH → 保留 HIGH）

**复核过程**：静态复核三处配对面——① body 行首 drag 单元格（table-body-row-rendering.tsx:235-248）vs 表头 flat/nested 两路径均只有 expand/selection/数据列（table-header-row.tsx:398-451/532-569）；② colgroup 仅 `__expand__/__selection__/数据列`（table-renderer.tsx:332-345）；③ createFixedColumnLayout 仅消费 rowSelection/expandable（fixed-columns.ts:70-88），无 `__drag__` 条目。由于 drag 列位于行首，表头每一列相对表体按位左移一格——比行尾追加的保存条列（复核条目 9）错位更彻底；columnCount 反而计入 draggable（:381），证明该列本应拥有全套配对。运行时未复现（playground 无 draggable 表格页），但单元格按位对齐是 HTML 表格确定性行为。**结论**：永久全表列错位 + 固定列偏移连带错位，HIGH 维持（与 [G3-视角5-01] 同批"查全类"修复）。

### E. [G3-视角5-01] `__row_save_bar__` 列无配对表头（HIGH → 保留 HIGH，表象表述修正）

**复核过程**：① 静态复核——body 行尾追加保存条单元格（table-body-row-rendering.tsx:548-556），表头/colgroup/columnCount 三处均无配对（与发现一致）；`rowDraftEnabled` 与编辑状态无关，孤儿列常驻。② 独立运行时探针（inline-edit-table 页）：表头 6 `th` vs 表体 7 `td`（末位 `table-row-save-bar-cell`）、colgroup 6 `col`、无任何 save-bar `th`——实测证实。**表象修正**：纯 quick-edit（无 draggable）场景下数据列仍按位对齐，"整表列错位、标题与数据对不上"表述偏强；精确表象为：常驻无表头孤儿列挤压列宽；与 `fixed:'right'` 操作列并用时保存条被钉住列叠压（sticky zIndex 1 且 DOM 靠前绘制在上）——后者是真实交互障碍。**结论**：主路径（行内编辑表格）常驻结构性缺陷，HIGH 维持；建议修复面与 [G3-R3-视角8-01] 合并（补 th/col/计数控列）。

---

## ⑤ scope-conflict 裁定（3 条）

| 条目                                              | 裁定                                      | 说明                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [G3-视角9-03]（tree aria-multiselectable 无行为） | **归 UI 审查（视角 9）保留 MEDIUM**       | 主要影响是 AT 用户可感知的语义失真（听到"可多选"却无任何多选手段、aria-selected 随焦点漂移），属视角 9 明文覆盖的 ARIA 语义 UX 可见部分；未深入全量 WCAG 符合 §4 边界。短期修复（未实现前不输出 aria-multiselectable）是语义修正而非 WCAG 合规工程。                                                            |
| [G3-R5-视角3-02]（面板移动/缩放无键盘通道）       | **归 UI 审查（视角 8/交互模式）保留 LOW** | 主要影响是编辑器核心操作的交互模式缺口（单控件缺键盘等价，与已立 [G3-R2-视角3-01]/[G1-视角8-14] 同族同判级）；WCAG 2.1.1 仅为邻接。与 dedup §2 G-B2（键盘导航框架）的边界按"单控件的键盘等价 = 一致性缺陷，框架级键盘导航 = 能力缺口"划线——本条修复是局部接线（方向键 + 手柄聚焦），不依赖框架，维持 LOW 发现。 |
| [G3-R2-视角9-01]（pivot 画布无 role/aria-label）  | **归 UI 审查（视角 9）保留 MEDIUM**       | 本仓成文契约（renderer-markers-and-selectors.md:81-84，含 docs/bugs/78 沉淀）要求的 UX 可见画布命名/角色缺失，scada 同型渲染器为正确基线；按主要影响归属画布语义而非全量 WCAG，沿 [G5-视角9-01] 先例。                                                                                                          |

---

## ⑥ 降级/驳回模式复盘

### 降级模式（1 个，覆盖 3 条）

**"自定义可聚焦元素缺 focus-visible ring"≠"无焦点指示"**：三条 focus ring 发现（视角3-01/3-02/3-04）的证据（className 无 focus-visible 类）属实，但推断链缺一环——元素均未声明 `outline-none`，浏览器 UA 默认 `outline: auto` 在键盘聚焦时可见（探针实测 computed `outline: auto 1px`）。真实用户影响检验：键盘用户**能**看到默认指示，只是弱于项目 ring 基线。round-04 自查节已为同类情形立过 "palette 原生 button 存在 UA 默认 outline → 沿 [G7-视角3-15] LOW" 先例，本次三条按同一先例统一降级 LOW。**复核阶段处置建议**：三条可合并为一个"自定义 tabIndex 元素补 focus-visible ring（对齐 ui 基类 token）"低优先级批次。

### 驳回：0 条

50 条全部通过"证据-结论逻辑链检查"：文件:行号全部命中 live code（偏差 ≤2 行）；证据片段均支持结论；行业惯例引用具体系统；四项质量门槛（证据支撑/具体系统引用/真实用户影响/代码级修复方向）无缺项；无 dedup §2 缺口表象、§3 误报模式、§4 维度越界。

### 复核中发现的表述级修正（不改变判定）

1. [G3-视角5-01] "整表列错位"对纯 quick-edit 场景偏强（精确表象为尾部孤儿列 + 固定右列叠压），HIGH 因主路径常驻结构性缺陷维持（见 ④-E）。
2. [G3-视角3-01] "屏幕上看不到任何焦点指示"不成立（存在 UA 默认 outline）——降级主因。
3. [G3-视角4-01] 复核中经依赖源码发现比原文更强的证据：Base UI 1.3.0 useTypeahead 对 open 态全部单字符键 `stopEvent` 且无 target 检查（useTypeahead.js:96-99），Input 打字大概率被整体吞掉；维持 MEDIUM，建议修复时补"filter 输入可打字"运行时断言，若实测全断可上调。

### 遗留观察（不计入判定）

- R5-3-01 探针顺带观察到：preview 态点击 Delete 后预览画面面板数未即时变化（4→4），回 edit 态确认为 3——疑似 preview 分支对 working 变更不重渲染（`helpers.render` 缓存语义），超出本条范围，建议转后续核查线索，不在本次 50 条内立/废。
- 派发头严重度分布（36/9）与 round 文件原始分布（29/16）不一致，未见合并工件；建议主 agent 以本文件 §①/§② 的逐条口径为准归账。
