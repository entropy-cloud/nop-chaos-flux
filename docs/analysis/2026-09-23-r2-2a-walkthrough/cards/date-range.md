# [card] control:date-range

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/date-range` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：rangeKind=date + shortcuts / rangeKind=time / rangeKind=datetime）
- **矩阵裁剪**: simplified（matrixReason：range 控件三 rangeKind 走查已覆盖控件全形态；裁掉的状态：glass 皮肤、disabled/readonly（fixture 未提供）、跨月范围选择的拖选链路（日历点选已覆盖核心态））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前声明）。弹层截图为等待 600ms 动画收敛后拍摄；弹层经 portal 挂 `DIV#isolate`，探针选择器已改为非作用域全局选择器（w3f/w3i 修正 w3d 的 scoped-selector 缺陷）。

## 1. 截图清单

| 状态                                 | light                                                                                      | dark（真 data-mode）                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 默认 1280×800（值态 2024-06-01→10）  | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-default-light.png`          | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-default-dark.png`          |
| 弹层开（date kind，选中区间 1→10）   | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-pop-open-light.png`         | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-pop-open-dark.png`         |
| 快捷项应用后（Last 7 days → 03→10）  | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-shortcut-applied-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-shortcut-applied-dark.png` |
| 空值态（inline 清除后，placeholder） | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-empty-light.png`            | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-empty-dark.png`            |
| 弹层开（time kind：双 time 输入）    | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-time-pop-light.png`         | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-time-pop-dark.png`         |
| 弹层开（datetime kind：日历+时分）   | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-datetime-pop-light.png`     | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-datetime-pop-dark.png`     |
| 800 宽弹层开                         | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-pop-800-light.png`          | `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-pop-800-dark.png`          |

## 2. A–H 维度勾选表

- A 交互：A1 pass（trigger button hover 态存在）A2 pass（弹层开焦点落 `[data-testid="range-popover"]` 容器，Esc 后回 trigger button，`focusAfter: BUTTON range-trigger`）A3 pass（快捷按钮 92/102×28 ≥24、footer 清除 24×24）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 pass（弹层有关闭 ×、Esc 关闭生效、焦点回 trigger）A9 pass（快捷项点击后 display 即时更新为 `2024-06-03 , 2024-06-10`，inline 清除后 display→null、清除钮随值消失）
- B 颜色：B1 pass（light 日格文字对白底 7.46:1）B2 pass B3 pass（选中端点 primary 蓝、区间淡蓝带）B4 pass B5 **warn（已知族实例，不另立项）**：dark 弹层面 `rgb(251,250,249)` 与 light 完全相同（`--popover` dark 亮底已知族），后果：邻月置灰日文字 rgb(175,189,207) 对该亮底 **1.83:1**（对 white 计 1.91），已进已知族节 B6 pass
- C 布局：C1 pass（1280 与 800 弹层 217×344/304 均在视口内，`docOverX: 0`）C2 pass（弹层遮住后续 debug 面板属正常 overlay）C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（弹层 padding 8px、日格栅格均匀）D2–D8 n/a/pass
- E 排布：E1–E2 pass（日历→快捷项→关闭钮动线顺；快捷项左置为设计位）E3–E6 n/a/pass
- F 一致性：F1–F3 n/a/pass F4 **warn(R2-2a-F4-43)**（显示分隔符空格异常）+ **族命中**（zh-CN 集群，见已知族节）F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（date 217×344 / datetime 232×348，同一档位）H2 n/a H3 pass（bottom 669/651 ≤ 800−8；800 视口 bottom 651 ≤ 892）H4 pass（关闭 × 独立右下、无重叠）H5 n/a（无 footer 按钮排）H6 pass（日历与时分输入对齐统一）H7 pass（padding 8px 单层）H8 n/a（内容不滚动）H9 pass（800 宽重开不溢出不破版）

## 3. 发现条目

### [R2-2a-F4-43] range 显示值分隔符渲染为空格包夹的逗号 `2024-06-01 , 2024-06-10`

- **页面/路由**: `#/lab/date-range`（全场景 trigger 显示值；快捷项应用后同样）
- **主题/视口/状态**: 双主题 / 1280 / 值态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/date-range/date-range-default-light.png`（trigger 文本 `2024-06-01 , 2024-06-10`）
- **目视描述**: 起止日期间的分隔符是"空格+逗号+空格"，逗号悬在两段日期中间，读起来像误排版（常规为 `~` 或 `、` 或紧凑 `,`）。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w3f-date4.mjs` date-range.contract（`display: "2024-06-01 , 2024-06-10"`）；`w3i-range-results.json` afterShortcut 同样
  - 输出: `[data-testid="range-display"]` textContent 逐字符含 `,`（空格-逗号-空格），双主题一致
- **对照基准**: 检查提示词 F4（文案一致性与排版细节）；AMIS range 显示惯例（`~` 分隔）
- **严重程度**: P3（不影响功能；高频可见的文案细节）
- **用户影响**: 每次选中范围都会看到松散的分隔符，观感不精致。
- **修复方向**: `packages/flux-renderers-form/src/renderers/date-range-renderer.ts` displayText join 分隔符改为 `~`（或 `,` 无空格），与 input-month range 的 `,` 紧凑格式对齐为一个口径。
- **归族**: watch-only → 台账（格式串单点）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- `--popover` dark 亮底（宿主已知问题，R2-4）：dark 弹层 computed bg `rgb(251,250,249)` 与 light 相同（w3f date-range dark `popOpen.info.bg`；w3i `popSettled.bg` 双主题一致）；后果实例：邻月置灰日 1.83:1（input-date 卡同族数）。修复后需本卡 B5/H 复检。
- i18n zh-CN 回退（R2-2a-F4-11 族）新实例集群：空值 placeholder **"选择范围"**（date-range-empty-light.png）、日历 caption **"2024年6月"**、星期行 **一~日**、datetime kind 可见标签 **"开始时间/结束时间"**、time 输入 aria **"范围开始时间/范围结束时间"**、datetime 输入 aria **"开始时间 时/分"**。全部引用不立项。
- 误报排除：w3f `date-range-pop-open-*` 首拍透明系弹层 opacity 渐入中截帧（600ms 后复拍全不透明），非渲染缺陷；w3d `shortcuts: []`/`clearBtn: null` 系 scoped selector 未探到 portal 内容的探针缺陷（w3i 修正后快捷项 92/102×28、footer 清除 24×24 均在），**schema shortcuts/clearable 未被忽略**。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-date-range` → carded（卡列填本路径）；findings 归族后 → digested。
