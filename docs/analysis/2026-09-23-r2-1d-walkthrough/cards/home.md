# [card] page:home

- **批次**: R2-1d ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/` ｜ **载体**: 域页面（playground 首页/参照页，最高标准）
- **矩阵裁剪**: full 精简执行（页面为静态卡片导航，无弹层/拖拽/异步；裁掉项：弹层矩阵、拖拽、loading/empty 状态——页面不存在这些面）

## 1. 截图清单

| 状态          | light                                                                 | dark                       |
| ------------- | --------------------------------------------------------------------- | -------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-09-23/r2-1d/home/default-1280-light.png` | `default-1280-dark.png`    |
| 默认 800×900  | `default-800x900-light.png`                                           | `default-800x900-dark.png` |
| 键盘焦点      | `kb-focus-light.png`                                                  | —                          |
| 卡片 hover    | `card-hover-light.png`                                                | —                          |

## 2. A–H 勾选

- A: A1✔(卡片 hover shadow/transform 变化,探针 changed=true) A2✔(Tab 后 focusVisible=true、蓝环可见) A3✔(无可交互元素<24px) A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a A9 n/a(纯导航)
- B: B1✔ B2✔ B4✔ B5✔(dark 无溢出无异常)
- C: C1✔(1280/800 均无溢出) C3✔(三问可答: 标题/分组卡片/说明) C4✔
- D: D1✔ GAP_SNIPPET 仅 2.8px 一项 = 卡内 absolute 右下箭头 overlay（有意覆盖，误报）
- E: E1✔ E2✔ E5✔(卡片分组视觉语言一致)
- F: F1✔ F3✔ F4✔
- G n/a ｜ H n/a

## 3. 发现条目

（无——参照页基准面干净。R1 目视疑点均被探针证伪，见上表。）

## 4. 备注

- dark 截图（fullpage-1280-dark.png）文字/卡片对比正常，未见 dark 专有缺陷。
- 本页作为其余 demo 页的"正确用法"基准：hover 反馈、键盘焦点环、双主题平价、8pt 间隔全部达标；flux-basic 等页的发现应以此为对照。
