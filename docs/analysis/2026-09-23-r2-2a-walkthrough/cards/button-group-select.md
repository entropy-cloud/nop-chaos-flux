# [card] control:button-group-select

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/button-group-select` ｜ **载体**: lab 页（MultiScenarioLabPage，2 场景：Single-select button group / Multiple-select button group）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件——单/多选按钮组，无弹层无异步；裁掉的状态：glass 皮肤、disabled/readonly 变体（lab fixture 未提供 disabled/readonly 场景，动态注入超出渲染面走查范围）、schema 动态响应矩阵）
- **dark 证据**: 全部 dark 截图为本波自采，`document.documentElement.setAttribute('data-mode','dark')` 后等待 ≥250ms 拍摄（真 data-mode；runner emulateMedia 对本 playground 无效，见 R2-2a-B5-34）。

## 1. 截图清单

| 状态                             | light                                                                                           | dark（真 data-mode）                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 单选选中态（1280 场景截图）      | `_tmp/visual-inspection-2026-09-23/r2-2a/button-group-select/bgs-selected-light.png`            | `_tmp/visual-inspection-2026-09-23/r2-2a/button-group-select/bgs-selected-dark.png` |
| 多选多值态（1280 场景截图）      | `_tmp/visual-inspection-2026-09-23/r2-2a/button-group-select/bgs-multi-light.png`               | `_tmp/visual-inspection-2026-09-23/r2-2a/button-group-select/bgs-multi-dark.png`    |
| focus-visible（整页，Main 蓝环） | `_tmp/visual-inspection-2026-09-23/r2-2a/button-group-select/bgs-focus.png`                     | —                                                                                   |
| 窄视口 800×900 默认              | `_tmp/visual-inspection-2026-09-23/r2-2a/button-group-select/button-group-select-800-light.png` | —                                                                                   |

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover 背景 `rgb(255,255,255)`→`rgb(241,245,249)` light、translucent 0.3→0.5 dark，computed 前后 diff 均变化）A2 pass（Tab 后 `:focus-visible` 命中，蓝色 3px ring box-shadow，未被遮挡）A3 pass（item 91×32 ≥24）A4 n/a（fixture 无 disabled 场景）A5 n/a A6/A8 n/a A7 n/a（无弹层）A9 pass（点击后 `aria-pressed` 翻转 + scope JSON 即时回显 `site: "main"` / `roles: [admin, viewer]`）
- B 颜色：B1 **warn(R2-2a-B1-40)**（dark 选中态白字于 `--primary` dark 亮蓝 3.15:1；light 4.46:1 亦压线）B2 pass（focus ring 为 3px 半透明 primary 光环，形状可辨）B3 pass（选中语义蓝与全站 primary 一致）B4 pass（选中/悬停色均可溯源 `--primary`/muted 令牌，无字面色）B5 pass（dark 复检完成，问题归 B1-40；未选中态 dark 平价无恙：暗底浅字可读）B6 pass（选中态为 primary 实底而非默认蓝一键直出，且 aria-pressed 同步）
- C 布局：C1 pass（`docOverX: 0`，1280 与 800 双视口均无横向溢出）C2 pass C3 pass C4 pass（800 宽按钮组不折行不挤爆）C5 n/a C6 n/a
- D 间隔：D1 pass（按钮组内 gap 均匀，与 label 间距同 checkbox 族一致）D2–D8 n/a/pass
- E 排布：E1 pass（label→按钮组→scope 回显动线清晰）E2 pass（选中实底 vs 未选中描边层级正确）E3–E6 n/a/pass
- F 一致性：F1 pass（与 checkbox/checkbox-group 的选中语义同色系）F2–F3 n/a F4 pass（本控件无文案输出）F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-B1-40] dark 选中态白字对 `--primary` dark 亮蓝底对比度 3.15:1，light 同位 4.46:1 亦低于 4.5 —— `--primary` dark 过亮/对比度已知族新实例

- **页面/路由**: `#/lab/button-group-select`（场景 1 Single-select button group，点击 Main 后；场景 2 多选选中项同险）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 选中态
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/button-group-select/bgs-selected-dark.png`（Selected "Main" 白字亮蓝底）；对照 `bgs-multi-dark.png`（Admin/Viewer 同险）
- **目视描述**: dark 下选中按钮底色是偏亮的蓝（比 light 更浅），白色 label 与底色的明度接近，选中文字辨识度明显低于 light。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w3d-complete.mjs` recheck.bgsSelected（oklch→sRGB 换算后与合成底色算 WCAG 比值）；`_tmp/r2-2a-probes/w3c-main-results.json` button-group-select 段
  - 输出: dark `fg: rgb(255,255,255)`、`btnBg: oklab(0.651694 -0.0306804 -0.165621 / 0.85)` → 有效底 `rgb(81,144,245)`，ratio **3.15**；light 有效底 `rgb(34,113,242)`，ratio **4.46**（亦 <4.5，压线）
- **对照基准**: WCAG 2.2 1.4.3（正文对比度 ≥4.5:1）；已知族「dark 平价 + `--primary` dark 过亮 + 对比度（R2-4）」
- **严重程度**: P2（选中态是控件核心状态；dark 下高频可感）
- **用户影响**: dark 用户选中后不易读出当前选项；系统 sexism：同 `--primary` 驱动的 checkbox 选中底、date 选中日等全部同险。
- **修复方向**: dark 分支将 `--primary` 降至 oklch L≤0.62（或给选中态前景换 `--primary-foreground` 的 dark 加深档），一处令牌收敛全族。
- **归族**: systemic → R2-4 批（`--primary` dark 过亮/对比度已知族，本卡附按钮组实例证据）
- **复核状态**: 已复核（保留 P2，review-b 2026-09-24）。订正（数据修正，家族方向反转）：原卡未合成 aria-pressed:bg-primary/85 的 0.85 alpha；像素实测 dark 4.16–4.18 / light 3.66，双主题均 <4.5 且 light 更差（button.tsx L17/L22 + theme-tokens L131/L191）

## 4. 已知族命中（引用，不另立项）

- `--primary` dark 过亮/对比度（R2-4）：见 B1-40（本卡为其新实例载体之一）。
- i18n zh-CN 回退（R2-2a-F4-11 族）：lab 页 scope-debug 面板“调试/折叠”中文 chrome 出现在本页截图（bgs-selected-\*.png），引用不立项。
- 调试 chip 面板默认展开遮挡下方内容：本页场景区块下方 60% 高度被 scope JSON 占据，为 lab 载体固有（各 lab 页一致），引用不立项。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-button-group-select` → carded（卡列填本路径）；findings 归族后 → digested。
