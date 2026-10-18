# [card] page:cal-confirm（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/cal-confirm` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800；toast/按钮交互态矩阵未提供，A9-02/E3-01 本轮不可目验）

## 1. 截图清单

| 状态          | light                                                                        | dark                                                          |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/cal-confirm-default-1280x800-light.png` ✓ | `_tmp/…/cal-confirm-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/cal-confirm-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/cal-confirm-default-800x900-dark.png` ✓（存档未复读） |
| interaction   | 与 default 字节相同（伪状态）                                                | 同左                                                          |

## 2. 回归判定

**pass（无新回归）**。light：reschedule 提示条、左摘要卡（头像/活动元信息/时段）、右表单（姓名/邮箱/电话/备注/嘉宾行）全部正常。

## 3. 发现条目

### [FM5-shard2-B1-01] R2-1a-B1-01 复发（在案 P1，未修复）：dark 下表单输入框成"灰板"、标签与 placeholder 近不可读

- **页面/路由**: `#/complex-pages/cal-confirm` 右侧表单
- **主题/视口/状态**: dark / 1280×800 / 默认
- **截图**: `_tmp/visual-inspection-2026-10-18/cal-confirm-default-1280x800-dark.png`
- **目视描述**: 卡面钉白但表单控件翻灰：四个输入框呈灰色实心板、placeholder（请输入您的姓名 等）深灰贴灰底近不可读；字段标签几乎隐没（仅红色必填星号可辨）。与 R2 记录逐字吻合。
- **程序化证据**: 截图表现与 R2-1a-B1-01 记录一致（复发判定）
- **对照基准**: B1/B5 dark 平价；R2-1a-B1-01（→ R2-4 input，未落地）
- **严重程度**: P1（维持原判，复发非新增；本页唯一任务=填表，dark 下主要输入不可读）
- **用户影响**: dark 用户无法辨认字段与占位提示。
- **修复方向**: 同 R2-1a-B1-01（钉白卡内表单控件锁定 light 语义令牌，或补 dark 卡面适配块）。
- **归族**: systemic → 既有项 ｜ **复核状态**: 本 round 截图复核确认仍在

### [FM5-shard2-note-07] R2-1a-A9-02（toast "[object Object]" P1）/ E3-01（确认主按钮左置 P2）/ A3-02/D1-01（P3）：需交互态或折叠区以下截图，本 round 矩阵未捕获，按在案维持。
