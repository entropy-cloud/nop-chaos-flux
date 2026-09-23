# [card] control:badge

- **批次**: R2-2a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/lab/badge` ｜ **载体**: lab 页（MultiScenarioLabPage，4 场景：variants / 表达式 label / 状态映射 / 计数徽章）
- **矩阵裁剪**: simplified（matrixReason：非六属性复杂控件——badge 为纯展示 widget，无弹层→H 全 n/a、无拖拽→A6/A8 n/a、无异步→A5 loading 子项 n/a、无表单参与→D5 n/a；glass 皮肤未跑；裁掉的状态：glass 皮肤、hover/focus 元素态（badge 非交互元素，n/a 非裁剪））
- **runner dark 列作废声明**：capture runner 仅 `emulateMedia(colorScheme)`，playground dark 由 `data-mode` 属性驱动（R2-2a-B5-34 已立案）——runner 产出的 `lab-badge-default-*-dark.png` 实为 light 渲染。本卡 dark 证据一律以自采 `_tmp/visual-inspection-2026-09-23/r2-2a/badge/badges-dark-*.png`（显式 setAttribute data-mode）为准。

## 1. 截图清单

| 状态                 | light                                                                         | dark（真 data-mode，自采）                                           |
| -------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 默认 1280×800        | `_tmp/visual-inspection-2026-09-23/lab-badge-default-1280x800-light.png`      | `_tmp/visual-inspection-2026-09-23/r2-2a/badge/badges-dark-1280.png` |
| 默认 800×900         | `_tmp/visual-inspection-2026-09-23/lab-badge-default-800x900-light.png`       | `_tmp/visual-inspection-2026-09-23/r2-2a/badge/badges-dark-800.png`  |
| 全部变体特写         | `_tmp/visual-inspection-2026-09-23/r2-2a/badge/badges-light-1280.png`         | 同上 dark 列                                                         |
| 值态（计数徽章 0→2） | `_tmp/visual-inspection-2026-09-23/r2-2a/badge/counter-after2-light-1280.png` | —（机制与主题无关，light 取证）                                      |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（非交互元素）A2 n/a A3 n/a A4 n/a A5 pass（回退/空值渲染不崩溃）A6 n/a A7 n/a A8 n/a A9 pass（计数徽章 0→2 随 setValue 即时更新，`out-badge-counter.json`）
- B 颜色：B1 **fail(R2-2a-B1-02)**（light 四语义色全 <4.5:1）B2 n/a B3 pass（四色语义映射正确且跨场景一致）B4 pass（色值走 `--success/--warning/--danger/--secondary` 令牌链，无字面色）B5 **fail(R2-2a-B5-01)**（dark secondary 前景/背景同亮度，文字不可读；dark success 1.84 / warning 1.94 同败）B6 n/a
- C 布局：C1 pass（1280/800 overflow 扫描零命中，`out-badge-button.json` badge.overflow800）C2 pass C3 pass C4 pass C5 n/a C6 n/a
- D 间隔：D1 pass（badge 自身 px-2 py-0.5 成体系；fixture 行 gap 2px 归 flex 卡 D1 族引用）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（level→variant 语义正确：danger→destructive 等）E3–E6 n/a/pass
- F 一致性：F1–F5 n/a（无跨页操作语义；level 语义色一致性在 B3 记 pass）
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2a-B5-01] dark 下 secondary 徽章完全不可读：`--secondary-foreground` 未随 dark 翻转（1.06:1）

- **页面/路由**: `#/lab/badge`（场景 1 "All badge variants" 的 Info 徽章 + 场景 3 的默认态徽章 + 场景 4 计数徽章——凡 `level` 未指定即 secondary 变体）
- **主题/视口/状态**: dark（真 data-mode）/ 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/badge/badges-dark-1280.png`（第一个 Info 徽章为纯紫色药丸，文字不可见）
- **目视描述**: dark 下 Info/Active/计数 0 等 secondary 徽章渲染为实心浅紫药丸，浅蓝文字与背景几乎同亮度，肉眼完全读不出内容。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-badge-button.mjs`（getComputedStyle + WCAG 叠层合成对比度）
  - 输出: dark Info `color rgb(173,202,248)` on `bg rgb(202,185,252)` → ratio **1.06**；dark Success 1.84、Warning 1.94、Danger 4.92（仅 Danger 过）。根因：`packages/theme-tokens/src/styles.css` L195–L198 classic dark 块 `--secondary: 255 92% 86%`（亮紫）与 `--secondary-foreground: 217 89% 84%`（亮蓝）成对同为亮色；glass dark L315–L318 同构（256 92% 79% + 172 76% 82%）。
- **对照基准**: dark 平价已知族（R2-4，"bg 字面亮底 dark 不可读"同根因模式）；检查提示词 B5/WCAG 1.4.3
- **严重程度**: P1（默认态徽章文字完全不可读；secondary 是 badge 未指定 level 时的默认变体）
- **用户影响**: dark 主题下所有未指定 level 的徽章（状态标签、计数）显示为空白药丸，用户无法获知标签内容。
- **修复方向**: `packages/theme-tokens/src/styles.css` classic dark 块将 `--secondary-foreground` 翻转为深色（建议 `217 89% 20%` 附近，与 dark `--secondary-surface: 217 30% 20%` 的做法对齐），glass dark 块同步；或给 ui Badge secondary 变体改用 `--secondary-surface`/`--secondary` 成对令牌。
- **归族**: systemic/local → dark 平价族（R2-4 引用）+ 本卡实例（token 根因，button 卡 R2-2a-B5-04 为同根因第二实例）
- **复核状态**: 已复核（保留 P1，review-a 2026-09-24）。订正：dark 四语义像素实测 Success 6.36 / Warning 6.24 过、Danger 3.24 败（原卡数值系探针渐变基线伪象）；修复面收窄为翻转 --secondary-foreground（classic L195-198 + glass L315-318）

### [R2-2a-B1-02] light 下四语义色徽章文字对比度全部低于 4.5:1（12px 小字）

- **页面/路由**: `#/lab/badge`（场景 1 全变体 + 场景 3 状态映射，产品面所有 badge 同源）
- **主题/视口/状态**: light / 1280 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-2a/badge/badges-light-1280.png`
- **目视描述**: 四个语义徽章彩色文字在浅色底上均偏"淡"，Success/Warning 尤其发虚。
- **程序化证据**:
  - 探针: `_tmp/r2-2a-probes/w1-badge-button.mjs`（叠层合成对比度，bg-success/15 等低透明度背景与页面底色合成后计算）
  - 输出: Info(secondary) **3.05**、Success **2.59**、Warning **2.13**、Danger **3.78**，全部 < 4.5:1；字号 12px font-medium（非大字，门槛 4.5）。变体类名：`bg-success/15 text-success`、`bg-warning/15 text-warning`、`bg-secondary text-secondary-foreground`（`packages/ui` badge variants）。
- **对照基准**: WCAG 1.4.3（正文 ≥4.5:1）；对比度已知族（R2-4，"文本 <4.5:1"）
- **严重程度**: P2（系统性：badge 全语义档位在 light 全部不达标，状态标签高频出现）
- **用户影响**: 视力 20/20 用户可辨认但吃力；低视力/强光环境下状态标签（成功/警告）难以分辨，语义信息传达打折。
- **修复方向**: 给 badge 引入成对前景令牌（如 `--badge-success-foreground` 等）或在 classic light 块加深 `--success/--warning/--danger` 文字用色（Success 建议 ≥ rgb(13,122,89)、Warning ≥ rgb(146,98,2)、Danger ≥ rgb(201,37,37) 档位）；保持 `bg-*/15` 底不变亦可达标。
- **归族**: systemic → 对比度族（R2-4 引用）+ 本卡实例
- **复核状态**: 已复核（保留 P2，review-a 2026-09-24）。订正：实测 3.05/2.14/1.76/3.12（口径差，四档全败结论不变）

## 4. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-badge` → carded（卡列填本路径）；findings 归族后 → digested。
