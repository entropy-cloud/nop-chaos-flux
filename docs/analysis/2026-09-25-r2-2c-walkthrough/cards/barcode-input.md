# [card] control:barcode-input

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/barcode-input` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：C9 host-barcode-form——barcode-input 位于 form 内，required 校验 + submit echo probe）。注意：barcode demo **页面**已在 R2-1d 走查（`docs/analysis/2026-09-23-r2-1d-walkthrough/cards/barcode-input.md`，E2-01/E3-01 已裁定）；本卡为 **lab 载体控件面**首查，独立台账单元
- **矩阵裁剪**: simplified（matrixReason：任务口径的 simplified 地板已全做——light+dark（真 data-mode）、1280×800 + ~800 窄视口、默认/hover/focus/error、值态（空/填/非法码型）、扫码识别反馈态（无相机降级）；裁掉：disabled 态（lab fixture 单场景无 disabled 变体，disabled 通道由 `barcode-input-disabled-channels.test.tsx` 单测覆盖）、glass 皮肤（波次统一裁剪）、相机成功路径（headless 无摄像头，同 R2-1d 裁剪理由）
- **探针**: `_tmp/r2-2c-probes/w3-barcode.mjs`、`w3-barcode2.mjs`、`w3-barcode3.mjs` → `out-w3-barcode*.json`；像素采样 `_tmp/r2-2c-probes/w3-pixels.mjs`（barcode 段）→ `out-w3-pixels-barcode.json`

## 1. 截图清单

| 状态                                       | light                                                                                       | dark（真 data-mode）                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 默认 1280×800                              | `…/barcode-input/default-1280-light.png`                                                    | `…/barcode-input/default-1280-dark.png`（含已填值） |
| focus（input-group 边框转 primary + ring） | `…/barcode-input/focus-1280-light.png`                                                      | —                                                   |
| 扫码钮 hover                               | `…/barcode-input/scan-hover-1280-light.png`                                                 | —                                                   |
| 值态：已填                                 | `…/barcode-input/filled-1280-light.png`                                                     | `…/barcode-input/filled-1280-dark.png`              |
| 值态：非法码型 `abc!!!`（无任何校验反馈）  | `…/barcode-input/invalid-pattern-1280-light.png`                                            | —                                                   |
| error：required 空提交                     | `…/barcode-input/required-error-clean-1280-light.png`                                       | `…/barcode-input/required-error-1280-dark.png`      |
| 扫码点击后（无相机静默）                   | `…/barcode-input/scan-clicked-nocam-1280-light.png` / `scan-clicked-nocam-3500ms-light.png` | —                                                   |
| 默认 ~800 宽                               | `…/barcode-input/default-800-light.png`（含已填值）                                         | —                                                   |
| error ~800 宽                              | `…/barcode-input/required-error-800-light.png`                                              | —                                                   |
| lab 头部徽章 dark                          | —                                                                                           | `…/barcode-input/badge-dark-invisible-1280.png`     |

（`…` = `_tmp/visual-inspection-2026-09-25/r2-2c`）

## 2. A–H 维度勾选表

- A 交互：A1 pass（扫码钮 hover `bg rgb(241,245,249)` + cursor pointer 探针坐实） A2 pass（focus：group 边框转 `rgb(28,110,242)` + 3px oklab ring，`focusLight` 探针） A3 pass（smallTargets 扫描 light/dark 均 0 命中；扫码钮 24×24） A4 n/a（disabled 态 fixture 未提供，见矩阵裁剪） A5 **warn（扫码点击无相机静默无响应——R2-1d-E2-01 同根因 lab 实例，见 §4）** A6/A8 n/a（无拖拽） A7 n/a（无相机，取景弹层未触发） A9 **fail(R2-2c-A9-82：formError 态字段零联动)** + **fail(R2-2c-C2-81 布局侧，见下)**
- B 颜色：B1 **warn（家族引用：error 文本 12px 于 light ≈3.5:1 / dark ≈3.45:1（DOM 核心值；像素采样含抗锯齿 2.49/2.22），低于 4.5:1——dark 平价/对比度族 R2-4 实例，见 §4）** B2 pass（focus ring 3:1+） B3 pass（error 红 `rgb(239,67,67)`/dark `rgb(217,38,38)` 语义正确） B4 pass（computed 值均走语义令牌；bar 面无字面色新增） B5 **warn（dark 输入文本 13.02:1 优；error/头部徽章见家族引用）** B6 pass
- C 布局：C1 **warn（家族引用：`.nop-input-group` overX 4px——C1-61/C1-10 微溢出族 lab 实例，docOverX=0 被容器裁剪，见 §4）** C2 **fail(R2-2c-C2-81：校验错误文案内联渲染于字段行右端)** C3 pass C4 pass（800 宽 field 438px 不破版，`narrowOverflow` 仅同款 4px 微溢出） C5 pass C6 n/a
- D 间隔：D1–D8 pass（错误文案 mt-1 4px 栅格；表单字段间距走 FieldFrame 基线）
- E 排布：E1 pass E2 **warn（家族引用：schema label 不可见仅 aria-label="Barcode"——R2-1d-E3-01 同根因 lab 实例，见 §4）** E3 pass（Submit 单按钮位流动布局尾部） E4–E6 pass/n-a（scope-debug 面板为 lab 载体 chrome 不计入）
- F 一致性：F4 **warn（家族引用：错误文案「Barcode不能为空」= EN 字段名 + zh 模板拼接、扫码钮 aria「扫描条码」zh 于全 EN 宿主——R2-2a-F4-11 zh-CN 回退族实例，见 §4）** F1/F3 pass F5 n/a
- G 设计器：n/a
- H 弹层：n/a（取景弹层未触发，见矩阵裁剪；scope-debug 面板为 lab chrome）

## 3. 发现条目

### [R2-2c-C2-81] required 错误文案内联挤占字段行右端：`.nop-barcode-input` 根节点 flex-row 使错误 div 成为并排兄弟

- **页面/路由**: `#/lab/barcode-input`（C9 host-barcode-form 场景；一切触发 `displayError` 的路径同险：form required / 渲染器自身 validation）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 空值点击 Submit 后
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/barcode-input/required-error-clean-1280-light.png`、`required-error-1280-dark.png`
- **目视描述**: 提交空值后，红色「Barcode不能为空」不出现在字段下方，而是出现在输入框**右侧**（与扫码图标同排），被压成 85px 宽的两行竖条，输入框本体同时被挤短。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-barcode3.mjs`（errorRects）
  - 输出: `.nop-barcode-input` hostDisplay=`flex`、hostFlexDir=`row`；出现错误后 input-group 由 918px 缩至 **833px**，error div rect `{x:1134, y:271, w:85, h:32}`（right 1219 与 group right 1134 相接，bottom 同行）——错误与字段同行排布；源码 `barcode-input.tsx` 错误 div 带有 `mt-1`（为下方文档流的 4px 上边距设计，在行布局中失效），且 `.nop-form` form-body 亦为 flex。
- **对照基准**: 检查提示词 C2（无意外重叠/挤压）、D5（表单面 helper/error 文本间距成体系）；flux 表单面「错误显示在字段下方」惯例（对照 R2-2a dialog/form 各卡 field-control 基线）
- **严重程度**: P2（required 校验为表单高频路径；错误信息被压成 85px 两行竖条、可读性骤降，且字段宽度被动抖动）
- **用户影响**: 用户提交被拦后，错误信息以极窄竖排呈现，扫读成本高；长字段名时换行更碎。
- **修复方向**: `flux-renderers-scheduling/src/barcode-input/barcode-input.tsx` 根容器改 `flex-col`（或将错误 div 包进全宽行容器），使 `[data-slot="barcode-validation-error"]` 恢复字段下方文档流；补一条「错误态错误文案位于字段下方」的渲染测试。
- **归族**: local → R2-4 批（barcode-input 渲染器单点根因，一处 flex 方向修复收全状态）
- **复核状态**: 已复核（保留 P2，review-a 2026-09-25）

### [R2-2c-A9-82] formError 态字段零联动：错误文本可见但边框不变、无 aria-invalid/aria-describedby

- **页面/路由**: `#/lab/barcode-input`（C9 host-barcode-form；一切由 form 层 required 校验产生 `formError` 的路径）
- **主题/视口/状态**: light / 1280 / 空值点击 Submit 后
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/barcode-input/required-error-clean-1280-light.png`（输入框边框仍为中性灰，仅下方/右侧行内有红字）
- **目视描述**: 校验失败后错误红字出现，但输入框边框保持 `rgb(225,231,239)` 默认色（focus 时会变蓝——错误态反而无任何视觉差），字段本体看起来「没有错」。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w3-barcode2.mjs`（emptySubmitLight）
  - 输出: `errText: "Barcode不能为空"`, `errColor: rgb(239,67,67)`, `groupBorder: rgb(225,231,239)`（= 默认色）, `ariaDescribedby: null`；源码 `barcode-input.tsx` L309 `aria-describedby={validationError ? errorId : undefined}` 仅覆盖渲染器自身 validationError，formError 路径不落 aria；input 亦无 `aria-invalid`。
- **对照基准**: WCAG 3.3.1/3.3.2（错误识别与标注）；检查提示词 A9（交互后反馈可见）、A2（状态可感知）
- **严重程度**: P3（错误文本本身可见、提交确实被拦；缺的是字段级视觉/读屏联动，影响感知速度与读屏用户定位）
- **用户影响**: 读屏用户无法通过 aria 关联得知该字段出错；视觉用户需自行发现右侧竖排红字与字段的从属关系。
- **修复方向**: `barcode-input.tsx` 将 `displayError`（= `validationError ?? formError?.message`）统一接入：`aria-invalid={!!displayError}`、`aria-describedby={displayError ? errorId : undefined}`，并给 InputGroup 加 error 态边框类（如 `border-destructive`），与 focus 态边框变更对称。
- **归族**: local → R2-4 批（与「校验呈现三不一致族」（R2-4 第二位）外围形态相邻，但根因为本控件 aria/边框未接 displayError，单点可修）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **R2-1d-E2-01（扫码点击无相机静默无响应，P2，local→R2-4）— lab 实例：维持**。新证据：`w3-barcode2.mjs scanClickNoCamLong`——点击扫码钮 3.5s 后 `overlay:false / scannerError:null / scanBtnStillVisible:true`（与 demo 页不同的是 lab 内按钮未消失，`cameraAvailable` 恒为 null，静默程度更深）；截图 `scan-clicked-nocam-3500ms-light.png`。
- **R2-1d-E3-01（schema label 不可见仅 aria，P2，local→R2-4）— lab 实例：维持**。`visibleLabel:null`、`aria:"Barcode"`。
- **R2-2a-F4-11 / zh-CN 回退族（watch）— 两处可见新实例**：错误文案 `Barcode不能为空`（EN 字段名插值 + zh 模板）、扫码钮 aria-label「扫描条码」；全 EN 宿主页面可见中文 chrome。
- **dark 平价/对比度族（R2-4）— 新实例证据**：error 文本 12px 于 light `rgb(239,67,67)` ≈3.5:1、dark `rgb(217,38,38)` ≈3.45:1（DOM 核心值对实际底色；像素采样 `w3-pixels.mjs` 2.49/2.22），双主题均低于 4.5:1——destructive 小字对比度族实例。
- **R2-2a-B5-01（badge `--secondary-foreground` dark 不翻转，P1 族）— lab 头部徽章新实例**：`w3-barcode3.mjs badgeDark`——dark 下徽章文字 `rgb(178,206,251)` 落在 `rgb(203,186,252)` 底上（≈1.2:1，近不可见）；截图 `badge-dark-invisible-1280.png`。根因 = playground `:root` 语义令牌（`--secondary-foreground: 25 20% 35%` 等）在 `[data-mode='dark'] .nop-theme-root` 块中无翻转（`apps/playground/src/styles.css` L80 vs L190+），本批 gantt/kanban 卡同根因集中引用。
- **R2-2a-C1-61/C1-10（input-group 尾缀微溢出 4–5px 族，watch）— lab 实例：维持**。`overflowLight.hits`：`.nop-input-group` overX 4（light 1280 与 800 同值，docOverX=0）。
- **R2-2a-A9-45（form debug 面板 `$form.valid:true` 与可见错误矛盾，watch）— lab 实例：维持**。required-error 截图中 Scope 面板同屏显示 `"hasErrors": false, "errorCount": 0, "valid": true`。
- 误报排除：①非法码型 `abc!!!` 手输可提交且无反馈——fixture 未配置 codeType/pattern，渲染器契约即「无 pattern 配置不校验格式」（required 拦截空值正常），记 watch 观察不入发现；②dark DOM 对比度探针 bgComposited 回落白色（`:root` 渐变底无 backgroundColor）——已按方法学改用 PNG 像素采样，DOM 值仅作核心色取值；③无 disabled 态 = fixture 单场景限制，非渲染器缺陷（单测覆盖 disabled 通道）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `barcode-input`（control/R2-2c）→ carded（card 列填本路径）；C2-81/A9-82 归族 R2-4 后 → digested。
