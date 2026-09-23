# [card] control:input-month

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/input-month` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：single value (bounded + clearable) / range (selectionMode=range) / Period family composite submit (range mode)）
- **矩阵裁剪**: simplified（matrixReason：原生 `input[type=month]` 控件，无自绘弹层（native picker 为浏览器外部弹窗，DOM 不可探、截图不可得——已按 [visual-only] 限制登记）；值态/清除/越界/range 正反序/复合提交已覆盖；裁掉：glass 皮肤、disabled/readonly（fixture 未提供））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前）。

## 1. 截图清单

| 状态                                                             | light                                                                                      | dark（真 data-mode）                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 值态（June 2024 + inline 清除 ×，1280 场景截图）                 | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-default-light.png`        | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-default-dark.png`        |
| 空值态（清除后）                                                 | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-empty-light.png`          | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-empty-dark.png`          |
| 越界输入（fill 2023-05 → 被改写 2024-01）                        | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-outofbounds-light.png`    | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-outofbounds-dark.png`    |
| range 态（双 month 输入 2024-01→06）                             | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-range-light.png`          | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-range-dark.png`          |
| range 反序写入后（2024-09/2024-02 → 归一 02→06）                 | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-range-reversed-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-range-reversed-dark.png` |
| native picker 点击后（[visual-only]：Chromium 外部弹窗不入截图） | `input-month-native-picker-light.png`（输入聚焦态）                                        | `input-month-native-picker-dark.png`（同）                                                |

## 2. A–H 维度勾选表

- A 交互：A1 n/a A2 pass（focus `:focus-visible` 命中，`outline: none` + ring box-shadow，testid `period-input-month`）A3 pass（input 168×32、清除钮 24×24）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 n/a（native picker 为浏览器弹窗，Esc 关闭不可程序化）A9 **warn(R2-2a-A9-47)**（越界输入被静默改写无反馈）
- B 颜色：B1 pass（值文字 light rgb(33,53,71) 12.61:1；dark rgb(230,236,243) 对深底约 13:1）B2 pass B3 n/a B4 pass B5 **warn（族实例，见已知族节）**：`.nop-theme-root` 钉死 `color-scheme: light`（w3f bgDebug 实测），dark 下原生控件的 UA 部件（日历图标/下拉行为）按 light 渲染；输入本体样式经令牌覆盖后平价 B6 n/a
- C 布局：C1 pass（1280/800 `docOverX: 0`；range 双输入 800 宽不折行错乱）C2–C6 pass/n-a
- D 间隔：D1/D5 pass（range 两输入 gap 6px 紧凑合理、与 label 节奏一致）其余 n/a/pass
- E 排布：E1–E2 pass（range 分隔符紧随、清除钮右置）E3–E6 n/a/pass
- F 一致性：F1 pass（与 date 族清除钮/聚焦环同构）F4 pass（值显示 "June 2024" 随浏览器 locale，英文宿主显示英文——正例）F5 n/a
- G/H：n/a

## 3. 发现条目

### [R2-2a-A9-47] 越界月份被静默改写到下界（2023-05 → 2024-01），无任何错误/提示反馈；且 min/max 未落到原生属性，UA 校验不参与

- **页面/路由**: `#/lab/input-month`（场景 1 single value (bounded + clearable)，schema `minDate: '2024-01', maxDate: '2024-12'`）
- **主题/视口/状态**: 双主题 / 1280 / 键盘输入越界值后
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/input-month/input-month-outofbounds-light.png`（输入显示 "January 2024"，scope `"month": "2024-01"`，无任何错误标记）
- **目视描述**: 手动键入 2023-05 回车后，值无声变成 2024-01——用户若未逐字核对不会发现输入被替换；界面上没有"超出可选范围"类提示、没有红边、没有 tooltip。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w3d-complete-results.json` input-month.outOfBounds / contract 段
  - 输出: fill `'2023-05'` 后 `value: "2024-01"`, `valid: true`, `ariaInvalid: null`, `borderColor` 为焦点蓝；同时 `input.min === "" && input.max === ""`（minDate/maxDate 仅用于 JS 钳制，未映射到原生 min/max 属性，`checkValidity()` 恒 true）
- **对照基准**: 检查提示词 A9（交互后反馈可见，非静默更新）；WCAG 3.3.3（错误建议）；fixture 自述 "minDate/maxDate clamp the selectable window"（钳制为设计行为，但**无反馈的改写**超出设计声明）
- **严重程度**: P3（钳制本身是文档化行为；风险在于静默改写 + 原生校验通道缺席）
- **用户影响**: 键盘用户输入 2023-05 提交得到 2024-01 的数据，偏差 11 个月且无感知入口。
- **修复方向**: `packages/flux-renderers-form/src/renderers/period-renderers.tsx`：① 越界钳制时给出即时反馈（toast 或字段下方 hint "已调整至可选范围"）；② 将 minDate/maxDate 同步映射到原生 `min`/`max` 属性，让 UA 校验与日历钳制双通道一致。
- **归族**: watch-only → 台账（钳制策略 + 属性映射，单点）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）。订正：与校验静默族不同根因——minDate/maxDate 被正常消费，缺口在钳制无反馈（period-renderers.tsx L125-129）+ 原生 min/max 属性未映射，属渲染器行为层

## 4. 已知族命中（引用，不另立项）

- `.nop-theme-root` 钉死 `color-scheme: light`（宿主已知问题）：dark 下从 input 到 `.nop-theme-root` 全链路 `colorScheme: "light"`，而 html/body 为 dark（`w3f-date4-results.json` bgDebug.month-dark 全链路输出）——原生月份控件的 UA 部件按 light 绘制；输入文字/底色经令牌覆盖后对比达标（~13:1），故仅 UA 层受影响。引用不立项；修复后需 B5 复检。
- range 反序归一（plan 锚点复检通过）：写入 start>end 后 UI 与 scope 均归一为 02→06（`rangeReversed.visibleInputs: ["2024-02","2024-06"]`），与 fixture "reversed ends normalize on write" 声明一致。
- 误报排除：w3-common 溢出探针报 `.nop-checkbox`/switch overX 为伪元素命中区几何（非布局溢出）；`docOverX: 0` 800 宽实际无横向滚动。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-input-month` → carded（卡列填本路径）；findings 归族后 → digested。
