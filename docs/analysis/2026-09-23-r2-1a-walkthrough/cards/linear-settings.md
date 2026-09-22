# [card] page:linear-settings

- **批次**: R2-1a（波 2）｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/linear-settings` ｜ **载体**: complex-page（外部应用复刻 · 设置）
- **矩阵裁剪**: full（glass 未抽查，理由同 linear-issues 卡；提交动作为零写静态形态，A9 n/a 由页面自述豁免）

## 1. 截图清单

| 状态                     | light                                                       | dark                                           |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------- |
| 默认 1280×800            | `…/r2-1a/linear-settings/linear-settings-default-light.png` | `…/linear-settings-default-dark.png`           |
| 默认 ~800×900            | `…/linear-settings-default-800-light.png`                   | `…/linear-settings-default-800-dark.png`       |
| 卡内滚动至表单区         | —                                                           | `…/linear-settings-scrolled-dark.png`          |
| 子导航切换后（通知分节） | —                                                           | `…/linear-settings-nav-notifications-dark.png` |

## 2. A–H 维度勾选表

- A：A1 pass A2 pass A3 fail(R2-1a-A3-04 页面实例：开关 32×18) A4 pass（开关关态“关”文字+灰色，可感知） A5 pass A6 n/a A7 n/a A8 n/a A9 pass（开关切换即时变「开/关」文字）
- B：B1 pass（本页文字均 ≥6.13） B2–B6 pass
- C：C1 fail(R2-1a-C-01 页面实例 clipY=700/ch=588) C2 pass C3 fail(R2-1a-C-01) C4 pass C5 fail(R2-1a-C-02) C6 n/a
- D：D1 pass（字段组节距一致） D2 pass D5 pass（label-描述-开关三段落节奏统一） D3 pass D4 pass D6–D8 pass
- E：E1 fail(R2-1a-C-01) E2 pass E3 pass E4 pass E5 pass（fieldset 分组视觉语言统一） E6 pass（静态形态自述清晰）
- F：pass G：n/a H：n/a（tabs 分节为页内切换，非弹层）

## 3. 发现条目

### [R2-1a-C-01 页面实例] 侧栏块与表单区纵向堆叠 + 表单行内控件纵排

- **页面/路由**: `#/complex-pages/linear-settings`
- **主题/视口/状态**: 双主题 / 1280×800 / 默认
- **截图**: `…/linear-settings-scrolled-dark.png`（表单列 ~440px，右侧空黑；开关在文字下方而非行右端）
- **程序化证据**:
  - 探针: 同 C-01 主条目探针本页复跑
  - 输出: flex-row 容器 body 子元素 y=[172, 484]；第二处 `flex flex-row items-center gap-4` 容器 body 子元素 x=[353]（行内横排退化为纵排，开关落到文字下方）；clipY=700/ch=568；belowCount=47
- **对照基准**: 同 R2-1a-C-01 主条目；设置行惯例 = label 左、控件右
- **严重程度**: P1
- **用户影响**: 子导航不可见（在折叠上方之外的首屏外）；偏好开关行不符合“行尾控件”惯例，扫视困难。
- **修复方向**: 同 C-01 主条目；开关行补 `flex-row items-center justify-between`（bodyClassName/semantic prop）。
- **归族**: systemic → R2-3 批（并入 C-01）
- **复核状态**: 未复核

### [R2-1a-A3-04 页面实例] nop-switch 32×18 可点击目标

- **页面/路由**: 本页偏好开关组（聚合通知/键盘提示/周末免打扰）
- **截图**: `…/linear-settings-scrolled-dark.png`
- **程序化证据**: targetScan(24)：nop-switch 32×18 ×3（18px 短边 < 24）；native input 1×1（豁免）
- **对照基准**: WCAG 2.5.8
- **严重程度**: P3 ｜ **修复方向**: 开关热区扩至 ≥24px（透明 padding） ｜ **归族**: systemic → R2-3 批 ｜ **复核状态**: 未复核

## 4. 误报排除记录

| 现象                           | 排除依据                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------- |
| “零写提交的静态形态”无保存按钮 | 页面自述明示（linear-settings-static-note「本页为零写提交的静态形态」），非缺失 |

## 5. 台账回写

- 完成后 `ledger.md` 行 → `carded`；归族后 → `digested`；复检通过 → `verified`。
