# [card] control:steps

- **批次**: R2-2b ｜ **台账状态**: carded ｜ **日期**: 2026-09-24
- **路由**: `#/lab/steps` ｜ **载体**: lab 页（3 场景：basic display（value=review）/ host 三向 ownership / host click+onChange payload（C5.2））
- **矩阵裁剪**: simplified（matrixReason：显示型控件，状态面=指示器三态（finish/process/wait）；error 态渲染器支持但 fixture 未布（裁剪）；valueOwnership 的 controlled/scope 行为属功能域，仅取"点击不动"视觉面；裁掉：glass、垂直 orientation（fixture 全水平，垂直连接线走同一 STATUS 类组）、glass 皮肤）

## 1. 截图清单

| 状态                                                   | light                                                                                                   | dark（真 data-mode，自采）                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 默认 1280×800（draft=finish/review=process/done=wait） | `_tmp/visual-inspection-2026-09-24/r2-2b/steps/default-1280-light.png`                                  | `_tmp/visual-inspection-2026-09-24/r2-2b/steps/default-1280-dark.png`                                 |
| 默认 800×900                                           | `_tmp/visual-inspection-2026-09-24/r2-2b/steps/default-800-light.png`                                   | —                                                                                                     |
| 点击步进（payload 场景）                               | `_tmp/visual-inspection-2026-09-24/r2-2b/steps/step-three-clicked-1280-light.png`（Two 实拍）           | —                                                                                                     |
| 指示器圆像素采样帧                                     | `_tmp/visual-inspection-2026-09-24/r2-2b/steps/basic-circles-light.png` / `basic-steps-light-pixel.png` | `_tmp/visual-inspection-2026-09-24/r2-2b/steps/basic-circles-dark.png` / `basic-steps-dark-pixel.png` |

## 2. A–H 维度勾选表

- A 交互：A1 n/a（steps 无 hover 反馈设计——ghost indicator 无 hover 类，可接受）A2 pass（indicator 为 Button，focus-visible ring 在类组）A3 pass（圆 28px 且整行是点击热区（R4-视角8-02 契约），`smallTargetScan` 零命中）A4 pass（disabled `opacity-50 cursor-not-allowed` 类组在位，fixture 未触发）A5 n/a A6/A8 n/a A7 n/a A9 pass（点击 Two → payload `steps-payload:s2|1|s2`；controlled 实例点击不动（`data-status="process"` 计数不变））
- B 颜色：B1 pass（标题/描述 muted 对比正常）B2 pass B3 pass B4 pass（STATUS_INDICATOR_CLASS 全令牌）B5 **族命中（E2-30，像素坐实）**（见 §4：process 与 finish 填充双主题逐像素相同）B6 n/a
- C 布局：C1 pass（1280/800 docOverX=0）C2 pass C3 pass C4 pass（800 三项 146px 等宽不折断）C5 n/a C6 n/a
- D 间隔：D1 pass（水平 flex-1 等分，item 间无意外间隙）D2–D8 n/a
- E 排布：E1 pass E2 **warn（族）**（现态强调弱于完成态，见 §4 E2-30 像素证据；`isCurrent` 标题 `text-foreground` vs 其余 `text-muted-foreground` 是现态唯一强项）E3 pass（步骤序从左到右）E4 pass（圆心 x 454/760/1066 等距 306）E5–E6 n/a
- F 一致性：F1 warn（cursor 缺指针，见 R2-2b-A1-156）F2–F5 n/a
- G 设计器：n/a
- H 弹层：n/a

## 3. 发现条目

### [R2-2b-A1-156] 可点击步骤指示器无 pointer 光标：整行为点击热区但 cursor 恒 auto，可供性缺失

- **页面/路由**: `#/lab/steps`（全部 3 场景的步骤项同根因——indicator 是带 onClick 的 Button）
- **主题/视口/状态**: light + dark / 1280 / 默认悬停步骤项
- **截图**: `_tmp/visual-inspection-2026-09-24/r2-2b/steps/step-three-clicked-1280-light.png`（点击有效，悬停时光标仍为默认箭头）
- **目视描述**: 步骤项整行可点（点击即切步），但鼠标悬停其上光标保持默认箭头，无 hover 高亮、无 pointer，视觉上与纯文本无异。
- **程序化证据**:
  - 探针: `_tmp/r2-2b-probes/w5-steps.mjs`（读 `[data-slot="steps-item"]` computed cursor + 点击 payload 验证可点性）
  - 输出: `cursor: "auto"`（三态 item 一致）；同探针 `clickPayload: "steps-payload:s2|1|s2"` 证明可点。源码 `steps-renderer.tsx` indicator 类组仅有 `disabled && 'cursor-not-allowed'`，无 `cursor-pointer`。
- **对照基准**: 检查提示词 A1（hover 态可感知）/ G2（可供性：可点元素 cursor 变化）；WCAG 目标可供性惯例
- **严重程度**: P3（功能无损；可供性与反馈缺失）
- **用户影响**: 用户无从得知步骤条可点击跳转（progress display 与 click-to-jump 双重身份全靠盲猜）。
- **修复方向**: `packages/flux-renderers-layout/src/steps-renderer.tsx` indicator Button 类组（L273-282）追加 `cursor-pointer hover:bg-muted/50`（非 disabled 时），或按 clickable 条件注入。
- **归族**: local → R2-4 批（可与 collapse A2-154 焦点环条目合并为"layout 控件交互反馈契约"同一修复面）
- **复核状态**: 已复核（驳回，review-b 2026-09-24）：原卡测了外包裹 div（非交互元素）；真实热区 steps-indicator Button 经 nop-haptic（mobile.css L110）获得 pointer，elementFromPoint 命中链全程 pointer

## 4. 已知族命中（引用，不另立项）

- **R2-1d-E2-30（w4b steps 现态与完成态指示器同色，watch P3）——重点复核结论：族在 lab 载体面仍成立，附像素级新证据**：
  - 探针: `_tmp/r2-2b-probes/w5-steps-pixels.mjs`（PNG 像素采样圆填充，避开中心字形采样于 (x+6,y+6)）
  - 输出: light finish 填充 `rgb(28,110,242)` vs process 填充 `rgb(28,110,242)`——**逐像素相同（比值 1.0）**，wait 为白底（process vs wait 4.6）；dark finish `rgb(77,141,245)` vs process `rgb(77,141,245)` 同样 1.0（vs wait 6.14）。源码根因未变：`steps-renderer.tsx` L155-156 `process` 与 `finish` 同用 `border-primary bg-primary text-primary-foreground`，区分仅 ✓/数字字形 + 现态标题前景。**连带面**：水平连接线取"后一 item"状态着色（L243-249 `status==='finish' ? bg-primary : bg-border`），finish→process 段呈灰（bg-border `rgb(225,231,239)`），已完成路径不显 primary——与指示器同属"现态/完成态区分弱"族面，随 E2-30 一并修复。
- error 状态裁剪说明：`deriveStatus` 支持 `error`（XIcon），fixture 未布 error 项，无法在载体取证，留待 schema 扩充后复检。

## 5. 台账回写

- 本卡完成后由主 session 统一翻转 ledger 行 `lab-steps` → carded（卡列填本路径）；findings 归族后 → digested；E2-30 族证据供 watch-pool 行更新引用。
