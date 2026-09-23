# [card] page:w2b-date-family

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/w2b-date-family` ｜ **载体**: 域页面（日期族 demo：input-date×2/input-datetime/input-time/date-range 挂载于 form，共享 react-day-picker 底层；带初始值与 date/datetime/time/range 四个回显文本）
- **矩阵裁剪**: simplified（理由：控件 demo 页 + 弹层 H 专项为波指定重点，弹层按 H1–H9 适用子集全查。裁掉：A6 拖拽（无）、G n/a、glass（波内统一裁剪）、A5 loading/empty（同步表单无异步）；弹层打开态 light+dark 全查（4 控件 × 双主题），H 深度走查替代通用 floor）

## 1. 截图清单（状态矩阵）

| 状态                              | light                                                                                            | dark                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 默认 1280×800                     | `_tmp/visual-inspection-2026-09-23/r2-1d/w2b-date-family/w2b-date-family-default-wide-light.png` | `…/w2b-date-family-default-wide-dark.png`                      |
| 默认 800×900                      | `…/w2b-date-family-default-narrow-light.png`                                                     | `…/w2b-date-family-default-narrow-dark.png`                    |
| 弹层：input-date（选值 18 后）    | `…/w2b-popover-date-light.png`                                                                   | `…/w2b-popover-date-dark.png`（清值后开=死月全灰，见 A7 发现） |
| 弹层：bounded date（禁用日验证）  | `…/w2b-popover-bounded-light.png`                                                                | （dark date 弹层同构取证）                                     |
| 弹层：datetime（时分输入）        | `…/w2b-popover-datetime-light.png`                                                               | —（同底层数据路径，light 已证）                                |
| 弹层：time                        | `…/w2b-popover-time-open-attempt.png`（native input 无弹层，见 watch）                           | 同构                                                           |
| 弹层：date-range（高亮带+快捷项） | `…/w2b-popover-range-light.png`                                                                  | `…/w2b-popover-range-dark.png`                                 |
| hover/focus/disabled 抽样         | 日格 40×40、输入框 focus ring 同族（程序化）；禁用日 disabled 属性+灰化                          | —                                                              |

## 2. A–H 维度勾选表

- A 交互：A1 ✔（日格 hover、快捷项 outline chip 可感知） A2 ✔（输入框 focus ring；弹层 Escape 关闭后焦点回落） A3 ✔（日格 ~40px、清除钮 24×24、时分输入 ~66×44 均达标） A4 ✔（禁用日 `disabled` + 灰化双通道） A5 n/a A6 n/a A7 **fail(R2-1d-A7-27)**（bounded 弹层死月：打开即全灰无引导） A8 n/a（点选为主路径无拖拽） A9 ✔（值回显闭环：选 18 → `date:2024-06-18`；清除 → `date:—`；快捷 "Last 7 days" → `range:2024-06-03,2024-06-10`，DOM 断言）
- B 颜色：B1 ✔（弹层内文字/星期表头对比正常） B2 ✔（选中日蓝圈、日期格边界 ≥3:1） B3 ✔（选中=primary、禁用=muted、today=描边，语义正确） B4 ✔（弹层走 `bg-popover` 等令牌；react-day-picker 变量驱动） B5 **warn（既有族）**（dark 下弹层亮底 `rgb(251,250,249)`——宿主 `--popover` dark 未换挡，已裁定族确认，不另立） B6 ✔
- C 布局：C1 ✔（wide/narrow 溢出扫描全空；表单 800 下收窄不破） C2 ✔（弹层翻转避让：datetime 弹层向下空间不足时向上打开，不压 footer） C3 ✔ C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1 ✔（label-输入 8px、字段间 12px、回显块 12px，落栅格） D2 ✔ D3 n/a D5 ✔（表单面 label/control/回显间距成体系） D6 n/a D7 ✔ D8 ✔
- E 排布：E1 ✔ E2 ✔ E3 ✔ E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1 **warn**（input-time 为原生 `type=time` 无弹层，其余 3 控件为弹层选择器——交互模式同族不一致，见 watch） F3 ✔ F4 **fail(R2-1d-F4-29)**（弹层日历中文 caption/星期/清除 aria vs 英文宿主，归 R2-1d-F4-01 族） F5 n/a
- G 设计器：n/a
- H 弹层：H1 ✔（4 弹层统一内容自适宽 228px，内容同档无 ad-hoc 宽度） H2 n/a H3 ✔（最高 324px，bottom ≤710 < 800，不顶出视口） H4 ✔（caption/导航钮对齐统一，无重叠） H5 n/a（无 footer 按钮组） H6 ✔（datetime 弹层内时分输入与日历间距 8px 成栅格） H7 ✔（弹层 body padding 统一 10px 系；无嵌套弹层双层 padding） H8 n/a（内容不滚动，日历完整呈现） H9 ✔（800 视口重开不溢出、翻转避让正常）

## 3. 发现条目

### [R2-1d-A7-27] bounded 日期弹层打开即「死月全灰」：默认月不夹逼进 [minDate,maxDate]

- **页面/路由**: `#/w2b-date-family`（`demo-input-date`，minDate 2024-01-01 / maxDate 2024-12-31；`demo-input-date-bounded` 同构）
- **主题/视口/状态**: dark / 1280×800 / 清空值后重开弹层（light 下无值首开同构）
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/w2b-date-family/w2b-popover-date-dark.png`（caption "2026年9月"、全月 35/37 日灰化、无一条可选）
- **目视描述**: 清除值后再开弹层，日历停在「今天」所在月（2026-09），整月日格全部禁用灰化，无任何「为何不可选」提示；用户需连点 ‹ 27 个月才能回到 2024 可选区。
- **程序化证据**:
  - 探针: 重开弹层后枚举日格 disabled 数 + caption（`_tmp/r2-1d-probes/w2b-probe.mjs` datePopDark）
  - 输出: `buttons=37, disabledBtns=35`（当月全部不可选）；对照组：有值时首开 caption=2024-06、`disabledBtns=0`——默认月跟随值而非夹逼到 [minDate,maxDate]。bounded 输入验证边界本身正确（可见月 2024-06 时 enabled 恰为 10–20 共 11 天）。
- **对照基准**: 检查提示词 A7（弹层打开态基本完整性）/A9（操作可达）；行业惯例（min/max 约束的 picker 初显月应 clamp 到最近可选月）。
- **严重程度**: P1（清值→重选是日期字段高频路径；当前默认配置下用户面对整月死格且无引导，任务被卡）
- **用户影响**: 所有带 min/max 的日期字段在「清空后再选」场景遭遇死胡同；表单里重新选择日期是常态操作。
- **修复方向**: `input-date` 渲染器向 react-day-picker 传 `defaultMonth`：无值时 clamp(today, minDate, maxDate)——`today < minDate` 则用 minDate 所在月，`today > maxDate` 则用 maxDate 所在月。
- **归族**: local → R2-4 批（单渲染器根因；date-range/datetime 共用底层时同修）
- **复核状态**: 未复核

### [R2-1d-F4-29] 日历弹层中文文案（6月/2024年6月/一~日/清除）vs 英文宿主

- **页面/路由**: `#/w2b-date-family`（全部弹层 + clearable 清除钮 aria）
- **主题/视口/状态**: light+dark / 1280×800 / 弹层打开
- **截图**: `…/w2b-popover-date-light.png`（caption "2024 ∨ 6月 ∨"、星期头「一 二 三 四 五 六 日」）、`…/w2b-popover-range-light.png`（"2024年6月"）
- **目视描述**: 英文 demo 页上日历月份「6月」「2024年6月」、星期「一~日」全中文；输入清除钮 aria-label「清除」（可见 label 为英文 "Date (utc + clearable…)"）。
- **程序化证据**:
  - 探针: 弹层 textContent 抓取（`_tmp/r2-1d-probes/w2b-probe.mjs` rangePop.texts、clearBtn aria）
  - 输出: `texts` 含 `2024年6月一二三四五六日`；clear 钮 `aria="清除"`；与 R2-1d-F4-01（i18n locale 未随宿主，波内复现）、R2-1d-F4-26（wizard 中文按钮）同根因。
- **对照基准**: 检查提示词 F4；locale 应随宿主 `lang`。
- **严重程度**: P3（可视文案混排；aria 层对读屏用户更重）
- **用户影响**: 英文语境用户读中文日历；读屏用户听到「清除」与可见语言不符。
- **修复方向**: flux-i18n locale 注入（宿主 lang → renderer 文案），date 底层 `Intl` locale 同步（caption/星期由 `locale` prop 驱动）。
- **归族**: systemic → R2-3 批（并入 R2-1d-F4-01 i18n 族）
- **复核状态**: 未复核

## 4. 既有族确认（不另立）

- **dark 弹层亮底（宿主 `--popover` 已知族）**: date/range 弹层 dark 下 bg=`rgb(251,250,249)` 亮底，类名走 `bg-popover` 令牌——即简报「dark 弹层亮底 = 宿主 --popover 已知」；弹层内文字对比正常（可读），随族修复不另立。
- **R2-1d-C2-01（ndbg 悬浮球）**: 本页同构复现。

## 5. watch-only（不立项）

- **input-time 无弹层**：为原生 `<input type="time">`（探针证实 `inputs=[{type:"time"}]`、无 popover 内容），右侧时钟图标是浏览器原生 picker 指示器。与同族 3 个弹层选择器交互模式不一致（F1 watch）；原生实现利于移动端属可辩设计，但 minTime/maxTime 仅在值层夹逼、picker UI 无约束提示，建议 demo/文档标注。
- **清值后输入框 placeholder 显示整段 label**（"Date (utc + clearable + DD/MM/YYYY display)"）：placeholder 回退到 label 文案，视觉冗长；建议 placeholder 默认改 displayFormat 提示（如 DD/MM/YYYY）。
- **range 显示分隔符**：输入框内 "2024-06-01 , 2024-06-10" 逗号带空格，值层无空格（"2024-06-01,2024-06-10"）——展示 delimiter 可读化处理，不判缺陷。
- range 弹层单月视图（无双月）：起止同月场景已覆盖，跨月依赖 ‹ › 导航；产品化时再评估。

## 6. 误报排除记录

| 疑点                                        | 排除理由                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 首次 range 弹层目视疑似「day 2 未入高亮带」 | 类名+背景探针证实 day2 `range-middle` 且 btnBg=带色 rgb(241,245,249)，高亮带完整覆盖 1–10；截图目视误差 |
| datetime 弹层「只有日历没有时间」           | 时分输入在弹层底部（"14 : 30" 两格），低层截图裁切导致漏看；`…/w2b-popover-datetime-light.png` 完整呈现 |
| 弹层 textContent 出现 "1926…1955" 年份串    | react-day-picker 年份下拉 select 的隐藏 options，非可视异常                                             |
| time 控件「点不开弹层」                     | 原生 input 设计使然（见 watch），非交互缺陷                                                             |
