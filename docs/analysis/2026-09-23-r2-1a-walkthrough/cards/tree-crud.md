# [card] page:tree-crud

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/tree-crud` ｜ **载体**: complex-page（data-lists 域）
- **矩阵裁剪**: full（A6 拖拽/G 画布列 n/a；弹层面 H n/a——本页无 Dialog/Sheet/Drawer，仅树控件；glass 未抽查）

## 1. 截图清单

| 状态              | light                                                                                 | dark                                  |
| ----------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| 默认 1280×800     | `_tmp/visual-inspection-2026-09-23/r2-1a/tree-crud/tree-crud-default-light.png`       | `…/tree-crud-default-dark.png`        |
| 默认 800×900      | `…/tree-crud-default-light-narrow.png`                                                | `…/tree-crud-default-dark-narrow.png` |
| 树节点选中        | `…/tree-crud-node-selected-light.png`、`…/tree-crud-node-selected-explicit-light.png` | —（探针读值复核）                     |
| 树展开/收起中间态 | `…/tree-crud-tree-expanding-light.png`、`…/tree-crud-tree-collapsed-light.png`        | —                                     |
| 树 hover          | `…/tree-crud-tree-hover-light.png`                                                    | —                                     |
| 弹层打开          | n/a                                                                                   | n/a                                   |
| 拖拽              | n/a                                                                                   | n/a                                   |
| loading/empty     | n/a（选叶子节点后表格即时过滤，无空态帧）                                             | n/a                                   |

## 2. A–H 维度勾选表

- A 交互：A1 warn(R2-1a-A1-01) A2 ✔（树节点 `focus-visible:ring-2` 类在 DOM，展开钮有 ring 类） A3 ✔（树热区整行可点；表格内 <24px 项与 standard-crud 同族，引用 R2-1a-A3-01 不重复立项） A4 n/a A5 ✔（"暂无数据"路径存在） A6 n/a A7 n/a A8 n/a A9 ✔（点击节点表格即时过滤，DOM diff 证实）
- B 颜色：B1 ✔（树 17.08:1、表格 17–19:1 dark；light 20:1） B2 ✔ B3 ✔ B4 ✔ B5 ✔（dark 复检通过，本页无弹层不受 --popover 覆盖影响） B6 warn（见 A1-01，选中态与 hover 态同色）
- C 布局：C1 ✔（1280 无溢出；窄视口表格由内层 overflow-x-auto 承接） C2 ✔（层级缩进对齐，见排除记录） C3 ✔（左树右表分区清晰） C4 warn(R2-1a-C4-02) C5 ✔ C6 n/a
- D 间隔：D1 ✔（树层级 padding-inline-start 8/24/40px，每级 16px） D2 ✔ D3 ✔（行高 40.1px ×9 +1 行 39.6，一致） D6 ✔（分页条−表格 12px） D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔（树→表动线顺） E4 ✔ E5 ✔ E6 ✔
- F 一致性：F1 ✔ F5 ✔（分页条布局与 standard-crud 同构：每页行数左/页码中/共 N 条右）
- G 设计器：n/a
- H 弹层：n/a（本页无弹层组件）

## 3. 发现条目

### [R2-1a-C4-02] 窄视口下右表区域被压至 196px，双栏不折行

- **页面/路由**: `#/complex-pages/tree-crud`
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/tree-crud/tree-crud-default-light-narrow.png`
- **目视描述**: 800px 宽下左树仍占约 270px，右表容器仅剩 196px，可见列从 7 列缩到 2 列（ID/姓名），其余列全靠横向滚动。
- **程序化证据**:
  - 探针: 滚动容器探测 + scrollLeft 试验（`_tmp/r2-1a-probes/w6-tree-followup.mjs` → `narrowScroll`）
  - 输出: scroller = `relative w-full overflow-x-auto`（sw=900, cw=196）；程序化 `scrollLeft=400` 成功 → 列可达。宽视口 c1 扫描仅命中 opacity-0 checkbox（白名单）。
- **对照基准**: C4 视口弹性（工具栏折叠、表格滚动合理）；对照 master-detail 窄视口表现同族
- **严重程度**: P2（列可达、功能未断；但 800px 主流分屏宽度下信息可见度骤降。与 C4-01 同根因族——flex 双栏无折行/压缩策略）
- **用户影响**: 分屏用户需大量横滚才能读到角色/状态/部门列；左树无可收缩入口。
- **修复方向**: 双栏 flex 容器在 `lg:` 以下改纵向堆叠（树折叠为下拉/抽屉），或给树面板设 `w-64 shrink-0` + 表格区 `min-w-0` 并提供列显隐开关。
- **归族**: systemic → R2-3 批（与 R2-1a-C4-01 同族合并修复）
- **复核状态**: 未复核

### [R2-1a-A1-01] 树节点选中态与 hover 态同为 `bg-muted`，不可区分

- **页面/路由**: `#/complex-pages/tree-crud`
- **主题/视口/状态**: light / 1280×800 / 节点选中后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/tree-crud/tree-crud-node-selected-explicit-light.png`
- **目视描述**: 选中"华南分公司"后该行仅有浅灰底，与鼠标悬停高亮完全同色；首屏截图中总公司节点的蓝色框实为初始 focus ring，非选中态。
- **程序化证据**:
  - 探针: click 节点后读 `aria-selected` + computed backgroundColor（`w6-tree-followup.mjs` → `selectedState`）
  - 输出: `aria-selected="true"`、`bg=rgb(241,245,249)`（= `--muted`，与行类 `hover:bg-muted` 同一令牌）
- **对照基准**: A1（状态可感知）、B6（选中态不与瞬态混淆）；NN/g 树控件惯例（选中态应有持久且强于 hover 的指示）
- **严重程度**: P3
- **用户影响**: 用户难以确认当前过滤生效的节点，误以为 hover 残留；有右侧表格联动兜底，任务不中断。
- **修复方向**: `[aria-selected="true"]` 行改用 `bg-primary/10` + `text-foreground`（或左侧 2px primary 指示条），与 `hover:bg-muted` 拉开一档。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                                                | 排除理由                                                                                                                 |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 目视疑"叶子节点（前端组/后端组）标签比父节点标签更靠左（锯齿缩进）" | 探针逐节点实测：叶子也有 toggle 占位（toggleX=345），labelX 333→349→365 每级恒定 +16px，层级对齐无锯齿。截图低分辨率误判 |
| 点击首个展开钮后 `innerText` 无变化疑似失效                         | 换 aria-label 探针复测：`折叠→展开`、节点数 35→30，展开/收起功能正常；首次命中 svg `pointer-events:none` 导致误点        |
| 窄视口 `.nop-table` sw490/cw196 命中 C1                             | 内层 `overflow-x-auto` 为真实滚动容器且可程序化滚动，外层命中非缺陷（可达性已验证）                                      |
| 树面板底部"上海研发"半行被裁                                        | 树面板为内部滚动容器（macOS overlay 滚动条静态不可见），半行是滚动容器的正常可视提示，非裁切缺陷                         |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：C4-02 → R2-3（与 C4-01 同族）；A1-01 → R2-4 local；
- 批内复检通过后 → `verified`。
