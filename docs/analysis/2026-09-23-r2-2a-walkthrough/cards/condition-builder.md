# [card] control:condition-builder

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/condition-builder` ｜ **载体**: lab 页（MultiScenarioLabPage，6 场景：单规则 AND 组 / 嵌套 OR 复杂组 / host 提交 bug73 / disabled / readOnly / custom value editor）
- **矩阵裁剪**: full（README 复杂度裁定——规则增删、AND/OR 切换、字段/操作符下拉开态、值编辑器切换、嵌套分组均已覆盖）。裁掉的状态：**拖拽进行中**（lab fixture 未传 `draggable: true`，`condition-group.tsx` L88 默认 `draggable = false`，本载体上 drag handle 不渲染，A6/A8 无对象——该控件 demo 页面拖拽已由 R2-1d 卡覆盖）；**error 校验态**（lab fixture 未触发 requiredMessage 路径）；glass 皮肤抽查。
- **runner dark 列作废声明**：同 wave1（R2-2a-B5-34），本卡 dark 证据全部为自采显式 `data-mode='dark'` 截图（真 data-mode）。

## 1. 截图清单

| 状态                         | light                                                                                                                                   | dark（真 data-mode，自采）                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 默认 1280×800（视口）        | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/default-1280-light-viewport.png`                                             | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/default-1280-dark-fullpage.png`（整页）        |
| 默认整页（6 场景）           | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/default-1280-light-fullpage.png`                                             | 同上                                                                                                      |
| S1 添加规则中间态（2 规则）  | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-add-condition-light-1280.png`                                             | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-two-rules-dark-1280.png`                    |
| S1 字段下拉开态              | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-field-dropdown-open-light-1280.png`                                       | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-field-dropdown-open-dark-1280.png`          |
| S1 操作符下拉开态            | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-operator-dropdown-open-light-1280.png`                                    | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s2-operator-dropdown-open-dark-1280.png`（S2） |
| S1 字段 focus 环             | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-field-focus-light-1280.png`                                               | —                                                                                                         |
| S1 OR 切换                   | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-or-switched-light-1280.png`                                               | —                                                                                                         |
| S1 hover 规则项              | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-item-hover-light-1280.png`                                                | —                                                                                                         |
| S1 删除规则后回到 1 条       | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-after-remove-light-1280.png`                                              | —                                                                                                         |
| S2 嵌套组默认                | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s2-nested-default-light-1280.png`                                            | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s2-nested-dark-1280.png`                       |
| S2 添加分组后（3 组 4 规则） | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s2-add-group-light-1280.png`                                                 | —                                                                                                         |
| S3 值编辑器（select）开态    | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s3-value-select-open-light-1280.png`                                         | —                                                                                                         |
| S3 编辑+加规则+提交 echo     | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s3-edited-plus-rule-light-1280.png` / `s3-submitted-light-1280.png`          | —                                                                                                         |
| S4 disabled                  | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s4-disabled-light-1280.png`                                                  | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s4-disabled-dark-1280.png`                     |
| S5 readOnly                  | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s5-readonly-light-1280.png`                                                  | —                                                                                                         |
| S6 custom value editor       | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s6-custom-editor-light-1280.png`                                             | —                                                                                                         |
| 默认 800×900 窄视口          | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/default-800x900-light-fullpage.png`                                          | —                                                                                                         |
| 800 宽 S1 两规则+字段下拉    | `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s1-two-rules-800x900-light.png` / `s1-field-dropdown-open-800x900-light.png` | —                                                                                                         |

## 2. A–H 维度勾选表

- A 交互：A1 pass（condition-item hover 有 shadow 过渡，`s1-item-hover`）A2 pass（combobox focus 环可见：`s1-field-focus`，boxShadow ring + border-ring）A3 pass（smallTarget 扫描仅 sr-only 1×1 隐藏 input，白名单）A4 pass（S4：6/8 button disabled；S5 readOnly 折叠进 disabled 同一伞，即 C3.3 P1-1 既定裁决，视觉一致不算缺陷）A5 pass（S2 新增空组有"暂无条件，请点击下方按钮添加"引导文案）A6/A8 n/a（fixture 未启用 draggable，见矩阵裁剪）A7 pass（下拉开态 Esc 可关，关闭后无残留 DOM）A9 pass（添加/删除/切换/提交全部即时反映：`s1AfterAdd items=2`、`s1AfterRemove=1`、S3 echo 落值 `right:"inactive"`）
- B 颜色：B1 pass（light 标签对比 20.01:1、规则项 12.61:1）B2 pass（规则项边框可见）B3 n/a B4 pass（chrome 走令牌）B5 **warn（已知族）**：字段 combobox 下拉与操作符 Select 下拉在 dark 下整面白底（`s1-field-dropdown-open-dark` / `s2-operator-dropdown-open-dark`），`--popover` dark 亮底已知族实例，不另立项；`--primary` dark 过亮同见（Apply Filter 亮蓝）。B6 pass（下拉选中项高亮 + check 图标）
- C 布局：C1 **warn（已知族实例）**：combobox input-group overX 4–5px（rectW 137–138，dialog 卡 R2-2a-C1-10 同族）；docOverX 0，无页面级滚动。C2 pass（下拉压住"添加分组"文案属正常 overlay）C3 pass C4 pass（800 宽规则行收窄不破版，`overRight -377` 下拉不溢出）C5 n/a C6 n/a
- D 间隔：D1 pass（规则行 gap 6px、组间距一致）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（添加条件/添加分组为文字次按钮，与规则操作 icon-xs 层级分明）E3 pass（删除在行尾右位）E4 pass（字段/操作符/值三段左对齐成列）E5 pass（嵌套组以边框+缩进分层）E6 n/a
- F 一致性：F1 pass F2 n/a F3 pass F4 **fail(R2-2a-F4-80)**（操作符显示裸枚举键，见发现）；整控件 chrome 中文（已知族 F4-11，见 §4）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（字段下拉 137px、操作符下拉、值 select 下拉宽度贴合触发器，无失控）H2 n/a H3 pass（下拉均 ≤ 视口）H4 n/a H5 n/a（下拉无 footer）H6 n/a H7 n/a H8 pass（下拉内部滚动无）H9 pass（800 宽下拉不出视口）

## 3. 发现条目

### [R2-2a-F4-80] 操作符选择器触发态与下拉项显示裸枚举键（eq / equal / gt），未落人类可读标签

- **页面/路由**: `#/lab/condition-builder`（S1 `operators: ['eq','neq']`、S2 `['eq','gt','lt','gte','lte']`、S3 默认操作符集均复现）
- **主题/视口/状态**: 双主题 / 1280 / 默认与下拉开态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/condition-builder/s2-operator-dropdown-open-dark-1280.png`（下拉项 eq/gt/lt/gte/lte 裸键）；`s1-two-rules-800x900-light.png`（同一页面两规则触发器分别显示 "eq" 与 "equal"）
- **目视描述**: 操作符触发器与下拉项直接显示 `eq`、`gt`、`equal` 等枚举键；同一页面新增规则显示 `equal` 而种子规则显示 `eq`，键名混排且无本地化标签。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w5-dump.mjs`（stage 按钮文本抽取）+ `_tmp/r2-2a-probes/w5-condition-builder.mjs`（下拉 open 态截图与 DOM）
  - 输出: S1 按钮 `["并且","或者","展开/收起下拉","eq▼",…]`；S3 `equal▼`；`operators.ts` L141 `label = labels?.[op] ?? getBuiltInOperatorLabel(op) ?? op`——非规范键（eq/gt）无标签时静默回退裸键；S3 种子规则 op=`equal` 不在该字段（select 型，合法集为 select_equals 等）条目内时触发器亦直接回显裸值。
- **对照基准**: 检查提示词 F4（术语与文案一致：同一概念不混用两种叫法）；operators.ts `OPERATOR_LABEL_KEYS` 本身已有 zh/en 标签通道。
- **严重程度**: P3（不影响功能，值提交正确；但面向用户的条件规则可读性差，且同页键名混排放大不一致感）
- **用户影响**: 构建过滤条件的用户需要懂枚举命名才能选对操作符；"eq vs equal" 混排让人怀疑两条规则语义不同。
- **修复方向**: `resolveOperators` 对无标签回退改为人读兜底（如按 `OPERATOR_LABEL_KEYS` 反查或至少 `t('conditionBuilder.operatorPlaceholder')` + 规范化键名）；对 seed 数据 op 不在合法集的情形，触发器显示占位而非裸值。
- **归族**: local → R2-4 批（单渲染器显示回退逻辑修复）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）

## 4. 已知族命中（引用，不另立项）

- **i18n zh-CN 回退（R2-2a-F4-11 族，新实例）**: 英文宿主下整控件 chrome 全中文——"满足以下/并且/或者/添加条件/添加分组/删除条件/删除分组/暂无条件，请点击下方按钮添加"。比 dialog 卡的 a11y 标签实例严重得多：这是控件全部操作入口的语言错乱（`default-1280-light-fullpage.png` 可见）。引用 F4-11 不另立项；修复（initFluxI18n 或默认随 navigator.language）后本控件 chrome 随之收敛。
- **`--popover` dark 亮底 / `.nop-theme-root` 钉死 color-scheme:light（宿主已知问题，新实例）**: dark 下字段 combobox 下拉（`s1-field-dropdown-open-dark-1280.png`）与操作符 Select 下拉（`s2-operator-dropdown-open-dark-1280.png`）整面白底。修复后需复检本卡 B5。
- **`--primary` dark 过亮（R2-4 已知族）**: dark 下 Apply Filter 主按钮亮蓝（`s2-operator-dropdown-open-dark-1280.png` 顶部可见）。
- **input-group 微溢出（R2-2a-C1-10 族，新实例）**: 字段 combobox 的 input-group overX 4–5px（rectW 137–138），与 dialog 卡 real-schema 弹层同根因。
- **重叠说明**: 本卡为 condition-builder 的 **lab 载体面**独立台账单元；demo 页面发现（R2-1d-F4-51/52、A7-52 等）不在此重复。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-condition-builder` → carded（卡列填本路径）；findings 归族后 → digested。
- 交互键上报：`{"lab-condition-builder":[{"action":"waitFor","ms":800},{"action":"clickText","text":"添加条件"},{"action":"waitFor","selector":"[data-slot=condition-item]"},{"action":"click","selector":"[aria-label=条件字段]"},{"action":"waitFor","ms":400}]}`
