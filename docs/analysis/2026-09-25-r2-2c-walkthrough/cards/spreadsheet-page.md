# [card] control:spreadsheet-page

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/spreadsheet` ｜ **载体**: 域 demo 页（standalone spreadsheet host：SpreadsheetDemo + 页头壳；spreadsheet-core/renderers；本波控件无 lab 路由，载体 = 域 demo 页，plan 498 载体裁定）。注意：`#/spreadsheet` **页面级**走查已在 R2-1b 完成（carded）；本卡为**控件契约面**首查，独立台账单元
- **契约面**: `spreadsheet-page` type 渲染区 = 整页电子表格（`nop-spreadsheet-page`：工具栏 + 网格 + 行列头 + sheet tab 栏 + 日志区）
- **矩阵裁剪**: simplified（matrixReason：任务矩阵口径指定的 选区/编辑态/格式化中间态/行列头 全查；裁掉：glass 皮肤（波次统一）、行高/列宽 Dialog 弹层矩阵（R2-1b H 维已全过，本波探针资源集中在编辑链路）、冻结窗格态（R2-1b A7/A8 已证）、readonly（本页无入口，R2-1b 同裁剪））
- **探针**: `_tmp/r2-2c-probes/w5-spreadsheet.mjs`、`w5-spreadsheet2.mjs`、`w5-spreadsheet3/4/5/6.mjs` → `out-w5-spreadsheet*.json`

## 1. 截图清单

| 状态                            | light                                                                             | dark（真 data-mode）                         |
| ------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------- |
| 默认 1280×800                   | `_tmp/visual-inspection-2026-09-25/r2-2c/spreadsheet-page/default-1280-light.png` | `…/spreadsheet-page/default-1280-dark.png`   |
| 默认 ~800 宽                    | `…/spreadsheet-page/default-800-light.png`                                        | `…/spreadsheet-page/default-800-dark.png`    |
| 单元格选中（G1 选中环）         | `…/spreadsheet-page/cell-selected2-light.png`                                     | `…/spreadsheet-page/cell-selected2-dark.png` |
| 编辑态（键入 mid：编辑器 open） | `…/spreadsheet-page/cell-editing-mid-light.png`                                   | —                                            |
| 格式化中间态（加粗应用）        | `…/spreadsheet-page/bold-applied2-light.png`                                      | —                                            |
| undo 后                         | `…/spreadsheet-page/after-undo2-light.png`                                        | —                                            |
| 列宽拖拽 mid（G3）              | `…/spreadsheet-page/col-resize-mid-light.png`                                     | —                                            |
| 右键菜单                        | `…/spreadsheet-page/context-menu-light.png`                                       | —                                            |
| 查找替换面板开                  | `…/spreadsheet-page/find-replace2-light.png`                                      | —                                            |
| 行列头现场                      | 默认图（corner 40×22 / 列头 80×22 / 行头 39×23）                                  | —                                            |

## 2. A–H 维度勾选表

- A 交互：A1 pass（单元格 hover cursor=cell、工具栏 hover 维持 R2-1b 结论） A2 pass（工具栏按钮 Tab → `:focus-visible` + 3px oklab ring（w5-spreadsheet2 `kbFull` boxShadow 全值）） **A3 warn（家族引用：行列头 21/23px <24，R2-1b-A3-01 维持，见 §4）** A4 pass（无选区时格式化钮 disabled 契约在，源码 `disabled={!props.hasSelection}`） A5 n/a **A6/A9 fail(R2-2c-A9-156：type-to-edit 首键被吞)** A7 pass（右键菜单 20 项完整、Esc 可关） A8 pass（行高/列宽 Dialog 与工具栏填充钮为拖拽替代，R2-1b 口径维持） A9 pass（加粗/填充/选中日志区回显维持；唯编辑键入路径见 156）
- B 颜色：B1 pass（dark cell/header 对比度 **6.96:1** 探针坐实） B2 pass（选中环 light `rgb(15,157,88)` / dark `rgb(52,211,153)` 双主题 ≥3:1） B3 pass B4 pass（`--ss-*` 令牌双主题对称维持 R2-1b 结论） B5 pass（dark 全套令牌平价复检通过） B6 pass
- C 布局：C1 pass（1280/800 均 docOverX=0；虚拟化 spacer 白名单维持） C2 **warn（家族引用：R2-1b-C2-01 维持——查找替换面板仍压宿主页头，见 §4）** C3 pass（五区清晰维持） C4 pass（800 下工具栏 overflow-x auto 有意滚动白名单维持） C5 pass（thead sticky 维持） C6 n/a
- D 间隔：D1 pass（行高 24px 全网格一致、工具栏 gap 均一，R2-1b 口径复检） D2–D8 pass/n-a
- E 排布：E1–E6 pass（维持 R2-1b 全过结论）
- F 一致性：F1–F4 pass（维持）
- G 设计器：G1 pass（选中环 2px `--ss-active` 双主题、range 高亮契约在） G2 pass（cell cursor + 工具栏 hover） G3 pass（列宽拖拽 80→130 精确、填充柄 `.ss-fill-handle` 在位） G4 n/a（网格恒非空，R2-1b 裁剪口径维持） G5 n/a（无缩放 UI，host contract 限制维持） G6 pass（undo 撤销加粗/键入即时回退（`afterUndo: 400→400`、编辑 undo 恢复原值）） G7 pass（工具栏→单元格 fontWeight 400→700 双向、选区→加粗钮 active 投影，双向同步复检通过） G8 pass（dark 网格文字/表头/选中环全可读）
- H 弹层：H1 pass（行高/列宽 Dialog sm 档维持 R2-1b） H2 n/a H3–H9 pass/n-a（维持）

## 3. 发现条目

### [R2-2c-A9-156] 键入编辑丢首键：type-to-edit 打开单元格编辑器时第一个字符被吞（"abc"→"bc"、"42"→"2"）

- **页面/路由**: `#/spreadsheet`（任意数据单元格，单击选中后直接键入——Excel/Sheets 惯用的 type-in-place 路径）
- **主题/视口/状态**: light / 1280×800 / 编辑态（双主题同路径，dark 未单独复测——编辑器与主题无关的键入语义）
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/spreadsheet-page/cell-editing-mid-light.png`（编辑器 open 现场；终值证据为探针数值）
- **目视描述**: 选中空单元格后连续键入 `abc`，编辑器中只见 `bc`；回车提交后单元格值为 `bc`——首字符 `a` 永久丢失，无任何提示。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w5-spreadsheet5.mjs`（空单元格单键/多键两轮，undo 恢复隔离现场）+ `w5-spreadsheet4.mjs`（非空单元格复测）
  - 输出: 空单元格键 `9` 单键 → 编辑器 `value:"9"`、提交 `"9"`（单键正常）；键入 `abc` → 编辑器 `value:"bc"`、提交 `"bc"`（首键丢失）；非空单元格（原值 42）键入 `42` → 编辑器 `value:"2"`、提交 `"2"`（首键丢失）；undo 均可回退。机制 = 第一个 keydown 被消费用于打开编辑器，未 seed 进编辑器输入框（Excel 语义应 seed 首字符）
- **对照基准**: 检查提示词 A9（交互后结果正确可见）；NN/g 直接操作（输入即所得）；Excel/Google Sheets type-in-place 惯例（首键入字符进入编辑器）
- **严重程度**: P2（数据录入正确性缺陷：用户输入静默缺字；编辑为电子表格最高频路径，升 P1 的边缘——因单字符输入不受影响、丢字可被用户目检发现，定 P2）
- **用户影响**: 用户连续输入内容时首字符静默丢失（如键 `Total100` 得 `otal100`），依赖用户肉眼复查才发现，信任成本高。
- **修复方向**: `use-spreadsheet-interactions.ts`（或 grid 键盘处理层）在「编辑器未打开 + 可打印字符 keydown」分支打开编辑器时，把该字符作为编辑器初始值（`seed` 后 preventDefault 只消费「打开」动作不消费字符）；复现用例（type 'abc' → expect 'abc'）进 spreadsheet-grid 交互测试。
- **归族**: local → R2-4 批（spreadsheet 编辑链路单点；与「输入边界反馈一致性族」观察相邻但根因独立）
- **复核状态**: 已复核（保留 P2，根因修正，review-b 2026-09-25）：原卡"首键未 seed"证伪（grid.tsx L359 有 seed）；真凶 = inline-controls.tsx L27 `input.select()` 全选播种字符被下一键替换；慢键入 150ms/char 仍丢首键（确定性非竞态）；owner-doc L71 契约被违反

## 4. 已知族命中（引用，不另立项）

- **R2-1b-A3-01（行列头按钮 <24px，systemic → R2-3）— 复检：维持（微改善）**。新实例证据：`w5-spreadsheet.mjs smallTargets` 共 48 项全部为 `spreadsheet-header-button`：列头 79×21、行头 39×23、corner 40×22——行头 21→23 微升仍低于 24；族裁决维持。
- **R2-1b-C2-01（查找替换面板压宿主页头，local → R2-4）— 复检：维持**。新实例证据：`w5-spreadsheet6.mjs` 面板 rect (21,57) 331×28 起步 + find-replace2-light.png 目视：面板浮于视口左上、盖住「…round」页头文字与调试 chip，未锚定工具栏查找钮。
- **填充柄 7×7 小尺寸**：并入 A3 族观察（拖拽手柄非点击目标，Excel 同款 ~6px，行业惯例在侧，仅记录不判级）。
- 误报排除：① dblclick 不打开编辑器 = 本实现单击键入即编辑（dblclick 无绑定），非缺陷；② `data-slot="spreadsheet-cell-value-input"` 探针伪 miss（实际插槽名为 `spreadsheet-cell-editor-input`，已按实名复测）；③ 800 下工具栏 scrollWidth 溢出为有意滚动容器（C1 白名单维持）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `spreadsheet-page` → carded（card 列填本路径）；A9-156 → local（R2-4）；A3-01/C2-01 维持记录回写原条目链路。
