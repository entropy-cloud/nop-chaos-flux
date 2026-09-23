# [card] control:checkbox

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/checkbox` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：Required checkbox for terms acceptance / Multiple checkboxes with in-form live summary / Checkbox and switch Enter no-submit (P1-C fix proof)）
- **矩阵裁剪**: simplified（matrixReason：单布尔开关控件，无弹层无异步；裁掉的状态：glass 皮肤、disabled/readonly 变体（fixture 未提供）、第三场景 Enter-no-submit 键盘链路（e2e 已有覆盖，非渲染面））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前声明）。`checkbox-error-*` 为本波重拍（16:56 旧版为探针 selector bug 所致的"点了 checkbox 本体、错误从未触发"废片，已覆盖）。

## 1. 截图清单

| 状态                               | light                                                                         | dark（真 data-mode）                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 选中态 + 实时回显（1280 场景截图） | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox/checkbox-checked-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox/checkbox-checked-dark.png` |
| 必填错误态（提交后，场景截图）     | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox/checkbox-error-light.png`   | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox/checkbox-error-dark.png`   |
| focus-visible（整页，蓝环）        | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox/checkbox-focus.png`         | —                                                                            |
| 窄视口 800×900 默认                | `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox/checkbox-800-light.png`     | —                                                                            |

## 2. A–H 维度勾选表

- A 交互：A1 pass（label/hover 无专有态，checkbox 族不适用）A2 pass（`:focus-visible` 命中，3px 半透明 primary 环 + 1px outline，不被遮挡）A3 pass（视觉盒 16×16，`::after` 扩展出 40×32 命中区 ≥24，pseudo left/right −12 top/bottom −8）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 n/a A9 pass（点击后 `aria-checked` false→true，回显 `Email: ON | SMS: OFF` 实时更新）
- B 颜色：B1 pass（错误文案 light 实测 5.35:1（字色 rgb(181,59,44) 对像素采样底 rgb(252,244,244)）、dark 7.04:1（rgb(239,138,124) 对 rgb(20,28,36)），均 ≥4.5）B2 pass B3 pass（错误红/选中蓝语义正确）B4 pass（选中底 `rgb(28,110,242)` light / `rgb(77,141,245)` dark 溯源 `--primary`）B5 pass（dark 复检完成：错误文案、ring、选中态全部平价；dark 选中底偏亮导致白勾对比降档归 R2-4 已知族，见已知族节）B6 pass
- C 布局：C1 pass（1280/800 `docOverX: 0`；探针报 `.nop-checkbox` scrollWidth 26 vs client 14 为 `::after` 命中区几何溢出，不影响布局——误报排除）C2–C5 pass/n-a C6 n/a
- D 间隔：D1–D8 pass/n-a（checkbox→label→错误文案节奏与 form 族一致）
- E 排布：E1–E2 pass，E3–E6 n/a/pass
- F 一致性：F1 pass（与 checkbox-group 同构）F2–F3 n/a F4 **族命中**（错误文案 zh-CN，见已知族节，不另立项）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A9-41] checkbox 错误文案未通过 aria-describedby 关联到控件（text input 有、checkbox 无）

- **页面/路由**: `#/lab/checkbox`（场景 1 Required checkbox for terms acceptance，空提后）
- **主题/视口/状态**: 双主题 / 1280 / 必填错误态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/checkbox/checkbox-error-light.png`（红环 + "I accept the terms and conditions不能为空"）
- **目视描述**: 视觉错误呈现完整（checkbox 红边红环 + 下方红色文案），但读屏用户无法把文案与控件关联。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w3g-mini.mjs` checkboxSpan 段
  - 输出: 可见 `span[role=checkbox]` 错误后 `border: rgb(239,67,67)`、红色 ring、`aria-invalid="true"`、但 `aria-describedby: null`、`aria-required: null`；对照 form/input-email 的 text input 同场景 `describedBy: "username-error"`/`"workEmail-error"` 有完整关联
- **对照基准**: WCAG 3.3.1（错误识别需以文本呈现且可关联）；检查提示词 A9（反馈可见且可达）
- **严重程度**: P3（视觉通道完整，仅程序化关联缺失；a11y 用户受影响）
- **用户影响**: 读屏用户提交后听到"invalid"但得不到错误原因。
- **修复方向**: `packages/flux-renderers-form/src/renderers/input.tsx`（checkbox 分支）在 showReadonly/showError 时与 text input 同样挂 `aria-describedby={errorId}` 与 `aria-required`。
- **归族**: local → R2-4 批（单控件属性缺失）
- **复核状态**: 已复核（保留 P3，review-b 2026-09-24）。修复位精化

## 4. 已知族命中（引用，不另立项）

- i18n zh-CN 回退（R2-2a-F4-11 族）：错误文案 `I accept the terms and conditions不能为空`——英文 label + 中文校验消息（`packages/flux-i18n` 未初始化回退 zh-CN），引用不立项；修复后需本卡 F4 复检。
- `--primary` dark 过亮/对比度（R2-4）：dark 选中底 `rgb(77,141,245)` 上白勾对比约 3.2:1，同 B1-40 根因，引用不立项。
- 误报排除：dark 错误文案对比 2.44:1 系 w3-common 探针合成底色走查不含 background-image 渐变画布所致的**假阳性**——像素采样实测底色 rgb(20,28,36)，真实比值 7.04:1，达标。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-checkbox` → carded（卡列填本路径）；findings 归族后 → digested。
