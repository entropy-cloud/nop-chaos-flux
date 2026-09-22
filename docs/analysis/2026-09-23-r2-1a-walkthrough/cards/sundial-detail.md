# [card] page:sundial-detail

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/sundial-detail` ｜ **载体**: complex-page（外部应用复刻 · 待办详情检视器）
- **矩阵裁剪**: full（glass 未抽查：replica 自带 sd-\* 配色）

## 1. 截图清单

| 状态                  | light                                                     | dark                                                           |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| 默认 1280×800         | `…/r2-1a/sundial-detail/sundial-detail-default-light.png` | `…/sundial-detail-default-dark.png`                            |
| 默认 ~800×900         | `…/sundial-detail-default-800-light.png`                  | `…/sundial-detail-default-800-dark.png`                        |
| 卡内滚动至详情面板    | —                                                         | `…/sundial-detail-scrolled-dark.png`                           |
| 日期选择器弹层打开    | `…/sundial-detail-date-picker-light.png`                  | —                                                              |
| 移到列表弹层打开      | `…/sundial-detail-move-list-light.png`                    | —                                                              |
| dark 下溢出区灰字特写 | —                                                         | `…/sundial-detail-dim-labels-dark.png`（clip 280,480,500×120） |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass A3 fail(R2-1a-A3-04 页面实例 16px checkbox/16px 行内行) A4 pass A5 pass A6 n/a（无拖拽） A7 pass（日期/移到列表弹层均 360=xs 档、有关闭路径） A8 n/a A9 pass
- B：B1 fail(R2-1a-B1-19 页面实例 3.16:1@10px) B2 pass B3 pass B4 pass B5 fail(R2-1a-B5-07) B6 pass
- C：C1 pass C2 pass C3 pass（面板+下方 demo 区分节清晰） C4 pass C5 fail(R2-1a-C-02 页面实例 diff=582/sbW=0) C6 n/a
- D：D1 pass（状态行/字段行节距一致） D2 pass D3 pass D4–D8 pass
- E：E1 pass（面板即任务详情三问可答） E2 pass E3 pass E4 pass E5 pass E6 n/a
- F：F1 pass（移到列表/移到垃圾箱与 workbench 语义一致） F3 pass F4 pass F5 n/a
- G：n/a H：pass（date picker 360×136、move-list 360×234 均落 xs 档，关闭钮/确认钮齐全；footer 主钮左位现象并入 E3-05 裁决项）

## 3. 发现条目

### [R2-1a-B5-07] dark host 下，溢出白底盒外的深灰说明文字与按钮近乎不可读

- **页面/路由**: `#/complex-pages/sundial-detail`（详情面板下方「选择器对话框（点击打开）」demo 区）
- **主题/视口/状态**: dark（host `data-mode=dark`）/ 1280×800 / 卡内滚动到底
- **截图**: `…/sundial-detail-scrolled-dark.png`（y≈514/560 区域文字几乎隐没）、`…/sundial-detail-dim-labels-dark.png`
- **目视描述**: 「选择器对话框…」标签与「日期选择器/重复选择器/列表选择器」三个按钮落在深色页根上，深灰字几乎看不见。
- **程序化证据**:
  - 探针: elementFromPoint 定位后对该元素跑 contrastScan；对照像素观感
  - 输出: 按钮 color rgb(51,51,51)、标签 rgb(99,99,99)；computed effectiveBg 误报为白（其白底祖先盒不覆盖溢出绘制的实际背景=页根 rgb(15,23,41)），换算真实对比 ≈1.5-2.7:1；light host 下同元素 5.37-11.29 达标
- **对照基准**: B5 dark 平价（light 下无此问题、dark 下退化 = 典型 dark 专有缺陷）；WCAG 1.4.3
- **严重程度**: P2（可点击的三个选择器入口在 dark 下失去可发现性）
- **用户影响**: dark 用户看不到 demo 操作区入口（功能仍在，视觉不可达）。
- **修复方向**: demo 区文字色改令牌（`--muted-foreground`）随主题翻转；或给该 demo 区固定亮色底（与面板一致）并声明 replica 仅亮色（同 B5-21 裁决）。
- **归族**: local → R2-4 批
- **复核状态**: 未复核

### [R2-1a-A3-04 页面实例] 子任务 checkbox 16×16、字段行行高 16px 行

- **程序化证据**: targetScan(24)：nop-checkbox 16×16（d-done/d-s1 等）、行内日期行 DIV 288×16
- **严重程度**: P3 ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-B1-19 页面实例] badge 橙 3.16:1@10px

- **程序化证据**: `.sd-badge` rgb(219,119,6) ratio=3.16
- **严重程度**: P2（并入 B1-19 汇总修复） ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

### [R2-1a-C-02 页面实例] 卡内 diff=582px 隐藏滚动

- **程序化证据**: nop-card oy=auto、diff=582、sbW=0
- **严重程度**: P2 ｜ **归族**: systemic → R2-3 批（并入 C-02） ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                                         | 排除依据                                                                                                         |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 详情面板偏左、右侧大片空白                   | 页面为“检视器 + 选择器 demo”演示布局（下方自述文案），非双栏破损                                                 |
| contrastScan 对溢出区文字报 11.29:1 的假达标 | 合成背景取了不覆盖该绘制区的白底祖先——已按实际绘制背景（页根深色）修正判读并记录（探针盲区备注，供 R2-3 改探针） |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
