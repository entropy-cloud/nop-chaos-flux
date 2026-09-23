# [card] control:form

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/form` ｜ **载体**: lab 页（MultiScenarioLabPage，6 场景：Basic form with select field / Form with visible submit success state / Hidden required field skips validation until shown / Form with ajax submit and includeScope / Submit publishes form values to parent scope (valuesPath) / Hidden field with clearValueWhenHidden policy）
- **矩阵裁剪**: simplified（matrixReason：form 为容器控件，字段级控件各有专卡；本卡聚焦表单面整体——D5 间距、校验错误呈现、A2 focus、A9 提交反馈、B5 dark 平价；裁掉：glass 皮肤、ajax/includeScope 链路（非渲染面）、动态显隐字段矩阵（场景 3 逻辑面））
- **dark 证据**: dark 截图为本波自采真 data-mode（R2-2a-B5-34 同前）。

## 1. 截图清单

| 状态                                     | light                                                                 | dark（真 data-mode）                                                 |
| ---------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 必填错误态（空提交，场景截图）           | `_tmp/visual-inspection-2026-09-23/r2-2a/form/form-error-light.png`   | `_tmp/visual-inspection-2026-09-23/r2-2a/form/form-error-dark.png`   |
| 提交成功态（Success! 文案 + scope 回显） | `_tmp/visual-inspection-2026-09-23/r2-2a/form/form-success-light.png` | `_tmp/visual-inspection-2026-09-23/r2-2a/form/form-success-dark.png` |
| input focus-visible（整页，蓝环）        | `_tmp/visual-inspection-2026-09-23/r2-2a/form/form-input-focus.png`   | —                                                                    |
| 窄视口 800×900 默认                      | `_tmp/visual-inspection-2026-09-23/r2-2a/form/form-800-light.png`     | —                                                                    |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（表单面无行级 hover 语义）A2 pass（input focus `:focus-visible` 命中，蓝色 ring，`w:918 h:32`，无遮挡）A3 pass（input 32 高、Submit 主按钮 ≥32）A4 n/a A5 n/a A6/A8 n/a A7 n/a A9 pass（空提交出现 `[role="alert"]` 错误文案 + 输入红边；成功提交后 "Success! Submitted username: Ada" 即时呈现）
- B 颜色：B1 pass（错误文案 light **5.35:1**（rgb(181,59,44) 对像素采样底 rgb(252,244,244)）、dark **7.04:1**（rgb(239,138,124) 对 rgb(20,28,36)）——像素采样法，DOM 合成走查在本 playground 不可用，见误报排除）B2 pass（错误态 input 边框 `rgb(239,67,67)` light 对比充足；dark 边框为 50% 透明红 oklab(a=0.5)，视觉可辨）B3 pass（错误红语义一致）B4 pass B5 pass（dark 复检：错误文案/边框/label/输入全部平价）B6 pass
- C 布局：C1 pass（1280/800 `docOverX: 0`；探针报 1×1 sr-only input 溢出为有意隐藏，白名单）C2–C5 pass/n-a C6 n/a
- D 间隔：D1 pass（字段间隙 16/16）**D5 pass**（label→control 8px、control→error 紧随、字段组 16px，全部落 4/8 栅格，双主题一致）D2–D4/D6–D8 n/a/pass
- E 排布：E1 pass（label 顶对齐统一、错误文案紧随其控件）E2 pass（Submit 主位 primary）E3–E6 n/a/pass
- F 一致性：F1–F3 n/a/pass F4 **族命中**（错误文案 zh-CN，见已知族节）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A9-45] 字段错误展示期间 scope-debug 面板 `$form` 聚合态仍报 `valid: true / hasErrors: false / errorCount: 0`，与可见错误互相矛盾

- **页面/路由**: `#/lab/form`（场景 1 空提交后；`#/lab/input-email` 场景 2 同现象）
- **主题/视口/状态**: 双主题 / 1280 / 必填错误态已呈现
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/form/form-error-light.png`（Username 红边红环 + "Username不能为空"，同屏 JSON `"hasErrors": false, "errorCount": 0, "valid": true`）
- **目视描述**: 表单面明确显示一个校验错误，而下方调试 JSON 声称表单 valid、零错误——同屏自相矛盾，误导调试者。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w3c-main-results.json` form.invalidInput（`aria-invalid: "true"`, `describedBy: "username-error"`）与同 JSON 的 `$form.hasErrors/errorCount/valid` 字段对照
  - 输出: 错误文案 DOM 存在（`[data-slot="field-error"]`, `role="alert"`, `id="username-error"`）的同时 `$form: { hasErrors: false, errorCount: 0, valid: true }`（截图 500ms 后仍如此，非瞬态）
- **对照基准**: 检查提示词 A9（反馈一致性）；scope-debug 面板作为调试真相源不应与渲染面冲突
- **严重程度**: P3（debug 面板为 lab fixture chrome，不入产品路径；但会误导基于 lab 的调试与验收）
- **用户影响**: lab 页使用者/验收 agent 看到 valid:true 可能误判校验未生效。
- **修复方向**: `apps/playground/src/component-lab/scope-debug.ts` 的 `$form` 投影补充 errors 聚合（从 form store 的字段错误表读取），或在该面板标注"聚合态不含 submit 时校验"。
- **归族**: watch-only → 台账（fixture chrome 单点；如后续 lab 页用作验收真相源需升级）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- i18n zh-CN 回退（R2-2a-F4-11 族）：错误文案 `Username不能为空`（英文 label + 中文消息），input-email 卡同族（`Work Email必须是有效的邮箱地址`），引用不立项。
- 误报排除（方法级，本批通用）：w3-common/w3c-main 对 dark 错误文案对比报 2.44:1 系探针背景合成走查只叠加 `background-color`——本 playground dark 画布由 `body/html background-image` 渐变绘制、`background-color` 全透明（w3f bgDebug month-dark 链路证实），走查落在白底上。像素采样实测（w3f errorPixels）：dark 错误底 `rgb(20,28,36)`、真实比值 **7.04:1 达标**。凡本批 dark 对比度结论以像素采样为准。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-form` → carded（卡列填本路径）；findings 归族后 → digested。
