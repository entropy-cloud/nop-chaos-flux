# [card] control:wizard

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/wizard` ｜ **载体**: lab 页（4 场景：basic linear 3 步 / host step validation + embedded form（C5.1）/ host async gate beforeEnter/beforeLeave / host wizard inside dialog（C5.1 bug 73 pattern））
- **矩阵裁剪**: **FULL**（流程型控件按 full 矩阵执行：步骤切换中间态 ✓（step-A-to-B-mid +80ms 截帧）、校验失败拦截态 ✓（空必填拦截 + 内联错误 + 步级摘要）、上一步/下一步按钮态 ✓（step1 prev disabled 0.5 / hover / focus）、指示器完成/当前/未来三态 ✓（nav marker 像素采样双主题）、弹层 ✓（wizard-in-dialog 开态+步进+Esc 关+dark+800 宽）；裁掉：glass 皮肤、commit/complete 后二次导航（fixture 完成态为终态）、hidden steps 变体（fixture 未布）、多字段"只报首错"排序复验（载体 fixture 仅 1 个必填字段，无法复现——现状注记见 §4））

## 1. 截图清单

| 状态                           | light                                                                                                                           | dark（真 data-mode，自采）                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 默认 1280×800（step A）        | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/default-1280-light.png`                                                         | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/default-1280-dark.png`                                                        |
| 默认 800×900                   | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/default-800-light.png`                                                          | —                                                                                                                             |
| 步骤切换中间态（A→B +60ms）    | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/step-A-to-B-mid-1280-light.png`                                                 | —                                                                                                                             |
| step B（A 完成/当前/未来三态） | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/step-B-1280-light.png`                                                          | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/nav-stepB-dark.png.png`                                                       |
| nav marker 采样帧（step B）    | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/nav-stepB-light.png.png`                                                        | —                                                                                                                             |
| 校验失败拦截态                 | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/validation-blocked-1280-light.png` / `validation-blocked-light-precise.png.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/validation-blocked-1280-dark.png` / `validation-blocked-dark-precise.png.png` |
| 填充后待步进                   | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/validation-filled-1280-light.png`                                               | —                                                                                                                             |
| step 2 Review（完成按钮）      | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/step2-review-1280-light.png`                                                    | —                                                                                                                             |
| 完成态                         | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/completed-1280-light.png`                                                       | —                                                                                                                             |
| async gate 拦截态              | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/gate-blocked-1280-light.png`                                                    | —                                                                                                                             |
| 弹层内 wizard 开态             | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/dialog-wizard-open-1280-light.png` / `dialog-wizard-step2-1280-light.png`       | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/dialog-wizard-open-1280-dark.png`                                             |
| 弹层内 wizard 800 宽           | `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/dialog-wizard-open-800-light.png`                                               | —                                                                                                                             |

## 2. A–H 维度勾选表

- A 交互：A1 **族命中**（下一步 primary hover 无反馈——R2-1a-A1-01 族，§4）A2 pass（prev/next 均有 ring 类组）A3 pass（按钮 80×28，`smallTargetScan` 零命中）A4 pass（step1 上一步 `disabled: true, opacity: 0.5`，推进后翻转）A5 n/a A6 n/a A7 pass（弹层 Esc 关闭 ✓、遮罩 ✓、焦点入弹层；wizard-in-dialog 步进后 nav `aria-current` 正确迁移到 "2Last"）A8 n/a A9 pass（完成链路 `wizard-done:yes`；gate 拦截 `left-a:yes` 上报；内联错误即时呈现）
- B 颜色：B1 **fail(R2-2b-B1-158)**（双主题互补性错误文字对比失败，见条目）B2 pass（拦截态输入框 destructive 边框可见）B3 warn（同一步内两处错误用两种红——并入 B1-158）B4 pass（色值均可溯源令牌）B5 **族命中**（弹层 dark 亮底 `rgb(251,250,249)`——宿主弹层 dark 已知族，§4）B6 pass（错误态走 destructive 非裸蓝）
- C 布局：C1 pass（三轮 `overflowScan` 唯一命中为 sr-only `wizard-status`（rectW 1px，有意隐藏白名单））C2 pass C3 pass C4 pass（800 宽 wizard 不破、弹层 560 居中 x120 不溢出）C5 pass C6 n/a
- D 间隔：D1 pass（nav→body→actions 块距节奏一致；按钮行 mt/pt 分隔）D2–D8 pass/n-a
- E 排布：E1 pass（三问可答：步骤指示+当前步名+导航）E2 **warn(R2-2b-E2-159)**（nav 现态强调弱于完成态，见条目）E3 pass（上一步左/下一步右主位、完成替换下一步、弹层 footer 上一步最左/下一步+关闭右侧——惯例正确）E4 pass（nav marker 等距）E5 pass E6 n/a
- F 一致性：F1 warn（wizard nav 指示器与 steps 渲染器指示器同语义异视觉语言，并入 E2-159 注记）F2–F5 n/a
- G 设计器：n/a
- H 弹层：H1 pass（弹层 560=`--overlay-size` base 档；800 视口同档居中）H2 n/a H3 pass（bottom 317 ≤ 792；800 视口 bottom 317 ≤ 892）H4 pass（关闭钮右上独立）H5 pass（弹层内 wizard footer `justify-content: flex-end`，按钮序 上一步x384 → 下一步x816 → 关闭x884，主次位正确——与 §4 actions 左对齐族实例形成同页对照）H6 n/a（弹层内 step1 无表单字段）H7 pass H8 n/a（弹层内容短）H9 pass

## 3. 发现条目

### [R2-2b-B1-158] 校验错误文字双主题互补性对比失败：字段内联错误 dark 2.44:1、步级摘要 light 3.78:1，且同一步两处错误用两种红

- **页面/路由**: `#/lab/wizard`（场景 2 host step validation；一切 wizard/form 校验错误呈现面同险）
- **主题/视口/状态**: dark + light / 1280 / 校验拦截态（空必填点下一步）
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/validation-blocked-1280-dark.png` / `validation-blocked-dark-precise.png.png`、`validation-blocked-1280-light.png` / `validation-blocked-light-precise.png.png`
- **目视描述**: dark 下字段下方红色错误行 "Customer name不能为空" 发灰偏淡、与深底发虚；light 下导航区下方 "步骤校验未通过" 红字偏浅。同一步内两处错误文字红色明显不同色。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w5-wizard-dark-err.mjs` / `w5-wizard-light-err.mjs`（DOM computed color + 逐层合成背景 WCAG 比值）
  - 输出: 字段内联错误 "Customer name不能为空"：light `rgb(181,59,44)` → 5.79:1（过）；dark `rgb(239,138,124)` → **2.44:1（败，<4.5）**。步级摘要 "步骤校验未通过"：light `rgb(239,67,67)` → **3.78:1（败，<4.5）**；dark `rgb(217,38,38)` → 4.93:1（过）。两处错误文字色值不同源（一处随主题翻转、一处恒用 base destructive）。
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）；检查提示词 B1/B5；dark 平价/对比度族（R2-4，含 review-a 订正实例 "dark destructive ≈2.8:1" 同根因）
- **严重程度**: P2（校验错误是拦截态唯一反馈通道，dark 字段错误接近不可读；light 步级摘要低于门槛；系统性令牌根因）
- **用户影响**: dark 主题用户提交被拦后可能看不清错在哪个字段；light 用户对步级摘要需费力辨认。
- **修复方向**: ①theme-tokens dark 块为 destructive 系文字令牌给出达标值（与 R2-4 dark 令牌包同批：`--destructive` dark 过亮/过淡二档统一）；②错误文字统一走同一语义令牌（如 `text-destructive` 的 dark-aware 值），禁止直接以 base destructive 作 dark/light 通用文字色；两处修复面一处收口。
- **归族**: systemic → R2-4 批（dark 平价/对比度族新增文字面实例 + destructive 令牌 dark 适配主战场；light 侧 3.78:1 为本卡新增独立证据）
- **复核状态**: 已复核（保留 P2，数据反转，review-b 2026-09-24）：dark 内联错误 7.49:1 过/摘要 3.78:1 败（原卡 2.44/4.93 系白底合成伪象）；两红不同源双主题坐实

### [R2-2b-E2-159] wizard nav 当前步强调弱于完成步：现态 marker 双主题亮度差仅 1.29（light）/1.76（dark），视觉权重倒挂

- **页面/路由**: `#/lab/wizard`（4 场景全部 nav 同根因）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / step B 当前态（A=完成、B=当前、C=未来）
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/wizard/step-B-1280-light.png`、`nav-stepB-light.png.png` / `nav-stepB-dark.png.png`
- **目视描述**: 完成步 A 的圆标带 primary 着色（浅蓝填充+✓），当前步 B 的圆标反而近乎白色（白/20 叠 muted 灰底），扫视时"走到哪一步"不如"走过哪些步"显眼；现态仅靠 muted 药丸底与标题前景色补偿。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w5-wizard-nav.mjs`（nav marker DOM class + PNG 像素采样 (x+3,y+3)）
  - 输出: light 完成态 marker 实拍 `rgb(206,220,242)` vs 现态 `rgb(244,247,250)` → **1.29:1**；dark 完成 `rgb(30,48,76)` vs 现态 `rgb(76,85,100)` → 1.76:1。现态 marker 类为 `bg-primary-foreground/20`、完成态为 `bg-primary/20`（`wizard-step-nav.tsx`）——着色强度分配与"当前步最强"惯例相反。
- **对照基准**: 检查提示词 E2（视觉层级与重要性一致）；Ant Design Steps 现态实心主色惯例；与 R2-1d-E2-30（steps 现态区分弱）同族异组件（不同修复面）
- **严重程度**: P3（aria-current 在位、位置序仍可读；层级观感问题）
- **用户影响**: 多步向导中用户需逐个数序号确认当前步，长向导（>4 步）走位感差。
- **修复方向**: `packages/flux-renderers-layout/src/wizard-step-nav.tsx` marker 类组：现态改 `bg-primary text-primary-foreground`（实心主色）或完成态降为 `bg-primary/15`，保证现态 ≥ 完成态的着色强度；顺带与 steps 渲染器指示器语言对齐（F1）。
- **归族**: local → R2-4 批（wizard nav 指示器类组单点重写；引用 E2-30 族为语义参照，非同根因）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- **primary 按钮 hover 无反馈（R2-1a-A1-01 族）**：下一步按钮 hover 前后 `backgroundColor: rgb(28,110,242)` 逐值相同（`w5-wizard2.mjs nextHover.changed: false`）——族新实例（lab 载体 wizard nav 按钮），随 button.tsx 一处修复收口，修复后本卡 A1 复检。
- **宿主弹层 dark 亮底（`--popover`/弹层 dark 族，R2-4 引用）**：wizard-in-dialog 弹层 dark `bg: rgb(251,250,249)` 整面亮底 + 文字 `rgb(103,87,76)` light 前景（`dialog-wizard-open-1280-dark.png` 实例证据）；与 dropdown-button 卡菜单实例同根因。
- **校验呈现三不一致族（R2-1a #6 族"只报首错"主实例）——重点复核现状**：lab 载体上的拦截态呈现为**双层结构健康**：字段内联错误（"Customer name不能为空"）+ 步级摘要（"步骤校验未通过"）同时呈现（`validation-blocked-1280-light.png`），未见"只报首错"的静默截断面；但载体 fixture 仅 1 个必填字段，多错误排序/聚合行为在载体上**不可复验**（裁剪注记），族终裁仍以 R2-1a form-wizard 页面证据为准，本卡不改变族裁定。
- async gate 拦截（beforeEnter/beforeLeave）行为正常：点击下一步仍留 step A、`left-a:yes` 上报——gate 无"拦截原因"可见反馈，但 fixture 设计即静默 gate，不立项（功能域）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-wizard` → carded（卡列填本路径）；findings 归族后 → digested。
