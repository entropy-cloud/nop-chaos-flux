# [card] control:crud

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/crud` ｜ **载体**: lab 页（MultiScenarioLabPage，16 场景：basic / query+toolbars+fixed columns / responsive expand / source-result / request-owned refresh / quick-edit / selection refresh / radio selection / client-mode / client-mode fetch-on-filter / cards mode / list mode / host quick-edit bug-73 / host query→loadAction / host includeScope / host flaky load / host paging-sort-selection）
- **矩阵**: **FULL**（六属性复杂控件）。已覆盖：light+dark（真 data-mode）、1280+800 双视口、弹层开（quick-edit dialog-mode：H1/H3/H5/H8 探针）、行内编辑态（quickEdit inline 输入态）、分页交互（页 2 切换+echo）、排序（Name 升序 aria-sort）、筛选（queryLoad 搜索链路）、工具栏（列设置/筛选/批量钮清点）、批量操作条（selection→Bulk Delete disabled→enabled）、确认弹层（**fixture 未提供**——无删除确认流，裁剪注明）、增删行中间态（**fixture 未提供**——Create 钮无 onClick、无删行动作，裁剪注明）、error 态（flaky load 场景）、responsive expand、cards/list 载体、sticky 操作列横向滚动。
- **探针**: `_tmp/r2-2b-probes/w3-crud.mjs`（全量首轮，`out-w3-crud.json`）、`probe-crud2/3/4.mjs`（交互链修复+弹层解剖+查询通道）、`probe-crud5.mjs`（分页/排序/expand/搜索，`out-w3-crud5.json`）、`probe-crud6.mjs`（inline quickEdit 输入态）、`probe-crud7.mjs`（排序 aria-sort + Toaster 存在性）、`probe-crud8.mjs`（800 视口 sticky 列透明底，`out-w3-crud8.json`）
- **探针方法注记**: ①页面高 ~30000px，16 场景纵向堆叠——Playwright 长距滚动点击偶发超时（排序钮以 JS click 验证功能，物理点击失败为工具伪象非产品缺陷）；②quick-edit 弹层 body 槽名为 `table-quick-edit-dialog-body`（非标准 `dialog-body`），解剖探针需按实际槽名；③lab 页未挂 Toaster——`showToast` 类反馈全部不可见（环境族）。

## 1. 截图清单

| 状态                                    | light                                                                                              | dark（真 data-mode）                                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 默认 1280                               | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/default-1280-light.png`                              | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/default-1280-dark.png`                                   |
| 默认 800×900                            | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/default-800-light.png`                               | —                                                                                                      |
| 行内编辑输入态                          | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/inline-editing-light.png` / `inline-saved-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/inline-edit-dark.png`                                    |
| quick-edit 弹层开（dark 白底=已知族）   | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/dialog-anatomy-light.png`                            | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/edit-dialog-dark.png`                                    |
| 批量选中（Bulk Delete 使能）            | —                                                                                                  | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/bulk-selected-dark.png`                                  |
| 分页切页 2                              | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/paging-page2-light.png`                              | —                                                                                                      |
| 查询链路（queryLoad 搜索后 Found-Beta） | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/queryload-searched-light.png`                        | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/query-filtered-dark.png`（client-mode Enter 不提交证据） |
| responsive expand 展开态                | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/expand-light.png`                                    | —                                                                                                      |
| sticky 操作列横向滚动（800 视口）       | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/sticky-scrolled-800.png`                             | —                                                                                                      |
| flaky 加载失败态                        | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/flaky-error-light.png`                               | `_tmp/visual-inspection-2026-09-24/r2-2b/crud/flaky-error-dark.png`                                    |

## 2. A–H 维度勾选表

- A 交互：A1 pass（行 hover `hover:bg-[var(--table-hover-bg)]` 类链）A2 pass（行 `focus-visible:ring-2` 存在）A3 **warn**（列宽手柄 4×39.5=R2-1d-A3 族已登记；checkbox 16×16 带 `after:-inset` 扩展命中区，误报排除）A4 pass（Bulk Delete `${!$crud.hasSelection}` disabled→选中后 enabled 实测，opacity/pointer 正确）A5 **warn（R2-2b-A5-96 注记）**（flaky 失败保留数据 ✓ 但无内建错误提示面——同 data-source 卡 A5-86 裁定；loading=CRUD 私有加载态 fixture 未演示）A6/A8 n/a（draggable 明示 deferred）A7 pass（quick-edit 弹层关闭钮/遮罩/焦点落点在弹层内）**A9 fail(R2-2b-A9-94)**（client-mode 查询提交通道断裂）
- B 颜色：B1 pass（dark 表格正文 12+:1）B2 pass B3 pass（状态列纯文本无语义色滥用）B4 pass（selected/hover 走 `--table-*` 令牌）**B5 warn（已知族命中）**：quick-edit 弹层 dark 下整面白底（`--popover` dark 亮底宿主族实例，edit-dialog-dark.png）B6 pass
- C 布局：C1 pass（docOverX 0；table-head overX 30 为固定列阴影机制内溢出，包在可滚 wrap 内，无视觉裁切证据）C2 pass C3 pass C4 pass（800 视口 fixed columns 场景表内横向滚动 242px，行为正常）C5 pass（无双滚动条）C6 n/a
- D 间隔：D1 pass（工具栏/表格/底栏节奏一致）D2 pass（组间>组内）D3 pass（行高一致无离群行）D4 pass（工具栏钮间距 8px 档）D5 pass（query form 字段间距栅格）**D6 pass**（host paging 场景分页条 top−table bottom = **12px**，plan490 `--space-block-gap` 锚点精确命中；cards/list 载体分页条均存在）D7 pass D8 pass
- E 排布：E1 pass E2 pass（Create 主色、行内 ghost）E3 pass（弹层 保存 主位右侧）E4 **warn（已知族命中）**：ID 数值列 header left/cell start 左对齐——R2-1a-E4-01 族 lab 载体实例（`out-w3-crud.json` idAlign）E5 pass E6 pass（分页条"第 1-3 条，共 3 条"信息完整）
- F 一致性：F1 pass（16 场景工具栏钮型统一）F2–F3 pass F4 **warn（已知族命中）**：列设置/筛选/搜索/重置/关闭/保存/每页行数/第 x-y 条/移动对话框/图表 等 chrome 中文——R2-2a-F4-11 族大量新实例 F5 **pass**（CRUD 分页条与 standalone/table 同锚点 12px，plan490 收敛复检通过）
- G 设计器：n/a
- H 弹层：H1 pass（quick-edit 弹层 `data-size="sm"` → `width: var(--overlay-size-sm)` 480px，阶梯档生效）H2 n/a **H3 pass**（开态 bottom 479 ≤ 792；`max-h-[calc(100dvh-2rem)]` 生效；长内容 fixture 缺失，以 body `overflow-y-auto` + max-h 通道为旁证——H3/H8 长内容变体复核留给后续弹层轮）H4 pass（关闭 X 与标题无重叠）**H5 pass**（footer `justify-content: flex-end`，[关闭 x712, 保存 x792] 右对齐、主位正确）H6 pass（弹层内单字段 label aria + 输入全宽）H7 pass（header p-4/body px-令牌/footer 节奏与 dialog 解剖一致；body 槽名为 `table-quick-edit-dialog-body` 特化槽）H8 pass（body `overflow-y-auto` + `min-h-0 flex-1` 滚动通道正确；长内容实测见裁剪注明）H9 pass（`max-w-[calc(100%-2rem)]` 窄视口收口）

## 3. 发现条目

### [R2-2b-A9-94] client-mode（无 loadAction）的 queryForm 无提交控件且 Enter 不触发提交：查询过滤功能在 UI 层不可达——schema 契约缺口族

- **页面/路由**: `#/lab/crud`（场景 9 "CRUD client-mode baseline"，schema `clientMode.loadDataOnce + queryForm(keyword)`；同构风险：所有无 loadAction 而带 queryForm 的 crud）
- **主题/视口/状态**: dark+light / 1280 / 关键词输入后
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/crud/query-filtered-dark.png`（输入 Alpha 回车后行仍 3 条、footer `Query: none`）
- **目视描述**: 在 Keyword 输入框键入并回车后没有任何过滤发生；表单区域不存在查询/搜索按钮，用户没有任何途径提交查询——场景描述承诺的 "query submit stays local and filters the visible rows" 无法被用户触发。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w3-crud.mjs`（afterQuery）、`probe-crud5.mjs`（clientModeQuery）
  - 输出: `client-mode` 场景按钮清点 `buttons: ["折叠"]`（仅 scope-debug 钮），`hasForm: false`；fill('Alpha') + Enter 后 `rows: 3, footer: "…Query: none"`。对照 `host-crud-query-form`（有 loadAction）场景渲染了 搜索/重置 钮且点击后行变 `Found-Beta`（queryload-searched-light.png）——即渲染器仅在 loadAction 存在时追加提交控件，本地过滤模式无任何提交通道。另测 queryLoad 场景 Enter 亦不触发（仅 搜索 钮触发），Enter 提交惯例缺失。
- **对照基准**: 检查提示词 A9（交互可达、非静默）；已知族"schema 契约缺口（R2-3 候选）"；AMIS queryForm 默认提交钮对标
- **严重程度**: P2（功能在纯 UI 层不可达；查询过滤是 CRUD 高频主路径）
- **用户影响**: 无 loadAction 的本地过滤 CRUD：用户输入关键词后无任何反应，功能等于不存在；有 loadAction 时回车不提交也偏离惯例。
- **修复方向**: crud 渲染器为任何 queryForm（无论有无 loadAction）追加默认提交/重置控件（或 `submitOnChange` 选项），并在 input 上支持 Enter 提交（form submit 语义）；flux-guide 同步 queryForm 提交语义说明。
- **归族**: systemic → schema 契约缺口族（R2-3 候选）
- **复核状态**: 已复核（保留 P2，根因修正，review-b 2026-09-24）：原卡"仅 loadAction 时追加提交控件"证伪，真条件=schema.id ?? schema.name（createCrudQueryFormRegion L91）；Enter 死因=queryForm region 从不声明 submitAction

### [R2-2b-A5-96] flaky 加载失败无内建错误呈现面：数据保留 ✓ 但用户只能从 footer total 察觉异常——与 data-source A5-86 同根因

- **页面/路由**: `#/lab/crud`（场景 15 "Host CRUD load failure keeps data + retry"）
- **主题/视口/状态**: dark / 1280 / 失败态
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/crud/flaky-error-dark.png`
- **目视描述**: 加载 500 失败后表格无错误横幅/行内提示，仅旧数据保留 + footer 计数维持；重试（Refresh list ×2，flaky 计数消耗后）恢复 RecoveredRow。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w3-crud.mjs`（flakyInitial/flakyAfterRetries）
  - 输出: `flakyInitial.rows: ["f1RecoveredRow"]`（模块级 flaky 计数在先前探针已耗尽前 2 次失败——失败→保留→重试恢复链路在 data-source 卡 `out-w3-datasource.json` 已完整实证，同一 async-data 运行时）；失败态 DOM 无 error/alert 角色元素（仅场景描述文本命中关键词）。
- **对照基准**: 检查提示词 A5；R2-2b-A5-86（data-source 错误呈现裁定）
- **严重程度**: P3（与 A5-86 同一根因的 CRUD 载体面；保留数据契约本身正确）
- **用户影响**: 失败静默，用户以为数据没变。
- **修复方向**: 同 R2-2b-A5-86（async-status 呈现器或宿主最低错误契约）；crud 可优先在 footer 槽暴露 `hasError` 态样式。
- **归族**: watch-only → 台账（异步错误呈现一致性，与 A5-86 合并跟踪）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **宿主级 `--popover` dark 亮底 / `.nop-theme-root` 钉死 color-scheme:light 族**：quick-edit 弹层 dark 整面白底（`edit-dialog-dark.png` 目视 + 弹层类链 `bg-popover`）——既有族直接实例，修复后需本卡 H/B5 复检。
- **表格 sticky 操作列透明底族**（R2-1a 已裁定）：800 视口场景 2 表格横向滚动 242px 后，sticky Actions 列**表头** bg 实色 `rgb(255,255,255)` 而**体单元格** `rgba(0,0,0,0)` 透明（`out-w3-crud8.json` before/after scrollLeft 242）——行内容从 sticky 列下穿过，族在 lab 载体复现，引用不另立项。
- **数值列左对齐族**（R2-1a-E4-01）：ID 列 header `text-align: left`、cell `start`——族实例（`out-w3-crud.json` idAlign）。
- **i18n zh-CN 回退族**（R2-2a-F4-11）："列设置/筛选"（工具栏）、"搜索/重置"（queryLoad）、"关闭/保存"（弹层 footer）、"每页行数/第 1-3 条，共 N 条"（分页条）、"移动对话框"（弹层 a11y sr-only）——大量新实例。
- **lab 载体与环境基建族**：lab 页未挂 Toaster——quickEdit `quickSaveItemAction: showToast('Saved item')` 提交后无任何可见反馈（`inlineSaved.toasts: []`，`toasterMounted: false`）；notify/showToast 反馈在 lab 沙箱不可见属环境面，行级写回契约由场景 13 fetcher echo 覆盖（C4.2）。
- **A3 族**（R2-1a/R2-1d）：列宽手柄 4×39.5 已登记实例；16×16 checkbox 命中区经 `after:-inset` 扩展，误报排除。
- **计划内锚点复检通过**：D6=12px `--space-block-gap` 精确命中（plan490）；H1 尺寸阶梯（sm 480）；H5 footer 右对齐+主位；H8 body 滚动通道（特化槽 `table-quick-edit-dialog-body` overflow-y-auto）；选择→批量钮使能→footer 计数 echo；分页切页 2（"第 11-12 条，共 12 条"+Page: 2 echo）；排序 aria-sort ascending 切换；responsive expand（1280<1400 断点生效，行点击展开 Owner/Category 明细行）；radio 选择场景；cards/list 载体+分页条渲染；client-mode fetch-on-filter 走 data-source 链（场景 10 rows 1=fetcher 批次）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-crud` → carded（卡列填本路径）；findings 归族后 → digested。
