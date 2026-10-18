# [card] page:cal-booking（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/cal-booking` ｜ **载体**: complex-page（replica，R2-1a 在案页；ux-r12 CP-6 monthShape/date-anchor 修复落地）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800；视图切换交互态矩阵未提供，A9-01 交互口径不可目验）

## 1. 截图清单

| 状态          | light                                                                        | dark                                                        |
| ------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/cal-booking-default-1280x800-light.png` ✓ | `_tmp/…/cal-booking-default-1280x800-dark.png` ✓            |
| 默认 800×900  | `_tmp/…/cal-booking-default-800x900-light.png` ✓                             | `_tmp/…/cal-booking-default-800x900-dark.png`（存档未复读） |
| interaction   | 与 default 字节相同（伪状态）                                                | 同左                                                        |

## 2. 回归判定

**pass（无新回归）**。light-1280：活动头、时长 tabs、月历（September 2026，日期数字与 月/周/日 切换正常）、右栏时段（10:00 选中黑丸、已失效置灰、名额将满 amber chip）全部正常。

## 3. 发现条目

### [FM5-shard2-B5-01] R2-1a-B5-01 复发（在案 P2，未修复）：dark 下卡面钉白 + 切换控件令牌泄漏混搭

- **页面/路由**: `#/complex-pages/cal-booking`
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/cal-booking-default-1280x800-dark.png`
- **目视描述**: 预约卡整体钉白（replica 纸面基线），但 月/周/日 切换器的未选中项"周/日"翻成深色文字+深色胶囊底——dark-on-dark 近不可读。与 R2"dark 令牌泄漏混搭"同根因同表现。
- **程序化证据**: 截图表现与 R2-1a-B5-01 记录一致（复发判定）
- **对照基准**: B5 dark 平价；R2-1a-B5-01（→ R2-4 input，未落地）
- **严重程度**: P2（维持原判，复发非新增）
- **用户影响**: dark 用户看到"半适配破损感"，周/日两档不可辨。
- **修复方向**: 同 R2-1a-B5-01（切换器未选中态在钉白卡内锁定 light 语义令牌）。
- **归族**: systemic → 既有项 ｜ **复核状态**: 本 round 截图复核确认仍在

### [FM5-shard2-C4-04] R2-1a-C4-01 复发（在案 P2，未修复）：800px 右栏被裁且无滚动

- **截图**: `_tmp/visual-inspection-2026-10-18/cal-booking-default-800x900-light.png`
- 目视：右栏（日期头"20…"/时段钮）被卡片右缘裁成窄条不可用；简介段文字亦在句中截断。与 R2 记录一致（复发非新增）。维持 P2、归 R2-3 批。

### [FM5-shard2-watch-01] 时长 tabs 选中态 light 不可见（visual-only，疑 A9-01 同族）

- dark 默认态"30 分钟"有灰色选中胶囊；light 默认态四档均无选中标识。默认时长即 30 分钟，light 下选中态疑似不可见。R2 A9-01（视图切换器选中态交互后不可读 P2）为同族在案项、修复未落地，本条按同族复发记录，**[visual-only]** 待探针坐实（读选中 tab computed background）。
