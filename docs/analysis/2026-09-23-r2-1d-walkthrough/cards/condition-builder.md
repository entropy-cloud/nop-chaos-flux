# [card] page:condition-builder

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/condition-builder` ｜ **载体**: 域 demo 页（`apps/playground/src/pages/condition-builder-page.tsx` + `conditionBuilderSchema.json`，condition-builder renderer 四实例：嵌入 full / 简单 / 弹出 Picker / 自定义操作符）
- **矩阵裁剪**: full（拖拽/弹层/条件行增删中间态无条件全查：加行、删行、行拖拽、嵌套分组、AND/OR/NOT 切换、字段/操作符/值三个弹层、Picker 弹层 light+dark）

## 1. 截图清单

| 状态                   | light                                                            | dark                                                     |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| 默认 1280（首屏/页尾） | `default-light-1280.png` / `default-light-1280-bottom.png`       | `default-dark-1280.png` / `default-dark-1280-bottom.png` |
| ~800 宽                | `default-light-800.png`                                          | —                                                        |
| 加行后                 | `row-added-light.png`                                            | `rows-dark.png`                                          |
| 字段下拉（含过滤）     | `field-dropdown-light.png` / `field-dropdown-filtered-light.png` | `field-dropdown-dark.png`                                |
| 操作符/值下拉          | `operator-dropdown-light.png` / `value-dropdown-light.png`       | —                                                        |
| 取反激活               | `not-toggled-light.png`                                          | —                                                        |
| 嵌套分组               | `nested-group-light.png`                                         | —                                                        |
| 拖拽进行中             | `drag-mid-light2.png`                                            | —                                                        |
| 拖拽落位/删行后        | `drag-end-light2.png` / `after-delete-light.png`                 | —                                                        |
| 行 hover               | `row-hover-light.png`                                            | —                                                        |
| Picker 弹层（空/含行） | `picker-open-light.png` / `picker-with-row-light.png`            | `picker-open-dark.png` / `picker-with-row-dark.png`      |
| 简单模式加行           | `simple-mode-row-light.png`                                      | —                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 pass（按钮/行 hover）A2 pass（行内控件可 Tab 到、focus 环可见）A3 pass（AND/OR/取反/拖拽/删除钮均 ≥24px；数据扫描 0 命中）A4 n/a A5 **pass（暂无条件空态文案非空）** A6 **fail(A6-51)** A7 **fail(A7-52)** A8 **fail（拖拽无单指针替代：行重排仅拖拽一条路径，无上移/下移按钮）** A9 pass（加/删/切换即时可见）
- B 颜色：B1 pass B2 pass B3 pass（取反=amber 语义可辨）B4 pass B5 **warn（dark 弹层亮底=宿主 --popover 已裁定族，确认即可）** B6 pass
- C 布局：C1 pass C2 pass（Picker 弹层压住下方内容属正常 overlay）C3 pass C4 pass C5 pass C6 n/a
- D 间隔：D1 pass（行距/按钮 gap 成栅格）D2–D8 pass
- E 排布：E1 pass E2 pass E3 pass E4 pass E5 **warn(E5-51 字段下拉平铺无分组标题)** E6 pass
- F 一致性：F1 pass F4 **fail(F4-51 触发器裸值) fail(F4-52 裸 markdown)** F2/F3/F5 n-a
- G 设计器：n/a
- H 弹层：H1 **warn（Picker 宽度 248→557 不在 --overlay-size-\* 阶梯）** H3 pass H5 fail（无 footer 按钮）H7 pass H9 pass（未复测窄视口弹层，800 页面级无溢出）

## 3. 发现条目

### [R2-1d-F4-51] 操作符/值触发器显示裸值（equal/true），选项列表却是中文标签

- **页面/路由**: `#/condition-builder`（全部四个 builder 的条件行；`#/condition-builder-formula` 同构复现）
- **主题/视口/状态**: light+dark / 1280 / 加行后默认态
- **截图**: `row-added-light.png`（equal ▼）、`nested-group-light.png`（值触发器 "true"）、`operator-dropdown-light.png`（选项「等于/不等于」）
- **目视描述**: 操作符下拉展开后选项为「等于/不等于」，但收起后触发器显示原始值 `equal`；布尔字段的值选项为「是/否」（trueLabel/falseLabel 生效），选中后触发器却显示 `true`。
- **程序化证据**:
  - 探针: 触发器 textContent 与 `[role="option"]` 文本对照（`_tmp/r2-1d-probes/w5-cb-1-out.json`、`w5-cb-2-out.json`）
  - 输出: 触发器 `"equal▼"`；选项 `["等于","不等于"]`；值选中后触发器 `true`（`nested-group-light.png` 与 rowDetail.value 一致）。
- **对照基准**: F4 术语与文案一致；select/combobox 惯例（触发器必须回显所选项的 label 而非 value）。
- **严重程度**: P2（高频路径必经——每行必显示）
- **用户影响**: 中文界面出现英文裸值，且 `true` 对布尔字段语义失真（用户选的是「是」）。
- **修复方向**: 条件行触发器渲染时经 fields/operators 的 label 映射回显（operator label 表 + boolean trueLabel/falseLabel），与下拉选项同源。
- **归族**: systemic → R2-3 批（condition-builder 触发器回显）
- **复核状态**: 未复核

### [R2-1d-A7-52] Picker 弹层无关闭/确认/取消任意出口按钮

- **页面/路由**: `#/condition-builder`（弹出模式 Picker）
- **主题/视口/状态**: light+dark / 1280 / 弹层打开态
- **截图**: `picker-open-light.png`、`picker-with-row-light.png`、`picker-open-dark.png`
- **目视描述**: 弹层（role=dialog）只有「满足以下」+ AND/OR/取反 + 条件区 + 添加条件/添加条件组，底部没有任何确认/取消/关闭钮；关闭只能靠点击外部或 ESC。
- **程序化证据**:
  - 探针: 打开后枚举 dialog 内 button（`w5-cb-2-out.json` pickerPopup.btns）→ `["并且","或者","取反","添加条件","添加条件组"]`，无确认/取消；`focusedInside: true`（焦点管理 ✔）、ESC 关闭 ✔。
- **对照基准**: A7 弹层打开态基本完整性（有关闭钮）；H5 footer 按钮排布；styling-system.md Dialog/Form Action Button Convention。
- **严重程度**: P2
- **用户影响**: 用户配置完条件后没有明确「确定」动作，何时生效/如何放弃不可知；触屏上「点击外部关闭」不可发现。
- **修复方向**: 弹层补 footer（取消 outline + 确定 primary，右对齐走 `--overlay-anatomy-footer-gap`）；或至少加右上角关闭 ×。
- **归族**: systemic → R2-3 批（自绘弹层绕过 plan-490 解剖学，与 code-editor 全屏 A7-51 并案）
- **复核状态**: 未复核

### [R2-1d-A6-51] 行拖拽无 ghost、无落位指示器

- **页面/路由**: `#/condition-builder`（基础模式/弹出模式，draggable: true）
- **主题/视口/状态**: light / 1280 / 拖拽进行中
- **截图**: `drag-mid-light2.png`（仅被拖行置灰偏移，无任何插入线/ghost）
- **目视描述**: 按住第二行拖拽手柄上移过程中，看不到被拖内容的 ghost 跟手，也没有任何落位指示线；仅源行呈现置灰/占位样式。
- **程序化证据**:
  - 探针: mousedown→move 中扫描 `dragging/ghost/indicator/drop-target` 类元素（`w5-cb-3-out.json` dragMid）
  - 输出: `ghosts: 0, indicators: 0`。
- **对照基准**: A6 拖拽全链路视觉反馈（drop indicator 及时）；NN/g 拖放指南（落位必须有清晰 drop-target 反馈）。
- **严重程度**: P2
- **用户影响**: 多行/嵌套分组场景下用户无法预判松手落点，拖拽可信度低。
- **修复方向**: 拖拽中在被拖目标位置渲染 2px 插入指示线（走 `--primary` 令牌），或跟随指针的 ghost 行。
- **归族**: systemic → R2-3 批（与 gantt/kanban 拖拽反馈模式合并审视）
- **复核状态**: 未复核

### [R2-1d-F4-52] demo 介绍文案以裸 markdown 渲染（### / 反引号直接可见）

- **页面/路由**: `#/condition-builder`、`#/condition-builder-formula`（type:"text" 渲染器）
- **主题/视口/状态**: light+dark / 1280 / 默认
- **截图**: `default-light-1280.png`（`### Condition Builder 测试 以下展示…`）、formula 页 `formula-row-light.png`
- **目视描述**: schema 文本中的 `###` 标记与 `` `formulas` `` 反引号按字面渲染。
- **程序化证据**: 截图目视 + DOM textContent 以 `###` 开头（demo schema 第一节点 `type:"text"`）。
- **对照基准**: F4 文案；demo 页数据简化红线不覆盖「标记符号按字面显示」（这是渲染语义缺失，非简化）。
- **严重程度**: P3
- **用户影响**: 观感粗糙；作者若依赖 markdown 语义会持续踩坑。
- **修复方向**: demo schema 改用 `type:"markdown"`，或 text 渲染器支持 `\n` 段落化；二选一（不改产品行为则改 demo）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1d-E5-51] 字段下拉平铺渲染，fields 分组标题丢失

- **页面/路由**: `#/condition-builder`（searchable 字段下拉）
- **主题/视口/状态**: light+dark / 1280 / 字段下拉打开
- **截图**: `field-dropdown-light.png`、`field-dropdown-dark.png`
- **目视描述**: schema 定义了「用户信息」「时间范围」两个 group，但下拉为 6 个字段的平铺列表，无分组标题。
- **程序化证据**: 探针: 下拉项文本枚举 → `["用户名","年龄","角色","创建时间","更新时间","是否激活"]`，无 group 行（`w5-cb-2-out.json`）。
- **对照基准**: E5 分组视觉语言；schema fields group 语义。
- **严重程度**: P3
- **用户影响**: 字段多时层级上下文丢失（本 demo 6 字段影响小）。
- **修复方向**: 下拉列表按 group 渲染标题行（disabled option 或独立 header row）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

**本页正例（记录）**: 加行/删行/嵌套分组/AND-OR 切换/取反（amber 环+对勾，状态清晰）全链路即时可见；字段下拉过滤「时」→ 2 项即时收敛；dark 下行、芯片、下拉（选项区）适配良好；行控件 Tab 可达（tabbables 枚举验证）；R2-1a validation 链幻影错误族在本页交互全程**未复现**（无任何凭空错误标注）。

**族实例确认（一句话）**: dark 字段下拉弹层亮底（rgb(251,250,249) 暖白）= 宿主 --popover 已裁定族；嵌套分组卡片与根组同宽无缩进（层级仅靠边框区分，深嵌套可读性一般，随 E5-51 一并观察）。

## 4. 台账回写

- 本卡完成后：ledger.md `condition-builder` 行 status → `carded`；findings 归族后 → `digested`。
- 族实例注记（closure audit 簿记轮补登，不另立锚）：
  - **A8 fail（行重排拖拽无单指针替代，无上移/下移按钮）** → 并入 R2-1d-A8-01 手势替代族（mobile-components 主条目，R2-3 移动渲染器契约候选）同族实例；WCAG 2.5.7 同类。
  - **H1 warn（formula Picker 宽度 248→557 不在 `--overlay-size-*` 阶梯）** → plan 490 弹层阶梯契约的卡面观察项（P3）；condition-builder-formula 卡同构弹层为同族观察，随 R2-3 弹层族批次顺带核对。
