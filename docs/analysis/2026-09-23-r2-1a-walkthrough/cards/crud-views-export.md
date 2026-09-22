# [card] page:crud-views-export

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/crud-views-export` ｜ **载体**: complex-page（数据列表域：导出工具栏 + 表格/卡片双视图 CRUD）
- **矩阵裁剪**: full（裁剪项：glass 皮肤未抽查——本波统一裁剪；H 弹层列 n-a——本页无 Dialog/Sheet/Popover，"每页行数"为原生 select（registered opacity-0 模式）；A4/A6/A7/A8 n-a——无 disabled 控件/拖拽/弹层；loading 帧未捕获——卡片视图 mountOnEnter mock 即时返回）

## 1. 截图清单（状态矩阵，逐张列路径）

| 状态                                    | light                                                                                                | dark                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 默认 1280×800（表格视图）               | `_tmp/visual-inspection-2026-09-23/r2-1a/crud-views-export/crud-views-export-default-wide-light.png` | `…/crud-views-export-default-wide-dark.png`    |
| 默认 800×900                            | `…/crud-views-export-default-narrow-light.png`                                                       | `…/crud-views-export-default-narrow-dark.png`  |
| 导出后反馈（toast + 报告行 + 下载链接） | `…/crud-views-export-after-export-toast-wide-light.png`                                              | —（探针双主题同构）                            |
| 卡片视图                                | `…/crud-views-export-cards-view-wide-light.png`                                                      | `…/crud-views-export-cards-view-wide-dark.png` |
| hover（表格行）                         | 探针读值复验（同族 `color(srgb 0.11 0.43 0.95 / 0.06)`，approval-tasks 卡已截帧）                    | —                                              |
| focus-visible（导出按钮）               | `…/crud-views-export-focus-visible-wide-light.png`（border 变蓝 + ring 3px，探针坐实）               | —                                              |
| 弹层打开                                | n/a（本页无弹层）                                                                                    | n/a                                            |
| 拖拽进行中                              | n/a（本页无拖拽）                                                                                    | n/a                                            |
| loading/empty/error                     | n/a（两视图同步返回；空态文案由 crud 组件内建，本页数据恒 33 条未触发）                              | n/a                                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（行 hover 蓝 tint，同族探针） A2 ✔（导出按钮 focus border rgb(28,110,242) + ring 3px，探针坐实） A3 warn(R2-1a-A3-01 同族：列宽手柄 4×39.5) A4 n/a A5 n-a（loading mock 不可捕获） A6 n/a A7 n/a A8 n/a A9 ✔（导出 → toast"导出成功，后台已生成文件" + "已生成 users-\*.csv（共 33 条）→"报告行 + "点击下载"链接（data:CSV href 实测有效）三重反馈，非静默更新）
- B 颜色：B1 ✔（正文/表格文字对比正常） B2 ✔ B3 warn(R2-1a-B3-01 同族：启用/禁用无语义色，dashboard/approval-tasks 卡已立，本页确认扩展) B4 ✔ B5 ✔（dark 表格/卡片文字 rgb(248,250,252) 可读；宿主 pills dark 缺陷已归 dashboard 卡 R2-1a-B5-02） B6 ✔
- C 布局：C1 warn(R2-1a-C4-02：窄视口分页条溢出裁字) C2 warn（宿主悬浮切换器在分页条右端"第 1-10 条，共 33 条"处遮压——R2-1a-C2-01 已知项，本页确认复现） C3 warn(R2-1a-C3-01：导出工具栏纵排+按钮拉伸) C4 warn(R2-1a-C4-02) C5 ✔ C6 n/a
- D 间隔：D1 ✔（工具栏/页签/表格块距 12/16 栅格） D2 ✔ D3 ✔（行高 40.1×9+39.6×1，1 行边框取整） D4 ✔ D5 n/a D6 ✔（分页条 top−内层 `<table>` bottom = 12px = `--space-block-gap`，探针实测） D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔（导出 outline 次级、下载链接明确、页签激活态清楚） E3 ✔ E4 warn(R2-1a-E4-01 同族：ID 列左对齐) E5 warn(R2-1a-C3-01 关联：工具栏三元素纵排后视觉分组弱化) E6 ✔
- F 一致性：F1 ✔（页签模式与 dynamic-tabs 同构、导出 outline 次级合规） F5 ✔（分页条"每页行数左/页码中/共 N 条右"与 standard-crud/tree-crud 同构）
- G 设计器：n/a（非画布页）
- H 弹层：n/a（本页无弹层）

## 3. 发现条目

### [R2-1a-C3-01] 导出工具栏 flex 类写在 className 上未达 body：导出后三元素纵排、按钮被拉伸至内容宽

- **页面/路由**: `#/complex-pages/crud-views-export`（页面级 schema 容器）
- **主题/视口/状态**: light / 1280×800 / 导出成功后（导出前仅按钮一个子元素，问题不显形）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/crud-views-export/crud-views-export-cards-view-wide-light.png`（按钮 304px 宽、报告行与下载链接各占一行）、`…/crud-views-export-default-wide-light.png`（导出前按钮 164px 正常）
- **目视描述**: schema 意图为"按钮 + 报告文字 + 下载链接"横向工具栏（`className: "flex items-center gap-3"`），实际导出后三个元素竖向堆叠，且导出按钮被拉伸成约 304px 的超宽 pill。
- **程序化证据**:
  - 探针: 导出前后按钮 rect 对比 + 容器结构核对（`w4-tabs-crud-out.json` → cvExport；schema `crud-views-export.json` 第 6-51 行）
  - 输出: 导出前按钮宽 ~164px；导出后按钮宽 ~304px（被 align-items:stretch 拉至与"已生成 users-\*.csv（共 33 条）→"文本行同宽），报告行/链接各自换行——`flex items-center gap-3` 落在外层 `nop-container`（不控制布局），内层 container-body 仍为默认纵向 flex
- **对照基准**: styling-system.md「Container 的 className 路由（关键差异）」——className 挂外层不控制布局，须用 `bodyClassName` 或 semantic props；检查提示词 C3/E5
- **严重程度**: P3（导出主流程不受阻；布局与意图不符 + 按钮 stretches 是明显视觉异常，用户可感知但不影响任务）
- **用户影响**: 导出成功后工具栏视觉散架（超宽按钮 + 三行堆叠），页面显得未完成；后续若报告文字更长会进一步挤压。
- **修复方向**: schema 改 `bodyClassName: "flex items-center gap-3"`（或 semantic `direction: "row", gap: "sm", align: "center"`），并给按钮 `self-start` 防拉伸；建议 flux-guide 该 fixture 同步更正作为教学样例（该页正是"视图切换+导出"示范页）。
- **归族**: local → R2-4 批（schema authoring；className 路由认知成本已在 styling-system.md 文档化，可考虑加 lint/门禁提示）
- **复核状态**: 未复核

### [R2-1a-C4-02] 窄视口分页条整体溢出：右侧"共 N 条"信息被卡片边缘裁字

- **页面/路由**: `#/complex-pages/crud-views-export`（800×900；approval-tasks 同现："第 1-1…"截断，跨 2 页确认、全 CRUD 族嫌疑）
- **主题/视口/状态**: light / 800×900 / 默认（表格视图）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/crud-views-export/crud-views-export-default-narrow-light.png`（右下"第 1-10 条，共 33"后被裁，"条"字缺失）
- **目视描述**: 800px 视口下分页条右侧总条数信息被卡片右缘直接切断，无省略号、无滚动、不可读全文。
- **程序化证据**:
  - 探针: C1 扫描 + 分页条 rect（`w4-defaults-out.json` → crud-views-export.narrow-light.c1）
  - 输出: 分页条容器 `mt-[var(--space-block-gap)] flex …` `sw=500 cw=448`（溢出 52px），自身非滚动容器（overflow visible），由外层卡片 overflow-hidden 裁切；`sm:flex-row` 布局在 800px 视口（>sm 断点）保持单行三段（每页行数/页码/总数）不放行纵排
- **对照基准**: 检查提示词 C4（~800px 视口不塌不挤）/C1（无意外溢出）；D6/F5 分页条口径
- **严重程度**: P3（窄视口下总条数信息丢失，核心翻页功能不受影响；跨页嫌疑待 R2-4 批核对 standard-crud/tree-crud）
- **用户影响**: 分屏/窄窗口用户看不到数据总量，翻页预期受损；截断处文字残缺观感差。
- **修复方向**: 分页条三段容器在窄视口允许换行（`flex-wrap` + 总数段 `whitespace-nowrap`）或在 `<sm` 断点纵排（移除 `sm:` 前提改用容器查询/更晚断点）；统一改三个分页组件（TablePaginationBar/CrudListPagination/pagination-renderer）保持 F5 一致。
- **归族**: local → R2-4 批（分页组件族窄视口布局；approval-tasks 卡同条确认）
- **复核状态**: 未复核

### 已知项确认（不重复立项）

- 宿主悬浮 classic/light 切换器遮压分页条右端总数信息（R2-1a-C2-01 已登记，本页宽视口下复现于"第 1-10 条，共 33 条"处，见 default-wide-light 截图右下角）。
- 状态列"启用/禁用"无语义色（R2-1a-B3-01 家族，本页确认扩展，详见 approval-tasks 卡）。

## 4. 误报排除记录

| 疑点                                             | 排除理由                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| "每页行数" select 为小尺寸原生控件               | registered opacity-0 原生 select 叠放模式（误报白名单），触发区为包裹 label |
| 表格视图窄视口 `nop-table sw=500 cw=448` C1 命中 | 内层 `overflow-x-auto` 有意滚动容器（白名单），与 C4-02 分页条溢出为两回事  |
| 导出按钮 variant=outline "应为 primary"          | 导出为次级后台动作，outline 层级合规（E2 判过），不报                       |
| 下载链接无下划线、似纯文本                       | link 渲染器全局样式一致（F1 同构），且导出报告行"→"箭头已指引用，不按缺陷报 |
| 卡片视图卡片高度不一（末行 1 卡）                | 33 条数据自然流式排布，grid 3 列对齐规整（x 296/609/923，gap 12），非缺陷   |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：C3-01/C4-02 → R2-4 local 批；
- 批内复检通过后 → `verified`。
