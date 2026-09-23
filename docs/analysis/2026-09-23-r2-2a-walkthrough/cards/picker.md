# [card] control:picker

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/picker` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：单选 owner pick / 多选 reviewers pick / combo 行内 CRUD-mode picker 行隔离（bug 73））
- **矩阵裁剪**: full（README 复杂度裁定）。必做项全部覆盖：弹层开态（几何/页脚/Esc/关闭钮）、选择中间态（radio/checkbox 勾选、确认前）、多选值态（tags + 移除 + tag 删除后）、清空态、combo 行隔离、双主题（真 data-mode）、1280+800 双视口、hover/focus。裁掉的状态及理由：搜索/过滤态（pickerPopup crud fixture 未配置 filter 区，弹层内无搜索输入可驱动——已在已知族记 AMIS 契约缺口候选）；拖拽（控件无拖拽轨道）；drawer/popover surface 变体（fixture 走默认 dialog surface，`picker-drawer-content`/`picker-popover-content` 未触发）。
- runner dark 列作废声明：同 R2-2a-B5-34，dark 证据为自采 data-mode（"真 data-mode"）。

## 1. 截图清单

| 状态                                 | light                                              | dark（真 data-mode）                          |
| ------------------------------------ | -------------------------------------------------- | --------------------------------------------- |
| 默认 1280×800（场景 1，未选择 chip） | `…/picker/default-s1-1280-light.png`               | `…/picker/default-s1-1280-dark.png`           |
| 弹层开（crud 候选表）                | `…/picker/popup-open-1280-light.png`               | `…/picker/popup-open-1280-dark.png`           |
| 弹层重开（页脚取证）                 | `…/picker/popup-reopen-footer-1280-light.png`      | —                                             |
| 选择中间态（radio 勾选未确认）       | `…/picker/row-selected-pending-1280-light.png`     | `…/picker/row-selected-pending-1280-dark.png` |
| 确认后值态                           | `…/picker/value-set-1280-light.png`                | `…/picker/value-set-1280-dark.png`            |
| 清空后                               | `…/picker/after-clear-1280-light.png`              | —                                             |
| 多选中间态（2 项勾选）               | `…/picker/multi-selection-pending-1280-light.png`  | —                                             |
| 多选值态（tags）                     | `…/picker/multi-value-tags-1280-light.png`         | `…/picker/multi-value-tags-1280-dark.png`     |
| tag 移除后                           | `…/picker/after-tag-remove-1280-light.png`         | —                                             |
| combo 行隔离（两行各选后）           | `…/picker/row-isolation-after-both-1280-light.png` | —                                             |
| 默认 800×900                         | `…/picker/default-s1-800-light.png`                | `…/picker/default-s1-800-dark.png`            |
| 弹层开 800                           | `…/picker/popup-open-800-light.png`                | `…/picker/popup-open-800-dark.png`            |

（路径前缀 `_tmp/visual-inspection-2026-09-23/r2-2a/`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（trigger hover 有反馈）A2 pass（trigger focus fv=true、ring 类存在）A3 **fail(R2-2a-A3-103)**（tag 移除钮 12×12、tag chip 13×16，无伪元素扩展）A4 n/a A5 pass（弹层空态由 crud 承接）A6 n/a A7 pass（弹层有关闭钮"关闭"+右上 ×、Esc 可关、焦点困在弹层）A8 n/a A9 **warn(R2-2a-A9-104)**（crud 行点击不产生选中反馈）
- B 颜色：B1 pass（确认钮 light 4.6）B2 pass B3 pass B4 pass B5 **warn（已知族命中：`--popover` dark 亮底，不另立项）** B6 n/a
- C 布局：C1 pass（双视口 docOverX=0；弹层 800 宽下 560 不溢出）C2 pass（弹层居中不压内容）C3 pass C4 pass C5 pass（弹层内容无滚动需求，bottom 563/613 ≤ 视口−8）C6 n/a
- D 间隔：D1–D8 n/a/pass（弹层内行距一致、页脚 gap 正常）
- E 排布：E1 pass E2 pass E3 pass（页脚 取消/确认 右对齐，确认主位 `footerJustify: flex-end`）E4–E6 n/a
- F 一致性：F1–F3 n/a F4 **fail(R2-2a-F4-102)**（选中值显示裸 id，labelField 未生效）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（默认 surface 宽 560=`--overlay-size-base`，size:lg 960=`--overlay-size-lg`，均落在 plan490 阶梯）H2 n/a H3 pass（弹层 h326/286，bottom 563/543 ≤ 792）H4 pass（标题与 × 无重叠）H5 pass（取消/确认/关闭 右对齐 flex-end）H6 n/a（弹层内为表格非表单）H7 pass H8 pass H9 pass（800 视口弹层 560 完整，`popup-open-800-*.png`）

## 3. 发现条目

### [R2-2a-F4-102] 选中值回显显示裸 valueField id，labelField 映射未作用于选中展示

- **页面/路由**: `#/lab/picker`（场景 1 单选、场景 2 多选；一切配置了 `labelField` 的 picker 同险）
- **主题/视口/状态**: light+dark / 1280 / 确认后值态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/picker/value-set-1280-light.png`（chip 显示 "u2"）、`…/picker/multi-value-tags-1280-light.png`（chip "u1, u3" + 标签 "u1×""u3×"）
- **目视描述**: 确认选择后，触发器 chip 与多选标签全部显示 "u2"/"u1"/"u3" 这类原始 id，而候选行里明确展示的是 Alice/Bob/Carol（labelField: 'title'）。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w6-picker.mjs` open-select-confirm / multi 段
  - 输出: `afterConfirm = { label: "u2", triggerText: "u2" }`（行数据 `{id:'u2', title:'Bob'}`）；`multiValue = { tags: ["u1", "u3"] }`；scope-debug `$_picker.rows` 中 `title: "Alice"/"Bob"/"Carol"` 数据齐备。源码 `picker-renderer.tsx` L190-221 `selectedLabel` 依赖 `rawFieldValue[labelField]`，但提交写入的是 valueField 标量，回显分支拿不到 record 时直接落到裸值。
- **对照基准**: 检查提示词 F4（同一概念展示一致——候选列表用 title、选中回显用 id，两种"叫法"并存）；AMIS picker 选中回显 labelField 惯例
- **严重程度**: P2（用户选中 "Bob" 后字段里出现 "u2"，高频主路径、语义断裂；提交值本身正确，纯展示缺陷）
- **用户影响**: 用户无法确认自己选了谁；多选场景下一串 id 完全不可读。
- **修复方向**: `packages/flux-renderers-form-advanced/src/picker-renderer.tsx` 确认提交时（L423 commit 分支已调用 `mapSelectionRows`）把 `{value,label}` 同步写入 `resolvedLabelCache`，使 `selectedLabel` memo 在 value 写入后立即命中 label；或回显分支兜底从 `$_picker.rows`/labelResolveAction 解析后再渲染。
- **归族**: local → R2-4 批（picker 显示映射单点缺陷；与"表单 AMIS 契约缺口"族关联，可在 R2-3 候选清单登记交叉引用）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-24）。修复位精化；design.md labelField 回显契约已回写（2026-09-24）

### [R2-2a-A3-103] 多选标签移除按钮 12×12、tag chip 按钮 13×16，远低于 24px 最小目标且无命中扩展

- **页面/路由**: `#/lab/picker`（场景 2 多选确认后的触发器标签区）
- **主题/视口/状态**: light / 1280 / 多选值态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/picker/multi-value-tags-1280-light.png`（u1×/u3× 小标签）
- **目视描述**: 标签上的 × 移除按钮是整控件里最小的可点目标，肉眼难精确点中。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w6-picker.mjs`（smallTargetScan）+ 伪元素命中扩展核查（`getComputedStyle(el,'::after')`）
  - 输出: `smallTargets_s2 = [{text:"u1", w:13, h:16}, {slot:"picker-tag-remove", text:"移除", w:12, h:12}, …]`；`rmPseudo = {left:"auto", right:"auto", top:"auto", bottom:"auto"}`——无 `after:-inset-*` 扩展（对照 transfer/checkbox 的 `after:-inset-x-3 after:-inset-y-2` 有效扩展模式）
- **对照基准**: WCAG 2.5.8 ≥24×24（检查提示词 A3）
- **严重程度**: P2（移除标签是已选值管理的常规操作，12×12 触屏几乎不可用）
- **用户影响**: 触屏用户误触率高；鼠标用户需精确瞄准。
- **修复方向**: `packages/flux-renderers-form-advanced/src/picker-renderer.tsx` 标签渲染处给 `picker-tag`/`picker-tag-remove` 增加 `after:absolute after:-inset-y-2 after:-inset-x-2` 命中扩展（对齐 ui Checkbox 的既有模式），或把移除钮提到 `size-5`（20px）+ 扩展。
- **归族**: systemic → A3 小目标族（R2-4 批）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-24）

### [R2-2a-A9-104] 候选表整行点击不产生选中态，仅 16px radio/checkbox 可点选，行已预置选中底色却无行点击处理

- **页面/路由**: `#/lab/picker`（弹层内 crud 候选表，3 场景通用）
- **主题/视口/状态**: light / 1280 / 弹层开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/picker/popup-open-1280-light.png`
- **目视描述**: 候选行看起来整行可点（有 hover 底、行尾 radio），但点行体无任何反应，必须精确点中行首 16px 圆点。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w6-picker.mjs`（`tbody tr` click 后读 `[role="radio"]` 状态与确认钮）
  - 输出: 行点击后 `radioStates: ["false","false","false"]`、确认钮 `disabled: true`；改点 radio span 后 `radios: ["true","false","false"]`、确认钮解禁。`tr` 类含 `data-[state=selected]:bg-[var(--table-selected-bg)]`（选中样式已预置，行点击链路未接）。radio span 实测 16×16（select cell 40px 内），本卡不另立 A3（行首 radio 属表格选择列标准密度，勾选语义明确）。
- **对照基准**: 检查提示词 A9（交互后反馈可见）； crud 选择列行业惯例（整行可点为常见增强，AMIS 亦支持行点击选中）
- **严重程度**: P3（radio 可用，功能可达；但大目标无反馈 + 小目标才能操作，可用性断层）
- **用户影响**: 用户点击行体后确认钮仍灰，产生"点了没反应"的困惑。
- **修复方向**: picker 弹层 crud 选择列场景下为 `tr` 增加点击代理（行 click → 触发该行 radio/checkbox toggle），或在行体 hover 时弱化可供性（去 hover 底）以消除"整行可点"暗示。
- **归族**: local → R2-4 批（可并入"表单 AMIS 契约缺口"族候选清单）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **`--popover` dark 亮底（宿主已知问题）**: `popup-open-1280-dark.png` 弹层整面 `rgb(251,250,249)` 白底（computed `popupDarkBg`），且弹层内 crud 表头呈 dark 深底、分页/按钮呈 light 配色，同屏混搭。新实例证据：`out-w6-picker.json popupDarkBg/popupDarkSurface.stack=[251,250,249]`。修复后需复检本卡 B5/H。
- **i18n zh-CN 回退（R2-2a-F4-11 族）**: 弹层页脚 "取消/确认/关闭"、空值 chip "未选择"、tag 移除 aria-label "移除"、弹层内分页 "每页行数/第1-3条，共3条" 均为中文（英文宿主）。
- **A3 小目标族**: A3-103 为族内新实例。
- **调试 chip z9998**: 弹层标题左上被 chip 覆盖风险同 dialog 卡记录（`popup-open-1280-light.png` 左上角），引用不立项。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-picker` → carded（card 列填本路径）；findings 归族后 → digested。
