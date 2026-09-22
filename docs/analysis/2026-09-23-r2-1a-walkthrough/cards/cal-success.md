# [card] page:cal-success

- **批次**: R2-1a ｜ **台账状态**: carded ｜ **日期**: 2026-09-23
- **路由**: `#/complex-pages/cal-success` ｜ **载体**: complex-page（外部应用复刻 · Cal.com 预约成功态）
- **矩阵裁剪**: full（本页无弹层/拖拽/异步中间态；I13 静态形态）

## 1. 截图清单

| 状态           | light                                                                                        | dark                                        |
| -------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 默认 1280×800  | `_tmp/visual-inspection-2026-09-23/r2-1a/cal-success/cal-success-default-1280x800-light.png` | `.../cal-success-default-1280x800-dark.png` |
| 复制链接点击后 | `.../cal-success-copy-clicked-1280x800-light.png`                                            | —                                           |
| 默认 800×900   | `.../cal-success-default-800x900-light.png`                                                  | `.../cal-success-default-800x900-dark.png`  |

探针脚本：内联 REPL 探针（按钮清单 / copy toast / 语义色 / 路由跳转），见 `_tmp/r2-1a-probes/`。

## 2. A–H 勾选

- A 交互：A1 ✓ A2 ✓ A3 warn(A3-03) A4 n/a A5 n/a A6 n/a A7 n/a A8 n/a A9 ✓（复制链接→toast「链接已复制」实测命中；重新安排→路由 `#/complex-pages/cal-booking` 实测）
- B 颜色：B1 ✓ B2 ✓ B3 ✓（成功 ✓=success 令牌、待确认 badge=amber 语义）B4 ✓ B5 warn(B5-02) B6 ✓
- C 布局：C1 ✓（C1L/C1N 均 0 命中）C2 ✓ C3 ✓ C4 ✓（单列布局 800px 无溢出）C5 ✓ C6 n/a
- D 间隔：D1 ✓（16×15/8×4/4×2/12）D2 ✓ D3 n/a D4 ✓ D5 n/a D6 n/a D7 ✓（命中均为宿主侧栏）D8 ✓
- E 排布：E1 ✓（三问 3 秒可答：预约已确认+待确认徽章+主链接组）E2 ✓ E3 ✓ E4 ✓ E5 ✓ E6 ✓
- F 一致性：✓（replica 豁免；横切已查）
- G：n/a
- H：n/a（无弹层；四个日历外链为占位链接 `href="#/complex-pages/cal-success"`，与 schema 自述一致）

## 3. 发现条目

### [R2-1a-A3-03] 重新安排/取消预约 按钮 22px 高

- **页面/路由**: `#/complex-pages/cal-success`
- **主题/视口/状态**: light / 1280×800 / 摘要卡下动作区
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/cal-success/cal-success-default-1280x800-light.png`
- **目视描述**: 两个文字型动作按钮明显比"复制链接"(112×36) 矮。
- **程序化证据**:
  - 探针: 可交互元素短边遍历
  - 输出: 重新安排 `58×22`、取消预约 `58×22`（<24）
- **对照基准**: WCAG 2.5.8
- **严重程度**: P3
- **用户影响**: 触屏误触率略高，不阻碍任务。
- **修复方向**: 两钮升到 h≥24 档（建议与复制链接同 36 或 h-6=24）。
- **归族**: watch-only → 台账（cal-confirm 返回上一步 22px 同模式）
- **复核状态**: 未复核

### [R2-1a-B5-02] dark 下卡面钉白（内容可读，共享根因）

- **页面/路由**: `#/complex-pages/cal-success`
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-09-23/r2-1a/cal-success/cal-success-default-1280x800-dark.png`
- **目视描述**: dark 壳层中整卡保持白底；因本页文本均为深色字面色，白底上全部可读，无 cal-confirm 式灰板。
- **程序化证据**:
  - 探针: dark 下读 `.nop-page.cal-root` bg（与 cal-booking/cal-confirm 同探针）
  - 输出: bg = `rgb(255,255,255)`，成功 ✓ 圆 `success` 令牌、待确认 amber 均正常显示
- **对照基准**: B5 dark 平价；replica 风格豁免不覆盖 B5
- **严重程度**: P3（无信息损失，仅与宿主 dark 壳层的观感割裂）
- **用户影响**: 观感突兀，任务不受阻。
- **修复方向**: 随 cal-\* 钉白根因统一处置（作用域锁 light 或补 dark 适配），见 cal-booking B5-01。
- **归族**: systemic → R2-3 批（cal-\* 三页同根因）
- **复核状态**: 未复核

## 4. 误报排除记录

- 四个日历外链 href 均指向当前页（占位）：schema 自述"占位链接"（I13 静态形态），不算 A9 缺陷。
- 复制链接 toast「链接已复制」为真实剪贴板语义模拟，反馈通道正常。

## 5. 台账回写提示

ledger.md 本行 status → `carded`；B5-02 随 cal-\* 根因归族后 `digested`。
