# [card] page:cal-success（FM-5 改版页回归复检 · 分片 2）

- **批次**: FM-5 render-recheck shard2 ｜ **台账状态**: carded ｜ **日期**: 2026-10-18
- **路由**: `#/complex-pages/cal-success` ｜ **载体**: complex-page（replica，R2-1a 在案页）
- **矩阵裁剪**: simplified（default × dark/light × 1280/800）

## 1. 截图清单

| 状态          | light                                                                        | dark                                                          |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 默认 1280×800 | `_tmp/visual-inspection-2026-10-18/cal-success-default-1280x800-light.png` ✓ | `_tmp/…/cal-success-default-1280x800-dark.png` ✓              |
| 默认 800×900  | `_tmp/…/cal-success-default-800x900-light.png` ✓（存档未复读）               | `_tmp/…/cal-success-default-800x900-dark.png` ✓（存档未复读） |

## 2. 回归判定

**pass（无新回归）**。light：成功态大圆勾、预约已确认、说明文案、待确认 amber 徽章、摘要卡全部正常。dark：卡面钉白但内容全部可读——与 R2-1a-B5-02 本页判定（P3，无信息损失）一致，为基线形态非回归。

## 3. 发现条目

### [FM5-shard2-note-08] R2-1a-A3-03（重新安排/取消预约按钮 22px，P3）不可核验

- 按钮区在两主题 1280 截图折叠区以下，本 round 未见该区域；形态无恶化证据，按在案维持 watch。
