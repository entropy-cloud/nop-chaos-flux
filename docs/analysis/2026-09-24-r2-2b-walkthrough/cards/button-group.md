# [card] control:button-group

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/button-group` ｜ **载体**: lab 页（MultiScenarioLabPage，3 场景：basic with actions / multiple selection toggle / host selection+onChange payload C5.2）
- **矩阵裁剪**: simplified（matrixReason：非弹层/非流程控件，选中即全部值态；裁掉的状态：disabled 变体（fixture 无 disabled item，渲染器支持 `disabled` 但载体未布）、超长 label 溢出态（fixture 无长文案 item）、glass 皮肤抽查）

## 1. 截图清单

| 状态                       | light                                                                                                                       | dark（真 data-mode，自采）                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 默认 1280×800              | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/default-1280-light.png`                                               | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/default-1280-dark.png`                                        |
| 默认 800×900               | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/default-800-light.png`                                                | —                                                                                                                   |
| multiple 选中（Tag1+Tag3） | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/multi-selected-1280-light.png` / `multi-tag1-selected-1280-light.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/multi-selected-1280-dark.png` / `dark-tag1-selected-1280.png` |
| host single 选中 + payload | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/host-single-selected-1280-light.png`                                  | —                                                                                                                   |
| hover（Save）              | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/save-hover-1280-light.png`                                            | —                                                                                                                   |
| focus-visible（键盘 Tab）  | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/save-kbd-focus-1280-light.png` / `cancel-kbd-focus-1280-light.png`    | —                                                                                                                   |
| dark 采样前置帧            | —                                                                                                                           | `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/dark-preclick-1280.png`                                       |

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover bg 白→`rgb(241,245,249)` bg-muted，computed diff 坐实）A2 pass（键盘 Tab 后 `:focus-visible` 命中，ring 3px oklab ring/50）A3 pass（按钮 32×54+，`smallTargetScan` 零命中）A4 n/a（fixture 无 disabled）A5 n/a A6/A8 n/a A7 n/a（无弹层）A9 pass（Save 点击 `clicked:yes`、host Option 2 点击 payload `bg-payload:opt2|opt2|single`，`aria-pressed` 同步翻转）
- B 颜色：B1 pass（light 正文 12.61:1；dark 选中态文字对实拍像素 12.76:1、未选中 14.72:1）B2 pass（focus ring 3px 走令牌）B3 pass（无语义色使用）B4 pass（`data-selected:bg-accent`、`dark:bg-input/30` 全令牌）B5 warn(R2-2b-B6-151)（dark 选中/未选中底差 1.12:1，见条目；其余 dark 平价通过）B6 warn(R2-2b-B6-151)（选中态指示弱，双主题同根）
- C 布局：C1 pass（1280/800/dark 三轮 `overflowScan` docOverX=0 零命中）C2 pass C3 pass C4 pass（800 窄视口组不折行不溢出）C5 n/a C6 n/a
- D 间隔：D1 pass（组内按钮 flush 连体为 ButtonGroup 设计形态：`rounded-l-none`+`border-l-0`，非间隔缺陷）D2–D8 n/a/pass
- E 排布：E1 pass E2 pass（选中/accent、未选中/outline 同级合理）E3 n/a E4 pass（同组按钮 y 全等 271/620）E5–E6 n/a
- F 一致性：F1 pass（与 Button primitive 同 variant 体系）F2–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-B6-151] 选中态与未选中态底色差过弱：light 1.08:1 / dark 1.12:1，选中指示仅靠低对比填充差

- **页面/路由**: `#/lab/button-group`（场景 2 multiple toggle / 场景 3 host single 同险）
- **主题/视口/状态**: light + dark（真 data-mode）/ 1280 / 选中态（data-selected=true）
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/button-group/multi-tag1-selected-1280-light.png`、`_tmp/visual-inspection-2026-09-24/r2-2b/button-group/dark-tag1-selected-1280.png`
- **目视描述**: 点选 Tag 1 后选中态仅呈现为极淡的底色变化（light 淡蓝灰填充、dark 略亮填充），边框、字重、字号均不变，扫视时不易分辨哪个处于选中。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w5-bg-pixels.mjs`（PNG 像素采样，`_tmp/r2-2b-probes/w5-png.mjs` 解码器）+ DOM computed（`w5-button-group.mjs`）
  - 输出: light 选中底 `rgb(236,243,254)` vs 组底白 → 1.08:1；dark 选中底实拍 `rgb(28,36,50)` vs 未选中 `rgb(19,26,35)` → **1.12:1**（文字对比本身健康：12.76/14.72）。dark 下 DOM 合成对比度因 `oklab()` alpha 底失真（1.19–1.22 伪值），以像素采样为准。
- **对照基准**: WCAG 1.4.11（标识控件状态所需的视觉信息 ≥3:1）；检查提示词 B6（选中态可辨识）
- **严重程度**: P3（aria-pressed 已正确传达状态，屏幕阅读器无碍；视觉扫视成本高但任务可完成）
- **用户影响**: 多选场景下用户难以快速确认当前选中集合，需逐个点击试探。
- **修复方向**: `packages/flux-renderers-layout/src/button-group-renderer.tsx` L135 选中态类组：在 `data-selected:bg-accent` 基础上为 dark 增加边框/字重差（如 `data-selected:border-primary data-selected:text-primary` 或选中态 `font-semibold`），避免仅靠 accent 低差填充。
- **归族**: watch-only → 台账（toggle 类选中指示弱模式；与 R2-2a B1-40 button-group-select 选中态对比度族相邻但根因不同：彼为令牌对比度、此为状态指示设计）
- **复核状态**: 未复核

## 4. 已知族命中（引用，不另立项）

- 无新增族命中。A3 扫描零命中；dark 弹层族不适用（无弹层）；lab 载体族（调试 chip/Scope 面板）在截图内可见但按族约定不立项。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-button-group` → carded（卡列填本路径）；findings 归族后 → digested。
