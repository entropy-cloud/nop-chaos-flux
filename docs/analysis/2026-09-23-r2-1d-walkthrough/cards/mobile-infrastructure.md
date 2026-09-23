# [card] page:mobile-infrastructure

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/mobile-infrastructure` ｜ **载体**: 域页面（M0.1 移动端基础设施参考面：safe-area 辅助类 / hairline 0.5px / haptics / global z-index 栈）
- **矩阵裁剪**: simplified+移动专项（裁掉 glass（本波统一）、拖拽/异步态（无）。375 主分析 + 1280 一轮（800 与 1280 同构静态面，裁剪）。重点：safe-area/safe-area 降级、z-index 叠放、A3）

## 1. 截图清单（状态矩阵）

| 状态                    | light                                                                           | dark                         |
| ----------------------- | ------------------------------------------------------------------------------- | ---------------------------- |
| 默认 375×812            | `_tmp/visual-inspection-2026-09-23/r2-1d/mobile-infra/mi-default-375-light.png` | `…/mi-default-375-dark.png`  |
| dialog 打开 375         | `…/mi-dialog-375-light.png`                                                     | —                            |
| dialog+popover 叠放 375 | `…/mi-dialog-popover-375-light.png`                                             | —                            |
| dialog+toast 叠放 375   | `…/mi-dialog-popover-toast-375-light.png`                                       | —                            |
| 默认 1280×800           | `…/mi-default-1280-light.png`                                                   | `…/mi-default-1280-dark.png` |
| hover/disabled          | n/a（haptic :active 经 CSS 规则取证而非截图）                                   | —                            |

## 2. A–H 维度勾选表

- A 交互：A1 ✔ A2 ✔ A3 ✔（可交互元素 min(w,h) 扫描 375/1280 均零命中；dialog 关闭钮 28×28） A4 ✔（Disabled 按钮天然不触发 :active，契约成立） A5 n/a A6 n/a A7 ✔（dialog 有遮罩/关闭钮/ESC 关闭） A8 ✔ A9 ✔（toast 即时出现）
- B 颜色：B1 ✔ B2 ✔（hairline 色走 --nop-hairline-color 默认 hsl(var(--border))） B3 n/a B4 ✔ B5 ✔ B6 n/a
- C 布局：C1 ✔ C2 **fail(R2-1d-C2-01)**（playground pill 遮挡，见发现） C3 ✔ C4 ✔ C5 ✔ C6 n/a
- D 间隔：D1–D8 ✔（2×2 卡片栅格 24px 节奏；预览块内间距均匀）
- E 排布：E1 ✔ E2 ✔ E3 ✔ E4 ✔ E5 ✔ E6 n/a
- F 一致性：F1 ✔（dialog/footer 按钮右对齐契约） F2–F4 n/a F5 n/a
- G 设计器：n/a
- H 弹层：H1 ✔（ui Dialog base 档 → 375 下 max-w(100%-2rem)=343） H2 n/a H3 ✔（dialog ≤ 视口） H4 ✔（关闭钮不与标题叠压；pill 遮挡归 C2-01） H5 ✔ H6 ✔ H7 ✔ H8 n/a H9 ✔

## 3. 发现条目

### [R2-1d-C2-01] playground 悬浮计数 pill（z=9998）遮挡页面内容与弹层标题（跨页系统性）

- **页面/路由**: 全部页（本卡实证：`#/m1-responsive` dialog 标题「M1 Dialog」被遮成「…log」、Back to Home 被遮；`#/mobile-infrastructure` 遮罩之上仍浮于最顶；375/1280、light/dark 同构）
- **主题/视口/状态**: 全主题全视口 / 常驻
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1d/m1-responsive/m1-dialog-open-375-light.png`（pill 压 dialog 标题）；`…/mobile-infra/mi-dialog-popover-toast-375-light.png`（mask 之上仍最顶）
- **目视描述**: 左上角固定悬浮的「虫子图标 + 0」计数按钮永远浮在一切内容（含 dialog 遮罩与弹层本体）之上。
- **程序化证据**:
  - 探针: fixed 元素身份扫描（`_tmp/r2-1d-probes/m1-followup-out.json` pill）
  - 输出: `button.nop-haptic.group/button, position: fixed, z-index: 9998, text "0"`——高于 useGlobalZIndex 基线 2000 的全部弹层，仅低于 Toaster 10000；与弹层标题/页面左上角控件矩形求交即遮挡。
- **对照基准**: 检查提示词 C2（无意外重叠）/ WCAG 2.4.11（焦点与内容不得被遮挡）；z-index 栈契约（M0.1d 自述 toast 10000 顶层 → 该 pill 实际处于「toast 之下、一切之上」的未登记层）。
- **严重程度**: P2
- **用户影响**: 所有页面的左上角内容与弹层标题在视觉上被一个调试件压住；用户无法判断其归属，且遮挡是常驻的。
- **修复方向**: playground 壳层：① pill 默认收起为边缘小把手/移至右下工具组，或 ② z-index 降到内容层（≤50），或 ③ 提供开关并在走查/演示模式默认隐藏。
- **归族**: systemic → R2-3 批（playground 壳层根因，跨全部页面；他波若已登记则并档）
- **复核状态**: 未复核

## 4. 正向取证（M0.1 四件套逐条验证 pass）

- **safe-area**: 四个辅助类全部命中（`padding-top/bottom: env(safe-area-inset-*)`），非 notch 模拟下 computed 0px——按契约降级，不破布局。
- **hairline**: `::after` 高 1px + `matrix(1,0,0,0.5,0,0)`（scaleY 0.5 → 物理 0.5px），色 `rgb(225,231,239)` = border 令牌；左右向 `matrix(0.5,0,0,1,0,0)` 同构。
- **haptic**: Button computed `transition: opacity 0.1s`、`cursor: pointer`，`nop-haptic:active` CSS 规则在 styleSheets 中实存；disabled 不响应契约成立。
- **z-index 栈**: dialog z=2000（计数器基线）→ dialog 内 popover z=2002 > dialog（叠放正确）→ ESC 关 popover → toast「固定顶层 z=10000」出现且目视盖于 dialog 之上（截图）；叠放顺序 toast > popover > dialog 与自述契约一致。

## 5. 误报排除记录

| 疑点                                   | 排除理由                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| popover 打开后「Show toast」按钮点不到 | popover 面板覆盖按钮并拦截首次点击，属 outside-press 关闭范式（首次点击关 popover、再点即达）；ESC 关闭后按钮可达，实测通过 |
| toast 探针 z 取值 null                 | toast 文本与位置实拍正确（顶层），z 值挂载点在 portal 内层，探针取值路径未达，不构成疑点                                    |
| safe-area 全 0                         | 非 notch 环境按契约降级（demo 卡自述）                                                                                      |
| pill「0」在本页再次出现                | 即 C2-01 主证据面之一，不重复立项                                                                                           |

## 6. 台账回写

- 本卡完成后：`ledger.md` 对应行 status → `carded`；
- findings 归族：C2-01 → R2-3 系统性批（playground 壳层）；
- 批内复检通过后 → `verified`。
