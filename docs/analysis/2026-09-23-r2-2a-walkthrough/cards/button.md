# [card] control:button

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/button` ｜ **载体**: lab 页（MultiScenarioLabPage，4 场景：全变体 / 尺寸 / 计数器 / 倒计时）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件——button 单交互点控件，无弹层→H 全 n/a、无拖拽→A6/A8 n/a、无异步数据→A5 loading 子项仅经 loading prop 抽查 n/a；裁掉的状态：glass 皮肤、anchor 分支（href 渲染为 `<a>` 的变体本页 fixture 未覆盖）、tooltip 态）
- **runner dark 列作废声明**：同 badge 卡——runner dark 实为 light 渲染（R2-2a-B5-34）。本卡 dark 证据以自采 `r2-2a/button/` 下显式 data-mode 截图 + computed style 为准。

## 1. 截图清单

| 状态                     | light                                                                            | dark（真 data-mode，自采）                                              |
| ------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 默认 1280×800            | `_tmp/visual-inspection-2026-09-23/lab-button-default-1280x800-light.png`        | `_tmp/visual-inspection-2026-09-23/r2-2a/button/variants-dark-1280.png` |
| 默认 800×900             | `_tmp/visual-inspection-2026-09-23/lab-button-default-800x900-light.png`         | `_tmp/visual-inspection-2026-09-23/r2-2a/button/variants-dark-800.png`  |
| hover（Default 按钮）    | `_tmp/visual-inspection-2026-09-23/r2-2a/button/hover-default-light-1280.png`    | —（hover 缺失与主题无关）                                               |
| focus（Default 按钮）    | `_tmp/visual-inspection-2026-09-23/r2-2a/button/focus-default-light-1280.png`    | —                                                                       |
| disabled                 | `_tmp/visual-inspection-2026-09-23/r2-2a/button/disabled-light-1280.png`         | —                                                                       |
| 值态（计数器 Clicks: 2） | `_tmp/visual-inspection-2026-09-23/r2-2a/button/counter-after2-light-1280.png`   | —                                                                       |
| 倒计时进行中（10s/8s）   | `_tmp/visual-inspection-2026-09-23/r2-2a/button/countdown-active-light-1280.png` | —                                                                       |
| 800 宽溢出特写           | `_tmp/visual-inspection-2026-09-23/r2-2a/button/variants-800-overflow-light.png` | —                                                                       |

## 2. A–H 维度勾选表

- A 交互：A1 **fail(R2-2a-A1-03)**（default variant `<button>` hover 零反馈）A2 pass（focus-visible ring 存在：boxShadow oklab ring，非 none）A3 pass（可交互元素 min(w,h) 扫描零命中，`smallTargets: []`）A4 pass（disabled 属性 + opacity 0.5 + pointer-events none，truly disabled）A5 pass（loading 走 Spinner 换位，源码 L182-186）A6 n/a A7 n/a A8 n/a A9 pass（计数器 Clicks: 2、倒计时 10s→8s 递减且禁用，`out-countdown.json`）
- B 颜色：B1 **fail(R2-2a-B1-05)**（destructive light 3.78:1）B2 pass（focus ring ≥3:1）B3 pass（destructive 红语义、default 主色一致）B4 pass（色值走 `--primary/--destructive/--secondary` 令牌链）B5 **fail(R2-2a-B5-04)**（dark secondary 1.1:1 不可读；default dark 3.26:1 为已知族引用）B6 pass
- C 布局：C1 **fail(R2-2a-C1-06)**（800 宽 variants 行溢出 35px）C2 pass C3 pass C4 warn(同 C1 条目) C5 n/a C6 n/a
- D 间隔：D1–D8 n/a/pass（按钮间距由 schema gap 驱动，2/3px 值归 flex 卡 D1 族，控件无责）
- E 排布：E1 pass E2 pass（variant 视觉权重梯度 default>secondary>outline>ghost 成立）E3–E6 n/a/pass
- F 一致性：F1–F5 n/a（variant 语义一致性归 ui 层门禁）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-A1-03] default variant 主按钮 hover 零反馈：`<button>` 分支无 hover 规则（仅 `[a]:hover`）

- **页面/路由**: `#/lab/button` 及产品面一切 default variant 按钮（最高频控件）
- **主题/视口/状态**: 双主题均同 / 1280 / hover
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/button/hover-default-light-1280.png`
- **目视描述**: 鼠标悬停 Default/Increment/Send Code 等主按钮，按钮底色、阴影、文字完全无变化，无任何可供性反馈。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-badge-button.mjs` hoverFocus 段（hover 前后 getComputedStyle diff）
  - 输出: `before.bg rgb(28,110,242) → afterHover.bg rgb(28,110,242)`，shadow `none → none`，`hoverChanged: false`。根因：`packages/ui/src/components/ui/button.tsx` L17/L22 default variant 类串只有 `[a]:hover:bg-primary/80`（锚点分支限定），`<button>` 元素无任何 `hover:` 规则；`nop-haptic`（`packages/ui/src/styles/mobile.css` L110-116）仅覆盖 `:active` 按压。对照：outline/ghost/secondary/destructive variant 均有 `hover:bg-*` 规则，唯独 default 与 info/success/warning/danger level 档缺失。
- **对照基准**: 检查提示词 A1（hover 态存在且可感知）+ 严重度表 P1 示例"主按钮 hover 无反馈"原文命中
- **严重程度**: P1
- **用户影响**: 主操作按钮悬停无反馈，用户失去"可点"可供性线索；与同组次按钮（outline/ghost 有 hover）行为不一致。
- **修复方向**: `packages/ui/src/components/ui/button.tsx` L17/L22 default variant 类串补 `hover:bg-primary/90`（`<button>` 与 `[a]:hover` 双通道，与 shadcn 惯例一致）；info/success/warning/danger level 档同步补 `hover:bg-*/90`。
- **归族**: systemic → R2-3 批（ui Button 单点根因，产品面全部 default 按钮收一修复）
- **复核状态**: 已复核（保留 P1，review-a 2026-09-24）

### [R2-2a-B5-04] dark 下 secondary 按钮不可读（1.1:1）——`--secondary-foreground` 未翻转的 token 根因第二实例；default dark 3.26:1 为已知族引用

- **页面/路由**: `#/lab/button`（场景 1 Secondary 按钮；产品面一切 `variant: secondary` 按钮）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/button/variants-dark-1280.png`
- **目视描述**: dark 下 Secondary 按钮为亮紫底配亮蓝字，文字几乎不可见；Default 按钮白字压亮蓝底，偏刺眼。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-badge-button.mjs`（双主题 computed color + WCAG 合成对比度）
  - 输出: dark Secondary `color rgb(178,206,251)` on `bg rgb(203,186,252)` → ratio **1.1**；dark Default 白字 on `rgb(77,141,245)` → **3.26**（命中已知族 #2 "--primary dark 3.26:1 过亮"，引用不另立）；light Secondary 3.05 亦 <4.5（同 token 对，light 侧归入对比度族复检面）。
- **对照基准**: dark 平价已知族（R2-4）+ 对比度已知族（R2-4）；本卡实例根因与 R2-2a-B5-01 同一 token 对
- **严重程度**: P1（secondary 按钮文字不可读）
- **用户影响**: dark 主题下 Secondary 按钮标签不可读；按钮高频度仅次于 default。
- **修复方向**: 同 R2-2a-B5-01——`packages/theme-tokens/src/styles.css` classic/glass dark 块翻转 `--secondary-foreground`；修复后本条与 badge 卡条目一并复检。
- **归族**: systemic/local → dark 平价族（R2-4 引用，根因条目 = R2-2a-B5-01）+ 本卡实例
- **复核状态**: 已复核（保留 P1，review-a 2026-09-24）

### [R2-2a-B1-05] light destructive 按钮白字对比度 3.78:1（<4.5）

- **页面/路由**: `#/lab/button`（场景 1 Destructive 按钮；产品面删除类主操作同源）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/lab-button-default-1280x800-light.png`
- **目视描述**: Destructive 按钮白字压在偏亮的红底上，对比偏弱。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-badge-button.mjs`
  - 输出: light Destructive `color rgb(255,255,255)` on `oklab(0.6356 0.1881 0.0892)`（bg-destructive 实底）→ ratio **3.78** < 4.5（14px font-medium 非大字）。
- **对照基准**: WCAG 1.4.3；对比度已知族（R2-4）
- **严重程度**: P2（删除是低频但高后果操作，按钮文字对比不达标）
- **用户影响**: 低视力用户在删除确认等场景读按钮标签吃力。
- **修复方向**: `packages/theme-tokens/src/styles.css` classic light 块加深 `--destructive` 实底亮度（目标白字 ≥4.5:1，约 L≤55% 档），或 destructive variant 改用 `bg-destructive` 深档 + 保留 `text-white`。
- **归族**: systemic → 对比度族（R2-4 引用）+ 本卡实例
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）。订正："Destructive" 实为 bg-destructive/10 text-destructive 红字 on 浅红 tint = 3.12:1（原卡"白字压红实底 3.78"系 fg/bg 对调、比值巧合相等）；根因归一 --destructive（0 84% 60%）过亮

### [R2-2a-C1-06] 800 窄视口下按钮 variants 行横向溢出 35px（fixture 未设 wrap）

- **页面/路由**: `#/lab/button`（场景 1 六按钮行；一切照抄此 fixture 的横排按钮组同险）
- **主题/视口/状态**: light / 800×900 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/button/variants-800-overflow-light.png`
- **目视描述**: 窄视口下六个按钮的行被右缘裁切，Destructive/Disabled 按钮部分不可见。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-structural.mjs` buttonOverflow800 段（scrollWidth−clientWidth 扫描）
  - 输出: `[{ stage: 'scenario-stage-all-button-variants', over: 35, cls: 'nop-flex flex-row' }]`；`nop-page` overX 19。根因：fixture `button-lab-page.tsx` variantShowcase 的 flex row 未设 `wrap: true`，6 按钮 ≥473px > 438px 可用宽。
- **对照基准**: 窄视口已知族候选（R2-3c 候选 #5"800 宽不折行/横溢"）；检查提示词 C1/C4
- **严重程度**: P3（fixture 参数层，控件 flex 本身支持 wrap）
- **用户影响**: 照抄 lab 示例的作者会复制出窄视口溢出的按钮行；lab 页自身在窄屏被裁切。
- **修复方向**: `apps/playground/src/component-lab/renderers/button-lab-page.tsx` variantShowcase 的 flex 加 `wrap: true`（其余场景行同理排查）。
- **归族**: watch-only → 台账（窄视口族候选实例；schema 参数层，控件无责）
- **复核状态**: 未复核

## 4. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-button` → carded（卡列填本路径）；findings 归族后 → digested。
