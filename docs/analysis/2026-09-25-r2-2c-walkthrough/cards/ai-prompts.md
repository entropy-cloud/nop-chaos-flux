# [card] control:ai-prompts

- **批次**: R2-2c ｜ **台账状态**: carded ｜ **日期**: 2026-09-25
- **路由**: `#/lab/ai-prompts` ｜ **载体**: lab 页（MultiScenarioLabPage，1 场景：Host prompts in dialog + onSelect payload C8.3 — openDialog surface 内 3 张 vertical 提示词卡，onSelect probe `${item.label}|${index}`）
- **矩阵裁剪**: simplified（matrixReason：静态推荐卡控件，无拖拽/画布/异步面。裁掉的状态：horizontal/wrap 两种 layout 变体与 sm/lg size 档（fixture 仅 vertical+md，样式串源码核对 L36-44）、items 空数组 data-empty 态与 meta.disabled 态（fixture 未配置，空态源码 L46-57 核对）、弹层深走查（H1–H9 已由 R2-2a dialog 卡全量覆盖，本卡只取与 prompts 同屏的面））

## 1. 截图清单

| 状态                     | light                                                                                 | dark（真 data-mode，自采）                                                           |
| ------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 默认 1280×800（关闭态）  | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/closed-light-1280.png`            | —                                                                                    |
| 弹层开（3 卡 vertical）  | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/dialog-open-light-1280.png`       | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/dialog-open-dark-1280.png`       |
| hover 提示词卡           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/item-hover-light-1280.png`        | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/item-hover-dark-1280.png`        |
| 键盘 focus-visible 卡    | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/item-kbd-focus-light-1280.png`    | —                                                                                    |
| 点击选择后（弹层保持开） | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/after-select-light-1280.png`      | —                                                                                    |
| 弹层开 ~800 宽           | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/dialog-open-narrow-800-light.png` | `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/dialog-open-narrow-800-dark.png` |

## 2. A–H 维度勾选表

- A 交互：A1 pass（hover 白→muted 变色 + cursor pointer；首轮"hover 无变化"读数系探针先 hover 后取 before 的顺序错误，suggests 卡同 variant 证明 hover 通道有效，见 §4 勘误）A2 pass（Tab 进入弹层后 `ai-prompts-item` 获 oklab 3px ring，`visible: true`）A3 pass（卡片 480×32；1×1 sr-only span 白名单排除）A4 n/a（disabled 态 fixture 未配置）A5 n/a A6/A8 n/a A7 pass（弹层有关闭钮 + 遮罩；选择后弹层保持开为渲染器设计，归 suggestions 卡 A7-46 同通道观察）A9 pass（点击 onSelect dispatch `__c83Prompt="Summarize|0"`，弹层保持开）
- B 颜色：B1 pass（label 18.26:1、description 6.81:1、badge 6.81:1）B2 pass B3 pass B4 pass B5 **warn**（dark 弹层整面白底 rgb(251,250,249) + 卡片灰糊 + description ≈1:1 不可读 — `--popover` dark 亮底已知族实例，§4 引用附 PNG 采样）B6 pass
- C 布局：C1 pass（sr-only 白名单外零命中；弹层内 `dialog-surface` 560×206 无溢出）C2 pass C3 pass C4 pass（800 宽弹层 560 无溢出）C5/C6 n/a
- D 间隔：D1 pass（卡间距 8px 落栅格，rect 序 122→162→202）D2–D8 pass/n/a
- E 排布：E1 pass E2 pass E3 pass E4 **fail(R2-2c-E4-45)**（卡片内部排布塌缩）E5 pass（vertical 列表同构）E6 n/a
- F 一致性：F1–F3 n/a F4 pass（卡片文案全英文，无中文 chrome）F5 pass（弹层宽度 560 落 `--overlay-size-md` 档，plan490 锚点复检通过）
- G 设计器：n/a
- H 弹层：H1 pass（560=md 档）H2 n/a H3 pass（bottom 266 ≤ 792）H4 pass（关闭钮与标题无重叠）H5 n/a（无 footer 按钮组）H6–H8 n/a/pass H9 pass（800 宽不溢出）

## 3. 发现条目

### [R2-2c-E4-45] 提示词卡内部排布塌缩：description 块被压成行内、badge 右对齐（ml-auto）与 text-left 全部失效

- **页面/路由**: `#/lab/ai-prompts`（弹层场景；所有带 description/badge 的 ai-prompts vertical 布局同险）
- **主题/视口/状态**: 双主题 / 1280 / 弹层开
- **截图**: `_tmp/visual-inspection-2026-09-25/r2-2c/ai-prompts/dialog-open-light-1280.png`（"Summarize P1 Get a quick summary" 三段挤成同一居中行）；dark 同构
- **目视描述**: 源码意图为"标签行（label 左 + badge 右）+ description 换行在下（mt-1）"，实际渲染为 label、badge、description 全部横向居中排成一行；卡片左侧文字对齐（text-left）也未见效。
- **程序化证据**:
  - 探针: `_tmp/r2-2c-probes/w2-prompts.mjs` open 段（卡片 rect 高度）+ 截图目视
  - 输出: 卡片 rect 480×32——若 description 如源码意图换行在下，高度应为 ~50px；`ai-prompts-item` 所在 Button 基类为 `inline-flex`（ui button.tsx），子节点 `div(标签行)` 与 `p(description)` 作为 flex item 进入同一行方向；`text-left` 只作用于文本节点、`ml-auto` 在 shrink-to-fit 内层 div 中无可分配空间，三个意图同时失效（`ai-prompts.tsx` L74-106）。
- **对照基准**: 检查提示词 E4（对齐/层级意图）+ 源码结构意图（label 行与 description 的 mt-1 分层）
- **严重程度**: P2（信息层级错乱：推荐卡的双层结构（标题/描述）不可辨，badge 无法右对齐，视觉与设计意图明显不符）
- **用户影响**: 描述文字被误读为标签的一部分；长 description 会把卡片撑成多行横排，可读性劣化。
- **修复方向**: `ai-prompts.tsx` L74 Button className 补 `w-full flex-col items-stretch text-left`（或把 label 行 + description 包进单个 `flex flex-col` 容器使 Badge 的 `ml-auto` 生效）；horizontal 布局同核。
- **归族**: local → R2-4 批
- **复核状态**: 已复核（保留 P2，review-a 2026-09-25）

## 4. 已知族命中（引用，不另立项）

- **`--popover` dark 亮底（dark 平价/对比度族 R2-4）**：dark 下弹层面板整面白底 `rgb(251,250,249)`（computed + PNG 双证），半透明 dark 卡片（oklab/0.5）叠其上成灰糊：PNG 采样 label ≈3.2:1、description(175,189,207) 对灰底 ≈1.05:1 **不可读**（`out-w2-prompts2.json` darkPngRatios/darkSamples + `dialog-open-dark-1280.png`）——与 detail 弹层"dark 字段标签整体不可见"同族最重档实例。
- **hover 通道勘误（防误报登记）**：本卡首轮探针先 `page.hover` 后取 before，得出"hover 无变化"假象；复测（correct order）+ ai-suggestions 同 variant 卡（白→muted 241,245,249）证明 outline variant hover 有效，prompts 卡 hover 通道 pass，不立项。
- **计划内锚点复检通过**：onSelect dispatch `Summarize|0`（dispatch ctx 解析 ✓）；键盘 Tab 焦点环 ✓；H1 尺寸档 560 ✓；空态 data-empty 与 disabled 通道源码在位（fixture 未覆盖已注明）。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-ai-prompts` → carded（卡列填本路径）；findings 归族后 → digested。
