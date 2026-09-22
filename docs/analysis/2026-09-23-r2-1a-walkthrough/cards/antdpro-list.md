# [card] page:antdpro-list

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/antdpro-list` ｜ **载体**: complex-page（antdpro 复刻域，`adp-root` + `antdpro-replica.css` 字面令牌）
- **矩阵裁剪**: full（本页无行拖拽——crud schema 无 `draggable`，A6/A8 收敛为列宽手柄检查；glass 皮肤未抽查——本波统一裁剪，双主题 × 双视口已全覆盖）

## 1. 截图清单

| 状态                                          | light                                                                                 | dark                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 默认 1280×800                                 | `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-list/antdpro-list-default-light.png` | `…/antdpro-list-default-dark.png`                                                                            |
| 默认 800×900                                  | `…/antdpro-list-default-light-narrow.png`                                             | `…/antdpro-list-default-dark-narrow.png`                                                                     |
| hover（行）                                   | `…/antdpro-list-row-hover-light.png`                                                  | dark 行 hover 以 computed 值复核（`hover:bg-[var(--table-hover-bg)]` = `color(srgb 0.11 0.43 0.95 / 0.06)`） |
| focus-visible                                 | （输入框 focus 边框变蓝，探针 `rgb(28,110,242)`，见 form-dialog 卡复验）              | —                                                                                                            |
| disabled（批量删除未选中）                    | 含于 default-light（淡粉禁用态）                                                      | 含于 default-dark                                                                                            |
| 选中行                                        | `…/antdpro-list-rows-selected-light.png`                                              | —                                                                                                            |
| 弹层打开（新建订单 Dialog / 删除确认 Dialog） | `…/antdpro-list-dialog-add-light.png`、`…/antdpro-list-dialog-row-delete-light.png`   | `…/antdpro-list-dialog-add-dark.png`                                                                         |
| 矮视口弹层（H3）                              | `…/antdpro-list-dialog-add-shortvh-light.png`（620px 高）                             | —                                                                                                            |
| 分页区滚动                                    | `…/antdpro-list-pagination-scrolled-light.png`、`…/antdpro-list-pagination-light.png` | —                                                                                                            |
| dark 查询区放大                               | —                                                                                     | `…/antdpro-list-query-dark-zoom.png`、`…/antdpro-list-query-dark-zoom-dark.png`                              |
| 拖拽进行中                                    | n/a（本页无行拖拽；列宽手柄 4px 见 A3 项）                                            | n/a                                                                                                          |
| loading/empty                                 | n/a（mock 同步返回，未捕获 loading 帧）                                               | n/a                                                                                                          |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（行 hover 蓝 tint 6%） A2 ✔（输入框 focus 边框 `rgb(28,110,242)`，150ms transition 后读值） A3 fail(R2-1a-A3-01 实例：排序钮 h=22、列宽手柄 4px) A4 ✔（未选中禁用 opacity .5 + pointer-events none，选中即启用） A5 n/a A6 n/a（无行拖拽） A7 ✔（弹层有关闭钮/遮罩/焦点落弹层把手"移动对话框"） A8 n/a A9 fail(R2-1a-A9-02：批量删除无确认直接执行；行删除有确认 ✔、翻页/删除有 toast ✔)
- B 颜色：B1 ✔（light：标题 13.33:1、正文/标签 21:1） B2 ✔ B3 ✔（已完成绿/待付款黄/配送中蓝/已关闭灰语义正确；批量删除红） B4 ✔（computed 值可溯源令牌；`--adp-*` 为复刻域自有令牌命名空间） B5 **fail(R2-1a-B5-02)**（dark 半适配拼贴：查询区/标签/弹层内容不可读，详见发现） B6 ✔（选中行蓝 tint、删除红不裸奔）
- C 布局：C1 fail(R2-1a-C4-01 实例，仅窄视口) C2 **fail(R2-1a-C2-02)**（sticky 操作列透明底压下单时间列） C3 ✔ C4 fail(R2-1a-C4-01) C5 ✔（内层 overflow-x-auto 单滚动容器） C6 n/a
- D 间隔：D1 ✔ D2 ✔ D3 ✔（行高中位 55px，10 行一致） D4 ✔（工具栏 gap 8px） D5 ✔（查询字段间隙一致） D6 ✔（分页条 top−table bottom = 12px = `--space-block-gap`，`mt-[var(--space-block-gap)]`） D7 ✔（无 <4px 贴死） D8 ✔
- E 排布：E1 ✔ E2 ✔（新建订单 primary 强于批量导出 outline；批量删除 destructive 淡化禁用） E3 ✔（行删除确认弹层取消左/确认删除右；批量删除见 A9-02） E4 ✔（列 left 坐标方差 0） E5 ✔ E6 ✔
- F 一致性：F1 ✔ F5 ✔（每页行数左/页码中/"第 1-10 条，共 36 条"右，与 standard-crud 卡口径一致）
- G 设计器：n/a
- H 弹层：H1 ✔（新建/删除确认均 560px = `--overlay-size-base`） H2 n/a H3 ✔（620px 视口下 content h=242 固定、bottom 302 ≤ 612） H4 fail(R2-1a-H4-01 实例：title x=376 vs label x=384，8px) H5 fail(R2-1a-H5-01 实例：表单弹层 footer `justify-content: normal` 左对齐、gap 12px、按钮 60×32；删除确认弹层 footer 右对齐合规——同页两弹层互相矛盾) H6 ✔（label/input x 成对相等，字段行高 58 一致） H7 ✔（body pad 16/24） H8 ✔（body `overflow-y:auto`，header/footer 在滚动区外） H9 ✔（800px 视口 w=560 居中，两侧余量 120px）

## 3. 发现条目

### [R2-1a-B5-02] antdpro 复刻域 dark 半适配拼贴：语义令牌翻转而 `--adp-*` 字面亮底不翻转，标签/输入内容不可读

- **页面/路由**: `#/complex-pages/antdpro-list`（9 个 antdpro 页全域复现；本卡 + form-basic/form-grouped/form-dialog/dashboard 各卡均有 dark 证据）
- **主题/视口/状态**: dark / 1280×800 / 默认与弹层打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-list/antdpro-list-default-dark.png`、`…/antdpro-list-query-dark-zoom.png`、`…/antdpro-list-dialog-add-dark.png`
- **目视描述**: dark 下页面同时出现深色侧栏、深色表头（rgb(2,8,23)）、白色卡片与灰底查询区；状态/渠道下拉触发器变为深蓝底 `rgb(31,42,61)` 但文字仍是 `--adp-text` 黑 → 文字不可辨；弹层内输入框变深灰药丸、标签只剩红色必填星号。
- **程序化证据**:
  - 探针: `apps/playground/src/antdpro-replica/antdpro-replica.css` 静态读取 + computed 采样（`_tmp/r2-1a-probes/antdpro-list-followup.mjs` → `darkQuery`/`darkChip`、`antdpro-darkfix-probe.mjs` → `*_labelInv`）
  - 输出: 该 css 定义 `--adp-text: rgba(0,0,0,0.88)`、`--adp-bg-container: #ffffff` 等**无任何 `data-mode=dark` 覆盖**；dark 下 select 触发器 bg `rgb(31,42,61)`（flux 语义令牌翻转）× adp 黑字 ≈1.1:1；表单 label span computed `rgb(248,250,252)`（--foreground 翻转）叠 `#ffffff` 卡底 → 1.05:1 不可见；宿主 feature chips `rgb(178,206,251)` on `rgb(203,186,252)` = 1.1:1
- **对照基准**: 检查提示词 B5（dark 平价；"dark 专有缺陷（纯白底块、不可读灰字）单独登记"）；theme-compatibility.md 令牌化 dark 规约。replica 豁免只覆盖"与其他页风格不一致"，dark 可读性属横切维度不豁免
- **严重程度**: P1（dark 下表单标签与查询控件文字不可读，接近 P0 口径"dark 下关键信息不可读"；因 light 路径可用且复刻页 dark 使用频率未知，定 P1）
- **用户影响**: dark 模式用户无法辨认表单标签（只见星号）、无法读查询下拉当前值；页面呈现"半成品 dark"观感。
- **修复方向**: 为 `antdpro-replica.css` 补 `:root[data-mode='dark']` 块（`--adp-bg-container/--adp-text/--adp-warning-bg` 等全套翻转），并排查 adp 域内 flux 语义令牌消费点：要么锁定 light（表单 label 令牌固定为 adp 字面色），要么全部走语义令牌——两套机制混用是根因。宿主 chips 1.1:1 属宿主侧，归 R2-3 一并修。
- **归族**: systemic → R2-3 批（9 页同根因，含宿主 chips 子项）
- **复核状态**: 未复核

### [R2-1a-C2-02] sticky 操作列透明底，默认 1280 视口即遮压"下单时间"列

- **页面/路由**: `#/complex-pages/antdpro-list`（flux table-renderer sticky 列机制，所有带 sticky 操作列的表格同根因）
- **主题/视口/状态**: light+dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-list/antdpro-list-pagination-scrolled-light.png`（"编辑20删8-01 05"串排可见）、`…/antdpro-list-default-light.png`
- **目视描述**: 表格未横向滚动时，右侧 sticky"操作"列（查看/编辑/删除）直接叠在"下单时间"列文字上，两层文字互相穿透，读不了也易误点。
- **程序化证据**:
  - 探针: 表格容器与 sticky 单元格 rect + computed bg（`_tmp/r2-1a-probes/antdpro-list-probe.mjs` → `sticky`）
  - 输出: 表格 `scrollWidth=1130 > wrap.clientWidth=894`（1280 视口即有 236px 横向滚动量）；`thead th[操作] position=sticky bg=rgb(255,255,255)`（表头不透明 ✔），`tbody td[操作] position=sticky bg=rgba(0,0,0,0)`（**透明**）；下单时间 td x=1113 w=170，操作列 sticky 于 x=1047 → 两列重叠区 66px+
- **对照基准**: 检查提示词 C2（无意外重叠）；standard-crud 卡 C4-01 修复方向已提示"给 sticky 操作列加实体底色防透叠"，本条证明该问题在**默认视口**就成立，不止窄视口
- **严重程度**: P1（订单列表高频主路径必经，最后一列数据不可读）
- **用户影响**: 用户在任何 ≥1280 视口打开列表都看到花掉的"下单时间"，且点击删除/编辑时可能误触下层文字；横向滚动后部分缓解但列宽 170>66 仍残留。
- **修复方向**: table-renderer sticky 单元格补 `bg-[var(--table-bg)]`（或继承行底色含 hover/选中态变量）；与 hover 行底色叠加时用 `bg-inherit` 链。归 R2-3 与 C4-01 同批。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-A9-02] 批量删除无确认直接执行，与行删除确认弹层行为不一致

- **页面/路由**: `#/complex-pages/antdpro-list`（crud 批量操作）
- **主题/视口/状态**: light / 1280×800 / 选中 2 行点击"批量删除"
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-list/antdpro-list-dialog-delete-confirm-light.png`（toast"批量删除成功"、首两行已消失，无任何确认弹层）
- **目视描述**: 点击"批量删除"立即删除选中行并弹 toast，无确认步骤；而单行"删除"有"删除确认"弹层（含"删除后不可恢复"文案）。
- **程序化证据**:
  - 探针: 勾选 2 行 → 读批量删除按钮状态 → click → 扫 `[role=dialog],[role=alertdialog]`（`antdpro-list-followup.mjs` → `deleteDialog`、`antdpro-list-wrap.mjs` → `rowDeleteDialog`）
  - 输出: 批量：`disabled:false` → click 后 dialog 数量 0，行数 10→8，toast 出现；单行：dialog `{text:"删除确认|确定删除订单 SO2026080109…吗？删除后不可恢复|取消|确认删除", w:560}`
- **对照基准**: 检查提示词 A9/E3；AntD Pro 原版批量删除有 `popconfirm` 确认；破坏性批量操作确认属行业惯例（NN/g destructive action 惯例）
- **严重程度**: P2（CRUD 高频破坏性路径；P2 在高频主路径按规则升 P1 边缘——因可撤销性未知、mock 数据无真实损失，定 P2）
- **用户影响**: 误点批量删除直接丢数据（真实后端下不可逆）；同页两种删除交互心智不一致。
- **修复方向**: crud 批量删除复用行删除的确认弹层（同 560px Dialog、`取消/确认删除` 右对齐结构）；若 schema 有 `batchDeleteConfirm` 开关则默认开。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-H5-01]（antdpro 域实例确认）新建订单表单弹层 footer 左对齐

- **页面/路由**: `#/complex-pages/antdpro-list` 新建订单弹层；`#/complex-pages/antdpro-form-dialog` 同构弹层同现
- **主题/视口/状态**: light / 1280×800 / Dialog 打开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-list/antdpro-list-dialog-add-light.png`
- **目视描述**: 取消/确定成对出现在弹层左下角，按钮偏小；同页行删除确认弹层按钮却在右下。
- **程序化证据**:
  - 探针: footer 容器 computed justify + 按钮 rect（`antdpro-list-probe.mjs` → `addDialogFooter`）
  - 输出: `justify-content: normal`（左对齐）、`gap: 12px`、取消 x=384 w=60、确定 x=456 w=60、弹层右缘 920（按钮距右缘 424px）；anatomy 基准 `--overlay-anatomy-footer-gap: 8px`、`footer-button-min-width: 72px`
- **对照基准**: styling-system.md「Overlay Size Ladder And Anatomy」+「Dialog / Form Action Button Convention」；与 standard-crud 卡 R2-1a-H5-01 同根因（form actions 模板缺 `justify-end`），本卡为跨域实例确认
- **严重程度**: P1（CRUD 新建高频主路径；同页双弹层行为矛盾）
- **用户影响**: 确认按钮落点违反桌面惯例且与删除确认弹层互相矛盾，高频误点。
- **修复方向**: 同 standard-crud 卡 H5-01：form 弹层 actions 容器补 `justify-end gap-2` + 按钮 `min-width: var(--overlay-anatomy-footer-button-min-width)`。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-C4-01]（antdpro 域实例确认）窄视口查询区塌缩 + 整页 53px 裁切

- **页面/路由**: `#/complex-pages/antdpro-list`
- **主题/视口/状态**: light+dark / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/antdpro-list/antdpro-list-default-light-narrow.png`（关键字输入塌缩为 ~20px 圆点；"渠道"label 与 select 重叠；sticky 操作钮透叠客户名）
- **程序化证据**:
  - 探针: 800px 视口 overflowScan（recon → `narrowOv`）
  - 输出: `SECTION.nop-page.adp-root sw=533 cw=480`（53px 裁切）、`.nop-crud sw溢出`、查询表单行不换行
- **对照基准**: C1/C4；与 standard-crud 卡 R2-1a-C4-01 同根因（数据列表域），本卡证明该 systemic 已扩散到 antdpro 复刻域
- **严重程度**: P1（同原判级，多域复现维持）
- **用户影响**: 窄窗口/分屏用户无法输入查询条件、表格列互相叠压。
- **修复方向**: 同 standard-crud 卡：查询表单行 `flex-wrap` 或栅格降级；`.adp-root`/卡片窄断点放开最小宽；sticky 列实体底（见 C2-02）。
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-A3-01]（antdpro 域实例确认）表头排序钮 h=22、列宽手柄 4px

- **页面/路由**: `#/complex-pages/antdpro-list`
- **主题/视口/状态**: light / 1280×800 / 默认
- **程序化证据**: `targetScan(24)` 输出：排序按钮 48×22（订单号）、列宽手柄 `4×40`（有 title"调整列宽"与列头整体可点缓解）、全选 checkbox 16×16（外层 td 可点缓解）；隐赞 1×1 input 为 opacity-0 原生控件（注册误报白名单）
- **对照基准**: WCAG 2.5.8；与 standard-crud 卡 R2-1a-A3-01 同族
- **严重程度**: P3
- **归族**: systemic → R2-3 批
- **复核状态**: 未复核

### [R2-1a-H4-01]（antdpro 域实例确认）弹层标题左缩进 8px 与 body 24px 不对齐

- **页面/路由**: `#/complex-pages/antdpro-list` 新建订单弹层
- **程序化证据**: `titleX=376`（header pad 16px）、`labelX=inputX=384`（body pad-x 24px），偏差 8px
- **对照基准**: plan 490 anatomy `--overlay-anatomy-body-padding-x: 24px`；与 standard-crud 卡同 ID 同根因
- **严重程度**: P3 ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 疑点                                                | 排除理由                                                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| focus 探针首次读数"输入框边框不变灰"                | 150ms transition 未结束即读值；等待 400ms 后复读 `border rgb(28,110,242)` + focus ring（`antdpro-focus-verify.mjs`），A2 通过                                            |
| dark 标题对比度 1.1:1（首版探针）                   | 对比度 helper 的 bg 合成序 bug（不透明基色阻断合成）所致；改用 CSS 源核实（`--adp-*` 无 dark 覆盖）+ 截图目视 + label span computed 值三重坐实，真实缺陷成立（见 B5-02） |
| `input w=1 h=1` 命中 A3                             | opacity-0 原生 checkbox/select 叠放模式（注册误报白名单）                                                                                                                |
| 分页条截图未滚动到位（pagination-light 与默认同景） | 页面滚动容器为 `.nop-card`（scrollPath 探针证实），补拍 `pagination-scrolled-light` 成功；D6 以 DOM rect 探针 `gapTableToPg=12` 坐实，不依赖截图                         |
| 状态标签"备货中/配送中"同为蓝系                     | 两态均为进行时语义、色相可区分（blue tint 深浅不同），非语义冲突，不报                                                                                                   |
| `nop-checkbox` sw>cw、窄视口表格 sw>cw 命中         | 实际滚动容器为内层 overflow-x-auto（standard-crud follow-up 已证同构）                                                                                                   |

## 5. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`（card 列填本路径）；
- findings 归族：B5-02/C2-02/H5-01/C4-01/H4-01/A3-01 → R2-3 系统性批；A9-02 → R2-4 local 批；
- 批内复检通过后 → `verified`。
