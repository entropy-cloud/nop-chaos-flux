# [card] control:tree-select

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/tree-select` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：单值树选择带搜索 / checkbox 多选树 / 弹层内远程懒加载 + 失败重试（bug 73））
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件。裁掉：clear 态（fixture 未配置 `clearable`，选中后 `tree-select-icons` 内无清除钮，按 fixture 裁剪记录）、disabled/readOnly（fixture 未配置）、拖拽（无）、800 以下移动端 surface（`tree-select-mobile-*` 槽在 800 宽未触发，桌面 popover 正常——已在 800 视口实测 desktopControl=true）。已覆盖：light+dark（真 data-mode）、1280+800 双视口、默认/popover 开/搜索框在位/单选/多选/懒加载错误+重试/点外关闭/hover/focus。
- runner dark 列作废声明：同 R2-2a-B5-34，dark 为自采 data-mode（"真 data-mode"）。

## 1. 截图清单

| 状态                          | light                                                 | dark（真 data-mode）                       |
| ----------------------------- | ----------------------------------------------------- | ------------------------------------------ |
| 默认 1280×800（触发器）       | `…/tree-select/default-s1-1280-light.png`             | `…/tree-select/default-s1-1280-dark.png`   |
| popover 开（树面板 + 搜索框） | `…/tree-select/popover-open-1280-light.png`           | `…/tree-select/popover-open-1280-dark.png` |
| 选中后触发器                  | `…/tree-select/selected-1280-light.png`               | —                                          |
| checkbox 多选待确认           | `…/tree-select/checkbox-multi-pending-1280-light.png` | —                                          |
| 多选值态                      | `…/tree-select/checkbox-multi-value-1280-light.png`   | —                                          |
| 弹层内懒加载错误 + 重试       | `…/tree-select/lazy-error-in-popover-1280-light.png`  | —                                          |
| 重试成功                      | `…/tree-select/lazy-retry-success-1280-light.png`     | —                                          |
| 默认 800×900                  | `…/tree-select/default-s1-800-light.png`              | `…/tree-select/default-s1-800-dark.png`    |
| popover 开 800                | `…/tree-select/popover-open-800-light.png`            | `…/tree-select/popover-open-800-dark.png`  |

（路径前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（popover-trigger hover bg `rgb(255,255,255)`→`rgb(241,245,249)`）A2 pass（触发器为真实 `popover-trigger` button tabindex=0，Tab 后 fv=true、`focus-visible:border-ring`）A3 pass（smallTargets 无命中；可点目标为整行 treeitem + 触发按钮）A4 n/a A5 pass（懒加载 Spinner + 错误行 + 重试钮齐备）A6/A8 n/a A7 pass（popover 开态、点外关闭 `outsideCloses=true`、Esc 关闭）A9 pass（选中即回填触发器并关面板，echo 同步）
- B 颜色：B1 pass（label dark 12.99）B2 pass B3 n/a B4 pass B5 **warn（已知族命中：`--popover` dark 亮底，不另立项）** B6 pass（选中行 aria-selected + bg-muted）
- C 布局：C1 pass（双视口 docOverX=0）C2 pass（popover 锚定触发器下方，bottom 615 ≤ 792）C3 pass C4 pass（800 宽 popover 268 正常）C5/C6 n/a
- D 间隔：D1–D8 n/a/pass（面板内搜索行与节点行距一致）
- E 排布：E1–E4 pass/n-a（面板内树缩进与 input-tree 同构）E5–E6 n/a
- F 一致性：F1–F3 n/a F4 见已知族（搜索占位 "搜索" zh）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（popover 宽 268 随触发器、非失控宽度）H2–H7 n/a/pass H8 pass H9 pass（800 视口正常开启）

## 3. 发现条目

（无新立发现——简化矩阵下未命中 P0–P3 新疑点。多选回显 "UX Research, DevOps" 用 label 正确（对照 picker 卡 F4-102 的裸 id 缺陷，tree-select 未复现该问题）。）

## 4. 已知族命中（引用，不另立项）

- **`--popover` dark 亮底（宿主已知问题）**: `popover-open-1280-dark.png` 树面板整面 `rgb(251,250,249)` 白底（`popupDarkBg`），面板内文本仍可读但与 dark 页面割裂。修复后需复检本卡 B5。
- **i18n zh-CN 回退（R2-2a-F4-11 族）**: 搜索框占位 "搜索 Select Team"（zh+en 混拼）、懒加载错误 "子节点加载失败：…"。新实例证据：`out-w6-tree-select.json popupOpen.searchPlaceholder`。
- **schema 契约注记（watch）**: fixture `searchable: true` 时搜索框正常渲染（本地过滤）；`searchSource` 缺失不阻断搜索框出现——此前疑点证伪，不立项。
- **误报排除**: 触发器整块 div hover 无变化——真实交互目标是内部 popover-trigger 按钮（hover 有反馈），非缺陷。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-tree-select` → carded（card 列填本路径）。
