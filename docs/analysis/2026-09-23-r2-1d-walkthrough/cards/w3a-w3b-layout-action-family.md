# [card] page:w3a-w3b-layout-action-family

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w3a-w3b-layout-action-family` ｜ **载体**: 域页面（layout/action 族 demo：grid/collapse×2/button-group/dropdown-button 经 SchemaRenderer 挂载到 flux-renderers-layout）
- **矩阵裁剪**: simplified（理由：控件 demo 页，floor 矩阵 + 波指定 D1/D7 嵌套间隔与 E3 按钮排布专项（本页 E3 落在 dropdown 菜单与 wizard 式 footer——wizard 归 w2a 卡，本卡以菜单项排布承担）。裁掉：A6 拖拽（无）、G n/a、glass（波内统一裁剪）、A5 loading/empty（静态结构无异步））

## 1. 截图清单（状态矩阵）

| 状态                          | light                                                                                                                      | dark                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 默认 1280×800                 | `_tmp/visual-inspection-2026-09-23/r2-1d/w3a-w3b-layout-action-family/w3a-w3b-layout-action-family-default-wide-light.png` | `…/w3a-w3b-layout-action-family-default-wide-dark.png`   |
| 默认 800×900                  | `…/w3a-w3b-layout-action-family-default-narrow-light.png`                                                                  | `…/w3a-w3b-layout-action-family-default-narrow-dark.png` |
| collapse multiple 双开        | `…/w3ab-collapse-both-open-light.png`                                                                                      | `…/w3ab-collapse-buttongroup-dark.png`                   |
| button-group 选中（Option 2） | `…/w3ab-buttongroup-selected-light.png`                                                                                    | （dark aria-pressed 程序化取证）                         |
| dropdown 菜单打开             | `…/w3ab-dropdown-open-light.png`                                                                                           | `…/w3ab-dropdown-open-dark.png`                          |
| hover/focus/disabled 抽样     | collapse 触发器/button-group/menu item focus ring 同族（程序化）；菜单项 hover=高亮底（样式表 ghost 语言）                 | —                                                        |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（collapse 触发器 hover、menu item hover 高亮、button-group hover 均可感知） A2 ✔（触发器/按钮 focus ring 同族） A3 ✔（targetScan wide/narrow 0 命中；菜单项 120×28、触发器/选项 ≥28 高） A4 ✔（无 disabled 演示，无伪 disabled） A5 n/a A6 n/a A7 ✔（dropdown 菜单：Escape/点外关闭、选中后关闭、`aria-haspopup="menu"`+`aria-expanded` 同步） A8 n/a A9 ✔（collapse→`collapse:touched`、button-group→`button-group:selected`、dropdown Set Flag→`dropdown:clicked`，DOM 断言）
- B 颜色：B1 ✔ B2 ✔ B3 ✔（菜单 Delete 项 destructive 红 rgb(239,67,67)，dark 下 rgb(217,38,38) 随主题换挡） B4 ✔（选中态 `bg rgb(236,243,254)`/字 `rgb(10,71,169)` 为 primary 派生令牌） B5 **warn（既有族）**（dark 下菜单亮底 `rgb(251,250,249)`——宿主 `--popover` 已知族确认） B6 ✔（选中态 aria-pressed + primary-soft 派生，非裸默认蓝一键切）
- C 布局：C1 ✔（wide/narrow 溢出扫描全空） C2 ✔ C3 ✔ C4 ✔（800 下 grid 3 列挤压但 colSpan 结构保持、不破版） C5 ✔ C6 n/a
- D 间隔：D1 ✔（**D1 专项**：主栈兄弟块间距全 16px 序列；grid 内 gap=12px（schema 显式 gap:12）一致；button-group 内项 0px 为 joined group 有意 flush） D2 **warn(R2-1d-D2-30)**（collapse 展开体与所属面板的邻近分组弱，见发现） D3 n/a D4 n/a D5 n/a D6 n/a D7 ✔（**D7 专项**：扫描 <4px 组合仅 button-group joined 项（有意 flush，白名单成立——button-group 语义即连体）；无意外贴死） D8 ✔
- E 排布：E1 ✔ E2 ✔（主下拉「Actions」outline 次级、菜单内 Set Flag 默认/Delete destructive 层级正确） E3 ✔（菜单项顺序：动作→查看→破坏性红，破坏性置末位符合惯例；menu item 28px 等高对齐） E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1 ✔（本页四控件交互语言一致） F3 ✔ F4 ✔（本页无中文文案） F5 n/a
- G 设计器：n/a
- H 弹层：H1 ✔（菜单内容自适 128px 宽，无 ad-hoc 档） H3 ✔（92px 高不触底） H4 ✔ H5 n/a H7 ✔ H9 ✔（800 视口菜单不溢出）

## 3. 发现条目

### [R2-1d-D2-30] collapse 展开体游离在面板框外，与下一面板等距、分组感缺失

- **页面/路由**: `#/w3a-w3b-layout-action-family`（`demo-collapse` Panel A/B 展开态）
- **主题/视口/状态**: light / 1280×800 / Panel A+B 双开
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w3a-w3b-layout-action-family/w3ab-collapse-both-open-light.png`（"collapse-body-A" 裸文本悬在 Panel A 框与 Panel B 框之间）
- **目视描述**: 触发器是带边框圆角的面板条，但展开后的 body 是无边框裸文本，悬在两个面板条之间——归属感靠猜；与「面板 A 展开」的格式塔预期（内容被面板容器包裹/缩进+分隔）不符。
- **程序化证据**:
  - 探针: gapScan 展开态兄弟块间隙序列（`_tmp/r2-1d-probes/w3ab-probe.mjs` gaps）
  - 输出: Panel A 框底→body ≈14px，body→Panel B 框顶 ≈13px——**展开体与所属组、与下一组间距几乎相等**，邻近原则未表达（D2 判据：组内间距应显著小于组间）。
- **对照基准**: 检查提示词 D2（同组紧凑、异组留白）/E5（分组视觉语言）；shadcn Accordion 惯例（item 容器包裹 trigger+content）。
- **严重程度**: P3
- **用户影响**: 多面板展开时内容归属易混读；面板多、内容长的场景更明显。
- **修复方向**: collapse 展开体增加容器归属：body 外包一层与 trigger 同宽的圆角容器（上圆角去除、与 trigger 连体）或统一 `padding-left` 对齐 + 底部分隔线（`border-b border-border`），间距改为组内 4–8px / 组间 16px。
- **归族**: local → R2-4 批（单组件根因；layout 包 collapse 一个文件收敛）
- **复核状态**: 未复核

## 4. 既有族确认（不另立）

- **dark 菜单亮底（宿主 `--popover` 已知族）**: `w3ab-dropdown-open-dark.png` 菜单 bg=`rgb(251,250,249)`，随族修复。
- **R2-1d-C2-01（ndbg 悬浮球）**: 本页同构复现。
- **hover 可供性缺失模式**: 本页未新增（触发器/选项 hover 均有反馈）。

## 5. watch-only（不立项）

- **grid demo 单元格不可见**：cell-1/cell-2/wide-cell/cell-3 无边框无底色（layout 渲染器 marker-only 透明契约使然），colSpan 结构仅靠文字位置可辨；建议 demo schema 给单元格加 `bg-muted/40 rounded` 类增强演示可读性（demo 质量非渲染器缺陷）。
- **button-group single 模式允许全部取消**（再点已选项→`aria-pressed` 全 false）：radio 语义组通常强制保留一项；行为语义边界，产品化时确认意图。
- collapse 展开 chevron 旋转由 `data-state` CSS 驱动（computed transform 为 none 因走 `rotate` 独立属性），视觉正确不判缺陷。

## 6. 误报排除记录

| 疑点                                | 排除理由                                                                                                                                                                                                                                |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 「dropdown 菜单打不开」             | 首轮探针误点渲染器根 div（非 trigger），base-ui outside-press 语义立即关闭；改点 `[data-slot="dropdown-button-trigger"]` 后开合/选值/关闭全链路正常（`aria-expanded` false→true、menuitem×3、Set Flag→report 翻转）。探针缺陷非产品缺陷 |
| gapScan 初版全空                    | `display:contents` 包装层 rect 为 0×0 被过滤导致递归中断——探针缺陷（已修 w-lib.mjs：递归与配对解耦），修正后 16/12px 序列如实产出                                                                                                       |
| dark 交互截图中 button-group 无选中 | 前一步探针主动再次点击解除了选中（single 模式 toggle-off），非 dark 渲染缺陷                                                                                                                                                            |
